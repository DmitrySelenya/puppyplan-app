import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  getPuppyAgeHintKey,
  puppyProfileInputSchema,
  type PuppyAgeMode,
  type PuppyProfileInput,
} from '@/contracts/onboarding';
import {
  defaultQuickLogTrackerIds,
  quickLogTrackerIds,
  selectedQuickLogTrackerIdsSchema,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { SegmentedControl } from '@/design/primitives/SegmentedControl';
import { Stack } from '@/design/primitives/Stack';
import { TextField } from '@/design/primitives/TextField';
import { TrackerTile } from '@/design/primitives/TrackerTile';
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
  saveProfile: (profile: PuppyProfileInput) => Promise<unknown> | unknown;
}>;

type OnboardingStep = 'welcome' | 'profile' | 'trackers' | 'plan';
type ProfileErrorTarget = 'ageWeeksEstimate' | 'birthDate' | 'name';
type ProfileErrorKey =
  | 'onboarding.puppy-profile.error-age-required'
  | 'onboarding.puppy-profile.error-birth-date-required'
  | 'onboarding.puppy-profile.error-name-required';
type ProfileError = Readonly<{
  key: ProfileErrorKey;
  target: ProfileErrorTarget;
}>;

export function ConnectedOnboardingScreen({
  openQuickLog,
}: Readonly<{ openQuickLog: () => void }>) {
  const saveMutation = useSavePuppyProfileMutation();

  return (
    <OnboardingScreen
      openQuickLog={openQuickLog}
      saveProfile={(profile) => saveMutation.mutateAsync({ profile })}
    />
  );
}

export function OnboardingScreen({
  openQuickLog,
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
    'onboarding.tracker-picker.limit-snackbar' | 'onboarding.tracker-picker.min-required-snackbar' | null
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

  const continueFromProfile = () => {
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
    const profileResult = puppyProfileInputSchema.safeParse(profileInput);

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
      contentStyle={styles.content}
      key={step}>
      {step === 'welcome' ? (
        <Stack gap="lg">
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
          <Button
            label={t('onboarding.welcome.cta')}
            labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
            onPress={() => {
              setStep('profile');
            }}
          />
        </Stack>
      ) : null}

      {step === 'profile' ? (
        <Stack gap="lg">
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
            <TextField
              accessibilityLabel={t('onboarding.puppy-profile.age-weeks-field-label')}
              errorText={profileError?.target === 'ageWeeksEstimate'
                ? t(profileError.key)
                : undefined}
              keyboardType="number-pad"
              label={t('onboarding.puppy-profile.age-weeks-field-label')}
              onChangeText={(nextAgeWeeksText) => {
                setAgeWeeksText(nextAgeWeeksText);
                clearProfileError('ageWeeksEstimate', setProfileError);
              }}
              value={ageWeeksText}
            />
          ) : (
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
          )}
          <Button
            label={t('onboarding.puppy-profile.cta')}
            labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
            onPress={continueFromProfile}
          />
        </Stack>
      ) : null}

      {step === 'trackers' ? (
        <Stack gap="lg">
          <AppText
            maxFontSizeMultiplier={ONBOARDING_TITLE_MAX_FONT_SIZE_MULTIPLIER}
            variant="title">
            {t('onboarding.tracker-picker.title')}
          </AppText>
          <AppText
            maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
            tone="secondary">
            {t(getPuppyAgeHintKey(profileInput.ageWeeksEstimate))}
          </AppText>
          <AppText
            maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
            tone="secondary">
            {t('onboarding.tracker-picker.counter', { n: selectedTrackerIds.length })}
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
            {quickLogTrackerIds.map((trackerId) => (
              <TrackerTile
                accessibilityLabel={t(getQuickLogTrackerLabelKey(trackerId))}
                key={trackerId}
                label={t(getQuickLogTrackerLabelKey(trackerId))}
                onPress={() => {
                  setSelectedTrackerIds((current) => toggleTracker(current, trackerId, {
                    onLimit: () => {
                      setSelectionWarningKey('onboarding.tracker-picker.limit-snackbar');
                    },
                    onMinimum: () => {
                      setSelectionWarningKey('onboarding.tracker-picker.min-required-snackbar');
                    },
                    onValid: () => {
                      setSelectionWarningKey(null);
                    },
                  }));
                }}
                selected={selectedTrackerIds.includes(trackerId)}
                size="twoColumn"
                style={styles.trackerTile}
              />
            ))}
          </Stack>
          <Button
            label={t('onboarding.tracker-picker.cta')}
            labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
            loading={saving}
            onPress={finishTrackerSelection}
          />
        </Stack>
      ) : null}

      {step === 'plan' ? (
        <Stack gap="lg">
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
          <Button
            label={t('onboarding.plan-reveal.cta')}
            labelMaxFontSizeMultiplier={ONBOARDING_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
            onPress={openQuickLog}
          />
          <Card>
            <Stack gap="sm">
              <AppText
                maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
                variant="headline">
                {t('onboarding.plan-reveal.hero')}
              </AppText>
              <AppText maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}>
                {t('onboarding.plan-reveal.starter-card-1')}
              </AppText>
              <AppText maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}>
                {t('onboarding.plan-reveal.starter-card-2')}
              </AppText>
              <AppText maxFontSizeMultiplier={ONBOARDING_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}>
                {t('onboarding.plan-reveal.starter-card-3')}
              </AppText>
            </Stack>
          </Card>
        </Stack>
      ) : null}
    </Screen>
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

function clearProfileError(
  target: ProfileErrorTarget,
  setProfileError: (update: (current: ProfileError | null) => ProfileError | null) => void,
) {
  setProfileError((current) => current?.target === target ? null : current);
}

function getProfileValidationError(
  issues: readonly { path: readonly (number | string)[] }[],
): ProfileError {
  const target = issues
    .map((issue) => issue.path[0])
    .find(isProfileErrorTarget) ?? 'name';

  return {
    key: getProfileErrorKey(target),
    target,
  };
}

function isProfileErrorTarget(value: number | string | undefined): value is ProfileErrorTarget {
  return value === 'name' || value === 'ageWeeksEstimate' || value === 'birthDate';
}

function getProfileErrorKey(target: ProfileErrorTarget): ProfileErrorKey {
  if (target === 'ageWeeksEstimate') {
    return 'onboarding.puppy-profile.error-age-required';
  }

  if (target === 'birthDate') {
    return 'onboarding.puppy-profile.error-birth-date-required';
  }

  return 'onboarding.puppy-profile.error-name-required';
}

function toggleTracker(
  current: readonly QuickLogTrackerId[],
  trackerId: QuickLogTrackerId,
  callbacks: Readonly<{
    onLimit: () => void;
    onMinimum: () => void;
    onValid: () => void;
  }>,
): QuickLogTrackerId[] {
  if (current.includes(trackerId)) {
    if (current.length === 1) {
      callbacks.onMinimum();
      return [...current];
    }

    callbacks.onValid();
    return current.filter((selected) => selected !== trackerId);
  }

  const candidate = [...current, trackerId];
  const result = selectedQuickLogTrackerIdsSchema.safeParse(candidate);

  if (!result.success) {
    callbacks.onLimit();
    return [...current];
  }

  callbacks.onValid();
  return result.data;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.space[14] + tokens.space[10],
  },
  trackerTile: {
    width: ONBOARDING_TRACKER_TILE_WIDTH,
  },
});
