#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getConfig } from 'expo/config/index.js';

function parseRoot(argv) {
  const rootIndex = argv.indexOf('--root');

  if (rootIndex === -1) {
    return process.cwd();
  }

  const root = argv[rootIndex + 1];
  if (!root) {
    throw new Error('--root requires a project directory');
  }

  return resolve(root);
}

function hasOwn(value, key) {
  return value !== null && typeof value === 'object' && Object.hasOwn(value, key);
}

function containsKeyDeep(value, forbiddenKey) {
  if (Array.isArray(value)) {
    return value.some((entry) => containsKeyDeep(entry, forbiddenKey));
  }
  if (value === null || typeof value !== 'object') {
    return false;
  }
  if (Object.hasOwn(value, forbiddenKey)) {
    return true;
  }
  return Object.values(value).some((entry) => containsKeyDeep(entry, forbiddenKey));
}

function unsafeBuildProfileNames(eas) {
  if (eas.build === undefined) {
    return [];
  }
  if (eas.build === null || typeof eas.build !== 'object' || Array.isArray(eas.build)) {
    return ['<invalid build configuration>'];
  }

  return Object.entries(eas.build)
    .filter(
      ([name, profile]) =>
        name === 'production' ||
        profile === null ||
        typeof profile !== 'object' ||
        Array.isArray(profile) ||
        profile.distribution !== 'internal',
    )
    .map(([name]) => name);
}

try {
  const root = parseRoot(process.argv.slice(2));
  const eas = JSON.parse(readFileSync(resolve(root, 'eas.json'), 'utf8'));
  const { exp: resolvedAppConfig } = getConfig(root, {
    skipPlugins: true,
    skipSDKVersionRequirement: true,
  });
  const violations = [];
  const unsafeProfiles = unsafeBuildProfileNames(eas);

  if (unsafeProfiles.length > 0) {
    violations.push(
      `EAS build profiles must be explicitly internal and non-production: ${unsafeProfiles.join(', ')}`,
    );
  }
  if (hasOwn(eas, 'submit')) {
    violations.push('EAS submit configuration');
  }
  if (containsKeyDeep(eas, 'channel')) {
    violations.push('EAS update channel');
  }
  if (hasOwn(resolvedAppConfig, 'updates')) {
    violations.push('Expo updates configuration');
  }

  if (violations.length > 0) {
    throw new Error(`Release configuration is forbidden: ${violations.join(', ')}`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Release fail-closed check failed: ${message}`);
  process.exitCode = 1;
}
