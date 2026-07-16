import { Share } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import type { QuickLogEventActionHandlers } from '@/lib/query/quick-log-event-view';
import type { TodayScreenProps } from '@/features/today/screens/TodayScreen';
import { AppProviders } from '@/lib/providers/AppProviders';
import { i18n } from '@/lib/i18n';

import DiaryRoute from '../../app/(tabs)/diary';

const mockRouterPush = jest.fn();
const mockDismissSnackbar = jest.fn();
const mockShowSnackbar = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseQuickLogMutationPort = jest.fn();
let capturedActions: QuickLogEventActionHandlers | undefined;
type DiaryParityScreenProps = TodayScreenProps & Readonly<{
  onShareText?: (text: string) => Promise<void> | void;
}>;

let capturedProps: DiaryParityScreenProps | undefined;

jest.mock('expo-router', () => ({
  router: {
    push: (href: unknown) => mockRouterPush(href),
  },
}));

jest.mock('@/features/today/screens/TodayScreen', () => {
  const actual = jest.requireActual('@/features/today/screens/TodayScreen');

  return {
    ...actual,
    TodayScreen: (props: TodayScreenProps) => {
      capturedActions = props.actions;
      capturedProps = props as DiaryParityScreenProps;

      return null;
    },
  };
});

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
      dismissSnackbar: mockDismissSnackbar,
      replaceSnackbar: jest.fn(),
      showSnackbar: mockShowSnackbar,
    }),
  };
});

describe('DiaryRoute Quick Log recovery wiring', () => {
  beforeEach(async () => {
    capturedActions = undefined;
    capturedProps = undefined;
    mockRouterPush.mockClear();
    mockDismissSnackbar.mockReset();
    mockShowSnackbar.mockReset();
    await i18n.changeLanguage('en');
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007001',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000007002',
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007003',
      },
      puppy: {
        age_weeks_estimate: 8,
        birth_date: null,
        created_at: '2026-06-03T21:00:00.000Z',
        deleted_at: null,
        household_id: '00000000-0000-4000-8000-000000007001',
        household_role: 'owner',
        id: '00000000-0000-4000-8000-000000007002',
        name: 'Synthetic Test Puppy',
        quick_tracker_ids: ['feeding'],
        updated_at: '2026-06-03T21:00:00.000Z',
      },
      status: 'ready',
    });
  });

  it('passes retry, delete, and undo handlers from the production mutation port', () => {
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
        <DiaryRoute />
      </AppProviders>,
    );

    capturedActions?.onRetry?.('evt_00000000-0000-4000-8000-000000007101', 'manual_retry', 'today');
    capturedActions?.onDelete?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007101',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'failed',
      todayDate: '2026-06-09',
    });
    capturedActions?.onUndo?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007101',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      todayDate: '2026-06-09',
    });

    expect(mutation.retry).toHaveBeenCalledWith(
      'evt_00000000-0000-4000-8000-000000007101',
      'manual_retry',
      'today',
    );
    expect(mutation.deleteLocal).toHaveBeenCalledWith(
      'evt_00000000-0000-4000-8000-000000007101',
    );
    expect(mutation.undo).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007101',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      todayDate: '2026-06-09',
    });
  });

  it('AC-P5-CHECKOFF wires an actual-time linked fact through the insert path', async () => {
    // The reminder link the check-off carries is what lets the insert restore the slot's row after
    // an un-check, so the route has no separate check-off call to make.
    const createDetailed = jest.fn().mockResolvedValue({ id: 'synthetic-event' });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: {
        createDetailed,
        deleteLocal: jest.fn(),
        deleteSynced: jest.fn(),
        mutate: jest.fn(),
        retry: jest.fn(),
        restoreSynced: jest.fn(),
        updateDetails: jest.fn(),
        undo: jest.fn(),
      },
      mutationEvents: [],
      status: 'ready',
    });
    render(<AppProviders><DiaryRoute /></AppProviders>);

    await capturedProps?.onCheckOff?.({
      displayAt: '2026-06-09T08:00:00.000Z',
      kind: 'planned',
      plannedAt: '2026-06-09T08:00:00.000Z',
      reminderId: '00000000-0000-4000-8000-000000007301',
      scheduledFor: '2026-06-09T08:00:00.000Z',
      status: 'upcoming',
      time: '08:00',
      trackerId: 'sleep',
    });

    expect(createDetailed).toHaveBeenCalledWith(expect.objectContaining({
      detailDraft: expect.objectContaining({ trackerId: 'sleep' }),
      householdId: '00000000-0000-4000-8000-000000007001',
      occurredAt: expect.not.stringMatching('2026-06-09T08:00:00.000Z'),
      reminderLink: {
        reminderId: '00000000-0000-4000-8000-000000007301',
        scheduledFor: '2026-06-09T08:00:00.000Z',
      },
    }));
  });

  it('AC-DIARY-DELETE-UNDO-1 AC-DIARY-DELETE-UNDO-2 AC-DIARY-DELETE-UNDO-3 shows undo snackbar after synced Diary delete and restores from it', async () => {
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
        <DiaryRoute />
      </AppProviders>,
    );

    await Promise.resolve(capturedActions?.onDelete?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007101',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      status: 'synced',
      todayDate: '2026-06-09',
    }));

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
      clientEventId: 'evt_00000000-0000-4000-8000-000000007101',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      todayDate: '2026-06-09',
    }));
    await waitFor(() => expect(mockDismissSnackbar).toHaveBeenCalledWith(
      'quick-log-synced-delete:evt_00000000-0000-4000-8000-000000007101',
    ));
    expect(mutation.deleteLocal).not.toHaveBeenCalled();
  });

  it('derives the production Diary day number from the active puppy profile date', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(
      <AppProviders>
        <DiaryRoute />
      </AppProviders>,
    );

    expect(capturedProps?.todayPlanInput).toMatchObject({
      dayNumber: 7,
    });
  });

  it('wires the Diary hero primary action to the Quick Log modal', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(
      <AppProviders>
        <DiaryRoute />
      </AppProviders>,
    );

    capturedProps?.openQuickLog?.();

    expect(mockRouterPush).toHaveBeenCalledWith('/quick-log');
  });

  it('AC-DIARY-NAV-1 wires the Diary schedule action to the schedule sheet', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(
      <AppProviders>
        <DiaryRoute />
      </AppProviders>,
    );

    capturedProps?.openTimeline?.();

    expect(mockRouterPush).toHaveBeenCalledWith('/quick-log/schedule');
  });

  it('AC-P33-CORRECT opens update details with routing-only params and never places private content in the URL', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: {
        createDetailed: jest.fn(),
        deleteLocal: jest.fn(),
        deleteSynced: jest.fn(),
        mutate: jest.fn(),
        retry: jest.fn(),
        restoreSynced: jest.fn(),
        updateDetails: jest.fn(),
        undo: jest.fn(),
      },
      mutationEvents: [],
      status: 'ready',
    });

    render(<AppProviders><DiaryRoute /></AppProviders>);

    capturedActions?.onEdit?.({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007801',
      eventType: 'observation',
      householdId: '00000000-0000-4000-8000-000000007001',
      puppyId: '00000000-0000-4000-8000-000000007002',
      todayDate: '2026-06-09',
      trackerId: 'observation',
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/quick-log/details',
      params: {
        clientEventId: 'evt_00000000-0000-4000-8000-000000007801',
        eventType: 'observation',
        householdId: '00000000-0000-4000-8000-000000007001',
        puppyId: '00000000-0000-4000-8000-000000007002',
        todayDate: '2026-06-09',
        trackerId: 'observation',
      },
    });
    expect(JSON.stringify(mockRouterPush.mock.calls)).not.toContain('Synthetic private context');
    expect(JSON.stringify(mockRouterPush.mock.calls)).not.toContain('note');
    expect(JSON.stringify(mockRouterPush.mock.calls)).not.toContain('payload');
  });

  it('AC-P33-EXPORT invokes the native share sheet only after the explicit screen action', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });
    render(<AppProviders><DiaryRoute /></AppProviders>);

    expect(share).not.toHaveBeenCalled();
    await capturedProps?.onShareText?.('08:10 Feeding — synthetic context');

    expect(share).toHaveBeenCalledWith({
      message: '08:10 Feeding — synthetic context',
    });
    share.mockRestore();
  });

  it('does not expose write handlers for viewer care contexts', () => {
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007001',
        householdRole: 'viewer',
        puppyId: '00000000-0000-4000-8000-000000007002',
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007003',
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
        <DiaryRoute />
      </AppProviders>,
    );

    expect(capturedActions).toBeUndefined();
    expect(capturedProps?.onCheckOff).toBeUndefined();
    expect(capturedProps?.onShareText).toEqual(expect.any(Function));
  });
});
