import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';

import type {
  QuickLogRecoverySurface,
  QuickLogSourceSurface,
} from '@/contracts/analytics';
import {
  createQuickLogEventInsert,
  isQuickLogEventType,
  type QuickLogEventInsert,
  type QuickLogEventType,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import {
  eventLogInsertSchema,
  eventLogRecordSchema,
  type EventLogInsert,
  type EventLogRecord,
} from '@/contracts/supabase';
import {
  normalizeQuickLogQueueFailureForPersistence,
  type QuickLogQueueErrorCategory,
  type QuickLogQueueState,
  type QuickLogQueueStorage,
  type QuickLogStoredQueueItem,
  openQuickLogQueueStorage,
} from '@/lib/queue';
import {
  createAnalyticsClient,
  type QuickLogAnalyticsClient,
} from '@/lib/analytics';
import {
  createObservabilityReporter,
  type ObservabilityReporter,
} from '@/lib/observability';
import {
  createSupabaseEventLogRepository,
  type SupabaseEventLogRepository,
} from '@/lib/supabase/events';
import { useAuth } from '@/lib/auth';

import { getQuickLogInvalidationKeys, queryKeys, type TimelineFilters } from './keys';

export type QuickLogCachedEventRow = EventLogRecord & {
  localSync?: Readonly<{
    state: QuickLogQueueState;
    category: QuickLogQueueErrorCategory | null;
    retryCount: number;
  }>;
};

export type QuickLogMutationVariables = Readonly<{
  householdId: string;
  puppyId: string;
  trackerId: QuickLogTrackerId;
  occurredAt: string;
  recoverySurface?: QuickLogRecoverySurface;
  todayDate: string;
}>;

export type QuickLogMutationContext = Readonly<{
  clientEventId: string;
  insert: QuickLogEventInsert;
  invalidationKeys: readonly QueryKey[];
  timelineRootKey: QueryKey;
  recoverySurface?: QuickLogRecoverySurface;
  snapshots: readonly QuickLogCacheSnapshot[];
  queuedItem: QuickLogStoredQueueItem;
}>;

export type QuickLogCacheSnapshot = Readonly<{
  queryKey: QueryKey;
  rows: QuickLogCachedEventRow[] | undefined;
}>;

export type QuickLogMutationOptions = Readonly<{
  mutationFn(variables: QuickLogMutationVariables): Promise<EventLogRecord>;
  onMutate(variables: QuickLogMutationVariables): Promise<QuickLogMutationContext>;
  onError(
    error: unknown,
    variables: QuickLogMutationVariables,
    context: QuickLogMutationContext | undefined,
  ): Promise<void>;
  onSuccess(
    data: EventLogRecord,
    variables: QuickLogMutationVariables,
    context: QuickLogMutationContext | undefined,
  ): Promise<void>;
  onSettled(
    data: EventLogRecord | undefined,
    error: unknown,
    variables: QuickLogMutationVariables,
    context: QuickLogMutationContext | undefined,
  ): Promise<void>;
}>;

export type QuickLogMutationPortRequest = Readonly<{
  requestId: string;
  variables: QuickLogMutationVariables;
}>;

export type QuickLogMutationPortUndoRequest = Readonly<{
  clientEventId: string;
  eventType: QuickLogEventType;
  householdId: string;
  puppyId: string;
  todayDate: string;
}>;

export type QuickLogMutationPort = Readonly<{
  deleteLocal: (clientEventId: string) => unknown;
  mutate: (request: QuickLogMutationPortRequest) => unknown;
  retry: (
    clientEventId: string,
    recoverySurface: QuickLogRecoverySurface,
    sourceSurface?: QuickLogSourceSurface,
  ) => unknown;
  undo: (request: QuickLogMutationPortUndoRequest) => unknown;
}>;

export type QuickLogMutationEvent =
  | Readonly<{
    clientEventId: string;
    eventType: QuickLogEventType;
    requestId: string;
    trackerId: QuickLogTrackerId;
    type: 'started';
  }>
  | Readonly<{
    clientEventId: string;
    eventType: QuickLogEventType;
    requestId: string;
    state: 'failed_retryable' | 'failed_permanent';
    trackerId: QuickLogTrackerId;
    type: 'failed';
  }>;

export type UseQuickLogMutationPortResult = Readonly<{
  mutation: QuickLogMutationPort | undefined;
  mutationEvents: readonly QuickLogMutationEvent[];
  status: 'loading' | 'ready' | 'unavailable';
}>;

type QuickLogMutationQueue = Pick<
  QuickLogQueueStorage,
  | 'enqueue'
  | 'getByClientEventId'
  | 'markSending'
  | 'markFailedRetryable'
  | 'markFailedPermanent'
  | 'markDeletedBeforeSync'
  | 'resolveInFlightSuccess'
  | 'remove'
>;

type QuickLogManualRetryQueue = Pick<
  QuickLogQueueStorage,
  | 'getByClientEventId'
  | 'manualRetry'
  | 'markFailedPermanent'
  | 'markFailedRetryable'
  | 'remove'
  | 'resolveInFlightSuccess'
>;

export type QuickLogMutationDependencies = Readonly<{
  queryClient: QueryClient;
  queue: QuickLogMutationQueue;
  analytics?: QuickLogAnalyticsClient;
  observability?: ObservabilityReporter;
  events?: Pick<SupabaseEventLogRepository, 'insertEvent' | 'tombstoneByClientEventId'>;
  // Optional only while production Quick Log is gated by the deferred active care context.
  // Production wiring must inject the synchronous session actor instead of using the null default.
  getSessionUserId?: () => string | null;
  createClientEventId?: () => string;
  now?: () => string;
}>;

// TanStack passes the same variables object from onMutate to mutationFn for one call.
// Callers must pass a fresh variables object per mutate call so this handoff cannot collide.
const mutationContextByVariables = new WeakMap<
  QuickLogMutationVariables,
  QuickLogMutationContext
>();
const contextsSkippingAllInvalidation = new WeakSet<QuickLogMutationContext>();

export function createQuickLogMutationOptions(
  dependencies: QuickLogMutationDependencies,
): QuickLogMutationOptions {
  const events = dependencies.events ?? createSupabaseEventLogRepository();
  const analytics = dependencies.analytics ?? createAnalyticsClient();
  const observability = dependencies.observability ?? createObservabilityReporter();
  const getSessionUserId = dependencies.getSessionUserId ?? (() => null);
  const createClientEventId = dependencies.createClientEventId ?? createDefaultClientEventId;
  const now = dependencies.now ?? (() => new Date().toISOString());

  return {
    onMutate: async (variables) => {
      const actorId = getSessionUserId();

      if (actorId === null) {
        throw new Error('Quick Log requires an authenticated session');
      }

      const clientEventId = createClientEventId();
      const insert = createQuickLogEventInsert({
        client_event_id: clientEventId,
        household_id: variables.householdId,
        puppy_id: variables.puppyId,
        created_by: actorId,
        tracker_id: variables.trackerId,
        occurred_at: variables.occurredAt,
      });
      const timestamp = now();
      const invalidationKeys = getQuickLogInvalidationKeys({
        householdId: insert.household_id,
        puppyId: insert.puppy_id,
        eventType: insert.event_type,
        todayDate: variables.todayDate,
      });
      const timelineRootKey = queryKeys.events.timelineRoot(
        insert.household_id,
        insert.puppy_id,
      );

      // Dispatch cancellation before the optimistic insert, then await it before durable enqueue/network.
      // This keeps tap-to-visible cache writes immediate while preventing late refetch overwrites.
      const cancelQueries = cancelAffectedQueries(dependencies.queryClient, {
        invalidationKeys,
        timelineRootKey,
      });

      const snapshots = snapshotCachedRows(dependencies.queryClient, timelineRootKey);
      const optimisticRow = createOptimisticEventRow(insert, {
        now: timestamp,
        localSyncState: 'pending_local',
        localSyncCategory: null,
        retryCount: 0,
      });

      upsertCachedEventRow(dependencies.queryClient, {
        timelineRootKey,
        calendarDate: variables.todayDate,
        row: optimisticRow,
      });

      let queuedItem: QuickLogStoredQueueItem;

      try {
        await cancelQueries;
        queuedItem = await dependencies.queue.enqueue({
          ...insert,
          created_at: timestamp,
        }, {
          now: timestamp,
        });
      } catch (error) {
        removeCachedEventRow(dependencies.queryClient, {
          timelineRootKey,
          clientEventId,
        });

        throw error;
      }
      const context: QuickLogMutationContext = {
        clientEventId,
        insert,
        invalidationKeys,
        timelineRootKey,
        recoverySurface: variables.recoverySurface,
        snapshots,
        queuedItem,
      };

      updateCachedLocalSync(dependencies.queryClient, {
        timelineRootKey,
        clientEventId,
        state: queuedItem.state,
        category: queuedItem.last_error_category,
        retryCount: queuedItem.retry_count,
      });
      analytics.trackQuickLogEvent({
        name: 'pending_quick_log_created',
        properties: {
          connection_state: 'unknown',
          event_type: insert.event_type,
        },
      });
      mutationContextByVariables.set(variables, context);

      return context;
    },
    mutationFn: async (variables) => {
      const context = getRequiredMutationContext(variables);
      const timestamp = now();

      await dependencies.queue.markSending(context.clientEventId, {
        now: timestamp,
      });

      return events.insertEvent(context.insert);
    },
    onError: async (error, _variables, context) => {
      if (!context) {
        return;
      }

      const queueItem = await dependencies.queue.getByClientEventId(context.clientEventId)
        ?? context.queuedItem;

      if (queueItem.state === 'deleted_before_sync') {
        contextsSkippingAllInvalidation.add(context);
        return;
      }

      const decision = normalizeQuickLogQueueFailureForPersistence({
        error,
        retryCount: queueItem.retry_count,
      });
      const timestamp = now();
      const failedItem = decision.decision === 'retryable'
        ? await dependencies.queue.markFailedRetryable(context.clientEventId, {
          errorCategory: decision.category,
          retryAfterAt: retryAfterAt(timestamp, decision.retryAfterMs),
          now: timestamp,
        })
        : await dependencies.queue.markFailedPermanent(context.clientEventId, {
          errorCategory: decision.category,
          now: timestamp,
        });

      updateCachedLocalSync(dependencies.queryClient, {
        timelineRootKey: context.timelineRootKey,
        clientEventId: context.clientEventId,
        state: failedItem.state,
        category: failedItem.last_error_category,
        retryCount: failedItem.retry_count,
      });
      analytics.trackQuickLogEvent({
        name: 'event_save_failed',
        properties: {
          connection_state: 'unknown',
          error_category: decision.category,
          event_type: context.insert.event_type,
        },
      });
      observability.captureException(new Error('Quick Log operation failed'), {
        area: 'quick_log',
        errorCategory: decision.category,
        operation: 'save_event',
        tags: {
          event_type: context.insert.event_type,
        },
      });
    },
    onSuccess: async (data, _variables, context) => {
      if (!context) {
        return;
      }

      const resolution = await dependencies.queue.resolveInFlightSuccess(context.clientEventId, {
        now: now(),
      });

      if (resolution.outcome === 'requires_server_cleanup') {
        try {
          await events.tombstoneByClientEventId({
            householdId: context.insert.household_id,
            clientEventId: context.clientEventId,
            deletedAt: now(),
          });
          removeCachedEventRow(dependencies.queryClient, {
            timelineRootKey: context.timelineRootKey,
            clientEventId: context.clientEventId,
          });
          await dependencies.queue.remove(context.clientEventId);
        } catch {
          contextsSkippingAllInvalidation.add(context);
        }

        return;
      }

      replaceCachedEventRow(dependencies.queryClient, {
        timelineRootKey: context.timelineRootKey,
        clientEventId: context.clientEventId,
        row: {
          ...data,
          localSync: undefined,
        },
      });
      const retryCountBucket = bucketRetryCount(resolution.item.retry_count);

      if (retryCountBucket !== null && context.recoverySurface !== undefined) {
        analytics.trackQuickLogEvent({
          name: 'offline_or_failed_log_recovered',
          properties: {
            event_type: context.insert.event_type,
            recovery_surface: context.recoverySurface,
            retry_count_bucket: retryCountBucket,
          },
        });
      }
      analytics.trackQuickLogEvent({
        name: 'event_logged',
        properties: {
          connection_state: 'unknown',
          event_type: context.insert.event_type,
          save_result: 'server_confirmed',
          source_surface: 'quick_log_sheet',
        },
      });
      await dependencies.queue.remove(context.clientEventId);
    },
    onSettled: async (_data, error, variables, context) => {
      if (!context) {
        return;
      }

      if (contextsSkippingAllInvalidation.has(context)) {
        contextsSkippingAllInvalidation.delete(context);
        mutationContextByVariables.delete(variables);
        return;
      }

      await invalidateAffectedQueries(dependencies.queryClient, {
        invalidationKeys: context.invalidationKeys,
        timelineRootKey: context.timelineRootKey,
        includeTimeline: error === null || error === undefined,
      });
      mutationContextByVariables.delete(variables);
    },
  };
}

export function useQuickLogMutationPort(): UseQuickLogMutationPortResult {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const queueRef = useRef<QuickLogQueueStorage | null>(null);
  const userIdRef = useRef<string | null>(null);
  const requestIdsByVariablesRef = useRef(new WeakMap<QuickLogMutationVariables, string>());
  const [queueReady, setQueueReady] = useState(false);
  const [queueUnavailable, setQueueUnavailable] = useState(false);
  const [mutationEvents, setMutationEvents] = useState<readonly QuickLogMutationEvent[]>([]);

  userIdRef.current = auth.user?.id ?? null;

  useEffect(() => {
    let active = true;

    setQueueUnavailable(false);
    void openQuickLogQueueStorage().then((queue) => {
      if (!active) {
        return;
      }

      queueRef.current = queue;
      setQueueReady(true);
    }).catch(() => {
      if (!active) {
        return;
      }

      queueRef.current = null;
      setQueueReady(false);
      setQueueUnavailable(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const queue = useMemo(
    () => createRequiredQuickLogQueueProxy(queueRef),
    [],
  );
  const options = useMemo(
    () => createQuickLogMutationOptions({
      getSessionUserId: () => userIdRef.current,
      queryClient,
      queue,
    }),
    [queryClient, queue],
  );
  const quickLogMutation = useMutation<EventLogRecord, unknown, QuickLogMutationVariables, QuickLogMutationContext>({
    mutationFn: options.mutationFn,
    onError: async (error, variables, context) => {
      await options.onError(error, variables, context);

      const requestId = requestIdsByVariablesRef.current.get(variables);
      if (!requestId || !context) {
        return;
      }

      const item = await queue.getByClientEventId(context.clientEventId);
      if (item?.state !== 'failed_retryable' && item?.state !== 'failed_permanent') {
        return;
      }

      appendQuickLogMutationEvent(setMutationEvents, {
        clientEventId: context.clientEventId,
        eventType: context.insert.event_type,
        requestId,
        state: item.state,
        trackerId: variables.trackerId,
        type: 'failed',
      });
    },
    onMutate: async (variables) => {
      const context = await options.onMutate(variables);
      const requestId = requestIdsByVariablesRef.current.get(variables);

      if (requestId) {
        appendQuickLogMutationEvent(setMutationEvents, {
          clientEventId: context.clientEventId,
          eventType: context.insert.event_type,
          requestId,
          trackerId: variables.trackerId,
          type: 'started',
        });
      }

      return context;
    },
    onSettled: async (data, error, variables, context) => {
      await options.onSettled(data, error, variables, context);
      requestIdsByVariablesRef.current.delete(variables);
    },
    onSuccess: options.onSuccess,
  });

  const mutation = useMemo<QuickLogMutationPort | undefined>(() => {
    if (
      auth.status !== 'signedIn'
      || auth.user === null
      || !queueReady
      || queueUnavailable
    ) {
      return undefined;
    }

    return {
      deleteLocal: (clientEventId) => {
        void deleteLocalQuickLogEvent({
          clientEventId,
          queryClient,
          queueRef,
        });
      },
      mutate: (request) => {
        requestIdsByVariablesRef.current.set(request.variables, request.requestId);
        quickLogMutation.mutate(request.variables);
      },
      retry: (clientEventId, recoverySurface, sourceSurface = 'quick_log_sheet') => {
        void retryLocalQuickLogEvent({
          clientEventId,
          queryClient,
          queueRef,
          recoverySurface,
          sourceSurface,
        });
      },
      undo: (request) => {
        void removeQuickLogOptimisticEvent({
          clientEventId: request.clientEventId,
          eventType: request.eventType,
          householdId: request.householdId,
          now: new Date().toISOString(),
          puppyId: request.puppyId,
          queryClient,
          queue,
          todayDate: request.todayDate,
        }).catch(() => undefined);
      },
    };
  }, [auth.status, auth.user, queue, queueReady, queueUnavailable, queryClient, quickLogMutation]);

  return {
    mutation,
    mutationEvents,
    status: mutation !== undefined
      ? 'ready'
      : queueUnavailable
        ? 'unavailable'
        : 'loading',
  };
}

export async function removeQuickLogOptimisticEvent(
  input: Readonly<{
    queryClient: QueryClient;
    queue: Pick<
      QuickLogQueueStorage,
      'getByClientEventId' | 'markDeletedBeforeSync' | 'remove'
    >;
    householdId: string;
    puppyId: string;
    eventType: EventLogInsert['event_type'];
    todayDate: string;
    clientEventId: string;
    now: string;
  }>,
): Promise<void> {
  const item = await input.queue.getByClientEventId(input.clientEventId);

  if (item?.state === 'sending') {
    await input.queue.markDeletedBeforeSync(input.clientEventId, {
      now: input.now,
    });
  } else if (
    item?.state === 'pending_local'
    || item?.state === 'failed_retryable'
    || item?.state === 'failed_permanent'
  ) {
    await input.queue.remove(input.clientEventId);
  } else if (item?.state === 'server_confirmed') {
    throw new Error('Confirmed Quick Log rows require the server delete path');
  }

  removeCachedEventRow(input.queryClient, {
    timelineRootKey: queryKeys.events.timelineRoot(input.householdId, input.puppyId),
    clientEventId: input.clientEventId,
  });
  await invalidateAffectedQueries(input.queryClient, {
    invalidationKeys: getQuickLogInvalidationKeys({
      householdId: input.householdId,
      puppyId: input.puppyId,
      eventType: input.eventType,
      todayDate: input.todayDate,
    }),
    timelineRootKey: queryKeys.events.timelineRoot(input.householdId, input.puppyId),
    includeTimeline: true,
  });
}

function createRequiredQuickLogQueueProxy(
  queueRef: Readonly<{ current: QuickLogQueueStorage | null }>,
): QuickLogMutationDependencies['queue'] {
  return {
    enqueue: (input, options) => requireQuickLogQueue(queueRef).enqueue(input, options),
    getByClientEventId: (clientEventId) =>
      requireQuickLogQueue(queueRef).getByClientEventId(clientEventId),
    markDeletedBeforeSync: (clientEventId, options) =>
      requireQuickLogQueue(queueRef).markDeletedBeforeSync(clientEventId, options),
    markFailedPermanent: (clientEventId, options) =>
      requireQuickLogQueue(queueRef).markFailedPermanent(clientEventId, options),
    markFailedRetryable: (clientEventId, options) =>
      requireQuickLogQueue(queueRef).markFailedRetryable(clientEventId, options),
    markSending: (clientEventId, options) =>
      requireQuickLogQueue(queueRef).markSending(clientEventId, options),
    remove: (clientEventId) => requireQuickLogQueue(queueRef).remove(clientEventId),
    resolveInFlightSuccess: (clientEventId, options) =>
      requireQuickLogQueue(queueRef).resolveInFlightSuccess(clientEventId, options),
  };
}

function requireQuickLogQueue<TQueue extends object>(
  queueRef: Readonly<{ current: TQueue | null }>,
): TQueue {
  if (queueRef.current === null) {
    throw new Error('Quick Log queue is not ready');
  }

  return queueRef.current;
}

function appendQuickLogMutationEvent(
  setMutationEvents: (update: (current: readonly QuickLogMutationEvent[]) => readonly QuickLogMutationEvent[]) => void,
  event: QuickLogMutationEvent,
): void {
  setMutationEvents((current) => [...current, event].slice(-50));
}

async function deleteLocalQuickLogEvent(input: Readonly<{
  clientEventId: string;
  queryClient: QueryClient;
  queueRef: Readonly<{ current: QuickLogQueueStorage | null }>;
}>): Promise<void> {
  const queue = requireQuickLogQueue(input.queueRef);
  const item = await queue.getByClientEventId(input.clientEventId);

  if (!item) {
    return;
  }

  await removeQuickLogOptimisticEvent({
    clientEventId: input.clientEventId,
    eventType: item.event_type,
    householdId: item.household_id,
    now: new Date().toISOString(),
    puppyId: item.puppy_id,
    queryClient: input.queryClient,
    queue,
    todayDate: item.occurred_at.slice(0, 10),
  }).catch(() => undefined);
}

export async function retryLocalQuickLogEvent(input: Readonly<{
  analytics?: QuickLogAnalyticsClient;
  clientEventId: string;
  events?: Pick<SupabaseEventLogRepository, 'insertEvent' | 'tombstoneByClientEventId'>;
  now?: () => string;
  observability?: ObservabilityReporter;
  queryClient: QueryClient;
  queueRef: Readonly<{ current: QuickLogManualRetryQueue | null }>;
  recoverySurface: QuickLogRecoverySurface;
  sourceSurface?: QuickLogSourceSurface;
}>): Promise<void> {
  const queue = requireQuickLogQueue(input.queueRef);
  const events = input.events ?? createSupabaseEventLogRepository();
  const analytics = input.analytics ?? createAnalyticsClient();
  const observability = input.observability ?? createObservabilityReporter();
  const now = input.now ?? (() => new Date().toISOString());
  const timestamp = now();
  const retry = await queue.manualRetry(input.clientEventId, {
    now: timestamp,
    recoverySurface: input.recoverySurface,
  });
  const todayDate = retry.item.occurred_at.slice(0, 10);
  const timelineRootKey = queryKeys.events.timelineRoot(
    retry.item.household_id,
    retry.item.puppy_id,
  );
  const invalidationKeys = getQuickLogInvalidationKeys({
    eventType: retry.item.event_type,
    householdId: retry.item.household_id,
    puppyId: retry.item.puppy_id,
    todayDate,
  });

  replayQuickLogQueueItemToCache({
    item: retry.item,
    queryClient: input.queryClient,
    todayDate,
  });

  if (retry.item.created_by === null) {
    const failedItem = await queue.markFailedPermanent(input.clientEventId, {
      errorCategory: 'missing_context',
      now: now(),
    });

    updateCachedLocalSync(input.queryClient, {
      timelineRootKey,
      clientEventId: input.clientEventId,
      state: failedItem.state,
      category: failedItem.last_error_category,
      retryCount: failedItem.retry_count,
    });
    await invalidateAffectedQueries(input.queryClient, {
      invalidationKeys,
      timelineRootKey,
      includeTimeline: false,
    });
    return;
  }

  const insert = eventLogInsertSchema.parse({
    client_event_id: retry.item.client_event_id,
    created_by: retry.item.created_by,
    event_type: retry.item.event_type,
    household_id: retry.item.household_id,
    occurred_at: retry.item.occurred_at,
    payload: retry.item.payload,
    payload_version: retry.item.payload_version,
    puppy_id: retry.item.puppy_id,
  }) as EventLogInsert;
  const quickLogEventType = isQuickLogEventType(insert.event_type)
    ? insert.event_type
    : null;

  if (quickLogEventType === null) {
    const failedItem = await queue.markFailedPermanent(input.clientEventId, {
      errorCategory: 'unsupported_schema_version',
      now: now(),
    });

    updateCachedLocalSync(input.queryClient, {
      timelineRootKey,
      clientEventId: input.clientEventId,
      state: failedItem.state,
      category: failedItem.last_error_category,
      retryCount: failedItem.retry_count,
    });
    await invalidateAffectedQueries(input.queryClient, {
      invalidationKeys,
      timelineRootKey,
      includeTimeline: false,
    });
    return;
  }

  try {
    const data = await events.insertEvent(insert);
    const resolution = await queue.resolveInFlightSuccess(input.clientEventId, {
      now: now(),
    });

    if (resolution.outcome === 'requires_server_cleanup') {
      try {
        await events.tombstoneByClientEventId({
          householdId: insert.household_id,
          clientEventId: input.clientEventId,
          deletedAt: now(),
        });
        removeCachedEventRow(input.queryClient, {
          timelineRootKey,
          clientEventId: input.clientEventId,
        });
        await queue.remove(input.clientEventId);
      } catch {
        await invalidateAffectedQueries(input.queryClient, {
          invalidationKeys,
          timelineRootKey,
          includeTimeline: false,
        });
        return;
      }
      await invalidateAffectedQueries(input.queryClient, {
        invalidationKeys,
        timelineRootKey,
        includeTimeline: true,
      });
      return;
    }

    replaceCachedEventRow(input.queryClient, {
      timelineRootKey,
      clientEventId: input.clientEventId,
      row: {
        ...data,
        localSync: undefined,
      },
    });
    const retryCountBucket = bucketRetryCount(resolution.item.retry_count);

    if (retryCountBucket !== null) {
      analytics.trackQuickLogEvent({
        name: 'offline_or_failed_log_recovered',
        properties: {
          event_type: quickLogEventType,
          recovery_surface: retry.recovery_surface ?? input.recoverySurface,
          retry_count_bucket: retryCountBucket,
        },
      });
    }
    analytics.trackQuickLogEvent({
      name: 'event_logged',
      properties: {
        connection_state: 'unknown',
        event_type: quickLogEventType,
        save_result: 'server_confirmed',
        source_surface: input.sourceSurface ?? 'quick_log_sheet',
      },
    });
    await queue.remove(input.clientEventId);
    await invalidateAffectedQueries(input.queryClient, {
      invalidationKeys,
      timelineRootKey,
      includeTimeline: true,
    });
  } catch (error) {
    const latestItem = await queue.getByClientEventId(input.clientEventId).catch(() => null);

    if (latestItem?.state === 'deleted_before_sync') {
      await invalidateAffectedQueries(input.queryClient, {
        invalidationKeys,
        timelineRootKey,
        includeTimeline: false,
      });
      return;
    }

    const decision = normalizeQuickLogQueueFailureForPersistence({
      error,
      retryCount: latestItem?.retry_count ?? retry.item.retry_count,
    });
    const failedAt = now();
    const failedItem = decision.decision === 'retryable'
      ? await queue.markFailedRetryable(input.clientEventId, {
        errorCategory: decision.category,
        retryAfterAt: retryAfterAt(failedAt, decision.retryAfterMs),
        now: failedAt,
      })
      : await queue.markFailedPermanent(input.clientEventId, {
        errorCategory: decision.category,
        now: failedAt,
      });

    updateCachedLocalSync(input.queryClient, {
      timelineRootKey,
      clientEventId: input.clientEventId,
      state: failedItem.state,
      category: failedItem.last_error_category,
      retryCount: failedItem.retry_count,
    });
    analytics.trackQuickLogEvent({
      name: 'event_save_failed',
      properties: {
        connection_state: 'unknown',
        error_category: decision.category,
        event_type: quickLogEventType,
      },
    });
    observability.captureException(new Error('Quick Log operation failed'), {
      area: 'quick_log',
      errorCategory: decision.category,
      operation: 'manual_retry_event',
      tags: {
        event_type: quickLogEventType,
      },
    });
    await invalidateAffectedQueries(input.queryClient, {
      invalidationKeys,
      timelineRootKey,
      includeTimeline: false,
    });
  }
}

export function replayQuickLogQueueItemToCache(
  input: Readonly<{
    queryClient: QueryClient;
    item: QuickLogStoredQueueItem;
    todayDate: string;
  }>,
): void {
  const item = input.item;

  if (item.created_by === null) {
    return;
  }

  upsertCachedEventRow(input.queryClient, {
    timelineRootKey: queryKeys.events.timelineRoot(
      item.household_id,
      item.puppy_id,
    ),
    calendarDate: input.todayDate,
    row: createCachedEventRowFromQueueItem({
      ...item,
      created_by: item.created_by,
    }),
  });
}

async function cancelAffectedQueries(
  queryClient: QueryClient,
  input: Readonly<{
    invalidationKeys: readonly QueryKey[];
    timelineRootKey: QueryKey;
  }>,
): Promise<void> {
  await Promise.all(input.invalidationKeys.map((queryKey) =>
    queryClient.cancelQueries({
      queryKey,
      exact: !isSameQueryKey(queryKey, input.timelineRootKey),
    })));
}

async function invalidateAffectedQueries(
  queryClient: QueryClient,
  input: Readonly<{
    invalidationKeys: readonly QueryKey[];
    timelineRootKey: QueryKey;
    includeTimeline: boolean;
  }>,
): Promise<void> {
  const invalidationKeys = input.includeTimeline
    ? input.invalidationKeys
    : input.invalidationKeys.filter((queryKey) =>
      !isSameQueryKey(queryKey, input.timelineRootKey));

  await Promise.all(invalidationKeys.map((queryKey) =>
    queryClient.invalidateQueries({
      queryKey,
      exact: !isSameQueryKey(queryKey, input.timelineRootKey),
    })));
}

function upsertCachedEventRow(
  queryClient: QueryClient,
  input: Readonly<{
    timelineRootKey: QueryKey;
    calendarDate: string;
    row: QuickLogCachedEventRow;
  }>,
): void {
  const matchingQueries = queryClient.getQueriesData<QuickLogCachedEventRow[]>({
    queryKey: input.timelineRootKey,
  });
  const compatibleQueryKeys = matchingQueries
    .map(([queryKey]) => queryKey)
    .filter((queryKey) => canTimelineQueryContainRow(queryKey, {
      timelineRootKey: input.timelineRootKey,
      calendarDate: input.calendarDate,
      row: input.row,
    }));
  const canonicalDayKey = queryKeys.events.timeline(
    input.row.household_id,
    input.row.puppy_id,
    {
      from: input.calendarDate,
      to: input.calendarDate,
    },
  );
  const canonicalTimelineKey = queryKeys.events.timeline(
    input.row.household_id,
    input.row.puppy_id,
  );
  const queryKeysToUpdate = uniqueQueryKeys([
    input.timelineRootKey,
    canonicalTimelineKey,
    canonicalDayKey,
    ...compatibleQueryKeys,
  ]);

  for (const queryKey of queryKeysToUpdate) {
    queryClient.setQueryData<QuickLogCachedEventRow[]>(queryKey, (previousRows = []) => {
      const nextRows = previousRows.filter((row) =>
        row.client_event_id !== input.row.client_event_id);

      return [input.row, ...nextRows];
    });
  }
}

function replaceCachedEventRow(
  queryClient: QueryClient,
  input: Readonly<{
    timelineRootKey: QueryKey;
    clientEventId: string;
    row: QuickLogCachedEventRow;
  }>,
): void {
  updateMatchingCachedRows(queryClient, input.timelineRootKey, (rows) =>
    rows.map((row) => row.client_event_id === input.clientEventId
      ? input.row
      : row));
}

function removeCachedEventRow(
  queryClient: QueryClient,
  input: Readonly<{
    timelineRootKey: QueryKey;
    clientEventId: string;
  }>,
): void {
  updateMatchingCachedRows(queryClient, input.timelineRootKey, (rows) =>
    rows.filter((row) => row.client_event_id !== input.clientEventId));
}

function updateCachedLocalSync(
  queryClient: QueryClient,
  input: Readonly<{
    timelineRootKey: QueryKey;
    clientEventId: string;
    state: QuickLogQueueState;
    category: QuickLogQueueErrorCategory | null;
    retryCount: number;
  }>,
): void {
  updateMatchingCachedRows(queryClient, input.timelineRootKey, (rows) =>
    rows.map((row) => row.client_event_id === input.clientEventId
      ? {
        ...row,
        localSync: {
          state: input.state,
          category: input.category,
          retryCount: input.retryCount,
        },
      }
      : row));
}

function updateMatchingCachedRows(
  queryClient: QueryClient,
  timelineRootKey: QueryKey,
  update: (rows: QuickLogCachedEventRow[]) => QuickLogCachedEventRow[],
): void {
  const matchingQueries = queryClient.getQueriesData<QuickLogCachedEventRow[]>({
    queryKey: timelineRootKey,
  });
  const queryKeysToUpdate = matchingQueries.length > 0
    ? matchingQueries.map(([queryKey]) => queryKey)
    : [timelineRootKey];

  for (const queryKey of queryKeysToUpdate) {
    queryClient.setQueryData<QuickLogCachedEventRow[]>(queryKey, (previousRows = []) =>
      update(previousRows));
  }
}

function snapshotCachedRows(
  queryClient: QueryClient,
  timelineRootKey: QueryKey,
): QuickLogCacheSnapshot[] {
  const matchingQueries = queryClient.getQueriesData<QuickLogCachedEventRow[]>({
    queryKey: timelineRootKey,
  });

  return matchingQueries.map(([queryKey, rows]) => ({
    queryKey,
    rows,
  }));
}

function canTimelineQueryContainRow(
  queryKey: QueryKey,
  input: Readonly<{
    timelineRootKey: QueryKey;
    calendarDate: string;
    row: QuickLogCachedEventRow;
  }>,
): boolean {
  if (isSameQueryKey(queryKey, input.timelineRootKey)) {
    return true;
  }

  const filters = getTimelineQueryFilters(queryKey, input.timelineRootKey);

  if (filters === null || filters.cursor !== undefined) {
    return false;
  }

  if (
    filters.eventTypes !== undefined
    && !filters.eventTypes.includes(input.row.event_type)
  ) {
    return false;
  }

  if (filters.from !== undefined && input.calendarDate < filters.from) {
    return false;
  }

  if (filters.to !== undefined && input.calendarDate > filters.to) {
    return false;
  }

  return true;
}

function uniqueQueryKeys(queryKeysToDedupe: readonly QueryKey[]): QueryKey[] {
  const uniqueKeys: QueryKey[] = [];

  for (const queryKey of queryKeysToDedupe) {
    if (!uniqueKeys.some((existingQueryKey) => isSameQueryKey(existingQueryKey, queryKey))) {
      uniqueKeys.push(queryKey);
    }
  }

  return uniqueKeys;
}

function getTimelineQueryFilters(
  queryKey: QueryKey,
  timelineRootKey: QueryKey,
): TimelineFilters | null {
  if (queryKey.length !== timelineRootKey.length + 1) {
    return null;
  }

  if (!queryKey.slice(0, timelineRootKey.length).every((value, index) =>
    value === timelineRootKey[index])) {
    return null;
  }

  const filters = queryKey[timelineRootKey.length];

  if (!isRecord(filters)) {
    return null;
  }

  return {
    from: typeof filters.from === 'string' ? filters.from : undefined,
    to: typeof filters.to === 'string' ? filters.to : undefined,
    eventTypes: isEventTypeArray(filters.eventTypes)
      ? filters.eventTypes
      : undefined,
    cursor: typeof filters.cursor === 'string' ? filters.cursor : undefined,
  };
}

function isEventTypeArray(value: unknown): value is TimelineFilters['eventTypes'] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function createOptimisticEventRow(
  insert: EventLogInsert,
  input: Readonly<{
    now: string;
    localSyncState: QuickLogQueueState;
    localSyncCategory: QuickLogQueueErrorCategory | null;
    retryCount: number;
  }>,
): QuickLogCachedEventRow {
  const row = eventLogRecordSchema.parse({
    id: uuidFromQuickLogClientEventId(insert.client_event_id),
    ...insert,
    version: 1,
    deleted_at: null,
    created_at: input.now,
    updated_at: input.now,
  });

  return {
    ...row,
    localSync: {
      state: input.localSyncState,
      category: input.localSyncCategory,
      retryCount: input.retryCount,
    },
  };
}

function createCachedEventRowFromQueueItem(
  item: QuickLogStoredQueueItem & Readonly<{ created_by: string }>,
): QuickLogCachedEventRow {
  return {
    id: uuidFromQuickLogClientEventId(item.client_event_id),
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
    created_at: item.created_at,
    updated_at: item.updated_at,
    localSync: {
      state: item.state,
      category: item.last_error_category,
      retryCount: item.retry_count,
    },
  };
}

function uuidFromQuickLogClientEventId(clientEventId: string): string {
  return clientEventId.startsWith('evt_')
    ? clientEventId.slice('evt_'.length)
    : clientEventId;
}

function getRequiredMutationContext(
  variables: QuickLogMutationVariables,
): QuickLogMutationContext {
  const context = mutationContextByVariables.get(variables);

  if (!context) {
    throw new Error('Quick Log mutation context is missing');
  }

  return context;
}

function retryAfterAt(now: string, retryAfterMs: number | null): string | null {
  if (retryAfterMs === null) {
    return null;
  }

  return new Date(Date.parse(now) + retryAfterMs).toISOString();
}

function bucketRetryCount(retryCount: number): 'one' | 'two' | 'three_or_more' | null {
  if (retryCount <= 0) {
    return null;
  }

  if (retryCount === 1) {
    return 'one';
  }

  if (retryCount === 2) {
    return 'two';
  }

  return 'three_or_more';
}

function isSameQueryKey(left: QueryKey, right: QueryKey): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createDefaultClientEventId(): string {
  const crypto = globalThis.crypto;
  const randomUuid = crypto?.randomUUID?.();

  if (randomUuid) {
    return `evt_${randomUuid}`;
  }

  return `evt_${createRandomUuidV4(crypto)}`;
}

function createRandomUuidV4(
  crypto: Pick<Crypto, 'getRandomValues'> | undefined,
): string {
  const bytes = new Uint8Array(16);

  if (crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    fillPseudoRandomBytes(bytes);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

function fillPseudoRandomBytes(bytes: Uint8Array): void {
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
