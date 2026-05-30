import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { createSecureStoreAuthStorage } from './authStorage';
import { readSupabasePublicConfig, type SupabasePublicConfig } from './env';

let cachedClient: SupabaseClient | undefined;

export function createPuppyPlanSupabaseClient(
  config: SupabasePublicConfig = readSupabasePublicConfig(),
): SupabaseClient {
  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: createSecureStoreAuthStorage(),
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  cachedClient ??= createPuppyPlanSupabaseClient();
  return cachedClient;
}
