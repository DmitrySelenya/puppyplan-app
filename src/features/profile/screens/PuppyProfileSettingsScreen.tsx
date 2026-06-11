import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  puppyProfileInputSchema,
  type PuppyAgeMode,
  type PuppyProfileInput,
} from '@/contracts/onboarding';
import type { PuppyProfile } from '@/contracts/supabase';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { SegmentedControl } from '@/design/primitives/SegmentedControl';
import { Stack } from '@/design/primitives/Stack';
import { TextField } from '@/design/primitives/TextField';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import {
  isPuppyProfileOwnerRequiredError,
  useSavePuppyProfileMutation,
} from '@/lib/query/puppy';

type PuppyProfileAccessState = 'loading' | 'empty' | 'error' | 'owner' | 'nonOwner';

const SETTINGS_CONTROL_MAX_FONT_SIZE_MULTIPLIER = 2;
const SETTINGS_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER = 2;
const SETTINGS_TITLE_MAX_FONT_SIZE_MULTIPLIER = 2;

export type PuppyProfileSettingsScreenProps = Readonly<{
  accessState?: PuppyProfileAccessState;
  canManagePuppySettings?: boolean;
  isSaving?: boolean;
  puppy: PuppyProfile | null;
  saveProfile: (profile: PuppyProfileInput, puppyId: string) => Promise<unknown> | unknown;
}>;

export function ConnectedPuppyProfileSettingsScreen() {
  const activeCare = useActiveCareContext();
  const saveMutation = useSavePuppyProfileMutation();

  return (
    <PuppyProfileSettingsScreen
      accessState={getPuppyProfileAccessState(activeCare)}
      isSaving={saveMutation.isPending}
      puppy={activeCare.puppy}
      saveProfile={(profile, puppyId) => saveMutation.mutateAsync({
        profile,
        puppyId,
      })}
    />
  );
}

export function PuppyProfileSettingsScreen({
  accessState,
  canManagePuppySettings = true,
  isSaving = false,
  puppy,
  saveProfile,
}: PuppyProfileSettingsScreenProps) {
  const { t } = useAppTranslation();
  const [name, setName] = useState(puppy?.name ?? '');
  const [ageMode, setAgeMode] = useState<PuppyAgeMode>(
    puppy?.birth_date ? 'birth_date' : 'age_weeks',
  );
  const [ageWeeksText, setAgeWeeksText] = useState(
    String(puppy?.age_weeks_estimate ?? 8),
  );
  const [birthDate, setBirthDate] = useState(puppy?.birth_date ?? '');
  const [errorVisible, setErrorVisible] = useState(false);
  const [saveErrorKey, setSaveErrorKey] = useState<
    'errors.owner-only-settings' | 'errors.save-failed-connection' | null
  >(null);
  const effectiveAccessState = accessState ?? (canManagePuppySettings ? 'owner' : 'nonOwner');

  useEffect(() => {
    if (!puppy) {
      return;
    }

    setName(puppy.name);
    setAgeMode(puppy.birth_date ? 'birth_date' : 'age_weeks');
    setAgeWeeksText(String(puppy.age_weeks_estimate ?? 8));
    setBirthDate(puppy.birth_date ?? '');
  }, [puppy]);

  const selectedTrackerIds = useMemo(
    () => puppy?.quick_tracker_ids ?? [],
    [puppy?.quick_tracker_ids],
  );

  const handleSave = async () => {
    const result = puppyProfileInputSchema.safeParse({
      ageMode,
      ageWeeksEstimate: ageMode === 'age_weeks' ? parseAgeWeeks(ageWeeksText) : null,
      birthDate: ageMode === 'birth_date' && birthDate.trim() ? birthDate.trim() : null,
      name,
      selectedTrackerIds,
    });

    if (!result.success) {
      setErrorVisible(true);
      setSaveErrorKey(null);
      return;
    }

    setErrorVisible(false);
    setSaveErrorKey(null);

    if (puppy) {
      try {
        await saveProfile(result.data, puppy.id);
      } catch (error) {
        setSaveErrorKey(isPuppyProfileOwnerRequiredError(error)
          ? 'errors.owner-only-settings'
          : 'errors.save-failed-connection');
      }
    }
  };

  if (effectiveAccessState === 'loading') {
    return (
      <Screen>
        <Card>
          <AppText>{t('common.loading')}</AppText>
        </Card>
      </Screen>
    );
  }

  if (effectiveAccessState === 'error') {
    return (
      <Screen>
        <Card
          accessibilityLabel={t('errors.load-failed')}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          <AppText>{t('errors.load-failed')}</AppText>
        </Card>
      </Screen>
    );
  }

  if (!puppy || effectiveAccessState === 'empty') {
    return (
      <Screen>
        <Card>
          <AppText>{t('today.quick-log.unavailable.title')}</AppText>
        </Card>
      </Screen>
    );
  }

  if (effectiveAccessState === 'nonOwner') {
    return (
      <Screen>
        <Card
          accessibilityLabel={t('errors.owner-only-settings')}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          <AppText>{t('errors.owner-only-settings')}</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <Stack gap="lg">
        <AppText
          maxFontSizeMultiplier={SETTINGS_TITLE_MAX_FONT_SIZE_MULTIPLIER}
          variant="title">
          {t('more.puppy-profile.screen-title')}
        </AppText>
        <AppText
          maxFontSizeMultiplier={SETTINGS_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
          tone="secondary">
          {t('more.puppy-profile.hint')}
        </AppText>
        {saveErrorKey ? (
          <Card
            accessibilityLabel={t(saveErrorKey)}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert">
            <AppText>{t(saveErrorKey)}</AppText>
          </Card>
        ) : null}
        <TextField
          errorText={errorVisible ? t('onboarding.puppy-profile.error-required') : undefined}
          label={t('more.puppy-profile.field-name')}
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
            keyboardType="number-pad"
            label={t('onboarding.puppy-profile.age-toggle-age')}
            onChangeText={setAgeWeeksText}
            value={ageWeeksText}
          />
        ) : (
          <TextField
            label={t('onboarding.puppy-profile.age-toggle-date')}
            onChangeText={setBirthDate}
            placeholder={t('onboarding.puppy-profile.birth-date-placeholder')}
            value={birthDate}
          />
        )}
        <Button
          label={t('more.puppy-profile.save')}
          labelMaxFontSizeMultiplier={SETTINGS_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
          loading={isSaving}
          onPress={handleSave}
        />
      </Stack>
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

function getPuppyProfileAccessState(
  activeCare: ReturnType<typeof useActiveCareContext>,
): PuppyProfileAccessState {
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

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.space[14],
  },
});
