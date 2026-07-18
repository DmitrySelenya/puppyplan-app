import {
  NOTIFICATION_HORIZON_MS,
  computeScheduleSet,
  reconcileSchedule,
  type DesiredNotification,
  type NotificationSchedulerPort,
} from '@/lib/notifications/scheduler';
import type { ReminderForExpansion } from '@/contracts/reminders';

function reminder(overrides: Partial<ReminderForExpansion> = {}): ReminderForExpansion {
  return {
    id: overrides.id ?? 'reminder-1',
    trackerId: overrides.trackerId ?? 'feeding',
    enabled: overrides.enabled ?? true,
    deletedAt: overrides.deletedAt ?? null,
    rule: overrides.rule ?? { repeat: 'daily', time: '08:00' },
  };
}

const HOUR_MS = 60 * 60 * 1000;

/** In-memory port: models app-owned pending notifications plus foreign (other-source) ones. */
class FakeSchedulerPort implements NotificationSchedulerPort {
  readonly owned = new Map<string, DesiredNotification>();
  readonly foreign = new Map<string, string>();
  scheduleError: Error | null = null;
  private seq = 0;

  async cancelAllOwned(): Promise<void> {
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

  ownedDedupeKeys(): string[] {
    return [...this.owned.values()].map((request) => request.dedupeKey).sort();
  }
}

describe('computeScheduleSet (Invariant 5)', () => {
  it('AC-1: expands enabled reminders into the strictly-future horizon window, sorted', () => {
    const nowMs = Date.parse('2026-07-10T06:00:00.000Z'); // Friday 06:00 UTC

    const set = computeScheduleSet({
      reminders: [reminder({ rule: { repeat: 'daily', time: '08:00' } })],
      nowMs,
      timeZone: 'UTC',
    });

    expect(set.map((item) => item.scheduledFor)).toEqual([
      '2026-07-10T08:00:00.000Z',
      '2026-07-11T08:00:00.000Z',
      '2026-07-12T08:00:00.000Z',
    ]);
    expect(set[0]).toMatchObject({
      reminderId: 'reminder-1',
      trackerId: 'feeding',
      time: '08:00',
      dedupeKey: 'reminder-1|2026-07-10T08:00:00.000Z',
    });
  });

  it('AC-1: default horizon is 72h', () => {
    expect(NOTIFICATION_HORIZON_MS).toBe(72 * HOUR_MS);
  });

  it('AC-2: is a pure deterministic function (same input -> deep-equal output)', () => {
    const input = {
      reminders: [
        reminder({ id: 'a', rule: { repeat: 'daily', time: '07:30' } }),
        reminder({ id: 'b', trackerId: 'walk', rule: { repeat: 'daily', time: '19:00' } }),
      ],
      nowMs: Date.parse('2026-07-10T06:00:00.000Z'),
      timeZone: 'UTC',
    } as const;

    expect(computeScheduleSet(input)).toEqual(computeScheduleSet(input));
  });

  it('AC-2: DST-correct across a spring-forward day (America/New_York)', () => {
    // 2026-03-08 is the US spring-forward day (02:00 EST -> 03:00 EDT).
    const nowMs = Date.parse('2026-03-07T10:00:00.000Z'); // 05:00 local, before 08:00 local

    const set = computeScheduleSet({
      reminders: [reminder({ rule: { repeat: 'daily', time: '08:00' } })],
      nowMs,
      timeZone: 'America/New_York',
    });

    // 08:00 local stays 08:00 local each day; the UTC offset shifts -05:00 -> -04:00 at the DST edge.
    expect(set.map((item) => item.scheduledFor)).toEqual([
      '2026-03-07T13:00:00.000Z',
      '2026-03-08T12:00:00.000Z',
      '2026-03-09T12:00:00.000Z',
    ]);
  });

  it('EC-1: excludes a slot exactly at now, includes one exactly at now+horizon', () => {
    const nowMs = Date.parse('2026-07-10T08:00:00.000Z'); // coincides with the 07-10 08:00 slot

    const set = computeScheduleSet({
      reminders: [reminder({ rule: { repeat: 'daily', time: '08:00' } })],
      nowMs,
      timeZone: 'UTC',
    });

    // 07-10 excluded (== now); 07-13 included (== now + 72h, inclusive upper bound).
    expect(set.map((item) => item.scheduledFor)).toEqual([
      '2026-07-11T08:00:00.000Z',
      '2026-07-12T08:00:00.000Z',
      '2026-07-13T08:00:00.000Z',
    ]);
  });

  it('EC-2: disabled, soft-deleted, and empty inputs contribute nothing', () => {
    const nowMs = Date.parse('2026-07-10T06:00:00.000Z');

    expect(
      computeScheduleSet({
        reminders: [
          reminder({ id: 'off', enabled: false }),
          reminder({ id: 'gone', deletedAt: '2026-07-01T00:00:00.000Z' }),
        ],
        nowMs,
        timeZone: 'UTC',
      }),
    ).toEqual([]);

    expect(computeScheduleSet({ reminders: [], nowMs, timeZone: 'UTC' })).toEqual([]);
  });

  it('EC: weekdays rule skips the weekend inside the horizon', () => {
    const nowMs = Date.parse('2026-07-10T06:00:00.000Z'); // Friday

    const set = computeScheduleSet({
      reminders: [reminder({ rule: { repeat: 'weekdays', time: '08:00' } })],
      nowMs,
      timeZone: 'UTC',
      horizonMs: 96 * HOUR_MS, // through Tuesday 07-14 06:00
    });

    // Fri 07-10 and Mon 07-13 fire; Sat/Sun are skipped; Tue 07-14 08:00 is past the window.
    expect(set.map((item) => item.scheduledFor)).toEqual([
      '2026-07-10T08:00:00.000Z',
      '2026-07-13T08:00:00.000Z',
    ]);
  });

  it('EC: one-off rules only appear when their date lands inside the horizon', () => {
    const nowMs = Date.parse('2026-07-10T06:00:00.000Z');

    const set = computeScheduleSet({
      reminders: [
        reminder({ id: 'soon', rule: { repeat: 'never', time: '09:00', date: '2026-07-11' } }),
        reminder({ id: 'far', rule: { repeat: 'never', time: '09:00', date: '2026-08-01' } }),
      ],
      nowMs,
      timeZone: 'UTC',
    });

    expect(set).toHaveLength(1);
    expect(set[0].reminderId).toBe('soon');
  });

  it('privacy (Invariant 7): carries structured amount but never the free-text note', () => {
    const nowMs = Date.parse('2026-07-10T06:00:00.000Z');

    const set = computeScheduleSet({
      reminders: [
        reminder({
          rule: {
            repeat: 'daily',
            time: '08:00',
            amount: { value: 80, unit: 'g' },
            note: 'private breakfast note',
          },
        }),
      ],
      nowMs,
      timeZone: 'UTC',
    });

    expect(set[0].amount).toEqual({ value: 80, unit: 'g' });
    expect(set[0]).not.toHaveProperty('note');
    expect(JSON.stringify(set)).not.toContain('private breakfast note');
  });
});

describe('reconcileSchedule (Invariant 5)', () => {
  const desired: DesiredNotification[] = [
    {
      reminderId: 'a',
      trackerId: 'feeding',
      scheduledFor: '2026-07-10T08:00:00.000Z',
      time: '08:00',
      dedupeKey: 'a|2026-07-10T08:00:00.000Z',
    },
    {
      reminderId: 'b',
      trackerId: 'walk',
      scheduledFor: '2026-07-10T19:00:00.000Z',
      time: '19:00',
      dedupeKey: 'b|2026-07-10T19:00:00.000Z',
    },
  ];

  it('AC-3: schedules every desired item and returns handles', async () => {
    const port = new FakeSchedulerPort();

    const result = await reconcileSchedule(port, desired);

    expect(result.scheduled.map((handle) => handle.dedupeKey).sort()).toEqual(
      desired.map((item) => item.dedupeKey).sort(),
    );
    expect(port.ownedDedupeKeys()).toEqual(desired.map((item) => item.dedupeKey).sort());
  });

  it('AC-3: is idempotent — running twice leaves the same owned pending set', async () => {
    const port = new FakeSchedulerPort();

    await reconcileSchedule(port, desired);
    await reconcileSchedule(port, desired);

    expect(port.owned.size).toBe(desired.length);
    expect(port.ownedDedupeKeys()).toEqual(desired.map((item) => item.dedupeKey).sort());
  });

  it('EC-2: an empty desired set (logout) cancels everything owned', async () => {
    const port = new FakeSchedulerPort();
    await reconcileSchedule(port, desired);

    await reconcileSchedule(port, []);

    expect(port.owned.size).toBe(0);
  });

  it('EC-3: cancels only app-owned notifications, leaving foreign ones untouched', async () => {
    const port = new FakeSchedulerPort();
    port.foreign.set('foreign-1', 'calendar-app');

    await reconcileSchedule(port, desired);

    expect(port.foreign.has('foreign-1')).toBe(true);
  });

  it('ERR-1: a failing schedule rejects (fail-loud, no silent catch)', async () => {
    const port = new FakeSchedulerPort();
    port.scheduleError = new Error('adapter_schedule_failed');

    await expect(reconcileSchedule(port, desired)).rejects.toThrow('adapter_schedule_failed');
  });
});
