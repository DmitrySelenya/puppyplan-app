import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { loadNavigationContract, repoPath } from './load-navigation-contract.mjs';

const {
  atlasRouteAliases,
  developmentOnlyRoutes,
  modalRoutes,
  plannedRouteFiles,
  primaryTabs,
  quickLogAction,
  settingsRoutes,
} = await loadNavigationContract();

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

assert.deepEqual(
  settingsRoutes,
  ['/settings/puppy-profile', '/settings/quick-trackers'],
  'Editable settings routes must be locked to the /settings namespace',
);

for (const settingsRoute of settingsRoutes) {
  assert.equal(
    settingsRoute.startsWith('/settings/'),
    true,
    `Editable settings route must stay under /settings: ${settingsRoute}`,
  );
  assert.equal(
    modalRoutes.includes(settingsRoute),
    true,
    `Editable settings route must be registered as modal/sheet route: ${settingsRoute}`,
  );
}

assert.equal(
  modalRoutes.includes('/more/puppy-profile'),
  false,
  'Atlas /more/puppy-profile labels must map to /settings/puppy-profile, not a production /more route',
);

assert.equal(
  atlasRouteAliases['/more/puppy-profile'],
  '/settings/puppy-profile',
  'Atlas puppy-profile artboards must map to the production /settings/puppy-profile route',
);

assert.deepEqual(
  developmentOnlyRoutes,
  ['/_dev/components'],
  'The native design gallery route is development-only and must not become production navigation',
);

for (const devRoute of developmentOnlyRoutes) {
  assert.equal(
    primaryTabs.some((tab) => tab.href === devRoute),
    false,
    `Development-only route must not be a primary tab: ${devRoute}`,
  );
  assert.equal(
    modalRoutes.includes(devRoute),
    false,
    `Development-only route must not be registered as a production modal: ${devRoute}`,
  );
}

const routeFiles = [
  'app/_layout.tsx',
  'app/(tabs)/_layout.tsx',
  'app/(tabs)/today/index.tsx',
  'app/(tabs)/health/index.tsx',
  'app/(tabs)/more/index.tsx',
  'app/(sheets)/quick-log/index.tsx',
  'app/invite/[token].tsx',
  'app/share/[token].tsx',
];

for (const routeFile of routeFiles) {
  const filePath = repoPath(routeFile).pathname;
  assert.doesNotThrow(() => statSync(filePath), `Missing route file: ${routeFile}`);
}

for (const plannedRoute of plannedRouteFiles) {
  assert.equal(
    typeof plannedRoute.route,
    'string',
    `Planned route entry is missing route: ${JSON.stringify(plannedRoute)}`,
  );
  assert.equal(
    typeof plannedRoute.file,
    'string',
    `Planned route entry is missing file: ${JSON.stringify(plannedRoute)}`,
  );
  assert.match(
    plannedRoute.file,
    /^app\/.+\.(ts|tsx)$/,
    `Planned route must point at an app/ TypeScript route file: ${plannedRoute.file}`,
  );

  if (plannedRoute.implementationStage === 'existing') {
    assert.doesNotThrow(
      () => statSync(repoPath(plannedRoute.file).pathname),
      `Existing planned route file is missing: ${plannedRoute.file}`,
    );
  }
}

const rootLayoutSource = readFileSync(repoPath('app/_layout.tsx'), 'utf8');
const hasModalGroupLayout = existsSync(repoPath('app/(modals)/_layout.tsx').pathname);
const hasSheetGroupLayout = existsSync(repoPath('app/(sheets)/_layout.tsx').pathname);
const rootConfiguresQuickLogModal =
  rootLayoutSource.includes('name="(modals)/quick-log"') ||
  rootLayoutSource.includes("name='(modals)/quick-log'");
const rootRegistersStaleOnboardingRoute =
  rootLayoutSource.includes('name="onboarding"') ||
  rootLayoutSource.includes("name='onboarding'");
const rootRegistersOnboardingIndexRoute =
  rootLayoutSource.includes('name="onboarding/index"') ||
  rootLayoutSource.includes("name='onboarding/index'");

assert.equal(
  hasSheetGroupLayout || hasModalGroupLayout || rootConfiguresQuickLogModal,
  true,
  'Quick Log modal presentation must target an actual modal route or modal group layout',
);

assert.equal(
  rootRegistersStaleOnboardingRoute,
  false,
  'Root Stack must not register stale onboarding; use onboarding/index to match the Expo Router child route',
);

assert.equal(
  rootRegistersOnboardingIndexRoute,
  true,
  'Root Stack must register onboarding/index so Expo Router does not show a missing-route warning',
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
