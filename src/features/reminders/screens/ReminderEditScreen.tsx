import { StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { ListGroup } from '@/design/primitives/ListGroup';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { SectionHeader } from '@/design/primitives/SectionHeader';
import { Stack } from '@/design/primitives/Stack';
import { TextField } from '@/design/primitives/TextField';
import { Toggle } from '@/design/primitives/Toggle';
import { tokens } from '@/design/tokens';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';

type ReminderCategoryOption = Readonly<{
  icon: AppIconName;
  key: I18nKey;
}>;

const categoryOptions: readonly ReminderCategoryOption[] = [
  { icon: 'bowl', key: 'reminders.form.category-options.0' },
  { icon: 'pottyInside', key: 'reminders.form.category-options.1' },
  { icon: 'moon', key: 'reminders.form.category-options.2' },
  { icon: 'stethoscope', key: 'reminders.form.category-options.3' },
  { icon: 'personCluster', key: 'reminders.form.category-options.4' },
  { icon: 'sliders', key: 'reminders.form.category-options.5' },
];

export function ReminderEditScreen({
  onClose,
}: Readonly<{
  onClose: () => void;
}>) {
  const { t } = useAppTranslation();

  return (
    <Screen contentStyle={styles.content} modal>
      <Card accessibilityLabel={t('reminders.form.title-new')}>
        <Stack gap="lg">
          <Stack align="center" direction="horizontal" justify="space-between">
            <Button
              label={t('reminders.form.cancel')}
              onPress={onClose}
              variant="tertiary"
            />
            <AppText accessibilityRole="header" variant="headline">
              {t('reminders.form.title-new')}
            </AppText>
            <Button
              disabled
              label={t('reminders.form.save')}
              onPress={() => undefined}
              variant="tertiary"
            />
          </Stack>

          <Stack gap="md">
            <TextField
              label={t('reminders.form.field-name')}
              onChangeText={() => undefined}
              value=""
            />

            <SectionHeader title={t('reminders.form.field-category')} />
            <ListGroup>
              {categoryOptions.map((option) => (
                <ListRow
                  key={option.key}
                  leading={<AppIcon color={tokens.color.text.secondary} name={option.icon} />}
                  title={t(option.key)}
                  variant="settings"
                />
              ))}
            </ListGroup>
            <AppText tone="secondary" variant="footnote">
              {t('reminders.form.category-health-hint')}
            </AppText>

            <ListGroup>
              <View testID="reminder-edit-time-picker-row">
                <ListRow
                  accessory="chevron"
                  meta="7:30"
                  title={t('reminders.form.field-time')}
                />
              </View>
              <View testID="reminder-edit-repeat-picker-row">
                <ListRow
                  accessory="chevron"
                  meta={t('reminders.form.repeat-options.0')}
                  title={t('reminders.form.field-repeat')}
                />
              </View>
              <View testID="reminder-edit-timezone-picker-row">
                <ListRow
                  accessory="chevron"
                  meta={t('reminders.form.tz-auto-example')}
                  title={t('reminders.form.field-tz')}
                />
              </View>
              <ListRow
                title={t('reminders.form.toggle-quiet')}
                trailing={(
                  <Toggle
                    accessibilityLabel={t('reminders.form.toggle-quiet')}
                    onValueChange={() => undefined}
                    testID="reminder-edit-quiet-toggle"
                    value
                  />
                )}
              />
              <ListRow
                title={t('reminders.form.toggle-sound')}
                trailing={(
                  <Toggle
                    accessibilityLabel={t('reminders.form.toggle-sound')}
                    onValueChange={() => undefined}
                    testID="reminder-edit-sound-toggle"
                    value
                  />
                )}
              />
            </ListGroup>

            <AppText tone="secondary" variant="footnote">
              {t('reminders.form.hint')}
            </AppText>
          </Stack>
        </Stack>
      </Card>

      <TrustedSitterChecklistReminderCard />
      <QuietHoursCard />
      <ReminderPermissionDeniedCard />
    </Screen>
  );
}

function TrustedSitterChecklistReminderCard() {
  const { t } = useAppTranslation();
  const completedItems = 1;
  const totalItems = 3;
  const sitterName = 'Caregiver A';

  return (
    <Card
      accessibilityLabel={t('reminders.sitter-card.title-example')}
      testID="reminder-sitter-checklist-card">
      <View style={styles.sitterLayout}>
        <View
          style={styles.sitterAccent}
          testID="reminder-sitter-accent"
        />
        <Stack gap="md" style={styles.sitterBody}>
          <Stack align="center" direction="horizontal" gap="sm">
            <View
              style={styles.sitterIconBubble}
              testID="reminder-sitter-icon">
              <AppIcon
                color={tokens.color.primary[700]}
                name="personCluster"
                size={20}
              />
            </View>
            <View style={styles.sitterCopy}>
              <AppText tone="secondary" variant="footnote">
                {t('reminders.sections.sitter')}
              </AppText>
              <AppText variant="bodyEmph">
                {t('reminders.sitter-card.title-example')}
              </AppText>
              <AppText tone="secondary" variant="subheadline">
                {t('reminders.sitter-card.subtitle-template', {
                  n: totalItems,
                  name: sitterName,
                })}
              </AppText>
            </View>
          </Stack>

          <View
            accessibilityLabel={t('reminders.sitter-card.progress-a11y-template', {
              completed: completedItems,
              total: totalItems,
            })}
            accessibilityRole="progressbar"
            accessible
            style={styles.sitterProgressTrack}>
            <View
              style={[styles.sitterProgressFill, styles.sitterProgressOne]}
              testID="reminder-sitter-progress-fill"
            />
            <View
              style={[styles.sitterProgressRest, styles.sitterProgressTwo]}
              testID="reminder-sitter-progress-rest"
            />
          </View>

          <View style={styles.sitterActions}>
            <Button
              label={t('reminders.sitter-card.actions.0')}
              onPress={() => undefined}
              variant="secondary"
            />
            <Button
              label={t('reminders.sitter-card.actions.1')}
              onPress={() => undefined}
              variant="tertiary"
            />
            <Button
              label={t('reminders.sitter-card.actions.2')}
              onPress={() => undefined}
              variant="tertiary"
            />
          </View>
        </Stack>
      </View>
    </Card>
  );
}

function QuietHoursCard() {
  const { t } = useAppTranslation();

  return (
    <Card
      accessibilityLabel={t('reminders.quiet-hours.title')}
      testID="reminder-quiet-hours-card"
      variant="mutedTemplate">
      <Stack gap="md">
        <Stack align="center" direction="horizontal" justify="space-between">
          <View style={styles.iconBubble}>
            <AppIcon
              color={tokens.color.primary[700]}
              name="moon"
              size={20}
            />
          </View>
          <AppText accessibilityRole="header" style={styles.flexTitle} variant="headline">
            {t('reminders.quiet-hours.title')}
          </AppText>
          <Toggle
            accessibilityLabel={t('reminders.quiet-hours.toggle-per-puppy')}
            onValueChange={() => undefined}
            testID="reminder-quiet-hours-puppy-toggle"
            value={false}
          />
        </Stack>
        <View style={styles.quietRange}>
          <AppText variant="title">{t('reminders.quiet-hours.range-example')}</AppText>
        </View>
        <AppText tone="secondary" variant="subheadline">
          {t('reminders.quiet-hours.toggle-per-puppy')}
        </AppText>
        <AppText tone="secondary" variant="footnote">
          {t('reminders.quiet-hours.hint')}
        </AppText>
      </Stack>
    </Card>
  );
}

function ReminderPermissionDeniedCard() {
  const { t } = useAppTranslation();

  return (
    <Card
      accessibilityLabel={t('reminders.permission-denied.title')}
      style={styles.permissionCard}
      testID="reminder-permission-denied-card">
      <Stack gap="md">
        <Stack align="center" direction="horizontal" gap="sm">
          <View style={styles.permissionIconBubble}>
            <AppIcon
              color={tokens.color.status.info}
              name="bell"
              size={20}
            />
          </View>
          <View style={styles.permissionCopy}>
            <AppText variant="bodyEmph">{t('reminders.permission-denied.title')}</AppText>
            <AppText tone="secondary" variant="subheadline">
              {t('reminders.permission-denied.body')}
            </AppText>
          </View>
        </Stack>
        <Button
          label={t('reminders.permission-denied.how-to-enable')}
          onPress={() => undefined}
          variant="secondary"
        />
        <AppText tone="tertiary" variant="footnote">
          {t('reminders.permission-denied.tone-fallback')}
        </AppText>
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: tokens.space[4],
  },
  flexTitle: {
    flex: 1,
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[50],
    borderRadius: tokens.radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  permissionCard: {
    backgroundColor: tokens.color.status.infoTint,
  },
  permissionCopy: {
    flex: 1,
    gap: tokens.space[1],
  },
  permissionIconBubble: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderRadius: tokens.radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  quietRange: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderRadius: tokens.radius.md,
    padding: tokens.space[4],
  },
  sitterAccent: {
    alignSelf: 'stretch',
    backgroundColor: tokens.color.primary[600],
    borderRadius: tokens.radius.full,
    width: 3,
  },
  sitterActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  sitterBody: {
    flex: 1,
  },
  sitterCopy: {
    flex: 1,
    gap: tokens.space[1],
  },
  sitterIconBubble: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[50],
    borderRadius: tokens.radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sitterLayout: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  sitterProgressFill: {
    backgroundColor: tokens.color.primary[600],
    borderRadius: tokens.radius.full,
  },
  sitterProgressOne: {
    flex: 1,
  },
  sitterProgressRest: {
    backgroundColor: tokens.color.surface.sunken,
    borderRadius: tokens.radius.full,
  },
  sitterProgressTrack: {
    flexDirection: 'row',
    gap: tokens.space[1],
    height: 4,
  },
  sitterProgressTwo: {
    flex: 2,
  },
});
