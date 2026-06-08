import { router } from 'expo-router';

import { MoreScreen } from '@/features/more/screens/MoreScreen';

export default function MoreRoute() {
  return (
    <MoreScreen
      openPuppyProfile={() => {
        router.push('/settings/puppy-profile');
      }}
      openQuickTrackers={() => {
        router.push('/settings/quick-trackers');
      }}
      openTimeline={() => {
        router.push('/timeline');
      }}
    />
  );
}
