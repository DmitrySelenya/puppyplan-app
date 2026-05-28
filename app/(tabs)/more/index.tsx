import { router } from 'expo-router';

import { MoreScreen } from '@/features/more/screens/MoreScreen';

export default function MoreRoute() {
  return (
    <MoreScreen
      openTimeline={() => {
        router.push('/timeline');
      }}
    />
  );
}
