// src/lib/auth/context.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

import type {
  AuthStatus,
  BootstrapResult,
  SessionUser,
} from '@/contracts/auth';
import { uuidSchema, type AcceptInviteResponse } from '@/contracts/supabase';
import {
  createObservabilityReporter,
  type ObservabilityReporter,
} from '@/lib/observability';
import {
  pendingHouseholdInviteController,
  type PendingHouseholdInviteReadResult,
} from '@/lib/storage/pendingHouseholdInvite';
import {
  createSupabaseHouseholdAccessRepository,
  isHouseholdInviteUnavailableError,
} from '@/lib/supabase/household-access';

import * as authApi from './api';
import { ensureUserBootstrapped } from './bootstrap';

export type AuthContextValue = Readonly<{
  activeHouseholdId: string | null;
  completeHouseholdInviteAcceptance: (householdId: string) => Promise<void>;
  continueWithoutHouseholdInvite: () => Promise<void>;
  householdInviteStatus: 'none' | 'unavailable';
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
  acceptInvite?: (input: Readonly<{ token: string }>) => Promise<AcceptInviteResponse>;
  bootstrap?: () => Promise<BootstrapResult>;
  clearPendingInvite?: () => Promise<void>;
  markPendingInviteUnavailable?: () => Promise<void>;
  readPendingInvite?: () => Promise<PendingHouseholdInviteReadResult>;
  observability?: ObservabilityReporter;
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
    () => {
      const householdAccessRepository = createSupabaseHouseholdAccessRepository();

      return {
        acceptInvite: dependencies?.acceptInvite
          ?? ((input) => householdAccessRepository.acceptInvite(input)),
        appState: dependencies?.appState ?? AppState,
        bootstrap: dependencies?.bootstrap ?? ensureUserBootstrapped,
        clearPendingInvite: dependencies?.clearPendingInvite
          ?? pendingHouseholdInviteController.clear,
        getCurrentUser: dependencies?.getCurrentUser ?? authApi.getCurrentUser,
        markPendingInviteUnavailable: dependencies?.markPendingInviteUnavailable
          ?? pendingHouseholdInviteController.markUnavailable,
        observability: dependencies?.observability ?? createObservabilityReporter(),
        readPendingInvite: dependencies?.readPendingInvite
          ?? pendingHouseholdInviteController.read,
        signOut: dependencies?.signOut ?? authApi.signOut,
        startAutoRefresh: dependencies?.startAutoRefresh ?? authApi.startAutoRefresh,
        stopAutoRefresh: dependencies?.stopAutoRefresh ?? authApi.stopAutoRefresh,
        subscribeToAuthChanges: dependencies?.subscribeToAuthChanges
          ?? authApi.subscribeToAuthChanges,
      };
    },
    [dependencies],
  );

  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [householdInviteStatus, setHouseholdInviteStatus] =
    useState<AuthContextValue['householdInviteStatus']>('none');
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const bootstrappedUserIds = useRef(new Set<string>());
  const fallbackUser = useRef<SessionUser | null>(null);
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
        bootstrappedUserIds.current.clear();
        fallbackUser.current = null;
        setActiveHouseholdId(null);
        setHouseholdInviteStatus('none');
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

      void resolveAuthenticatedUser(deps)
        .then(async (resolution) => {
          if (!isCurrent()) {
            return;
          }

          if (resolution.status === 'unavailable') {
            fallbackUser.current = nextUser;
            setActiveHouseholdId(null);
            setHouseholdInviteStatus('unavailable');
            setUser(null);
            setStatus('loading');
            return;
          }

          if (resolution.clearPendingInvite) {
            await deps.clearPendingInvite();
          }

          if (!isCurrent()) {
            return;
          }

          fallbackUser.current = null;
          bootstrappedUserIds.current.add(nextUser.id);
          setActiveHouseholdId(resolution.householdId);
          setHouseholdInviteStatus('none');
          setUser(nextUser);
          setStatus('signedIn');
        })
        .catch(async (error: unknown) => {
          if (!isCurrent()) {
            return;
          }

          bootstrappedUserIds.current.delete(nextUser.id);
          deps.observability.captureException(error, {
            area: 'auth',
            operation: 'session_household_resolution',
          });
          try {
            await deps.signOut();
          } catch (signOutError) {
            deps.observability.captureException(signOutError, {
              area: 'auth',
              operation: 'session_cleanup',
            });
          } finally {
            if (isCurrent()) {
              fallbackUser.current = null;
              setActiveHouseholdId(null);
              setHouseholdInviteStatus('none');
              setUser(null);
              setStatus('signedOut');
            }
          }
        });
    };

    void deps
      .getCurrentUser()
      .then(applyUser)
      .catch((error: unknown) => {
        deps.observability.captureException(error, {
          area: 'auth',
          operation: 'session_restore',
        });
        if (active) {
          fallbackUser.current = null;
          setActiveHouseholdId(null);
          setHouseholdInviteStatus('none');
          setUser(null);
          setStatus('signedOut');
        }
      });

    const unsubscribe = deps.subscribeToAuthChanges(applyUser);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [deps]);

  const completeHouseholdInviteAcceptance = useCallback(async (
    householdId: string,
  ): Promise<void> => {
    const acceptedHouseholdId = uuidSchema.parse(householdId);
    const nextUser = user ?? fallbackUser.current;

    if (nextUser === null) {
      throw new Error('household_invite_authenticated_user_unavailable');
    }

    const sequence = applyUserSequence.current + 1;
    applyUserSequence.current = sequence;
    await deps.clearPendingInvite();

    if (applyUserSequence.current !== sequence) {
      throw new Error('household_invite_acceptance_superseded');
    }

    fallbackUser.current = null;
    bootstrappedUserIds.current.add(nextUser.id);
    setActiveHouseholdId(acceptedHouseholdId);
    setHouseholdInviteStatus('none');
    setUser(nextUser);
    setStatus('signedIn');
  }, [deps, user]);

  const continueWithoutHouseholdInvite = useCallback(async (): Promise<void> => {
    const nextUser = fallbackUser.current;

    if (householdInviteStatus !== 'unavailable' || nextUser === null) {
      throw new Error('household_invite_fallback_unavailable');
    }

    const sequence = applyUserSequence.current + 1;
    applyUserSequence.current = sequence;
    setStatus('loading');

    try {
      const bootstrap = await deps.bootstrap();
      await deps.clearPendingInvite();

      if (applyUserSequence.current !== sequence) {
        return;
      }

      fallbackUser.current = null;
      bootstrappedUserIds.current.add(nextUser.id);
      setActiveHouseholdId(bootstrap.household_id);
      setHouseholdInviteStatus('none');
      setUser(nextUser);
      setStatus('signedIn');
    } catch (error) {
      deps.observability.captureException(error, {
        area: 'auth',
        operation: 'session_household_fallback',
      });
      try {
        await deps.signOut();
      } catch (signOutError) {
        deps.observability.captureException(signOutError, {
          area: 'auth',
          operation: 'session_cleanup',
        });
      } finally {
        if (applyUserSequence.current === sequence) {
          fallbackUser.current = null;
          setActiveHouseholdId(null);
          setHouseholdInviteStatus('none');
          setUser(null);
          setStatus('signedOut');
        }
      }
      throw error;
    }
  }, [deps, householdInviteStatus]);

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
      activeHouseholdId,
      completeHouseholdInviteAcceptance,
      continueWithoutHouseholdInvite,
      householdInviteStatus,
      status,
      user,
      signOut: async () => {
        await deps.signOut();
      },
    }),
    [
      activeHouseholdId,
      completeHouseholdInviteAcceptance,
      continueWithoutHouseholdInvite,
      householdInviteStatus,
      status,
      user,
      deps,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

type AuthHouseholdResolution =
  | Readonly<{
    clearPendingInvite: boolean;
    householdId: string;
    status: 'resolved';
  }>
  | Readonly<{ status: 'unavailable' }>;

async function resolveAuthenticatedUser(
  deps: Pick<
  Required<AuthProviderDependencies>,
  'acceptInvite' | 'bootstrap' | 'markPendingInviteUnavailable' | 'readPendingInvite'
  >,
): Promise<AuthHouseholdResolution> {
  const pendingInvite = await deps.readPendingInvite();

  if (pendingInvite.status === 'unavailable') {
    return { status: 'unavailable' };
  }

  if (pendingInvite.status === 'none') {
    const bootstrap = await deps.bootstrap();

    return {
      clearPendingInvite: false,
      householdId: bootstrap.household_id,
      status: 'resolved',
    };
  }

  try {
    const inviteCode = pendingInvite.inviteToken;
    const acceptedInvite = await deps.acceptInvite({ token: inviteCode });

    return {
      clearPendingInvite: true,
      householdId: acceptedInvite.household_id,
      status: 'resolved',
    };
  } catch (error) {
    if (!isHouseholdInviteUnavailableError(error)) {
      throw error;
    }

    await deps.markPendingInviteUnavailable();
    return { status: 'unavailable' };
  }
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return value;
}
