import type { AuthStatus } from '@/contracts/auth';

export type AuthLanding = '/diary' | '/sign-in';

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
): AuthLanding | null {
  if (status === 'loading') {
    return null;
  }

  const [firstSegment] = segments;

  if (status === 'signedIn') {
    return firstSegment === 'sign-in' ? '/diary' : null;
  }

  return firstSegment && publicSignedOutSegments.has(firstSegment) ? null : '/sign-in';
}
