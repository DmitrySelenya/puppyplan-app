import { router } from 'expo-router';
import { Share } from 'react-native';

import {
  TodayScreen,
  createTodayPlanInputFromPuppy,
} from '@/features/today/screens/TodayScreen';
import { createDiaryCheckOffVariables } from '@/features/today/createReminderCheckOff';
import { useSyncedQuickLogDeleteUndo } from '@/features/quick-log/useSyncedQuickLogDeleteUndo';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useDiaryDayModel } from '@/lib/query/diary-day';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';

export default function DiaryRoute() {
  const activeCare = useActiveCareContext();
  const quickLogMutation = useQuickLogMutationPort();
  const mutation = quickLogMutation.mutation;
  const createDetailed = mutation?.createDetailed;
  const diaryDay = useDiaryDayModel(
    activeCare.careContext,
    activeCare.careContext?.todayDate ?? null,
    Date.now(),
  );
  const onDelete = useSyncedQuickLogDeleteUndo(mutation);
  const canWriteQuickLogEvents = mutation !== undefined
    && activeCare.careContext !== null
    && activeCare.careContext.householdRole !== 'viewer';

  return (
    <TodayScreen
      actions={!canWriteQuickLogEvents
        ? undefined
        : {
          onDelete,
          onEdit: (request) => {
            router.push({
              pathname: '/quick-log/details',
              params: request,
            });
          },
          onRetry: (clientEventId, recoverySurface, sourceSurface) => {
            mutation.retry(clientEventId, recoverySurface, sourceSurface);
          },
          onUndo: (request) => {
            mutation.undo(request);
          },
        }}
      careContext={activeCare.careContext}
      dayModel={diaryDay.model}
      dayModelStatus={diaryDay.status}
      onCheckOff={!canWriteQuickLogEvents || createDetailed === undefined
        ? undefined
        : async (item, pottySubtype) => {
          const careContext = activeCare.careContext;
          if (careContext === null) {
            throw new Error('diary_checkoff_context_unavailable');
          }

          await createDetailed(createDiaryCheckOffVariables({
            context: {
              householdId: careContext.householdId,
              puppyId: careContext.puppyId,
              todayDate: careContext.todayDate,
            },
            item,
            occurredAt: new Date().toISOString(),
            pottySubtype,
          }));
        }}
      onShareText={async (message) => {
        await Share.share({ message });
      }}
      openOnboarding={() => {
        router.push('/onboarding');
      }}
      openQuickLog={() => {
        router.push('/quick-log');
      }}
      openTimeline={() => {
        router.push('/quick-log/schedule');
      }}
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
