import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuickLogFeedbackProvider } from '@/features/quick-log/QuickLogFeedbackProvider';
import type { QuickLogMutationPort } from '@/features/quick-log/useQuickLogSheetController';
import { i18n } from '@/lib/i18n';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import { AppProviders } from '@/lib/providers/AppProviders';

import QuickLogRoute from '../../app/(sheets)/quick-log';

const mockRouterBack = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockRouterPush = jest.fn();
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

function createCachedRow(
  overrides: Partial<QuickLogCachedEventRow> = {},
): QuickLogCachedEventRow {
  return {
    id: '00000000-0000-4000-8000-000000003101',
    household_id: '00000000-0000-4000-8000-000000003001',
    puppy_id: '00000000-0000-4000-8000-000000003002',
    created_by: '00000000-0000-4000-8000-000000003003',
    client_event_id: 'evt_00000000-0000-4000-8000-000000003104',
    event_type: 'feeding',
    occurred_at: new Date(Date.now() - 30_000).toISOString(),
    payload_version: 1,
    payload: {
      amount: 'meal',
    },
    version: 1,
    deleted_at: null,
    created_at: new Date(Date.now() - 30_000).toISOString(),
    updated_at: new Date(Date.now() - 30_000).toISOString(),
    ...overrides,
  };
}

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
    canGoBack: () => mockRouterCanGoBack(),
    push: (href: string) => mockRouterPush(href),
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
    mockRouterPush.mockClear();
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
        selectedTrackerIds: ['walk', 'feeding'],
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
    expect(trackerTiles[0].props.accessibilityLabel).toBe(i18n.t('quick-log.trackers.walk'));
    expect(trackerTiles[1].props.accessibilityLabel).toBe(i18n.t('quick-log.trackers.feeding'));

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.walk'),
    }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mutation.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.objectContaining({
        householdId: '00000000-0000-4000-8000-000000003001',
        puppyId: '00000000-0000-4000-8000-000000003002',
        todayDate: '2026-06-09',
        trackerId: 'walk',
      }),
    }));
    expect(mockUseQuickLogCachedRows).toHaveBeenCalledWith(expect.objectContaining({
      householdId: '00000000-0000-4000-8000-000000003001',
      puppyId: '00000000-0000-4000-8000-000000003002',
    }));
  });

  it('derives duplicate warning context from cached rows before mutating', () => {
    const mutation = createMutationPort();
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000003001',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000003002',
        selectedTrackerIds: ['feeding', 'sleep'],
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
    mockUseQuickLogCachedRows.mockReturnValue([createCachedRow()]);

    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    expect(screen.getByText(i18n.t('quick-log.duplicate-warning.title'))).toBeTruthy();
    expect(mutation.mutate).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('closes the active Quick Log route through Today fallback after logging when no previous route exists', () => {
    const mutation = createMutationPort();
    mockRouterCanGoBack.mockReturnValue(false);
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000003001',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000003002',
        selectedTrackerIds: ['walk', 'feeding'],
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

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.walk'),
    }));

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mockRouterReplace).toHaveBeenCalledWith('/today');
  });

  it('opens the Quick Trackers settings route from the active sheet edit-trackers action', () => {
    const mutation = createMutationPort();
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000003001',
        householdRole: 'owner',
        puppyId: '00000000-0000-4000-8000-000000003002',
        selectedTrackerIds: ['walk', 'feeding'],
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

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.edit-trackers'),
    }));

    expect(mockRouterPush).toHaveBeenCalledWith('/settings/quick-trackers');
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it('blocks viewer care contexts before an optimistic Quick Log write can be queued', () => {
    const mutation = createMutationPort();
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: '00000000-0000-4000-8000-000000003001',
        householdRole: 'viewer',
        puppyId: '00000000-0000-4000-8000-000000003002',
        selectedTrackerIds: ['walk', 'feeding'],
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
      name: i18n.t('quick-log.trackers.walk'),
    })).toBeNull();
    expect(mutation.mutate).not.toHaveBeenCalled();
  });
});
