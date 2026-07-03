import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppIcon,
  type AppIconName,
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
  type StatusPillTone,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';

export type HouseholdAccessScreenProps = Readonly<{
  onBack?: () => void;
  reviewState?: HouseholdAccessReviewState;
}>;

export type HouseholdAccessReviewState =
  | 'loading'
  | 'pending-write'
  | 'error'
  | 'offline-read';

type HouseholdAccessStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

const householdAccessStateMeta: Record<
  HouseholdAccessReviewState,
  HouseholdAccessStateMeta
> = {
  error: {
    bodyKey: 'sharing.family.manage.states.error.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'sharing.family.manage.states.error.status',
    titleKey: 'sharing.family.manage.states.error.title',
    tone: 'failed',
  },
  loading: {
    bodyKey: 'sharing.family.manage.states.loading.body',
    icon: 'personCluster',
    liveRegion: 'polite',
    statusKey: 'sharing.family.manage.states.loading.status',
    titleKey: 'sharing.family.manage.states.loading.title',
    tone: 'pending',
  },
  'offline-read': {
    bodyKey: 'sharing.family.manage.states.offline-read.body',
    icon: 'lock',
    statusKey: 'sharing.family.manage.states.offline-read.status',
    titleKey: 'sharing.family.manage.states.offline-read.title',
    tone: 'template',
  },
  'pending-write': {
    bodyKey: 'sharing.family.manage.states.pending-write.body',
    icon: 'docText',
    liveRegion: 'polite',
    statusKey: 'sharing.family.manage.states.pending-write.status',
    titleKey: 'sharing.family.manage.states.pending-write.title',
    tone: 'pending',
  },
};

const ownerName = 'Owner';
const caregiverName = 'Caregiver';
const pendingContactLabel = 'Pending caregiver';
const caregiverLastActive = '8 min ago';
const pendingExpiryDate = '24 May';

export function HouseholdAccessScreen({
  onBack,
  reviewState,
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

      {reviewState ? <HouseholdAccessStatePreview state={reviewState} /> : null}

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

export function HouseholdAccessStatePreview({
  state,
}: Readonly<{
  state: HouseholdAccessReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = householdAccessStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`household-state-${state}`}
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
