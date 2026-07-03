import { router, useLocalSearchParams } from 'expo-router';

import {
  ConnectedOnboardingScreen,
  type OnboardingPostFirstValuePrompt,
} from '@/features/onboarding/screens/OnboardingScreen';

export default function OnboardingRoute() {
  const params = useLocalSearchParams();
  const postFirstValuePrompt = getPostFirstValuePrompt(params.postFirstValuePrompt);

  return (
    <ConnectedOnboardingScreen
      openQuickLog={() => {
        router.push('/quick-log?source=onboarding-first-value');
      }}
      openSignIn={() => {
        router.replace('/sign-in');
      }}
      postFirstValuePrompt={postFirstValuePrompt}
    />
  );
}

function getPostFirstValuePrompt(
  value: string | string[] | undefined,
): OnboardingPostFirstValuePrompt | null {
  const prompt = Array.isArray(value) ? value[0] : value;

  return prompt === 'account' || prompt === 'notifications'
    ? prompt
    : null;
}
