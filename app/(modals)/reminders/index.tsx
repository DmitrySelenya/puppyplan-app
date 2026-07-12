import { router } from 'expo-router';

import { ConnectedRemindersHubScreen } from '@/features/reminders/screens/RemindersHubScreen';

export default function RemindersHubRoute() {
  return (
    <ConnectedRemindersHubScreen
      onAddReminder={() => {
        router.push('/reminders/edit');
      }}
      onBack={() => {
        router.back();
      }}
      onEditReminder={(reminderId) => {
        router.push({ pathname: '/reminders/edit', params: { reminderId } });
      }}
    />
  );
}
