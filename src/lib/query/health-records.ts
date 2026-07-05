import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import type { HealthRecord } from '@/contracts/supabase';
import {
  replayHealthOutboxItem,
  type HealthOutboxReplayRepository,
  type HealthOutboxReplayResult,
  type HealthOutboxStoredItem,
} from '@/lib/queue/health-outbox';
import { createSupabaseHealthRecordRepository } from '@/lib/supabase/health-records';
import type {
  HealthRecordDelete,
  HealthRecordInsert,
  HealthRecordRestore,
  HealthRecordUpdate,
  SupabaseHealthRecordRepository,
} from '@/lib/supabase/health-records';

import { queryKeys } from './keys';

export type HealthRecordDraftStatus = 'template' | 'confirmed' | 'done';

export type HealthRecordCreateDraft = Readonly<{
  householdId: string;
  notes: string;
  providerName: string;
  puppyId: string;
  recordType: string;
  scheduledFor: string;
  status: HealthRecordDraftStatus;
  title: string;
  userId: string;
}>;

export type HealthRecordUpdateDraft = Readonly<{
  householdId: string;
  id: string;
  notes: string;
  providerName: string;
  previousScheduledFor?: string;
  puppyId: string;
  recordType: string;
  scheduledFor: string;
  source: HealthRecordInsert['source'];
  status: HealthRecordDraftStatus;
  title: string;
  updatedAt: string;
  userId: string;
}>;

export type HealthRecordDeleteDraft = Readonly<{
  affectedDate: string;
  deletedAt: string;
  householdId: string;
  id: string;
  puppyId: string;
  updatedAt: string;
  userId: string;
}>;

type QueryInvalidationClient = Pick<QueryClient, 'invalidateQueries'>;

export type HealthRecordCreateMutationDependencies = Readonly<{
  queryClient?: QueryInvalidationClient;
  repository: Pick<SupabaseHealthRecordRepository, 'insertHealthRecord'>;
}>;

export type HealthRecordUpdateMutationDependencies = Readonly<{
  queryClient?: QueryInvalidationClient;
  repository: Pick<SupabaseHealthRecordRepository, 'updateHealthRecord'>;
}>;

export type HealthRecordDeleteMutationDependencies = Readonly<{
  queryClient?: QueryInvalidationClient;
  repository: Pick<SupabaseHealthRecordRepository, 'deleteHealthRecord'>;
}>;

export type HealthRecordRestoreMutationDependencies = Readonly<{
  queryClient?: QueryInvalidationClient;
  repository: Pick<SupabaseHealthRecordRepository, 'restoreHealthRecord'>;
}>;

export type HealthRecordMutationOptions<TDraft = HealthRecordCreateDraft, TResult = HealthRecord> = Readonly<{
  mutationFn(draft: TDraft): Promise<TResult>;
  onSuccess(record: TResult, draft: TDraft): Promise<void>;
}>;

export type HealthOutboxReplayMutationDependencies = Readonly<{
  queryClient?: QueryInvalidationClient;
  repository: HealthOutboxReplayRepository;
}>;

export type HealthOutboxReplayMutationOptions = Readonly<{
  mutationFn(item: HealthOutboxStoredItem): Promise<HealthOutboxReplayResult>;
  onSuccess(result: HealthOutboxReplayResult, item: HealthOutboxStoredItem): Promise<void>;
}>;

export function useHealthRecordsQuery(
  puppyId: string | undefined,
  repository: Pick<SupabaseHealthRecordRepository, 'listHealthRecords'> =
  createSupabaseHealthRecordRepository(),
) {
  return useQuery({
    enabled: puppyId !== undefined,
    queryFn: () => repository.listHealthRecords({ puppyId: puppyId ?? '' }),
    queryKey: puppyId === undefined
      ? ['health', 'records', 'inactive']
      : queryKeys.health.records(puppyId),
  });
}

export function useHealthRecordDetailQuery(
  puppyId: string | undefined,
  recordId: string | undefined,
  repository: Pick<SupabaseHealthRecordRepository, 'getHealthRecord'> =
  createSupabaseHealthRecordRepository(),
) {
  return useQuery({
    enabled: puppyId !== undefined && recordId !== undefined,
    queryFn: () => repository.getHealthRecord({
      puppyId: puppyId ?? '',
      recordId: recordId ?? '',
    }),
    queryKey: puppyId === undefined || recordId === undefined
      ? ['health', 'records', 'detail', 'inactive']
      : queryKeys.health.record(puppyId, recordId),
  });
}

export function useCreateHealthRecordMutation(
  repository: Pick<SupabaseHealthRecordRepository, 'insertHealthRecord'> =
  createSupabaseHealthRecordRepository(),
) {
  const queryClient = useQueryClient();
  const options = createHealthRecordMutationOptions({
    queryClient,
    repository,
  });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function useUpdateHealthRecordMutation(
  repository: Pick<SupabaseHealthRecordRepository, 'updateHealthRecord'> =
  createSupabaseHealthRecordRepository(),
) {
  const queryClient = useQueryClient();
  const options = createHealthRecordUpdateMutationOptions({
    queryClient,
    repository,
  });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function useDeleteHealthRecordMutation(
  repository: Pick<SupabaseHealthRecordRepository, 'deleteHealthRecord'> =
  createSupabaseHealthRecordRepository(),
) {
  const queryClient = useQueryClient();
  const options = createHealthRecordDeleteMutationOptions({
    queryClient,
    repository,
  });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function useRestoreHealthRecordMutation(
  repository: Pick<SupabaseHealthRecordRepository, 'restoreHealthRecord'> =
  createSupabaseHealthRecordRepository(),
) {
  const queryClient = useQueryClient();
  const options = createHealthRecordRestoreMutationOptions({
    queryClient,
    repository,
  });

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: options.onSuccess,
  });
}

export function toHealthRecordInsert(draft: HealthRecordCreateDraft): HealthRecordInsert {
  return {
    completed_at: healthRecordCompletedAt(draft.status, draft.scheduledFor),
    notes: optionalTrimmed(draft.notes),
    provider_name: optionalTrimmed(draft.providerName),
    puppy_id: draft.puppyId,
    record_type: draft.recordType,
    scheduled_for: draft.scheduledFor,
    source: healthRecordSource(draft.status),
    status: draft.status,
    title: draft.title.trim(),
    updated_by: draft.userId,
  };
}

export function toHealthRecordUpdate(draft: HealthRecordUpdateDraft): HealthRecordUpdate {
  return {
    completed_at: healthRecordCompletedAt(draft.status, draft.scheduledFor),
    id: draft.id,
    notes: optionalTrimmed(draft.notes),
    provider_name: optionalTrimmed(draft.providerName),
    puppy_id: draft.puppyId,
    record_type: draft.recordType,
    scheduled_for: draft.scheduledFor,
    source: draft.source,
    status: draft.status,
    title: draft.title.trim(),
    updated_at: draft.updatedAt,
    updated_by: draft.userId,
  };
}

export function toHealthRecordDelete(draft: HealthRecordDeleteDraft): HealthRecordDelete {
  return {
    deleted_at: draft.deletedAt,
    id: draft.id,
    puppy_id: draft.puppyId,
    updated_at: draft.updatedAt,
    updated_by: draft.userId,
  };
}

export function toHealthRecordRestore(draft: HealthRecordDeleteDraft): HealthRecordRestore {
  return {
    id: draft.id,
    puppy_id: draft.puppyId,
    updated_at: draft.updatedAt,
    updated_by: draft.userId,
  };
}

export function createHealthRecordMutationOptions(
  dependencies: HealthRecordCreateMutationDependencies,
): HealthRecordMutationOptions {
  return {
    mutationFn: (draft) => dependencies.repository.insertHealthRecord(toHealthRecordInsert(draft)),
    onSuccess: async (_record, draft) => {
      await invalidateHealthRecordDependents(dependencies.queryClient, {
        dates: [draft.scheduledFor],
        householdId: draft.householdId,
        puppyId: draft.puppyId,
      });
    },
  };
}

export function createHealthRecordUpdateMutationOptions(
  dependencies: HealthRecordUpdateMutationDependencies,
): HealthRecordMutationOptions<HealthRecordUpdateDraft> {
  return {
    mutationFn: (draft) => dependencies.repository.updateHealthRecord(toHealthRecordUpdate(draft)),
    onSuccess: async (_record, draft) => {
      await invalidateHealthRecordDependents(dependencies.queryClient, {
        dates: uniqueHealthRecordDates([
          draft.previousScheduledFor,
          draft.scheduledFor,
        ]),
        householdId: draft.householdId,
        puppyId: draft.puppyId,
        recordId: draft.id,
      });
    },
  };
}

export function createHealthRecordDeleteMutationOptions(
  dependencies: HealthRecordDeleteMutationDependencies,
): HealthRecordMutationOptions<HealthRecordDeleteDraft, void> {
  return {
    mutationFn: (draft) => dependencies.repository.deleteHealthRecord(toHealthRecordDelete(draft)),
    onSuccess: async (_record, draft) => {
      await invalidateHealthRecordDependents(dependencies.queryClient, {
        dates: [draft.affectedDate],
        householdId: draft.householdId,
        puppyId: draft.puppyId,
        recordId: draft.id,
      });
    },
  };
}

export function createHealthRecordRestoreMutationOptions(
  dependencies: HealthRecordRestoreMutationDependencies,
): HealthRecordMutationOptions<HealthRecordDeleteDraft> {
  return {
    mutationFn: (draft) => dependencies.repository.restoreHealthRecord(toHealthRecordRestore(draft)),
    onSuccess: async (_record, draft) => {
      await invalidateHealthRecordDependents(dependencies.queryClient, {
        dates: [draft.affectedDate],
        householdId: draft.householdId,
        puppyId: draft.puppyId,
        recordId: draft.id,
      });
    },
  };
}

export function createHealthOutboxReplayOptions(
  dependencies: HealthOutboxReplayMutationDependencies,
): HealthOutboxReplayMutationOptions {
  return {
    mutationFn: (item) => replayHealthOutboxItem(item, {
      repository: dependencies.repository,
    }),
    onSuccess: async (result, item) => {
      await invalidateHealthRecordDependents(dependencies.queryClient, {
        // Delete replays carry no record (and no scheduled date), so fall back to
        // invalidating every dashboard date for the puppy instead of skipping Today.
        allDashboardDates: result.operation === 'delete',
        dates: healthOutboxReplayDates(result),
        householdId: item.household_id,
        puppyId: item.puppy_id,
        recordId: healthOutboxReplayRecordId(result),
      });
    },
  };
}

function optionalTrimmed(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function healthRecordSource(status: HealthRecordDraftStatus): HealthRecordInsert['source'] {
  return status === 'template' ? 'template' : 'confirmed';
}

function healthRecordCompletedAt(status: HealthRecordDraftStatus, scheduledFor: string): string | null {
  return status === 'done' ? `${scheduledFor}T12:00:00.000Z` : null;
}

async function invalidateHealthRecordDependents(
  queryClient: QueryInvalidationClient | undefined,
  input: Readonly<{
    allDashboardDates?: boolean;
    dates: readonly string[];
    householdId: string;
    puppyId: string;
    recordId?: string;
  }>,
) {
  if (!queryClient) {
    return;
  }

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.health.records(input.puppyId),
    }),
    ...(input.recordId ? [queryClient.invalidateQueries({
      queryKey: queryKeys.health.record(input.puppyId, input.recordId),
    })] : []),
    ...(input.allDashboardDates === true ? [queryClient.invalidateQueries({
      queryKey: queryKeys.today.dashboardRoot(input.householdId, input.puppyId),
    })] : []),
    ...input.dates.map((date) => queryClient.invalidateQueries({
      queryKey: queryKeys.today.dashboard(input.householdId, input.puppyId, date),
    })),
    queryClient.invalidateQueries({
      queryKey: queryKeys.puppy.summary(input.householdId, input.puppyId),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.sharing.projectionRoot(input.householdId, input.puppyId),
    }),
  ]);
}

function uniqueHealthRecordDates(dates: readonly (string | undefined)[]): readonly string[] {
  return [...new Set(dates.filter(isHealthRecordDate))];
}

function isHealthRecordDate(date: string | undefined): date is string {
  return date !== undefined && date.length > 0;
}

function healthOutboxReplayDates(result: HealthOutboxReplayResult): readonly string[] {
  if (result.operation === 'delete') {
    return [];
  }

  return uniqueHealthRecordDates([result.record.scheduled_for ?? undefined]);
}

function healthOutboxReplayRecordId(result: HealthOutboxReplayResult): string | undefined {
  if (result.operation === 'delete') {
    return undefined;
  }

  return result.record.id;
}
