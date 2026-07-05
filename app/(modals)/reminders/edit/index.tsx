import { router } from 'expo-router';

import { ConnectedReminderEditScreen } from '@/features/reminders/screens/ReminderEditScreen';

export default function ReminderEditRoute() {
  return (
    <ConnectedReminderEditScreen
      onClose={() => {
        router.back();
      }}
    />
  );
}
