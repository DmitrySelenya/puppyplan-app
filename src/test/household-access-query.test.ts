import type { InviteRecord } from '@/contracts/supabase';
import {
  createHouseholdInvitesQueryOptions,
  getInactiveHouseholdInvitesQueryOptions,
} from '@/lib/query/household-access';

const householdId = '00000000-0000-4000-8000-000000006201';

const inviteRows: readonly InviteRecord[] = [{
  accepted_at: null,
  accepted_by: null,
  created_at: '2026-07-03T10:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000006202',
  email_hash: 'sha256:recipient-hash',
  expires_at: '2026-07-12T23:59:59.000Z',
  household_id: householdId,
  id: '00000000-0000-4000-8000-000000006203',
  revoked_at: null,
  revoked_by: null,
  role: 'caregiver',
  token_last4: 'A1b2',
  updated_at: '2026-07-03T10:05:00.000Z',
}];

describe('household access query contracts', () => {
  it('AC-SHARE-HOUSEHOLD-INVITES-2 reads pending invites through a household-scoped privacy-safe key', async () => {
    const listPendingInvites = jest.fn().mockResolvedValue(inviteRows);
    const options = createHouseholdInvitesQueryOptions({
      householdId,
      repository: { listPendingInvites },
    });

    await expect(options.queryFn()).resolves.toBe(inviteRows);
    expect(options.queryKey).toEqual(['sharing', householdId, 'household-invites']);
    expect(JSON.stringify(options.queryKey)).not.toMatch(/A1b2|recipient-hash|@/i);
    expect(listPendingInvites).toHaveBeenCalledWith({ householdId });
  });

  it('AC-SHARE-HOUSEHOLD-INVITES-2 keeps null active-care context disabled without private data', async () => {
    const options = getInactiveHouseholdInvitesQueryOptions();

    expect(options.enabled).toBe(false);
    expect(options.queryKey).toEqual(['sharing', 'household-invites', 'inactive']);
    expect(JSON.stringify(options.queryKey)).not.toMatch(/A1b2|recipient-hash|@/i);
    await expect(options.queryFn()).resolves.toEqual([]);
  });
});
