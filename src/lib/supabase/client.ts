import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/contracts/supabase';

import { createSecureStoreAuthStorage } from './authStorage';
import { readSupabasePublicConfig, type SupabasePublicConfig } from './env';

let cachedClient: SupabaseClient<Database> | undefined;

export function createPuppyPlanSupabaseClient(
  config: SupabasePublicConfig = readSupabasePublicConfig(),
): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: createSecureStoreAuthStorage(),
    },
  });
}

export function getSupabaseClient(): SupabaseClient<Database> {
  cachedClient ??= createPuppyPlanSupabaseClient();
  return cachedClient;
}
