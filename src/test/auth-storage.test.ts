// src/test/auth-storage.test.ts
import { createSecureStoreAuthStorage } from '@/lib/supabase/authStorage';

describe('SecureStore auth storage adapter', () => {
  it('delegates get/set/remove to the injected SecureStore module', async () => {
    const store = new Map<string, string>();
    const secureStore = {
      getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
      setItemAsync: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      deleteItemAsync: jest.fn(async (key: string) => {
        store.delete(key);
      }),
    };
    const storage = createSecureStoreAuthStorage(secureStore);

    await storage.setItem('sb-session', 'token');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('sb-session', 'token');
    expect(await storage.getItem('sb-session')).toBe('token');

    await storage.removeItem('sb-session');
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('sb-session');
    expect(await storage.getItem('sb-session')).toBeNull();
  });

  it('falls back to in-memory storage when SecureStore is unavailable', async () => {
    const storage = createSecureStoreAuthStorage(null);

    expect(await storage.getItem('missing')).toBeNull();
    await storage.setItem('k', 'v');
    expect(await storage.getItem('k')).toBe('v');
    await storage.removeItem('k');
    expect(await storage.getItem('k')).toBeNull();
  });
});
