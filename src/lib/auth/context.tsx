// src/lib/auth/context.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import type { AuthStatus, SessionUser } from '@/contracts/auth';

import * as authApi from './api';
import { ensureUserBootstrapped } from './bootstrap';

export type AuthContextValue = Readonly<{
  status: AuthStatus;
  user: SessionUser | null;
  signOut: () => Promise<void>;
}>;

type AppStateLike = Readonly<{
  currentState: AppStateStatus;
  addEventListener: (type: 'change', handler: (state: AppStateStatus) => void) => NativeEventSubscription;
}>;

export type AuthProviderDependencies = Readonly<{
  getCurrentUser?: () => Promise<SessionUser | null>;
  subscribeToAuthChanges?: (handler: (user: SessionUser | null) => void) => () => void;
  signOut?: () => Promise<void>;
  bootstrap?: () => Promise<unknown>;
  startAutoRefresh?: () => void;
  stopAutoRefresh?: () => void;
  appState?: AppStateLike;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  dependencies,
}: PropsWithChildren<{ dependencies?: AuthProviderDependencies }>) {
  const deps = useMemo<Required<AuthProviderDependencies>>(
    () => ({
      getCurrentUser: dependencies?.getCurrentUser ?? authApi.getCurrentUser,
      subscribeToAuthChanges: dependencies?.subscribeToAuthChanges ?? authApi.subscribeToAuthChanges,
      signOut: dependencies?.signOut ?? authApi.signOut,
      bootstrap: dependencies?.bootstrap ?? ensureUserBootstrapped,
      startAutoRefresh: dependencies?.startAutoRefresh ?? authApi.startAutoRefresh,
      stopAutoRefresh: dependencies?.stopAutoRefresh ?? authApi.stopAutoRefresh,
      appState: dependencies?.appState ?? AppState,
    }),
    [dependencies],
  );

  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const bootstrappedUserIds = useRef(new Set<string>());
  const applyUserSequence = useRef(0);

  useEffect(() => {
    let active = true;

    const applyUser = (nextUser: SessionUser | null) => {
      const sequence = applyUserSequence.current + 1;
      applyUserSequence.current = sequence;
      const isCurrent = () => active && applyUserSequence.current === sequence;

      if (!isCurrent()) {
        return;
      }

      if (!nextUser) {
        setUser(null);
        setStatus('signedOut');
        return;
      }

      if (bootstrappedUserIds.current.has(nextUser.id)) {
        setUser(nextUser);
        setStatus('signedIn');
        return;
      }

      setUser(null);
      setStatus('loading');

      void deps
        .bootstrap()
        .then(() => {
          if (!isCurrent()) {
            return;
          }

          bootstrappedUserIds.current.add(nextUser.id);
          setUser(nextUser);
          setStatus('signedIn');
        })
        .catch(async () => {
          if (!isCurrent()) {
            return;
          }

          bootstrappedUserIds.current.delete(nextUser.id);
          try {
            await deps.signOut();
          } catch {
            // Bootstrap already failed; keep cleanup errors generic and local.
          } finally {
            if (isCurrent()) {
              setUser(null);
              setStatus('signedOut');
            }
          }
        });
    };

    void deps
      .getCurrentUser()
      .then(applyUser)
      .catch(() => {
        if (active) {
          setStatus('signedOut');
        }
      });

    const unsubscribe = deps.subscribeToAuthChanges(applyUser);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [deps]);

  useEffect(() => {
    deps.startAutoRefresh();

    const subscription = deps.appState.addEventListener('change', (state) => {
      if (state === 'active') {
        deps.startAutoRefresh();
      } else {
        deps.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
      deps.stopAutoRefresh();
    };
  }, [deps]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signOut: async () => {
        await deps.signOut();
      },
    }),
    [status, user, deps],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return value;
}
