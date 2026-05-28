import { router } from 'expo-router';

import { TimelineScreen } from '@/features/timeline/screens/TimelineScreen';

export default function TimelineRoute() {
  return (
    <TimelineScreen
      onClose={() => {
        router.back();
      }}
    />
  );
}
