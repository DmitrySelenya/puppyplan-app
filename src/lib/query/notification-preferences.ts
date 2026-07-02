import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import type { ActiveCareContext } from '@/contracts/onboarding';
import type { NotificationPreference } from '@/contracts/supabase';
import { createSupabaseNotificationPreferenceRepository } from '@/lib/supabase/notification-preferences';
import type {
  NotificationPreferenceUpsert,
  SupabaseNotificationPreferenceRepository,
} from '@/lib/supabase/notification-preferences';

import { queryKeys } from './keys';

const defaultNotificationPreferenceTimezone = 'UTC';

export type NotificationPreferenceDraft = Readonly<{
  householdId: string;
  reminderPushEnabled: boolean;
  timezone: string;
  trustedSitterCompletionPushEnabled: boolean;
  userId: string;
}>;

export type NotificationPreferenceView = Readonly<{
  row: NotificationPreference | null;
  reminderPushEnabled: boolean;
  timezone: string;
  trustedSitterCompletionPushEnabled: boolean;
}>;

export type NotificationPreferenceMutationOptions = Readonly<{
  mutationFn(draft: NotificationPreferenceDraft): Promise<NotificationPreference>;
  onSuccess(record: NotificationPreference, draft: NotificationPreferenceDraft): Promise<void>;
}>;

type NotificationPreferenceInvalidationClient = Pick<QueryClient, 'invalidateQueries'>;

export function useNotificationPreferenceQuery(
  careContext: ActiveCareContext | null,
  repository: Pick<SupabaseNotificationPreferenceRepository, 'getNotificationPreference'> =
  createSupabaseNotificationPreferenceRepository(),
) {
  return useQuery({
    enabled: careContext !== null,
    queryFn: () => repository.getNotificationPreference({
      householdId: careContext?.householdId ?? '',
      userId: careContext?.userId ?? '',
    }),
    queryKey: careContext === null
      ? ['notifications', 'preferences', 'inactive']
      : queryKeys.notifications.preferences(careContext.userId, careContext.householdId),
  });
}

export function useUpdateNotificationPreferenceMutation(
  repository: Pick<SupabaseNotificationPreferenceRepository, 'upsertNotificationPreference'> =
  createSupabaseNotificationPreferenceRepository(),
) {
  const queryClient = useQueryClient();
  const options = createNotificationPreferenceMutationOptions({
    queryClient,
    repository,
  });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function createNotificationPreferenceView(
  row: NotificationPreference | null,
): NotificationPreferenceView {
  if (row === null) {
    return {
      reminderPushEnabled: true,
      row: null,
      timezone: defaultNotificationPreferenceTimezone,
      trustedSitterCompletionPushEnabled: true,
    };
  }

  return {
    reminderPushEnabled: row.reminder_push_enabled,
    row,
    timezone: row.timezone,
    trustedSitterCompletionPushEnabled: row.trusted_sitter_completion_push_enabled,
  };
}

export function toNotificationPreferenceUpsert(
  draft: NotificationPreferenceDraft,
): NotificationPreferenceUpsert {
  return {
    household_id: draft.householdId,
    reminder_push_enabled: draft.reminderPushEnabled,
    timezone: normalizedTimezone(draft.timezone),
    trusted_sitter_completion_push_enabled: draft.trustedSitterCompletionPushEnabled,
    user_id: draft.userId,
  };
}

export function createNotificationPreferenceMutationOptions(
  dependencies: Readonly<{
    queryClient?: NotificationPreferenceInvalidationClient;
    repository: Pick<SupabaseNotificationPreferenceRepository, 'upsertNotificationPreference'>;
  }>,
): NotificationPreferenceMutationOptions {
  return {
    mutationFn: (draft) => dependencies.repository
      .upsertNotificationPreference(toNotificationPreferenceUpsert(draft)),
    onSuccess: async (_record, draft) => {
      await dependencies.queryClient?.invalidateQueries({
        queryKey: queryKeys.notifications.preferences(draft.userId, draft.householdId),
      });
    },
  };
}

function normalizedTimezone(timezone: string): string {
  const trimmedTimezone = timezone.trim();

  return trimmedTimezone.length > 0
    ? trimmedTimezone
    : defaultNotificationPreferenceTimezone;
}
