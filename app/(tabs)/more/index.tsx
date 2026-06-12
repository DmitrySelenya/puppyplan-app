import { router } from 'expo-router';

import { ConnectedMoreScreen } from '@/features/more/screens/MoreScreen';

export default function MoreRoute() {
  return (
    <ConnectedMoreScreen
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
