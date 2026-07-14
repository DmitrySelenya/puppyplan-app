import { AccessibilityInfo, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { QuickLogFeedbackProvider } from '@/features/quick-log/QuickLogFeedbackProvider';
import { QuickLogDetailsScreen } from '@/features/quick-log/screens/QuickLogDetailsScreen';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';

import QuickLogDetailsRoute from '../../app/(modals)/quick-log/details';

const mockRouterBack = jest.fn();
const mockRouterCanGoBack = jest.fn();
const mockRouterReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseQuickLogCachedRows = jest.fn();
const mockUseQuickLogMutationPort = jest.fn();
let mockFontScale = 1;

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'useWindowDimensions', {
    value: () => ({ fontScale: mockFontScale, height: 667, scale: 2, width: 375 }),
  });
});

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

jest.mock('@/lib/query/useQuickLogCachedRows', () => ({
  useQuickLogCachedRows: () => mockUseQuickLogCachedRows(),
}));

function createCachedObservationRow(
  overrides: Partial<QuickLogCachedEventRow> = {},
): QuickLogCachedEventRow {
  return {
    client_event_id: 'evt_00000000-0000-4000-8000-000000007901',
    created_at: '2026-06-09T08:11:00.000Z',
    created_by: '00000000-0000-4000-8000-000000007904',
    deleted_at: null,
    event_type: 'observation',
    household_id: '00000000-0000-4000-8000-000000007902',
    id: '00000000-0000-4000-8000-000000007905',
    occurred_at: '2026-06-09T08:10:00.000Z',
    payload: {
      note: 'Synthetic private context for details',
      title: 'Calm greeting',
    },
    payload_version: 2,
    puppy_id: '00000000-0000-4000-8000-000000007903',
    updated_at: '2026-06-09T08:15:00.000Z',
    version: 3,
    ...overrides,
  };
}

describe('QuickLogDetailsRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockFontScale = 1;
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
    mockUseQuickLogCachedRows.mockReset();
    mockUseQuickLogCachedRows.mockReturnValue([]);
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('renders the requested detail variant with the safe sleep default and closes through the modal helper', () => {
    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogDetailsRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    expect(screen.queryByText(i18n.t('quick-log.details.sleep.duration-label'))).toBeNull();

    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('quick-log.details.sleep.action.retrospective'),
    }));

    expect(screen.getByText(i18n.t('quick-log.details.sleep.duration-label'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.skip'),
    }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it.each([
    { fontScale: 1.999, expectedFlexBasis: '47%', expectedWidth: undefined },
    { fontScale: 2, expectedFlexBasis: '100%', expectedWidth: '100%' },
  ])('AC-DT-2A AC-DT-2E adapts detail choices without losing tab semantics at fontScale $fontScale', ({
    expectedFlexBasis,
    expectedWidth,
    fontScale,
  }) => {
    mockFontScale = fontScale;
    render(
      <AppProviders>
        <QuickLogFeedbackProvider>
          <QuickLogDetailsRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    const sleep = screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.sleep'),
    });
    const style = StyleSheet.flatten(
      typeof sleep.props.style === 'function' ? sleep.props.style({ pressed: false }) : sleep.props.style,
    );

    expect(style.flexBasis).toBe(expectedFlexBasis);
    expect(style.width).toBe(expectedWidth);
    expect(sleep.props.accessibilityState).toEqual(expect.objectContaining({
      disabled: false,
      selected: true,
    }));
    expect(screen.getByText(i18n.t('quick-log.trackers.sleep')).props.children)
      .toBe(i18n.t('quick-log.trackers.sleep'));
  });

  it('AC-P33-CORRECT renders a missing cached edit target as an error and never submits a blank update', () => {
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

    expect(screen.getByTestId('quick-log-details-state-error')).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.details.save'),
    })).toBeNull();
    expect(mutation.updateDetails).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('AC-P33-READ AC-P33-CORRECT resolves a safe cached id into the editable draft and audit metadata, then updates the same client event', () => {
    const updateDetails = jest.fn();
    const row = createCachedObservationRow();
    mockUseLocalSearchParams.mockReturnValue({
      clientEventId: row.client_event_id,
      eventType: row.event_type,
      householdId: row.household_id,
      puppyId: row.puppy_id,
      todayDate: '2026-06-09',
      trackerId: 'observation',
    });
    mockUseQuickLogCachedRows.mockReturnValue([
      createCachedObservationRow({
        client_event_id: 'evt_00000000-0000-4000-8000-000000007911',
        payload: { note: 'Unselected synthetic row', title: 'Other event' },
      }),
      row,
    ]);
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: {
        deleteLocal: jest.fn(),
        deleteSynced: jest.fn(),
        mutate: jest.fn(),
        retry: jest.fn(),
        updateDetails,
        undo: jest.fn(),
      },
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

    expect(screen.getByLabelText(i18n.t('quick-log.details.observation.title-label')))
      .toHaveProp('value', 'Calm greeting');
    expect(screen.getByLabelText(i18n.t('quick-log.details.note.label')))
      .toHaveProp('value', 'Synthetic private context for details');
    fireEvent.press(screen.getByTestId('quick-log-details-when-pill'));
    expect(screen.getByTestId('quick-log-details-when-wheel').props.date)
      .toBe(new Date('2026-06-09T08:10:00.000Z').getTime());
    const details = screen.UNSAFE_getByType(QuickLogDetailsScreen);
    expect(details.props.auditMetadata).toEqual({
      clientEventId: row.client_event_id,
      createdAt: '2026-06-09T08:11:00.000Z',
      isCreatedByCurrentUser: true,
      occurredAt: '2026-06-09T08:10:00.000Z',
      updatedAt: '2026-06-09T08:15:00.000Z',
      version: 3,
    });

    const observationTracker = screen.getByRole('button', {
      name: i18n.t('quick-log.details.tabs.observation'),
    });
    const feedingTracker = screen.getByRole('button', {
      name: i18n.t('quick-log.details.tabs.feeding'),
    });
    expect(observationTracker.props.accessibilityState).toEqual(expect.objectContaining({
      disabled: true,
      selected: true,
    }));
    expect(feedingTracker.props.accessibilityState).toEqual(expect.objectContaining({
      disabled: true,
      selected: false,
    }));
    fireEvent.press(feedingTracker);
    expect(screen.getByLabelText(i18n.t('quick-log.details.observation.title-label')))
      .toHaveProp('value', 'Calm greeting');

    // Editing an existing fact, so the sheet offers Save changes rather than Save details.
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.edit-save'),
    }));

    expect(updateDetails).toHaveBeenCalledWith(expect.objectContaining({
      clientEventId: row.client_event_id,
      draft: expect.objectContaining({
        note: 'Synthetic private context for details',
        occurredAt: '2026-06-09T08:10:00.000Z',
        title: 'Calm greeting',
        trackerId: 'observation',
      }),
      eventType: 'observation',
    }));
  });

  it('AC-P33-CORRECT keeps cached details readable for a viewer without rendering Save or invoking mutation', () => {
    const updateDetails = jest.fn();
    const row = createCachedObservationRow();
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: row.household_id,
        householdRole: 'viewer',
        puppyId: row.puppy_id,
        selectedTrackerIds: ['observation'],
        todayDate: '2026-06-09',
        userId: '00000000-0000-4000-8000-000000007914',
      },
      puppy: null,
      status: 'ready',
    });
    mockUseLocalSearchParams.mockReturnValue({
      clientEventId: row.client_event_id,
      eventType: row.event_type,
      householdId: row.household_id,
      puppyId: row.puppy_id,
      todayDate: '2026-06-09',
      trackerId: 'observation',
    });
    mockUseQuickLogCachedRows.mockReturnValue([row]);
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: {
        deleteLocal: jest.fn(),
        deleteSynced: jest.fn(),
        mutate: jest.fn(),
        retry: jest.fn(),
        updateDetails,
        undo: jest.fn(),
      },
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

    expect(screen.getByText('Calm greeting')).toBeTruthy();
    expect(screen.getByText('Synthetic private context for details')).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.details.save'),
    })).toBeNull();
    expect(updateDetails).not.toHaveBeenCalled();
  });

  it('AC-2/AC-5 creates a standalone detailed observation and closes only after persistence', async () => {
    const createDetailed = jest.fn(async () => undefined);
    const mutation = {
      createDetailed,
      deleteLocal: jest.fn(),
      deleteSynced: jest.fn(),
      mutate: jest.fn(),
      retry: jest.fn(),
      updateDetails: jest.fn(),
      undo: jest.fn(),
    };
    mockUseLocalSearchParams.mockReturnValue({ trackerId: 'observation' });
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

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-log.details.observation.title-label')),
      'Calm greeting',
    );
    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-log.details.note.label')),
      'Synthetic private context',
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    }));

    await waitFor(() => expect(createDetailed).toHaveBeenCalledWith(expect.objectContaining({
      detailDraft: expect.objectContaining({
        note: 'Synthetic private context',
        title: 'Calm greeting',
        trackerId: 'observation',
      }),
      householdId: '00000000-0000-4000-8000-000000007902',
      puppyId: '00000000-0000-4000-8000-000000007903',
      trackerId: 'observation',
      todayDate: '2026-06-09',
    })));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('AC-2/AC-6 keeps a rejected standalone draft open and visible', async () => {
    const createDetailed = jest.fn(async () => {
      throw new Error('Synthetic persistence failure');
    });
    mockUseLocalSearchParams.mockReturnValue({ trackerId: 'observation' });
    mockUseQuickLogMutationPort.mockReturnValue({
      mutation: {
        createDetailed,
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
        <QuickLogFeedbackProvider>
          <QuickLogDetailsRoute />
        </QuickLogFeedbackProvider>
      </AppProviders>,
    );

    const note = screen.getByLabelText(i18n.t('quick-log.details.note.label'));
    fireEvent.changeText(note, 'Keep synthetic draft');
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.details.save'),
    }));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.details.persistence-error'))).toBeTruthy();
    });
    expect(note).toHaveProp('value', 'Keep synthetic draft');
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('AC-QL-DETAIL-PERMISSION does not persist or close for viewer care contexts', () => {
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
    expect(mockRouterBack).not.toHaveBeenCalled();
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
