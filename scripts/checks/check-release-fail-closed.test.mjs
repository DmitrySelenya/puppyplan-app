import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, it } from 'node:test';

const checkerPath = join(process.cwd(), 'scripts', 'checks', 'check-release-fail-closed.mjs');
const temporaryRoots = [];

function createProject({
  eas = {},
  appConfig = 'export default () => ({});\n',
  appJson,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'puppyplan-release-guard-'));
  temporaryRoots.push(root);
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify({ name: 'puppyplan-release-guard-fixture', version: '1.0.0' })}\n`,
  );
  writeFileSync(join(root, 'eas.json'), `${JSON.stringify(eas, null, 2)}\n`);
  writeFileSync(join(root, 'app.config.ts'), appConfig);
  if (appJson !== undefined) {
    writeFileSync(join(root, 'app.json'), `${JSON.stringify(appJson, null, 2)}\n`);
  }
  return root;
}

function runChecker(root) {
  return spawnSync(process.execPath, [checkerPath, '--root', root], {
    cwd: root,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe('AC-REVIEW-4: release configuration fails closed', () => {
  it('accepts internal development and preview profiles without release configuration', () => {
    const root = createProject({
      eas: {
        build: {
          development: { developmentClient: true, distribution: 'internal' },
          'preview-apk': { distribution: 'internal', android: { buildType: 'apk' } },
        },
      },
    });

    const result = runChecker(root);

    assert.equal(result.status, 0, result.stderr);
  });

  for (const scenario of [
    {
      label: 'production build profile',
      eas: { build: { production: { distribution: 'store' } } },
      diagnostic: /production/u,
    },
    {
      label: 'custom-named store build profile',
      eas: { build: { release: { distribution: 'store' } } },
      diagnostic: /release|store|internal/u,
    },
    {
      label: 'build profile without explicit internal distribution',
      eas: { build: { staging: { android: { buildType: 'apk' } } } },
      diagnostic: /staging|distribution|internal/u,
    },
    {
      label: 'submit configuration',
      eas: { build: { development: { distribution: 'internal' } }, submit: { production: {} } },
      diagnostic: /submit/u,
    },
    {
      label: 'EAS update channel',
      eas: {
        build: {
          development: { distribution: 'internal', channel: 'development' },
        },
      },
      diagnostic: /channel/u,
    },
    {
      label: 'Expo Updates configuration',
      eas: { build: { development: { distribution: 'internal' } } },
      appConfig:
        "export default () => ({ updates: { url: 'https://example.invalid/update' } });\n",
      diagnostic: /updates/u,
    },
  ]) {
    it(`rejects ${scenario.label}`, () => {
      const root = createProject(scenario);

      const result = runChecker(root);

      assert.notEqual(result.status, 0, `${scenario.label} must fail the release guard`);
      assert.match(
        `${result.stdout}\n${result.stderr}`.toLowerCase(),
        scenario.diagnostic,
        `failure must identify the forbidden ${scenario.label}`,
      );
    });
  }

  for (const scenario of [
    {
      label: 'quoted Expo Updates key',
      appConfig:
        "export default () => ({ 'updates': { url: 'https://example.invalid/update' } });\n",
    },
    {
      label: 'computed string-literal Expo Updates key',
      appConfig:
        "export default () => ({ ['updates']: { url: 'https://example.invalid/update' } });\n",
    },
    {
      label: 'dynamically computed Expo Updates key',
      appConfig:
        "const key = 'updates';\nexport default () => ({ [key]: { url: 'https://example.invalid/update' } });\n",
    },
  ]) {
    it(`EC-REVIEW-4: rejects ${scenario.label}`, () => {
      const root = createProject({
        eas: { build: { development: { distribution: 'internal' } } },
        appConfig: scenario.appConfig,
      });

      const result = runChecker(root);

      assert.notEqual(result.status, 0, `${scenario.label} must fail the release guard`);
      assert.match(
        `${result.stdout}\n${result.stderr}`.toLowerCase(),
        /updates/u,
        `failure must identify the forbidden ${scenario.label}`,
      );
    });
  }

  it('EC-REVIEW-4: rejects app.json Expo Updates inherited by app.config.ts', () => {
    const root = createProject({
      eas: { build: { development: { distribution: 'internal' } } },
      appJson: {
        expo: {
          updates: { url: 'https://example.invalid/update' },
        },
      },
      appConfig: 'export default ({ config }) => ({ ...config });\n',
    });

    const result = runChecker(root);

    assert.notEqual(result.status, 0, 'inherited app.json updates must fail the release guard');
    assert.match(
      `${result.stdout}\n${result.stderr}`.toLowerCase(),
      /updates/u,
      'failure must identify the forbidden inherited Expo Updates configuration',
    );
  });

  it('EC-REVIEW-4: accepts an app.config.ts comment that merely mentions updates:', () => {
    const root = createProject({
      eas: { build: { development: { distribution: 'internal' } } },
      appConfig: '// updates: remains forbidden for release builds\nexport default () => ({});\n',
    });

    const result = runChecker(root);

    assert.equal(result.status, 0, result.stderr);
  });

  it('routes the durable guard through npm run test:scaffold', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

    assert.match(
      packageJson.scripts?.['test:scaffold'] ?? '',
      /\bnode scripts\/checks\/check-release-fail-closed\.mjs\b/u,
      'test:scaffold must execute the release fail-closed checker',
    );
  });
});
