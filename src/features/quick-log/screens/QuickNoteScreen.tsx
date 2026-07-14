import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { createQuickLogDetailDraft, type QuickLogDetailDraft } from '@/contracts/quick-log';
import {
  AppText,
  Button,
  Screen,
  SheetSurface,
  Stack,
  TextField,
  WhenPicker,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { formatWhenLabel, getBackdateBounds } from '@/lib/datetime/when-label';
import { useAppTranslation } from '@/lib/i18n';

const NOTE_MAX_LENGTH = 500;

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
  const bounds = getBackdateBounds();

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
              <WhenPicker
                hint={t('quick-note.when-hint')}
                label={t('quick-note.when-label')}
                maximumDate={bounds.maximumDate}
                minimumDate={bounds.minimumDate}
                onChange={setOccurredAt}
                onOpenChange={setWheelOpen}
                open={wheelOpen}
                testID="quick-note-when"
                value={occurredAt}
                valueText={formatWhenLabel(occurredAt, locale)}
              />
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
});
