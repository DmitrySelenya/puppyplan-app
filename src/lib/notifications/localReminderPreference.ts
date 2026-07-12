import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import {
  createObservabilityReporter,
  type ObservabilityReporter,
} from '@/lib/observability';

const localReminderPreferenceKey = 'puppyplan:notifications:local-reminders-enabled:v1';

export type LocalReminderPreferenceStore = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}>;

export type LocalReminderPreferenceOptions = Readonly<{
  observability?: ObservabilityReporter;
  store?: LocalReminderPreferenceStore;
}>;

export type LocalReminderPreferenceController = Readonly<{
  read(): Promise<boolean>;
  write(enabled: boolean): Promise<void>;
}>;

export type LocalReminderPreferenceState = Readonly<{
  enabled: boolean;
  isError: boolean;
  isLoading: boolean;
  setEnabled(enabled: boolean): Promise<void>;
}>;

export function createLocalReminderPreferenceController(
  options: LocalReminderPreferenceOptions = {},
): LocalReminderPreferenceController {
  const observability = options.observability ?? createObservabilityReporter();
  const store = options.store ?? createSecureStoreLocalReminderPreferenceStore();

  return {
    read: async () => {
      try {
        return parseLocalReminderPreference(
          await store.getItem(localReminderPreferenceKey),
        );
      } catch (error) {
        observability.captureException(error, {
          area: 'notifications',
          operation: 'local_reminder_preference_read',
          tags: { storage: 'secure-store' },
        });
        throw error;
      }
    },
    write: async (enabled) => {
      try {
        await store.setItem(localReminderPreferenceKey, String(enabled));
      } catch (error) {
        observability.captureException(error, {
          area: 'notifications',
          operation: 'local_reminder_preference_write',
          tags: { storage: 'secure-store' },
        });
        throw error;
      }
    },
  };
}

export const defaultLocalReminderPreferenceController =
  createLocalReminderPreferenceController();

export function useLocalReminderPreference(
  controller: LocalReminderPreferenceController = defaultLocalReminderPreferenceController,
): LocalReminderPreferenceState {
  const [enabled, setEnabledState] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsError(false);
    setIsLoading(true);
    void controller.read()
      .then((storedEnabled) => {
        if (isMounted) {
          setEnabledState(storedEnabled);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [controller]);

  const setEnabled = useCallback(async (nextEnabled: boolean) => {
    const previousEnabled = enabled;
    setEnabledState(nextEnabled);
    setIsError(false);

    try {
      await controller.write(nextEnabled);
    } catch (error) {
      setEnabledState(previousEnabled);
      setIsError(true);
      throw error;
    }
  }, [controller, enabled]);

  return {
    enabled,
    isError,
    isLoading,
    setEnabled,
  };
}

function parseLocalReminderPreference(value: string | null): boolean {
  return value === 'false' ? false : true;
}

function createSecureStoreLocalReminderPreferenceStore(): LocalReminderPreferenceStore {
  return {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
  };
}
