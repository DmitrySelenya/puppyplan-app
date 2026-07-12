import { buildDiaryDayModel, type DiaryDayFact } from '@/contracts/diary-day';
import type { ReminderForExpansion } from '@/contracts/reminders';

const feedingId = '00000000-0000-4000-8000-000000000101';
const sleepId = '00000000-0000-4000-8000-000000000102';

function reminder(overrides: Partial<ReminderForExpansion> = {}): ReminderForExpansion {
  return {
    enabled: true,
    id: feedingId,
    rule: { repeat: 'daily', time: '08:00' },
    trackerId: 'feeding',
    ...overrides,
  };
}

function fact(overrides: Partial<DiaryDayFact> = {}): DiaryDayFact {
  return {
    clientEventId: 'evt_00000000-0000-4000-8000-000000000201',
    eventType: 'observation',
    occurredAt: '2026-03-29T07:30:00.000Z',
    payload: {},
    ...overrides,
  };
}

describe('buildDiaryDayModel', () => {
  it('AC-P5-1 is deterministic and DST-correct for the same inputs', () => {
    const input = {
      day: '2026-03-29',
      facts: [] as DiaryDayFact[],
      nowMs: Date.parse('2026-03-29T06:00:00.000Z'),
      reminders: [reminder()],
      timeZone: 'Europe/Warsaw',
    };

    const first = buildDiaryDayModel(input);
    const second = buildDiaryDayModel(input);

    expect(first).toEqual(second);
    expect(first.items[0]).toEqual(expect.objectContaining({
      kind: 'planned',
      plannedAt: '2026-03-29T06:00:00.000Z',
    }));
  });

  it('AC-P5-2 sorts planned slots and spontaneous facts without auto-linking', () => {
    const model = buildDiaryDayModel({
      day: '2026-03-29',
      facts: [fact()],
      nowMs: Date.parse('2026-03-29T09:00:00.000Z'),
      reminders: [
        reminder(),
        reminder({
          id: sleepId,
          rule: { repeat: 'daily', time: '10:00' },
          trackerId: 'sleep',
        }),
      ],
      timeZone: 'Europe/Warsaw',
    });

    expect(model.items.map((item) => [item.kind, item.displayAt])).toEqual([
      ['planned', '2026-03-29T06:00:00.000Z'],
      ['fact', '2026-03-29T07:30:00.000Z'],
      ['planned', '2026-03-29T08:00:00.000Z'],
    ]);
    expect(model.items[0]).toEqual(expect.objectContaining({ status: 'past-unmarked' }));
  });

  it('AC-P5-3 merges an exact linked fact and exposes planned plus actual time', () => {
    const plannedAt = '2026-03-29T06:00:00.000Z';
    const model = buildDiaryDayModel({
      day: '2026-03-29',
      facts: [fact({
        eventType: 'feeding',
        occurredAt: '2026-03-29T06:12:00.000Z',
        payload: {
          reminder_link: { reminder_id: feedingId, scheduled_for: plannedAt },
        },
      })],
      nowMs: Date.parse('2026-03-29T09:00:00.000Z'),
      reminders: [reminder()],
      timeZone: 'Europe/Warsaw',
    });

    expect(model.items).toEqual([expect.objectContaining({
      actualAt: '2026-03-29T06:12:00.000Z',
      kind: 'planned',
      plannedAt,
      status: 'done',
    })]);
  });

  it('AC-P5-4 does not auto-link a matching-kind spontaneous fact', () => {
    const model = buildDiaryDayModel({
      day: '2026-03-29',
      facts: [fact({ eventType: 'feeding', occurredAt: '2026-03-29T06:02:00.000Z' })],
      nowMs: Date.parse('2026-03-29T09:00:00.000Z'),
      reminders: [reminder()],
      timeZone: 'Europe/Warsaw',
    });

    expect(model.items).toHaveLength(2);
    expect(model.items[0]).toEqual(expect.objectContaining({ kind: 'planned', status: 'past-unmarked' }));
    expect(model.items[1]).toEqual(expect.objectContaining({ kind: 'fact' }));
  });

  it('AC-P5-5 collapses duplicate linked facts into one deterministic completion row', () => {
    const plannedAt = '2026-03-29T06:00:00.000Z';
    const linkedPayload = {
      reminder_link: { reminder_id: feedingId, scheduled_for: plannedAt },
    };
    const model = buildDiaryDayModel({
      day: '2026-03-29',
      facts: [
        fact({
          clientEventId: 'evt_00000000-0000-4000-8000-000000000202',
          eventType: 'feeding',
          occurredAt: '2026-03-29T06:13:00.000Z',
          payload: linkedPayload,
        }),
        fact({
          eventType: 'feeding',
          occurredAt: '2026-03-29T06:12:00.000Z',
          payload: linkedPayload,
        }),
      ],
      nowMs: Date.parse('2026-03-29T09:00:00.000Z'),
      reminders: [reminder()],
      timeZone: 'Europe/Warsaw',
    });

    expect(model.items).toHaveLength(1);
    expect(model.items[0]).toEqual(expect.objectContaining({
      actualAt: '2026-03-29T06:12:00.000Z',
      status: 'done',
    }));
  });
});
