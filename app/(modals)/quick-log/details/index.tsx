import { router, useLocalSearchParams } from 'expo-router';

import {
  getQuickLogDetailTrackerIdForEventType,
  createQuickLogDetailDraft,
  isQuickLogEventType,
  quickLogClientEventIdSchema,
  quickLogDetailTrackerIdSchema,
  type QuickLogDetailDraft,
  type QuickLogDetailTrackerId,
  type QuickLogEventType,
} from '@/contracts/quick-log';
import {
  dateSchema,
  eventPayloadSchemasV2,
  eventTypeSchema,
  uuidSchema,
} from '@/contracts/supabase';
import {
  QuickLogDetailsScreen,
  type QuickLogDetailsStatus,
} from '@/features/quick-log/screens/QuickLogDetailsScreen';
import { closeModalRoute } from '@/lib/navigation/modal-close';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import { useQuickLogCachedRows } from '@/lib/query/useQuickLogCachedRows';
import type { QuickLogSurfaceCareContext } from '@/lib/query/quick-log-event-view';

type QuickLogDetailsRouteParams = Readonly<{
  clientEventId?: string | string[];
  eventType?: string | string[];
  householdId?: string | string[];
  puppyId?: string | string[];
  todayDate?: string | string[];
  trackerId?: string | string[];
  sleepAction?: string | string[];
}>;

type QuickLogDetailsRouteContext = Readonly<{
  clientEventId: string;
  eventType: QuickLogEventType;
  householdId: string;
  puppyId: string;
  todayDate: string;
  trackerId: QuickLogDetailTrackerId;
}>;

export default function QuickLogDetailsRoute() {
  const params = useLocalSearchParams<QuickLogDetailsRouteParams>();
  const activeCare = useActiveCareContext();
  const quickLogMutation = useQuickLogMutationPort();
  const mutation = quickLogMutation.mutation;
  const detailContext = parseQuickLogDetailsRouteContext(params);
  const cachedRows = useQuickLogCachedRows(activeCare.careContext);
  const detailRow = detailContext === null
    ? null
    : findQuickLogDetailRow(cachedRows, detailContext);
  const initialDraft = detailRow === null ? undefined : createDraftFromCachedRow(detailRow);
  const isReadOnlyDetail = detailRow !== null
    && activeCare.careContext?.householdRole === 'viewer';
  const hasMissingDetailTarget = detailContext !== null
    && detailRow === null
    && canUpdateQuickLogDetails(activeCare.careContext, detailContext);
  const hasUnreadableDetail = detailRow !== null && initialDraft === undefined;
  const shouldRenderReadOnly = isReadOnlyDetail
    || hasMissingDetailTarget
    || hasUnreadableDetail;
  const initialTrackerId = detailContext?.trackerId ?? parseStandaloneTrackerId(params.trackerId);
  const status = isReadOnlyDetail
    ? 'ready'
    : hasMissingDetailTarget || hasUnreadableDetail ? 'error' : getQuickLogDetailsStatus({
    activeCare,
    quickLogMutationStatus: quickLogMutation.status,
  });
  const close = () => {
    closeModalRoute(router);
  };
  const save = (draft: QuickLogDetailDraft): Promise<void> | void => {
    if (detailContext !== null) {
      if (
        mutation !== undefined
        && draft.trackerId === detailContext.trackerId
        && canUpdateQuickLogDetails(activeCare.careContext, detailContext)
      ) {
        const result = mutation.updateDetails({
        clientEventId: detailContext.clientEventId,
        draft,
        eventType: detailContext.eventType,
        householdId: detailContext.householdId,
        puppyId: detailContext.puppyId,
        todayDate: detailContext.todayDate,
        });
        if (isPromiseLike(result)) {
          return result.then(close);
        }
        close();
        return;
      }

      if (activeCare.careContext?.householdRole !== 'viewer') {
        close();
      }
      return;
    }

    if (
      detailContext === null
      && mutation?.createDetailed !== undefined
      && activeCare.careContext !== null
      && activeCare.careContext.householdRole !== 'viewer'
    ) {
      const careContext = activeCare.careContext;
      return mutation.createDetailed({
        detailDraft: draft,
        householdId: careContext.householdId,
        occurredAt: draft.occurredAt ?? new Date().toISOString(),
        puppyId: careContext.puppyId,
        trackerId: draft.trackerId,
        todayDate: careContext.todayDate,
      }).then(close);
    }
  };

  return (
    <QuickLogDetailsScreen
      auditMetadata={detailRow === null ? undefined : {
        clientEventId: detailRow.client_event_id,
        createdAt: detailRow.created_at,
        isCreatedByCurrentUser: detailRow.created_by === activeCare.careContext?.userId,
        occurredAt: detailRow.occurred_at,
        updatedAt: detailRow.updated_at,
        version: detailRow.version,
      }}
      initialDraft={initialDraft}
      initialTrackerId={initialTrackerId}
      initialSleepAction={parseSleepAction(params.sleepAction)}
      onClose={close}
      onSave={save}
      readOnly={shouldRenderReadOnly}
      status={status}
      syncStatus={detailRow === null ? undefined : getDetailSyncStatus(detailRow)}
      trackerLocked={detailRow !== null}
    />
  );
}

function getDetailSyncStatus(
  row: QuickLogCachedEventRow,
): 'failed' | 'pending' | 'synced' {
  if (row.localSync?.state === 'failed_permanent' || row.localSync?.state === 'failed_retryable') {
    return 'failed';
  }
  if (row.localSync?.state === 'pending_local' || row.localSync?.state === 'sending') {
    return 'pending';
  }
  return 'synced';
}

function findQuickLogDetailRow(
  rows: readonly QuickLogCachedEventRow[],
  context: QuickLogDetailsRouteContext,
): QuickLogCachedEventRow | null {
  return rows.find((row) => row.deleted_at === null
    && row.client_event_id === context.clientEventId
    && row.event_type === context.eventType
    && row.household_id === context.householdId
    && row.puppy_id === context.puppyId) ?? null;
}

function createDraftFromCachedRow(row: QuickLogCachedEventRow): QuickLogDetailDraft | undefined {
  if (row.payload_version !== 2 || !isQuickLogEventType(row.event_type)) {
    return undefined;
  }

  const payloadResult = eventPayloadSchemasV2[row.event_type].safeParse(row.payload);
  const trackerId = getQuickLogDetailTrackerIdForEventType(row.event_type);
  if (!payloadResult.success || trackerId === null) {
    return undefined;
  }

  const payload = payloadResult.data;
  const shared = {
    ...('note' in payload && payload.note !== undefined ? { note: payload.note } : {}),
    occurredAt: row.occurred_at,
  };
  if (trackerId === 'potty' && 'subtype' in payload) {
    return createQuickLogDetailDraft({ ...shared, subtype: payload.subtype, trackerId });
  }
  if (trackerId === 'feeding' && 'amount' in payload) {
    return createQuickLogDetailDraft({ ...shared, amount: payload.amount, trackerId });
  }
  if (trackerId === 'sleep' && 'action' in payload) {
    return createQuickLogDetailDraft({
      ...shared,
      action: payload.action,
      ...('duration_minutes' in payload && payload.duration_minutes !== undefined
        ? { durationMinutes: payload.duration_minutes }
        : {}),
      trackerId,
    });
  }
  if (trackerId === 'walk') {
    return createQuickLogDetailDraft({
      ...shared,
      ...('duration_minutes' in payload && payload.duration_minutes !== undefined
        ? { durationMinutes: payload.duration_minutes }
        : {}),
      trackerId,
    });
  }
  if (trackerId === 'zoomies') {
    return createQuickLogDetailDraft({
      ...shared,
      ...('intensity' in payload && payload.intensity !== undefined
        ? { intensity: payload.intensity }
        : {}),
      trackerId,
    });
  }
  if (trackerId === 'training' && 'topic' in payload) {
    return createQuickLogDetailDraft({
      ...shared,
      ...('duration_bucket' in payload && payload.duration_bucket !== undefined
        ? { durationBucket: payload.duration_bucket }
        : {}),
      topic: payload.topic,
      trackerId,
    });
  }
  if (trackerId === 'observation') {
    return createQuickLogDetailDraft({
      ...shared,
      ...('title' in payload && payload.title !== undefined ? { title: payload.title } : {}),
      trackerId,
    });
  }

  return undefined;
}

function getQuickLogDetailsStatus(input: Readonly<{
  activeCare: ReturnType<typeof useActiveCareContext>;
  quickLogMutationStatus: ReturnType<typeof useQuickLogMutationPort>['status'];
}>): QuickLogDetailsStatus {
  if (input.activeCare.status === 'loading') {
    return 'loading';
  }

  if (input.activeCare.status === 'error') {
    return 'error';
  }

  if (input.quickLogMutationStatus === 'loading') {
    return 'pending-write';
  }

  if (
    input.activeCare.status === 'empty'
    || input.quickLogMutationStatus === 'unavailable'
    || input.activeCare.careContext?.householdRole === 'viewer'
  ) {
    return 'permission-denied';
  }

  return 'ready';
}

function parseQuickLogDetailsRouteContext(
  params: QuickLogDetailsRouteParams,
): QuickLogDetailsRouteContext | null {
  const clientEventIdResult = quickLogClientEventIdSchema.safeParse(firstParam(params.clientEventId));
  const eventTypeResult = eventTypeSchema.safeParse(firstParam(params.eventType));
  const householdIdResult = uuidSchema.safeParse(firstParam(params.householdId));
  const puppyIdResult = uuidSchema.safeParse(firstParam(params.puppyId));
  const todayDateResult = dateSchema.safeParse(firstParam(params.todayDate));

  if (
    !clientEventIdResult.success
    || !eventTypeResult.success
    || !householdIdResult.success
    || !puppyIdResult.success
    || !todayDateResult.success
    || !isQuickLogEventType(eventTypeResult.data)
  ) {
    return null;
  }

  const trackerId = getQuickLogDetailTrackerIdForEventType(eventTypeResult.data);

  if (trackerId === null) {
    return null;
  }

  return {
    clientEventId: clientEventIdResult.data,
    eventType: eventTypeResult.data,
    householdId: householdIdResult.data,
    puppyId: puppyIdResult.data,
    todayDate: todayDateResult.data,
    trackerId,
  };
}

function parseStandaloneTrackerId(value: string | string[] | undefined): QuickLogDetailTrackerId {
  const trackerIdResult = quickLogDetailTrackerIdSchema.safeParse(firstParam(value));

  return trackerIdResult.success ? trackerIdResult.data : 'feeding';
}

function canUpdateQuickLogDetails(
  careContext: QuickLogSurfaceCareContext | null,
  detailContext: QuickLogDetailsRouteContext,
): boolean {
  return careContext !== null
    && careContext.householdRole !== 'viewer'
    && careContext.householdId === detailContext.householdId
    && careContext.puppyId === detailContext.puppyId
    && careContext.todayDate === detailContext.todayDate;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseSleepAction(value: string | string[] | undefined): 'start' | 'wake' | 'retrospective' | undefined {
  const action = firstParam(value);
  return action === 'start' || action === 'wake' || action === 'retrospective' ? action : undefined;
}

function isPromiseLike(value: unknown): value is Promise<void> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as Readonly<{ then?: unknown }>).then === 'function';
}
