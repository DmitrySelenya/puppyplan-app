import { router, useLocalSearchParams } from 'expo-router';

import {
  createQuickLogLocalEventViews,
  createQuickLogRecentEvents,
  QuickLogShell,
} from '@/features/quick-log/screens/QuickLogShell';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import type { QuickLogEventEditRequest } from '@/lib/query/quick-log-event-view';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';
import { useQuickLogCachedRows } from '@/lib/query/useQuickLogCachedRows';
import { useAppTranslation } from '@/lib/i18n';

export default function QuickLogRoute() {
  const params = useLocalSearchParams();
  const activeCare = useActiveCareContext();
  const quickLogMutation = useQuickLogMutationPort();
  const rows = useQuickLogCachedRows(activeCare.careContext);
  const { locale, t } = useAppTranslation();
  const localEvents = activeCare.careContext === null
    ? []
    : createQuickLogLocalEventViews(rows, {
        locale,
        t,
        todayDate: activeCare.careContext.todayDate,
      });
  const recentEvents = createQuickLogRecentEvents(rows);
  const closeSheet = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/diary');
    }
  };
  const source = getQuickLogSource(params.source);
  const onQuickLogSaved = source === 'onboarding-first-value'
    ? () => {
        router.replace('/onboarding?postFirstValuePrompt=account');
      }
    : undefined;

  return (
    <QuickLogShell
      careContext={activeCare.careContext}
      closeSheet={closeSheet}
      editTrackers={() => {
        router.push('/settings/quick-trackers');
      }}
      localEvents={localEvents}
      mutation={quickLogMutation.mutation}
      mutationEvents={quickLogMutation.mutationEvents}
      onQuickLogSaved={onQuickLogSaved}
      openDetails={(request) => {
        router.push(createQuickLogDetailsHref(request));
      }}
      recentEvents={recentEvents}
    />
  );
}

function getQuickLogSource(value: string | string[] | undefined): 'onboarding-first-value' | null {
  const source = Array.isArray(value) ? value[0] : value;

  return source === 'onboarding-first-value' ? source : null;
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
