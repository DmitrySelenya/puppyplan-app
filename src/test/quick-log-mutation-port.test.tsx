import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { EventLogInsert } from '@/contracts/supabase';
import { createQuickLogFeedbackController } from '@/features/quick-log/QuickLogFeedbackProvider';
import { formatLocalCalendarDate } from '@/lib/i18n/format-date';
import { createPuppyPlanQueryClient } from '@/lib/query/client';
import { getQuickLogInvalidationKeys, queryKeys } from '@/lib/query/keys';
import {
  deleteSyncedQuickLogEvent,
  QuickLogPipelineProvider,
  removeQuickLogOptimisticEvent,
  replayQuickLogQueueItemToCache,
  restoreSyncedQuickLogEvent,
  retryLocalQuickLogEvent,
  useQuickLogMutationPort,
  type QuickLogCachedEventRow,
  type QuickLogDetailedMutationVariables,
  type QuickLogMutationPort,
  type QuickLogMutationPortUpdateDetailsRequest,
} from '@/lib/query/quick-log';
import * as quickLogActorVisibility from '@/lib/query/quick-log-actor-visibility';
import { useQuickLogCachedRows } from '@/lib/query/useQuickLogCachedRows';
import { useQuickLogTimelineRows } from '@/lib/query/useQuickLogTimelineRows';
import {
  applyQuickLogQueueTransition,
  createManualQuickLogRetry,
  getQuickLogRetryDelayMs,
  resolveQuickLogInFlightSuccess,
  type QuickLogQueueState,
  type QuickLogQueueStorage,
  type QuickLogStoredQueueItem,
} from '@/lib/queue';
import {
  createStoredQuickLogQueueItem,
  quickLogQueueEnqueueInputSchema,
} from '@/lib/queue/schema';

const syncedDeleteFailure = new Error('Synthetic synced-delete RLS failure');
const mockOpenQuickLogQueueStorage = jest.fn<Promise<QuickLogQueueStorage>, []>();
const mockTombstoneByClientEventId = jest.fn<Promise<void>, [unknown]>(async () => {
  throw syncedDeleteFailure;
});
const updateDetailsFailure = new Error('Synthetic detail update failure');
const mockUpdatePayloadByClientEventId = jest.fn<
  Promise<QuickLogCachedEventRow>,
  [unknown]
>(async () => {
  throw updateDetailsFailure;
});
const mockInsertEvent = jest.fn<Promise<QuickLogCachedEventRow>, [EventLogInsert]>();
const mockListEvents = jest.fn();
const mockRestoreByClientEventId = jest.fn();
const mockCaptureException = jest.fn();
const mockTrackQuickLogEvent = jest.fn();
const mockPrimaryActorId = '00000000-0000-4000-8000-000000000203';
const mockSecondaryActorId = '00000000-0000-4000-8000-000000000299';
type MockAuthState = Readonly<{
  status: 'signedIn';
  user: Readonly<{ id: string }>;
}>;
const mockAuthState: { current: MockAuthState } = {
  current: {
    status: 'signedIn',
    user: { id: mockPrimaryActorId },
  },
};

jest.mock('@/lib/auth', () => ({
  useAuth: () => mockAuthState.current,
}));

jest.mock('@/lib/analytics', () => {
  const actual = jest.requireActual<typeof import('@/lib/analytics')>('@/lib/analytics');

  return {
    ...actual,
    createAnalyticsClient: () => ({
      trackQuickLogEvent: mockTrackQuickLogEvent,
    }),
  };
});

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
      listEvents: mockListEvents,
      restoreByClientEventId: mockRestoreByClientEventId,
      selectExistingEvent: jest.fn(),
      tombstoneByClientEventId: mockTombstoneByClientEventId,
      updatePayloadByClientEventId: mockUpdatePayloadByClientEventId,
    }),
  };
});

jest.mock('@/lib/observability', () => {
  const actual = jest.requireActual<typeof import('@/lib/observability')>('@/lib/observability');

  return {
    ...actual,
    createObservabilityReporter: () => ({
      captureException: mockCaptureException,
    }),
  };
});

describe('useQuickLogMutationPort async failures', () => {
  afterEach(() => {
    mockAuthState.current = {
      status: 'signedIn',
      user: { id: mockPrimaryActorId },
    };
    jest.restoreAllMocks();
    mockOpenQuickLogQueueStorage.mockReset();
    mockInsertEvent.mockReset();
    mockListEvents.mockReset();
    mockRestoreByClientEventId.mockReset();
    mockCaptureException.mockReset();
    mockTrackQuickLogEvent.mockReset();
    mockTombstoneByClientEventId.mockReset();
    mockTombstoneByClientEventId.mockImplementation(async () => {
      throw syncedDeleteFailure;
    });
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

  it('AC-P3-ACTOR-1 rejects actor A delete Retry retained after auth switches to actor B before any boundary read or write', async () => {
    const item = createRecoveryQueueItem({ created_by: mockSecondaryActorId });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const request = {
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-17',
    } as const;

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => {
      expect(hook.result.current.status).toBe('ready');
      expect(hook.result.current.mutation).not.toBe(actorAPort);
    });

    queryClient.setQueryData(
      queryKeys.events.timeline(item.household_id, item.puppy_id),
      [row],
    );
    const cacheRead = jest.spyOn(queryClient, 'getQueriesData');
    cacheRead.mockClear();
    harness.enqueueDeletedBeforeSync.mockClear();
    mockTombstoneByClientEventId.mockClear();

    const outcome = await actorAPort.deleteSynced(request).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );

    expect({
      cacheReads: cacheRead.mock.calls.length,
      cachedRows: queryClient.getQueryData(
        queryKeys.events.timeline(item.household_id, item.puppy_id),
      ),
      enqueueCalls: harness.enqueueDeletedBeforeSync.mock.calls.length,
      outcome,
      tombstoneCalls: mockTombstoneByClientEventId.mock.calls.length,
    }).toEqual({
      cacheReads: 0,
      cachedRows: [row],
      enqueueCalls: 0,
      outcome: { error: expect.any(Error), status: 'rejected' },
      tombstoneCalls: 0,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-1 rejects actor A restore Undo retained after auth switches to actor B before SQLite, cache, or Supabase', async () => {
    const item = createRecoveryQueueItem({ state: 'deleted_before_sync' });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const request = {
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-17',
    } as const;

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => {
      expect(hook.result.current.status).toBe('ready');
      expect(hook.result.current.mutation).not.toBe(actorAPort);
    });

    harness.items.set(item.client_event_id, item);
    queryClient.setQueryData(
      queryKeys.events.timeline(item.household_id, item.puppy_id),
      [row],
    );
    const queueRead = jest.spyOn(harness.storage, 'getByClientEventId');
    queueRead.mockClear();
    harness.remove.mockClear();
    mockRestoreByClientEventId.mockClear();

    const outcome = await actorAPort.restoreSynced(request).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );

    expect({
      cachedRows: queryClient.getQueryData(
        queryKeys.events.timeline(item.household_id, item.puppy_id),
      ),
      outcome,
      queueReads: queueRead.mock.calls.length,
      removeCalls: harness.remove.mock.calls.length,
      restoreCalls: mockRestoreByClientEventId.mock.calls.length,
      storedItem: harness.items.get(item.client_event_id),
    }).toEqual({
      cachedRows: [row],
      outcome: { error: expect.any(Error), status: 'rejected' },
      queueReads: 0,
      removeCalls: 0,
      restoreCalls: 0,
      storedItem: item,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-3 rejects an actor A local Delete callback retained across an auth switch before any boundary access', async () => {
    const item = createRecoveryQueueItem({
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_count: 1,
    });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => {
      expect(hook.result.current.status).toBe('ready');
      expect(hook.result.current.mutation).not.toBe(actorAPort);
    });

    harness.items.set(item.client_event_id, item);
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    const queueRead = jest.spyOn(harness.storage, 'getByClientEventId');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    queueRead.mockClear();
    harness.remove.mockClear();
    invalidate.mockClear();

    actorAPort.deleteLocal(item.client_event_id);
    await flushHostMicrotasks();

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      invalidationCalls: invalidate.mock.calls.length,
      queueReads: queueRead.mock.calls.length,
      removeCalls: harness.remove.mock.calls.length,
      retainedItem: harness.items.get(item.client_event_id),
    }).toEqual({
      cachedRows: [row],
      invalidationCalls: 0,
      queueReads: 0,
      removeCalls: 0,
      retainedItem: item,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-3 rejects an actor A optimistic Undo callback retained across an auth switch before any boundary access', async () => {
    const item = createRecoveryQueueItem({
      state: 'failed_permanent',
      last_error_category: 'permission_denied',
      retry_count: 1,
    });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => {
      expect(hook.result.current.status).toBe('ready');
      expect(hook.result.current.mutation).not.toBe(actorAPort);
    });

    harness.items.set(item.client_event_id, item);
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    const queueRead = jest.spyOn(harness.storage, 'getByClientEventId');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    queueRead.mockClear();
    harness.remove.mockClear();
    invalidate.mockClear();

    actorAPort.undo({
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    });
    await flushHostMicrotasks();

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      invalidationCalls: invalidate.mock.calls.length,
      queueReads: queueRead.mock.calls.length,
      removeCalls: harness.remove.mock.calls.length,
      retainedItem: harness.items.get(item.client_event_id),
    }).toEqual({
      cachedRows: [row],
      invalidationCalls: 0,
      queueReads: 0,
      removeCalls: 0,
      retainedItem: item,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-3 rechecks actor identity after an awaited local Delete read before mutation or cache effects', async () => {
    const item = createRecoveryQueueItem({
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_count: 1,
    });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');
    harness.items.set(item.client_event_id, item);
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    const readGate = createSignaledDeferred();
    const originalRead = harness.storage.getByClientEventId.bind(harness.storage);
    const queueRead = jest.spyOn(harness.storage, 'getByClientEventId');
    queueRead.mockImplementationOnce(async (clientEventId) => {
      readGate.signal();
      await readGate.promise;
      return originalRead(clientEventId);
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    harness.remove.mockClear();
    invalidate.mockClear();

    actorAPort.deleteLocal(item.client_event_id);
    await readGate.signaled;
    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.mutation).not.toBe(actorAPort));
    invalidate.mockClear();
    readGate.resolve();
    await flushHostMicrotasks();

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      invalidationCalls: invalidate.mock.calls.length,
      queueReads: queueRead.mock.calls.length,
      removeCalls: harness.remove.mock.calls.length,
      retainedItem: harness.items.get(item.client_event_id),
    }).toEqual({
      cachedRows: [row],
      invalidationCalls: 0,
      queueReads: 1,
      removeCalls: 0,
      retainedItem: item,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-3 rechecks actor identity after an awaited sending-to-delete transition before cache effects', async () => {
    const item = createRecoveryQueueItem({ state: 'sending' });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');
    harness.items.set(item.client_event_id, item);
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    const transitionGate = createSignaledDeferred();
    const originalTransition = harness.storage.markDeletedBeforeSync.bind(harness.storage);
    const transition = jest.spyOn(harness.storage, 'markDeletedBeforeSync');
    transition.mockImplementationOnce(async (...args) => {
      transitionGate.signal();
      await transitionGate.promise;
      return originalTransition(...args);
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    invalidate.mockClear();

    actorAPort.undo({
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    });
    await transitionGate.signaled;
    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.mutation).not.toBe(actorAPort));
    invalidate.mockClear();
    transitionGate.resolve();
    await flushHostMicrotasks();

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      invalidationCalls: invalidate.mock.calls.length,
      retainedItem: harness.items.get(item.client_event_id),
      transitionCalls: transition.mock.calls.length,
    }).toEqual({
      cachedRows: [row],
      invalidationCalls: 0,
      retainedItem: expect.objectContaining({
        client_event_id: item.client_event_id,
        created_by: mockPrimaryActorId,
        state: 'deleted_before_sync',
      }),
      transitionCalls: 1,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-3 rechecks actor identity after an awaited pending-row removal before cache effects', async () => {
    const item = createRecoveryQueueItem();
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const removeIfState = createHarnessAtomicRemoveIfState(harness);
    const storage: QuickLogQueueStorage = { ...harness.storage, removeIfState };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');
    harness.items.set(item.client_event_id, item);
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    const removalGate = createSignaledDeferred();
    harness.remove.mockImplementationOnce(async (clientEventId) => {
      removalGate.signal();
      await removalGate.promise;
      harness.items.delete(clientEventId);
    });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    invalidate.mockClear();

    actorAPort.undo({
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    });
    await removalGate.signaled;
    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.mutation).not.toBe(actorAPort));
    invalidate.mockClear();
    removalGate.resolve();
    await flushHostMicrotasks();

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      invalidationCalls: invalidate.mock.calls.length,
      removeCalls: harness.remove.mock.calls.length,
      retainedItem: harness.items.get(item.client_event_id),
    }).toEqual({
      cachedRows: [row],
      invalidationCalls: 0,
      removeCalls: 1,
      retainedItem: undefined,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-3 fails closed when a stable actor B port is presented actor A local rows', async () => {
    mockAuthState.current = {
      status: 'signedIn',
      user: { id: mockSecondaryActorId },
    };
    const deleteItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000231',
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_count: 1,
    });
    const undoItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000232',
      state: 'sending',
    });
    const deleteRow = createServerRow(deleteItem);
    const undoRow = createServerRow(undoItem);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorBPort = hook.result.current.mutation;
    if (actorBPort === undefined) throw new Error('Expected actor B mutation port');
    harness.items.set(deleteItem.client_event_id, deleteItem);
    harness.items.set(undoItem.client_event_id, undoItem);
    const timelineKey = queryKeys.events.timeline(deleteItem.household_id, deleteItem.puppy_id);
    queryClient.setQueryData(timelineKey, [deleteRow, undoRow]);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    harness.remove.mockClear();
    mockCaptureException.mockClear();
    invalidate.mockClear();

    actorBPort.deleteLocal(deleteItem.client_event_id);
    actorBPort.undo({
      clientEventId: undoItem.client_event_id,
      eventType: undoItem.event_type,
      householdId: undoItem.household_id,
      puppyId: undoItem.puppy_id,
      todayDate: '2026-07-16',
    });
    await flushHostMicrotasks();

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      deleteItem: harness.items.get(deleteItem.client_event_id),
      invalidationCalls: invalidate.mock.calls.length,
      removeCalls: harness.remove.mock.calls.length,
      reports: mockCaptureException.mock.calls,
      undoItem: harness.items.get(undoItem.client_event_id),
    }).toEqual({
      cachedRows: [deleteRow, undoRow],
      deleteItem,
      invalidationCalls: 0,
      removeCalls: 0,
      reports: expect.arrayContaining([
        [
          expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
          expect.objectContaining({ area: 'quick_log_queue' }),
        ],
      ]),
      undoItem,
    });
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(
      deleteItem.client_event_id,
    );
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(
      undoItem.client_event_id,
    );

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-DATE-1 invalidates the device-local Today key when local Delete crosses UTC midnight', async () => {
    const occurredAt = '2026-07-17T23:30:00.000Z';
    await withDateGettersInTimeZone(occurredAt, 'Europe/Warsaw', async () => {
      const localCalendarDate = '2026-07-18';
      const utcCalendarDate = '2026-07-17';
      expect(formatLocalCalendarDate(occurredAt)).toBe(localCalendarDate);

      const item = createRecoveryQueueItem({
        occurred_at: occurredAt,
        state: 'failed_retryable',
        last_error_category: 'network_unavailable',
        retry_count: 1,
      });
      const row = createServerRow(item);
      const harness = createRecoveryQueueHarness([], { claimEnabled: false });
      const removeIfState = createHarnessAtomicRemoveIfState(harness);
      const storage: QuickLogQueueStorage = { ...harness.storage, removeIfState };
      mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
      const queryClient = createTestQueryClient();
      const hook = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(queryClient),
      });

      try {
        await waitFor(() => expect(hook.result.current.status).toBe('ready'));
        const mutation = hook.result.current.mutation;
        if (mutation === undefined) throw new Error('Expected mutation port');

        harness.items.set(item.client_event_id, item);
        const localTimelineKey = queryKeys.events.timeline(
          item.household_id,
          item.puppy_id,
          { from: localCalendarDate, to: localCalendarDate },
        );
        const utcTimelineKey = queryKeys.events.timeline(
          item.household_id,
          item.puppy_id,
          { from: utcCalendarDate, to: utcCalendarDate },
        );
        queryClient.setQueryData(localTimelineKey, [row]);
        queryClient.setQueryData(utcTimelineKey, [row]);
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        harness.remove.mockClear();
        invalidate.mockClear();
        mockInsertEvent.mockClear();
        mockTombstoneByClientEventId.mockClear();
        mockTrackQuickLogEvent.mockClear();

        mutation.deleteLocal(item.client_event_id);

        await waitFor(() => expect(harness.items.has(item.client_event_id)).toBe(false));
        await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4));

        expect(invalidate.mock.calls).toEqual([
          [{
            queryKey: queryKeys.today.dashboard(
              item.household_id,
              item.puppy_id,
              localCalendarDate,
            ),
            exact: true,
          }],
          [{
            queryKey: queryKeys.events.timelineRoot(item.household_id, item.puppy_id),
            exact: false,
          }],
          [{
            queryKey: queryKeys.puppy.summary(item.household_id, item.puppy_id),
            exact: true,
          }],
          [{
            queryKey: queryKeys.events.duplicateWarningSource(
              item.household_id,
              item.puppy_id,
              item.event_type,
            ),
            exact: true,
          }],
        ]);
        expect(invalidate).not.toHaveBeenCalledWith({
          queryKey: queryKeys.today.dashboard(
            item.household_id,
            item.puppy_id,
            utcCalendarDate,
          ),
          exact: true,
        });
        expect(queryClient.getQueryData(localTimelineKey)).toEqual([]);
        expect(queryClient.getQueryData(utcTimelineKey)).toEqual([]);
        expect(harness.remove).toHaveBeenCalledTimes(1);
        expect(mockInsertEvent).not.toHaveBeenCalled();
        expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();
        expect(mockTrackQuickLogEvent).not.toHaveBeenCalled();
        expect(removeIfState).toHaveBeenCalledWith(
          item.client_event_id,
          'failed_retryable',
          { expectedCreatedBy: mockPrimaryActorId },
        );
      } finally {
        hook.unmount();
        queryClient.clear();
      }
    });
  });

  it('AC-P3-ACTOR-1 rechecks actor identity after an awaited delete-intent write before cache effects', async () => {
    const item = createRecoveryQueueItem({ created_by: mockSecondaryActorId });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const enqueueGate = createSignaledDeferred();
    const enqueueImplementation = harness.enqueueDeletedBeforeSync.getMockImplementation();
    if (enqueueImplementation === undefined) throw new Error('Expected delete-intent implementation');
    harness.enqueueDeletedBeforeSync.mockImplementationOnce(async (...args) => {
      enqueueGate.signal();
      await enqueueGate.promise;
      return enqueueImplementation(...args);
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKeys.events.timeline(item.household_id, item.puppy_id),
      [row],
    );
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const request = {
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-17',
    } as const;

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');
    const deleting = actorAPort.deleteSynced(request);
    await enqueueGate.signaled;

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => {
      expect(hook.result.current.status).toBe('ready');
      expect(hook.result.current.mutation).not.toBe(actorAPort);
    });
    enqueueGate.resolve();
    const outcome = await deleting.then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );

    expect({
      cachedRows: queryClient.getQueryData(
        queryKeys.events.timeline(item.household_id, item.puppy_id),
      ),
      enqueueCalls: harness.enqueueDeletedBeforeSync.mock.calls.length,
      outcome,
      tombstoneCalls: mockTombstoneByClientEventId.mock.calls.length,
    }).toEqual({
      cachedRows: [row],
      enqueueCalls: 1,
      outcome: { error: expect.any(Error), status: 'rejected' },
      tombstoneCalls: 0,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-1 rechecks actor identity after an awaited serialized Undo read before removing or restoring', async () => {
    const item = createRecoveryQueueItem({ state: 'deleted_before_sync' });
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const request = {
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-17',
    } as const;

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');
    harness.items.set(item.client_event_id, item);
    const readGate = createSignaledDeferred();
    const originalRead = harness.storage.getByClientEventId.bind(harness.storage);
    const queueRead = jest.spyOn(harness.storage, 'getByClientEventId');
    queueRead.mockImplementationOnce(async (expectedClientEventId) => {
      readGate.signal();
      await readGate.promise;
      return originalRead(expectedClientEventId);
    });
    harness.remove.mockClear();
    mockRestoreByClientEventId.mockClear();
    const restoring = actorAPort.restoreSynced(request);
    await readGate.signaled;

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => {
      expect(hook.result.current.status).toBe('ready');
      expect(hook.result.current.mutation).not.toBe(actorAPort);
    });
    readGate.resolve();
    const outcome = await restoring.then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );

    expect({
      outcome,
      queueReads: queueRead.mock.calls.length,
      removeCalls: harness.remove.mock.calls.length,
      restoreCalls: mockRestoreByClientEventId.mock.calls.length,
      storedItem: harness.items.get(item.client_event_id),
    }).toEqual({
      outcome: { error: expect.any(Error), status: 'rejected' },
      queueReads: 1,
      removeCalls: 0,
      restoreCalls: 0,
      storedItem: item,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-1 rechecks actor identity after awaited manual Retry before cache replay or Supabase', async () => {
    const item = createRecoveryQueueItem({
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-17T12:00:00.000Z',
      retry_count: 1,
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const manualRetryGate = createSignaledDeferred();
    const legacyPath = createSignaledDeferred();
    const legacyManualRetry = jest.fn<
      ReturnType<QuickLogQueueStorage['manualRetry']>,
      Parameters<QuickLogQueueStorage['manualRetry']>
    >(async () => {
      legacyPath.signal();
      throw new Error('Unexpected legacy manual Retry path');
    });
    const manualRetryIfOwned = jest.fn(async (
      clientEventId: string,
      options: Readonly<{
        expectedCreatedBy: string;
        isActorCurrent?: () => boolean;
        now: string;
        recoverySurface?: 'manual_retry';
      }>,
    ) => {
      manualRetryGate.signal();
      await manualRetryGate.promise;
      if (options.isActorCurrent?.() !== true) return null;
      const retained = harness.items.get(clientEventId);
      if (retained?.created_by !== options.expectedCreatedBy) return null;
      const retry = createManualQuickLogRetry(retained, options);
      if (!options.isActorCurrent()) return null;
      harness.items.set(clientEventId, retry.item);
      return retry;
    });
    const queryClient = createTestQueryClient();
    const cacheWrite = jest.spyOn(queryClient, 'setQueryData');
    const cacheReplay = jest.spyOn(queryClient, 'setQueriesData');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const insertEvent = jest.fn(async () => createServerRow(item));
    const trackQuickLogEvent = jest.fn();
    const captureException = jest.fn();
    let currentActorId = mockPrimaryActorId;
    const actorAwareQueue = {
      ...harness.storage,
      manualRetry: legacyManualRetry,
      manualRetryIfOwned,
    };

    const retrying = retryLocalQuickLogEvent({
      actorId: mockPrimaryActorId,
      analytics: { trackQuickLogEvent },
      clientEventId: item.client_event_id,
      events: {
        insertEvent,
        tombstoneByClientEventId: jest.fn(),
      },
      getActorId: () => currentActorId,
      observability: { captureException },
      queryClient,
      queueRef: { current: actorAwareQueue },
      recoverySurface: 'manual_retry',
      sourceSurface: 'today',
    });

    const reachedPath = await Promise.race([
      manualRetryGate.signaled.then(() => 'actor-aware' as const),
      legacyPath.signaled.then(() => 'legacy' as const),
    ]);
    if (reachedPath === 'actor-aware') {
      currentActorId = mockSecondaryActorId;
    }
    manualRetryGate.resolve();
    const outcome = await retrying.then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );

    expect({
      actorAwareCalls: manualRetryIfOwned.mock.calls,
      cacheReplayCalls: cacheReplay.mock.calls.length,
      cacheWrites: cacheWrite.mock.calls.length,
      insertCalls: insertEvent.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      legacyManualRetryCalls: legacyManualRetry.mock.calls.length,
      outcome,
      reachedPath,
      retainedItem: harness.items.get(item.client_event_id),
      trackCalls: trackQuickLogEvent.mock.calls.length,
    }).toEqual({
      actorAwareCalls: [[item.client_event_id, {
        expectedCreatedBy: mockPrimaryActorId,
        isActorCurrent: expect.any(Function),
        now: expect.any(String),
        recoverySurface: 'manual_retry',
      }]],
      cacheReplayCalls: 0,
      cacheWrites: 0,
      insertCalls: 0,
      invalidationCalls: 0,
      legacyManualRetryCalls: 0,
      outcome: { status: 'resolved' },
      reachedPath: 'actor-aware',
      retainedItem: item,
      trackCalls: 0,
    });
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'manual_retry_actor_mismatch' }),
    );
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(item.client_event_id);

    queryClient.clear();
  });

  it('AC-P3-ACTOR-4 rejects a foreign ordinary Retry without mutating SQLite, cache, network, analytics, or invalidation', async () => {
    const item = createRecoveryQueueItem({
      created_by: mockPrimaryActorId,
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-17T12:00:00.000Z',
      retry_count: 1,
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const manualRetry = jest.spyOn(harness.storage, 'manualRetry');
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    const cachedRow: QuickLogCachedEventRow = {
      ...createServerRow(item),
      localSync: {
        category: item.last_error_category,
        retryCount: item.retry_count,
        state: item.state,
      },
    };
    queryClient.setQueryData(timelineKey, [cachedRow]);
    const cacheReplay = jest.spyOn(queryClient, 'setQueriesData');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const insertEvent = jest.fn(async () => createServerRow(item));
    const tombstoneByClientEventId = jest.fn();
    const trackQuickLogEvent = jest.fn();
    const captureException = jest.fn();

    await expect(retryLocalQuickLogEvent({
      actorId: mockSecondaryActorId,
      analytics: { trackQuickLogEvent },
      clientEventId: item.client_event_id,
      events: { insertEvent, tombstoneByClientEventId },
      getActorId: () => mockSecondaryActorId,
      observability: { captureException },
      queryClient,
      queueRef: { current: harness.storage },
      recoverySurface: 'manual_retry',
      sourceSurface: 'today',
    })).resolves.toBeUndefined();

    expect({
      cacheReplayCalls: cacheReplay.mock.calls.length,
      cachedRows: queryClient.getQueryData(timelineKey),
      insertCalls: insertEvent.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      manualRetryCalls: manualRetry.mock.calls.length,
      retainedItem: harness.items.get(item.client_event_id),
      tombstoneCalls: tombstoneByClientEventId.mock.calls.length,
      trackCalls: trackQuickLogEvent.mock.calls.length,
    }).toEqual({
      cacheReplayCalls: 0,
      cachedRows: [cachedRow],
      insertCalls: 0,
      invalidationCalls: 0,
      manualRetryCalls: 0,
      retainedItem: item,
      tombstoneCalls: 0,
      trackCalls: 0,
    });
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'manual_retry_actor_mismatch' }),
    );
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(item.client_event_id);

    queryClient.clear();
  });

  it('AC-P3-ACTOR-4 fails closed when an ordinary Retry adapter lacks actor-aware atomic capability', async () => {
    const item = createRecoveryQueueItem({
      state: 'failed_permanent',
      last_error_category: 'permission_denied',
      retry_count: 2,
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const legacyManualRetry = jest.spyOn(harness.storage, 'manualRetry');
    const queryClient = createTestQueryClient();
    const cacheReplay = jest.spyOn(queryClient, 'setQueriesData');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const insertEvent = jest.fn(async () => createServerRow(item));
    const tombstoneByClientEventId = jest.fn();
    const trackQuickLogEvent = jest.fn();
    const captureException = jest.fn();

    await expect(retryLocalQuickLogEvent({
      actorId: mockPrimaryActorId,
      analytics: { trackQuickLogEvent },
      clientEventId: item.client_event_id,
      events: { insertEvent, tombstoneByClientEventId },
      getActorId: () => mockPrimaryActorId,
      observability: { captureException },
      queryClient,
      queueRef: { current: harness.storage },
      recoverySurface: 'manual_retry',
      sourceSurface: 'today',
    })).resolves.toBeUndefined();

    expect({
      cacheReplayCalls: cacheReplay.mock.calls.length,
      insertCalls: insertEvent.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      legacyManualRetryCalls: legacyManualRetry.mock.calls.length,
      retainedItem: harness.items.get(item.client_event_id),
      tombstoneCalls: tombstoneByClientEventId.mock.calls.length,
      trackCalls: trackQuickLogEvent.mock.calls.length,
    }).toEqual({
      cacheReplayCalls: 0,
      insertCalls: 0,
      invalidationCalls: 0,
      legacyManualRetryCalls: 0,
      retainedItem: item,
      tombstoneCalls: 0,
      trackCalls: 0,
    });
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'manual_retry_actor_mismatch' }),
    );
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(item.client_event_id);

    queryClient.clear();
  });

  it('AC-P3-ACTOR-4 leaves an ordinary Retry byte-identical when auth changes during its awaited read', async () => {
    const item = createRecoveryQueueItem({
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-17T12:00:00.000Z',
      retry_count: 1,
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const readGate = createSignaledDeferred();
    const originalRead = harness.storage.getByClientEventId.bind(harness.storage);
    const getByClientEventId = jest.fn(async (clientEventId: string) => {
      readGate.signal();
      await readGate.promise;
      return originalRead(clientEventId);
    });
    const manualRetry = jest.spyOn(harness.storage, 'manualRetry');
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const insertEvent = jest.fn(async () => createServerRow(item));
    const trackQuickLogEvent = jest.fn();
    const captureException = jest.fn();
    let currentActorId = mockPrimaryActorId;

    const retrying = retryLocalQuickLogEvent({
      actorId: mockPrimaryActorId,
      analytics: { trackQuickLogEvent },
      clientEventId: item.client_event_id,
      events: {
        insertEvent,
        tombstoneByClientEventId: jest.fn(),
      },
      getActorId: () => currentActorId,
      observability: { captureException },
      queryClient,
      queueRef: {
        current: {
          ...harness.storage,
          getByClientEventId,
        },
      },
      recoverySurface: 'manual_retry',
      sourceSurface: 'today',
    });

    await readGate.signaled;
    currentActorId = mockSecondaryActorId;
    readGate.resolve();
    await retrying;

    expect({
      insertCalls: insertEvent.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      manualRetryCalls: manualRetry.mock.calls.length,
      retainedItem: harness.items.get(item.client_event_id),
      trackCalls: trackQuickLogEvent.mock.calls.length,
    }).toEqual({
      insertCalls: 0,
      invalidationCalls: 0,
      manualRetryCalls: 0,
      retainedItem: item,
      trackCalls: 0,
    });
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'manual_retry_actor_mismatch' }),
    );

    queryClient.clear();
  });

  it('AC-P3-ACTOR-4 uses actor-aware atomic Retry for the matching actor', async () => {
    const item = createRecoveryQueueItem({
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-17T12:00:00.000Z',
      retry_count: 1,
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const legacyManualRetry = jest.spyOn(harness.storage, 'manualRetry');
    const manualRetryIfOwned = jest.fn(async (
      clientEventId: string,
      options: Readonly<{
        expectedCreatedBy: string;
        isActorCurrent?: () => boolean;
        now: string;
        recoverySurface?: 'manual_retry';
      }>,
    ) => {
      if (options.isActorCurrent?.() !== true) return null;
      const retained = harness.items.get(clientEventId);
      if (retained?.created_by !== options.expectedCreatedBy) return null;
      const retry = createManualQuickLogRetry(retained, options);
      if (!options.isActorCurrent()) return null;
      harness.items.set(clientEventId, retry.item);
      return retry;
    });
    const queue = {
      ...harness.storage,
      manualRetryIfOwned,
    };
    const queryClient = createTestQueryClient();
    const insertEvent = jest.fn(async () => createServerRow(item));
    const tombstoneByClientEventId = jest.fn();
    const trackQuickLogEvent = jest.fn();

    await expect(retryLocalQuickLogEvent({
      actorId: mockPrimaryActorId,
      analytics: { trackQuickLogEvent },
      clientEventId: item.client_event_id,
      events: { insertEvent, tombstoneByClientEventId },
      getActorId: () => mockPrimaryActorId,
      queryClient,
      queueRef: { current: queue },
      recoverySurface: 'manual_retry',
      sourceSurface: 'today',
    })).resolves.toBeUndefined();

    expect(manualRetryIfOwned).toHaveBeenCalledWith(item.client_event_id, {
      expectedCreatedBy: mockPrimaryActorId,
      isActorCurrent: expect.any(Function),
      now: expect.any(String),
      recoverySurface: 'manual_retry',
    });
    expect(legacyManualRetry).not.toHaveBeenCalled();
    expect(insertEvent).toHaveBeenCalledWith(expect.objectContaining({
      client_event_id: item.client_event_id,
      created_by: mockPrimaryActorId,
    }));
    expect(tombstoneByClientEventId).not.toHaveBeenCalled();
    expect(trackQuickLogEvent).toHaveBeenCalledWith(expect.objectContaining({
      name: 'event_logged',
    }));

    queryClient.clear();
  });

  it('AC-P3-DATE-1 replays and invalidates ordinary Retry in the device-local day across UTC midnight', async () => {
    const occurredAt = '2026-07-17T23:30:00.000Z';
    await withDateGettersInTimeZone(occurredAt, 'Europe/Warsaw', async () => {
      const localCalendarDate = '2026-07-18';
      const utcCalendarDate = '2026-07-17';
      expect(formatLocalCalendarDate(occurredAt)).toBe(localCalendarDate);

      const item = createRecoveryQueueItem({
        occurred_at: occurredAt,
        state: 'failed_retryable',
        last_error_category: 'network_unavailable',
        retry_after_at: '2099-07-17T12:00:00.000Z',
        retry_count: 1,
      });
      const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
      const manualRetryIfOwned = jest.fn(async (
        clientEventId: string,
        options: Parameters<NonNullable<QuickLogQueueStorage['manualRetryIfOwned']>>[1],
      ) => {
        const retained = harness.items.get(clientEventId);
        if (retained?.created_by !== options.expectedCreatedBy || !options.isActorCurrent()) {
          return null;
        }
        const retry = createManualQuickLogRetry(retained, options);
        if (!options.isActorCurrent()) return null;
        harness.items.set(clientEventId, retry.item);
        return retry;
      });
      const queue = {
        ...harness.storage,
        manualRetryIfOwned,
      };
      const queryClient = createTestQueryClient();
      const localTimelineKey = queryKeys.events.timeline(
        item.household_id,
        item.puppy_id,
        { from: localCalendarDate, to: localCalendarDate },
      );
      const utcTimelineKey = queryKeys.events.timeline(
        item.household_id,
        item.puppy_id,
        { from: utcCalendarDate, to: utcCalendarDate },
      );
      queryClient.setQueryData(localTimelineKey, []);
      queryClient.setQueryData(utcTimelineKey, []);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const insertedRow = createServerRow(item);
      const insertEvent = jest.fn(async () => insertedRow);
      const tombstoneByClientEventId = jest.fn();
      const trackQuickLogEvent = jest.fn();

      try {
        await expect(retryLocalQuickLogEvent({
          actorId: mockPrimaryActorId,
          analytics: { trackQuickLogEvent },
          clientEventId: item.client_event_id,
          events: { insertEvent, tombstoneByClientEventId },
          getActorId: () => mockPrimaryActorId,
          queryClient,
          queueRef: { current: queue },
          recoverySurface: 'manual_retry',
          sourceSurface: 'today',
        })).resolves.toBeUndefined();

        expect(queryClient.getQueryData(localTimelineKey)).toEqual([
          { ...insertedRow, localSync: undefined },
        ]);
        expect(queryClient.getQueryData(utcTimelineKey)).toEqual([]);
        expect(invalidate.mock.calls).toEqual([
          [{
            queryKey: queryKeys.today.dashboard(
              item.household_id,
              item.puppy_id,
              localCalendarDate,
            ),
            exact: true,
          }],
          [{
            queryKey: queryKeys.events.timelineRoot(item.household_id, item.puppy_id),
            exact: false,
          }],
          [{
            queryKey: queryKeys.puppy.summary(item.household_id, item.puppy_id),
            exact: true,
          }],
          [{
            queryKey: queryKeys.events.duplicateWarningSource(
              item.household_id,
              item.puppy_id,
              item.event_type,
            ),
            exact: true,
          }],
        ]);
        expect(invalidate).not.toHaveBeenCalledWith({
          queryKey: queryKeys.today.dashboard(
            item.household_id,
            item.puppy_id,
            utcCalendarDate,
          ),
          exact: true,
        });
        expect(manualRetryIfOwned).toHaveBeenCalledTimes(1);
        expect(insertEvent).toHaveBeenCalledTimes(1);
        expect(harness.remove).toHaveBeenCalledTimes(1);
        expect(harness.items.has(item.client_event_id)).toBe(false);
        expect(tombstoneByClientEventId).not.toHaveBeenCalled();
        expect(trackQuickLogEvent).toHaveBeenCalledWith(expect.objectContaining({
          name: 'event_logged',
        }));
      } finally {
        queryClient.clear();
      }
    });
  });

  it('AC-P3-ERROR-1 stops and reports when the post-insert-failure queue read rejects', async () => {
    const privateMarker = 'private-post-insert-queue-read-marker';
    const item = createRecoveryQueueItem({
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-17T12:00:00.000Z',
      retry_count: 1,
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const originalRead = harness.storage.getByClientEventId.bind(harness.storage);
    let readCount = 0;
    const getByClientEventId = jest.fn(async (expectedClientEventId: string) => {
      readCount += 1;
      if (readCount === 2) throw new Error(privateMarker);
      return originalRead(expectedClientEventId);
    });
    const manualRetryIfOwned = jest.fn(async (
      expectedClientEventId: string,
      options: Parameters<NonNullable<QuickLogQueueStorage['manualRetryIfOwned']>>[1],
    ) => {
      const retained = harness.items.get(expectedClientEventId);
      if (retained?.created_by !== options.expectedCreatedBy || !options.isActorCurrent()) {
        return null;
      }
      const retry = createManualQuickLogRetry(retained, options);
      harness.items.set(expectedClientEventId, retry.item);
      return retry;
    });
    const markFailedPermanent = jest.spyOn(harness.storage, 'markFailedPermanent');
    const queue = {
      ...harness.storage,
      getByClientEventId,
      manualRetryIfOwned,
    };
    const insertStarted = createDeferred();
    let rejectInsert: ((error: unknown) => void) | undefined;
    const insertEvent = jest.fn(() => new Promise<QuickLogCachedEventRow>((_resolve, reject) => {
      rejectInsert = reject;
      insertStarted.resolve();
    }));
    const tombstoneByClientEventId = jest.fn();
    const captureException = jest.fn();
    const trackQuickLogEvent = jest.fn();
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const cacheWrite = jest.spyOn(queryClient, 'setQueriesData');

    const retrying = retryLocalQuickLogEvent({
      actorId: mockPrimaryActorId,
      analytics: { trackQuickLogEvent },
      clientEventId: item.client_event_id,
      events: { insertEvent, tombstoneByClientEventId },
      getActorId: () => mockPrimaryActorId,
      observability: { captureException },
      queryClient,
      queueRef: { current: queue },
      recoverySurface: 'manual_retry',
      sourceSurface: 'today',
    });

    await insertStarted.promise;
    const retainedAtFailure = harness.items.get(item.client_event_id);
    const cacheAtFailure = queryClient.getQueriesData<QuickLogCachedEventRow[]>({
      queryKey: queryKeys.events.timelineRoot(item.household_id, item.puppy_id),
    });
    harness.markFailedRetryable.mockClear();
    markFailedPermanent.mockClear();
    cacheWrite.mockClear();
    invalidate.mockClear();
    trackQuickLogEvent.mockClear();
    rejectInsert?.(new Error('Synthetic insert failure'));
    await expect(retrying).resolves.toBeUndefined();

    expect({
      cache: queryClient.getQueriesData<QuickLogCachedEventRow[]>({
        queryKey: queryKeys.events.timelineRoot(item.household_id, item.puppy_id),
      }),
      cacheAtFailure,
      cacheWritesAfterReadFailure: cacheWrite.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      markPermanentCalls: markFailedPermanent.mock.calls.length,
      markRetryableCalls: harness.markFailedRetryable.mock.calls.length,
      retainedAtFailure,
      retainedItem: harness.items.get(item.client_event_id),
      tombstoneCalls: tombstoneByClientEventId.mock.calls.length,
      trackCalls: trackQuickLogEvent.mock.calls.length,
    }).toEqual({
      cache: cacheAtFailure,
      cacheAtFailure,
      cacheWritesAfterReadFailure: 0,
      invalidationCalls: 0,
      markPermanentCalls: 0,
      markRetryableCalls: 0,
      retainedAtFailure,
      retainedItem: retainedAtFailure,
      tombstoneCalls: 0,
      trackCalls: 0,
    });
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({
        area: 'quick_log_queue',
        operation: 'manual_retry_read',
      }),
    );
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(privateMarker);
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(item.client_event_id);

    queryClient.clear();
  });

  it('AC-P3-ERROR-1 reports manual-Retry cleanup failure and keeps the delete intent retained', async () => {
    const privateMarker = 'private-manual-retry-cleanup-marker';
    const item = createRecoveryQueueItem({
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-17T12:00:00.000Z',
      retry_count: 1,
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    let deletedIntent: QuickLogStoredQueueItem | undefined;
    const manualRetryIfOwned = jest.fn(async (
      expectedClientEventId: string,
      options: Parameters<NonNullable<QuickLogQueueStorage['manualRetryIfOwned']>>[1],
    ) => {
      const retained = harness.items.get(expectedClientEventId);
      if (retained?.created_by !== options.expectedCreatedBy || !options.isActorCurrent()) {
        return null;
      }
      const retry = createManualQuickLogRetry(retained, options);
      harness.items.set(expectedClientEventId, retry.item);
      return retry;
    });
    const resolveInFlightSuccess = jest.fn(async (expectedClientEventId: string) => {
      const sending = harness.items.get(expectedClientEventId);
      if (sending === undefined) throw new Error('Expected retained sending item');
      deletedIntent = createStoredQuickLogQueueItem({
        ...sending,
        state: 'deleted_before_sync',
        updated_at: '2026-07-17T12:05:00.000Z',
      });
      harness.items.set(expectedClientEventId, deletedIntent);
      return {
        outcome: 'requires_server_cleanup' as const,
        item: deletedIntent,
      };
    });
    const queue = {
      ...harness.storage,
      manualRetryIfOwned,
      resolveInFlightSuccess,
    };
    const captureException = jest.fn();
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const tombstoneByClientEventId = jest.fn(async () => {
      throw new Error(privateMarker);
    });

    await expect(retryLocalQuickLogEvent({
      actorId: mockPrimaryActorId,
      clientEventId: item.client_event_id,
      events: {
        insertEvent: jest.fn(async () => createServerRow(item)),
        tombstoneByClientEventId,
      },
      getActorId: () => mockPrimaryActorId,
      observability: { captureException },
      queryClient,
      queueRef: { current: queue },
      recoverySurface: 'manual_retry',
      sourceSurface: 'today',
    })).resolves.toBeUndefined();

    expect(deletedIntent).toBeDefined();
    expect(harness.items.get(item.client_event_id)).toEqual(deletedIntent);
    expect(harness.remove).not.toHaveBeenCalled();
    expect(tombstoneByClientEventId).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).not.toHaveBeenCalledWith(expect.objectContaining({
      queryKey: queryKeys.events.timelineRoot(item.household_id, item.puppy_id),
    }));
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({
        area: 'quick_log_queue',
        operation: 'manual_retry_cleanup',
      }),
    );
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(privateMarker);
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(item.client_event_id);

    queryClient.clear();
  });

  it('AC-P3-ACTOR-1 leaves a delete Retry sentinel unchanged when the actor changes after its serialized read', async () => {
    const item = createRecoveryQueueItem({
      state: 'deleted_before_sync',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-17T12:00:00.000Z',
      retry_count: 1,
    });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const serializedReadGate = createSignaledDeferred();
    const originalRead = harness.storage.getByClientEventId.bind(harness.storage);
    let readCount = 0;
    const getByClientEventId = jest.fn(async (clientEventId: string) => {
      readCount += 1;
      if (readCount === 2) {
        serializedReadGate.signal();
        await serializedReadGate.promise;
      }
      return originalRead(clientEventId);
    });
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    const tombstoneByClientEventId = jest.fn();
    const captureException = jest.fn();
    let currentActorId = mockPrimaryActorId;

    const retrying = retryLocalQuickLogEvent({
      actorId: mockPrimaryActorId,
      clientEventId: item.client_event_id,
      events: {
        insertEvent: jest.fn(),
        tombstoneByClientEventId,
      },
      getActorId: () => currentActorId,
      observability: { captureException },
      queryClient,
      queueRef: {
        current: {
          ...harness.storage,
          getByClientEventId,
        },
      },
      recoverySurface: 'manual_retry',
      sourceSurface: 'today',
    });

    await serializedReadGate.signaled;
    currentActorId = mockSecondaryActorId;
    serializedReadGate.resolve();
    await retrying;

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      retainedItem: harness.items.get(item.client_event_id),
      retainCalls: harness.retainDeletedBeforeSync.mock.calls.length,
      tombstoneCalls: tombstoneByClientEventId.mock.calls.length,
    }).toEqual({
      cachedRows: [row],
      retainedItem: item,
      retainCalls: 0,
      tombstoneCalls: 0,
    });
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'manual_retry_actor_mismatch' }),
    );

    queryClient.clear();
  });

  it('AC-P3-ACTOR-1 stops post-insert Retry effects when auth changes while Supabase is awaited', async () => {
    const item = createRecoveryQueueItem({
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-17T12:00:00.000Z',
      retry_count: 1,
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const insertGate = createSignaledDeferred();
    const legacyManualRetry = jest.fn<
      ReturnType<QuickLogQueueStorage['manualRetry']>,
      Parameters<QuickLogQueueStorage['manualRetry']>
    >(harness.storage.manualRetry.bind(harness.storage));
    const manualRetryIfOwned = jest.fn(async (
      clientEventId: string,
      options: Readonly<{
        expectedCreatedBy: string;
        isActorCurrent?: () => boolean;
        now: string;
        recoverySurface?: 'manual_retry';
      }>,
    ) => {
      if (options.isActorCurrent?.() !== true) return null;
      const retained = harness.items.get(clientEventId);
      if (retained?.created_by !== options.expectedCreatedBy) return null;
      const retry = createManualQuickLogRetry(retained, options);
      if (!options.isActorCurrent()) return null;
      harness.items.set(clientEventId, retry.item);
      return retry;
    });
    const insertEvent = jest.fn(async () => {
      insertGate.signal();
      await insertGate.promise;
      return createServerRow(item);
    });
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const resolveInFlightSuccess = jest.spyOn(harness.storage, 'resolveInFlightSuccess');
    const trackQuickLogEvent = jest.fn();
    const captureException = jest.fn();
    let currentActorId = mockPrimaryActorId;
    const actorAwareQueue = {
      ...harness.storage,
      manualRetry: legacyManualRetry,
      manualRetryIfOwned,
    };

    const retrying = retryLocalQuickLogEvent({
      actorId: mockPrimaryActorId,
      analytics: { trackQuickLogEvent },
      clientEventId: item.client_event_id,
      events: {
        insertEvent,
        tombstoneByClientEventId: jest.fn(),
      },
      getActorId: () => currentActorId,
      observability: { captureException },
      queryClient,
      queueRef: { current: actorAwareQueue },
      recoverySurface: 'manual_retry',
      sourceSurface: 'today',
    });

    const reachedInsert = await Promise.race([
      insertGate.signaled.then(() => 'insert' as const),
      retrying.then(
        () => 'settled-before-insert' as const,
        () => 'rejected-before-insert' as const,
      ),
    ]);
    if (reachedInsert === 'insert') {
      currentActorId = mockSecondaryActorId;
    }
    const cacheBeforeActorSwitch = queryClient.getQueriesData<QuickLogCachedEventRow[]>({
      queryKey: queryKeys.events.timelineRoot(item.household_id, item.puppy_id),
    });
    invalidate.mockClear();
    resolveInFlightSuccess.mockClear();
    harness.remove.mockClear();
    trackQuickLogEvent.mockClear();
    insertGate.resolve();
    await retrying;

    expect({
      actorAwareCalls: manualRetryIfOwned.mock.calls,
      cacheAfterActorSwitch: queryClient.getQueriesData<QuickLogCachedEventRow[]>({
        queryKey: queryKeys.events.timelineRoot(item.household_id, item.puppy_id),
      }),
      cacheBeforeActorSwitch,
      insertCalls: insertEvent.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      legacyManualRetryCalls: legacyManualRetry.mock.calls.length,
      removeCalls: harness.remove.mock.calls.length,
      reachedInsert,
      resolutionCalls: resolveInFlightSuccess.mock.calls.length,
      trackCalls: trackQuickLogEvent.mock.calls.length,
    }).toEqual({
      actorAwareCalls: [[item.client_event_id, {
        expectedCreatedBy: mockPrimaryActorId,
        isActorCurrent: expect.any(Function),
        now: expect.any(String),
        recoverySurface: 'manual_retry',
      }]],
      cacheAfterActorSwitch: cacheBeforeActorSwitch,
      cacheBeforeActorSwitch,
      insertCalls: 1,
      invalidationCalls: 0,
      legacyManualRetryCalls: 0,
      removeCalls: 0,
      reachedInsert: 'insert',
      resolutionCalls: 0,
      trackCalls: 0,
    });
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'manual_retry_actor_mismatch' }),
    );

    queryClient.clear();
  });

  it('AC-P3-ACTOR-6 invalidates a production port on unmount before retained global Retry, local Delete, optimistic Undo, or queue access', async () => {
    const retryItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000341',
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-17T12:00:00.000Z',
      retry_count: 1,
    });
    const deleteItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000342',
      state: 'failed_permanent',
      last_error_category: 'permission_denied',
      retry_count: 2,
    });
    const undoItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000343',
      state: 'pending_local',
    });
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const manualRetryIfOwned = jest.fn(async (
      clientEventId: string,
      options: Parameters<NonNullable<QuickLogQueueStorage['manualRetryIfOwned']>>[1],
    ) => {
      if (!options.isActorCurrent()) return null;
      const retained = harness.items.get(clientEventId);
      if (retained?.created_by !== options.expectedCreatedBy) return null;
      const retry = createManualQuickLogRetry(retained, options);
      harness.items.set(clientEventId, retry.item);
      return retry;
    });
    const updateDetails = jest.fn(async (
      clientEventId: string,
      options: Parameters<NonNullable<QuickLogQueueStorage['updateDetails']>>[1],
    ) => {
      const retained = harness.items.get(clientEventId);
      if (retained === undefined) throw new Error('Synthetic queue item missing');
      const updated = createStoredQuickLogQueueItem({
        ...retained,
        occurred_at: options.occurredAt,
        payload: options.payload,
        payload_version: options.payloadVersion,
        updated_at: options.now,
      });
      harness.items.set(clientEventId, updated);
      return updated;
    });
    const storage: QuickLogQueueStorage = {
      ...harness.storage,
      manualRetryIfOwned,
      updateDetails,
    };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');

    harness.items.set(retryItem.client_event_id, retryItem);
    harness.items.set(deleteItem.client_event_id, deleteItem);
    harness.items.set(undoItem.client_event_id, undoItem);
    const timelineKey = queryKeys.events.timeline(retryItem.household_id, retryItem.puppy_id);
    const cachedRows = [
      createServerRow(retryItem),
      createServerRow(deleteItem),
      createServerRow(undoItem),
    ];
    queryClient.setQueryData(timelineKey, cachedRows);
    mockInsertEvent.mockResolvedValue(createServerRow(retryItem));

    const globalSnackbar = {
      dismissSnackbar: jest.fn(),
      replaceSnackbar: jest.fn(),
      showSnackbar: jest.fn(),
    };
    createQuickLogFeedbackController({ snackbar: globalSnackbar }).applyMutationEvents({
      careContext: {
        authState: 'authenticated',
        householdId: retryItem.household_id,
        householdRole: 'owner',
        puppyId: retryItem.puppy_id,
        todayDate: '2026-07-17',
      },
      mutation: actorAPort,
      mutationEvents: [{
        clientEventId: retryItem.client_event_id,
        eventType: retryItem.event_type,
        requestId: 'req_actor_unmount_retry',
        state: 'failed_retryable',
        trackerId: 'feeding',
        type: 'failed',
      }],
    });
    const retainedGlobalRetry = globalSnackbar.replaceSnackbar.mock.calls[0]?.[0]
      ?.onPrimaryAction;
    if (retainedGlobalRetry === undefined) {
      throw new Error('Expected retained global Retry callback');
    }

    const queueRead = jest.spyOn(storage, 'getByClientEventId');
    const legacyManualRetry = jest.spyOn(storage, 'manualRetry');
    const markDeletedBeforeSync = jest.spyOn(storage, 'markDeletedBeforeSync');
    const cacheCancel = jest.spyOn(queryClient, 'cancelQueries');
    const cacheReplay = jest.spyOn(queryClient, 'setQueriesData');
    const cacheWrite = jest.spyOn(queryClient, 'setQueryData');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const retainedItemsBefore = [...harness.items.entries()];

    hook.unmount();
    // Deliberately no auth rerender: only the unmount cleanup can invalidate the captured refs.
    mockAuthState.current = {
      status: 'signedIn',
      user: { id: mockSecondaryActorId },
    };
    queueRead.mockClear();
    legacyManualRetry.mockClear();
    manualRetryIfOwned.mockClear();
    markDeletedBeforeSync.mockClear();
    harness.remove.mockClear();
    updateDetails.mockClear();
    cacheCancel.mockClear();
    cacheReplay.mockClear();
    cacheWrite.mockClear();
    invalidate.mockClear();
    mockInsertEvent.mockClear();
    mockTombstoneByClientEventId.mockClear();
    mockUpdatePayloadByClientEventId.mockClear();
    mockTrackQuickLogEvent.mockClear();
    mockCaptureException.mockClear();

    retainedGlobalRetry();
    actorAPort.deleteLocal(deleteItem.client_event_id);
    actorAPort.undo({
      clientEventId: undoItem.client_event_id,
      eventType: undoItem.event_type,
      householdId: undoItem.household_id,
      puppyId: undoItem.puppy_id,
      todayDate: '2026-07-17',
    });
    const staleDetailsOutcome = actorAPort.updateDetails({
      clientEventId: retryItem.client_event_id,
      draft: { amount: 'snack', trackerId: 'feeding' },
      eventType: retryItem.event_type,
      householdId: retryItem.household_id,
      puppyId: retryItem.puppy_id,
      todayDate: '2026-07-17',
    }).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );
    await act(async () => {
      await flushHostMicrotasks();
      await flushHostMicrotasks();
    });

    expect({
      actorAwareRetryCalls: manualRetryIfOwned.mock.calls.length,
      cacheCancelCalls: cacheCancel.mock.calls.length,
      cacheReplayCalls: cacheReplay.mock.calls.length,
      cacheWriteCalls: cacheWrite.mock.calls.length,
      cachedRows: queryClient.getQueryData(timelineKey),
      insertCalls: mockInsertEvent.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      legacyRetryCalls: legacyManualRetry.mock.calls.length,
      localTransitionCalls: markDeletedBeforeSync.mock.calls.length,
      queueReads: queueRead.mock.calls.length,
      removeCalls: harness.remove.mock.calls.length,
      retainedItems: [...harness.items.entries()],
      staleDetailsOutcome: await staleDetailsOutcome,
      tombstoneCalls: mockTombstoneByClientEventId.mock.calls.length,
      trackCalls: mockTrackQuickLogEvent.mock.calls.length,
      updateDetailsCalls: updateDetails.mock.calls.length,
      updateNetworkCalls: mockUpdatePayloadByClientEventId.mock.calls.length,
    }).toEqual({
      actorAwareRetryCalls: 0,
      cacheCancelCalls: 0,
      cacheReplayCalls: 0,
      cacheWriteCalls: 0,
      cachedRows,
      insertCalls: 0,
      invalidationCalls: 0,
      legacyRetryCalls: 0,
      localTransitionCalls: 0,
      queueReads: 0,
      removeCalls: 0,
      retainedItems: retainedItemsBefore,
      staleDetailsOutcome: { error: expect.any(Error), status: 'rejected' },
      tombstoneCalls: 0,
      trackCalls: 0,
      updateDetailsCalls: 0,
      updateNetworkCalls: 0,
    });
    expect(mockCaptureException.mock.calls.map(([, context]) => context.operation).sort())
      .toEqual([
        'local_action_failed',
        'local_action_failed',
        'manual_retry_actor_mismatch',
      ]);
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(
      retryItem.client_event_id,
    );
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(
      deleteItem.client_event_id,
    );
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(
      undoItem.client_event_id,
    );

    queryClient.clear();
  });

  it.each([
    'createDetailed',
    'createDetailedDurably',
    'mutate',
  ] as const)(
    'AC-P3-ACTOR-8 rejects retained actor-A %s after A-to-B before SQLite, cache, network, analytics, or invalidation',
    async (method) => {
      const harness = createRecoveryQueueHarness([], { claimEnabled: false });
      mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
      mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
      const queryClient = createTestQueryClient();
      const hook = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(queryClient),
      });

      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      const actorAPort = hook.result.current.mutation;
      if (actorAPort === undefined) throw new Error('Expected actor A mutation port');

      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
      await waitFor(() => {
        expect(hook.result.current.status).toBe('ready');
        expect(hook.result.current.mutation).not.toBe(actorAPort);
      });

      const variables = createPortObservationVariables(
        method === 'createDetailed'
          ? 'evt_00000000-0000-4000-8000-000000000351'
          : method === 'createDetailedDurably'
            ? 'evt_00000000-0000-4000-8000-000000000352'
            : 'evt_00000000-0000-4000-8000-000000000353',
      );
      const enqueue = jest.spyOn(harness.storage, 'enqueue');
      const queueRead = jest.spyOn(harness.storage, 'getByClientEventId');
      const markSending = jest.spyOn(harness.storage, 'markSending');
      const cacheCancel = jest.spyOn(queryClient, 'cancelQueries');
      const cacheWrite = jest.spyOn(queryClient, 'setQueryData');
      const cacheReplay = jest.spyOn(queryClient, 'setQueriesData');
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      enqueue.mockClear();
      queueRead.mockClear();
      markSending.mockClear();
      cacheCancel.mockClear();
      cacheWrite.mockClear();
      cacheReplay.mockClear();
      invalidate.mockClear();
      mockInsertEvent.mockClear();
      mockTrackQuickLogEvent.mockClear();

      let outcome: Readonly<{ error?: unknown; status: 'rejected' | 'resolved' | 'returned' }>;
      if (method === 'mutate') {
        actorAPort.mutate({ requestId: 'req_actor8_stale_create', variables });
        await act(async () => {
          await flushHostMicrotasks();
          await flushHostMicrotasks();
        });
        outcome = { status: 'returned' };
      } else {
        const creating = actorAPort[method];
        if (creating === undefined) throw new Error(`Expected ${method} port method`);
        let createdOutcome: typeof outcome | undefined;
        await act(async () => {
          createdOutcome = await creating(variables).then(
            () => ({ status: 'resolved' as const }),
            (error: unknown) => ({ error, status: 'rejected' as const }),
          );
        });
        if (createdOutcome === undefined) throw new Error(`Expected ${method} outcome`);
        outcome = createdOutcome;
      }

      expect({
        cacheCancelCalls: cacheCancel.mock.calls.length,
        cacheReplayCalls: cacheReplay.mock.calls.length,
        cacheWriteCalls: cacheWrite.mock.calls.length,
        enqueueCalls: enqueue.mock.calls.length,
        insertCalls: mockInsertEvent.mock.calls.length,
        invalidationCalls: invalidate.mock.calls.length,
        markSendingCalls: markSending.mock.calls.length,
        outcome,
        queueReads: queueRead.mock.calls.length,
        retainedItems: [...harness.items.values()],
        trackCalls: mockTrackQuickLogEvent.mock.calls.length,
      }).toEqual({
        cacheCancelCalls: 0,
        cacheReplayCalls: 0,
        cacheWriteCalls: 0,
        enqueueCalls: 0,
        insertCalls: 0,
        invalidationCalls: 0,
        markSendingCalls: 0,
        outcome: method === 'mutate'
          ? { status: 'returned' }
          : { error: expect.any(Error), status: 'rejected' },
        queueReads: 0,
        retainedItems: [],
        trackCalls: 0,
      });

      hook.unmount();
      queryClient.clear();
    },
  );

  it('AC-P3-ACTOR-8 stops create after an actor switch during awaited durable enqueue before analytics, send, or invalidation', async () => {
    const actorBHydrationGate = createDeferred();
    const harness = createRecoveryQueueHarness([], {
      claimEnabled: false,
      listGate: { call: 2, promise: actorBHydrationGate.promise },
    });
    const enqueueGate = createSignaledDeferred();
    const originalEnqueue = harness.storage.enqueue.bind(harness.storage);
    const enqueue = jest.spyOn(harness.storage, 'enqueue');
    enqueue.mockImplementationOnce(async (...args) => {
      enqueueGate.signal();
      await enqueueGate.promise;
      return originalEnqueue(...args);
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort?.createDetailed === undefined) {
      throw new Error('Expected actor A detailed create port');
    }
    const variables = createPortObservationVariables(
      'evt_00000000-0000-4000-8000-000000000361',
    );
    const markSending = jest.spyOn(harness.storage, 'markSending');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    invalidate.mockClear();
    mockTrackQuickLogEvent.mockClear();

    let creating: Promise<
      Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>
    > | undefined;
    await act(async () => {
      creating = actorAPort.createDetailed?.(variables).then(
        () => ({ status: 'resolved' as const }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );
      await enqueueGate.signaled;
    });
    if (creating === undefined) throw new Error('Expected detailed create outcome');
    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    expect(hook.result.current.mutation).not.toBe(actorAPort);
    invalidate.mockClear();
    let outcome: Awaited<typeof creating> | undefined;
    await act(async () => {
      enqueueGate.resolve();
      outcome = await creating;
    });
    if (outcome === undefined) throw new Error('Expected detailed create outcome');

    expect({
      insertCalls: mockInsertEvent.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      markSendingCalls: markSending.mock.calls.length,
      outcome,
      retainedItem: harness.items.get(variables.clientEventId ?? ''),
      trackCalls: mockTrackQuickLogEvent.mock.calls.length,
    }).toEqual({
      insertCalls: 0,
      invalidationCalls: 0,
      markSendingCalls: 0,
      outcome: { error: expect.any(Error), status: 'rejected' },
      retainedItem: expect.objectContaining({
        created_by: mockPrimaryActorId,
        state: 'pending_local',
      }),
      trackCalls: 0,
    });
    expect(getActorLocalRows(
      queryClient,
      queryKeys.events.timelineRoot(variables.householdId, variables.puppyId),
      mockPrimaryActorId,
    )).toEqual([]);

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 rechecks durable create ownership after its awaited retained-row read', async () => {
    const permanentFailure = { kind: 'permission_denied', retryAfterMs: null };
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    let readCount = 0;
    const durableReadGate = createSignaledDeferred();
    const originalRead = harness.storage.getByClientEventId.bind(harness.storage);
    const queueRead = jest.spyOn(harness.storage, 'getByClientEventId');
    queueRead.mockImplementation(async (clientEventId) => {
      readCount += 1;
      if (readCount === 3) {
        durableReadGate.signal();
        await durableReadGate.promise;
      }
      return originalRead(clientEventId);
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockInsertEvent.mockRejectedValue(permanentFailure);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort?.createDetailedDurably === undefined) {
      throw new Error('Expected actor A durable create port');
    }
    const variables = createPortObservationVariables(
      'evt_00000000-0000-4000-8000-000000000362',
    );
    const creating = actorAPort.createDetailedDurably(variables).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );
    await durableReadGate.signaled;

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.mutation).not.toBe(actorAPort));
    harness.remove.mockClear();
    durableReadGate.resolve();

    await expect(creating).resolves.toEqual({
      error: expect.any(Error),
      status: 'rejected',
    });
    expect({
      queueReads: queueRead.mock.calls.length,
      removeCalls: harness.remove.mock.calls.length,
      retainedItem: harness.items.get(variables.clientEventId ?? ''),
    }).toEqual({
      queueReads: 3,
      removeCalls: 0,
      retainedItem: expect.objectContaining({
        created_by: mockPrimaryActorId,
        state: 'failed_permanent',
      }),
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 rejects retained actor-A updateDetails after A-to-B before reading or changing private local state', async () => {
    const privateMarker = 'synthetic-actor8-stale-detail-marker';
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000363',
      event_type: 'observation',
      payload_version: 2,
      payload: { note: privateMarker, title: 'Synthetic retained title' },
    });
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const updateDetails = createHarnessDetailUpdater(harness);
    const storage: QuickLogQueueStorage = { ...harness.storage, updateDetails };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');
    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.mutation).not.toBe(actorAPort));

    harness.items.set(item.client_event_id, item);
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    const cachedRows = [createServerRow(item)];
    queryClient.setQueryData(timelineKey, cachedRows);
    const queueRead = jest.spyOn(storage, 'getByClientEventId');
    const cacheWrite = jest.spyOn(queryClient, 'setQueriesData');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    queueRead.mockClear();
    updateDetails.mockClear();
    cacheWrite.mockClear();
    invalidate.mockClear();
    mockUpdatePayloadByClientEventId.mockClear();
    mockCaptureException.mockClear();

    const outcome = await actorAPort.updateDetails(createObservationDetailRequest(item, {
      note: 'Synthetic unauthorized note',
      title: 'Synthetic unauthorized title',
    })).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      cacheWriteCalls: cacheWrite.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      networkCalls: mockUpdatePayloadByClientEventId.mock.calls.length,
      outcome,
      queueReads: queueRead.mock.calls.length,
      retainedItem: harness.items.get(item.client_event_id),
      updateCalls: updateDetails.mock.calls.length,
    }).toEqual({
      cachedRows,
      cacheWriteCalls: 0,
      invalidationCalls: 0,
      networkCalls: 0,
      outcome: { error: expect.any(Error), status: 'rejected' },
      queueReads: 0,
      retainedItem: item,
      updateCalls: 0,
    });
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ area: 'quick_log_queue', operation: expect.any(String) }),
    );
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(privateMarker);
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(item.client_event_id);

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 rejects stable actor-B updateDetails for actor-A local state without adoption or fallback network write', async () => {
    const privateMarker = 'synthetic-actor8-foreign-detail-marker';
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000364',
      event_type: 'observation',
      payload_version: 2,
      payload: { note: privateMarker, title: 'Synthetic retained title' },
    });
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const updateDetails = createHarnessDetailUpdater(harness);
    const storage: QuickLogQueueStorage = { ...harness.storage, updateDetails };
    mockAuthState.current = {
      status: 'signedIn',
      user: { id: mockSecondaryActorId },
    };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorBPort = hook.result.current.mutation;
    if (actorBPort === undefined) throw new Error('Expected actor B mutation port');
    harness.items.set(item.client_event_id, item);
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    const cachedRows = [createServerRow(item)];
    queryClient.setQueryData(timelineKey, cachedRows);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    invalidate.mockClear();
    mockUpdatePayloadByClientEventId.mockClear();
    mockCaptureException.mockClear();

    const outcome = await actorBPort.updateDetails(createObservationDetailRequest(item, {
      note: 'Synthetic unauthorized note',
      title: 'Synthetic unauthorized title',
    })).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      invalidationCalls: invalidate.mock.calls.length,
      networkCalls: mockUpdatePayloadByClientEventId.mock.calls.length,
      outcome,
      retainedItem: harness.items.get(item.client_event_id),
      updateCalls: updateDetails.mock.calls.length,
    }).toEqual({
      cachedRows,
      invalidationCalls: 0,
      networkCalls: 0,
      outcome: { error: expect.any(Error), status: 'rejected' },
      retainedItem: item,
      updateCalls: 0,
    });
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ area: 'quick_log_queue', operation: expect.any(String) }),
    );
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(privateMarker);
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(item.client_event_id);

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 rechecks actor identity after awaited updateDetails local read before write, cache, network, or invalidation', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000365',
      event_type: 'observation',
      payload_version: 2,
      payload: { note: 'Synthetic retained note', title: 'Synthetic retained title' },
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const updateDetails = createHarnessDetailUpdater(harness);
    const readGate = createSignaledDeferred();
    const originalRead = harness.storage.getByClientEventId.bind(harness.storage);
    const getByClientEventId = jest.fn(async (clientEventId: string) => {
      readGate.signal();
      await readGate.promise;
      return originalRead(clientEventId);
    });
    const storage: QuickLogQueueStorage = {
      ...harness.storage,
      getByClientEventId,
      updateDetails,
    };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    const cachedRows = [createServerRow(item)];
    queryClient.setQueryData(timelineKey, cachedRows);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    invalidate.mockClear();
    const updating = actorAPort.updateDetails(createObservationDetailRequest(item, {
      note: 'Synthetic replacement note',
      title: 'Synthetic replacement title',
    })).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );
    await readGate.signaled;

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.mutation).not.toBe(actorAPort));
    invalidate.mockClear();
    readGate.resolve();
    const outcome = await updating;

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      invalidationCalls: invalidate.mock.calls.length,
      networkCalls: mockUpdatePayloadByClientEventId.mock.calls.length,
      outcome,
      retainedItem: harness.items.get(item.client_event_id),
      updateCalls: updateDetails.mock.calls.length,
    }).toEqual({
      // The auth transition itself synchronously scrubs actor-A local rows; the stale update
      // must not repopulate them for actor B after the awaited read resumes.
      cachedRows: [],
      invalidationCalls: 0,
      networkCalls: 0,
      outcome: { error: expect.any(Error), status: 'rejected' },
      retainedItem: item,
      updateCalls: 0,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 rechecks actor identity after awaited atomic updateDetails write before cache or invalidation', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000366',
      event_type: 'observation',
      payload_version: 2,
      payload: { note: 'Synthetic retained note', title: 'Synthetic retained title' },
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const writeGate = createSignaledDeferred();
    const updateDetails = createHarnessDetailUpdater(harness, writeGate);
    const storage: QuickLogQueueStorage = { ...harness.storage, updateDetails };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    const cachedRows = [createServerRow(item)];
    queryClient.setQueryData(timelineKey, cachedRows);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    invalidate.mockClear();
    const updating = actorAPort.updateDetails(createObservationDetailRequest(item, {
      note: 'Synthetic replacement note',
      title: 'Synthetic replacement title',
    })).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );
    await writeGate.signaled;

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.mutation).not.toBe(actorAPort));
    invalidate.mockClear();
    writeGate.resolve();
    const outcome = await updating;

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      invalidationCalls: invalidate.mock.calls.length,
      networkCalls: mockUpdatePayloadByClientEventId.mock.calls.length,
      outcome,
      retainedItem: harness.items.get(item.client_event_id),
      updateCalls: updateDetails.mock.calls.length,
    }).toEqual({
      // The auth transition itself synchronously scrubs actor-A local rows; the stale update
      // must not repopulate them for actor B after the awaited write resumes.
      cachedRows: [],
      invalidationCalls: 0,
      networkCalls: 0,
      outcome: { error: expect.any(Error), status: 'rejected' },
      retainedItem: item,
      updateCalls: 1,
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 rechecks actor identity after awaited remote detail write before cache or invalidation', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000367',
      event_type: 'observation',
      payload_version: 2,
      payload: { note: 'Synthetic durable note', title: 'Synthetic durable title' },
    });
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const networkGate = createSignaledDeferred();
    mockUpdatePayloadByClientEventId.mockImplementationOnce(async () => {
      networkGate.signal();
      await networkGate.promise;
      return createServerRow(item);
    });
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    const cachedRows = [createServerRow(item)];
    queryClient.setQueryData(timelineKey, cachedRows);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');
    const cacheWrite = jest.spyOn(queryClient, 'setQueriesData');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    cacheWrite.mockClear();
    invalidate.mockClear();
    const updating = actorAPort.updateDetails(createObservationDetailRequest(item, {
      note: 'Synthetic remote replacement note',
      title: 'Synthetic remote replacement title',
    })).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );
    await networkGate.signaled;

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.mutation).not.toBe(actorAPort));
    cacheWrite.mockClear();
    invalidate.mockClear();
    networkGate.resolve();
    const outcome = await updating;

    expect({
      cachedRows: queryClient.getQueryData(timelineKey),
      cacheWriteCalls: cacheWrite.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      networkCalls: mockUpdatePayloadByClientEventId.mock.calls.length,
      outcome,
    }).toEqual({
      cachedRows,
      cacheWriteCalls: 0,
      invalidationCalls: 0,
      networkCalls: 1,
      outcome: { error: expect.any(Error), status: 'rejected' },
    });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 preserves stable same-actor local detail updates and binds the atomic owner check', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000368',
      event_type: 'observation',
      payload_version: 2,
      payload: { note: 'Synthetic original note', title: 'Synthetic original title' },
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const updateDetails = createHarnessDetailUpdater(harness);
    const storage: QuickLogQueueStorage = { ...harness.storage, updateDetails };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [createServerRow(item)]);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const mutation = hook.result.current.mutation;
    if (mutation === undefined) throw new Error('Expected stable actor mutation port');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    invalidate.mockClear();
    const replacement = {
      note: 'Synthetic revised note',
      title: 'Synthetic revised title',
    };

    await expect(mutation.updateDetails(
      createObservationDetailRequest(item, replacement),
    )).resolves.toBeUndefined();

    expect(updateDetails).toHaveBeenCalledWith(item.client_event_id, {
      expectedCreatedBy: mockPrimaryActorId,
      isActorCurrent: expect.any(Function),
      now: expect.any(String),
      occurredAt: item.occurred_at,
      payload: replacement,
      payloadVersion: 2,
    });
    expect(harness.items.get(item.client_event_id)).toMatchObject({
      created_by: mockPrimaryActorId,
      payload: replacement,
      payload_version: 2,
      state: 'pending_local',
    });
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey)?.[0]).toMatchObject({
      client_event_id: item.client_event_id,
      created_by: mockPrimaryActorId,
      payload: replacement,
      payload_version: 2,
    });
    expect(mockUpdatePayloadByClientEventId).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalled();

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 keeps all create write methods inert when their captured port was unmounted', async () => {
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const port = hook.result.current.mutation;
    if (port?.createDetailed === undefined || port.createDetailedDurably === undefined) {
      throw new Error('Expected complete detailed-create port');
    }
    hook.unmount();
    const enqueue = jest.spyOn(harness.storage, 'enqueue');
    const queueRead = jest.spyOn(harness.storage, 'getByClientEventId');
    const cacheWrite = jest.spyOn(queryClient, 'setQueryData');
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    enqueue.mockClear();
    queueRead.mockClear();
    cacheWrite.mockClear();
    invalidate.mockClear();
    mockInsertEvent.mockClear();
    mockTrackQuickLogEvent.mockClear();
    const direct = port.createDetailed(createPortObservationVariables(
      'evt_00000000-0000-4000-8000-000000000369',
    )).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );
    const durable = port.createDetailedDurably(createPortObservationVariables(
      'evt_00000000-0000-4000-8000-000000000370',
    )).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );
    port.mutate({
      requestId: 'req_actor8_unmounted_mutate',
      variables: createPortObservationVariables(
        'evt_00000000-0000-4000-8000-000000000371',
      ),
    });
    await act(async () => {
      await flushHostMicrotasks();
      await flushHostMicrotasks();
    });

    await expect(Promise.all([direct, durable])).resolves.toEqual([
      { error: expect.any(Error), status: 'rejected' },
      { error: expect.any(Error), status: 'rejected' },
    ]);
    expect({
      cacheWriteCalls: cacheWrite.mock.calls.length,
      enqueueCalls: enqueue.mock.calls.length,
      insertCalls: mockInsertEvent.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      queueReads: queueRead.mock.calls.length,
      retainedItems: [...harness.items.values()],
      trackCalls: mockTrackQuickLogEvent.mock.calls.length,
    }).toEqual({
      cacheWriteCalls: 0,
      enqueueCalls: 0,
      insertCalls: 0,
      invalidationCalls: 0,
      queueReads: 0,
      retainedItems: [],
      trackCalls: 0,
    });

    queryClient.clear();
  });

  it.each([
    'createDetailed',
    'createDetailedDurably',
    'mutate',
  ] as const)(
    'AC-P3-ACTOR-8 never revives an old actor-A %s port after A-to-B-to-A while the new A port works',
    async (method) => {
      const harness = createRecoveryQueueHarness([], { claimEnabled: false });
      mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
      mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
      const queryClient = createTestQueryClient();
      const hook = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(queryClient),
      });

      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      const oldActorAPort = hook.result.current.mutation;
      if (oldActorAPort === undefined) throw new Error('Expected original actor A port');
      act(() => {
        mockAuthState.current = { status: 'signedIn', user: { id: mockSecondaryActorId } };
        hook.rerender(undefined);
      });
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      act(() => {
        mockAuthState.current = { status: 'signedIn', user: { id: mockPrimaryActorId } };
        hook.rerender(undefined);
      });
      await waitFor(() => {
        expect(hook.result.current.status).toBe('ready');
        expect(hook.result.current.mutation).not.toBe(oldActorAPort);
      });
      const newActorAPort = hook.result.current.mutation;
      if (newActorAPort === undefined) throw new Error('Expected replacement actor A port');

      const variables = createPortObservationVariables(
        method === 'createDetailed'
          ? 'evt_00000000-0000-4000-8000-000000000385'
          : method === 'createDetailedDurably'
            ? 'evt_00000000-0000-4000-8000-000000000386'
            : 'evt_00000000-0000-4000-8000-000000000387',
      );
      const enqueue = jest.spyOn(harness.storage, 'enqueue');
      const queueRead = jest.spyOn(harness.storage, 'getByClientEventId');
      const markSending = jest.spyOn(harness.storage, 'markSending');
      const cacheWrite = jest.spyOn(queryClient, 'setQueryData');
      const cacheReplay = jest.spyOn(queryClient, 'setQueriesData');
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      enqueue.mockClear();
      queueRead.mockClear();
      markSending.mockClear();
      cacheWrite.mockClear();
      cacheReplay.mockClear();
      invalidate.mockClear();
      mockInsertEvent.mockClear();
      mockTrackQuickLogEvent.mockClear();

      let oldOutcome: Readonly<{ error?: unknown; status: 'rejected' | 'resolved' | 'returned' }>;
      if (method === 'mutate') {
        oldActorAPort.mutate({ requestId: 'req_actor8_old_epoch', variables });
        await act(async () => {
          await flushHostMicrotasks();
          await flushHostMicrotasks();
        });
        oldOutcome = { status: 'returned' };
      } else {
        const create = oldActorAPort[method];
        if (create === undefined) throw new Error(`Expected old ${method}`);
        oldOutcome = await create(variables).then(
          () => ({ status: 'resolved' as const }),
          (error: unknown) => ({ error, status: 'rejected' as const }),
        );
      }
      const oldEffects = {
        cacheReplayCalls: cacheReplay.mock.calls.length,
        cacheWriteCalls: cacheWrite.mock.calls.length,
        enqueueCalls: enqueue.mock.calls.length,
        insertCalls: mockInsertEvent.mock.calls.length,
        invalidationCalls: invalidate.mock.calls.length,
        markSendingCalls: markSending.mock.calls.length,
        outcome: oldOutcome,
        queueReads: queueRead.mock.calls.length,
        retainedItems: [...harness.items.values()],
        trackCalls: mockTrackQuickLogEvent.mock.calls.length,
      };

      mockInsertEvent.mockClear();
      if (method === 'mutate') {
        act(() => {
          newActorAPort.mutate({ requestId: 'req_actor8_new_epoch', variables });
        });
        await waitFor(() => expect(mockInsertEvent).toHaveBeenCalledTimes(1));
      } else {
        const create = newActorAPort[method];
        if (create === undefined) throw new Error(`Expected new ${method}`);
        await expect(create(variables)).resolves.toEqual(
          method === 'createDetailed'
            ? expect.objectContaining({ created_by: mockPrimaryActorId })
            : undefined,
        );
      }
      const newPortInsertCalls = mockInsertEvent.mock.calls.length;

      hook.unmount();
      queryClient.clear();

      expect(oldEffects).toEqual({
        cacheReplayCalls: 0,
        cacheWriteCalls: 0,
        enqueueCalls: 0,
        insertCalls: 0,
        invalidationCalls: 0,
        markSendingCalls: 0,
        outcome: method === 'mutate'
          ? { status: 'returned' }
          : { error: expect.any(Error), status: 'rejected' },
        queueReads: 0,
        retainedItems: [],
        trackCalls: 0,
      });
      expect(newPortInsertCalls).toBe(1);
    },
  );

  it('AC-P3-ACTOR-8 never revives old actor-A updateDetails after A-to-B-to-A while the new A port works', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000388',
      event_type: 'observation',
      payload_version: 2,
      payload: { note: 'private original', title: 'private original title' },
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const updateDetails = createHarnessDetailUpdater(harness);
    const storage: QuickLogQueueStorage = { ...harness.storage, updateDetails };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const oldActorAPort = hook.result.current.mutation;
    if (oldActorAPort === undefined) throw new Error('Expected original actor A port');
    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockSecondaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockPrimaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const newActorAPort = hook.result.current.mutation;
    if (newActorAPort === undefined || newActorAPort === oldActorAPort) {
      throw new Error('Expected replacement actor A port');
    }
    const oldRequest = createObservationDetailRequest(item, {
      note: 'private stale edit',
      title: 'private stale title',
    });
    const newRequest = createObservationDetailRequest(item, {
      note: 'private current edit',
      title: 'private current title',
    });
    const before = harness.items.get(item.client_event_id);
    updateDetails.mockClear();
    const oldOutcome = await oldActorAPort.updateDetails(oldRequest).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );
    const afterOld = harness.items.get(item.client_event_id);
    const oldUpdateCalls = updateDetails.mock.calls.length;
    updateDetails.mockClear();
    await expect(newActorAPort.updateDetails(newRequest)).resolves.toBeUndefined();
    const afterNew = harness.items.get(item.client_event_id);

    hook.unmount();
    queryClient.clear();

    expect({ afterOld, oldOutcome, oldUpdateCalls }).toEqual({
      afterOld: before,
      oldOutcome: { error: expect.any(Error), status: 'rejected' },
      oldUpdateCalls: 0,
    });
    expect(afterNew).toEqual(expect.objectContaining({
      payload: expect.objectContaining({ note: 'private current edit' }),
    }));
  });

  it('AC-P3-ACTOR-8 keeps a same-actor retained port valid across a non-auth rerender', async () => {
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const retainedPort = hook.result.current.mutation;
    if (retainedPort?.createDetailed === undefined) throw new Error('Expected retained A port');
    act(() => hook.rerender(undefined));
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await expect(retainedPort.createDetailed(createPortObservationVariables(
      'evt_00000000-0000-4000-8000-000000000389',
    ))).resolves.toMatchObject({ created_by: mockPrimaryActorId });

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 keeps render-phase liveness mutation out of abandoned speculative trees', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/query/quick-log.ts'),
      'utf8',
    );

    expect(source.includes('useLayoutEffect')).toBe(true);
    expect(/if \(sessionEpochRef\.current\.actorId !== actorId\) \{[\s\S]*?sessionEpochRef\.current =/.test(source))
      .toBe(false);
    expect(/userIdRef\.current = actorId;\s*\n\s*use(?:Layout)?Effect/.test(source))
      .toBe(false);
  });

  it('AC-P3-ACTOR-8 invalidates committed liveness synchronously in layout cleanup', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/query/quick-log.ts'),
      'utf8',
    );
    const unmountInvalidation = /useLayoutEffect\(\(\) => \(\) => \{[\s\S]*?sessionEpochRef\.current = \{[\s\S]*?epoch:[\s\S]*?\+ 1,[\s\S]*?userIdRef\.current = null;/;

    expect(unmountInvalidation.test(source)).toBe(true);
  });

  it('AC-P3-ACTOR-8 commit lifecycle model preserves speculative A, invalidates committed transitions, and blocks immediate post-unmount work', () => {
    const lifecycle = createCommitLifecycleHarness();
    const committedA = lifecycle.commit(lifecycle.render(mockPrimaryActorId));
    const speculativeB = lifecycle.render(mockSecondaryActorId);

    expect(lifecycle.isCurrent(committedA)).toBe(true);
    expect(lifecycle.isCurrent(speculativeB)).toBe(false);

    const committedB = lifecycle.commit(speculativeB);
    expect(lifecycle.isCurrent(committedA)).toBe(false);
    expect(lifecycle.isCurrent(committedB)).toBe(true);
    const replacementA = lifecycle.commit(lifecycle.render(mockPrimaryActorId));
    expect(lifecycle.isCurrent(committedA)).toBe(false);
    expect(lifecycle.isCurrent(replacementA)).toBe(true);
    const sameActorCommit = lifecycle.commit(lifecycle.render(mockPrimaryActorId));
    expect(sameActorCommit.epoch).toBe(replacementA.epoch);

    lifecycle.unmount();
    const rootCallbackCouldWrite = lifecycle.isCurrent(sameActorCommit);
    expect(rootCallbackCouldWrite).toBe(false);
  });

  it('AC-P3-ACTOR-8 does not resume a paused actor-A create after A-to-B-to-A', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000390';
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const enqueueGate = createSignaledDeferred();
    const originalEnqueue = harness.storage.enqueue.bind(harness.storage);
    jest.spyOn(harness.storage, 'enqueue').mockImplementation(async (...args) => {
      const item = await originalEnqueue(...args);
      enqueueGate.signal();
      await enqueueGate.promise;
      return item;
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort?.createDetailed === undefined) throw new Error('Expected original A port');
    let outcomePromise: Promise<Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>> | undefined;
    await act(async () => {
      outcomePromise = actorAPort.createDetailed?.(
        createPortObservationVariables(clientEventId),
      ).then(
        () => ({ status: 'resolved' as const }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );
      await enqueueGate.signaled;
    });
    if (outcomePromise === undefined) throw new Error('Expected paused create result');
    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockSecondaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockPrimaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const beforeRelease = harness.items.get(clientEventId);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    invalidate.mockClear();
    mockInsertEvent.mockClear();
    mockTrackQuickLogEvent.mockClear();
    let outcome: Awaited<typeof outcomePromise> | undefined;
    await act(async () => {
      enqueueGate.resolve();
      outcome = await outcomePromise;
    });
    const afterRelease = harness.items.get(clientEventId);
    const effects = {
      insertCalls: mockInsertEvent.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      trackCalls: mockTrackQuickLogEvent.mock.calls.length,
    };

    hook.unmount();
    queryClient.clear();

    expect(outcome).toEqual({ error: expect.any(Error), status: 'rejected' });
    expect(afterRelease).toEqual(beforeRelease);
    expect(effects).toEqual({ insertCalls: 0, invalidationCalls: 0, trackCalls: 0 });
  });

  it('AC-P3-ACTOR-8 isolates actor-A createDetailed from actor B reusing the same caller variables object', async () => {
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const firstEnqueueGate = createSignaledDeferred();
    const enqueuedItems: QuickLogStoredQueueItem[] = [];
    const originalEnqueue = harness.storage.enqueue.bind(harness.storage);
    const enqueue = jest.spyOn(harness.storage, 'enqueue');
    enqueue.mockImplementation(async (...args) => {
      const item = await originalEnqueue(...args);
      enqueuedItems.push(item);
      if (enqueuedItems.length === 1) {
        firstEnqueueGate.signal();
        await firstEnqueueGate.promise;
      }
      return item;
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const sharedVariables = createObservationVariables();

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort?.createDetailed === undefined) throw new Error('Expected actor A create port');
    let actorAResult: Promise<Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>> | undefined;
    await act(async () => {
      actorAResult = actorAPort.createDetailed?.(sharedVariables).then(
        () => ({ status: 'resolved' as const }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );
      await firstEnqueueGate.signaled;
    });
    if (actorAResult === undefined) throw new Error('Expected actor A create result');

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorBPort = hook.result.current.mutation;
    if (actorBPort?.createDetailed === undefined) throw new Error('Expected actor B create port');
    await act(async () => {
      await expect(actorBPort.createDetailed?.(sharedVariables)).resolves.toMatchObject({
        created_by: mockSecondaryActorId,
      });
    });
    let actorAOutcome:
      | Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>
      | undefined;
    await act(async () => {
      firstEnqueueGate.resolve();
      actorAOutcome = await actorAResult;
    });
    const actorAItem = enqueuedItems.find((item) => item.created_by === mockPrimaryActorId);

    expect(actorAItem).toBeDefined();
    expect(actorAOutcome).toEqual({ error: expect.any(Error), status: 'rejected' });
    expect(mockInsertEvent.mock.calls.map(([insert]) => insert.created_by)).toEqual([
      mockSecondaryActorId,
    ]);
    expect(harness.items.get(actorAItem?.client_event_id ?? '')).toEqual(
      expect.objectContaining({
        created_by: mockPrimaryActorId,
        state: expect.stringMatching(/^(pending_local|failed_retryable)$/),
      }),
    );
    expect(getActorLocalRows(
      queryClient,
      queryKeys.events.timelineRoot(
        sharedVariables.householdId,
        sharedVariables.puppyId,
      ),
      mockPrimaryActorId,
    )).toEqual([]);

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 isolates actor-A mutate from actor B reusing the same caller variables object', async () => {
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const firstEnqueueGate = createSignaledDeferred();
    const enqueuedItems: QuickLogStoredQueueItem[] = [];
    const originalEnqueue = harness.storage.enqueue.bind(harness.storage);
    jest.spyOn(harness.storage, 'enqueue').mockImplementation(async (...args) => {
      const item = await originalEnqueue(...args);
      enqueuedItems.push(item);
      if (enqueuedItems.length === 1) {
        firstEnqueueGate.signal();
        await firstEnqueueGate.promise;
      }
      return item;
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const sharedVariables = createObservationVariables();

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort === undefined) throw new Error('Expected actor A mutation port');
    await act(async () => {
      actorAPort.mutate({ requestId: 'req_actor8_shared_a', variables: sharedVariables });
      await firstEnqueueGate.signaled;
    });

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorBPort = hook.result.current.mutation;
    if (actorBPort === undefined) throw new Error('Expected actor B mutation port');
    act(() => {
      actorBPort.mutate({ requestId: 'req_actor8_shared_b', variables: sharedVariables });
    });
    await waitFor(() => expect(mockInsertEvent).toHaveBeenCalledTimes(1));
    await act(async () => {
      firstEnqueueGate.resolve();
      await flushHostMicrotasks();
      await flushHostMicrotasks();
    });
    const actorAItem = enqueuedItems.find((item) => item.created_by === mockPrimaryActorId);

    expect(actorAItem).toBeDefined();
    expect(mockInsertEvent.mock.calls.map(([insert]) => insert.created_by)).toEqual([
      mockSecondaryActorId,
    ]);
    expect(harness.items.get(actorAItem?.client_event_id ?? '')).toEqual(
      expect.objectContaining({
        created_by: mockPrimaryActorId,
        state: expect.stringMatching(/^(pending_local|failed_retryable)$/),
      }),
    );

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 keeps the second same-actor create guarded after the first shared-object call settles', async () => {
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const secondEnqueueGate = createSignaledDeferred();
    const firstInsertGate = createSignaledDeferred();
    const enqueuedItems: QuickLogStoredQueueItem[] = [];
    const originalEnqueue = harness.storage.enqueue.bind(harness.storage);
    jest.spyOn(harness.storage, 'enqueue').mockImplementation(async (...args) => {
      const item = await originalEnqueue(...args);
      enqueuedItems.push(item);
      if (enqueuedItems.length === 2) {
        secondEnqueueGate.signal();
        await secondEnqueueGate.promise;
      }
      return item;
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockInsertEvent.mockImplementation(async (insert) => {
      if (mockInsertEvent.mock.calls.length === 1) {
        firstInsertGate.signal();
        await firstInsertGate.promise;
      }
      return createServerRowFromInsert(insert);
    });
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const sharedVariables = createObservationVariables();

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const port = hook.result.current.mutation;
    if (port?.createDetailed === undefined) throw new Error('Expected create port');
    let first: Promise<unknown> | undefined;
    let second:
      | Promise<Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>>
      | undefined;
    await act(async () => {
      first = port.createDetailed?.(sharedVariables);
      await firstInsertGate.signaled;
      second = port.createDetailed?.(sharedVariables).then(
        () => ({ status: 'resolved' as const }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );
      await secondEnqueueGate.signaled;
      firstInsertGate.resolve();
      await expect(first).resolves.toMatchObject({ created_by: mockPrimaryActorId });
    });
    if (second === undefined) throw new Error('Expected second create result');

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      hook.rerender(undefined);
    });
    let secondOutcome:
      | Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>
      | undefined;
    await act(async () => {
      secondEnqueueGate.resolve();
      secondOutcome = await second;
    });
    const secondItem = enqueuedItems[1];

    expect(secondOutcome).toEqual({ error: expect.any(Error), status: 'rejected' });
    expect(mockInsertEvent).toHaveBeenCalledTimes(1);
    expect(harness.items.get(secondItem?.client_event_id ?? '')).toEqual(
      expect.objectContaining({
        created_by: mockPrimaryActorId,
        state: expect.stringMatching(/^(pending_local|failed_retryable)$/),
      }),
    );

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 keeps fresh create clones and durable internal clones independent', async () => {
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const removeIfState = createHarnessAtomicRemoveIfState(harness);
    const storage: QuickLogQueueStorage = { ...harness.storage, removeIfState };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const callerVariables = createObservationVariables();

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const port = hook.result.current.mutation;
    if (port?.createDetailed === undefined || port.createDetailedDurably === undefined) {
      throw new Error('Expected complete create port');
    }
    await act(async () => {
      await Promise.all([
        port.createDetailed?.({ ...callerVariables }),
        port.createDetailed?.({ ...callerVariables }),
        port.createDetailedDurably?.(callerVariables),
        port.createDetailedDurably?.(callerVariables),
      ]);
    });

    const inserts = mockInsertEvent.mock.calls.map(([insert]) => insert);
    expect(inserts).toHaveLength(4);
    expect(new Set(inserts.map((insert) => insert.client_event_id)).size).toBe(4);
    expect(inserts.map((insert) => insert.created_by)).toEqual([
      mockPrimaryActorId,
      mockPrimaryActorId,
      mockPrimaryActorId,
      mockPrimaryActorId,
    ]);
    expect(harness.items.size).toBe(0);
    expect(removeIfState).toHaveBeenCalledTimes(4);

    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-8 recovers actor-A sending state when auth switches during markSending', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000381';
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const markFailedRetryableIfOwned = createHarnessAtomicRetryIfOwned(harness);
    const markSendingGate = createSignaledDeferred();
    const originalMarkSending = harness.storage.markSending.bind(harness.storage);
    jest.spyOn(harness.storage, 'markSending').mockImplementation(async (...args) => {
      const item = await originalMarkSending(...args);
      markSendingGate.signal();
      await markSendingGate.promise;
      return item;
    });
    const storage: QuickLogQueueStorage = {
      ...harness.storage,
      markFailedRetryableIfOwned,
    };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort?.createDetailed === undefined) throw new Error('Expected actor A create port');
    let actorAResult: Promise<Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>> | undefined;
    await act(async () => {
      actorAResult = actorAPort.createDetailed?.(createPortObservationVariables(clientEventId)).then(
        () => ({ status: 'resolved' as const }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );
      await markSendingGate.signaled;
    });
    if (actorAResult === undefined) throw new Error('Expected actor A create result');

    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockSecondaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    invalidate.mockClear();
    mockTrackQuickLogEvent.mockClear();
    let actorAOutcome:
      | Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>
      | undefined;
    await act(async () => {
      markSendingGate.resolve();
      actorAOutcome = await actorAResult;
    });
    const retainedAfterSwitch = harness.items.get(clientEventId);
    const insertCalls = mockInsertEvent.mock.calls.length;
    const trackCalls = mockTrackQuickLogEvent.mock.calls.length;
    const invalidationCalls = invalidate.mock.calls.length;

    hook.unmount();
    queryClient.clear();

    expect(actorAOutcome).toEqual({ error: expect.any(Error), status: 'rejected' });
    expect(insertCalls).toBe(0);
    expect(retainedAfterSwitch).toEqual(expect.objectContaining({
      created_by: mockPrimaryActorId,
      state: expect.stringMatching(/^(pending_local|failed_retryable)$/),
    }));
    expect(trackCalls).toBe(0);
    expect(invalidationCalls).toBe(0);
    expect(markFailedRetryableIfOwned).toHaveBeenCalledWith(clientEventId, expect.objectContaining({
      expectedCreatedBy: mockPrimaryActorId,
      expectedState: 'sending',
    }));
  });

  it('AC-P3-ACTOR-8 retains a confirmed actor-A insert and later cleans it without reinserting', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000382';
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const removeIfState = createHarnessAtomicRemoveIfState(harness);
    const storage: QuickLogQueueStorage = { ...harness.storage, removeIfState };
    const insertGate = createSignaledDeferred();
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    mockInsertEvent.mockImplementation(async (insert) => {
      insertGate.signal();
      await insertGate.promise;
      return createServerRowFromInsert(insert);
    });
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const variables = createPortObservationVariables(clientEventId);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort?.createDetailed === undefined) throw new Error('Expected actor A create port');
    let actorAResult: Promise<Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>> | undefined;
    await act(async () => {
      actorAResult = actorAPort.createDetailed?.(variables).then(
        () => ({ status: 'resolved' as const }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );
      await insertGate.signaled;
    });
    if (actorAResult === undefined) throw new Error('Expected actor A create result');

    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockSecondaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    invalidate.mockClear();
    mockTrackQuickLogEvent.mockClear();
    let actorAOutcome:
      | Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>
      | undefined;
    await act(async () => {
      insertGate.resolve();
      actorAOutcome = await actorAResult;
    });
    const retainedDuringActorB = harness.items.get(clientEventId);
    const actorBLocalRows = getActorLocalRows(
      queryClient,
      queryKeys.events.timelineRoot(variables.householdId, variables.puppyId),
      mockPrimaryActorId,
    );
    const actorBTrackCalls = mockTrackQuickLogEvent.mock.calls.length;
    const actorBInvalidationCalls = invalidate.mock.calls.length;

    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockPrimaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await act(async () => {
      await flushHostMicrotasks();
      await flushHostMicrotasks();
    });
    const retainedAfterActorCleanup = harness.items.get(clientEventId);
    const inserts = [...mockInsertEvent.mock.calls];

    hook.unmount();
    queryClient.clear();

    expect(actorAOutcome).toEqual({ error: expect.any(Error), status: 'rejected' });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.[0].created_by).toBe(mockPrimaryActorId);
    expect(retainedDuringActorB).toEqual(expect.objectContaining({
      created_by: mockPrimaryActorId,
      state: 'server_confirmed',
    }));
    expect(actorBLocalRows).toEqual([]);
    expect(actorBTrackCalls).toBe(0);
    expect(actorBInvalidationCalls).toBe(0);
    expect(retainedAfterActorCleanup).toBeUndefined();
    expect(removeIfState).toHaveBeenCalledWith(clientEventId, 'server_confirmed', {
      expectedCreatedBy: mockPrimaryActorId,
    });
  });

  it('AC-P3-ACTOR-8 later cleans actor-A server_confirmed state after auth switches during success resolution', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000383';
    const resolveGate = createSignaledDeferred();
    const harness = createRecoveryQueueHarness([], { claimEnabled: false, resolveGate });
    const removeIfState = createHarnessAtomicRemoveIfState(harness);
    const storage: QuickLogQueueStorage = { ...harness.storage, removeIfState };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const variables = createPortObservationVariables(clientEventId);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort?.createDetailed === undefined) throw new Error('Expected actor A create port');
    let actorAResult: Promise<Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>> | undefined;
    await act(async () => {
      actorAResult = actorAPort.createDetailed?.(variables).then(
        () => ({ status: 'resolved' as const }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );
      await resolveGate.signaled;
    });
    if (actorAResult === undefined) throw new Error('Expected actor A create result');
    expect(harness.items.get(clientEventId)?.state).toBe('server_confirmed');

    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockSecondaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    invalidate.mockClear();
    mockTrackQuickLogEvent.mockClear();
    let actorAOutcome:
      | Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>
      | undefined;
    await act(async () => {
      resolveGate.resolve();
      actorAOutcome = await actorAResult;
    });
    const retainedDuringActorB = harness.items.get(clientEventId);
    const actorBTrackCalls = mockTrackQuickLogEvent.mock.calls.length;
    const actorBInvalidationCalls = invalidate.mock.calls.length;

    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockPrimaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await act(async () => {
      await flushHostMicrotasks();
      await flushHostMicrotasks();
    });
    const retainedAfterActorCleanup = harness.items.get(clientEventId);
    const insertCalls = mockInsertEvent.mock.calls.length;

    hook.unmount();
    queryClient.clear();

    expect(actorAOutcome).toEqual({ error: expect.any(Error), status: 'rejected' });
    expect(retainedDuringActorB?.state).toBe('server_confirmed');
    expect(insertCalls).toBe(1);
    expect(actorBTrackCalls).toBe(0);
    expect(actorBInvalidationCalls).toBe(0);
    expect(retainedAfterActorCleanup).toBeUndefined();
    expect(removeIfState).toHaveBeenCalledWith(clientEventId, 'server_confirmed', {
      expectedCreatedBy: mockPrimaryActorId,
    });
  });

  it('AC-P3-ACTOR-8 keeps a completed terminal removal final across an actor switch', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000384';
    const removalGate = createSignaledDeferred();
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const removeIfState = jest.fn<Promise<boolean>, [string, QuickLogQueueState]>(
      async (candidateClientEventId, expectedState) => {
        const retained = harness.items.get(candidateClientEventId);
        if (retained?.state !== expectedState) return false;
        harness.items.delete(candidateClientEventId);
        removalGate.signal();
        await removalGate.promise;
        return true;
      },
    );
    const storage: QuickLogQueueStorage = { ...harness.storage, removeIfState };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const variables = createPortObservationVariables(clientEventId);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort?.createDetailed === undefined) throw new Error('Expected actor A create port');
    let actorAResult: Promise<Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>> | undefined;
    await act(async () => {
      actorAResult = actorAPort.createDetailed?.(variables).then(
        () => ({ status: 'resolved' as const }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );
      await removalGate.signaled;
    });
    if (actorAResult === undefined) throw new Error('Expected actor A create result');
    expect(harness.items.has(clientEventId)).toBe(false);

    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockSecondaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    invalidate.mockClear();
    mockTrackQuickLogEvent.mockClear();
    let actorAOutcome:
      | Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>
      | undefined;
    await act(async () => {
      removalGate.resolve();
      actorAOutcome = await actorAResult;
    });
    const retainedAfterRemoval = harness.items.get(clientEventId);
    const insertCalls = mockInsertEvent.mock.calls.length;
    const trackCalls = mockTrackQuickLogEvent.mock.calls.length;
    const invalidationCalls = invalidate.mock.calls.length;

    hook.unmount();
    queryClient.clear();

    expect(actorAOutcome).toEqual({ error: expect.any(Error), status: 'rejected' });
    expect(retainedAfterRemoval).toBeUndefined();
    expect(insertCalls).toBe(1);
    expect(trackCalls).toBe(0);
    expect(invalidationCalls).toBe(0);
  });

  it('AC-P3-ACTOR-8 fails closed when supersession recovery lacks atomic owner-bound retry', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000391';
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const markSendingGate = createSignaledDeferred();
    const recoveryReadGate = createSignaledDeferred();
    const originalMarkSending = harness.storage.markSending.bind(harness.storage);
    const originalGet = harness.storage.getByClientEventId.bind(harness.storage);
    let recoveryReadReached = false;
    jest.spyOn(harness.storage, 'markSending').mockImplementation(async (...args) => {
      const item = await originalMarkSending(...args);
      markSendingGate.signal();
      await markSendingGate.promise;
      return item;
    });
    jest.spyOn(harness.storage, 'getByClientEventId').mockImplementation(async (candidateId) => {
      const captured = await originalGet(candidateId);
      if (
        captured?.client_event_id === clientEventId
        && captured.created_by === mockPrimaryActorId
        && captured.state === 'sending'
      ) {
        recoveryReadReached = true;
        recoveryReadGate.signal();
        await recoveryReadGate.promise;
      }
      return captured;
    });
    const unrestrictedRetry = jest.spyOn(harness.storage, 'markFailedRetryable');
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const actorAPort = hook.result.current.mutation;
    if (actorAPort?.createDetailed === undefined) throw new Error('Expected actor A create port');
    let actorAResult: Promise<Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>> | undefined;
    await act(async () => {
      actorAResult = actorAPort.createDetailed?.(
        createPortObservationVariables(clientEventId),
      ).then(
        () => ({ status: 'resolved' as const }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );
      await markSendingGate.signaled;
    });
    if (actorAResult === undefined) throw new Error('Expected actor A create result');
    act(() => {
      mockAuthState.current = { status: 'signedIn', user: { id: mockSecondaryActorId } };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    mockCaptureException.mockClear();
    invalidate.mockClear();
    mockTrackQuickLogEvent.mockClear();
    await act(async () => {
      markSendingGate.resolve();
      await flushHostMicrotasks();
    });
    await waitFor(() => {
      expect(recoveryReadReached || mockCaptureException.mock.calls.length > 0).toBe(true);
    });
    const actorARow = harness.items.get(clientEventId);
    if (actorARow === undefined) throw new Error('Expected actor A sending row');
    const replacement = createStoredQuickLogQueueItem({
      ...actorARow,
      created_by: mockSecondaryActorId,
      updated_at: '2026-07-17T15:00:00.000Z',
    });
    harness.items.set(clientEventId, replacement);
    recoveryReadGate.resolve();
    let actorAOutcome: Awaited<typeof actorAResult> | undefined;
    await act(async () => {
      actorAOutcome = await actorAResult;
    });
    const retained = harness.items.get(clientEventId);
    const reportJson = JSON.stringify(mockCaptureException.mock.calls);
    const effects = {
      insertCalls: mockInsertEvent.mock.calls.length,
      invalidationCalls: invalidate.mock.calls.length,
      retryCalls: unrestrictedRetry.mock.calls.length,
      trackCalls: mockTrackQuickLogEvent.mock.calls.length,
    };

    hook.unmount();
    queryClient.clear();

    expect(actorAOutcome).toEqual({ error: expect.any(Error), status: 'rejected' });
    expect(retained).toEqual(replacement);
    expect(effects).toEqual({
      insertCalls: 0,
      invalidationCalls: 0,
      retryCalls: 0,
      trackCalls: 0,
    });
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.any(Object),
    );
    expect(reportJson).not.toContain(clientEventId);
    expect(reportJson).not.toContain(mockSecondaryActorId);
  });

  it('AC-P3-ACTOR-8 keeps the direct create-recovery call site read-free without owner-bound atomic retry', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/query/quick-log.ts'),
      'utf8',
    );
    const mutationFnStart = source.indexOf('mutationFn: async (variables) => {');
    const insertBoundary = source.indexOf('const insertedRow = await sendQuickLogInsert', mutationFnStart);
    const supersessionRecovery = source.slice(mutationFnStart, insertBoundary);

    expect(mutationFnStart).toBeGreaterThanOrEqual(0);
    expect(insertBoundary).toBeGreaterThan(mutationFnStart);
    expect(supersessionRecovery.includes(
      'dependencies.queue.getByClientEventId(context.clientEventId)',
    )).toBe(false);
    expect(supersessionRecovery.includes(
      'dependencies.queue.markFailedRetryable(',
    )).toBe(false);
  });

  it('AC-P3-ACTOR-8 owner-bound shared removal fails closed before its fallback read or remove', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000393',
      payload: { amount: 'snack' },
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const stateReadGate = createSignaledDeferred();
    const originalGet = harness.storage.getByClientEventId.bind(harness.storage);
    const queueRead = jest.spyOn(harness.storage, 'getByClientEventId');
    queueRead.mockImplementationOnce(async (candidateId) => {
      const retained = await originalGet(candidateId);
      stateReadGate.signal();
      await stateReadGate.promise;
      return retained;
    });
    const queryClient = createTestQueryClient();
    const privateMarker = 'synthetic-private-owner-removal-marker';
    queryClient.setQueryData(
      queryKeys.events.timeline(item.household_id, item.puppy_id),
      [{ ...createServerRow(item), payload: { amount: privateMarker } }],
    );

    const removing = removeQuickLogOptimisticEvent({
      actorId: mockPrimaryActorId,
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      getActorId: () => mockPrimaryActorId,
      householdId: item.household_id,
      now: '2026-07-17T15:00:02.000Z',
      puppyId: item.puppy_id,
      queryClient,
      queue: harness.storage,
      todayDate: '2026-07-17',
    }).then(
      () => ({ status: 'resolved' as const }),
      (error: unknown) => ({ error, status: 'rejected' as const }),
    );
    await stateReadGate.signaled;
    queueRead.mockClear();
    stateReadGate.resolve();
    const outcome = await removing;
    const retained = harness.items.get(item.client_event_id);
    const cached = queryClient.getQueryData<QuickLogCachedEventRow[]>(
      queryKeys.events.timeline(item.household_id, item.puppy_id),
    );

    queryClient.clear();

    expect(outcome).toEqual({ error: expect.any(Error), status: 'rejected' });
    expect(JSON.stringify(outcome)).not.toContain(item.client_event_id);
    expect(JSON.stringify(outcome)).not.toContain(privateMarker);
    expect(queueRead).not.toHaveBeenCalled();
    expect(harness.remove).not.toHaveBeenCalled();
    expect(retained).toEqual(item);
    expect(cached).toEqual([{ ...createServerRow(item), payload: { amount: privateMarker } }]);
  });

  it('AC-P3-ACTOR-8 fails closed when terminal hydration cleanup lacks atomic owner-bound removal', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000392';
    const actorAItem = createRecoveryQueueItem({
      client_event_id: clientEventId,
      state: 'server_confirmed',
    });
    const harness = createRecoveryQueueHarness([actorAItem], { claimEnabled: false });
    const cleanupReadGate = createSignaledDeferred();
    const originalGet = harness.storage.getByClientEventId.bind(harness.storage);
    let cleanupReadReached = false;
    jest.spyOn(harness.storage, 'getByClientEventId').mockImplementation(async (candidateId) => {
      const captured = await originalGet(candidateId);
      if (captured?.client_event_id === clientEventId && captured.state === 'server_confirmed') {
        cleanupReadReached = true;
        cleanupReadGate.signal();
        await cleanupReadGate.promise;
      }
      return captured;
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => {
      expect(cleanupReadReached || mockCaptureException.mock.calls.length > 0).toBe(true);
    });
    const replacement = createStoredQuickLogQueueItem({
      ...actorAItem,
      created_by: mockSecondaryActorId,
      payload: { amount: 'snack' },
      updated_at: '2026-07-17T15:00:01.000Z',
    });
    harness.items.set(clientEventId, replacement);
    cleanupReadGate.resolve();
    await act(async () => {
      await flushHostMicrotasks();
      await flushHostMicrotasks();
    });
    const retained = harness.items.get(clientEventId);
    const removeCalls = harness.remove.mock.calls.length;
    const reportJson = JSON.stringify(mockCaptureException.mock.calls);

    hook.unmount();
    queryClient.clear();

    expect(retained).toEqual(replacement);
    expect(removeCalls).toBe(0);
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.any(Object),
    );
    expect(reportJson).not.toContain(clientEventId);
  });

  it('AC-P3-ERROR-1 production Retry owns DB rejection with scrubbed reporting and no local effects', async () => {
    const privateMarker = 'private-production-retry-db-marker';
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000344',
      state: 'failed_retryable',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-17T12:00:00.000Z',
      retry_count: 1,
    });
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const manualRetryIfOwned = jest.fn(async () => {
      throw new Error(privateMarker);
    });
    const storage: QuickLogQueueStorage = {
      ...harness.storage,
      manualRetryIfOwned,
    };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const mutation = hook.result.current.mutation;
    if (mutation === undefined) throw new Error('Expected ready mutation port');
    harness.items.set(item.client_event_id, item);
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    const cachedRows = [createServerRow(item)];
    queryClient.setQueryData(timelineKey, cachedRows);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const cacheReplay = jest.spyOn(queryClient, 'setQueriesData');
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      unhandledRejections.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);
    mockCaptureException.mockClear();
    mockInsertEvent.mockClear();
    mockTombstoneByClientEventId.mockClear();
    mockTrackQuickLogEvent.mockClear();

    try {
      mutation.retry(item.client_event_id, 'manual_retry', 'today');
      await flushHostMicrotasks();
      await flushHostMicrotasks();

      expect({
        cachedRows: queryClient.getQueryData(timelineKey),
        cacheReplayCalls: cacheReplay.mock.calls.length,
        insertCalls: mockInsertEvent.mock.calls.length,
        invalidationCalls: invalidate.mock.calls.length,
        retainedItem: harness.items.get(item.client_event_id),
        tombstoneCalls: mockTombstoneByClientEventId.mock.calls.length,
        trackCalls: mockTrackQuickLogEvent.mock.calls.length,
        unhandledRejections,
      }).toEqual({
        cachedRows,
        cacheReplayCalls: 0,
        insertCalls: 0,
        invalidationCalls: 0,
        retainedItem: item,
        tombstoneCalls: 0,
        trackCalls: 0,
        unhandledRejections: [],
      });
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
        expect.objectContaining({
          area: 'quick_log_queue',
          operation: 'local_action_failed',
        }),
      );
      expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(privateMarker);
      expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(item.client_event_id);
    } finally {
      process.removeListener('unhandledRejection', onUnhandledRejection);
      hook.unmount();
      queryClient.clear();
    }
  });

  it('AC-P3-ERROR-2 preserves and later actor-cleans a confirmed create when terminal removal rejects', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000394';
    const privateFinalizeMarker = 'synthetic-private-create-finalize-marker';
    const finalizerFailure = new Error(privateFinalizeMarker);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const retryableTransition = jest.spyOn(harness.storage, 'markFailedRetryable');
    const permanentTransition = jest.spyOn(harness.storage, 'markFailedPermanent');
    let matchingRemovalCount = 0;
    const removeIfState = jest.fn<
      ReturnType<NonNullable<QuickLogQueueStorage['removeIfState']>>,
      Parameters<NonNullable<QuickLogQueueStorage['removeIfState']>>
    >(async (candidateId, expectedState, options) => {
      const retained = harness.items.get(candidateId);
      if (
        retained?.state !== expectedState
        || (
          options?.expectedCreatedBy !== undefined
          && retained.created_by !== options.expectedCreatedBy
        )
      ) {
        return false;
      }
      matchingRemovalCount += 1;
      if (matchingRemovalCount === 1) throw finalizerFailure;
      harness.items.delete(candidateId);
      return true;
    });
    const storage: QuickLogQueueStorage = {
      ...harness.storage,
      removeIfState,
    };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
    const variables = createPortObservationVariables(clientEventId);
    const timelineRootKey = queryKeys.events.timelineRoot(
      variables.householdId,
      variables.puppyId,
    );
    const queryClient = createTestQueryClient();
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      unhandledRejections.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);
    const actorAHook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    try {
      await waitFor(() => expect(actorAHook.result.current.status).toBe('ready'));
      const actorAPort = actorAHook.result.current.mutation;
      if (actorAPort?.createDetailed === undefined) throw new Error('Expected actor A create port');
      const createDetailed = actorAPort.createDetailed;

      let createOutcome:
        | Readonly<{ data?: QuickLogCachedEventRow; error?: unknown; status: 'rejected' | 'resolved' }>
        | undefined;
      await act(async () => {
        createOutcome = await createDetailed(variables).then(
          (data) => ({ data, status: 'resolved' as const }),
          (error: unknown) => ({ error, status: 'rejected' as const }),
        );
        await flushHostMicrotasks();
      });
      const retainedAfterFailure = harness.items.get(clientEventId);
      const cachedAfterFailure = queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineRootKey);
      const insertCountAfterFailure = mockInsertEvent.mock.calls.length;
      const eventLoggedCountAfterFailure = mockTrackQuickLogEvent.mock.calls.filter(
        ([event]) => event.name === 'event_logged',
      ).length;
      const pendingCountAfterFailure = mockTrackQuickLogEvent.mock.calls.filter(
        ([event]) => event.name === 'pending_quick_log_created',
      ).length;
      const reportJson = JSON.stringify(mockCaptureException.mock.calls);

      expect(createOutcome).toEqual({
        data: expect.objectContaining({ client_event_id: clientEventId }),
        status: 'resolved',
      });
      expect(retainedAfterFailure).toMatchObject({
        client_event_id: clientEventId,
        created_by: mockPrimaryActorId,
        state: 'server_confirmed',
      });
      expect(cachedAfterFailure).toEqual([
        expect.objectContaining({
          client_event_id: clientEventId,
          created_by: mockPrimaryActorId,
          id: '00000000-0000-4000-8000-000000000372',
          localSync: undefined,
        }),
      ]);
      expect({
        eventLoggedCountAfterFailure,
        insertCountAfterFailure,
        pendingCountAfterFailure,
        unhandledRejections,
      }).toEqual({
        eventLoggedCountAfterFailure: 1,
        insertCountAfterFailure: 1,
        pendingCountAfterFailure: 1,
        unhandledRejections: [],
      });
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
        expect.objectContaining({
          area: 'quick_log_queue',
          operation: expect.any(String),
        }),
      );
      expect(reportJson).not.toContain(privateFinalizeMarker);
      expect(reportJson).not.toContain(clientEventId);
      expect(removeIfState).toHaveBeenNthCalledWith(
        1,
        clientEventId,
        'server_confirmed',
        { expectedCreatedBy: mockPrimaryActorId },
      );
      expect(retryableTransition).not.toHaveBeenCalled();
      expect(permanentTransition).not.toHaveBeenCalled();

      actorAHook.unmount();
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockSecondaryActorId },
      };
      const actorBQueryClient = createTestQueryClient();
      const actorBHook = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(actorBQueryClient),
      });
      await waitFor(() => expect(actorBHook.result.current.status).toBe('ready'));
      await act(async () => {
        await flushHostMicrotasks();
      });
      expect(harness.items.get(clientEventId)).toEqual(retainedAfterFailure);
      expect(removeIfState).toHaveBeenCalledTimes(1);
      actorBHook.unmount();
      actorBQueryClient.clear();

      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockPrimaryActorId },
      };
      const resumedActorQueryClient = createTestQueryClient();
      const resumedActorHook = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(resumedActorQueryClient),
      });
      await waitFor(() => expect(harness.items.has(clientEventId)).toBe(false));
      expect(resumedActorHook.result.current.status).toBe('ready');
      expect(removeIfState).toHaveBeenNthCalledWith(
        2,
        clientEventId,
        'server_confirmed',
        { expectedCreatedBy: mockPrimaryActorId },
      );
      expect(mockInsertEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackQuickLogEvent.mock.calls.filter(
        ([event]) => event.name === 'event_logged',
      )).toHaveLength(1);
      expect(unhandledRejections).toEqual([]);
      resumedActorHook.unmount();
      resumedActorQueryClient.clear();
    } finally {
      process.removeListener('unhandledRejection', onUnhandledRejection);
      actorAHook.unmount();
      queryClient.clear();
    }
  });

  it('AC-P3-ERROR-2 contains a persistent queue-read failure once on the normal request-event create path', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000395';
    const requestId = 'req_error2_persistent_read';
    const privateInsertMarker = 'synthetic-private-sheet-insert-marker';
    const privateReadMarker = 'synthetic-private-sheet-read-marker';
    const insertFailure = Object.assign(new Error(privateInsertMarker), {
      kind: 'network_unavailable',
      retryAfterMs: null,
    });
    const readFailure = new Error(privateReadMarker);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const getByClientEventId = jest.fn(async (): Promise<QuickLogStoredQueueItem | null> => {
      throw readFailure;
    });
    const retryableTransition = jest.spyOn(harness.storage, 'markFailedRetryable');
    const permanentTransition = jest.spyOn(harness.storage, 'markFailedPermanent');
    const storage: QuickLogQueueStorage = {
      ...harness.storage,
      getByClientEventId,
    };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    mockInsertEvent.mockRejectedValue(insertFailure);
    const variables = createPortObservationVariables(clientEventId);
    const timelineRootKey = queryKeys.events.timelineRoot(
      variables.householdId,
      variables.puppyId,
    );
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      unhandledRejections.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    try {
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      const mutation = hook.result.current.mutation;
      if (mutation === undefined) throw new Error('Expected ready mutation port');
      getByClientEventId.mockClear();
      invalidate.mockClear();
      mockCaptureException.mockClear();
      mockInsertEvent.mockClear();
      mockTrackQuickLogEvent.mockClear();
      mockTombstoneByClientEventId.mockClear();

      act(() => {
        mutation.mutate({ requestId, variables });
      });
      await waitFor(() => {
        expect(queryClient.getMutationCache().getAll().at(-1)?.state.status).toBe('error');
      });
      await act(async () => {
        await flushHostMicrotasks();
        await flushHostMicrotasks();
      });
      const mutationState = queryClient.getMutationCache().getAll().at(-1)?.state;
      const retained = harness.items.get(clientEventId);
      const cached = queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineRootKey);
      const reports = mockCaptureException.mock.calls;
      const reportJson = JSON.stringify(reports);

      expect(mutationState).toMatchObject({
        error: insertFailure,
        status: 'error',
      });
      expect(getByClientEventId).toHaveBeenCalledTimes(1);
      expect(retained).toMatchObject({
        client_event_id: clientEventId,
        created_by: mockPrimaryActorId,
        last_error_category: null,
        retry_count: 0,
        state: 'sending',
      });
      expect(cached).toEqual([
        expect.objectContaining({
          client_event_id: clientEventId,
          created_by: mockPrimaryActorId,
          id: clientEventId.slice('evt_'.length),
          localSync: {
            category: null,
            retryCount: 0,
            state: 'pending_local',
          },
        }),
      ]);
      expect(retryableTransition).not.toHaveBeenCalled();
      expect(permanentTransition).not.toHaveBeenCalled();
      expect(mockInsertEvent).toHaveBeenCalledTimes(1);
      expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(mockTrackQuickLogEvent.mock.calls).toEqual([[
        {
          name: 'pending_quick_log_created',
          properties: {
            connection_state: 'unknown',
            event_type: 'observation',
          },
        },
      ]]);
      expect(hook.result.current.mutationEvents).toEqual([{
        clientEventId,
        eventType: 'observation',
        requestId,
        trackerId: 'observation',
        type: 'started',
      }]);
      expect(reports).toEqual([[
        expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
        expect.objectContaining({
          area: 'quick_log_queue',
          operation: 'save_failure_read',
        }),
      ]]);
      expect(reportJson).not.toContain(privateInsertMarker);
      expect(reportJson).not.toContain(privateReadMarker);
      expect(reportJson).not.toContain(clientEventId);
      expect(unhandledRejections).toEqual([]);
    } finally {
      process.removeListener('unhandledRejection', onUnhandledRejection);
      hook.unmount();
      queryClient.clear();
    }
  });

  it('AC-P3-ERROR-2 preserves the original durable-create error when its acceptance read also rejects', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000396';
    const privateInsertMarker = 'synthetic-private-durable-insert-marker';
    const privateReadMarker = 'synthetic-private-durable-read-marker';
    const insertFailure = Object.assign(new Error(privateInsertMarker), {
      kind: 'network_unavailable',
      retryAfterMs: null,
    });
    const readFailure = new Error(privateReadMarker);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const getByClientEventId = jest.fn(async (): Promise<QuickLogStoredQueueItem | null> => {
      throw readFailure;
    });
    const retryableTransition = jest.spyOn(harness.storage, 'markFailedRetryable');
    const permanentTransition = jest.spyOn(harness.storage, 'markFailedPermanent');
    const storage: QuickLogQueueStorage = {
      ...harness.storage,
      getByClientEventId,
    };
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    mockInsertEvent.mockRejectedValue(insertFailure);
    const variables = createPortObservationVariables(clientEventId);
    const timelineRootKey = queryKeys.events.timelineRoot(
      variables.householdId,
      variables.puppyId,
    );
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      unhandledRejections.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    try {
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      const createDetailedDurably = hook.result.current.mutation?.createDetailedDurably;
      if (createDetailedDurably === undefined) throw new Error('Expected durable create port');
      getByClientEventId.mockClear();
      invalidate.mockClear();
      mockCaptureException.mockClear();
      mockInsertEvent.mockClear();
      mockTrackQuickLogEvent.mockClear();
      mockTombstoneByClientEventId.mockClear();

      let outcome:
        | Readonly<{ error?: unknown; status: 'rejected' | 'resolved' }>
        | undefined;
      await act(async () => {
        outcome = await createDetailedDurably(variables).then(
          () => ({ status: 'resolved' as const }),
          (error: unknown) => ({ error, status: 'rejected' as const }),
        );
        await flushHostMicrotasks();
        await flushHostMicrotasks();
      });
      const retained = harness.items.get(clientEventId);
      const cached = queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineRootKey);
      const reports = mockCaptureException.mock.calls;
      const reportOperations = reports.map(([, context]) => context.operation);
      const reportJson = JSON.stringify(reports);

      expect(outcome).toEqual({ error: insertFailure, status: 'rejected' });
      expect(getByClientEventId).toHaveBeenCalledTimes(2);
      expect(retained).toMatchObject({
        client_event_id: clientEventId,
        created_by: mockPrimaryActorId,
        last_error_category: null,
        retry_count: 0,
        state: 'sending',
      });
      expect(cached).toEqual([
        expect.objectContaining({
          client_event_id: clientEventId,
          created_by: mockPrimaryActorId,
          id: clientEventId.slice('evt_'.length),
          localSync: {
            category: null,
            retryCount: 0,
            state: 'pending_local',
          },
        }),
      ]);
      expect(retryableTransition).not.toHaveBeenCalled();
      expect(permanentTransition).not.toHaveBeenCalled();
      expect(mockInsertEvent).toHaveBeenCalledTimes(1);
      expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(mockTrackQuickLogEvent.mock.calls).toEqual([[
        {
          name: 'pending_quick_log_created',
          properties: {
            connection_state: 'unknown',
            event_type: 'observation',
          },
        },
      ]]);
      expect(hook.result.current.mutationEvents).toEqual([]);
      expect(reports).toHaveLength(2);
      expect(reportOperations).toContain('save_failure_read');
      expect(new Set(reportOperations).size).toBe(2);
      expect(reports).toEqual(expect.arrayContaining([
        [
          expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
          expect.objectContaining({
            area: 'quick_log_queue',
            operation: expect.any(String),
          }),
        ],
      ]));
      expect(reportJson).not.toContain(privateInsertMarker);
      expect(reportJson).not.toContain(privateReadMarker);
      expect(reportJson).not.toContain(clientEventId);
      expect(unhandledRejections).toEqual([]);
    } finally {
      process.removeListener('unhandledRejection', onUnhandledRejection);
      hook.unmount();
      queryClient.clear();
    }
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
    const queue = createStatefulQuickLogQueue(undefined, { atomicRemoveIfState: true });
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

  it('AC-P1-RECOVERY-10 accepts a cached synced delete locally and leaves a 5s Undo grace before network', async () => {
    const intervalSpy = jest.spyOn(global, 'setInterval');
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000261',
      state: 'server_confirmed',
    });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await expect(hook.result.current.mutation?.deleteSynced({
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    })).resolves.toBeUndefined();

    expect(harness.enqueueDeletedBeforeSync).toHaveBeenCalledWith(expect.objectContaining({
      client_event_id: item.client_event_id,
      created_by: item.created_by,
      event_type: item.event_type,
      household_id: item.household_id,
      occurred_at: item.occurred_at,
      payload: item.payload,
      payload_version: item.payload_version,
      puppy_id: item.puppy_id,
    }), {
      now: expect.any(String),
      retryAfterAt: expect.any(String),
    });
    const deleteIntentOptions = harness.enqueueDeletedBeforeSync.mock.calls[0]?.[1];
    expect(
      Date.parse(deleteIntentOptions?.retryAfterAt ?? '')
      - Date.parse(deleteIntentOptions?.now ?? ''),
    ).toBe(5_000);
    expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();
    const retainedIntent = harness.items.get(item.client_event_id);
    expect(retainedIntent).toMatchObject({
      state: 'deleted_before_sync',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: expect.any(String),
    });
    const undoGraceMs = Date.parse(retainedIntent?.retry_after_at ?? '')
      - Date.parse(retainedIntent?.updated_at ?? '');
    expect(undoGraceMs).toBe(5_000);
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey)).toEqual([
      expect.objectContaining({
        client_event_id: item.client_event_id,
        localSync: {
          state: 'deleted_before_sync',
          category: null,
          retryCount: 0,
        },
      }),
    ]);
    expect(mockInsertEvent).not.toHaveBeenCalled();

    act(() => {
      const timerCallback = intervalSpy.mock.calls[0]?.[0];
      if (typeof timerCallback === 'function') timerCallback();
    });
    await act(async () => flushHostMicrotasks());
    expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();

    if (retainedIntent === undefined) throw new Error('Expected retained delete intent');
    harness.items.set(item.client_event_id, createStoredQuickLogQueueItem({
      ...retainedIntent,
      retry_after_at: '2000-01-01T00:00:00.000Z',
    }));
    mockTombstoneByClientEventId.mockResolvedValueOnce(undefined);
    act(() => {
      const timerCallback = intervalSpy.mock.calls[0]?.[0];
      if (typeof timerCallback === 'function') timerCallback();
    });
    await waitFor(() => expect(mockTombstoneByClientEventId).toHaveBeenCalledWith({
      clientEventId: item.client_event_id,
      deletedAt: expect.any(String),
      householdId: item.household_id,
    }));
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P1-RECOVERY-10 owns another caregiver\'s synced-row delete intent as the active actor and drains it actor-safely', async () => {
    const intervalSpy = jest.spyOn(global, 'setInterval');
    const otherCaregiverId = '00000000-0000-4000-8000-000000000291';
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000292',
      created_by: otherCaregiverId,
      state: 'server_confirmed',
    });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockTombstoneByClientEventId.mockResolvedValue(undefined);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await expect(hook.result.current.mutation?.deleteSynced({
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    })).resolves.toBeUndefined();

    expect(harness.enqueueDeletedBeforeSync).toHaveBeenCalledWith(
      expect.objectContaining({
        client_event_id: item.client_event_id,
        created_by: mockPrimaryActorId,
      }),
      expect.any(Object),
    );
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey)).toEqual([
      expect.objectContaining({
        client_event_id: item.client_event_id,
        created_by: otherCaregiverId,
        localSync: expect.objectContaining({ state: 'deleted_before_sync' }),
      }),
    ]);

    const retained = harness.items.get(item.client_event_id);
    if (retained === undefined) throw new Error('Expected active-actor delete intent');
    harness.items.set(item.client_event_id, createStoredQuickLogQueueItem({
      ...retained,
      retry_after_at: '2000-01-01T00:00:00.000Z',
    }));
    act(() => {
      const timerCallback = intervalSpy.mock.calls[0]?.[0];
      if (typeof timerCallback === 'function') timerCallback();
    });
    await waitFor(() => expect(mockTombstoneByClientEventId).toHaveBeenCalledWith({
      clientEventId: item.client_event_id,
      deletedAt: expect.any(String),
      householdId: item.household_id,
    }));
    expect(mockInsertEvent).not.toHaveBeenCalled();
    hook.unmount();
    queryClient.clear();
  });

  it.each([
    {
      category: null,
      label: 'accepted',
      localClientEventId: 'evt_00000000-0000-4000-8000-000000000703',
      retryAfterAt: '2026-07-16T12:00:07.000Z',
      sharedClientEventId: 'evt_00000000-0000-4000-8000-000000000702',
      targetClientEventId: 'evt_00000000-0000-4000-8000-000000000701',
    },
    {
      category: 'network_unavailable',
      label: 'retryable failure',
      localClientEventId: 'evt_00000000-0000-4000-8000-000000000713',
      retryAfterAt: '2026-07-16T12:00:07.000Z',
      sharedClientEventId: 'evt_00000000-0000-4000-8000-000000000712',
      targetClientEventId: 'evt_00000000-0000-4000-8000-000000000711',
    },
    {
      category: 'permission_denied',
      label: 'permanent failure',
      localClientEventId: 'evt_00000000-0000-4000-8000-000000000723',
      retryAfterAt: null,
      sharedClientEventId: 'evt_00000000-0000-4000-8000-000000000722',
      targetClientEventId: 'evt_00000000-0000-4000-8000-000000000721',
    },
  ] as const)(
    'AC-P3-ACTOR-7 composes $label synced-delete ownership across cache and Timeline without creator drift or resurrection',
    async ({
      category,
      localClientEventId,
      retryAfterAt,
      sharedClientEventId,
      targetClientEventId,
    }) => {
      const deletingActorId = mockPrimaryActorId;
      const displayCreatorId = mockSecondaryActorId;
      const item = createRecoveryQueueItem({
        client_event_id: targetClientEventId,
        created_by: displayCreatorId,
        event_type: 'observation',
        payload_version: 2,
        payload: {
          title: 'Synthetic private sentinel title',
          note: 'Synthetic private sentinel note',
        },
        state: 'server_confirmed',
      });
      const durableRow = {
        ...createServerRow(item),
        id: targetClientEventId.slice('evt_'.length),
      };
      const sharedDurableControl = {
        ...createServerRow(createRecoveryQueueItem({
          client_event_id: sharedClientEventId,
          created_by: displayCreatorId,
          occurred_at: '2026-07-16T12:10:00.000Z',
        })),
        id: sharedClientEventId.slice('evt_'.length),
      };
      const deletingActorLocalControl: QuickLogCachedEventRow = {
        ...createServerRow(createRecoveryQueueItem({
          client_event_id: localClientEventId,
          created_by: deletingActorId,
          occurred_at: '2026-07-16T12:20:00.000Z',
        })),
        id: localClientEventId.slice('evt_'.length),
        localSync: {
          state: 'pending_local',
          category: null,
          retryCount: 0,
        },
      };
      const harness = createRecoveryQueueHarness([], { claimEnabled: false });
      const queryClient = createTestQueryClient();
      // This case renders only cache-reader hooks; a pipeline provider would run recovery/drain
      // against the staged cache and drift the asserted ownership rows.
      const wrapper = createPlainQueryClientWrapper(queryClient);
      const timelineRootKey = queryKeys.events.timelineRoot(item.household_id, item.puppy_id);
      const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id, {
        from: '2026-07-16',
        to: '2026-07-16',
      });
      const deletingActorContext = {
        authState: 'authenticated',
        householdId: item.household_id,
        householdRole: 'owner',
        puppyId: item.puppy_id,
        todayDate: '2026-07-16',
        userId: deletingActorId,
      } as const;
      const displayCreatorContext = {
        ...deletingActorContext,
        userId: displayCreatorId,
      } as const;

      queryClient.setQueryData(timelineRootKey, [
        durableRow,
        sharedDurableControl,
        deletingActorLocalControl,
      ]);
      await deleteSyncedQuickLogEvent({
        actorId: deletingActorId,
        clientEventId: item.client_event_id,
        eventType: item.event_type,
        getActorId: () => deletingActorId,
        householdId: item.household_id,
        now: () => '2026-07-16T12:00:02.000Z',
        puppyId: item.puppy_id,
        queryClient,
        queueRef: { current: harness.storage },
        todayDate: '2026-07-16',
      });

      if (category !== null) {
        const retained = await harness.retainDeletedBeforeSync(item.client_event_id, {
          errorCategory: category,
          now: '2026-07-16T12:00:03.000Z',
          retryAfterAt,
        });
        replayQuickLogQueueItemToCache({
          item: retained,
          queryClient,
          todayDate: '2026-07-16',
        });
      }

      const sentinelBeforeActorSwitch = queryClient
        .getQueryData<QuickLogCachedEventRow[]>(timelineRootKey)
        ?.find((row) => row.client_event_id === item.client_event_id);
      if (sentinelBeforeActorSwitch === undefined) {
        throw new Error('Expected real synced-delete sentinel');
      }
      const { localSync: sentinelLocalSync, ...sentinelDisplayRow } = sentinelBeforeActorSwitch;
      let activeCareContext: typeof deletingActorContext | typeof displayCreatorContext
        = deletingActorContext;
      const cached = renderHook(() => useQuickLogCachedRows(activeCareContext), { wrapper });
      const deletingActorCachedRows = cached.result.current;
      activeCareContext = displayCreatorContext;
      cached.rerender(undefined);
      const displayCreatorCachedRows = cached.result.current;

      mockListEvents.mockResolvedValue([durableRow, sharedDurableControl]);
      activeCareContext = deletingActorContext;
      const timeline = renderHook(
        () => useQuickLogTimelineRows(activeCareContext, {
          from: '2026-07-16',
          to: '2026-07-16',
        }),
        { wrapper },
      );
      await waitFor(() => expect(timeline.result.current.status).toBe('ready'));
      await act(async () => {
        await queryClient.refetchQueries({ exact: true, queryKey: timelineKey });
      });
      await waitFor(() => expect(timeline.result.current.rows.some((row) =>
        row.client_event_id === sharedDurableControl.client_event_id)).toBe(true));
      const deletingActorTimelineRows = timeline.result.current.rows;
      activeCareContext = displayCreatorContext;
      timeline.rerender(undefined);
      await act(async () => {
        await queryClient.refetchQueries({ exact: true, queryKey: timelineKey });
      });
      await waitFor(() => expect(timeline.result.current.rows.some((row) =>
        row.client_event_id === sharedDurableControl.client_event_id)).toBe(true));
      expect(mockListEvents).toHaveBeenCalled();
      const displayCreatorTimelineRows = timeline.result.current.rows;

      expect({
        deletingActorCachedIds: deletingActorCachedRows.map((row) => row.client_event_id),
        deletingActorTimelineIds: deletingActorTimelineRows.map((row) => row.client_event_id),
        displayCreatorCacheContainsPrivateSentinel:
          JSON.stringify(displayCreatorCachedRows).includes('Synthetic private sentinel'),
        displayCreatorCachedIds: displayCreatorCachedRows.map((row) => row.client_event_id),
        displayCreatorTimelineIds: displayCreatorTimelineRows.map((row) => row.client_event_id),
        sentinelDisplayRow,
        sentinelLocalSync,
      }).toEqual({
        deletingActorCachedIds: expect.arrayContaining([
          item.client_event_id,
          sharedDurableControl.client_event_id,
          deletingActorLocalControl.client_event_id,
        ]),
        deletingActorTimelineIds: expect.arrayContaining([
          sharedDurableControl.client_event_id,
          deletingActorLocalControl.client_event_id,
        ]),
        displayCreatorCacheContainsPrivateSentinel: false,
        displayCreatorCachedIds: [sharedDurableControl.client_event_id],
        displayCreatorTimelineIds: [sharedDurableControl.client_event_id],
        sentinelDisplayRow: durableRow,
        sentinelLocalSync: {
          state: 'deleted_before_sync',
          category,
          retryCount: category === null ? 0 : 1,
        },
      });
      expect(deletingActorTimelineRows).not.toEqual(expect.arrayContaining([
        expect.objectContaining({
          client_event_id: item.client_event_id,
          localSync: undefined,
        }),
      ]));
      expect(displayCreatorTimelineRows).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ client_event_id: item.client_event_id }),
      ]));

      timeline.unmount();
      cached.unmount();
      queryClient.clear();
    },
  );

  it('AC-P3-ACTOR-7 retains automatic-delete ownership until cache removal across an A-to-B finalize switch', async () => {
    const deletingActorId = mockPrimaryActorId;
    const displayCreatorId = mockSecondaryActorId;
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000731',
      created_by: deletingActorId,
      event_type: 'observation',
      last_error_category: 'network_unavailable',
      payload_version: 2,
      payload: {
        title: 'Synthetic automatic sentinel title',
        note: 'Synthetic automatic sentinel note',
      },
      retry_after_at: '2000-01-01T00:00:00.000Z',
      retry_count: 1,
      state: 'deleted_before_sync',
    });
    const durableDisplayRow = {
      ...createServerRow({ ...item, created_by: displayCreatorId }),
      id: item.client_event_id.slice('evt_'.length),
    };
    const sentinel: QuickLogCachedEventRow = {
      ...durableDisplayRow,
      localSync: {
        state: 'deleted_before_sync',
        category: item.last_error_category,
        retryCount: item.retry_count,
      },
    };
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const queryClient = createPuppyPlanQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const timelineRootKey = queryKeys.events.timelineRoot(item.household_id, item.puppy_id);
    const deletingActorContext = {
      authState: 'authenticated',
      householdId: item.household_id,
      householdRole: 'owner',
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
      userId: deletingActorId,
    } as const;
    const displayCreatorContext = {
      ...deletingActorContext,
      userId: displayCreatorId,
    } as const;
    const tombstoneGate = createSignaledDeferred();
    const originalClearIntentOwner = quickLogActorVisibility.clearQuickLogIntentOwner;
    let switchActorAfterOwnerClear: (() => void) | null = null;
    let cacheContainedSentinelWhenOwnerCleared: boolean | null = null;

    queryClient.setQueryData(timelineRootKey, [sentinel]);
    quickLogActorVisibility.setQuickLogIntentOwner(queryClient, {
      actorId: deletingActorId,
      clientEventId: item.client_event_id,
      householdId: item.household_id,
      puppyId: item.puppy_id,
    });
    const clearOwner = jest.spyOn(
      quickLogActorVisibility,
      'clearQuickLogIntentOwner',
    ).mockImplementation((client, identity) => {
      if (identity.clientEventId === item.client_event_id) {
        cacheContainedSentinelWhenOwnerCleared = client
          .getQueryData<QuickLogCachedEventRow[]>(timelineRootKey)
          ?.some((row) => row.client_event_id === item.client_event_id) ?? false;
      }
      originalClearIntentOwner(client, identity);
      if (identity.clientEventId === item.client_event_id) {
        switchActorAfterOwnerClear?.();
      }
    });
    mockTombstoneByClientEventId.mockImplementation(async () => {
      tombstoneGate.signal();
      await tombstoneGate.promise;
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const port = renderHook(() => useQuickLogMutationPort(), { wrapper });

    await waitFor(() => expect(mockTombstoneByClientEventId).toHaveBeenCalledTimes(1));
    let activeCareContext: typeof deletingActorContext | typeof displayCreatorContext
      = deletingActorContext;
    const cached = renderHook(() => useQuickLogCachedRows(activeCareContext), { wrapper });
    expect(cached.result.current).toEqual([sentinel]);
    switchActorAfterOwnerClear = () => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: displayCreatorId },
      };
      activeCareContext = displayCreatorContext;
      act(() => {
        port.rerender(undefined);
        cached.rerender(undefined);
      });
    };

    tombstoneGate.resolve();
    await waitFor(() => expect(clearOwner).toHaveBeenCalledWith(queryClient, {
      clientEventId: item.client_event_id,
      householdId: item.household_id,
      puppyId: item.puppy_id,
    }));
    await act(async () => flushHostMicrotasks());
    const cachedAfterSwitch = queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineRootKey);

    expect({
      cacheContainedSentinelWhenOwnerCleared,
      cachedAfterSwitch,
      displayCreatorRenderedIds: cached.result.current.map((row) => row.client_event_id),
      displayCreatorSawPrivateSentinel:
        JSON.stringify(cached.result.current).includes('Synthetic automatic sentinel'),
      retainedQueueItem: harness.items.get(item.client_event_id),
    }).toEqual({
      cacheContainedSentinelWhenOwnerCleared: false,
      cachedAfterSwitch: [],
      displayCreatorRenderedIds: [],
      displayCreatorSawPrivateSentinel: false,
      retainedQueueItem: undefined,
    });

    cached.unmount();
    port.unmount();
    queryClient.clear();
  });

  it.each([
    {
      category: null,
      label: 'accepted',
      retryCount: 0,
      targetClientEventId: 'evt_00000000-0000-4000-8000-000000000741',
    },
    {
      category: 'network_unavailable',
      label: 'retryable failure',
      retryCount: 1,
      targetClientEventId: 'evt_00000000-0000-4000-8000-000000000751',
    },
    {
      category: 'permission_denied',
      label: 'permanent failure',
      retryCount: 2,
      targetClientEventId: 'evt_00000000-0000-4000-8000-000000000761',
    },
  ] as const)(
    'AC-P3-ACTOR-7 cold-hydrates $label intent actor A with authoritative display creator B',
    async ({ category, retryCount, targetClientEventId }) => {
      const deletingActorId = mockPrimaryActorId;
      const displayCreatorId = mockSecondaryActorId;
      const item = createRecoveryQueueItem({
        client_event_id: targetClientEventId,
        created_by: deletingActorId,
        event_type: 'observation',
        last_error_category: category,
        payload_version: 2,
        payload: {
          title: 'Synthetic cold sentinel title',
          note: 'Synthetic cold sentinel note',
        },
        retry_after_at: '2099-01-01T00:00:00.000Z',
        retry_count: retryCount,
        state: 'deleted_before_sync',
        updated_at: '2026-07-16T12:00:05.000Z',
      });
      const durableDisplayRow = {
        ...createServerRow({
          ...item,
          created_at: '2026-07-16T12:00:02.000Z',
          created_by: displayCreatorId,
          updated_at: '2026-07-16T12:00:02.000Z',
        }),
        id: targetClientEventId.slice('evt_'.length),
      };
      const authoritativeSentinel: QuickLogCachedEventRow = {
        ...durableDisplayRow,
        localSync: {
          state: 'deleted_before_sync',
          category,
          retryCount,
        },
      };
      const authoritativeSentinelBytes = JSON.stringify(authoritativeSentinel);
      const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
      const queryClient = createPuppyPlanQueryClient();
      const mutationWrapper = createQueryClientWrapper(queryClient);
      const readWrapper = createPlainQueryClientWrapper(queryClient);
      const timelineRootKey = queryKeys.events.timelineRoot(item.household_id, item.puppy_id);
      const canonicalTimelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
      const canonicalDayTimelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id, {
        from: '2026-07-16',
        to: '2026-07-16',
      });
      const deletingActorContext = {
        authState: 'authenticated',
        householdId: item.household_id,
        householdRole: 'owner',
        puppyId: item.puppy_id,
        todayDate: '2026-07-16',
        userId: deletingActorId,
      } as const;
      const displayCreatorContext = {
        ...deletingActorContext,
        userId: displayCreatorId,
      } as const;

      mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
      mockListEvents.mockResolvedValue([durableDisplayRow]);
      const port = renderHook(() => useQuickLogMutationPort(), { wrapper: mutationWrapper });
      await waitFor(() => expect(port.result.current.status).toBe('ready'));
      const readTargetRows = (queryKey: readonly unknown[]): readonly QuickLogCachedEventRow[] =>
        (queryClient.getQueryData<QuickLogCachedEventRow[]>(queryKey) ?? [])
          .filter((row) => row.client_event_id === item.client_event_id);
      const seededSyntheticCopies = {
        canonicalDay: readTargetRows(canonicalDayTimelineKey).map((row) => ({
          createdBy: row.created_by,
          updatedAt: row.updated_at,
        })),
        canonicalUnfiltered: readTargetRows(canonicalTimelineKey).map((row) => ({
          createdBy: row.created_by,
          updatedAt: row.updated_at,
        })),
        root: readTargetRows(timelineRootKey).map((row) => ({
          createdBy: row.created_by,
          updatedAt: row.updated_at,
        })),
      };
      const timeline = renderHook(
        () => useQuickLogTimelineRows(deletingActorContext, {
          from: '2026-07-16',
          to: '2026-07-16',
        }),
        { wrapper: readWrapper },
      );
      await waitFor(() => expect(timeline.result.current.status).toBe('ready'));
      await act(async () => {
        await queryClient.refetchQueries({ exact: true, queryKey: canonicalDayTimelineKey });
      });
      let activeCareContext: typeof deletingActorContext | typeof displayCreatorContext
        = deletingActorContext;
      const cached = renderHook(
        () => useQuickLogCachedRows(activeCareContext),
        { wrapper: readWrapper },
      );
      const deletingActorRows = cached.result.current
        .filter((row) => row.client_event_id === item.client_event_id)
        .map((row) => JSON.stringify(row));
      expect(mockOpenQuickLogQueueStorage).toHaveBeenCalledTimes(1);
      activeCareContext = displayCreatorContext;
      cached.rerender(undefined);
      const displayCreatorIds = cached.result.current.map((row) => row.client_event_id);
      const matchingTimelineRows = queryClient
        .getQueriesData<readonly QuickLogCachedEventRow[]>({ queryKey: timelineRootKey })
        .flatMap(([, rows]) => rows ?? [])
        .filter((row) => row.client_event_id === item.client_event_id);

      expect({
        cacheCopyBytes: {
          canonicalDay: readTargetRows(canonicalDayTimelineKey).map((row) => JSON.stringify(row)),
          canonicalUnfiltered: readTargetRows(canonicalTimelineKey)
            .map((row) => JSON.stringify(row)),
          root: readTargetRows(timelineRootKey).map((row) => JSON.stringify(row)),
        },
        deletingActorRows,
        displayCreatorIds,
        seededSyntheticCopies,
        syntheticDisplayCopies: matchingTimelineRows
          .filter((row) => row.created_by === deletingActorId)
          .map((row) => row.client_event_id),
        timelineIds: timeline.result.current.rows.map((row) => row.client_event_id),
      }).toEqual({
        cacheCopyBytes: {
          canonicalDay: [],
          canonicalUnfiltered: [authoritativeSentinelBytes],
          root: [authoritativeSentinelBytes],
        },
        deletingActorRows: [authoritativeSentinelBytes],
        displayCreatorIds: [],
        seededSyntheticCopies: {
          canonicalDay: [{
            createdBy: deletingActorId,
            updatedAt: item.updated_at,
          }],
          canonicalUnfiltered: [{
            createdBy: deletingActorId,
            updatedAt: item.updated_at,
          }],
          root: [{
            createdBy: deletingActorId,
            updatedAt: item.updated_at,
          }],
        },
        syntheticDisplayCopies: [],
        timelineIds: [],
      });

      cached.unmount();
      timeline.unmount();
      port.unmount();
      queryClient.clear();
    },
  );

  it('AC-P3-ACTOR-7 isolates the same composite intent identity between QueryClients', () => {
    const deletingActorId = mockPrimaryActorId;
    const displayCreatorId = mockSecondaryActorId;
    const firstQueryClient = createPuppyPlanQueryClient();
    const secondQueryClient = createPuppyPlanQueryClient();
    const row: QuickLogCachedEventRow = {
      ...createServerRow(createRecoveryQueueItem({
        client_event_id: 'evt_00000000-0000-4000-8000-000000000771',
        created_by: displayCreatorId,
      })),
      localSync: {
        state: 'deleted_before_sync',
        category: 'network_unavailable',
        retryCount: 1,
      },
    };

    quickLogActorVisibility.setQuickLogIntentOwner(firstQueryClient, {
      actorId: deletingActorId,
      clientEventId: row.client_event_id,
      householdId: row.household_id,
      puppyId: row.puppy_id,
    });

    expect({
      firstOwner: quickLogActorVisibility.getQuickLogIntentOwner(firstQueryClient, row),
      firstVisibleToA: quickLogActorVisibility.isQuickLogRowVisibleToActor(
        firstQueryClient,
        row,
        deletingActorId,
      ),
      firstVisibleToB: quickLogActorVisibility.isQuickLogRowVisibleToActor(
        firstQueryClient,
        row,
        displayCreatorId,
      ),
      secondOwner: quickLogActorVisibility.getQuickLogIntentOwner(secondQueryClient, row),
      secondVisibleToA: quickLogActorVisibility.isQuickLogRowVisibleToActor(
        secondQueryClient,
        row,
        deletingActorId,
      ),
      secondVisibleToB: quickLogActorVisibility.isQuickLogRowVisibleToActor(
        secondQueryClient,
        row,
        displayCreatorId,
      ),
    }).toEqual({
      firstOwner: deletingActorId,
      firstVisibleToA: true,
      firstVisibleToB: false,
      secondOwner: displayCreatorId,
      secondVisibleToA: false,
      secondVisibleToB: true,
    });

    firstQueryClient.clear();
    secondQueryClient.clear();
  });

  it('AC-P1-RECOVERY-10 keeps a newer delete intent when an older automatic replay finalizer resumes', async () => {
    const intervalSpy = jest.spyOn(global, 'setInterval');
    const resolveGate = createSignaledDeferred();
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000294',
      state: 'pending_local',
    });
    const harness = createRecoveryQueueHarness([item], {
      maxClaims: 1,
      resolveGate,
    });
    mockInsertEvent.mockResolvedValue(createServerRow(item));
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await resolveGate.signaled;
    expect(harness.items.get(item.client_event_id)?.state).toBe('server_confirmed');

    await expect(hook.result.current.mutation?.deleteSynced({
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    })).resolves.toBeUndefined();
    expect(harness.items.get(item.client_event_id)?.state).toBe('deleted_before_sync');

    resolveGate.resolve();
    await act(async () => flushHostMicrotasks());
    const retainedAfterOldFinalizer = harness.items.get(item.client_event_id);
    const cacheAfterOldFinalizer = queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey);
    if (retainedAfterOldFinalizer !== undefined) {
      harness.items.set(item.client_event_id, createStoredQuickLogQueueItem({
        ...retainedAfterOldFinalizer,
        retry_after_at: '2000-01-01T00:00:00.000Z',
      }));
    }
    mockTombstoneByClientEventId.mockResolvedValue(undefined);
    act(() => {
      const timerCallback = intervalSpy.mock.calls[0]?.[0];
      if (typeof timerCallback === 'function') timerCallback();
    });
    await act(async () => flushHostMicrotasks());
    const tombstoneCalls = [...mockTombstoneByClientEventId.mock.calls];
    const insertCalls = [...mockInsertEvent.mock.calls];
    hook.unmount();
    queryClient.clear();

    expect(retainedAfterOldFinalizer).toMatchObject({ state: 'deleted_before_sync' });
    expect(cacheAfterOldFinalizer).toEqual([
      expect.objectContaining({
        client_event_id: item.client_event_id,
        localSync: expect.objectContaining({ state: 'deleted_before_sync' }),
      }),
    ]);
    expect(tombstoneCalls).toEqual([[
      expect.objectContaining({
        clientEventId: item.client_event_id,
        householdId: item.household_id,
      }),
    ]]);
    expect(insertCalls).toHaveLength(1);
  });

  it.each(['open', 'list'] as const)(
    'AC-P1-RECOVERY-10 keeps a cross-caregiver delete sentinel when a second same-actor port has a %s failure',
    async (failureStage) => {
      const otherCaregiverId = '00000000-0000-4000-8000-000000000295';
      const item = createRecoveryQueueItem({
        client_event_id: `evt_00000000-0000-4000-8000-00000000029${failureStage === 'open' ? '6' : '7'}`,
        created_by: otherCaregiverId,
        state: 'server_confirmed',
      });
      const harness = createRecoveryQueueHarness([], { claimEnabled: false });
      const queryClient = createTestQueryClient();
      const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
      queryClient.setQueryData(timelineKey, [createServerRow(item)]);
      mockOpenQuickLogQueueStorage.mockResolvedValueOnce(harness.storage);
      const diaryPort = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(queryClient),
      });

      await waitFor(() => expect(diaryPort.result.current.status).toBe('ready'));
      await diaryPort.result.current.mutation?.deleteSynced({
        clientEventId: item.client_event_id,
        eventType: item.event_type,
        householdId: item.household_id,
        puppyId: item.puppy_id,
        todayDate: '2026-07-16',
      });
      const retained = harness.items.get(item.client_event_id);
      if (retained === undefined) throw new Error('Expected retained cross-caregiver delete');
      harness.items.set(item.client_event_id, createStoredQuickLogQueueItem({
        ...retained,
        last_error_category: 'network_unavailable',
        retry_after_at: '2099-07-16T12:00:00.000Z',
        retry_count: 1,
      }));

      if (failureStage === 'open') {
        mockOpenQuickLogQueueStorage.mockRejectedValueOnce(new Error('Synthetic second open failure'));
      } else {
        mockOpenQuickLogQueueStorage.mockResolvedValueOnce({
          ...harness.storage,
          list: jest.fn(async () => {
            throw new Error('Synthetic second list failure');
          }),
        });
      }
      const sheetPort = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(queryClient),
      });

      await waitFor(() => expect(sheetPort.result.current.status).toBe('unavailable'));
      const retainedCache = queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey);
      const retainedIntent = harness.items.get(item.client_event_id);
      sheetPort.unmount();
      diaryPort.unmount();
      queryClient.clear();

      expect(retainedCache).toEqual([
        expect.objectContaining({
          client_event_id: item.client_event_id,
          created_by: otherCaregiverId,
          localSync: expect.objectContaining({ state: 'deleted_before_sync' }),
        }),
      ]);
      expect(retainedIntent).toMatchObject({
        created_by: mockPrimaryActorId,
        state: 'deleted_before_sync',
      });
    },
  );

  it('AC-P1-RECOVERY-10 preserves a cross-caregiver display row through successful same-actor hydration and local Undo', async () => {
    const otherCaregiverId = '00000000-0000-4000-8000-000000000298';
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000299',
      created_by: otherCaregiverId,
      state: 'server_confirmed',
    });
    const expectedDisplayRow: QuickLogCachedEventRow = {
      ...createServerRow(item),
      id: '00000000-0000-4000-8000-000000000300',
      payload: { amount: 'snack' },
      version: 7,
      created_at: '2026-07-16T11:59:58.000Z',
      updated_at: '2026-07-16T11:59:59.000Z',
    };
    const secondHydrationGate = createDeferred();
    const harness = createRecoveryQueueHarness([], {
      claimEnabled: false,
      listGate: { call: 2, promise: secondHydrationGate.promise },
    });
    const removeIfState = createHarnessAtomicRemoveIfState(harness);
    const storage: QuickLogQueueStorage = { ...harness.storage, removeIfState };
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData<QuickLogCachedEventRow[]>(timelineKey, [{
      ...expectedDisplayRow,
      payload: { amount: 'snack' },
    }]);
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const diaryPort = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const request = {
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    } as const;

    await waitFor(() => expect(diaryPort.result.current.status).toBe('ready'));
    await expect(diaryPort.result.current.mutation?.deleteSynced(request)).resolves.toBeUndefined();
    const expectedSentinel = {
      ...expectedDisplayRow,
      localSync: {
        state: 'deleted_before_sync' as const,
        category: null,
        retryCount: 0,
      },
    };
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey))
      .toEqual([expectedSentinel]);
    expect(harness.items.get(item.client_event_id)).toMatchObject({
      created_by: mockPrimaryActorId,
      state: 'deleted_before_sync',
    });

    const sheetPort = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    await waitFor(() => expect(harness.list).toHaveBeenCalledTimes(2));
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey))
      .toEqual([expectedSentinel]);

    await act(async () => {
      secondHydrationGate.resolve();
      await flushHostMicrotasks();
    });
    await waitFor(() => expect(sheetPort.result.current.status).toBe('ready'));
    const cacheAfterSuccessfulHydration = queryClient
      .getQueryData<QuickLogCachedEventRow[]>(timelineKey);

    await expect(sheetPort.result.current.mutation?.restoreSynced(request)).resolves.toBeUndefined();
    const cacheAfterUndo = queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey);
    const retainedAfterUndo = harness.items.get(item.client_event_id);
    sheetPort.unmount();
    diaryPort.unmount();
    queryClient.clear();

    expect(retainedAfterUndo).toBeUndefined();
    expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();
    expect(mockRestoreByClientEventId).not.toHaveBeenCalled();
    expect(mockInsertEvent).not.toHaveBeenCalled();
    expect(removeIfState).toHaveBeenCalledWith(
      item.client_event_id,
      'deleted_before_sync',
      { expectedCreatedBy: mockPrimaryActorId },
    );
    expect({ cacheAfterSuccessfulHydration, cacheAfterUndo }).toEqual({
      cacheAfterSuccessfulHydration: [expectedSentinel],
      cacheAfterUndo: [expectedDisplayRow],
    });
  });

  it('AC-P1-RECOVERY-10 scopes delete-intent owners while a second account scrubs local rows', async () => {
    const sharedClientEventId = 'evt_00000000-0000-4000-8000-000000000310';
    const secondActorId = '00000000-0000-4000-8000-000000000311';
    const firstItem = createRecoveryQueueItem({
      client_event_id: sharedClientEventId,
      household_id: '00000000-0000-4000-8000-000000000312',
      puppy_id: '00000000-0000-4000-8000-000000000313',
      created_by: mockPrimaryActorId,
      state: 'deleted_before_sync',
      retry_after_at: '2099-07-16T12:00:00.000Z',
    });
    const secondItem = createRecoveryQueueItem({
      client_event_id: sharedClientEventId,
      household_id: '00000000-0000-4000-8000-000000000314',
      puppy_id: '00000000-0000-4000-8000-000000000315',
      created_by: secondActorId,
      state: 'deleted_before_sync',
      retry_after_at: '2099-07-16T12:00:00.000Z',
    });
    const firstKey = queryKeys.events.timeline(firstItem.household_id, firstItem.puppy_id);
    const secondKey = queryKeys.events.timeline(secondItem.household_id, secondItem.puppy_id);
    const firstDisplayRow: QuickLogCachedEventRow = {
      ...createServerRow(firstItem),
      created_by: '00000000-0000-4000-8000-000000000316',
      localSync: { state: 'deleted_before_sync', category: null, retryCount: 0 },
    };
    const secondDisplayRow: QuickLogCachedEventRow = {
      ...createServerRow(secondItem),
      created_by: '00000000-0000-4000-8000-000000000317',
      localSync: { state: 'deleted_before_sync', category: null, retryCount: 0 },
    };
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(secondKey, [secondDisplayRow]);
    queryClient.setQueryData(firstKey, [firstDisplayRow]);

    replayQuickLogQueueItemToCache({
      item: secondItem,
      queryClient,
      todayDate: '2026-07-16',
    });
    replayQuickLogQueueItemToCache({
      item: firstItem,
      queryClient,
      todayDate: '2026-07-16',
    });

    const listGate = createDeferred();
    const secondHarness = createRecoveryQueueHarness([], {
      claimEnabled: false,
      listGate: { call: 1, promise: listGate.promise },
    });
    mockAuthState.current = {
      status: 'signedIn',
      user: { id: secondActorId },
    };
    mockOpenQuickLogQueueStorage.mockResolvedValue(secondHarness.storage);
    const secondPort = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(secondHarness.list).toHaveBeenCalledTimes(1));
    const secondRowsBeforeHydration = queryClient
      .getQueryData<QuickLogCachedEventRow[]>(secondKey);
    const firstRowsBeforeHydration = queryClient
      .getQueryData<QuickLogCachedEventRow[]>(firstKey);
    await act(async () => {
      listGate.resolve();
      await flushHostMicrotasks();
    });
    await waitFor(() => expect(secondPort.result.current.status).toBe('ready'));
    secondPort.unmount();
    queryClient.clear();

    expect(firstRowsBeforeHydration).toEqual([]);
    expect(secondRowsBeforeHydration).toEqual([secondDisplayRow]);
  });

  it('AC-P1-RECOVERY-10 clears one scoped intent owner without erasing another root owner', async () => {
    const sharedClientEventId = 'evt_00000000-0000-4000-8000-000000000320';
    const secondActorId = '00000000-0000-4000-8000-000000000321';
    const firstItem = createRecoveryQueueItem({
      client_event_id: sharedClientEventId,
      household_id: '00000000-0000-4000-8000-000000000322',
      puppy_id: '00000000-0000-4000-8000-000000000323',
      created_by: mockPrimaryActorId,
      state: 'deleted_before_sync',
      retry_after_at: '2099-07-16T12:00:00.000Z',
    });
    const secondItem = createRecoveryQueueItem({
      client_event_id: sharedClientEventId,
      household_id: '00000000-0000-4000-8000-000000000324',
      puppy_id: '00000000-0000-4000-8000-000000000325',
      created_by: secondActorId,
      state: 'deleted_before_sync',
      retry_after_at: '2099-07-16T12:00:00.000Z',
    });
    const firstHarness = createRecoveryQueueHarness([firstItem], { claimEnabled: false });
    const secondHarness = createRecoveryQueueHarness([], { claimEnabled: false });
    const queryClient = createTestQueryClient();
    const firstKey = queryKeys.events.timeline(firstItem.household_id, firstItem.puppy_id);
    const secondKey = queryKeys.events.timeline(secondItem.household_id, secondItem.puppy_id);
    const firstDisplayRow: QuickLogCachedEventRow = {
      ...createServerRow(firstItem),
      created_by: '00000000-0000-4000-8000-000000000326',
      localSync: { state: 'deleted_before_sync', category: null, retryCount: 0 },
    };
    const secondDisplayRow: QuickLogCachedEventRow = {
      ...createServerRow(secondItem),
      created_by: '00000000-0000-4000-8000-000000000327',
      localSync: { state: 'deleted_before_sync', category: null, retryCount: 0 },
    };
    queryClient.setQueryData(firstKey, [firstDisplayRow]);
    queryClient.setQueryData(secondKey, [secondDisplayRow]);
    replayQuickLogQueueItemToCache({
      item: firstItem,
      queryClient,
      todayDate: '2026-07-16',
    });
    replayQuickLogQueueItemToCache({
      item: secondItem,
      queryClient,
      todayDate: '2026-07-16',
    });

    await restoreSyncedQuickLogEvent({
      clientEventId: firstItem.client_event_id,
      eventType: firstItem.event_type,
      householdId: firstItem.household_id,
      puppyId: firstItem.puppy_id,
      queryClient,
      queueRef: { current: firstHarness.storage },
      todayDate: '2026-07-16',
    });

    mockAuthState.current = {
      status: 'signedIn',
      user: { id: secondActorId },
    };
    mockOpenQuickLogQueueStorage.mockResolvedValue(secondHarness.storage);
    const secondPort = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    await waitFor(() => expect(secondPort.result.current.status).toBe('ready'));
    const secondRowsAfterSetup = queryClient
      .getQueryData<QuickLogCachedEventRow[]>(secondKey);
    secondPort.unmount();
    queryClient.clear();

    expect(mockRestoreByClientEventId).not.toHaveBeenCalled();
    expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();
    expect(secondRowsAfterSetup).toEqual([secondDisplayRow]);
  });

  it.each([
    {
      label: 'version with loser inserted first',
      first: { id: '00000000-0000-4000-8000-000000000331', version: 8, updated_at: '2026-07-16T12:00:09.000Z' },
      second: { id: '00000000-0000-4000-8000-000000000332', version: 9, updated_at: '2026-07-16T12:00:01.000Z' },
      winner: 'second',
    },
    {
      label: 'version with winner inserted first',
      first: { id: '00000000-0000-4000-8000-000000000332', version: 9, updated_at: '2026-07-16T12:00:01.000Z' },
      second: { id: '00000000-0000-4000-8000-000000000331', version: 8, updated_at: '2026-07-16T12:00:09.000Z' },
      winner: 'first',
    },
    {
      label: 'updated_at with loser inserted first',
      first: { id: '00000000-0000-4000-8000-000000000333', version: 9, updated_at: '2026-07-16T12:00:01.000Z' },
      second: { id: '00000000-0000-4000-8000-000000000334', version: 9, updated_at: '2026-07-16T12:00:09.000Z' },
      winner: 'second',
    },
    {
      label: 'updated_at with winner inserted first',
      first: { id: '00000000-0000-4000-8000-000000000334', version: 9, updated_at: '2026-07-16T12:00:09.000Z' },
      second: { id: '00000000-0000-4000-8000-000000000333', version: 9, updated_at: '2026-07-16T12:00:01.000Z' },
      winner: 'first',
    },
    {
      label: 'chronological offset with loser inserted first',
      first: { id: '00000000-0000-4000-8000-000000000341', version: 9, updated_at: '2026-07-16T12:00:00+02:00' },
      second: { id: '00000000-0000-4000-8000-000000000342', version: 9, updated_at: '2026-07-16T11:00:00Z' },
      winner: 'second',
    },
    {
      label: 'chronological offset with winner inserted first',
      first: { id: '00000000-0000-4000-8000-000000000342', version: 9, updated_at: '2026-07-16T11:00:00Z' },
      second: { id: '00000000-0000-4000-8000-000000000341', version: 9, updated_at: '2026-07-16T12:00:00+02:00' },
      winner: 'first',
    },
    {
      label: 'equivalent timestamp representation with loser inserted first',
      first: { id: '00000000-0000-4000-8000-000000000343', version: 9, updated_at: '2026-07-16T12:00:00Z' },
      second: { id: '00000000-0000-4000-8000-000000000344', version: 9, updated_at: '2026-07-16T12:00:00+00:00' },
      winner: 'second',
    },
    {
      label: 'equivalent timestamp representation with winner inserted first',
      first: { id: '00000000-0000-4000-8000-000000000344', version: 9, updated_at: '2026-07-16T12:00:00+00:00' },
      second: { id: '00000000-0000-4000-8000-000000000343', version: 9, updated_at: '2026-07-16T12:00:00Z' },
      winner: 'first',
    },
    {
      label: 'stable id with loser inserted first',
      first: { id: '00000000-0000-4000-8000-000000000335', version: 9, updated_at: '2026-07-16T12:00:09.000Z' },
      second: { id: '00000000-0000-4000-8000-000000000336', version: 9, updated_at: '2026-07-16T12:00:09.000Z' },
      winner: 'second',
    },
    {
      label: 'stable id with winner inserted first',
      first: { id: '00000000-0000-4000-8000-000000000336', version: 9, updated_at: '2026-07-16T12:00:09.000Z' },
      second: { id: '00000000-0000-4000-8000-000000000335', version: 9, updated_at: '2026-07-16T12:00:09.000Z' },
      winner: 'first',
    },
  ] as const)(
    'AC-P1-RECOVERY-10 preserves the authoritative delete snapshot by $label',
    async ({ first, second, winner }) => {
      const item = createRecoveryQueueItem({
        client_event_id: 'evt_00000000-0000-4000-8000-000000000330',
        state: 'server_confirmed',
      });
      const harness = createRecoveryQueueHarness([], { claimEnabled: false });
      const removeIfState = createHarnessAtomicRemoveIfState(harness);
      const storage: QuickLogQueueStorage = { ...harness.storage, removeIfState };
      const queryClient = createTestQueryClient();
      const timelineRootKey = queryKeys.events.timelineRoot(item.household_id, item.puppy_id);
      const bootstrapKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
      queryClient.setQueryData(bootstrapKey, [createServerRow(item)]);
      mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
      const diaryPort = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(queryClient),
      });
      const request = {
        clientEventId: item.client_event_id,
        eventType: item.event_type,
        householdId: item.household_id,
        puppyId: item.puppy_id,
        todayDate: '2026-07-16',
      } as const;

      await waitFor(() => expect(diaryPort.result.current.status).toBe('ready'));
      await diaryPort.result.current.mutation?.deleteSynced(request);
      const retained = harness.items.get(item.client_event_id);
      if (retained === undefined) throw new Error('Expected retained delete intent');
      harness.items.set(item.client_event_id, createStoredQuickLogQueueItem({
        ...retained,
        retry_after_at: '2099-07-16T12:00:00.000Z',
      }));

      queryClient.removeQueries({ queryKey: timelineRootKey });
      const ordinaryRow: QuickLogCachedEventRow = {
        ...createServerRow(item),
        id: '00000000-0000-4000-8000-000000000339',
        version: 99,
        updated_at: '2099-07-16T12:00:00.000Z',
      };
      const firstSentinel: QuickLogCachedEventRow = {
        ...createServerRow(item),
        ...first,
        localSync: { state: 'deleted_before_sync', category: null, retryCount: 0 },
      };
      const secondSentinel: QuickLogCachedEventRow = {
        ...createServerRow(item),
        ...second,
        localSync: { state: 'deleted_before_sync', category: null, retryCount: 0 },
      };
      queryClient.setQueryData(bootstrapKey, [ordinaryRow]);
      queryClient.setQueryData(queryKeys.events.timeline(item.household_id, item.puppy_id, {
        from: '2026-07-16',
        to: '2026-07-16',
      }), [firstSentinel]);
      queryClient.setQueryData(queryKeys.events.timeline(item.household_id, item.puppy_id, {
        eventTypes: ['feeding'],
      }), [secondSentinel]);

      const sheetPort = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(queryClient),
      });
      await waitFor(() => expect(sheetPort.result.current.status).toBe('ready'));
      await expect(sheetPort.result.current.mutation?.restoreSynced(request)).resolves.toBeUndefined();
      const cacheAfterUndo = queryClient.getQueryData<QuickLogCachedEventRow[]>(bootstrapKey);
      const expectedSnapshot = winner === 'first' ? firstSentinel : secondSentinel;
      sheetPort.unmount();
      diaryPort.unmount();
      queryClient.clear();

      expect(mockRestoreByClientEventId).not.toHaveBeenCalled();
      expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();
      expect(removeIfState).toHaveBeenCalledWith(
        item.client_event_id,
        'deleted_before_sync',
        { expectedCreatedBy: mockPrimaryActorId },
      );
      expect(cacheAfterUndo).toEqual([{
        ...expectedSnapshot,
        localSync: undefined,
      }]);
    },
  );

  it('AC-P1-RECOVERY-10 leaves the original Done cache intact when delete-intent persistence fails', async () => {
    const persistenceFailure = new Error('Synthetic delete-intent persistence failure');
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000262',
      state: 'server_confirmed',
    });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], {
      claimEnabled: false,
      deleteIntentError: persistenceFailure,
    });
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await expect(hook.result.current.mutation?.deleteSynced({
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    })).rejects.toBe(persistenceFailure);
    expect(queryClient.getQueryData(timelineKey)).toEqual([row]);
    expect(harness.items.has(item.client_event_id)).toBe(false);
    expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P1-RECOVERY-10 leaves the original Done cache untouched when queue open is unavailable', async () => {
    const openFailure = new Error('Synthetic queue open failure');
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000271',
      state: 'server_confirmed',
    });
    const row = createServerRow(item);
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    mockOpenQuickLogQueueStorage.mockRejectedValue(openFailure);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('unavailable'));
    expect(hook.result.current.mutation).toBeUndefined();
    expect(queryClient.getQueryData(timelineKey)).toEqual([row]);
    expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'open' }),
    );
    expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(item.client_event_id);
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P1-RECOVERY-10 drains actor-owned delete intents once through tombstone only', async () => {
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener;
      return { remove: jest.fn() };
    });
    const intervalSpy = jest.spyOn(global, 'setInterval');
    const activeItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000263',
      state: 'deleted_before_sync',
    });
    const otherActorItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000264',
      created_by: '00000000-0000-4000-8000-000000000265',
      state: 'deleted_before_sync',
    });
    const harness = createRecoveryQueueHarness([activeItem, otherActorItem], {
      claimEnabled: false,
    });
    const deleteGate = createDeferred();
    mockTombstoneByClientEventId.mockImplementationOnce(async () => {
      await deleteGate.promise;
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    try {
      await waitFor(() => expect(mockTombstoneByClientEventId).toHaveBeenCalledTimes(1));
      expect(mockTombstoneByClientEventId).toHaveBeenCalledWith({
        clientEventId: activeItem.client_event_id,
        deletedAt: expect.any(String),
        householdId: activeItem.household_id,
      });
      act(() => {
        appStateListener?.('background');
        appStateListener?.('active');
        const timerCallback = intervalSpy.mock.calls[0]?.[0];
        if (typeof timerCallback === 'function') timerCallback();
      });
      await act(async () => Promise.resolve());
      expect(mockTombstoneByClientEventId).toHaveBeenCalledTimes(1);
      expect(mockInsertEvent).not.toHaveBeenCalled();

      deleteGate.resolve();
      await waitFor(() => expect(harness.remove).toHaveBeenCalledWith(
        activeItem.client_event_id,
      ));
      expect(harness.items.has(activeItem.client_event_id)).toBe(false);
      expect(harness.items.has(otherActorItem.client_event_id)).toBe(true);
      expect(JSON.stringify(mockTombstoneByClientEventId.mock.calls))
        .not.toContain(otherActorItem.client_event_id);
    } finally {
      deleteGate.resolve();
      hook.unmount();
      queryClient.clear();
    }
  });

  it('AC-P1-RECOVERY-10 safely retries the idempotent tombstone after local finalize fails', async () => {
    const intervalSpy = jest.spyOn(global, 'setInterval');
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000269',
      state: 'deleted_before_sync',
    });
    const harness = createRecoveryQueueHarness([item], {
      claimEnabled: false,
      removeErrorOnce: new Error('Synthetic local finalize failure'),
    });
    mockTombstoneByClientEventId.mockResolvedValue(undefined);
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'replay_finalize' }),
    ));
    expect(harness.items.has(item.client_event_id)).toBe(true);
    expect(mockTombstoneByClientEventId).toHaveBeenCalledTimes(1);
    expect(harness.retainDeletedBeforeSync).toHaveBeenCalledWith(
      item.client_event_id,
      expect.objectContaining({
        retryAfterAt: expect.any(String),
      }),
    );
    const retainedAfterFinalizeFailure = harness.items.get(item.client_event_id);
    expect(Date.parse(retainedAfterFinalizeFailure?.retry_after_at ?? ''))
      .toBeGreaterThan(Date.parse(retainedAfterFinalizeFailure?.updated_at ?? ''));

    act(() => {
      const timerCallback = intervalSpy.mock.calls[0]?.[0];
      if (typeof timerCallback === 'function') timerCallback();
    });
    await act(async () => flushHostMicrotasks());
    expect(mockTombstoneByClientEventId).toHaveBeenCalledTimes(1);

    const dueItem = harness.items.get(item.client_event_id);
    if (dueItem === undefined) throw new Error('Expected retained delete intent');
    harness.items.set(item.client_event_id, createStoredQuickLogQueueItem({
      ...dueItem,
      retry_after_at: '2000-01-01T00:00:00.000Z',
    }));
    act(() => {
      const timerCallback = intervalSpy.mock.calls[0]?.[0];
      if (typeof timerCallback === 'function') timerCallback();
    });
    await waitFor(() => expect(mockTombstoneByClientEventId).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(harness.items.has(item.client_event_id)).toBe(false));
    expect(mockInsertEvent).not.toHaveBeenCalled();
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P1-RECOVERY-10 cancels an offline delete intent locally on Undo without a restore write', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000266',
      state: 'server_confirmed',
    });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([], { claimEnabled: false });
    const removeIfState = createHarnessAtomicRemoveIfState(harness);
    const storage: QuickLogQueueStorage = { ...harness.storage, removeIfState };
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [row]);
    mockOpenQuickLogQueueStorage.mockResolvedValue(storage);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const request = {
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    } as const;

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await expect(hook.result.current.mutation?.deleteSynced(request)).resolves.toBeUndefined();
    await expect(hook.result.current.mutation?.restoreSynced(request)).resolves.toBeUndefined();

    expect(harness.items.has(item.client_event_id)).toBe(false);
    expect(queryClient.getQueryData(timelineKey)).toEqual([row]);
    expect(mockTombstoneByClientEventId).not.toHaveBeenCalled();
    expect(mockRestoreByClientEventId).not.toHaveBeenCalled();
    expect(removeIfState).toHaveBeenCalledWith(
      item.client_event_id,
      'deleted_before_sync',
      { expectedCreatedBy: mockPrimaryActorId },
    );
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P1-RECOVERY-10 serializes Undo at the recovery claim boundary, then rechecks before restoring', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000267',
      state: 'deleted_before_sync',
    });
    const row = createServerRow(item);
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.events.timeline(item.household_id, item.puppy_id), [row]);
    const deleteGate = createDeferred();
    mockTombstoneByClientEventId.mockImplementationOnce(async () => {
      await deleteGate.promise;
    });
    mockRestoreByClientEventId.mockResolvedValue(row);
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    const request = {
      clientEventId: item.client_event_id,
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    } as const;

    try {
      await waitFor(() => expect(mockTombstoneByClientEventId).toHaveBeenCalledTimes(1));
      const restoring = hook.result.current.mutation?.restoreSynced(request);
      await flushHostMicrotasks();
      expect(mockRestoreByClientEventId).not.toHaveBeenCalled();

      deleteGate.resolve();
      await expect(restoring).resolves.toBeUndefined();
      expect(mockRestoreByClientEventId).toHaveBeenCalledTimes(1);
      expect(harness.items.has(item.client_event_id)).toBe(false);
    } finally {
      deleteGate.resolve();
      hook.unmount();
      queryClient.clear();
    }
  });

  it('AC-P1-RECOVERY-10 manually retries a retained delete through tombstone only', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000270',
      state: 'deleted_before_sync',
      retry_count: 1,
      last_error_category: 'permission_denied',
      retry_after_at: '2099-07-16T12:00:00.000Z',
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    mockTombstoneByClientEventId.mockResolvedValue(undefined);
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    invalidateSpy.mockClear();
    act(() => {
      hook.result.current.mutation?.retry(item.client_event_id, 'manual_retry', 'today');
    });

    await waitFor(() => expect(mockTombstoneByClientEventId).toHaveBeenCalledWith({
      clientEventId: item.client_event_id,
      deletedAt: expect.any(String),
      householdId: item.household_id,
    }));
    await waitFor(() => expect(harness.items.has(item.client_event_id)).toBe(false));
    const affectedKeys = getQuickLogInvalidationKeys({
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: '2026-07-16',
    });
    for (const queryKey of affectedKeys) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
    }
    expect(mockInsertEvent).not.toHaveBeenCalled();
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-ACTOR-1 leaves the delete sentinel unchanged after the global tail when its actor switches before manual Retry', async () => {
    const blockingItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000298',
      state: 'pending_local',
    });
    const deleteItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000299',
      state: 'deleted_before_sync',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-16T12:00:00.000Z',
      retry_count: 1,
    });
    const insertGate = createSignaledDeferred();
    const harness = createRecoveryQueueHarness([blockingItem, deleteItem], { maxClaims: 1 });
    mockInsertEvent.mockImplementation(async () => {
      insertGate.signal();
      await insertGate.promise;
      return createServerRow(blockingItem);
    });
    mockTombstoneByClientEventId.mockResolvedValue(undefined);
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(deleteItem.household_id, deleteItem.puppy_id);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await insertGate.signaled;
    act(() => {
      hook.result.current.mutation?.retry(deleteItem.client_event_id, 'manual_retry', 'today');
    });
    const nextActorId = '00000000-0000-4000-8000-000000000300';
    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: nextActorId },
      };
      hook.rerender({});
    });
    await act(async () => {
      insertGate.resolve();
      await flushHostMicrotasks();
    });

    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: mockPrimaryActorId },
      };
      hook.rerender({});
    });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const tombstoneCalls = [...mockTombstoneByClientEventId.mock.calls];
    const retainCalls = [...harness.retainDeletedBeforeSync.mock.calls];
    const retainedIntent = harness.items.get(deleteItem.client_event_id);
    const restoredCache = queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey);
    const reports = [...mockCaptureException.mock.calls];
    hook.unmount();
    queryClient.clear();

    expect(tombstoneCalls).toEqual([]);
    expect(retainCalls).toEqual([]);
    expect(retainedIntent).toEqual(deleteItem);
    expect(reports).toEqual(expect.arrayContaining([[
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'manual_retry_actor_mismatch' }),
    ]]));
    expect(restoredCache).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          client_event_id: deleteItem.client_event_id,
          localSync: {
            category: deleteItem.last_error_category,
            retryCount: deleteItem.retry_count,
            state: 'deleted_before_sync',
          },
        }),
      ]),
    );
  });

  it.each(['initial', 'post-tail'] as const)(
    'AC-P1-RECOVERY-10 contains a %s retained-delete read failure with scrubbed reporting',
    async (failureStage) => {
      const privateMarker = `private-${failureStage}-delete-read-marker`;
      const item = createRecoveryQueueItem({
        client_event_id: failureStage === 'initial'
          ? 'evt_00000000-0000-4000-8000-000000000301'
          : 'evt_00000000-0000-4000-8000-000000000302',
        state: 'deleted_before_sync',
        last_error_category: 'network_unavailable',
        retry_after_at: '2099-07-16T12:00:00.000Z',
      });
      const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
      let readCount = 0;
      const queue = {
        ...harness.storage,
        getByClientEventId: jest.fn(async () => {
          readCount += 1;
          if (failureStage === 'initial' || readCount === 2) {
            throw new Error(privateMarker);
          }
          return item;
        }),
      };
      const captureException = jest.fn();
      const tombstone = jest.fn(async () => createServerRow(item));

      await expect(retryLocalQuickLogEvent({
        actorId: mockPrimaryActorId,
        clientEventId: item.client_event_id,
        events: {
          insertEvent: jest.fn(async () => createServerRow(item)),
          tombstoneByClientEventId: tombstone,
        },
        observability: { captureException },
        queryClient: createTestQueryClient(),
        queueRef: { current: queue },
        recoverySurface: 'manual_retry',
      })).resolves.toBeUndefined();

      expect(tombstone).not.toHaveBeenCalled();
      expect(harness.items.get(item.client_event_id)).toMatchObject({
        state: 'deleted_before_sync',
      });
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
        expect.objectContaining({ area: 'quick_log_queue' }),
      );
      expect(JSON.stringify(captureException.mock.calls)).not.toContain(privateMarker);
    },
  );

  it('AC-P1-RECOVERY-10 treats post-remove invalidation failure as converged delete success', async () => {
    const privateMarker = 'private-delete-invalidation-marker';
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000303',
      state: 'deleted_before_sync',
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-16T12:00:00.000Z',
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    queryClient.setQueryData(timelineKey, [{
      ...createServerRow(item),
      localSync: {
        category: item.last_error_category,
        retryCount: item.retry_count,
        state: 'deleted_before_sync' as const,
      },
    }]);
    jest.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(new Error(privateMarker));
    const captureException = jest.fn();

    await expect(retryLocalQuickLogEvent({
      actorId: mockPrimaryActorId,
      clientEventId: item.client_event_id,
      events: {
        insertEvent: jest.fn(async () => createServerRow(item)),
        tombstoneByClientEventId: jest.fn(async () => createServerRow(item)),
      },
      observability: { captureException },
      queryClient,
      queueRef: { current: harness.storage },
      recoverySurface: 'manual_retry',
    })).resolves.toBeUndefined();

    expect(harness.remove).toHaveBeenCalledWith(item.client_event_id);
    expect(harness.retainDeletedBeforeSync).not.toHaveBeenCalled();
    expect(harness.items.has(item.client_event_id)).toBe(false);
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey)).toEqual([]);
    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'manual_retry_invalidate' }),
    );
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(privateMarker);
    queryClient.clear();
  });

  it('AC-P1-RECOVERY-10 contains a second retained-delete persistence failure and reports only scrubbed context', async () => {
    const privateMarker = 'private-delete-retry-marker';
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000293',
      state: 'deleted_before_sync',
      retry_count: 1,
      last_error_category: 'network_unavailable',
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    const retainFailure = new Error(privateMarker);
    const captureException = jest.fn();
    const queue = {
      ...harness.storage,
      retainDeletedBeforeSync: jest.fn(async () => {
        throw retainFailure;
      }),
    };

    await expect(retryLocalQuickLogEvent({
      actorId: mockPrimaryActorId,
      clientEventId: item.client_event_id,
      events: {
        insertEvent: jest.fn(async () => createServerRow(item)),
        tombstoneByClientEventId: jest.fn(async () => {
          throw new Error(privateMarker);
        }),
      },
      observability: { captureException },
      queryClient: createTestQueryClient(),
      queueRef: { current: queue },
      recoverySurface: 'manual_retry',
      sourceSurface: 'today',
    })).resolves.toBeUndefined();

    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
      expect.objectContaining({ operation: 'manual_retry_state' }),
    );
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(privateMarker);
    expect(harness.items.has(item.client_event_id)).toBe(true);
  });

  it('AC-P1-RECOVERY-10 hydrates an actor-owned delete sentinel on cold launch without inserting it', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000268',
      state: 'deleted_before_sync',
      retry_count: 1,
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-16T12:00:00.000Z',
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(harness.list).toHaveBeenCalledWith({
      states: expect.arrayContaining(['deleted_before_sync']),
    });
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(
      queryKeys.events.timeline(item.household_id, item.puppy_id),
    )).toEqual([
      expect.objectContaining({
        client_event_id: item.client_event_id,
        created_by: mockPrimaryActorId,
        localSync: {
          state: 'deleted_before_sync',
          category: 'network_unavailable',
          retryCount: 1,
        },
      }),
    ]);
    expect(mockInsertEvent).not.toHaveBeenCalled();
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-LEGACY-1 quarantines actorless legacy rows before actor-scoped startup hydration and never caches or sends them', async () => {
    const legacy = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000330',
      created_by: null,
      state: 'failed_retryable',
      retry_count: 2,
      last_error_category: 'network_unavailable',
      retry_after_at: null,
    });
    const actorOwned = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000331',
      state: 'failed_permanent',
      retry_count: 1,
      last_error_category: 'permission_denied',
    });
    const harness = createRecoveryQueueHarness([legacy, actorOwned], {
      claimEnabled: false,
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    expect(harness.quarantineLegacyMissingActorItems).toHaveBeenCalledTimes(1);
    expect(harness.quarantineLegacyMissingActorItems.mock.invocationCallOrder[0])
      .toBeLessThan(harness.list.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER);
    expect(harness.items.get(legacy.client_event_id)).toEqual({
      ...legacy,
      state: 'failed_permanent',
      retry_count: legacy.retry_count + 1,
      last_error_category: 'missing_context',
      retry_after_at: null,
      updated_at: expect.any(String),
    });
    const rows = queryClient.getQueryData<QuickLogCachedEventRow[]>(
      queryKeys.events.timeline(actorOwned.household_id, actorOwned.puppy_id),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        client_event_id: actorOwned.client_event_id,
        created_by: mockPrimaryActorId,
      }),
    ]);
    expect(JSON.stringify(rows)).not.toContain(legacy.client_event_id);
    expect(mockInsertEvent).not.toHaveBeenCalled();
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P3-LEGACY-3 contains legacy quarantine failure inside scrubbed startup recovery and does not continue to actor hydration or network', async () => {
    const privateMarker = 'synthetic-private-legacy-quarantine-marker';
    const actorOwned = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000332',
    });
    const harness = createRecoveryQueueHarness([actorOwned], {
      claimEnabled: false,
      legacyQuarantineError: new Error(privateMarker),
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    try {
      await waitFor(() => expect(harness.quarantineLegacyMissingActorItems).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockCaptureException).toHaveBeenCalledTimes(1));

      expect(hook.result.current.status).not.toBe('ready');
      expect(harness.list).not.toHaveBeenCalled();
      expect(mockInsertEvent).not.toHaveBeenCalled();
      expect(queryClient.getQueriesData({ queryKey: ['events'] })).toEqual([]);
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
        expect.objectContaining({
          area: 'quick_log_queue',
          operation: expect.any(String),
        }),
      );
      expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(privateMarker);
    } finally {
      hook.unmount();
      queryClient.clear();
    }
  });

  it('AC-P1-RECOVERY-1 hydrates only the signed-in actor non-terminal rows with their retained states', async () => {
    const actorId = '00000000-0000-4000-8000-000000000203';
    const otherActorId = '00000000-0000-4000-8000-000000000213';
    const pending = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000211',
      created_by: actorId,
      state: 'pending_local',
    });
    const retryable = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000212',
      created_by: actorId,
      state: 'failed_retryable',
      retry_count: 2,
      last_error_category: 'network_unavailable',
      retry_after_at: '2026-07-16T12:30:00.000Z',
    });
    const permanent = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000214',
      created_by: actorId,
      state: 'failed_permanent',
      retry_count: 1,
      last_error_category: 'permission_denied',
    });
    const otherActor = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000215',
      created_by: otherActorId,
      state: 'pending_local',
    });
    const terminal = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000216',
      created_by: actorId,
      state: 'server_confirmed',
    });
    const harness = createRecoveryQueueHarness(
      [pending, retryable, permanent, otherActor, terminal],
      { claimEnabled: false },
    );
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    const rows = queryClient.getQueryData<QuickLogCachedEventRow[]>(
      queryKeys.events.timeline(
        pending.household_id,
        pending.puppy_id,
      ),
    );
    expect(rows?.map((row) => ({
      clientEventId: row.client_event_id,
      localSync: row.localSync,
    }))).toEqual([
      {
        clientEventId: permanent.client_event_id,
        localSync: {
          state: 'failed_permanent',
          category: 'permission_denied',
          retryCount: 1,
        },
      },
      {
        clientEventId: retryable.client_event_id,
        localSync: {
          state: 'failed_retryable',
          category: 'network_unavailable',
          retryCount: 2,
        },
      },
      {
        clientEventId: pending.client_event_id,
        localSync: {
          state: 'pending_local',
          category: null,
          retryCount: 0,
        },
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain(otherActor.client_event_id);
    expect(JSON.stringify(rows)).not.toContain(terminal.client_event_id);
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P1-RECOVERY-7 fetches durable day rows after cold-start hydration and merges the retained local row', async () => {
    const retained = createRecoveryQueueItem({
      state: 'failed_permanent',
      retry_count: 3,
      last_error_category: 'server_5xx',
    });
    const durableItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000247',
      occurred_at: '2026-07-16T13:00:00.000Z',
    });
    const durableRow = createServerRow(durableItem);
    const harness = createRecoveryQueueHarness([retained], { claimEnabled: false });
    const queryClient = createPuppyPlanQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const timelineKey = queryKeys.events.timeline(
      retained.household_id,
      retained.puppy_id,
      { from: '2026-07-16', to: '2026-07-16' },
    );
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockListEvents.mockResolvedValue([durableRow]);

    const port = renderHook(() => useQuickLogMutationPort(), { wrapper });
    await waitFor(() => expect(port.result.current.status).toBe('ready'));
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey)?.map(
      (row) => row.client_event_id,
    )).toEqual([retained.client_event_id]);

    const timeline = renderHook(() => useQuickLogTimelineRows({
      authState: 'authenticated',
      householdId: retained.household_id,
      householdRole: 'owner',
      puppyId: retained.puppy_id,
      todayDate: '2026-07-16',
    }, {
      from: '2026-07-16',
      to: '2026-07-16',
    }), { wrapper: createPlainQueryClientWrapper(queryClient) });

    try {
      await waitFor(() => {
        expect(mockListEvents).toHaveBeenCalledTimes(1);
        expect(timeline.result.current.rows.map((row) => row.client_event_id)).toEqual([
          durableRow.client_event_id,
          retained.client_event_id,
        ]);
      });
    } finally {
      timeline.unmount();
      port.unmount();
      queryClient.clear();
    }
  });

  it('AC-P1-RECOVERY-7 converges a gated same-client hydration race to one durable row', async () => {
    const retained = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000253',
      state: 'failed_permanent',
      retry_count: 3,
      last_error_category: 'server_5xx',
    });
    const durableRow = createServerRow(retained);
    const hydrationGate = createDeferred();
    const harness = createRecoveryQueueHarness([retained], {
      claimEnabled: false,
      listGate: { call: 1, promise: hydrationGate.promise },
    });
    const queryClient = createPuppyPlanQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const timelineKey = queryKeys.events.timeline(
      retained.household_id,
      retained.puppy_id,
      { from: '2026-07-16', to: '2026-07-16' },
    );
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockListEvents.mockResolvedValue([durableRow]);

    const port = renderHook(() => useQuickLogMutationPort(), { wrapper });
    await waitFor(() => expect(harness.list).toHaveBeenCalledTimes(1));
    expect(port.result.current.status).toBe('loading');

    const timeline = renderHook(() => useQuickLogTimelineRows({
      authState: 'authenticated',
      householdId: retained.household_id,
      householdRole: 'owner',
      puppyId: retained.puppy_id,
      todayDate: '2026-07-16',
    }, {
      from: '2026-07-16',
      to: '2026-07-16',
    }), { wrapper: createPlainQueryClientWrapper(queryClient) });

    try {
      await waitFor(() => {
        expect(mockListEvents).toHaveBeenCalledTimes(1);
        expect(timeline.result.current.rows).toEqual([durableRow]);
      });

      hydrationGate.resolve();

      await waitFor(() => {
        expect(port.result.current.status).toBe('ready');
        expect(mockListEvents).toHaveBeenCalledTimes(2);
      });
      await waitFor(() => {
        expect(timeline.result.current.rows).toEqual([durableRow]);
        expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey))
          .toEqual([durableRow]);
      });
      expect(timeline.result.current.rows.filter(
        (row) => row.client_event_id === retained.client_event_id,
      )).toHaveLength(1);
      expect(timeline.result.current.rows[0]?.localSync).toBeUndefined();
    } finally {
      hydrationGate.resolve();
      timeline.unmount();
      port.unmount();
      queryClient.clear();
    }
  });

  it('AC-P1-RECOVERY-2/3 serializes startup, foreground, and timer drains and converges one claimed row', async () => {
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    const appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation(
      (_type, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      },
    );
    const intervalSpy = jest.spyOn(global, 'setInterval');
    const item = createRecoveryQueueItem();
    const harness = createRecoveryQueueHarness([item]);
    const serverRow = createServerRow(item);
    let releaseInsert: ((row: QuickLogCachedEventRow) => void) | undefined;
    mockInsertEvent.mockImplementation(() => new Promise<QuickLogCachedEventRow>((resolve) => {
      releaseInsert = resolve;
    }));
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(mockInsertEvent).toHaveBeenCalledTimes(1));
    expect(mockInsertEvent).toHaveBeenCalledWith({
      client_event_id: item.client_event_id,
      created_by: item.created_by,
      event_type: item.event_type,
      household_id: item.household_id,
      occurred_at: item.occurred_at,
      payload: item.payload,
      payload_version: item.payload_version,
      puppy_id: item.puppy_id,
    });
    expect(appStateListener).toEqual(expect.any(Function));
    expect(intervalSpy).toHaveBeenCalled();
    const intervalDelay = intervalSpy.mock.calls[0]?.[1];
    expect(typeof intervalDelay).toBe('number');
    if (typeof intervalDelay === 'number') expect(intervalDelay).toBeGreaterThan(0);

    act(() => {
      appStateListener?.('background');
      appStateListener?.('active');
      const timerCallback = intervalSpy.mock.calls[0]?.[0];
      if (typeof timerCallback === 'function') timerCallback();
    });
    await act(async () => Promise.resolve());
    expect(mockInsertEvent).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseInsert?.(serverRow);
      await Promise.resolve();
    });
    await waitFor(() => expect(harness.remove).toHaveBeenCalledWith(item.client_event_id));
    expect(harness.items.has(item.client_event_id)).toBe(false);
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(
      queryKeys.events.timeline(item.household_id, item.puppy_id),
    )).toEqual([{ ...serverRow, localSync: undefined }]);
    hook.unmount();
    queryClient.clear();
    appStateSpy.mockRestore();
    intervalSpy.mockRestore();
  });

  it('AC-P1-RECOVERY-2 lets the active-app timer recover an item that was not ready at startup', async () => {
    const intervalSpy = jest.spyOn(global, 'setInterval');
    const coolingItem = createRecoveryQueueItem({
      state: 'failed_retryable',
      retry_count: 1,
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-16T12:00:00.000Z',
    });
    const harness = createRecoveryQueueHarness([coolingItem]);
    const serverRow = createServerRow(coolingItem);
    mockInsertEvent.mockResolvedValue(serverRow);
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(mockInsertEvent).not.toHaveBeenCalled();
    expect(intervalSpy).toHaveBeenCalled();
    const timerCallback = intervalSpy.mock.calls[0]?.[0];
    expect(timerCallback).toEqual(expect.any(Function));

    harness.items.set(coolingItem.client_event_id, createRecoveryQueueItem({
      ...coolingItem,
      retry_after_at: null,
    }));
    act(() => {
      if (typeof timerCallback === 'function') timerCallback();
    });

    await waitFor(() => expect(mockInsertEvent).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(harness.remove).toHaveBeenCalledWith(coolingItem.client_event_id));
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(
      queryKeys.events.timeline(coolingItem.household_id, coolingItem.puppy_id),
    )).toEqual([{ ...serverRow, localSync: undefined }]);
    hook.unmount();
    queryClient.clear();
    intervalSpy.mockRestore();
  });

  it('AC-P1-RECOVERY-4/6 retains replay failures with scrubbed state, due time, and observability', async () => {
    const item = createRecoveryQueueItem();
    const harness = createRecoveryQueueHarness([item]);
    mockInsertEvent.mockRejectedValue({ kind: 'network_unavailable' });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(harness.markFailedRetryable).toHaveBeenCalledTimes(1));

    const failureOptions = harness.markFailedRetryable.mock.calls[0]?.[1];
    expect(failureOptions).toEqual(expect.objectContaining({
      errorCategory: 'network_unavailable',
      retryAfterAt: expect.any(String),
    }));
    expect(
      Date.parse(failureOptions?.retryAfterAt ?? '') - Date.parse(failureOptions?.now ?? ''),
    ).toBe(1_000);
    await expect(harness.storage.getByClientEventId(item.client_event_id)).resolves.toMatchObject({
      state: 'failed_retryable',
      retry_count: 1,
      last_error_category: 'network_unavailable',
      retry_after_at: expect.any(String),
    });
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(
      queryKeys.events.timeline(item.household_id, item.puppy_id),
    )).toEqual([
      expect.objectContaining({
        client_event_id: item.client_event_id,
        localSync: {
          state: 'failed_retryable',
          category: 'network_unavailable',
          retryCount: 1,
        },
      }),
    ]);
    expect(harness.remove).not.toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      area: 'quick_log_queue',
    }));
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P1-RECOVERY-3 does not restore a tombstoned queued replay', async () => {
    const reminderId = '00000000-0000-4000-8000-000000000223';
    const item = createRecoveryQueueItem({
      payload: {
        amount: 'meal',
        reminder_link: {
          reminder_id: reminderId,
          scheduled_for: '2026-07-16T12:00:00.000Z',
        },
      },
    });
    const harness = createRecoveryQueueHarness([item]);
    const tombstoneCollision = Object.assign(new Error('Synthetic tombstone collision'), {
      kind: 'invalid_payload',
    });
    mockInsertEvent.mockRejectedValue(tombstoneCollision);
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(async () => {
      await expect(harness.storage.getByClientEventId(item.client_event_id)).resolves.toMatchObject({
        state: 'failed_permanent',
        last_error_category: 'invalid_payload',
      });
    });

    expect(mockInsertEvent).toHaveBeenCalledTimes(1);
    expect(mockRestoreByClientEventId).not.toHaveBeenCalled();
    expect(harness.remove).not.toHaveBeenCalled();
    hook.unmount();
    queryClient.clear();
  });

  it.each(['open', 'list', 'claim'] as const)(
    'AC-P1-RECOVERY-6 reports %s failures without clearing an existing cached row',
    async (failureStage) => {
      const item = createRecoveryQueueItem();
      const harness = createRecoveryQueueHarness([], {
        claimError: failureStage === 'claim' ? new Error('Synthetic claim failure') : undefined,
        listError: failureStage === 'list' ? new Error('Synthetic list failure') : undefined,
      });
      if (failureStage === 'open') {
        mockOpenQuickLogQueueStorage.mockRejectedValue(new Error('Synthetic open failure'));
      } else {
        mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
      }
      const queryClient = createTestQueryClient();
      const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
      const cachedRow = createServerRow(item);
      queryClient.setQueryData(timelineKey, [cachedRow]);
      const hook = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(queryClient),
      });

      await waitFor(() => expect(mockCaptureException).toHaveBeenCalled());

      expect(queryClient.getQueryData(timelineKey)).toEqual([cachedRow]);
      expect(mockInsertEvent).not.toHaveBeenCalled();
      hook.unmount();
      queryClient.clear();
    },
  );

  it('AC-P1-RECOVERY-1/2 removes post-readiness actor-local rows from every shared Timeline cache before the next actor is ready', async () => {
    const nextActorId = '00000000-0000-4000-8000-000000000243';
    const retainedClientEventId = 'evt_00000000-0000-4000-8000-000000000244';
    const actorSwitchListGate = createDeferred();
    const harness = createRecoveryQueueHarness([], {
      claimEnabled: false,
      listGate: { call: 2, promise: actorSwitchListGate.promise },
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    mockInsertEvent.mockRejectedValue({ kind: 'network_unavailable', retryAfterMs: null });
    const queryClient = createTestQueryClient();
    const timelineRootKey = queryKeys.events.timelineRoot(
      '00000000-0000-4000-8000-000000007902',
      '00000000-0000-4000-8000-000000007903',
    );
    const sharedTimelineKeys = [
      queryKeys.events.timeline(
        '00000000-0000-4000-8000-000000007902',
        '00000000-0000-4000-8000-000000007903',
      ),
      queryKeys.events.timeline(
        '00000000-0000-4000-8000-000000007902',
        '00000000-0000-4000-8000-000000007903',
        { from: '2026-07-14', to: '2026-07-14' },
      ),
    ];
    for (const queryKey of sharedTimelineKeys) queryClient.setQueryData(queryKey, []);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const createDetailedDurably = getDurableAcceptanceCreate(hook.result.current.mutation);
    expect(createDetailedDurably).toEqual(expect.any(Function));
    if (!createDetailedDurably) {
      actorSwitchListGate.resolve();
      hook.unmount();
      queryClient.clear();
      return;
    }
    await createDetailedDurably({
      ...createObservationVariables(),
      clientEventId: retainedClientEventId,
    });
    const localRowsBeforeSwitch = getActorLocalRows(
      queryClient,
      timelineRootKey,
      mockPrimaryActorId,
    );
    expect(localRowsBeforeSwitch.length).toBeGreaterThan(0);
    expect(localRowsBeforeSwitch.every((row) =>
      row.client_event_id === retainedClientEventId)).toBe(true);

    try {
      act(() => {
        mockAuthState.current = {
          status: 'signedIn',
          user: { id: nextActorId },
        };
        hook.rerender(undefined);
      });
      await waitFor(() => expect(harness.list).toHaveBeenCalledTimes(2));

      expect(hook.result.current.status).toBe('loading');
      expect(getActorLocalRows(
        queryClient,
        timelineRootKey,
        mockPrimaryActorId,
      )).toEqual([]);

      actorSwitchListGate.resolve();
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      expect(getActorLocalRows(
        queryClient,
        timelineRootKey,
        mockPrimaryActorId,
      )).toEqual([]);
    } finally {
      actorSwitchListGate.resolve();
      hook.unmount();
      queryClient.clear();
    }
  });

  it('AC-P1-RECOVERY-2 globally serializes replay across an actor switch and preserves both claimed identities', async () => {
    const nextActorId = '00000000-0000-4000-8000-000000000245';
    const actorAItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000246',
      created_by: mockPrimaryActorId,
      created_at: '2026-07-16T12:00:01.000Z',
    });
    const actorBItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000247',
      created_by: nextActorId,
      created_at: '2026-07-16T12:00:02.000Z',
    });
    const actorAInsertGate = createDeferred();
    const harness = createRecoveryQueueHarness([actorAItem, actorBItem]);
    let sendsInFlight = 0;
    let maxSendsInFlight = 0;
    mockInsertEvent.mockImplementation(async (insert: EventLogInsert) => {
      sendsInFlight += 1;
      maxSendsInFlight = Math.max(maxSendsInFlight, sendsInFlight);
      try {
        if (insert.created_by === mockPrimaryActorId) await actorAInsertGate.promise;
        return insert.created_by === mockPrimaryActorId
          ? createServerRow(actorAItem)
          : createServerRow(actorBItem);
      } finally {
        sendsInFlight -= 1;
      }
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(mockInsertEvent).toHaveBeenCalledTimes(1));
    act(() => {
      mockAuthState.current = {
        status: 'signedIn',
        user: { id: nextActorId },
      };
      hook.rerender(undefined);
    });
    await waitFor(() => expect(harness.list).toHaveBeenCalledTimes(2));
    await act(async () => Promise.resolve());
    const insertCountBeforeActorARelease = mockInsertEvent.mock.calls.length;

    actorAInsertGate.resolve();
    await waitFor(() => expect(harness.remove).toHaveBeenCalledTimes(2));

    expect(insertCountBeforeActorARelease).toBe(1);
    expect(maxSendsInFlight).toBe(1);
    expect(mockInsertEvent.mock.calls.map(([insert]) => ({
      clientEventId: insert.client_event_id,
      createdBy: insert.created_by,
    }))).toEqual([
      {
        clientEventId: actorAItem.client_event_id,
        createdBy: mockPrimaryActorId,
      },
      {
        clientEventId: actorBItem.client_event_id,
        createdBy: nextActorId,
      },
    ]);
    const actorARemoveCallIndex = harness.remove.mock.calls.findIndex(
      ([clientEventId]) => clientEventId === actorAItem.client_event_id,
    );
    expect(actorARemoveCallIndex).toBeGreaterThanOrEqual(0);
    expect(harness.remove.mock.invocationCallOrder[actorARemoveCallIndex])
      .toBeLessThan(mockInsertEvent.mock.invocationCallOrder[1] ?? Number.POSITIVE_INFINITY);
    hook.unmount();
    queryClient.clear();
  });

  it('AC-P1-RECOVERY-2 serializes replay across simultaneous mutation-port instances through local finalization', async () => {
    const firstItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000248',
      occurred_at: '2026-07-16T12:00:01.000Z',
    });
    const secondItem = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000249',
      occurred_at: '2026-07-16T12:00:02.000Z',
    });
    const firstInsertGate = createDeferred();
    const firstFinalizeGate = createDeferred();
    const harness = createRecoveryQueueHarness([firstItem, secondItem]);
    let sendsInFlight = 0;
    let maxSendsInFlight = 0;
    mockInsertEvent.mockImplementation(async (insert: EventLogInsert) => {
      sendsInFlight += 1;
      maxSendsInFlight = Math.max(maxSendsInFlight, sendsInFlight);
      try {
        if (insert.client_event_id === firstItem.client_event_id) {
          await firstInsertGate.promise;
        }
        return insert.client_event_id === firstItem.client_event_id
          ? createServerRow(firstItem)
          : createServerRow(secondItem);
      } finally {
        sendsInFlight -= 1;
      }
    });
    harness.remove.mockImplementationOnce(async (clientEventId) => {
      await firstFinalizeGate.promise;
      harness.items.delete(clientEventId);
    });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const wrapper = createQueryClientWrapper(queryClient);
    const diaryPort = renderHook(() => useQuickLogMutationPort(), { wrapper });
    const sheetPort = renderHook(() => useQuickLogMutationPort(), { wrapper });

    try {
      await waitFor(() => {
        expect(diaryPort.result.current.status).toBe('ready');
        expect(sheetPort.result.current.status).toBe('ready');
      });
      await waitFor(() => expect(mockInsertEvent).toHaveBeenCalled());
      expect(mockInsertEvent).toHaveBeenCalledTimes(1);
      expect(maxSendsInFlight).toBe(1);

      act(() => firstInsertGate.resolve());
      await waitFor(() => expect(harness.remove).toHaveBeenCalledWith(
        firstItem.client_event_id,
      ));
      expect(mockInsertEvent).toHaveBeenCalledTimes(1);

      act(() => firstFinalizeGate.resolve());
      await waitFor(() => expect(harness.remove).toHaveBeenCalledTimes(2));

      expect(maxSendsInFlight).toBe(1);
      expect(mockInsertEvent.mock.calls.map(([insert]) => insert.client_event_id)).toEqual([
        firstItem.client_event_id,
        secondItem.client_event_id,
      ]);
      expect(harness.items.size).toBe(0);
      const convergedRows = queryClient.getQueryData<QuickLogCachedEventRow[]>(
        queryKeys.events.timeline(firstItem.household_id, firstItem.puppy_id),
      );
      expect(convergedRows?.map((row) => ({
        clientEventId: row.client_event_id,
        localSync: row.localSync,
      })).sort((left, right) => left.clientEventId.localeCompare(right.clientEventId))).toEqual([
        { clientEventId: firstItem.client_event_id, localSync: undefined },
        { clientEventId: secondItem.client_event_id, localSync: undefined },
      ]);
    } finally {
      await act(async () => {
        firstInsertGate.resolve();
        firstFinalizeGate.resolve();
        await flushHostMicrotasks();
      });
      await waitFor(() => expect(harness.remove).toHaveBeenCalledTimes(2));
      diaryPort.unmount();
      sheetPort.unmount();
      queryClient.clear();
    }
  });

  it('AC-P1-RECOVERY-1/6 retains actor-local failure evidence when one of two mutation-port instances unmounts', async () => {
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000250',
      state: 'failed_retryable',
      retry_count: 2,
      last_error_category: 'network_unavailable',
      retry_after_at: '2099-07-16T12:00:00.000Z',
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    const wrapper = createQueryClientWrapper(queryClient);
    const diaryPort = renderHook(() => useQuickLogMutationPort(), { wrapper });
    const sheetPort = renderHook(() => useQuickLogMutationPort(), { wrapper });

    try {
      await waitFor(() => {
        expect(diaryPort.result.current.status).toBe('ready');
        expect(sheetPort.result.current.status).toBe('ready');
      });
      expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey)).toEqual([
        expect.objectContaining({
          client_event_id: item.client_event_id,
          localSync: {
            state: 'failed_retryable',
            category: 'network_unavailable',
            retryCount: 2,
          },
        }),
      ]);

      sheetPort.unmount();

      expect(diaryPort.result.current.status).toBe('ready');
      expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(timelineKey)).toEqual([
        expect.objectContaining({
          client_event_id: item.client_event_id,
          localSync: {
            state: 'failed_retryable',
            category: 'network_unavailable',
            retryCount: 2,
          },
        }),
      ]);
    } finally {
      diaryPort.unmount();
      sheetPort.unmount();
      queryClient.clear();
    }
  });

  it('AC-P1-RECOVERY-2 rechecks the active actor after an awaited claim before replaying', async () => {
    const nextActorId = '00000000-0000-4000-8000-000000000251';
    const item = createRecoveryQueueItem({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000252',
      created_by: mockPrimaryActorId,
    });
    const claimStarted = jest.fn();
    const claimGate = createDeferred();
    const harness = createRecoveryQueueHarness([item], {
      claimGate: {
        call: 1,
        promise: claimGate.promise,
        signal: claimStarted,
      },
    });
    mockInsertEvent.mockResolvedValue(createServerRow(item));
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    try {
      await waitFor(() => expect(claimStarted).toHaveBeenCalledTimes(1));
      act(() => {
        mockAuthState.current = {
          status: 'signedIn',
          user: { id: nextActorId },
        };
        hook.rerender(undefined);
      });
      await waitFor(() => expect(harness.list).toHaveBeenCalledTimes(2));

      claimGate.resolve();
      await act(async () => flushHostMicrotasks());
      await waitFor(() => {
        expect(harness.items.get(item.client_event_id)?.state ?? 'removed').not.toBe('sending');
      });

      const retainedItem = harness.items.get(item.client_event_id);
      expect(mockInsertEvent).not.toHaveBeenCalled();
      expect(retainedItem).toMatchObject({
        client_event_id: item.client_event_id,
        created_by: mockPrimaryActorId,
        state: 'failed_retryable',
        retry_after_at: expect.any(String),
      });
      expect(
        Date.parse(retainedItem?.retry_after_at ?? '')
        - Date.parse(retainedItem?.updated_at ?? ''),
      ).toBeGreaterThan(0);
    } finally {
      claimGate.resolve();
      hook.unmount();
      queryClient.clear();
    }
  });

  it.each([0, -250])(
    'AC-P1-RECOVERY-4 applies computed backoff when rate_limited retryAfterMs is %i',
    async (retryAfterMs) => {
      const item = createRecoveryQueueItem({ retry_count: 1 });
      const harness = createRecoveryQueueHarness([item], { maxClaims: 1 });
      mockInsertEvent.mockRejectedValue({ kind: 'rate_limited', retryAfterMs });
      mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
      const queryClient = createTestQueryClient();
      const hook = renderHook(() => useQuickLogMutationPort(), {
        wrapper: createQueryClientWrapper(queryClient),
      });

      await waitFor(() => expect(harness.markFailedRetryable).toHaveBeenCalledTimes(1));

      const persisted = await harness.storage.getByClientEventId(item.client_event_id);
      expect(persisted).not.toBeNull();
      const persistedDelayMs = Date.parse(persisted?.retry_after_at ?? '')
        - Date.parse(harness.markFailedRetryable.mock.calls[0]?.[1].now ?? '');
      expect(persistedDelayMs).toBeGreaterThanOrEqual(getQuickLogRetryDelayMs({
        retryCount: item.retry_count + 1,
      }));
      expect(persistedDelayMs).toBeGreaterThan(0);
      hook.unmount();
      queryClient.clear();
    },
  );

  it('AC-P1-RECOVERY-6 contains hydration cancellation rejection without readiness, cache loss, or unsanitized reporting', async () => {
    const cancellationFailure = new Error('Synthetic retained-row cancellation failure');
    const item = createRecoveryQueueItem({
      state: 'failed_permanent',
      retry_count: 1,
      last_error_category: 'permission_denied',
    });
    const harness = createRecoveryQueueHarness([item], { claimEnabled: false });
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createTestQueryClient();
    const timelineKey = queryKeys.events.timeline(item.household_id, item.puppy_id);
    const cachedRow = createServerRow(item);
    queryClient.setQueryData(timelineKey, [cachedRow]);
    jest.spyOn(queryClient, 'cancelQueries').mockRejectedValueOnce(cancellationFailure);
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      unhandledRejections.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    try {
      await waitFor(() => expect(mockCaptureException).toHaveBeenCalledTimes(1));
      await flushHostMicrotasks();

      expect(hook.result.current.status).not.toBe('ready');
      expect(queryClient.getQueryData(timelineKey)).toEqual([cachedRow]);
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Quick Log queue recovery failed' }),
        expect.objectContaining({ area: 'quick_log_queue' }),
      );
      expect(JSON.stringify(mockCaptureException.mock.calls)).not.toContain(item.client_event_id);
      expect(unhandledRejections).toEqual([]);
    } finally {
      process.removeListener('unhandledRejection', onUnhandledRejection);
      hook.unmount();
      queryClient.clear();
    }
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

function createPortObservationVariables(
  clientEventId: string,
): QuickLogDetailedMutationVariables {
  return {
    ...createObservationVariables(),
    clientEventId,
  };
}

function createObservationDetailRequest(
  item: QuickLogStoredQueueItem,
  draft: Readonly<{ note: string; title: string }>,
): QuickLogMutationPortUpdateDetailsRequest {
  return {
    clientEventId: item.client_event_id,
    draft: { ...draft, occurredAt: item.occurred_at, trackerId: 'observation' },
    eventType: 'observation',
    householdId: item.household_id,
    puppyId: item.puppy_id,
    todayDate: '2026-07-17',
  };
}

function createHarnessAtomicRetryIfOwned(
  harness: RecoveryQueueHarness,
): jest.MockedFunction<NonNullable<QuickLogQueueStorage['markFailedRetryableIfOwned']>> {
  return jest.fn(async (clientEventId, options) => {
    const retained = harness.items.get(clientEventId);
    if (
      retained?.created_by !== options.expectedCreatedBy
      || retained.state !== options.expectedState
    ) {
      return null;
    }
    return harness.markFailedRetryable(clientEventId, options);
  });
}

function createHarnessAtomicRemoveIfState(
  harness: RecoveryQueueHarness,
): jest.MockedFunction<NonNullable<QuickLogQueueStorage['removeIfState']>> {
  return jest.fn(async (clientEventId, expectedState, options) => {
    const retained = harness.items.get(clientEventId);
    if (
      retained?.state !== expectedState
      || (
        options?.expectedCreatedBy !== undefined
        && retained.created_by !== options.expectedCreatedBy
      )
    ) {
      return false;
    }
    await harness.remove(clientEventId);
    return true;
  });
}

function createHarnessDetailUpdater(
  harness: RecoveryQueueHarness,
  gate?: ReturnType<typeof createSignaledDeferred>,
): jest.MockedFunction<NonNullable<QuickLogQueueStorage['updateDetails']>> {
  return jest.fn(async (clientEventId, options) => {
    const retained = harness.items.get(clientEventId);
    if (retained === undefined) throw new Error('Synthetic queue item missing');
    const actorBinding = readDetailActorBinding(options);
    if (
      actorBinding !== null
      && (
        retained.created_by !== actorBinding.expectedCreatedBy
        || !actorBinding.isActorCurrent()
      )
    ) {
      throw new Error('Quick Log detail actor mismatch');
    }
    gate?.signal();
    if (gate !== undefined) await gate.promise;
    if (actorBinding !== null && !actorBinding.isActorCurrent()) {
      throw new Error('Quick Log detail actor superseded');
    }
    const updated = createStoredQuickLogQueueItem({
      ...retained,
      occurred_at: options.occurredAt,
      payload: options.payload,
      payload_version: options.payloadVersion,
      updated_at: options.now,
    });
    harness.items.set(clientEventId, updated);
    return updated;
  });
}

function readDetailActorBinding(options: object): Readonly<{
  expectedCreatedBy: string;
  isActorCurrent: () => boolean;
}> | null {
  const expectedCreatedBy = 'expectedCreatedBy' in options
    ? options.expectedCreatedBy
    : null;
  const isActorCurrent = 'isActorCurrent' in options
    ? options.isActorCurrent
    : null;
  if (
    typeof expectedCreatedBy !== 'string'
    || typeof isActorCurrent !== 'function'
  ) {
    return null;
  }

  return {
    expectedCreatedBy,
    isActorCurrent: () => isActorCurrent() === true,
  };
}

function createServerRowFromInsert(insert: EventLogInsert): QuickLogCachedEventRow {
  return {
    id: '00000000-0000-4000-8000-000000000372',
    household_id: insert.household_id,
    puppy_id: insert.puppy_id,
    created_by: insert.created_by,
    client_event_id: insert.client_event_id,
    event_type: insert.event_type,
    occurred_at: insert.occurred_at,
    payload_version: insert.payload_version,
    payload: insert.payload,
    version: 1,
    deleted_at: null,
    created_at: '2026-07-17T12:00:01.000Z',
    updated_at: '2026-07-17T12:00:01.000Z',
  };
}

function createStatefulQuickLogQueue(
  enqueueFailure?: unknown,
  options: Readonly<{ atomicRemoveIfState?: boolean }> = {},
): QuickLogQueueStorage {
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

  const storage: QuickLogQueueStorage = {
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

  if (options.atomicRemoveIfState !== true) {
    return storage;
  }

  return {
    ...storage,
    removeIfState: async (clientEventId, expectedState, removeOptions) => {
      const retained = items.get(clientEventId);
      if (
        retained?.state !== expectedState
        || (
          removeOptions?.expectedCreatedBy !== undefined
          && retained.created_by !== removeOptions.expectedCreatedBy
        )
      ) {
        return false;
      }
      items.delete(clientEventId);
      return true;
    },
  };
}

type RecoveryQueueHarness = Readonly<{
  storage: QuickLogQueueStorage
    & PlannedDeleteIntentQueueStorage
    & PlannedLegacyMissingActorQuarantineStorage;
  items: Map<string, QuickLogStoredQueueItem>;
  enqueueDeletedBeforeSync: jest.MockedFunction<
    PlannedDeleteIntentQueueStorage['enqueueDeletedBeforeSync']
  >;
  list: jest.MockedFunction<QuickLogQueueStorage['list']>;
  markFailedRetryable: jest.MockedFunction<QuickLogQueueStorage['markFailedRetryable']>;
  quarantineLegacyMissingActorItems: jest.MockedFunction<
    PlannedLegacyMissingActorQuarantineStorage['quarantineLegacyMissingActorItems']
  >;
  retainDeletedBeforeSync: jest.MockedFunction<
    PlannedDeleteIntentQueueStorage['retainDeletedBeforeSync']
  >;
  remove: jest.MockedFunction<QuickLogQueueStorage['remove']>;
}>;

type PlannedDeleteIntentQueueStorage = Readonly<{
  enqueueDeletedBeforeSync(
    input: unknown,
    options: Readonly<{
      now: string;
      retryAfterAt?: string;
    }>,
  ): Promise<QuickLogStoredQueueItem>;
  retainDeletedBeforeSync(
    clientEventId: string,
    options: Readonly<{
      errorCategory: string;
      retryAfterAt: string | null;
      now: string;
    }>,
  ): Promise<QuickLogStoredQueueItem>;
}>;

type PlannedLegacyMissingActorQuarantineStorage = Readonly<{
  quarantineLegacyMissingActorItems(options: Readonly<{ now: string }>): Promise<void>;
}>;

function createRecoveryQueueHarness(
  initialItems: readonly QuickLogStoredQueueItem[],
  options: Readonly<{
    claimEnabled?: boolean;
    claimError?: Error;
    claimGate?: Readonly<{
      call: number;
      promise: Promise<void>;
      signal(): void;
    }>;
    listGate?: Readonly<{ call: number; promise: Promise<void> }>;
    listError?: Error;
    legacyQuarantineError?: Error;
    maxClaims?: number;
    resolveGate?: Readonly<{
      promise: Promise<void>;
      signal(): void;
    }>;
    deleteIntentError?: Error;
    removeErrorOnce?: Error;
  }> = {},
): RecoveryQueueHarness {
  const items = new Map(initialItems.map((item) => [item.client_event_id, item]));
  const getRequired = (clientEventId: string): QuickLogStoredQueueItem => {
    const item = items.get(clientEventId);
    if (!item) throw new Error('Missing synthetic recovery queue item');
    return item;
  };
  const write = (
    clientEventId: string,
    update: (item: QuickLogStoredQueueItem) => QuickLogStoredQueueItem,
  ): QuickLogStoredQueueItem => {
    const item = update(getRequired(clientEventId));
    items.set(clientEventId, item);
    return item;
  };
  const markFailedRetryable = jest.fn<
    ReturnType<QuickLogQueueStorage['markFailedRetryable']>,
    Parameters<QuickLogQueueStorage['markFailedRetryable']>
  >(async (clientEventId, transitionOptions) => write(
    clientEventId,
    (item) => applyQuickLogQueueTransition(item, {
      type: 'mark_failed_retryable',
      errorCategory: transitionOptions.errorCategory,
      retryAfterAt: transitionOptions.retryAfterAt,
      now: transitionOptions.now,
    }),
  ));
  let removeCallCount = 0;
  const remove = jest.fn<
    ReturnType<QuickLogQueueStorage['remove']>,
    Parameters<QuickLogQueueStorage['remove']>
  >(async (clientEventId) => {
    removeCallCount += 1;
    if (removeCallCount === 1 && options.removeErrorOnce) {
      throw options.removeErrorOnce;
    }
    items.delete(clientEventId);
  });
  const enqueueDeletedBeforeSync = jest.fn<
    ReturnType<PlannedDeleteIntentQueueStorage['enqueueDeletedBeforeSync']>,
    Parameters<PlannedDeleteIntentQueueStorage['enqueueDeletedBeforeSync']>
  >(async (input, enqueueOptions) => {
    if (options.deleteIntentError) throw options.deleteIntentError;
    const parsed = quickLogQueueEnqueueInputSchema.parse(input);
    const item = createStoredQuickLogQueueItem({
      ...parsed,
      state: 'deleted_before_sync',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: enqueueOptions.retryAfterAt ?? null,
      updated_at: enqueueOptions.now,
    });
    items.set(item.client_event_id, item);
    return item;
  });
  const retainDeletedBeforeSync = jest.fn<
    ReturnType<PlannedDeleteIntentQueueStorage['retainDeletedBeforeSync']>,
    Parameters<PlannedDeleteIntentQueueStorage['retainDeletedBeforeSync']>
  >(async (clientEventId, retainOptions) => write(clientEventId, (item) =>
    createStoredQuickLogQueueItem({
      ...item,
      state: 'deleted_before_sync',
      retry_count: item.retry_count + 1,
      last_error_category: retainOptions.errorCategory,
      retry_after_at: retainOptions.retryAfterAt,
      updated_at: retainOptions.now,
    })));
  let claimCount = 0;
  let claimCallCount = 0;
  let listCallCount = 0;
  const list = jest.fn<
    ReturnType<QuickLogQueueStorage['list']>,
    Parameters<QuickLogQueueStorage['list']>
  >(async (filter) => {
    if (options.listError) throw options.listError;
    listCallCount += 1;
    if (options.listGate?.call === listCallCount) await options.listGate.promise;
    return [...items.values()].filter((item) =>
      filter?.states === undefined || filter.states.includes(item.state));
  });
  const quarantineLegacyMissingActorItems = jest.fn<
    ReturnType<PlannedLegacyMissingActorQuarantineStorage[
      'quarantineLegacyMissingActorItems'
    ]>,
    Parameters<PlannedLegacyMissingActorQuarantineStorage[
      'quarantineLegacyMissingActorItems'
    ]>
  >(async ({ now: quarantineAt }) => {
    if (options.legacyQuarantineError !== undefined) {
      throw options.legacyQuarantineError;
    }

    for (const [clientEventId, item] of items) {
      if (
        item.created_by === null
        && (
          item.state === 'pending_local'
          || item.state === 'sending'
          || item.state === 'failed_retryable'
        )
      ) {
        items.set(clientEventId, createStoredQuickLogQueueItem({
          ...item,
          state: 'failed_permanent',
          retry_count: item.retry_count + 1,
          last_error_category: 'missing_context',
          retry_after_at: null,
          updated_at: quarantineAt,
        }));
      }
    }
  });
  const storage: QuickLogQueueStorage
    & PlannedDeleteIntentQueueStorage
    & PlannedLegacyMissingActorQuarantineStorage = {
    initialize: async () => undefined,
    enqueue: async (input, enqueueOptions) => {
      const parsed = quickLogQueueEnqueueInputSchema.parse(input);
      const item = createStoredQuickLogQueueItem({
        ...parsed,
        state: 'pending_local',
        retry_count: 0,
        last_error_category: null,
        retry_after_at: null,
        updated_at: enqueueOptions.now,
      });
      items.set(item.client_event_id, item);
      return item;
    },
    enqueueDeletedBeforeSync,
    getByClientEventId: async (clientEventId) => items.get(clientEventId) ?? null,
    list,
    claimNextReadyToSend: async (claimOptions) => {
      if (options.claimError) throw options.claimError;
      claimCallCount += 1;
      if (options.claimGate?.call === claimCallCount) {
        options.claimGate.signal();
        await options.claimGate.promise;
      }
      if (options.claimEnabled === false) return null;
      if (options.maxClaims !== undefined && claimCount >= options.maxClaims) return null;
      const ready = [...items.values()].find((item) =>
        (claimOptions.createdBy === undefined || item.created_by === claimOptions.createdBy)
        && (
          item.state === 'pending_local'
          || (
            item.state === 'failed_retryable'
            && (
              item.retry_after_at === null
              || Date.parse(item.retry_after_at) <= Date.parse(claimOptions.now)
            )
          )
        ));
      if (!ready) return null;
      claimCount += 1;
      return write(ready.client_event_id, (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_sending',
        now: claimOptions.now,
      }));
    },
    markSending: async (clientEventId, transitionOptions) => write(
      clientEventId,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_sending',
        now: transitionOptions.now,
      }),
    ),
    markFailedRetryable,
    markFailedPermanent: async (clientEventId, transitionOptions) => write(
      clientEventId,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_failed_permanent',
        errorCategory: transitionOptions.errorCategory,
        now: transitionOptions.now,
      }),
    ),
    markDeletedBeforeSync: async (clientEventId, transitionOptions) => write(
      clientEventId,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_deleted_before_sync',
        now: transitionOptions.now,
      }),
    ),
    quarantineLegacyMissingActorItems,
    manualRetry: async (clientEventId, retryOptions) => {
      const retry = createManualQuickLogRetry(getRequired(clientEventId), retryOptions);
      items.set(clientEventId, retry.item);
      return retry;
    },
    resolveInFlightSuccess: async (clientEventId, resolutionOptions) => {
      const resolution = resolveQuickLogInFlightSuccess(
        getRequired(clientEventId),
        resolutionOptions,
      );
      if (resolution.outcome === 'server_confirmed') {
        items.set(clientEventId, resolution.item);
        options.resolveGate?.signal();
        if (options.resolveGate !== undefined) {
          await options.resolveGate.promise;
        }
      }
      return resolution;
    },
    remove,
    retainDeletedBeforeSync,
  };

  return {
    enqueueDeletedBeforeSync,
    items,
    list,
    markFailedRetryable,
    quarantineLegacyMissingActorItems,
    remove,
    retainDeletedBeforeSync,
    storage,
  };
}

function createRecoveryQueueItem(
  overrides: Partial<QuickLogStoredQueueItem> = {},
): QuickLogStoredQueueItem {
  return createStoredQuickLogQueueItem({
    client_event_id: 'evt_00000000-0000-4000-8000-000000000221',
    household_id: '00000000-0000-4000-8000-000000000201',
    puppy_id: '00000000-0000-4000-8000-000000000202',
    created_by: '00000000-0000-4000-8000-000000000203',
    event_type: 'feeding',
    payload_version: 1,
    payload: { amount: 'meal' },
    occurred_at: '2026-07-16T12:00:00.000Z',
    state: 'pending_local',
    retry_count: 0,
    last_error_category: null,
    retry_after_at: null,
    created_at: '2026-07-16T12:00:01.000Z',
    updated_at: '2026-07-16T12:00:01.000Z',
    ...overrides,
  });
}

function createServerRow(item: QuickLogStoredQueueItem): QuickLogCachedEventRow {
  if (item.created_by === null) throw new Error('Synthetic recovery row requires an actor');
  return {
    id: '00000000-0000-4000-8000-000000000222',
    household_id: item.household_id,
    puppy_id: item.puppy_id,
    created_by: item.created_by,
    client_event_id: item.client_event_id,
    event_type: item.event_type,
    occurred_at: item.occurred_at,
    payload_version: item.payload_version,
    payload: item.payload,
    version: 1,
    deleted_at: null,
    created_at: '2026-07-16T12:00:02.000Z',
    updated_at: '2026-07-16T12:00:02.000Z',
  };
}

function createQueryClientWrapper(
  queryClient: QueryClient,
): (props: Readonly<{ children: ReactNode }>) => ReactNode {
  return function QueryClientWrapper({ children }: Readonly<{ children: ReactNode }>): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>
        <QuickLogPipelineProvider>
          {children}
        </QuickLogPipelineProvider>
      </QueryClientProvider>
    );
  };
}

// Pure cache-reader hooks (`useQuickLogCachedRows`, `useQuickLogTimelineRows`) do not consume the
// pipeline context. Wrapping them in `QuickLogPipelineProvider` would spawn a second session
// pipeline against the shared query client — an extra recovery hydration that double-counts
// `listEvents` and mutates the test's staged cache. Render readers under the query client alone.
function createPlainQueryClientWrapper(
  queryClient: QueryClient,
): (props: Readonly<{ children: ReactNode }>) => ReactNode {
  return function PlainQueryClientWrapper({ children }: Readonly<{ children: ReactNode }>): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

async function withDateGettersInTimeZone<TResult>(
  timestamp: string,
  timeZone: string,
  run: () => Promise<TResult>,
): Promise<TResult> {
  const targetEpoch = new Date(timestamp).getTime();
  if (Number.isNaN(targetEpoch)) throw new Error('Expected a valid timestamp');

  const dateParts = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'numeric',
    timeZone,
    year: 'numeric',
  }).formatToParts(targetEpoch);
  const getDatePart = (type: 'day' | 'month' | 'year'): number => {
    const part = dateParts.find((candidate) => candidate.type === type);
    if (part === undefined) throw new Error(`Expected ${type} in formatted date`);
    return Number(part.value);
  };
  const localYear = getDatePart('year');
  const localMonth = getDatePart('month') - 1;
  const localDate = getDatePart('day');
  const originalGetFullYear = Date.prototype.getFullYear;
  const originalGetMonth = Date.prototype.getMonth;
  const originalGetDate = Date.prototype.getDate;
  const getFullYearSpy = jest
    .spyOn(Date.prototype, 'getFullYear')
    .mockImplementation(function getFullYear(this: Date): number {
      return this.getTime() === targetEpoch
        ? localYear
        : originalGetFullYear.call(this);
    });
  const getMonthSpy = jest
    .spyOn(Date.prototype, 'getMonth')
    .mockImplementation(function getMonth(this: Date): number {
      return this.getTime() === targetEpoch
        ? localMonth
        : originalGetMonth.call(this);
    });
  const getDateSpy = jest
    .spyOn(Date.prototype, 'getDate')
    .mockImplementation(function getDate(this: Date): number {
      return this.getTime() === targetEpoch
        ? localDate
        : originalGetDate.call(this);
    });

  try {
    return await run();
  } finally {
    getDateSpy.mockRestore();
    getMonthSpy.mockRestore();
    getFullYearSpy.mockRestore();
  }
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

function getActorLocalRows(
  queryClient: QueryClient,
  timelineRootKey: readonly unknown[],
  actorId: string,
): QuickLogCachedEventRow[] {
  return queryClient.getQueriesData<QuickLogCachedEventRow[]>({
    queryKey: timelineRootKey,
  }).flatMap(([, rows]) => (rows ?? []).filter((row) =>
    row.created_by === actorId && row.localSync !== undefined));
}

function createDeferred(): Readonly<{
  promise: Promise<void>;
  resolve(): void;
}> {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: () => resolvePromise?.(),
  };
}

function createSignaledDeferred(): Readonly<{
  promise: Promise<void>;
  resolve(): void;
  signal(): void;
  signaled: Promise<void>;
}> {
  const gate = createDeferred();
  const signalGate = createDeferred();

  return {
    promise: gate.promise,
    resolve: gate.resolve,
    signal: signalGate.resolve,
    signaled: signalGate.promise,
  };
}

type CommitLifecycleToken = Readonly<{
  actorId: string;
  epoch: number;
}>;

function createCommitLifecycleHarness(): Readonly<{
  commit(candidate: Readonly<{ actorId: string }>): CommitLifecycleToken;
  isCurrent(token: Readonly<{ actorId: string; epoch?: number }>): boolean;
  render(actorId: string): Readonly<{ actorId: string }>;
  unmount(): void;
}> {
  let committedActorId: string | null = null;
  let epoch = 0;
  let mounted = true;

  return {
    commit: (candidate) => {
      if (candidate.actorId !== committedActorId) {
        committedActorId = candidate.actorId;
        epoch += 1;
      }
      return { actorId: candidate.actorId, epoch };
    },
    isCurrent: (token) => mounted
      && token.actorId === committedActorId
      && token.epoch === epoch,
    render: (actorId) => ({ actorId }),
    unmount: () => {
      mounted = false;
      committedActorId = null;
      epoch += 1;
    },
  };
}

async function flushHostMicrotasks(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
}
