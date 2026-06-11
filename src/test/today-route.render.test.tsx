import { render } from '@testing-library/react-native';

import type { QuickLogEventActionHandlers } from '@/lib/query/quick-log-event-view';
import { AppProviders } from '@/lib/providers/AppProviders';

import TodayRoute from '../../app/(tabs)/today';

const mockRouterPush = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseQuickLogMutationPort = jest.fn();
let capturedActions: QuickLogEventActionHandlers | undefined;

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockRouterPush(href),
  },
}));

jest.mock('@/features/today/screens/TodayScreen', () => ({
  TodayScreen: (props: { actions?: QuickLogEventActionHandlers }) => {
    capturedActions = props.actions;

    return null;
  },
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => mockUseActiveCareContext(),
}));

jest.mock('@/lib/query/quick-log', () => ({
  useQuickLogMutationPort: () => mockUseQuickLogMutationPort(),
}));

describe('TodayRoute Quick Log recovery wiring', () => {
  beforeEach(() => {
    capturedActions = undefined;
    mockRouterPush.mockClear();
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007001',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000007002',
        selectedTrackerIds: ['feeding_meal'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007003',
      },
      puppy: null,
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
});
