import { useTranslation } from 'react-i18next';

import { AppText } from '@/design/primitives/AppText';
import { Screen } from '@/design/primitives/Screen';

export function TodayScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('tabs.today')}</AppText>
      <AppText>{t('states.empty-first-run.title')}</AppText>
      <AppText variant="caption">{t('states.empty-first-run.body')}</AppText>
    </Screen>
  );
}
