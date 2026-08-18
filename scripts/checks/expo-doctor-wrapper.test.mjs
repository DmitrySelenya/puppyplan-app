import assert from 'node:assert/strict';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, it } from 'node:test';

const expectedDoctorVersion = '1.20.1';
const canonicalWrapperPath = ['scripts', 'build_and_run.sh'].join('/');
const legacyWrapperPath = ['script', 'build_and_run.sh'].join('/');
const repositoryWrapperPath = existsSync(canonicalWrapperPath)
  ? canonicalWrapperPath
  : legacyWrapperPath;
const temporaryRoots = [];

function createTemporaryProject() {
  const root = mkdtempSync(join(tmpdir(), 'puppyplan-expo-doctor-'));
  const scriptDirectory = join(root, 'scripts');
  const toolsDirectory = join(root, 'test-tools');

  temporaryRoots.push(root);
  mkdirSync(scriptDirectory);
  mkdirSync(toolsDirectory);
  copyFileSync(repositoryWrapperPath, join(scriptDirectory, 'build_and_run.sh'));
  chmodSync(join(scriptDirectory, 'build_and_run.sh'), 0o755);

  return { root, toolsDirectory };
}

function writeExecutable(path, source) {
  writeFileSync(path, source, { mode: 0o755 });
}

function installPackageRunnerTraps(toolsDirectory, runnerLogPath) {
  for (const command of ['npx', 'pnpm', 'yarn', 'bun', 'bunx']) {
    writeExecutable(
      join(toolsDirectory, command),
      `#!/bin/sh\nprintf '%s\\n' '${command}' >> '${runnerLogPath}'\nexit 97\n`,
    );
  }
}

function runDoctor(root, toolsDirectory) {
  return spawnSync('/bin/bash', [join(root, 'scripts', 'build_and_run.sh'), 'doctor'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${toolsDirectory}:${process.env.PATH ?? ''}`,
      npm_config_offline: 'true',
      npm_config_registry: 'http://127.0.0.1:9',
    },
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe('Expo Doctor supply-chain guardrails', () => {
  it('AC-DOCTOR-1: pins Expo Doctor directly and records its resolved package integrity', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    const lockRoot = packageLock.packages?.[''];
    const lockedDoctor = packageLock.packages?.['node_modules/expo-doctor'];

    assert.equal(
      packageJson.devDependencies?.['expo-doctor'],
      expectedDoctorVersion,
      'package.json must pin expo-doctor as an exact direct development dependency',
    );
    assert.equal(
      lockRoot?.devDependencies?.['expo-doctor'],
      expectedDoctorVersion,
      'the package-lock root must record the same exact direct development dependency',
    );
    assert.equal(
      lockedDoctor?.version,
      expectedDoctorVersion,
      'package-lock.json must resolve the exact reviewed expo-doctor version',
    );
    assert.match(
      lockedDoctor?.resolved ?? '',
      /^https:\/\/registry\.npmjs\.org\/expo-doctor\/-\/expo-doctor-1\.20\.1\.tgz$/u,
      'package-lock.json must record the npm tarball resolved for expo-doctor',
    );
    assert.match(
      lockedDoctor?.integrity ?? '',
      /^sha512-[A-Za-z0-9+/]+={0,2}$/u,
      'package-lock.json must record a sha512 integrity value for expo-doctor',
    );
  });

  for (const scenario of [
    { label: 'npm/npx available', lockfiles: [] },
    { label: 'pnpm lockfile/tool present', lockfiles: ['pnpm-lock.yaml'] },
    { label: 'Yarn lockfile/tool present', lockfiles: ['yarn.lock'] },
    { label: 'Bun text lockfile/tool present', lockfiles: ['bun.lock'] },
    { label: 'Bun binary lockfile/tool present', lockfiles: ['bun.lockb'] },
  ]) {
    it(`AC-DOCTOR-2, EC-DOCTOR-1: executes only the local Doctor binary with ${scenario.label}`, () => {
      const { root, toolsDirectory } = createTemporaryProject();
      const doctorLogPath = join(root, 'doctor.log');
      const runnerLogPath = join(root, 'package-runner.log');
      const localDoctorPath = join(root, 'node_modules', '.bin', 'expo-doctor');

      mkdirSync(join(root, 'node_modules', '.bin'), { recursive: true });
      writeExecutable(
        localDoctorPath,
        `#!/bin/sh\nprintf '%s\\n' 'local-expo-doctor' > '${doctorLogPath}'\n`,
      );
      for (const lockfile of scenario.lockfiles) {
        writeFileSync(join(root, lockfile), 'unrelated test fixture\n');
      }
      installPackageRunnerTraps(toolsDirectory, runnerLogPath);

      const result = runDoctor(root, toolsDirectory);

      assert.equal(result.status, 0, `local Doctor failed:\n${result.stderr}`);
      assert.equal(readFileSync(doctorLogPath, 'utf8'), 'local-expo-doctor\n');
      assert.equal(
        result.stdout,
        '',
        'the wrapper must not substitute a package-manager invocation for the local binary',
      );
      assert.equal(
        result.stderr,
        '',
        'the local Doctor path should not require package-manager fallback diagnostics',
      );
      assert.throws(
        () => readFileSync(runnerLogPath, 'utf8'),
        { code: 'ENOENT' },
        'npx, pnpm, Yarn, Bun, and bunx must never be invoked by the Doctor action',
      );
    });
  }

  it('AC-DOCTOR-4: contains no Doctor branch that invokes a package runner', () => {
    const wrapperSource = readFileSync(repositoryWrapperPath, 'utf8');
    const runDoctorFunction = /run_doctor\(\) \{(?<body>[\s\S]*?)\n\}/u.exec(wrapperSource);

    assert.notEqual(runDoctorFunction, null, 'the checked-in wrapper must define run_doctor');
    assert.doesNotMatch(
      runDoctorFunction.groups.body,
      /\b(?:npx|bunx|pnpm\s+exec|yarn)\b/u,
      'run_doctor must never resolve Expo Doctor through a package runner',
    );
  });

  for (const binaryState of ['missing', 'non-executable']) {
    it(`AC-DOCTOR-3, ERR-DOCTOR-1: ${binaryState} local Doctor fails closed before package or network access`, () => {
      const { root, toolsDirectory } = createTemporaryProject();
      const runnerLogPath = join(root, 'package-runner.log');
      const localDoctorPath = join(root, 'node_modules', '.bin', 'expo-doctor');

      mkdirSync(join(root, 'node_modules', '.bin'), { recursive: true });
      if (binaryState === 'non-executable') {
        writeFileSync(localDoctorPath, '#!/bin/sh\nexit 0\n', { mode: 0o644 });
      }
      for (const lockfile of ['pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb']) {
        writeFileSync(join(root, lockfile), 'unrelated test fixture\n');
      }
      installPackageRunnerTraps(toolsDirectory, runnerLogPath);

      const result = runDoctor(root, toolsDirectory);

      assert.notEqual(result.status, 0, 'Doctor must fail closed when its local binary cannot execute');
      assert.match(
        result.stderr,
        /npm ci/u,
        'failure output must instruct the developer to restore locked dependencies with npm ci',
      );
      assert.throws(
        () => readFileSync(runnerLogPath, 'utf8'),
        { code: 'ENOENT' },
        'failure must happen before npx, pnpm, Yarn, Bun, bunx, or registry access',
      );
    });
  }
});
