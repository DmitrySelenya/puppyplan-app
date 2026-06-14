import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="quick-log/details/index" />
      <Stack.Screen name="timeline/index" />
      <Stack.Screen name="settings/puppy-profile/index" />
      <Stack.Screen name="settings/quick-trackers/index" />
    </Stack>
  );
}
