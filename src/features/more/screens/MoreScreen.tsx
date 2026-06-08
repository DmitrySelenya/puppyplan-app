import { AppText } from '@/design/primitives/AppText';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { useAppTranslation } from '@/lib/i18n';

import { SignOutButton } from '../components/SignOutButton';

export type MoreScreenProps = Readonly<{
  openPuppyProfile?: () => void;
  openQuickTrackers?: () => void;
  openTimeline: () => void;
}>;

export function MoreScreen({
  openPuppyProfile,
  openQuickTrackers,
  openTimeline,
}: MoreScreenProps) {
  const { t } = useAppTranslation();

  return (
    <Screen>
      <AppText variant="title">{t('more.screen-title')}</AppText>
      <AppText>{t('more.sections.puppy')}</AppText>
      <ListRow
        onPress={openPuppyProfile}
        title={t('more.rows.puppy-profile')}
      />
      <ListRow
        onPress={openQuickTrackers}
        title={t('more.rows.quick-trackers')}
      />
      <AppText>{t('more.sections.records')}</AppText>
      <ListRow
        onPress={openTimeline}
        title={t('more.rows.timeline')}
      />
      <AppText>{t('more.sections.support')}</AppText>
      <SignOutButton />
    </Screen>
  );
}
