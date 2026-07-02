import type { Reminder } from '@/contracts/supabase';
import {
  createReminderCreateMutationOptions,
  createReminderToggleMutationOptions,
  createRemindersQueryOptions,
  toReminderInsert,
  toReminderToggleUpdate,
  type ReminderCreateDraft,
  type ReminderToggleDraft,
} from '@/lib/query/reminders';
import {
  createSupabaseReminderRepository,
  type ReminderClient,
} from '@/lib/supabase/reminders';

const userId = '00000000-0000-4000-8000-000000004001';
const householdId = '00000000-0000-4000-8000-000000004002';
const puppyId = '00000000-0000-4000-8000-000000004003';

const reminder: Reminder = {
  assigned_to: null,
  created_at: '2026-07-02T10:00:00.000Z',
  created_by: userId,
  deleted_at: null,
  enabled: true,
  id: '00000000-0000-4000-8000-000000004004',
  puppy_id: puppyId,
  quiet_hours: null,
  reminder_type: 'Morning potty',
  schedule_rule: {
    repeat: 'daily',
    time: '7:30',
  },
  timezone: 'UTC',
  trusted_sitter_visible: false,
  updated_at: '2026-07-02T10:05:00.000Z',
  version: 1,
};

const draft: ReminderCreateDraft = {
  householdId,
  puppyId,
  reminderName: ' Morning potty ',
  todayDate: '2026-07-02',
  userId,
};

const toggleDraft: ReminderToggleDraft = {
  enabled: false,
  householdId,
  puppyId,
  reminderId: reminder.id,
  todayDate: '2026-07-02',
};

describe('Supabase reminder repository boundary', () => {
  it('AC-REM-DURABLE-1 lists non-deleted puppy reminders through the typed wrapper', async () => {
    const client = createClient({
      insertData: reminder,
      listData: [reminder],
    });
    const repository = createSupabaseReminderRepository(client);

    await expect(repository.listReminders({ puppyId })).resolves.toEqual([reminder]);
    expect(client.listReminders).toHaveBeenCalledWith({ puppyId });
  });

  it('AC-REM-DURABLE-1 inserts and parses a reminder through the Supabase boundary', async () => {
    const client = createClient({
      insertData: reminder,
      listData: [reminder],
    });
    const repository = createSupabaseReminderRepository(client);
    const insert = toReminderInsert(draft);

    await expect(repository.insertReminder(insert)).resolves.toEqual(reminder);
    expect(client.insertReminder).toHaveBeenCalledWith(insert);
  });

  it('AC-REM-DURABLE-1 surfaces insert failures instead of returning defaults', async () => {
    const repository = createSupabaseReminderRepository(createClient({
      insertError: { message: 'denied' },
      listData: [reminder],
    }));

    await expect(repository.insertReminder(toReminderInsert(draft)))
      .rejects.toThrow('reminder_insert_failed');
  });

  it('AC-REM-TOGGLE-1 updates a non-deleted reminder enabled flag through the typed wrapper', async () => {
    const client = createClient({
      insertData: reminder,
      listData: [reminder],
      updateData: {
        ...reminder,
        enabled: false,
      },
    });
    const repository = createSupabaseReminderRepository(client);

    await expect(repository.updateReminderEnabled(toReminderToggleUpdate(toggleDraft)))
      .resolves.toEqual({
        ...reminder,
        enabled: false,
      });
    expect(client.updateReminderEnabled).toHaveBeenCalledWith({
      enabled: false,
      id: reminder.id,
      puppy_id: puppyId,
    });
  });

  it('AC-REM-TOGGLE-1 surfaces enabled update failures instead of returning stale rows', async () => {
    const repository = createSupabaseReminderRepository(createClient({
      insertData: reminder,
      listData: [reminder],
      updateError: { message: 'denied' },
    }));

    await expect(repository.updateReminderEnabled(toReminderToggleUpdate(toggleDraft)))
      .rejects.toThrow('reminder_update_failed');
  });
});

describe('reminder query mutation contract', () => {
  it('AC-REM-DURABLE-3 keeps the read list key aligned with create invalidation', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const listReminders = jest.fn().mockResolvedValue([reminder]);
    const options = createReminderCreateMutationOptions({
      queryClient: { invalidateQueries },
      repository: { insertReminder: jest.fn().mockResolvedValue(reminder) },
    });
    const readOptions = createRemindersQueryOptions({
      householdId,
      puppyId,
      repository: { listReminders },
    });

    await options.onSuccess(reminder, draft);

    expect(readOptions.queryKey).toEqual(['reminders', householdId, puppyId]);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: readOptions.queryKey,
    });
  });

  it('AC-REM-DURABLE-2 builds a trimmed create payload from the existing static form defaults', () => {
    expect(toReminderInsert(draft)).toEqual({
      assigned_to: null,
      created_by: userId,
      enabled: true,
      puppy_id: puppyId,
      quiet_hours: null,
      reminder_type: 'Morning potty',
      schedule_rule: {
        repeat: 'daily',
        time: '7:30',
      },
      timezone: 'UTC',
      trusted_sitter_visible: false,
    });
  });

  it('AC-REM-DURABLE-3 invalidates reminder list and current Diary dashboard after create', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const insertReminder = jest.fn().mockResolvedValue(reminder);
    const options = createReminderCreateMutationOptions({
      queryClient: { invalidateQueries },
      repository: { insertReminder },
    });

    await expect(options.mutationFn(draft)).resolves.toBe(reminder);
    await options.onSuccess(reminder, draft);

    expect(insertReminder).toHaveBeenCalledWith(toReminderInsert(draft));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['reminders', householdId, puppyId],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['today', householdId, puppyId, '2026-07-02'],
    });
  });

  it('AC-REM-TOGGLE-2 invalidates reminder list and current Diary dashboard after enabled toggle', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const updateReminderEnabled = jest.fn().mockResolvedValue({
      ...reminder,
      enabled: false,
    });
    const options = createReminderToggleMutationOptions({
      queryClient: { invalidateQueries },
      repository: { updateReminderEnabled },
    });

    await expect(options.mutationFn(toggleDraft)).resolves.toEqual({
      ...reminder,
      enabled: false,
    });
    await options.onSuccess({ ...reminder, enabled: false }, toggleDraft);

    expect(updateReminderEnabled).toHaveBeenCalledWith(toReminderToggleUpdate(toggleDraft));
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['reminders', householdId, puppyId],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['today', householdId, puppyId, '2026-07-02'],
    });
  });
});

function createClient({
  insertData,
  insertError = null,
  listData,
  listError = null,
  updateData,
  updateError = null,
}: Readonly<{
  insertData?: unknown;
  insertError?: unknown;
  listData?: unknown;
  listError?: unknown;
  updateData?: unknown;
  updateError?: unknown;
}>): jest.Mocked<ReminderClient> & Readonly<{
  updateReminderEnabled: jest.Mock;
}> {
  return {
    insertReminder: jest.fn().mockResolvedValue({
      data: insertData,
      error: insertError,
    }),
    listReminders: jest.fn().mockResolvedValue({
      data: listData,
      error: listError,
    }),
    updateReminderEnabled: jest.fn().mockResolvedValue({
      data: updateData,
      error: updateError,
    }),
  };
}
