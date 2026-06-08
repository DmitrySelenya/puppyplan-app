import { z } from 'zod';

import {
  defaultQuickLogTrackerIds,
  selectedQuickLogTrackerIdsSchema,
} from './quick-log';
import {
  dateSchema,
  nonEmptyStringSchema,
  uuidSchema,
} from './supabase';
import type { I18nKey } from '@/lib/i18n';

export const puppyAgeModes = ['age_weeks', 'birth_date'] as const;
export const puppyAgeModeSchema = z.enum(puppyAgeModes);

export const puppyProfileInputSchema = z.object({
  ageMode: puppyAgeModeSchema,
  ageWeeksEstimate: z.number().int().min(0).max(520).nullable(),
  birthDate: dateSchema.nullable(),
  name: nonEmptyStringSchema,
  selectedTrackerIds: selectedQuickLogTrackerIdsSchema.default([...defaultQuickLogTrackerIds]),
}).strict().superRefine((profile, context) => {
  if (profile.ageMode === 'age_weeks' && profile.ageWeeksEstimate === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Age in weeks is required when age mode is selected.',
      path: ['ageWeeksEstimate'],
    });
  }

  if (profile.ageMode === 'birth_date' && profile.birthDate === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Birth date is required when birth date mode is selected.',
      path: ['birthDate'],
    });
  }
});

export const puppyProfileWriteSchema = z.object({
  age_weeks_estimate: z.number().int().min(0).max(520).nullable(),
  birth_date: dateSchema.nullable(),
  name: nonEmptyStringSchema,
  quick_tracker_ids: selectedQuickLogTrackerIdsSchema,
}).strict();

export const activeCareContextSchema = z.object({
  authState: z.literal('authenticated'),
  householdId: uuidSchema,
  puppyId: uuidSchema,
  selectedTrackerIds: selectedQuickLogTrackerIdsSchema,
  todayDate: dateSchema,
  userId: uuidSchema,
}).strict();

export type PuppyAgeMode = z.infer<typeof puppyAgeModeSchema>;
export type PuppyProfileInput = z.infer<typeof puppyProfileInputSchema>;
export type PuppyProfileWrite = z.infer<typeof puppyProfileWriteSchema>;
export type ActiveCareContext = z.infer<typeof activeCareContextSchema>;

export function toPuppyProfileWrite(profile: PuppyProfileInput): PuppyProfileWrite {
  const parsedProfile = puppyProfileInputSchema.parse(profile);

  return puppyProfileWriteSchema.parse({
    age_weeks_estimate: parsedProfile.ageMode === 'age_weeks'
      ? parsedProfile.ageWeeksEstimate
      : null,
    birth_date: parsedProfile.ageMode === 'birth_date'
      ? parsedProfile.birthDate
      : null,
    name: parsedProfile.name,
    quick_tracker_ids: parsedProfile.selectedTrackerIds,
  });
}

export function getPuppyAgeHintKey(ageWeeks: number | null): I18nKey {
  if (ageWeeks !== null && ageWeeks >= 6 && ageWeeks <= 8) {
    return 'onboarding.age-hint.6-8-weeks';
  }

  if (ageWeeks !== null && ageWeeks >= 9 && ageWeeks <= 12) {
    return 'onboarding.age-hint.9-12-weeks';
  }

  if (ageWeeks !== null && ageWeeks >= 13 && ageWeeks <= 16) {
    return 'onboarding.age-hint.13-16-weeks';
  }

  return 'onboarding.age-hint.fallback';
}
