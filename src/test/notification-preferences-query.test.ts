import type { NotificationPreference } from '@/contracts/supabase';
import {
  createNotificationPreferenceMutationOptions,
  createNotificationPreferenceView,
  toNotificationPreferenceUpsert,
  type NotificationPreferenceDraft,
} from '@/lib/query/notification-preferences';

const userId = '00000000-0000-4000-8000-000000003001';
const householdId = '00000000-0000-4000-8000-000000003002';

const row: NotificationPreference = {
  created_at: '2026-07-02T10:00:00.000Z',
  household_id: householdId,
  id: '00000000-0000-4000-8000-000000003003',
  quiet_hours: null,
  reminder_push_enabled: false,
  timezone: 'Europe/Warsaw',
  trusted_sitter_completion_push_enabled: true,
  updated_at: '2026-07-02T10:05:00.000Z',
  user_id: userId,
};

const draft: NotificationPreferenceDraft = {
  householdId,
  reminderPushEnabled: false,
  timezone: ' Europe/Warsaw ',
  trustedSitterCompletionPushEnabled: true,
  userId,
};

describe('notification preference query contracts', () => {
  it('AC-NOTIF-PERSIST-2 exposes safe app defaults when the preference row is missing', () => {
    expect(createNotificationPreferenceView(null)).toEqual({
      reminderPushEnabled: true,
      row: null,
      timezone: 'UTC',
      trustedSitterCompletionPushEnabled: true,
    });
  });

  it('AC-NOTIF-PERSIST-1 maps an existing notification preference row into the screen view', () => {
    expect(createNotificationPreferenceView(row)).toEqual({
      reminderPushEnabled: false,
      row,
      timezone: 'Europe/Warsaw',
      trustedSitterCompletionPushEnabled: true,
    });
  });

  it('AC-NOTIF-PERSIST-3 builds a stable upsert payload without identity drift', () => {
    expect(toNotificationPreferenceUpsert(draft)).toEqual({
      household_id: householdId,
      reminder_push_enabled: false,
      timezone: 'Europe/Warsaw',
      trusted_sitter_completion_push_enabled: true,
      user_id: userId,
    });
  });

  it('AC-NOTIF-PERSIST-3 upserts preferences and invalidates the household user query', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const upsertNotificationPreference = jest.fn().mockResolvedValue(row);
    const options = createNotificationPreferenceMutationOptions({
      queryClient: { invalidateQueries },
      repository: { upsertNotificationPreference },
    });

    await expect(options.mutationFn(draft)).resolves.toBe(row);
    await options.onSuccess(row, draft);

    expect(upsertNotificationPreference).toHaveBeenCalledWith({
      household_id: householdId,
      reminder_push_enabled: false,
      timezone: 'Europe/Warsaw',
      trusted_sitter_completion_push_enabled: true,
      user_id: userId,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['notifications', 'preferences', userId, householdId],
    });
  });
});
