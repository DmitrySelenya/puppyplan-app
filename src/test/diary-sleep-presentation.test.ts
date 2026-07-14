import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import { createDiarySleepPresentationItems } from '@/lib/diary/sleep-intervals';

function createSleepRow(input: Readonly<{
  action: 'start' | 'wake';
  clientEventId: string;
  id: string;
  occurredAt: string;
}>): QuickLogCachedEventRow {
  return {
    client_event_id: input.clientEventId,
    created_at: input.occurredAt,
    created_by: '00000000-0000-4000-8000-000000006004',
    deleted_at: null,
    event_type: 'sleep',
    household_id: '00000000-0000-4000-8000-000000006001',
    id: input.id,
    occurred_at: input.occurredAt,
    payload: { action: input.action },
    payload_version: 2,
    puppy_id: '00000000-0000-4000-8000-000000006002',
    updated_at: input.occurredAt,
    version: 1,
  };
}

describe('Diary sleep presentation', () => {
  it('AC-P33-SLEEP collapses one start-to-wake pair into a single interval with both durable ids and exact duration', () => {
    const start = createSleepRow({
      action: 'start',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006101',
      id: '00000000-0000-4000-8000-000000006201',
      occurredAt: '2026-06-09T07:42:00.000Z',
    });
    const wake = createSleepRow({
      action: 'wake',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006102',
      id: '00000000-0000-4000-8000-000000006202',
      occurredAt: '2026-06-09T08:16:00.000Z',
    });

    expect(createDiarySleepPresentationItems([wake, start])).toEqual([{
      durationMinutes: 34,
      endedAt: '2026-06-09T08:16:00.000Z',
      kind: 'sleep-interval',
      startRow: start,
      startedAt: '2026-06-09T07:42:00.000Z',
      wakeRow: wake,
    }]);
  });

  it('AC-P33-SLEEP preserves an orphan wake as its own readable event instead of discarding it', () => {
    const orphanWake = createSleepRow({
      action: 'wake',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006103',
      id: '00000000-0000-4000-8000-000000006203',
      occurredAt: '2026-06-09T09:00:00.000Z',
    });

    expect(createDiarySleepPresentationItems([orphanWake])).toEqual([{
      kind: 'event',
      row: orphanWake,
    }]);
  });

  it('AC-P33-SLEEP deterministically preserves duplicate starts and pairs equal-time rows by durable identity', () => {
    const firstStart = createSleepRow({
      action: 'start',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006301',
      id: '00000000-0000-4000-8000-000000006401',
      occurredAt: '2026-06-09T10:00:00.000Z',
    });
    const secondStart = createSleepRow({
      action: 'start',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006302',
      id: '00000000-0000-4000-8000-000000006402',
      occurredAt: '2026-06-09T10:00:00.000Z',
    });
    const wake = createSleepRow({
      action: 'wake',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006303',
      id: '00000000-0000-4000-8000-000000006403',
      occurredAt: '2026-06-09T10:00:00.000Z',
    });
    const expected = [{
      kind: 'event',
      row: firstStart,
    }, {
      durationMinutes: 0,
      endedAt: wake.occurred_at,
      kind: 'sleep-interval',
      startRow: secondStart,
      startedAt: secondStart.occurred_at,
      wakeRow: wake,
    }] as const;

    expect(createDiarySleepPresentationItems([wake, secondStart, firstStart])).toEqual(expected);
    expect(createDiarySleepPresentationItems([firstStart, secondStart, wake])).toEqual(expected);
  });
});
