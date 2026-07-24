import { type ReactNode, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { householdInviteInputSchema } from '@/contracts/supabase';
import {
  AppIcon,
  type AppIconName,
  AppText,
  Button,
  Card,
  Screen,
  Stack,
  StatusPill,
  TextField,
  type StatusPillTone,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAuth } from '@/lib/auth';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';
import { useAcceptHouseholdInviteMutation } from '@/lib/query/household-access';
import { pendingHouseholdInviteController } from '@/lib/storage/pendingHouseholdInvite';
import { usePersistPendingHouseholdInvite } from '@/lib/storage/usePendingHouseholdInvite';
import { isHouseholdInviteUnavailableError } from '@/lib/supabase/household-access';

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
  acceptDisabled?: boolean;
  acceptPending?: boolean;
  fallbackError?: boolean;
  fallbackPending?: boolean;
  inviteToken?: string;
  onAccept?: () => void;
  onContinueWithoutInvite?: () => void;
  onManualInviteToken?: (token: string) => void;
  ownerName?: string;
  puppyName?: string;
  reviewState?: InviteAcceptReviewState;
}>;

export type ConnectedInviteAcceptScreenProps = Readonly<{
  initialInviteToken?: string;
  onAccepted: () => void;
  onOpenSignIn: () => void;
}>;

type LiveInviteAcceptState = 'idle' | 'error' | 'unavailable';

export function ConnectedInviteAcceptScreen({
  initialInviteToken,
  onAccepted,
  onOpenSignIn,
}: ConnectedInviteAcceptScreenProps) {
  const auth = useAuth();
  const acceptInvite = useAcceptHouseholdInviteMutation();
  const [selectedToken, setSelectedToken] = useState(initialInviteToken);
  const [hasManualReplacement, setHasManualReplacement] = useState(false);
  const [liveState, setLiveState] = useState<LiveInviteAcceptState>('idle');
  const [fallbackPending, setFallbackPending] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);
  const persistenceStatus = usePersistPendingHouseholdInvite(selectedToken);

  useEffect(() => {
    setSelectedToken(initialInviteToken);
    setHasManualReplacement(false);
    setLiveState('idle');
    setFallbackError(false);
  }, [initialInviteToken]);

  const storedInviteUnavailable =
    auth.householdInviteStatus === 'unavailable' && !hasManualReplacement;
  const reviewState: InviteAcceptReviewState | undefined =
    liveState === 'unavailable' || storedInviteUnavailable || persistenceStatus === 'invalid'
      ? 'expired'
      : liveState === 'error' || persistenceStatus === 'error'
        ? 'load-error'
        : persistenceStatus === 'loading'
          ? 'loading'
          : undefined;
  const authCanAcceptDirectly =
    auth.status === 'signedIn' || auth.householdInviteStatus === 'unavailable';
  const acceptDisabled =
    selectedToken === undefined
    || persistenceStatus !== 'ready'
    || reviewState === 'expired'
    || (auth.status === 'loading' && !authCanAcceptDirectly);

  async function handleAccept() {
    if (selectedToken === undefined || persistenceStatus !== 'ready') {
      return;
    }

    setLiveState('idle');
    setFallbackError(false);

    if (auth.status === 'signedOut') {
      onOpenSignIn();
      return;
    }

    if (!authCanAcceptDirectly) {
      setLiveState('error');
      return;
    }

    try {
      const acceptedInvite = await acceptInvite.mutateAsync({ token: selectedToken });
      await auth.completeHouseholdInviteAcceptance(acceptedInvite.household_id);
      onAccepted();
    } catch (error) {
      if (isHouseholdInviteUnavailableError(error)) {
        try {
          await pendingHouseholdInviteController.markUnavailable();
          setLiveState('unavailable');
        } catch {
          setLiveState('error');
        }
        return;
      }

      setLiveState('error');
    }
  }

  function handleManualInviteToken(token: string) {
    setSelectedToken(token);
    setHasManualReplacement(true);
    setLiveState('idle');
    setFallbackError(false);
  }

  async function handleContinueWithoutInvite() {
    setFallbackPending(true);
    setFallbackError(false);

    try {
      if (auth.status === 'signedOut') {
        await pendingHouseholdInviteController.clear();
        onOpenSignIn();
        return;
      }

      if (auth.householdInviteStatus === 'unavailable') {
        await auth.continueWithoutHouseholdInvite();
      } else if (auth.status !== 'signedIn') {
        throw new Error('household_invite_fallback_not_ready');
      }

      onAccepted();
    } catch {
      setFallbackError(true);
    } finally {
      setFallbackPending(false);
    }
  }

  return (
    <InviteAcceptScreen
      acceptDisabled={acceptDisabled}
      acceptPending={acceptInvite.isPending}
      fallbackError={fallbackError}
      fallbackPending={fallbackPending}
      inviteToken={selectedToken}
      onAccept={() => void handleAccept()}
      onContinueWithoutInvite={() => void handleContinueWithoutInvite()}
      onManualInviteToken={handleManualInviteToken}
      reviewState={reviewState}
    />
  );
}

export function InviteAcceptScreen({
  acceptDisabled = false,
  acceptPending = false,
  fallbackError = false,
  fallbackPending = false,
  onAccept,
  onContinueWithoutInvite,
  onManualInviteToken,
  ownerName,
  puppyName,
  reviewState,
}: InviteAcceptScreenProps) {
  const { t } = useAppTranslation();
  const [manualInput, setManualInput] = useState('');
  const [manualInputInvalid, setManualInputInvalid] = useState(false);
  const [manualInputReady, setManualInputReady] = useState(false);
  const header = ownerName !== undefined && puppyName !== undefined
    ? t('sharing.family.accepted.header', { ownerName, puppyName })
    : t('sharing.family.accepted.header-generic');
  const firstIncludedItem = puppyName !== undefined
    ? t('sharing.family.accepted.caregiver-included-bullets.0', { puppyName })
    : t('sharing.family.accepted.caregiver-included-first-generic');
  const disclosure = ownerName !== undefined
    ? t('sharing.family.accepted.disclosure', { ownerName })
    : t('sharing.family.accepted.disclosure-generic');
  const isLoadingInvite = reviewState === 'loading' || acceptPending;

  function handleManualInputChange(value: string) {
    setManualInput(value);
    setManualInputInvalid(false);
    setManualInputReady(false);
  }

  function handleManualInviteSubmit() {
    const parsedInput = householdInviteInputSchema.safeParse(manualInput);

    if (!parsedInput.success) {
      setManualInputInvalid(true);
      setManualInputReady(false);
      return;
    }

    onManualInviteToken?.(parsedInput.data);
    setManualInput('');
    setManualInputInvalid(false);
    setManualInputReady(true);
  }

  return (
    <Screen contentStyle={styles.content}>
      <Stack gap="lg">
        <Stack gap="sm">
          <AppIcon color={tokens.color.primary[700]} filled name="personCluster" size={36} />
          <AppText variant="title">
            {header}
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
                {firstIncludedItem}
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
            {disclosure}
          </AppText>
        </Card>

        <Card testID="invite-manual-input-card">
          <Stack gap="sm">
            <AppText variant="headline">
              {t('sharing.family.accepted.manual.title')}
            </AppText>
            <AppText tone="secondary" variant="body">
              {t('sharing.family.accepted.manual.body')}
            </AppText>
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              errorText={manualInputInvalid
                ? t('sharing.family.accepted.manual.invalid')
                : undefined}
              label={t('sharing.family.accepted.manual.label')}
              onChangeText={handleManualInputChange}
              placeholder={t('sharing.family.accepted.manual.placeholder')}
              secureTextEntry
              value={manualInput}
            />
            <Button
              disabled={onManualInviteToken === undefined}
              label={t('sharing.family.accepted.manual.submit')}
              onPress={handleManualInviteSubmit}
              variant="secondary"
            />
            {manualInputReady ? (
              <AppText
                accessibilityLiveRegion="polite"
                testID="invite-manual-input-ready"
                tone="secondary"
                variant="footnote">
                {t('sharing.family.accepted.manual.ready')}
              </AppText>
            ) : null}
          </Stack>
        </Card>

        {reviewState === 'expired' && onContinueWithoutInvite ? (
          <Button
            label={t('sharing.family.accepted.create-own')}
            loading={fallbackPending}
            onPress={onContinueWithoutInvite}
            variant="secondary"
          />
        ) : null}

        {fallbackError ? (
          <AppText
            accessibilityRole="alert"
            testID="invite-create-own-error"
            variant="footnote">
            {t('sharing.family.accepted.create-own-error')}
          </AppText>
        ) : null}

        <Stack gap="sm">
          <Button
            disabled={acceptDisabled || onAccept === undefined}
            label={t('sharing.family.accepted.accept')}
            loading={isLoadingInvite}
            onPress={onAccept ?? (() => undefined)}
          />
          <Button
            disabled
            label={t('sharing.family.accepted.decline')}
            onPress={() => undefined}
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
