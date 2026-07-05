import { router } from 'expo-router';

import { SitterModeScreen } from '@/features/more/screens/SitterModeScreen';

export default function SitterModeRoute() {
  return (
    <SitterModeScreen
      onBack={() => {
        router.back();
      }}
    />
  );
}
