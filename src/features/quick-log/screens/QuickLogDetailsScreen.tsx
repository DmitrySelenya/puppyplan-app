import { useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

import {
  createQuickLogDetailDraft,
  quickLogDetailTrackerIdSchema,
  type QuickLogDetailDraft,
  type QuickLogDetailTrackerId,
} from '@/contracts/quick-log';
import {
  AppIcon,
  type AppIconName,
  AppText,
  Button,
  Card,
  Screen,
  SegmentedControl,
  SheetSurface,
  Stack,
  StatusPill,
  TextField,
  WhenPicker,
  type StatusPillTone,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { formatDurationMinutes } from '@/lib/datetime/duration-label';
import { parseDurationMinutes } from '@/lib/datetime/duration-input';
import { getSleepRangeMinutes, type SleepRangeResult } from '@/lib/datetime/sleep-range';
import { formatWhenLabel, getBackdateBounds } from '@/lib/datetime/when-label';
import { useAppTranslation, type I18nKey } from '@/lib/i18n';

export type QuickLogDetailsReviewState =
  | 'loading'
  | 'pending-write'
  | 'error'
  | 'offline-read'
  | 'permission-denied';

export type QuickLogDetailsStatus = QuickLogDetailsReviewState | 'ready';

export type QuickLogDetailsAuditMetadata = Readonly<{
  clientEventId: string;
  createdAt: string;
  isCreatedByCurrentUser: boolean;
  occurredAt: string;
  updatedAt: string;
  version: number;
}>;

export type QuickLogDetailsScreenProps = Readonly<{
  auditMetadata?: QuickLogDetailsAuditMetadata;
  initialDraft?: QuickLogDetailDraft;
  initialTrackerId?: QuickLogDetailTrackerId | string;
  initialSleepAction?: SleepActionValue;
  onClose?: () => void;
  onSave?: (draft: QuickLogDetailDraft) => Promise<void> | void;
  readOnly?: boolean;
  status?: QuickLogDetailsStatus;
  syncStatus?: 'failed' | 'pending' | 'synced';
  trackerLocked?: boolean;
}>;

type FeedingAmountValue = 'meal' | 'snack' | 'water';
type PottySubtypeValue = 'outside' | 'inside' | 'poop';
type SleepActionValue = 'start' | 'wake' | 'retrospective';
type TrainingDurationValue = 'short' | 'medium' | 'long';
type TrainingTopicValue = 'recall' | 'sit' | 'crate' | 'leash' | 'settling' | 'other';
type ZoomiesIntensityValue = 'none' | 'low' | 'medium' | 'high';

type SleepRangeErrorReason = 'missing' | 'not-positive' | 'too-long';

const sleepRangeErrorKeys = {
  'missing': 'quick-log.details.sleep.range-missing-error',
  'not-positive': 'quick-log.details.sleep.range-error',
  'too-long': 'quick-log.details.sleep.range-too-long-error',
} as const satisfies Record<SleepRangeErrorReason, I18nKey>;

const noop = () => undefined;

export function QuickLogDetailsScreen({
  auditMetadata,
  initialDraft,
  initialTrackerId = 'feeding',
  initialSleepAction,
  onClose = noop,
  onSave = noop,
  readOnly = false,
  status = 'ready',
  syncStatus,
  trackerLocked = false,
}: QuickLogDetailsScreenProps) {
  const { fontScale } = useWindowDimensions();
  const { locale, t } = useAppTranslation();
  const reviewState = status === 'ready' ? undefined : status;
  // An existing fact arrives with its tracker locked; capturing a new one never does.
  const isEditing = trackerLocked && initialDraft !== undefined;
  const sheetTitleKey: I18nKey = isEditing
    ? 'quick-log.details.edit-title'
    : 'quick-log.details.title';
  const backdateBounds = getBackdateBounds();
  const initialOccurredAt = getInitialOccurredAt(initialDraft);
  const [trackerId, setTrackerId] = useState<QuickLogDetailTrackerId>(() =>
    initialDraft?.trackerId ?? normalizeDetailTrackerId(initialTrackerId));
  const [feedingAmount, setFeedingAmount] = useState<FeedingAmountValue>(() =>
    initialDraft?.trackerId === 'feeding' ? initialDraft.amount ?? 'meal' : 'meal');
  const [pottySubtype, setPottySubtype] = useState<PottySubtypeValue>(() =>
    initialDraft?.trackerId === 'potty' ? initialDraft.subtype ?? 'outside' : 'outside');
  const [sleepAction, setSleepAction] = useState<SleepActionValue>(() =>
    initialDraft?.trackerId === 'sleep'
      ? initialDraft.action ?? initialSleepAction ?? 'start'
      : initialSleepAction ?? 'start');
  const [sleepActionTouched, setSleepActionTouched] = useState(
    initialDraft?.trackerId === 'sleep'
      ? initialDraft.action !== undefined || initialSleepAction !== undefined
      : initialSleepAction !== undefined,
  );
  // A stored retrospective sleep carries end + duration, so the start it was entered as has to be
  // reconstructed backwards. `null` means the owner has not picked one yet — never a guessed default,
  // which would save a night nobody entered.
  const [sleepStart, setSleepStart] = useState<Date | null>(() =>
    getInitialSleepStart(initialDraft));
  const [sleepStartWheelOpen, setSleepStartWheelOpen] = useState(false);
  const [sleepRangeError, setSleepRangeError] = useState<SleepRangeErrorReason>();
  const [walkDuration, setWalkDuration] = useState(() =>
    initialDraft?.trackerId === 'walk' && initialDraft.durationMinutes !== undefined
      ? String(initialDraft.durationMinutes)
      : '');
  const [walkDurationError, setWalkDurationError] = useState(false);
  const [trainingDuration, setTrainingDuration] = useState<TrainingDurationValue>(() =>
    initialDraft?.trackerId === 'training' ? initialDraft.durationBucket ?? 'medium' : 'medium');
  const [trainingTopic, setTrainingTopic] = useState<TrainingTopicValue>(() =>
    initialDraft?.trackerId === 'training' ? initialDraft.topic ?? 'other' : 'other');
  const [zoomiesIntensity, setZoomiesIntensity] = useState<ZoomiesIntensityValue>(() =>
    initialDraft?.trackerId === 'zoomies' ? initialDraft.intensity ?? 'none' : 'none');
  const [occurredAt, setOccurredAt] = useState(initialOccurredAt);
  const [occurredAtEdited, setOccurredAtEdited] = useState(
    initialDraft?.occurredAt !== undefined,
  );
  const [wheelOpen, setWheelOpen] = useState(false);
  const [timeError, setTimeError] = useState<string>();
  const [note, setNote] = useState(initialDraft?.note ?? '');
  const [observationTitle, setObservationTitle] = useState(
    initialDraft?.trackerId === 'observation' ? initialDraft.title ?? '' : '',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [persistenceError, setPersistenceError] = useState(false);
  const [observationError, setObservationError] = useState(false);

  const updateOccurredAt = (next: Date) => {
    setOccurredAt(next);
    setOccurredAtEdited(true);
    setTimeError(validateOccurredAt(next, new Date(), t));
    setSleepRangeError(undefined);
  };

  // Everything downstream of the draft is Zod, and it caps `duration_minutes` at a day. Parsing here
  // keeps a typo answerable at the field instead of surfacing as "could not save … try again".
  const walkDurationInput = parseDurationMinutes(walkDuration);

  // For a retrospective sleep `occurredAt` is the wake time, so the range is start → occurredAt.
  const isRetrospectiveSleep = trackerId === 'sleep' && sleepAction === 'retrospective';
  const sleepRange = sleepStart === null
    ? undefined
    : getSleepRangeMinutes(sleepStart.getTime(), occurredAt.getTime());

  const applyTimeOffset = (offsetMinutes: number) => {
    const next = new Date(Date.now() - offsetMinutes * 60_000);
    setOccurredAt(next);
    setOccurredAtEdited(true);
    setTimeError(undefined);
  };

  const submit = async () => {
    const validationError = initialDraft?.occurredAt === occurredAt.toISOString()
      ? undefined
      : validateOccurredAt(occurredAt, new Date(), t);
    if (validationError) {
      setTimeError(validationError);
      return;
    }

    if (trackerId === 'sleep' && sleepAction === 'retrospective') {
      if (sleepRange === undefined) {
        setSleepRangeError('missing');
        setPersistenceError(false);
        return;
      }

      if (!sleepRange.ok) {
        setSleepRangeError(sleepRange.reason);
        setPersistenceError(false);
        return;
      }
    }

    if (trackerId === 'walk' && !walkDurationInput.ok) {
      setWalkDurationError(true);
      setPersistenceError(false);
      return;
    }

    if (trackerId === 'observation'
      && observationTitle.trim() === ''
      && note.trim() === '') {
      setObservationError(true);
      setPersistenceError(false);
      return;
    }

    setPersistenceError(false);
    setIsSaving(true);
    try {
      const result = onSave(createQuickLogDetailDraft(createDraftInput({
        feedingAmount,
        note,
        observationTitle,
        occurredAt,
        occurredAtEdited,
        pottySubtype,
        sleepAction,
        sleepActionTouched,
        sleepDurationMinutes: sleepRange?.ok === true ? sleepRange.durationMinutes : undefined,
        trainingDuration,
        trainingTopic,
        trackerId,
        walkDurationMinutes: walkDurationInput.ok ? walkDurationInput.minutes : undefined,
        zoomiesIntensity,
      })));
      if (isPromiseLike(result)) {
        await result;
      }
    } catch {
      setPersistenceError(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (readOnly) {
    return (
      <QuickLogReadOnlyDetails
        auditMetadata={auditMetadata}
        draft={initialDraft}
        onClose={onClose}
        status={status}
        syncStatus={syncStatus}
        trackerId={trackerId}
      />
    );
  }

  return (
    <Screen contentStyle={styles.sheetContent} edges={['bottom']}>
      <SheetSurface accessibilityLabel={t(sheetTitleKey)}>
        <Stack gap="md">
          <Stack
            align="flex-start"
            direction="horizontal"
            gap="sm"
            justify="space-between"
            wrap>
            <AppText
              maxFontSizeMultiplier={2}
              style={styles.title}
              variant="title">
              {t(sheetTitleKey)}
            </AppText>
            <Button
              label={t('common.close')}
              labelMaxFontSizeMultiplier={2}
              labelVariant="label"
              onPress={onClose}
              style={styles.closeButton}
              variant="tertiary"
            />
          </Stack>
          <Card>
            <Stack gap="sm">
              <AppText variant="headline">{t('quick-log.details.variant-label')}</AppText>
              <Stack direction="horizontal" gap="sm" wrap>
                {detailTrackerOptions.map((option) => {
                  const selected = trackerId === option.value;
                  return (
                    <Button
                      accessibilityState={{ selected }}
                      disabled={trackerLocked}
                      key={option.value}
                      label={t(option.labelKey)}
                      onPress={() => setTrackerId(option.value)}
                      style={[
                        styles.eventSelectorButton,
                        fontScale >= 2 ? styles.accessibilityEventSelectorButton : null,
                      ]}
                      variant={selected ? 'primary' : 'secondary'}
                    />
                  );
                })}
              </Stack>
            </Stack>
          </Card>
          {reviewState ? <QuickLogDetailsStatePreview state={reviewState} /> : null}
          {auditMetadata ? (
            <QuickLogDetailsAudit metadata={auditMetadata} syncStatus={syncStatus} />
          ) : null}
          {trackerId === 'potty' ? (
            <PottyDetailsFields value={pottySubtype} onValueChange={setPottySubtype} />
          ) : null}
          {trackerId === 'feeding' ? (
            <FeedingDetailsFields
              value={feedingAmount}
              onValueChange={setFeedingAmount}
            />
          ) : null}
          {trackerId === 'sleep' ? (
            <SleepDetailsFields
              action={sleepAction}
              endValue={occurredAt}
              endWheelOpen={wheelOpen}
              errorText={sleepRangeError === undefined
                ? undefined
                : t(sleepRangeErrorKeys[sleepRangeError])}
              locale={locale}
              maximumDate={backdateBounds.maximumDate}
              minimumDate={backdateBounds.minimumDate}
              onActionChange={(action) => {
                setSleepAction(action);
                setSleepActionTouched(true);
                setSleepRangeError(undefined);
              }}
              onEndChange={updateOccurredAt}
              // Both wheels open at once make the card taller than the sheet, so scrolling it drags
              // a wheel instead and silently rewrites a time the owner already set.
              onEndWheelOpenChange={(open) => {
                setWheelOpen(open);
                if (open) {
                  setSleepStartWheelOpen(false);
                }
              }}
              onStartChange={(next) => {
                setSleepStart(next);
                setSleepRangeError(undefined);
              }}
              onStartWheelOpenChange={(open) => {
                setSleepStartWheelOpen(open);
                if (open) {
                  setWheelOpen(false);
                }
              }}
              range={sleepRange}
              startValue={sleepStart}
              startWheelOpen={sleepStartWheelOpen}
              timeErrorText={timeError}
            />
          ) : null}
          {trackerId === 'training' ? (
            <TrainingDetailsFields
              duration={trainingDuration}
              onDurationChange={setTrainingDuration}
              onTopicChange={setTrainingTopic}
              topic={trainingTopic}
            />
          ) : null}
          {trackerId === 'zoomies' ? (
            <ZoomiesDetailsFields
              value={zoomiesIntensity}
              onValueChange={setZoomiesIntensity}
            />
          ) : null}
          {trackerId === 'walk' ? (
            <TextField
              errorText={walkDurationError
                ? t('quick-log.details.walk.duration-error')
                : undefined}
              keyboardType="number-pad"
              label={t('quick-log.details.walk.duration-label')}
              onChangeText={(value) => {
                setWalkDuration(value);
                setWalkDurationError(false);
              }}
              value={walkDuration}
            />
          ) : null}
          {trackerId === 'observation' ? (
            <TextField
              label={t('quick-log.details.observation.title-label')}
              maxLength={80}
              onChangeText={(value) => {
                setObservationTitle(value);
                setObservationError(false);
              }}
              value={observationTitle}
            />
          ) : null}
          {/*
            * Retrospective sleep owns its own time control: "Woke up" *is* occurredAt, and a second
            * generic When card would put the two ends of one range in separate cards.
            */}
          {isRetrospectiveSleep ? null : (
          <Card>
            <Stack gap="sm">
              <AppText variant="headline">{t('quick-log.details.when.label')}</AppText>
              <Stack direction="horizontal" gap="sm" wrap>
                {timeOffsetOptions.map((option) => (
                  <Button
                    key={option.offsetMinutes}
                    label={t(option.labelKey)}
                    onPress={() => applyTimeOffset(option.offsetMinutes)}
                    style={styles.timeOffsetButton}
                    variant="secondary"
                  />
                ))}
              </Stack>
              <WhenPicker
                hint={t('quick-log.details.when.hint')}
                label={t('quick-log.details.when.label')}
                maximumDate={backdateBounds.maximumDate}
                minimumDate={backdateBounds.minimumDate}
                onChange={updateOccurredAt}
                onOpenChange={setWheelOpen}
                open={wheelOpen}
                testID="quick-log-details-when"
                value={occurredAt}
                valueText={formatWhenLabel(occurredAt, locale)}
              />
              {timeError ? (
                <AppText style={styles.errorText} variant="footnote">{timeError}</AppText>
              ) : null}
            </Stack>
          </Card>
          )}
          <TextField
            label={t('quick-log.details.note.label')}
            maxLength={500}
            multiline
            onChangeText={(value) => {
              setNote(value);
              setObservationError(false);
            }}
            value={note}
          />
          <AppText tone="secondary" variant="footnote">
            {t('quick-log.details.note.helper', { count: note.length })}
          </AppText>
          {observationError ? (
            <AppText accessibilityRole="alert" style={styles.errorText} variant="footnote">
              {t('quick-log.details.observation.required-error')}
            </AppText>
          ) : null}
          {persistenceError ? (
            <AppText accessibilityRole="alert" style={styles.errorText} variant="footnote">
              {t('quick-log.details.persistence-error')}
            </AppText>
          ) : null}
          <Stack direction="horizontal" gap="sm" wrap>
            <Button
              disabled={status !== 'ready' || isSaving}
              label={t(isEditing ? 'quick-log.details.edit-save' : 'quick-log.details.save')}
              loading={isSaving}
              onPress={submit}
              variant="primary"
            />
            <Button
              label={t(isEditing ? 'common.cancel' : 'quick-log.details.skip')}
              onPress={onClose}
              variant="tertiary"
            />
          </Stack>
        </Stack>
      </SheetSurface>
    </Screen>
  );
}

function QuickLogReadOnlyDetails({
  auditMetadata,
  draft,
  onClose,
  status,
  syncStatus,
  trackerId,
}: Readonly<{
  auditMetadata?: QuickLogDetailsAuditMetadata;
  draft?: QuickLogDetailDraft;
  onClose: () => void;
  status: QuickLogDetailsStatus;
  syncStatus?: 'failed' | 'pending' | 'synced';
  trackerId: QuickLogDetailTrackerId;
}>) {
  const { locale, t } = useAppTranslation();
  const note = draft?.note;
  const observationTitle = draft?.trackerId === 'observation' ? draft.title : undefined;
  const detailLines = getReadOnlyDetailLines(draft, t);

  return (
    <Screen contentStyle={styles.sheetContent} edges={['bottom']}>
      <SheetSurface accessibilityLabel={t('quick-log.details.title')}>
        <Stack gap="md">
          <Stack align="flex-start" direction="horizontal" gap="sm" justify="space-between" wrap>
            <AppText variant="title">{t('quick-log.details.title')}</AppText>
            <Button label={t('common.close')} onPress={onClose} variant="tertiary" />
          </Stack>
          <Card>
            <Stack gap="sm">
              <AppText tone="secondary" variant="label">
                {t('quick-log.details.states.permission-denied.status')}
              </AppText>
              <AppText variant="headline">
                {observationTitle ?? t(getDetailTrackerLabelKey(trackerId))}
              </AppText>
              {note ? <AppText>{note}</AppText> : null}
              {detailLines.map((line) => (
                <AppText key={line.label}>
                  {line.label}: {line.value}
                </AppText>
              ))}
              {draft?.occurredAt ? (
                <AppText tone="secondary">
                  {new Intl.DateTimeFormat(locale, {
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(draft.occurredAt))}
                </AppText>
              ) : null}
            </Stack>
          </Card>
          {status === 'error' ? <QuickLogDetailsStatePreview state="error" /> : null}
          {auditMetadata ? (
            <QuickLogDetailsAudit metadata={auditMetadata} syncStatus={syncStatus} />
          ) : null}
        </Stack>
      </SheetSurface>
    </Screen>
  );
}

function QuickLogDetailsAudit({
  metadata,
  syncStatus,
}: Readonly<{
  metadata: QuickLogDetailsAuditMetadata;
  syncStatus?: 'failed' | 'pending' | 'synced';
}>) {
  const { locale, t } = useAppTranslation();
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card>
      <Stack gap="xs" testID="quick-log-details-audit">
        <AppText variant="headline">{t('quick-log.details.audit.title')}</AppText>
        <AppText>{metadata.isCreatedByCurrentUser
          ? t('quick-log.details.audit.actor-you')
          : t('quick-log.details.audit.actor-household')}</AppText>
        {syncStatus ? <AppText>{t(getSyncStatusLabelKey(syncStatus))}</AppText> : null}
        <AppText tone="secondary">
          {t('quick-log.details.audit.created', {
            value: formatter.format(new Date(metadata.createdAt)),
          })}
        </AppText>
        <AppText tone="secondary">
          {t('quick-log.details.audit.updated', {
            value: formatter.format(new Date(metadata.updatedAt)),
          })}
        </AppText>
        <AppText tone="secondary">
          {t('quick-log.details.audit.version', { version: metadata.version })}
        </AppText>
      </Stack>
    </Card>
  );
}

function getReadOnlyDetailLines(
  draft: QuickLogDetailDraft | undefined,
  t: ReturnType<typeof useAppTranslation>['t'],
): readonly Readonly<{ label: string; value: string }>[] {
  if (draft === undefined) {
    return [];
  }
  if (draft.trackerId === 'potty' && draft.subtype !== undefined) {
    return [{
      label: t('quick-log.details.potty.subtype-label'),
      value: t(readOnlyPottySubtypeKeys[draft.subtype]),
    }];
  }
  if (draft.trackerId === 'feeding' && draft.amount !== undefined) {
    return [{
      label: t('quick-log.details.feeding.amount-label'),
      value: t(readOnlyFeedingAmountKeys[draft.amount]),
    }];
  }
  if (draft.trackerId === 'sleep') {
    return [
      ...(draft.action === undefined ? [] : [{
        label: t('quick-log.details.sleep.action-label'),
        value: t(readOnlySleepActionKeys[draft.action]),
      }]),
      ...(draft.durationMinutes === undefined ? [] : [{
        label: t('quick-log.details.sleep.duration-label'),
        value: t('quick-log.details.read-only.duration-minutes', {
          count: draft.durationMinutes,
        }),
      }]),
    ];
  }
  if (draft.trackerId === 'walk' && draft.durationMinutes !== undefined) {
    return [{
      label: t('quick-log.details.walk.duration-label'),
      value: t('quick-log.details.read-only.duration-minutes', { count: draft.durationMinutes }),
    }];
  }
  if (draft.trackerId === 'zoomies' && draft.intensity !== undefined) {
    return [{
      label: t('quick-log.details.zoomies.intensity-label'),
      value: t(readOnlyZoomiesIntensityKeys[draft.intensity]),
    }];
  }
  if (draft.trackerId === 'training') {
    return [
      ...(draft.topic === undefined ? [] : [{
        label: t('quick-log.details.training.topic-label'),
        value: t(readOnlyTrainingTopicKeys[draft.topic]),
      }]),
      ...(draft.durationBucket === undefined ? [] : [{
        label: t('quick-log.details.training.duration-label'),
        value: t(readOnlyTrainingDurationKeys[draft.durationBucket]),
      }]),
    ];
  }

  return [];
}

const readOnlyPottySubtypeKeys = {
  inside: 'quick-log.details.potty.subtype.inside',
  outside: 'quick-log.details.potty.subtype.outside',
  poop: 'quick-log.details.potty.subtype.poop',
} as const satisfies Record<PottySubtypeValue, I18nKey>;

const readOnlyFeedingAmountKeys = {
  meal: 'quick-log.details.feeding.amount.meal',
  snack: 'quick-log.details.feeding.amount.snack',
  water: 'quick-log.details.feeding.amount.water',
} as const satisfies Record<FeedingAmountValue, I18nKey>;

const readOnlySleepActionKeys = {
  retrospective: 'quick-log.details.sleep.action.retrospective',
  start: 'quick-log.details.sleep.action.start',
  wake: 'quick-log.details.sleep.action.wake',
} as const satisfies Record<SleepActionValue, I18nKey>;

const readOnlyZoomiesIntensityKeys = {
  high: 'quick-log.details.zoomies.intensity.high',
  low: 'quick-log.details.zoomies.intensity.low',
  medium: 'quick-log.details.zoomies.intensity.medium',
} as const satisfies Record<Exclude<ZoomiesIntensityValue, 'none'>, I18nKey>;

const readOnlyTrainingTopicKeys = {
  crate: 'quick-log.details.training.topic.crate',
  leash: 'quick-log.details.training.topic.leash',
  other: 'quick-log.details.training.topic.other',
  recall: 'quick-log.details.training.topic.recall',
  settling: 'quick-log.details.training.topic.settling',
  sit: 'quick-log.details.training.topic.sit',
} as const satisfies Record<TrainingTopicValue, I18nKey>;

const readOnlyTrainingDurationKeys = {
  long: 'quick-log.details.training.duration.long',
  medium: 'quick-log.details.training.duration.medium',
  short: 'quick-log.details.training.duration.short',
} as const satisfies Record<TrainingDurationValue, I18nKey>;

function getDetailTrackerLabelKey(trackerId: QuickLogDetailTrackerId): I18nKey {
  return `quick-log.details.tabs.${trackerId}`;
}

function getSyncStatusLabelKey(status: 'failed' | 'pending' | 'synced'): I18nKey {
  if (status === 'failed') {
    return 'timeline.pills.failed';
  }
  if (status === 'pending') {
    return 'timeline.pills.pending';
  }
  return 'timeline.pills.synced';
}

function FeedingDetailsFields({
  onValueChange,
  value,
}: Readonly<{
  onValueChange: (value: FeedingAmountValue) => void;
  value: FeedingAmountValue;
}>) {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="sm">
        <AppText variant="headline">{t('quick-log.details.feeding.amount-label')}</AppText>
        <SegmentedControl
          accessibilityLabel={t('quick-log.details.feeding.amount-label')}
          onValueChange={onValueChange}
          options={feedingAmountOptions.map((option) => ({
            label: t(option.labelKey),
            value: option.value,
          }))}
          value={value}
        />
      </Stack>
    </Card>
  );
}

function PottyDetailsFields({
  onValueChange,
  value,
}: Readonly<{
  onValueChange: (value: PottySubtypeValue) => void;
  value: PottySubtypeValue;
}>) {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="sm">
        <AppText variant="headline">{t('quick-log.details.potty.subtype-label')}</AppText>
        <SegmentedControl
          accessibilityLabel={t('quick-log.details.potty.subtype-label')}
          onValueChange={onValueChange}
          options={pottySubtypeOptions.map((option) => ({
            label: t(option.labelKey),
            value: option.value,
          }))}
          value={value}
        />
      </Stack>
    </Card>
  );
}

function SleepDetailsFields({
  action,
  endValue,
  endWheelOpen,
  errorText,
  locale,
  maximumDate,
  minimumDate,
  onActionChange,
  onEndChange,
  onEndWheelOpenChange,
  onStartChange,
  onStartWheelOpenChange,
  range,
  startValue,
  startWheelOpen,
  timeErrorText,
}: Readonly<{
  action: SleepActionValue;
  endValue: Date;
  endWheelOpen: boolean;
  errorText?: string;
  locale: string;
  maximumDate: Date;
  minimumDate: Date;
  onActionChange: (value: SleepActionValue) => void;
  onEndChange: (value: Date) => void;
  onEndWheelOpenChange: (open: boolean) => void;
  onStartChange: (value: Date) => void;
  onStartWheelOpenChange: (open: boolean) => void;
  range: SleepRangeResult | undefined;
  startValue: Date | null;
  startWheelOpen: boolean;
  timeErrorText?: string;
}>) {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="sm">
        <AppText variant="headline">{t('quick-log.details.sleep.action-label')}</AppText>
        <SegmentedControl
          accessibilityLabel={t('quick-log.details.sleep.action-label')}
          distribution="content"
          onValueChange={onActionChange}
          options={sleepActionOptions.map((option) => ({
            label: t(option.labelKey),
            value: option.value,
          }))}
          value={action}
        />
        {action === 'retrospective' ? (
          <>
            {/*
              * Two bare pills read as "Choose time / 11:48" with nothing saying which end is which,
              * so each carries a visible label and not just an accessibility one.
              */}
            <AppText variant="subheadline">{t('quick-log.details.sleep.start-label')}</AppText>
            <WhenPicker
              hint={t('quick-log.details.when.hint')}
              label={t('quick-log.details.sleep.start-label')}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              onChange={onStartChange}
              onOpenChange={onStartWheelOpenChange}
              open={startWheelOpen}
              testID="quick-log-details-sleep-start"
              // With no start chosen the wheel still has to open somewhere; the wake time is the
              // closest thing to the owner's intent.
              value={startValue ?? endValue}
              valueText={startValue === null
                ? t('quick-log.details.sleep.start-placeholder')
                : formatWhenLabel(startValue, locale)}
            />
            <AppText variant="subheadline">{t('quick-log.details.sleep.end-label')}</AppText>
            <WhenPicker
              hint={t('quick-log.details.when.hint')}
              label={t('quick-log.details.sleep.end-label')}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              onChange={onEndChange}
              onOpenChange={onEndWheelOpenChange}
              open={endWheelOpen}
              testID="quick-log-details-sleep-end"
              value={endValue}
              valueText={formatWhenLabel(endValue, locale)}
            />
            {errorText === undefined && timeErrorText === undefined ? (
              <AppText
                testID="quick-log-details-sleep-derived-duration"
                tone="secondary"
                variant="footnote">
                {range?.ok === true ? formatDurationMinutes(range.durationMinutes, t) : ''}
              </AppText>
            ) : (
              <AppText
                accessibilityRole="alert"
                style={styles.errorText}
                testID="quick-log-details-sleep-derived-duration"
                variant="footnote">
                {errorText ?? timeErrorText}
              </AppText>
            )}
          </>
        ) : null}
      </Stack>
    </Card>
  );
}

function TrainingDetailsFields({
  duration,
  onDurationChange,
  onTopicChange,
  topic,
}: Readonly<{
  duration: TrainingDurationValue;
  onDurationChange: (value: TrainingDurationValue) => void;
  onTopicChange: (value: TrainingTopicValue) => void;
  topic: TrainingTopicValue;
}>) {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="sm">
        <AppText variant="headline">{t('quick-log.details.training.topic-label')}</AppText>
        <SegmentedControl
          accessibilityLabel={t('quick-log.details.training.topic-label')}
          onValueChange={onTopicChange}
          options={trainingTopicOptions.map((option) => ({
            label: t(option.labelKey),
            value: option.value,
          }))}
          value={topic}
        />
        <AppText variant="headline">{t('quick-log.details.training.duration-label')}</AppText>
        <SegmentedControl
          accessibilityLabel={t('quick-log.details.training.duration-label')}
          onValueChange={onDurationChange}
          options={trainingDurationOptions.map((option) => ({
            label: t(option.labelKey),
            value: option.value,
          }))}
          value={duration}
        />
      </Stack>
    </Card>
  );
}

function ZoomiesDetailsFields({
  onValueChange,
  value,
}: Readonly<{
  onValueChange: (value: ZoomiesIntensityValue) => void;
  value: ZoomiesIntensityValue;
}>) {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="sm">
        <AppText variant="headline">{t('quick-log.details.zoomies.intensity-label')}</AppText>
        <SegmentedControl
          accessibilityLabel={t('quick-log.details.zoomies.intensity-label')}
          onValueChange={onValueChange}
          options={zoomiesIntensityOptions.map((option) => ({
            label: t(option.labelKey),
            value: option.value,
          }))}
          value={value}
        />
      </Stack>
    </Card>
  );
}

export function QuickLogDetailsStatePreview({
  state,
}: Readonly<{
  state: QuickLogDetailsReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = detailStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`quick-log-details-state-${state}`}
      variant={state === 'offline-read' ? 'mutedTemplate' : 'resting'}>
      <Stack gap="sm">
        <StatusPill
          accessibilityLabel={status}
          icon={(
            <AppIcon
              color={tokens.color.text.secondary}
              name={meta.icon}
              size={14}
            />
          )}
          label={status}
          tone={meta.tone}
        />
        <AppText variant="bodyEmph">{title}</AppText>
        <AppText tone="secondary" variant="subheadline">{body}</AppText>
      </Stack>
    </Card>
  );
}

function normalizeDetailTrackerId(trackerId: string): QuickLogDetailTrackerId {
  const result = quickLogDetailTrackerIdSchema.safeParse(trackerId);

  return result.success ? result.data : 'feeding';
}

function createDraftInput(input: Readonly<{
  feedingAmount: FeedingAmountValue;
  note: string;
  observationTitle: string;
  occurredAt: Date;
  occurredAtEdited: boolean;
  pottySubtype: PottySubtypeValue;
  sleepAction: SleepActionValue;
  sleepActionTouched: boolean;
  sleepDurationMinutes: number | undefined;
  trainingDuration: TrainingDurationValue;
  trainingTopic: TrainingTopicValue;
  trackerId: QuickLogDetailTrackerId;
  walkDurationMinutes: number | undefined;
  zoomiesIntensity: ZoomiesIntensityValue;
}>): QuickLogDetailDraft {
  const note = input.note.trim() || undefined;
  const occurredAt = input.occurredAt.toISOString();
  const optionalCommon = {
    ...(note === undefined ? {} : { note }),
    ...(input.occurredAtEdited ? { occurredAt } : {}),
  };

  if (input.trackerId === 'feeding') {
    return {
      amount: input.feedingAmount,
      ...optionalCommon,
      trackerId: input.trackerId,
    };
  }

  if (input.trackerId === 'potty') {
    return {
      note,
      occurredAt,
      subtype: input.pottySubtype,
      trackerId: input.trackerId,
    };
  }

  if (input.trackerId === 'sleep') {
    const durationMinutes = input.sleepDurationMinutes;

    if (!input.sleepActionTouched && durationMinutes !== undefined) {
      return {
        durationMinutes,
        trackerId: input.trackerId,
      };
    }

    return {
      action: input.sleepAction,
      ...(input.sleepAction === 'retrospective' && durationMinutes !== undefined
        ? { durationMinutes }
        : {}),
      note,
      occurredAt,
      trackerId: input.trackerId,
    };
  }

  if (input.trackerId === 'zoomies') {
    return {
      intensity: input.zoomiesIntensity === 'none' ? undefined : input.zoomiesIntensity,
      ...optionalCommon,
      trackerId: input.trackerId,
    };
  }

  if (input.trackerId === 'observation') {
    return {
      note,
      occurredAt,
      title: input.observationTitle.trim() || undefined,
      trackerId: input.trackerId,
    };
  }

  if (input.trackerId === 'training') {
    return {
      durationBucket: input.trainingDuration,
      note,
      occurredAt,
      topic: input.trainingTopic,
      trackerId: input.trackerId,
    };
  }

  if (input.trackerId === 'walk') {
    return {
      durationMinutes: input.walkDurationMinutes,
      note,
      occurredAt,
      trackerId: input.trackerId,
    };
  }

  return { note, occurredAt, trackerId: input.trackerId };
}

/**
 * A stored retrospective sleep keeps its end (`occurredAt`) and duration, so the start the owner
 * originally picked only exists as their difference.
 */
function getInitialSleepStart(initialDraft: QuickLogDetailDraft | undefined): Date | null {
  if (initialDraft?.trackerId !== 'sleep' || initialDraft.durationMinutes === undefined) {
    return null;
  }

  return new Date(getInitialOccurredAt(initialDraft).getTime()
    - initialDraft.durationMinutes * 60_000);
}

function getInitialOccurredAt(initialDraft: QuickLogDetailDraft | undefined): Date {
  return initialDraft?.occurredAt === undefined ? new Date() : new Date(initialDraft.occurredAt);
}

function validateOccurredAt(date: Date, now: Date, t: (key: I18nKey) => string): string | undefined {
  if (date.getTime() > now.getTime()) {
    return t('quick-log.details.when.future-error');
  }

  if (date.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1_000) {
    return t('quick-log.details.when.too-old-error');
  }

  return undefined;
}

function isPromiseLike(value: unknown): value is Promise<void> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as Readonly<{ then?: unknown }>).then === 'function';
}

const detailTrackerOptions = [
  {
    labelKey: 'quick-log.details.tabs.potty',
    value: 'potty',
  },
  {
    labelKey: 'quick-log.details.tabs.feeding',
    value: 'feeding',
  },
  {
    labelKey: 'quick-log.details.tabs.sleep',
    value: 'sleep',
  },
  {
    labelKey: 'quick-log.details.tabs.walk',
    value: 'walk',
  },
  {
    labelKey: 'quick-log.details.tabs.zoomies',
    value: 'zoomies',
  },
  {
    labelKey: 'quick-log.details.tabs.training',
    value: 'training',
  },
  {
    labelKey: 'quick-log.details.tabs.observation',
    value: 'observation',
  },
] as const satisfies readonly {
  labelKey: I18nKey;
  value: QuickLogDetailTrackerId;
}[];

const pottySubtypeOptions = [
  { labelKey: 'quick-log.details.potty.subtype.outside', value: 'outside' },
  { labelKey: 'quick-log.details.potty.subtype.inside', value: 'inside' },
  { labelKey: 'quick-log.details.potty.subtype.poop', value: 'poop' },
] as const satisfies readonly { labelKey: I18nKey; value: PottySubtypeValue }[];

const sleepActionOptions = [
  { labelKey: 'quick-log.details.sleep.action.start', value: 'start' },
  { labelKey: 'quick-log.details.sleep.action.wake', value: 'wake' },
  { labelKey: 'quick-log.details.sleep.action.retrospective', value: 'retrospective' },
] as const satisfies readonly { labelKey: I18nKey; value: SleepActionValue }[];

const trainingTopicOptions = [
  { labelKey: 'quick-log.details.training.topic.recall', value: 'recall' },
  { labelKey: 'quick-log.details.training.topic.sit', value: 'sit' },
  { labelKey: 'quick-log.details.training.topic.crate', value: 'crate' },
  { labelKey: 'quick-log.details.training.topic.leash', value: 'leash' },
  { labelKey: 'quick-log.details.training.topic.settling', value: 'settling' },
  { labelKey: 'quick-log.details.training.topic.other', value: 'other' },
] as const satisfies readonly { labelKey: I18nKey; value: TrainingTopicValue }[];

const trainingDurationOptions = [
  { labelKey: 'quick-log.details.training.duration.short', value: 'short' },
  { labelKey: 'quick-log.details.training.duration.medium', value: 'medium' },
  { labelKey: 'quick-log.details.training.duration.long', value: 'long' },
] as const satisfies readonly { labelKey: I18nKey; value: TrainingDurationValue }[];

const feedingAmountOptions = [
  {
    labelKey: 'quick-log.details.feeding.amount.meal',
    value: 'meal',
  },
  {
    labelKey: 'quick-log.details.feeding.amount.snack',
    value: 'snack',
  },
  {
    labelKey: 'quick-log.details.feeding.amount.water',
    value: 'water',
  },
] as const satisfies readonly {
  labelKey: I18nKey;
  value: FeedingAmountValue;
}[];

const timeOffsetOptions = [
  { labelKey: 'quick-log.details.when.now', offsetMinutes: 0 },
  { labelKey: 'quick-log.details.when.minus-15', offsetMinutes: 15 },
  { labelKey: 'quick-log.details.when.minus-30', offsetMinutes: 30 },
  { labelKey: 'quick-log.details.when.minus-60', offsetMinutes: 60 },
] as const satisfies readonly { labelKey: I18nKey; offsetMinutes: number }[];

const zoomiesIntensityOptions = [
  {
    labelKey: 'quick-log.details.zoomies.intensity.none',
    value: 'none',
  },
  {
    labelKey: 'quick-log.details.zoomies.intensity.low',
    value: 'low',
  },
  {
    labelKey: 'quick-log.details.zoomies.intensity.medium',
    value: 'medium',
  },
  {
    labelKey: 'quick-log.details.zoomies.intensity.high',
    value: 'high',
  },
] as const satisfies readonly {
  labelKey: I18nKey;
  value: ZoomiesIntensityValue;
}[];

type QuickLogDetailsStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

const detailStateMeta: Record<QuickLogDetailsReviewState, QuickLogDetailsStateMeta> = {
  error: {
    bodyKey: 'quick-log.details.states.error.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'quick-log.details.states.error.status',
    titleKey: 'quick-log.details.states.error.title',
    tone: 'failed',
  },
  loading: {
    bodyKey: 'quick-log.details.states.loading.body',
    icon: 'bowl',
    liveRegion: 'polite',
    statusKey: 'quick-log.details.states.loading.status',
    titleKey: 'quick-log.details.states.loading.title',
    tone: 'pending',
  },
  'offline-read': {
    bodyKey: 'quick-log.details.states.offline-read.body',
    icon: 'lock',
    statusKey: 'quick-log.details.states.offline-read.status',
    titleKey: 'quick-log.details.states.offline-read.title',
    tone: 'template',
  },
  'pending-write': {
    bodyKey: 'quick-log.details.states.pending-write.body',
    icon: 'docText',
    liveRegion: 'polite',
    statusKey: 'quick-log.details.states.pending-write.status',
    titleKey: 'quick-log.details.states.pending-write.title',
    tone: 'pending',
  },
  'permission-denied': {
    bodyKey: 'quick-log.details.states.permission-denied.body',
    icon: 'lock',
    role: 'alert',
    statusKey: 'quick-log.details.states.permission-denied.status',
    titleKey: 'quick-log.details.states.permission-denied.title',
    tone: 'failed',
  },
};

const styles = StyleSheet.create({
  accessibilityEventSelectorButton: {
    flexBasis: '100%',
    width: '100%',
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  errorText: {
    color: tokens.color.status.danger,
  },
  eventSelectorButton: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 44,
  },
  sheetContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  title: {
    flexShrink: 1,
  },
  timeOffsetButton: {
    flexGrow: 1,
    minHeight: 44,
  },
});
