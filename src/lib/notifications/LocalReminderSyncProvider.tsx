import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { useAppTranslation } from '@/lib/i18n';
import { createObservabilityReporter } from '@/lib/observability';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useRemindersQuery } from '@/lib/query/reminders';

import {
  createExpoReminderNotificationAdapter,
  type ReminderNotificationAdapter,
} from './expoReminderNotificationAdapter';
import { useLocalReminderPreference } from './localReminderPreference';
import {
  syncLocalReminders,
  toReminderForExpansion,
  type ReminderScheduleEntry,
} from './localReminderSync';

/**
 * Device-only side-effect component (rendered once from the root layout). It keeps on-device local
 * notifications in sync with the enabled `reminder` rows: on mount, whenever reminders / care
 * context / preference change, and on every foreground it re-derives the desired set and reconciles
 * (idempotent cancel-all-owned + reschedule). All logic is delegated to the tested pure modules;
 * this shell only wires live inputs and reports failures — no silent catch.
 */

const observability = createObservabilityReporter();

export function LocalReminderSync(): null {
  const { t } = useAppTranslation();
  const adapter = useMemo<ReminderNotificationAdapter>(
    () => createExpoReminderNotificationAdapter(t),
    [t],
  );

  const { careContext, status } = useActiveCareContext();
  const remindersQuery = useRemindersQuery(careContext?.householdId, careContext?.puppyId);
  const { enabled: preferenceEnabled, isLoading: preferenceIsLoading } = useLocalReminderPreference();
  const reminders = remindersQuery.data;

  useEffect(() => {
    adapter.configureForegroundHandler();
  }, [adapter]);

  const runSync = useCallback(async (): Promise<void> => {
    if (preferenceIsLoading || status !== 'ready') {
      return;
    }

    try {
      if (careContext === null) {
        await adapter.cancelAllOwned();
        return;
      }

      if (reminders === undefined) {
        return;
      }

      const entries = reminders
        .map(toReminderForExpansion)
        .filter((entry): entry is ReminderScheduleEntry => entry !== null);
      const permission = await adapter.getPermission();

      await syncLocalReminders({
        entries,
        nowMs: Date.now(),
        preferenceEnabled,
        permission,
        port: adapter,
        observability,
      });
    } catch (error) {
      observability.captureException(error, {
        area: 'notifications',
        operation: 'local_reminder_sync_trigger',
      });
    }
  }, [adapter, careContext, preferenceEnabled, preferenceIsLoading, reminders, status]);

  useEffect(() => {
    void runSync();
  }, [runSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void runSync();
      }
    });

    return () => subscription.remove();
  }, [runSync]);

  return null;
}
