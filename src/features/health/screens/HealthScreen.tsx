import { AppText } from '@/design/primitives/AppText';
import { Screen } from '@/design/primitives/Screen';
import { useAppTranslation } from '@/lib/i18n';

export function HealthScreen() {
  const { t } = useAppTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('tabs.health')}</AppText>
      <AppText>{t('health.footer-hint')}</AppText>
    </Screen>
  );
}
