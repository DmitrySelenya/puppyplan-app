import { formatLocalCalendarDate } from '@/lib/i18n/format-date';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';

/**
 * The longest a start may stay open before a wake stops being plausibly its partner.
 * Without a bound, an unpaired start would swallow the next wake days later.
 */
const MAX_SLEEP_PAIRING_MS = 16 * 60 * 60 * 1_000;

export type DiarySleepPresentationOptions = Readonly<{
  /**
   * Local calendar date (YYYY-MM-DD) to present. Pairing still consults every row passed in, so
   * a wake on this day can pair with a start from the evening before; only the output is
   * narrowed. Omit to present everything.
   */
  displayDate?: string;
}>;

export type DiarySleepPresentationItem =
  | Readonly<{
      kind: 'event';
      row: QuickLogCachedEventRow;
    }>
  | Readonly<{
      durationMinutes: number;
      endedAt: string;
      kind: 'sleep-interval';
      startRow: QuickLogCachedEventRow;
      startedAt: string;
      wakeRow: QuickLogCachedEventRow;
    }>;

export function createDiarySleepPresentationItems(
  rows: readonly QuickLogCachedEventRow[],
  options: DiarySleepPresentationOptions = {},
): readonly DiarySleepPresentationItem[] {
  const chronological = rows
    .map((row) => ({ row }))
    .sort((left, right) => left.row.occurred_at.localeCompare(right.row.occurred_at)
      || compareEqualTimeRows(left.row, right.row));
  const openStarts = new Map<string, QuickLogCachedEventRow>();
  const presented: (DiarySleepPresentationItem & Readonly<{ displayAt?: string }>)[] = [];

  for (const { row } of chronological) {
    const action = getSleepAction(row);
    if (action === null) {
      presented.push({ displayAt: row.occurred_at, kind: 'event', row });
      continue;
    }

    // Pairing is scoped to a puppy, not to a calendar day: an overnight sleep starts on one
    // day and ends on the next, and bucketing by date meant it could never pair at all.
    const key = `${row.household_id}|${row.puppy_id}`;
    if (action === 'start') {
      const previousStart = openStarts.get(key);
      if (previousStart !== undefined) {
        presented.push({ displayAt: previousStart.occurred_at, kind: 'event', row: previousStart });
      }
      openStarts.set(key, row);
      continue;
    }

    const startRow = openStarts.get(key);
    if (startRow === undefined) {
      presented.push({ displayAt: row.occurred_at, kind: 'event', row });
      continue;
    }

    if (Date.parse(row.occurred_at) - Date.parse(startRow.occurred_at) > MAX_SLEEP_PAIRING_MS) {
      openStarts.delete(key);
      presented.push({ displayAt: startRow.occurred_at, kind: 'event', row: startRow });
      presented.push({ displayAt: row.occurred_at, kind: 'event', row });
      continue;
    }

    openStarts.delete(key);
    presented.push({
      displayAt: row.occurred_at,
      durationMinutes: Math.max(0, Math.round(
        (Date.parse(row.occurred_at) - Date.parse(startRow.occurred_at)) / 60_000,
      )),
      endedAt: row.occurred_at,
      kind: 'sleep-interval',
      startRow,
      startedAt: startRow.occurred_at,
      wakeRow: row,
    });
  }

  for (const startRow of openStarts.values()) {
    presented.push({ displayAt: startRow.occurred_at, kind: 'event', row: startRow });
  }

  return presented
    .filter((item) => options.displayDate === undefined
      || item.displayAt === undefined
      || formatLocalCalendarDate(item.displayAt) === options.displayDate)
    .sort((left, right) => (right.displayAt ?? '').localeCompare(left.displayAt ?? ''))
    .map(({ displayAt: _displayAt, ...item }) => item);
}

function getSleepAction(row: QuickLogCachedEventRow): 'start' | 'wake' | null {
  if (row.event_type !== 'sleep' || row.payload_version !== 2) {
    return null;
  }

  const payload = row.payload;
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return null;
  }

  const action = payload.action;
  return action === 'start' || action === 'wake' ? action : null;
}

function compareEqualTimeRows(
  left: QuickLogCachedEventRow,
  right: QuickLogCachedEventRow,
): number {
  const actionOrder = getSleepActionOrder(left) - getSleepActionOrder(right);

  if (actionOrder !== 0) {
    return actionOrder;
  }

  return left.id.localeCompare(right.id)
    || left.client_event_id.localeCompare(right.client_event_id);
}

function getSleepActionOrder(row: QuickLogCachedEventRow): number {
  const action = getSleepAction(row);

  if (action === 'start') {
    return 0;
  }
  if (action === 'wake') {
    return 2;
  }
  return 1;
}
