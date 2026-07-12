import { AccessibilityInfo, ScrollView, StyleSheet } from 'react-native';
import { useState, type ReactElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { MAX_VISIBLE_QUICK_LOG_TRACKERS } from '@/contracts/quick-log';
import { SnackbarProvider } from '@/design/primitives/Snackbar';
import { tokens } from '@/design/tokens';
import {
  QuickLogFeedbackProvider,
  QuickLogMutationFeedbackObserver,
} from '@/features/quick-log/QuickLogFeedbackProvider';
import { QuickLogShell } from '@/features/quick-log/screens/QuickLogShell';
import type {
  QuickLogCareContext,
  QuickLogMutationEvent,
  QuickLogMutationPort,
  QuickLogSnackbarPort,
} from '@/features/quick-log/useQuickLogSheetController';
import { i18n } from '@/lib/i18n';

const careContext: QuickLogCareContext = {
  authState: 'authenticated',
  householdId: '00000000-0000-4000-8000-000000000501',
  householdRole: 'owner',
  puppyId: '00000000-0000-4000-8000-000000000502',
  selectedTrackerIds: [
    'potty',
    'feeding',
    'sleep',
    'walk',
    'zoomies',
  ],
  todayDate: '2026-05-27',
};

function createMutationPort(): QuickLogMutationPort {
  return {
    deleteLocal: jest.fn(),
    mutate: jest.fn(),
    retry: jest.fn(),
    undo: jest.fn(),
  };
}

function createSnackbarPort(): jest.Mocked<QuickLogSnackbarPort> {
  return {
    dismissSnackbar: jest.fn(),
    replaceSnackbar: jest.fn(),
    showSnackbar: jest.fn(),
  };
}

function createAnalyticsPort() {
  return {
    trackQuickLogEvent: jest.fn(),
  };
}

function withQuickLogFeedback(
  element: ReactElement,
  input: Readonly<{ analytics?: ReturnType<typeof createAnalyticsPort> }> = {},
) {
  return (
    <SnackbarProvider>
      <QuickLogFeedbackProvider analytics={input.analytics}>
        {element}
      </QuickLogFeedbackProvider>
    </SnackbarProvider>
  );
}

function renderWithQuickLogFeedback(
  element: ReactElement,
  input: Readonly<{ analytics?: ReturnType<typeof createAnalyticsPort> }> = {},
) {
  return render(withQuickLogFeedback(element, input));
}

describe('QuickLogShell', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    reduceMotionProbe.mockRestore();
  });

  it('renders a calm unavailable state when active care context is missing', () => {
    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={null}
        mutation={createMutationPort()}
        snackbar={createSnackbarPort()}
      />,
    );

    expect(screen.getByText(i18n.t('quick-log.sheet.unavailable.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.sheet.unavailable.body'))).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('quick-log.sheet.unavailable.title')).props.accessibilityViewIsModal).toBe(
      true,
    );
    expect(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.unavailable.close'),
    })).toBeTruthy();
  });

  it('renders the default tracker grid capped at five visible trackers', () => {
    const view = renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        mutation={createMutationPort()}
        snackbar={createSnackbarPort()}
      />,
    );
    const scrollView = view.UNSAFE_getByType(ScrollView);
    const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);

    expect(screen.getByText(i18n.t('quick-log.sheet.title'))).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('quick-log.sheet.title')).props.accessibilityViewIsModal).toBe(
      true,
    );
    expect(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.edit-trackers'),
    })).toBeTruthy();
    expect(contentStyle.paddingHorizontal).toBe(0);
    expect(screen.getByTestId('quick-log-sheet-scrim')).toBeTruthy();
    expect(screen.getByTestId('quick-log-sheet-anchor')).toBeTruthy();
    expect(screen.getByTestId('sheet-drag-handle', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.dismiss'),
    })).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('common.close'),
    })).toBeNull();
    expect(screen.getByTestId('quick-log-sheet-scrim').props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('quick-log-sheet-scrim').props.accessibilityLabel)
      .toBe(i18n.t('quick-log.sheet.dismiss'));
    expect(StyleSheet.flatten(screen.getByTestId('quick-log-sheet-scrim').props.style).bottom)
      .toBe(0);
    expect(screen.getAllByTestId('quick-log-tracker-tile')).toHaveLength(
      MAX_VISIBLE_QUICK_LOG_TRACKERS,
    );
    expect(screen.queryByText(i18n.t('common.close'))).toBeNull();
    expect(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.log-with-details'),
    })).toBeTruthy();
  });

  it('AC-1 opens a sleep second step and logs start/wake in the second tap', () => {
    const mutation = createMutationPort();
    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        mutation={mutation}
        now={() => new Date('2026-05-27T08:30:00.000Z')}
        snackbar={createSnackbarPort()}
      />,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.sleep'),
    }));
    expect(screen.getByText(i18n.t('quick-log.sleep-action.title'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.sleep-action.start'),
    }));

    expect(mutation.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.objectContaining({
        detailDraft: expect.objectContaining({
          action: 'start',
          occurredAt: '2026-05-27T08:30:00.000Z',
          trackerId: 'sleep',
        }),
        trackerId: 'sleep',
      }),
    }));
  });

  it('AC-1 sends retrospective sleep and the visible detailed lane to the composer', () => {
    const mutation = createMutationPort();
    const openCreateDetails = jest.fn();
    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        mutation={mutation}
        openCreateDetails={openCreateDetails}
        snackbar={createSnackbarPort()}
      />,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.sleep'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.sleep-action.retrospective'),
    }));
    expect(openCreateDetails).toHaveBeenCalledWith({
      sleepAction: 'retrospective',
      trackerId: 'sleep',
    });
    expect(mutation.mutate).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.back') }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.log-with-details'),
    }));
    expect(openCreateDetails).toHaveBeenCalledWith({ trackerId: 'feeding' });
  });

  it('maps canonical tracker ids to their glyphs', () => {
    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        mutation={createMutationPort()}
        snackbar={createSnackbarPort()}
      />,
    );

    expect(screen.getByTestId('quick-log-tracker-icon-water', {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByTestId('quick-log-tracker-icon-bowl', {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByTestId('quick-log-tracker-icon-moon', {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByTestId('quick-log-tracker-icon-calendar', {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByTestId('quick-log-tracker-icon-spark', {
      includeHiddenElements: true,
    })).toBeTruthy();
  });

  it('wires the sheet dismiss affordance to the route close handler', () => {
    const closeSheet = jest.fn();

    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        closeSheet={closeSheet}
        mutation={createMutationPort()}
        snackbar={createSnackbarPort()}
      />,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.dismiss'),
    }));

    expect(closeSheet).toHaveBeenCalledTimes(1);
  });

  it('AC-OB-PROMPT-RUNTIME schedules post-save prompts only after an actual tracker log', () => {
    const closeSheet = jest.fn();
    const mutation = createMutationPort();
    const onQuickLogSaved = jest.fn();

    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        closeSheet={closeSheet}
        mutation={mutation}
        onQuickLogSaved={onQuickLogSaved}
        snackbar={createSnackbarPort()}
      />,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.dismiss'),
    }));

    expect(onQuickLogSaved).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
    expect(closeSheet).toHaveBeenCalledTimes(2);
    expect(onQuickLogSaved).toHaveBeenCalledTimes(1);
  });

  it('AC-OB-PROMPT-RUNTIME does not schedule post-save prompts when duplicate warning is canceled', () => {
    const mutation = createMutationPort();
    const onQuickLogSaved = jest.fn();

    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        mutation={mutation}
        now={() => new Date('2026-05-27T08:30:00.000Z')}
        onQuickLogSaved={onQuickLogSaved}
        recentEvent={{
          occurredAtMs: Date.parse('2026-05-27T08:29:30.000Z'),
          trackerId: 'feeding',
        }}
        snackbar={createSnackbarPort()}
      />,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.duplicate-warning.secondary'),
    }));

    expect(mutation.mutate).not.toHaveBeenCalled();
    expect(onQuickLogSaved).not.toHaveBeenCalled();
  });

  it('renders selected tracker ids from the active care context in order', () => {
    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={{
          ...careContext,
          selectedTrackerIds: ['walk', 'feeding'],
        }}
        mutation={createMutationPort()}
        snackbar={createSnackbarPort()}
      />,
    );

    const trackerTiles = screen.getAllByTestId('quick-log-tracker-tile');

    expect(trackerTiles).toHaveLength(2);
    expect(trackerTiles[0].props.accessibilityLabel).toBe(i18n.t('quick-log.trackers.walk'));
    expect(trackerTiles[1].props.accessibilityLabel).toBe(i18n.t('quick-log.trackers.feeding'));
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.trackers.potty'),
    })).toBeNull();
  });

  it('falls back to default trackers when runtime selected tracker ids are empty', () => {
    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={{
          ...careContext,
          selectedTrackerIds: [],
        }}
        mutation={createMutationPort()}
        snackbar={createSnackbarPort()}
      />,
    );

    expect(screen.getAllByTestId('quick-log-tracker-tile')).toHaveLength(
      MAX_VISIBLE_QUICK_LOG_TRACKERS,
    );
    expect(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.potty'),
    })).toBeTruthy();
  });

  it('treats an active context without a mutation adapter as unavailable', () => {
    renderWithQuickLogFeedback(
      <QuickLogShell careContext={careContext} />,
    );

    expect(screen.getByText(i18n.t('quick-log.sheet.unavailable.title'))).toBeTruthy();
    expect(screen.queryAllByTestId('quick-log-tracker-tile')).toHaveLength(0);
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    })).toBeNull();
  });

  it('renders duplicate warning as a dedicated sheet state and lets Add anyway proceed', () => {
    const mutation = createMutationPort();

    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        mutation={mutation}
        now={() => new Date('2026-05-27T08:30:00.000Z')}
        recentEvent={{
          occurredAtMs: Date.parse('2026-05-27T08:29:30.000Z'),
          trackerId: 'feeding',
        }}
        snackbar={createSnackbarPort()}
      />,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    expect(screen.getByText(i18n.t('quick-log.duplicate-warning.title'))).toBeTruthy();
    expect(screen.queryAllByTestId('quick-log-tracker-tile')).toHaveLength(0);
    expect(mutation.mutate).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.duplicate-warning.primary-alt'),
    }));

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
  });

  it('requires an explicit potty subtype before mutating a potty Quick Log event', () => {
    const mutation = createMutationPort();

    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        mutation={mutation}
        snackbar={createSnackbarPort()}
      />,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.potty'),
    }));

    expect(screen.getByText(i18n.t('quick-log.potty-subtype.title'))).toBeTruthy();
    expect(mutation.mutate).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.potty-inside'),
    }));

    expect(mutation.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.objectContaining({
        pottySubtype: 'inside',
        trackerId: 'potty',
      }),
    }));
  });

  it('cancels an active duplicate warning from the scrim instead of closing the sheet', () => {
    const closeSheet = jest.fn();
    const mutation = createMutationPort();

    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        closeSheet={closeSheet}
        mutation={mutation}
        now={() => new Date('2026-05-27T08:30:00.000Z')}
        recentEvent={{
          occurredAtMs: Date.parse('2026-05-27T08:29:30.000Z'),
          trackerId: 'feeding',
        }}
        snackbar={createSnackbarPort()}
      />,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    expect(screen.getByText(i18n.t('quick-log.duplicate-warning.title'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.sheet.dismiss'),
    }));

    expect(closeSheet).not.toHaveBeenCalled();
    expect(mutation.mutate).not.toHaveBeenCalled();
    expect(screen.queryByText(i18n.t('quick-log.duplicate-warning.title'))).toBeNull();
    expect(screen.getAllByTestId('quick-log-tracker-tile')).toHaveLength(
      MAX_VISIBLE_QUICK_LOG_TRACKERS,
    );
  });

  it('uses provider analytics for controller-owned duplicate warning events', () => {
    const analytics = createAnalyticsPort();
    const mutation = createMutationPort();

    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        mutation={mutation}
        now={() => new Date('2026-05-27T08:30:00.000Z')}
        recentEvent={{
          occurredAtMs: Date.parse('2026-05-27T08:29:30.000Z'),
          trackerId: 'feeding',
        }}
        snackbar={createSnackbarPort()}
      />,
      { analytics },
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'duplicate_warning_seen',
      properties: {
        event_type: 'feeding',
        time_since_previous_bucket: 'under_60s',
      },
    });

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.duplicate-warning.primary-alt'),
    }));

    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'duplicate_warning_confirmed',
      properties: {
        event_type: 'feeding',
      },
    });
  });

  it('wires failed local rows to controller retry and delete callbacks', () => {
    const mutation = createMutationPort();
    const clientEventId = 'evt_00000000-0000-4000-8000-000000000503';

    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        localEvents={[{
          clientEventId,
          eventType: 'feeding',
          householdId: careContext.householdId,
          puppyId: careContext.puppyId,
          state: 'failed_retryable',
          todayDate: careContext.todayDate,
          trackerName: i18n.t('quick-log.trackers.feeding'),
        }]}
        mutation={mutation}
        snackbar={createSnackbarPort()}
      />,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    }));

    expect(mutation.retry).toHaveBeenCalledWith(clientEventId, 'manual_retry');
    expect(mutation.deleteLocal).toHaveBeenCalledWith(clientEventId);
  });

  it('labels pending and failed local rows for assistive technology', () => {
    const mutation = createMutationPort();

    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        localEvents={[
          {
            clientEventId: 'evt_00000000-0000-4000-8000-000000000503',
            eventType: 'feeding',
            householdId: careContext.householdId,
            puppyId: careContext.puppyId,
            state: 'sending',
            todayDate: careContext.todayDate,
            trackerName: i18n.t('quick-log.trackers.feeding'),
          },
          {
            clientEventId: 'evt_00000000-0000-4000-8000-000000000504',
            eventType: 'walk',
            householdId: careContext.householdId,
            puppyId: careContext.puppyId,
            state: 'failed_retryable',
            todayDate: careContext.todayDate,
            trackerName: i18n.t('quick-log.trackers.walk'),
          },
        ]}
        mutation={mutation}
        snackbar={createSnackbarPort()}
      />,
    );

    expect(screen.getByLabelText(`${i18n.t('quick-log.trackers.feeding')}. ${i18n.t('quick-log.pending.label')}`)).toBeTruthy();
    const failedRow = screen.getByLabelText(`${i18n.t('quick-log.trackers.walk')}. ${i18n.t('quick-log.failed.generic')}`);

    expect(failedRow.props.accessibilityLiveRegion).toBe('polite');
    expect(failedRow.props.accessibilityRole).toBe('alert');
  });

  it('keeps controller state stable when callers toggle the snackbar override seam', () => {
    const mutation = createMutationPort();
    const snackbar = createSnackbarPort();
    const renderQuickLogShell = (snackbarOverride?: QuickLogSnackbarPort) => (
      <QuickLogShell
        careContext={careContext}
        mutation={mutation}
        now={() => new Date('2026-05-27T08:30:00.000Z')}
        recentEvent={{
          occurredAtMs: Date.parse('2026-05-27T08:29:30.000Z'),
          trackerId: 'feeding',
        }}
        snackbar={snackbarOverride}
      />
    );

    const view = renderWithQuickLogFeedback(renderQuickLogShell(snackbar));

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    expect(screen.getByText(i18n.t('quick-log.duplicate-warning.title'))).toBeTruthy();
    expect(mutation.mutate).not.toHaveBeenCalled();

    view.rerender(withQuickLogFeedback(renderQuickLogShell()));

    expect(screen.getByText(i18n.t('quick-log.duplicate-warning.title'))).toBeTruthy();
    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it.each([
    'failed_retryable',
    'failed_permanent',
  ] as const)('replaces success feedback after route unmount for %s', async (failureState) => {
    const mutation = createMutationPort();

    function RouteHarness({
      mutationEvents,
    }: {
      mutationEvents: readonly QuickLogMutationEvent[];
    }) {
      const [sheetVisible, setSheetVisible] = useState(true);

      return (
        <SnackbarProvider>
          <QuickLogFeedbackProvider>
            <QuickLogMutationFeedbackObserver
              careContext={careContext}
              mutation={mutation}
              mutationEvents={mutationEvents}
            />
            {sheetVisible ? (
              <QuickLogShell
                careContext={careContext}
                closeSheet={() => {
                  setSheetVisible(false);
                }}
                mutation={mutation}
              />
            ) : null}
          </QuickLogFeedbackProvider>
        </SnackbarProvider>
      );
    }

    const view = render(<RouteHarness mutationEvents={[]} />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    const request = jest.mocked(mutation.mutate).mock.calls[0]?.[0];
    if (!request) {
      throw new Error('Expected Quick Log mutation request');
    }

    expect(screen.queryByText(i18n.t('quick-log.sheet.title'))).toBeNull();
    expect(screen.getByText(i18n.t('quick-log.snackbar.saved-template', {
      trackerName: i18n.t('quick-log.trackers.feeding'),
    }))).toBeTruthy();

    view.rerender(
      <RouteHarness
        mutationEvents={[{
          clientEventId: 'evt_00000000-0000-4000-8000-000000000503',
          eventType: 'feeding',
          requestId: request.requestId,
          state: failureState,
          trackerId: 'feeding',
          type: 'failed',
        }]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.failed.snackbar'))).toBeTruthy();
    });
  });

  it('renders the after-tap success snackbar anatomy with Undo and Add details', () => {
    const mutation = createMutationPort();
    const openDetails = jest.fn();

    function RouteHarness() {
      const [sheetVisible, setSheetVisible] = useState(true);

      return (
        <SnackbarProvider>
          <QuickLogFeedbackProvider>
            {sheetVisible ? (
              <QuickLogShell
                careContext={careContext}
                closeSheet={() => {
                  setSheetVisible(false);
                }}
                mutation={mutation}
                openDetails={openDetails}
              />
            ) : null}
          </QuickLogFeedbackProvider>
        </SnackbarProvider>
      );
    }

    render(<RouteHarness />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    const savedCopy = i18n.t('quick-log.snackbar.saved-template', {
      trackerName: i18n.t('quick-log.trackers.feeding'),
    });
    const status = screen.getByTestId('snackbar-status');

    expect(screen.queryByText(i18n.t('quick-log.sheet.title'))).toBeNull();
    expect(screen.getByText(savedCopy)).toBeTruthy();
    expect(screen.getByTestId('snackbar-host')).toBeTruthy();
    expect(status.props.accessibilityLiveRegion).toBe('polite');
    expect(status.props.accessibilityLabel).toBe(i18n.t('quick-log.snackbar.a11y-with-details', {
      trackerName: i18n.t('quick-log.trackers.feeding'),
    }));
    expect(StyleSheet.flatten(screen.getByTestId('snackbar-surface').props.style).backgroundColor).toBe(
      tokens.color.status.successTint,
    );
    expect(screen.getByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('quick-log.snackbar.add-details'),
    })).toBeTruthy();
  });

  it('applies pending snackbar Undo after the mutation started event reaches the provider', async () => {
    const mutation = createMutationPort();

    function RouteHarness({
      mutationEvents,
    }: {
      mutationEvents: readonly QuickLogMutationEvent[];
    }) {
      const [sheetVisible, setSheetVisible] = useState(true);

      return (
        <SnackbarProvider>
          <QuickLogFeedbackProvider>
            <QuickLogMutationFeedbackObserver
              careContext={careContext}
              mutation={mutation}
              mutationEvents={mutationEvents}
            />
            {sheetVisible ? (
              <QuickLogShell
                careContext={careContext}
                closeSheet={() => {
                  setSheetVisible(false);
                }}
                mutation={mutation}
              />
            ) : null}
          </QuickLogFeedbackProvider>
        </SnackbarProvider>
      );
    }

    const view = render(<RouteHarness mutationEvents={[]} />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    const request = jest.mocked(mutation.mutate).mock.calls[0]?.[0];
    if (!request) {
      throw new Error('Expected Quick Log mutation request');
    }

    const snackbarMessage = screen.getByText(i18n.t('quick-log.snackbar.saved-template', {
      trackerName: i18n.t('quick-log.trackers.feeding'),
    }));

    expect(snackbarMessage).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    }));

    expect(mutation.undo).not.toHaveBeenCalled();

    view.rerender(
      <RouteHarness
        mutationEvents={[{
          clientEventId: 'evt_00000000-0000-4000-8000-000000000504',
          eventType: 'feeding',
          requestId: request.requestId,
          trackerId: 'feeding',
          type: 'started',
        }]}
      />,
    );

    await waitFor(() => {
      expect(mutation.undo).toHaveBeenCalledWith({
        clientEventId: 'evt_00000000-0000-4000-8000-000000000504',
        eventType: 'feeding',
        householdId: careContext.householdId,
        puppyId: careContext.puppyId,
        todayDate: careContext.todayDate,
      });
    });
    expect(screen.queryByText(i18n.t('quick-log.snackbar.saved-template', {
      trackerName: i18n.t('quick-log.trackers.feeding'),
    }))).toBeNull();
  });
});
