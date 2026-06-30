import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  futureBirthDateIssueMessage,
  getPuppyAgeHintKey,
  puppyProfileInputSchema,
  type PuppyAgeMode,
  type PuppyProfileInput,
} from '@/contracts/onboarding';
import {
  primaryTabs,
  quickLogAction,
} from '@/contracts/navigation';
import {
  MAX_VISIBLE_QUICK_LOG_TRACKERS,
  defaultQuickLogTrackerIds,
  quickLogTrackerIds,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import { decorativeViewProps } from '@/design/a11y';
import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { FAB } from '@/design/primitives/FAB';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { SegmentedControl } from '@/design/primitives/SegmentedControl';
import { SheetSurface } from '@/design/primitives/SheetSurface';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
import { TextField } from '@/design/primitives/TextField';
import { Touchable } from '@/design/primitives/Touchable';
import { TrackerTile } from '@/design/primitives/TrackerTile';
import { useSnackbar } from '@/design/primitives/Snackbar';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';
import { getQuickLogTrackerLabelKey } from '@/lib/query/quick-log-event-view';
import { useSavePuppyProfileMutation } from '@/lib/query/puppy';

const ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER = 2;
const ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER = 2;
const ONBOARDING_TRACKER_TILE_WIDTH =
  tokens.component.trackerTile.twoCol.width - tokens.space[2];
const ONBOARDING_TITLE_MAX_FONT_SIZE_MULTIPLIER = 2;

export type OnboardingScreenProps = Readonly<{
  openQuickLog: () => void;
  openSignIn?: () => void;
  saveProfile: (profile: PuppyProfileInput) => Promise<unknown> | unknown;
}>;

type OnboardingStep = 'welcome' | 'profile' | 'trackers' | 'plan';
type ProfileErrorTarget = 'ageWeeksEstimate' | 'birthDate' | 'name';
type ProfileErrorKey =
  | 'onboarding.puppy-profile.error-age-required'
  | 'onboarding.puppy-profile.error-birth-date-required'
  | 'onboarding.puppy-profile.error-future-date'
  | 'onboarding.puppy-profile.error-name-required';
type ProfileError = Readonly<{
  key: ProfileErrorKey;
  target: ProfileErrorTarget;
}>;

export function ConnectedOnboardingScreen({
  openQuickLog,
  openSignIn,
}: Readonly<{
  openQuickLog: () => void;
  openSignIn?: () => void;
}>) {
  const saveMutation = useSavePuppyProfileMutation();

  return (
    <OnboardingScreen
      openQuickLog={openQuickLog}
      openSignIn={openSignIn}
      saveProfile={(profile) => saveMutation.mutateAsync({ profile })}
    />
  );
}

export function OnboardingScreen({
  openQuickLog,
  openSignIn,
  saveProfile,
}: OnboardingScreenProps) {
  const { t } = useAppTranslation();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [ageMode, setAgeMode] = useState<PuppyAgeMode>('age_weeks');
  const [ageWeeksText, setAgeWeeksText] = useState('8');
  const [birthDate, setBirthDate] = useState('');
  const [selectedTrackerIds, setSelectedTrackerIds] = useState<QuickLogTrackerId[]>([
    ...defaultQuickLogTrackerIds,
  ]);
  const [profileError, setProfileError] = useState<ProfileError | null>(null);
  const [selectionWarningKey, setSelectionWarningKey] = useState<
    'onboarding.tracker-picker.limit-snackbar' | null
  >(null);
  const [saveErrorVisible, setSaveErrorVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const profileInput = useMemo(() => ({
    ageMode,
    ageWeeksEstimate: ageMode === 'age_weeks' ? parseAgeWeeks(ageWeeksText) : null,
    birthDate: ageMode === 'birth_date' && birthDate.trim() ? birthDate.trim() : null,
    name,
    selectedTrackerIds,
  }), [ageMode, ageWeeksText, birthDate, name, selectedTrackerIds]);
  const profileInputForSave = useMemo(() => ({
    ...profileInput,
    selectedTrackerIds: profileInput.selectedTrackerIds.length > 0
      ? profileInput.selectedTrackerIds
      : [...defaultQuickLogTrackerIds],
  }), [profileInput]);
  const ageHintKey = getPuppyAgeHintKey(profileInput.ageWeeksEstimate);
  const profileCanContinue = name.trim().length > 0;
  const ageWeeksValue = profileInput.ageWeeksEstimate ?? 0;
  const ageWeeksDisplay = profileCanContinue
    ? t('onboarding.puppy-profile.age-weeks-value', { count: ageWeeksValue })
    : '-';
  const planRevealName = name.trim();
  const planRevealAgeLabel = ageMode === 'age_weeks'
    ? t('onboarding.puppy-profile.age-weeks-value', { count: ageWeeksValue })
    : t('onboarding.plan-reveal.birth-date-summary');
  const planRevealSummary = t('onboarding.plan-reveal.summary', {
    age: planRevealAgeLabel,
    name: planRevealName,
  });
  const planRevealStarterCards: readonly {
    icon: AppIconName;
    id: string;
    label: string;
  }[] = [
    {
      icon: 'bowl',
      id: 'feeding',
      label: t('onboarding.plan-reveal.starter-card-1'),
    },
    {
      icon: 'pottyInside',
      id: 'potty',
      label: t('onboarding.plan-reveal.starter-card-2'),
    },
    {
      icon: 'moon',
      id: 'sleep',
      label: t('onboarding.plan-reveal.starter-card-3'),
    },
  ];
  const showProfileAgeHint = ageMode === 'age_weeks'
    && profileInput.ageWeeksEstimate !== null
    && name.trim().length > 0;

  const adjustAgeWeeks = (delta: number) => {
    setAgeWeeksText(String(clampAgeWeeks(ageWeeksValue + delta)));
    clearProfileError('ageWeeksEstimate', setProfileError);
  };

  const continueFromProfile = () => {
    if (!profileCanContinue) {
      return;
    }

    const result = puppyProfileInputSchema.safeParse(profileInput);

    if (!result.success) {
      setProfileError(getProfileValidationError(result.error.issues));
      return;
    }

    setProfileError(null);
    setSaveErrorVisible(false);
    setStep('trackers');
  };

  const finishTrackerSelection = async () => {
    const profileResult = puppyProfileInputSchema.safeParse(profileInputForSave);

    if (!profileResult.success) {
      setProfileError(getProfileValidationError(profileResult.error.issues));
      setStep('profile');
      return;
    }

    setSaving(true);
    setSaveErrorVisible(false);

    try {
      await saveProfile(profileResult.data);

      setStep('plan');
    } catch {
      setSaveErrorVisible(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      contentStyle={[styles.content, step === 'welcome' ? styles.welcomeContent : null]}
      key={step}>
      {step === 'welcome' ? (
        <Stack
          gap="lg"
          style={styles.welcomeLayout}>
          <View
            {...decorativeViewProps}
            style={styles.welcomeIllustration}
            testID="onboarding-welcome-illustration">
            <View style={styles.welcomeIllustrationGlow} />
            <View style={styles.welcomeIllustrationBowl} />
            <View style={styles.welcomeIllustrationSilhouette} />
          </View>
          <Stack gap="lg">
            <Stack gap="sm">
              <AppText
                accessibilityLabel={t('onboarding.welcome.a11y-title')}
                maxFontSizeMultiplier={ONBOARDING_TITLE_MAX_FONT_SIZE_MULTIPLIER}
                variant="title">
                {t('onboarding.welcome.title')}
              </AppText>
              <AppText
                maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
                tone="secondary">
                {t('onboarding.welcome.subtitle')}
              </AppText>
            </Stack>
            <Stack gap="sm">
              <Button
                label={t('onboarding.welcome.cta')}
                labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
                onPress={() => {
                  setStep('profile');
                }}
              />
              <Button
                label={t('onboarding.welcome.secondary')}
                labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
                onPress={openSignIn ?? (() => undefined)}
                variant="tertiary"
              />
            </Stack>
          </Stack>
        </Stack>
      ) : null}

      {step === 'profile' ? (
        <Stack gap="lg">
          <View
            style={styles.profileChrome}
            testID="onboarding-puppy-profile-chrome">
            <Touchable
              accessibilityLabel={t('onboarding.puppy-profile.back-a11y')}
              accessibilityRole="button"
              minTarget="default"
              onPress={() => {
                setProfileError(null);
                setStep('welcome');
              }}
              style={styles.profileBackButton}>
              <AppIcon
                color={tokens.color.primary[700]}
                name="chevronRight"
                size={22}
                style={styles.profileBackIcon}
              />
            </Touchable>
            <AppText
              maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
              style={styles.profileStepLabel}
              variant="footnote">
              {t('onboarding.puppy-profile.step-label')}
            </AppText>
            <View style={styles.profileChromeSpacer} />
          </View>
          <AppText
            maxFontSizeMultiplier={ONBOARDING_TITLE_MAX_FONT_SIZE_MULTIPLIER}
            variant="title">
            {t('onboarding.puppy-profile.title')}
          </AppText>
          <AppText
            maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
            tone="secondary">
            {t('onboarding.puppy-profile.helper')}
          </AppText>
          <TextField
            accessibilityHint={t('onboarding.puppy-profile.name-field-hint')}
            errorText={profileError?.target === 'name' ? t(profileError.key) : undefined}
            label={t('onboarding.puppy-profile.name-field-label')}
            onChangeText={(nextName) => {
              setName(nextName);
              clearProfileError('name', setProfileError);
            }}
            value={name}
          />
          <AppText
            maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
            tone="secondary"
            variant="subheadline">
            {t('onboarding.puppy-profile.age-section-label')}
          </AppText>
          <SegmentedControl
            accessibilityLabel={t('onboarding.puppy-profile.a11y-toggle')}
            onValueChange={(nextAgeMode) => {
              setAgeMode(nextAgeMode);
              setProfileError((current) =>
                current?.target === 'ageWeeksEstimate' || current?.target === 'birthDate'
                  ? null
                  : current);
            }}
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
            value={ageMode}
          />
          {ageMode === 'age_weeks' ? (
            <View>
              <Touchable
                accessibilityActions={[
                  { label: t('onboarding.puppy-profile.age-decrement-a11y'), name: 'decrement' },
                  { label: t('onboarding.puppy-profile.age-increment-a11y'), name: 'increment' },
                ]}
                accessibilityLabel={t('onboarding.puppy-profile.a11y-stepper', {
                  count: ageWeeksValue,
                })}
                accessibilityRole="adjustable"
                accessibilityValue={{
                  text: t('onboarding.puppy-profile.age-weeks-value', {
                    count: ageWeeksValue,
                  }),
                }}
                minTarget="none"
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === 'increment') {
                    adjustAgeWeeks(1);
                  }

                  if (event.nativeEvent.actionName === 'decrement') {
                    adjustAgeWeeks(-1);
                  }
                }}
                onPress={() => undefined}
                style={[
                  styles.ageStepper,
                  profileError?.target === 'ageWeeksEstimate' ? styles.profileInputError : null,
                ]}
                testID="onboarding-age-stepper">
                <AppText
                  maxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
                  variant="body">
                  {ageWeeksDisplay}
                </AppText>
                <View style={styles.ageStepperControls}>
                  <Touchable
                    accessibilityLabel={t('onboarding.puppy-profile.age-decrement-a11y')}
                    accessibilityRole="button"
                    disabled={ageWeeksValue <= 0}
                    minTarget="thumb"
                    onPress={() => {
                      adjustAgeWeeks(-1);
                    }}
                    style={styles.ageStepperControl}>
                    <AppText variant="headline">-</AppText>
                  </Touchable>
                  <Touchable
                    accessibilityLabel={t('onboarding.puppy-profile.age-increment-a11y')}
                    accessibilityRole="button"
                    disabled={ageWeeksValue >= 520}
                    minTarget="thumb"
                    onPress={() => {
                      adjustAgeWeeks(1);
                    }}
                    style={styles.ageStepperControl}>
                    <AppIcon
                      color={tokens.color.text.primary}
                      name="plus"
                      size={18}
                    />
                  </Touchable>
                </View>
              </Touchable>
              {profileError?.target === 'ageWeeksEstimate' ? (
                <AppText style={styles.profileErrorText} variant="footnote">
                  {t(profileError.key)}
                </AppText>
              ) : null}
            </View>
          ) : (
            <View
              style={[
                styles.dateWheelZone,
                profileError?.target === 'birthDate' ? styles.profileInputError : null,
              ]}
              testID="onboarding-birth-date-wheel">
              <TextField
                accessibilityLabel={t('onboarding.puppy-profile.age-toggle-date')}
                errorText={profileError?.target === 'birthDate'
                  ? t(profileError.key)
                  : undefined}
                label={t('onboarding.puppy-profile.age-toggle-date')}
                onChangeText={(nextBirthDate) => {
                  setBirthDate(nextBirthDate);
                  clearProfileError('birthDate', setProfileError);
                }}
                placeholder={t('onboarding.puppy-profile.birth-date-placeholder')}
                value={birthDate}
              />
            </View>
          )}
          {showProfileAgeHint ? (
            <Card
              accessibilityLabel={`Hint. ${t(ageHintKey)}`}
              style={styles.ageHintCard}
              testID="onboarding-age-hint-card">
              <Stack
                align="flex-start"
                direction="horizontal"
                gap="sm">
                <AppIcon
                  color={tokens.color.status.info}
                  name="infoCircle"
                  size={18}
                />
                <AppText
                  maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
                  style={styles.ageHintText}>
                  {t(ageHintKey)}
                </AppText>
              </Stack>
            </Card>
          ) : null}
          <Button
            disabled={!profileCanContinue}
            label={t('onboarding.puppy-profile.cta')}
            labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
            onPress={continueFromProfile}
          />
        </Stack>
      ) : null}

      {step === 'trackers' ? (
        <Stack gap="lg">
          <View
            style={styles.profileChrome}
            testID="onboarding-tracker-picker-chrome">
            <Touchable
              accessibilityLabel={t('onboarding.tracker-picker.back-a11y')}
              accessibilityRole="button"
              minTarget="default"
              onPress={() => {
                setSelectionWarningKey(null);
                setStep('profile');
              }}
              style={styles.profileBackButton}>
              <AppIcon
                color={tokens.color.primary[700]}
                name="chevronRight"
                size={22}
                style={styles.profileBackIcon}
              />
            </Touchable>
            <AppText
              maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
              style={styles.profileStepLabel}
              variant="footnote">
              {t('onboarding.tracker-picker.step-label')}
            </AppText>
            <View style={styles.profileChromeSpacer} />
          </View>
          <AppText
            maxFontSizeMultiplier={ONBOARDING_TITLE_MAX_FONT_SIZE_MULTIPLIER}
            variant="title">
            {t('onboarding.tracker-picker.title')}
          </AppText>
          <AppText
            maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
            tone="secondary">
            {t('onboarding.tracker-picker.helper')}
          </AppText>
          {selectionWarningKey ? (
            <Card
              accessibilityLabel={t(selectionWarningKey)}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert">
              <AppText>{t(selectionWarningKey)}</AppText>
            </Card>
          ) : null}
          {saveErrorVisible ? (
            <Card
              accessibilityLabel={t('errors.save-failed-connection')}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert">
              <AppText>{t('errors.save-failed-connection')}</AppText>
            </Card>
          ) : null}
          <Stack direction="horizontal" gap="md" wrap>
            {quickLogTrackerIds.map((trackerId) => {
              const selected = selectedTrackerIds.includes(trackerId);
              const label = t(getQuickLogTrackerLabelKey(trackerId));

              return (
                <TrackerTile
                  accessibilityLabel={t(selected
                    ? 'onboarding.tracker-picker.tile-selected-a11y'
                    : 'onboarding.tracker-picker.tile-unselected-a11y', {
                    label,
                  })}
                  key={trackerId}
                  label={label}
                  onPress={() => {
                    setSelectedTrackerIds((current) => toggleTracker(current, trackerId, {
                      onLimit: () => {
                        setSelectionWarningKey('onboarding.tracker-picker.limit-snackbar');
                      },
                      onValid: () => {
                        setSelectionWarningKey(null);
                      },
                    }));
                  }}
                  selected={selected}
                  size="twoColumn"
                  style={styles.trackerTile}
                />
              );
            })}
          </Stack>
          <AppText
            maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
            tone="secondary">
            {t('onboarding.tracker-picker.counter', { n: selectedTrackerIds.length })}
          </AppText>
          <Button
            label={t(selectedTrackerIds.length === 0
              ? 'onboarding.tracker-picker.zero-state-cta'
              : 'onboarding.tracker-picker.cta')}
            labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
            loading={saving}
            onPress={finishTrackerSelection}
          />
        </Stack>
      ) : null}

      {step === 'plan' ? (
        <Stack gap="lg">
          <View
            accessibilityLabel={t('onboarding.plan-reveal.summary-a11y', {
              age: planRevealAgeLabel,
              name: planRevealName,
            })}
            accessible
            style={styles.planSummaryRow}
            testID="onboarding-plan-summary">
            <AppText
              maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
              tone="secondary"
              variant="footnote">
              {planRevealSummary}
            </AppText>
            <View
              {...decorativeViewProps}
              style={styles.planAvatar}>
              <AppIcon
                color={tokens.color.accent[700]}
                name="paw"
                size={18}
              />
            </View>
          </View>
          <AppText
            maxFontSizeMultiplier={ONBOARDING_TITLE_MAX_FONT_SIZE_MULTIPLIER}
            variant="title">
            {t('onboarding.plan-reveal.title')}
          </AppText>
          <AppText
            maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
            tone="secondary">
            {t('onboarding.plan-reveal.subtitle')}
          </AppText>
          <Card
            accessibilityLabel={t('onboarding.plan-reveal.hero-a11y', {
              hero: t('onboarding.plan-reveal.hero'),
            })}
            style={styles.planHeroCard}
            testID="onboarding-plan-hero-card"
            variant="hero">
            <View style={styles.planHeroContent}>
              <View
                {...decorativeViewProps}
                style={styles.planHeroIconBadge}>
                <AppIcon
                  color={tokens.color.accent[700]}
                  name="spark"
                  size={22}
                />
              </View>
              <AppText
                maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
                variant="headline">
                {t('onboarding.plan-reveal.hero')}
              </AppText>
            </View>
          </Card>
          <Stack gap="sm">
            {planRevealStarterCards.map((starter) => (
              <Card
                accessibilityLabel={t('onboarding.plan-reveal.starter-card-a11y', {
                  action: starter.label,
                })}
                key={starter.id}
                style={styles.planStarterCard}
                testID="onboarding-plan-starter-card">
                <View style={styles.planStarterRow}>
                  <View
                    {...decorativeViewProps}
                    style={styles.planStarterIconBadge}>
                    <AppIcon
                      color={tokens.color.accent[700]}
                      name={starter.icon}
                      size={20}
                    />
                  </View>
                  <AppText maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}>
                    {starter.label}
                  </AppText>
                </View>
              </Card>
            ))}
          </Stack>
          <Button
            label={t('onboarding.plan-reveal.cta')}
            labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
            onPress={openQuickLog}
          />
        </Stack>
      ) : null}
    </Screen>
  );
}

export function OnboardingFirstLogPreview() {
  const { t } = useAppTranslation();
  const { replaceSnackbar } = useSnackbar();

  useEffect(() => {
    replaceSnackbar({
      accessibilityLabel: t('onboarding.first-log.celebration-snackbar-a11y'),
      hapticEvent: 'celebration',
      id: 'onboarding-first-log-celebration',
      message: t('onboarding.first-log.celebration-snackbar'),
      tone: 'success',
    });
  }, [replaceSnackbar, t]);

  return (
    <View style={styles.firstLogRoot}>
      <Screen contentStyle={styles.firstLogContent}>
        <Stack gap="lg">
          <Card accessibilityLabel={t('onboarding.first-log.hero-after-first')}>
            <Stack gap="sm">
              <View style={styles.firstLogStatusRow}>
                <StatusPill
                  accessibilityLabel={t('timeline.pills.pending')}
                  icon={<AppIcon name="infoCircle" size={14} />}
                  label={t('timeline.pills.pending')}
                  tone="pending"
                />
              </View>
              <AppText
                maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
                variant="headline">
                {t('onboarding.first-log.hero-after-first')}
              </AppText>
              <AppText
                maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
                tone="secondary">
                {t('onboarding.first-log.body-after-first')}
              </AppText>
            </Stack>
          </Card>
          <ListRow
            accessibilityLabel={[
              t('onboarding.first-log.event-title'),
              t('onboarding.first-log.event-meta'),
              t('timeline.pills.local-only'),
              t('timeline.pills.pending'),
            ].join(', ')}
            leading={<AppIcon name="pottyInside" size={22} />}
            meta={t('timeline.pills.local-only')}
            subtitle={t('onboarding.first-log.event-meta')}
            title={t('onboarding.first-log.event-title')}
            variant="timeline"
          />
        </Stack>
      </Screen>
      <View style={styles.firstLogChrome}>
        <View
          accessibilityRole="tablist"
          style={styles.tabBar}>
          {primaryTabs.map((tab) => {
            const selected = tab.id === 'diary';

            return (
              <Touchable
                accessibilityLabel={t(tab.accessibilityLabelKey)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={tab.id}
                minTarget="thumb"
                onPress={() => undefined}
                style={styles.tabButton}>
                <AppIcon
                  color={selected ? tokens.color.primary[700] : tokens.color.text.tertiary}
                  filled={selected}
                  name={tabIconById[tab.id]}
                  size={22}
                />
                <AppText
                  tone={selected ? 'primary' : 'tertiary'}
                  variant="caption">
                  {t(tab.labelKey)}
                </AppText>
              </Touchable>
            );
          })}
        </View>
        <FAB
          accessibilityHint={t(quickLogAction.accessibilityHintKey)}
          accessibilityLabel={t(quickLogAction.labelKey)}
          onPress={() => undefined}
          style={styles.firstLogFab}
        />
      </View>
    </View>
  );
}

export function OnboardingAccountPromptPreview() {
  const { t } = useAppTranslation();

  return (
    <SheetSurface
      accessibilityLabel={t('onboarding.account-wall.sheet-a11y')}
      style={styles.promptSheet}>
      <PostValuePromptHeading
        body={t('onboarding.account-wall.body')}
        icon="personCluster"
        title={t('onboarding.account-wall.title')}
      />
      <Stack gap="sm">
        <Button
          label={t('onboarding.account-wall.apple')}
          labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
          onPress={() => undefined}
        />
        <Button
          label={t('onboarding.account-wall.google')}
          labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
          onPress={() => undefined}
          variant="secondary"
        />
        <Button
          label={t('onboarding.account-wall.email')}
          labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
          onPress={() => undefined}
          variant="secondary"
        />
        <Button
          label={t('onboarding.account-wall.secondary')}
          labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
          onPress={() => undefined}
          variant="tertiary"
        />
      </Stack>
    </SheetSurface>
  );
}

export function OnboardingNotificationsPromptPreview() {
  const { t } = useAppTranslation();

  return (
    <SheetSurface
      accessibilityLabel={t('onboarding.notifications-prompt.sheet-a11y')}
      style={styles.promptSheet}>
      <PostValuePromptHeading
        body={t('onboarding.notifications-prompt.body')}
        icon="bell"
        title={t('onboarding.notifications-prompt.title')}
      />
      <Stack gap="sm">
        <Button
          label={t('onboarding.notifications-prompt.primary')}
          labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
          onPress={() => undefined}
        />
        <Button
          label={t('onboarding.notifications-prompt.secondary')}
          labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
          onPress={() => undefined}
          variant="tertiary"
        />
      </Stack>
    </SheetSurface>
  );
}

function PostValuePromptHeading({
  body,
  icon,
  title,
}: Readonly<{
  body: string;
  icon: AppIconName;
  title: string;
}>) {
  return (
    <Stack
      align="center"
      gap="sm">
      <View
        {...decorativeViewProps}
        style={styles.promptIconBubble}>
        <AppIcon
          color={tokens.color.status.info}
          name={icon}
          size={24}
        />
      </View>
      <AppText
        maxFontSizeMultiplier={ONBOARDING_TITLE_MAX_FONT_SIZE_MULTIPLIER}
        style={styles.promptTitle}
        variant="title3">
        {title}
      </AppText>
      <AppText
        maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
        style={styles.promptBody}
        tone="secondary">
        {body}
      </AppText>
    </Stack>
  );
}

function parseAgeWeeks(value: string): number | null {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function clampAgeWeeks(value: number): number {
  return Math.min(520, Math.max(0, value));
}

function clearProfileError(
  target: ProfileErrorTarget,
  setProfileError: (update: (current: ProfileError | null) => ProfileError | null) => void,
) {
  setProfileError((current) => current?.target === target ? null : current);
}

function getProfileValidationError(
  issues: readonly { message?: string; path: readonly (number | string)[] }[],
): ProfileError {
  const issue = issues.find((candidate) => isProfileErrorTarget(candidate.path[0]));
  const target = isProfileErrorTarget(issue?.path[0]) ? issue.path[0] : 'name';

  return {
    key: getProfileErrorKey(target, issue?.message),
    target,
  };
}

function isProfileErrorTarget(value: number | string | undefined): value is ProfileErrorTarget {
  return value === 'name' || value === 'ageWeeksEstimate' || value === 'birthDate';
}

function getProfileErrorKey(
  target: ProfileErrorTarget,
  issueMessage?: string,
): ProfileErrorKey {
  if (target === 'ageWeeksEstimate') {
    return 'onboarding.puppy-profile.error-age-required';
  }

  if (target === 'birthDate') {
    if (issueMessage === futureBirthDateIssueMessage) {
      return 'onboarding.puppy-profile.error-future-date';
    }

    return 'onboarding.puppy-profile.error-birth-date-required';
  }

  return 'onboarding.puppy-profile.error-name-required';
}

function toggleTracker(
  current: readonly QuickLogTrackerId[],
  trackerId: QuickLogTrackerId,
  callbacks: Readonly<{
    onLimit: () => void;
    onValid: () => void;
  }>,
): QuickLogTrackerId[] {
  if (current.includes(trackerId)) {
    callbacks.onValid();
    return current.filter((selected) => selected !== trackerId);
  }

  const candidate = [...current, trackerId];

  if (candidate.length > MAX_VISIBLE_QUICK_LOG_TRACKERS) {
    callbacks.onLimit();
    return [...current];
  }

  callbacks.onValid();
  return candidate;
}

const tabIconById: Record<(typeof primaryTabs)[number]['id'], AppIconName> = {
  diary: 'book',
  more: 'more',
  pet: 'paw',
};

const styles = StyleSheet.create({
  ageHintCard: {
    backgroundColor: tokens.color.status.infoTint,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  ageHintText: {
    color: tokens.color.status.info,
    flex: 1,
  },
  ageStepper: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingLeft: tokens.space[3],
    paddingRight: tokens.space[2],
  },
  ageStepperControl: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.sunken,
    borderRadius: tokens.radius.sm,
    justifyContent: 'center',
  },
  ageStepperControls: {
    flexDirection: 'row',
    gap: tokens.space[1],
  },
  content: {
    paddingBottom: tokens.space[14] + tokens.space[10],
  },
  dateWheelZone: {
    backgroundColor: tokens.color.surface.raised,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: tokens.space[2],
  },
  firstLogChrome: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.base,
    borderTopColor: tokens.color.stroke.dividerHairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    flexDirection: 'row',
    gap: tokens.space[3],
    justifyContent: 'space-between',
    left: 0,
    paddingBottom: tokens.space[5],
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[2],
    position: 'absolute',
    right: 0,
  },
  firstLogContent: {
    paddingBottom: tokens.layout.bottomInsetFab,
  },
  firstLogFab: {
    position: 'relative',
  },
  firstLogRoot: {
    minHeight: 620,
  },
  firstLogStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  planAvatar: {
    alignItems: 'center',
    backgroundColor: tokens.color.accent[100],
    borderColor: tokens.color.accent[300],
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  planHeroCard: {
    backgroundColor: tokens.color.accent[100],
    borderColor: tokens.color.accent[300],
    justifyContent: 'center',
    minHeight: 96,
  },
  planHeroContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  planHeroIconBadge: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderRadius: tokens.radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  planStarterCard: {
    minHeight: 60,
    paddingVertical: tokens.space[3],
  },
  planStarterIconBadge: {
    alignItems: 'center',
    backgroundColor: tokens.color.accent[100],
    borderRadius: tokens.radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  planStarterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  planSummaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  promptBody: {
    textAlign: 'center',
  },
  promptIconBubble: {
    alignItems: 'center',
    backgroundColor: tokens.color.status.infoTint,
    borderRadius: tokens.radius.full,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  promptSheet: {
    minHeight: 0,
  },
  promptTitle: {
    textAlign: 'center',
  },
  profileBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBackIcon: {
    transform: [{ rotate: '180deg' }],
  },
  profileChrome: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  profileChromeSpacer: {
    width: 44,
  },
  profileErrorText: {
    color: tokens.color.status.danger,
    marginTop: tokens.space[2],
  },
  profileInputError: {
    borderColor: tokens.color.status.danger,
  },
  profileStepLabel: {
    color: tokens.color.text.secondary,
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    gap: tokens.space[1],
    justifyContent: 'space-between',
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    gap: tokens.space[1],
    justifyContent: 'center',
    minHeight: 52,
  },
  trackerTile: {
    width: ONBOARDING_TRACKER_TILE_WIDTH,
  },
  welcomeContent: {
    flexGrow: 1,
  },
  welcomeIllustration: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.sunken,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 160,
    overflow: 'hidden',
  },
  welcomeIllustrationBowl: {
    backgroundColor: tokens.color.primary[100],
    borderColor: tokens.color.primary[300],
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 42,
    height: 18,
    position: 'absolute',
    right: 72,
    width: 62,
  },
  welcomeIllustrationGlow: {
    backgroundColor: tokens.color.accent[100],
    borderRadius: tokens.radius.full,
    height: 92,
    opacity: 0.72,
    position: 'absolute',
    width: 92,
  },
  welcomeIllustrationSilhouette: {
    backgroundColor: tokens.color.surface.raised,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    height: 74,
    width: 74,
  },
  welcomeLayout: {
    flex: 1,
    justifyContent: 'space-between',
  },
});
