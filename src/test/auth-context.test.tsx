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

describe('AuthProvider', () => {
  it('resolves to signedOut when there is no restored session', async () => {
    const { deps } = makeDeps();

    render(
      <AuthProvider dependencies={deps}>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('signedOut:none')).toBeTruthy());
  });

  it('restores a signed-in session and bootstraps the user once', async () => {
    const bootstrap = jest.fn(async () => ({ household_id: 'h', created: true }));
    const { deps } = makeDeps({ getCurrentUser: jest.fn(async () => user), bootstrap });

    render(
      <AuthProvider dependencies={deps}>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText(`signedIn:${userId}`)).toBeTruthy());
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it('updates status when auth changes are emitted', async () => {
    const { deps, emit } = makeDeps();

    render(
      <AuthProvider dependencies={deps}>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('signedOut:none')).toBeTruthy());
    await act(async () => {
      emit(user);
    });
    await waitFor(() => expect(screen.getByText(`signedIn:${userId}`)).toBeTruthy());
  });

  it('starts auto-refresh on mount and wires AppState', () => {
    const addEventListener = jest.fn(() => ({ remove: jest.fn() }));
    const startAutoRefresh = jest.fn();
    const { deps } = makeDeps({
      startAutoRefresh,
      appState: { currentState: 'active', addEventListener },
    });

    render(
      <AuthProvider dependencies={deps}>
        <Probe />
      </AuthProvider>,
    );

    expect(startAutoRefresh).toHaveBeenCalled();
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
