import type { HealthRecord } from '@/contracts/supabase';
import {
  applyHealthOutboxTransition,
  canTransitionHealthOutboxState,
  classifyHealthOutboxError,
  createHealthOutboxItem,
  normalizeHealthOutboxFailureForPersistence,
  processNextHealthOutboxItem,
  replayHealthOutboxItem,
  type HealthOutboxStoredItem,
} from '@/lib/queue/health-outbox';
import type { HealthRecordInsert } from '@/lib/supabase/health-records';

const operationId = '00000000-0000-4000-8000-000000004001';
const householdId = '00000000-0000-4000-8000-000000004002';
const puppyId = '00000000-0000-4000-8000-000000004003';
const actorId = '00000000-0000-4000-8000-000000004004';
const recordId = '00000000-0000-4000-8000-000000004005';
const now = '2026-07-04T10:00:00.000Z';

const insert: HealthRecordInsert & Readonly<{ id: string }> = {
  completed_at: null,
  id: recordId,
  notes: 'Bring the paper record',
  provider_name: 'Example Vet',
  puppy_id: puppyId,
  record_type: 'vaccination',
  scheduled_for: '2026-07-04',
  source: 'manual',
  status: 'confirmed',
  title: 'DHPP booster',
  updated_by: actorId,
};

const healthRecord: HealthRecord = {
  completed_at: null,
  created_at: now,
  deleted_at: null,
  id: recordId,
  notes: 'Bring the paper record',
  provider_name: 'Example Vet',
  puppy_id: puppyId,
  record_type: 'vaccination',
  scheduled_for: '2026-07-04',
  source: 'manual',
  status: 'confirmed',
  title: 'DHPP booster',
  updated_at: now,
  updated_by: actorId,
  version: 1,
};

describe('Health outbox contracts and state machine', () => {
  it('AC-HO-2 creates a pending Health create operation with preserved actor', () => {
    const item = createHealthOutboxItem({
      actor_id: actorId,
      household_id: householdId,
      operation: 'create',
      operation_id: operationId,
      payload: {
        insert,
      },
      puppy_id: puppyId,
    }, { now });

    expect(item).toMatchObject({
      actor_id: actorId,
      household_id: householdId,
      operation: 'create',
      operation_id: operationId,
      puppy_id: puppyId,
      state: 'pending_local',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
      created_at: now,
      updated_at: now,
    });
    expect(item.payload).toEqual({ insert });
  });

  it('AC-HO-2 rejects unsupported operations and missing actor before enqueue', () => {
    expect(() => createHealthOutboxItem({
      actor_id: actorId,
      household_id: householdId,
      operation: 'unsupported',
      operation_id: operationId,
      payload: {
        insert,
      },
      puppy_id: puppyId,
    }, { now })).toThrow();

    expect(() => createHealthOutboxItem({
      actor_id: null,
      household_id: householdId,
      operation: 'create',
      operation_id: operationId,
      payload: {
        insert,
      },
      puppy_id: puppyId,
    }, { now })).toThrow();
  });

  it('AC-HO-3 allows only documented transitions and stores scrubbed failure metadata', () => {
    const item = createHealthOutboxItem({
      actor_id: actorId,
      household_id: householdId,
      operation: 'create',
      operation_id: operationId,
      payload: {
        insert,
      },
      puppy_id: puppyId,
    }, { now });

    expect(canTransitionHealthOutboxState('pending_local', 'sending')).toBe(true);
    expect(canTransitionHealthOutboxState('sending', 'server_confirmed')).toBe(true);
    expect(canTransitionHealthOutboxState('sending', 'failed_retryable')).toBe(true);
    expect(canTransitionHealthOutboxState('failed_retryable', 'sending')).toBe(true);
    expect(canTransitionHealthOutboxState('failed_retryable', 'failed_permanent')).toBe(true);
    expect(canTransitionHealthOutboxState('pending_local', 'server_confirmed')).toBe(false);
    expect(canTransitionHealthOutboxState('server_confirmed', 'sending')).toBe(false);

    const sending = applyHealthOutboxTransition(item, {
      now: '2026-07-04T10:00:01.000Z',
      type: 'mark_sending',
    });
    const failed = applyHealthOutboxTransition(sending, {
      errorCategory: 'network_unavailable',
      now: '2026-07-04T10:00:02.000Z',
      retryAfterAt: '2026-07-04T10:00:05.000Z',
      type: 'mark_failed_retryable',
    });

    expect(failed).toMatchObject({
      state: 'failed_retryable',
      retry_count: 1,
      last_error_category: 'network_unavailable',
      retry_after_at: '2026-07-04T10:00:05.000Z',
    });

    expect(() => applyHealthOutboxTransition(sending, {
      errorCategory: 'raw backend message with private note',
      now: '2026-07-04T10:00:03.000Z',
      retryAfterAt: null,
      type: 'mark_failed_retryable',
    })).toThrow('Invalid Health outbox retryable error category');
  });

  it('AC-HO-3 normalizes raw failures to scrubbed retry decisions', () => {
    const decision = normalizeHealthOutboxFailureForPersistence({
      error: new Error('backend leaked provider Example Vet and private note'),
      retryCount: 0,
    });

    expect(decision).toEqual({
      category: 'unknown',
      decision: 'retryable',
      retryAfterMs: 30_000,
    });
    expect(JSON.stringify(decision)).not.toContain('Example Vet');
    expect(JSON.stringify(decision)).not.toContain('private note');
  });

  it('AC-HO-3 applies a growing default backoff to retryable failures so retries are never immediate', () => {
    const firstAttempt = classifyHealthOutboxError({
      kind: 'network_unavailable',
      retryCount: 0,
    });
    const thirdAttempt = classifyHealthOutboxError({
      kind: 'request_timeout',
      retryCount: 2,
    });
    const cappedAttempt = classifyHealthOutboxError({
      kind: 'server_5xx',
      retryCount: 20,
    });
    const serverProvided = classifyHealthOutboxError({
      kind: 'rate_limited',
      retryAfterMs: 1_000,
      retryCount: 0,
    });
    const rateLimitedFallback = classifyHealthOutboxError({
      kind: 'rate_limited',
      retryCount: 1,
    });

    expect(firstAttempt).toEqual({
      category: 'network_unavailable',
      decision: 'retryable',
      retryAfterMs: 30_000,
    });
    expect(thirdAttempt.retryAfterMs).toBe(120_000);
    expect(cappedAttempt.retryAfterMs).toBe(600_000);
    expect(serverProvided.retryAfterMs).toBe(1_000);
    expect(rateLimitedFallback.retryAfterMs).toBe(60_000);
  });
});

describe('Health outbox replay', () => {
  it('AC-HO-5 replays create through the typed Health repository', async () => {
    const item = createHealthOutboxItem({
      actor_id: actorId,
      household_id: householdId,
      operation: 'create',
      operation_id: operationId,
      payload: {
        insert,
      },
      puppy_id: puppyId,
    }, { now });
    const repository = {
      deleteHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(async () => healthRecord),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };

    await expect(replayHealthOutboxItem(item, { repository })).resolves.toEqual({
      operation: 'create',
      record: healthRecord,
    });
    expect(repository.insertHealthRecord).toHaveBeenCalledWith(insert);
  });

  it('AC-HO-5 rejects missing-actor rows instead of replaying as the current user', async () => {
    const item = {
      ...createHealthOutboxItem({
        actor_id: actorId,
        household_id: householdId,
        operation: 'create',
        operation_id: operationId,
        payload: {
          insert,
        },
        puppy_id: puppyId,
      }, { now }),
      actor_id: null,
    };
    const repository = {
      deleteHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(async () => healthRecord),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };

    await expect(replayHealthOutboxItem(item, { repository })).rejects.toThrow('health_outbox_missing_actor');
    expect(repository.insertHealthRecord).not.toHaveBeenCalled();
  });

  it('AC-HO-5 surfaces repository failures instead of reporting fake success', async () => {
    const item = createHealthOutboxItem({
      actor_id: actorId,
      household_id: householdId,
      operation: 'create',
      operation_id: operationId,
      payload: {
        insert,
      },
      puppy_id: puppyId,
    }, { now });
    const repository = {
      deleteHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(async () => {
        throw new Error('health_record_insert_failed');
      }),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };

    await expect(replayHealthOutboxItem(item, { repository })).rejects.toThrow('health_record_insert_failed');
  });
});

describe('Health outbox processor', () => {
  it('AC-HO-5 claims a ready item, replays it, and marks it confirmed', async () => {
    const item = createHealthOutboxItem({
      actor_id: actorId,
      household_id: householdId,
      operation: 'create',
      operation_id: operationId,
      payload: {
        insert,
      },
      puppy_id: puppyId,
    }, { now });
    const sendingItem = applyHealthOutboxTransition(item, {
      now: '2026-07-04T10:00:01.000Z',
      type: 'mark_sending',
    });
    const storage = {
      claimNextReadyToSend: jest.fn(async () => sendingItem),
      markFailedPermanent: jest.fn(),
      markFailedRetryable: jest.fn(),
      markServerConfirmed: jest.fn(async () => applyHealthOutboxTransition(sendingItem, {
        now: '2026-07-04T10:00:02.000Z',
        type: 'mark_server_confirmed',
      })),
    };
    const repository = {
      deleteHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(async () => healthRecord),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };

    await expect(processNextHealthOutboxItem({
      now: '2026-07-04T10:00:02.000Z',
      repository,
      storage,
    })).resolves.toMatchObject({
      outcome: 'sent',
      operationId,
      replay: {
        operation: 'create',
        record: healthRecord,
      },
    });
    expect(storage.claimNextReadyToSend).toHaveBeenCalledWith({
      now: '2026-07-04T10:00:02.000Z',
    });
    expect(storage.markServerConfirmed).toHaveBeenCalledWith(operationId, {
      now: '2026-07-04T10:00:02.000Z',
    });
    expect(storage.markFailedRetryable).not.toHaveBeenCalled();
    expect(storage.markFailedPermanent).not.toHaveBeenCalled();
  });

  it('AC-HO-5 classifies replay failures and records retryable state without fake success', async () => {
    const sendingItem = applyHealthOutboxTransition(createHealthOutboxItem({
      actor_id: actorId,
      household_id: householdId,
      operation: 'create',
      operation_id: operationId,
      payload: {
        insert,
      },
      puppy_id: puppyId,
    }, { now }), {
      now: '2026-07-04T10:00:01.000Z',
      type: 'mark_sending',
    });
    const storage = {
      claimNextReadyToSend: jest.fn(async () => sendingItem),
      markFailedPermanent: jest.fn(),
      markFailedRetryable: jest.fn(async (
        _operationId: string,
        options: Readonly<{
          errorCategory: string;
          retryAfterAt: string | null;
          now: string;
        }>,
      ): Promise<HealthOutboxStoredItem> => applyHealthOutboxTransition(sendingItem, {
        errorCategory: options.errorCategory,
        now: options.now,
        retryAfterAt: options.retryAfterAt,
        type: 'mark_failed_retryable',
      })),
      markServerConfirmed: jest.fn(),
    };
    const repository = {
      deleteHealthRecord: jest.fn(),
      insertHealthRecord: jest.fn(async () => {
        throw { kind: 'network_unavailable' };
      }),
      restoreHealthRecord: jest.fn(),
      updateHealthRecord: jest.fn(),
    };

    await expect(processNextHealthOutboxItem({
      now: '2026-07-04T10:00:02.000Z',
      repository,
      storage,
    })).resolves.toMatchObject({
      category: 'network_unavailable',
      outcome: 'failed_retryable',
      operationId,
    });
    expect(storage.markFailedRetryable).toHaveBeenCalledWith(operationId, {
      errorCategory: 'network_unavailable',
      now: '2026-07-04T10:00:02.000Z',
      retryAfterAt: '2026-07-04T10:00:32.000Z',
    });
    expect(storage.markServerConfirmed).not.toHaveBeenCalled();
  });
});
