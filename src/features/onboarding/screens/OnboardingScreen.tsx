import { useMemo, useState } from 'react';

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
import { useAppTranslation } from '@/lib/i18n';
import { getQuickLogTrackerLabelKey } from '@/lib/query/quick-log-event-view';
import { useSavePuppyProfileMutation } from '@/lib/query/puppy';

export type OnboardingScreenProps = Readonly<{
  openQuickLog: () => void;
  saveProfile: (profile: PuppyProfileInput) => Promise<unknown> | unknown;
}>;

type OnboardingStep = 'welcome' | 'profile' | 'trackers' | 'plan';

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
  const [errorKey, setErrorKey] = useState<'onboarding.puppy-profile.error-required' | null>(null);
  const [limitVisible, setLimitVisible] = useState(false);
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
      setErrorKey('onboarding.puppy-profile.error-required');
      return;
    }

    setErrorKey(null);
    setSaveErrorVisible(false);
    setStep('trackers');
  };

  const finishTrackerSelection = async () => {
    const profileResult = puppyProfileInputSchema.safeParse(profileInput);

    if (!profileResult.success) {
      setErrorKey('onboarding.puppy-profile.error-required');
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
    <Screen>
      {step === 'welcome' ? (
        <Stack gap="lg">
          <AppText accessibilityLabel={t('onboarding.welcome.a11y-title')} variant="title">
            {t('onboarding.welcome.title')}
          </AppText>
          <AppText tone="secondary">{t('onboarding.welcome.subtitle')}</AppText>
          <Button
            label={t('onboarding.welcome.cta')}
            onPress={() => {
              setStep('profile');
            }}
          />
        </Stack>
      ) : null}

      {step === 'profile' ? (
        <Stack gap="lg">
          <AppText variant="title">{t('onboarding.puppy-profile.title')}</AppText>
          <AppText tone="secondary">{t('onboarding.puppy-profile.helper')}</AppText>
          <TextField
            accessibilityHint={t('onboarding.puppy-profile.name-field-hint')}
            errorText={errorKey ? t(errorKey) : undefined}
            label={t('onboarding.puppy-profile.name-field-label')}
            onChangeText={setName}
            value={name}
          />
          <SegmentedControl
            accessibilityLabel={t('onboarding.puppy-profile.a11y-toggle')}
            onValueChange={setAgeMode}
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
              accessibilityLabel={t('onboarding.puppy-profile.age-toggle-age')}
              keyboardType="number-pad"
              label={t('onboarding.puppy-profile.age-toggle-age')}
              onChangeText={setAgeWeeksText}
              value={ageWeeksText}
            />
          ) : (
            <TextField
              accessibilityLabel={t('onboarding.puppy-profile.age-toggle-date')}
              label={t('onboarding.puppy-profile.age-toggle-date')}
              onChangeText={setBirthDate}
              placeholder={t('onboarding.puppy-profile.birth-date-placeholder')}
              value={birthDate}
            />
          )}
          <Button
            label={t('onboarding.puppy-profile.cta')}
            onPress={continueFromProfile}
          />
        </Stack>
      ) : null}

      {step === 'trackers' ? (
        <Stack gap="lg">
          <AppText variant="title">{t('onboarding.tracker-picker.title')}</AppText>
          <AppText tone="secondary">{t(getPuppyAgeHintKey(profileInput.ageWeeksEstimate))}</AppText>
          <AppText tone="secondary">
            {t('onboarding.tracker-picker.counter', { n: selectedTrackerIds.length })}
          </AppText>
          {limitVisible ? (
            <Card>
              <AppText>{t('onboarding.tracker-picker.limit-snackbar')}</AppText>
            </Card>
          ) : null}
          {saveErrorVisible ? (
            <Card>
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
                  setSelectedTrackerIds((current) => toggleTracker(current, trackerId, () => {
                    setLimitVisible(true);
                  }));
                }}
                selected={selectedTrackerIds.includes(trackerId)}
              />
            ))}
          </Stack>
          <Button
            label={t('onboarding.tracker-picker.cta')}
            loading={saving}
            onPress={finishTrackerSelection}
          />
        </Stack>
      ) : null}

      {step === 'plan' ? (
        <Stack gap="lg">
          <AppText variant="title">{t('onboarding.plan-reveal.title')}</AppText>
          <AppText tone="secondary">{t('onboarding.plan-reveal.subtitle')}</AppText>
          <Card>
            <Stack gap="sm">
              <AppText variant="headline">{t('onboarding.plan-reveal.hero')}</AppText>
              <AppText>{t('onboarding.plan-reveal.starter-card-1')}</AppText>
              <AppText>{t('onboarding.plan-reveal.starter-card-2')}</AppText>
              <AppText>{t('onboarding.plan-reveal.starter-card-3')}</AppText>
            </Stack>
          </Card>
          <Button
            label={t('onboarding.plan-reveal.cta')}
            onPress={openQuickLog}
          />
        </Stack>
      ) : null}
    </Screen>
  );
}

function parseAgeWeeks(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function toggleTracker(
  current: readonly QuickLogTrackerId[],
  trackerId: QuickLogTrackerId,
  onLimit: () => void,
): QuickLogTrackerId[] {
  if (current.includes(trackerId)) {
    return current.filter((selected) => selected !== trackerId);
  }

  const candidate = [...current, trackerId];
  const result = selectedQuickLogTrackerIdsSchema.safeParse(candidate);

  if (!result.success) {
    onLimit();
    return [...current];
  }

  return result.data;
}
