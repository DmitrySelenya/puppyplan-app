import assert from 'node:assert/strict';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, it } from 'node:test';

const approvedIosUdid = '5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6';
const fallbackIosUdid = '1319D7E1-AE4E-4165-8EB9-B3A78DE62867';
const otherIosUdid = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE';
const canonicalWrapperPath = ['scripts', 'build_and_run.sh'].join('/');
const legacyWrapperPath = ['script', 'build_and_run.sh'].join('/');
const repositoryWrapperPath = existsSync(canonicalWrapperPath)
  ? canonicalWrapperPath
  : legacyWrapperPath;
const expectedExpoMcpVersion = '0.2.4';
const temporaryRoots = [];

function writeExecutable(path, source) {
  writeFileSync(path, source, { mode: 0o755 });
}

function createTemporaryProject() {
  const root = mkdtempSync(join(tmpdir(), 'puppyplan-expo-toolchain-'));
  const scriptsDirectory = join(root, 'scripts');
  const toolsDirectory = join(root, 'test-tools');
  const localBinDirectory = join(root, 'node_modules', '.bin');

  temporaryRoots.push(root);
  mkdirSync(scriptsDirectory);
  mkdirSync(toolsDirectory);
  mkdirSync(localBinDirectory, { recursive: true });
  copyFileSync(repositoryWrapperPath, join(scriptsDirectory, 'build_and_run.sh'));
  chmodSync(join(scriptsDirectory, 'build_and_run.sh'), 0o755);

  const paths = {
    adbDevices: join(root, 'adb-devices.txt'),
    adbLog: join(root, 'adb.log'),
    expoLog: join(root, 'expo.log'),
    iosAvailable: join(root, 'ios-available.txt'),
    iosBooted: join(root, 'ios-booted.txt'),
    maestroLog: join(root, 'maestro.log'),
    openLog: join(root, 'open.log'),
    runnerLog: join(root, 'runner.log'),
    xcrunLog: join(root, 'xcrun.log'),
  };

  writeFileSync(paths.adbDevices, `List of devices attached\nemulator-5554\tdevice\n`);
  writeFileSync(
    paths.iosAvailable,
    `== Devices ==\n    Grith iPhone SE 3 iOS 26.3 (${approvedIosUdid}) (Shutdown)\n`,
  );
  writeFileSync(paths.iosBooted, '== Devices ==\n');

  writeExecutable(
    join(localBinDirectory, 'expo'),
    `#!/bin/sh
printf '%s|%s\n' "\${EXPO_UNSTABLE_MCP_SERVER:-}" "$*" > "\$PUPPYPLAN_TEST_EXPO_LOG"
`,
  );
  writeExecutable(
    join(toolsDirectory, 'foreign-expo'),
    `#!/bin/sh
printf '%s\n' 'foreign-expo' >> "\$PUPPYPLAN_TEST_RUNNER_LOG"
exit 97
`,
  );
  for (const command of ['npx', 'pnpm', 'yarn', 'bun', 'bunx']) {
    writeExecutable(
      join(toolsDirectory, command),
      `#!/bin/sh
printf '%s\n' '${command}' >> "\$PUPPYPLAN_TEST_RUNNER_LOG"
exit 97
`,
    );
  }
  writeExecutable(
    join(toolsDirectory, 'xcrun'),
    `#!/bin/sh
printf '%s\n' "$*" >> "\$PUPPYPLAN_TEST_XCRUN_LOG"
case "$*" in
  "simctl list devices available") cat "\$PUPPYPLAN_TEST_IOS_AVAILABLE" ;;
  "simctl list devices booted") cat "\$PUPPYPLAN_TEST_IOS_BOOTED" ;;
  "simctl boot "*|"simctl bootstatus "*) exit 0 ;;
  *) exit 96 ;;
esac
`,
  );
  writeExecutable(
    join(toolsDirectory, 'adb'),
    `#!/bin/sh
printf '%s\n' "$*" >> "\$PUPPYPLAN_TEST_ADB_LOG"
if [ "$*" = "devices" ]; then
  cat "\$PUPPYPLAN_TEST_ADB_DEVICES"
  exit 0
fi
exit 96
`,
  );
  writeExecutable(
    join(toolsDirectory, 'open'),
    `#!/bin/sh
printf '%s\n' "$*" >> "\$PUPPYPLAN_TEST_OPEN_LOG"
`,
  );
  writeExecutable(
    join(toolsDirectory, 'maestro'),
    `#!/bin/sh
printf '%s\n' "$*" >> "\$PUPPYPLAN_TEST_MAESTRO_LOG"
`,
  );

  return { localBinDirectory, paths, root, toolsDirectory };
}

function testEnvironment(project, overrides = {}) {
  return {
    ...process.env,
    PATH: `${project.toolsDirectory}:${process.env.PATH ?? '/usr/bin:/bin'}`,
    npm_config_offline: 'true',
    npm_config_registry: 'http://127.0.0.1:9',
    PUPPYPLAN_TEST_ADB_DEVICES: project.paths.adbDevices,
    PUPPYPLAN_TEST_ADB_LOG: project.paths.adbLog,
    PUPPYPLAN_TEST_EXPO_LOG: project.paths.expoLog,
    PUPPYPLAN_TEST_IOS_AVAILABLE: project.paths.iosAvailable,
    PUPPYPLAN_TEST_IOS_BOOTED: project.paths.iosBooted,
    PUPPYPLAN_TEST_MAESTRO_LOG: project.paths.maestroLog,
    PUPPYPLAN_TEST_OPEN_LOG: project.paths.openLog,
    PUPPYPLAN_TEST_RUNNER_LOG: project.paths.runnerLog,
    PUPPYPLAN_TEST_XCRUN_LOG: project.paths.xcrunLog,
    ...overrides,
  };
}

function runWrapper(project, mode, overrides = {}) {
  return spawnSync('/bin/bash', [join(project.root, 'scripts', 'build_and_run.sh'), mode], {
    cwd: project.root,
    encoding: 'utf8',
    env: testEnvironment(project, overrides),
  });
}

function useLocalExpoForDeviceTest(project) {
  return { EXPO_CLI: join(project.localBinDirectory, 'expo') };
}

function installForeignLockfiles(project) {
  for (const lockfile of ['pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb']) {
    writeFileSync(join(project.root, lockfile), 'unrelated fixture\n');
  }
}

function assertNoFile(path, message) {
  assert.equal(existsSync(path), false, message);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe('Expo wrapper supply-chain guardrails', () => {
  const expoModes = [
    ['start', '|start'],
    ['mcp', '1|start'],
    ['ios', '|start --ios'],
    ['android', '|start --android'],
    ['web', '|start --web'],
    ['dev-client', '|start --dev-client'],
    ['--dev-client-mcp', '1|start --dev-client'],
    ['tunnel', '|start --tunnel'],
    ['export-web', '|export --platform web'],
  ];

  for (const [mode, expectedInvocation] of expoModes) {
    it(`AC-REVIEW-1, EC-REVIEW-1: ${mode} uses only the local Expo binary`, () => {
      const project = createTemporaryProject();
      installForeignLockfiles(project);

      const result = runWrapper(project, mode);

      assert.equal(result.status, 0, `${mode} failed:\n${result.stderr}`);
      assert.equal(readFileSync(project.paths.expoLog, 'utf8').trim(), expectedInvocation);
      assertNoFile(
        project.paths.runnerLog,
        `${mode} must ignore npx, pnpm, Yarn, Bun, and bunx`,
      );
    });
  }

  it('ERR-REVIEW-1: EXPO_CLI cannot replace the repository-local Expo binary', () => {
    const project = createTemporaryProject();

    const result = runWrapper(project, 'start', { EXPO_CLI: 'foreign-expo' });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(project.paths.expoLog, 'utf8').trim(), '|start');
    assertNoFile(project.paths.runnerLog, 'the EXPO_CLI escape hatch must not execute');
  });

  for (const binaryState of ['missing', 'non-executable']) {
    it(`AC-REVIEW-2: ${binaryState} local Expo fails closed with npm ci guidance`, () => {
      const project = createTemporaryProject();
      const localExpoPath = join(project.localBinDirectory, 'expo');
      rmSync(localExpoPath);
      if (binaryState === 'non-executable') {
        writeFileSync(localExpoPath, '#!/bin/sh\nexit 0\n', { mode: 0o644 });
      }
      installForeignLockfiles(project);

      const result = runWrapper(project, 'start');

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /npm ci/u);
      assertNoFile(
        project.paths.runnerLog,
        'missing local Expo must fail before invoking a package runner',
      );
    });
  }
});

describe('iOS and Android device guardrails', () => {
  it('AC-REVIEW-6: boots and opens only the approved SE before Expo iOS', () => {
    const project = createTemporaryProject();

    const result = runWrapper(project, 'ios', useLocalExpoForDeviceTest(project));

    assert.equal(result.status, 0, result.stderr);
    const xcrunLog = readFileSync(project.paths.xcrunLog, 'utf8');
    assert.match(xcrunLog, new RegExp(`simctl boot ${approvedIosUdid}`, 'u'));
    assert.match(xcrunLog, new RegExp(`simctl bootstatus ${approvedIosUdid} -b`, 'u'));
    assert.match(readFileSync(project.paths.openLog, 'utf8'), new RegExp(approvedIosUdid, 'u'));
    assert.equal(readFileSync(project.paths.expoLog, 'utf8').trim(), '|start --ios');
  });

  it('ERR-REVIEW-2: refuses a concurrently booted non-approved simulator', () => {
    const project = createTemporaryProject();
    writeFileSync(
      project.paths.iosBooted,
      `== Devices ==\n    Other iPhone (${otherIosUdid}) (Booted)\n`,
    );

    const result = runWrapper(project, 'ios', useLocalExpoForDeviceTest(project));

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /another ios simulator is already booted/iu);
    assertNoFile(project.paths.openLog, 'the wrapper must not open Simulator after refusing');
    assertNoFile(project.paths.expoLog, 'the wrapper must not start Expo after refusing');
  });

  it('EC-REVIEW-2: accepts a lowercase approved UUID override against uppercase simctl output', () => {
    const project = createTemporaryProject();

    const result = runWrapper(project, 'ios', {
      ...useLocalExpoForDeviceTest(project),
      PUPPYPLAN_IOS_SIMULATOR_UDID: approvedIosUdid.toLowerCase(),
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(project.paths.expoLog, 'utf8').trim(), '|start --ios');
  });

  it('AC-R5-3: accepts the documented fallback SE UUID', () => {
    const project = createTemporaryProject();
    writeFileSync(
      project.paths.iosAvailable,
      `== Devices ==\n    iPhone SE (3rd generation) (${fallbackIosUdid}) (Shutdown)\n`,
    );

    const result = runWrapper(project, 'ios', {
      ...useLocalExpoForDeviceTest(project),
      PUPPYPLAN_IOS_SIMULATOR_UDID: fallbackIosUdid.toLowerCase(),
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(
      readFileSync(project.paths.xcrunLog, 'utf8'),
      new RegExp(`simctl boot ${fallbackIosUdid}`, 'u'),
    );
  });

  it('AC-R5-3: rejects an available but unapproved iOS simulator override', () => {
    const project = createTemporaryProject();
    writeFileSync(
      project.paths.iosAvailable,
      `== Devices ==\n    Other iPhone (${otherIosUdid}) (Shutdown)\n`,
    );

    const result = runWrapper(project, 'ios', {
      ...useLocalExpoForDeviceTest(project),
      PUPPYPLAN_IOS_SIMULATOR_UDID: otherIosUdid,
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /approved ios simulator|primary|fallback/iu);
    assertNoFile(project.paths.xcrunLog, 'the wrapper must reject before invoking simctl');
    assertNoFile(project.paths.openLog, 'the wrapper must reject before opening Simulator');
    assertNoFile(project.paths.expoLog, 'the wrapper must reject before starting Expo');
  });

  it('EC-REVIEW-3: counts exactly one usable Android target and ignores unusable states', () => {
    const project = createTemporaryProject();
    writeFileSync(
      project.paths.adbDevices,
      'List of devices attached\nemulator-5554\tdevice\nemulator-5556\toffline\nusb-1\tunauthorized\n',
    );

    const result = runWrapper(project, 'android', useLocalExpoForDeviceTest(project));

    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(project.paths.expoLog, 'utf8').trim(), '|start --android');
  });

  for (const scenario of [
    { label: 'zero', devices: 'List of devices attached\nusb-1\toffline\n' },
    {
      label: 'multiple',
      devices: 'List of devices attached\nemulator-5554\tdevice\nemulator-5556\tdevice\n',
    },
  ]) {
    it(`ERR-REVIEW-3: refuses ${scenario.label} usable Android targets`, () => {
      const project = createTemporaryProject();
      writeFileSync(project.paths.adbDevices, scenario.devices);

      const result = runWrapper(project, 'android', useLocalExpoForDeviceTest(project));

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /exactly one connected android/iu);
      assertNoFile(project.paths.expoLog, 'the wrapper must not start Expo after refusing');
    });
  }
});

describe('Maestro npm routing', () => {
  function prepareNpmProject(project) {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    writeFileSync(
      join(project.root, 'package.json'),
      `${JSON.stringify({
        name: 'puppyplan-toolchain-test',
        private: true,
        scripts: {
          'maestro:smoke:ios': packageJson.scripts['maestro:smoke:ios'],
          'maestro:smoke:android': packageJson.scripts['maestro:smoke:android'],
          'maestro:quick-log:ios': packageJson.scripts['maestro:quick-log:ios'],
        },
      })}\n`,
    );

    const flowsDirectory = join(project.root, '.maestro');
    mkdirSync(flowsDirectory, { recursive: true });
    for (const flow of ['smoke.yaml', 'quick-log.yaml']) {
      writeFileSync(join(flowsDirectory, flow), 'appId: ${MAESTRO_APP_ID}\n---\n- launchApp\n');
    }
  }

  it('AC-REVIEW-5: iOS Maestro honors lowercase UUID override through iOS guardrails', () => {
    const project = createTemporaryProject();
    prepareNpmProject(project);

    const result = spawnSync('npm', ['run', '--silent', 'maestro:smoke:ios'], {
      cwd: project.root,
      encoding: 'utf8',
      env: testEnvironment(project, {
        PUPPYPLAN_IOS_SIMULATOR_UDID: approvedIosUdid.toLowerCase(),
      }),
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(project.paths.xcrunLog), true, 'Maestro iOS must run the iOS guard');
    assert.match(
      readFileSync(project.paths.maestroLog, 'utf8').toUpperCase(),
      new RegExp(approvedIosUdid, 'u'),
    );
  });

  it('runs a named .maestro flow instead of the default smoke', () => {
    const project = createTemporaryProject();
    prepareNpmProject(project);

    const result = spawnSync('npm', ['run', '--silent', 'maestro:quick-log:ios'], {
      cwd: project.root,
      encoding: 'utf8',
      env: testEnvironment(project),
    });

    assert.equal(result.status, 0, result.stderr);
    const invocation = readFileSync(project.paths.maestroLog, 'utf8');
    assert.match(invocation, /\.maestro\/quick-log\.yaml/u);
    assert.doesNotMatch(invocation, /smoke\.yaml/u);
  });

  for (const [name, flow] of [
    ['a flow outside .maestro', 'flows/evil.yaml'],
    ['a traversal path', '.maestro/../../etc/passwd.yaml'],
    ['a missing flow', '.maestro/does-not-exist.yaml'],
  ]) {
    it(`refuses ${name} before invoking Maestro`, () => {
      const project = createTemporaryProject();
      prepareNpmProject(project);

      const result = spawnSync('./scripts/build_and_run.sh', ['maestro-ios', flow], {
        cwd: project.root,
        encoding: 'utf8',
        env: testEnvironment(project),
      });

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /\.maestro\/|not found/iu);
      assertNoFile(project.paths.maestroLog, 'Maestro must not run for a rejected flow path');
      assertNoFile(project.paths.xcrunLog, 'the flow guard must run before the iOS guard');
    });
  }

  it('AC-REVIEW-5: Android Maestro refuses multiple usable targets before invoking Maestro', () => {
    const project = createTemporaryProject();
    prepareNpmProject(project);
    writeFileSync(
      project.paths.adbDevices,
      'List of devices attached\nemulator-5554\tdevice\nemulator-5556\tdevice\n',
    );

    const result = spawnSync('npm', ['run', '--silent', 'maestro:smoke:android'], {
      cwd: project.root,
      encoding: 'utf8',
      env: testEnvironment(project),
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exactly one connected android/iu);
    assertNoFile(project.paths.maestroLog, 'Maestro must not run after the Android guard refuses');
  });

  it('AC-REVIEW-5: both npm Maestro commands route through the canonical wrapper', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

    for (const platform of ['ios', 'android']) {
      assert.match(
        packageJson.scripts?.[`maestro:smoke:${platform}`] ?? '',
        /^\.\/scripts\/build_and_run\.sh\s+\S+/u,
        `maestro:smoke:${platform} must route through the canonical wrapper`,
      );
    }
  });
});

describe('dependency and ownership invariants', () => {
  it('AC-REVIEW-3: pins expo-mcp exactly with reviewed tarball and integrity', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    const lockRoot = packageLock.packages?.[''];
    const lockedMcp = packageLock.packages?.['node_modules/expo-mcp'];

    assert.equal(packageJson.devDependencies?.['expo-mcp'], expectedExpoMcpVersion);
    assert.equal(lockRoot?.devDependencies?.['expo-mcp'], expectedExpoMcpVersion);
    assert.equal(lockedMcp?.version, expectedExpoMcpVersion);
    assert.equal(
      lockedMcp?.resolved,
      `https://registry.npmjs.org/expo-mcp/-/expo-mcp-${expectedExpoMcpVersion}.tgz`,
    );
    assert.match(lockedMcp?.integrity ?? '', /^sha512-[A-Za-z0-9+/]+={0,2}$/u);
  });

  it('AC-REVIEW-8: keeps Expo-owned runtime packages transitive instead of direct', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    const directDeclarations = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const directLockDeclarations = {
      ...packageLock.packages?.['']?.dependencies,
      ...packageLock.packages?.['']?.devDependencies,
    };
    const unownedPackages = ['@expo/log-box', '@expo/metro-runtime'];

    assert.deepEqual(
      unownedPackages.filter((name) => Object.hasOwn(directDeclarations, name)),
      [],
      'package.json must not own Expo implementation-detail packages directly',
    );
    assert.deepEqual(
      unownedPackages.filter((name) => Object.hasOwn(directLockDeclarations, name)),
      [],
      'the lockfile root must not declare Expo implementation-detail packages directly',
    );
    for (const name of unownedPackages) {
      const lockedPackage = packageLock.packages?.[`node_modules/${name}`];
      assert.equal(typeof lockedPackage?.version, 'string', `${name} must remain locked transitively`);
      assert.match(lockedPackage?.integrity ?? '', /^sha512-[A-Za-z0-9+/]+={0,2}$/u);
    }
  });

  it('AC-REVIEW-7: uses only the canonical scripts wrapper path', () => {
    assert.equal(existsSync(canonicalWrapperPath), true, 'canonical wrapper must exist');
    assert.equal(existsSync(legacyWrapperPath), false, 'legacy singular script root must be removed');

    const listed = spawnSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { encoding: 'utf8' },
    );
    assert.equal(listed.status, 0, listed.stderr);
    const textExtensions = /\.(?:json|md|mjs|sh|toml|ts|yaml|yml)$/u;
    const staleReferences = listed.stdout
      .split('\0')
      .filter(Boolean)
      .filter((path) => textExtensions.test(path) && existsSync(path) && statSync(path).isFile())
      .flatMap((path) => {
        const lines = readFileSync(path, 'utf8').split('\n');
        return lines
          .map((line, index) => ({ index: index + 1, line, path }))
          .filter(({ line }) => line.includes(legacyWrapperPath));
      });

    assert.deepEqual(
      staleReferences,
      [],
      'actions, tests, commands, and docs must reference scripts/build_and_run.sh',
    );
  });

  it('AC-REVIEW-7: the project wrapper has valid Bash syntax', () => {
    const result = spawnSync('/bin/bash', ['-n', repositoryWrapperPath], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });
});
