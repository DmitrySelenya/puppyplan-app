import { AccessibilityInfo, ScrollView, StyleSheet } from 'react-native';
import { useState, type ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { MAX_VISIBLE_QUICK_LOG_TRACKERS } from '@/contracts/quick-log';
import { SnackbarProvider } from '@/design/primitives/Snackbar';
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
  puppyId: '00000000-0000-4000-8000-000000000502',
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

function withQuickLogFeedback(element: ReactElement) {
  return (
    <SnackbarProvider>
      <QuickLogFeedbackProvider>
        {element}
      </QuickLogFeedbackProvider>
    </SnackbarProvider>
  );
}

function renderWithQuickLogFeedback(element: ReactElement) {
  return render(withQuickLogFeedback(element));
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
    expect(contentStyle.paddingHorizontal).toBe(0);
    expect(screen.getByTestId('sheet-drag-handle', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getAllByTestId('quick-log-tracker-tile')).toHaveLength(
      MAX_VISIBLE_QUICK_LOG_TRACKERS,
    );
    expect(screen.queryByText(i18n.t('quick-log.snackbar.add-details'))).toBeNull();
    expect(screen.queryByText(i18n.t('quick-log.sheet.edit-trackers'))).toBeNull();
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

  it('renders duplicate warning inline and lets Add anyway proceed', () => {
    const mutation = createMutationPort();

    renderWithQuickLogFeedback(
      <QuickLogShell
        careContext={careContext}
        mutation={mutation}
        now={() => new Date('2026-05-27T08:30:00.000Z')}
        recentEvent={{
          occurredAtMs: Date.parse('2026-05-27T08:29:30.000Z'),
          trackerId: 'feeding_meal',
        }}
        snackbar={createSnackbarPort()}
      />,
    );

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    expect(screen.getByText(i18n.t('quick-log.duplicate-warning.title'))).toBeTruthy();
    expect(mutation.mutate).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.duplicate-warning.primary-alt'),
    }));

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
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

    expect(mutation.retry).toHaveBeenCalledWith(clientEventId);
    expect(mutation.deleteLocal).toHaveBeenCalledWith(clientEventId);
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
          trackerId: 'feeding_meal',
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
          trackerId: 'feeding_meal',
          type: 'failed',
        }]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.failed.snackbar'))).toBeTruthy();
    });
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
          trackerId: 'feeding_meal',
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
