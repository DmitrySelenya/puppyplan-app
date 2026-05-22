import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { loadNavigationContract, repoPath } from './load-navigation-contract.mjs';

const { modalRoutes, primaryTabs, quickLogAction } = await loadNavigationContract();

assert.deepEqual(
  primaryTabs.map((tab) => tab.id),
  ['today', 'health', 'more'],
  'Primary tabs must be exactly Today, Health, More',
);

assert.equal(
  primaryTabs.some((tab) => tab.id === quickLogAction.id || tab.href === quickLogAction.href),
  false,
  'Quick Log must not be a primary tab',
);

assert.equal(modalRoutes.includes(quickLogAction.href), true, 'Quick Log must be a modal route');

const routeFiles = [
  'app/_layout.tsx',
  'app/(tabs)/_layout.tsx',
  'app/(tabs)/today/index.tsx',
  'app/(tabs)/health/index.tsx',
  'app/(tabs)/more/index.tsx',
  'app/(modals)/quick-log/index.tsx',
  'app/invite/[token].tsx',
  'app/share/[token].tsx',
];

for (const routeFile of routeFiles) {
  const filePath = repoPath(routeFile).pathname;
  assert.doesNotThrow(() => statSync(filePath), `Missing route file: ${routeFile}`);
}

const rootLayoutSource = readFileSync(repoPath('app/_layout.tsx'), 'utf8');
const hasModalGroupLayout = existsSync(repoPath('app/(modals)/_layout.tsx').pathname);
const rootConfiguresQuickLogModal =
  rootLayoutSource.includes('name="(modals)/quick-log"') ||
  rootLayoutSource.includes("name='(modals)/quick-log'");

assert.equal(
  hasModalGroupLayout || rootConfiguresQuickLogModal,
  true,
  'Quick Log modal presentation must target an actual modal route or modal group layout',
);

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

const forbiddenRoutePatterns = [
  '@supabase/supabase-js',
  '@/lib/supabase',
  'createClient(',
  'console.log',
  'console.warn',
  'console.error',
];

for (const filePath of listFiles(repoPath('app').pathname)) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    continue;
  }

  const source = readFileSync(filePath, 'utf8');
  for (const pattern of forbiddenRoutePatterns) {
    assert.equal(
      source.includes(pattern),
      false,
      `${filePath} contains forbidden route-shell pattern: ${pattern}`,
    );
  }
}

console.log('navigation contract ok');
