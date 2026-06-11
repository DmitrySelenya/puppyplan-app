import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuickLogFeedbackProvider } from '@/features/quick-log/QuickLogFeedbackProvider';
import type { QuickLogMutationPort } from '@/features/quick-log/useQuickLogSheetController';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import QuickLogRoute from '../../app/(modals)/quick-log';

const mockRouterBack = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockRouterReplace = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseQuickLogCachedRows = jest.fn();
const mockUseQuickLogMutationPort = jest.fn();

function createMutationPort(): jest.Mocked<QuickLogMutationPort> {
  return {
    deleteLocal: jest.fn(),
    mutate: jest.fn(),
    retry: jest.fn(),
    undo: jest.fn(),
  };
}

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
    canGoBack: () => mockRouterCanGoBack(),
    replace: (href: string) => mockRouterReplace(href),
  },
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => mockUseActiveCareContext(),
}));

jest.mock('@/lib/query/quick-log', () => ({
  ...jest.requireActual('@/lib/query/quick-log'),
  useQuickLogMutationPort: () => mockUseQuickLogMutationPort(),
}));

jest.mock('@/lib/query/useQuickLogCachedRows', () => ({
  useQuickLogCachedRows: (careContext: unknown) => mockUseQuickLogCachedRows(careContext),
}));

describe('QuickLogRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterBack.mockClear();
    mockRouterCanGoBack.mockReset();
    mockRouterCanGoBack.mockReturnValue(true);
    mockRouterReplace.mockClear();
    mockUseActiveCareContext.mockReturnValue({
      careContext: null,
      puppy: null,
      status: 'empty',
    });
    mockUseQuickLogCachedRows.mockReturnValue([]);
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

  it('closes the unavailable Quick Log route through router.back when a previous route exists', () => {
    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.unavailable.close'),
    }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('closes the unavailable Quick Log route through Today fallback when no previous route exists', () => {
    mockRouterCanGoBack.mockReturnValue(false);

    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.unavailable.close'),
    }));

    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mockRouterReplace).toHaveBeenCalledWith('/today');
  });

  it('opens with active selected trackers and sends the selected tracker through the route mutation', () => {
    const mutation = createMutationPort();
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000003001',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000003002',
        selectedTrackerIds: ['training', 'feeding_meal'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000003003',
      },
      puppy: null,
      status: 'ready',
    });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    const trackerTiles = screen.getAllByTestId('quick-log-tracker-tile');

    expect(trackerTiles).toHaveLength(2);
    expect(trackerTiles[0].props.accessibilityLabel).toBe(i18n.t('quick-log.trackers.training'));
    expect(trackerTiles[1].props.accessibilityLabel).toBe(i18n.t('quick-log.trackers.feeding'));

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.training'),
    }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mutation.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.objectContaining({
        householdId: '00000000-0000-4000-8000-000000003001',
        puppyId: '00000000-0000-4000-8000-000000003002',
        todayDate: '2026-06-09',
        trackerId: 'training',
      }),
    }));
    expect(mockUseQuickLogCachedRows).toHaveBeenCalledWith(expect.objectContaining({
      householdId: '00000000-0000-4000-8000-000000003001',
      puppyId: '00000000-0000-4000-8000-000000003002',
    }));
  });

  it('blocks viewer care contexts before an optimistic Quick Log write can be queued', () => {
    const mutation = createMutationPort();
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000003001',
        householdRole: 'viewer',
        puppyId: '00000000-0000-4000-8000-000000003002',
        selectedTrackerIds: ['training', 'feeding_meal'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000003003',
      },
      puppy: null,
      status: 'ready',
    });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation,
      mutationEvents: [],
      status: 'ready',
    });

    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    expect(screen.getByText(i18n.t('quick-log.sheet.permission-denied.title'))).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.trackers.training'),
    })).toBeNull();
    expect(mutation.mutate).not.toHaveBeenCalled();
  });
});
