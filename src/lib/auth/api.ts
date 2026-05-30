// src/lib/auth/api.ts
import { sessionUserSchema, type SessionUser } from '@/contracts/auth';
import { getSupabaseClient } from '@/lib/supabase';

export type AuthChangeHandler = (user: SessionUser | null) => void;

type MinimalSession = { user: { id: string; email?: string | null } } | null;

export function toSessionUser(session: MinimalSession): SessionUser | null {
  if (!session?.user) {
    return null;
  }

  return sessionUserSchema.parse({
    id: session.user.id,
    email: session.user.email ?? null,
  });
}

export async function requestEmailOtp(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    throw new Error('auth_request_otp_failed');
  }
}

export async function verifyEmailOtp(input: Readonly<{ email: string; token: string }>): Promise<SessionUser> {
  const { data, error } = await getSupabaseClient().auth.verifyOtp({
    email: input.email,
    token: input.token,
    type: 'email',
  });

  const user = error ? null : toSessionUser(data.session ?? null);

  if (!user) {
    throw new Error('auth_verify_otp_failed');
  }

  return user;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const { data } = await getSupabaseClient().auth.getSession();

  return toSessionUser(data.session ?? null);
}

export async function signOut(): Promise<void> {
  await getSupabaseClient().auth.signOut();
}

export function subscribeToAuthChanges(handler: AuthChangeHandler): () => void {
  const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
    handler(toSessionUser(session));
  });

  return () => data.subscription.unsubscribe();
}

export function startAutoRefresh(): void {
  void getSupabaseClient().auth.startAutoRefresh();
}

export function stopAutoRefresh(): void {
  void getSupabaseClient().auth.stopAutoRefresh();
}
