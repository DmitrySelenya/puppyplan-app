import type { QueryClient, QueryKey } from '@tanstack/react-query';

import type { QuickLogRecoverySurface } from '@/contracts/analytics';
import {
  createQuickLogEventInsert,
  type QuickLogEventInsert,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import {
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
  const queryKeysToUpdate = [
    input.timelineRootKey,
    ...compatibleQueryKeys.filter((queryKey) =>
      !isSameQueryKey(queryKey, input.timelineRootKey)),
  ];

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
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (!randomUuid) {
    throw new Error('Quick Log client event id generation is unavailable');
  }

  return `evt_${randomUuid}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
