import { createPuppyPlanSupabaseClient, getSupabaseClient } from '@/lib/supabase/client';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

const { createClient } = jest.requireMock('@supabase/supabase-js') as {
  createClient: jest.Mock;
};

describe('Supabase client boundary', () => {
  const config = {
    publishableKey: 'sb_publishable_test_123',
    url: 'https://example.supabase.co',
  };

  beforeEach(() => {
    createClient.mockReset();
  });

  it('creates the client without persisting auth tokens outside SecureStore', () => {
    createClient.mockReturnValue({ kind: 'supabase-client' });

    const client = createPuppyPlanSupabaseClient(config);

    expect(client).toEqual({ kind: 'supabase-client' });
    expect(createClient).toHaveBeenCalledWith(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: false,
      },
      });
  });

  it('caches the singleton client', () => {
    createClient
      .mockReturnValueOnce({ id: 'first' })
      .mockReturnValueOnce({ id: 'second' });
    process.env.EXPO_PUBLIC_SUPABASE_URL = config.url;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = config.publishableKey;

    expect(getSupabaseClient()).toEqual({ id: 'first' });
    expect(getSupabaseClient()).toEqual({ id: 'first' });
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
