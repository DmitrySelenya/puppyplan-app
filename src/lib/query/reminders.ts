import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  reminderScheduleDraftSchema,
  type ReminderScheduleDraft,
} from '@/contracts/reminders';
import type { Reminder } from '@/contracts/supabase';
import { createSupabaseReminderRepository } from '@/lib/supabase/reminders';
import type {
  ReminderDeleteUpdate,
  ReminderEnabledUpdate,
  ReminderInsert,
  ReminderQuietHours,
  ReminderScheduleUpdate,
  SupabaseReminderRepository,
} from '@/lib/supabase/reminders';

import { queryKeys } from './keys';

const defaultReminderTime = '7:30';
const defaultReminderTimezone = 'UTC';
const defaultQuietHours: ReminderQuietHours = {
  enabled: true,
  end: '07:00',
  start: '22:00',
};
const inactiveHouseholdId = 'inactive-household';
const inactivePuppyId = 'inactive-puppy';

export type ReminderCreateDraft = Readonly<{
  householdId: string;
  puppyId: string;
  reminderName: string;
  respectQuietHours?: boolean;
  // Full-contract path (PUP-28): when present, reminder_type = schedule.trackerId and
  // schedule_rule = schedule.rule; timezone becomes required (no silent UTC).
  schedule?: ReminderScheduleDraft;
  timezone?: string;
  todayDate: string;
  userId: string;
}>;

export type ReminderScheduleUpdateDraft = Readonly<{
  householdId: string;
  puppyId: string;
  reminderId: string;
  schedule: ReminderScheduleDraft;
  timezone: string;
  todayDate: string;
}>;

export type ReminderScheduleUpdateMutationOptions = Readonly<{
  mutationFn(draft: ReminderScheduleUpdateDraft): Promise<Reminder>;
  onSuccess(record: Reminder, draft: ReminderScheduleUpdateDraft): Promise<void>;
}>;

export type ReminderCreateMutationOptions = Readonly<{
  mutationFn(draft: ReminderCreateDraft): Promise<Reminder>;
  onSuccess(record: Reminder, draft: ReminderCreateDraft): Promise<void>;
}>;

export type ReminderToggleDraft = Readonly<{
  enabled: boolean;
  householdId: string;
  puppyId: string;
  reminderId: string;
  todayDate: string;
}>;

export type ReminderToggleMutationOptions = Readonly<{
  mutationFn(draft: ReminderToggleDraft): Promise<Reminder>;
  onSuccess(record: Reminder, draft: ReminderToggleDraft): Promise<void>;
}>;

export type ReminderDeleteDraft = Readonly<{
  deletedAt: string;
  householdId: string;
  puppyId: string;
  reminderId: string;
  todayDate: string;
}>;

export type ReminderDeleteMutationOptions = Readonly<{
  mutationFn(draft: ReminderDeleteDraft): Promise<void>;
  onSuccess(result: void, draft: ReminderDeleteDraft): Promise<void>;
}>;

type ReminderInvalidationClient = Pick<QueryClient, 'invalidateQueries'>;
type RemindersQueryRepository = Pick<SupabaseReminderRepository, 'listReminders'>;

export type RemindersQueryOptions = Readonly<{
  queryFn(): Promise<readonly Reminder[]>;
  queryKey: ReturnType<typeof queryKeys.reminders.list>;
}>;

export function useRemindersQuery(
  householdId: string | undefined,
  puppyId: string | undefined,
  repository: RemindersQueryRepository = createSupabaseReminderRepository(),
) {
  const activeContext = householdId !== undefined && puppyId !== undefined;
  const queryOptions = createRemindersQueryOptions({
    householdId: householdId ?? inactiveHouseholdId,
    puppyId: puppyId ?? inactivePuppyId,
    repository,
  });

  return useQuery({
    ...queryOptions,
    enabled: activeContext,
  });
}

export function createRemindersQueryOptions(
  dependencies: Readonly<{
    householdId: string;
    puppyId: string;
    repository: RemindersQueryRepository;
  }>,
): RemindersQueryOptions {
  return {
    queryFn: () => dependencies.repository.listReminders({
      puppyId: dependencies.puppyId,
    }),
    queryKey: queryKeys.reminders.list(
      dependencies.householdId,
      dependencies.puppyId,
    ),
  };
}

export function useCreateReminderMutation(
  repository: Pick<SupabaseReminderRepository, 'insertReminder'> =
  createSupabaseReminderRepository(),
) {
  const queryClient = useQueryClient();
  const options = createReminderCreateMutationOptions({
    queryClient,
    repository,
  });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function useToggleReminderEnabledMutation(
  repository: Pick<SupabaseReminderRepository, 'updateReminderEnabled'> =
  createSupabaseReminderRepository(),
) {
  const queryClient = useQueryClient();
  const options = createReminderToggleMutationOptions({
    queryClient,
    repository,
  });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function useDeleteReminderMutation(
  repository: Pick<SupabaseReminderRepository, 'deleteReminder'> =
  createSupabaseReminderRepository(),
) {
  const queryClient = useQueryClient();
  const options = createReminderDeleteMutationOptions({
    queryClient,
    repository,
  });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function useUpdateReminderScheduleMutation(
  repository: Pick<SupabaseReminderRepository, 'updateReminderSchedule'> =
  createSupabaseReminderRepository(),
) {
  const queryClient = useQueryClient();
  const options = createReminderScheduleUpdateMutationOptions({
    queryClient,
    repository,
  });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function toReminderInsert(draft: ReminderCreateDraft): ReminderInsert {
  const base = {
    assigned_to: null,
    created_by: draft.userId,
    enabled: true,
    puppy_id: draft.puppyId,
    quiet_hours: draft.respectQuietHours ? defaultQuietHours : null,
    trusted_sitter_visible: false,
  } as const;

  if (draft.schedule === undefined) {
    // Legacy static-form path (pre-PUP-29 callers).
    return {
      ...base,
      reminder_type: draft.reminderName.trim(),
      schedule_rule: {
        repeat: 'daily',
        time: defaultReminderTime,
      },
      timezone: defaultReminderTimezone,
    };
  }

  if (draft.timezone === undefined) {
    throw new Error('reminder_schedule_requires_timezone');
  }

  const schedule = reminderScheduleDraftSchema.parse(draft.schedule);

  return {
    ...base,
    reminder_type: schedule.trackerId,
    schedule_rule: schedule.rule,
    timezone: draft.timezone,
  };
}

export function toReminderScheduleUpdate(
  draft: ReminderScheduleUpdateDraft,
): ReminderScheduleUpdate {
  const schedule = reminderScheduleDraftSchema.parse(draft.schedule);

  return {
    id: draft.reminderId,
    puppy_id: draft.puppyId,
    reminder_type: schedule.trackerId,
    schedule_rule: schedule.rule,
    timezone: draft.timezone,
  };
}

export function toReminderToggleUpdate(draft: ReminderToggleDraft): ReminderEnabledUpdate {
  return {
    enabled: draft.enabled,
    id: draft.reminderId,
    puppy_id: draft.puppyId,
  };
}

export function toReminderDeleteUpdate(draft: ReminderDeleteDraft): ReminderDeleteUpdate {
  return {
    deleted_at: draft.deletedAt,
    id: draft.reminderId,
    puppy_id: draft.puppyId,
  };
}

export function createReminderCreateMutationOptions(
  dependencies: Readonly<{
    queryClient?: ReminderInvalidationClient;
    repository: Pick<SupabaseReminderRepository, 'insertReminder'>;
  }>,
): ReminderCreateMutationOptions {
  return {
    mutationFn: (draft) => dependencies.repository.insertReminder(toReminderInsert(draft)),
    onSuccess: async (_record, draft) => {
      await Promise.all([
        dependencies.queryClient?.invalidateQueries({
          queryKey: queryKeys.reminders.list(draft.householdId, draft.puppyId),
        }),
        dependencies.queryClient?.invalidateQueries({
          queryKey: queryKeys.today.dashboard(draft.householdId, draft.puppyId, draft.todayDate),
        }),
      ]);
    },
  };
}

export function createReminderDeleteMutationOptions(
  dependencies: Readonly<{
    queryClient?: ReminderInvalidationClient;
    repository: Pick<SupabaseReminderRepository, 'deleteReminder'>;
  }>,
): ReminderDeleteMutationOptions {
  return {
    mutationFn: (draft) => dependencies.repository.deleteReminder(toReminderDeleteUpdate(draft)),
    onSuccess: async (_result, draft) => {
      await Promise.all([
        dependencies.queryClient?.invalidateQueries({
          queryKey: queryKeys.reminders.list(draft.householdId, draft.puppyId),
        }),
        dependencies.queryClient?.invalidateQueries({
          queryKey: queryKeys.today.dashboard(draft.householdId, draft.puppyId, draft.todayDate),
        }),
      ]);
    },
  };
}

export function createReminderScheduleUpdateMutationOptions(
  dependencies: Readonly<{
    queryClient?: ReminderInvalidationClient;
    repository: Pick<SupabaseReminderRepository, 'updateReminderSchedule'>;
  }>,
): ReminderScheduleUpdateMutationOptions {
  return {
    mutationFn: (draft) =>
      dependencies.repository.updateReminderSchedule(toReminderScheduleUpdate(draft)),
    onSuccess: async (_record, draft) => {
      await Promise.all([
        dependencies.queryClient?.invalidateQueries({
          queryKey: queryKeys.reminders.list(draft.householdId, draft.puppyId),
        }),
        dependencies.queryClient?.invalidateQueries({
          queryKey: queryKeys.today.dashboard(draft.householdId, draft.puppyId, draft.todayDate),
        }),
      ]);
    },
  };
}

export function createReminderToggleMutationOptions(
  dependencies: Readonly<{
    queryClient?: ReminderInvalidationClient;
    repository: Pick<SupabaseReminderRepository, 'updateReminderEnabled'>;
  }>,
): ReminderToggleMutationOptions {
  return {
    mutationFn: (draft) => dependencies.repository.updateReminderEnabled(toReminderToggleUpdate(draft)),
    onSuccess: async (_record, draft) => {
      await Promise.all([
        dependencies.queryClient?.invalidateQueries({
          queryKey: queryKeys.reminders.list(draft.householdId, draft.puppyId),
        }),
        dependencies.queryClient?.invalidateQueries({
          queryKey: queryKeys.today.dashboard(draft.householdId, draft.puppyId, draft.todayDate),
        }),
      ]);
    },
  };
}
