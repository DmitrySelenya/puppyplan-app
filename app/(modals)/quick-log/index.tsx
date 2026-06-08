import { router } from 'expo-router';

import { QuickLogShell } from '@/features/quick-log/screens/QuickLogShell';
import { useActiveCareContext } from '@/lib/query/active-care-context';

export default function QuickLogRoute() {
  const activeCare = useActiveCareContext();

  return (
    <QuickLogShell
      careContext={activeCare.careContext}
      closeSheet={() => {
        router.back();
      }}
    />
  );
}
