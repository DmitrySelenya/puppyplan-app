import type { ReactNode } from 'react';

import {
  AppText,
  Button,
  Card,
  CheckCircle,
  DayDivider,
  EmptyIllustration,
  EmptyState,
  AppIcon,
  FactCard,
  IconChip,
  InfoHero,
  ListGroup,
  ListRow,
  RoutineCard,
  Screen,
  SegmentedControl,
  SectionHeader,
  SheetSurface,
  SnackbarProvider,
  Stack,
  StatusPill,
  SwipeToDelete,
  TextField,
  TrackerTile,
  WeekStrip,
  type WeekStripDay,
} from '@/design/primitives';
import {
  HealthRecordDetailPreview,
  HealthRecordEditPreview,
  HealthScreen,
  HealthWeightEntryPreview,
} from '@/features/health/screens/HealthScreen';
import {
  OnboardingAccountPromptPreview,
  OnboardingFirstLogPreview,
  OnboardingNotificationsPromptPreview,
} from '@/features/onboarding/screens/OnboardingScreen';
import { QuickLogLocalEvents } from '@/features/quick-log/components/QuickLogLocalEvents';
import { QuickLogDetailsScreen } from '@/features/quick-log/screens/QuickLogDetailsScreen';
import {
  SyntheticTodayPreview,
  TodayStatusCard,
  type TodayStatusState,
} from '@/features/today/components/TodayCards';
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
                <AppText variant="headline">{t(section.titleKey, { count: 5, max: 5, n: 5 })}</AppText>
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
        <SnackbarProvider>
          <OnboardingFirstLogPreview />
        </SnackbarProvider>
        <OnboardingAccountPromptPreview />
        <OnboardingNotificationsPromptPreview />
        <SyntheticPuppyProfileSettingsShell />
        <SyntheticQuickTrackersSettingsShell />
        <SyntheticMoreSettingsShell />
        <SyntheticQuickLogSheetShell />
        <SyntheticQuickLogDetailsShell />
        <SyntheticHealthShell />
        <SyntheticTimelineShell />
        <SyntheticTodayShell />
        <SyntheticDiaryClayShell />
      </Stack>
    </Screen>
  );
}

export function SyntheticDiaryClayShell() {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="dev.gallery.states.diary-clay"
          titleKey="tabs.diary"
        />
        <WeekStrip
          accessibilityLabel={t('today.week-strip.label')}
          days={diaryGalleryWeekDays}
          selectedIndex={3}
          todayIndex={3}
        />
        <InfoHero message={t('today.hero.steady-day.body')} />
        <Stack gap="xs">
          <FactCard
            accent="clay"
            accessibilityLabel={t('today.history.fact-a11y-label', {
              caption: t('timeline.actor-you'),
              time: '7:15 am',
              title: t('quick-log.trackers.feeding'),
            })}
            caption={t('timeline.actor-you')}
            icon="bowl"
            time="7:15 am"
            title={t('quick-log.trackers.feeding')}
          />
          <FactCard
            accent="mauve"
            accessibilityLabel={t('today.history.fact-a11y-label', {
              caption: t('timeline.actor-you'),
              time: '9:30 am',
              title: t('quick-log.trackers.sleep'),
            })}
            caption={t('timeline.actor-you')}
            icon="moon"
            time="9:30 am"
            title={t('quick-log.trackers.sleep')}
          />
          <FactCard
            accent="honey"
            accessibilityLabel={t('today.history.fact-a11y-label', {
              caption: t('timeline.actor-you'),
              time: '11:00 am',
              title: t('quick-log.trackers.zoomies'),
            })}
            caption={t('timeline.actor-you')}
            icon="ball"
            time="11:00 am"
            title={t('quick-log.trackers.zoomies')}
          />
          <SwipeToDelete
            deleteLabel={t('today.history.delete-action')}
            onDelete={noop}
            testID="gallery-swipe-delete">
            <FactCard
              accent="sage"
              accessibilityLabel={t('today.history.fact-a11y-label', {
                caption: t('timeline.actor-you'),
                time: '12:30 pm',
                title: t('quick-log.trackers.potty'),
              })}
              caption={t('timeline.actor-you')}
              icon="pottyInside"
              time="12:30 pm"
              title={t('quick-log.trackers.potty')}
            />
          </SwipeToDelete>
        </Stack>
        <Stack gap="xs">
          <AppText tone="secondary" variant="footnote">
            {t('dev.gallery.diary.routine-note')}
          </AppText>
          <Stack align="center">
            <EmptyIllustration testID="gallery-empty-illustration" />
          </Stack>
          <RoutineCard
            accent="clay"
            accessibilityLabel={t('quick-log.trackers.walk')}
            checkboxLabel={t('quick-log.trackers.walk')}
            icon="walk"
            onOverflow={noop}
            onToggleDone={noop}
            overflowLabel={t('today.history.item-actions')}
            state="upcoming"
            testID="gallery-routine-upcoming"
            time="2:00 pm"
            title={t('quick-log.trackers.walk')}
          />
          <RoutineCard
            accent="clay"
            accessibilityLabel={t('quick-log.trackers.feeding')}
            checkboxLabel={t('quick-log.trackers.feeding')}
            icon="bowl"
            onOverflow={noop}
            onToggleDone={noop}
            overflowLabel={t('today.history.item-actions')}
            state="done"
            testID="gallery-routine-done"
            time="7:15 am"
            title={t('quick-log.trackers.feeding')}
          />
          <RoutineCard
            accent="clay"
            accessibilityLabel={t('quick-log.trackers.potty')}
            checkboxLabel={t('quick-log.trackers.potty')}
            icon="pottyInside"
            onOverflow={noop}
            onToggleDone={noop}
            overflowLabel={t('today.history.item-actions')}
            state="past"
            testID="gallery-routine-past"
            time="6:00 am"
            title={t('quick-log.trackers.potty')}
          />
        </Stack>
        <DayDivider label={t('dev.gallery.today.day-one')} />
        <Stack align="center" direction="horizontal" gap="sm">
          <CheckCircle accessibilityLabel={t('quick-log.trackers.feeding')} checked={false} />
          <CheckCircle accessibilityLabel={t('quick-log.trackers.feeding')} checked />
          <IconChip accent="sage" icon="check" />
          <IconChip accent="honey" icon="spark" />
          <IconChip accent="mauve" icon="moon" />
        </Stack>
      </Stack>
    </Card>
  );
}

const diaryGalleryWeekDays: WeekStripDay[] = [
  { accessibilityLabel: 'Monday, Jun 8', day: 8, dow: 'Mon', key: '2026-06-08' },
  { accessibilityLabel: 'Tuesday, Jun 9', day: 9, dow: 'Tue', key: '2026-06-09' },
  { accessibilityLabel: 'Wednesday, Jun 10', day: 10, dow: 'Wed', key: '2026-06-10' },
  { accessibilityLabel: 'Thursday, Jun 11', day: 11, dow: 'Thu', key: '2026-06-11' },
  { accessibilityLabel: 'Friday, Jun 12, today, selected', day: 12, dow: 'Fri', key: '2026-06-12' },
  { accessibilityLabel: 'Saturday, Jun 13', day: 13, dow: 'Sat', key: '2026-06-13' },
  { accessibilityLabel: 'Sunday, Jun 14', day: 14, dow: 'Sun', key: '2026-06-14' },
];

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
          value={t('onboarding.preview.name-value')}
        />
        <SegmentedControl
          accessibilityLabel={t('onboarding.puppy-profile.a11y-toggle')}
          onValueChange={noop}
          options={[
            {
              label: t('onboarding.puppy-profile.age-toggle-age'),
              value: 'age_weeks',
            },
            {
              label: t('onboarding.puppy-profile.age-toggle-date'),
              value: 'birth_date',
            },
          ]}
          value="birth_date"
        />
        <TextField
          accessibilityLabel={t('onboarding.puppy-profile.age-toggle-date')}
          errorText={t('onboarding.puppy-profile.error-future-date')}
          label={t('onboarding.puppy-profile.age-toggle-date')}
          onChangeText={noop}
          placeholder={t('onboarding.puppy-profile.birth-date-placeholder')}
          value="2999-01-01"
        />
        <AppText tone="secondary">{t('onboarding.age-hint.6-8-weeks')}</AppText>
        <TrackerGrid />
        <AppText tone="secondary">
          {t('onboarding.tracker-picker.counter', { n: 5 })}
        </AppText>
        <Button label={t('onboarding.tracker-picker.cta')} onPress={noop} />
        <Card variant="mutedTemplate">
          <Stack gap="sm">
            <AppText variant="headline">{t('onboarding.plan-reveal.title')}</AppText>
            <AppText tone="secondary">{t('onboarding.plan-reveal.subtitle')}</AppText>
            <AppText>{t('onboarding.plan-reveal.hero')}</AppText>
            <Button label={t('onboarding.plan-reveal.cta')} onPress={noop} />
          </Stack>
        </Card>
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

export function SyntheticMoreSettingsShell() {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="dev.gallery.states.more-settings"
          titleKey="more.screen-title"
        />
        <Card>
          <Stack align="center" direction="horizontal" gap="sm">
            <AppIcon name="paw" size={28} />
            <Stack gap="xs">
              <AppText variant="headline">Puppy A</AppText>
              <AppText tone="secondary" variant="subheadline">
                {t('more.puppy-summary.age-weeks', { count: 9 })}
              </AppText>
            </Stack>
          </Stack>
        </Card>
        <GallerySettingsGroup title={t('more.sections.puppy')}>
          <ListRow
            accessory="chevron"
            leading={<AppIcon name="paw" />}
            title={t('more.rows.puppy-profile')}
          />
          <ListRow
            accessory="chevron"
            leading={<AppIcon name="plus" />}
            meta={t('more.quick-trackers.selected-count', { count: 5, max: 5 })}
            title={t('more.rows.quick-trackers')}
          />
        </GallerySettingsGroup>
        <GallerySettingsGroup title={t('more.sections.records')}>
          <ListRow
            accessory="chevron"
            leading={<AppIcon name="docText" />}
            title={t('more.rows.timeline')}
          />
          <ListRow
            accessory="chevron"
            leading={<AppIcon name="gear" />}
            meta={t('more.rows.deferred')}
            subtitle={t('more.notifications.push-hint')}
            title={t('more.rows.notifications')}
          />
        </GallerySettingsGroup>
        <GallerySettingsGroup title={t('more.sections.privacy')}>
          <ListRow
            accessory="chevron"
            leading={<AppIcon name="lock" />}
            meta={t('more.rows.deferred')}
            subtitle={t('more.privacy.section-account-removal')}
            title={t('more.rows.data-account')}
          />
        </GallerySettingsGroup>
        <GallerySettingsGroup title={t('more.sections.support')}>
          <ListRow
            accessory="chevron"
            leading={<AppIcon name="infoCircle" />}
            meta={t('more.about.version')}
            title={t('more.rows.about')}
          />
        </GallerySettingsGroup>
        <ListGroup>
          <ListRow
            accessory="chevron"
            leading={<AppIcon name="paw" />}
            meta={t('more.rows.deferred')}
            subtitle={t('more.plus.subtitle')}
            title={t('more.rows.puppyplan-plus')}
          />
        </ListGroup>
        <Card
          accessibilityLabel={t('more.privacy.delete-sheet.title')}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          <Stack gap="sm">
            <AppText variant="headline">{t('more.privacy.delete-sheet.title')}</AppText>
            <AppText tone="secondary">{t('more.privacy.delete-sheet.body')}</AppText>
            <TextField
              label={t('more.privacy.delete-sheet.confirm-input-prompt')}
              onChangeText={noop}
              placeholder={t('more.privacy.delete-sheet.confirm-input-word')}
              value=""
            />
            <Button
              disabled
              label={t('more.privacy.row-delete')}
              onPress={noop}
              variant="destructive"
            />
          </Stack>
        </Card>
      </Stack>
    </Card>
  );
}

export function SyntheticQuickLogSheetShell() {
  const { t } = useAppTranslation();
  const localEventBase = {
    householdId: '00000000-0000-4000-8000-000000000501',
    puppyId: '00000000-0000-4000-8000-000000000502',
    todayDate: '2026-06-12',
  };

  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="dev.gallery.states.quick-log-sheet"
          titleKey="quick-log.sheet.title"
        />
        <SheetSurface accessibilityLabel={t('quick-log.sheet.title')}>
          <Stack
            align="center"
            direction="horizontal"
            gap="sm"
            justify="space-between">
            <AppText variant="title3">{t('quick-log.sheet.title')}</AppText>
            <Button
              label={t('quick-log.sheet.edit-trackers')}
              onPress={noop}
              variant="tertiary"
            />
          </Stack>
          <Stack direction="horizontal" gap="sm" wrap>
            {syntheticTrackers.map((tracker) => (
              <TrackerTile
                accessibilityLabel={t(tracker.labelKey)}
                icon={<AppIcon name={syntheticTrackerIcon(tracker.id)} size={24} />}
                key={tracker.id}
                label={t(tracker.labelKey)}
                onPress={noop}
                testID="dev-gallery-quick-log-tracker"
              />
            ))}
          </Stack>
          <Card variant="mutedTemplate">
            <Stack gap="sm">
              <AppText variant="headline">{t('quick-log.potty-subtype.title')}</AppText>
              <AppText tone="secondary">{t('quick-log.potty-subtype.body')}</AppText>
              <Stack direction="horizontal" gap="sm" wrap>
                {pottySubtypeFixtures.map(({ iconName, labelKey }) => (
                  <TrackerTile
                    accessibilityLabel={t(labelKey)}
                    icon={<AppIcon name={iconName} size={24} />}
                    key={labelKey}
                    label={t(labelKey)}
                    onPress={noop}
                    testID="dev-gallery-potty-subtype"
                  />
                ))}
              </Stack>
            </Stack>
          </Card>
          <Card
            accessibilityLabel={t('quick-log.duplicate-warning.title')}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert">
            <Stack gap="sm">
              <AppText variant="headline">{t('quick-log.duplicate-warning.title')}</AppText>
              <AppText tone="secondary">{t('quick-log.duplicate-warning.body-example')}</AppText>
              <Stack direction="horizontal" gap="sm" wrap>
                <Button
                  label={t('quick-log.duplicate-warning.primary-alt')}
                  onPress={noop}
                  variant="secondary"
                />
                <Button
                  label={t('quick-log.duplicate-warning.secondary')}
                  onPress={noop}
                  variant="tertiary"
                />
              </Stack>
            </Stack>
          </Card>
          <QuickLogLocalEvents
            events={[
              {
                ...localEventBase,
                clientEventId: 'evt_00000000-0000-4000-8000-000000000503',
                eventType: 'potty',
                state: 'sending',
                trackerName: t('quick-log.trackers.potty-outside'),
              },
              {
                ...localEventBase,
                clientEventId: 'evt_00000000-0000-4000-8000-000000000504',
                eventType: 'feeding',
                state: 'failed_retryable',
                trackerName: t('quick-log.trackers.feeding'),
              },
            ]}
            onDelete={noop}
            onRetry={noop}
            onUndo={noop}
          />
          <Card variant="mutedTemplate">
            <Stack gap="xs">
              <AppText variant="bodyEmph">{t('quick-log.sheet.permission-denied.title')}</AppText>
              <AppText tone="secondary">{t('quick-log.sheet.permission-denied.body')}</AppText>
              <AppText variant="bodyEmph">{t('quick-log.sheet.unavailable.title')}</AppText>
              <AppText tone="secondary">{t('quick-log.sheet.unavailable.body')}</AppText>
            </Stack>
          </Card>
        </SheetSurface>
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

export function SyntheticHealthShell() {
  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="dev.gallery.states.health-v2"
          titleKey="tabs.pet"
        />
        <HealthScreen reviewState="mixed-list" />
        <HealthScreen />
        <HealthRecordEditPreview />
        <HealthRecordEditPreview filled />
        <HealthRecordDetailPreview />
        <HealthRecordDetailPreview status="needsVetReview" deletePending />
        <HealthWeightEntryPreview />
      </Stack>
    </Card>
  );
}

export function SyntheticTimelineShell() {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="dev.gallery.states.timeline-v2"
          titleKey="timeline.title"
        />
        <Stack direction="horizontal" gap="sm" wrap>
          {timelineChipPreviewKeys.map((labelKey, index) => (
            <StatusPill
              accessibilityLabel={t(labelKey)}
              icon={<AppText accessibilityElementsHidden>*</AppText>}
              key={labelKey}
              label={t(labelKey)}
              tone={index === 0 ? 'confirmed' : 'template'}
            />
          ))}
        </Stack>
        <ListGroup>
          <ListRow
            accessibilityLabel={[
              t('quick-log.trackers.potty-outside'),
              t('timeline.actor-you'),
              t('timeline.pills.synced'),
            ].join(', ')}
            leading={<AppIcon name="pottyInside" size={22} />}
            meta="09:42"
            subtitle={t('timeline.actor-you')}
            title={t('quick-log.trackers.potty-outside')}
            variant="timeline"
          />
          <ListRow
            accessibilityLabel={[
              t('quick-log.trackers.feeding'),
              t('timeline.actor-you'),
              t('timeline.pills.pending'),
            ].join(', ')}
            leading={<AppIcon name="bowl" size={22} />}
            meta="09:31"
            subtitle={t('timeline.actor-you')}
            title={t('quick-log.trackers.feeding')}
            trailing={(
              <StatusPill
                accessibilityLabel={t('timeline.pills.pending')}
                icon={<AppText accessibilityElementsHidden>...</AppText>}
                label={t('timeline.pills.pending')}
                tone="pending"
              />
            )}
            variant="timeline"
          />
          <ListRow
            accessibilityLabel={[
              t('quick-log.trackers.walk'),
              t('timeline.actor-you'),
              t('timeline.pills.failed'),
            ].join(', ')}
            leading={<AppIcon name="paw" size={22} />}
            meta="20:10"
            subtitle={t('timeline.actor-you')}
            title={t('quick-log.trackers.walk')}
            trailing={(
              <StatusPill
                accessibilityLabel={t('timeline.pills.failed')}
                icon={<AppText accessibilityElementsHidden>!</AppText>}
                label={t('timeline.pills.failed')}
                tone="failed"
              />
            )}
            variant="timeline"
          />
        </ListGroup>
        <Card
          accessibilityLabel={t('timeline.delete-confirm.title')}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          <Stack gap="sm">
            <AppText variant="headline">{t('timeline.delete-confirm.title')}</AppText>
            <AppText tone="secondary">{t('timeline.delete-confirm.body')}</AppText>
            <Stack direction="horizontal" gap="sm" wrap>
              <Button
                label={t('timeline.delete-confirm.primary')}
                onPress={noop}
                variant="destructive"
              />
              <Button
                label={t('timeline.delete-confirm.secondary')}
                onPress={noop}
                variant="tertiary"
              />
            </Stack>
          </Stack>
        </Card>
        <EmptyState
          body={t('timeline.empty-filter')}
          icon={<AppIcon name="search" size={36} />}
          primaryAction={{
            label: t('timeline.empty-filter-clear'),
            onPress: noop,
          }}
          title={t('timeline.empty-filter-title')}
        />
      </Stack>
    </Card>
  );
}

function syntheticTrackerIcon(
  trackerId: string,
): 'bowl' | 'calendar' | 'moon' | 'spark' | 'water' {
  if (trackerId === 'feeding') {
    return 'bowl';
  }

  if (trackerId === 'sleep') {
    return 'moon';
  }

  if (trackerId === 'walk') {
    return 'calendar';
  }

  if (trackerId === 'zoomies') {
    return 'spark';
  }

  return 'water';
}

const pottySubtypeFixtures = [
  {
    iconName: 'water',
    labelKey: 'quick-log.trackers.potty-outside',
  },
  {
    iconName: 'pottyInside',
    labelKey: 'quick-log.trackers.potty-inside',
  },
  {
    iconName: 'poop',
    labelKey: 'quick-log.trackers.potty-poop',
  },
] as const;

const timelineChipPreviewKeys = [
  'timeline.filter-chips.0',
  'quick-log.trackers.potty',
  'quick-log.trackers.feeding',
  'quick-log.trackers.sleep',
  'quick-log.trackers.walk',
  'quick-log.trackers.zoomies',
  'timeline.filter-chips.6',
] as const;

export function SyntheticTodayShell() {
  const { t } = useAppTranslation();
  const stateFixtures = [
    'loading',
    'offline-read',
    'pending-write',
    'error',
  ] as const satisfies readonly TodayStatusState[];

  return (
    <Card>
      <Stack gap="md">
        <GalleryShellHeader
          bodyKey="dev.gallery.states.today-core"
          titleKey="tabs.diary"
        />
        <AppText tone="secondary">{t('dev.gallery.today.synthetic-note')}</AppText>
        {syntheticTodayPlans.map((fixture) => (
          <SyntheticTodayPreview
            key={fixture.id}
            plan={fixture.plan}
            titleKey={fixture.titleKey}
          />
        ))}
        <Card>
          <Stack gap="md">
            <GalleryShellHeader
              bodyKey="dev.gallery.states.global"
              titleKey="dev.gallery.today.state-fixtures"
            />
            {stateFixtures.map((state) => (
              <TodayStatusCard key={state} state={state} />
            ))}
          </Stack>
        </Card>
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

function GallerySettingsGroup({
  children,
  title,
}: Readonly<{
  children: ReactNode;
  title: string;
}>) {
  return (
    <Stack gap="xs">
      <SectionHeader title={title} />
      <ListGroup>{children}</ListGroup>
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
