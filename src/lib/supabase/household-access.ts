import { z } from 'zod';

import {
  acceptInviteResponseSchema,
  createInviteResponseSchema,
  householdInviteRpcErrorCodeSchema,
  householdInviteTokenSchema,
  inviteRecordSchema,
  revokeInviteResponseSchema,
  uuidSchema,
  type AcceptInviteResponse,
  type CreateInviteResponse,
  type InviteRecord,
} from '@/contracts/supabase';

import { getSupabaseClient } from './client';

export type SupabaseHouseholdAccessRepository = Readonly<{
  acceptInvite(input: Readonly<{ token: string }>): Promise<AcceptInviteResponse>;
  createInvite(): Promise<CreateInviteResponse>;
  listPendingInvites(input: Readonly<{ householdId: string }>): Promise<readonly InviteRecord[]>;
  revokeInvite(input: Readonly<{ inviteId: string }>): Promise<boolean>;
}>;

type HouseholdAccessClientResponse = Readonly<{
  data: unknown;
  error: unknown;
}>;

export type HouseholdAccessClient = Readonly<{
  acceptInvite(input: Readonly<{ token: string }>): PromiseLike<HouseholdAccessClientResponse>;
  createInvite(input: Readonly<Record<string, never>>): PromiseLike<HouseholdAccessClientResponse>;
  listPendingInvites(
    input: Readonly<{ householdId: string }>,
  ): PromiseLike<HouseholdAccessClientResponse>;
  revokeInvite(input: Readonly<{ inviteId: string }>): PromiseLike<HouseholdAccessClientResponse>;
}>;

export type HouseholdInviteErrorReason = 'already_used' | 'invalid' | 'unavailable';

export class HouseholdInviteError extends Error {
  readonly reason: HouseholdInviteErrorReason;

  constructor(reason: HouseholdInviteErrorReason) {
    super(`household_invite_${reason}`);
    this.name = 'HouseholdInviteError';
    this.reason = reason;
  }
}

export function createSupabaseHouseholdAccessRepository(
  client: HouseholdAccessClient = createDefaultHouseholdAccessClient(),
): SupabaseHouseholdAccessRepository {
  return {
    acceptInvite: async (input) => {
      const tokenResult = householdInviteTokenSchema.safeParse(input.token);

      if (!tokenResult.success) {
        throw new HouseholdInviteError('invalid');
      }

      const inviteToken = tokenResult.data;
      const response = await client.acceptInvite({ token: inviteToken });

      if (response.error) {
        const inviteError = toHouseholdInviteError(response.error);

        if (inviteError !== null) {
          throw inviteError;
        }

        throw new Error('household_invite_accept_failed');
      }

      return acceptInviteResponseSchema.parse(unwrapRpcRow(response.data));
    },
    createInvite: async () => {
      const response = await client.createInvite({});

      if (response.error) {
        throw new Error('household_invite_create_failed');
      }

      return createInviteResponseSchema.parse(unwrapRpcRow(response.data));
    },
    listPendingInvites: async (input) => {
      const response = await client.listPendingInvites(input);

      if (response.error) {
        throw new Error('household_invites_read_failed');
      }

      return inviteListSchema.parse(response.data);
    },
    revokeInvite: async ({ inviteId }) => {
      const parsedInviteId = uuidSchema.parse(inviteId);
      const response = await client.revokeInvite({ inviteId: parsedInviteId });

      if (response.error) {
        throw new Error('household_invite_revoke_failed');
      }

      return revokeInviteResponseSchema.parse(response.data);
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
    acceptInvite: ({ token }) => getSupabaseClient()
      .rpc('accept_household_invite', { p_token: token }),
    createInvite: () => getSupabaseClient()
      .rpc('create_household_invite', {}),
    listPendingInvites: ({ householdId }) => getSupabaseClient()
      .from('invite')
      .select(householdInviteSelectColumns)
      .eq('household_id', householdId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('expires_at', { ascending: true }),
    revokeInvite: ({ inviteId }) => getSupabaseClient()
      .rpc('revoke_household_invite', { p_invite_id: inviteId }),
  };
}

function unwrapRpcRow(data: unknown): unknown {
  if (!Array.isArray(data)) {
    return data;
  }

  if (data.length !== 1) {
    throw new Error('household_invite_rpc_result_invalid');
  }

  return data[0];
}

function toHouseholdInviteError(error: unknown): HouseholdInviteError | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const codeResult = householdInviteRpcErrorCodeSchema.safeParse(error.code);

  if (!codeResult.success) {
    return null;
  }

  const reasonByCode = {
    P4201: 'invalid',
    P4202: 'unavailable',
    P4203: 'already_used',
  } as const satisfies Record<typeof codeResult.data, HouseholdInviteErrorReason>;

  return new HouseholdInviteError(reasonByCode[codeResult.data]);
}
