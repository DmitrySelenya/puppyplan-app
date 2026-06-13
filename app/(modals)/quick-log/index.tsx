import { router } from 'expo-router';

import {
  createQuickLogLocalEventViews,
  QuickLogShell,
} from '@/features/quick-log/screens/QuickLogShell';
import { useAppTranslation } from '@/lib/i18n';
import { closeModalRoute } from '@/lib/navigation/modal-close';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';
import { useQuickLogCachedRows } from '@/lib/query/useQuickLogCachedRows';

export default function QuickLogRoute() {
  const activeCare = useActiveCareContext();
  const quickLogMutation = useQuickLogMutationPort();
  const { locale, t } = useAppTranslation();
  const rows = useQuickLogCachedRows(activeCare.careContext);
  const localEvents = createQuickLogLocalEventViews(rows, {
    locale,
    t,
    todayDate: activeCare.careContext?.todayDate ?? '',
  });

  return (
    <QuickLogShell
      careContext={activeCare.careContext}
      closeSheet={() => {
        closeModalRoute(router);
      }}
      editTrackers={() => {
        router.push('/settings/quick-trackers');
      }}
      localEvents={localEvents}
      mutation={quickLogMutation.mutation}
      mutationEvents={quickLogMutation.mutationEvents}
    />
  );
}
