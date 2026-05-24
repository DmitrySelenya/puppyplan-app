import { AppText } from '@/design/primitives/AppText';
import { Screen } from '@/design/primitives/Screen';
import { useAppTranslation } from '@/lib/i18n';

export function MoreScreen() {
  const { t } = useAppTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('more.screen-title')}</AppText>
      <AppText>{t('more.sections.support')}</AppText>
    </Screen>
  );
}
