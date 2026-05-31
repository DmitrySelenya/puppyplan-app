import type { AuthStatus } from '@/contracts/auth';

export type AuthLanding = '/sign-in' | '/today';

const publicSignedOutSegments = new Set(['invite', 'share', 'sign-in']);

export function resolveAuthLanding(status: AuthStatus): AuthLanding | null {
  switch (status) {
    case 'signedIn':
      return '/today';
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
    return firstSegment === 'sign-in' ? '/today' : null;
  }

  return firstSegment && publicSignedOutSegments.has(firstSegment) ? null : '/sign-in';
}
