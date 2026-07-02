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

export type ReminderInsert = Readonly<{
  assigned_to: string | null;
  created_by: string;
  enabled: boolean;
  puppy_id: string;
  quiet_hours: Record<string, never> | null;
  reminder_type: string;
  schedule_rule: ReminderScheduleRule;
  timezone: string;
  trusted_sitter_visible: boolean;
}>;

export type SupabaseReminderRepository = Readonly<{
  insertReminder(insert: ReminderInsert): Promise<Reminder>;
  listReminders(input: Readonly<{ puppyId: string }>): Promise<readonly Reminder[]>;
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
  };
}
