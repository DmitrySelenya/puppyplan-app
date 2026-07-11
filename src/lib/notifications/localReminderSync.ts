import {
  reminderTrackerIdSchema,
  scheduleRuleSchema,
  type ReminderForExpansion,
} from '@/contracts/reminders';
import type { Reminder } from '@/contracts/supabase';
import type { ObservabilityReporter } from '@/lib/observability';

import {
  computeScheduleSet,
  reconcileSchedule,
  type DesiredNotification,
  type NotificationSchedulerPort,
} from './scheduler';

/**
 * Orchestration that turns server `reminder` rows into an on-device notification schedule.
 * Pure and side-effect-free except through the injected `port`/`observability`. The React
 * provider (device-only) supplies live reminders, the device clock, permission, and preference.
 */

export type NotificationPermissionStatus = 'granted' | 'provisional' | 'denied' | 'undetermined';

export type ReminderScheduleEntry = Readonly<{
  expansion: ReminderForExpansion;
  timeZone: string;
}>;

/**
 * Map a server reminder row to an expansion entry, or `null` when it is not a schedulable routine
 * (legacy free-form `reminder_type`, or a `schedule_rule` that fails the contract). Skipping is
 * deliberate: such rows simply produce no notifications rather than throwing.
 */
export function toReminderForExpansion(reminder: Reminder): ReminderScheduleEntry | null {
  const trackerId = reminderTrackerIdSchema.safeParse(reminder.reminder_type);

  if (!trackerId.success) {
    return null;
  }

  const rule = scheduleRuleSchema.safeParse(reminder.schedule_rule);

  if (!rule.success) {
    return null;
  }

  return {
    expansion: {
      id: reminder.id,
      trackerId: trackerId.data,
      rule: rule.data,
      enabled: reminder.enabled,
      deletedAt: reminder.deleted_at,
    },
    timeZone: reminder.timezone,
  };
}

export type LocalReminderSyncReason = 'scheduled' | 'disabled' | 'permission';

export type LocalReminderSyncResult = Readonly<{
  scheduledCount: number;
  reason: LocalReminderSyncReason;
}>;

export type LocalReminderSyncInput = Readonly<{
  entries: readonly ReminderScheduleEntry[];
  nowMs: number;
  preferenceEnabled: boolean;
  permission: NotificationPermissionStatus;
  port: NotificationSchedulerPort;
  observability?: ObservabilityReporter;
  horizonMs?: number;
}>;

const schedulingPermissions: ReadonlySet<NotificationPermissionStatus> = new Set([
  'granted',
  'provisional',
]);

export async function syncLocalReminders(
  input: LocalReminderSyncInput,
): Promise<LocalReminderSyncResult> {
  try {
    if (!input.preferenceEnabled) {
      await input.port.cancelAllOwned();

      return { scheduledCount: 0, reason: 'disabled' };
    }

    if (!schedulingPermissions.has(input.permission)) {
      await input.port.cancelAllOwned();

      return { scheduledCount: 0, reason: 'permission' };
    }

    const desired = collectDesiredNotifications(input.entries, input.nowMs, input.horizonMs);
    const result = await reconcileSchedule(input.port, desired);

    return { scheduledCount: result.scheduled.length, reason: 'scheduled' };
  } catch (error) {
    input.observability?.captureException(error, {
      area: 'notifications',
      operation: 'local_reminder_sync',
    });

    throw error;
  }
}

/**
 * Desired notification set across entries, expanding each in its own timezone (reminders created
 * in different zones stay correct) and merging. Deduped by dedupeKey, sorted by instant.
 */
export function collectDesiredNotifications(
  entries: readonly ReminderScheduleEntry[],
  nowMs: number,
  horizonMs?: number,
): DesiredNotification[] {
  const byTimeZone = new Map<string, ReminderForExpansion[]>();

  for (const item of entries) {
    const group = byTimeZone.get(item.timeZone);

    if (group === undefined) {
      byTimeZone.set(item.timeZone, [item.expansion]);
    } else {
      group.push(item.expansion);
    }
  }

  const byKey = new Map<string, DesiredNotification>();

  for (const [timeZone, reminders] of byTimeZone) {
    for (const desired of computeScheduleSet({ reminders, nowMs, timeZone, horizonMs })) {
      if (!byKey.has(desired.dedupeKey)) {
        byKey.set(desired.dedupeKey, desired);
      }
    }
  }

  return [...byKey.values()].sort((a, b) =>
    a.scheduledFor < b.scheduledFor ? -1 : a.scheduledFor > b.scheduledFor ? 1 : 0,
  );
}
