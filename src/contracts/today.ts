import { z } from 'zod';

import {
  STARTER_GUIDANCE_CONTENT_VERSION,
  getStarterGuidanceForDay,
  starterGuidanceTopicIdSchema,
} from './guidance';
import {
  dateSchema,
  eventTypeSchema,
} from './supabase';

export const TODAY_MAX_DAILY_CARDS = 5;

export const todayTimeOfDayValues = ['morning', 'midday', 'evening'] as const;
export const todayHeroVariants = [
  'first_day',
  'day_2_morning',
  'accident_recovery',
  'missed_reminder',
  'day_7_weekly_rhythm',
  'steady_day',
] as const;
export const todayDailyCardVariants = [
  'starter_action_potty',
  'starter_action_sleep',
  'starter_action_feeding',
  'recap_yesterday',
  'feeding_pattern',
  'after_invite',
  'quick_log_prompt',
  'sleep_rhythm',
  'potty_rhythm',
  'timeline_review',
  'health_calm_check',
  'tracker_settings',
] as const;
export const todayDeferredProductionFeatures = ['family_invite', 'reminders'] as const;

export const todayTimeOfDaySchema = z.enum(todayTimeOfDayValues);
export const todayHeroVariantSchema = z.enum(todayHeroVariants);
export const todayDailyCardVariantSchema = z.enum(todayDailyCardVariants);
export const todayDeferredProductionFeatureSchema = z.enum(todayDeferredProductionFeatures);

const todayQuickActionSchema = z.enum([
  'pee_outside',
  'pee_inside',
  'poop',
  'meal',
  'nap',
  'other',
]);

export const todayEventSummarySchema = z.object({
  eventType: eventTypeSchema,
  minutesAgo: z.number().int().min(0).max(60 * 24 * 7),
  quickAction: todayQuickActionSchema.optional(),
}).strict();

export const todaySyntheticSignalsSchema = z.object({
  afterInvite: z.object({
    actorLabel: z.string().trim().min(1).max(32),
    minutesAgo: z.number().int().min(0).max(60 * 24),
  }).strict().optional(),
  missedReminder: z.object({
    reminderKind: z.enum(['feeding', 'potty', 'sleep']),
    scheduledLocalTime: z.string().regex(/^\d{2}:\d{2}$/),
  }).strict().optional(),
}).strict();

export const todayFeedingPatternSchema = z.object({
  lastFeedingLocalTime: z.string().regex(/^\d{2}:\d{2}$/),
  usualAmount: z.enum(['meal', 'snack', 'water', 'unknown']),
}).strict();

export const todayWeeklySummarySchema = z.object({
  feedingCount: z.number().int().min(0),
  pottyCount: z.number().int().min(0),
  sleepHoursPerDay: z.number().min(0).max(24),
}).strict();

export const todayPlanInputSchema = z.object({
  completedGuidanceTopicIds: z.array(starterGuidanceTopicIdSchema).default([]),
  dayNumber: z.number().int().min(1).max(90),
  eventCounts: z.record(eventTypeSchema, z.number().int().min(0)).default({}),
  feedingPattern: todayFeedingPatternSchema.optional(),
  lastEvents: z.array(todayEventSummarySchema).default([]),
  suggestedDailyCards: z.array(todayDailyCardVariantSchema).default([]),
  syntheticSignals: todaySyntheticSignalsSchema.default({}),
  timeOfDay: todayTimeOfDaySchema.optional(),
  todayDate: dateSchema,
  weeklySummary: todayWeeklySummarySchema.optional(),
}).strict();

export const todayHeroCardSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().min(0),
  slot: z.literal('hero'),
  variant: todayHeroVariantSchema,
}).strict();

export const todayDailyCardSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().min(0),
  slot: z.literal('daily'),
  syntheticOnly: z.boolean().optional(),
  variant: todayDailyCardVariantSchema,
}).strict();

export const todayGuidanceCardSchema = z.object({
  contentVersion: z.literal(STARTER_GUIDANCE_CONTENT_VERSION),
  dayNumber: z.number().int().min(1).max(14),
  slot: z.literal('guidance'),
  topicId: starterGuidanceTopicIdSchema,
}).strict();

export const todayPlanSchema = z.object({
  dailyCards: z.array(todayDailyCardSchema).max(TODAY_MAX_DAILY_CARDS),
  deferredProductionFeatures: z.array(todayDeferredProductionFeatureSchema),
  guidanceCard: todayGuidanceCardSchema.nullable(),
  hero: todayHeroCardSchema,
  todayDate: dateSchema,
}).strict();

export type TodayPlanInput = z.input<typeof todayPlanInputSchema>;
export type TodayPlan = z.infer<typeof todayPlanSchema>;
export type TodayHeroVariant = z.infer<typeof todayHeroVariantSchema>;
export type TodayDailyCardVariant = z.infer<typeof todayDailyCardVariantSchema>;
export type TodayDeferredProductionFeature = z.infer<typeof todayDeferredProductionFeatureSchema>;

export function buildTodayPlan(input: TodayPlanInput): TodayPlan {
  const parsedInput = todayPlanInputSchema.parse(input);
  const deferredProductionFeatures = createDeferredProductionFeatures(parsedInput);
  const guidanceTopic = getStarterGuidanceForDay({
    completedTopicIds: parsedInput.completedGuidanceTopicIds,
    dayNumber: parsedInput.dayNumber,
  });

  return todayPlanSchema.parse({
    dailyCards: buildDailyCards(parsedInput),
    deferredProductionFeatures,
    guidanceCard: guidanceTopic === null
      ? null
      : {
        contentVersion: STARTER_GUIDANCE_CONTENT_VERSION,
        dayNumber: guidanceTopic.dayNumber,
        slot: 'guidance',
        topicId: guidanceTopic.id,
      },
    hero: buildHero(parsedInput),
    todayDate: parsedInput.todayDate,
  });
}

function buildHero(input: z.infer<typeof todayPlanInputSchema>): z.infer<typeof todayHeroCardSchema> {
  const variant = selectHeroVariant(input);

  return {
    id: `hero:${variant}`,
    priority: heroPriority[variant],
    slot: 'hero',
    variant,
  };
}

function selectHeroVariant(input: z.infer<typeof todayPlanInputSchema>): TodayHeroVariant {
  if (input.syntheticSignals.missedReminder !== undefined) {
    return 'missed_reminder';
  }

  if (input.lastEvents.some((event) =>
    event.eventType === 'potty' && event.quickAction === 'pee_inside')) {
    return 'accident_recovery';
  }

  if (input.dayNumber === 7 && input.weeklySummary !== undefined) {
    return 'day_7_weekly_rhythm';
  }

  if (input.dayNumber === 2 && input.timeOfDay === 'morning') {
    return 'day_2_morning';
  }

  if (input.dayNumber === 1) {
    return 'first_day';
  }

  return 'steady_day';
}

function buildDailyCards(
  input: z.infer<typeof todayPlanInputSchema>,
): z.infer<typeof todayDailyCardSchema>[] {
  const variants: {
    syntheticOnly?: boolean;
    variant: TodayDailyCardVariant;
  }[] = [];

  if (input.syntheticSignals.afterInvite !== undefined) {
    variants.push({
      syntheticOnly: true,
      variant: 'after_invite',
    });
  }

  if (input.feedingPattern !== undefined) {
    variants.push({ variant: 'feeding_pattern' });
  }

  if (input.dayNumber === 2 && input.timeOfDay === 'morning') {
    variants.push({ variant: 'recap_yesterday' });
  }

  if (input.dayNumber === 1) {
    variants.push(
      { variant: 'starter_action_potty' },
      { variant: 'starter_action_sleep' },
      { variant: 'starter_action_feeding' },
    );
  }

  for (const variant of input.suggestedDailyCards) {
    variants.push({ variant });
  }

  variants.push({ variant: 'timeline_review' });

  return uniqueDailyCards(variants)
    .slice(0, TODAY_MAX_DAILY_CARDS)
    .map((card, index) => ({
      id: `daily:${card.variant}`,
      priority: index + 1,
      slot: 'daily',
      syntheticOnly: card.syntheticOnly,
      variant: card.variant,
    }));
}

function uniqueDailyCards(
  cards: readonly {
    syntheticOnly?: boolean;
    variant: TodayDailyCardVariant;
  }[],
) {
  const seen = new Set<TodayDailyCardVariant>();

  return cards.filter((card) => {
    if (seen.has(card.variant)) {
      return false;
    }

    seen.add(card.variant);

    return true;
  });
}

function createDeferredProductionFeatures(
  input: z.infer<typeof todayPlanInputSchema>,
): TodayDeferredProductionFeature[] {
  const features: TodayDeferredProductionFeature[] = [];

  if (input.syntheticSignals.afterInvite !== undefined) {
    features.push('family_invite');
  }

  if (input.syntheticSignals.missedReminder !== undefined) {
    features.push('reminders');
  }

  return features;
}

const heroPriority = {
  missed_reminder: 10,
  accident_recovery: 20,
  day_7_weekly_rhythm: 30,
  day_2_morning: 40,
  first_day: 50,
  steady_day: 60,
} as const satisfies Record<TodayHeroVariant, number>;
