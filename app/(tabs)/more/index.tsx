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
      openNotifications={() => {
        router.push('/settings/notifications');
      }}
      openTimeline={() => {
        router.push('/timeline');
      }}
    />
  );
}
