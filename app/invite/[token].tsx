import { router, useLocalSearchParams } from 'expo-router';

import { ConnectedInviteAcceptScreen } from '@/features/linking/screens/InviteAcceptScreen';

export default function InviteTokenRoute() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const inviteToken = Array.isArray(token) ? token[0] : token;

  return (
    <ConnectedInviteAcceptScreen
      initialInviteToken={inviteToken}
      onAccepted={() => router.replace('/diary')}
      onOpenSignIn={() => router.push('/sign-in')}
    />
  );
}
