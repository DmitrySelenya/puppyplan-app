import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';

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

    const key = `${row.household_id}|${row.puppy_id}|${row.occurred_at.slice(0, 10)}`;
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
