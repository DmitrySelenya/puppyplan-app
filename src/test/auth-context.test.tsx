// src/test/auth-context.test.tsx
import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';

import { AuthProvider, useAuth, type AuthProviderDependencies } from '@/lib/auth/context';
import type { SessionUser } from '@/contracts/auth';

const userId = '00000000-0000-4000-8000-000000000101';
const user: SessionUser = { id: userId, email: 'owner@example.com' };

function Probe() {
  const { status, user: current } = useAuth();
  return <Text>{`${status}:${current?.id ?? 'none'}`}</Text>;
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

    await waitFor(() => expect(screen.getByText('signedOut:none')).toBeTruthy());
  });

  it('restores a signed-in session and bootstraps the user once', async () => {
    const bootstrap = jest.fn(async () => ({ household_id: 'h', created: true }));
    const { deps } = makeDeps({ getCurrentUser: jest.fn(async () => user), bootstrap });

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => expect(screen.getByText(`signedIn:${userId}`)).toBeTruthy());
    expect(bootstrap).toHaveBeenCalledTimes(1);
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
    await waitFor(() => expect(screen.getByText('signedOut:none')).toBeTruthy());
    expect(screen.queryByText(`signedIn:${userId}`)).toBeNull();
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
    await waitFor(() => expect(screen.getByText('signedOut:none')).toBeTruthy());
  });

  it('updates status when auth changes are emitted', async () => {
    const { deps, emit } = makeDeps();

    renderProvider(deps);
    await flushAuthEffects();

    await waitFor(() => expect(screen.getByText('signedOut:none')).toBeTruthy());
    await act(async () => {
      emit(user);
    });
    await waitFor(() => expect(screen.getByText(`signedIn:${userId}`)).toBeTruthy());
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
