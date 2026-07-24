import { useLocalSearchParams } from 'expo-router';

import { InviteAcceptScreen } from '@/features/linking/screens/InviteAcceptScreen';
import { useAuth } from '@/lib/auth';
import { usePersistPendingHouseholdInvite } from '@/lib/storage/usePendingHouseholdInvite';

export default function InviteTokenRoute() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const inviteToken = Array.isArray(token) ? token[0] : token;
  const persistenceStatus = usePersistPendingHouseholdInvite(inviteToken);
  const { householdInviteStatus } = useAuth();
  const reviewState = householdInviteStatus === 'unavailable'
    ? 'expired'
    : persistenceStatus === 'loading'
      ? 'loading'
      : persistenceStatus === 'invalid'
        ? 'expired'
        : persistenceStatus === 'error'
          ? 'load-error'
          : undefined;

  return <InviteAcceptScreen inviteToken={inviteToken} reviewState={reviewState} />;
}
