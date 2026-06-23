import {
  AppText,
  Button,
  Card,
  ListRow,
  Screen,
  SegmentedControl,
  Stack,
  StatusPill,
  TextField,
  TrackerTile,
} from '@/design/primitives';
import { QuickLogDetailsScreen } from '@/features/quick-log/screens/QuickLogDetailsScreen';
import { SyntheticTodayPreview } from '@/features/today/components/TodayCards';
import { useAppTranslation } from '@/lib/i18n';

import {
  gallerySections,
  syntheticTodayPlans,
  syntheticTrackers,
} from './fixtures';

const noop = () => undefined;

export function DesignGalleryScreen() {
  const { t } = useAppTranslation();

  return (
    <Screen>
      <Stack gap="lg">
        <Stack gap="sm">
          <AppText variant="title">{t('dev.gallery.title')}</AppText>
          <AppText tone="secondary">{t('dev.gallery.subtitle')}</AppText>
        </Stack>

        {gallerySections.map((section) => (
          <Card key={section.id}>
            <Stack gap="sm">
              <Stack align="center" direction="horizontal" justify="space-between">
                <AppText variant="headline">{t(section.titleKey, { count: 5, max: 5 })}</AppText>
                <StatusPill
                  accessibilityLabel={t('dev.gallery.synthetic-badge')}
                  icon={<AppText accessibilityElementsHidden>*</AppText>}
                  label={t('dev.gallery.synthetic-badge')}
                  tone="pending"
                />
              </Stack>
              <AppText tone="secondary">{t(section.stateKey)}</AppText>
            </Stack>
          </Card>
        ))}

        <SyntheticOnboardingShell />
        <SyntheticPuppyProfileSettingsShell />
        <SyntheticQuickTrackersSettingsShell />
        <SyntheticQuickLogDetailsShell />
        <SyntheticTodayShell />
      </Stack>
    </Screen>
  );
}

export function SyntheticOnboardingShell() {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="onboarding.welcome.subtitle"
          titleKey="onboarding.welcome.title"
        />
        <TextField
          accessibilityHint={t('onboarding.puppy-profile.name-field-hint')}
          label={t('onboarding.puppy-profile.name-field-label')}
          onChangeText={noop}
          value=""
        />
        <SegmentedControl
          accessibilityLabel={t('onboarding.puppy-profile.a11y-toggle')}
          onValueChange={noop}
          options={[
            {
              label: t('onboarding.puppy-profile.age-toggle-age'),
              value: 'age',
            },
            {
              label: t('onboarding.puppy-profile.age-toggle-date'),
              value: 'date',
            },
          ]}
          value="age"
        />
        <AppText tone="secondary">{t('onboarding.age-hint.6-8-weeks')}</AppText>
        <TrackerGrid />
        <AppText tone="secondary">
          {t('onboarding.tracker-picker.counter', { n: 5 })}
        </AppText>
        <Button label={t('onboarding.tracker-picker.cta')} onPress={noop} />
      </Stack>
    </Card>
  );
}

export function SyntheticPuppyProfileSettingsShell() {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="more.puppy-profile.hint"
          titleKey="more.puppy-profile.screen-title"
        />
        <TextField
          label={t('more.puppy-profile.field-name')}
          onChangeText={noop}
          value=""
        />
        <ListRow
          meta={t('common.edit')}
          title={t('more.puppy-profile.field-birth')}
        />
        <ListRow
          meta={t('common.edit')}
          title={t('more.puppy-profile.field-breed')}
        />
        <Button label={t('more.puppy-profile.save')} onPress={noop} />
      </Stack>
    </Card>
  );
}

export function SyntheticQuickTrackersSettingsShell() {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="more.quick-trackers.hint"
          titleKey="more.quick-trackers.screen-title-template"
        />
        <AppText tone="secondary">{t('more.quick-trackers.max-reached-hint')}</AppText>
        {syntheticTrackers.map((tracker) => (
          <ListRow
            key={tracker.id}
            meta={tracker.selected ? t('common.done') : t('common.edit')}
            selected={tracker.selected}
            title={t(tracker.labelKey)}
          />
        ))}
      </Stack>
    </Card>
  );
}

export function SyntheticQuickLogDetailsShell() {
  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="dev.gallery.states.quick-log-details"
          titleKey="quick-log.details.title"
        />
        <QuickLogDetailsScreen
          initialTrackerId="sleep"
          status="saving"
        />
        <QuickLogDetailsScreen
          initialTrackerId="zoomies"
          status="error"
        />
      </Stack>
    </Card>
  );
}

export function SyntheticTodayShell() {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="dev.gallery.states.today-core"
          titleKey="tabs.today"
        />
        <AppText tone="secondary">{t('dev.gallery.today.synthetic-note')}</AppText>
        {syntheticTodayPlans.map((fixture) => (
          <SyntheticTodayPreview
            key={fixture.id}
            plan={fixture.plan}
            titleKey={fixture.titleKey}
          />
        ))}
      </Stack>
    </Card>
  );
}

function GalleryShellHeader({
  bodyKey,
  titleKey,
}: Readonly<{
  bodyKey: Parameters<ReturnType<typeof useAppTranslation>['t']>[0];
  titleKey: Parameters<ReturnType<typeof useAppTranslation>['t']>[0];
}>) {
  const { t } = useAppTranslation();

  return (
    <Stack gap="xs">
      <StatusPill
        accessibilityLabel={t('dev.gallery.shell-preview')}
        icon={<AppText accessibilityElementsHidden>*</AppText>}
        label={t('dev.gallery.shell-preview')}
        tone="confirmed"
      />
      <AppText variant="headline">{t(titleKey, { n: 5 })}</AppText>
      <AppText tone="secondary">{t(bodyKey)}</AppText>
    </Stack>
  );
}

function TrackerGrid() {
  const { t } = useAppTranslation();

  return (
    <Stack direction="horizontal" gap="sm" wrap>
      {syntheticTrackers.map((tracker) => (
        <TrackerTile
          key={tracker.id}
          label={t(tracker.labelKey)}
          onPress={noop}
          selected={tracker.selected}
          size="twoColumn"
        />
      ))}
    </Stack>
  );
}
