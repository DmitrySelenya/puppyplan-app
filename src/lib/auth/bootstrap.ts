// src/lib/auth/bootstrap.ts
import { bootstrapResultSchema, type BootstrapResult } from '@/contracts/auth';
import { getSupabaseClient } from '@/lib/supabase';

export type BootstrapRpc = (
  args: Readonly<{ p_display_name: string | null }>,
) => PromiseLike<{ data: unknown; error: unknown }>;

function defaultBootstrapRpc(): BootstrapRpc {
  // ADR-0017: database.types.ts will type this RPC once the bootstrap migration
  // is approved and pushed. Until then the rpc name is reached through this one
  // documented narrow boundary cast. Remove the cast after `npm run db:types`.
  const client = getSupabaseClient() as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  };

  return (args) => client.rpc('bootstrap_current_user', { ...args });
}

export async function ensureUserBootstrapped(
  rpc: BootstrapRpc = defaultBootstrapRpc(),
): Promise<BootstrapResult> {
  const { data, error } = await rpc({ p_display_name: null });

  if (error) {
    throw new Error('auth_bootstrap_failed');
  }

  const row = Array.isArray(data) ? data[0] : data;

  return bootstrapResultSchema.parse(row);
}
