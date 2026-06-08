import {
  defaultQuickLogTrackerIds,
} from '@/contracts/quick-log';
import type { PuppyProfile } from '@/contracts/supabase';
import {
  createActiveCareContext,
  getTodayDate,
} from '@/lib/query/active-care-context';
import { queryKeys } from '@/lib/query/keys';

const householdId = '00000000-0000-4000-8000-000000002101';
const puppyId = '00000000-0000-4000-8000-000000002102';
const userId = '00000000-0000-4000-8000-000000002103';

const puppy: PuppyProfile = {
  age_weeks_estimate: 9,
  birth_date: null,
  created_at: '2026-06-08T08:00:00.000Z',
  deleted_at: null,
  household_id: householdId,
  id: puppyId,
  name: 'Puppy',
  quick_tracker_ids: ['training', 'feeding_meal'],
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
      puppyId,
      selectedTrackerIds: ['training', 'feeding_meal'],
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

  it('formats today dates without leaking locale-specific output into query keys', () => {
    expect(getTodayDate(new Date('2026-06-08T23:45:00.000Z'))).toBe('2026-06-08');
  });
});
