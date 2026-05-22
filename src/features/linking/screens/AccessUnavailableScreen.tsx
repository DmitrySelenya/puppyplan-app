import { useTranslation } from 'react-i18next';

import { AppText } from '@/design/primitives/AppText';
import { Screen } from '@/design/primitives/Screen';

export function AccessUnavailableScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('states.revoked-or-expired.title')}</AppText>
      <AppText>{t('states.revoked-or-expired.body-long')}</AppText>
    </Screen>
  );
}
