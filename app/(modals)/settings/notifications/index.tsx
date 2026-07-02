import { router } from 'expo-router';

import { ConnectedNotificationPreferencesScreen } from '@/features/more/screens/NotificationPreferencesScreen';

export default function NotificationPreferencesRoute() {
  return (
    <ConnectedNotificationPreferencesScreen
      onBack={() => {
        router.back();
      }}
    />
  );
}
