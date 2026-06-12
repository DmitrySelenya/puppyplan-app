import { act, renderHook } from '@testing-library/react-native';

import { createQuickLogFeedbackController } from '@/features/quick-log/QuickLogFeedbackProvider';
import {
  useQuickLogSheetController,
  type QuickLogCareContext,
  type QuickLogMutationEvent,
  type QuickLogMutationPort,
  type QuickLogSnackbarPort,
} from '@/features/quick-log/useQuickLogSheetController';

const householdId = '00000000-0000-4000-8000-000000000401';
const puppyId = '00000000-0000-4000-8000-000000000402';
const clientEventId = 'evt_00000000-0000-4000-8000-000000000403';
const now = new Date('2026-05-27T08:30:00.000Z');

const careContext: QuickLogCareContext = {
  authState: 'authenticated',
  householdId,
  householdRole: 'owner',
  puppyId,
  todayDate: '2026-05-27',
};

function createMutationPort(): jest.Mocked<QuickLogMutationPort> {
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

function renderController(input: {
  analytics?: ReturnType<typeof createAnalyticsPort>;
  care?: QuickLogCareContext | null;
  events?: readonly QuickLogMutationEvent[];
  lastLoggedAtMs?: number;
  mutation?: jest.Mocked<QuickLogMutationPort>;
  snackbar?: jest.Mocked<QuickLogSnackbarPort>;
} = {}) {
  const mutation = input.mutation ?? createMutationPort();
  const snackbar = input.snackbar ?? createSnackbarPort();
  const feedback = createQuickLogFeedbackController({
    analytics: input.analytics,
    snackbar,
  });
  const closeSheet = jest.fn();
  const hook = renderHook((props: { events: readonly QuickLogMutationEvent[] }) =>
    useQuickLogSheetController({
      analytics: input.analytics,
      careContext: input.care === undefined ? careContext : input.care,
      closeSheet,
      feedback,
      mutation,
      mutationEvents: props.events,
      now: () => now,
      recentEvent: input.lastLoggedAtMs === undefined
        ? null
        : {
          occurredAtMs: input.lastLoggedAtMs,
          trackerId: 'feeding_meal',
        },
    }), {
      initialProps: {
        events: input.events ?? [],
      },
    });

  return {
    closeSheet,
    mutation,
    result: {
      get current() {
        return hook.result.current;
      },
      rerender: hook.rerender,
    },
    snackbar,
  };
}

describe('useQuickLogSheetController', () => {
  it('renders unavailable state without calling mutation when care context is missing', () => {
    const { mutation, result, snackbar } = renderController({ care: null });

    expect(result.current.status).toBe('unavailable');
    expect(result.current.unavailableReason).toBe('permission-denied');

    const returnValue = result.current.logTracker('feeding_meal');

    expect(returnValue).toBeUndefined();
    expect(mutation.mutate).not.toHaveBeenCalled();
    expect(snackbar.showSnackbar).not.toHaveBeenCalled();
  });

  it('logs trackers without awaiting queue or network work', () => {
    const mutation = createMutationPort();
    const pendingMutation = new Promise(() => undefined);

    mutation.mutate.mockReturnValue(pendingMutation);

    const { closeSheet, result, snackbar } = renderController({ mutation });

    const returnValue = result.current.logTracker('feeding_meal');

    expect(returnValue).toBeUndefined();
    expect(mutation.mutate).toHaveBeenCalledWith(expect.objectContaining({
      requestId: expect.stringMatching(/^quick-log:/),
      variables: {
        householdId,
        occurredAt: now.toISOString(),
        puppyId,
        todayDate: '2026-05-27',
        trackerId: 'feeding_meal',
      },
    }));
    expect(snackbar.showSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.stringMatching(/^quick-log:/),
      messageKey: 'quick-log.snackbar.saved-template',
      tone: 'success',
    }));
    expect(closeSheet).toHaveBeenCalledTimes(1);
  });

  it('replaces the post-dismiss success snackbar when mutation failure arrives', () => {
    const analytics = createAnalyticsPort();
    const {
      mutation,
      result,
      result: hook,
      snackbar,
    } = renderController({ analytics });

    result.current.logTracker('feeding_meal');

    const requestId = requireRequestId(hook.current.lastRequestId);

    hook.rerender({
      events: [{
        clientEventId,
        eventType: 'feeding',
        requestId,
        state: 'failed_retryable',
        trackerId: 'feeding_meal',
        type: 'failed',
      }],
    });

    expect(snackbar.replaceSnackbar).toHaveBeenCalledWith(expect.objectContaining({
      clientEventId,
      id: requestId,
      messageKey: 'quick-log.failed.snackbar',
      primaryActionKey: 'quick-log.failed.primary',
      secondaryActionKey: 'quick-log.failed.tertiary',
      tone: 'error',
    }));

    const message = snackbar.replaceSnackbar.mock.calls[0]?.[0];

    message?.onSecondaryAction?.();

    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'pending_quick_log_deleted',
      properties: {
        event_type: 'feeding',
        pending_age_bucket: 'unknown',
      },
    });

    message?.onPrimaryAction?.();

    expect(mutation.retry).toHaveBeenCalledWith(clientEventId, 'manual_retry');
  });

  it('records pending undo intent and applies it when mutation context arrives', () => {
    const { mutation, result } = renderController();

    result.current.logTracker('feeding_meal');

    const requestId = requireRequestId(result.current.lastRequestId);

    result.current.undo(requestId);

    expect(mutation.undo).not.toHaveBeenCalled();

    result.rerender({
      events: [{
        clientEventId,
        eventType: 'feeding',
        requestId,
        trackerId: 'feeding_meal',
        type: 'started',
      }],
    });

    expect(mutation.undo).toHaveBeenCalledWith(expect.objectContaining({
      clientEventId,
      eventType: 'feeding',
      householdId,
      puppyId,
      todayDate: '2026-05-27',
    }));
  });

  it('tracks Undo from the success snackbar when mutation context arrives', () => {
    const analytics = createAnalyticsPort();
    const { mutation, result, snackbar } = renderController({ analytics });

    result.current.logTracker('feeding_meal');

    const requestId = requireRequestId(result.current.lastRequestId);
    const message = snackbar.showSnackbar.mock.calls[0]?.[0];

    message?.onPrimaryAction?.();
    expect(mutation.undo).not.toHaveBeenCalled();

    result.rerender({
      events: [{
        clientEventId,
        eventType: 'feeding',
        requestId,
        trackerId: 'feeding_meal',
        type: 'started',
      }],
    });

    expect(mutation.undo).toHaveBeenCalledWith(expect.objectContaining({
      clientEventId,
      eventType: 'feeding',
    }));
    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'undo_used',
      properties: {
        event_type: 'feeding',
        seconds_after_log_bucket: 'unknown',
      },
    });
  });

  it('keeps duplicate warning non-blocking when user chooses Add anyway', () => {
    const analytics = createAnalyticsPort();
    const { mutation, result } = renderController({
      analytics,
      lastLoggedAtMs: now.getTime() - 30_000,
    });

    act(() => {
      result.current.logTracker('feeding_meal');
    });

    expect(result.current.duplicateWarning).toEqual(expect.objectContaining({
      trackerId: 'feeding_meal',
    }));
    expect(mutation.mutate).not.toHaveBeenCalled();
    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'duplicate_warning_seen',
      properties: {
        event_type: 'feeding',
        time_since_previous_bucket: 'under_60s',
      },
    });

    act(() => {
      result.current.confirmDuplicate();
    });

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
    expect(result.current.duplicateWarning).toBeNull();
    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'duplicate_warning_confirmed',
      properties: {
        event_type: 'feeding',
      },
    });
  });

  it('tracks undo through stable analytics categories', () => {
    const analytics = createAnalyticsPort();
    const { result } = renderController({ analytics });

    result.current.undoLocal({
      clientEventId,
      eventType: 'feeding',
      householdId,
      puppyId,
      todayDate: '2026-05-27',
    });

    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'undo_used',
      properties: {
        event_type: 'feeding',
        seconds_after_log_bucket: 'unknown',
      },
    });
  });

  it('tracks local-row delete through stable analytics categories', () => {
    const analytics = createAnalyticsPort();
    const { mutation, result } = renderController({ analytics });

    result.current.deleteLocal({
      clientEventId,
      eventType: 'feeding',
    });

    expect(analytics.trackQuickLogEvent).toHaveBeenCalledWith({
      name: 'pending_quick_log_deleted',
      properties: {
        event_type: 'feeding',
        pending_age_bucket: 'unknown',
      },
    });
    expect(mutation.deleteLocal).toHaveBeenCalledWith(clientEventId);
  });

  it('marks Quick Log sheet retry actions as manual retries', () => {
    const { mutation, result } = renderController();

    result.current.retry(clientEventId);

    expect(mutation.retry).toHaveBeenCalledWith(clientEventId, 'manual_retry');
  });
});

function requireRequestId(requestId: string | null): string {
  if (requestId === null) {
    throw new Error('Expected Quick Log request id');
  }

  return requestId;
}
