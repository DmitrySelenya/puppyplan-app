import {
  expandOccurrencesForDay,
  type ReminderForExpansion,
} from '@/contracts/reminders';

function reminder(overrides: Partial<ReminderForExpansion> = {}): ReminderForExpansion {
  return {
    id: overrides.id ?? 'reminder-1',
    trackerId: overrides.trackerId ?? 'feeding',
    enabled: overrides.enabled ?? true,
    deletedAt: overrides.deletedAt ?? null,
    rule: overrides.rule ?? { repeat: 'daily', time: '08:00' },
  };
}

// 2026-07-10 is a Friday (ISO weekday 5); 2026-07-11 is a Saturday (ISO weekday 6).
const friday = '2026-07-10';
const saturday = '2026-07-11';

describe('expandOccurrencesForDay', () => {
  it('expands a daily reminder into one slot at the wall-clock time (UTC)', () => {
    const slots = expandOccurrencesForDay({
      reminders: [reminder({ rule: { repeat: 'daily', time: '08:00' } })],
      day: friday,
      timeZone: 'UTC',
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({
      reminderId: 'reminder-1',
      trackerId: 'feeding',
      time: '08:00',
      scheduledFor: '2026-07-10T08:00:00.000Z',
    });
  });

  it('skips disabled and soft-deleted reminders', () => {
    const slots = expandOccurrencesForDay({
      reminders: [
        reminder({ id: 'off', enabled: false }),
        reminder({ id: 'gone', deletedAt: '2026-07-01T00:00:00.000Z' }),
      ],
      day: friday,
      timeZone: 'UTC',
    });

    expect(slots).toHaveLength(0);
  });

  it('fires weekdays rules Mon-Fri only', () => {
    const rule = { repeat: 'weekdays', time: '08:00' } as const;

    expect(
      expandOccurrencesForDay({ reminders: [reminder({ rule })], day: friday, timeZone: 'UTC' }),
    ).toHaveLength(1);
    expect(
      expandOccurrencesForDay({ reminders: [reminder({ rule })], day: saturday, timeZone: 'UTC' }),
    ).toHaveLength(0);
  });

  it('fires custom-day rules only on listed ISO weekdays', () => {
    const friOnly = reminder({ rule: { repeat: { days: [5] }, time: '08:00' } });
    const satOnly = reminder({ rule: { repeat: { days: [6] }, time: '08:00' } });

    expect(
      expandOccurrencesForDay({ reminders: [friOnly, satOnly], day: friday, timeZone: 'UTC' }),
    ).toHaveLength(1);
  });

  it('fires a one-off never rule only on its date', () => {
    const oneOff = reminder({ rule: { repeat: 'never', time: '08:00', date: friday } });

    expect(
      expandOccurrencesForDay({ reminders: [oneOff], day: friday, timeZone: 'UTC' }),
    ).toHaveLength(1);
    expect(
      expandOccurrencesForDay({ reminders: [oneOff], day: saturday, timeZone: 'UTC' }),
    ).toHaveLength(0);
  });

  it('carries amount and note onto the slot', () => {
    const slots = expandOccurrencesForDay({
      reminders: [
        reminder({
          rule: {
            repeat: 'daily',
            time: '08:00',
            amount: { value: 60, unit: 'g' },
            note: 'kibble',
          },
        }),
      ],
      day: friday,
      timeZone: 'UTC',
    });

    expect(slots[0]).toMatchObject({ amount: { value: 60, unit: 'g' }, note: 'kibble' });
  });

  it('sorts slots by scheduled instant then reminder id', () => {
    const slots = expandOccurrencesForDay({
      reminders: [
        reminder({ id: 'b', rule: { repeat: 'daily', time: '18:00' } }),
        reminder({ id: 'a', rule: { repeat: 'daily', time: '06:00' } }),
        reminder({ id: 'c', rule: { repeat: 'daily', time: '06:00' } }),
      ],
      day: friday,
      timeZone: 'UTC',
    });

    expect(slots.map((slot) => slot.reminderId)).toEqual(['a', 'c', 'b']);
  });

  it('resolves the wall-clock time against the IANA zone across DST (America/New_York)', () => {
    const winter = expandOccurrencesForDay({
      reminders: [reminder({ rule: { repeat: 'daily', time: '12:00' } })],
      day: '2026-01-15',
      timeZone: 'America/New_York',
    });
    const summer = expandOccurrencesForDay({
      reminders: [reminder({ rule: { repeat: 'daily', time: '12:00' } })],
      day: '2026-07-15',
      timeZone: 'America/New_York',
    });

    // EST (UTC-5) in January, EDT (UTC-4) in July.
    expect(winter[0].scheduledFor).toBe('2026-01-15T17:00:00.000Z');
    expect(summer[0].scheduledFor).toBe('2026-07-15T16:00:00.000Z');
  });

  it('is deterministic: identical inputs yield identical output, DST day included', () => {
    const input = {
      reminders: [reminder({ rule: { repeat: 'daily', time: '02:30' } })],
      day: '2026-03-08', // US spring-forward day
      timeZone: 'America/New_York',
    } as const;

    expect(expandOccurrencesForDay(input)).toEqual(expandOccurrencesForDay(input));
  });

  it('moves a nonexistent spring-forward wall time to the next valid local instant', () => {
    const slots = expandOccurrencesForDay({
      reminders: [reminder({ rule: { repeat: 'daily', time: '02:30' } })],
      day: '2026-03-08',
      timeZone: 'America/New_York',
    });

    expect(slots[0]?.scheduledFor).toBe('2026-03-08T07:00:00.000Z');
  });
});
