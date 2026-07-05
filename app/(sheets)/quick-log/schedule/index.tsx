import { Screen } from '@/design/primitives/Screen';
import { ScreenHeader } from '@/design/primitives/ScreenHeader';
import { useAppTranslation } from '@/lib/i18n';

export default function QuickLogScheduleRoute() {
  const { t } = useAppTranslation();

  return (
    <Screen modal>
      <ScreenHeader title={t('nav.schedule-slab')} />
    </Screen>
  );
}
