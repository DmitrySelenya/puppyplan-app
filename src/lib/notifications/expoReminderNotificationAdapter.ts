import { PermissionStatus } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';

import type { AppTranslate } from '@/lib/i18n';

import { buildReminderNotificationContent } from './reminderNotificationContent';
import type { DesiredNotification, NotificationSchedulerPort } from './scheduler';
import type { NotificationPermissionStatus } from './localReminderSync';

/**
 * Thin binding of the pure scheduler port to `expo-notifications` (device-only; verified on a
 * physical iPhone, not in unit tests — all pure logic lives in scheduler.ts / localReminderSync.ts
 * / reminderNotificationContent.ts, which are tested with fakes).
 *
 * `cancelAllOwned` maps to `cancelAllScheduledNotificationsAsync`: iOS scopes this to notifications
 * this app scheduled, so foreign notifications are inherently untouched (Invariant 5, EC-3).
 */

export type ReminderNotificationAdapter = NotificationSchedulerPort &
  Readonly<{
    configureForegroundHandler(): void;
    ensurePermission(): Promise<NotificationPermissionStatus>;
  }>;

function mapPermission(
  response: Notifications.NotificationPermissionsStatus,
): NotificationPermissionStatus {
  if (response.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'provisional';
  }

  if (response.status === PermissionStatus.GRANTED || response.granted) {
    return 'granted';
  }

  if (response.status === PermissionStatus.DENIED) {
    return 'denied';
  }

  return 'undetermined';
}

export function createExpoReminderNotificationAdapter(
  translate: AppTranslate,
): ReminderNotificationAdapter {
  return {
    configureForegroundHandler: () => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    },

    ensurePermission: async () => {
      const current = mapPermission(await Notifications.getPermissionsAsync());

      if (current !== 'undetermined') {
        return current;
      }

      // NOTE (deferred 4c): the design calls for a provisional-first request behind an in-app
      // primer. Until that primer UI ships we request full authorization so dogfood banners are
      // visible; recorded as a named deviation in the plan.
      return mapPermission(
        await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        }),
      );
    },

    cancelAllOwned: () => Notifications.cancelAllScheduledNotificationsAsync(),

    schedule: (request: DesiredNotification) => {
      const content = buildReminderNotificationContent(request, translate);

      return Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data,
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(request.scheduledFor),
        },
      });
    },
  };
}
