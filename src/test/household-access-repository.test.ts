import type { InviteRecord } from '@/contracts/supabase';
import {
  createSupabaseHouseholdAccessRepository,
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
});

function createClient({
  data,
  error = null,
}: Readonly<{
  data: unknown;
  error?: unknown;
}>): jest.Mocked<HouseholdAccessClient> {
  return {
    listPendingInvites: jest.fn().mockResolvedValue({ data, error }),
  };
}
