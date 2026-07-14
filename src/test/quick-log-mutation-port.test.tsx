import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useQuickLogMutationPort } from '@/lib/query/quick-log';
import type {
  QuickLogDetailedMutationVariables,
  QuickLogMutationPort,
} from '@/lib/query/quick-log';
import {
  applyQuickLogQueueTransition,
  createManualQuickLogRetry,
  resolveQuickLogInFlightSuccess,
  type QuickLogQueueStorage,
  type QuickLogStoredQueueItem,
} from '@/lib/queue';
import {
  createStoredQuickLogQueueItem,
  quickLogQueueEnqueueInputSchema,
} from '@/lib/queue/schema';

const syncedDeleteFailure = new Error('Synthetic synced-delete RLS failure');
const mockOpenQuickLogQueueStorage = jest.fn<Promise<QuickLogQueueStorage>, []>();
const mockTombstoneByClientEventId = jest.fn(async () => {
  throw syncedDeleteFailure;
});
const updateDetailsFailure = new Error('Synthetic detail update failure');
const mockUpdatePayloadByClientEventId = jest.fn(async () => {
  throw updateDetailsFailure;
});
const mockInsertEvent = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    status: 'signedIn',
    user: {
      id: '00000000-0000-4000-8000-000000000203',
    },
  }),
}));

jest.mock('@/lib/queue', () => {
  const actual = jest.requireActual<typeof import('@/lib/queue')>('@/lib/queue');

  return {
    ...actual,
    openQuickLogQueueStorage: () => mockOpenQuickLogQueueStorage(),
  };
});

jest.mock('@/lib/supabase/events', () => {
  const actual = jest.requireActual<typeof import('@/lib/supabase/events')>('@/lib/supabase/events');

  return {
    ...actual,
    createSupabaseEventLogRepository: () => ({
      insertEvent: mockInsertEvent,
      listEvents: jest.fn(),
      restoreByClientEventId: jest.fn(),
      selectExistingEvent: jest.fn(),
      tombstoneByClientEventId: mockTombstoneByClientEventId,
      updatePayloadByClientEventId: mockUpdatePayloadByClientEventId,
    }),
  };
});

describe('useQuickLogMutationPort async failures', () => {
  afterEach(() => {
    mockOpenQuickLogQueueStorage.mockReset();
    mockInsertEvent.mockReset();
    mockTombstoneByClientEventId.mockClear();
    mockUpdatePayloadByClientEventId.mockClear();
  });

  it('AC-EVENT-CLIENT-1 returns the synced-delete promise so RLS failures are not swallowed', async () => {
    mockOpenQuickLogQueueStorage.mockResolvedValue(createUnusedQuickLogQueue());
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => {
      expect(hook.result.current.status).toBe('ready');
    });

    const result = hook.result.current.mutation?.deleteSynced({
      clientEventId: 'evt_00000000-0000-4000-8000-000000000204',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000000201',
      puppyId: '00000000-0000-4000-8000-000000000202',
      todayDate: '2026-05-26',
    });

    expect(isPromiseLike(result)).toBe(true);

    if (!isPromiseLike(result)) {
      hook.unmount();
      queryClient.clear();
      return;
    }

    await expect(result).rejects.toBe(syncedDeleteFailure);
    expect(mockTombstoneByClientEventId).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000000204',
      deletedAt: expect.any(String),
      householdId: '00000000-0000-4000-8000-000000000201',
    });
    hook.unmount();
    queryClient.clear();
  });

  it('AC-6 returns the detail-update promise so persistence failures are not swallowed', async () => {
    mockOpenQuickLogQueueStorage.mockResolvedValue(createUnusedQuickLogQueue());
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    const result = hook.result.current.mutation?.updateDetails({
      clientEventId: 'evt_00000000-0000-4000-8000-000000000204',
      draft: { amount: 'snack', trackerId: 'feeding' },
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000000201',
      puppyId: '00000000-0000-4000-8000-000000000202',
      todayDate: '2026-05-26',
    });

    expect(isPromiseLike(result)).toBe(true);
    if (!isPromiseLike(result)) {
      hook.unmount();
      queryClient.clear();
      return;
    }
    await expect(result).rejects.toBe(updateDetailsFailure);
    hook.unmount();
    queryClient.clear();
  });

  it('AC-QN-FIX-DURABLE resolves after durable enqueue when the item stays retryable', async () => {
    const queue = createStatefulQuickLogQueue();
    mockOpenQuickLogQueueStorage.mockResolvedValue(queue);
    mockInsertEvent.mockRejectedValue({ kind: 'network_unavailable', retryAfterMs: null });
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    const createDetailedDurably = getDurableAcceptanceCreate(hook.result.current.mutation);

    expect(createDetailedDurably).toEqual(expect.any(Function));
    if (!createDetailedDurably) {
      hook.unmount();
      queryClient.clear();
      return;
    }

    let rejection: unknown;
    try {
      await createDetailedDurably(createObservationVariables());
    } catch (error) {
      rejection = error;
    }

    const items = await queue.list();

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      client_event_id: expect.stringMatching(/^evt_/),
      event_type: 'observation',
      payload: { note: 'x' },
      state: 'failed_retryable',
    });
    hook.unmount();
    queryClient.clear();
    expect(rejection).toBeUndefined();
  });

  it('AC-QN-FIX-DURABLE rejects a permanent failure and discards the dead queue item', async () => {
    const permanentFailure = { kind: 'permission_denied', retryAfterMs: null };
    const queue = createStatefulQuickLogQueue();
    mockOpenQuickLogQueueStorage.mockResolvedValue(queue);
    mockInsertEvent.mockRejectedValue(permanentFailure);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    const createDetailedDurably = getDurableAcceptanceCreate(hook.result.current.mutation);

    expect(createDetailedDurably).toEqual(expect.any(Function));
    if (!createDetailedDurably) {
      hook.unmount();
      queryClient.clear();
      return;
    }

    await expect(createDetailedDurably(createObservationVariables()))
      .rejects.toBe(permanentFailure);
    // The caller shows the inline error with the text preserved, so keeping the dead item
    // around would only leave a duplicate failed fact behind after a retry.
    await expect(queue.list()).resolves.toEqual([]);
    hook.unmount();
    queryClient.clear();
  });

  it('AC-QN-FIX-DURABLE rejects before acceptance when durable enqueue fails', async () => {
    const enqueueFailure = new Error('synthetic enqueue failure');
    const queue = createStatefulQuickLogQueue(enqueueFailure);
    mockOpenQuickLogQueueStorage.mockResolvedValue(queue);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    const createDetailedDurably = getDurableAcceptanceCreate(hook.result.current.mutation);

    expect(createDetailedDurably).toEqual(expect.any(Function));
    if (!createDetailedDurably) {
      hook.unmount();
      queryClient.clear();
      return;
    }

    await expect(createDetailedDurably(createObservationVariables())).rejects.toBe(enqueueFailure);
    await expect(queue.list()).resolves.toEqual([]);
    expect(mockInsertEvent).not.toHaveBeenCalled();
    hook.unmount();
    queryClient.clear();
  });
});

function getDurableAcceptanceCreate(
  mutation: QuickLogMutationPort | undefined,
): QuickLogMutationPort['createDetailedDurably'] | undefined {
  return mutation?.createDetailedDurably;
}

function createObservationVariables(): QuickLogDetailedMutationVariables {
  return {
    detailDraft: {
      note: 'x',
      occurredAt: '2026-07-14T08:00:00.000Z',
      trackerId: 'observation',
    },
    householdId: '00000000-0000-4000-8000-000000007902',
    occurredAt: '2026-07-14T08:00:00.000Z',
    puppyId: '00000000-0000-4000-8000-000000007903',
    todayDate: '2026-07-14',
    trackerId: 'observation',
  };
}

function createStatefulQuickLogQueue(enqueueFailure?: unknown): QuickLogQueueStorage {
  const items = new Map<string, QuickLogStoredQueueItem>();
  const getRequired = (clientEventId: string): QuickLogStoredQueueItem => {
    const item = items.get(clientEventId);

    if (!item) throw new Error('Missing synthetic queue item');
    return item;
  };
  const transition = (
    clientEventId: string,
    next: (item: QuickLogStoredQueueItem) => QuickLogStoredQueueItem,
  ): QuickLogStoredQueueItem => {
    const item = next(getRequired(clientEventId));
    items.set(clientEventId, item);
    return item;
  };

  return {
    claimNextReadyToSend: async () => null,
    enqueue: async (input, options) => {
      if (enqueueFailure !== undefined) throw enqueueFailure;
      const parsed = quickLogQueueEnqueueInputSchema.parse(input);
      const item = createStoredQuickLogQueueItem({
        ...parsed,
        last_error_category: null,
        retry_after_at: null,
        retry_count: 0,
        state: 'pending_local',
        updated_at: options.now,
      });
      items.set(item.client_event_id, item);
      return item;
    },
    getByClientEventId: async (clientEventId) => items.get(clientEventId) ?? null,
    initialize: async () => undefined,
    list: async (filter) => [...items.values()].filter((item) =>
      filter?.states === undefined || filter.states.includes(item.state)),
    manualRetry: async (clientEventId, options) => {
      const retry = createManualQuickLogRetry(getRequired(clientEventId), options);
      items.set(clientEventId, retry.item);
      return retry;
    },
    markDeletedBeforeSync: async (clientEventId, options) => transition(
      clientEventId,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_deleted_before_sync',
        now: options.now,
      }),
    ),
    markFailedPermanent: async (clientEventId, options) => transition(
      clientEventId,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_failed_permanent',
        errorCategory: options.errorCategory,
        now: options.now,
      }),
    ),
    markFailedRetryable: async (clientEventId, options) => transition(
      clientEventId,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_failed_retryable',
        errorCategory: options.errorCategory,
        retryAfterAt: options.retryAfterAt,
        now: options.now,
      }),
    ),
    markSending: async (clientEventId, options) => transition(
      clientEventId,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_sending',
        now: options.now,
      }),
    ),
    remove: async (clientEventId) => {
      items.delete(clientEventId);
    },
    resolveInFlightSuccess: async (clientEventId, options) => {
      const resolution = resolveQuickLogInFlightSuccess(getRequired(clientEventId), options);
      if (resolution.outcome === 'server_confirmed') {
        items.set(clientEventId, resolution.item);
      }
      return resolution;
    },
  };
}

function createQueryClientWrapper(
  queryClient: QueryClient,
): (props: Readonly<{ children: ReactNode }>) => ReactNode {
  return function QueryClientWrapper({ children }: Readonly<{ children: ReactNode }>): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
}

function createUnusedQuickLogQueue(): QuickLogQueueStorage {
  const fail = async (): Promise<never> => {
    throw new Error('Quick Log queue should not be used by synced delete');
  };

  return {
    claimNextReadyToSend: async () => null,
    enqueue: fail,
    getByClientEventId: async () => null,
    initialize: async () => undefined,
    list: async () => [],
    manualRetry: fail,
    markDeletedBeforeSync: fail,
    markFailedPermanent: fail,
    markFailedRetryable: fail,
    markSending: fail,
    remove: async () => undefined,
    resolveInFlightSuccess: fail,
  };
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as Readonly<{ then?: unknown }>).then === 'function';
}
