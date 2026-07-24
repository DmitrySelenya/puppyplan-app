import * as SecureStore from 'expo-secure-store';

import {
  pendingHouseholdInviteRecordSchema,
  type PendingHouseholdInviteRecord,
} from '@/contracts/auth';
import { householdInviteTokenSchema } from '@/contracts/supabase';
import {
  createObservabilityReporter,
  type ObservabilityReporter,
} from '@/lib/observability';

// Expo SecureStore rejects keys containing characters outside [A-Za-z0-9._-].
const pendingHouseholdInviteKey = 'puppyplan.pending-household-intent.v1';
const pendingHouseholdInviteTtlMs = 7 * 24 * 60 * 60 * 1000;

export type PendingHouseholdInviteStore = Readonly<{
  deleteItem(key: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}>;

export type PendingHouseholdInviteReadResult =
  | Readonly<{ status: 'none' }>
  | Readonly<{ status: 'pending'; inviteToken: string }>
  | Readonly<{ status: 'unavailable' }>;

export type PendingHouseholdInviteController = Readonly<{
  clear(): Promise<void>;
  markUnavailable(): Promise<void>;
  persist(inviteToken: string): Promise<void>;
  read(): Promise<PendingHouseholdInviteReadResult>;
}>;

export type PendingHouseholdInviteControllerOptions = Readonly<{
  now?: () => Date;
  observability?: ObservabilityReporter;
  store?: PendingHouseholdInviteStore;
}>;

export function createPendingHouseholdInviteController(
  options: PendingHouseholdInviteControllerOptions = {},
): PendingHouseholdInviteController {
  const now = options.now ?? (() => new Date());
  const observability = options.observability ?? createObservabilityReporter();
  const store = options.store ?? createSecureStorePendingHouseholdInviteStore();

  const reportAndRethrow = (
    error: unknown,
    operation: 'clear' | 'read' | 'write',
  ): never => {
    observability.captureException(error, {
      area: 'auth',
      operation: `pending_household_intent_${operation}`,
      tags: { storage: 'secure-store' },
    });
    throw error;
  };

  const writeUnavailableMarker = async (): Promise<void> => {
    try {
      await store.setItem(
        pendingHouseholdInviteKey,
        JSON.stringify({ state: 'unavailable' }),
      );
    } catch (error) {
      reportAndRethrow(error, 'write');
    }
  };

  return {
    clear: async () => {
      try {
        await store.deleteItem(pendingHouseholdInviteKey);
      } catch (error) {
        reportAndRethrow(error, 'clear');
      }
    },
    markUnavailable: async () => {
      await writeUnavailableMarker();
    },
    persist: async (inviteToken) => {
      const parsedInviteToken = householdInviteTokenSchema.parse(inviteToken);
      const expiresAt = new Date(now().getTime() + pendingHouseholdInviteTtlMs).toISOString();

      try {
        await store.setItem(
          pendingHouseholdInviteKey,
          JSON.stringify({
            state: 'pending',
            inviteToken: parsedInviteToken,
            expiresAt,
          }),
        );
      } catch (error) {
        reportAndRethrow(error, 'write');
      }
    },
    read: async () => {
      let storedValue: string | null;

      try {
        storedValue = await store.getItem(pendingHouseholdInviteKey);
      } catch (error) {
        return reportAndRethrow(error, 'read');
      }

      if (storedValue === null) {
        return { status: 'none' };
      }

      let record: PendingHouseholdInviteRecord;

      try {
        record = pendingHouseholdInviteRecordSchema.parse(JSON.parse(storedValue));
      } catch {
        observability.captureException(
          new Error('pending_household_intent_invalid_record'),
          {
            area: 'auth',
            operation: 'pending_household_intent_read',
            tags: {
              reason: 'invalid-record',
              storage: 'secure-store',
            },
          },
        );
        await writeUnavailableMarker();
        return { status: 'unavailable' };
      }

      if (record.state === 'unavailable') {
        return { status: 'unavailable' };
      }

      if (new Date(record.expiresAt).getTime() <= now().getTime()) {
        await writeUnavailableMarker();
        return { status: 'unavailable' };
      }

      return {
        status: 'pending',
        inviteToken: record.inviteToken,
      };
    },
  };
}

export const pendingHouseholdInviteController =
  createPendingHouseholdInviteController();

function createSecureStorePendingHouseholdInviteStore(): PendingHouseholdInviteStore {
  return {
    deleteItem: (key) => SecureStore.deleteItemAsync(key),
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
  };
}
