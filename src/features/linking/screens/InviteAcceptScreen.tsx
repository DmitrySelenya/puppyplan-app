import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  AppIcon,
  type AppIconName,
  AppText,
  Button,
  Card,
  Screen,
  Stack,
  StatusPill,
  type StatusPillTone,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';

import { AccessUnavailableScreen } from './AccessUnavailableScreen';

export type InviteAcceptReviewState =
  | 'loading'
  | 'load-error'
  | 'expired'
  | 'already-member';

type InviteAcceptStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

const inviteAcceptStateMeta: Record<InviteAcceptReviewState, InviteAcceptStateMeta> = {
  'already-member': {
    bodyKey: 'sharing.family.accepted.states.already-member.body',
    icon: 'check',
    statusKey: 'sharing.family.accepted.states.already-member.status',
    titleKey: 'sharing.family.accepted.states.already-member.title',
    tone: 'confirmed',
  },
  expired: {
    bodyKey: 'sharing.family.accepted.states.expired.body',
    icon: 'lock',
    statusKey: 'sharing.family.accepted.states.expired.status',
    titleKey: 'sharing.family.accepted.states.expired.title',
    tone: 'template',
  },
  'load-error': {
    bodyKey: 'sharing.family.accepted.states.load-error.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'sharing.family.accepted.states.load-error.status',
    titleKey: 'sharing.family.accepted.states.load-error.title',
    tone: 'failed',
  },
  loading: {
    bodyKey: 'sharing.family.accepted.states.loading.body',
    icon: 'calendar',
    liveRegion: 'polite',
    statusKey: 'sharing.family.accepted.states.loading.status',
    titleKey: 'sharing.family.accepted.states.loading.title',
    tone: 'pending',
  },
};

export type InviteAcceptScreenProps = Readonly<{
  inviteToken?: string;
  onAccept?: () => void;
  onAcknowledge: () => void;
  onDecline?: () => void;
  ownerName?: string;
  puppyName?: string;
  reviewState?: InviteAcceptReviewState;
}>;

export function InviteAcceptScreen({
  onAccept,
  onAcknowledge,
  onDecline,
  ownerName,
  puppyName,
  reviewState,
}: InviteAcceptScreenProps) {
  const { t } = useAppTranslation();
  const [actionUnavailableVisible, setActionUnavailableVisible] = useState(false);

  if (ownerName === undefined || puppyName === undefined) {
    return <AccessUnavailableScreen onAcknowledge={onAcknowledge} />;
  }

  const translationOptions = { ownerName, puppyName };
  const isLoadingInvite = reviewState === 'loading';
  const runInviteAction = (action: (() => void) | undefined) => {
    if (action === undefined) {
      setActionUnavailableVisible(true);
      return;
    }

    action();
  };

  return (
    <Screen contentStyle={styles.content}>
      <Stack gap="lg">
        <Stack gap="sm">
          <AppIcon color={tokens.color.primary[700]} filled name="personCluster" size={36} />
          <AppText variant="title">
            {t('sharing.family.accepted.header', translationOptions)}
          </AppText>
          <AppText tone="secondary" variant="headline">
            {t('sharing.family.accepted.role-caregiver')}
          </AppText>
        </Stack>

        <Card testID="invite-accept-preview-card">
          <Stack gap="md">
            <PreviewBlock
              icon="check"
              iconColor={tokens.color.primary[700]}
              title={t('sharing.family.accepted.what-included')}>
              <Bullet icon="check" iconColor={tokens.color.primary[700]}>
                {t('sharing.family.accepted.caregiver-included-bullets.0', { puppyName })}
              </Bullet>
              <Bullet icon="check" iconColor={tokens.color.primary[700]}>
                {t('sharing.family.accepted.caregiver-included-bullets.1')}
              </Bullet>
              <Bullet icon="check" iconColor={tokens.color.primary[700]}>
                {t('sharing.family.accepted.caregiver-included-bullets.2')}
              </Bullet>
            </PreviewBlock>

            <Stack style={styles.divider} />

            <PreviewBlock
              icon="lock"
              iconColor={tokens.color.text.tertiary}
              title={t('sharing.family.accepted.what-excluded')}>
              <Bullet icon="lock" iconColor={tokens.color.text.tertiary}>
                {t('sharing.family.accepted.caregiver-excluded-bullets.0')}
              </Bullet>
              <Bullet icon="lock" iconColor={tokens.color.text.tertiary}>
                {t('sharing.family.accepted.caregiver-excluded-bullets.1')}
              </Bullet>
            </PreviewBlock>
          </Stack>
        </Card>

        {reviewState ? <InviteAcceptStatePreview state={reviewState} /> : null}

        <Card style={styles.disclosureCard} variant="mutedTemplate">
          <AppText tone="secondary" variant="body">
            {t('sharing.family.accepted.disclosure', { ownerName })}
          </AppText>
        </Card>

        {actionUnavailableVisible ? (
          <Card
            accessibilityLabel={t('sharing.family.accepted.action-unavailable')}
            accessibilityLiveRegion="polite"
            testID="invite-action-unavailable"
            variant="mutedTemplate">
            <AppText tone="secondary" variant="body">
              {t('sharing.family.accepted.action-unavailable')}
            </AppText>
          </Card>
        ) : null}

        <Stack gap="sm">
          <Button
            label={t('sharing.family.accepted.accept')}
            loading={isLoadingInvite}
            onPress={() => runInviteAction(onAccept)}
          />
          <Button
            label={t('sharing.family.accepted.decline')}
            onPress={() => runInviteAction(onDecline)}
            variant="tertiary"
          />
        </Stack>
      </Stack>
    </Screen>
  );
}

export function InviteAcceptStatePreview({
  state,
}: Readonly<{
  state: InviteAcceptReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = inviteAcceptStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`invite-accept-state-${state}`}
      variant={state === 'expired' ? 'mutedTemplate' : 'resting'}>
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

function PreviewBlock({
  children,
  icon,
  iconColor,
  title,
}: Readonly<{
  children: ReactNode;
  icon: 'check' | 'lock';
  iconColor: string;
  title: string;
}>) {
  return (
    <Stack gap="sm">
      <Stack gap="sm" style={styles.previewTitleRow}>
        <AppIcon color={iconColor} name={icon} size={20} />
        <AppText variant="headline">{title}</AppText>
      </Stack>
      <Stack gap="xs">{children}</Stack>
    </Stack>
  );
}

function Bullet({
  children,
  icon,
  iconColor,
}: Readonly<{
  children: string;
  icon: 'check' | 'lock';
  iconColor: string;
}>) {
  return (
    <Stack gap="sm" style={styles.bulletRow}>
      <AppIcon color={iconColor} name={icon} size={16} />
      <AppText style={styles.bulletCopy} variant="body">
        {children}
      </AppText>
    </Stack>
  );
}

const styles = StyleSheet.create({
  bulletCopy: {
    flex: 1,
    minWidth: 0,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  content: {
    paddingBottom: tokens.layout.tabBarHeight + tokens.space[6],
  },
  disclosureCard: {
    backgroundColor: tokens.color.status.infoTint,
    borderColor: tokens.color.status.info,
  },
  divider: {
    backgroundColor: tokens.color.stroke.default,
    height: StyleSheet.hairlineWidth,
  },
  previewTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
