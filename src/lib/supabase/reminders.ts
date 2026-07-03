import { z } from 'zod';

import {
  reminderSchema,
  type Reminder,
} from '@/contracts/supabase';

import { getSupabaseClient } from './client';

export type ReminderScheduleRule = Readonly<{
  repeat: 'daily';
  time: string;
}>;

export type ReminderQuietHours = Readonly<{
  enabled: true;
  end: string;
  start: string;
}>;

export type ReminderInsert = Readonly<{
  assigned_to: string | null;
  created_by: string;
  enabled: boolean;
  puppy_id: string;
  quiet_hours: ReminderQuietHours | null;
  reminder_type: string;
  schedule_rule: ReminderScheduleRule;
  timezone: string;
  trusted_sitter_visible: boolean;
}>;

export type ReminderEnabledUpdate = Readonly<{
  enabled: boolean;
  id: string;
  puppy_id: string;
}>;

export type SupabaseReminderRepository = Readonly<{
  insertReminder(insert: ReminderInsert): Promise<Reminder>;
  listReminders(input: Readonly<{ puppyId: string }>): Promise<readonly Reminder[]>;
  updateReminderEnabled(update: ReminderEnabledUpdate): Promise<Reminder>;
}>;

export type ReminderClient = Readonly<{
  insertReminder(insert: ReminderInsert): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
  listReminders(input: Readonly<{ puppyId: string }>): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
  updateReminderEnabled(update: ReminderEnabledUpdate): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
}>;

export function createSupabaseReminderRepository(
  client: ReminderClient = createDefaultReminderClient(),
): SupabaseReminderRepository {
  return {
    insertReminder: async (insert) => {
      const response = await client.insertReminder(insert);

      if (response.error) {
        throw new Error('reminder_insert_failed');
      }

      return reminderSchema.parse(response.data);
    },
    listReminders: async (input) => {
      const response = await client.listReminders(input);

      if (response.error) {
        throw new Error('reminder_list_failed');
      }

      return z.array(reminderSchema).parse(response.data);
    },
    updateReminderEnabled: async (update) => {
      const response = await client.updateReminderEnabled(update);

      if (response.error || response.data === null) {
        throw new Error('reminder_update_failed');
      }

      return reminderSchema.parse(response.data);
    },
  };
}

const reminderSelectColumns = [
  'id',
  'puppy_id',
  'created_by',
  'assigned_to',
  'reminder_type',
  'schedule_rule',
  'timezone',
  'quiet_hours',
  'enabled',
  'trusted_sitter_visible',
  'version',
  'created_at',
  'updated_at',
  'deleted_at',
].join(',');

function createDefaultReminderClient(): ReminderClient {
  return {
    insertReminder: (insert) => getSupabaseClient()
      .from('reminder')
      .insert(insert)
      .select(reminderSelectColumns)
      .maybeSingle(),
    listReminders: ({ puppyId }) => getSupabaseClient()
      .from('reminder')
      .select(reminderSelectColumns)
      .eq('puppy_id', puppyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    updateReminderEnabled: ({ id, puppy_id, enabled }) => getSupabaseClient()
      .from('reminder')
      .update({ enabled })
      .eq('id', id)
      .eq('puppy_id', puppy_id)
      .is('deleted_at', null)
      .select(reminderSelectColumns)
      .maybeSingle(),
  };
}
