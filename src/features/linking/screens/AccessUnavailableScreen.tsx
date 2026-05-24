import { AppText } from '@/design/primitives/AppText';
import { Screen } from '@/design/primitives/Screen';
import { useAppTranslation } from '@/lib/i18n';

export function AccessUnavailableScreen() {
  const { t } = useAppTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('states.revoked-or-expired.title')}</AppText>
      <AppText>{t('states.revoked-or-expired.body-long')}</AppText>
    </Screen>
  );
}
