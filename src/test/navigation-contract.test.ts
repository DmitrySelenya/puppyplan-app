import {
  atlasRouteAliases,
  deepLinkPlaceholders,
  developmentOnlyRoutes,
  modalRoutes,
  plannedRouteFiles,
  primaryTabs,
  quickLogAction,
  settingsRoutes,
} from '@/contracts/navigation';

describe('navigation contract', () => {
  it('keeps Today, Health, and More as the only primary tabs', () => {
    expect(primaryTabs.map((tab) => tab.id)).toEqual(['today', 'health', 'more']);
    expect(primaryTabs.map((tab) => tab.href)).toEqual(['/today', '/health', '/more']);
    expect(new Set(primaryTabs.map((tab) => tab.id)).size).toBe(primaryTabs.length);
  });

  it('keeps Quick Log as a modal action instead of a primary tab', () => {
    expect(primaryTabs).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: quickLogAction.id,
        }),
      ]),
    );
    expect(primaryTabs.map((tab) => tab.href)).not.toContain(quickLogAction.href);
    expect(modalRoutes).toContain(quickLogAction.href);
  });

  it('keeps invite and share token placeholders as route patterns only', () => {
    expect(deepLinkPlaceholders).toEqual(['/invite/[token]', '/share/[token]']);
    expect(deepLinkPlaceholders.every((route) => route.includes('[token]'))).toBe(true);
  });

  it('keeps editable settings under the /settings namespace', () => {
    expect(settingsRoutes).toEqual(['/settings/puppy-profile', '/settings/quick-trackers']);
    expect(modalRoutes).toEqual(expect.arrayContaining(settingsRoutes));
    expect(settingsRoutes.every((route) => route.startsWith('/settings/'))).toBe(true);
    expect(modalRoutes).not.toContain('/more/puppy-profile');
  });

  it('maps legacy atlas More profile labels to the production settings route', () => {
    expect(atlasRouteAliases['/more/puppy-profile']).toBe('/settings/puppy-profile');
  });

  it('tracks planned route files without making them primary navigation', () => {
    expect(plannedRouteFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: '/onboarding',
          file: 'app/(onboarding)/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/settings/puppy-profile',
          file: 'app/(modals)/settings/puppy-profile/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/settings/quick-trackers',
          file: 'app/(modals)/settings/quick-trackers/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/_dev/components',
          file: 'app/_dev/components.tsx',
          implementationStage: 'existing',
        }),
      ]),
    );
  });

  it('keeps the design gallery development-only', () => {
    expect(developmentOnlyRoutes).toEqual(['/_dev/components']);
    expect(primaryTabs.map((tab) => tab.href)).toEqual(expect.not.arrayContaining(developmentOnlyRoutes));
    expect(modalRoutes).toEqual(expect.not.arrayContaining(developmentOnlyRoutes));
  });
});
