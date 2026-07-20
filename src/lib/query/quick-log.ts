import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
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
  createQuickLogDetailPayload,
  createQuickLogDetailDraft,
  createQuickLogEventInsert,
  isQuickLogEventType,
  type QuickLogDetailDraft,
  type QuickLogDetailTrackerId,
  type QuickLogEventInsert,
  type QuickLogEventType,
  type QuickLogNonPottyTrackerId,
  type QuickLogPottySubtype,
} from '@/contracts/quick-log';
import { getReminderLinkFromPayload, type ReminderLink } from '@/contracts/reminders';
import {
  eventLogInsertSchema,
  eventLogRecordSchema,
  type EventLogInsert,
  type EventLogRecord,
} from '@/contracts/supabase';
import {
  getQuickLogRetryDelayMs,
  normalizeQuickLogQueueFailureForPersistence,
  type QuickLogQueueErrorCategory,
  type QuickLogManualRetry,
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
  type QuickLogSupabaseFailure,
  type SupabaseEventLogRepository,
} from '@/lib/supabase/events';
import { useAuth } from '@/lib/auth';
import { formatLocalCalendarDate } from '@/lib/i18n/format-date';

import { getQuickLogInvalidationKeys, queryKeys, type TimelineFilters } from './keys';
import {
  clearQuickLogIntentOwner,
  getQuickLogIntentOwner,
  setQuickLogIntentOwner,
} from './quick-log-actor-visibility';

export type QuickLogCachedEventRow = EventLogRecord & {
  localSync?: Readonly<{
    state: QuickLogQueueState;
    category: QuickLogQueueErrorCategory | null;
    retryCount: number;
  }>;
};

type QuickLogMutationVariablesBase = Readonly<{
  clientEventId?: string;
  householdId: string;
  occurredAt: string;
  puppyId: string;
  recoverySurface?: QuickLogRecoverySurface;
  // Present only when this log is a routine check-off (PUP-28). Callers derive a deterministic
  // clientEventId via createReminderCheckOffClientEventId so re-checking dedupes.
  reminderLink?: ReminderLink;
  todayDate: string;
}>;

export type QuickLogMutationVariables =
  | (QuickLogMutationVariablesBase & Readonly<{
    detailDraft: QuickLogDetailDraft;
    pottySubtype?: never;
    trackerId: QuickLogDetailTrackerId;
  }>)
  | (QuickLogMutationVariablesBase & Readonly<{
    detailDraft?: never;
    pottySubtype: QuickLogPottySubtype;
    trackerId: 'potty';
  }>)
  | (QuickLogMutationVariablesBase & Readonly<{
    detailDraft?: never;
    pottySubtype?: never;
    trackerId: QuickLogNonPottyTrackerId;
  }>);

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

export type QuickLogMutationPortSyncedDeleteRequest = Readonly<{
  clientEventId: string;
  eventType: QuickLogEventType;
  householdId: string;
  puppyId: string;
  todayDate: string;
}>;

export type QuickLogMutationPortUpdateDetailsRequest = QuickLogMutationPortSyncedDeleteRequest & Readonly<{
  draft: QuickLogDetailDraft;
}>;

export type QuickLogMutationPort = Readonly<{
  actorId: string;
  createDetailed?: (variables: QuickLogDetailedMutationVariables) => Promise<EventLogRecord>;
  createDetailedDurably?: (variables: QuickLogDetailedMutationVariables) => Promise<void>;
  deleteLocal: (clientEventId: string) => unknown;
  deleteSynced: (request: QuickLogMutationPortSyncedDeleteRequest) => Promise<void>;
  mutate: (request: QuickLogMutationPortRequest) => unknown;
  retry: (
    clientEventId: string,
    recoverySurface: QuickLogRecoverySurface,
    sourceSurface?: QuickLogSourceSurface,
  ) => unknown;
  restoreSynced: (request: QuickLogMutationPortSyncedDeleteRequest) => Promise<void>;
  updateDetails: (request: QuickLogMutationPortUpdateDetailsRequest) => Promise<void>;
  undo: (request: QuickLogMutationPortUndoRequest) => unknown;
}>;

export type QuickLogMutationEvent =
  | Readonly<{
    clientEventId: string;
    eventType: QuickLogEventType;
    requestId: string;
    trackerId: QuickLogDetailTrackerId;
    type: 'started';
  }>
  | Readonly<{
    clientEventId: string;
    eventType: QuickLogEventType;
    requestId: string;
    state: 'failed_retryable' | 'failed_permanent';
    trackerId: QuickLogDetailTrackerId;
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
  | 'removeIfState'
  | 'remove'
> & Partial<Pick<QuickLogQueueStorage, 'markFailedRetryableIfOwned'>>;

type QuickLogManualRetryQueue = Pick<
  QuickLogQueueStorage,
  | 'getByClientEventId'
  | 'manualRetry'
  | 'markFailedPermanent'
  | 'markFailedRetryable'
  | 'removeIfState'
  | 'remove'
  | 'resolveInFlightSuccess'
> & Partial<Pick<
  QuickLogQueueStorage,
  'retainDeletedBeforeSync'
>> & Readonly<{
  manualRetryIfOwned?(
    clientEventId: string,
    options: Readonly<{
      expectedCreatedBy: string;
      isActorCurrent: () => boolean;
      now: string;
      recoverySurface?: 'manual_retry';
    }>,
  ): Promise<QuickLogManualRetry | null>;
}>;

export type QuickLogMutationDependencies = Readonly<{
  queryClient: QueryClient;
  queue: QuickLogMutationQueue;
  analytics?: QuickLogAnalyticsClient;
  observability?: ObservabilityReporter;
  events?: Pick<
    SupabaseEventLogRepository,
    | 'insertEvent'
    | 'restoreByClientEventId'
    | 'selectExistingEvent'
    | 'tombstoneByClientEventId'
    | 'updatePayloadByClientEventId'
  >;
  // Optional only while production Quick Log is gated by the deferred active care context.
  // Production wiring must inject the synchronous session actor instead of using the null default.
  getSessionUserId?: () => string | null;
  createClientEventId?: () => string;
  now?: () => string;
}>;

// TanStack passes the same variables object from onMutate to mutationFn for one call. Production
// ports create one object per invocation so concurrent calls cannot overwrite each other's actor,
// context, or request-id handoff even when a caller reuses its own variables object.
const mutationContextByVariables = new WeakMap<
  QuickLogMutationVariables,
  QuickLogMutationContext
>();
const mutationActorByVariables = new WeakMap<
  QuickLogMutationVariables,
  Readonly<{ actorId: string; isEpochCurrent: () => boolean }>
>();
const contextsSkippingAllInvalidation = new WeakSet<QuickLogMutationContext>();
const reportedActorSupersessionErrors = new WeakSet<QuickLogActorSupersededError>();
const QUICK_LOG_ACTIVE_RECOVERY_INTERVAL_MS = 5_000;
let quickLogRecoveryTail: Promise<void> = Promise.resolve();

class QuickLogActorSupersededError extends Error {
  public constructor() {
    super('Quick Log session changed');
    this.name = 'QuickLogActorSupersededError';
  }
}

function assertQuickLogMutationActorIsCurrent(
  variables: QuickLogMutationVariables,
  getActorId: () => string | null,
): void {
  const expected = mutationActorByVariables.get(variables);
  if (
    expected !== undefined
    && (
      getActorId() !== expected.actorId
      || !expected.isEpochCurrent()
    )
  ) {
    throw new QuickLogActorSupersededError();
  }
}

function runOnQuickLogRecoveryTail(task: () => Promise<void>): Promise<void> {
  const queued = quickLogRecoveryTail.then(task, task);
  quickLogRecoveryTail = queued;
  return queued;
}

export type QuickLogDetailedMutationVariables = Extract<
  QuickLogMutationVariables,
  Readonly<{ detailDraft: QuickLogDetailDraft }>
>;

function createDetailedQuickLogEventInsert(
  variables: QuickLogDetailedMutationVariables,
  actorId: string,
  clientEventId: string,
): QuickLogEventInsert {
  const draft = createQuickLogDetailDraft(variables.detailDraft);
  if (draft.trackerId !== variables.trackerId) {
    throw new Error('Quick Log detail draft does not match the selected tracker');
  }

  const common = {
    client_event_id: clientEventId,
    household_id: variables.householdId,
    puppy_id: variables.puppyId,
    created_by: actorId,
    occurred_at: draft.occurredAt ?? variables.occurredAt,
    ...(variables.reminderLink === undefined
      ? {}
      : {
        reminder_link: {
          reminder_id: variables.reminderLink.reminderId,
          scheduled_for: variables.reminderLink.scheduledFor,
        },
      }),
  };

  if (draft.trackerId === 'potty') {
    return createQuickLogEventInsert({
      ...common,
      note: draft.note,
      subtype: draft.subtype,
      tracker_id: draft.trackerId,
    });
  }

  if (draft.trackerId === 'feeding') {
    return createQuickLogEventInsert({
      ...common,
      amount: draft.amount,
      note: draft.note,
      tracker_id: draft.trackerId,
    });
  }

  if (draft.trackerId === 'sleep') {
    return createQuickLogEventInsert({
      ...common,
      action: draft.action,
      duration_minutes: draft.durationMinutes,
      note: draft.note,
      tracker_id: draft.trackerId,
    });
  }

  if (draft.trackerId === 'walk') {
    return createQuickLogEventInsert({
      ...common,
      duration_minutes: draft.durationMinutes,
      note: draft.note,
      tracker_id: draft.trackerId,
    });
  }

  if (draft.trackerId === 'zoomies') {
    return createQuickLogEventInsert({
      ...common,
      intensity: draft.intensity,
      note: draft.note,
      tracker_id: draft.trackerId,
    });
  }

  if (draft.trackerId === 'training') {
    return createQuickLogEventInsert({
      ...common,
      duration_bucket: draft.durationBucket,
      note: draft.note,
      topic: draft.topic,
      tracker_id: draft.trackerId,
    });
  }

  return createQuickLogEventInsert({
    ...common,
    note: draft.note,
    title: draft.title,
    tracker_id: draft.trackerId,
  });
}

/**
 * Send an insert, putting a slot's mark back on if this tap landed on the row a previous un-check
 * tombstoned.
 *
 * A check-off's `client_event_id` is derived from its slot, so re-checking always lands on the same
 * row. `insertEvent` refuses to resurrect a tombstone, and that refusal has to stay: it is what
 * keeps a deletion deleted when a queued replay or another device re-sends the same id later
 * (AC-F1-3). A fresh tap on the checkbox is not a replay, though — it is the owner asking for the
 * mark back — and only a slot-linked insert can carry that intent, so only that one restores.
 *
 * The restore runs off the insert's failure rather than a lookup before it, so the common check-off
 * still costs exactly one round trip and never blocks on the network before the caller's queue item
 * is durable.
 */
async function sendQuickLogInsert(
  events: Pick<SupabaseEventLogRepository, 'insertEvent' | 'restoreByClientEventId' | 'selectExistingEvent'>,
  insert: EventLogInsert,
  assertActorIsCurrent: () => void = () => undefined,
): Promise<EventLogRecord> {
  try {
    const insertedRow = await events.insertEvent(insert);
    return insertedRow;
  } catch (error) {
    assertActorIsCurrent();
    const reminderLink = getReminderLinkFromPayload(insert.payload);

    if (reminderLink === null || !isQuickLogInvalidPayloadFailure(error)) {
      throw error;
    }

    const existing = await events.selectExistingEvent({
      clientEventId: insert.client_event_id,
      householdId: insert.household_id,
    });
    assertActorIsCurrent();
    const existingLink = existing === null ? null : getReminderLinkFromPayload(existing.payload);

    // Restore only this slot's own tombstone. Anything else that collided on the id is a genuine
    // invalid collision and has to stay visibly failed.
    if (
      existing === null
      || existing.deleted_at === null
      || existingLink === null
      || existingLink.reminderId !== reminderLink.reminderId
      || existingLink.scheduledFor !== reminderLink.scheduledFor
    ) {
      throw error;
    }

    const restoredRow = await events.restoreByClientEventId({
      clientEventId: insert.client_event_id,
      householdId: insert.household_id,
    });
    return restoredRow;
  }
}

function isQuickLogInvalidPayloadFailure(error: unknown): boolean {
  return error instanceof Error
    && (error as QuickLogSupabaseFailure).kind === 'invalid_payload';
}

export function createQuickLogMutationOptions(
  dependencies: QuickLogMutationDependencies,
): QuickLogMutationOptions {
  const events = dependencies.events ?? createSupabaseEventLogRepository();
  const analytics = dependencies.analytics ?? createAnalyticsClient();
  const observability = dependencies.observability ?? createObservabilityReporter();
  const getSessionUserId = dependencies.getSessionUserId ?? (() => null);
  const createClientEventId = dependencies.createClientEventId ?? createQuickLogClientEventId;
  const now = dependencies.now ?? (() => new Date().toISOString());

  return {
    onMutate: async (variables) => {
      assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
      const actorId = getSessionUserId();

      if (actorId === null) {
        throw new Error('Quick Log requires an authenticated session');
      }

      const clientEventId = variables.clientEventId ?? createClientEventId();
      const insert = 'detailDraft' in variables && variables.detailDraft !== undefined
        ? createDetailedQuickLogEventInsert(variables, actorId, clientEventId)
        : createQuickLogEventInsert({
          client_event_id: clientEventId,
          household_id: variables.householdId,
          puppy_id: variables.puppyId,
          created_by: actorId,
          tracker_id: variables.trackerId,
          occurred_at: variables.occurredAt,
          ...(variables.trackerId === 'potty' ? { subtype: variables.pottySubtype } : {}),
          ...(variables.reminderLink !== undefined
            ? {
              reminder_link: {
                reminder_id: variables.reminderLink.reminderId,
                scheduled_for: variables.reminderLink.scheduledFor,
              },
            }
            : {}),
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
        assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
        queuedItem = await dependencies.queue.enqueue({
          ...insert,
          created_at: timestamp,
        }, {
          now: timestamp,
        });
        assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
      } catch (error) {
        if (!(error instanceof QuickLogActorSupersededError)) {
          removeCachedEventRow(dependencies.queryClient, {
            timelineRootKey,
            clientEventId,
          });
        }

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
      assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
      const context = getRequiredMutationContext(variables);
      const timestamp = now();

      await dependencies.queue.markSending(context.clientEventId, {
        now: timestamp,
      });
      try {
        assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
      } catch (error) {
        if (!(error instanceof QuickLogActorSupersededError)) {
          throw error;
        }
        try {
          const recoveryOptions = {
            errorCategory: 'unknown',
            expectedCreatedBy: context.insert.created_by,
            expectedState: 'sending' as const,
            retryAfterAt: retryAfterAt(timestamp, null, context.queuedItem.retry_count + 1),
            now: now(),
          };
          if (dependencies.queue.markFailedRetryableIfOwned !== undefined) {
            await dependencies.queue.markFailedRetryableIfOwned(
              context.clientEventId,
              recoveryOptions,
            );
          } else {
            reportQuickLogQueueRecoveryFailure(
              observability,
              'mutation_retry_owner_capability_unavailable',
            );
          }
        } catch {
          reportQuickLogQueueRecoveryFailure(observability, 'mutation_actor_recover_sending');
        }
        throw error;
      }

      const insertedRow = await sendQuickLogInsert(
        events,
        context.insert,
        () => assertQuickLogMutationActorIsCurrent(variables, getSessionUserId),
      );
      try {
        assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
      } catch (error) {
        if (!(error instanceof QuickLogActorSupersededError)) {
          throw error;
        }
        try {
          await dependencies.queue.resolveInFlightSuccess(context.clientEventId, {
            now: now(),
          });
        } catch {
          reportQuickLogQueueRecoveryFailure(observability, 'mutation_actor_confirm_insert');
        }
        throw error;
      }
      return insertedRow;
    },
    onError: async (error, variables, context) => {
      if (!context) {
        return;
      }
      if (error instanceof QuickLogActorSupersededError) {
        contextsSkippingAllInvalidation.add(context);
        return;
      }

      assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
      let queueItem: QuickLogStoredQueueItem;
      try {
        queueItem = await dependencies.queue.getByClientEventId(context.clientEventId)
          ?? context.queuedItem;
      } catch {
        contextsSkippingAllInvalidation.add(context);
        reportQuickLogQueueRecoveryFailure(observability, 'save_failure_read');
        return;
      }
      assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);

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
          retryAfterAt: retryAfterAt(
            timestamp,
            decision.retryAfterMs,
            queueItem.retry_count + 1,
          ),
          now: timestamp,
        })
        : await dependencies.queue.markFailedPermanent(context.clientEventId, {
          errorCategory: decision.category,
          now: timestamp,
        });
      assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);

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
    onSuccess: async (data, variables, context) => {
      if (!context) {
        return;
      }

      assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
      const resolution = await dependencies.queue.resolveInFlightSuccess(context.clientEventId, {
        now: now(),
      });
      assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);

      if (resolution.outcome === 'requires_server_cleanup') {
        try {
          await events.tombstoneByClientEventId({
            householdId: context.insert.household_id,
            clientEventId: context.clientEventId,
            deletedAt: now(),
          });
          assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
          removeCachedEventRow(dependencies.queryClient, {
            timelineRootKey: context.timelineRootKey,
            clientEventId: context.clientEventId,
          });
          await dependencies.queue.remove(context.clientEventId);
          assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
          clearQuickLogIntentOwner(dependencies.queryClient, {
            clientEventId: context.clientEventId,
            householdId: context.insert.household_id,
            puppyId: context.insert.puppy_id,
          });
        } catch (error) {
          if (error instanceof QuickLogActorSupersededError) {
            throw error;
          }
          contextsSkippingAllInvalidation.add(context);
          reportQuickLogQueueRecoveryFailure(observability, 'save_cleanup');
        }

        return;
      }

      let finalized = false;
      let finalizationFailed = false;
      try {
        finalized = await removeQuickLogQueueItemIfState(
          dependencies.queue,
          context.clientEventId,
          'server_confirmed',
          mutationActorByVariables.has(variables)
            ? { expectedCreatedBy: context.insert.created_by }
            : {},
        );
      } catch {
        finalizationFailed = true;
        reportQuickLogQueueRecoveryFailure(observability, 'save_finalize');
      }
      assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
      if (!finalized && !finalizationFailed) {
        contextsSkippingAllInvalidation.add(context);
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
    },
    onSettled: async (_data, error, variables, context) => {
      if (!context) {
        mutationActorByVariables.delete(variables);
        return;
      }

      if (contextsSkippingAllInvalidation.has(context)) {
        contextsSkippingAllInvalidation.delete(context);
        mutationContextByVariables.delete(variables);
        mutationActorByVariables.delete(variables);
        return;
      }

      try {
        assertQuickLogMutationActorIsCurrent(variables, getSessionUserId);
      } catch (actorError) {
        if (actorError instanceof QuickLogActorSupersededError) {
          mutationContextByVariables.delete(variables);
          mutationActorByVariables.delete(variables);
          return;
        }
        throw actorError;
      }

      await invalidateAffectedQueries(dependencies.queryClient, {
        invalidationKeys: context.invalidationKeys,
        timelineRootKey: context.timelineRootKey,
        includeTimeline: error === null || error === undefined,
      });
      mutationContextByVariables.delete(variables);
      mutationActorByVariables.delete(variables);
    },
  };
}

// PUP-37: the Quick Log mutation pipeline (queue handle, drain loop, session epoch, mutation
// events) is session-scoped. `QuickLogPipelineProvider` hosts exactly one pipeline for the app
// session so a consuming route unmounting cannot bump the session epoch and supersede an
// in-flight durable write.
const QuickLogPipelineContext = createContext<UseQuickLogMutationPortResult | null>(null);

export function QuickLogPipelineProvider(
  props: Readonly<{ children?: ReactNode }>,
): ReactNode {
  const pipeline = useQuickLogPipeline();

  // This module is .ts (no JSX); createElement keeps the provider colocated with the pipeline.
  return createElement(
    QuickLogPipelineContext.Provider,
    { value: pipeline },
    props.children,
  );
}

export function useQuickLogMutationPort(): UseQuickLogMutationPortResult {
  const pipeline = useContext(QuickLogPipelineContext);

  if (pipeline === null) {
    throw new Error(
      'useQuickLogMutationPort must be used within a QuickLogPipelineProvider',
    );
  }

  return pipeline;
}

function useQuickLogPipeline(): UseQuickLogMutationPortResult {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const queueRef = useRef<QuickLogQueueStorage | null>(null);
  const userIdRef = useRef<string | null>(null);
  const recoveryTriggerRef = useRef<(() => Promise<void>) | null>(null);
  const requestIdsByVariablesRef = useRef(new WeakMap<QuickLogMutationVariables, string>());
  const [queueOpened, setQueueOpened] = useState(false);
  const [readyActorId, setReadyActorId] = useState<string | null>(null);
  const [queueUnavailable, setQueueUnavailable] = useState(false);
  const [mutationEvents, setMutationEvents] = useState<readonly QuickLogMutationEvent[]>([]);
  const recoveryEvents = useMemo(() => createSupabaseEventLogRepository(), []);
  const observability = useMemo(() => createObservabilityReporter(), []);
  const actorId = auth.status === 'signedIn' ? auth.user?.id ?? null : null;
  const sessionEpochRef = useRef<Readonly<{ actorId: string | null; epoch: number }>>({
    actorId: null,
    epoch: 0,
  });

  useLayoutEffect(() => {
    const committedSession = sessionEpochRef.current;
    if (committedSession.actorId === actorId) {
      userIdRef.current = actorId;
      return;
    }
    sessionEpochRef.current = {
      actorId,
      epoch: committedSession.epoch + 1,
    };
    userIdRef.current = actorId;
  }, [actorId]);

  useLayoutEffect(() => () => {
    sessionEpochRef.current = {
      actorId: null,
      epoch: sessionEpochRef.current.epoch + 1,
    };
    userIdRef.current = null;
    queueRef.current = null;
    recoveryTriggerRef.current = null;
  }, []);

  useEffect(() => {
    const initialAppState: unknown = AppState.currentState;
    let appState: AppStateStatus = typeof initialAppState === 'string'
      ? initialAppState as AppStateStatus
      : 'active';
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      const becameActive = appState !== 'active' && nextState === 'active';
      appState = nextState;
      if (becameActive) {
        void recoveryTriggerRef.current?.();
      }
    });
    const interval = setInterval(() => {
      if (appState === 'active') {
        void recoveryTriggerRef.current?.();
      }
    }, QUICK_LOG_ACTIVE_RECOVERY_INTERVAL_MS);

    return () => {
      appStateSubscription?.remove();
      clearInterval(interval);
      recoveryTriggerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;

    setQueueUnavailable(false);
    void openQuickLogQueueStorage().then((queue) => {
      if (!active) {
        return;
      }

      queueRef.current = queue;
      setQueueOpened(true);
    }).catch((_error: unknown) => {
      if (!active) {
        return;
      }

      reportQuickLogQueueRecoveryFailure(observability, 'open');
      queueRef.current = null;
      setQueueOpened(false);
      setQueueUnavailable(true);
    });

    return () => {
      active = false;
    };
  }, [observability]);

  useEffect(() => {
    setReadyActorId(null);
    removeQuickLogQueueItemsForOtherActors(queryClient, actorId);

    if (!queueOpened || actorId === null || queueRef.current === null) {
      return undefined;
    }

    const queue = queueRef.current;
    let active = true;
    let inFlightDrain: Promise<void> | null = null;
    let drainRequested = false;
    let initialDeleteItems: readonly QuickLogStoredQueueItem[] | undefined;
    const isCurrentActor = (): boolean => active && userIdRef.current === actorId;
    const runDrain = (): Promise<void> => {
      if (!isCurrentActor()) {
        return Promise.resolve();
      }

      drainRequested = true;
      if (inFlightDrain !== null) {
        return inFlightDrain;
      }

      const drainTask = async (): Promise<void> => {
        try {
          while (drainRequested && isCurrentActor()) {
            drainRequested = false;
            const seededDeleteItems = initialDeleteItems;
            initialDeleteItems = undefined;
            await drainQuickLogQueueForActor({
              actorId,
              events: recoveryEvents,
              initialDeleteItems: seededDeleteItems,
              isCurrentActor,
              observability,
              queryClient,
              queue,
            });
          }
        } catch (_error: unknown) {
          reportQuickLogQueueRecoveryFailure(observability, 'coordinator');
        } finally {
          inFlightDrain = null;
          if (drainRequested && isCurrentActor()) {
            void runDrain();
          }
        }
      };
      const drain = quickLogRecoveryTail.then(drainTask, drainTask);
      inFlightDrain = drain;
      quickLogRecoveryTail = drain;
      return drain;
    };

    void (async () => {
      try {
        await queue.quarantineLegacyMissingActorItems?.({
          now: new Date().toISOString(),
        });

        if (!isCurrentActor()) {
          return;
        }

        const retainedItems = await queue.list({
          states: [
            'pending_local',
            'failed_retryable',
            'failed_permanent',
            'deleted_before_sync',
            'server_confirmed',
          ],
        });

        if (!isCurrentActor()) {
          return;
        }

        const ownedItems = retainedItems.filter((item) => item.created_by === actorId);
        const confirmedItems = ownedItems.filter((item) => item.state === 'server_confirmed');
        for (const item of confirmedItems) {
          if (queue.removeIfState === undefined) {
            reportQuickLogQueueRecoveryFailure(
              observability,
              'terminal_cleanup_owner_capability_unavailable',
            );
          } else {
            await queue.removeIfState(item.client_event_id, 'server_confirmed', {
              expectedCreatedBy: actorId,
            });
          }
          if (!isCurrentActor()) {
            return;
          }
        }
        const currentActorItems = ownedItems.filter((item) => item.state !== 'server_confirmed');
        initialDeleteItems = currentActorItems.filter((item) =>
          item.state === 'deleted_before_sync');
        const timelineRootKeys = uniqueQueryKeys(currentActorItems.map((item) =>
          queryKeys.events.timelineRoot(item.household_id, item.puppy_id)));

        for (const timelineRootKey of timelineRootKeys) {
          await queryClient.cancelQueries({
            queryKey: timelineRootKey,
          });
          if (!isCurrentActor()) {
            return;
          }
        }

        for (const item of currentActorItems) {
          replayQuickLogQueueItemToCache({
            item,
            queryClient,
            todayDate: formatLocalCalendarDate(item.occurred_at),
          });
        }

        for (const timelineRootKey of timelineRootKeys) {
          await queryClient.invalidateQueries({ queryKey: timelineRootKey });
          if (!isCurrentActor()) {
            return;
          }
        }

        if (!isCurrentActor()) {
          return;
        }

        setQueueUnavailable(false);
        setReadyActorId(actorId);
        recoveryTriggerRef.current = runDrain;
        void runDrain();
      } catch (_error: unknown) {
        if (isCurrentActor()) {
          reportQuickLogQueueRecoveryFailure(observability, 'hydrate');
          setQueueUnavailable(true);
        }
      }
    })();

    return () => {
      active = false;
      if (recoveryTriggerRef.current === runDrain) {
        recoveryTriggerRef.current = null;
      }
    };
  }, [actorId, observability, queryClient, queueOpened, recoveryEvents]);

  const queue = useMemo(
    () => createRequiredQuickLogQueueProxy(queueRef, observability),
    [observability],
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
      reportQuickLogActorSuperseded(observability, error, userIdRef.current);
      await options.onError(error, variables, context);

      if (context !== undefined && contextsSkippingAllInvalidation.has(context)) {
        return;
      }

      const requestId = requestIdsByVariablesRef.current.get(variables);
      if (!requestId || !context) {
        return;
      }

      assertQuickLogMutationActorIsCurrent(variables, () => userIdRef.current);
      const item = await queue.getByClientEventId(context.clientEventId);
      assertQuickLogMutationActorIsCurrent(variables, () => userIdRef.current);
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
      assertQuickLogMutationActorIsCurrent(variables, () => userIdRef.current);
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
      || readyActorId !== auth.user.id
      || queueUnavailable
    ) {
      return undefined;
    }
    const signedInActorId = auth.user.id;
    const signedInEpoch = sessionEpochRef.current.epoch;
    const getPortActorId = (): string | null =>
      sessionEpochRef.current.epoch === signedInEpoch
        ? userIdRef.current
        : null;
    const assertPortActorIsCurrent = (): void => {
      assertQuickLogActorIsCurrent({
        actorId: signedInActorId,
        expectedEpoch: signedInEpoch,
        getActorId: getPortActorId,
        getEpoch: () => sessionEpochRef.current.epoch,
      });
    };

    return {
      actorId: signedInActorId,
      createDetailed: async (variables) => {
        const invocationVariables: QuickLogDetailedMutationVariables = { ...variables };
        try {
          assertPortActorIsCurrent();
          mutationActorByVariables.set(invocationVariables, {
            actorId: signedInActorId,
            isEpochCurrent: () => sessionEpochRef.current.epoch === signedInEpoch,
          });
          return await quickLogMutation.mutateAsync(invocationVariables);
        } catch (error) {
          reportQuickLogActorSuperseded(observability, error, userIdRef.current);
          throw error;
        } finally {
          mutationActorByVariables.delete(invocationVariables);
        }
      },
      createDetailedDurably: async (variables) => {
        const clientEventId = variables.clientEventId ?? createQuickLogClientEventId();

        try {
          assertPortActorIsCurrent();
          const boundVariables = {
            ...variables,
            clientEventId,
          };
          mutationActorByVariables.set(boundVariables, {
            actorId: signedInActorId,
            isEpochCurrent: () => sessionEpochRef.current.epoch === signedInEpoch,
          });
          try {
            await quickLogMutation.mutateAsync(boundVariables);
          } catch (error) {
            assertPortActorIsCurrent();
            let item: QuickLogStoredQueueItem | null;
            try {
              item = await queue.getByClientEventId(clientEventId);
            } catch {
              reportQuickLogQueueRecoveryFailure(observability, 'durable_acceptance_read');
              throw error;
            }
            assertPortActorIsCurrent();

            if (item !== null && item.created_by !== signedInActorId) {
              throw new QuickLogActorSupersededError();
            }

            if (item === null) {
              throw error;
            }

            // A retained retryable item is durable acceptance; a permanent failure is not.
            // Discard the dead item so the caller's inline error stays the only representation
            // and a user retry cannot leave a duplicate failed fact behind.
            if (item.state === 'failed_permanent') {
              await deleteLocalQuickLogEvent({
                actorId: signedInActorId,
                clientEventId,
                getActorId: getPortActorId,
                queryClient,
                queueRef,
              });
              assertPortActorIsCurrent();
              throw error;
            }
          } finally {
            mutationActorByVariables.delete(boundVariables);
          }
        } catch (error) {
          reportQuickLogActorSuperseded(observability, error, userIdRef.current);
          throw error;
        }
      },
      deleteLocal: (clientEventId) => {
        void deleteLocalQuickLogEvent({
          actorId: signedInActorId,
          clientEventId,
          getActorId: getPortActorId,
          queryClient,
          queueRef,
        }).catch(() => {
          reportQuickLogQueueRecoveryFailure(observability, 'local_action_failed');
        });
      },
      deleteSynced: (request) => {
        return deleteSyncedQuickLogEvent({
          ...request,
          actorId: signedInActorId,
          getActorId: getPortActorId,
          queryClient,
          queueRef,
        });
      },
      mutate: (request) => {
        try {
          assertPortActorIsCurrent();
        } catch (error) {
          reportQuickLogActorSuperseded(observability, error, userIdRef.current);
          return;
        }
        const invocationVariables: QuickLogMutationVariables = { ...request.variables };
        mutationActorByVariables.set(invocationVariables, {
          actorId: signedInActorId,
          isEpochCurrent: () => sessionEpochRef.current.epoch === signedInEpoch,
        });
        requestIdsByVariablesRef.current.set(invocationVariables, request.requestId);
        quickLogMutation.mutate(invocationVariables);
      },
      retry: (clientEventId, recoverySurface, sourceSurface = 'quick_log_sheet') => {
        void retryLocalQuickLogEvent({
          actorId: signedInActorId,
          clientEventId,
          getActorId: getPortActorId,
          queryClient,
          queueRef,
          recoverySurface,
          sourceSurface,
        }).catch(() => {
          reportQuickLogQueueRecoveryFailure(observability, 'local_action_failed');
        });
      },
      restoreSynced: (request) => {
        return restoreSyncedQuickLogEvent({
          ...request,
          actorId: signedInActorId,
          getActorId: getPortActorId,
          queryClient,
          queueRef,
        });
      },
      undo: (request) => {
        void removeQuickLogOptimisticEvent({
          actorId: signedInActorId,
          clientEventId: request.clientEventId,
          eventType: request.eventType,
          getActorId: getPortActorId,
          householdId: request.householdId,
          now: new Date().toISOString(),
          puppyId: request.puppyId,
          queryClient,
          queue,
          todayDate: request.todayDate,
        }).catch(() => {
          reportQuickLogQueueRecoveryFailure(observability, 'local_action_failed');
        });
      },
      updateDetails: async (request) => {
        try {
          assertPortActorIsCurrent();
          await saveQuickLogDetailsDraft({
            ...request,
            actorId: signedInActorId,
            expectedEpoch: signedInEpoch,
            getActorId: getPortActorId,
            getEpoch: () => sessionEpochRef.current.epoch,
            queryClient,
            queue: createQuickLogDetailsQueueProxy(queueRef),
          });
        } catch (error) {
          reportQuickLogActorSuperseded(observability, error, userIdRef.current);
          throw error;
        }
      },
    };
  }, [
    auth.status,
    auth.user,
    observability,
    queue,
    readyActorId,
    queueUnavailable,
    queryClient,
    quickLogMutation,
  ]);

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

async function drainQuickLogQueueForActor(input: Readonly<{
  actorId: string;
  events: Pick<SupabaseEventLogRepository, 'insertEvent' | 'tombstoneByClientEventId'>;
  initialDeleteItems?: readonly QuickLogStoredQueueItem[];
  isCurrentActor: () => boolean;
  observability: ObservabilityReporter;
  queryClient: QueryClient;
  queue: QuickLogQueueStorage;
}>): Promise<void> {
  await drainDeletedQuickLogQueueForActor(input);

  while (input.isCurrentActor()) {
    let item: QuickLogStoredQueueItem | null;

    try {
      item = await input.queue.claimNextReadyToSend({
        createdBy: input.actorId,
        now: new Date().toISOString(),
      });
    } catch (_error: unknown) {
      reportQuickLogQueueRecoveryFailure(input.observability, 'claim');
      return;
    }

    if (item === null) {
      return;
    }

    if (!input.isCurrentActor()) {
      await returnSupersededQuickLogClaim({
        item,
        observability: input.observability,
        queue: input.queue,
      });
      return;
    }

    if (item.created_by !== input.actorId) {
      await returnSupersededQuickLogClaim({
        item,
        observability: input.observability,
        queue: input.queue,
      });
      reportQuickLogQueueRecoveryFailure(input.observability, 'claim_actor_mismatch');
      return;
    }

    await replayClaimedQuickLogQueueItem({
      ...input,
      item,
    });
  }
}

async function drainDeletedQuickLogQueueForActor(input: Readonly<{
  actorId: string;
  events: Pick<SupabaseEventLogRepository, 'tombstoneByClientEventId'>;
  initialDeleteItems?: readonly QuickLogStoredQueueItem[];
  isCurrentActor: () => boolean;
  observability: ObservabilityReporter;
  queryClient: QueryClient;
  queue: QuickLogQueueStorage;
}>): Promise<void> {
  const retainDeletedBeforeSync = input.queue.retainDeletedBeforeSync;
  if (retainDeletedBeforeSync === undefined) {
    reportQuickLogQueueRecoveryFailure(input.observability, 'delete_queue_unavailable');
    return;
  }
  let retainedItems: readonly QuickLogStoredQueueItem[];

  if (input.initialDeleteItems !== undefined) {
    retainedItems = input.initialDeleteItems;
  } else {
    try {
      retainedItems = await input.queue.list({ states: ['deleted_before_sync'] });
    } catch (_error: unknown) {
      reportQuickLogQueueRecoveryFailure(input.observability, 'list');
      return;
    }
  }

  for (const item of retainedItems) {
    if (!input.isCurrentActor()) {
      return;
    }
    if (item.created_by !== input.actorId || !isDeletedQuickLogIntentDue(item)) {
      continue;
    }

    const timelineRootKey = queryKeys.events.timelineRoot(item.household_id, item.puppy_id);
    const invalidationKeys = getQuickLogInvalidationKeys({
      eventType: item.event_type,
      householdId: item.household_id,
      puppyId: item.puppy_id,
      todayDate: formatLocalCalendarDate(item.occurred_at),
    });

    try {
      await input.events.tombstoneByClientEventId({
        clientEventId: item.client_event_id,
        deletedAt: new Date().toISOString(),
        householdId: item.household_id,
      });
    } catch (error) {
      const decision = normalizeQuickLogQueueFailureForPersistence({
        error,
        retryCount: item.retry_count,
      });
      const failedAt = new Date().toISOString();
      const retryAfter = decision.decision === 'retryable'
        ? retryAfterAt(failedAt, decision.retryAfterMs, item.retry_count + 1)
        : null;

      try {
        const retained = await retainDeletedBeforeSync(item.client_event_id, {
          errorCategory: decision.category,
          retryAfterAt: retryAfter,
          now: failedAt,
        });
        if (input.isCurrentActor()) {
          updateCachedLocalSync(input.queryClient, {
            timelineRootKey,
            clientEventId: item.client_event_id,
            state: retained.state,
            category: retained.last_error_category,
            retryCount: retained.retry_count,
          });
        }
      } catch (_error: unknown) {
        reportQuickLogQueueRecoveryFailure(
          input.observability,
          'replay_state',
          decision.category,
        );
      }
      reportQuickLogQueueRecoveryFailure(input.observability, 'replay', decision.category);
      continue;
    }

    try {
      await input.queue.remove(item.client_event_id);
    } catch (_error: unknown) {
      const failedAt = new Date().toISOString();
      const category: QuickLogQueueErrorCategory = 'unknown';
      try {
        const retained = await retainDeletedBeforeSync(item.client_event_id, {
          errorCategory: category,
          retryAfterAt: retryAfterAt(failedAt, null, item.retry_count + 1),
          now: failedAt,
        });
        if (input.isCurrentActor()) {
          updateCachedLocalSync(input.queryClient, {
            timelineRootKey,
            clientEventId: item.client_event_id,
            state: retained.state,
            category: retained.last_error_category,
            retryCount: retained.retry_count,
          });
        }
      } catch (_retainError: unknown) {
        reportQuickLogQueueRecoveryFailure(input.observability, 'replay_state', category);
      }
      reportQuickLogQueueRecoveryFailure(input.observability, 'replay_finalize');
      continue;
    }

    if (!input.isCurrentActor()) {
      if (findCachedQuickLogDeleteIntentRow(
        input.queryClient,
        timelineRootKey,
        item.client_event_id,
      ) === null) {
        clearQuickLogIntentOwner(input.queryClient, {
          clientEventId: item.client_event_id,
          householdId: item.household_id,
          puppyId: item.puppy_id,
        });
      }
      continue;
    }
    removeCachedEventRow(input.queryClient, {
      timelineRootKey,
      clientEventId: item.client_event_id,
    });
    clearQuickLogIntentOwner(input.queryClient, {
      clientEventId: item.client_event_id,
      householdId: item.household_id,
      puppyId: item.puppy_id,
    });
    if (!input.isCurrentActor()) {
      continue;
    }
    try {
      await invalidateAffectedQueries(input.queryClient, {
        invalidationKeys,
        timelineRootKey,
        includeTimeline: true,
      });
    } catch (_error: unknown) {
      reportQuickLogQueueRecoveryFailure(input.observability, 'replay_invalidate');
    }
  }
}

function isDeletedQuickLogIntentDue(item: QuickLogStoredQueueItem): boolean {
  if (item.retry_after_at === null) {
    return item.last_error_category === null;
  }

  return Date.parse(item.retry_after_at) <= Date.now();
}

async function returnSupersededQuickLogClaim(input: Readonly<{
  item: QuickLogStoredQueueItem;
  observability: ObservabilityReporter;
  queue: QuickLogQueueStorage;
}>): Promise<void> {
  const failedAt = new Date().toISOString();

  try {
    await input.queue.markFailedRetryable(input.item.client_event_id, {
      errorCategory: 'auth_refresh_in_progress',
      retryAfterAt: retryAfterAt(failedAt, null, input.item.retry_count + 1),
      now: failedAt,
    });
  } catch (_error: unknown) {
    reportQuickLogQueueRecoveryFailure(
      input.observability,
      'replay_state',
      'auth_refresh_in_progress',
    );
  }
}

async function replayClaimedQuickLogQueueItem(input: Readonly<{
  actorId: string;
  events: Pick<SupabaseEventLogRepository, 'insertEvent' | 'tombstoneByClientEventId'>;
  isCurrentActor: () => boolean;
  item: QuickLogStoredQueueItem;
  observability: ObservabilityReporter;
  queryClient: QueryClient;
  queue: QuickLogQueueStorage;
}>): Promise<void> {
  const item = input.item;
  const timelineRootKey = queryKeys.events.timelineRoot(item.household_id, item.puppy_id);
  const todayDate = formatLocalCalendarDate(item.occurred_at);
  const invalidationKeys = getQuickLogInvalidationKeys({
    eventType: item.event_type,
    householdId: item.household_id,
    puppyId: item.puppy_id,
    todayDate,
  });
  let data: EventLogRecord;

  try {
    const insert = eventLogInsertSchema.parse({
      client_event_id: item.client_event_id,
      created_by: input.actorId,
      event_type: item.event_type,
      household_id: item.household_id,
      occurred_at: item.occurred_at,
      payload: item.payload,
      payload_version: item.payload_version,
      puppy_id: item.puppy_id,
    }) as EventLogInsert;
    data = await input.events.insertEvent(insert);
  } catch (error) {
    await retainFailedAutomaticQuickLogReplay({
      error,
      invalidationKeys,
      isCurrentActor: input.isCurrentActor,
      item,
      observability: input.observability,
      queryClient: input.queryClient,
      queue: input.queue,
      timelineRootKey,
    });
    return;
  }

  let resolution;
  try {
    resolution = await input.queue.resolveInFlightSuccess(item.client_event_id, {
      now: new Date().toISOString(),
    });
  } catch (_error: unknown) {
    reportQuickLogQueueRecoveryFailure(input.observability, 'replay_finalize');
    return;
  }

  if (resolution.outcome === 'requires_server_cleanup') {
    try {
      await input.events.tombstoneByClientEventId({
        clientEventId: item.client_event_id,
        deletedAt: new Date().toISOString(),
        householdId: item.household_id,
      });
    } catch (_error: unknown) {
      reportQuickLogQueueRecoveryFailure(input.observability, 'replay_cleanup');
      return;
    }

    if (input.isCurrentActor()) {
      removeCachedEventRow(input.queryClient, {
        clientEventId: item.client_event_id,
        timelineRootKey,
      });
      try {
        await invalidateAffectedQueries(input.queryClient, {
          invalidationKeys,
          timelineRootKey,
          includeTimeline: true,
        });
      } catch (_error: unknown) {
        reportQuickLogQueueRecoveryFailure(input.observability, 'replay_invalidate');
        return;
      }
    }
    try {
      await input.queue.remove(item.client_event_id);
      if (findCachedQuickLogDeleteIntentRow(
        input.queryClient,
        timelineRootKey,
        item.client_event_id,
      ) === null) {
        clearQuickLogIntentOwner(input.queryClient, {
          clientEventId: item.client_event_id,
          householdId: item.household_id,
          puppyId: item.puppy_id,
        });
      }
    } catch (_error: unknown) {
      reportQuickLogQueueRecoveryFailure(input.observability, 'replay_finalize');
    }
    return;
  }

  let finalized: boolean;
  try {
    finalized = await removeQuickLogQueueItemIfState(
      input.queue,
      item.client_event_id,
      'server_confirmed',
    );
  } catch {
    reportQuickLogQueueRecoveryFailure(input.observability, 'replay_finalize');
    return;
  }
  if (!finalized) {
    return;
  }

  if (input.isCurrentActor()) {
    replaceCachedEventRow(input.queryClient, {
      timelineRootKey,
      clientEventId: item.client_event_id,
      row: {
        ...data,
        localSync: undefined,
      },
    });
    try {
      await invalidateAffectedQueries(input.queryClient, {
        invalidationKeys,
        timelineRootKey,
        includeTimeline: true,
      });
    } catch (_error: unknown) {
      reportQuickLogQueueRecoveryFailure(input.observability, 'replay_invalidate');
      return;
    }
  }
}

async function retainFailedAutomaticQuickLogReplay(input: Readonly<{
  error: unknown;
  invalidationKeys: readonly QueryKey[];
  isCurrentActor: () => boolean;
  item: QuickLogStoredQueueItem;
  observability: ObservabilityReporter;
  queryClient: QueryClient;
  queue: QuickLogQueueStorage;
  timelineRootKey: QueryKey;
}>): Promise<void> {
  let latestItem: QuickLogStoredQueueItem | null;

  try {
    latestItem = await input.queue.getByClientEventId(input.item.client_event_id);
  } catch (_error: unknown) {
    reportQuickLogQueueRecoveryFailure(input.observability, 'replay_state');
    return;
  }

  if (latestItem?.state === 'deleted_before_sync') {
    reportQuickLogQueueRecoveryFailure(input.observability, 'replay');
    return;
  }

  const retryCount = latestItem?.retry_count ?? input.item.retry_count;
  const decision = normalizeQuickLogQueueFailureForPersistence({
    error: input.error,
    retryCount,
  });
  const failedAt = new Date().toISOString();
  let failedItem: QuickLogStoredQueueItem;

  try {
    failedItem = decision.decision === 'retryable'
      ? await input.queue.markFailedRetryable(input.item.client_event_id, {
        errorCategory: decision.category,
        retryAfterAt: retryAfterAt(failedAt, decision.retryAfterMs, retryCount + 1),
        now: failedAt,
      })
      : await input.queue.markFailedPermanent(input.item.client_event_id, {
        errorCategory: decision.category,
        now: failedAt,
      });
  } catch (_error: unknown) {
    reportQuickLogQueueRecoveryFailure(input.observability, 'replay_state', decision.category);
    return;
  }

  reportQuickLogQueueRecoveryFailure(input.observability, 'replay', decision.category);
  if (input.isCurrentActor()) {
    updateCachedLocalSync(input.queryClient, {
      timelineRootKey: input.timelineRootKey,
      clientEventId: input.item.client_event_id,
      state: failedItem.state,
      category: failedItem.last_error_category,
      retryCount: failedItem.retry_count,
    });
    try {
      await invalidateAffectedQueries(input.queryClient, {
        invalidationKeys: input.invalidationKeys,
        timelineRootKey: input.timelineRootKey,
        includeTimeline: false,
      });
    } catch (_error: unknown) {
      reportQuickLogQueueRecoveryFailure(input.observability, 'replay_invalidate');
    }
  }
}

function removeQuickLogQueueItemsForOtherActors(
  queryClient: QueryClient,
  actorId: string | null,
): void {
  const removedIntentOwners: Readonly<{
    clientEventId: string;
    householdId: string;
    puppyId: string;
  }>[] = [];
  for (const [queryKey, rows] of queryClient.getQueriesData<QuickLogCachedEventRow[]>({
    queryKey: ['events'],
  })) {
    if (queryKey[3] !== 'timeline' || rows === undefined) {
      continue;
    }

    queryClient.setQueryData<QuickLogCachedEventRow[]>(queryKey, rows.filter((row) => {
      if (row.localSync === undefined) {
        return true;
      }

      const ownerId = getQuickLogIntentOwner(queryClient, row);
      const keep = actorId !== null && ownerId === actorId;
      if (!keep) {
        removedIntentOwners.push({
          clientEventId: row.client_event_id,
          householdId: row.household_id,
          puppyId: row.puppy_id,
        });
      }
      return keep;
    }));
  }
  for (const intentOwner of removedIntentOwners) {
    clearQuickLogIntentOwner(queryClient, intentOwner);
  }
}

function reportQuickLogQueueRecoveryFailure(
  observability: ObservabilityReporter,
  operation: string,
  errorCategory?: QuickLogQueueErrorCategory,
): void {
  observability.captureException(new Error('Quick Log queue recovery failed'), {
    area: 'quick_log_queue',
    operation,
    ...(errorCategory === undefined ? {} : { errorCategory }),
  });
}

function isQuickLogActorCurrent(input: Readonly<{
  actorId?: string;
  expectedEpoch?: number;
  getActorId?: () => string | null;
  getEpoch?: () => number;
}>): boolean {
  const actorMatches = input.actorId === undefined
    || input.getActorId === undefined
    || input.getActorId() === input.actorId;
  const epochMatches = input.expectedEpoch === undefined
    || input.getEpoch === undefined
    || input.getEpoch() === input.expectedEpoch;
  return actorMatches && epochMatches;
}

function assertQuickLogActorIsCurrent(input: Readonly<{
  actorId?: string;
  expectedEpoch?: number;
  getActorId?: () => string | null;
  getEpoch?: () => number;
}>): void {
  if (!isQuickLogActorCurrent(input)) {
    throw new QuickLogActorSupersededError();
  }
}

function reportQuickLogActorSuperseded(
  observability: ObservabilityReporter,
  error: unknown,
  currentActorId: string | null,
): void {
  if (
    error instanceof QuickLogActorSupersededError
    && currentActorId !== null
    && !reportedActorSupersessionErrors.has(error)
  ) {
    reportedActorSupersessionErrors.add(error);
    reportQuickLogQueueRecoveryFailure(observability, 'mutation_actor_mismatch');
  }
}

async function removeQuickLogQueueItemIfState(
  queue: Pick<QuickLogQueueStorage, 'getByClientEventId' | 'remove' | 'removeIfState'>,
  clientEventId: string,
  expectedState: QuickLogQueueState,
  options: Readonly<{ expectedCreatedBy?: string }> = {},
): Promise<boolean> {
  if (queue.removeIfState !== undefined) {
    return queue.removeIfState(clientEventId, expectedState, options);
  }

  if (options.expectedCreatedBy !== undefined) {
    throw new Error('Quick Log owner-bound removal is unavailable');
  }

  const latestItem = await queue.getByClientEventId(clientEventId);
  if (
    latestItem?.state !== expectedState
    || (
      options.expectedCreatedBy !== undefined
      && latestItem.created_by !== options.expectedCreatedBy
    )
  ) {
    return false;
  }

  await queue.remove(clientEventId);
  return true;
}

export async function removeQuickLogOptimisticEvent(
  input: Readonly<{
    actorId?: string;
    queryClient: QueryClient;
    queue: Pick<
      QuickLogQueueStorage,
      'getByClientEventId' | 'markDeletedBeforeSync' | 'remove' | 'removeIfState'
    >;
    getActorId?: () => string | null;
    householdId: string;
    puppyId: string;
    eventType: EventLogInsert['event_type'];
    todayDate: string;
    clientEventId: string;
    now: string;
  }>,
): Promise<void> {
  assertQuickLogActorIsCurrent(input);
  const item = await input.queue.getByClientEventId(input.clientEventId);
  assertQuickLogActorIsCurrent(input);

  if (
    input.actorId !== undefined
    && item?.created_by !== input.actorId
  ) {
    throw new Error('Quick Log queue actor mismatch');
  }

  if (item?.state === 'sending') {
    const transitioned = await input.queue.markDeletedBeforeSync(input.clientEventId, {
      ...(input.actorId === undefined
        ? {}
        : {
          expectedCreatedBy: input.actorId,
          expectedState: 'sending' as const,
        }),
      now: input.now,
    });
    assertQuickLogActorIsCurrent(input);
    if (input.actorId !== undefined && transitioned === null) {
      throw new Error('Quick Log queue actor mismatch');
    }
  } else if (
    item?.state === 'pending_local'
    || item?.state === 'failed_retryable'
    || item?.state === 'failed_permanent'
  ) {
    const removed = await removeQuickLogQueueItemIfState(
      input.queue,
      input.clientEventId,
      item.state,
      input.actorId === undefined ? {} : { expectedCreatedBy: input.actorId },
    );
    assertQuickLogActorIsCurrent(input);
    if (!removed) {
      throw new Error('Quick Log queue actor mismatch');
    }
  } else if (item?.state === 'server_confirmed') {
    throw new Error('Confirmed Quick Log rows require the server delete path');
  }

  assertQuickLogActorIsCurrent(input);
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
  assertQuickLogActorIsCurrent(input);
}

export async function deleteSyncedQuickLogEvent(
  input: QuickLogMutationPortSyncedDeleteRequest & Readonly<{
    actorId?: string;
    events?: Pick<SupabaseEventLogRepository, 'tombstoneByClientEventId'>;
    getActorId?: () => string | null;
    now?: () => string;
    queryClient: QueryClient;
    queueRef?: Readonly<{ current: QuickLogQueueStorage | null }>;
  }>,
): Promise<void> {
  assertQuickLogActorIsCurrent(input);
  const events = input.events ?? createSupabaseEventLogRepository();
  const now = input.now ?? (() => new Date().toISOString());
  const timelineRootKey = queryKeys.events.timelineRoot(input.householdId, input.puppyId);
  const cachedRow = findCachedQuickLogEventRow(
    input.queryClient,
    timelineRootKey,
    input.clientEventId,
  );

  if (cachedRow !== null && input.queueRef !== undefined) {
    const queue = requireQuickLogQueue(input.queueRef);
    const enqueueDeletedBeforeSync = queue.enqueueDeletedBeforeSync;
    if (enqueueDeletedBeforeSync === undefined) {
      throw new Error('Quick Log synced delete queue is not ready');
    }
    const acceptedAt = now();
    const retryAfterAt = new Date(
      Date.parse(acceptedAt) + QUICK_LOG_ACTIVE_RECOVERY_INTERVAL_MS,
    ).toISOString();
    const intent = await enqueueDeletedBeforeSync({
      client_event_id: cachedRow.client_event_id,
      household_id: cachedRow.household_id,
      puppy_id: cachedRow.puppy_id,
      created_by: input.actorId ?? cachedRow.created_by,
      event_type: cachedRow.event_type,
      payload_version: cachedRow.payload_version,
      payload: cachedRow.payload,
      occurred_at: cachedRow.occurred_at,
      created_at: cachedRow.created_at,
    }, {
      now: acceptedAt,
      retryAfterAt,
    });
    assertQuickLogActorIsCurrent(input);

    setQuickLogIntentOwner(input.queryClient, {
      actorId: input.actorId ?? cachedRow.created_by,
      clientEventId: input.clientEventId,
      householdId: cachedRow.household_id,
      puppyId: cachedRow.puppy_id,
    });
    updateCachedLocalSync(input.queryClient, {
      timelineRootKey,
      clientEventId: input.clientEventId,
      state: intent.state,
      category: intent.last_error_category,
      retryCount: intent.retry_count,
    });
    return;
  }

  assertQuickLogActorIsCurrent(input);
  await events.tombstoneByClientEventId({
    clientEventId: input.clientEventId,
    deletedAt: now(),
    householdId: input.householdId,
  });
  assertQuickLogActorIsCurrent(input);
  removeCachedEventRow(input.queryClient, {
    timelineRootKey,
    clientEventId: input.clientEventId,
  });
  await invalidateAffectedQueries(input.queryClient, {
    invalidationKeys: getQuickLogInvalidationKeys({
      eventType: input.eventType,
      householdId: input.householdId,
      puppyId: input.puppyId,
      todayDate: input.todayDate,
    }),
    timelineRootKey,
    includeTimeline: true,
  });
}

export async function restoreSyncedQuickLogEvent(
  input: QuickLogMutationPortSyncedDeleteRequest & Readonly<{
    actorId?: string;
    events?: Pick<SupabaseEventLogRepository, 'restoreByClientEventId'>;
    getActorId?: () => string | null;
    queryClient: QueryClient;
    queueRef?: Readonly<{ current: QuickLogQueueStorage | null }>;
  }>,
): Promise<void> {
  assertQuickLogActorIsCurrent(input);
  const events = input.events ?? createSupabaseEventLogRepository();
  const timelineRootKey = queryKeys.events.timelineRoot(input.householdId, input.puppyId);
  const restore = async (): Promise<void> => {
    assertQuickLogActorIsCurrent(input);
    if (input.queueRef !== undefined) {
      const queue = requireQuickLogQueue(input.queueRef);
      const retained = await queue.getByClientEventId(input.clientEventId);
      assertQuickLogActorIsCurrent(input);

      if (
        retained?.state === 'deleted_before_sync'
        && retained.last_error_category === null
      ) {
        if (input.actorId !== undefined && retained.created_by !== input.actorId) {
          throw new Error('Quick Log session changed');
        }
        const removed = await removeQuickLogQueueItemIfState(
          queue,
          input.clientEventId,
          'deleted_before_sync',
          { expectedCreatedBy: input.actorId },
        );
        assertQuickLogActorIsCurrent(input);
        if (removed) {
          clearCachedLocalSync(input.queryClient, {
            timelineRootKey,
            clientEventId: input.clientEventId,
          });
          clearQuickLogIntentOwner(input.queryClient, {
            clientEventId: input.clientEventId,
            householdId: input.householdId,
            puppyId: input.puppyId,
          });
          return;
        }
      }
    }

    assertQuickLogActorIsCurrent(input);
    const restoredRow = await events.restoreByClientEventId({
      clientEventId: input.clientEventId,
      householdId: input.householdId,
    });
    assertQuickLogActorIsCurrent(input);

    upsertCachedEventRow(input.queryClient, {
      timelineRootKey,
      // Timeline day buckets are keyed by the device-local calendar date (see
      // useQuickLogTimelineRows), so the restored row must use the same bucketing.
      calendarDate: formatLocalCalendarDate(restoredRow.occurred_at),
      row: {
        ...restoredRow,
        localSync: undefined,
      },
    });
    await invalidateAffectedQueries(input.queryClient, {
      invalidationKeys: getQuickLogInvalidationKeys({
        eventType: input.eventType,
        householdId: input.householdId,
        puppyId: input.puppyId,
        todayDate: input.todayDate,
      }),
      timelineRootKey,
      includeTimeline: true,
    });
  };

  if (input.queueRef === undefined) {
    await restore();
    return;
  }

  await runOnQuickLogRecoveryTail(restore);
}

export async function saveQuickLogDetailsDraft(
  input: QuickLogMutationPortUpdateDetailsRequest & Readonly<{
    actorId?: string;
    expectedEpoch?: number;
    events?: Pick<SupabaseEventLogRepository, 'updatePayloadByClientEventId'>;
    getActorId?: () => string | null;
    getEpoch?: () => number;
    queryClient: QueryClient;
    queue?: QuickLogDetailsQueue;
  }>,
): Promise<void> {
  assertQuickLogActorIsCurrent(input);
  const events = input.events ?? createSupabaseEventLogRepository();
  const timelineRootKey = queryKeys.events.timelineRoot(input.householdId, input.puppyId);
  const payload = createQuickLogDetailPayload({
    draft: input.draft,
    eventType: input.eventType,
  });
  const localItem = await input.queue?.getByClientEventId(input.clientEventId) ?? null;
  assertQuickLogActorIsCurrent(input);

  if (localItem !== null) {
    if (input.actorId !== undefined && localItem.created_by !== input.actorId) {
      throw new QuickLogActorSupersededError();
    }
    if (
      localItem.event_type !== input.eventType
      || localItem.household_id !== input.householdId
      || localItem.puppy_id !== input.puppyId
    ) {
      throw new Error('Quick Log local detail target does not match the requested event');
    }

    if (localItem.state === 'sending') {
      throw new Error('Quick Log details cannot be edited while the event is sending');
    }

    if (editableLocalDetailStates.has(localItem.state) && input.queue !== undefined) {
      const updatedItem = await input.queue.updateDetails(input.clientEventId, {
        ...(input.actorId === undefined
          ? {}
          : {
            expectedCreatedBy: input.actorId,
            isActorCurrent: () => isQuickLogActorCurrent(input),
          }),
        now: new Date().toISOString(),
        occurredAt: input.draft.occurredAt ?? localItem.occurred_at,
        payload,
        payloadVersion: 2,
      });
      assertQuickLogActorIsCurrent(input);
      if (updatedItem === null) {
        throw new QuickLogActorSupersededError();
      }

      updateMatchingCachedRows(input.queryClient, timelineRootKey, (rows) => rows.map((row) =>
        row.client_event_id === input.clientEventId
          ? {
            ...row,
            occurred_at: updatedItem.occurred_at,
            payload: updatedItem.payload,
            payload_version: updatedItem.payload_version,
            updated_at: updatedItem.updated_at,
          }
          : row));
      await invalidateQuickLogDetailQueries(input, timelineRootKey);
      return;
    }
  }

  assertQuickLogActorIsCurrent(input);
  const updatedRow = await events.updatePayloadByClientEventId({
    clientEventId: input.clientEventId,
    eventType: input.eventType,
    householdId: input.householdId,
    occurredAt: input.draft.occurredAt,
    payload,
    payloadVersion: 2,
  });
  assertQuickLogActorIsCurrent(input);

  replaceCachedEventRow(input.queryClient, {
    timelineRootKey,
    clientEventId: input.clientEventId,
    row: {
      ...updatedRow,
      localSync: undefined,
    },
  });
  await invalidateQuickLogDetailQueries(input, timelineRootKey);
}

type QuickLogDetailsQueue = Readonly<{
  getByClientEventId: QuickLogQueueStorage['getByClientEventId'];
  updateDetails: NonNullable<QuickLogQueueStorage['updateDetails']>;
}>;

const editableLocalDetailStates = new Set<QuickLogQueueState>([
  'pending_local',
  'failed_retryable',
  'failed_permanent',
]);

async function invalidateQuickLogDetailQueries(
  input: QuickLogMutationPortUpdateDetailsRequest & Readonly<{ queryClient: QueryClient }>,
  timelineRootKey: QueryKey,
): Promise<void> {
  await invalidateAffectedQueries(input.queryClient, {
    invalidationKeys: getQuickLogInvalidationKeys({
      eventType: input.eventType,
      householdId: input.householdId,
      puppyId: input.puppyId,
      todayDate: input.todayDate,
    }),
    timelineRootKey,
    includeTimeline: true,
  });
}

function createQuickLogDetailsQueueProxy(
  queueRef: Readonly<{ current: QuickLogQueueStorage | null }>,
): QuickLogDetailsQueue {
  return {
    getByClientEventId: (clientEventId) =>
      requireQuickLogQueue(queueRef).getByClientEventId(clientEventId),
    updateDetails: (clientEventId, options) => {
      const storage = requireQuickLogQueue(queueRef);
      if (storage.updateDetails === undefined) {
        throw new Error('Quick Log queue detail updates are unavailable');
      }
      return storage.updateDetails(clientEventId, options);
    },
  };
}

function createRequiredQuickLogQueueProxy(
  queueRef: Readonly<{ current: QuickLogQueueStorage | null }>,
  observability: ObservabilityReporter,
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
    markFailedRetryableIfOwned: async (clientEventId, options) => {
      const storage = requireQuickLogQueue(queueRef);
      if (storage.markFailedRetryableIfOwned !== undefined) {
        return storage.markFailedRetryableIfOwned(clientEventId, options);
      }
      reportQuickLogQueueRecoveryFailure(
        observability,
        'mutation_retry_owner_capability_unavailable',
      );
      return null;
    },
    markSending: (clientEventId, options) =>
      requireQuickLogQueue(queueRef).markSending(clientEventId, options),
    removeIfState: async (clientEventId, expectedState, options) => {
      const storage = requireQuickLogQueue(queueRef);
      if (storage.removeIfState !== undefined) {
        return storage.removeIfState(clientEventId, expectedState, options);
      }
      if (options?.expectedCreatedBy !== undefined) {
        reportQuickLogQueueRecoveryFailure(
          observability,
          'mutation_remove_owner_capability_unavailable',
        );
        return false;
      }
      const latestItem = await storage.getByClientEventId(clientEventId);
      if (
        latestItem?.state !== expectedState
        || (
          options?.expectedCreatedBy !== undefined
          && latestItem.created_by !== options.expectedCreatedBy
        )
      ) {
        return false;
      }
      await storage.remove(clientEventId);
      return true;
    },
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
  actorId: string;
  clientEventId: string;
  getActorId: () => string | null;
  queryClient: QueryClient;
  queueRef: Readonly<{ current: QuickLogQueueStorage | null }>;
}>): Promise<void> {
  assertQuickLogActorIsCurrent(input);
  const queue = requireQuickLogQueue(input.queueRef);
  const item = await queue.getByClientEventId(input.clientEventId);
  assertQuickLogActorIsCurrent(input);

  if (!item) {
    return;
  }
  if (item.created_by !== input.actorId) {
    throw new Error('Quick Log queue actor mismatch');
  }

  await removeQuickLogOptimisticEvent({
    actorId: input.actorId,
    clientEventId: input.clientEventId,
    eventType: item.event_type,
    getActorId: input.getActorId,
    householdId: item.household_id,
    now: new Date().toISOString(),
    puppyId: item.puppy_id,
    queryClient: input.queryClient,
    queue,
    todayDate: formatLocalCalendarDate(item.occurred_at),
  });
}

async function retainManualDeleteIntent(input: Readonly<{
  category: QuickLogQueueErrorCategory;
  isActorCurrent?: () => boolean;
  item: QuickLogStoredQueueItem;
  now: () => string;
  observability: ObservabilityReporter;
  queryClient: QueryClient;
  queue: QuickLogManualRetryQueue;
  retryable?: boolean;
  retryAfterMs?: number | null;
}>): Promise<void> {
  const retainDeletedBeforeSync = input.queue.retainDeletedBeforeSync;
  if (retainDeletedBeforeSync === undefined) {
    reportQuickLogQueueRecoveryFailure(input.observability, 'delete_queue_unavailable');
    return;
  }

  const failedAt = input.now();
  try {
    const retained = await retainDeletedBeforeSync(input.item.client_event_id, {
      errorCategory: input.category,
      retryAfterAt: input.retryable === false
        ? null
        : retryAfterAt(
          failedAt,
          input.retryAfterMs ?? null,
          input.item.retry_count + 1,
        ),
      now: failedAt,
    });
    if (input.isActorCurrent !== undefined && !input.isActorCurrent()) {
      reportQuickLogQueueRecoveryFailure(input.observability, 'manual_retry_actor_mismatch');
      return;
    }
    const ownerId = retained.created_by ?? input.item.created_by;
    if (ownerId !== null) {
      setQuickLogIntentOwner(input.queryClient, {
        actorId: ownerId,
        clientEventId: retained.client_event_id,
        householdId: retained.household_id,
        puppyId: retained.puppy_id,
      });
    }
    updateCachedLocalSync(input.queryClient, {
      timelineRootKey: queryKeys.events.timelineRoot(
        retained.household_id,
        retained.puppy_id,
      ),
      clientEventId: retained.client_event_id,
      state: retained.state,
      category: retained.last_error_category,
      retryCount: retained.retry_count,
    });
  } catch {
    reportQuickLogQueueRecoveryFailure(
      input.observability,
      'manual_retry_state',
      input.category,
    );
  }
}

export async function retryLocalQuickLogEvent(input: Readonly<{
  analytics?: QuickLogAnalyticsClient;
  actorId?: string;
  clientEventId: string;
  events?: Pick<SupabaseEventLogRepository, 'insertEvent' | 'tombstoneByClientEventId'>;
  getActorId?: () => string | null;
  now?: () => string;
  observability?: ObservabilityReporter;
  queryClient: QueryClient;
  queueRef: Readonly<{ current: QuickLogManualRetryQueue | null }>;
  recoverySurface: QuickLogRecoverySurface;
  sourceSurface?: QuickLogSourceSurface;
}>): Promise<void> {
  const events = input.events ?? createSupabaseEventLogRepository();
  const analytics = input.analytics ?? createAnalyticsClient();
  const observability = input.observability ?? createObservabilityReporter();
  const now = input.now ?? (() => new Date().toISOString());
  if (!isQuickLogActorCurrent(input)) {
    reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
    return;
  }
  const queue = requireQuickLogQueue(input.queueRef);
  let retainedItem: QuickLogStoredQueueItem | null;
  try {
    retainedItem = await queue.getByClientEventId(input.clientEventId);
  } catch {
    reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_read');
    return;
  }

  if (retainedItem?.state === 'deleted_before_sync') {
    if (input.actorId !== undefined && retainedItem.created_by !== input.actorId) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }

    await runOnQuickLogRecoveryTail(async () => {
      if (!isQuickLogActorCurrent(input)) {
        reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
        return;
      }
      let latestItem: QuickLogStoredQueueItem | null;
      try {
        latestItem = await queue.getByClientEventId(input.clientEventId);
      } catch {
        reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_read');
        return;
      }
      if (latestItem?.state !== 'deleted_before_sync') {
        return;
      }

      const actorWasSuperseded = input.actorId !== undefined && (
        latestItem.created_by !== input.actorId
        || (input.getActorId !== undefined && input.getActorId() !== input.actorId)
      );
      if (actorWasSuperseded) {
        reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
        return;
      }

      try {
        await events.tombstoneByClientEventId({
          clientEventId: latestItem.client_event_id,
          deletedAt: now(),
          householdId: latestItem.household_id,
        });
      } catch (error) {
        if (!isQuickLogActorCurrent(input)) {
          reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
          return;
        }
        const decision = normalizeQuickLogQueueFailureForPersistence({
          error,
          retryCount: latestItem.retry_count,
        });
        await retainManualDeleteIntent({
          category: decision.category,
          isActorCurrent: () => isQuickLogActorCurrent(input),
          item: latestItem,
          now,
          observability,
          queryClient: input.queryClient,
          queue,
          retryable: decision.decision === 'retryable',
          retryAfterMs: decision.decision === 'retryable' ? decision.retryAfterMs : undefined,
        });
        reportQuickLogQueueRecoveryFailure(observability, 'manual_retry', decision.category);
        return;
      }
      if (!isQuickLogActorCurrent(input)) {
        reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
        return;
      }

      try {
        await queue.remove(latestItem.client_event_id);
      } catch {
        if (!isQuickLogActorCurrent(input)) {
          reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
          return;
        }
        await retainManualDeleteIntent({
          category: 'unknown',
          isActorCurrent: () => isQuickLogActorCurrent(input),
          item: latestItem,
          now,
          observability,
          queryClient: input.queryClient,
          queue,
        });
        reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_finalize');
        return;
      }

      const timelineRootKey = queryKeys.events.timelineRoot(
        latestItem.household_id,
        latestItem.puppy_id,
      );
      if (!isQuickLogActorCurrent(input)) {
        if (findCachedQuickLogDeleteIntentRow(
          input.queryClient,
          timelineRootKey,
          latestItem.client_event_id,
        ) === null) {
          clearQuickLogIntentOwner(input.queryClient, {
            clientEventId: latestItem.client_event_id,
            householdId: latestItem.household_id,
            puppyId: latestItem.puppy_id,
          });
        }
        reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
        return;
      }
      removeCachedEventRow(input.queryClient, {
        timelineRootKey,
        clientEventId: latestItem.client_event_id,
      });
      clearQuickLogIntentOwner(input.queryClient, {
        clientEventId: latestItem.client_event_id,
        householdId: latestItem.household_id,
        puppyId: latestItem.puppy_id,
      });
      if (!isQuickLogActorCurrent(input)) {
        reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
        return;
      }
      const invalidationKeys = getQuickLogInvalidationKeys({
        eventType: latestItem.event_type,
        householdId: latestItem.household_id,
        puppyId: latestItem.puppy_id,
        todayDate: formatLocalCalendarDate(latestItem.occurred_at),
      });
      try {
        await Promise.all(invalidationKeys.map((queryKey) =>
          input.queryClient.invalidateQueries({ queryKey })));
      } catch {
        reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_invalidate');
      }
    });
    return;
  }

  if (!isQuickLogActorCurrent(input)) {
    reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
    return;
  }

  const timestamp = now();
  let retry: QuickLogManualRetry;
  if (input.actorId === undefined) {
    retry = await queue.manualRetry(input.clientEventId, {
      now: timestamp,
      recoverySurface: input.recoverySurface,
    });
  } else {
    const manualRetryIfOwned = queue.manualRetryIfOwned;
    if (
      retainedItem?.created_by !== input.actorId
      || manualRetryIfOwned === undefined
      || input.recoverySurface !== 'manual_retry'
    ) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }

    const actorOwnedRetry = await manualRetryIfOwned(input.clientEventId, {
      expectedCreatedBy: input.actorId,
      isActorCurrent: () => isQuickLogActorCurrent(input),
      now: timestamp,
      recoverySurface: 'manual_retry',
    });
    if (actorOwnedRetry === null) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }
    retry = actorOwnedRetry;
  }
  if (!isQuickLogActorCurrent(input)) {
    reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
    return;
  }
  const todayDate = formatLocalCalendarDate(retry.item.occurred_at);
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
    if (!isQuickLogActorCurrent(input)) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }

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
    if (!isQuickLogActorCurrent(input)) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }

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
    if (!isQuickLogActorCurrent(input)) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }
    const resolution = await queue.resolveInFlightSuccess(input.clientEventId, {
      now: now(),
    });
    if (!isQuickLogActorCurrent(input)) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }

    if (resolution.outcome === 'requires_server_cleanup') {
      try {
        await events.tombstoneByClientEventId({
          householdId: insert.household_id,
          clientEventId: input.clientEventId,
          deletedAt: now(),
        });
        if (!isQuickLogActorCurrent(input)) {
          reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
          return;
        }
        removeCachedEventRow(input.queryClient, {
          timelineRootKey,
          clientEventId: input.clientEventId,
        });
        await queue.remove(input.clientEventId);
        if (!isQuickLogActorCurrent(input)) {
          reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
          return;
        }
      } catch {
        if (!isQuickLogActorCurrent(input)) {
          reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
          return;
        }
        reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_cleanup');
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
    if (!isQuickLogActorCurrent(input)) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }
    await invalidateAffectedQueries(input.queryClient, {
      invalidationKeys,
      timelineRootKey,
      includeTimeline: true,
    });
  } catch (error) {
    if (!isQuickLogActorCurrent(input)) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }
    let latestItem: QuickLogStoredQueueItem | null;
    try {
      latestItem = await queue.getByClientEventId(input.clientEventId);
    } catch {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_read');
      return;
    }
    if (!isQuickLogActorCurrent(input)) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }

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
        retryAfterAt: retryAfterAt(
          failedAt,
          decision.retryAfterMs,
          (latestItem?.retry_count ?? retry.item.retry_count) + 1,
        ),
        now: failedAt,
      })
      : await queue.markFailedPermanent(input.clientEventId, {
        errorCategory: decision.category,
        now: failedAt,
      });
    if (!isQuickLogActorCurrent(input)) {
      reportQuickLogQueueRecoveryFailure(observability, 'manual_retry_actor_mismatch');
      return;
    }

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

  const timelineRootKey = queryKeys.events.timelineRoot(
    item.household_id,
    item.puppy_id,
  );
  const queuedRow = createCachedEventRowFromQueueItem({
    ...item,
    created_by: item.created_by,
  });
  let row = queuedRow;

  if (item.state === 'deleted_before_sync') {
    setQuickLogIntentOwner(input.queryClient, {
      actorId: item.created_by,
      clientEventId: item.client_event_id,
      householdId: item.household_id,
      puppyId: item.puppy_id,
    });
    const cachedRow = findCachedQuickLogDeleteIntentRow(
      input.queryClient,
      timelineRootKey,
      item.client_event_id,
    );

    if (cachedRow !== null) {
      row = {
        ...cachedRow,
        localSync: queuedRow.localSync,
      };
    }
  }

  upsertCachedEventRow(input.queryClient, {
    timelineRootKey,
    calendarDate: input.todayDate,
    row,
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

function clearCachedLocalSync(
  queryClient: QueryClient,
  input: Readonly<{
    timelineRootKey: QueryKey;
    clientEventId: string;
  }>,
): void {
  updateMatchingCachedRows(queryClient, input.timelineRootKey, (rows) =>
    rows.map((row) => row.client_event_id === input.clientEventId
      ? { ...row, localSync: undefined }
      : row));
}

function findCachedQuickLogEventRow(
  queryClient: QueryClient,
  timelineRootKey: QueryKey,
  clientEventId: string,
): QuickLogCachedEventRow | null {
  for (const [, rows] of queryClient.getQueriesData<QuickLogCachedEventRow[]>({
    queryKey: timelineRootKey,
  })) {
    const row = rows?.find((candidate) => candidate.client_event_id === clientEventId);
    if (row !== undefined) {
      return row;
    }
  }

  return null;
}

function findCachedQuickLogDeleteIntentRow(
  queryClient: QueryClient,
  timelineRootKey: QueryKey,
  clientEventId: string,
): QuickLogCachedEventRow | null {
  let authoritativeRow: QuickLogCachedEventRow | null = null;

  for (const [, rows] of queryClient.getQueriesData<QuickLogCachedEventRow[]>({
    queryKey: timelineRootKey,
  })) {
    for (const candidate of rows ?? []) {
      if (
        candidate.client_event_id !== clientEventId
        || candidate.localSync?.state !== 'deleted_before_sync'
      ) {
        continue;
      }

      if (
        authoritativeRow === null
        || compareQuickLogDeleteIntentRows(candidate, authoritativeRow) > 0
      ) {
        authoritativeRow = candidate;
      }
    }
  }

  return authoritativeRow;
}

function compareQuickLogDeleteIntentRows(
  left: QuickLogCachedEventRow,
  right: QuickLogCachedEventRow,
): number {
  if (left.version !== right.version) {
    return left.version - right.version;
  }
  const updatedAtDifference = Date.parse(left.updated_at) - Date.parse(right.updated_at);
  if (updatedAtDifference !== 0) {
    return updatedAtDifference;
  }
  if (left.id === right.id) {
    return 0;
  }
  return left.id > right.id ? 1 : -1;
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

function retryAfterAt(
  now: string,
  retryAfterMs: number | null,
  retryCount: number,
): string {
  const delayMs = retryAfterMs !== null && retryAfterMs > 0
    ? retryAfterMs
    : getQuickLogRetryDelayMs({ retryCount });

  return new Date(Date.parse(now) + delayMs).toISOString();
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

export function createQuickLogClientEventId(): string {
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
