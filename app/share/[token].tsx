import { useRouter } from 'expo-router';

import { AccessUnavailableScreen } from '@/features/linking/screens/AccessUnavailableScreen';

export default function ShareTokenRoute() {
  const router = useRouter();

  return (
    <AccessUnavailableScreen
      onAcknowledge={() => {
        router.dismissAll();
        router.replace('/diary');
      }}
    />
  );
}
