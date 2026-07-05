import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuickLogFeedbackProvider } from '@/features/quick-log/QuickLogFeedbackProvider';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import QuickLogDetailsRoute from '../../app/(modals)/quick-log/details';

const mockRouterBack = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockRouterReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseQuickLogMutationPort = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
    canGoBack: () => mockRouterCanGoBack(),
    replace: (href: string) => mockRouterReplace(href),
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('@/lib/query/quick-log', () => ({
  ...jest.requireActual('@/lib/query/quick-log'),
  useQuickLogMutationPort: () => mockUseQuickLogMutationPort(),
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => mockUseActiveCareContext(),
}));

describe('QuickLogDetailsRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterBack.mockClear();
    mockRouterCanGoBack.mockReset();
    mockRouterCanGoBack.mockReturnValue(true);
    mockRouterReplace.mockClear();
    mockUseLocalSearchParams.mockReturnValue({
      trackerId: 'sleep',
    });
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007902',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000007903',
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007904',
      },
      puppy: null,
      status: 'ready',
    });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'unavailable',
    });
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('renders the requested detail variant and closes through the modal helper', () => {
    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogDetailsRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('quick-log.details.sleep.duration-label'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.skip'),
    }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('persists a validated detail draft when event context is present', () => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(),
      mutate: jest.fn(),
      retry: jest.fn(),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseLocalSearchParams.mockReturnValue({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007901',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007902',
      puppyId: '00000000-0000-4000-8000-000000007903',
      todayDate: '2026-06-09',
      trackerId: 'feeding',
    });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogDetailsRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('quick-log.details.feeding.amount.water'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    }));

    expect(mutation.updateDetails).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007901',
      draft: {
        amount: 'water',
        trackerId: 'feeding',
      },
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007902',
      puppyId: '00000000-0000-4000-8000-000000007903',
      todayDate: '2026-06-09',
    });
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('does not persist detail drafts for viewer care contexts', () => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(),
      mutate: jest.fn(),
      retry: jest.fn(),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007902',
        householdRole: 'viewer',
        puppyId: '00000000-0000-4000-8000-000000007903',
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007904',
      },
      puppy: null,
      status: 'ready',
    });
    mockUseLocalSearchParams.mockReturnValue({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007901',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007902',
      puppyId: '00000000-0000-4000-8000-000000007903',
      todayDate: '2026-06-09',
      trackerId: 'feeding',
    });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogDetailsRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    }));

    expect(mutation.updateDetails).not.toHaveBeenCalled();
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('AC-QL-DETAIL-STATES shows loading while active care context loads', () => {
    mockUseActiveCareContext.mockReturnValue({
      careContext: null,
      puppy: null,
      status: 'loading',
    });

    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogDetailsRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    expect(screen.getByTestId('quick-log-details-state-loading')).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.details.states.loading.title'))).toBeTruthy();
  });

  it('AC-QL-DETAIL-STATES shows view-only access for viewer care contexts', () => {
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000007902',
        householdRole: 'viewer',
        puppyId: '00000000-0000-4000-8000-000000007903',
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007904',
      },
      puppy: null,
      status: 'ready',
    });

    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogDetailsRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    expect(screen.getByTestId('quick-log-details-state-permission-denied')).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.details.states.permission-denied.title'))).toBeTruthy();
  });

  it('AC-QL-DETAIL-STATES shows pending write while the local queue opens', () => {
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: undefined,
      mutationEvents: [],
      status: 'loading',
    });

    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogDetailsRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    expect(screen.getByTestId('quick-log-details-state-pending-write')).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.details.states.pending-write.title'))).toBeTruthy();
  });

  it.each([
    ['householdId', '00000000-0000-4000-8000-000000007912'],
    ['puppyId', '00000000-0000-4000-8000-000000007913'],
    ['todayDate', '2026-06-10'],
  ] as const)('does not persist detail drafts when %s does not match active care context', (
    field,
    value,
  ) => {
    const mutation = {
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(),
      mutate: jest.fn(),
      retry: jest.fn(),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseLocalSearchParams.mockReturnValue({
      clientEventId: 'evt_00000000-0000-4000-8000-000000007901',
      eventType: 'feeding',
      householdId: '00000000-0000-4000-8000-000000007902',
      puppyId: '00000000-0000-4000-8000-000000007903',
      todayDate: '2026-06-09',
      trackerId: 'feeding',
      [field]: value,
    });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogDetailsRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    }));

    expect(mutation.updateDetails).not.toHaveBeenCalled();
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
