import { router } from 'expo-router';

import { HouseholdAccessScreen } from '@/features/more/screens/HouseholdAccessScreen';

export default function HouseholdSettingsRoute() {
  return (
    <HouseholdAccessScreen
      onBack={() => {
        router.back();
      }}
    />
  );
}
