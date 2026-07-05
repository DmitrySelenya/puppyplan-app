import * as SecureStore from 'expo-secure-store';

import {
  createObservabilityReporter,
  type ObservabilityReporter,
} from '@/lib/observability';

export const ONBOARDING_PROMPT_REPROMPT_MS = 48 * 60 * 60 * 1000;

export type OnboardingPromptKind = 'account' | 'notifications';
export type OnboardingPromptStage = OnboardingPromptKind | 'complete';

export type OnboardingPromptCadenceRecord = Readonly<{
  accountSkippedAt: number | null;
  notificationsSkippedAt: number | null;
}>;

export type OnboardingPromptCadenceStorage = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}>;

export type OnboardingPromptCadenceOptions = Readonly<{
  now?: () => number;
  observability?: ObservabilityReporter;
  storage?: OnboardingPromptCadenceStorage;
}>;

export type OnboardingPromptCadence = Readonly<{
  resolveInitialPrompt(requested: OnboardingPromptKind): Promise<OnboardingPromptStage>;
  recordSkip(prompt: OnboardingPromptKind): Promise<void>;
}>;

const promptStorageKeys: Record<OnboardingPromptKind, string> = {
  account: 'puppyplan:onboarding:post-value-prompt:account-skipped-at:v1',
  notifications: 'puppyplan:onboarding:post-value-prompt:notifications-skipped-at:v1',
};

export function resolveOnboardingPromptStage(
  requested: OnboardingPromptKind,
  record: OnboardingPromptCadenceRecord,
  nowMs: number,
): OnboardingPromptStage {
  const sequence: readonly OnboardingPromptKind[] = requested === 'account'
    ? ['account', 'notifications']
    : ['notifications'];

  for (const prompt of sequence) {
    const skippedAt = prompt === 'account'
      ? record.accountSkippedAt
      : record.notificationsSkippedAt;

    if (!isPromptCoolingDown(skippedAt, nowMs)) {
      return prompt;
    }
  }

  return 'complete';
}

export function createOnboardingPromptCadence(
  options: OnboardingPromptCadenceOptions = {},
): OnboardingPromptCadence {
  const storage = options.storage ?? createSecureStorePromptCadenceStorage();
  const now = options.now ?? Date.now;
  const observability = options.observability ?? createObservabilityReporter();

  return {
    recordSkip: async (prompt) => {
      try {
        await storage.setItem(promptStorageKeys[prompt], String(now()));
      } catch (error) {
        observability.captureException(error, {
          area: 'onboarding',
          operation: 'prompt_cadence_write',
          tags: { prompt },
        });
      }
    },
    resolveInitialPrompt: async (requested) => {
      try {
        const record = await readCadenceRecord(storage);

        return resolveOnboardingPromptStage(requested, record, now());
      } catch (error) {
        observability.captureException(error, {
          area: 'onboarding',
          operation: 'prompt_cadence_read',
          tags: { requested },
        });

        return requested;
      }
    },
  };
}

export const immediateOnboardingPromptCadence: OnboardingPromptCadence = {
  recordSkip: async () => undefined,
  resolveInitialPrompt: async (requested) => requested,
};

export const defaultOnboardingPromptCadence: OnboardingPromptCadence =
  createOnboardingPromptCadence();

async function readCadenceRecord(
  storage: OnboardingPromptCadenceStorage,
): Promise<OnboardingPromptCadenceRecord> {
  const [accountSkippedAt, notificationsSkippedAt] = await Promise.all([
    storage.getItem(promptStorageKeys.account),
    storage.getItem(promptStorageKeys.notifications),
  ]);

  return {
    accountSkippedAt: parseTimestamp(accountSkippedAt),
    notificationsSkippedAt: parseTimestamp(notificationsSkippedAt),
  };
}

function parseTimestamp(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const timestamp = Number(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function isPromptCoolingDown(skippedAt: number | null, nowMs: number): boolean {
  if (skippedAt === null) {
    return false;
  }

  return nowMs - skippedAt < ONBOARDING_PROMPT_REPROMPT_MS;
}

function createSecureStorePromptCadenceStorage(): OnboardingPromptCadenceStorage {
  return {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
  };
}
