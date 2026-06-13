import {
  TODAY_MAX_DAILY_CARDS,
  buildTodayPlan,
  todayPlanSchema,
  type TodayPlanInput,
} from '@/contracts/today';

const todayDate = '2026-06-12';

function createInput(overrides: Partial<TodayPlanInput> = {}): TodayPlanInput {
  return {
    dayNumber: 1,
    eventCounts: {},
    lastEvents: [],
    suggestedDailyCards: [],
    syntheticSignals: {},
    todayDate,
    ...overrides,
  };
}

describe('Today prioritization contract', () => {
  it('returns deterministic output for the same input', () => {
    const input = createInput({
      dayNumber: 2,
      timeOfDay: 'morning',
      eventCounts: {
        feeding: 2,
        potty: 3,
      },
      lastEvents: [{
        eventType: 'sleep',
        minutesAgo: 45,
        quickAction: 'nap',
      }],
    });

    const firstPlan = buildTodayPlan(input);
    const secondPlan = buildTodayPlan(input);

    expect(secondPlan).toEqual(firstPlan);
    expect(todayPlanSchema.parse(firstPlan)).toEqual(firstPlan);
  });

  it('emits exactly one hero and no more than five visible daily cards', () => {
    const plan = buildTodayPlan(createInput({
      dayNumber: 3,
      suggestedDailyCards: [
        'quick_log_prompt',
        'sleep_rhythm',
        'potty_rhythm',
        'feeding_pattern',
        'timeline_review',
        'health_calm_check',
        'tracker_settings',
      ],
    }));

    expect(plan.hero.slot).toBe('hero');
    expect(plan.dailyCards).toHaveLength(TODAY_MAX_DAILY_CARDS);
    expect(plan.dailyCards.every((card) => card.slot === 'daily')).toBe(true);
  });

  it('covers first day, day 2 morning, accident recovery, feeding pattern, and day 7 rhythm', () => {
    expect(buildTodayPlan(createInput({ dayNumber: 1 })).hero.variant).toBe('first_day');
    expect(buildTodayPlan(createInput({ dayNumber: 4 })).hero.variant).toBe('first_day');

    expect(buildTodayPlan(createInput({
      dayNumber: 2,
      timeOfDay: 'morning',
      eventCounts: {
        feeding: 2,
        potty: 3,
      },
    })).hero.variant).toBe('day_2_morning');

    expect(buildTodayPlan(createInput({
      dayNumber: 3,
      lastEvents: [{
        eventType: 'potty',
        minutesAgo: 12,
        quickAction: 'pee_inside',
      }],
    })).hero.variant).toBe('accident_recovery');

    const feedingPlan = buildTodayPlan(createInput({
      dayNumber: 4,
      feedingPattern: {
        lastFeedingLocalTime: '12:50',
        usualAmount: 'meal',
      },
    }));

    expect(feedingPlan.dailyCards.map((card) => card.variant)).toContain('feeding_pattern');

    expect(buildTodayPlan(createInput({
      dayNumber: 7,
      weeklySummary: {
        feedingCount: 18,
        pottyCount: 24,
        sleepHoursPerDay: 16,
      },
    })).hero.variant).toBe('day_7_weekly_rhythm');
  });

  it('keeps invite and reminder variants synthetic and production-deferred', () => {
    const invitePlan = buildTodayPlan(createInput({
      dayNumber: 3,
      syntheticSignals: {
        afterInvite: {
          actorLabel: 'Caregiver',
          minutesAgo: 15,
        },
      },
    }));

    expect(invitePlan.dailyCards.map((card) => card.variant)).toContain('after_invite');
    expect(invitePlan.deferredProductionFeatures).toContain('family_invite');

    const reminderPlan = buildTodayPlan(createInput({
      dayNumber: 4,
      syntheticSignals: {
        missedReminder: {
          reminderKind: 'feeding',
          scheduledLocalTime: '13:00',
        },
      },
    }));

    expect(reminderPlan.hero.variant).toBe('missed_reminder');
    expect(reminderPlan.deferredProductionFeatures).toContain('reminders');
  });

  it('adds one guidance card per day when an eligible topic exists', () => {
    const plan = buildTodayPlan(createInput({
      dayNumber: 5,
      lastEvents: [{
        eventType: 'feeding',
        minutesAgo: 30,
        quickAction: 'meal',
      }],
    }));

    expect(plan.guidanceCard).toMatchObject({
      contentVersion: expect.stringMatching(/^local-/),
      dayNumber: 5,
      slot: 'guidance',
    });
  });
});
