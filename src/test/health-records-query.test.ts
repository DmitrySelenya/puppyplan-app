import type { HealthRecord } from '@/contracts/supabase';
import {
  createSupabaseHealthRecordRepository,
  type HealthRecordInsert,
} from '@/lib/supabase/health-records';
import {
  createHealthRecordMutationOptions,
  toHealthRecordInsert,
  type HealthRecordCreateDraft,
} from '@/lib/query/health-records';
import { queryKeys } from '@/lib/query/keys';

const puppyId = '00000000-0000-4000-8000-000000003001';
const actorId = '00000000-0000-4000-8000-000000003002';
const recordId = '00000000-0000-4000-8000-000000003003';

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
  householdId: '00000000-0000-4000-8000-000000003004',
  notes: '  Bring vaccine card  ',
  providerName: '  Example Vet  ',
  puppyId,
  recordType: 'vaccination',
  scheduledFor: '2026-07-02',
  status: 'template',
  title: '  DHPP vaccine  ',
  userId: actorId,
};

describe('Supabase health record repository boundary', () => {
  it('AC-PET-ADD-DURABLE-1 inserts health records through the typed wrapper', async () => {
    const client = {
      insertHealthRecord: jest.fn(async () => ({
        data: healthRecord,
        error: null,
      })),
      listHealthRecords: jest.fn(),
    };
    const repository = createSupabaseHealthRecordRepository(client);

    await expect(repository.insertHealthRecord(insert)).resolves.toEqual(healthRecord);
    expect(client.insertHealthRecord).toHaveBeenCalledWith(insert);
  });

  it('AC-PET-ADD-DURABLE-1 lists non-deleted puppy health records in recency order', async () => {
    const client = {
      insertHealthRecord: jest.fn(),
      listHealthRecords: jest.fn(async () => ({
        data: [healthRecord],
        error: null,
      })),
    };
    const repository = createSupabaseHealthRecordRepository(client);

    await expect(repository.listHealthRecords({ puppyId })).resolves.toEqual([healthRecord]);
    expect(client.listHealthRecords).toHaveBeenCalledWith({ puppyId });
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
});
