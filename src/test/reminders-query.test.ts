import type { Reminder } from '@/contracts/supabase';
import {
  createReminderCreateMutationOptions,
  createReminderDeleteMutationOptions,
  createReminderScheduleUpdateMutationOptions,
  createReminderToggleMutationOptions,
  createRemindersQueryOptions,
  toReminderInsert,
  toReminderDeleteUpdate,
  toReminderScheduleUpdate,
  toReminderToggleUpdate,
  type ReminderCreateDraft,
  type ReminderDeleteDraft,
  type ReminderScheduleUpdateDraft,
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

const deleteDraft: ReminderDeleteDraft = {
  deletedAt: '2026-07-03T08:30:00.000Z',
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

  it('AC-REM-DELETE-1 soft-deletes a non-deleted reminder through the typed wrapper', async () => {
    const client = createClient({
      deleteData: undefined,
      insertData: reminder,
      listData: [reminder],
    });
    const repository = createSupabaseReminderRepository(client);

    expect(typeof repository.deleteReminder).toBe('function');
    await expect(repository.deleteReminder({
      deleted_at: deleteDraft.deletedAt,
      id: reminder.id,
      puppy_id: puppyId,
    })).resolves.toBeUndefined();
    expect(client.deleteReminder).toHaveBeenCalledWith({
      deleted_at: deleteDraft.deletedAt,
      id: reminder.id,
      puppy_id: puppyId,
    });
  });

  it('AC-REM-DELETE-1 surfaces soft-delete failures instead of returning fake success', async () => {
    const repository = createSupabaseReminderRepository(createClient({
      deleteError: { message: 'denied' },
      insertData: reminder,
      listData: [reminder],
    }));

    expect(typeof repository.deleteReminder).toBe('function');
    await expect(repository.deleteReminder({
      deleted_at: deleteDraft.deletedAt,
      id: reminder.id,
      puppy_id: puppyId,
    })).rejects.toThrow('reminder_delete_failed');
  });

  it('AC-REM-DELETE-1 rejects zero-row soft-delete responses instead of reporting success', async () => {
    const repository = createSupabaseReminderRepository(createClient({
      deleteCount: 0,
      insertData: reminder,
      listData: [reminder],
    }));

    await expect(repository.deleteReminder(toReminderDeleteUpdate(deleteDraft)))
      .rejects.toThrow('reminder_delete_failed');
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

  it('AC-REM-QH-1 includes quiet-hours JSON only when the create draft opts in', () => {
    expect(toReminderInsert({
      ...draft,
      respectQuietHours: true,
    })).toEqual(expect.objectContaining({
      quiet_hours: {
        enabled: true,
        end: '07:00',
        start: '22:00',
      },
    }));
    expect(toReminderInsert({
      ...draft,
      respectQuietHours: false,
    })).toEqual(expect.objectContaining({
      quiet_hours: null,
    }));
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

  it('AC-REM-DELETE-2 invalidates reminder list and current Diary dashboard after soft delete', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const deleteReminder = jest.fn().mockResolvedValue(undefined);
    const options = createReminderDeleteMutationOptions({
      queryClient: { invalidateQueries },
      repository: { deleteReminder },
    });

    await expect(options.mutationFn(deleteDraft)).resolves.toBeUndefined();
    await options.onSuccess(undefined, deleteDraft);

    expect(deleteReminder).toHaveBeenCalledWith({
      deleted_at: deleteDraft.deletedAt,
      id: reminder.id,
      puppy_id: puppyId,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['reminders', householdId, puppyId],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['today', householdId, puppyId, '2026-07-02'],
    });
  });
});

describe('full schedule contract create/update (PUP-28 Phase 2)', () => {
  const scheduleDraft: ReminderCreateDraft = {
    householdId,
    puppyId,
    reminderName: 'ignored-when-schedule-present',
    schedule: {
      trackerId: 'feeding',
      rule: {
        repeat: 'weekdays',
        time: '08:00',
        amount: { value: 60, unit: 'g' },
      },
    },
    timezone: 'Europe/Belgrade',
    todayDate: '2026-07-02',
    userId,
  };

  it('AC-REM-SCHED-1 builds a full-contract insert from a schedule draft', () => {
    expect(toReminderInsert(scheduleDraft)).toEqual({
      assigned_to: null,
      created_by: userId,
      enabled: true,
      puppy_id: puppyId,
      quiet_hours: null,
      reminder_type: 'feeding',
      schedule_rule: {
        repeat: 'weekdays',
        time: '08:00',
        amount: { value: 60, unit: 'g' },
      },
      timezone: 'Europe/Belgrade',
      trusted_sitter_visible: false,
    });
  });

  it('AC-P4-4 persists one-off observation title and note in schedule_rule', () => {
    expect(toReminderInsert({
      ...scheduleDraft,
      schedule: {
        trackerId: 'observation',
        rule: {
          date: '2026-07-12',
          note: 'Synthetic private context',
          repeat: 'never',
          time: '18:30',
          title: 'Check calm greeting',
        },
      },
    })).toEqual(expect.objectContaining({
      reminder_type: 'observation',
      schedule_rule: {
        date: '2026-07-12',
        note: 'Synthetic private context',
        repeat: 'never',
        time: '18:30',
        title: 'Check calm greeting',
      },
    }));
  });

  it('AC-REM-SCHED-1 rejects an invalid schedule draft instead of inserting it', () => {
    expect(() => toReminderInsert({
      ...scheduleDraft,
      schedule: {
        trackerId: 'potty',
        rule: { repeat: 'daily', time: '08:00', amount: { value: 5, unit: 'min' } },
      },
    })).toThrow();
  });

  it('AC-REM-SCHED-1 requires an explicit timezone with a schedule draft (no silent UTC)', () => {
    expect(() => toReminderInsert({
      ...scheduleDraft,
      timezone: undefined,
    })).toThrow('reminder_schedule_requires_timezone');
  });

  it('AC-REM-SCHED-2 updates a reminder schedule through the typed wrapper', async () => {
    const client = createClient({ updateData: reminder });
    const repository = createSupabaseReminderRepository({
      ...client,
      updateReminderSchedule: jest.fn().mockResolvedValue({ data: reminder, error: null }),
    });

    const update = toReminderScheduleUpdate(scheduleUpdateDraft);

    await expect(repository.updateReminderSchedule(update)).resolves.toEqual(reminder);
    expect(update).toEqual({
      id: reminder.id,
      puppy_id: puppyId,
      reminder_type: 'feeding',
      schedule_rule: {
        repeat: 'weekdays',
        time: '08:00',
        amount: { value: 60, unit: 'g' },
      },
      timezone: 'Europe/Belgrade',
    });
  });

  it('AC-REM-SCHED-2 surfaces schedule update failures instead of returning stale rows', async () => {
    const client = createClient({});
    const repository = createSupabaseReminderRepository({
      ...client,
      updateReminderSchedule: jest.fn().mockResolvedValue({ data: null, error: { code: '500' } }),
    });

    await expect(
      repository.updateReminderSchedule(toReminderScheduleUpdate(scheduleUpdateDraft)),
    ).rejects.toThrow('reminder_update_failed');
  });

  it('AC-REM-SCHED-3 invalidates reminder list and current Diary dashboard after schedule update', async () => {
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    const updateReminderSchedule = jest.fn().mockResolvedValue(reminder);
    const options = createReminderScheduleUpdateMutationOptions({
      queryClient: { invalidateQueries },
      repository: { updateReminderSchedule },
    });

    await expect(options.mutationFn(scheduleUpdateDraft)).resolves.toEqual(reminder);
    await options.onSuccess(reminder, scheduleUpdateDraft);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['reminders', householdId, puppyId],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['today', householdId, puppyId, '2026-07-02'],
    });
  });
});

const scheduleUpdateDraft: ReminderScheduleUpdateDraft = {
  householdId,
  puppyId,
  reminderId: '00000000-0000-4000-8000-000000004004',
  schedule: {
    trackerId: 'feeding',
    rule: {
      repeat: 'weekdays',
      time: '08:00',
      amount: { value: 60, unit: 'g' },
    },
  },
  timezone: 'Europe/Belgrade',
  todayDate: '2026-07-02',
};

function createClient({
  deleteCount,
  deleteData,
  deleteError = null,
  insertData,
  insertError = null,
  listData,
  listError = null,
  updateData,
  updateError = null,
  scheduleData,
  scheduleError = null,
}: Readonly<{
  deleteCount?: number | null;
  deleteData?: unknown;
  deleteError?: unknown;
  insertData?: unknown;
  insertError?: unknown;
  listData?: unknown;
  listError?: unknown;
  updateData?: unknown;
  updateError?: unknown;
  scheduleData?: unknown;
  scheduleError?: unknown;
}>): jest.Mocked<ReminderClient> & Readonly<{
  deleteReminder: jest.Mock;
  updateReminderEnabled: jest.Mock;
  updateReminderSchedule: jest.Mock;
}> {
  return {
    deleteReminder: jest.fn().mockResolvedValue({
      count: deleteCount,
      data: deleteData,
      error: deleteError,
    }),
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
    updateReminderSchedule: jest.fn().mockResolvedValue({
      data: scheduleData,
      error: scheduleError,
    }),
  };
}
