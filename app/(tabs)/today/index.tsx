import { router } from 'expo-router';

import { TodayScreen } from '@/features/today/screens/TodayScreen';
import { useActiveCareContext } from '@/lib/query/active-care-context';

export default function TodayRoute() {
  const activeCare = useActiveCareContext();

  return (
    <TodayScreen
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
