import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import type { Reminder } from '@/contracts/supabase';
import { createSupabaseReminderRepository } from '@/lib/supabase/reminders';
import type {
  ReminderEnabledUpdate,
  ReminderInsert,
  SupabaseReminderRepository,
} from '@/lib/supabase/reminders';

import { queryKeys } from './keys';

const defaultReminderTime = '7:30';
const defaultReminderTimezone = 'UTC';
const inactiveHouseholdId = 'inactive-household';
const inactivePuppyId = 'inactive-puppy';

export type ReminderCreateDraft = Readonly<{
  householdId: string;
  puppyId: string;
  reminderName: string;
  todayDate: string;
  userId: string;
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

export function toReminderInsert(draft: ReminderCreateDraft): ReminderInsert {
  return {
    assigned_to: null,
    created_by: draft.userId,
    enabled: true,
    puppy_id: draft.puppyId,
    quiet_hours: null,
    reminder_type: draft.reminderName.trim(),
    schedule_rule: {
      repeat: 'daily',
      time: defaultReminderTime,
    },
    timezone: defaultReminderTimezone,
    trusted_sitter_visible: false,
  };
}

export function toReminderToggleUpdate(draft: ReminderToggleDraft): ReminderEnabledUpdate {
  return {
    enabled: draft.enabled,
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
