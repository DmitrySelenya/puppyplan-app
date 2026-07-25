import { useLocalSearchParams, useRouter } from 'expo-router';

import { InviteAcceptScreen } from '@/features/linking/screens/InviteAcceptScreen';

export default function InviteTokenRoute() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const router = useRouter();
  const inviteToken = Array.isArray(token) ? token[0] : token;

  return (
    <InviteAcceptScreen
      inviteToken={inviteToken}
      onAcknowledge={() => {
        router.dismissAll();
        router.replace('/diary');
      }}
    />
  );
}
