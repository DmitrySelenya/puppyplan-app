import { AppText } from '@/design/primitives/AppText';
import { Screen } from '@/design/primitives/Screen';
import { useAppTranslation } from '@/lib/i18n';

export function QuickLogShell() {
  const { t } = useAppTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('quick-log.sheet.title')}</AppText>
      <AppText>{t('quick-log.sheet.edit-helper')}</AppText>
    </Screen>
  );
}
