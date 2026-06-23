import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  createQuickLogDetailDraft,
  quickLogDetailTrackerIdSchema,
  type QuickLogDetailDraft,
  type QuickLogDetailTrackerId,
} from '@/contracts/quick-log';
import {
  AppText,
  Button,
  Card,
  Screen,
  SegmentedControl,
  SheetSurface,
  Stack,
} from '@/design/primitives';
import { useAppTranslation, type I18nKey } from '@/lib/i18n';

export type QuickLogDetailsStatus = 'error' | 'ready' | 'saving';

export type QuickLogDetailsScreenProps = Readonly<{
  initialTrackerId?: QuickLogDetailTrackerId | string;
  onClose?: () => void;
  onSave?: (draft: QuickLogDetailDraft) => void;
  status?: QuickLogDetailsStatus;
}>;

type FeedingAmountValue = 'meal' | 'snack' | 'water';
type SleepDurationValue = 'none' | '15' | '30' | '60';
type ZoomiesIntensityValue = 'none' | 'low' | 'medium' | 'high';

const noop = () => undefined;

export function QuickLogDetailsScreen({
  initialTrackerId = 'feeding',
  onClose = noop,
  onSave = noop,
  status = 'ready',
}: QuickLogDetailsScreenProps) {
  const { t } = useAppTranslation();
  const [trackerId, setTrackerId] = useState<QuickLogDetailTrackerId>(() =>
    normalizeDetailTrackerId(initialTrackerId));
  const [feedingAmount, setFeedingAmount] = useState<FeedingAmountValue>('meal');
  const [sleepDuration, setSleepDuration] = useState<SleepDurationValue>('none');
  const [zoomiesIntensity, setZoomiesIntensity] = useState<ZoomiesIntensityValue>('none');

  const submit = () => {
    onSave(createQuickLogDetailDraft(createDraftInput({
      feedingAmount,
      sleepDuration,
      trackerId,
      zoomiesIntensity,
    })));
  };

  return (
    <Screen contentStyle={styles.sheetContent} edges={['bottom']}>
      <SheetSurface accessibilityLabel={t('quick-log.details.title')}>
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
              {t('quick-log.details.title')}
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
          <SegmentedControl
            accessibilityLabel={t('quick-log.details.variant-label')}
            onValueChange={setTrackerId}
            options={detailTrackerOptions.map((option) => ({
              label: t(option.labelKey),
              value: option.value,
            }))}
            value={trackerId}
          />
          {status === 'ready' ? null : <QuickLogDetailsStatusCard status={status} />}
          {trackerId === 'feeding' ? (
            <FeedingDetailsFields
              value={feedingAmount}
              onValueChange={setFeedingAmount}
            />
          ) : null}
          {trackerId === 'sleep' ? (
            <SleepDetailsFields
              value={sleepDuration}
              onValueChange={setSleepDuration}
            />
          ) : null}
          {trackerId === 'zoomies' ? (
            <ZoomiesDetailsFields
              value={zoomiesIntensity}
              onValueChange={setZoomiesIntensity}
            />
          ) : null}
          <Stack direction="horizontal" gap="sm" wrap>
            <Button
              label={t('quick-log.details.save')}
              onPress={submit}
              variant="primary"
            />
            <Button
              label={t('quick-log.details.skip')}
              onPress={onClose}
              variant="tertiary"
            />
          </Stack>
        </Stack>
      </SheetSurface>
    </Screen>
  );
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

function SleepDetailsFields({
  onValueChange,
  value,
}: Readonly<{
  onValueChange: (value: SleepDurationValue) => void;
  value: SleepDurationValue;
}>) {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="sm">
        <AppText variant="headline">{t('quick-log.details.sleep.duration-label')}</AppText>
        <SegmentedControl
          accessibilityLabel={t('quick-log.details.sleep.duration-label')}
          onValueChange={onValueChange}
          options={sleepDurationOptions.map((option) => ({
            label: t(option.labelKey),
            value: option.value,
          }))}
          value={value}
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

function QuickLogDetailsStatusCard({
  status,
}: Readonly<{
  status: Exclude<QuickLogDetailsStatus, 'ready'>;
}>) {
  const { t } = useAppTranslation();
  const copy = detailStatusCopy[status];

  return (
    <Card
      accessibilityLabel={t(copy.titleKey)}
      accessibilityLiveRegion="polite"
      accessibilityRole={status === 'error' ? 'alert' : undefined}
      variant={status === 'error' ? 'resting' : 'mutedTemplate'}>
      <Stack gap="xs">
        <AppText variant="headline">{t(copy.titleKey)}</AppText>
        <AppText tone="secondary">{t(copy.bodyKey)}</AppText>
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
  sleepDuration: SleepDurationValue;
  trackerId: QuickLogDetailTrackerId;
  zoomiesIntensity: ZoomiesIntensityValue;
}>): QuickLogDetailDraft {
  if (input.trackerId === 'feeding') {
    return {
      amount: input.feedingAmount,
      trackerId: input.trackerId,
    };
  }

  if (input.trackerId === 'sleep') {
    return {
      durationMinutes: input.sleepDuration === 'none'
        ? undefined
        : Number(input.sleepDuration),
      trackerId: input.trackerId,
    };
  }

  return {
    intensity: input.zoomiesIntensity === 'none'
      ? undefined
      : input.zoomiesIntensity,
    trackerId: input.trackerId,
  };
}

const detailTrackerOptions = [
  {
    labelKey: 'quick-log.details.tabs.feeding',
    value: 'feeding',
  },
  {
    labelKey: 'quick-log.details.tabs.sleep',
    value: 'sleep',
  },
  {
    labelKey: 'quick-log.details.tabs.zoomies',
    value: 'zoomies',
  },
] as const satisfies readonly {
  labelKey: I18nKey;
  value: QuickLogDetailTrackerId;
}[];

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

const sleepDurationOptions = [
  {
    labelKey: 'quick-log.details.sleep.duration.none',
    value: 'none',
  },
  {
    labelKey: 'quick-log.details.sleep.duration.15',
    value: '15',
  },
  {
    labelKey: 'quick-log.details.sleep.duration.30',
    value: '30',
  },
  {
    labelKey: 'quick-log.details.sleep.duration.60',
    value: '60',
  },
] as const satisfies readonly {
  labelKey: I18nKey;
  value: SleepDurationValue;
}[];

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

const detailStatusCopy = {
  error: {
    bodyKey: 'quick-log.details.states.error.body',
    titleKey: 'quick-log.details.states.error.title',
  },
  saving: {
    bodyKey: 'quick-log.details.states.saving.body',
    titleKey: 'quick-log.details.states.saving.title',
  },
} as const satisfies Record<Exclude<QuickLogDetailsStatus, 'ready'>, {
  bodyKey: I18nKey;
  titleKey: I18nKey;
}>;

const styles = StyleSheet.create({
  closeButton: {
    alignSelf: 'flex-start',
  },
  sheetContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  title: {
    flexShrink: 1,
  },
});
