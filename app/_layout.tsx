import 'react-native-reanimated';

import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DesignFontGate } from '@/design/fonts';
import { resolveAuthRouteRedirect } from '@/features/auth';
import { QuickLogFeedbackProvider } from '@/features/quick-log/QuickLogFeedbackProvider';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppProviders } from '@/lib/providers/AppProviders';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <DesignFontGate>
          <AuthProvider>
            <AuthRouteGate />
            <QuickLogFeedbackProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="sign-in" />
                <Stack.Screen name="onboarding/index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(sheets)" options={{ presentation: 'transparentModal' }} />
                <Stack.Screen name="(modals)" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="invite/[token]" />
                <Stack.Screen name="share/[token]" />
              </Stack>
            </QuickLogFeedbackProvider>
          </AuthProvider>
        </DesignFontGate>
        <StatusBar style="dark" />
      </AppProviders>
    </GestureHandlerRootView>
  );
}

function AuthRouteGate() {
  const { status } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    const redirect = resolveAuthRouteRedirect(status, segments);

    if (redirect) {
      router.replace(redirect);
    }
  }, [segments, status]);

  return null;
}
