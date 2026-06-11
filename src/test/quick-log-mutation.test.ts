import { MutationObserver, QueryClient, QueryObserver } from '@tanstack/react-query';

import {
  createQuickLogMutationOptions,
  removeQuickLogOptimisticEvent,
  replayQuickLogQueueItemToCache,
  retryLocalQuickLogEvent,
  type QuickLogCachedEventRow,
  type QuickLogMutationDependencies,
} from '@/lib/query/quick-log';
import { getQuickLogInvalidationKeys, queryKeys } from '@/lib/query/keys';
import type {
  QuickLogQueueErrorCategory,
  QuickLogQueueStorage,
  QuickLogStoredQueueItem,
} from '@/lib/queue';
import {
  applyQuickLogQueueTransition,
  resolveQuickLogInFlightSuccess,
} from '@/lib/queue';
import type { EventLogInsert, EventLogRecord } from '@/contracts/supabase';

const householdId = '00000000-0000-4000-8000-000000000201';
const puppyId = '00000000-0000-4000-8000-000000000202';
const createdBy = '00000000-0000-4000-8000-000000000203';
const clientEventId = 'evt_00000000-0000-4000-8000-000000000204';
const occurredAt = '2026-05-26T08:00:00.000Z';
const now = '2026-05-26T08:00:01.000Z';
const todayDate = '2026-05-26';
const testQueryClients: QueryClient[] = [];

afterEach(() => {
  for (const queryClient of testQueryClients) {
    queryClient.clear();
  }

  testQueryClients.length = 0;
});

describe('Quick Log mutation lifecycle', () => {
  it('creates one client id and actor before enqueue, then reuses them for mutation send', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = {
      householdId,
      puppyId,
      trackerId: 'feeding_meal' as const,
      occurredAt,
      todayDate,
    };

    const context = await options.onMutate?.(variables);
    await expect(options.mutationFn?.(variables)).resolves.toMatchObject({
      client_event_id: clientEventId,
      created_by: createdBy,
    });

    expect(context).toMatchObject({
      clientEventId,
      insert: {
        client_event_id: clientEventId,
        created_by: createdBy,
      },
    });
    expect(queue.items.get(clientEventId)).toMatchObject({
      client_event_id: clientEventId,
      created_by: createdBy,
    });
    expect(events.inserts).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
        created_by: createdBy,
      }),
    ]);
  });

  it('generates client ids in native runtimes without crypto.randomUUID', async () => {
    const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      now: () => now,
    });

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: ((array: Uint8Array) => {
          for (let index = 0; index < array.length; index += 1) {
            array[index] = index;
          }

          return array;
        }) as Crypto['getRandomValues'],
      },
    });

    try {
      const context = await options.onMutate?.({
        householdId,
        puppyId,
        trackerId: 'feeding_meal',
        occurredAt,
        todayDate,
      });

      expect(context?.clientEventId).toBe('evt_00010203-0405-4607-8809-0a0b0c0d0e0f');
      expect(queue.items.get('evt_00010203-0405-4607-8809-0a0b0c0d0e0f')).toMatchObject({
        client_event_id: 'evt_00010203-0405-4607-8809-0a0b0c0d0e0f',
      });
    } finally {
      restoreGlobalCrypto(originalCryptoDescriptor);
    }
  });

  it('blocks enqueue when the session actor is missing', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => null,
      createClientEventId: () => clientEventId,
      now: () => now,
    });

    await expect(options.onMutate?.({
      householdId,
      puppyId,
      trackerId: 'feeding_meal',
      occurredAt,
      todayDate,
    })).rejects.toThrow('Quick Log requires an authenticated session');
    expect(queue.items.size).toBe(0);
  });

  it('cancels affected queries before writing the optimistic row', async () => {
    const queryClient = createTestQueryClient();
    const events = new FakeQuickLogEventsRepository();
    const callOrder: string[] = [];

    jest.spyOn(queryClient, 'cancelQueries').mockImplementation(async (filters) => {
      callOrder.push(`cancel:${JSON.stringify(filters?.queryKey)}`);
    });
    jest.spyOn(queryClient, 'setQueryData').mockImplementation((queryKey, updater) => {
      callOrder.push(`set:${JSON.stringify(queryKey)}`);
      const previous = queryClient.getQueryData(queryKey);
      const next = typeof updater === 'function' ? updater(previous) : updater;

      queryClient.setQueryDefaults(queryKey, {});

      return next;
    });

    const options = createQuickLogMutationOptions({
      queryClient,
      queue: new FakeQuickLogQueueStorage(),
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });

    await options.onMutate?.({
      householdId,
      puppyId,
      trackerId: 'feeding_meal',
      occurredAt,
      todayDate,
    });

    const firstSetIndex = callOrder.findIndex((entry) => entry.startsWith('set:'));

    expect(firstSetIndex).toBeGreaterThan(0);
    expect(callOrder.slice(0, firstSetIndex).every((entry) => entry.startsWith('cancel:'))).toBe(true);
    expect(callOrder.filter((entry) => entry.startsWith('cancel:'))).toHaveLength(
      getQuickLogInvalidationKeys({
        householdId,
        puppyId,
        eventType: 'feeding',
        todayDate,
      }).length,
    );
  });

  it('keeps retryable and permanent failures visible with local sync metadata', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = {
      householdId,
      puppyId,
      trackerId: 'feeding_meal' as const,
      occurredAt,
      todayDate,
    };
    const context = await options.onMutate?.(variables);
    await queue.markSending(clientEventId, {
      now,
    });

    await options.onError?.({
      kind: 'network_unavailable',
      retryAfterMs: null,
    }, variables, context);

    expect(readTimelineRows(queryClient)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
        localSync: {
          state: 'failed_retryable',
          category: 'network_unavailable',
          retryCount: 1,
        },
      }),
    ]);

    await options.onError?.({
      kind: 'permission_denied',
      retryAfterMs: null,
    }, variables, context);

    expect(readTimelineRows(queryClient)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
        localSync: {
          state: 'failed_permanent',
          category: 'permission_denied',
          retryCount: 2,
        },
      }),
    ]);
  });

  it('emits privacy-safe telemetry for pending creation and failed saves', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const analytics = {
      trackQuickLogEvent: jest.fn(),
    };
    const observability = {
      captureException: jest.fn(),
    };
    const options = createQuickLogMutationOptions({
      analytics,
      observability,
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = createMutationVariables();
    const rawFailure = new Error('backend detail contained PuppyDisplayPrivate private routine text');
    const context = await options.onMutate?.(variables);

    await queue.markSending(clientEventId, {
      now,
    });
    await options.onError?.(rawFailure, variables, context);

    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'pending_quick_log_created',
      properties: {
        connection_state: 'unknown',
        event_type: 'feeding',
      },
    });
    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'event_save_failed',
      properties: {
        connection_state: 'unknown',
        error_category: 'unknown',
        event_type: 'feeding',
      },
    });
    expect(observability.captureException).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Quick Log operation failed',
    }), expect.objectContaining({
      area: 'quick_log',
      errorCategory: 'unknown',
      operation: 'save_event',
      tags: {
        event_type: 'feeding',
      },
    }));
    expect(queue.items.get(clientEventId)).toMatchObject({
      last_error_category: 'unknown',
      state: 'failed_retryable',
    });
    expect(JSON.stringify(analytics.trackQuickLogEvent.mock.calls)).not.toContain('PuppyDisplayPrivate');
    expect(JSON.stringify(observability.captureException.mock.calls)).not.toContain('private routine text');
  });

  it('emits privacy-safe telemetry when the server confirms a log', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const analytics = {
      trackQuickLogEvent: jest.fn(),
    };
    const options = createQuickLogMutationOptions({
      analytics,
      queryClient,
      queue,
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = createMutationVariables();
    const context = await options.onMutate?.(variables);

    await options.mutationFn?.(variables);
    await options.onSuccess?.(serverRow(), variables, context);

    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'event_logged',
      properties: {
        connection_state: 'unknown',
        event_type: 'feeding',
        save_result: 'server_confirmed',
        source_surface: 'quick_log_sheet',
      },
    });
  });

  it('emits privacy-safe recovery telemetry with the caller-provided recovery surface', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const analytics = {
      trackQuickLogEvent: jest.fn(),
    };
    const options = createQuickLogMutationOptions({
      analytics,
      queryClient,
      queue,
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = {
      ...createMutationVariables(),
      recoverySurface: 'app_foreground' as const,
    };
    const context = await options.onMutate?.(variables);
    const queuedItem = await queue.getByClientEventId(clientEventId);

    if (!queuedItem) {
      throw new Error('Expected queued item before recovery telemetry test');
    }

    queue.items.set(clientEventId, {
      ...queuedItem,
      retry_count: 2,
      state: 'sending',
    });
    await options.onSuccess?.(serverRow(), variables, context);

    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'offline_or_failed_log_recovered',
      properties: {
        event_type: 'feeding',
        recovery_surface: 'app_foreground',
        retry_count_bucket: 'two',
      },
    });
  });

  it('skips recovery telemetry when retry confirmation has no trusted recovery surface', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const analytics = {
      trackQuickLogEvent: jest.fn(),
    };
    const options = createQuickLogMutationOptions({
      analytics,
      queryClient,
      queue,
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = createMutationVariables();
    const context = await options.onMutate?.(variables);
    const queuedItem = await queue.getByClientEventId(clientEventId);

    if (!queuedItem) {
      throw new Error('Expected queued item before recovery telemetry test');
    }

    queue.items.set(clientEventId, {
      ...queuedItem,
      retry_count: 1,
      state: 'sending',
    });
    await options.onSuccess?.(serverRow(), variables, context);

    expect(analytics.trackQuickLogEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      name: 'offline_or_failed_log_recovered',
    }));
  });

  it('makes the optimistic row visible before durable enqueue finishes', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const variables = createMutationVariables();
    let releaseEnqueue: () => void = () => undefined;

    queue.enqueueGate = new Promise<void>((resolve) => {
      releaseEnqueue = resolve;
    });

    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });

    const mutatePromise = options.onMutate?.(variables);

    await Promise.resolve();
    await Promise.resolve();

    expect(readTimelineRows(queryClient)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
        created_by: createdBy,
        localSync: {
          state: 'pending_local',
          category: null,
          retryCount: 0,
        },
      }),
    ]);
    await expect(Promise.race([
      mutatePromise?.then(() => 'resolved'),
      Promise.resolve('pending'),
    ])).resolves.toBe('pending');

    releaseEnqueue();
    await expect(mutatePromise).resolves.toMatchObject({
      clientEventId,
      queuedItem: {
        client_event_id: clientEventId,
      },
    });
  });

  it('removes the optimistic row if durable enqueue fails', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = createMutationVariables();

    queue.enqueueError = {
      kind: 'unknown',
      retryAfterMs: null,
    };

    await expect(options.onMutate?.(variables)).rejects.toMatchObject({
      kind: 'unknown',
    });

    expect(readTimelineRows(queryClient)).toEqual([]);
    expect(events.inserts).toEqual([]);
    expect(queue.items.has(clientEventId)).toBe(false);
  });

  it('keeps a failed row visible after TanStack settles with an active Timeline observer', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const variables = createMutationVariables();
    const unsubscribe = subscribeTimelineObserver(queryClient, async () => []);

    events.insertError = {
      kind: 'network_unavailable',
      retryAfterMs: null,
    };

    const mutation = new MutationObserver(queryClient, createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    }));

    await expect(mutation.mutate(variables)).rejects.toMatchObject({
      kind: 'network_unavailable',
    });
    unsubscribe();

    expect(readTimelineRows(queryClient)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
        localSync: {
          state: 'failed_retryable',
          category: 'network_unavailable',
          retryCount: 1,
        },
      }),
    ]);
  });

  it('replaces only the matching optimistic row on success', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = {
      householdId,
      puppyId,
      trackerId: 'feeding_meal' as const,
      occurredAt,
      todayDate,
    };
    const context = await options.onMutate?.(variables);
    const otherRow = createCachedRow('evt_00000000-0000-4000-8000-000000000205');
    await options.mutationFn?.(variables);

    queryClient.setQueryData(queryKeys.events.timelineRoot(householdId, puppyId), [
      ...readTimelineRows(queryClient),
      otherRow,
    ]);

    await options.onSuccess?.(serverRow(), variables, context);

    expect(readTimelineRows(queryClient)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
        id: '00000000-0000-4000-8000-000000000206',
        localSync: undefined,
      }),
      otherRow,
    ]);
  });

  it('removes pending local optimistic rows without tombstone work', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const invalidations: unknown[] = [];

    jest.spyOn(queryClient, 'invalidateQueries').mockImplementation(async (filters) => {
      invalidations.push(filters);
    });
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = {
      householdId,
      puppyId,
      trackerId: 'feeding_meal' as const,
      occurredAt,
      todayDate,
    };

    await options.onMutate?.(variables);
    await removeQuickLogOptimisticEvent({
      queryClient,
      queue,
      householdId,
      puppyId,
      eventType: 'feeding',
      todayDate,
      clientEventId,
      now,
    });

    expect(readTimelineRows(queryClient)).toEqual([]);
    expect(queue.items.has(clientEventId)).toBe(false);
    expect(events.tombstones).toEqual([]);
    expect(invalidations).toEqual([
      { queryKey: queryKeys.today.dashboard(householdId, puppyId, todayDate), exact: true },
      { queryKey: queryKeys.events.timelineRoot(householdId, puppyId), exact: false },
      { queryKey: queryKeys.puppy.summary(householdId, puppyId), exact: true },
      { queryKey: queryKeys.events.duplicateWarningSource(householdId, puppyId, 'feeding'), exact: true },
    ]);
  });

  it('removes sending optimistic rows and ignores late success resurrection', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = {
      householdId,
      puppyId,
      trackerId: 'feeding_meal' as const,
      occurredAt,
      todayDate,
    };
    const context = await options.onMutate?.(variables);
    const queuedItem = await queue.getByClientEventId(clientEventId);

    if (!queuedItem) {
      throw new Error('Expected queued item before undo');
    }

    queue.items.set(clientEventId, {
      ...queuedItem,
      state: 'sending',
    });

    await removeQuickLogOptimisticEvent({
      queryClient,
      queue,
      householdId,
      puppyId,
      eventType: 'feeding',
      todayDate,
      clientEventId,
      now,
    });
    await options.onSuccess?.(serverRow(), variables, context);

    expect(readTimelineRows(queryClient)).toEqual([]);
    expect(events.tombstones).toEqual([
      {
        householdId,
        clientEventId,
        deletedAt: now,
      },
    ]);
  });

  it('keeps undone sending rows terminal when the in-flight insert later fails', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = createMutationVariables();
    const context = await options.onMutate?.(variables);
    const queuedItem = await queue.getByClientEventId(clientEventId);

    if (!queuedItem) {
      throw new Error('Expected queued item before undo failure race');
    }

    queue.items.set(clientEventId, {
      ...queuedItem,
      state: 'sending',
    });

    await removeQuickLogOptimisticEvent({
      queryClient,
      queue,
      householdId,
      puppyId,
      eventType: 'feeding',
      todayDate,
      clientEventId,
      now,
    });

    await expect(options.onError?.({
      kind: 'network_unavailable',
      retryAfterMs: null,
    }, variables, context)).resolves.toBeUndefined();

    expect(readTimelineRows(queryClient)).toEqual([]);
    expect(queue.items.get(clientEventId)).toMatchObject({
      state: 'deleted_before_sync',
    });
  });

  it('does not resurrect an undone row when late-success tombstone cleanup fails', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = {
      householdId,
      puppyId,
      trackerId: 'feeding_meal' as const,
      occurredAt,
      todayDate,
    };
    const context = await options.onMutate?.(variables);
    const queuedItem = await queue.getByClientEventId(clientEventId);

    if (!queuedItem) {
      throw new Error('Expected queued item before cleanup failure');
    }

    queue.items.set(clientEventId, {
      ...queuedItem,
      state: 'sending',
    });
    events.tombstoneError = {
      kind: 'network_unavailable',
      retryAfterMs: null,
    };

    await removeQuickLogOptimisticEvent({
      queryClient,
      queue,
      householdId,
      puppyId,
      eventType: 'feeding',
      todayDate,
      clientEventId,
      now,
    });
    await options.onSuccess?.(serverRow(), variables, context);

    expect(readTimelineRows(queryClient)).toEqual([]);
    expect(queue.items.get(clientEventId)).toMatchObject({
      state: 'deleted_before_sync',
    });
  });

  it('does not invalidate event-derived queries after late-success cleanup fails', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const invalidations: unknown[] = [];
    const options = createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
    const variables = createMutationVariables();
    const context = await options.onMutate?.(variables);
    const queuedItem = await queue.getByClientEventId(clientEventId);

    if (!queuedItem) {
      throw new Error('Expected queued item before cleanup invalidation test');
    }

    jest.spyOn(queryClient, 'invalidateQueries').mockImplementation(async (filters) => {
      invalidations.push(filters);
    });
    queue.items.set(clientEventId, {
      ...queuedItem,
      state: 'sending',
    });
    events.tombstoneError = {
      kind: 'network_unavailable',
      retryAfterMs: null,
    };

    await removeQuickLogOptimisticEvent({
      queryClient,
      queue,
      householdId,
      puppyId,
      eventType: 'feeding',
      todayDate,
      clientEventId,
      now,
    });
    invalidations.length = 0;

    await options.onSuccess?.(serverRow(), variables, context);
    await options.onSettled?.(serverRow(), null, variables, context);

    expect(invalidations).toEqual([]);
    expect(queue.items.get(clientEventId)).toMatchObject({
      state: 'deleted_before_sync',
    });
  });

  it('keeps an undone row hidden after cleanup failure settles with an active Timeline observer', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const variables = createMutationVariables();
    let serverHasRow = false;
    let releaseInsert: () => void = () => undefined;
    const unsubscribe = subscribeTimelineObserver(queryClient, async () =>
      serverHasRow ? [serverRow()] : []);

    events.tombstoneError = {
      kind: 'network_unavailable',
      retryAfterMs: null,
    };
    events.insertGate = new Promise<void>((resolve) => {
      releaseInsert = () => {
        serverHasRow = true;
        resolve();
      };
    });

    const mutation = new MutationObserver(queryClient, createQuickLogMutationOptions({
      queryClient,
      queue,
      events,
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    }));

    const pendingMutation = mutation.mutate(variables);
    await waitForQueueState(queue, clientEventId, 'sending');
    await removeQuickLogOptimisticEvent({
      queryClient,
      queue,
      householdId,
      puppyId,
      eventType: 'feeding',
      todayDate,
      clientEventId,
      now,
    });

    releaseInsert();
    await expect(pendingMutation).resolves.toMatchObject({
      client_event_id: clientEventId,
    });
    unsubscribe();

    expect(readTimelineRows(queryClient)).toEqual([]);
    expect(queue.items.get(clientEventId)).toMatchObject({
      state: 'deleted_before_sync',
    });
  });

  it('does not insert optimistic rows into incompatible filtered Timeline caches', async () => {
    const queryClient = createTestQueryClient();
    const compatibleKey = queryKeys.events.timeline(householdId, puppyId, {
      eventTypes: ['feeding'],
      from: '2026-05-01',
      to: todayDate,
    });
    const eventTypeMismatchKey = queryKeys.events.timeline(householdId, puppyId, {
      eventTypes: ['potty'],
    });
    const dateMismatchKey = queryKeys.events.timeline(householdId, puppyId, {
      from: '2026-05-27',
      to: '2026-05-28',
    });

    queryClient.setQueryData(compatibleKey, []);
    queryClient.setQueryData(eventTypeMismatchKey, []);
    queryClient.setQueryData(dateMismatchKey, []);

    const options = createQuickLogMutationOptions({
      queryClient,
      queue: new FakeQuickLogQueueStorage(),
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });

    await options.onMutate?.({
      householdId,
      puppyId,
      trackerId: 'feeding_meal',
      occurredAt,
      todayDate,
    });

    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(compatibleKey)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
      }),
    ]);
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(eventTypeMismatchKey)).toEqual([]);
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(dateMismatchKey)).toEqual([]);
  });

  it('updates the root Timeline cache even when only filtered Timeline caches exist', async () => {
    const queryClient = createTestQueryClient();
    const compatibleKey = queryKeys.events.timeline(householdId, puppyId, {
      eventTypes: ['feeding'],
      from: '2026-05-01',
      to: todayDate,
    });

    queryClient.setQueryData(compatibleKey, []);

    const options = createQuickLogMutationOptions({
      queryClient,
      queue: new FakeQuickLogQueueStorage(),
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });

    await options.onMutate?.({
      householdId,
      puppyId,
      trackerId: 'feeding_meal',
      occurredAt,
      todayDate,
    });

    expect(readTimelineRows(queryClient)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
      }),
    ]);
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(compatibleKey)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
      }),
    ]);
  });

  it('creates the Today same-day Timeline cache when Today has not mounted its query yet', async () => {
    const queryClient = createTestQueryClient();
    const todayTimelineKey = queryKeys.events.timeline(householdId, puppyId, {
      from: todayDate,
      to: todayDate,
    });

    const options = createQuickLogMutationOptions({
      queryClient,
      queue: new FakeQuickLogQueueStorage(),
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });

    expect(queryClient.getQueryData(todayTimelineKey)).toBeUndefined();

    await options.onMutate?.({
      householdId,
      puppyId,
      trackerId: 'feeding_meal',
      occurredAt,
      todayDate,
    });

    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(todayTimelineKey)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
      }),
    ]);
    expect(readTimelineRows(queryClient)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
      }),
    ]);
  });

  it('creates the unfiltered Timeline cache when Timeline has not mounted its query yet', async () => {
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(householdId, puppyId);

    const options = createQuickLogMutationOptions({
      queryClient,
      queue: new FakeQuickLogQueueStorage(),
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });

    expect(queryClient.getQueryData(timelineKey)).toBeUndefined();

    await options.onMutate?.({
      householdId,
      puppyId,
      trackerId: 'feeding_meal',
      occurredAt,
      todayDate,
    });

    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
      }),
    ]);
  });

  it('uses the mutation calendar date for filtered Timeline cache compatibility', async () => {
    const queryClient = createTestQueryClient();
    const localDayKey = queryKeys.events.timeline(householdId, puppyId, {
      eventTypes: ['feeding'],
      from: todayDate,
      to: todayDate,
    });

    queryClient.setQueryData(localDayKey, []);

    const options = createQuickLogMutationOptions({
      queryClient,
      queue: new FakeQuickLogQueueStorage(),
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });

    await options.onMutate?.({
      householdId,
      puppyId,
      trackerId: 'feeding_meal',
      occurredAt: '2026-05-25T22:30:00.000Z',
      todayDate,
    });

    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(localDayKey)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
      }),
    ]);
  });

  it('replays a queued row into cache without relying on live gc state', () => {
    const queryClient = createTestQueryClient();
    const queueItem = createQueueItem({
      state: 'failed_retryable',
      last_error_category: 'request_timeout',
    });

    replayQuickLogQueueItemToCache({
      queryClient,
      item: queueItem,
      todayDate,
    });

    expect(readTimelineRows(queryClient)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
        localSync: {
          state: 'failed_retryable',
          category: 'request_timeout',
          retryCount: 0,
        },
      }),
    ]);
  });

  it('manual retry resends the existing queued event and emits recovery telemetry', async () => {
    const queryClient = createTestQueryClient();
    const queue = new FakeQuickLogQueueStorage();
    const events = new FakeQuickLogEventsRepository();
    const analytics = {
      trackQuickLogEvent: jest.fn(),
    };

    queue.items.set(clientEventId, createQueueItem({
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_count: 1,
    }));

    await retryLocalQuickLogEvent({
      clientEventId,
      events,
      analytics,
      now: () => now,
      queryClient,
      queueRef: { current: queue },
      recoverySurface: 'manual_retry',
      sourceSurface: 'timeline',
    } as Parameters<typeof retryLocalQuickLogEvent>[0] & {
      analytics: typeof analytics;
      events: FakeQuickLogEventsRepository;
      now: () => string;
    });

    expect(queue.manualRetryCalls).toEqual([
      {
        clientEventId,
        options: expect.objectContaining({
          recoverySurface: 'manual_retry',
        }),
      },
    ]);
    expect(events.inserts).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
        created_by: createdBy,
        event_type: 'feeding',
      }),
    ]);
    expect(queue.items.has(clientEventId)).toBe(false);
    expect(readTimelineRows(queryClient)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
        localSync: undefined,
      }),
    ]);
    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'offline_or_failed_log_recovered',
      properties: {
        event_type: 'feeding',
        recovery_surface: 'manual_retry',
        retry_count_bucket: 'one',
      },
    });
    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'event_logged',
      properties: {
        connection_state: 'unknown',
        event_type: 'feeding',
        save_result: 'server_confirmed',
        source_surface: 'timeline',
      },
    });
  });

  it('uses the replay calendar date for filtered Timeline cache compatibility', () => {
    const queryClient = createTestQueryClient();
    const localDayKey = queryKeys.events.timeline(householdId, puppyId, {
      eventTypes: ['feeding'],
      from: todayDate,
      to: todayDate,
    });
    const queueItem = createQueueItem({
      occurred_at: '2026-05-25T22:30:00.000Z',
      state: 'failed_retryable',
      last_error_category: 'request_timeout',
    });

    queryClient.setQueryData(localDayKey, []);

    replayQuickLogQueueItemToCache({
      queryClient,
      item: queueItem,
      todayDate,
    });

    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(localDayKey)).toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
      }),
    ]);
  });

  it('requires mutation queues to expose markSending for valid success transitions', () => {
    type QueueWithoutMarkSending = Omit<QuickLogMutationDependencies['queue'], 'markSending'>;

    const queueWithoutMarkSending = new FakeQuickLogQueueStorage() as QueueWithoutMarkSending;

    createQuickLogMutationOptions({
      queryClient: createTestQueryClient(),
      // @ts-expect-error Quick Log mutation success requires pending_local -> sending first.
      queue: queueWithoutMarkSending,
      events: new FakeQuickLogEventsRepository(),
      getSessionUserId: () => createdBy,
      createClientEventId: () => clientEventId,
      now: () => now,
    });
  });
});

function createTestQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

  testQueryClients.push(queryClient);

  return queryClient;
}

function restoreGlobalCrypto(
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(globalThis, 'crypto', descriptor);
    return;
  }

  delete (globalThis as { crypto?: Crypto }).crypto;
}

function readTimelineRows(queryClient: QueryClient): QuickLogCachedEventRow[] {
  return queryClient.getQueryData<QuickLogCachedEventRow[]>(
    queryKeys.events.timelineRoot(householdId, puppyId),
  ) ?? [];
}

function createMutationVariables() {
  return {
    householdId,
    puppyId,
    trackerId: 'feeding_meal' as const,
    occurredAt,
    todayDate,
  };
}

function subscribeTimelineObserver(
  queryClient: QueryClient,
  queryFn: () => Promise<QuickLogCachedEventRow[]>,
): () => void {
  const observer = new QueryObserver(queryClient, {
    queryKey: queryKeys.events.timelineRoot(householdId, puppyId),
    queryFn,
    retry: false,
  });
  const unsubscribe = observer.subscribe(() => undefined);

  void observer.refetch();

  return unsubscribe;
}

async function waitForQueueState(
  queue: FakeQuickLogQueueStorage,
  clientEventIdValue: string,
  state: QuickLogStoredQueueItem['state'],
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const item = await queue.getByClientEventId(clientEventIdValue);

    if (item?.state === state) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  throw new Error(`Queue item did not reach state ${state}`);
}

function serverRow(): EventLogRecord {
  return {
    id: '00000000-0000-4000-8000-000000000206',
    household_id: householdId,
    puppy_id: puppyId,
    created_by: createdBy,
    client_event_id: clientEventId,
    event_type: 'feeding',
    occurred_at: occurredAt,
    payload_version: 1,
    payload: {
      amount: 'meal',
    },
    version: 1,
    deleted_at: null,
    created_at: '2026-05-26T08:00:02.000Z',
    updated_at: '2026-05-26T08:00:02.000Z',
  };
}

function createCachedRow(client_event_id: string): QuickLogCachedEventRow {
  return {
    ...serverRow(),
    id: '00000000-0000-4000-8000-000000000207',
    client_event_id,
  };
}

function createQueueItem(
  overrides: Partial<QuickLogStoredQueueItem> = {},
): QuickLogStoredQueueItem {
  return {
    client_event_id: clientEventId,
    household_id: householdId,
    puppy_id: puppyId,
    created_by: createdBy,
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
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

class FakeQuickLogEventsRepository {
  public readonly inserts: EventLogInsert[] = [];
  public readonly tombstones: {
    householdId: string;
    clientEventId: string;
    deletedAt: string;
  }[] = [];
  public insertError: unknown = null;
  public insertGate: Promise<void> | null = null;
  public tombstoneError: unknown = null;

  public async insertEvent(insert: EventLogInsert): Promise<EventLogRecord> {
    this.inserts.push(insert);

    if (this.insertGate !== null) {
      await this.insertGate;
    }

    if (this.insertError !== null) {
      throw this.insertError;
    }

    return serverRow();
  }

  public async tombstoneByClientEventId(input: {
    householdId: string;
    clientEventId: string;
    deletedAt: string;
  }): Promise<EventLogRecord> {
    this.tombstones.push(input);

    if (this.tombstoneError !== null) {
      throw this.tombstoneError;
    }

    return {
      ...serverRow(),
      deleted_at: input.deletedAt,
    };
  }
}

class FakeQuickLogQueueStorage implements Pick<
  QuickLogQueueStorage,
  'enqueue' | 'getByClientEventId' | 'markSending' | 'markFailedRetryable' | 'markFailedPermanent'
  | 'markDeletedBeforeSync' | 'manualRetry' | 'resolveInFlightSuccess' | 'remove'
> {
  public readonly items = new Map<string, QuickLogStoredQueueItem>();
  public readonly manualRetryCalls: {
    clientEventId: string;
    options: { now: string; recoverySurface?: 'automatic_retry' | 'manual_retry' | 'app_foreground' };
  }[] = [];
  public enqueueGate: Promise<void> | null = null;
  public enqueueError: unknown = null;

  public async enqueue(input: unknown): Promise<QuickLogStoredQueueItem> {
    if (this.enqueueError !== null) {
      throw this.enqueueError;
    }

    const item = createQueueItem(input as Partial<QuickLogStoredQueueItem>);

    this.items.set(item.client_event_id, item);

    if (this.enqueueGate !== null) {
      await this.enqueueGate;
    }

    return item;
  }

  public async getByClientEventId(clientEventIdValue: string): Promise<QuickLogStoredQueueItem | null> {
    return this.items.get(clientEventIdValue) ?? null;
  }

  public async markSending(
    clientEventIdValue: string,
    options: { now: string },
  ): Promise<QuickLogStoredQueueItem> {
    return this.write(
      clientEventIdValue,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_sending',
        now: options.now,
      }),
    );
  }

  public async markFailedRetryable(
    clientEventIdValue: string,
    options: { errorCategory: QuickLogQueueErrorCategory | string; retryAfterAt: string | null; now: string },
  ): Promise<QuickLogStoredQueueItem> {
    return this.write(
      clientEventIdValue,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_failed_retryable',
        errorCategory: options.errorCategory,
        retryAfterAt: options.retryAfterAt,
        now: options.now,
      }),
    );
  }

  public async markFailedPermanent(
    clientEventIdValue: string,
    options: { errorCategory: QuickLogQueueErrorCategory | string; now: string },
  ): Promise<QuickLogStoredQueueItem> {
    return this.write(
      clientEventIdValue,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_failed_permanent',
        errorCategory: options.errorCategory,
        now: options.now,
      }),
    );
  }

  public async markDeletedBeforeSync(
    clientEventIdValue: string,
    options: { now: string },
  ): Promise<QuickLogStoredQueueItem> {
    return this.write(
      clientEventIdValue,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_deleted_before_sync',
        now: options.now,
      }),
    );
  }

  public async manualRetry(
    clientEventIdValue: string,
    options: { now: string; recoverySurface?: 'automatic_retry' | 'manual_retry' | 'app_foreground' },
  ) {
    this.manualRetryCalls.push({
      clientEventId: clientEventIdValue,
      options,
    });

    return {
      client_event_id: clientEventIdValue,
      bypasses_delay: true as const,
      recovery_surface: options.recoverySurface,
      item: await this.markSending(clientEventIdValue, options),
    };
  }

  public async resolveInFlightSuccess(
    clientEventIdValue: string,
    options: { now: string },
  ): Promise<{
    outcome: 'server_confirmed' | 'requires_server_cleanup';
    item: QuickLogStoredQueueItem;
  }> {
    const item = this.items.get(clientEventIdValue);

    if (!item) {
      throw new Error('Missing queue item');
    }

    const resolution = resolveQuickLogInFlightSuccess(item, options);

    if (resolution.outcome === 'server_confirmed') {
      this.items.set(clientEventIdValue, resolution.item);
    }

    return resolution;
  }

  public async remove(clientEventIdValue: string): Promise<void> {
    this.items.delete(clientEventIdValue);
  }

  private async write(
    clientEventIdValue: string,
    update: (item: QuickLogStoredQueueItem) => QuickLogStoredQueueItem,
  ): Promise<QuickLogStoredQueueItem> {
    const current = this.items.get(clientEventIdValue);

    if (!current) {
      throw new Error('Missing queue item');
    }

    const next = update(current);

    this.items.set(clientEventIdValue, next);

    return next;
  }
}
