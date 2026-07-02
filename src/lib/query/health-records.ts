import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import type { HealthRecord } from '@/contracts/supabase';
import { createSupabaseHealthRecordRepository } from '@/lib/supabase/health-records';
import type {
  HealthRecordInsert,
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

export type HealthRecordMutationDependencies = Readonly<{
  queryClient?: Pick<QueryClient, 'invalidateQueries'>;
  repository: Pick<SupabaseHealthRecordRepository, 'insertHealthRecord'>;
}>;

export type HealthRecordMutationOptions = Readonly<{
  mutationFn(draft: HealthRecordCreateDraft): Promise<HealthRecord>;
  onSuccess(record: HealthRecord, draft: HealthRecordCreateDraft): Promise<void>;
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

export function toHealthRecordInsert(draft: HealthRecordCreateDraft): HealthRecordInsert {
  const status = draft.status;

  return {
    completed_at: status === 'done' ? `${draft.scheduledFor}T12:00:00.000Z` : null,
    notes: optionalTrimmed(draft.notes),
    provider_name: optionalTrimmed(draft.providerName),
    puppy_id: draft.puppyId,
    record_type: draft.recordType,
    scheduled_for: draft.scheduledFor,
    source: status === 'template' ? 'template' : 'confirmed',
    status,
    title: draft.title.trim(),
    updated_by: draft.userId,
  };
}

export function createHealthRecordMutationOptions(
  dependencies: HealthRecordMutationDependencies,
): HealthRecordMutationOptions {
  return {
    mutationFn: (draft) => dependencies.repository.insertHealthRecord(toHealthRecordInsert(draft)),
    onSuccess: async (_record, draft) => {
      if (!dependencies.queryClient) {
        return;
      }

      await Promise.all([
        dependencies.queryClient.invalidateQueries({
          queryKey: queryKeys.health.records(draft.puppyId),
        }),
        dependencies.queryClient.invalidateQueries({
          queryKey: queryKeys.today.dashboard(draft.householdId, draft.puppyId, draft.scheduledFor),
        }),
        dependencies.queryClient.invalidateQueries({
          queryKey: queryKeys.puppy.summary(draft.householdId, draft.puppyId),
        }),
        dependencies.queryClient.invalidateQueries({
          queryKey: queryKeys.sharing.projectionRoot(draft.householdId, draft.puppyId),
        }),
      ]);
    },
  };
}

function optionalTrimmed(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}
