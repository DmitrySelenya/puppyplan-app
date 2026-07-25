import type { AuthStatus, HouseholdInviteStatus } from '@/contracts/auth';

export type AuthLanding = '/diary' | '/sign-in';
export type AuthRouteRedirect = AuthLanding | '/invite/unavailable';

const publicSignedOutSegments = new Set(['invite', 'share', 'sign-in']);

export function resolveAuthLanding(status: AuthStatus): AuthLanding | null {
  switch (status) {
    case 'signedIn':
      return '/diary';
    case 'signedOut':
      return '/sign-in';
    case 'loading':
    default:
      return null;
  }
}

export function resolveAuthRouteRedirect(
  status: AuthStatus,
  segments: readonly string[],
  householdInviteStatus: HouseholdInviteStatus = 'none',
): AuthRouteRedirect | null {
  const [firstSegment] = segments;

  if (householdInviteStatus === 'unavailable') {
    return firstSegment === 'invite' ? null : '/invite/unavailable';
  }

  if (status === 'loading') {
    return null;
  }

  if (status === 'signedIn') {
    return firstSegment === 'sign-in' ? '/diary' : null;
  }

  return firstSegment && publicSignedOutSegments.has(firstSegment) ? null : '/sign-in';
}
