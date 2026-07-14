import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import { createDiarySleepPresentationItems } from '@/lib/diary/sleep-intervals';
import { formatLocalCalendarDate } from '@/lib/i18n/format-date';

// occurred_at is stored in UTC but the Diary buckets by the viewer's local day, so build
// cross-midnight fixtures from local wall-clock times rather than hard-coded UTC strings.
function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes: number,
): string {
  return new Date(year, monthIndex, day, hours, minutes, 0, 0).toISOString();
}

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

  it('AC-QN-NIGHT pairs an overnight sleep across midnight and reports its real duration', () => {
    const start = createSleepRow({
      action: 'start',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006501',
      id: '00000000-0000-4000-8000-000000006601',
      occurredAt: localIso(2026, 6, 13, 23, 41),
    });
    const wake = createSleepRow({
      action: 'wake',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006502',
      id: '00000000-0000-4000-8000-000000006602',
      occurredAt: localIso(2026, 6, 14, 6, 35),
    });

    expect(createDiarySleepPresentationItems([wake, start])).toEqual([{
      durationMinutes: 414,
      endedAt: wake.occurred_at,
      kind: 'sleep-interval',
      startRow: start,
      startedAt: start.occurred_at,
      wakeRow: wake,
    }]);
  });

  it('AC-QN-NIGHT shows an overnight interval on the wake day and hides the bare start row', () => {
    const start = createSleepRow({
      action: 'start',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006503',
      id: '00000000-0000-4000-8000-000000006603',
      occurredAt: localIso(2026, 6, 13, 23, 41),
    });
    const wake = createSleepRow({
      action: 'wake',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006504',
      id: '00000000-0000-4000-8000-000000006604',
      occurredAt: localIso(2026, 6, 14, 6, 35),
    });
    const previousEvening = createSleepRow({
      action: 'wake',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006505',
      id: '00000000-0000-4000-8000-000000006605',
      occurredAt: localIso(2026, 6, 13, 20, 10),
    });

    const wakeDay = createDiarySleepPresentationItems([previousEvening, start, wake], {
      displayDate: formatLocalCalendarDate(wake.occurred_at),
    });

    expect(wakeDay).toEqual([{
      durationMinutes: 414,
      endedAt: wake.occurred_at,
      kind: 'sleep-interval',
      startRow: start,
      startedAt: start.occurred_at,
      wakeRow: wake,
    }]);
  });

  it('AC-QN-NIGHT refuses to pair a wake with a start it could not belong to', () => {
    const staleStart = createSleepRow({
      action: 'start',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006506',
      id: '00000000-0000-4000-8000-000000006606',
      occurredAt: localIso(2026, 6, 12, 8, 0),
    });
    const wake = createSleepRow({
      action: 'wake',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006507',
      id: '00000000-0000-4000-8000-000000006607',
      occurredAt: localIso(2026, 6, 14, 6, 35),
    });

    expect(createDiarySleepPresentationItems([staleStart, wake])).toEqual([
      { kind: 'event', row: wake },
      { kind: 'event', row: staleStart },
    ]);
  });

  it('AC-QN-NIGHT keeps pairing scoped to one puppy', () => {
    const start = createSleepRow({
      action: 'start',
      clientEventId: 'evt_00000000-0000-4000-8000-000000006508',
      id: '00000000-0000-4000-8000-000000006608',
      occurredAt: localIso(2026, 6, 13, 23, 41),
    });
    const otherPuppyWake: QuickLogCachedEventRow = {
      ...createSleepRow({
        action: 'wake',
        clientEventId: 'evt_00000000-0000-4000-8000-000000006509',
        id: '00000000-0000-4000-8000-000000006609',
        occurredAt: localIso(2026, 6, 14, 6, 35),
      }),
      puppy_id: '00000000-0000-4000-8000-00000000660a',
    };

    expect(createDiarySleepPresentationItems([start, otherPuppyWake])).toEqual([
      { kind: 'event', row: otherPuppyWake },
      { kind: 'event', row: start },
    ]);
  });
});
