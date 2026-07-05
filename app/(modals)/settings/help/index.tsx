import { router } from 'expo-router';

import { HelpSupportScreen } from '@/features/more/screens/HelpSupportScreen';

export default function HelpSupportRoute() {
  return (
    <HelpSupportScreen
      onBack={() => {
        router.back();
      }}
    />
  );
}
