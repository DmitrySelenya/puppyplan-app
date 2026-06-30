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
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

export type PuppyPlanPlusScreenProps = Readonly<{
  onClose?: () => void;
}>;

const featureKeys = [
  'paywall.features.0',
  'paywall.features.1',
  'paywall.features.2',
] as const;

export function PuppyPlanPlusScreen({
  onClose,
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
          </Stack>
        </Stack>
      </Card>

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
});
