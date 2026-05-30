// src/test/auth-bootstrap.test.ts
import { ensureUserBootstrapped } from '@/lib/auth/bootstrap';

const householdId = '00000000-0000-4000-8000-000000000201';

describe('ensureUserBootstrapped', () => {
  it('calls the bootstrap RPC with a null display name and parses the row', async () => {
    const rpc = jest.fn(async () => ({
      data: [{ household_id: householdId, created: true }],
      error: null,
    }));

    await expect(ensureUserBootstrapped(rpc)).resolves.toEqual({
      household_id: householdId,
      created: true,
    });
    expect(rpc).toHaveBeenCalledWith({ p_display_name: null });
  });

  it('accepts a single-object RPC result as well as a row array', async () => {
    const rpc = jest.fn(async () => ({
      data: { household_id: householdId, created: false },
      error: null,
    }));

    await expect(ensureUserBootstrapped(rpc)).resolves.toEqual({
      household_id: householdId,
      created: false,
    });
  });

  it('throws a generic error when the RPC fails', async () => {
    const rpc = jest.fn(async () => ({ data: null, error: { message: 'denied' } }));

    await expect(ensureUserBootstrapped(rpc)).rejects.toThrow('auth_bootstrap_failed');
  });
});
