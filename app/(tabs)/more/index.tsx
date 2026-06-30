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
      openHousehold={() => {
        router.push('/settings/household');
      }}
      openSitterMode={() => {
        router.push('/settings/sitter-mode');
      }}
      openHelp={() => {
        router.push('/settings/help');
      }}
      openNotifications={() => {
        router.push('/settings/notifications');
      }}
      openPlus={() => {
        router.push('/paywall');
      }}
      openTimeline={() => {
        router.push('/timeline');
      }}
    />
  );
}
