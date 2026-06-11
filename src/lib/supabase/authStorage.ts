// src/lib/supabase/authStorage.ts
import type { SupportedStorage } from '@supabase/supabase-js';

export type SecureStoreModule = Readonly<{
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}>;

// SecureStore is resolved lazily so unit tests and any non-native context that
// never builds the real client do not require the native module.
function loadSecureStore(): SecureStoreModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
}

export function createSecureStoreAuthStorage(
  secureStore: SecureStoreModule | null = loadSecureStore(),
): SupportedStorage {
  const memory = new Map<string, string>();

  return {
    getItem: async (key) => {
      if (secureStore === null) {
        return memory.get(key) ?? null;
      }

      try {
        return await secureStore.getItemAsync(key);
      } catch {
        return memory.get(key) ?? null;
      }
    },
    setItem: async (key, value) => {
      if (secureStore === null) {
        memory.set(key, value);
        return;
      }

      try {
        await secureStore.setItemAsync(key, value);
      } catch {
        memory.set(key, value);
      }
    },
    removeItem: async (key) => {
      memory.delete(key);

      if (secureStore === null) {
        return;
      }

      try {
        await secureStore.deleteItemAsync(key);
      } catch {
        // Runtime keychain availability can fail on Simulator teardown; memory is already cleared.
      }
    },
  };
}
