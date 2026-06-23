import {
  defaultQuickLogTrackerIds,
} from '@/contracts/quick-log';
import type { ActivePuppyProfile } from '@/contracts/supabase';
import {
  createActiveCareContext,
  getTodayDate,
} from '@/lib/query/active-care-context';
import { queryKeys } from '@/lib/query/keys';

const householdId = '00000000-0000-4000-8000-000000002101';
const puppyId = '00000000-0000-4000-8000-000000002102';
const userId = '00000000-0000-4000-8000-000000002103';

const puppy: ActivePuppyProfile = {
  age_weeks_estimate: 9,
  birth_date: null,
  created_at: '2026-06-08T08:00:00.000Z',
  deleted_at: null,
  household_id: householdId,
  household_role: 'owner',
  id: puppyId,
  name: 'Puppy',
  quick_tracker_ids: ['walk', 'feeding'],
  updated_at: '2026-06-08T08:00:00.000Z',
};

describe('active care context query contract', () => {
  it('uses a stable active puppy cache key for the authenticated user', () => {
    expect(queryKeys.puppy.active(userId)).toEqual([
      'puppy',
      'active',
      userId,
    ]);
  });

  it('creates Quick Log compatible care context from a durable puppy row', () => {
    expect(createActiveCareContext({
      puppy,
      todayDate: '2026-06-08',
      userId,
    })).toEqual({
      authState: 'authenticated',
      householdId,
      householdRole: 'owner',
      puppyId,
      selectedTrackerIds: ['walk', 'feeding'],
      todayDate: '2026-06-08',
      userId,
    });
  });

  it('falls back to default tracker ids when older puppy rows omit the column', () => {
    const context = createActiveCareContext({
      puppy: {
        ...puppy,
        quick_tracker_ids: null,
      },
      todayDate: '2026-06-08',
      userId,
    });

    expect(context?.selectedTrackerIds).toEqual(defaultQuickLogTrackerIds);
  });

  it('falls back to default tracker ids when a runtime row carries an empty array', () => {
    const context = createActiveCareContext({
      puppy: {
        ...puppy,
        quick_tracker_ids: [],
      },
      todayDate: '2026-06-08',
      userId,
    });

    expect(context?.selectedTrackerIds).toEqual(defaultQuickLogTrackerIds);
  });

  it('formats today dates from the device-local calendar day', () => {
    const deviceLocalDate = {
      getDate: () => 8,
      getFullYear: () => 2026,
      getMonth: () => 5,
      toISOString: () => '2026-06-09T00:30:00.000Z',
    } as Date;

    expect(getTodayDate(deviceLocalDate)).toBe('2026-06-08');
  });
});
