import type { I18nKey } from '@/lib/i18n';
import {
  buildTodayPlan,
  type TodayPlan,
} from '@/contracts/today';

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

export type GalleryTodayFixture = Readonly<{
  id: string;
  plan: TodayPlan;
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
    id: 'more-settings',
    titleKey: 'more.screen-title',
    stateKey: 'dev.gallery.states.more-settings',
  },
  {
    id: 'quick-log-sheet',
    titleKey: 'quick-log.sheet.title',
    stateKey: 'dev.gallery.states.quick-log-sheet',
  },
  {
    id: 'quick-log-details',
    titleKey: 'quick-log.details.title',
    stateKey: 'dev.gallery.states.quick-log-details',
  },
  {
    id: 'health-v2',
    titleKey: 'tabs.pet',
    stateKey: 'dev.gallery.states.health-v2',
  },
  {
    id: 'timeline-v2',
    titleKey: 'timeline.title',
    stateKey: 'dev.gallery.states.timeline-v2',
  },
  {
    id: 'today-core',
    titleKey: 'tabs.diary',
    stateKey: 'dev.gallery.states.today-core',
  },
  {
    id: 'starter-guidance',
    titleKey: 'guidance.first-night.title',
    stateKey: 'dev.gallery.states.guidance',
  },
  {
    id: 'today-deferrals',
    titleKey: 'today.deferred.title',
    stateKey: 'dev.gallery.states.today-deferrals',
  },
  {
    id: 'global-states',
    titleKey: 'states.error-server.title',
    stateKey: 'dev.gallery.states.global',
  },
] as const satisfies readonly GallerySectionFixture[];

export const syntheticTrackers = [
  {
    id: 'potty',
    labelKey: 'quick-log.trackers.potty',
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
    id: 'walk',
    labelKey: 'quick-log.trackers.walk',
    selected: true,
  },
  {
    id: 'zoomies',
    labelKey: 'quick-log.trackers.zoomies',
    selected: true,
  },
] as const satisfies readonly GalleryTrackerFixture[];

export const syntheticTodayPlans = [
  {
    id: 'today-day-one',
    titleKey: 'dev.gallery.today.day-one',
    plan: buildTodayPlan({
      dayNumber: 1,
      todayDate: '2026-06-12',
    }),
  },
  {
    id: 'today-day-two-morning',
    titleKey: 'dev.gallery.today.day-two-morning',
    plan: buildTodayPlan({
      dayNumber: 2,
      eventCounts: {
        feeding: 2,
        potty: 3,
      },
      suggestedDailyCards: ['quick_log_prompt', 'sleep_rhythm'],
      timeOfDay: 'morning',
      todayDate: '2026-06-12',
    }),
  },
  {
    id: 'today-day-seven',
    titleKey: 'dev.gallery.today.day-seven',
    plan: buildTodayPlan({
      dayNumber: 7,
      eventCounts: {
        feeding: 14,
        potty: 21,
        sleep: 7,
      },
      feedingPattern: {
        lastFeedingLocalTime: '07:30',
        usualAmount: 'meal',
      },
      lastEvents: [
        {
          eventType: 'potty',
          minutesAgo: 100,
          quickAction: 'pee_outside',
        },
      ],
      suggestedDailyCards: ['feeding_pattern', 'timeline_review', 'potty_rhythm'],
      todayDate: '2026-06-12',
      weeklySummary: {
        feedingCount: 14,
        pottyCount: 21,
        sleepHoursPerDay: 18,
      },
    }),
  },
  {
    id: 'today-after-invite',
    titleKey: 'dev.gallery.today.after-invite',
    plan: buildTodayPlan({
      dayNumber: 4,
      syntheticSignals: {
        afterInvite: {
          actorLabel: 'Caregiver',
          minutesAgo: 12,
        },
      },
      todayDate: '2026-06-12',
    }),
  },
  {
    id: 'today-missed-reminder',
    titleKey: 'dev.gallery.today.missed-reminder',
    plan: buildTodayPlan({
      dayNumber: 5,
      syntheticSignals: {
        missedReminder: {
          reminderKind: 'feeding',
          scheduledLocalTime: '07:30',
        },
      },
      todayDate: '2026-06-12',
    }),
  },
] as const satisfies readonly GalleryTodayFixture[];
