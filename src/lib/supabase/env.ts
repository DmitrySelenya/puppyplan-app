const SUPABASE_URL_ENV = 'EXPO_PUBLIC_SUPABASE_URL';
const SUPABASE_PUBLISHABLE_KEY_ENV = 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

export type SupabasePublicConfig = {
  publishableKey: string;
  url: string;
};

type SupabasePublicEnv = Record<string, string | undefined>;

export function readSupabasePublicConfig(source: SupabasePublicEnv = process.env): SupabasePublicConfig {
  const url = readRequiredEnv(source, SUPABASE_URL_ENV);
  const publishableKey = readRequiredEnv(source, SUPABASE_PUBLISHABLE_KEY_ENV);

  assertHttpsSupabaseUrl(url);
  assertPublishableKey(publishableKey);

  return { publishableKey, url };
}

function readRequiredEnv(source: SupabasePublicEnv, name: keyof SupabasePublicEnv): string {
  const value = source[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for Supabase client setup.`);
  }

  return value;
}

function assertHttpsSupabaseUrl(value: string): void {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`${SUPABASE_URL_ENV} must be a valid HTTPS URL.`);
  }

  if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.supabase.co')) {
    throw new Error(`${SUPABASE_URL_ENV} must be a Supabase HTTPS project URL.`);
  }
}

function assertPublishableKey(value: string): void {
  if (!value.startsWith('sb_publishable_')) {
    throw new Error(`${SUPABASE_PUBLISHABLE_KEY_ENV} must use a Supabase publishable key.`);
  }
}
