import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';

import {
  AppIcon,
  type AppIconName,
  AppText,
  Card,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  Stack,
  StatusPill,
  type StatusPillTone,
  Toggle,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import {
  createNotificationPreferenceView,
  type NotificationPreferenceView,
  useNotificationPreferenceQuery,
  useUpdateNotificationPreferenceMutation,
} from '@/lib/query/notification-preferences';
import {
  type LocalReminderPreferenceController,
  useLocalReminderPreference,
} from '@/lib/notifications/localReminderPreference';

export type NotificationPreferencesReviewState =
  | 'loading'
  | 'pending-write'
  | 'error'
  | 'offline-read';

type NotificationPreferencesStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

const notificationPreferencesStateMeta: Record<
  NotificationPreferencesReviewState,
  NotificationPreferencesStateMeta
> = {
  error: {
    bodyKey: 'more.notifications.states.error.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'more.notifications.states.error.status',
    titleKey: 'more.notifications.states.error.title',
    tone: 'failed',
  },
  loading: {
    bodyKey: 'more.notifications.states.loading.body',
    icon: 'bell',
    liveRegion: 'polite',
    statusKey: 'more.notifications.states.loading.status',
    titleKey: 'more.notifications.states.loading.title',
    tone: 'pending',
  },
  'offline-read': {
    bodyKey: 'more.notifications.states.offline-read.body',
    icon: 'lock',
    statusKey: 'more.notifications.states.offline-read.status',
    titleKey: 'more.notifications.states.offline-read.title',
    tone: 'template',
  },
  'pending-write': {
    bodyKey: 'more.notifications.states.pending-write.body',
    icon: 'docText',
    liveRegion: 'polite',
    statusKey: 'more.notifications.states.pending-write.status',
    titleKey: 'more.notifications.states.pending-write.title',
    tone: 'pending',
  },
};

export type NotificationPreferencesScreenProps = Readonly<{
  localRemindersEnabled?: boolean;
  onChangeLocalReminders?: (enabled: boolean) => Promise<void> | void;
  onChangeReminderPush?: (enabled: boolean) => Promise<void> | void;
  onChangeSitterPush?: (enabled: boolean) => Promise<void> | void;
  onBack?: () => void;
  preferences?: NotificationPreferenceView;
  reviewState?: NotificationPreferencesReviewState;
}>;

export function NotificationPreferencesScreen({
  localRemindersEnabled: persistedLocalRemindersEnabled,
  onChangeLocalReminders,
  onChangeReminderPush,
  onChangeSitterPush,
  onBack,
  preferences,
  reviewState,
}: NotificationPreferencesScreenProps) {
  const { t } = useAppTranslation();
  const [localReviewState, setLocalReviewState] = useState<
    NotificationPreferencesReviewState | undefined
  >();
  const [localRemindersEnabled, setLocalRemindersEnabled] = useState(
    persistedLocalRemindersEnabled ?? true,
  );
  const visibleReviewState = reviewState ?? localReviewState;

  useEffect(() => {
    if (persistedLocalRemindersEnabled !== undefined) {
      setLocalRemindersEnabled(persistedLocalRemindersEnabled);
    }
  }, [persistedLocalRemindersEnabled]);

  const updateLocalReminders = async (enabled: boolean) => {
    setLocalReviewState(undefined);
    setLocalRemindersEnabled(enabled);
    try {
      await onChangeLocalReminders?.(enabled);
    } catch {
      setLocalReviewState('error');
    }
  };

  const updatePushPreference = async (
    enabled: boolean,
    onChange: ((value: boolean) => Promise<void> | void) | undefined,
  ) => {
    setLocalReviewState(undefined);
    try {
      await onChange?.(enabled);
      await Linking.openSettings();
    } catch {
      setLocalReviewState('error');
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      {onBack ? (
        <ScreenHeader
          backLabel={t('more.screen-title')}
          onBack={onBack}
          title={t('more.notifications.screen-title')}
        />
      ) : (
        <ScreenHeader title={t('more.notifications.screen-title')} />
      )}

      {visibleReviewState ? (
        <NotificationPreferencesStatePreview state={visibleReviewState} />
      ) : null}

      <NotificationSection title={t('more.notifications.section-local')}>
        <ListRow
          leading={<AppIcon name="bell" />}
          title={t('more.notifications.row-all-reminders')}
          trailing={(
            <Toggle
              accessibilityLabel={t('more.notifications.row-all-reminders')}
              onValueChange={(enabled) => {
                void updateLocalReminders(enabled);
              }}
              testID="notifications-local-all-toggle"
              value={localRemindersEnabled}
            />
          )}
          variant="settings"
        />
      </NotificationSection>
      <AppText
        style={styles.hint}
        tone="secondary"
        variant="footnote">
        {t('more.notifications.local-hint')}
      </AppText>

      <NotificationSection title={t('more.notifications.section-push')}>
        <ListRow
          leading={<AppIcon name="bell" />}
          title={t('more.notifications.row-push-reminders')}
          trailing={(
            <Toggle
              accessibilityLabel={t('more.notifications.row-push-reminders')}
              onValueChange={(enabled) => {
                void updatePushPreference(enabled, onChangeReminderPush);
              }}
              testID="notifications-push-reminders-toggle"
              value={preferences?.reminderPushEnabled ?? true}
            />
          )}
          variant="settings"
        />
        <ListRow
          leading={<AppIcon name="check" />}
          title={t('more.notifications.row-push-sitter')}
          trailing={(
            <Toggle
              accessibilityLabel={t('more.notifications.row-push-sitter')}
              onValueChange={(enabled) => {
                void updatePushPreference(enabled, onChangeSitterPush);
              }}
              testID="notifications-push-sitter-toggle"
              value={preferences?.trustedSitterCompletionPushEnabled ?? true}
            />
          )}
          variant="settings"
        />
      </NotificationSection>
      <AppText
        style={styles.hint}
        tone="secondary"
        variant="footnote">
        {t('more.notifications.push-hint')}
      </AppText>

      <NotificationSection title={t('more.notifications.section-quiet-hours')}>
        <ListRow
          accessibilityLabel={t('more.notifications.quiet-hours-example')}
          accessory="chevron"
          leading={<AppIcon name="moon" />}
          onPress={() => undefined}
          title={t('more.notifications.quiet-hours-example')}
          variant="settings"
        />
      </NotificationSection>

      <NotificationSection title={t('more.notifications.section-tz')}>
        <ListRow
          accessibilityLabel={t('more.notifications.tz-example')}
          accessory="chevron"
          leading={<AppIcon name="today" />}
          onPress={() => undefined}
          title={t('more.notifications.tz-example')}
          variant="settings"
        />
      </NotificationSection>
    </Screen>
  );
}

export function ConnectedNotificationPreferencesScreen({
  localReminderPreference,
  onBack,
}: Readonly<{
  localReminderPreference?: LocalReminderPreferenceController;
  onBack?: () => void;
}>) {
  const activeCare = useActiveCareContext();
  const preferenceQuery = useNotificationPreferenceQuery(activeCare.careContext);
  const updatePreferenceMutation = useUpdateNotificationPreferenceMutation();
  const localReminderPreferenceState = useLocalReminderPreference(localReminderPreference);

  if (
    activeCare.status === 'loading'
    || preferenceQuery.isLoading
  ) {
    return (
      <NotificationPreferencesScreen
        onBack={onBack}
        reviewState="loading"
      />
    );
  }

  if (
    activeCare.status === 'error'
    || preferenceQuery.isError
    || localReminderPreferenceState.isError
    || activeCare.careContext === null
  ) {
    return (
      <NotificationPreferencesScreen
        onBack={onBack}
        reviewState="error"
      />
    );
  }

  const careContext = activeCare.careContext;
  const preferences = createNotificationPreferenceView(preferenceQuery.data ?? null);
  const reviewState = updatePreferenceMutation.isPending
    ? 'pending-write'
    : updatePreferenceMutation.isError
      ? 'error'
      : undefined;

  return (
    <NotificationPreferencesScreen
      localRemindersEnabled={localReminderPreferenceState.enabled}
      onBack={onBack}
      onChangeLocalReminders={localReminderPreferenceState.setEnabled}
      onChangeReminderPush={async (enabled) => {
        await updatePreferenceMutation.mutateAsync({
          householdId: careContext.householdId,
          reminderPushEnabled: enabled,
          timezone: preferences.timezone,
          trustedSitterCompletionPushEnabled: preferences.trustedSitterCompletionPushEnabled,
          userId: careContext.userId,
        });
      }}
      onChangeSitterPush={async (enabled) => {
        await updatePreferenceMutation.mutateAsync({
          householdId: careContext.householdId,
          reminderPushEnabled: preferences.reminderPushEnabled,
          timezone: preferences.timezone,
          trustedSitterCompletionPushEnabled: enabled,
          userId: careContext.userId,
        });
      }}
      preferences={preferences}
      reviewState={reviewState}
    />
  );
}

export function NotificationPreferencesStatePreview({
  state,
}: Readonly<{
  state: NotificationPreferencesReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = notificationPreferencesStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`notifications-state-${state}`}
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
function NotificationSection({
  children,
  title,
}: Readonly<{
  children: ReactNode;
  title: string;
}>) {
  return (
    <Stack gap="xs">
      <SectionHeader
        title={title}
        titleStyle={styles.sectionTitle}
      />
      <ListGroup>{children}</ListGroup>
    </Stack>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.layout.tabBarHeight + tokens.space[6],
  },
  hint: {
    paddingHorizontal: tokens.layout.cardPadding,
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
});
