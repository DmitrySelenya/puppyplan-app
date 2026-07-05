import { router } from 'expo-router';

import { PrivacyAccountScreen } from '@/features/more/screens/PrivacyAccountScreen';

export default function PrivacyAccountRoute() {
  return (
    <PrivacyAccountScreen
      onBack={() => {
        router.back();
      }}
    />
  );
}
