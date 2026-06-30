import { router } from 'expo-router';

import { ShareablePuppyCardScreen } from '@/features/more/screens/ShareablePuppyCardScreen';

export default function ShareablePuppyCardRoute() {
  return (
    <ShareablePuppyCardScreen
      onBack={() => {
        router.back();
      }}
    />
  );
}
