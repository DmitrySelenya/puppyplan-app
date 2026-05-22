import { useTranslation } from 'react-i18next';

import { AppText } from '@/design/primitives/AppText';
import { Screen } from '@/design/primitives/Screen';

export function MoreScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('more.screen-title')}</AppText>
      <AppText>{t('more.sections.support')}</AppText>
    </Screen>
  );
}
