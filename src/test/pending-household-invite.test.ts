import {
  createPendingHouseholdInviteController,
  type PendingHouseholdInviteStore,
} from '@/lib/storage/pendingHouseholdInvite';

const inviteToken = 'a'.repeat(64);
const startTime = new Date('2026-07-24T09:00:00.000Z');

describe('pending household invite storage', () => {
  it('AC-PUP42-AUTH-1 persists and restores the deep-link intent before auth', async () => {
    const { controller, store } = createHarness();

    await controller.persist(inviteToken);

    await expect(controller.read()).resolves.toEqual({
      status: 'pending',
      inviteToken,
    });
    expect(store.setItem).toHaveBeenCalledTimes(1);
    expect(store.setItem.mock.calls[0][1]).toContain('"expiresAt":"2026-07-31T09:00:00.000Z"');
  });

  it('AC-PUP42-AUTH-1 replaces locally expired intent with a token-free unavailable marker', async () => {
    let now = startTime;
    const { controller, values } = createHarness({ now: () => now });
    await controller.persist(inviteToken);

    now = new Date('2026-07-31T09:00:00.001Z');

    await expect(controller.read()).resolves.toEqual({ status: 'unavailable' });
    expect(values.get('puppyplan:pending-household-intent:v1')).toBe(
      JSON.stringify({ state: 'unavailable' }),
    );
    expect(values.get('puppyplan:pending-household-intent:v1')).not.toContain(inviteToken);
  });

  it('AC-PUP42-AUTH-3 keeps unavailable state across reload until explicit fallback', async () => {
    const { controller, values } = createHarness();
    await controller.persist(inviteToken);

    await controller.markUnavailable();

    await expect(controller.read()).resolves.toEqual({ status: 'unavailable' });
    expect(values.get('puppyplan:pending-household-intent:v1')).not.toContain(inviteToken);
    await controller.clear();
    await expect(controller.read()).resolves.toEqual({ status: 'none' });
  });

  it('AC-PUP42-AUTH-4 surfaces and reports persistence failures without private payloads', async () => {
    const storageError = new Error('synthetic_secure_store_failure');
    const captureException = jest.fn();
    const store: PendingHouseholdInviteStore = {
      deleteItem: jest.fn(async () => undefined),
      getItem: jest.fn(async () => null),
      setItem: jest.fn(async () => {
        throw storageError;
      }),
    };
    const controller = createPendingHouseholdInviteController({
      observability: { captureException },
      store,
    });

    await expect(controller.persist(inviteToken)).rejects.toBe(storageError);
    expect(captureException).toHaveBeenCalledWith(storageError, {
      area: 'auth',
      operation: 'pending_household_intent_write',
      tags: { storage: 'secure-store' },
    });
    expect(JSON.stringify(captureException.mock.calls)).not.toContain(inviteToken);
  });
});

function createHarness({
  now = () => startTime,
}: Readonly<{
  now?: () => Date;
}> = {}) {
  const values = new Map<string, string>();
  const store = {
    deleteItem: jest.fn(async (key: string) => {
      values.delete(key);
    }),
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };

  return {
    controller: createPendingHouseholdInviteController({ now, store }),
    store,
    values,
  };
}
