import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from 'react';

import { useSnackbar, type SnackbarController } from '@/design/primitives/Snackbar';
import { useAppTranslation, type I18nKey, type I18nTOptions } from '@/lib/i18n';

import type {
  QuickLogCareContext,
  QuickLogFeedbackPort,
  QuickLogMutationEvent,
  QuickLogMutationPort,
  QuickLogSnackbarMessage,
  QuickLogSnackbarPort,
} from './useQuickLogSheetController';

type QuickLogStartedContext = Readonly<{
  clientEventId: string;
  eventType: QuickLogMutationEvent['eventType'];
  trackerId: QuickLogMutationEvent['trackerId'];
}>;

type QuickLogFeedbackState = {
  pendingUndoRequestIds: Set<string>;
  processedMutationEvents: Set<string>;
  requestContexts: Map<string, QuickLogStartedContext>;
  undoneRequestIds: Set<string>;
};

export type QuickLogFeedbackController = QuickLogFeedbackPort;

const QuickLogFeedbackContext = createContext<QuickLogFeedbackController | null>(null);

export function QuickLogFeedbackProvider({ children }: PropsWithChildren) {
  const { t } = useAppTranslation();
  const designSnackbar = useSnackbar();
  const snackbar = useMemo(
    () => createTranslatedSnackbarPort(designSnackbar, t),
    [designSnackbar, t],
  );
  const feedbackStateRef = useRef<QuickLogFeedbackState | null>(null);
  if (feedbackStateRef.current === null) {
    feedbackStateRef.current = createQuickLogFeedbackState();
  }

  const controller = useMemo<QuickLogFeedbackController>(
    () => createQuickLogFeedbackController({
      snackbar,
      state: requireQuickLogFeedbackState(feedbackStateRef.current),
    }),
    [snackbar],
  );

  return (
    <QuickLogFeedbackContext.Provider value={controller}>
      {children}
    </QuickLogFeedbackContext.Provider>
  );
}

export function useQuickLogFeedback(): QuickLogFeedbackController {
  const controller = useContext(QuickLogFeedbackContext);

  if (controller === null) {
    throw new Error('useQuickLogFeedback must be used within QuickLogFeedbackProvider');
  }

  return controller;
}

export function QuickLogMutationFeedbackObserver({
  careContext,
  mutation,
  mutationEvents,
}: {
  careContext: QuickLogCareContext | null;
  mutation: QuickLogMutationPort;
  mutationEvents: readonly QuickLogMutationEvent[];
}) {
  const feedback = useQuickLogFeedback();

  useEffect(() => {
    feedback.applyMutationEvents({
      careContext,
      mutation,
      mutationEvents,
    });
  }, [careContext, feedback, mutation, mutationEvents]);

  return null;
}

export function createQuickLogFeedbackController({
  snackbar,
  state = createQuickLogFeedbackState(),
}: {
  snackbar: QuickLogSnackbarPort;
  state?: QuickLogFeedbackState;
}): QuickLogFeedbackController {
  const undoRequest: QuickLogFeedbackController['undoRequest'] = ({
    careContext,
    mutation,
    requestId,
  }) => {
    state.undoneRequestIds.add(requestId);
    const context = state.requestContexts.get(requestId);

    if (!context || careContext === null) {
      state.pendingUndoRequestIds.add(requestId);
      return;
    }

    state.pendingUndoRequestIds.delete(requestId);
    mutation.undo({
      clientEventId: context.clientEventId,
      eventType: context.eventType,
      householdId: careContext.householdId,
      puppyId: careContext.puppyId,
      todayDate: careContext.todayDate,
    });
    snackbar.dismissSnackbar(requestId);
  };

  const applyMutationEvents: QuickLogFeedbackController['applyMutationEvents'] = ({
    careContext,
    mutation,
    mutationEvents,
  }) => {
    for (const event of mutationEvents) {
      const eventKey = `${event.type}:${event.requestId}:${event.clientEventId}:${'state' in event ? event.state : 'started'}`;

      if (state.processedMutationEvents.has(eventKey)) {
        continue;
      }

      state.processedMutationEvents.add(eventKey);

      if (event.type === 'started') {
        state.requestContexts.set(event.requestId, {
          clientEventId: event.clientEventId,
          eventType: event.eventType,
          trackerId: event.trackerId,
        });

        if (state.pendingUndoRequestIds.has(event.requestId) && careContext !== null) {
          state.pendingUndoRequestIds.delete(event.requestId);
          mutation.undo({
            clientEventId: event.clientEventId,
            eventType: event.eventType,
            householdId: careContext.householdId,
            puppyId: careContext.puppyId,
            todayDate: careContext.todayDate,
          });
          snackbar.dismissSnackbar(event.requestId);
        }

        continue;
      }

      if (state.undoneRequestIds.has(event.requestId)) {
        continue;
      }

      snackbar.replaceSnackbar({
        accessibilityLabelKey: 'quick-log.failed.generic',
        clientEventId: event.clientEventId,
        id: event.requestId,
        messageKey: 'quick-log.failed.snackbar',
        onPrimaryAction: () => {
          mutation.retry(event.clientEventId);
        },
        onSecondaryAction: () => {
          mutation.deleteLocal(event.clientEventId);
        },
        primaryActionKey: 'quick-log.failed.primary',
        secondaryActionKey: 'quick-log.failed.tertiary',
        tone: 'error',
      });
    }
  };

  return {
    applyMutationEvents,
    snackbar,
    undoRequest,
  };
}

function createQuickLogFeedbackState(): QuickLogFeedbackState {
  return {
    pendingUndoRequestIds: new Set<string>(),
    processedMutationEvents: new Set<string>(),
    requestContexts: new Map<string, QuickLogStartedContext>(),
    undoneRequestIds: new Set<string>(),
  };
}

function requireQuickLogFeedbackState(state: QuickLogFeedbackState | null): QuickLogFeedbackState {
  if (state === null) {
    throw new Error('Quick Log feedback state was not initialized');
  }

  return state;
}

function createTranslatedSnackbarPort(
  snackbar: SnackbarController,
  t: (key: I18nKey, options?: I18nTOptions) => string,
): QuickLogSnackbarPort {
  const resolveOptions = (
    options?: I18nTOptions,
    optionKeys?: Readonly<Record<string, I18nKey>>,
  ): I18nTOptions | undefined => {
    if (!options && !optionKeys) {
      return undefined;
    }

    return {
      ...(options ?? {}),
      ...Object.fromEntries(
        Object.entries(optionKeys ?? {}).map(([key, value]) => [
          key,
          t(value),
        ]),
      ),
    };
  };

  const resolveMessage = (message: QuickLogSnackbarMessage) => ({
    accessibilityLabel: t(
      message.accessibilityLabelKey,
      resolveOptions(message.accessibilityOptions, message.accessibilityOptionKeys),
    ),
    clientEventId: message.clientEventId,
    id: message.id,
    message: t(
      message.messageKey,
      resolveOptions(message.messageOptions, message.messageOptionKeys),
    ),
    primaryAction: message.primaryActionKey
      ? {
        label: t(message.primaryActionKey),
        onPress: message.onPrimaryAction ?? (() => undefined),
      }
      : undefined,
    secondaryAction: message.secondaryActionKey
      ? {
        label: t(message.secondaryActionKey),
        onPress: message.onSecondaryAction ?? (() => undefined),
      }
      : undefined,
    tone: message.tone,
  });

  return {
    dismissSnackbar: snackbar.dismissSnackbar,
    replaceSnackbar: (message) => {
      snackbar.replaceSnackbar(resolveMessage(message));
    },
    showSnackbar: (message) => {
      snackbar.showSnackbar(resolveMessage(message));
    },
  };
}
