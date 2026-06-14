import {
  resolveAuthLanding,
  resolveAuthRouteRedirect,
} from '@/features/auth/navigation';

describe('resolveAuthLanding', () => {
  it('returns null while the session is still loading', () => {
    expect(resolveAuthLanding('loading')).toBeNull();
  });

  it('routes signed-out users to the sign-in screen', () => {
    expect(resolveAuthLanding('signedOut')).toBe('/sign-in');
  });

  it('routes signed-in users to Today', () => {
    expect(resolveAuthLanding('signedIn')).toBe('/today');
  });
});

describe('resolveAuthRouteRedirect', () => {
  it('does not redirect while auth is loading', () => {
    expect(resolveAuthRouteRedirect('loading', ['(tabs)', 'more'])).toBeNull();
  });

  it('moves signed-out users away from protected tabs and modals', () => {
    expect(resolveAuthRouteRedirect('signedOut', ['(tabs)', 'more'])).toBe('/sign-in');
    expect(resolveAuthRouteRedirect('signedOut', ['(modals)', 'quick-log'])).toBe('/sign-in');
    expect(resolveAuthRouteRedirect('signedOut', ['(sheets)', 'quick-log'])).toBe('/sign-in');
  });

  it('allows signed-out users to stay on sign-in and public access screens', () => {
    expect(resolveAuthRouteRedirect('signedOut', ['sign-in'])).toBeNull();
    expect(resolveAuthRouteRedirect('signedOut', ['invite', '[token]'])).toBeNull();
    expect(resolveAuthRouteRedirect('signedOut', ['share', '[token]'])).toBeNull();
  });

  it('moves signed-in users away from sign-in', () => {
    expect(resolveAuthRouteRedirect('signedIn', ['sign-in'])).toBe('/today');
  });

  it('allows signed-in users to stay on app surfaces', () => {
    expect(resolveAuthRouteRedirect('signedIn', ['(tabs)', 'today'])).toBeNull();
    expect(resolveAuthRouteRedirect('signedIn', ['invite', '[token]'])).toBeNull();
  });
});
