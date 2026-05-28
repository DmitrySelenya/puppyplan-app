import { router } from 'expo-router';

import { TodayScreen } from '@/features/today/screens/TodayScreen';

export default function TodayRoute() {
  return (
    <TodayScreen
      openTimeline={() => {
        router.push('/timeline');
      }}
    />
  );
}
