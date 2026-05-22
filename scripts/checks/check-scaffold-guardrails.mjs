import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { repoPath } from './load-navigation-contract.mjs';

const babelConfigPath = repoPath('babel.config.js');
assert.equal(
  existsSync(babelConfigPath),
  true,
  'babel.config.js must exist so Expo SDK 55 worklets/Reanimated Babel behavior is explicit',
);

const babelConfigSource = readFileSync(babelConfigPath, 'utf8');
assert.equal(
  babelConfigSource.includes('babel-preset-expo'),
  true,
  'babel.config.js must use babel-preset-expo',
);

const expoPresetSource = readFileSync(
  repoPath('node_modules/expo/node_modules/babel-preset-expo/build/index.js'),
  'utf8',
);
assert.equal(
  expoPresetSource.includes("require('react-native-worklets/plugin')"),
  true,
  'Expo SDK 55 babel-preset-expo must auto-register react-native-worklets/plugin',
);

const appConfigSource = readFileSync(repoPath('app.config.ts'), 'utf8');
assert.equal(
  appConfigSource.includes('typedRoutes: true'),
  true,
  'app.config.ts must keep Expo Router typedRoutes enabled',
);

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

for (const root of ['app', 'src']) {
  for (const filePath of listFiles(repoPath(root).pathname)) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      continue;
    }

    const source = readFileSync(filePath, 'utf8');
    assert.equal(
      /\bconsole\.(debug|error|info|log|warn)\s*\(/.test(source),
      false,
      `${filePath} must not log raw app data; use observability wrappers when available`,
    );
  }
}

console.log('scaffold guardrails ok');
