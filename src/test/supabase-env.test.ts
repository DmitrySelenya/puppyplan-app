import { readSupabasePublicConfig } from '@/lib/supabase/env';

describe('Supabase public env config', () => {
  const validEnv = {
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_123',
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  };

  it('reads Expo public Supabase config', () => {
    expect(readSupabasePublicConfig(validEnv)).toEqual({
      publishableKey: validEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      url: validEnv.EXPO_PUBLIC_SUPABASE_URL,
    });
  });

  it('rejects missing config without exposing values', () => {
    expect(() => readSupabasePublicConfig({})).toThrow('EXPO_PUBLIC_SUPABASE_URL is required');
  });

  it('requires a Supabase HTTPS project URL', () => {
    expect(() => readSupabasePublicConfig({
      ...validEnv,
      EXPO_PUBLIC_SUPABASE_URL: 'http://example.supabase.co',
    })).toThrow('EXPO_PUBLIC_SUPABASE_URL must be a Supabase HTTPS project URL');

    expect(() => readSupabasePublicConfig({
      ...validEnv,
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.invalid',
    })).toThrow('EXPO_PUBLIC_SUPABASE_URL must be a Supabase HTTPS project URL');
  });

  it('requires a modern publishable key', () => {
    expect(() => readSupabasePublicConfig({
      ...validEnv,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'legacy-anon-key',
    })).toThrow('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must use a Supabase publishable key');
  });
});
