import { router } from 'expo-router';

import { ConnectedOnboardingScreen } from '@/features/onboarding/screens/OnboardingScreen';

export default function OnboardingRoute() {
  return (
    <ConnectedOnboardingScreen
      openQuickLog={() => {
        router.replace('/quick-log');
      }}
      openSignIn={() => {
        router.replace('/sign-in');
      }}
    />
  );
}
