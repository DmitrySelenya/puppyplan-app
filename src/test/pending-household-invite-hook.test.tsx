import { renderHook, waitFor } from '@testing-library/react-native';

import { usePersistPendingHouseholdInvite } from '@/lib/storage/usePendingHouseholdInvite';

describe('pending household invite persistence hook', () => {
  it('AC-PUP42-AUTH-1 persists a valid route token before reporting ready', async () => {
    const persist = jest.fn(async () => undefined);
    const hook = renderHook(() => usePersistPendingHouseholdInvite(
      'e'.repeat(64),
      { persist },
    ));

    expect(hook.result.current).toBe('loading');
    await waitFor(() => expect(hook.result.current).toBe('ready'));
    expect(persist).toHaveBeenCalledWith('e'.repeat(64));
  });

  it('AC-PUP42-AUTH-1 reports invalid route input without writing it', async () => {
    const persist = jest.fn(async () => undefined);
    const hook = renderHook(() => usePersistPendingHouseholdInvite(
      'not-an-invite',
      { persist },
    ));

    await waitFor(() => expect(hook.result.current).toBe('invalid'));
    expect(persist).not.toHaveBeenCalled();
  });

  it('AC-PUP42-AUTH-4 surfaces persistence failure as an explicit route error', async () => {
    const persist = jest.fn(async () => {
      throw new Error('synthetic_secure_store_failure');
    });
    const hook = renderHook(() => usePersistPendingHouseholdInvite(
      'f'.repeat(64),
      { persist },
    ));

    await waitFor(() => expect(hook.result.current).toBe('error'));
  });
});
