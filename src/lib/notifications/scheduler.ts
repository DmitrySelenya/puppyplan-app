import {
  expandOccurrencesForDay,
  type ReminderAmount,
  type ReminderForExpansion,
  type ReminderTrackerId,
} from '@/contracts/reminders';

/**
 * Pure local-notification scheduling engine (PUP-30, sub-slice 4a).
 *
 * Strategy per Locked Decision 5 — idempotent reschedule-all: `computeScheduleSet` turns enabled
 * reminders into the desired notification set for the next horizon (default 72h);
 * `reconcileSchedule` cancels every app-owned pending notification and re-schedules that set.
 * Because both steps are deterministic and cancel-then-rebuild, running twice with the same inputs
 * yields the same pending set (a disabled/soft-deleted reminder simply drops out of the set).
 *
 * This module never imports `expo-notifications` and carries no free-text `note`/puppy name — the
 * concrete adapter and content assembly live behind the injected port (sub-slice 4b).
 */

export const NOTIFICATION_HORIZON_MS = 72 * 60 * 60 * 1000;

export type DesiredNotification = Readonly<{
  reminderId: string;
  trackerId: ReminderTrackerId;
  /** UTC instant the notification should fire (ISO 8601). */
  scheduledFor: string;
  /** Wall-clock `HH:mm` (for on-device content assembly). */
  time: string;
  amount?: ReminderAmount;
  /** Stable identity for a (reminder, instant) pair — dedupe + observability, never PII. */
  dedupeKey: string;
}>;

export type ComputeScheduleSetInput = Readonly<{
  reminders: readonly ReminderForExpansion[];
  nowMs: number;
  timeZone: string;
  horizonMs?: number;
}>;

export function computeScheduleSet(input: ComputeScheduleSetInput): DesiredNotification[] {
  const horizonMs = input.horizonMs ?? NOTIFICATION_HORIZON_MS;
  const endMs = input.nowMs + horizonMs;
  const byKey = new Map<string, DesiredNotification>();

  for (const day of calendarDaysBetween(input.nowMs, endMs, input.timeZone)) {
    const slots = expandOccurrencesForDay({
      reminders: input.reminders,
      day,
      timeZone: input.timeZone,
    });

    for (const slot of slots) {
      const instantMs = Date.parse(slot.scheduledFor);

      // Strictly future, within the inclusive horizon end.
      if (instantMs <= input.nowMs || instantMs > endMs) {
        continue;
      }

      const dedupeKey = `${slot.reminderId}|${slot.scheduledFor}`;

      if (byKey.has(dedupeKey)) {
        continue;
      }

      byKey.set(dedupeKey, {
        reminderId: slot.reminderId,
        trackerId: slot.trackerId,
        scheduledFor: slot.scheduledFor,
        time: slot.time,
        ...(slot.amount !== undefined ? { amount: slot.amount } : {}),
        dedupeKey,
      });
    }
  }

  return [...byKey.values()].sort(compareDesired);
}

function compareDesired(a: DesiredNotification, b: DesiredNotification): number {
  if (a.scheduledFor !== b.scheduledFor) {
    return a.scheduledFor < b.scheduledFor ? -1 : 1;
  }

  if (a.reminderId === b.reminderId) {
    return 0;
  }

  return a.reminderId < b.reminderId ? -1 : 1;
}

export type OwnedNotificationHandle = Readonly<{
  localId: string;
  dedupeKey: string;
}>;

/**
 * Side-effecting boundary over the platform notification store. The concrete `expo-notifications`
 * adapter implements this in sub-slice 4b; tests inject a fake. `cancelAllOwned` must scope to
 * app-scheduled notifications only.
 */
export interface NotificationSchedulerPort {
  cancelAllOwned(): Promise<void>;
  schedule(request: DesiredNotification): Promise<string>;
}

export type ReconcileResult = Readonly<{
  scheduled: readonly OwnedNotificationHandle[];
}>;

export async function reconcileSchedule(
  adapter: NotificationSchedulerPort,
  desired: readonly DesiredNotification[],
): Promise<ReconcileResult> {
  await adapter.cancelAllOwned();

  const scheduled: OwnedNotificationHandle[] = [];

  // Fail-loud: a schedule error propagates so observability sees it (no silent catch).
  for (const request of desired) {
    const localId = await adapter.schedule(request);

    scheduled.push({ localId, dedupeKey: request.dedupeKey });
  }

  return { scheduled };
}

// ---------------------------------------------------------------------------
// Local calendar-day helpers (the horizon can span up to four local days).
// ---------------------------------------------------------------------------

function calendarDaysBetween(startMs: number, endMs: number, timeZone: string): string[] {
  const start = localCalendarDay(startMs, timeZone);
  const end = localCalendarDay(endMs, timeZone);
  const days = [start];

  // ISO `YYYY-MM-DD` strings sort lexically; walk forward until we cover the end day.
  let cursor = start;

  while (cursor < end) {
    cursor = addCalendarDay(cursor, 1);
    days.push(cursor);
  }

  return days;
}

const dayFormatterCache = new Map<string, Intl.DateTimeFormat>();

function localCalendarDay(utcMs: number, timeZone: string): string {
  let formatter = dayFormatterCache.get(timeZone);

  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dayFormatterCache.set(timeZone, formatter);
  }

  const parts = formatter.formatToParts(new Date(utcMs));
  const lookup: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      lookup[part.type] = part.value;
    }
  }

  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function addCalendarDay(day: string, delta: number): string {
  const [year, month, dayOfMonth] = day.split('-').map((part) => Number.parseInt(part, 10));
  const shifted = new Date(Date.UTC(year, month - 1, dayOfMonth + delta));

  const shiftedYear = shifted.getUTCFullYear().toString().padStart(4, '0');
  const shiftedMonth = (shifted.getUTCMonth() + 1).toString().padStart(2, '0');
  const shiftedDay = shifted.getUTCDate().toString().padStart(2, '0');

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}
