import { useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  STARTER_GUIDANCE_CONTENT,
  applyGuidanceAction,
  type GuidanceCompletionState,
  type StarterGuidanceTopic,
  type StarterGuidanceTopicId,
} from '@/contracts/guidance';
import type {
  TodayDailyCardVariant,
  TodayDeferredProductionFeature,
  TodayHeroVariant,
  TodayPlan,
} from '@/contracts/today';
import {
  AppText,
  AppIcon,
  Button,
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
  | 'empty'
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
  primaryKey?: I18nKey;
}>;

type StatusCopy = CopyPair & Readonly<{
  statusKey: I18nKey;
}>;

export function TodayPlanCards({
  onHeroPrimaryAction,
  plan,
}: Readonly<{
  onHeroPrimaryAction?: () => void;
  plan: TodayPlan;
}>) {
  return (
    <Stack gap="md">
      <TodayHeroCard
        onPrimaryAction={onHeroPrimaryAction}
        variant={plan.hero.variant}
      />
      <TodayDailyCardList cards={plan.dailyCards.map((card) => ({
        syntheticOnly: card.syntheticOnly === true,
        variant: card.variant,
      }))}
      firstDayMode={plan.hero.variant === 'first_day'} />
      {plan.guidanceCard === null ? null : (
        <StarterGuidanceCard topicId={plan.guidanceCard.topicId} />
      )}
      {plan.deferredProductionFeatures.length > 0 ? (
        <TodayDeferredFeatureNote features={plan.deferredProductionFeatures} />
      ) : null}
    </Stack>
  );
}

export function TodayHeroCard({
  onPrimaryAction,
  variant,
}: Readonly<{
  onPrimaryAction?: () => void;
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
        {copy.primaryKey === undefined || onPrimaryAction === undefined ? null : (
          <Button
            label={t(copy.primaryKey)}
            onPress={onPrimaryAction}
            variant="primary"
          />
        )}
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

        return (
          <Card
            key={card.variant}
            testID="today-daily-card">
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

export function StarterGuidanceCard({
  topicId,
}: Readonly<{
  topicId: StarterGuidanceTopicId;
}>) {
  const { t } = useAppTranslation();
  const [state, setState] = useState<GuidanceCompletionState | null>(null);
  const topic = guidanceTopicById[topicId];

  if (topic === undefined) {
    return null;
  }

  if (state === 'skip') {
    return (
      <Card testID="today-guidance-skipped">
        <AppText tone="secondary">{t('guidance.status.skipped')}</AppText>
      </Card>
    );
  }

  const copy = guidanceTopicCopy[topic.id];

  return (
    <Card testID="today-guidance-card">
      <Stack gap="md">
        <StatusPill
          accessibilityLabel={t('guidance.eyebrow-template', {
            current: topic.dayNumber,
            total: STARTER_GUIDANCE_CONTENT.topics.length,
          })}
          icon={<AppText accessibilityElementsHidden>i</AppText>}
          label={t('guidance.eyebrow-template', {
            current: topic.dayNumber,
            total: STARTER_GUIDANCE_CONTENT.topics.length,
          })}
          tone="template"
        />
        <Stack gap="xs">
          <AppText variant="headline">{t(copy.titleKey)}</AppText>
          <AppText tone="secondary">{t(copy.bodyKey)}</AppText>
        </Stack>
        <Stack
          direction="horizontal"
          gap="sm"
          wrap>
          <Button
            label={t('guidance.action-labels.read')}
            onPress={() => {
              setState(applyGuidanceAction({
                action: 'read',
                topicId: topic.id,
              }).state);
            }}
            variant={state === 'read' ? 'secondary' : 'tertiary'}
          />
          <Button
            label={t('guidance.action-labels.practiced')}
            onPress={() => {
              setState(applyGuidanceAction({
                action: 'practiced',
                topicId: topic.id,
              }).state);
            }}
            variant={state === 'practiced' ? 'secondary' : 'tertiary'}
          />
          <Button
            label={t('guidance.action-labels.skip')}
            onPress={() => {
              setState(applyGuidanceAction({
                action: 'skip',
                topicId: topic.id,
              }).state);
            }}
            variant="tertiary"
          />
        </Stack>
        {state === 'read' || state === 'practiced' ? (
          <GuidanceTopicDetail
            state={state}
            topic={topic}
          />
        ) : null}
      </Stack>
    </Card>
  );
}

export function GuidanceTopicDetail({
  state,
  topic,
}: Readonly<{
  state: Exclude<GuidanceCompletionState, 'skip'>;
  topic: StarterGuidanceTopic;
}>) {
  const { t } = useAppTranslation();
  const copy = guidanceTopicCopy[topic.id];
  const statusKey = state === 'read'
    ? 'guidance.status.read'
    : 'guidance.status.practiced';

  return (
    <Card
      testID="today-guidance-detail"
      variant="mutedTemplate">
      <Stack gap="sm">
        <AppText variant="bodyEmph">{t(statusKey)}</AppText>
        <AppText tone="secondary">{t(copy.escalationKey)}</AppText>
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

const guidanceTopicById = Object.fromEntries(
  STARTER_GUIDANCE_CONTENT.topics.map((topic) => [topic.id, topic]),
) as Partial<Record<StarterGuidanceTopicId, StarterGuidanceTopic>>;

const todayHeroCopy = {
  accident_recovery: {
    bodyKey: 'today.hero.accident-recovery.body',
    eyebrowKey: 'today.hero.eyebrow',
    primaryKey: 'today.hero.accident-recovery.primary',
    titleKey: 'today.hero.accident-recovery.title',
  },
  day_2_morning: {
    bodyKey: 'today.hero.day-2-morning.body',
    eyebrowKey: 'today.hero.eyebrow',
    primaryKey: 'today.hero.day-2-morning.primary',
    titleKey: 'today.hero.day-2-morning.title',
  },
  day_7_weekly_rhythm: {
    bodyKey: 'today.hero.day-7-weekly-rhythm.body',
    eyebrowKey: 'today.hero.eyebrow',
    primaryKey: 'today.hero.day-7-weekly-rhythm.primary',
    titleKey: 'today.hero.day-7-weekly-rhythm.title',
  },
  first_day: {
    bodyKey: 'today.hero.first-day.body',
    eyebrowKey: 'today.hero.first-day.eyebrow',
    primaryKey: 'today.hero.first-day.primary',
    titleKey: 'today.hero.first-day.title',
  },
  missed_reminder: {
    bodyKey: 'today.hero.missed-reminder.body',
    eyebrowKey: 'today.deferred.synthetic-badge',
    primaryKey: 'today.hero.missed-reminder.primary',
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
  empty: {
    bodyKey: 'today.states.empty.body',
    statusKey: 'today.states.empty.status',
    titleKey: 'today.states.empty.title',
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
  empty: 'docText',
  error: 'infoCircle',
  loading: 'spark',
  'offline-read': 'lock',
  'pending-write': 'infoCircle',
  'permission-denied': 'lock',
  unavailable: 'docText',
} as const satisfies Record<TodayStatusState, Parameters<typeof AppIcon>[0]['name']>;

const todayStatusTone = {
  empty: 'template',
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

const guidanceTopicCopy = {
  alone_time: {
    bodyKey: 'guidance.alone-time.body',
    escalationKey: 'guidance.alone-time.escalation',
    titleKey: 'guidance.alone-time.title',
  },
  biting_play: {
    bodyKey: 'guidance.biting-play.body',
    escalationKey: 'guidance.biting-play.escalation',
    titleKey: 'guidance.biting-play.title',
  },
  calm_greetings: {
    bodyKey: 'guidance.calm-greetings.body',
    escalationKey: 'guidance.calm-greetings.escalation',
    titleKey: 'guidance.calm-greetings.title',
  },
  chew_swap: {
    bodyKey: 'guidance.chew-swap.body',
    escalationKey: 'guidance.chew-swap.escalation',
    titleKey: 'guidance.chew-swap.title',
  },
  crate_settling: {
    bodyKey: 'guidance.crate-settling.body',
    escalationKey: 'guidance.crate-settling.escalation',
    titleKey: 'guidance.crate-settling.title',
  },
  feeding_rhythm: {
    bodyKey: 'guidance.feeding-rhythm.body',
    escalationKey: 'guidance.feeding-rhythm.escalation',
    titleKey: 'guidance.feeding-rhythm.title',
  },
  first_night: {
    bodyKey: 'guidance.first-night.body',
    escalationKey: 'guidance.first-night.escalation',
    titleKey: 'guidance.first-night.title',
  },
  handling: {
    bodyKey: 'guidance.handling.body',
    escalationKey: 'guidance.handling.escalation',
    titleKey: 'guidance.handling.title',
  },
  leash_intro: {
    bodyKey: 'guidance.leash-intro.body',
    escalationKey: 'guidance.leash-intro.escalation',
    titleKey: 'guidance.leash-intro.title',
  },
  potty_rhythm: {
    bodyKey: 'guidance.potty-rhythm.body',
    escalationKey: 'guidance.potty-rhythm.escalation',
    titleKey: 'guidance.potty-rhythm.title',
  },
  quiet_sleep: {
    bodyKey: 'guidance.quiet-sleep.body',
    escalationKey: 'guidance.quiet-sleep.escalation',
    titleKey: 'guidance.quiet-sleep.title',
  },
  socialization_window: {
    bodyKey: 'guidance.socialization-window.body',
    escalationKey: 'guidance.socialization-window.escalation',
    titleKey: 'guidance.socialization-window.title',
  },
  vet_visit_prep: {
    bodyKey: 'guidance.vet-visit-prep.body',
    escalationKey: 'guidance.vet-visit-prep.escalation',
    titleKey: 'guidance.vet-visit-prep.title',
  },
  weekly_rhythm: {
    bodyKey: 'guidance.weekly-rhythm.body',
    escalationKey: 'guidance.weekly-rhythm.escalation',
    titleKey: 'guidance.weekly-rhythm.title',
  },
} as const satisfies Record<StarterGuidanceTopicId, CopyPair & Readonly<{ escalationKey: I18nKey }>>;

const styles = StyleSheet.create({
  cardTitle: {
    flexShrink: 1,
  },
  eyebrow: {
    textTransform: 'uppercase',
  },
  infoBanner: {
    backgroundColor: tokens.color.status.infoTint,
    borderColor: 'transparent',
    marginBottom: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
