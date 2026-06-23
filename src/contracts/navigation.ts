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
  'common.back',
  'common.close',
  'common.loading',
  'errors.load-failed',
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
  'onboarding.first-log.body-after-first',
  'onboarding.first-log.eyebrow',
  'onboarding.first-log.event-title',
  'onboarding.first-log.event-meta',
  'onboarding.first-log.hero-after-first',
  'onboarding.first-log.today-title',
  'timeline.pills.pending',
  'timeline.pills.failed',
  'timeline.pills.synced',
  'timeline.actor-you',
  'timeline.row-meta-template',
  'timeline.empty-filter-title',
  'timeline.empty-filter-clear',
  'quick-log.failed.persistent-banner',
  'quick-log.failed.primary',
  'quick-log.failed.tertiary',
  'quick-log.snackbar.undo',
  'health.tab-title',
  'health.segments.0',
  'health.segments.1',
  'health.segments.2',
  'health.segments.3',
  'health.filter-chips.0',
  'health.filter-chips.1',
  'health.filter-chips.2',
  'health.empty.title',
  'health.empty.body',
  'health.empty.primary',
  'health.empty.secondary',
  'health.rows.current-section',
  'health.rows.previous-section',
  'health.rows.dhpp-title',
  'health.rows.dhpp-meta',
  'health.rows.weight-title',
  'health.rows.weight-meta',
  'health.rows.parasite-review-title',
  'health.rows.parasite-review-meta',
  'health.rows.parasite-review-subline',
  'health.rows.dhpp-template-title',
  'health.rows.dhpp-template-meta',
  'health.rows.vet-visit-title',
  'health.rows.vet-visit-meta',
  'health.pills.template',
  'health.pills.needs-vet-review',
  'health.pills.confirmed',
  'health.pills.completed',
  'health.template-row-subline',
  'health.add-record.sheet-title',
  'health.add-record.form-cancel',
  'health.add-record.form-save',
  'health.add-record.section-main',
  'health.add-record.section-extra',
  'health.add-record.field-name',
  'health.add-record.field-date',
  'health.add-record.field-status',
  'health.add-record.default-date',
  'health.add-record.status-segments.0',
  'health.add-record.status-segments.1',
  'health.add-record.status-segments.2',
  'health.add-record.field-clinic',
  'health.add-record.field-note',
  'health.add-record.urgent-toggle',
  'health.add-record.urgent-off',
  'health.add-record.urgent-hint',
  'health.add-record.note-hint',
  'health.add-record.privacy-hint',
  'health.edit-record.screen-title',
  'health.edit-record.section-details',
  'health.edit-record.section-history',
  'health.edit-record.history-line',
  'health.edit-record.delete-action',
  'health.edit-record.delete-confirm.title',
  'health.edit-record.delete-confirm.body',
  'health.edit-record.delete-confirm.cancel',
  'health.edit-record.delete-confirm.destructive',
  'health.detail.subtitle',
  'health.detail.date-label',
  'health.detail.date-value',
  'health.detail.status-label',
  'health.detail.clinic-label',
  'health.detail.clinic-value',
  'health.detail.note-label',
  'health.detail.note-value',
  'health.detail.stage-section',
  'health.detail.history-date',
  'health.status-transitions.stages.0',
  'health.status-transitions.stages.1',
  'health.status-transitions.stages.2',
  'health.status-transitions.stages.3',
  'health.status-transitions.now-template',
  'health.status-transitions.complete-label',
  'health.status-transitions.hint',
  'health.status-transitions.a11y-template',
  'health.weight-entry.title',
  'health.weight-entry.value',
  'health.weight-entry.body',
  'health.weight-entry.action',
  'health.footer-hint',
  'more.screen-title',
  'more.sections.puppy',
  'more.sections.sharing',
  'more.sections.records',
  'more.sections.privacy',
  'more.sections.support',
  'more.puppy-summary.age-weeks',
  'more.puppy-summary.no-age',
  'more.rows.puppy-profile',
  'more.rows.quick-trackers',
  'more.rows.family',
  'more.rows.trainer-sitter',
  'more.rows.timeline',
  'more.rows.reminders',
  'more.rows.notifications',
  'more.rows.data-account',
  'more.rows.help',
  'more.rows.about',
  'more.rows.puppyplan-plus',
  'more.rows.deferred',
  'more.about.version',
  'more.plus.subtitle',
  'more.quick-trackers.selected-count',
  'more.notifications.push-hint',
  'more.privacy.section-account-removal',
  'quick-log.sheet.title',
  'quick-log.sheet.dismiss',
  'quick-log.sheet.edit-trackers',
  'quick-log.sheet.edit-helper',
  'quick-log.sheet.unavailable.title',
  'quick-log.sheet.unavailable.body',
  'quick-log.sheet.unavailable.close',
  'quick-log.sheet.permission-denied.title',
  'quick-log.sheet.permission-denied.body',
  'quick-log.sheet.permission-denied.close',
  'quick-log.potty-subtype.title',
  'quick-log.potty-subtype.body',
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
