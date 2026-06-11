import { AppText } from '@/design/primitives/AppText';
import { Card } from '@/design/primitives/Card';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { useAppTranslation } from '@/lib/i18n';
import { useActiveCareContext } from '@/lib/query/active-care-context';

import { SignOutButton } from '../components/SignOutButton';

type PuppySettingsAccessState = 'loading' | 'owner' | 'nonOwner' | 'empty' | 'error';

export type MoreScreenProps = Readonly<{
  canManagePuppySettings?: boolean;
  openPuppyProfile?: () => void;
  openQuickTrackers?: () => void;
  openTimeline: () => void;
  puppySettingsState?: PuppySettingsAccessState;
}>;

export function ConnectedMoreScreen(props: Omit<MoreScreenProps, 'canManagePuppySettings' | 'puppySettingsState'>) {
  const activeCare = useActiveCareContext();

  return (
    <MoreScreen
      {...props}
      puppySettingsState={getPuppySettingsAccessState(activeCare)}
    />
  );
}

export function MoreScreen({
  canManagePuppySettings = true,
  openPuppyProfile,
  openQuickTrackers,
  openTimeline,
  puppySettingsState,
}: MoreScreenProps) {
  const { t } = useAppTranslation();
  const settingsState = puppySettingsState ?? (canManagePuppySettings ? 'owner' : 'nonOwner');

  return (
    <Screen>
      <AppText variant="title">{t('more.screen-title')}</AppText>
      <PuppySettingsSection
        openPuppyProfile={openPuppyProfile}
        openQuickTrackers={openQuickTrackers}
        state={settingsState}
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

function PuppySettingsSection({
  openPuppyProfile,
  openQuickTrackers,
  state,
}: Readonly<{
  openPuppyProfile?: () => void;
  openQuickTrackers?: () => void;
  state: PuppySettingsAccessState;
}>) {
  const { t } = useAppTranslation();

  if (state === 'nonOwner' || state === 'empty') {
    return null;
  }

  return (
    <Stack gap="sm">
      <AppText>{t('more.sections.puppy')}</AppText>
      {state === 'loading' ? (
        <Card>
          <AppText>{t('common.loading')}</AppText>
        </Card>
      ) : null}
      {state === 'error' ? (
        <Card
          accessibilityLabel={t('errors.load-failed')}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          <AppText>{t('errors.load-failed')}</AppText>
        </Card>
      ) : null}
      {state === 'owner' ? (
        <>
          <ListRow
            onPress={openPuppyProfile}
            title={t('more.rows.puppy-profile')}
          />
          <ListRow
            onPress={openQuickTrackers}
            title={t('more.rows.quick-trackers')}
          />
        </>
      ) : null}
    </Stack>
  );
}

function getPuppySettingsAccessState(
  activeCare: ReturnType<typeof useActiveCareContext>,
): PuppySettingsAccessState {
  if (activeCare.status === 'loading') {
    return 'loading';
  }

  if (activeCare.status === 'error') {
    return 'error';
  }

  if (activeCare.status !== 'ready' || activeCare.careContext === null) {
    return 'empty';
  }

  return activeCare.careContext.householdRole === 'owner' ? 'owner' : 'nonOwner';
}
