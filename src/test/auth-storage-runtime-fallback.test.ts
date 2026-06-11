import { createSecureStoreAuthStorage } from '@/lib/supabase/authStorage';

describe('SecureStore auth storage runtime fallback', () => {
  it('falls back to in-memory storage when SecureStore rejects at runtime', async () => {
    const secureStore = {
      deleteItemAsync: jest.fn(async () => {
        throw new Error('No keychain is available');
      }),
      getItemAsync: jest.fn(async () => {
        throw new Error('No keychain is available');
      }),
      setItemAsync: jest.fn(async () => {
        throw new Error('No keychain is available');
      }),
    };
    const storage = createSecureStoreAuthStorage(secureStore);

    await expect(storage.setItem('sb-session', 'token')).resolves.toBeUndefined();
    await expect(storage.getItem('sb-session')).resolves.toBe('token');
    await expect(storage.removeItem('sb-session')).resolves.toBeUndefined();
    await expect(storage.getItem('sb-session')).resolves.toBeNull();
  });
});
