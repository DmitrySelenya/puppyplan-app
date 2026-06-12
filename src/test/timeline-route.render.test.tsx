import { render } from '@testing-library/react-native';

import type { QuickLogEventActionHandlers } from '@/lib/query/quick-log-event-view';
import { AppProviders } from '@/lib/providers/AppProviders';

import TimelineRoute from '../../app/(modals)/timeline';

const mockRouterBack = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseQuickLogMutationPort = jest.fn();
let capturedActions: QuickLogEventActionHandlers | undefined;
let capturedCareContext: unknown;
let capturedOnClose: (() => void) | undefined;

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
    canGoBack: () => mockRouterCanGoBack(),
    push: (href: string) => mockRouterPush(href),
    replace: (href: string) => mockRouterReplace(href),
  },
}));

jest.mock('@/features/timeline/screens/TimelineScreen', () => ({
  TimelineScreen: (props: {
    actions?: QuickLogEventActionHandlers;
    careContext?: unknown;
    onClose: () => void;
  }) => {
    capturedActions = props.actions;
    capturedCareContext = props.careContext;
    capturedOnClose = props.onClose;

    return null;
  },
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => mockUseActiveCareContext(),
}));

jest.mock('@/lib/query/quick-log', () => ({
  useQuickLogMutationPort: () => mockUseQuickLogMutationPort(),
}));

describe('TimelineRoute Quick Log recovery wiring', () => {
  beforeEach(() => {
    capturedActions = undefined;
    capturedCareContext = undefined;
    capturedOnClose = undefined;
    mockRouterBack.mockClear();
    mockRouterCanGoBack.mockReset();
    mockRouterCanGoBack.mockReturnValue(true);
    mockRouterPush.mockClear();
    mockRouterReplace.mockClear();
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007201',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000007202',
        selectedTrackerIds: ['feeding_meal'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007203',
      },
      puppy: null,
      status: 'ready',
    });
  });

  it('passes active care context and recovery handlers to the production screen', () => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(),
      mutate: jest.fn(),
      retry: jest.fn(),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <TimelineRoute />
      </AppProviders>,
    );

    expect(capturedCareContext).toMatchObject({
      householdId: '00000000-0000-4000-8000-000000007201',
      puppyId: '00000000-0000-4000-8000-000000007202',
      todayDate: '2026-06-09',
    });

    capturedActions?.onRetry?.('evt_00000000-0000-4000-8000-000000007301', 'manual_retry', 'timeline');
    capturedActions?.onDelete?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007301',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007201',
      puppyId: '00000000-0000-4000-8000-000000007202',
      status: 'failed',
      todayDate: '2026-06-09',
    });
    capturedActions?.onUndo?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007301',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007201',
      puppyId: '00000000-0000-4000-8000-000000007202',
      todayDate: '2026-06-09',
    });

    expect(mutation.retry).toHaveBeenCalledWith(
      'evt_00000000-0000-4000-8000-000000007301',
      'manual_retry',
      'timeline',
    );
    expect(mutation.deleteLocal).toHaveBeenCalledWith(
      'evt_00000000-0000-4000-8000-000000007301',
    );
    expect(mutation.undo).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007301',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007201',
      puppyId: '00000000-0000-4000-8000-000000007202',
      todayDate: '2026-06-09',
    });
  });

  it('routes synced Timeline delete through the server tombstone path', () => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(),
      mutate: jest.fn(),
      retry: jest.fn(),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <TimelineRoute />
      </AppProviders>,
    );

    capturedActions?.onDelete?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007301',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007201',
      puppyId: '00000000-0000-4000-8000-000000007202',
      status: 'synced',
      todayDate: '2026-06-09',
    });

    expect(mutation.deleteSynced).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007301',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007201',
      puppyId: '00000000-0000-4000-8000-000000007202',
      todayDate: '2026-06-09',
    });
    expect(mutation.deleteLocal).not.toHaveBeenCalled();
  });

  it('routes synced Timeline edit to the details modal with validated row context', () => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(),
      mutate: jest.fn(),
      retry: jest.fn(),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <TimelineRoute />
      </AppProviders>,
    );

    capturedActions?.onEdit?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007301',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007201',
      puppyId: '00000000-0000-4000-8000-000000007202',
      todayDate: '2026-06-09',
      trackerId: 'feeding_meal',
    });

    expect(mockRouterPush).toHaveBeenCalledWith(
      '/quick-log/details?trackerId=feeding_meal&clientEventId=evt_00000000-0000-4000-8000-000000007301&eventType=feeding&householdId=00000000-0000-4000-8000-000000007201&puppyId=00000000-0000-4000-8000-000000007202&todayDate=2026-06-09',
    );
  });

  it('does not expose write handlers for viewer care contexts', () => {
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007201',
        householdRole: 'viewer',
        puppyId: '00000000-0000-4000-8000-000000007202',
        selectedTrackerIds: ['feeding_meal'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007203',
      },
      puppy: null,
      status: 'ready',
    });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: {
        deleteLocal: jest.fn(),
        deleteSynced: jest.fn(),
        mutate: jest.fn(),
        retry: jest.fn(),
        updateDetails: jest.fn(),
        undo: jest.fn(),
      },
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <TimelineRoute />
      </AppProviders>,
    );

    expect(capturedActions).toBeUndefined();
  });

  it('closes through router.back when a previous route exists', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(
      <AppProviders>
        <TimelineRoute />
      </AppProviders>,
    );

    capturedOnClose?.();

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('closes through Today fallback when no previous route exists', () => {
    mockRouterCanGoBack.mockReturnValue(false);
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(
      <AppProviders>
        <TimelineRoute />
      </AppProviders>,
    );

    capturedOnClose?.();

    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mockRouterReplace).toHaveBeenCalledWith('/today');
  });
});
