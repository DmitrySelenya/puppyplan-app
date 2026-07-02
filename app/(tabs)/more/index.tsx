import { router } from 'expo-router';

import { ConnectedMoreScreen } from '@/features/more/screens/MoreScreen';

export default function MoreRoute() {
  return (
    <ConnectedMoreScreen
      openPetSettings={() => {
        router.push('/pet');
      }}
      openHousehold={() => {
        router.push('/settings/household');
      }}
      openSitterMode={() => {
        router.push('/settings/sitter-mode');
      }}
      openShareableCards={() => {
        router.push('/sharing/puppy-card');
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
