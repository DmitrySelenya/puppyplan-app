import { StyleSheet } from 'react-native';

import type {
  TodayDailyCardVariant,
  TodayDeferredProductionFeature,
  TodayHeroVariant,
  TodayPlan,
} from '@/contracts/today';
import {
  AppText,
  AppIcon,
  Card,
  ListGroup,
  ListRow,
  SectionHeader,
  Stack,
  StatusPill,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useAppTranslation, type I18nKey } from '@/lib/i18n';

export type TodayStatusState =
  | 'all-done'
  | 'cold-start'
  | 'empty'
  | 'empty-history'
  | 'error'
  | 'loading'
  | 'offline-read'
  | 'pending-write'
  | 'permission-denied'
  | 'unavailable';

type CopyPair = Readonly<{
  bodyKey: I18nKey;
  titleKey: I18nKey;
}>;

type HeroCopy = CopyPair & Readonly<{
  eyebrowKey: I18nKey;
}>;

type StatusCopy = CopyPair & Readonly<{
  statusKey: I18nKey;
}>;

export function TodayPlanCards({
  plan,
}: Readonly<{
  plan: TodayPlan;
}>) {
  return (
    <Stack gap="md">
      <TodayHeroCard
        variant={plan.hero.variant}
      />
      <TodayDailyCardList cards={plan.dailyCards.map((card) => ({
        syntheticOnly: card.syntheticOnly === true,
        variant: card.variant,
      }))}
      firstDayMode={plan.hero.variant === 'first_day'} />
      {plan.deferredProductionFeatures.length > 0 ? (
        <TodayDeferredFeatureNote features={plan.deferredProductionFeatures} />
      ) : null}
    </Stack>
  );
}

export function TodayHeroCard({
  variant,
}: Readonly<{
  variant: TodayHeroVariant;
}>) {
  const { t } = useAppTranslation();
  const copy: HeroCopy = todayHeroCopy[variant];
  const body = variant === 'first_day' ? '' : t(copy.bodyKey);

  return (
    <Card
      accessibilityLabel={t(copy.titleKey)}
      testID="today-hero-card"
      variant="hero">
      <Stack gap="sm">
        <AppText
          maxFontSizeMultiplier={1.6}
          style={styles.eyebrow}
          tone="tertiary"
          variant="caption">
          {t(copy.eyebrowKey)}
        </AppText>
        <AppText variant="title3">{t(copy.titleKey)}</AppText>
        {body.trim() ? <AppText tone="secondary">{body}</AppText> : null}
      </Stack>
    </Card>
  );
}

export function TodayDailyCardList({
  cards,
  firstDayMode = false,
}: Readonly<{
  cards: readonly Readonly<{ syntheticOnly?: boolean; variant: TodayDailyCardVariant }>[];
  firstDayMode?: boolean;
}>) {
  const { t } = useAppTranslation();
  const starterCards = cards.filter((card) => isStarterActionCard(card.variant));
  const otherCards = firstDayMode
    ? []
    : cards.filter((card) => !isStarterActionCard(card.variant));

  return (
    <Stack gap="sm" testID="today-daily-card-list">
      {starterCards.length > 0 ? (
        <>
          <SectionHeader
            title={t('today.daily-cards.starter-section-title')}
            titleStyle={styles.sectionHeader}
          />
          <ListGroup>
            {starterCards.map((card) => {
              const copy = todayDailyCardCopy[card.variant];

              return (
                <ListRow
                  accessory="chevron"
                  key={card.variant}
                  leading={<AppIcon color={tokens.color.text.secondary} name={dailyCardIcon(card.variant)} size={22} />}
                  title={t(copy.titleKey)}
                  titleNumberOfLines={2}
                />
              );
            })}
          </ListGroup>
          <Card style={styles.infoBanner} variant="mutedTemplate">
            <Stack align="center" direction="horizontal" gap="sm">
              <AppIcon color={tokens.color.status.info} name="book" size={18} />
              <AppText
                maxFontSizeMultiplier={1.5}
                style={styles.infoText}
                tone="secondary"
                variant="footnote">
                {t('today.daily-cards.first-day-banner')}
              </AppText>
            </Stack>
          </Card>
        </>
      ) : null}
      {otherCards.map((card) => {
        const copy = todayDailyCardCopy[card.variant];
        const isContextualTip = card.variant === 'feeding_pattern';

        return (
          <Card
            key={card.variant}
            testID={isContextualTip ? 'diary-contextual-tip-card' : 'today-daily-card'}
            variant={isContextualTip ? 'mutedTemplate' : undefined}>
            <Stack gap="sm">
              <Stack
                align="center"
                direction="horizontal"
                gap="sm"
                justify="space-between"
                wrap>
                <AppText
                  style={styles.cardTitle}
                  variant="headline">
                  {t(copy.titleKey)}
                </AppText>
                {card.syntheticOnly === true ? (
                  <StatusPill
                    accessibilityLabel={t('today.deferred.synthetic-badge')}
                    icon={<AppText accessibilityElementsHidden>*</AppText>}
                    label={t('today.deferred.synthetic-badge')}
                    tone="pending"
                  />
                ) : null}
              </Stack>
              <AppText tone="secondary">{t(copy.bodyKey)}</AppText>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

export function TodayStatusCard({
  state,
}: Readonly<{
  state: TodayStatusState;
}>) {
  const { t } = useAppTranslation();
  const copy = todayStatusCopy[state];
  const iconName = todayStatusIcon[state];
  const tone = todayStatusTone[state];

  return (
    <Card
      accessibilityLabel={`${t(copy.titleKey)}. ${t(copy.bodyKey)}`}
      accessibilityLiveRegion={state === 'error' || state === 'pending-write' ? 'polite' : undefined}
      accessibilityRole={state === 'error' ? 'alert' : undefined}
      testID={`today-state-${state}`}>
      <Stack gap="sm">
        <Stack
          align="center"
          direction="horizontal"
          gap="sm">
          <StatusPill
            accessibilityLabel={t(copy.statusKey)}
            icon={<AppIcon color={tokens.color.pill[tone].text} name={iconName} size={14} />}
            label={t(copy.statusKey)}
            tone={tone}
          />
        </Stack>
        <AppText variant="headline">{t(copy.titleKey)}</AppText>
        <AppText tone="secondary">{t(copy.bodyKey)}</AppText>
      </Stack>
    </Card>
  );
}

function TodayDeferredFeatureNote({
  features,
}: Readonly<{
  features: readonly TodayDeferredProductionFeature[];
}>) {
  const { t } = useAppTranslation();

  return (
    <Card
      testID="today-deferred-feature-note"
      variant="mutedTemplate">
      <Stack gap="xs">
        <AppText variant="bodyEmph">{t('today.deferred.title')}</AppText>
        {features.map((feature) => (
          <AppText
            key={feature}
            tone="secondary">
            {t(todayDeferredCopy[feature])}
          </AppText>
        ))}
      </Stack>
    </Card>
  );
}

export function SyntheticTodayPreview({
  plan,
  titleKey,
}: Readonly<{
  plan: TodayPlan;
  titleKey: I18nKey;
}>) {
  const { t } = useAppTranslation();

  return (
    <Card>
      <Stack gap="md">
        <ListRow
          meta={t('dev.gallery.synthetic-badge')}
          title={t(titleKey)}
        />
        <TodayPlanCards plan={plan} />
      </Stack>
    </Card>
  );
}

export const todayHeroCopy = {
  accident_recovery: {
    bodyKey: 'today.hero.accident-recovery.body',
    eyebrowKey: 'today.hero.eyebrow',
    titleKey: 'today.hero.accident-recovery.title',
  },
  day_2_morning: {
    bodyKey: 'today.hero.day-2-morning.body',
    eyebrowKey: 'today.hero.eyebrow',
    titleKey: 'today.hero.day-2-morning.title',
  },
  day_7_weekly_rhythm: {
    bodyKey: 'today.hero.day-7-weekly-rhythm.body',
    eyebrowKey: 'today.hero.eyebrow',
    titleKey: 'today.hero.day-7-weekly-rhythm.title',
  },
  first_day: {
    bodyKey: 'today.hero.first-day.body',
    eyebrowKey: 'today.hero.first-day.eyebrow',
    titleKey: 'today.hero.first-day.title',
  },
  missed_reminder: {
    bodyKey: 'today.hero.missed-reminder.body',
    eyebrowKey: 'today.deferred.synthetic-badge',
    titleKey: 'today.hero.missed-reminder.title',
  },
  steady_day: {
    bodyKey: 'today.hero.steady-day.body',
    eyebrowKey: 'today.hero.eyebrow',
    titleKey: 'today.hero.steady-day.title',
  },
} as const satisfies Record<TodayHeroVariant, HeroCopy>;

const todayDailyCardCopy = {
  after_invite: {
    bodyKey: 'today.daily-cards.after-invite.body',
    titleKey: 'today.daily-cards.after-invite.title',
  },
  feeding_pattern: {
    bodyKey: 'today.daily-cards.feeding-pattern.body',
    titleKey: 'today.daily-cards.feeding-pattern.title',
  },
  health_calm_check: {
    bodyKey: 'today.daily-cards.health-calm-check.body',
    titleKey: 'today.daily-cards.health-calm-check.title',
  },
  potty_rhythm: {
    bodyKey: 'today.daily-cards.potty-rhythm.body',
    titleKey: 'today.daily-cards.potty-rhythm.title',
  },
  quick_log_prompt: {
    bodyKey: 'today.daily-cards.quick-log-prompt.body',
    titleKey: 'today.daily-cards.quick-log-prompt.title',
  },
  recap_yesterday: {
    bodyKey: 'today.daily-cards.recap-yesterday.body',
    titleKey: 'today.daily-cards.recap-yesterday.title',
  },
  sleep_rhythm: {
    bodyKey: 'today.daily-cards.sleep-rhythm.body',
    titleKey: 'today.daily-cards.sleep-rhythm.title',
  },
  starter_action_feeding: {
    bodyKey: 'today.daily-cards.starter-action-feeding.body',
    titleKey: 'today.daily-cards.starter-action-feeding.title',
  },
  starter_action_potty: {
    bodyKey: 'today.daily-cards.starter-action-potty.body',
    titleKey: 'today.daily-cards.starter-action-potty.title',
  },
  starter_action_sleep: {
    bodyKey: 'today.daily-cards.starter-action-sleep.body',
    titleKey: 'today.daily-cards.starter-action-sleep.title',
  },
  timeline_review: {
    bodyKey: 'today.daily-cards.timeline-review.body',
    titleKey: 'today.daily-cards.timeline-review.title',
  },
  tracker_settings: {
    bodyKey: 'today.daily-cards.tracker-settings.body',
    titleKey: 'today.daily-cards.tracker-settings.title',
  },
} as const satisfies Record<TodayDailyCardVariant, CopyPair>;

const todayStatusCopy = {
  'all-done': {
    bodyKey: 'today.states.all-done.body',
    statusKey: 'today.states.all-done.status',
    titleKey: 'today.states.all-done.title',
  },
  'cold-start': {
    bodyKey: 'today.states.cold-start.body',
    statusKey: 'today.states.cold-start.status',
    titleKey: 'today.states.cold-start.title',
  },
  empty: {
    bodyKey: 'today.states.empty.body',
    statusKey: 'today.states.empty.status',
    titleKey: 'today.states.empty.title',
  },
  'empty-history': {
    bodyKey: 'today.states.empty-history.body',
    statusKey: 'today.states.empty-history.status',
    titleKey: 'today.states.empty-history.title',
  },
  error: {
    bodyKey: 'today.states.error.body',
    statusKey: 'today.states.error.status',
    titleKey: 'today.states.error.title',
  },
  loading: {
    bodyKey: 'today.states.loading.body',
    statusKey: 'today.states.loading.status',
    titleKey: 'today.states.loading.title',
  },
  'offline-read': {
    bodyKey: 'today.states.offline-read.body',
    statusKey: 'today.states.offline-read.status',
    titleKey: 'today.states.offline-read.title',
  },
  'pending-write': {
    bodyKey: 'today.states.pending-write.body',
    statusKey: 'today.states.pending-write.status',
    titleKey: 'today.states.pending-write.title',
  },
  'permission-denied': {
    bodyKey: 'today.states.permission-denied.body',
    statusKey: 'today.states.permission-denied.status',
    titleKey: 'today.states.permission-denied.title',
  },
  unavailable: {
    bodyKey: 'today.states.unavailable.body',
    statusKey: 'today.states.unavailable.status',
    titleKey: 'today.states.unavailable.title',
  },
} as const satisfies Record<TodayStatusState, StatusCopy>;

const todayStatusIcon = {
  'all-done': 'spark',
  'cold-start': 'plus',
  empty: 'docText',
  'empty-history': 'book',
  error: 'infoCircle',
  loading: 'spark',
  'offline-read': 'lock',
  'pending-write': 'infoCircle',
  'permission-denied': 'lock',
  unavailable: 'docText',
} as const satisfies Record<TodayStatusState, Parameters<typeof AppIcon>[0]['name']>;

const todayStatusTone = {
  'all-done': 'completed',
  'cold-start': 'template',
  empty: 'template',
  'empty-history': 'template',
  error: 'failed',
  loading: 'pending',
  'offline-read': 'template',
  'pending-write': 'pending',
  'permission-denied': 'template',
  unavailable: 'template',
} as const satisfies Record<TodayStatusState, Parameters<typeof StatusPill>[0]['tone']>;

const todayDeferredCopy = {
  family_invite: 'today.deferred.family-invite',
  reminders: 'today.deferred.reminders',
} as const satisfies Record<TodayDeferredProductionFeature, I18nKey>;

const styles = StyleSheet.create({
  cardTitle: {
    flexShrink: 1,
  },
  eyebrow: {
    textTransform: 'uppercase',
  },
  infoBanner: {
    backgroundColor: tokens.color.status.infoTint,
    borderColor: tokens.color.status.infoTint,
    marginBottom: tokens.layout.tabBarHeight + tokens.space[6],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
  },
  infoText: {
    color: tokens.color.status.info,
    flex: 1,
  },
  sectionHeader: {
    textTransform: 'uppercase',
  },
});

function isStarterActionCard(variant: TodayDailyCardVariant): boolean {
  return variant === 'starter_action_feeding'
    || variant === 'starter_action_potty'
    || variant === 'starter_action_sleep';
}

function dailyCardIcon(variant: TodayDailyCardVariant): 'bowl' | 'moon' | 'water' {
  if (variant === 'starter_action_feeding') {
    return 'bowl';
  }

  if (variant === 'starter_action_sleep') {
    return 'moon';
  }

  return 'water';
}
