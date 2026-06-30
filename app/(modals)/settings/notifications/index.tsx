import { router } from 'expo-router';

import { NotificationPreferencesScreen } from '@/features/more/screens/NotificationPreferencesScreen';

export default function NotificationPreferencesRoute() {
  return (
    <NotificationPreferencesScreen
      onBack={() => {
        router.back();
      }}
    />
  );
}
