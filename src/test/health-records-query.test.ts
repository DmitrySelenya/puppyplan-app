import type { HealthRecord } from '@/contracts/supabase';
import {
  createSupabaseHealthRecordRepository,
  type HealthRecordInsert,
} from '@/lib/supabase/health-records';
import {
  createHealthRecordMutationOptions,
  createHealthRecordDeleteMutationOptions,
  createHealthOutboxReplayOptions,
  createHealthRecordRestoreMutationOptions,
  createHealthRecordUpdateMutationOptions,
  toHealthRecordInsert,
  toHealthRecordUpdate,
  type HealthRecordCreateDraft,
  type HealthRecordDeleteDraft,
  type HealthRecordUpdateDraft,
} from '@/lib/query/health-records';
import { createHealthOutboxItem } from '@/lib/queue/health-outbox';
import { queryKeys } from '@/lib/query/keys';

const puppyId = '00000000-0000-4000-8000-000000003001';
const actorId = '00000000-0000-4000-8000-000000003002';
const recordId = '00000000-0000-4000-8000-000000003003';
const householdId = '00000000-0000-4000-8000-000000003004';
const now = '2026-07-02T09:15:00.000Z';

const healthRecord: HealthRecord = {
  completed_at: null,
  created_at: '2026-07-02T08:00:00.000Z',
  deleted_at: null,
  id: recordId,
  notes: null,
  provider_name: null,
  puppy_id: puppyId,
  record_type: 'vaccination',
  scheduled_for: '2026-07-02',
  source: 'manual',
  status: 'template',
  title: 'DHPP vaccine',
  updated_at: '2026-07-02T08:00:00.000Z',
  updated_by: actorId,
  version: 1,
};

const insert: HealthRecordInsert = {
  completed_at: null,
  notes: null,
  provider_name: null,
  puppy_id: puppyId,
  record_type: 'vaccination',
  scheduled_for: '2026-07-02',
  source: 'manual',
  status: 'template',
  title: 'DHPP vaccine',
  updated_by: actorId,
};

const draft: HealthRecordCreateDraft = {
  householdId,
  notes: '  Bring vaccine card  ',
  providerName: '  Example Vet  ',
  puppyId,
  recordType: 'vaccination',
  scheduledFor: '2026-07-02',
  status: 'template',
  title: '  DHPP vaccine  ',
  userId: actorId,
};

const updateDraft: HealthRecordUpdateDraft = {
  householdId,
  id: recordId,
  notes: '  Bring the paper record  ',
  providerName: '  Clay Vet  ',
  puppyId,
  previousScheduledFor: '2026-07-02',
  recordType: 'vaccination',
  scheduledFor: '2026-07-03',
  source: 'manual',
  status: 'confirmed',
  title: '  DHPP booster  ',
  updatedAt: now,
  userId: actorId,
};

const deleteDraft: HealthRecordDeleteDraft = {
  affectedDate: '2026-07-01',
  deletedAt: now,
  householdId,
  id: recordId,
  puppyId,
  updatedAt: now,
  userId: actorId,
};

describe('Supabase health record repository boundary', () => {
  it('AC-PET-DETAIL-2 fetches one non-deleted puppy health record by id', async () => {
    const client = {
      deleteHealthRecord: jest.fn(),
      getHealthRecord: jest.fn(async () => ({
        data: healthRecord,
        error: null,
      })),
      insertHealthRecord: jest.fn(),
      listHealthRecords: jest.fn(),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };
    const repository = createSupabaseHealthRecordRepository(client);

    await expect(repository.getHealthRecord({ puppyId, recordId })).resolves.toEqual(healthRecord);
    expect(client.getHealthRecord).toHaveBeenCalledWith({ puppyId, recordId });
  });

  it('AC-PET-ADD-DURABLE-1 inserts health records through the typed wrapper', async () => {
    const client = {
      deleteHealthRecord: jest.fn(),
      getHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(async () => ({
        data: healthRecord,
        error: null,
      })),
      listHealthRecords: jest.fn(),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };
    const repository = createSupabaseHealthRecordRepository(client);

    await expect(repository.insertHealthRecord(insert)).resolves.toEqual(healthRecord);
    expect(client.insertHealthRecord).toHaveBeenCalledWith(insert);
  });

  it('AC-PET-ADD-DURABLE-1 lists non-deleted puppy health records in recency order', async () => {
    const client = {
      deleteHealthRecord: jest.fn(),
      getHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(),
      listHealthRecords: jest.fn(async () => ({
        data: [healthRecord],
        error: null,
      })),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };
    const repository = createSupabaseHealthRecordRepository(client);

    await expect(repository.listHealthRecords({ puppyId })).resolves.toEqual([healthRecord]);
    expect(client.listHealthRecords).toHaveBeenCalledWith({ puppyId });
  });

  it('AC-PET-EDIT-DURABLE-1 updates health records through the typed wrapper', async () => {
    const client = {
      deleteHealthRecord: jest.fn(),
      getHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(),
      listHealthRecords: jest.fn(),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(async () => ({
        data: {
          ...healthRecord,
          provider_name: 'Clay Vet',
          status: 'confirmed',
          title: 'DHPP booster',
          updated_at: now,
        },
        error: null,
      })),
    };
    const repository = createSupabaseHealthRecordRepository(client);
    const update = toHealthRecordUpdate(updateDraft);

    await expect(repository.updateHealthRecord(update)).resolves.toMatchObject({
      provider_name: 'Clay Vet',
      status: 'confirmed',
      title: 'DHPP booster',
      updated_at: now,
    });
    expect(client.updateHealthRecord).toHaveBeenCalledWith(update);
  });

  it('AC-PET-EDIT-DURABLE-2 soft-deletes health records without selecting the tombstone through RLS', async () => {
    const client = {
      deleteHealthRecord: jest.fn(async () => ({
        count: 1,
        data: null,
        error: null,
      })),
      getHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(),
      listHealthRecords: jest.fn(),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };
    const repository = createSupabaseHealthRecordRepository(client);

    await expect(repository.deleteHealthRecord({
      deleted_at: now,
      id: recordId,
      puppy_id: puppyId,
      updated_at: now,
      updated_by: actorId,
    })).resolves.toBeUndefined();
    expect(client.deleteHealthRecord).toHaveBeenCalledWith({
      deleted_at: now,
      id: recordId,
      puppy_id: puppyId,
      updated_at: now,
      updated_by: actorId,
    });
  });

  it('AC-PET-EDIT-DURABLE-2 treats a zero-row soft delete as a failed delete', async () => {
    const client = {
      deleteHealthRecord: jest.fn(async () => ({
        count: 0,
        data: null,
        error: null,
      })),
      getHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(),
      listHealthRecords: jest.fn(),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };
    const repository = createSupabaseHealthRecordRepository(client);

    await expect(repository.deleteHealthRecord({
      deleted_at: now,
      id: recordId,
      puppy_id: puppyId,
      updated_at: now,
      updated_by: actorId,
    })).rejects.toThrow('health_record_delete_failed');
  });

  it('AC-HO-3 attaches scrubbed failure kinds so the outbox can classify repository errors', async () => {
    const client = {
      deleteHealthRecord: jest.fn(async () => ({
        count: null,
        data: null,
        error: { code: '42501', message: 'permission denied' },
      })),
      getHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(async () => ({
        data: null,
        error: { code: '23514', message: 'check constraint violated' },
      })),
      listHealthRecords: jest.fn(),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };
    const repository = createSupabaseHealthRecordRepository(client);

    await expect(repository.deleteHealthRecord({
      deleted_at: now,
      id: recordId,
      puppy_id: puppyId,
      updated_at: now,
      updated_by: actorId,
    })).rejects.toMatchObject({
      kind: 'permission_denied',
      message: 'health_record_delete_failed',
    });
    await expect(repository.insertHealthRecord({
      ...insert,
      id: recordId,
    })).rejects.toMatchObject({
      kind: 'invalid_payload',
      message: 'health_record_insert_failed',
    });
  });

  it('AC-PET-EDIT-DURABLE-3 restores health records through the typed wrapper', async () => {
    const client = {
      deleteHealthRecord: jest.fn(),
      getHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(),
      listHealthRecords: jest.fn(),
      restoreHealthRecord: jest.fn(async () => ({
        data: healthRecord,
        error: null,
      })),
      updateHealthRecord: jest.fn(),
    };
    const repository = createSupabaseHealthRecordRepository(client);

    await expect(repository.restoreHealthRecord({
      id: recordId,
      puppy_id: puppyId,
      updated_at: now,
      updated_by: actorId,
    })).resolves.toEqual(healthRecord);
    expect(client.restoreHealthRecord).toHaveBeenCalledWith({
      id: recordId,
      puppy_id: puppyId,
      updated_at: now,
      updated_by: actorId,
    });
  });
});

describe('health record query mutation contract', () => {
  it('AC-PET-ADD-DURABLE-2 maps a create draft to the current health_record schema', () => {
    expect(toHealthRecordInsert(draft)).toEqual({
      completed_at: null,
      notes: 'Bring vaccine card',
      provider_name: 'Example Vet',
      puppy_id: puppyId,
      record_type: 'vaccination',
      scheduled_for: '2026-07-02',
      source: 'template',
      status: 'template',
      title: 'DHPP vaccine',
      updated_by: actorId,
    });
  });

  it('AC-PET-ADD-DURABLE-4 sends the normalized insert through the repository', async () => {
    const repository = {
      insertHealthRecord: jest.fn(async () => healthRecord),
    };
    const options = createHealthRecordMutationOptions({ repository });

    await expect(options.mutationFn(draft)).resolves.toEqual(healthRecord);
    expect(repository.insertHealthRecord).toHaveBeenCalledWith(toHealthRecordInsert(draft));
  });

  it('AC-PET-ADD-DURABLE-4 invalidates health, Today, puppy summary, and sharing projections', async () => {
    const invalidateQueries = jest.fn(async () => undefined);
    const repository = {
      insertHealthRecord: jest.fn(async () => healthRecord),
    };
    const options = createHealthRecordMutationOptions({
      queryClient: { invalidateQueries },
      repository,
    });

    await options.onSuccess(healthRecord, draft);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.health.records(puppyId),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.today.dashboard(draft.householdId, puppyId, '2026-07-02'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.puppy.summary(draft.householdId, puppyId),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.sharing.projectionRoot(draft.householdId, puppyId),
    });
  });

  it('AC-PET-EDIT-DURABLE-1 maps an update draft to the current health_record schema', () => {
    expect(toHealthRecordUpdate(updateDraft)).toEqual({
      completed_at: null,
      id: recordId,
      notes: 'Bring the paper record',
      provider_name: 'Clay Vet',
      puppy_id: puppyId,
      record_type: 'vaccination',
      scheduled_for: '2026-07-03',
      source: 'manual',
      status: 'confirmed',
      title: 'DHPP booster',
      updated_at: now,
      updated_by: actorId,
    });
  });

  it('AC-PET-EDIT-DURABLE-4 sends update/delete/restore through the repository', async () => {
    const repository = {
      deleteHealthRecord: jest.fn(async () => undefined),
      restoreHealthRecord: jest.fn(async () => healthRecord),
      updateHealthRecord: jest.fn(async () => healthRecord),
    };
    const updateOptions = createHealthRecordUpdateMutationOptions({ repository });
    const deleteOptions = createHealthRecordDeleteMutationOptions({ repository });
    const restoreOptions = createHealthRecordRestoreMutationOptions({ repository });

    await expect(updateOptions.mutationFn(updateDraft)).resolves.toEqual(healthRecord);
    await expect(deleteOptions.mutationFn(deleteDraft)).resolves.toBeUndefined();
    await expect(restoreOptions.mutationFn(deleteDraft)).resolves.toEqual(healthRecord);

    expect(repository.updateHealthRecord).toHaveBeenCalledWith(toHealthRecordUpdate(updateDraft));
    expect(repository.deleteHealthRecord).toHaveBeenCalledWith({
      deleted_at: now,
      id: recordId,
      puppy_id: puppyId,
      updated_at: now,
      updated_by: actorId,
    });
    expect(repository.restoreHealthRecord).toHaveBeenCalledWith({
      id: recordId,
      puppy_id: puppyId,
      updated_at: now,
      updated_by: actorId,
    });
  });

  it('AC-PET-EDIT-DURABLE-4 invalidates dependent Health, Today, puppy, and sharing queries', async () => {
    const invalidateQueries = jest.fn(async () => undefined);
    const repository = {
      deleteHealthRecord: jest.fn(async () => undefined),
      restoreHealthRecord: jest.fn(async () => healthRecord),
      updateHealthRecord: jest.fn(async () => healthRecord),
    };
    const updateOptions = createHealthRecordUpdateMutationOptions({
      queryClient: { invalidateQueries },
      repository,
    });
    const deleteOptions = createHealthRecordDeleteMutationOptions({
      queryClient: { invalidateQueries },
      repository,
    });
    const restoreOptions = createHealthRecordRestoreMutationOptions({
      queryClient: { invalidateQueries },
      repository,
    });

    await updateOptions.onSuccess(healthRecord, updateDraft);
    expectHealthRecordInvalidations(invalidateQueries, ['2026-07-02', '2026-07-03']);
    invalidateQueries.mockClear();

    await deleteOptions.onSuccess(undefined, deleteDraft);
    expectHealthRecordInvalidations(invalidateQueries, ['2026-07-01']);
    invalidateQueries.mockClear();

    await restoreOptions.onSuccess(healthRecord, deleteDraft);
    expectHealthRecordInvalidations(invalidateQueries, ['2026-07-01']);
  });
});

describe('health record outbox replay query integration', () => {
  it('AC-HO-5 replays a queued create and invalidates Health dependents', async () => {
    const invalidateQueries = jest.fn(async () => undefined);
    const repository = {
      deleteHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(async () => healthRecord),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };
    const item = createHealthOutboxItem({
      actor_id: actorId,
      household_id: householdId,
      operation: 'create',
      operation_id: '00000000-0000-4000-8000-000000004101',
      payload: {
        insert: {
          ...insert,
          id: recordId,
        },
      },
      puppy_id: puppyId,
    }, { now });
    const options = createHealthOutboxReplayOptions({
      queryClient: { invalidateQueries },
      repository,
    });

    await expect(options.mutationFn(item)).resolves.toEqual({
      operation: 'create',
      record: healthRecord,
    });
    await options.onSuccess({
      operation: 'create',
      record: healthRecord,
    }, item);

    expect(repository.insertHealthRecord).toHaveBeenCalledWith({
      ...insert,
      id: recordId,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.health.records(puppyId),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.health.record(puppyId, recordId),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.today.dashboard(householdId, puppyId, '2026-07-02'),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.puppy.summary(householdId, puppyId),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.sharing.projectionRoot(householdId, puppyId),
    });
  });

  it('AC-HO-5 invalidates every Today dashboard date after a delete replay', async () => {
    const invalidateQueries = jest.fn(async () => undefined);
    const repository = {
      deleteHealthRecord: jest.fn(async () => undefined),
      insertHealthRecord: jest.fn(),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };
    const item = createHealthOutboxItem({
      actor_id: actorId,
      household_id: householdId,
      operation: 'delete',
      operation_id: '00000000-0000-4000-8000-000000004103',
      payload: {
        delete: {
          deleted_at: now,
          id: recordId,
          puppy_id: puppyId,
          updated_at: now,
          updated_by: actorId,
        },
      },
      puppy_id: puppyId,
    }, { now });
    const options = createHealthOutboxReplayOptions({
      queryClient: { invalidateQueries },
      repository,
    });

    await expect(options.mutationFn(item)).resolves.toEqual({ operation: 'delete' });
    await options.onSuccess({ operation: 'delete' }, item);

    // The delete payload carries no scheduled date, so the replay must invalidate the
    // whole Today dashboard family for the puppy instead of silently skipping it.
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.today.dashboardRoot(householdId, puppyId),
    });
  });

  it('AC-HO-5 surfaces replay errors instead of reporting fake success', async () => {
    const repository = {
      deleteHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(async () => {
        throw new Error('health_record_insert_failed');
      }),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };
    const item = createHealthOutboxItem({
      actor_id: actorId,
      household_id: householdId,
      operation: 'create',
      operation_id: '00000000-0000-4000-8000-000000004102',
      payload: {
        insert: {
          ...insert,
          id: recordId,
        },
      },
      puppy_id: puppyId,
    }, { now });
    const options = createHealthOutboxReplayOptions({ repository });

    await expect(options.mutationFn(item)).rejects.toThrow('health_record_insert_failed');
  });
});

function expectHealthRecordInvalidations(
  invalidateQueries: jest.Mock,
  dates: readonly string[],
) {
  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: queryKeys.health.records(puppyId),
  });
  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: queryKeys.health.record(puppyId, recordId),
  });
  for (const date of dates) {
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.today.dashboard(householdId, puppyId, date),
    });
  }
  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: queryKeys.puppy.summary(householdId, puppyId),
  });
  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: queryKeys.sharing.projectionRoot(householdId, puppyId),
  });
}
