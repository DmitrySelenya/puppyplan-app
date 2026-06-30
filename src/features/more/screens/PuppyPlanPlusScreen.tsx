import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import {
  AppIcon,
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
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

export type PuppyPlanPlusScreenProps = Readonly<{
  accessState?: 'trial' | 'softLocked';
  onClose?: () => void;
  onExport?: () => void;
  trialDaysRemaining?: number;
}>;

const featureKeys = [
  'paywall.features.0',
  'paywall.features.1',
  'paywall.features.2',
] as const;

export function PuppyPlanPlusScreen({
  accessState = 'trial',
  onClose,
  onExport = () => undefined,
  trialDaysRemaining = 30,
}: PuppyPlanPlusScreenProps) {
  const { t } = useAppTranslation();

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
          onPress={() => undefined}
          selected
          selectionRole="radio"
          title={t('paywall.plan-yearly')}
          variant="settings"
        />
        <ListRow
          leading={<AppIcon name="calendar" />}
          onPress={() => undefined}
          selectionRole="radio"
          title={t('paywall.plan-monthly')}
          variant="settings"
        />
        <ListRow
          leading={<AppIcon name="paw" />}
          onPress={() => undefined}
          selectionRole="radio"
          title={t('paywall.plan-lifetime')}
          variant="settings"
        />
      </PaywallSection>

      <Stack gap="sm">
        <Button label={t('paywall.primary')} onPress={() => undefined} />
        <Button
          label={t('paywall.secondary')}
          onPress={() => undefined}
          variant="tertiary"
        />
      </Stack>

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
