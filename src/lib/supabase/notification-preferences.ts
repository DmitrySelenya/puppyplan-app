import {
  notificationPreferenceSchema,
  type NotificationPreference,
} from '@/contracts/supabase';

import { getSupabaseClient } from './client';

export type NotificationPreferenceUpsert = Readonly<{
  household_id: string;
  reminder_push_enabled: boolean;
  timezone: string;
  trusted_sitter_completion_push_enabled: boolean;
  user_id: string;
}>;

export type SupabaseNotificationPreferenceRepository = Readonly<{
  getNotificationPreference(
    input: Readonly<{ householdId: string; userId: string }>,
  ): Promise<NotificationPreference | null>;
  upsertNotificationPreference(input: NotificationPreferenceUpsert): Promise<NotificationPreference>;
}>;

export type NotificationPreferenceClient = Readonly<{
  getNotificationPreference(input: Readonly<{ householdId: string; userId: string }>): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
  upsertNotificationPreference(input: NotificationPreferenceUpsert): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
}>;

export function createSupabaseNotificationPreferenceRepository(
  client: NotificationPreferenceClient = createDefaultNotificationPreferenceClient(),
): SupabaseNotificationPreferenceRepository {
  return {
    getNotificationPreference: async (input) => {
      const response = await client.getNotificationPreference(input);

      if (response.error) {
        throw new Error('notification_preference_get_failed');
      }

      return response.data === null
        ? null
        : notificationPreferenceSchema.parse(response.data);
    },
    upsertNotificationPreference: async (input) => {
      const response = await client.upsertNotificationPreference(input);

      if (response.error || response.data === null) {
        throw new Error('notification_preference_upsert_failed');
      }

      return notificationPreferenceSchema.parse(response.data);
    },
  };
}

const notificationPreferenceSelectColumns = [
  'id',
  'user_id',
  'household_id',
  'reminder_push_enabled',
  'trusted_sitter_completion_push_enabled',
  'quiet_hours',
  'timezone',
  'updated_at',
  'created_at',
].join(',');

function createDefaultNotificationPreferenceClient(): NotificationPreferenceClient {
  return {
    getNotificationPreference: ({ householdId, userId }) => getSupabaseClient()
      .from('notification_preference')
      .select(notificationPreferenceSelectColumns)
      .eq('user_id', userId)
      .eq('household_id', householdId)
      .maybeSingle(),
    upsertNotificationPreference: (input) => getSupabaseClient()
      .from('notification_preference')
      .upsert(input, { onConflict: 'user_id,household_id' })
      .select(notificationPreferenceSelectColumns)
      .maybeSingle(),
  };
}
