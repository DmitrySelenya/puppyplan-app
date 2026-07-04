import { render, waitFor } from '@testing-library/react-native';

import type { QuickLogEventActionHandlers } from '@/lib/query/quick-log-event-view';
import { AppProviders } from '@/lib/providers/AppProviders';
import { i18n } from '@/lib/i18n';

import TimelineRoute from '../../app/(modals)/timeline';

const mockRouterBack = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
const mockShowSnackbar = jest.fn();
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

jest.mock('@/design/primitives/Snackbar', () => {
  const actual = jest.requireActual<typeof import('@/design/primitives/Snackbar')>(
    '@/design/primitives/Snackbar',
  );

  return {
    ...actual,
    useSnackbar: () => ({
      dismissSnackbar: jest.fn(),
      replaceSnackbar: jest.fn(),
      showSnackbar: mockShowSnackbar,
    }),
  };
});

describe('TimelineRoute Quick Log recovery wiring', () => {
  beforeEach(async () => {
    capturedActions = undefined;
    capturedCareContext = undefined;
    capturedOnClose = undefined;
    mockRouterBack.mockClear();
    mockRouterCanGoBack.mockReset();
    mockRouterCanGoBack.mockReturnValue(true);
    mockRouterPush.mockClear();
    mockRouterReplace.mockClear();
    mockShowSnackbar.mockReset();
    await i18n.changeLanguage('en');
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007201',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000007202',
        selectedTrackerIds: ['feeding'],
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
      restoreSynced: jest.fn(),
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

  it('routes synced Timeline delete through the server tombstone path', async () => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(async () => undefined),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(async () => undefined),
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

    await Promise.resolve(capturedActions?.onDelete?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007301',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007201',
      puppyId: '00000000-0000-4000-8000-000000007202',
      status: 'synced',
      todayDate: '2026-06-09',
    }));

    expect(mutation.deleteSynced).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007301',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007201',
      puppyId: '00000000-0000-4000-8000-000000007202',
      todayDate: '2026-06-09',
    });
    expect(mutation.deleteLocal).not.toHaveBeenCalled();

    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      durationMs: 5000,
      hapticEvent: 'warning',
      message: i18n.t('timeline.delete-snackbar'),
      primaryAction: expect.objectContaining({
        label: i18n.t('quick-log.snackbar.undo'),
      }),
      tone: 'warning',
    })));

    const snackbarMessage = mockShowSnackbar.mock.calls[0]?.[0];
    snackbarMessage.primaryAction.onPress();

    await waitFor(() => expect(mutation.restoreSynced).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007301',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007201',
      puppyId: '00000000-0000-4000-8000-000000007202',
      todayDate: '2026-06-09',
    }));
  });

  it('routes synced Timeline edit to the details modal with validated row context', () => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(),
      mutate: jest.fn(),
      retry: jest.fn(),
      restoreSynced: jest.fn(),
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
      trackerId: 'feeding',
    });

    expect(mockRouterPush).toHaveBeenCalledWith(
      '/quick-log/details?trackerId=feeding&clientEventId=evt_00000000-0000-4000-8000-000000007301&eventType=feeding&householdId=00000000-0000-4000-8000-000000007201&puppyId=00000000-0000-4000-8000-000000007202&todayDate=2026-06-09',
    );
  });

  it('does not expose write handlers for viewer care contexts', () => {
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007201',
        householdRole: 'viewer',
        puppyId: '00000000-0000-4000-8000-000000007202',
        selectedTrackerIds: ['feeding'],
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

  it('closes through Diary fallback when no previous route exists', () => {
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
    expect(mockRouterReplace).toHaveBeenCalledWith('/diary');
  });
});
