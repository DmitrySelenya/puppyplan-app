import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type QuickLogDuplicateCareWarningPayload,
  shouldShowQuickLogDuplicateCareWarning,
} from '@/contracts/business-rules';
import type {
  QuickLogRecoverySurface,
  QuickLogSourceSurface,
} from '@/contracts/analytics';
import {
  getQuickLogDetailTrackerIdForEventType,
  quickLogTrackerDefinitions,
  type QuickLogEventType,
  type QuickLogNonPottyTrackerId,
  type QuickLogPottySubtype,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import { noopAnalyticsClient, type QuickLogAnalyticsClient } from '@/lib/analytics';
import type { I18nKey, I18nTOptions } from '@/lib/i18n';
import {
  getQuickLogTrackerLabelKey,
  type QuickLogEventEditRequest,
  type QuickLogEventUndoRequest,
  type QuickLogSurfaceCareContext,
} from '@/lib/query/quick-log-event-view';
import {
  createQuickLogClientEventId,
  type QuickLogMutationVariables,
} from '@/lib/query/quick-log';
import type { DesignHapticEvent } from '@/design/haptics';

export type QuickLogCareContext = QuickLogSurfaceCareContext;

export type QuickLogRecentEvent = Readonly<{
  occurredAtMs: number;
  payload?: QuickLogDuplicateCareWarningPayload;
  trackerId: QuickLogTrackerId;
}>;

export type QuickLogMutationRequest = Readonly<{
  requestId: string;
  variables: QuickLogMutationVariables;
}>;

export type QuickLogUndoRequest = QuickLogEventUndoRequest;
export type QuickLogDeleteRequest = Readonly<{
  clientEventId: string;
  eventType: QuickLogEventType;
}>;

export type QuickLogMutationPort = Readonly<{
  deleteLocal: (clientEventId: string) => unknown;
  mutate: (request: QuickLogMutationRequest) => unknown;
  retry: (
    clientEventId: string,
    recoverySurface: QuickLogRecoverySurface,
    sourceSurface?: QuickLogSourceSurface,
  ) => unknown;
  undo: (request: QuickLogUndoRequest) => unknown;
}>;

export type QuickLogSnackbarMessage = Readonly<{
  accessibilityLabelKey: I18nKey;
  accessibilityOptionKeys?: Readonly<Record<string, I18nKey>>;
  accessibilityOptions?: I18nTOptions;
  clientEventId?: string;
  hapticEvent?: DesignHapticEvent;
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
  analytics: QuickLogAnalyticsClient;
  snackbar: QuickLogSnackbarPort;
}>;

export type QuickLogMutationEvent =
  | Readonly<{
    clientEventId: string;
    eventType: QuickLogEventType;
    requestId: string;
    trackerId: QuickLogTrackerId;
    type: 'started';
  }>
  | Readonly<{
    clientEventId: string;
    eventType: QuickLogEventType;
    requestId: string;
    state: 'failed_retryable' | 'failed_permanent';
    trackerId: QuickLogTrackerId;
    type: 'failed';
  }>;

export type QuickLogDuplicateWarning = Readonly<{
  trackerId: QuickLogTrackerId;
}>;

export type QuickLogTrackerLogRequest =
  | Readonly<{
    pottySubtype: QuickLogPottySubtype;
    trackerId: 'potty';
  }>
  | Readonly<{
    trackerId: QuickLogNonPottyTrackerId;
  }>;

export type QuickLogSheetController = Readonly<{
  cancelDuplicate: () => void;
  confirmDuplicate: () => void;
  deleteLocal: (request: QuickLogDeleteRequest) => void;
  readonly duplicateWarning: QuickLogDuplicateWarning | null;
  logTracker: (request: QuickLogTrackerLogRequest) => void;
  retry: (clientEventId: string) => void;
  status: 'ready' | 'unavailable';
  undo: (requestId: string) => void;
  undoLocal: (request: QuickLogUndoRequest) => void;
  unavailableReason: 'permission-denied' | null;
  readonly lastRequestId: string | null;
}>;

export type UseQuickLogSheetControllerInput = Readonly<{
  analytics?: QuickLogAnalyticsClient;
  careContext: QuickLogCareContext | null;
  closeSheet: () => void;
  createClientEventId?: () => string;
  createRequestId?: () => string;
  feedback: QuickLogFeedbackPort;
  mutation: QuickLogMutationPort;
  mutationEvents?: readonly QuickLogMutationEvent[];
  now?: () => Date;
  openDetails?: (request: QuickLogEventEditRequest) => void;
  recentEvent?: QuickLogRecentEvent | null;
  recentEvents?: readonly QuickLogRecentEvent[];
}>;

let quickLogRequestCounter = 0;

export function useQuickLogSheetController({
  analytics = noopAnalyticsClient,
  careContext,
  closeSheet,
  createClientEventId = createQuickLogClientEventId,
  createRequestId = createDefaultRequestId,
  feedback,
  mutation,
  mutationEvents = [],
  now = () => new Date(),
  openDetails,
  recentEvent = null,
  recentEvents = [],
}: UseQuickLogSheetControllerInput): QuickLogSheetController {
  const duplicateWarningRef = useRef<QuickLogDuplicateWarning | null>(null);
  const lastRequestIdRef = useRef<string | null>(null);
  const pendingDuplicateRef = useRef<QuickLogTrackerLogRequest | null>(null);
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

  const commitTracker = useCallback((request: QuickLogTrackerLogRequest) => {
    if (careContext === null) {
      return;
    }

    const trackerId = request.trackerId;
    const requestId = createRequestId();
    const clientEventId = createClientEventId();
    const occurredAt = now().toISOString();
    const eventType = quickLogTrackerDefinitions[trackerId].event_type;
    const detailTrackerId = getQuickLogDetailTrackerIdForEventType(eventType);
    const detailsRequest = detailTrackerId === null
      ? null
      : {
          clientEventId,
          eventType,
          householdId: careContext.householdId,
          puppyId: careContext.puppyId,
          todayDate: careContext.todayDate,
          trackerId: detailTrackerId,
        } satisfies QuickLogEventEditRequest;

    lastRequestIdRef.current = requestId;
    feedback.snackbar.showSnackbar({
      accessibilityLabelKey: detailsRequest === null || openDetails === undefined
        ? 'quick-log.snackbar.a11y'
        : 'quick-log.snackbar.a11y-with-details',
      accessibilityOptionKeys: {
        trackerName: getQuickLogTrackerLabelKey(trackerId),
      },
      clientEventId,
      hapticEvent: 'saveSuccess',
      id: requestId,
      messageKey: 'quick-log.snackbar.saved-template',
      messageOptionKeys: {
        trackerName: getQuickLogTrackerLabelKey(trackerId),
      },
      onPrimaryAction: () => {
        undoRequest(requestId);
      },
      onSecondaryAction: detailsRequest === null || openDetails === undefined
        ? undefined
        : () => openDetails(detailsRequest),
      primaryActionKey: 'quick-log.snackbar.undo',
      secondaryActionKey: detailsRequest === null || openDetails === undefined
        ? undefined
        : 'quick-log.snackbar.add-details',
      tone: 'success',
    });
    closeSheet();
    const variables: QuickLogMutationVariables = trackerId === 'potty'
      ? {
          clientEventId,
          householdId: careContext.householdId,
          occurredAt,
          pottySubtype: request.pottySubtype,
          puppyId: careContext.puppyId,
          todayDate: careContext.todayDate,
          trackerId,
        }
      : {
          clientEventId,
          householdId: careContext.householdId,
          occurredAt,
          puppyId: careContext.puppyId,
          todayDate: careContext.todayDate,
          trackerId,
        };

    mutation.mutate({
      requestId,
      variables,
    });
  }, [
    careContext,
    closeSheet,
    createClientEventId,
    createRequestId,
    feedback,
    mutation,
    now,
    openDetails,
    undoRequest,
  ]);

  const logTracker = useCallback((request: QuickLogTrackerLogRequest): void => {
    if (careContext === null) {
      return;
    }

    const currentNowMs = now().getTime();
    const trackerId = request.trackerId;

    const duplicateSource = findDuplicateWarningSource([
      ...recentEvents,
      ...(recentEvent === null ? [] : [recentEvent]),
    ], {
      nextOccurredAtMs: currentNowMs,
      nextPayload: getQuickLogPayloadForDuplicateCheck(request),
      nextTrackerId: trackerId,
    });

    if (duplicateSource !== null) {
      duplicateWarningRef.current = {
        trackerId,
      };
      pendingDuplicateRef.current = request;
      analytics.trackQuickLogEvent({
        name: 'duplicate_warning_seen',
        properties: {
          event_type: quickLogTrackerDefinitions[trackerId].event_type,
          time_since_previous_bucket: bucketDuplicateWarningMs(
            currentNowMs - duplicateSource.occurredAtMs,
          ),
        },
      });
      rerender();
      return;
    }

    commitTracker(request);
  }, [analytics, careContext, commitTracker, now, recentEvent, recentEvents, rerender]);

  const confirmDuplicate = useCallback(() => {
    const request = pendingDuplicateRef.current;

    clearDuplicateWarning();

    if (request) {
      analytics.trackQuickLogEvent({
        name: 'duplicate_warning_confirmed',
        properties: {
          event_type: quickLogTrackerDefinitions[request.trackerId].event_type,
        },
      });
      commitTracker(request);
    }
  }, [analytics, clearDuplicateWarning, commitTracker]);

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
    deleteLocal: (request) => {
      analytics.trackQuickLogEvent({
        name: 'pending_quick_log_deleted',
        properties: {
          event_type: request.eventType,
          pending_age_bucket: 'unknown',
        },
      });
      mutation.deleteLocal(request.clientEventId);
    },
    get duplicateWarning() {
      return duplicateWarningRef.current;
    },
    get lastRequestId() {
      return lastRequestIdRef.current;
    },
    logTracker,
    retry: (clientEventId) => {
      mutation.retry(clientEventId, 'manual_retry');
    },
    status: careContext === null
      ? 'unavailable'
      : 'ready',
    undo,
    undoLocal: (request) => {
      analytics.trackQuickLogEvent({
        name: 'undo_used',
        properties: {
          event_type: request.eventType,
          seconds_after_log_bucket: 'unknown',
        },
      });
      mutation.undo(request);
    },
    unavailableReason: careContext === null
      ? 'permission-denied'
      : null,
  }), [
    careContext,
    analytics,
    clearDuplicateWarning,
    confirmDuplicate,
    logTracker,
    mutation,
    undo,
  ]);
}

function bucketDuplicateWarningMs(elapsedMs: number): 'under_3s' | 'under_60s' {
  // under_3s is intentional: it preserves the accidental double-tap window in telemetry.
  return elapsedMs <= 3_000 ? 'under_3s' : 'under_60s';
}

function findDuplicateWarningSource(
  recentEvents: readonly QuickLogRecentEvent[],
  input: Readonly<{
    nextOccurredAtMs: number;
    nextPayload?: QuickLogDuplicateCareWarningPayload;
    nextTrackerId: QuickLogTrackerId;
  }>,
): QuickLogRecentEvent | null {
  let match: QuickLogRecentEvent | null = null;

  for (const event of recentEvents) {
    if (!shouldShowQuickLogDuplicateCareWarning({
      nextOccurredAtMs: input.nextOccurredAtMs,
      nextPayload: input.nextPayload,
      nextTrackerId: input.nextTrackerId,
      previousPayload: event.payload,
      previousOccurredAtMs: event.occurredAtMs,
      previousTrackerId: event.trackerId,
    })) {
      continue;
    }

    if (match === null || event.occurredAtMs > match.occurredAtMs) {
      match = event;
    }
  }

  return match;
}

function getQuickLogPayloadForDuplicateCheck(
  request: QuickLogTrackerLogRequest,
): QuickLogDuplicateCareWarningPayload | undefined {
  return request.trackerId === 'potty'
    ? { subtype: request.pottySubtype }
    : undefined;
}

export { getQuickLogTrackerLabelKey };

function createDefaultRequestId() {
  quickLogRequestCounter += 1;

  return `quick-log:${Date.now()}:${quickLogRequestCounter}`;
}
