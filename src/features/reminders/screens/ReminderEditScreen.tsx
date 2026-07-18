import { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { reminderScheduleDraftSchema } from '@/contracts/reminders';
import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { ListGroup } from '@/design/primitives/ListGroup';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { SectionHeader } from '@/design/primitives/SectionHeader';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill, type StatusPillTone } from '@/design/primitives/StatusPill';
import { TextField } from '@/design/primitives/TextField';
import { Toggle } from '@/design/primitives/Toggle';
import { tokens } from '@/design/tokens';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';
import { createExpoReminderNotificationAdapter } from '@/lib/notifications/expoReminderNotificationAdapter';
import type { NotificationPermissionStatus } from '@/lib/notifications/localReminderSync';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import {
  type ReminderCreateDraft,
  useCreateReminderMutation,
  useRemindersQuery,
  useUpdateReminderScheduleMutation,
} from '@/lib/query/reminders';

import { RoutineEditorScreen } from './RoutineEditorScreen';

type ReminderCategoryOption = Readonly<{
  icon: AppIconName;
  key: I18nKey;
}>;

export type ReminderEditReviewState =
  | 'loading'
  | 'pending-write'
  | 'error'
  | 'offline-read';

type ReminderEditStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

const categoryOptions: readonly ReminderCategoryOption[] = [
  { icon: 'bowl', key: 'reminders.form.category-options.0' },
  { icon: 'pottyInside', key: 'reminders.form.category-options.1' },
  { icon: 'moon', key: 'reminders.form.category-options.2' },
  { icon: 'stethoscope', key: 'reminders.form.category-options.3' },
  { icon: 'personCluster', key: 'reminders.form.category-options.4' },
  { icon: 'sliders', key: 'reminders.form.category-options.5' },
];

const reminderEditStateMeta: Record<ReminderEditReviewState, ReminderEditStateMeta> = {
  'error': {
    bodyKey: 'reminders.form.states.error.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'reminders.form.states.error.status',
    titleKey: 'reminders.form.states.error.title',
    tone: 'failed',
  },
  'loading': {
    bodyKey: 'reminders.form.states.loading.body',
    icon: 'bell',
    statusKey: 'reminders.form.states.loading.status',
    titleKey: 'reminders.form.states.loading.title',
    tone: 'pending',
  },
  'offline-read': {
    bodyKey: 'reminders.form.states.offline-read.body',
    icon: 'lock',
    statusKey: 'reminders.form.states.offline-read.status',
    titleKey: 'reminders.form.states.offline-read.title',
    tone: 'template',
  },
  'pending-write': {
    bodyKey: 'reminders.form.states.pending-write.body',
    icon: 'docText',
    liveRegion: 'polite',
    statusKey: 'reminders.form.states.pending-write.status',
    titleKey: 'reminders.form.states.pending-write.title',
    tone: 'pending',
  },
};

export function ReminderEditScreen({
  isSaving = false,
  onClose,
  onSaveReminder,
  permissionStatus = 'undetermined',
  reviewState,
}: Readonly<{
  isSaving?: boolean;
  onClose: () => void;
  onSaveReminder?: (draft: Pick<ReminderCreateDraft, 'reminderName' | 'respectQuietHours'>) =>
    Promise<void> | void;
  permissionStatus?: NotificationPermissionStatus;
  reviewState?: ReminderEditReviewState;
}>) {
  const { t } = useAppTranslation();
  const [localReviewState, setLocalReviewState] = useState<ReminderEditReviewState | undefined>();
  const [reminderName, setReminderName] = useState('');
  const [respectQuietHours, setRespectQuietHours] = useState(true);
  const visibleReviewState = reviewState ?? localReviewState;
  const isPendingWrite = isSaving || visibleReviewState === 'pending-write';
  const canSave = onSaveReminder !== undefined && reminderName.trim().length > 0 && !isPendingWrite;

  const handleOpenNotificationSettings = async () => {
    setLocalReviewState(undefined);
    try {
      await Linking.openSettings();
    } catch {
      setLocalReviewState('error');
    }
  };

  const handleSaveReminder = async () => {
    if (!canSave) {
      return;
    }

    setLocalReviewState(undefined);

    try {
      await onSaveReminder({ reminderName, respectQuietHours });
      onClose();
    } catch {
      setLocalReviewState('error');
    }
  };

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
              disabled={!canSave}
              label={t('reminders.form.save')}
              loading={isPendingWrite}
              onPress={() => {
                void handleSaveReminder();
              }}
              variant="tertiary"
            />
          </Stack>

          {visibleReviewState ? <ReminderEditStatePreview state={visibleReviewState} /> : null}

          <Stack gap="md">
            <TextField
              label={t('reminders.form.field-name')}
              onChangeText={setReminderName}
              value={reminderName}
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
                    onValueChange={setRespectQuietHours}
                    testID="reminder-edit-quiet-toggle"
                    value={respectQuietHours}
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
      {permissionStatus === 'denied' ? (
        <ReminderPermissionDeniedCard onOpenSettings={handleOpenNotificationSettings} />
      ) : null}
    </Screen>
  );
}

export function ConnectedReminderEditScreen({
  onClose,
  reminderId,
}: Readonly<{
  onClose: () => void;
  reminderId?: string;
}>) {
  const { t } = useAppTranslation();
  const notificationAdapter = useMemo(
    () => createExpoReminderNotificationAdapter(t),
    [t],
  );
  const activeCare = useActiveCareContext();
  const createReminder = useCreateReminderMutation();
  const updateReminder = useUpdateReminderScheduleMutation();
  const remindersQuery = useRemindersQuery(
    activeCare.careContext?.householdId,
    activeCare.careContext?.puppyId,
  );

  if (activeCare.status === 'loading') {
    return (
      <ReminderEditScreen
        onClose={onClose}
        reviewState="loading"
      />
    );
  }

  if (activeCare.status === 'error' || activeCare.careContext === null) {
    return (
      <ReminderEditScreen
        onClose={onClose}
        reviewState="error"
      />
    );
  }

  const careContext = activeCare.careContext;
  const existingReminder = reminderId === undefined
    ? undefined
    : remindersQuery.data?.find((reminder) => reminder.id === reminderId);
  const existingDraftResult = existingReminder === undefined
    ? undefined
    : reminderScheduleDraftSchema.safeParse({
      trackerId: existingReminder.reminder_type,
      rule: existingReminder.schedule_rule,
    });

  if (reminderId !== undefined && remindersQuery.isLoading) {
    return <ReminderEditScreen onClose={onClose} reviewState="loading" />;
  }

  if (reminderId !== undefined && (remindersQuery.isError || existingDraftResult?.success !== true)) {
    return <ReminderEditScreen onClose={onClose} reviewState="offline-read" />;
  }

  return (
    <RoutineEditorScreen
      initialDraft={existingDraftResult?.success === true ? existingDraftResult.data : undefined}
      isSaving={createReminder.isPending || updateReminder.isPending}
      mode={careContext.householdRole === 'viewer'
        ? 'viewer'
        : reminderId === undefined ? 'create' : 'edit'}
      onCancel={onClose}
      onSave={(schedule) => reminderId === undefined
        ? createReminder.mutateAsync({
          householdId: careContext.householdId,
          puppyId: careContext.puppyId,
          reminderName: schedule.rule.title ?? schedule.trackerId,
          schedule,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          todayDate: careContext.todayDate,
          userId: careContext.userId,
        }).then(() => undefined)
        : updateReminder.mutateAsync({
          householdId: careContext.householdId,
          puppyId: careContext.puppyId,
          reminderId,
          schedule,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          todayDate: careContext.todayDate,
        }).then(() => undefined)}
      onSaved={onClose}
      onRequestNotifications={async () => {
        await notificationAdapter.requestPermission();
      }}
    />
  );
}

export function ReminderEditStatePreview({
  state,
}: Readonly<{
  state: ReminderEditReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = reminderEditStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`reminder-edit-state-${state}`}
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

function ReminderPermissionDeniedCard({
  onOpenSettings,
}: Readonly<{
  onOpenSettings: () => Promise<void>;
}>) {
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
          onPress={() => {
            void onOpenSettings();
          }}
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
