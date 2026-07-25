import type { ReactNode } from 'react';
import { useState } from 'react';
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
import type { InviteRecord } from '@/contracts/supabase';
import { type AppTranslate, type I18nKey, type SupportedLocale, useAppTranslation } from '@/lib/i18n';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useHouseholdInvitesQuery } from '@/lib/query/household-access';

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

type HouseholdRole = 'owner' | 'caregiver' | 'viewer';

const householdRoleBadge: Record<HouseholdRole, Readonly<{
  iconName: 'home' | 'personCluster';
  labelKey: I18nKey;
  tone: 'completed' | 'pending';
}>> = {
  caregiver: {
    iconName: 'personCluster',
    labelKey: 'sharing.family.manage.badge-caregiver',
    tone: 'pending',
  },
  owner: {
    iconName: 'home',
    labelKey: 'sharing.family.manage.badge-owner',
    tone: 'completed',
  },
  viewer: {
    iconName: 'personCluster',
    labelKey: 'sharing.family.manage.badge-viewer',
    tone: 'pending',
  },
};

export function HouseholdAccessScreen({
  onBack,
  reviewState,
}: HouseholdAccessScreenProps) {
  const { locale, t } = useAppTranslation();
  const [actionUnavailableVisible, setActionUnavailableVisible] = useState(false);
  const activeCare = useActiveCareContext();
  const householdInvites = useHouseholdInvitesQuery(activeCare.careContext?.householdId);
  const visibleReviewState = reviewState
    ?? getHouseholdAccessReviewState(activeCare.status, householdInvites.isLoading, householdInvites.isError);
  const livePendingInvites: readonly InviteRecord[] = householdInvites.data ?? [];
  const pendingInviteRows = livePendingInvites.map((invite) => ({
    date: formatInviteExpiryDate(invite.expires_at, locale),
    id: invite.id,
    title: getPendingInviteTitle(invite, t),
  }));
  const currentMemberRole: HouseholdRole = activeCare.careContext?.householdRole ?? 'owner';
  const currentMemberBadge = householdRoleBadge[currentMemberRole];

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

      {visibleReviewState ? <HouseholdAccessStatePreview state={visibleReviewState} /> : null}

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
          name={t('sharing.family.manage.member-you')}
          subtitle={t('sharing.common.disclosure-can-close')}
          trailing={(
            <HouseholdStatusPill
              iconName={currentMemberBadge.iconName}
              label={t(currentMemberBadge.labelKey)}
              tone={currentMemberBadge.tone}
            />
          )}
        />
      </HouseholdSection>

      <HouseholdSection title={t('sharing.family.manage.section-invites')}>
        {pendingInviteRows.length === 0 ? (
          <ListRow
            title={t('sharing.family.manage.invites-empty')}
            variant="settings"
          />
        ) : pendingInviteRows.map((invite) => (
          <MemberRow
            avatarTone="auto"
            key={invite.id}
            name={invite.title}
            subtitle={t('sharing.family.manage.pending-until', {
              date: invite.date,
            })}
            trailing={(
              <Stack gap="sm" style={styles.trailingCluster}>
                <HouseholdStatusPill
                  iconName="calendar"
                  label={t('sharing.family.manage.badge-pending')}
                  tone="needsVetReview"
                />
                <OverflowButton onPress={() => setActionUnavailableVisible(true)} />
              </Stack>
            )}
          />
        ))}
      </HouseholdSection>

      <Card style={styles.ownerHintCard} variant="mutedTemplate">
        <Stack gap="xs">
          <AppText variant="headline">{t('sharing.family.today-prompt.title')}</AppText>
          <AppText tone="secondary" variant="body">
            {t('sharing.family.today-prompt.body')}
          </AppText>
        </Stack>
      </Card>

      {actionUnavailableVisible ? (
        <Card
          accessibilityLabel={t('sharing.family.manage.actions-unavailable')}
          accessibilityLiveRegion="polite"
          testID="household-action-unavailable"
          variant="mutedTemplate">
          <AppText tone="secondary" variant="body">
            {t('sharing.family.manage.actions-unavailable')}
          </AppText>
        </Card>
      ) : null}

      <Button
        label={t('sharing.family.manage.invite-cta')}
        onPress={() => setActionUnavailableVisible(true)}
      />
    </Screen>
  );
}

function getHouseholdAccessReviewState(
  activeCareStatus: ReturnType<typeof useActiveCareContext>['status'],
  invitesLoading: boolean,
  invitesError: boolean,
): HouseholdAccessReviewState | undefined {
  if (activeCareStatus === 'loading' || invitesLoading) {
    return 'loading';
  }

  if (activeCareStatus === 'error' || invitesError) {
    return 'error';
  }

  return undefined;
}

function getPendingInviteTitle(invite: InviteRecord, t: AppTranslate): string {
  return invite.role === 'viewer'
    ? t('sharing.family.manage.pending-invite-viewer')
    : t('sharing.family.manage.pending-invite-caregiver');
}

function formatInviteExpiryDate(timestamp: string, locale: SupportedLocale): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp.slice(0, 10);
  }

  const parts = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  return day !== undefined && month !== undefined
    ? `${day} ${month}`
    : timestamp.slice(0, 10);
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

function OverflowButton({ onPress }: Readonly<{ onPress: () => void }>) {
  const { t } = useAppTranslation();

  return (
    <IconButton
      accessibilityLabel={t('today.history.item-actions')}
      icon={<AppIcon color={tokens.color.text.tertiary} name="more" />}
      onPress={onPress}
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
