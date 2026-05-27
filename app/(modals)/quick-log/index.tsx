import { router } from 'expo-router';

import { QuickLogShell } from '@/features/quick-log/screens/QuickLogShell';

export default function QuickLogRoute() {
  return (
    <QuickLogShell
      closeSheet={() => {
        router.back();
      }}
    />
  );
}
