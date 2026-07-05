import { z } from 'zod';

import {
  inviteRecordSchema,
  type InviteRecord,
} from '@/contracts/supabase';

import { getSupabaseClient } from './client';

export type SupabaseHouseholdAccessRepository = Readonly<{
  listPendingInvites(input: Readonly<{ householdId: string }>): Promise<readonly InviteRecord[]>;
}>;

export type HouseholdAccessClient = Readonly<{
  listPendingInvites(input: Readonly<{ householdId: string }>): PromiseLike<Readonly<{
    data: unknown;
    error: unknown;
  }>>;
}>;

export function createSupabaseHouseholdAccessRepository(
  client: HouseholdAccessClient = createDefaultHouseholdAccessClient(),
): SupabaseHouseholdAccessRepository {
  return {
    listPendingInvites: async (input) => {
      const response = await client.listPendingInvites(input);

      if (response.error) {
        throw new Error('household_invites_read_failed');
      }

      return inviteListSchema.parse(response.data ?? []);
    },
  };
}

const inviteListSchema = z.array(inviteRecordSchema);

const householdInviteSelectColumns = [
  'id',
  'household_id',
  'email_hash',
  'token_last4',
  'role',
  'expires_at',
  'accepted_at',
  'accepted_by',
  'revoked_at',
  'revoked_by',
  'created_by',
  'created_at',
  'updated_at',
].join(',');

function createDefaultHouseholdAccessClient(): HouseholdAccessClient {
  return {
    listPendingInvites: ({ householdId }) => getSupabaseClient()
      .from('invite')
      .select(householdInviteSelectColumns)
      .eq('household_id', householdId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('expires_at', { ascending: true }),
  };
}
