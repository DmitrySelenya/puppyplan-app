// src/test/auth-api.test.ts
import {
  getCurrentUser,
  requestEmailOtp,
  signInWithPassword,
  signOut,
  subscribeToAuthChanges,
  toSessionUser,
  verifyEmailOtp,
} from '@/lib/auth/api';
import { getSupabaseClient } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ getSupabaseClient: jest.fn() }));

const getSupabaseClientMock = getSupabaseClient as jest.MockedFunction<typeof getSupabaseClient>;

function mockAuth(auth: Record<string, unknown>) {
  getSupabaseClientMock.mockReturnValue({ auth } as never);
}

const userId = '00000000-0000-4000-8000-000000000101';

describe('auth api', () => {
  beforeEach(() => {
    getSupabaseClientMock.mockReset();
  });

  it('maps a supabase session into a parsed SessionUser', () => {
    expect(toSessionUser({ user: { id: userId, email: 'owner@example.com' } } as never)).toEqual({
      id: userId,
      email: 'owner@example.com',
    });
    expect(toSessionUser(null)).toBeNull();
  });

  it('requests an email OTP and creates the user when needed', async () => {
    const signInWithOtp = jest.fn(async () => ({ error: null }));
    mockAuth({ signInWithOtp });

    await requestEmailOtp('owner@example.com');

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'owner@example.com',
      options: { shouldCreateUser: true },
    });
  });

  it('throws a generic error when OTP request fails', async () => {
    mockAuth({ signInWithOtp: jest.fn(async () => ({ error: { message: 'rate limited' } })) });

    await expect(requestEmailOtp('owner@example.com')).rejects.toThrow('auth_request_otp_failed');
  });

  it('AC-F13 classifies HTTP 429 OTP failures as rate limited without exposing backend text', async () => {
    mockAuth({
      signInWithOtp: jest.fn(async () => ({
        error: { message: 'synthetic private backend detail', status: 429 },
      })),
    });

    await expect(requestEmailOtp('owner@example.com')).rejects.toMatchObject({
      message: 'auth_request_otp_failed',
      name: 'OtpRequestError',
      reason: 'rate_limited',
    });
  });

  it('AC-F13 classifies the Supabase email-send limit code as rate limited', async () => {
    mockAuth({
      signInWithOtp: jest.fn(async () => ({
        error: {
          code: 'over_email_send_rate_limit',
          message: 'synthetic private backend detail',
          status: 500,
        },
      })),
    });

    await expect(requestEmailOtp('owner@example.com')).rejects.toMatchObject({
      reason: 'rate_limited',
    });
  });

  it('ERR-F5 keeps unrecognized OTP failures generic and privacy safe', async () => {
    mockAuth({
      signInWithOtp: jest.fn(async () => ({
        error: { message: 'synthetic private backend detail', status: 503 },
      })),
    });

    await expect(requestEmailOtp('owner@example.com')).rejects.toMatchObject({
      message: 'auth_request_otp_failed',
      name: 'OtpRequestError',
      reason: 'unknown',
    });
    await expect(requestEmailOtp('owner@example.com')).rejects.not.toThrow(
      'synthetic private backend detail',
    );
  });

  it('verifies an OTP and returns the session user', async () => {
    mockAuth({
      verifyOtp: jest.fn(async () => ({
        data: { session: { user: { id: userId, email: 'owner@example.com' } } },
        error: null,
      })),
    });

    await expect(verifyEmailOtp({ email: 'owner@example.com', token: '123456' })).resolves.toEqual({
      id: userId,
      email: 'owner@example.com',
    });
  });

  it('throws a generic error when OTP verification has no session', async () => {
    mockAuth({ verifyOtp: jest.fn(async () => ({ data: { session: null }, error: null })) });

    await expect(verifyEmailOtp({ email: 'owner@example.com', token: '000000' })).rejects.toThrow(
      'auth_verify_otp_failed',
    );
  });

  it('signs in with a synthetic dev password and returns the session user', async () => {
    const signInWithPasswordMock = jest.fn(async () => ({
      data: { session: { user: { id: userId, email: 'debug-owner@example.test' } } },
      error: null,
    }));
    mockAuth({ signInWithPassword: signInWithPasswordMock });

    await expect(signInWithPassword({
      email: 'debug-owner@example.test',
      password: '<synthetic-debug-password>',
    })).resolves.toEqual({
      id: userId,
      email: 'debug-owner@example.test',
    });

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'debug-owner@example.test',
      password: '<synthetic-debug-password>',
    });
  });

  it('throws a generic error when synthetic dev password sign-in fails', async () => {
    mockAuth({
      signInWithPassword: jest.fn(async () => ({
        data: { session: null },
        error: { message: 'invalid credentials' },
      })),
    });

    await expect(signInWithPassword({
      email: 'debug-owner@example.test',
      password: '<synthetic-debug-password>',
    })).rejects.toThrow('auth_password_sign_in_failed');
  });

  it('reads the current user from the active session', async () => {
    mockAuth({
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: userId, email: null } } },
      })),
    });

    await expect(getCurrentUser()).resolves.toEqual({ id: userId, email: null });
  });

  it('signs out through the supabase client', async () => {
    const supaSignOut = jest.fn(async () => ({ error: null }));
    mockAuth({ signOut: supaSignOut });

    await signOut();

    expect(supaSignOut).toHaveBeenCalledTimes(1);
  });

  it('throws a generic error when sign out fails', async () => {
    mockAuth({ signOut: jest.fn(async () => ({ error: { message: 'backend details' } })) });

    await expect(signOut()).rejects.toThrow('auth_sign_out_failed');
  });

  it('defers the auth-change handler out of the onAuthStateChange callback (supabase lock safety)', async () => {
    const unsubscribe = jest.fn();
    let captured: (event: string, session: unknown) => void = () => {};
    mockAuth({
      onAuthStateChange: jest.fn((handler: (event: string, session: unknown) => void) => {
        captured = handler;
        return { data: { subscription: { unsubscribe } } };
      }),
    });
    const received: unknown[] = [];

    subscribeToAuthChanges((user) => received.push(user));
    captured('SIGNED_IN', { user: { id: userId, email: 'owner@example.com' } });

    // supabase-js holds an internal auth lock while the onAuthStateChange callback
    // runs. If the handler awaits any other Supabase call (bootstrap/accept RPC),
    // it deadlocks against that lock. The handler must therefore NOT run inside the
    // callback — it runs on a later task, after the lock is released.
    expect(received).toEqual([]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(received).toEqual([{ id: userId, email: 'owner@example.com' }]);
  });

  it('subscribes to auth changes and forwards mapped users', async () => {
    const unsubscribe = jest.fn();
    let captured: (event: string, session: unknown) => void = () => {};
    mockAuth({
      onAuthStateChange: jest.fn((handler: (event: string, session: unknown) => void) => {
        captured = handler;
        return { data: { subscription: { unsubscribe } } };
      }),
    });
    const received: unknown[] = [];

    const dispose = subscribeToAuthChanges((user) => received.push(user));
    captured('SIGNED_IN', { user: { id: userId, email: 'owner@example.com' } });
    captured('SIGNED_OUT', null);
    await new Promise((resolve) => setTimeout(resolve, 0));
    dispose();

    expect(received).toEqual([{ id: userId, email: 'owner@example.com' }, null]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
