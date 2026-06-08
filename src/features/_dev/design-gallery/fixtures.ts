import type { I18nKey } from '@/lib/i18n';

export type GalleryTrackerFixture = Readonly<{
  id: string;
  labelKey: I18nKey;
  selected: boolean;
}>;

export type GallerySectionFixture = Readonly<{
  id: string;
  stateKey: I18nKey;
  titleKey: I18nKey;
}>;

export const gallerySections = [
  {
    id: 'onboarding',
    titleKey: 'onboarding.welcome.title',
    stateKey: 'dev.gallery.states.onboarding',
  },
  {
    id: 'puppy-profile',
    titleKey: 'more.puppy-profile.screen-title',
    stateKey: 'dev.gallery.states.profile',
  },
  {
    id: 'quick-trackers',
    titleKey: 'more.quick-trackers.screen-title-template',
    stateKey: 'dev.gallery.states.quick-trackers',
  },
  {
    id: 'global-states',
    titleKey: 'states.error-server.title',
    stateKey: 'dev.gallery.states.global',
  },
] as const satisfies readonly GallerySectionFixture[];

export const syntheticTrackers = [
  {
    id: 'potty-outside',
    labelKey: 'quick-log.trackers.potty-outside',
    selected: true,
  },
  {
    id: 'potty-inside',
    labelKey: 'quick-log.trackers.potty-inside',
    selected: true,
  },
  {
    id: 'potty-poop',
    labelKey: 'quick-log.trackers.potty-poop',
    selected: true,
  },
  {
    id: 'feeding',
    labelKey: 'quick-log.trackers.feeding',
    selected: true,
  },
  {
    id: 'sleep',
    labelKey: 'quick-log.trackers.sleep',
    selected: true,
  },
  {
    id: 'training',
    labelKey: 'quick-log.trackers.training',
    selected: false,
  },
] as const satisfies readonly GalleryTrackerFixture[];
