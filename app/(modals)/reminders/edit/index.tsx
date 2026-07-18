import { router, useLocalSearchParams } from 'expo-router';

import { ConnectedReminderEditScreen } from '@/features/reminders/screens/ReminderEditScreen';

export default function ReminderEditRoute() {
  const { reminderId } = useLocalSearchParams<{ reminderId?: string }>();

  return (
    <ConnectedReminderEditScreen
      onClose={() => {
        router.back();
      }}
      reminderId={reminderId}
    />
  );
}
