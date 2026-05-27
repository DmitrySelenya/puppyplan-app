import { useState, type PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { SnackbarProvider } from '@/design/primitives/Snackbar';
import { i18n } from '@/lib/i18n';
import { createPuppyPlanQueryClient } from '@/lib/query/client';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => createPuppyPlanQueryClient());

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <SnackbarProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </SnackbarProvider>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}
