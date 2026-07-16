import { useCallback } from 'react';

import { useSnackbar } from '@/design/primitives/Snackbar';
import { useAppTranslation } from '@/lib/i18n';
import type { QuickLogEventDeleteRequest } from '@/lib/query/quick-log-event-view';
import type { QuickLogMutationPort } from '@/lib/query/quick-log';

const SYNCED_DELETE_UNDO_DURATION_MS = 5_000;

export function useSyncedQuickLogDeleteUndo(
  mutation: QuickLogMutationPort | undefined,
): (request: QuickLogEventDeleteRequest) => Promise<void> {
  const { t } = useAppTranslation();
  const snackbar = useSnackbar();

  return useCallback(async (request) => {
    if (mutation === undefined) {
      return;
    }

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

    await mutation.deleteSynced(restoreRequest)
      .then(() => {
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
              void mutation.restoreSynced(restoreRequest)
                .then(() => {
                  snackbar.dismissSnackbar(snackbarId);
                })
                .catch(() => {
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
      })
      .catch(() => {
        // Not `quick-log.failed.*`: that copy says the entry couldn't be *saved*, which is the
        // opposite of what was asked for here and reads as if the delete had gone through.
        snackbar.showSnackbar({
          accessibilityLabel: t('timeline.delete-failed'),
          clientEventId: request.clientEventId,
          hapticEvent: 'error',
          id: `quick-log-synced-delete-error:${request.clientEventId}`,
          message: t('timeline.delete-failed'),
          tone: 'error',
        });
      });
  }, [mutation, snackbar, t]);
}
