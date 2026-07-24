// src/test/auth-context.test.tsx
import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';

import { AuthProvider, useAuth, type AuthProviderDependencies } from '@/lib/auth/context';
import type { SessionUser } from '@/contracts/auth';
import { HouseholdInviteError } from '@/lib/supabase/household-access';

const userId = '00000000-0000-4000-8000-000000000101';
const user: SessionUser = { id: userId, email: 'owner@example.com' };

function Probe() {
  const {
    activeHouseholdId,
    householdInviteStatus,
    status,
    user: current,
  } = useAuth();
  return (
    <Text>
      {[
        status,
        current?.id ?? 'none',
        activeHouseholdId ?? 'none',
        householdInviteStatus,
      ].join(':')}
    </Text>
  );
}

function makeDeps(overrides: Partial<AuthProviderDependencies> = {}) {
  let emit: (next: SessionUser | null) => void = () => {};
  const deps: AuthProviderDependencies = {
    getCurrentUser: jest.fn(async () => null),
    subscribeToAuthChanges: jest.fn((handler: (u: SessionUser | null) => void) => {
      emit = handler;
      return jest.fn();
    }),
    signOut: jest.fn(async () => {}),
    bootstrap: jest.fn(async () => ({ household_id: 'h', created: true })),
    acceptInvite: jest.fn(async () => ({
      household_id: '00000000-0000-4000-8000-000000000202',
      role: 'caregiver' as const,
    })),
    clearPendingInvite: jest.fn(async () => undefined),
    markPendingInviteUnavailable: jest.fn(async () => undefined),
    readPendingInvite: jest.fn(async () => ({ status: 'none' as const })),
    observability: { captureException: jest.fn() },
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
    appState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
    ...overrides,
  };
  return { deps, emit: (next: SessionUser | null) => emit(next) };
}

function renderProvider(deps: AuthProviderDependencies) {
  render(
    <AuthProvider dependencies={deps}>
      <Probe />
    </AuthProvider>,
  );
}

async function flushAuthEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('AuthProvider', () => {
  it('resolves to signedOut when there is no restored session', async () => {
    const { deps } = makeDeps();

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => expect(screen.getByText('signedOut:none:none:none')).toBeTruthy());
  });

  it('reports session restore failures before settling signed out', async () => {
    const restoreError = new Error('synthetic_session_restore_failure');
    const captureException = jest.fn();
    const { deps } = makeDeps({
      getCurrentUser: jest.fn(async () => {
        throw restoreError;
      }),
      observability: { captureException },
    });

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => expect(screen.getByText('signedOut:none:none:none')).toBeTruthy());
    expect(captureException).toHaveBeenCalledWith(restoreError, {
      area: 'auth',
      operation: 'session_restore',
    });
  });

  it('restores a signed-in session and bootstraps the user once', async () => {
    const householdId = '00000000-0000-4000-8000-000000000201';
    const bootstrap = jest.fn(async () => ({ household_id: householdId, created: true }));
    const { deps } = makeDeps({ getCurrentUser: jest.fn(async () => user), bootstrap });

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => {
      expect(screen.getByText(`signedIn:${userId}:${householdId}:none`)).toBeTruthy();
    });
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it('AC-PUP42-AUTH-2 accepts a pending invite before auth bootstrap and activates its household', async () => {
    const invitedHouseholdId = '00000000-0000-4000-8000-000000000202';
    const acceptInvite = jest.fn(async () => ({
      household_id: invitedHouseholdId,
      role: 'caregiver' as const,
    }));
    const bootstrap = jest.fn(async () => ({
      household_id: '00000000-0000-4000-8000-000000000203',
      created: true,
    }));
    const clearPendingInvite = jest.fn(async () => undefined);
    const { deps } = makeDeps({
      acceptInvite,
      bootstrap,
      clearPendingInvite,
      getCurrentUser: jest.fn(async () => user),
      readPendingInvite: jest.fn(async () => ({
        status: 'pending' as const,
        inviteToken: 'b'.repeat(64),
      })),
    });

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => {
      expect(screen.getByText(`signedIn:${userId}:${invitedHouseholdId}:none`)).toBeTruthy();
    });
    expect(acceptInvite).toHaveBeenCalledWith({ token: 'b'.repeat(64) });
    expect(clearPendingInvite).toHaveBeenCalledTimes(1);
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it('AC-PUP42-AUTH-3 blocks bootstrap on unavailable invite until explicit fallback', async () => {
    const fallbackHouseholdId = '00000000-0000-4000-8000-000000000204';
    const bootstrap = jest.fn(async () => ({
      household_id: fallbackHouseholdId,
      created: true,
    }));
    const acceptInvite = jest.fn(async () => {
      throw new HouseholdInviteError('unavailable');
    });
    const markPendingInviteUnavailable = jest.fn(async () => undefined);
    const { deps } = makeDeps({
      acceptInvite,
      bootstrap,
      getCurrentUser: jest.fn(async () => user),
      markPendingInviteUnavailable,
      readPendingInvite: jest.fn(async () => ({
        status: 'pending' as const,
        inviteToken: 'c'.repeat(64),
      })),
    });

    render(
      <AuthProvider dependencies={deps}>
        <Probe />
        <FallbackProbe />
      </AuthProvider>,
    );
    await flushAuthEffects();

    await waitFor(() => {
      expect(screen.getByText('loading:none:none:unavailable')).toBeTruthy();
    });
    expect(markPendingInviteUnavailable).toHaveBeenCalledTimes(1);
    expect(bootstrap).not.toHaveBeenCalled();

    await act(async () => {
      screen.getByText('continue-without-invite').props.onPress();
    });

    await waitFor(() => {
      expect(screen.getByText(`signedIn:${userId}:${fallbackHouseholdId}:none`)).toBeTruthy();
    });
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it('AC-PUP42-AUTH-3 preserves a stored unavailable marker without accepting or bootstrapping', async () => {
    const acceptInvite = jest.fn();
    const bootstrap = jest.fn();
    const { deps } = makeDeps({
      acceptInvite,
      bootstrap,
      getCurrentUser: jest.fn(async () => user),
      readPendingInvite: jest.fn(async () => ({ status: 'unavailable' as const })),
    });

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => {
      expect(screen.getByText('loading:none:none:unavailable')).toBeTruthy();
    });
    expect(acceptInvite).not.toHaveBeenCalled();
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it('AC-PUP42-AUTH-4 signs out on unclassified acceptance failures', async () => {
    const acceptInvite = jest.fn(async () => {
      throw new Error('household_invite_accept_failed');
    });
    const signOut = jest.fn(async () => undefined);
    const { deps } = makeDeps({
      acceptInvite,
      getCurrentUser: jest.fn(async () => user),
      readPendingInvite: jest.fn(async () => ({
        status: 'pending' as const,
        inviteToken: 'd'.repeat(64),
      })),
      signOut,
    });

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('signedOut:none:none:none')).toBeTruthy());
  });

  it('signs out instead of exposing signedIn when bootstrap fails', async () => {
    const bootstrap = jest.fn(async () => {
      throw new Error('auth_bootstrap_failed');
    });
    const signOut = jest.fn(async () => {});
    const { deps } = makeDeps({ getCurrentUser: jest.fn(async () => user), bootstrap, signOut });

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('signedOut:none:none:none')).toBeTruthy());
    expect(screen.queryByText(new RegExp(`signedIn:${userId}`))).toBeNull();
  });

  it('still clears local auth state when bootstrap cleanup sign-out fails', async () => {
    const bootstrap = jest.fn(async () => {
      throw new Error('auth_bootstrap_failed');
    });
    const signOut = jest.fn(async () => {
      throw new Error('auth_sign_out_failed');
    });
    const { deps } = makeDeps({ getCurrentUser: jest.fn(async () => user), bootstrap, signOut });

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('signedOut:none:none:none')).toBeTruthy());
  });

  it('updates status when auth changes are emitted', async () => {
    const { deps, emit } = makeDeps();

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => expect(screen.getByText('signedOut:none:none:none')).toBeTruthy());
    await act(async () => {
      emit(user);
    });
    await waitFor(() => expect(screen.getByText(new RegExp(`signedIn:${userId}`))).toBeTruthy());
  });

  it('starts auto-refresh on mount and wires AppState', async () => {
    const addEventListener = jest.fn(() => ({ remove: jest.fn() }));
    const startAutoRefresh = jest.fn();
    const { deps } = makeDeps({
      startAutoRefresh,
      appState: { currentState: 'active', addEventListener },
    });

    renderProvider(deps);
    await flushAuthEffects();

    expect(startAutoRefresh).toHaveBeenCalled();
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

function FallbackProbe() {
  const { continueWithoutHouseholdInvite } = useAuth();

  return <Text onPress={() => void continueWithoutHouseholdInvite()}>continue-without-invite</Text>;
}
