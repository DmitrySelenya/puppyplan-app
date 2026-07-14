import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { createQuickLogDetailDraft, type QuickLogDetailDraft } from '@/contracts/quick-log';
import {
  AppText,
  Button,
  Screen,
  SheetSurface,
  Stack,
  TextField,
  Touchable,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

const NOTE_MAX_LENGTH = 500;
const BACKDATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;

export type QuickNoteStatus = 'ready' | 'loading' | 'pending-write' | 'permission-denied';

export type QuickNoteScreenProps = Readonly<{
  onClose?: () => void;
  onSave?: (draft: QuickLogDetailDraft) => Promise<void> | void;
  status?: QuickNoteStatus;
}>;

const noop = () => undefined;

export function QuickNoteScreen({
  onClose = noop,
  onSave = noop,
  status = 'ready',
}: QuickNoteScreenProps) {
  const { fontScale } = useWindowDimensions();
  const { locale, t } = useAppTranslation();
  const [occurredAt, setOccurredAt] = useState(() => new Date());
  const [wheelOpen, setWheelOpen] = useState(false);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [requiredError, setRequiredError] = useState(false);
  const [persistenceError, setPersistenceError] = useState(false);
  const canWrite = status === 'ready' || status === 'pending-write';

  const updateOccurredAt = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const timestamp = selectedDate?.getTime() ?? event.nativeEvent.timestamp;
    if (timestamp === undefined) {
      return;
    }

    setOccurredAt(new Date(timestamp));
  };

  const submit = async () => {
    const trimmed = note.trim();
    if (trimmed === '') {
      setRequiredError(true);
      setPersistenceError(false);
      return;
    }

    setRequiredError(false);
    setPersistenceError(false);
    setIsSaving(true);
    try {
      const result = onSave(createQuickLogDetailDraft({
        note: trimmed,
        occurredAt: occurredAt.toISOString(),
        trackerId: 'observation',
      }));
      if (isPromiseLike(result)) {
        await result;
      }
      setNote('');
      setOccurredAt(new Date());
      setWheelOpen(false);
    } catch {
      setPersistenceError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.sheetContent} edges={['bottom']}>
      <SheetSurface accessibilityLabel={t('quick-note.title')}>
        <Stack gap="md" testID="quick-note-sheet">
          <Stack
            align="flex-start"
            direction="horizontal"
            gap="sm"
            justify="space-between"
            wrap>
            <AppText maxFontSizeMultiplier={2} style={styles.title} variant="title">
              {t('quick-note.title')}
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
          <Stack
            align={fontScale >= 2 ? 'stretch' : 'flex-start'}
            direction={fontScale >= 2 ? 'vertical' : 'horizontal'}
            gap="sm">
            <Stack gap="xs">
              <AppText tone="secondary" variant="subheadline">
                {t('quick-note.when-label')}
              </AppText>
              <Touchable
                accessibilityHint={t('quick-note.when-hint')}
                accessibilityLabel={t('quick-note.when-label')}
                accessibilityRole="button"
                accessibilityState={{ expanded: wheelOpen }}
                accessibilityValue={{ text: formatWhen(occurredAt, locale) }}
                minTarget="thumb"
                onPress={() => setWheelOpen((open) => !open)}
                style={styles.whenPill}
                testID="quick-note-when-pill">
                <AppText maxFontSizeMultiplier={2} variant="bodyEmph">
                  {formatWhen(occurredAt, locale)}
                </AppText>
              </Touchable>
            </Stack>
            <View style={styles.noteField}>
              <TextField
                label={t('quick-note.note-label')}
                maxLength={NOTE_MAX_LENGTH}
                multiline
                onChangeText={(value) => {
                  setNote(value);
                  setRequiredError(false);
                }}
                value={note}
              />
            </View>
          </Stack>
          {wheelOpen ? (
            <View
              {...{
                onChange: updateOccurredAt,
                testID: 'quick-note-occurred-at',
                value: occurredAt,
              }}>
              <DateTimePicker
                accessibilityLabel={t('quick-note.when-label')}
                display="spinner"
                maximumDate={new Date()}
                minimumDate={new Date(Date.now() - BACKDATE_WINDOW_MS)}
                mode="datetime"
                onChange={updateOccurredAt}
                testID="quick-note-wheel"
                value={occurredAt}
              />
            </View>
          ) : null}
          <AppText tone="secondary" variant="footnote">
            {t('quick-note.note-helper', { count: note.length })}
          </AppText>
          {requiredError ? (
            <AppText accessibilityRole="alert" style={styles.errorText} variant="footnote">
              {t('quick-note.required-error')}
            </AppText>
          ) : null}
          {persistenceError ? (
            <AppText accessibilityRole="alert" style={styles.errorText} variant="footnote">
              {t('quick-note.persistence-error')}
            </AppText>
          ) : null}
          <Button
            disabled={!canWrite || isSaving}
            label={t('quick-note.add')}
            loading={isSaving}
            onPress={submit}
            variant="primary"
          />
        </Stack>
      </SheetSurface>
    </Screen>
  );
}

function formatWhen(date: Date, locale: string): string {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  if (isToday(date)) {
    return time;
  }

  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);

  return `${day}, ${time}`;
}

function isToday(date: Date): boolean {
  const now = new Date();

  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function isPromiseLike(value: unknown): value is Promise<void> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as Readonly<{ then?: unknown }>).then === 'function';
}

const styles = StyleSheet.create({
  closeButton: {
    alignSelf: 'flex-start',
  },
  errorText: {
    color: tokens.color.status.danger,
  },
  noteField: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  sheetContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  title: {
    flexShrink: 1,
  },
  whenPill: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.sunken,
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
    paddingHorizontal: tokens.space[3],
  },
});
