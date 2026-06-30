import { router } from 'expo-router';

import {
  TodayScreen,
  createTodayPlanInputFromPuppy,
} from '@/features/today/screens/TodayScreen';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';

export default function DiaryRoute() {
  const activeCare = useActiveCareContext();
  const quickLogMutation = useQuickLogMutationPort();
  const mutation = quickLogMutation.mutation;
  const canWriteQuickLogEvents = mutation !== undefined
    && activeCare.careContext !== null
    && activeCare.careContext.householdRole !== 'viewer';

  return (
    <TodayScreen
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
      openQuickLog={() => {
        router.push('/quick-log');
      }}
      openTimeline={() => {
        router.push('/timeline');
      }}
      puppyAgeLabel={activeCare.puppy?.age_weeks_estimate === null || activeCare.puppy?.age_weeks_estimate === undefined
        ? undefined
        : `${activeCare.puppy.age_weeks_estimate} weeks`}
      puppyName={activeCare.puppy?.name}
      todayPlanInput={activeCare.careContext === null || activeCare.puppy === null
        ? undefined
        : createTodayPlanInputFromPuppy({
          puppyCreatedAt: activeCare.puppy.created_at,
          todayDate: activeCare.careContext.todayDate,
        })}
    />
  );
}
