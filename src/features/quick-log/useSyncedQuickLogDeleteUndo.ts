import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useSnackbar } from '@/design/primitives/Snackbar';
import { useAppTranslation } from '@/lib/i18n';
import { createObservabilityReporter } from '@/lib/observability';
import type { QuickLogEventDeleteRequest } from '@/lib/query/quick-log-event-view';
import type { QuickLogMutationPort } from '@/lib/query/quick-log';

const SYNCED_DELETE_UNDO_DURATION_MS = 5_000;

type SyncedQuickLogDeleteOptions = Readonly<{
  /**
   * Suppresses the success "Entry deleted / Undo" snackbar (used by routine un-check, which is a
   * plain toggle). Failures are still surfaced — a silent delete failure would lose data with no
   * trace.
   */
  silent?: boolean;
}>;

export function useSyncedQuickLogDeleteUndo(
  mutation: QuickLogMutationPort | undefined,
): (request: QuickLogEventDeleteRequest, options?: SyncedQuickLogDeleteOptions) => Promise<void> {
  const { t } = useAppTranslation();
  const snackbar = useSnackbar();
  const observability = useMemo(() => createObservabilityReporter(), []);
  const activeSnackbarIdsRef = useRef(new Set<string>());
  const snackbarRef = useRef(snackbar);
  // Production ports always expose actorId. The object fallback keeps older adapters inertly
  // compatible while ensuring same-actor production port replacement does not cancel Undo.
  const mutationIdentity = mutation?.actorId ?? mutation ?? null;
  const currentMutationIdentityRef = useRef(mutationIdentity);
  const previousMutationIdentityRef = useRef(mutationIdentity);
  snackbarRef.current = snackbar;
  currentMutationIdentityRef.current = mutationIdentity;

  useEffect(() => {
    if (previousMutationIdentityRef.current === mutationIdentity) {
      return;
    }

    for (const snackbarId of activeSnackbarIdsRef.current) {
      snackbarRef.current.dismissSnackbar(snackbarId);
    }
    activeSnackbarIdsRef.current.clear();
    previousMutationIdentityRef.current = mutationIdentity;
  }, [mutationIdentity]);

  useEffect(() => () => {
    currentMutationIdentityRef.current = null;
    for (const snackbarId of activeSnackbarIdsRef.current) {
      snackbarRef.current.dismissSnackbar(snackbarId);
    }
    activeSnackbarIdsRef.current.clear();
  }, []);

  return useCallback(async (request, options) => {
    if (mutation === undefined) {
      return;
    }

    const silent = options?.silent === true;

    if (request.status !== 'synced') {
      mutation.deleteLocal(request.clientEventId);
      return;
    }

    const restoreRequest = {
      clientEventId: request.clientEventId,
      eventType: request.eventType,
      householdId: request.householdId,
      puppyId: request.puppyId,
      todayDate: request.todayDate,
    };
    const snackbarId = `quick-log-synced-delete:${request.clientEventId}`;
    const ownsSnackbarAction = (activeSnackbarId: string): boolean =>
      currentMutationIdentityRef.current === mutationIdentity
      && activeSnackbarIdsRef.current.has(activeSnackbarId);
    const dismissOwnedSnackbar = (activeSnackbarId: string): void => {
      activeSnackbarIdsRef.current.delete(activeSnackbarId);
      snackbar.dismissSnackbar(activeSnackbarId);
    };
    const showDeleteUndoSnackbar = (): void => {
      if (currentMutationIdentityRef.current !== mutationIdentity) {
        return;
      }
      activeSnackbarIdsRef.current.add(snackbarId);
      snackbar.showSnackbar({
        accessibilityLabel: t('timeline.delete-snackbar'),
        clientEventId: request.clientEventId,
        durationMs: SYNCED_DELETE_UNDO_DURATION_MS,
        hapticEvent: 'warning',
        id: snackbarId,
        message: t('timeline.delete-snackbar'),
        primaryAction: {
          accessibilityLabel: t('quick-log.snackbar.undo'),
          label: t('quick-log.snackbar.undo'),
          onPress: () => {
            if (!ownsSnackbarAction(snackbarId)) {
              return;
            }
            void mutation.restoreSynced(restoreRequest)
              .then(() => {
                dismissOwnedSnackbar(snackbarId);
              })
              .catch(() => {
                if (!ownsSnackbarAction(snackbarId)) {
                  return;
                }
                snackbar.replaceSnackbar({
                  accessibilityLabel: t('quick-log.failed.generic'),
                  clientEventId: request.clientEventId,
                  hapticEvent: 'error',
                  id: snackbarId,
                  message: t('quick-log.failed.snackbar'),
                  tone: 'error',
                });
              });
          },
        },
        tone: 'warning',
      });
    };

    await mutation.deleteSynced(restoreRequest)
      .then(() => {
        if (!silent) {
          showDeleteUndoSnackbar();
        }
      })
      .catch(() => {
        if (currentMutationIdentityRef.current !== mutationIdentity) {
          return;
        }
        // Not `quick-log.failed.*`: that copy says the entry couldn't be *saved*, which is the
        // opposite of what was asked for here and reads as if the delete had gone through.
        const errorSnackbarId = `quick-log-synced-delete-error:${request.clientEventId}`;
        const retryDelete = (): void => {
          if (!ownsSnackbarAction(errorSnackbarId)) {
            return;
          }
          void mutation.deleteSynced(restoreRequest)
            .then(() => {
              dismissOwnedSnackbar(errorSnackbarId);
              showDeleteUndoSnackbar();
            })
            .catch(() => {
              if (!ownsSnackbarAction(errorSnackbarId)) {
                return;
              }
              observability.captureException(
                new Error('Quick Log synced delete retry failed'),
                {
                  area: 'quick_log_queue',
                  operation: 'synced_delete_retry',
                },
              );
              snackbar.replaceSnackbar({
                accessibilityLabel: t('timeline.delete-failed'),
                clientEventId: request.clientEventId,
                hapticEvent: 'error',
                id: errorSnackbarId,
                message: t('timeline.delete-failed'),
                primaryAction: {
                  accessibilityLabel: t('quick-log.failed.primary'),
                  label: t('quick-log.failed.primary'),
                  onPress: retryDelete,
                },
                tone: 'error',
              });
            });
        };
        activeSnackbarIdsRef.current.add(errorSnackbarId);
        snackbar.showSnackbar({
          accessibilityLabel: t('timeline.delete-failed'),
          clientEventId: request.clientEventId,
          hapticEvent: 'error',
          id: errorSnackbarId,
          message: t('timeline.delete-failed'),
          primaryAction: {
            accessibilityLabel: t('quick-log.failed.primary'),
            label: t('quick-log.failed.primary'),
            onPress: retryDelete,
          },
          tone: 'error',
        });
      });
  }, [mutation, mutationIdentity, observability, snackbar, t]);
}
