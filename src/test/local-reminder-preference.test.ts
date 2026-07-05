import {
  createLocalReminderPreferenceController,
  type LocalReminderPreferenceStore,
} from '@/lib/notifications/localReminderPreference';

describe('local reminder preference storage', () => {
  it('AC-NOTIF-LOCAL-PERSIST-1 reads a missing preference as enabled', async () => {
    const store: LocalReminderPreferenceStore = {
      getItem: jest.fn(async () => null),
      setItem: jest.fn(async () => undefined),
    };
    const controller = createLocalReminderPreferenceController({ store });

    await expect(controller.read()).resolves.toBe(true);
    expect(store.getItem).toHaveBeenCalledWith('puppyplan:notifications:local-reminders-enabled:v1');
  });

  it('AC-NOTIF-LOCAL-PERSIST-2 writes and reads the stored local preference', async () => {
    const values = new Map<string, string>();
    const store: LocalReminderPreferenceStore = {
      getItem: jest.fn(async (key) => values.get(key) ?? null),
      setItem: jest.fn(async (key, value) => {
        values.set(key, value);
      }),
    };
    const controller = createLocalReminderPreferenceController({ store });

    await controller.write(false);

    await expect(controller.read()).resolves.toBe(false);
    expect(store.setItem).toHaveBeenCalledWith(
      'puppyplan:notifications:local-reminders-enabled:v1',
      'false',
    );
  });

  it('AC-NOTIF-LOCAL-PERSIST-3 reports read and write failures with non-PII context', async () => {
    const storageFailure = new Error('secure store unavailable');
    const captureException = jest.fn();
    const store: LocalReminderPreferenceStore = {
      getItem: jest.fn(async () => {
        throw storageFailure;
      }),
      setItem: jest.fn(async () => {
        throw storageFailure;
      }),
    };
    const controller = createLocalReminderPreferenceController({
      observability: { captureException },
      store,
    });

    await expect(controller.read()).rejects.toThrow(storageFailure);
    await expect(controller.write(false)).rejects.toThrow(storageFailure);
    expect(captureException).toHaveBeenCalledWith(storageFailure, expect.objectContaining({
      area: 'notifications',
      operation: 'local_reminder_preference_read',
    }));
    expect(captureException).toHaveBeenCalledWith(storageFailure, expect.objectContaining({
      area: 'notifications',
      operation: 'local_reminder_preference_write',
    }));
  });
});
