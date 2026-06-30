import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="quick-log/details/index" />
      <Stack.Screen name="timeline/index" />
      <Stack.Screen name="pet/health-record-edit/index" />
      <Stack.Screen name="reminders/edit/index" />
      <Stack.Screen name="settings/puppy-profile/index" />
      <Stack.Screen name="settings/quick-trackers/index" />
      <Stack.Screen name="settings/notifications/index" />
      <Stack.Screen name="settings/help/index" />
      <Stack.Screen name="paywall/index" />
    </Stack>
  );
}
