import { router, useLocalSearchParams } from 'expo-router';

import {
  getQuickLogDetailTrackerIdForEventType,
  isQuickLogEventType,
  quickLogClientEventIdSchema,
  quickLogDetailTrackerIdSchema,
  type QuickLogDetailDraft,
  type QuickLogDetailTrackerId,
  type QuickLogEventType,
} from '@/contracts/quick-log';
import {
  dateSchema,
  eventTypeSchema,
  uuidSchema,
} from '@/contracts/supabase';
import { QuickLogDetailsScreen } from '@/features/quick-log/screens/QuickLogDetailsScreen';
import { closeModalRoute } from '@/lib/navigation/modal-close';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';
import type { QuickLogSurfaceCareContext } from '@/lib/query/quick-log-event-view';

type QuickLogDetailsRouteParams = Readonly<{
  clientEventId?: string | string[];
  eventType?: string | string[];
  householdId?: string | string[];
  puppyId?: string | string[];
  todayDate?: string | string[];
  trackerId?: string | string[];
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
  const initialTrackerId = detailContext?.trackerId ?? parseStandaloneTrackerId(params.trackerId);
  const close = () => {
    closeModalRoute(router);
  };
  const save = (draft: QuickLogDetailDraft) => {
    if (
      detailContext !== null
      && mutation !== undefined
      && draft.trackerId === detailContext.trackerId
      && canUpdateQuickLogDetails(activeCare.careContext, detailContext)
    ) {
      mutation.updateDetails({
        clientEventId: detailContext.clientEventId,
        draft,
        eventType: detailContext.eventType,
        householdId: detailContext.householdId,
        puppyId: detailContext.puppyId,
        todayDate: detailContext.todayDate,
      });
    }

    close();
  };

  return (
    <QuickLogDetailsScreen
      initialTrackerId={initialTrackerId}
      onClose={close}
      onSave={save}
    />
  );
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

  return trackerIdResult.success ? trackerIdResult.data : 'feeding_meal';
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
