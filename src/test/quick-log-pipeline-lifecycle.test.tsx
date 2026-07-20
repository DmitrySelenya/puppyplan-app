import { QueryClientProvider, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { useState, type ReactNode } from 'react';

import type { EventLogInsert } from '@/contracts/supabase';
import { createPuppyPlanQueryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import {
  QuickLogPipelineProvider,
  useQuickLogMutationPort,
  type QuickLogCachedEventRow,
  type QuickLogMutationPort,
  type QuickLogMutationVariables,
  type UseQuickLogMutationPortResult,
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

const mockOpenQuickLogQueueStorage = jest.fn<Promise<QuickLogQueueStorage>, []>();
const mockInsertEvent = jest.fn<Promise<QuickLogCachedEventRow>, [EventLogInsert]>();
const mockCaptureException = jest.fn();
const mockTrackQuickLogEvent = jest.fn();
const mockActorId = '00000000-0000-4000-8000-000000009003';
type MockAuthState =
  | Readonly<{ status: 'signedIn'; user: Readonly<{ id: string }> }>
  | Readonly<{ status: 'signedOut'; user: null }>;
const mockAuthState: { current: MockAuthState } = {
  current: {
    status: 'signedIn',
    user: { id: mockActorId },
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
      listEvents: jest.fn(),
      restoreByClientEventId: jest.fn(),
      selectExistingEvent: jest.fn(),
      tombstoneByClientEventId: jest.fn(),
      updatePayloadByClientEventId: jest.fn(),
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

const primaryHouseholdId = '00000000-0000-4000-8000-000000009001';
const primaryPuppyId = '00000000-0000-4000-8000-000000009002';

describe('Quick Log pipeline lifecycle (PUP-37)', () => {
  beforeEach(() => {
    mockInsertEvent.mockImplementation(async (insert) => createServerRowFromInsert(insert));
  });

  afterEach(() => {
    mockAuthState.current = {
      status: 'signedIn',
      user: { id: mockActorId },
    };
    jest.restoreAllMocks();
    mockOpenQuickLogQueueStorage.mockReset();
    mockInsertEvent.mockReset();
    mockCaptureException.mockReset();
    mockTrackQuickLogEvent.mockReset();
  });

  it('AC-1: mutate survives consumer unmount in the same commit', async () => {
    const harness = createLifecycleQueueHarness();
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createPuppyPlanQueryClient();
    const holderA: PortHolder = { current: null };
    const controls = createLifecycleControls();
    render(
      <LifecycleHarness
        controls={controls}
        holderA={holderA}
        queryClient={queryClient}
      />,
    );
    const port = await waitForReadyPort(holderA);
    const clientEventId = 'evt_00000000-0000-4000-8000-000000009101';

    // The real sheet closes itself in the same tap handler that mutates: the mutate() caller's
    // subtree unmounts in the same React commit. The session-scoped provider stays mounted.
    act(() => {
      port.mutate({
        requestId: 'req-lifecycle-ac1',
        variables: createFeedingVariables(clientEventId),
      });
      controls.unmountConsumerA();
    });

    await waitFor(() => {
      expect(harness.enqueue).toHaveBeenCalledTimes(1);
    });
    const [firstEnqueueCall] = harness.enqueue.mock.calls;
    if (firstEnqueueCall === undefined) {
      throw new Error('Expected a recorded enqueue call');
    }
    const enqueuedInput = quickLogQueueEnqueueInputSchema.parse(firstEnqueueCall[0]);
    expect(enqueuedInput.client_event_id).toBe(clientEventId);
    expect(mockCaptureException).not.toHaveBeenCalled();
    queryClient.clear();
  });

  it('AC-2: one queue open for two consumers', async () => {
    const harness = createLifecycleQueueHarness();
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createPuppyPlanQueryClient();
    const holderA: PortHolder = { current: null };
    const holderB: PortHolder = { current: null };
    const controls = createLifecycleControls();
    render(
      <LifecycleHarness
        controls={controls}
        holderA={holderA}
        holderB={holderB}
        queryClient={queryClient}
      />,
    );

    await waitForReadyPort(holderA);
    await waitForReadyPort(holderB);

    expect(mockOpenQuickLogQueueStorage).toHaveBeenCalledTimes(1);
    queryClient.clear();
  });

  it('AC-3: sign-out during in-flight mutate still supersedes', async () => {
    const harness = createLifecycleQueueHarness();
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createPuppyPlanQueryClient();
    const holderA: PortHolder = { current: null };
    const controls = createLifecycleControls();
    render(
      <LifecycleHarness
        controls={controls}
        holderA={holderA}
        queryClient={queryClient}
      />,
    );
    const port = await waitForReadyPort(holderA);
    const clientEventId = 'evt_00000000-0000-4000-8000-000000009301';
    const timelineRootKey = queryKeys.events.timelineRoot(primaryHouseholdId, primaryPuppyId);
    // Hold the mutation between its optimistic cache insert and the durable enqueue.
    const cancelGate = createDeferred();
    const cancelSpy = jest.spyOn(queryClient, 'cancelQueries')
      .mockImplementation(async () => {
        await cancelGate.promise;
      });

    act(() => {
      port.mutate({
        requestId: 'req-lifecycle-ac3',
        variables: createFeedingVariables(clientEventId),
      });
    });
    await waitFor(() => {
      expect(readCachedQuickLogRowIds(queryClient, timelineRootKey)).toContain(clientEventId);
    });

    act(() => {
      mockAuthState.current = { status: 'signedOut', user: null };
      controls.forceRender();
    });
    await act(async () => {
      cancelGate.resolve();
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    });

    expect(harness.enqueue.mock.calls).toEqual([]);
    expect(holderA.current?.status).toBe('loading');
    cancelSpy.mockRestore();
    queryClient.clear();
  });

  it('EC-1: mutation events survive consumer unmount', async () => {
    const harness = createLifecycleQueueHarness();
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createPuppyPlanQueryClient();
    const holderA: PortHolder = { current: null };
    const holderB: PortHolder = { current: null };
    const controls = createLifecycleControls();
    render(
      <LifecycleHarness
        controls={controls}
        holderA={holderA}
        holderB={holderB}
        queryClient={queryClient}
      />,
    );
    const port = await waitForReadyPort(holderA);
    await waitForReadyPort(holderB);
    const clientEventId = 'evt_00000000-0000-4000-8000-000000009401';

    act(() => {
      port.mutate({
        requestId: 'req-lifecycle-ec1',
        variables: createFeedingVariables(clientEventId),
      });
      controls.unmountConsumerA();
    });

    await waitFor(() => {
      expect(holderB.current?.mutationEvents).toEqual([
        {
          clientEventId,
          eventType: 'feeding',
          requestId: 'req-lifecycle-ec1',
          trackerId: 'feeding',
          type: 'started',
        },
      ]);
    });
    queryClient.clear();
  });

  it('ERR-1: hook without provider throws', () => {
    const harness = createLifecycleQueueHarness();
    mockOpenQuickLogQueueStorage.mockResolvedValue(harness.storage);
    const queryClient = createPuppyPlanQueryClient();

    expect(() => renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientOnlyWrapper(queryClient),
    })).toThrow(/QuickLogPipelineProvider/i);
    queryClient.clear();
  });
});

type PortHolder = { current: UseQuickLogMutationPortResult | null };

type LifecycleControls = {
  forceRender: () => void;
  unmountConsumerA: () => void;
};

function createLifecycleControls(): LifecycleControls {
  return {
    forceRender: () => {
      throw new Error('Lifecycle harness is not mounted');
    },
    unmountConsumerA: () => {
      throw new Error('Lifecycle harness is not mounted');
    },
  };
}

function PortConsumer({ holder }: Readonly<{ holder: PortHolder }>): null {
  holder.current = useQuickLogMutationPort();
  return null;
}

function LifecycleHarness(props: Readonly<{
  controls: LifecycleControls;
  holderA: PortHolder;
  holderB?: PortHolder;
  queryClient: QueryClient;
}>): ReactNode {
  const [consumerAMounted, setConsumerAMounted] = useState(true);
  const [, setRenderTick] = useState(0);
  props.controls.unmountConsumerA = () => setConsumerAMounted(false);
  props.controls.forceRender = () => setRenderTick((tick) => tick + 1);

  return (
    <QueryClientProvider client={props.queryClient}>
      <QuickLogPipelineProvider>
        {consumerAMounted ? <PortConsumer holder={props.holderA} /> : null}
        {props.holderB === undefined ? null : <PortConsumer holder={props.holderB} />}
      </QuickLogPipelineProvider>
    </QueryClientProvider>
  );
}

function createQueryClientOnlyWrapper(
  queryClient: QueryClient,
): (props: Readonly<{ children: ReactNode }>) => ReactNode {
  return function QueryClientOnlyWrapper(
    { children }: Readonly<{ children: ReactNode }>,
  ): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

async function waitForReadyPort(holder: PortHolder): Promise<QuickLogMutationPort> {
  await waitFor(() => {
    expect(holder.current?.status).toBe('ready');
  });
  const port = holder.current?.mutation;
  if (port === undefined) {
    throw new Error('Expected a ready Quick Log mutation port');
  }
  return port;
}

function createFeedingVariables(clientEventId: string): QuickLogMutationVariables {
  return {
    clientEventId,
    householdId: primaryHouseholdId,
    occurredAt: '2026-07-19T09:00:00.000Z',
    puppyId: primaryPuppyId,
    todayDate: '2026-07-19',
    trackerId: 'feeding',
  };
}

function readCachedQuickLogRowIds(
  queryClient: QueryClient,
  timelineRootKey: QueryKey,
): readonly string[] {
  return queryClient.getQueriesData<QuickLogCachedEventRow[]>({ queryKey: timelineRootKey })
    .flatMap(([, rows]) => rows ?? [])
    .map((row) => row.client_event_id);
}

function createServerRowFromInsert(insert: EventLogInsert): QuickLogCachedEventRow {
  return {
    id: '00000000-0000-4000-8000-000000009004',
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
    created_at: '2026-07-19T09:00:01.000Z',
    updated_at: '2026-07-19T09:00:01.000Z',
  };
}

type LifecycleQueueStorage = QuickLogQueueStorage & Readonly<{
  quarantineLegacyMissingActorItems(options: Readonly<{ now: string }>): Promise<void>;
}>;

function createLifecycleQueueHarness(): Readonly<{
  enqueue: jest.MockedFunction<QuickLogQueueStorage['enqueue']>;
  items: Map<string, QuickLogStoredQueueItem>;
  storage: LifecycleQueueStorage;
}> {
  const items = new Map<string, QuickLogStoredQueueItem>();
  const getRequired = (clientEventId: string): QuickLogStoredQueueItem => {
    const item = items.get(clientEventId);
    if (!item) throw new Error('Missing synthetic lifecycle queue item');
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
  const enqueue = jest.fn<
    ReturnType<QuickLogQueueStorage['enqueue']>,
    Parameters<QuickLogQueueStorage['enqueue']>
  >(async (input, options) => {
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
  });

  const storage: LifecycleQueueStorage = {
    // The drain loop stays a no-op so lifecycle tests observe durable acceptance, not sending.
    claimNextReadyToSend: async () => null,
    enqueue,
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
    quarantineLegacyMissingActorItems: async () => undefined,
    remove: async (clientEventId) => {
      items.delete(clientEventId);
    },
    removeIfState: async (clientEventId, expectedState, options) => {
      const retained = items.get(clientEventId);
      if (
        retained?.state !== expectedState
        || (
          options?.expectedCreatedBy !== undefined
          && retained.created_by !== options.expectedCreatedBy
        )
      ) {
        return false;
      }
      items.delete(clientEventId);
      return true;
    },
    resolveInFlightSuccess: async (clientEventId, options) => {
      const resolution = resolveQuickLogInFlightSuccess(getRequired(clientEventId), options);
      if (resolution.outcome === 'server_confirmed') {
        items.set(clientEventId, resolution.item);
      }
      return resolution;
    },
    // Real SQLite storage always provides this capability; without it the delete drain reports
    // `delete_queue_unavailable` to observability, which AC-1 would misread as a supersession.
    retainDeletedBeforeSync: async (clientEventId, options) => transition(
      clientEventId,
      (item) => createStoredQuickLogQueueItem({
        ...item,
        state: 'deleted_before_sync',
        retry_count: item.retry_count + 1,
        last_error_category: options.errorCategory,
        retry_after_at: options.retryAfterAt,
        updated_at: options.now,
      }),
    ),
  };

  return { enqueue, items, storage };
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
