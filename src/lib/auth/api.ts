// src/lib/auth/api.ts
import { sessionUserSchema, type SessionUser } from '@/contracts/auth';
import { getSupabaseClient } from '@/lib/supabase';

export type AuthChangeHandler = (user: SessionUser | null) => void;

export type OtpRequestFailureReason = 'rate_limited' | 'unknown';

// Carries the classified reason so the sign-in UI can tell a Supabase email
// rate limit ("too many code requests") apart from a generic/network failure,
// instead of always blaming the connection. Only status/code are inspected —
// the raw Supabase message is never surfaced or logged (privacy).
export class OtpRequestError extends Error {
  readonly reason: OtpRequestFailureReason;

  constructor(reason: OtpRequestFailureReason) {
    super('auth_request_otp_failed');
    this.name = 'OtpRequestError';
    this.reason = reason;
  }
}

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

function classifyOtpRequestFailure(
  error: Readonly<{ status?: number; code?: string }>,
): OtpRequestFailureReason {
  // Supabase returns HTTP 429 for both the per-email cooldown ("you can only
  // request this after N seconds") and the hourly email-send cap; the cap also
  // carries code `over_email_send_rate_limit`. Either means "slow down", not
  // "check your connection".
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
    return 'rate_limited';
  }

  return 'unknown';
}

export async function requestEmailOtp(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    throw new OtpRequestError(classifyOtpRequestFailure(error));
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

export async function signInWithPassword(
  input: Readonly<{ email: string; password: string }>,
): Promise<SessionUser> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  const user = error ? null : toSessionUser(data.session ?? null);

  if (!user) {
    throw new Error('auth_password_sign_in_failed');
  }

  return user;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const { data } = await getSupabaseClient().auth.getSession();

  return toSessionUser(data.session ?? null);
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();

  if (error) {
    throw new Error('auth_sign_out_failed');
  }
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
