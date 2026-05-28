import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  shouldShowQuickLogDuplicateCareWarning,
} from '@/contracts/business-rules';
import {
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import type { EventLogInsert } from '@/contracts/supabase';
import type { I18nKey, I18nTOptions } from '@/lib/i18n';
import {
  getQuickLogTrackerLabelKey,
  type QuickLogEventUndoRequest,
  type QuickLogSurfaceCareContext,
} from '@/lib/query/quick-log-event-view';
import type { QuickLogMutationVariables } from '@/lib/query/quick-log';

export type QuickLogCareContext = QuickLogSurfaceCareContext;

export type QuickLogRecentEvent = Readonly<{
  occurredAtMs: number;
  trackerId: QuickLogTrackerId;
}>;

export type QuickLogMutationRequest = Readonly<{
  requestId: string;
  variables: QuickLogMutationVariables;
}>;

export type QuickLogUndoRequest = QuickLogEventUndoRequest;

export type QuickLogMutationPort = Readonly<{
  deleteLocal: (clientEventId: string) => unknown;
  mutate: (request: QuickLogMutationRequest) => unknown;
  retry: (clientEventId: string) => unknown;
  undo: (request: QuickLogUndoRequest) => unknown;
}>;

export type QuickLogSnackbarMessage = Readonly<{
  accessibilityLabelKey: I18nKey;
  accessibilityOptionKeys?: Readonly<Record<string, I18nKey>>;
  accessibilityOptions?: I18nTOptions;
  clientEventId?: string;
  id: string;
  messageKey: I18nKey;
  messageOptionKeys?: Readonly<Record<string, I18nKey>>;
  messageOptions?: I18nTOptions;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryActionKey?: I18nKey;
  secondaryActionKey?: I18nKey;
  tone: 'success' | 'error' | 'warning' | 'info';
}>;

export type QuickLogSnackbarPort = Readonly<{
  dismissSnackbar: (id?: string) => void;
  replaceSnackbar: (message: QuickLogSnackbarMessage) => void;
  showSnackbar: (message: QuickLogSnackbarMessage) => void;
}>;

export type QuickLogMutationFeedbackPort = Readonly<{
  applyMutationEvents: (input: Readonly<{
    careContext: QuickLogCareContext | null;
    mutation: QuickLogMutationPort;
    mutationEvents: readonly QuickLogMutationEvent[];
  }>) => void;
  undoRequest: (input: Readonly<{
    careContext: QuickLogCareContext | null;
    mutation: QuickLogMutationPort;
    requestId: string;
  }>) => void;
}>;

export type QuickLogFeedbackPort = QuickLogMutationFeedbackPort & Readonly<{
  snackbar: QuickLogSnackbarPort;
}>;

export type QuickLogMutationEvent =
  | Readonly<{
    clientEventId: string;
    eventType: EventLogInsert['event_type'];
    requestId: string;
    trackerId: QuickLogTrackerId;
    type: 'started';
  }>
  | Readonly<{
    clientEventId: string;
    eventType: EventLogInsert['event_type'];
    requestId: string;
    state: 'failed_retryable' | 'failed_permanent';
    trackerId: QuickLogTrackerId;
    type: 'failed';
  }>;

export type QuickLogDuplicateWarning = Readonly<{
  trackerId: QuickLogTrackerId;
}>;

export type QuickLogSheetController = Readonly<{
  cancelDuplicate: () => void;
  confirmDuplicate: () => void;
  deleteLocal: (clientEventId: string) => void;
  readonly duplicateWarning: QuickLogDuplicateWarning | null;
  logTracker: (trackerId: QuickLogTrackerId) => void;
  retry: (clientEventId: string) => void;
  status: 'ready' | 'unavailable';
  undo: (requestId: string) => void;
  undoLocal: (request: QuickLogUndoRequest) => void;
  unavailableReason: 'permission-denied' | null;
  readonly lastRequestId: string | null;
}>;

export type UseQuickLogSheetControllerInput = Readonly<{
  careContext: QuickLogCareContext | null;
  closeSheet: () => void;
  createRequestId?: () => string;
  feedback: QuickLogFeedbackPort;
  mutation: QuickLogMutationPort;
  mutationEvents?: readonly QuickLogMutationEvent[];
  now?: () => Date;
  recentEvent?: QuickLogRecentEvent | null;
}>;

let quickLogRequestCounter = 0;

export function useQuickLogSheetController({
  careContext,
  closeSheet,
  createRequestId = createDefaultRequestId,
  feedback,
  mutation,
  mutationEvents = [],
  now = () => new Date(),
  recentEvent = null,
}: UseQuickLogSheetControllerInput): QuickLogSheetController {
  const duplicateWarningRef = useRef<QuickLogDuplicateWarning | null>(null);
  const lastRequestIdRef = useRef<string | null>(null);
  const pendingDuplicateRef = useRef<QuickLogTrackerId | null>(null);
  const [, forceRender] = useState(0);

  const rerender = useCallback(() => {
    forceRender((version) => version + 1);
  }, []);

  const clearDuplicateWarning = useCallback(() => {
    duplicateWarningRef.current = null;
    pendingDuplicateRef.current = null;
    rerender();
  }, [rerender]);

  const undoRequest = useCallback((requestId: string) => {
    feedback.undoRequest({
      careContext,
      mutation,
      requestId,
    });
  }, [careContext, feedback, mutation]);

  const commitTracker = useCallback((trackerId: QuickLogTrackerId) => {
    if (careContext === null) {
      return;
    }

    const requestId = createRequestId();
    const occurredAt = now().toISOString();

    lastRequestIdRef.current = requestId;
    feedback.snackbar.showSnackbar({
      accessibilityLabelKey: 'quick-log.snackbar.a11y',
      accessibilityOptionKeys: {
        trackerName: getQuickLogTrackerLabelKey(trackerId),
      },
      id: requestId,
      messageKey: 'quick-log.snackbar.saved-template',
      messageOptionKeys: {
        trackerName: getQuickLogTrackerLabelKey(trackerId),
      },
      onPrimaryAction: () => {
        undoRequest(requestId);
      },
      primaryActionKey: 'quick-log.snackbar.undo',
      tone: 'success',
    });
    closeSheet();
    mutation.mutate({
      requestId,
      variables: {
        householdId: careContext.householdId,
        occurredAt,
        puppyId: careContext.puppyId,
        todayDate: careContext.todayDate,
        trackerId,
      },
    });
  }, [careContext, closeSheet, createRequestId, feedback, mutation, now, undoRequest]);

  const logTracker = useCallback((trackerId: QuickLogTrackerId): void => {
    if (careContext === null) {
      return;
    }

    const currentNowMs = now().getTime();

    if (
      recentEvent !== null
      && shouldShowQuickLogDuplicateCareWarning({
        nextOccurredAtMs: currentNowMs,
        nextTrackerId: trackerId,
        previousOccurredAtMs: recentEvent.occurredAtMs,
        previousTrackerId: recentEvent.trackerId,
      })
    ) {
      duplicateWarningRef.current = {
        trackerId,
      };
      pendingDuplicateRef.current = trackerId;
      rerender();
      return;
    }

    commitTracker(trackerId);
  }, [careContext, commitTracker, now, recentEvent, rerender]);

  const confirmDuplicate = useCallback(() => {
    const trackerId = pendingDuplicateRef.current;

    clearDuplicateWarning();

    if (trackerId) {
      commitTracker(trackerId);
    }
  }, [clearDuplicateWarning, commitTracker]);

  const undo = useCallback((requestId: string) => {
    undoRequest(requestId);
  }, [undoRequest]);

  useEffect(() => {
    feedback.applyMutationEvents({
      careContext,
      mutation,
      mutationEvents,
    });
  }, [careContext, feedback, mutation, mutationEvents]);

  return useMemo<QuickLogSheetController>(() => ({
    cancelDuplicate: clearDuplicateWarning,
    confirmDuplicate,
    deleteLocal: (clientEventId) => {
      mutation.deleteLocal(clientEventId);
    },
    get duplicateWarning() {
      return duplicateWarningRef.current;
    },
    get lastRequestId() {
      return lastRequestIdRef.current;
    },
    logTracker,
    retry: (clientEventId) => {
      mutation.retry(clientEventId);
    },
    status: careContext === null
      ? 'unavailable'
      : 'ready',
    undo,
    undoLocal: (request) => {
      mutation.undo(request);
    },
    unavailableReason: careContext === null
      ? 'permission-denied'
      : null,
  }), [
    careContext,
    clearDuplicateWarning,
    confirmDuplicate,
    logTracker,
    mutation,
    undo,
  ]);
}

export { getQuickLogTrackerLabelKey };

function createDefaultRequestId() {
  quickLogRequestCounter += 1;

  return `quick-log:${Date.now()}:${quickLogRequestCounter}`;
}
