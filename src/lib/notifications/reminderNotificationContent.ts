import type { ReminderTrackerId } from '@/contracts/reminders';
import type { AppTranslate, I18nKey } from '@/lib/i18n';

import type { DesiredNotification } from './scheduler';

/**
 * Pure on-device notification content for a reminder. Copy comes from typed i18n keys; the body
 * reuses the existing tracker label. No puppy name / note text is included (privacy Invariant 7 —
 * the payload carries only the tracker id and the non-PII dedupe key).
 */

// Static literals so the i18n source scanner and the type checker both see each key.
export const reminderTrackerLabelKey: Record<ReminderTrackerId, I18nKey> = {
  potty: 'quick-log.trackers.potty',
  feeding: 'quick-log.trackers.feeding',
  sleep: 'quick-log.trackers.sleep',
  walk: 'quick-log.trackers.walk',
  zoomies: 'quick-log.trackers.zoomies',
  training: 'quick-log.details.tabs.training',
  observation: 'quick-log.details.tabs.observation',
};

export type ReminderNotificationData = Readonly<{
  source: 'reminder';
  dedupeKey: string;
  trackerId: ReminderTrackerId;
}>;

export type ReminderNotificationContent = Readonly<{
  title: string;
  body: string;
  data: ReminderNotificationData;
}>;

export function buildReminderNotificationContent(
  desired: DesiredNotification,
  translate: AppTranslate,
): ReminderNotificationContent {
  const activity = translate(reminderTrackerLabelKey[desired.trackerId]);

  return {
    title: translate('reminders.local-notification.title'),
    body: translate('reminders.local-notification.body', { activity }),
    data: {
      source: 'reminder',
      dedupeKey: desired.dedupeKey,
      trackerId: desired.trackerId,
    },
  };
}
