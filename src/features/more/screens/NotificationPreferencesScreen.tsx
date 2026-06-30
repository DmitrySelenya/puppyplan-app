import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import {
  AppIcon,
  AppText,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  Stack,
  Toggle,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

export type NotificationPreferencesScreenProps = Readonly<{
  onBack?: () => void;
}>;

export function NotificationPreferencesScreen({
  onBack,
}: NotificationPreferencesScreenProps) {
  const { t } = useAppTranslation();

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

      <NotificationSection title={t('more.notifications.section-local')}>
        <ListRow
          leading={<AppIcon name="bell" />}
          title={t('more.notifications.row-all-reminders')}
          trailing={(
            <Toggle
              accessibilityLabel={t('more.notifications.row-all-reminders')}
              onValueChange={() => undefined}
              testID="notifications-local-all-toggle"
              value
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
              onValueChange={() => undefined}
              testID="notifications-push-reminders-toggle"
              value
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
              onValueChange={() => undefined}
              testID="notifications-push-sitter-toggle"
              value
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
