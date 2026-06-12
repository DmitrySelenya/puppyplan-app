import { router } from 'expo-router';

import { TimelineScreen } from '@/features/timeline/screens/TimelineScreen';
import { closeModalRoute } from '@/lib/navigation/modal-close';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import type { QuickLogEventEditRequest } from '@/lib/query/quick-log-event-view';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';

export default function TimelineRoute() {
  const activeCare = useActiveCareContext();
  const quickLogMutation = useQuickLogMutationPort();
  const mutation = quickLogMutation.mutation;
  const canWriteQuickLogEvents = mutation !== undefined
    && activeCare.careContext !== null
    && activeCare.careContext.householdRole !== 'viewer';

  return (
    <TimelineScreen
      actions={!canWriteQuickLogEvents
        ? undefined
        : {
          onDelete: (request) => {
            if (request.status === 'synced') {
              mutation.deleteSynced({
                clientEventId: request.clientEventId,
                eventType: request.eventType,
                householdId: request.householdId,
                puppyId: request.puppyId,
                todayDate: request.todayDate,
              });
              return;
            }

            mutation.deleteLocal(request.clientEventId);
          },
          onEdit: (request) => {
            router.push(createQuickLogDetailsHref(request));
          },
          onRetry: (clientEventId, recoverySurface, sourceSurface) => {
            mutation.retry(clientEventId, recoverySurface, sourceSurface);
          },
          onUndo: (request) => {
            mutation.undo(request);
          },
        }}
      careContext={activeCare.careContext}
      onClose={() => {
        closeModalRoute(router);
      }}
    />
  );
}

function createQuickLogDetailsHref(
  request: QuickLogEventEditRequest,
): `/quick-log/details?${string}` {
  const params = new URLSearchParams({
    trackerId: request.trackerId,
    clientEventId: request.clientEventId,
    eventType: request.eventType,
    householdId: request.householdId,
    puppyId: request.puppyId,
    todayDate: request.todayDate,
  });

  return `/quick-log/details?${params.toString()}` as `/quick-log/details?${string}`;
}
