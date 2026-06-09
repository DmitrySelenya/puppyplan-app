import { router } from 'expo-router';

import { QuickLogShell } from '@/features/quick-log/screens/QuickLogShell';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useQuickLogMutationPort } from '@/lib/query/quick-log';

export default function QuickLogRoute() {
  const activeCare = useActiveCareContext();
  const quickLogMutation = useQuickLogMutationPort();

  return (
    <QuickLogShell
      careContext={activeCare.careContext}
      closeSheet={() => {
        router.back();
      }}
      mutation={quickLogMutation.mutation}
      mutationEvents={quickLogMutation.mutationEvents}
    />
  );
}
