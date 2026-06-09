import { useEffect, useMemo, useState } from 'react';

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
import { useAppTranslation } from '@/lib/i18n';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { useSavePuppyProfileMutation } from '@/lib/query/puppy';

export type PuppyProfileSettingsScreenProps = Readonly<{
  isSaving?: boolean;
  puppy: PuppyProfile | null;
  saveProfile: (profile: PuppyProfileInput, puppyId: string) => Promise<unknown> | unknown;
}>;

export function ConnectedPuppyProfileSettingsScreen() {
  const activeCare = useActiveCareContext();
  const saveMutation = useSavePuppyProfileMutation();

  return (
    <PuppyProfileSettingsScreen
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
  const [saveErrorVisible, setSaveErrorVisible] = useState(false);

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
      setSaveErrorVisible(false);
      return;
    }

    setErrorVisible(false);
    setSaveErrorVisible(false);

    if (puppy) {
      try {
        await saveProfile(result.data, puppy.id);
      } catch {
        setSaveErrorVisible(true);
      }
    }
  };

  if (!puppy) {
    return (
      <Screen>
        <Card>
          <AppText>{t('today.quick-log.unavailable.title')}</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack gap="lg">
        <AppText variant="title">{t('more.puppy-profile.screen-title')}</AppText>
        <AppText tone="secondary">{t('more.puppy-profile.hint')}</AppText>
        {saveErrorVisible ? (
          <Card>
            <AppText>{t('errors.save-failed-connection')}</AppText>
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
          loading={isSaving}
          onPress={handleSave}
        />
      </Stack>
    </Screen>
  );
}

function parseAgeWeeks(value: string): number | null {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
}
