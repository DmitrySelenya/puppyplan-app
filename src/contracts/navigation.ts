import type { I18nKey } from '@/lib/i18n';

export const primaryTabs = [
  {
    id: 'today',
    routeName: 'today/index',
    href: '/today',
    labelKey: 'tabs.today',
    accessibilityLabelKey: 'tabs.today',
  },
  {
    id: 'health',
    routeName: 'health/index',
    href: '/health',
    labelKey: 'tabs.health',
    accessibilityLabelKey: 'tabs.health',
  },
  {
    id: 'more',
    routeName: 'more/index',
    href: '/more',
    labelKey: 'tabs.more',
    accessibilityLabelKey: 'tabs.more',
  },
] as const satisfies readonly {
  id: string;
  routeName: string;
  href: string;
  labelKey: I18nKey;
  accessibilityLabelKey: I18nKey;
}[];

export const quickLogAction = {
  id: 'quick-log',
  href: '/quick-log',
  labelKey: 'tabs.quick-log-fab-label',
  accessibilityHintKey: 'tabs.quick-log-fab-hint',
} as const satisfies {
  id: string;
  href: string;
  labelKey: I18nKey;
  accessibilityHintKey: I18nKey;
};

export const settingsRoutes = ['/settings/puppy-profile', '/settings/quick-trackers'] as const;

export const modalRoutes = [
  quickLogAction.href,
  '/quick-log/details',
  '/timeline',
  '/reminders/edit',
  '/family/invite',
  '/sharing/trainer-preview',
  '/sharing/scope-selector',
  '/health/record-edit',
  ...settingsRoutes,
] as const;

export const developmentOnlyRoutes = ['/_dev/components'] as const;

export const deepLinkPlaceholders = ['/invite/[token]', '/share/[token]'] as const;

export const atlasRouteAliases = {
  '/more/puppy-profile': '/settings/puppy-profile',
} as const satisfies Record<string, (typeof settingsRoutes)[number]>;

export const plannedRouteFiles = [
  {
    route: '/onboarding',
    file: 'app/onboarding/index.tsx',
    implementationStage: 'existing',
  },
  {
    route: '/settings/puppy-profile',
    file: 'app/(modals)/settings/puppy-profile/index.tsx',
    implementationStage: 'existing',
  },
  {
    route: '/settings/quick-trackers',
    file: 'app/(modals)/settings/quick-trackers/index.tsx',
    implementationStage: 'existing',
  },
  {
    route: '/_dev/components',
    file: 'app/_dev/components.tsx',
    implementationStage: 'existing',
  },
] as const satisfies readonly {
  route: string;
  file: string;
  implementationStage: 'existing' | 'planned';
}[];

export const shellI18nKeys = [
  'tabs.today',
  'tabs.health',
  'tabs.more',
  'tabs.quick-log-fab-label',
  'tabs.quick-log-fab-hint',
  'states.empty-first-run.title',
  'states.empty-first-run.body',
  'today.quick-log.unavailable.title',
  'today.quick-log.unavailable.body',
  'today.quick-log.timeline-entry',
  'today.quick-log.setup-entry',
  'today.quick-log.section-title',
  'today.quick-log.empty.title',
  'today.quick-log.empty.body',
  'timeline.pills.pending',
  'timeline.pills.failed',
  'timeline.pills.synced',
  'timeline.actor-you',
  'quick-log.failed.persistent-banner',
  'quick-log.failed.primary',
  'quick-log.failed.tertiary',
  'quick-log.snackbar.undo',
  'health.footer-hint',
  'more.screen-title',
  'more.sections.puppy',
  'more.sections.records',
  'more.sections.support',
  'more.rows.puppy-profile',
  'more.rows.quick-trackers',
  'more.rows.timeline',
  'quick-log.sheet.title',
  'quick-log.sheet.edit-helper',
  'quick-log.sheet.unavailable.title',
  'quick-log.sheet.unavailable.body',
  'quick-log.sheet.unavailable.close',
  'quick-log.duplicate-warning.title',
  'quick-log.duplicate-warning.question',
  'quick-log.duplicate-warning.primary-alt',
  'quick-log.duplicate-warning.secondary',
  'states.revoked-or-expired.title',
  'states.revoked-or-expired.body-long',
] as const satisfies readonly I18nKey[];

export type PrimaryTabId = (typeof primaryTabs)[number]['id'];
export type PrimaryTabHref = (typeof primaryTabs)[number]['href'];
export type SettingsRoute = (typeof settingsRoutes)[number];
export type ShellI18nKey = (typeof shellI18nKeys)[number];
