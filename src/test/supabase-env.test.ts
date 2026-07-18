import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readSupabasePublicConfig } from '@/lib/supabase/env';

describe('Supabase public env config', () => {
  const validEnv = {
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_123',
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  };

  it('AC-REL-ENV-1: uses statically analyzable Expo public env references in the default path', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/supabase/env.ts'), 'utf8');

    expect(source).toContain('process.env.EXPO_PUBLIC_SUPABASE_URL');
    expect(source).toContain('process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  });

  it('AC-REL-ENV-2: reads an explicitly injected Expo public Supabase config', () => {
    expect(readSupabasePublicConfig(validEnv)).toEqual({
      publishableKey: validEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      url: validEnv.EXPO_PUBLIC_SUPABASE_URL,
    });
  });

  it('AC-REL-ENV-2: rejects missing injected config without exposing values', () => {
    expect(() => readSupabasePublicConfig({})).toThrow('EXPO_PUBLIC_SUPABASE_URL is required');
  });

  it('AC-REL-ENV-2: requires a Supabase HTTPS project URL from injected config', () => {
    expect(() => readSupabasePublicConfig({
      ...validEnv,
      EXPO_PUBLIC_SUPABASE_URL: 'http://example.supabase.co',
    })).toThrow('EXPO_PUBLIC_SUPABASE_URL must be a Supabase HTTPS project URL');

    expect(() => readSupabasePublicConfig({
      ...validEnv,
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.invalid',
    })).toThrow('EXPO_PUBLIC_SUPABASE_URL must be a Supabase HTTPS project URL');
  });

  it('AC-REL-ENV-2: requires a modern publishable key from injected config', () => {
    expect(() => readSupabasePublicConfig({
      ...validEnv,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'legacy-anon-key',
    })).toThrow('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must use a Supabase publishable key');
  });
});
