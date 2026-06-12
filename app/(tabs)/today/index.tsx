import { router } from 'expo-router';

import { TodayScreen } from '@/features/today/screens/TodayScreen';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';

export default function TodayRoute() {
  const activeCare = useActiveCareContext();
  const quickLogMutation = useQuickLogMutationPort();
  const mutation = quickLogMutation.mutation;

  return (
    <TodayScreen
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
      openOnboarding={() => {
        router.push('/onboarding');
      }}
      openTimeline={() => {
        router.push('/timeline');
      }}
    />
  );
}
