// src/lib/auth/bootstrap.ts
import { bootstrapResultSchema, type BootstrapResult } from '@/contracts/auth';
import { getSupabaseClient } from '@/lib/supabase';

export type BootstrapRpc = (
  args: Readonly<{ p_display_name?: string }>,
) => PromiseLike<{ data: unknown; error: unknown }>;

function defaultBootstrapRpc(): BootstrapRpc {
  const client = getSupabaseClient();

  return (args) => client.rpc('bootstrap_current_user', { ...args });
}

export async function ensureUserBootstrapped(
  rpc: BootstrapRpc = defaultBootstrapRpc(),
): Promise<BootstrapResult> {
  const { data, error } = await rpc({});

  if (error) {
    throw new Error('auth_bootstrap_failed');
  }

  const row = Array.isArray(data) ? data[0] : data;

  return bootstrapResultSchema.parse(row);
}
