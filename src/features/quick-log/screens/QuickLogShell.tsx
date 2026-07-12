import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  defaultQuickLogTrackerIds,
  type QuickLogPottySubtype,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import type { QuickLogDuplicateCareWarningPayload } from '@/contracts/business-rules';
import { eventPayloadSchemas } from '@/contracts/supabase';
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
  onQuickLogSaved?: () => void;
  openDetails?: (request: QuickLogEventEditRequest) => void;
  openCreateDetails?: (request: Readonly<{
    sleepAction?: 'retrospective';
    trackerId: 'potty' | 'feeding' | 'sleep' | 'walk' | 'zoomies' | 'training' | 'observation';
  }>) => void;
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

    const payload = createRecentEventPayload(row, trackerId);

    return [{
      occurredAtMs,
      ...(payload === undefined ? {} : { payload }),
      trackerId,
    }];
  }).sort((left, right) => right.occurredAtMs - left.occurredAtMs);
}

function createQuickLogMutationLocalEventViews(
  mutationEvents: readonly QuickLogMutationEvent[],
  input: Readonly<{
    careContext: QuickLogCareContext | null;
    t: AppTranslate;
  }>,
): readonly QuickLogLocalEventView[] {
  if (input.careContext === null || mutationEvents.length === 0) {
    return [];
  }

  const eventsByClientEventId = new Map<string, QuickLogLocalEventView>();

  for (const event of mutationEvents) {
    eventsByClientEventId.set(event.clientEventId, {
      clientEventId: event.clientEventId,
      eventType: event.eventType,
      householdId: input.careContext.householdId,
      puppyId: input.careContext.puppyId,
      state: event.type === 'failed' ? event.state : 'pending_local',
      todayDate: input.careContext.todayDate,
      trackerName: input.t(getQuickLogTrackerLabelKey(event.trackerId)),
    });
  }

  return [...eventsByClientEventId.values()];
}

function mergeQuickLogLocalEventViews(
  localEvents: readonly QuickLogLocalEventView[],
  mutationLocalEvents: readonly QuickLogLocalEventView[],
): readonly QuickLogLocalEventView[] {
  if (mutationLocalEvents.length === 0) {
    return localEvents;
  }

  const eventsByClientEventId = new Map<string, QuickLogLocalEventView>();

  for (const event of localEvents) {
    eventsByClientEventId.set(event.clientEventId, event);
  }

  for (const event of mutationLocalEvents) {
    eventsByClientEventId.set(event.clientEventId, event);
  }

  return [...eventsByClientEventId.values()];
}

function createRecentEventPayload(
  row: QuickLogCachedEventRow,
  trackerId: QuickLogTrackerId,
): QuickLogDuplicateCareWarningPayload | undefined {
  if (trackerId !== 'potty') {
    return undefined;
  }

  const payloadResult = eventPayloadSchemas.potty.safeParse(row.payload);

  if (payloadResult.success) {
    return {
      subtype: payloadResult.data.subtype,
    };
  }

  if (row.payload.quick_action === 'pee_outside') {
    return { subtype: 'outside' };
  }

  if (row.payload.quick_action === 'pee_inside') {
    return { subtype: 'inside' };
  }

  if (row.payload.quick_action === 'poop') {
    return { subtype: 'poop' };
  }

  return undefined;
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
  onQuickLogSaved,
  openDetails,
  openCreateDetails,
  recentEvent = null,
  recentEvents = [],
}: QuickLogShellProps & {
  feedback: QuickLogFeedbackPort;
}) {
  const { t } = useAppTranslation();
  const [pottySubtypePickerOpen, setPottySubtypePickerOpen] = useState(false);
  const [sleepActionPickerOpen, setSleepActionPickerOpen] = useState(false);
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
    onQuickLogSaved,
    openDetails,
    recentEvent,
    recentEvents,
  });
  const selectedTrackerIds = readyCareContext?.selectedTrackerIds?.length
    ? readyCareContext.selectedTrackerIds
    : defaultQuickLogTrackerIds;
  const mutationLocalEvents = useMemo(
    () => createQuickLogMutationLocalEventViews(mutationEvents, {
      careContext: readyCareContext,
      t,
    }),
    [mutationEvents, readyCareContext, t],
  );
  const visibleLocalEvents = useMemo(
    () => mergeQuickLogLocalEventViews(localEvents, mutationLocalEvents),
    [localEvents, mutationLocalEvents],
  );

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
          : pottySubtypePickerOpen
            ? () => setPottySubtypePickerOpen(false)
            : sleepActionPickerOpen
              ? () => setSleepActionPickerOpen(false)
            : closeSheet
      }>
      <SheetSurface
        accessibilityLabel={
          controller.duplicateWarning
            ? t('quick-log.duplicate-warning.title')
            : pottySubtypePickerOpen
              ? t('quick-log.potty-subtype.title')
              : sleepActionPickerOpen
                ? t('quick-log.sleep-action.title')
            : t('quick-log.sheet.title')
        }>
        {controller.duplicateWarning ? (
          <DuplicateWarning
            onCancel={controller.cancelDuplicate}
            onConfirm={controller.confirmDuplicate}
          />
        ) : pottySubtypePickerOpen ? (
          <PottySubtypePicker
            onBack={() => setPottySubtypePickerOpen(false)}
            onSelect={(pottySubtype) => {
              setPottySubtypePickerOpen(false);
              controller.logTracker({
                pottySubtype,
                trackerId: 'potty',
              });
            }}
          />
        ) : sleepActionPickerOpen ? (
          <SleepActionPicker
            onBack={() => setSleepActionPickerOpen(false)}
            onRetrospective={() => openCreateDetails?.({
              sleepAction: 'retrospective',
              trackerId: 'sleep',
            })}
            onSelect={(sleepAction) => {
              setSleepActionPickerOpen(false);
              controller.logTracker({ sleepAction, trackerId: 'sleep' });
            }}
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
                    if (trackerId === 'potty') {
                      setPottySubtypePickerOpen(true);
                      return;
                    }

                    if (trackerId === 'sleep') {
                      setSleepActionPickerOpen(true);
                      return;
                    }

                    controller.logTracker({ trackerId });
                  }}
                  testID="quick-log-tracker-tile"
                />
              ))}
            </Stack>
            <Button
              label={t('quick-log.sheet.log-with-details')}
              onPress={() => openCreateDetails?.({ trackerId: 'feeding' })}
              variant="secondary"
            />
            <QuickLogLocalEvents
              events={visibleLocalEvents}
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

function SleepActionPicker({
  onBack,
  onRetrospective,
  onSelect,
}: Readonly<{
  onBack: () => void;
  onRetrospective: () => void;
  onSelect: (action: 'start' | 'wake') => void;
}>) {
  const { t } = useAppTranslation();

  return (
    <Stack gap="md">
      <Stack align="flex-start" direction="horizontal" gap="sm" justify="space-between" wrap>
        <SheetHeader style={styles.title} title={t('quick-log.sleep-action.title')} />
        <Button label={t('common.back')} onPress={onBack} variant="tertiary" />
      </Stack>
      <AppText tone="secondary">{t('quick-log.sleep-action.body')}</AppText>
      <Stack gap="sm">
        <Button label={t('quick-log.sleep-action.start')} onPress={() => onSelect('start')} />
        <Button label={t('quick-log.sleep-action.wake')} onPress={() => onSelect('wake')} />
        <Button
          label={t('quick-log.sleep-action.retrospective')}
          onPress={onRetrospective}
          variant="secondary"
        />
      </Stack>
    </Stack>
  );
}

function PottySubtypePicker({
  onBack,
  onSelect,
}: Readonly<{
  onBack: () => void;
  onSelect: (subtype: QuickLogPottySubtype) => void;
}>) {
  const { t } = useAppTranslation();

  return (
    <Stack gap="md">
      <Stack
        align="flex-start"
        direction="horizontal"
        gap="sm"
        justify="space-between"
        wrap>
        <SheetHeader
          style={styles.title}
          title={t('quick-log.potty-subtype.title')}
        />
        <Button
          label={t('common.back')}
          labelMaxFontSizeMultiplier={2}
          labelVariant="label"
          onPress={onBack}
          style={styles.editTrackersButton}
          variant="tertiary"
        />
      </Stack>
      <AppText tone="secondary">{t('quick-log.potty-subtype.body')}</AppText>
      <Stack direction="horizontal" gap="sm" wrap>
        {pottySubtypeOptions.map((option) => (
          <TrackerTile
            accessibilityLabel={t(option.labelKey)}
            icon={(
              <AppIcon
                name={option.icon}
                size={24}
                testID={`quick-log-potty-subtype-icon-${option.icon}`}
              />
            )}
            key={option.value}
            label={t(option.labelKey)}
            onPress={() => onSelect(option.value)}
            testID="quick-log-potty-subtype-tile"
          />
        ))}
      </Stack>
    </Stack>
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
      accessibilityRole="alert"
      style={styles.duplicateWarningCard}
      testID="quick-log-duplicate-warning-card">
      <Stack gap="md">
        <Stack align="center" direction="horizontal" gap="sm">
          <View
            style={styles.duplicateWarningIcon}
            testID="quick-log-duplicate-warning-icon">
            <AppIcon
              color={tokens.color.status.warning}
              name="warningTriangle"
              size={22}
              testID="quick-log-duplicate-warning-icon-warningTriangle"
            />
          </View>
          <AppText
            style={styles.duplicateWarningTitle}
            variant="headline">
            {t('quick-log.duplicate-warning.title')}
          </AppText>
        </Stack>
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
  duplicateWarningCard: {
    backgroundColor: tokens.color.status.warningTint,
    borderColor: tokens.color.status.warning,
  },
  duplicateWarningIcon: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderRadius: tokens.radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  duplicateWarningTitle: {
    flex: 1,
    minWidth: 0,
  },
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
  if (trackerId === 'feeding') {
    return 'bowl';
  }

  if (trackerId === 'sleep') {
    return 'moon';
  }

  if (trackerId === 'zoomies') {
    return 'spark';
  }

  if (trackerId === 'walk') {
    return 'calendar';
  }

  return 'water';
}

const pottySubtypeOptions = [
  {
    icon: 'water',
    labelKey: 'quick-log.trackers.potty-outside',
    value: 'outside',
  },
  {
    icon: 'pottyInside',
    labelKey: 'quick-log.trackers.potty-inside',
    value: 'inside',
  },
  {
    icon: 'poop',
    labelKey: 'quick-log.trackers.potty-poop',
    value: 'poop',
  },
] as const satisfies readonly {
  icon: ReturnType<typeof quickLogTrackerIcon>;
  labelKey: ReturnType<typeof getQuickLogTrackerLabelKey>;
  value: QuickLogPottySubtype;
}[];
