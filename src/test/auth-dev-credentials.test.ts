import { readDevPasswordSignInCredentials } from '@/lib/auth/devCredentials';

const devSupabaseUrl = 'https://olymqppxsadsxfrcyskh.supabase.co';

describe('dev auth credentials', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      value: originalNodeEnv,
      writable: true,
    });
  });

  it('reads normalized synthetic debug credentials only outside production', () => {
    expect(readDevPasswordSignInCredentials({
      EXPO_PUBLIC_SUPABASE_URL: devSupabaseUrl,
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL: ' Debug-Owner@Example.test ',
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_PASSWORD: '<synthetic-debug-password>',
    }, { isProduction: false })).toEqual({
      email: 'debug-owner@example.test',
      password: '<synthetic-debug-password>',
    });

    expect(readDevPasswordSignInCredentials({
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL: 'debug-owner@example.test',
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_PASSWORD: '<synthetic-debug-password>',
    }, { isProduction: true })).toBeNull();
  });

  it('uses NODE_ENV production as the default production guard', () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      value: 'production',
      writable: true,
    });

    expect(readDevPasswordSignInCredentials({
      EXPO_PUBLIC_SUPABASE_URL: devSupabaseUrl,
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL: 'debug-owner@example.test',
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_PASSWORD: '<synthetic-debug-password>',
    })).toBeNull();
  });

  it('returns null outside the known non-production Supabase project', () => {
    expect(readDevPasswordSignInCredentials({
      EXPO_PUBLIC_SUPABASE_URL: 'https://production-project-ref.supabase.co',
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL: 'debug-owner@example.test',
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_PASSWORD: '<synthetic-debug-password>',
    }, { isProduction: false })).toBeNull();

    expect(readDevPasswordSignInCredentials({
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL: 'debug-owner@example.test',
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_PASSWORD: '<synthetic-debug-password>',
    }, { isProduction: false })).toBeNull();
  });

  it('returns null when synthetic debug credentials are incomplete or weak', () => {
    expect(readDevPasswordSignInCredentials({
      EXPO_PUBLIC_SUPABASE_URL: devSupabaseUrl,
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL: 'debug-owner@example.test',
    }, { isProduction: false })).toBeNull();
    expect(readDevPasswordSignInCredentials({
      EXPO_PUBLIC_SUPABASE_URL: devSupabaseUrl,
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_EMAIL: 'debug-owner@example.test',
      EXPO_PUBLIC_PUPPYPLAN_DEBUG_AUTH_PASSWORD: 'short',
    }, { isProduction: false })).toBeNull();
  });
});
