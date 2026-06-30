import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppIcon,
  AppText,
  Avatar,
  Button,
  Card,
  IconButton,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  Stack,
  StatusPill,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

export type HouseholdAccessScreenProps = Readonly<{
  onBack?: () => void;
}>;

const ownerName = 'Owner';
const caregiverName = 'Caregiver';
const pendingContactLabel = 'Pending caregiver';
const caregiverLastActive = '8 min ago';
const pendingExpiryDate = '24 May';

export function HouseholdAccessScreen({
  onBack,
}: HouseholdAccessScreenProps) {
  const { t } = useAppTranslation();

  return (
    <Screen contentStyle={styles.content}>
      {onBack ? (
        <ScreenHeader
          backLabel={t('more.screen-title')}
          onBack={onBack}
          title={t('sharing.family.manage.screen-title')}
        />
      ) : (
        <ScreenHeader title={t('sharing.family.manage.screen-title')} />
      )}

      <Card accessibilityLabel={t('sharing.family.today-prompt.title')} testID="household-intro-card">
        <Stack gap="sm" style={styles.introLayout}>
          <View style={styles.iconBubble}>
            <AppIcon color={tokens.color.primary[700]} name="personCluster" size={24} />
          </View>
          <Stack gap="xs" style={styles.introCopy}>
            <AppText variant="headline">{t('sharing.family.today-prompt.title')}</AppText>
            <AppText tone="secondary" variant="body">
              {t('sharing.family.today-prompt.body')}
            </AppText>
          </Stack>
        </Stack>
      </Card>

      <HouseholdSection title={t('sharing.family.manage.section-members')}>
        <MemberRow
          avatarTone="accent"
          name={ownerName}
          subtitle={t('sharing.common.disclosure-can-close')}
          trailing={(
            <HouseholdStatusPill
              iconName="home"
              label={t('sharing.family.manage.badge-owner')}
              tone="completed"
            />
          )}
        />
        <MemberRow
          avatarTone="auto"
          name={caregiverName}
          subtitle={t('sharing.family.manage.active-ago', {
            timeAgo: caregiverLastActive,
          })}
          trailing={(
            <Stack gap="sm" style={styles.trailingCluster}>
              <HouseholdStatusPill
                iconName="personCluster"
                label={t('sharing.family.manage.badge-caregiver')}
                tone="pending"
              />
              <OverflowButton />
            </Stack>
          )}
        />
      </HouseholdSection>

      <HouseholdSection title={t('sharing.family.manage.section-invites')}>
        <MemberRow
          avatarTone="auto"
          name={pendingContactLabel}
          subtitle={t('sharing.family.manage.pending-until', {
            date: pendingExpiryDate,
          })}
          trailing={(
            <Stack gap="sm" style={styles.trailingCluster}>
              <HouseholdStatusPill
                iconName="calendar"
                label={t('sharing.family.manage.badge-pending')}
                tone="needsVetReview"
              />
              <OverflowButton />
            </Stack>
          )}
        />
      </HouseholdSection>

      <Card style={styles.ownerHintCard} variant="mutedTemplate">
        <Stack gap="xs">
          <AppText variant="headline">{t('sharing.family.today-prompt.title')}</AppText>
          <AppText tone="secondary" variant="body">
            {t('sharing.family.today-prompt.body')}
          </AppText>
        </Stack>
      </Card>

      <Button
        label={t('sharing.family.manage.invite-cta')}
        onPress={() => undefined}
      />
    </Screen>
  );
}

function HouseholdSection({
  children,
  title,
}: Readonly<{
  children: ReactNode;
  title: string;
}>) {
  return (
    <Stack gap="xs">
      <SectionHeader title={title} titleStyle={styles.sectionTitle} />
      <ListGroup>{children}</ListGroup>
    </Stack>
  );
}

function MemberRow({
  avatarTone,
  name,
  subtitle,
  trailing,
}: Readonly<{
  avatarTone: 'accent' | 'auto';
  name: string;
  subtitle: string;
  trailing: ReactNode;
}>) {
  return (
    <ListRow
      leading={<Avatar label={name} size="md" tone={avatarTone} />}
      subtitle={subtitle}
      title={name}
      trailing={trailing}
      variant="settings"
    />
  );
}

function HouseholdStatusPill({
  iconName,
  label,
  tone,
}: Readonly<{
  iconName: 'calendar' | 'home' | 'personCluster';
  label: string;
  tone: 'completed' | 'needsVetReview' | 'pending';
}>) {
  return (
    <StatusPill
      accessibilityLabel={label}
      icon={<AppIcon name={iconName} size={14} />}
      label={label}
      tone={tone}
    />
  );
}

function OverflowButton() {
  const { t } = useAppTranslation();

  return (
    <IconButton
      accessibilityLabel={t('today.history.item-actions')}
      icon={<AppIcon color={tokens.color.text.tertiary} name="more" />}
      onPress={() => undefined}
      style={styles.overflowButton}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.layout.tabBarHeight + tokens.space[6],
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[100],
    borderRadius: tokens.radius.full,
    height: tokens.space[10],
    justifyContent: 'center',
    width: tokens.space[10],
  },
  introCopy: {
    flex: 1,
    minWidth: 0,
  },
  introLayout: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  overflowButton: {
    minHeight: tokens.space[10] + tokens.space[1],
    minWidth: tokens.space[10] + tokens.space[1],
  },
  ownerHintCard: {
    backgroundColor: tokens.color.surface.sunken,
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
  trailingCluster: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
