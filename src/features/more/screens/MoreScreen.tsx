import { AppText } from '@/design/primitives/AppText';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { useAppTranslation } from '@/lib/i18n';

import { SignOutButton } from '../components/SignOutButton';

export type MoreScreenProps = Readonly<{
  openTimeline: () => void;
}>;

export function MoreScreen({ openTimeline }: MoreScreenProps) {
  const { t } = useAppTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('more.screen-title')}</AppText>
      <ListRow
        onPress={openTimeline}
        title={t('more.rows.timeline')}
      />
      <AppText>{t('more.sections.support')}</AppText>
      <SignOutButton />
    </Screen>
  );
}
