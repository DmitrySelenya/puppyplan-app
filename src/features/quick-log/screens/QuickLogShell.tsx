import { useTranslation } from 'react-i18next';

import { AppText } from '@/design/primitives/AppText';
import { Screen } from '@/design/primitives/Screen';

export function QuickLogShell() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('quick-log.sheet.title')}</AppText>
      <AppText>{t('quick-log.sheet.edit-helper')}</AppText>
    </Screen>
  );
}
