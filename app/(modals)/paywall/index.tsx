import { router } from 'expo-router';

import { PuppyPlanPlusScreen } from '@/features/more/screens/PuppyPlanPlusScreen';

export default function PaywallRoute() {
  return (
    <PuppyPlanPlusScreen
      onClose={() => {
        router.back();
      }}
    />
  );
}

