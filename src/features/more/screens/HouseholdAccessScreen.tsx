import { type ReactNode, useState } from 'react';
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
import type { CreateInviteResponse, InviteRecord } from '@/contracts/supabase';
import { copyTextToClipboard } from '@/lib/clipboard';
import { type AppTranslate, type I18nKey, type SupportedLocale, useAppTranslation } from '@/lib/i18n';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import {
  useCreateHouseholdInviteMutation,
  useHouseholdInvitesQuery,
} from '@/lib/query/household-access';

export type HouseholdAccessScreenProps = Readonly<{
  copyInviteLink?: (link: string) => Promise<void>;
  onBack?: () => void;
  reviewState?: HouseholdAccessReviewState;
}>;

export type HouseholdAccessReviewState =
  | 'loading'
  | 'pending-write'
  | 'error'
  | 'empty'
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
  empty: {
    bodyKey: 'sharing.family.manage.states.empty.body',
    icon: 'personCluster',
    statusKey: 'sharing.family.manage.states.empty.status',
    titleKey: 'sharing.family.manage.states.empty.title',
    tone: 'template',
  },
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
  copyInviteLink = copyTextToClipboard,
  onBack,
  reviewState,
}: HouseholdAccessScreenProps) {
  const { locale, t } = useAppTranslation();
  const activeCare = useActiveCareContext();
  const createInvite = useCreateHouseholdInviteMutation();
  const ownerHouseholdId = activeCare.status === 'ready'
    && activeCare.careContext?.householdRole === 'owner'
    ? activeCare.careContext.householdId
    : undefined;
  const householdInvites = useHouseholdInvitesQuery(ownerHouseholdId);
  const [createdInvite, setCreatedInvite] = useState<CreateInviteResponse>();
  const [createFailed, setCreateFailed] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
  const visibleReviewState = reviewState
    ?? getHouseholdAccessReviewState(activeCare.status, householdInvites.isLoading, householdInvites.isError);
  const livePendingInvites: readonly InviteRecord[] = householdInvites.data ?? [];
  const pendingInviteRows = livePendingInvites.map((invite) => ({
    date: formatInviteExpiryDate(invite.expires_at, locale),
    id: invite.id,
    title: getPendingInviteTitle(invite, t),
  }));
  const inviteLink = createdInvite
    ? `puppyplan://invite/${createdInvite.token}`
    : undefined;

  async function handleCreateInvite() {
    setCreateFailed(false);
    setCopyState('idle');
    setCreatedInvite(undefined);

    try {
      setCreatedInvite(await createInvite.mutateAsync());
    } catch {
      setCreateFailed(true);
    }
  }

  async function handleCopyInviteLink() {
    if (!inviteLink) {
      return;
    }

    setCopyState('idle');
    try {
      await copyInviteLink(inviteLink);
      setCopyState('success');
    } catch {
      setCopyState('error');
    }
  }

  const blockingReviewState = visibleReviewState
    ?? (activeCare.status !== 'ready' || activeCare.careContext === null ? 'error' : undefined);

  if (blockingReviewState !== undefined || activeCare.careContext === null) {
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
        <HouseholdAccessStatePreview state={blockingReviewState ?? 'error'} />
      </Screen>
    );
  }

  const currentMemberRole: HouseholdRole = activeCare.careContext.householdRole;
  const currentMemberBadge = householdRoleBadge[currentMemberRole];
  const isOwner = currentMemberRole === 'owner';
  const introTitleKey: I18nKey = isOwner
    ? 'sharing.family.today-prompt.title'
    : 'sharing.family.manage.non-owner-intro-title';
  const introBodyKey: I18nKey = isOwner
    ? 'sharing.family.today-prompt.body'
    : 'sharing.family.manage.non-owner-intro-body';
  const memberSubtitleKey: I18nKey = isOwner
    ? 'sharing.common.disclosure-can-close'
    : 'sharing.family.manage.non-owner-member-subtitle';

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

      <Card accessibilityLabel={t(introTitleKey)} testID="household-intro-card">
        <Stack gap="sm" style={styles.introLayout}>
          <View style={styles.iconBubble}>
            <AppIcon color={tokens.color.primary[700]} name="personCluster" size={24} />
          </View>
          <Stack gap="xs" style={styles.introCopy}>
            <AppText variant="headline">{t(introTitleKey)}</AppText>
            <AppText tone="secondary" variant="body">
              {t(introBodyKey)}
            </AppText>
          </Stack>
        </Stack>
      </Card>

      <HouseholdSection title={t('sharing.family.manage.section-members')}>
        <MemberRow
          avatarTone="accent"
          name={t('sharing.family.manage.member-you')}
          subtitle={t(memberSubtitleKey)}
          trailing={(
            <HouseholdStatusPill
              iconName={currentMemberBadge.iconName}
              label={t(currentMemberBadge.labelKey)}
              tone={currentMemberBadge.tone}
            />
          )}
        />
      </HouseholdSection>

      {isOwner ? (
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
                  <OverflowButton />
                </Stack>
              )}
            />
          ))}
        </HouseholdSection>
      ) : null}

      {isOwner && createdInvite && inviteLink ? (
        <Card
          accessibilityLabel={t('sharing.family.manage.invite-link.title')}
          testID="household-invite-link-card">
          <Stack gap="sm">
            <AppText variant="headline">
              {t('sharing.family.manage.invite-link.title')}
            </AppText>
            <AppText tone="secondary" variant="body">
              {t('sharing.family.manage.invite-link.body')}
            </AppText>
            <AppText
              accessibilityLabel={t('sharing.family.manage.invite-link.accessibility-label')}
              selectable
              testID="household-invite-link"
              tone="link"
              variant="code">
              {inviteLink}
            </AppText>
            <AppText tone="secondary" variant="footnote">
              {t('sharing.family.manage.invite-link.last4', {
                last4: createdInvite.token.slice(-4),
              })}
            </AppText>
            <Button
              label={t('sharing.family.manage.invite-link.copy')}
              onPress={handleCopyInviteLink}
              variant="secondary"
            />
            {copyState === 'success' ? (
              <AppText
                accessibilityLiveRegion="polite"
                testID="household-invite-copy-success"
                tone="secondary"
                variant="footnote">
                {t('sharing.family.manage.invite-link.copy-success')}
              </AppText>
            ) : null}
            {copyState === 'error' ? (
              <AppText
                accessibilityRole="alert"
                testID="household-invite-copy-error"
                variant="footnote">
                {t('sharing.family.manage.invite-link.copy-error')}
              </AppText>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      {isOwner && createFailed ? (
        <AppText
          accessibilityRole="alert"
          testID="household-invite-create-error"
          variant="footnote">
          {t('sharing.family.manage.invite-link.create-error')}
        </AppText>
      ) : null}

      {isOwner ? (
        <Button
          label={t('sharing.family.manage.invite-cta')}
          loading={createInvite.isPending}
          onPress={handleCreateInvite}
        />
      ) : null}
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

  if (activeCareStatus === 'empty') {
    return 'empty';
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
  sectionTitle: {
    textTransform: 'uppercase',
  },
  trailingCluster: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
