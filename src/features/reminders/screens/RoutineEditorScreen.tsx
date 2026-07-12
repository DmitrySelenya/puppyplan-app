import DateTimePicker from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  REMINDER_NOTE_MAX_LENGTH,
  REMINDER_TITLE_MAX_LENGTH,
  reminderScheduleDraftSchema,
  reminderTrackerIds,
  type ReminderRepeat,
  type ReminderScheduleDraft,
  type ReminderTrackerId,
  type ReminderVariant,
} from '@/contracts/reminders';
import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { TextField } from '@/design/primitives/TextField';
import { TrackerTile } from '@/design/primitives/TrackerTile';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

// Mirrors the Diary planned-card visuals so a routine looks the same where it is created and shown.
const trackerIcons: Record<ReminderTrackerId, AppIconName> = {
  potty: 'water',
  feeding: 'bowl',
  sleep: 'moon',
  walk: 'walk',
  zoomies: 'ball',
  training: 'trainingPaw',
  observation: 'paw',
};
const trackerLabelKeys = {
  potty: 'quick-log.details.tabs.potty',
  feeding: 'quick-log.details.tabs.feeding',
  sleep: 'quick-log.details.tabs.sleep',
  walk: 'quick-log.details.tabs.walk',
  zoomies: 'quick-log.details.tabs.zoomies',
  training: 'quick-log.details.tabs.training',
  observation: 'quick-log.details.tabs.observation',
} as const;

type RepeatChoice = 'never' | 'daily' | 'weekdays' | 'custom';
const repeatLabelKeys = {
  never: 'reminders.form.routine.repeat-never',
  daily: 'reminders.form.routine.repeat-daily',
  weekdays: 'reminders.form.routine.repeat-weekdays',
  custom: 'reminders.form.routine.repeat-custom',
} as const;
const weekdayLabelKeys = [
  'reminders.form.routine.weekdays.0',
  'reminders.form.routine.weekdays.1',
  'reminders.form.routine.weekdays.2',
  'reminders.form.routine.weekdays.3',
  'reminders.form.routine.weekdays.4',
  'reminders.form.routine.weekdays.5',
  'reminders.form.routine.weekdays.6',
] as const;
const variantLabelKeys = {
  outside: 'reminders.form.routine.variants.outside',
  inside: 'reminders.form.routine.variants.inside',
  poop: 'reminders.form.routine.variants.poop',
  play: 'reminders.form.routine.variants.play',
  training: 'reminders.form.routine.variants.training',
} as const;
const variantIdsByTracker: Record<'potty' | 'training', readonly ReminderVariant[]> = {
  potty: ['outside', 'inside', 'poop'],
  training: ['play', 'training'],
};

type ValidationKind = 'days' | 'details' | 'event' | 'observation';

export type RoutineEditorScreenProps = Readonly<{
  initialDraft?: ReminderScheduleDraft;
  isSaving?: boolean;
  mode?: 'create' | 'edit' | 'viewer';
  onCancel: () => void;
  onSave: (draft: ReminderScheduleDraft) => Promise<void> | void;
  onSaved?: () => void;
  onRequestNotifications?: () => Promise<void> | void;
}>;

export function RoutineEditorScreen({
  initialDraft,
  isSaving = false,
  mode = 'create',
  onCancel,
  onSave,
  onSaved,
  onRequestNotifications,
}: RoutineEditorScreenProps) {
  const { locale, t } = useAppTranslation();
  const initialRule = initialDraft?.rule;
  const [trackerId, setTrackerId] = useState<ReminderTrackerId | undefined>(initialDraft?.trackerId);
  const [title, setTitle] = useState(initialRule?.title ?? '');
  const [note, setNote] = useState(initialRule?.note ?? '');
  const [amount, setAmount] = useState(initialRule?.amount?.value.toString() ?? '');
  const [variant, setVariant] = useState<ReminderVariant | undefined>(initialRule?.variant);
  const [repeatChoice, setRepeatChoice] = useState<RepeatChoice>(() => {
    const repeat = initialRule?.repeat;
    return typeof repeat === 'object' ? 'custom' : repeat ?? 'daily';
  });
  const [customDays, setCustomDays] = useState<readonly number[]>(() => {
    const repeat = initialRule?.repeat;
    return typeof repeat === 'object' ? repeat.days : [1];
  });
  const [dateTime, setDateTime] = useState(() => createInitialDate(initialRule?.date, initialRule?.time));
  const [saveError, setSaveError] = useState(false);
  const [showPrimer, setShowPrimer] = useState(false);
  const isViewer = mode === 'viewer';

  const weekdayShortLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' });
    // 2024-01-01 is a Monday; offsets keep ISO weekday order Mon..Sun.
    return [0, 1, 2, 3, 4, 5, 6].map((offset) =>
      formatter.format(new Date(Date.UTC(2024, 0, 1 + offset))));
  }, [locale]);

  const draft = useMemo(() => buildDraft({
    amount,
    customDays,
    dateTime,
    note,
    repeatChoice,
    title,
    trackerId,
    variant,
  }), [amount, customDays, dateTime, note, repeatChoice, title, trackerId, variant]);
  const parsedDraft = draft === null ? null : reminderScheduleDraftSchema.safeParse(draft);
  const canSave = !isViewer && parsedDraft?.success === true && !isSaving;
  const validationKind = getValidationKind({
    customDays,
    note,
    parseFailed: parsedDraft?.success === false,
    repeatChoice,
    title,
    trackerId,
  });

  const save = async () => {
    if (!canSave || parsedDraft?.success !== true) {
      return;
    }

    setSaveError(false);
    try {
      await onSave(parsedDraft.data);
      setShowPrimer(true);
    } catch {
      setSaveError(true);
    }
  };

  const validationError = (kind: ValidationKind) => validationKind === kind ? (
    <AppText
      accessibilityRole="alert"
      style={styles.errorText}
      testID="routine-validation-error"
      variant="footnote">
      {t(validationMessageKeys[kind])}
    </AppText>
  ) : null;

  if (showPrimer) {
    return (
      <Screen contentStyle={styles.content} modal>
        <Card testID="routine-permission-primer">
          <Stack gap="lg">
            <AppText accessibilityRole="header" variant="title">
              {t('reminders.form.routine.saved-title')}
            </AppText>
            <AppText tone="secondary" variant="body">
              {t('reminders.form.routine.saved-body')}
            </AppText>
            <Button
              label={t('onboarding.notifications-prompt.primary')}
              onPress={() => { void onRequestNotifications?.(); }}
              testID="routine-primer-enable-notifications"
            />
            <Button
              label={t('reminders.form.routine.not-now')}
              onPress={onSaved ?? onCancel}
              testID="routine-primer-not-now"
              variant="secondary"
            />
          </Stack>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content} modal>
      <Stack gap="md">
        <Stack align="center" direction="horizontal" justify="space-between">
          <Button label={t('reminders.form.cancel')} onPress={onCancel} variant="tertiary" />
          <AppText accessibilityRole="header" variant="headline">
            {t('reminders.form.routine.title')}
          </AppText>
          <Button
            disabled={!canSave}
            label={t('reminders.form.save')}
            loading={isSaving}
            onPress={() => { void save(); }}
            variant="tertiary"
          />
        </Stack>

        {saveError ? (
          <Card accessibilityRole="alert" testID="routine-save-error" variant="mutedTemplate">
            <Stack gap="sm">
              <AppText>{t('reminders.form.routine.save-error')}</AppText>
              <Button
                label={t('reminders.form.routine.retry')}
                onPress={() => { void save(); }}
                testID="routine-retry"
                variant="secondary"
              />
            </Stack>
          </Card>
        ) : null}

        <Card>
          <Stack gap="sm">
            <AppText variant="headline">{t('reminders.form.routine.event')}</AppText>
            <Stack direction="horizontal" gap="sm" testID="routine-event-grid" wrap>
              {reminderTrackerIds.map((id) => (
                <TrackerTile
                  key={id}
                  disabled={isViewer}
                  icon={<AppIcon name={trackerIcons[id]} size={24} />}
                  label={t(trackerLabelKeys[id])}
                  onPress={() => {
                    if (id !== trackerId) {
                      setAmount('');
                      setVariant(undefined);
                    }
                    setTrackerId(id);
                  }}
                  selected={trackerId === id}
                  size="compact"
                  style={styles.eventTile}
                  testID={`routine-event-${id}`}
                />
              ))}
            </Stack>
            {validationError('event')}
            {validationError('details')}
          </Stack>
        </Card>

        {trackerId === 'potty' || trackerId === 'training' ? (
          <Card testID="routine-variant-group">
            <Stack gap="sm">
              <AppText variant="headline">{t('reminders.form.routine.variant')}</AppText>
              <Stack direction="horizontal" gap="sm" wrap>
                {variantIdsByTracker[trackerId].map((id) => (
                  <Button
                    accessibilityState={{ selected: variant === id }}
                    key={id}
                    disabled={isViewer}
                    label={t(variantLabelKeys[id])}
                    onPress={() => setVariant(id)}
                    style={styles.choice}
                    testID={`routine-variant-${id}`}
                    variant={variant === id ? 'primary' : 'secondary'}
                  />
                ))}
              </Stack>
            </Stack>
          </Card>
        ) : null}

        {trackerId !== undefined ? (
          <>
            <TextField
              editable={!isViewer}
              label={t(trackerId === 'observation'
                ? 'reminders.form.routine.observation-title'
                : 'reminders.form.routine.optional-title')}
              maxLength={REMINDER_TITLE_MAX_LENGTH}
              onChangeText={setTitle}
              testID="routine-title"
              value={title}
            />
            {validationError('observation')}
          </>
        ) : null}

        <Card>
          <Stack gap="sm">
            <AppText variant="headline">{t('reminders.form.field-time')}</AppText>
            <View testID="routine-time-picker">
              <DateTimePicker
                disabled={isViewer}
                display="compact"
                mode="time"
                onChange={(_event, value) => value && setDateTime(withTime(dateTime, value))}
                style={styles.dateTimePicker}
                value={dateTime}
              />
            </View>

            <AppText variant="headline">{t('reminders.form.field-repeat')}</AppText>
            <Stack direction="horizontal" gap="sm" wrap>
              {(['never', 'daily', 'weekdays', 'custom'] as const).map((choice) => (
                <Button
                  accessibilityState={{ selected: repeatChoice === choice }}
                  key={choice}
                  disabled={isViewer}
                  label={t(repeatLabelKeys[choice])}
                  onPress={() => setRepeatChoice(choice)}
                  style={styles.choice}
                  testID={`routine-repeat-${choice}`}
                  variant={repeatChoice === choice ? 'primary' : 'secondary'}
                />
              ))}
            </Stack>

            {repeatChoice === 'custom' ? (
              <Stack direction="horizontal" gap="xs" testID="routine-custom-days">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <Button
                    accessibilityLabel={t(weekdayLabelKeys[day - 1])}
                    accessibilityState={{ selected: customDays.includes(day) }}
                    key={day}
                    disabled={isViewer}
                    label={weekdayShortLabels[day - 1] ?? ''}
                    labelVariant="label"
                    onPress={() => setCustomDays(toggleDay(customDays, day))}
                    style={styles.dayChoice}
                    testID={`routine-day-${day}`}
                    variant={customDays.includes(day) ? 'primary' : 'secondary'}
                  />
                ))}
              </Stack>
            ) : null}
            {validationError('days')}

            {repeatChoice === 'never' ? (
              <>
                <AppText variant="headline">{t('reminders.form.routine.date')}</AppText>
                <View testID="routine-date-picker">
                  <DateTimePicker
                    disabled={isViewer}
                    display="compact"
                    minimumDate={startOfToday()}
                    mode="date"
                    onChange={(_event, value) => value && setDateTime(withDate(dateTime, value))}
                    style={styles.dateTimePicker}
                    value={dateTime}
                  />
                </View>
              </>
            ) : null}
          </Stack>
        </Card>

        {trackerId === 'feeding' ? (
          <TextField
            editable={!isViewer}
            keyboardType="decimal-pad"
            label={t('reminders.form.routine.amount')}
            onChangeText={setAmount}
            testID="routine-amount"
            value={amount}
          />
        ) : null}
        {trackerId === 'sleep' || trackerId === 'walk' ? (
          <TextField
            editable={!isViewer}
            keyboardType="number-pad"
            label={t('reminders.form.routine.duration')}
            onChangeText={setAmount}
            testID="routine-duration"
            value={amount}
          />
        ) : null}

        <TextField
          editable={!isViewer}
          label={t('reminders.form.routine.private-note')}
          maxLength={REMINDER_NOTE_MAX_LENGTH}
          multiline
          onChangeText={setNote}
          testID="routine-note"
          value={note}
        />
      </Stack>
    </Screen>
  );
}

const validationMessageKeys = {
  days: 'reminders.form.error-no-days',
  details: 'reminders.form.routine.invalid-details',
  event: 'reminders.form.routine.event-required',
  observation: 'reminders.form.routine.observation-required',
} as const;

function getValidationKind(input: Readonly<{
  customDays: readonly number[];
  note: string;
  parseFailed: boolean;
  repeatChoice: RepeatChoice;
  title: string;
  trackerId?: ReminderTrackerId;
}>): ValidationKind | null {
  if (input.trackerId === undefined) {
    return 'event';
  }

  if (!input.parseFailed) {
    return null;
  }

  if (input.repeatChoice === 'custom' && input.customDays.length === 0) {
    return 'days';
  }

  if (
    input.trackerId === 'observation'
    && input.title.trim() === ''
    && input.note.trim() === ''
  ) {
    return 'observation';
  }

  return 'details';
}

function buildDraft(input: Readonly<{
  amount: string;
  customDays: readonly number[];
  dateTime: Date;
  note: string;
  repeatChoice: RepeatChoice;
  title: string;
  trackerId?: ReminderTrackerId;
  variant?: ReminderVariant;
}>): ReminderScheduleDraft | null {
  if (input.trackerId === undefined) {
    return null;
  }

  const repeat: ReminderRepeat = input.repeatChoice === 'custom'
    ? { days: [...input.customDays] }
    : input.repeatChoice;
  const numberAmount = Number(input.amount);
  const supportsAmount = input.trackerId === 'feeding'
    || input.trackerId === 'sleep'
    || input.trackerId === 'walk';

  return {
    trackerId: input.trackerId,
    rule: {
      ...(supportsAmount && input.amount.trim() !== '' && Number.isFinite(numberAmount)
        ? { amount: { value: numberAmount, unit: input.trackerId === 'feeding' ? 'g' : 'min' } }
        : {}),
      ...(input.repeatChoice === 'never' ? { date: formatDate(input.dateTime) } : {}),
      ...(input.note.trim() !== '' ? { note: input.note } : {}),
      repeat,
      time: formatTime(input.dateTime),
      ...(input.title.trim() !== '' ? { title: input.title } : {}),
      ...(input.variant !== undefined ? { variant: input.variant } : {}),
    },
  };
}

function createInitialDate(date: string | undefined, time: string | undefined): Date {
  const result = date === undefined ? new Date() : new Date(`${date}T12:00:00`);
  const [hour = 7, minute = 30] = (time ?? '07:30').split(':').map(Number);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function startOfToday(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function toggleDay(days: readonly number[], day: number): readonly number[] {
  return days.includes(day) ? days.filter((value) => value !== day) : [...days, day].sort();
}

function withDate(current: Date, next: Date): Date {
  const value = new Date(current);
  value.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
  return value;
}

function withTime(current: Date, next: Date): Date {
  const value = new Date(current);
  value.setHours(next.getHours(), next.getMinutes(), 0, 0);
  return value;
}

const styles = StyleSheet.create({
  choice: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 44,
  },
  content: {
    gap: tokens.space[4],
  },
  dateTimePicker: {
    alignSelf: 'flex-start',
    height: 44,
    minWidth: 120,
  },
  dayChoice: {
    flexBasis: 0,
    flexGrow: 1,
    minHeight: 44,
    paddingHorizontal: 0,
  },
  errorText: {
    color: tokens.color.status.danger,
  },
  eventTile: {
    flexBasis: '30%',
    flexGrow: 1,
  },
});
