import { AppText } from '@/design/primitives/AppText';
import { Screen } from '@/design/primitives/Screen';
import { useAppTranslation } from '@/lib/i18n';

export function TodayScreen() {
  const { t } = useAppTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('tabs.today')}</AppText>
      <AppText>{t('states.empty-first-run.title')}</AppText>
      <AppText variant="caption">{t('states.empty-first-run.body')}</AppText>
    </Screen>
  );
}
