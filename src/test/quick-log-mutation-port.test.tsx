import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useQuickLogMutationPort } from '@/lib/query/quick-log';
import type { QuickLogQueueStorage } from '@/lib/queue';

const syncedDeleteFailure = new Error('Synthetic synced-delete RLS failure');
const mockOpenQuickLogQueueStorage = jest.fn<Promise<QuickLogQueueStorage>, []>();
const mockTombstoneByClientEventId = jest.fn(async () => {
  throw syncedDeleteFailure;
});
const updateDetailsFailure = new Error('Synthetic detail update failure');
const mockUpdatePayloadByClientEventId = jest.fn(async () => {
  throw updateDetailsFailure;
});

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    status: 'signedIn',
    user: {
      id: '00000000-0000-4000-8000-000000000203',
    },
  }),
}));

jest.mock('@/lib/queue', () => {
  const actual = jest.requireActual<typeof import('@/lib/queue')>('@/lib/queue');

  return {
    ...actual,
    openQuickLogQueueStorage: () => mockOpenQuickLogQueueStorage(),
  };
});

jest.mock('@/lib/supabase/events', () => {
  const actual = jest.requireActual<typeof import('@/lib/supabase/events')>('@/lib/supabase/events');

  return {
    ...actual,
    createSupabaseEventLogRepository: () => ({
      insertEvent: jest.fn(),
      listEvents: jest.fn(),
      restoreByClientEventId: jest.fn(),
      selectExistingEvent: jest.fn(),
      tombstoneByClientEventId: mockTombstoneByClientEventId,
      updatePayloadByClientEventId: mockUpdatePayloadByClientEventId,
    }),
  };
});

describe('useQuickLogMutationPort async failures', () => {
  afterEach(() => {
    mockOpenQuickLogQueueStorage.mockReset();
    mockTombstoneByClientEventId.mockClear();
    mockUpdatePayloadByClientEventId.mockClear();
  });

  it('AC-EVENT-CLIENT-1 returns the synced-delete promise so RLS failures are not swallowed', async () => {
    mockOpenQuickLogQueueStorage.mockResolvedValue(createUnusedQuickLogQueue());
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => {
      expect(hook.result.current.status).toBe('ready');
    });

    const result = hook.result.current.mutation?.deleteSynced({
      clientEventId: 'evt_00000000-0000-4000-8000-000000000204',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000000201',
      puppyId: '00000000-0000-4000-8000-000000000202',
      todayDate: '2026-05-26',
    });

    expect(isPromiseLike(result)).toBe(true);

    if (!isPromiseLike(result)) {
      return;
    }

    await expect(result).rejects.toBe(syncedDeleteFailure);
    expect(mockTombstoneByClientEventId).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000000204',
      deletedAt: expect.any(String),
      householdId: '00000000-0000-4000-8000-000000000201',
    });
  });

  it('AC-6 returns the detail-update promise so persistence failures are not swallowed', async () => {
    mockOpenQuickLogQueueStorage.mockResolvedValue(createUnusedQuickLogQueue());
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const hook = renderHook(() => useQuickLogMutationPort(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(hook.result.current.status).toBe('ready'));

    const result = hook.result.current.mutation?.updateDetails({
      clientEventId: 'evt_00000000-0000-4000-8000-000000000204',
      draft: { amount: 'snack', trackerId: 'feeding' },
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000000201',
      puppyId: '00000000-0000-4000-8000-000000000202',
      todayDate: '2026-05-26',
    });

    expect(isPromiseLike(result)).toBe(true);
    if (!isPromiseLike(result)) return;
    await expect(result).rejects.toBe(updateDetailsFailure);
  });
});

function createQueryClientWrapper(
  queryClient: QueryClient,
): (props: Readonly<{ children: ReactNode }>) => ReactNode {
  return function QueryClientWrapper({ children }: Readonly<{ children: ReactNode }>): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

function createUnusedQuickLogQueue(): QuickLogQueueStorage {
  const fail = async (): Promise<never> => {
    throw new Error('Quick Log queue should not be used by synced delete');
  };

  return {
    claimNextReadyToSend: async () => null,
    enqueue: fail,
    getByClientEventId: async () => null,
    initialize: async () => undefined,
    list: async () => [],
    manualRetry: fail,
    markDeletedBeforeSync: fail,
    markFailedPermanent: fail,
    markFailedRetryable: fail,
    markSending: fail,
    remove: async () => undefined,
    resolveInFlightSuccess: fail,
  };
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as Readonly<{ then?: unknown }>).then === 'function';
}
