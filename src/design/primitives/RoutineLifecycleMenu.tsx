import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Stack } from '@/design/primitives/Stack';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

export type RoutineLifecycleMenuProps = Readonly<{
  enabled: boolean;
  initialView?: 'actions' | 'delete-confirmation';
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  pending?: boolean;
  title: string;
}>;

/** Shared routine lifecycle surface used by Diary and the reminder list. */
export function RoutineLifecycleMenu({
  enabled,
  initialView = 'actions',
  onClose,
  onDelete,
  onEdit,
  onToggleEnabled,
  pending = false,
  title,
}: RoutineLifecycleMenuProps) {
  const { t } = useAppTranslation();
  const [view, setView] = useState(initialView);
  const confirmingDelete = view === 'delete-confirmation';

  const finish = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible>
      <View
        accessibilityLabel={confirmingDelete
          ? t('reminders.lifecycle.delete-confirm-title')
          : t('reminders.lifecycle.title')}
        accessibilityViewIsModal
        style={styles.overlay}
        testID="routine-lifecycle-modal">
        <View style={styles.scrim} testID="routine-lifecycle-scrim" />
        <View style={styles.frame}>
          <Card style={styles.card}>
            <Stack gap="md">
              <Stack gap="xs">
                <AppText variant="title3">
                  {confirmingDelete
                    ? t('reminders.lifecycle.delete-confirm-title')
                    : t('reminders.lifecycle.title')}
                </AppText>
                <AppText tone="secondary" variant="body">
                  {confirmingDelete
                    ? t('reminders.lifecycle.delete-confirm-body')
                    : title}
                </AppText>
              </Stack>

              {confirmingDelete ? (
                <Stack gap="sm">
                  <Button
                    disabled={pending}
                    label={t('reminders.lifecycle.delete')}
                    loading={pending}
                    onPress={() => {
                      finish(onDelete);
                    }}
                    variant="destructive"
                  />
                  <Button
                    label={t('reminders.lifecycle.cancel')}
                    onPress={onClose}
                    variant="tertiary"
                  />
                </Stack>
              ) : (
                <Stack gap="sm">
                  <Button
                    disabled={pending}
                    label={t('reminders.lifecycle.edit')}
                    onPress={() => {
                      finish(onEdit);
                    }}
                    variant="secondary"
                  />
                  <Button
                    disabled={pending}
                    label={enabled
                      ? t('reminders.lifecycle.pause')
                      : t('reminders.lifecycle.resume')}
                    loading={pending}
                    onPress={() => {
                      finish(() => {
                        onToggleEnabled(!enabled);
                      });
                    }}
                    variant="secondary"
                  />
                  <Button
                    disabled={pending}
                    label={t('reminders.lifecycle.delete')}
                    onPress={() => {
                      setView('delete-confirmation');
                    }}
                    textStyle={styles.deleteAction}
                    variant="tertiary"
                  />
                  <AppText style={styles.reassurance} tone="secondary" variant="footnote">
                    {t('reminders.lifecycle.diary-entries-stay')}
                  </AppText>
                  <Button
                    label={t('reminders.lifecycle.cancel')}
                    onPress={onClose}
                    variant="tertiary"
                  />
                </Stack>
              )}
            </Stack>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  deleteAction: {
    color: tokens.color.status.danger,
  },
  frame: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    maxWidth: tokens.layout.maxContentWidth,
    padding: tokens.layout.screenPaddingPhone,
    width: '100%',
  },
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  reassurance: {
    textAlign: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.color.surface.scrim,
  },
});
