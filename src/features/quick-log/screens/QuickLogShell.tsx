import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  defaultQuickLogTrackerIds,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { SheetHeader } from '@/design/primitives/SheetHeader';
import { SheetSurface } from '@/design/primitives/SheetSurface';
import { Stack } from '@/design/primitives/Stack';
import { Touchable } from '@/design/primitives/Touchable';
import { TrackerTile } from '@/design/primitives/TrackerTile';
import { tokens } from '@/design/tokens';
import { useAppTranslation, type AppTranslate } from '@/lib/i18n';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import {
  createQuickLogEventView,
  getQuickLogTrackerIdForEventRow,
  type QuickLogEventEditRequest,
} from '@/lib/query/quick-log-event-view';

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
  editTrackers?: () => void;
  mutation?: QuickLogMutationPort;
  mutationEvents?: readonly QuickLogMutationEvent[];
  localEvents?: readonly QuickLogLocalEventView[];
  now?: () => Date;
  openDetails?: (request: QuickLogEventEditRequest) => void;
  recentEvent?: QuickLogRecentEvent | null;
  recentEvents?: readonly QuickLogRecentEvent[];
  snackbar?: QuickLogSnackbarPort;
}>;

export function createQuickLogLocalEventViews(
  rows: readonly QuickLogCachedEventRow[],
  input: Readonly<{
    locale?: string;
    t: AppTranslate;
    todayDate: string;
  }>,
): readonly QuickLogLocalEventView[] {
  return rows.flatMap((row) => {
    if (!row.localSync || !isQuickLogLocalEventState(row.localSync.state)) {
      return [];
    }

    const event = createQuickLogEventView(row, input);

    if (event === null) {
      return [];
    }

    return [{
      clientEventId: event.clientEventId,
      eventType: event.eventType,
      householdId: event.householdId,
      puppyId: event.puppyId,
      state: row.localSync.state,
      todayDate: event.todayDate,
      trackerName: event.title,
    }];
  });
}

export function createQuickLogRecentEvents(
  rows: readonly QuickLogCachedEventRow[],
): readonly QuickLogRecentEvent[] {
  return rows.flatMap((row) => {
    if (row.deleted_at !== null) {
      return [];
    }

    const trackerId = getQuickLogTrackerIdForEventRow(row);
    const occurredAtMs = Date.parse(row.occurred_at);

    if (trackerId === null || !Number.isFinite(occurredAtMs)) {
      return [];
    }

    return [{
      occurredAtMs,
      trackerId,
    }];
  }).sort((left, right) => right.occurredAtMs - left.occurredAtMs);
}

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

function isQuickLogLocalEventState(
  state: NonNullable<QuickLogCachedEventRow['localSync']>['state'],
): state is QuickLogLocalEventView['state'] {
  return state === 'pending_local'
    || state === 'sending'
    || state === 'failed_retryable'
    || state === 'failed_permanent';
}

function QuickLogShellContent({
  careContext = null,
  closeSheet = () => undefined,
  editTrackers = () => undefined,
  feedback,
  localEvents = [],
  mutation,
  mutationEvents = [],
  now,
  openDetails,
  recentEvent = null,
  recentEvents = [],
}: QuickLogShellProps & {
  feedback: QuickLogFeedbackPort;
}) {
  const { t } = useAppTranslation();
  const isViewOnly = careContext?.householdRole === 'viewer';
  const readyCareContext = mutation === undefined || isViewOnly
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
    openDetails,
    recentEvent,
    recentEvents,
  });
  const selectedTrackerIds = readyCareContext?.selectedTrackerIds?.length
    ? readyCareContext.selectedTrackerIds
    : defaultQuickLogTrackerIds;

  if (isViewOnly) {
    return (
      <QuickLogSheetFrame
        dismissAccessibilityLabel={t('quick-log.sheet.dismiss')}
        onDismiss={closeSheet}>
        <SheetSurface accessibilityLabel={t('quick-log.sheet.permission-denied.title')}>
          <SheetHeader
            closeAccessibilityLabel={t('quick-log.sheet.dismiss')}
            onClose={closeSheet}
            title={t('quick-log.sheet.permission-denied.title')}
          />
          <AppText tone="secondary">{t('quick-log.sheet.permission-denied.body')}</AppText>
          <Button
            label={t('quick-log.sheet.permission-denied.close')}
            onPress={closeSheet}
            variant="secondary"
          />
        </SheetSurface>
      </QuickLogSheetFrame>
    );
  }

  if (controller.status === 'unavailable') {
    return (
      <QuickLogSheetFrame
        dismissAccessibilityLabel={t('quick-log.sheet.dismiss')}
        onDismiss={closeSheet}>
        <SheetSurface accessibilityLabel={t('quick-log.sheet.unavailable.title')}>
          <SheetHeader
            closeAccessibilityLabel={t('quick-log.sheet.dismiss')}
            onClose={closeSheet}
            title={t('quick-log.sheet.unavailable.title')}
          />
          <AppText tone="secondary">{t('quick-log.sheet.unavailable.body')}</AppText>
          <Button
            label={t('quick-log.sheet.unavailable.close')}
            onPress={closeSheet}
            variant="secondary"
          />
        </SheetSurface>
      </QuickLogSheetFrame>
    );
  }

  return (
    <QuickLogSheetFrame
      dismissAccessibilityLabel={t('quick-log.sheet.dismiss')}
      onDismiss={
        controller.duplicateWarning
          ? controller.cancelDuplicate
          : closeSheet
      }>
      <SheetSurface
        accessibilityLabel={
          controller.duplicateWarning
            ? t('quick-log.duplicate-warning.title')
            : t('quick-log.sheet.title')
        }>
        {controller.duplicateWarning ? (
          <DuplicateWarning
            onCancel={controller.cancelDuplicate}
            onConfirm={controller.confirmDuplicate}
          />
        ) : (
          <>
            <Stack
              align="center"
              direction="horizontal"
              gap="sm"
              justify="space-between">
              <SheetHeader
                style={styles.title}
                title={t('quick-log.sheet.title')}
              />
              <Button
                label={t('quick-log.sheet.edit-trackers')}
                labelMaxFontSizeMultiplier={2}
                labelVariant="label"
                onPress={editTrackers}
                style={styles.editTrackersButton}
                variant="tertiary"
              />
            </Stack>
            <Stack direction="horizontal" gap="sm" wrap>
              {selectedTrackerIds.map((trackerId) => (
                <TrackerTile
                  accessibilityLabel={t(getQuickLogTrackerLabelKey(trackerId))}
                  icon={(
                    <AppIcon
                      name={quickLogTrackerIcon(trackerId)}
                      size={24}
                      testID={`quick-log-tracker-icon-${quickLogTrackerIcon(trackerId)}`}
                    />
                  )}
                  key={trackerId}
                  label={t(getQuickLogTrackerLabelKey(trackerId))}
                  onPress={() => {
                    controller.logTracker(trackerId);
                  }}
                  testID="quick-log-tracker-tile"
                />
              ))}
            </Stack>
            <QuickLogLocalEvents
              events={localEvents}
              onDelete={controller.deleteLocal}
              onRetry={controller.retry}
              onUndo={controller.undoLocal}
            />
          </>
        )}
      </SheetSurface>
    </QuickLogSheetFrame>
  );
}

function QuickLogSheetFrame({
  children,
  dismissAccessibilityLabel,
  onDismiss,
}: Readonly<{
  children: ReactNode;
  dismissAccessibilityLabel: string;
  onDismiss: () => void;
}>) {
  return (
    <Screen
      contentStyle={styles.sheetContent}
      edges={['bottom']}
      style={styles.transparentScreen}>
      <Touchable
        accessibilityLabel={dismissAccessibilityLabel}
        accessibilityRole="button"
        minTarget="none"
        onPress={onDismiss}
        style={styles.scrim}
        testID="quick-log-sheet-scrim"
      />
      <View
        style={styles.sheetAnchor}
        testID="quick-log-sheet-anchor">
        {children}
      </View>
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
    <Card
      accessibilityLabel={t('quick-log.duplicate-warning.title')}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
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
  editTrackersButton: {
    alignSelf: 'flex-start',
  },
  sheetContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
  },
  transparentScreen: {
    backgroundColor: 'transparent',
  },
  sheetAnchor: {
    width: '100%',
    zIndex: 1,
  },
  scrim: {
    backgroundColor: tokens.color.surface.scrim,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 0,
  },
  title: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
});

function quickLogTrackerIcon(
  trackerId: QuickLogTrackerId,
): 'bowl' | 'calendar' | 'moon' | 'poop' | 'pottyInside' | 'spark' | 'water' {
  if (trackerId === 'feeding_meal') {
    return 'bowl';
  }

  if (trackerId === 'sleep_nap') {
    return 'moon';
  }

  if (trackerId === 'zoomies') {
    return 'spark';
  }

  if (trackerId === 'training') {
    return 'calendar';
  }

  if (trackerId === 'potty_poop') {
    return 'poop';
  }

  if (trackerId === 'potty_pee_inside') {
    return 'pottyInside';
  }

  return 'water';
}
