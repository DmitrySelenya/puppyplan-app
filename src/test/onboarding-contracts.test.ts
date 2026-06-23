import {
  defaultQuickLogTrackerIds,
  MAX_VISIBLE_QUICK_LOG_TRACKERS,
} from '@/contracts/quick-log';
import {
  activeCareContextSchema,
  getPuppyAgeHintKey,
  puppyProfileInputSchema,
  toPuppyProfileWrite,
} from '@/contracts/onboarding';

const householdId = '00000000-0000-4000-8000-000000002001';
const puppyId = '00000000-0000-4000-8000-000000002002';
const userId = '00000000-0000-4000-8000-000000002003';

describe('PUP-21 onboarding and active care contracts', () => {
  it('normalizes a puppy profile for durable puppy writes', () => {
    const profile = puppyProfileInputSchema.parse({
      ageMode: 'age_weeks',
      ageWeeksEstimate: 8,
      birthDate: null,
      name: '  Puppy  ',
      selectedTrackerIds: ['feeding', 'walk'],
    });

    expect(profile.name).toBe('Puppy');
    expect(toPuppyProfileWrite(profile)).toEqual({
      age_weeks_estimate: 8,
      birth_date: null,
      name: 'Puppy',
      quick_tracker_ids: ['feeding', 'walk'],
    });
  });

  it('requires a name and exactly one active age/date mode value', () => {
    expect(puppyProfileInputSchema.safeParse({
      ageMode: 'age_weeks',
      ageWeeksEstimate: null,
      birthDate: null,
      name: 'Puppy',
      selectedTrackerIds: defaultQuickLogTrackerIds,
    }).success).toBe(false);

    expect(puppyProfileInputSchema.safeParse({
      ageMode: 'birth_date',
      ageWeeksEstimate: null,
      birthDate: '2026-05-17',
      name: '',
      selectedTrackerIds: defaultQuickLogTrackerIds,
    }).success).toBe(false);

    expect(puppyProfileInputSchema.safeParse({
      ageMode: 'birth_date',
      ageWeeksEstimate: 8,
      birthDate: null,
      name: 'Puppy',
      selectedTrackerIds: defaultQuickLogTrackerIds,
    }).success).toBe(false);
  });

  it('keeps selected tracker ids ordered, unique, allowed, and capped at five', () => {
    expect(puppyProfileInputSchema.parse({
      ageMode: 'age_weeks',
      ageWeeksEstimate: 12,
      birthDate: null,
      name: 'Puppy',
      selectedTrackerIds: [
        'walk',
        'feeding',
        'sleep',
      ],
    }).selectedTrackerIds).toEqual([
      'walk',
      'feeding',
      'sleep',
    ]);

    expect(puppyProfileInputSchema.safeParse({
      ageMode: 'age_weeks',
      ageWeeksEstimate: 12,
      birthDate: null,
      name: 'Puppy',
      selectedTrackerIds: [
        ...defaultQuickLogTrackerIds,
        'walk',
      ],
    }).success).toBe(false);

    expect(puppyProfileInputSchema.safeParse({
      ageMode: 'age_weeks',
      ageWeeksEstimate: 12,
      birthDate: null,
      name: 'Puppy',
      selectedTrackerIds: ['feeding', 'feeding'],
    }).success).toBe(false);

    expect(puppyProfileInputSchema.safeParse({
      ageMode: 'age_weeks',
      ageWeeksEstimate: 12,
      birthDate: null,
      name: 'Puppy',
      selectedTrackerIds: [],
    }).success).toBe(false);

    expect(puppyProfileInputSchema.safeParse({
      ageMode: 'age_weeks',
      ageWeeksEstimate: 12,
      birthDate: null,
      name: 'Puppy',
      selectedTrackerIds: ['weight'],
    }).success).toBe(false);
  });

  it('maps non-medical age hints into fixed copy buckets', () => {
    expect(getPuppyAgeHintKey(6)).toBe('onboarding.age-hint.6-8-weeks');
    expect(getPuppyAgeHintKey(8)).toBe('onboarding.age-hint.6-8-weeks');
    expect(getPuppyAgeHintKey(10)).toBe('onboarding.age-hint.9-12-weeks');
    expect(getPuppyAgeHintKey(14)).toBe('onboarding.age-hint.13-16-weeks');
    expect(getPuppyAgeHintKey(30)).toBe('onboarding.age-hint.fallback');
  });

  it('requires active care context to include auth, puppy, date, and selected trackers', () => {
    expect(activeCareContextSchema.parse({
      authState: 'authenticated',
      householdId,
      householdRole: 'owner',
      puppyId,
      selectedTrackerIds: defaultQuickLogTrackerIds,
      todayDate: '2026-06-08',
      userId,
    }).selectedTrackerIds).toHaveLength(MAX_VISIBLE_QUICK_LOG_TRACKERS);

    expect(activeCareContextSchema.safeParse({
      authState: 'authenticated',
      householdId,
      householdRole: 'owner',
      puppyId,
      selectedTrackerIds: ['feeding', 'feeding'],
      todayDate: '2026-06-08',
      userId,
    }).success).toBe(false);
  });
});
