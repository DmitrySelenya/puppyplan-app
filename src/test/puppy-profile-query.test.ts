import {
  defaultQuickLogTrackerIds,
} from '@/contracts/quick-log';
import { createSupabasePuppyRepository } from '@/lib/supabase/puppies';

const householdId = '00000000-0000-4000-8000-000000002201';
const puppyId = '00000000-0000-4000-8000-000000002202';

describe('Supabase puppy repository boundary', () => {
  it('parses active puppy rows including selected quick tracker ids', async () => {
    const client = {
      insertPuppyProfile: jest.fn(),
      selectActivePuppy: jest.fn(async () => ({
        data: {
          age_weeks_estimate: 10,
          birth_date: null,
          created_at: '2026-06-08T08:00:00.000Z',
          deleted_at: null,
          household_id: householdId,
          id: puppyId,
          name: 'Puppy',
          quick_tracker_ids: ['feeding_meal', 'training'],
          updated_at: '2026-06-08T08:00:00.000Z',
        },
        error: null,
      })),
      updatePuppyProfile: jest.fn(),
    };
    const repository = createSupabasePuppyRepository(client);

    await expect(repository.selectActivePuppy()).resolves.toMatchObject({
      id: puppyId,
      quick_tracker_ids: ['feeding_meal', 'training'],
    });
  });

  it('writes selected quick tracker ids only through the Supabase wrapper', async () => {
    const client = {
      insertPuppyProfile: jest.fn(async () => ({
        data: {
          age_weeks_estimate: 12,
          birth_date: null,
          created_at: '2026-06-08T08:00:00.000Z',
          deleted_at: null,
          household_id: householdId,
          id: puppyId,
          name: 'Puppy',
          quick_tracker_ids: defaultQuickLogTrackerIds,
          updated_at: '2026-06-08T08:00:00.000Z',
        },
        error: null,
      })),
      selectActivePuppy: jest.fn(),
      updatePuppyProfile: jest.fn(),
    };
    const repository = createSupabasePuppyRepository(client);

    await repository.createPuppyProfile({
      age_weeks_estimate: 12,
      birth_date: null,
      household_id: householdId,
      name: 'Puppy',
      quick_tracker_ids: [...defaultQuickLogTrackerIds],
    });

    expect(client.insertPuppyProfile).toHaveBeenCalledWith({
      age_weeks_estimate: 12,
      birth_date: null,
      household_id: householdId,
      name: 'Puppy',
      quick_tracker_ids: [...defaultQuickLogTrackerIds],
    });
  });
});
