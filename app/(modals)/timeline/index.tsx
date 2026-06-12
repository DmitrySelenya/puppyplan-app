import { router } from 'expo-router';

import { TimelineScreen } from '@/features/timeline/screens/TimelineScreen';
import { closeModalRoute } from '@/lib/navigation/modal-close';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';

export default function TimelineRoute() {
  const activeCare = useActiveCareContext();
  const quickLogMutation = useQuickLogMutationPort();
  const mutation = quickLogMutation.mutation;

  return (
    <TimelineScreen
      actions={mutation === undefined
        ? undefined
        : {
          onDelete: (request) => {
            mutation.deleteLocal(request.clientEventId);
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
