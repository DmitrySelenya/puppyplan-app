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

export const modalRoutes = [
  quickLogAction.href,
  '/quick-log/details',
  '/timeline',
  '/reminders/edit',
  '/family/invite',
  '/sharing/trainer-preview',
  '/sharing/scope-selector',
  '/health/record-edit',
  '/settings/quick-trackers',
] as const;

export const deepLinkPlaceholders = ['/invite/[token]', '/share/[token]'] as const;

export const shellI18nKeys = [
  'tabs.today',
  'tabs.health',
  'tabs.more',
  'tabs.quick-log-fab-label',
  'tabs.quick-log-fab-hint',
  'states.empty-first-run.title',
  'states.empty-first-run.body',
  'health.footer-hint',
  'more.screen-title',
  'more.sections.support',
  'quick-log.sheet.title',
  'quick-log.sheet.edit-helper',
  'states.revoked-or-expired.title',
  'states.revoked-or-expired.body-long',
] as const satisfies readonly I18nKey[];

export type PrimaryTabId = (typeof primaryTabs)[number]['id'];
export type PrimaryTabHref = (typeof primaryTabs)[number]['href'];
export type ShellI18nKey = (typeof shellI18nKeys)[number];
