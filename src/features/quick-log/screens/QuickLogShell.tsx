import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import {
  defaultQuickLogTrackerIds,
} from '@/contracts/quick-log';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { SheetSurface } from '@/design/primitives/SheetSurface';
import { Stack } from '@/design/primitives/Stack';
import { TrackerTile } from '@/design/primitives/TrackerTile';
import { useAppTranslation } from '@/lib/i18n';

import {
  QuickLogLocalEvents,
  type QuickLogLocalEventView,
} from '../components/QuickLogLocalEvents';
import { useQuickLogFeedback } from '../QuickLogFeedbackProvider';
import {
  getQuickLogTrackerLabelKey,
  useQuickLogSheetController,
  type QuickLogCareContext,
  type QuickLogFeedbackPort,
  type QuickLogMutationEvent,
  type QuickLogMutationPort,
  type QuickLogRecentEvent,
  type QuickLogSnackbarPort,
} from '../useQuickLogSheetController';

export type QuickLogShellProps = Readonly<{
  careContext?: QuickLogCareContext | null;
  closeSheet?: () => void;
  mutation?: QuickLogMutationPort;
  mutationEvents?: readonly QuickLogMutationEvent[];
  localEvents?: readonly QuickLogLocalEventView[];
  now?: () => Date;
  recentEvent?: QuickLogRecentEvent | null;
  snackbar?: QuickLogSnackbarPort;
}>;

export function QuickLogShell(props: QuickLogShellProps) {
  const feedback = useQuickLogFeedback();
  const snackbar = props.snackbar ?? feedback.snackbar;
  const controllerFeedback = useMemo<QuickLogFeedbackPort>(() => ({
    applyMutationEvents: feedback.applyMutationEvents,
    analytics: feedback.analytics,
    snackbar,
    undoRequest: feedback.undoRequest,
  }), [feedback.analytics, feedback.applyMutationEvents, feedback.undoRequest, snackbar]);

  return (
    <QuickLogShellContent
      {...props}
      feedback={controllerFeedback}
    />
  );
}

function QuickLogShellContent({
  careContext = null,
  closeSheet = () => undefined,
  feedback,
  localEvents = [],
  mutation,
  mutationEvents = [],
  now,
  recentEvent = null,
}: QuickLogShellProps & {
  feedback: QuickLogFeedbackPort;
}) {
  const { t } = useAppTranslation();
  const readyCareContext = mutation === undefined
    ? null
    : careContext;
  const controller = useQuickLogSheetController({
    analytics: feedback.analytics,
    careContext: readyCareContext,
    closeSheet,
    feedback,
    mutation: mutation ?? unavailableMutation,
    mutationEvents,
    now,
    recentEvent,
  });
  const selectedTrackerIds = readyCareContext?.selectedTrackerIds ?? defaultQuickLogTrackerIds;

  if (controller.status === 'unavailable') {
    return (
      <Screen contentStyle={styles.sheetContent} edges={['bottom']}>
        <SheetSurface accessibilityLabel={t('quick-log.sheet.unavailable.title')}>
          <AppText variant="title">{t('quick-log.sheet.unavailable.title')}</AppText>
          <AppText tone="secondary">{t('quick-log.sheet.unavailable.body')}</AppText>
          <Button
            label={t('quick-log.sheet.unavailable.close')}
            onPress={closeSheet}
            variant="secondary"
          />
        </SheetSurface>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.sheetContent} edges={['bottom']}>
      <SheetSurface accessibilityLabel={t('quick-log.sheet.title')}>
        <AppText variant="title">{t('quick-log.sheet.title')}</AppText>
        <Stack direction="horizontal" gap="md" wrap>
          {selectedTrackerIds.map((trackerId) => (
            <TrackerTile
              accessibilityLabel={t(getQuickLogTrackerLabelKey(trackerId))}
              key={trackerId}
              label={t(getQuickLogTrackerLabelKey(trackerId))}
              onPress={() => {
                controller.logTracker(trackerId);
              }}
              testID="quick-log-tracker-tile"
            />
          ))}
        </Stack>
        <AppText tone="secondary">{t('quick-log.sheet.edit-helper')}</AppText>
        {controller.duplicateWarning ? (
          <DuplicateWarning
            onCancel={controller.cancelDuplicate}
            onConfirm={controller.confirmDuplicate}
          />
        ) : null}
        <QuickLogLocalEvents
          events={localEvents}
          onDelete={controller.deleteLocal}
          onRetry={controller.retry}
          onUndo={controller.undoLocal}
        />
      </SheetSurface>
    </Screen>
  );
}

function DuplicateWarning({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="md">
        <AppText variant="headline">{t('quick-log.duplicate-warning.title')}</AppText>
        <AppText tone="secondary">{t('quick-log.duplicate-warning.question')}</AppText>
        <Stack direction="horizontal" gap="sm" wrap>
          <Button
            label={t('quick-log.duplicate-warning.primary-alt')}
            onPress={onConfirm}
            variant="secondary"
          />
          <Button
            label={t('quick-log.duplicate-warning.secondary')}
            onPress={onCancel}
            variant="tertiary"
          />
        </Stack>
      </Stack>
    </Card>
  );
}

const unavailableMutation: QuickLogMutationPort = {
  deleteLocal: () => undefined,
  mutate: () => undefined,
  retry: () => undefined,
  undo: () => undefined,
};

const styles = StyleSheet.create({
  sheetContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
  },
});
