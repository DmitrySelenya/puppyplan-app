import type { Reminder } from '@/contracts/supabase';
import { buildReminderNotificationContent } from '@/lib/notifications/reminderNotificationContent';
import {
  collectDesiredNotifications,
  syncLocalReminders,
  toReminderForExpansion,
  type ReminderScheduleEntry,
} from '@/lib/notifications/localReminderSync';
import type {
  DesiredNotification,
  NotificationSchedulerPort,
} from '@/lib/notifications/scheduler';
import type { ObservabilityPayload } from '@/lib/observability';

// --- fakes ------------------------------------------------------------------

class FakeSchedulerPort implements NotificationSchedulerPort {
  readonly owned = new Map<string, DesiredNotification>();
  cancelCount = 0;
  scheduleError: Error | null = null;
  private seq = 0;

  async cancelAllOwned(): Promise<void> {
    this.cancelCount += 1;
    this.owned.clear();
  }

  async schedule(request: DesiredNotification): Promise<string> {
    if (this.scheduleError !== null) {
      throw this.scheduleError;
    }

    const localId = `owned-${this.seq}`;
    this.seq += 1;
    this.owned.set(localId, request);

    return localId;
  }
}

function fakeTranslate(key: string, options?: Record<string, string | number | boolean>): string {
  if (options && 'activity' in options) {
    return `${key}:${String(options.activity)}`;
  }

  return key;
}

function reminderRow(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: overrides.id ?? '11111111-1111-4111-8111-111111111111',
    puppy_id: '22222222-2222-4222-8222-222222222222',
    created_by: '33333333-3333-4333-8333-333333333333',
    assigned_to: null,
    reminder_type: overrides.reminder_type ?? 'feeding',
    schedule_rule: overrides.schedule_rule ?? { repeat: 'daily', time: '08:00' },
    timezone: overrides.timezone ?? 'UTC',
    quiet_hours: null,
    enabled: overrides.enabled ?? true,
    trusted_sitter_visible: false,
    version: 1,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    deleted_at: overrides.deleted_at ?? null,
  };
}

function entry(overrides: Partial<Reminder> = {}): ReminderScheduleEntry {
  const mapped = toReminderForExpansion(reminderRow(overrides));

  if (mapped === null) {
    throw new Error('expected reminder row to map');
  }

  return mapped;
}

// --- reminderNotificationContent (pure) ------------------------------------

describe('buildReminderNotificationContent', () => {
  const desired: DesiredNotification = {
    reminderId: 'r1',
    trackerId: 'feeding',
    scheduledFor: '2026-07-10T08:00:00.000Z',
    time: '08:00',
    dedupeKey: 'r1|2026-07-10T08:00:00.000Z',
  };

  it('builds title/body from typed keys and reuses the tracker label; no PII in data', () => {
    const content = buildReminderNotificationContent(desired, fakeTranslate);

    expect(content.title).toBe('reminders.local-notification.title');
    expect(content.body).toBe('reminders.local-notification.body:quick-log.trackers.feeding');
    expect(content.data).toEqual({
      source: 'reminder',
      dedupeKey: 'r1|2026-07-10T08:00:00.000Z',
      trackerId: 'feeding',
    });
  });
});

// --- toReminderForExpansion -------------------------------------------------

describe('toReminderForExpansion', () => {
  it('maps a valid tracker reminder, carrying enabled/deletedAt and its own timezone', () => {
    const mapped = toReminderForExpansion(
      reminderRow({ reminder_type: 'walk', timezone: 'America/New_York', enabled: true }),
    );

    expect(mapped).not.toBeNull();
    expect(mapped?.timeZone).toBe('America/New_York');
    expect(mapped?.expansion).toMatchObject({ trackerId: 'walk', enabled: true, deletedAt: null });
  });

  it('returns null for a legacy free-form reminder_type', () => {
    expect(toReminderForExpansion(reminderRow({ reminder_type: 'Vet visit' }))).toBeNull();
  });

  it('returns null when schedule_rule fails the contract', () => {
    expect(
      toReminderForExpansion(reminderRow({ schedule_rule: { repeat: 'never', time: '08:00' } })),
    ).toBeNull(); // repeat:never requires a date
  });
});

// --- collectDesiredNotifications (tz grouping) ------------------------------

describe('collectDesiredNotifications', () => {
  it('expands each entry in its own timezone and merges the result', () => {
    const nowMs = Date.parse('2026-07-10T00:00:00.000Z');

    const desired = collectDesiredNotifications(
      [
        entry({ id: '11111111-1111-4111-8111-111111111111', timezone: 'UTC' }),
        entry({
          id: '44444444-4444-4444-8444-444444444444',
          timezone: 'America/New_York',
          reminder_type: 'walk',
        }),
      ],
      nowMs,
      24 * 60 * 60 * 1000,
    );

    // UTC 08:00 -> 08:00Z; New York 08:00 EDT -> 12:00Z. Both inside the next 24h.
    const byReminder = Object.fromEntries(desired.map((item) => [item.reminderId, item.scheduledFor]));
    expect(byReminder['11111111-1111-4111-8111-111111111111']).toBe('2026-07-10T08:00:00.000Z');
    expect(byReminder['44444444-4444-4444-8444-444444444444']).toBe('2026-07-10T12:00:00.000Z');
  });
});

// --- syncLocalReminders -----------------------------------------------------

describe('syncLocalReminders (Invariant 5)', () => {
  const nowMs = Date.parse('2026-07-10T00:00:00.000Z');

  it('schedules the desired set when enabled and permission granted', async () => {
    const port = new FakeSchedulerPort();

    const result = await syncLocalReminders({
      entries: [entry()],
      nowMs,
      preferenceEnabled: true,
      permission: 'granted',
      port,
      horizonMs: 24 * 60 * 60 * 1000,
    });

    expect(result.reason).toBe('scheduled');
    expect(result.scheduledCount).toBe(1);
    expect(port.owned.size).toBe(1);
    expect(port.cancelCount).toBe(1); // reconcile cancels before scheduling
  });

  it('provisional permission still schedules', async () => {
    const port = new FakeSchedulerPort();

    const result = await syncLocalReminders({
      entries: [entry()],
      nowMs,
      preferenceEnabled: true,
      permission: 'provisional',
      port,
      horizonMs: 24 * 60 * 60 * 1000,
    });

    expect(result.scheduledCount).toBe(1);
  });

  it('cancels and schedules nothing when the preference is off', async () => {
    const port = new FakeSchedulerPort();

    const result = await syncLocalReminders({
      entries: [entry()],
      nowMs,
      preferenceEnabled: false,
      permission: 'granted',
      port,
    });

    expect(result).toEqual({ scheduledCount: 0, reason: 'disabled' });
    expect(port.cancelCount).toBe(1);
    expect(port.owned.size).toBe(0);
  });

  it('cancels and schedules nothing when permission is denied or undetermined', async () => {
    for (const permission of ['denied', 'undetermined'] as const) {
      const port = new FakeSchedulerPort();

      const result = await syncLocalReminders({
        entries: [entry()],
        nowMs,
        preferenceEnabled: true,
        permission,
        port,
      });

      expect(result).toEqual({ scheduledCount: 0, reason: 'permission' });
      expect(port.cancelCount).toBe(1);
      expect(port.owned.size).toBe(0);
    }
  });

  it('ERR: a failing schedule rejects and reports to observability (no silent catch)', async () => {
    const port = new FakeSchedulerPort();
    port.scheduleError = new Error('schedule_failed');
    const captured: ObservabilityPayload[] = [];
    const observability = {
      captureException: (_error: unknown, payload: ObservabilityPayload) => {
        captured.push(payload);
      },
    };

    await expect(
      syncLocalReminders({
        entries: [entry()],
        nowMs,
        preferenceEnabled: true,
        permission: 'granted',
        port,
        observability,
        horizonMs: 24 * 60 * 60 * 1000,
      }),
    ).rejects.toThrow('schedule_failed');

    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({ area: 'notifications', operation: 'local_reminder_sync' });
  });
});
