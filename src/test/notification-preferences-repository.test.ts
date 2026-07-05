import {
  createSupabaseNotificationPreferenceRepository,
  type NotificationPreferenceClient,
  type NotificationPreferenceUpsert,
} from '@/lib/supabase/notification-preferences';

const userId = '00000000-0000-4000-8000-000000003101';
const householdId = '00000000-0000-4000-8000-000000003102';

const row = {
  created_at: '2026-07-02T10:00:00.000Z',
  household_id: householdId,
  id: '00000000-0000-4000-8000-000000003103',
  quiet_hours: null,
  reminder_push_enabled: true,
  timezone: 'Europe/Warsaw',
  trusted_sitter_completion_push_enabled: false,
  updated_at: '2026-07-02T10:05:00.000Z',
  user_id: userId,
};

const upsert: NotificationPreferenceUpsert = {
  household_id: householdId,
  reminder_push_enabled: true,
  timezone: 'Europe/Warsaw',
  trusted_sitter_completion_push_enabled: false,
  user_id: userId,
};

describe('Supabase notification preference repository', () => {
  it('AC-NOTIF-PERSIST-1 parses a household notification preference row', async () => {
    const repository = createSupabaseNotificationPreferenceRepository(createClient({
      getData: row,
      upsertData: row,
    }));

    await expect(repository.getNotificationPreference({ householdId, userId }))
      .resolves.toEqual(row);
  });

  it('AC-NOTIF-PERSIST-2 returns null when the current user has no preference row yet', async () => {
    const repository = createSupabaseNotificationPreferenceRepository(createClient({
      getData: null,
      upsertData: row,
    }));

    await expect(repository.getNotificationPreference({ householdId, userId }))
      .resolves.toBeNull();
  });

  it('AC-NOTIF-PERSIST-3 upserts and parses notification preferences through the Supabase boundary', async () => {
    const client = createClient({
      getData: row,
      upsertData: row,
    });
    const repository = createSupabaseNotificationPreferenceRepository(client);

    await expect(repository.upsertNotificationPreference(upsert)).resolves.toEqual(row);
    expect(client.upsertNotificationPreference).toHaveBeenCalledWith(upsert);
  });

  it('AC-NOTIF-PERSIST-1 surfaces Supabase read failures instead of returning defaults', async () => {
    const repository = createSupabaseNotificationPreferenceRepository(createClient({
      getError: { message: 'denied' },
      upsertData: row,
    }));

    await expect(repository.getNotificationPreference({ householdId, userId }))
      .rejects.toThrow('notification_preference_get_failed');
  });
});

function createClient({
  getData,
  getError = null,
  upsertData,
  upsertError = null,
}: Readonly<{
  getData?: unknown;
  getError?: unknown;
  upsertData?: unknown;
  upsertError?: unknown;
}>): jest.Mocked<NotificationPreferenceClient> {
  return {
    getNotificationPreference: jest.fn().mockResolvedValue({
      data: getData,
      error: getError,
    }),
    upsertNotificationPreference: jest.fn().mockResolvedValue({
      data: upsertData,
      error: upsertError,
    }),
  };
}
