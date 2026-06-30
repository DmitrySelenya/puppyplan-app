import { router } from 'expo-router';

import { ReminderEditScreen } from '@/features/reminders/screens/ReminderEditScreen';

export default function ReminderEditRoute() {
  return (
    <ReminderEditScreen
      onClose={() => {
        router.back();
      }}
    />
  );
}
