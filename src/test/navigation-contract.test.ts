import {
  atlasRouteAliases,
  deepLinkPlaceholders,
  developmentOnlyRoutes,
  modalRoutes,
  plannedRouteFiles,
  primaryTabs,
  quickLogAction,
  scheduleAction,
  settingsRoutes,
} from '@/contracts/navigation';

describe('navigation contract', () => {
  it('keeps Diary, Pet, and More as the only V2 primary tabs', () => {
    expect(primaryTabs.map((tab) => tab.id)).toEqual(['diary', 'pet', 'more']);
    expect(primaryTabs.map((tab) => tab.href)).toEqual(['/diary', '/pet', '/more']);
    expect(primaryTabs.map((tab) => tab.routeName)).toEqual([
      'diary/index',
      'pet/index',
      'more/index',
    ]);
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

  it('tracks the Reminders hub as a modal route separate from the create form', () => {
    expect(modalRoutes).toContain('/reminders');
    expect(modalRoutes).toContain('/reminders/edit');
    expect(primaryTabs.map((tab) => tab.href)).not.toContain('/reminders');
    expect(plannedRouteFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: '/reminders',
          file: 'app/(modals)/reminders/index.tsx',
          implementationStage: 'existing',
        }),
      ]),
    );
  });

  it('exposes a schedule chooser action distinct from quick log', () => {
    expect(scheduleAction.href).not.toBe(quickLogAction.href);
    expect(modalRoutes).toContain(scheduleAction.href);
  });

  it('keeps invite and share token placeholders as route patterns only', () => {
    expect(deepLinkPlaceholders).toEqual(['/invite/[token]', '/share/[token]']);
    expect(deepLinkPlaceholders.every((route) => route.includes('[token]'))).toBe(true);
  });

  it('keeps editable settings under the /settings namespace', () => {
    expect(settingsRoutes).toEqual([
      '/settings/puppy-profile',
      '/settings/quick-trackers',
      '/settings/household',
      '/settings/sitter-mode',
      '/settings/notifications',
      '/settings/privacy-account',
      '/settings/help',
    ]);
    expect(modalRoutes).toEqual(expect.arrayContaining(settingsRoutes));
    expect(settingsRoutes.every((route) => route.startsWith('/settings/'))).toBe(true);
    expect(modalRoutes).not.toContain('/more/puppy-profile');
  });

  it('maps legacy atlas More profile labels to the production settings route', () => {
    expect(atlasRouteAliases['/more/puppy-profile']).toBe('/settings/puppy-profile');
  });

  it('keeps the PuppyPlan Plus paywall as a modal shell, not a settings route', () => {
    expect(modalRoutes).toContain('/paywall');
    expect(settingsRoutes).not.toContain('/paywall');
  });

  it('tracks health record detail as a dynamic Pet modal route', () => {
    expect(modalRoutes).toContain('/pet/health-record/[recordId]');
    expect(plannedRouteFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: '/pet/health-record/[recordId]',
          file: 'app/(modals)/pet/health-record/[recordId].tsx',
          implementationStage: 'existing',
        }),
      ]),
    );
  });

  it('keeps legacy Today, Health, and Timeline paths as migration aliases, not primary tabs', () => {
    expect(atlasRouteAliases['/today']).toBe('/diary');
    expect(atlasRouteAliases['/health']).toBe('/pet');
    expect(atlasRouteAliases['/timeline']).toBe('/diary');
    expect(primaryTabs.map((tab) => tab.href)).toEqual(
      expect.not.arrayContaining(['/today', '/health', '/timeline']),
    );
  });

  it('tracks planned route files without making them primary navigation', () => {
    expect(plannedRouteFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: '/diary',
          file: 'app/(tabs)/diary/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/pet',
          file: 'app/(tabs)/pet/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/today',
          file: 'app/(tabs)/today/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/health',
          file: 'app/(tabs)/health/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/onboarding',
          file: 'app/onboarding/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/invite/[token]',
          file: 'app/invite/[token].tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/share/[token]',
          file: 'app/share/[token].tsx',
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
          route: '/settings/household',
          file: 'app/(modals)/settings/household/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/settings/sitter-mode',
          file: 'app/(modals)/settings/sitter-mode/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/settings/notifications',
          file: 'app/(modals)/settings/notifications/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/settings/privacy-account',
          file: 'app/(modals)/settings/privacy-account/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/settings/help',
          file: 'app/(modals)/settings/help/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/paywall',
          file: 'app/(modals)/paywall/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/sharing/puppy-card',
          file: 'app/(modals)/sharing/puppy-card/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/pet/health-record-edit',
          file: 'app/(modals)/pet/health-record-edit/index.tsx',
          implementationStage: 'existing',
        }),
        expect.objectContaining({
          route: '/reminders/edit',
          file: 'app/(modals)/reminders/edit/index.tsx',
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
