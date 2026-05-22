import { useTranslation } from 'react-i18next';

import { AppText } from '@/design/primitives/AppText';
import { Screen } from '@/design/primitives/Screen';

export function HealthScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('tabs.health')}</AppText>
      <AppText>{t('health.footer-hint')}</AppText>
    </Screen>
  );
}
