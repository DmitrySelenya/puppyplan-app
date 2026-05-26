import {
  QUICK_LOG_QUEUE_MAX_UNKNOWN_RETRY_COUNT,
  applyQuickLogQueueTransition,
  canTransitionQuickLogQueueState,
  classifyQuickLogQueueError,
  createManualQuickLogRetry,
  getQuickLogRetryDelayMs,
  resolveQuickLogInFlightSuccess,
  type QuickLogStoredQueueItem,
} from '@/lib/queue';

const householdId = '00000000-0000-4000-8000-000000000001';
const puppyId = '00000000-0000-4000-8000-000000000002';
const clientEventId = 'evt_00000000-0000-4000-8000-000000000003';
const occurredAt = '2026-05-26T07:15:00.000Z';
const createdAt = '2026-05-26T07:15:01.000Z';

function queueItem(
  overrides: Partial<QuickLogStoredQueueItem> = {},
): QuickLogStoredQueueItem {
  return {
    client_event_id: clientEventId,
    household_id: householdId,
    puppy_id: puppyId,
    event_type: 'feeding',
    payload_version: 1,
    payload: {
      amount: 'meal',
    },
    occurred_at: occurredAt,
    state: 'pending_local',
    retry_count: 0,
    last_error_category: null,
    retry_after_at: null,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

describe('Quick Log queue state machine', () => {
  it('allows only the documented queue transitions', () => {
    expect(canTransitionQuickLogQueueState('pending_local', 'sending')).toBe(true);
    expect(canTransitionQuickLogQueueState('sending', 'server_confirmed')).toBe(true);
    expect(canTransitionQuickLogQueueState('sending', 'failed_retryable')).toBe(true);
    expect(canTransitionQuickLogQueueState('failed_retryable', 'sending')).toBe(true);
    expect(canTransitionQuickLogQueueState('sending', 'failed_permanent')).toBe(true);

    expect(canTransitionQuickLogQueueState('pending_local', 'deleted_before_sync')).toBe(true);
    expect(canTransitionQuickLogQueueState('sending', 'deleted_before_sync')).toBe(true);
    expect(canTransitionQuickLogQueueState('failed_retryable', 'deleted_before_sync')).toBe(true);
    expect(canTransitionQuickLogQueueState('failed_permanent', 'deleted_before_sync')).toBe(true);

    expect(canTransitionQuickLogQueueState('server_confirmed', 'deleted_before_sync')).toBe(false);
    expect(canTransitionQuickLogQueueState('server_confirmed', 'sending')).toBe(false);
    expect(canTransitionQuickLogQueueState('deleted_before_sync', 'server_confirmed')).toBe(false);
    expect(canTransitionQuickLogQueueState('pending_local', 'server_confirmed')).toBe(false);
  });

  it('applies retryable and permanent failure transitions with scrubbed metadata', () => {
    const now = '2026-05-26T07:15:04.000Z';
    const retryAfter = '2026-05-26T07:15:05.000Z';
    const sendingItem = applyQuickLogQueueTransition(queueItem(), {
      type: 'mark_sending',
      now,
    });

    expect(sendingItem).toMatchObject({
      state: 'sending',
      updated_at: now,
      last_error_category: null,
      retry_after_at: null,
    });

    const retryableItem = applyQuickLogQueueTransition(sendingItem, {
      type: 'mark_failed_retryable',
      errorCategory: 'network_unavailable',
      retryAfterAt: retryAfter,
      now,
    });

    expect(retryableItem).toMatchObject({
      state: 'failed_retryable',
      retry_count: 1,
      last_error_category: 'network_unavailable',
      retry_after_at: retryAfter,
      updated_at: now,
    });

    const permanentItem = applyQuickLogQueueTransition(sendingItem, {
      type: 'mark_failed_permanent',
      errorCategory: 'permission_denied',
      now,
    });

    expect(permanentItem).toMatchObject({
      state: 'failed_permanent',
      retry_count: 1,
      last_error_category: 'permission_denied',
      retry_after_at: null,
      updated_at: now,
    });
  });

  it('rejects invalid transitions and non-scrubbed error categories', () => {
    expect(() => applyQuickLogQueueTransition(queueItem(), {
      type: 'mark_server_confirmed',
      now: '2026-05-26T07:16:00.000Z',
    })).toThrow('Invalid Quick Log queue transition');

    expect(() => applyQuickLogQueueTransition(queueItem({ state: 'sending' }), {
      type: 'mark_failed_retryable',
      errorCategory: 'not_a_scrubbed_category',
      retryAfterAt: null,
      now: '2026-05-26T07:16:00.000Z',
    })).toThrow('Invalid Quick Log queue retryable error category');
  });

  it('rejects failure transitions when the scrubbed category is in the wrong retry class', () => {
    const sendingItem = queueItem({ state: 'sending' });

    expect(() => applyQuickLogQueueTransition(sendingItem, {
      type: 'mark_failed_retryable',
      errorCategory: 'permission_denied',
      retryAfterAt: null,
      now: '2026-05-26T07:16:00.000Z',
    })).toThrow('Invalid Quick Log queue retryable error category');

    expect(() => applyQuickLogQueueTransition(sendingItem, {
      type: 'mark_failed_permanent',
      errorCategory: 'network_unavailable',
      now: '2026-05-26T07:16:00.000Z',
    })).toThrow('Invalid Quick Log queue permanent error category');
  });

  it('keeps deleted_before_sync in control when an in-flight success arrives late', () => {
    const now = '2026-05-26T07:16:00.000Z';
    const deletedItem = applyQuickLogQueueTransition(queueItem({ state: 'sending' }), {
      type: 'mark_deleted_before_sync',
      now,
    });

    const result = resolveQuickLogInFlightSuccess(deletedItem, {
      now: '2026-05-26T07:16:03.000Z',
    });

    expect(result).toEqual({
      outcome: 'requires_server_cleanup',
      item: deletedItem,
    });
  });

  it('marks an in-flight success as confirmed only when the item was not deleted', () => {
    const now = '2026-05-26T07:17:00.000Z';
    const result = resolveQuickLogInFlightSuccess(queueItem({ state: 'sending' }), {
      now,
    });

    expect(result.outcome).toBe('server_confirmed');
    expect(result.item).toMatchObject({
      client_event_id: clientEventId,
      state: 'server_confirmed',
      updated_at: now,
    });
  });
});

describe('Quick Log queue retry behavior', () => {
  it('classifies retryable, permanent, and bounded unknown failures', () => {
    expect(classifyQuickLogQueueError({ kind: 'network_unavailable', retryCount: 0 })).toEqual({
      decision: 'retryable',
      category: 'network_unavailable',
      retryAfterMs: null,
    });
    expect(classifyQuickLogQueueError({ kind: 'server_5xx', retryCount: 2 })).toMatchObject({
      decision: 'retryable',
      category: 'server_5xx',
    });
    expect(classifyQuickLogQueueError({
      kind: 'rate_limited',
      retryCount: 1,
      retryAfterMs: 12_000,
    })).toEqual({
      decision: 'retryable',
      category: 'rate_limited',
      retryAfterMs: 12_000,
    });
    expect(classifyQuickLogQueueError({ kind: 'permission_denied', retryCount: 0 })).toEqual({
      decision: 'permanent',
      category: 'permission_denied',
      retryAfterMs: null,
    });
    expect(classifyQuickLogQueueError({
      kind: 'unknown',
      retryCount: QUICK_LOG_QUEUE_MAX_UNKNOWN_RETRY_COUNT - 1,
    })).toMatchObject({
      decision: 'retryable',
      category: 'unknown',
    });
    expect(classifyQuickLogQueueError({
      kind: 'unknown',
      retryCount: QUICK_LOG_QUEUE_MAX_UNKNOWN_RETRY_COUNT,
    })).toEqual({
      decision: 'permanent',
      category: 'unknown_retry_exhausted',
      retryAfterMs: null,
    });
  });

  it('computes capped exponential backoff with deterministic jitter', () => {
    expect(getQuickLogRetryDelayMs({ retryCount: 1, jitterRatio: 0 })).toBe(1_000);
    expect(getQuickLogRetryDelayMs({ retryCount: 2, jitterRatio: 0 })).toBe(2_000);
    expect(getQuickLogRetryDelayMs({ retryCount: 3, jitterRatio: 0 })).toBe(4_000);
    expect(getQuickLogRetryDelayMs({ retryCount: 8, jitterRatio: 0 })).toBe(10_000);
    expect(getQuickLogRetryDelayMs({ retryCount: 3, jitterRatio: 0.2 })).toBe(4_800);
    expect(getQuickLogRetryDelayMs({ retryCount: 8, jitterRatio: 0.2 })).toBe(10_000);
    expect(getQuickLogRetryDelayMs({ retryCount: 1, jitterRatio: -0.2 })).toBe(800);
  });

  it('builds a manual retry that bypasses delay once without changing identity', () => {
    const failedItem = queueItem({
      state: 'failed_retryable',
      retry_count: 2,
      last_error_category: 'request_timeout',
      retry_after_at: '2026-05-26T07:18:00.000Z',
    });
    const now = '2026-05-26T07:17:30.000Z';

    expect(createManualQuickLogRetry(failedItem, { now })).toEqual({
      client_event_id: clientEventId,
      bypasses_delay: true,
      item: {
        ...failedItem,
        state: 'sending',
        last_error_category: null,
        retry_after_at: null,
        updated_at: now,
      },
    });
  });

  it('allows manual retry from permanent failures without making them auto-ready', () => {
    const permanentItem = queueItem({
      state: 'failed_permanent',
      retry_count: 3,
      last_error_category: 'permission_denied',
    });
    const now = '2026-05-26T07:19:00.000Z';

    expect(createManualQuickLogRetry(permanentItem, { now })).toEqual({
      client_event_id: clientEventId,
      bypasses_delay: true,
      item: {
        ...permanentItem,
        state: 'sending',
        last_error_category: null,
        retry_after_at: null,
        updated_at: now,
      },
    });
  });

  it('rejects manual retry from non-failed queue states', () => {
    const now = '2026-05-26T07:20:00.000Z';
    const nonFailedStates = [
      'pending_local',
      'sending',
      'server_confirmed',
      'deleted_before_sync',
    ] as const;

    for (const state of nonFailedStates) {
      expect(() => createManualQuickLogRetry(queueItem({ state }), { now })).toThrow(
        `Invalid Quick Log manual retry state: ${state}`,
      );
    }
  });
});
