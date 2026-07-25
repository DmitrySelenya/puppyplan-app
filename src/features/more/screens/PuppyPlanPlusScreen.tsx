import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  AppIcon,
  type AppIconName,
  AppText,
  Button,
  Card,
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

export type PuppyPlanPlusReviewState =
  | 'loading-products'
  | 'pending-purchase'
  | 'purchase-error'
  | 'offline-read'
  | 'active-subscription';

type PuppyPlanPlusStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

const paywallStateMeta: Record<PuppyPlanPlusReviewState, PuppyPlanPlusStateMeta> = {
  'active-subscription': {
    bodyKey: 'paywall.states.active-subscription.body',
    icon: 'check',
    statusKey: 'paywall.states.active-subscription.status',
    titleKey: 'paywall.states.active-subscription.title',
    tone: 'confirmed',
  },
  'loading-products': {
    bodyKey: 'paywall.states.loading-products.body',
    icon: 'calendar',
    liveRegion: 'polite',
    statusKey: 'paywall.states.loading-products.status',
    titleKey: 'paywall.states.loading-products.title',
    tone: 'pending',
  },
  'offline-read': {
    bodyKey: 'paywall.states.offline-read.body',
    icon: 'lock',
    statusKey: 'paywall.states.offline-read.status',
    titleKey: 'paywall.states.offline-read.title',
    tone: 'template',
  },
  'pending-purchase': {
    bodyKey: 'paywall.states.pending-purchase.body',
    icon: 'docText',
    liveRegion: 'polite',
    statusKey: 'paywall.states.pending-purchase.status',
    titleKey: 'paywall.states.pending-purchase.title',
    tone: 'pending',
  },
  'purchase-error': {
    bodyKey: 'paywall.states.purchase-error.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'paywall.states.purchase-error.status',
    titleKey: 'paywall.states.purchase-error.title',
    tone: 'failed',
  },
};

export type PuppyPlanPlusScreenProps = Readonly<{
  accessState?: 'trial' | 'softLocked';
  onClose?: () => void;
  onExport?: () => void;
  reviewState?: PuppyPlanPlusReviewState;
  trialDaysRemaining?: number;
}>;

const featureKeys = [
  'paywall.features.0',
  'paywall.features.1',
  'paywall.features.2',
] as const;

type PaywallPlan = 'lifetime' | 'monthly' | 'yearly';

export function PuppyPlanPlusScreen({
  accessState = 'trial',
  onClose,
  onExport = () => undefined,
  reviewState,
  trialDaysRemaining = 30,
}: PuppyPlanPlusScreenProps) {
  const { t } = useAppTranslation();
  const [purchaseUnavailableVisible, setPurchaseUnavailableVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaywallPlan>('yearly');
  const isPendingPurchase = reviewState === 'pending-purchase';

  return (
    <Screen contentStyle={styles.content}>
      {onClose ? (
        <ScreenHeader
          backLabel={t('common.close')}
          onBack={onClose}
          title={t('paywall.title')}
        />
      ) : (
        <ScreenHeader title={t('paywall.title')} />
      )}

      <Card variant="hero">
        <Stack gap="sm">
          <AppIcon color={tokens.color.primary[700]} filled name="spark" size={32} />
          <Stack gap="xs">
            <AppText tone="secondary" variant="body">
              {t('paywall.subtitle')}
            </AppText>
            <Stack align="center" direction="horizontal" gap="sm" wrap>
              <StatusPill
                accessibilityLabel={t('paywall.trial-status', {
                  count: trialDaysRemaining,
                })}
                icon={<AppIcon name="calendar" size={14} />}
                label={t('paywall.trial-status', {
                  count: trialDaysRemaining,
                })}
                tone={accessState === 'softLocked' ? 'needsVetReview' : 'confirmed'}
              />
              <AppText style={styles.trialNote} tone="secondary" variant="footnote">
                {t('paywall.trial-note')}
              </AppText>
            </Stack>
          </Stack>
        </Stack>
      </Card>

      {reviewState ? <PuppyPlanPlusStatePreview state={reviewState} /> : null}

      {accessState === 'softLocked' ? (
        <Card
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.softLockBanner}
          testID="paywall-soft-lock-banner">
          <Stack gap="sm">
            <Stack align="center" direction="horizontal" gap="sm">
              <AppIcon color={tokens.color.status.info} name="lock" size={20} />
              <Stack gap="xs" style={styles.softLockCopy}>
                <AppText variant="headline">{t('paywall.soft-lock-banner-title')}</AppText>
                <AppText tone="secondary" variant="body">
                  {t('paywall.soft-lock-banner-body')}
                </AppText>
              </Stack>
            </Stack>
            <Button
              label={t('paywall.export-action')}
              onPress={onExport}
              variant="secondary"
            />
          </Stack>
        </Card>
      ) : null}

      <PaywallSection title={t('paywall.sections.features')}>
        {featureKeys.map((key) => (
          <ListRow
            key={key}
            leading={<AppIcon color={tokens.color.primary[700]} name="check" />}
            title={t(key)}
            variant="settings"
          />
        ))}
      </PaywallSection>

      <PaywallSection title={t('paywall.sections.plans')}>
        <ListRow
          accessibilityLabel={t('paywall.plan-yearly-a11y')}
          leading={<AppIcon name="spark" />}
          onPress={() => setSelectedPlan('yearly')}
          selected={selectedPlan === 'yearly'}
          selectionRole="radio"
          title={t('paywall.plan-yearly')}
          variant="settings"
        />
        <ListRow
          leading={<AppIcon name="calendar" />}
          onPress={() => setSelectedPlan('monthly')}
          selected={selectedPlan === 'monthly'}
          selectionRole="radio"
          title={t('paywall.plan-monthly')}
          variant="settings"
        />
        <ListRow
          leading={<AppIcon name="paw" />}
          onPress={() => setSelectedPlan('lifetime')}
          selected={selectedPlan === 'lifetime'}
          selectionRole="radio"
          title={t('paywall.plan-lifetime')}
          variant="settings"
        />
      </PaywallSection>

      <Stack gap="sm">
        <Button
          label={t('paywall.primary')}
          loading={isPendingPurchase}
          onPress={() => setPurchaseUnavailableVisible(true)}
        />
        <Button
          label={t('paywall.secondary')}
          onPress={() => setPurchaseUnavailableVisible(true)}
          variant="tertiary"
        />
      </Stack>

      {purchaseUnavailableVisible ? (
        <Card
          accessibilityLabel={[
            t('paywall.unavailable-title'),
            t('paywall.unavailable-body'),
          ].join('. ')}
          accessibilityLiveRegion="polite"
          testID="paywall-purchase-unavailable"
          variant="mutedTemplate">
          <Stack gap="xs">
            <AppText variant="headline">{t('paywall.unavailable-title')}</AppText>
            <AppText tone="secondary" variant="body">
              {t('paywall.unavailable-body')}
            </AppText>
          </Stack>
        </Card>
      ) : null}

      <Card style={styles.softLockCard} variant="mutedTemplate">
        <Stack gap="xs">
          <AppText variant="headline">{t('paywall.soft-lock-title')}</AppText>
          <AppText tone="secondary" variant="footnote">
            {t('paywall.soft-lock-note')}
          </AppText>
        </Stack>
      </Card>

      <AppText tone="tertiary" variant="caption">
        {t('paywall.legal')}
      </AppText>
    </Screen>
  );
}

export function PuppyPlanPlusStatePreview({
  state,
}: Readonly<{
  state: PuppyPlanPlusReviewState;
}>) {
  const { t } = useAppTranslation();
  const meta = paywallStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion}
      accessibilityRole={meta.role}
      testID={`paywall-state-${state}`}
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

function PaywallSection({
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

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.layout.tabBarHeight + tokens.space[6],
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
  softLockCard: {
    backgroundColor: tokens.color.status.infoTint,
    borderColor: tokens.color.status.info,
  },
  softLockBanner: {
    backgroundColor: tokens.color.status.infoTint,
    borderColor: tokens.color.status.info,
  },
  softLockCopy: {
    flex: 1,
    minWidth: 0,
  },
  trialNote: {
    flex: 1,
    minWidth: 0,
  },
});
