import { render } from '@testing-library/react-native';

import type { QuickLogEventActionHandlers } from '@/lib/query/quick-log-event-view';
import type { TodayScreenProps } from '@/features/today/screens/TodayScreen';
import { AppProviders } from '@/lib/providers/AppProviders';

import TodayRoute from '../../app/(tabs)/today';

const mockRouterPush = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseQuickLogMutationPort = jest.fn();
let capturedActions: QuickLogEventActionHandlers | undefined;
let capturedProps: TodayScreenProps | undefined;

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockRouterPush(href),
  },
}));

jest.mock('@/features/today/screens/TodayScreen', () => {
  const actual = jest.requireActual('@/features/today/screens/TodayScreen');

  return {
    ...actual,
    TodayScreen: (props: TodayScreenProps) => {
      capturedActions = props.actions;
      capturedProps = props;

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

describe('TodayRoute Quick Log recovery wiring', () => {
  beforeEach(() => {
    capturedActions = undefined;
    capturedProps = undefined;
    mockRouterPush.mockClear();
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
      mutate: jest.fn(),
      retry: jest.fn(),
      undo: jest.fn(),
    };
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <TodayRoute />
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

  it('derives the production Today day number from the active puppy profile date', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(
      <AppProviders>
        <TodayRoute />
      </AppProviders>,
    );

    expect(capturedProps?.todayPlanInput).toMatchObject({
      dayNumber: 7,
    });
  });

  it('wires the Today hero primary action to the Quick Log modal', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });

    render(
      <AppProviders>
        <TodayRoute />
      </AppProviders>,
    );

    capturedProps?.openQuickLog?.();

    expect(mockRouterPush).toHaveBeenCalledWith('/quick-log');
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
        <TodayRoute />
      </AppProviders>,
    );

    expect(capturedActions).toBeUndefined();
  });
});
