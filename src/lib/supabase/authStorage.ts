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
  if (secureStore === null) {
    const memory = new Map<string, string>();

    return {
      getItem: async (key) => memory.get(key) ?? null,
      setItem: async (key, value) => {
        memory.set(key, value);
      },
      removeItem: async (key) => {
        memory.delete(key);
      },
    };
  }

  return {
    getItem: (key) => secureStore.getItemAsync(key),
    setItem: (key, value) => secureStore.setItemAsync(key, value),
    removeItem: (key) => secureStore.deleteItemAsync(key),
  };
}
