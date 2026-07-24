import type { InviteRecord } from '@/contracts/supabase';
import {
  createSupabaseHouseholdAccessRepository,
  HouseholdInviteError,
  type HouseholdAccessClient,
} from '@/lib/supabase/household-access';

const householdId = '00000000-0000-4000-8000-000000006101';

const inviteRow: InviteRecord = {
  accepted_at: null,
  accepted_by: null,
  created_at: '2026-07-03T10:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000006102',
  email_hash: 'sha256:recipient-hash',
  expires_at: '2026-07-12T23:59:59.000Z',
  household_id: householdId,
  id: '00000000-0000-4000-8000-000000006103',
  revoked_at: null,
  revoked_by: null,
  role: 'caregiver',
  token_last4: 'A1b2',
  updated_at: '2026-07-03T10:05:00.000Z',
};

describe('Supabase household access repository', () => {
  it('AC-SHARE-HOUSEHOLD-INVITES-1 parses owner-readable pending household invites', async () => {
    const client = createClient({ data: [inviteRow] });
    const repository = createSupabaseHouseholdAccessRepository(client);

    await expect(repository.listPendingInvites({ householdId })).resolves.toEqual([inviteRow]);
    expect(client.listPendingInvites).toHaveBeenCalledWith({ householdId });
  });

  it('AC-SHARE-HOUSEHOLD-INVITES-1 surfaces invite read failures', async () => {
    const repository = createSupabaseHouseholdAccessRepository(createClient({
      data: null,
      error: { message: 'denied' },
    }));

    await expect(repository.listPendingInvites({ householdId }))
      .rejects.toThrow('household_invites_read_failed');
  });

  it('AC-PUP42-CLIENT-2 creates an invite through the RPC boundary and unwraps its row', async () => {
    const client = createClient();
    client.createInvite.mockResolvedValue({
      data: [{
        token: 'a'.repeat(64),
        expires_at: '2026-07-31T12:00:00.000Z',
      }],
      error: null,
    });
    const repository = createSupabaseHouseholdAccessRepository(client);

    await expect(repository.createInvite()).resolves.toEqual({
      token: 'a'.repeat(64),
      expires_at: '2026-07-31T12:00:00.000Z',
    });
    expect(client.createInvite).toHaveBeenCalledWith({});
  });

  it.each([
    ['P4201', 'invalid'],
    ['P4202', 'unavailable'],
    ['P4203', 'already_used'],
  ] as const)(
    'AC-PUP42-CLIENT-3 maps RPC code %s to the typed %s acceptance error',
    async (code, reason) => {
      const client = createClient();
      client.acceptInvite.mockResolvedValue({
        data: null,
        error: { code, message: 'synthetic invite failure' },
      });
      const repository = createSupabaseHouseholdAccessRepository(client);

      const result = repository.acceptInvite({ token: 'b'.repeat(64) });

      await expect(result).rejects.toMatchObject({
        name: HouseholdInviteError.name,
        reason,
      });
    },
  );

  it.each([
    ['owner', 'already_member'],
    ['caregiver', 'accepted'],
    ['viewer', 'already_member'],
  ] as const)(
    'AC-F4: accepts through the RPC boundary and preserves %s / %s',
    async (role, outcome) => {
    const client = createClient();
    client.acceptInvite.mockResolvedValue({
      data: [{
        household_id: householdId,
        role,
        outcome,
      }],
      error: null,
    });
    const repository = createSupabaseHouseholdAccessRepository(client);

    await expect(repository.acceptInvite({ token: 'b'.repeat(64) })).resolves.toEqual({
      household_id: householdId,
      role,
      outcome,
    });
    expect(client.acceptInvite).toHaveBeenCalledWith({ token: 'b'.repeat(64) });
    },
  );

  it('ERR-F3: surfaces an unknown acceptance outcome at the repository boundary', async () => {
    const client = createClient();
    client.acceptInvite.mockResolvedValue({
      data: [{
        household_id: householdId,
        role: 'caregiver',
        outcome: 'replaced_membership',
      }],
      error: null,
    });
    const repository = createSupabaseHouseholdAccessRepository(client);

    await expect(repository.acceptInvite({ token: 'b'.repeat(64) }))
      .rejects.toThrow('household_invite_accept_failed');
  });

  it('AC-PUP42-CLIENT-3 rejects malformed tokens as typed invalid errors before RPC', async () => {
    const client = createClient();
    const repository = createSupabaseHouseholdAccessRepository(client);

    await expect(repository.acceptInvite({ token: 'not-a-token' })).rejects.toMatchObject({
      name: HouseholdInviteError.name,
      reason: 'invalid',
    });
    expect(client.acceptInvite).not.toHaveBeenCalled();
  });

  it('AC-PUP42-CLIENT-2 revokes through the RPC boundary and parses the boolean result', async () => {
    const client = createClient();
    client.revokeInvite.mockResolvedValue({ data: true, error: null });
    const repository = createSupabaseHouseholdAccessRepository(client);

    await expect(repository.revokeInvite({ inviteId: inviteRow.id })).resolves.toBe(true);
    expect(client.revokeInvite).toHaveBeenCalledWith({ inviteId: inviteRow.id });
  });

  it.each([
    ['createInvite', 'household_invite_create_failed'],
    ['acceptInvite', 'household_invite_accept_failed'],
    ['revokeInvite', 'household_invite_revoke_failed'],
  ] as const)('AC-PUP42-CLIENT-3 surfaces contextual %s failures', async (method, message) => {
    const client = createClient();
    client[method].mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'synthetic RPC failure' },
    });
    const repository = createSupabaseHouseholdAccessRepository(client);

    const result = method === 'createInvite'
      ? repository.createInvite()
      : method === 'acceptInvite'
        ? repository.acceptInvite({ token: 'c'.repeat(64) })
        : repository.revokeInvite({ inviteId: inviteRow.id });

    await expect(result).rejects.toThrow(message);
  });
});

function createClient({
  data = [],
  error = null,
}: Readonly<{
  data?: unknown;
  error?: unknown;
}> = {}): jest.Mocked<HouseholdAccessClient> {
  return {
    acceptInvite: jest.fn(),
    createInvite: jest.fn(),
    listPendingInvites: jest.fn().mockResolvedValue({ data, error }),
    revokeInvite: jest.fn(),
  };
}
