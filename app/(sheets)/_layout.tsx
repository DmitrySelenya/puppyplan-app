import { Stack } from 'expo-router';

export default function SheetLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="quick-log/index"
        options={{ contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen name="quick-log/schedule/index" />
    </Stack>
  );
}
