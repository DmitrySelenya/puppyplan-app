import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  quickLogTrackerIds,
  selectedQuickLogTrackerIdsSchema,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { TrackerTile } from '@/design/primitives/TrackerTile';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { getQuickLogTrackerLabelKey } from '@/lib/query/quick-log-event-view';
import {
  isPuppyProfileOwnerRequiredError,
  useSavePuppyProfileMutation,
} from '@/lib/query/puppy';

type QuickTrackersAccessState = 'loading' | 'empty' | 'error' | 'owner' | 'nonOwner';

const SETTINGS_CONTROL_MAX_FONT_SIZE_MULTIPLIER = 2;
const SETTINGS_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER = 2;
const SETTINGS_TITLE_MAX_FONT_SIZE_MULTIPLIER = 2;
const SETTINGS_TRACKER_TILE_WIDTH =
  tokens.component.trackerTile.twoCol.width - tokens.space[2];

export type QuickTrackersSettingsScreenProps = Readonly<{
  accessState?: QuickTrackersAccessState;
  canManagePuppySettings?: boolean;
  isSaving?: boolean;
  saveSelectedTrackerIds: (trackerIds: QuickLogTrackerId[]) => Promise<unknown> | unknown;
  selectedTrackerIds: readonly QuickLogTrackerId[];
}>;

export function ConnectedQuickTrackersSettingsScreen() {
  const activeCare = useActiveCareContext();
  const saveMutation = useSavePuppyProfileMutation();

  return (
    <QuickTrackersSettingsScreen
      accessState={getQuickTrackersAccessState(activeCare)}
      isSaving={saveMutation.isPending}
      saveSelectedTrackerIds={(selectedTrackerIds) => {
        if (!activeCare.puppy) {
          return undefined;
        }

        return saveMutation.mutateAsync({
          profile: {
            ageMode: activeCare.puppy.birth_date ? 'birth_date' : 'age_weeks',
            ageWeeksEstimate: activeCare.puppy.age_weeks_estimate,
            birthDate: activeCare.puppy.birth_date,
            name: activeCare.puppy.name,
            selectedTrackerIds,
          },
          puppyId: activeCare.puppy.id,
        });
      }}
      selectedTrackerIds={activeCare.careContext?.selectedTrackerIds ?? []}
    />
  );
}

export function QuickTrackersSettingsScreen({
  accessState,
  canManagePuppySettings = true,
  isSaving = false,
  saveSelectedTrackerIds,
  selectedTrackerIds: initialSelectedTrackerIds,
}: QuickTrackersSettingsScreenProps) {
  const { t } = useAppTranslation();
  const [selectedTrackerIds, setSelectedTrackerIds] = useState<QuickLogTrackerId[]>([
    ...initialSelectedTrackerIds,
  ]);
  const [selectionWarningKey, setSelectionWarningKey] = useState<
    'more.quick-trackers.max-reached-hint' | 'more.quick-trackers.min-required-hint' | null
  >(null);
  const [saveErrorKey, setSaveErrorKey] = useState<
    'errors.owner-only-settings' | 'errors.save-failed-connection' | null
  >(null);
  const effectiveAccessState = accessState ?? (canManagePuppySettings ? 'owner' : 'nonOwner');

  useEffect(() => {
    setSelectedTrackerIds([...initialSelectedTrackerIds]);
  }, [initialSelectedTrackerIds]);

  const handleSave = async () => {
    setSaveErrorKey(null);

    try {
      await saveSelectedTrackerIds(selectedTrackerIds);
    } catch (error) {
      setSaveErrorKey(isPuppyProfileOwnerRequiredError(error)
        ? 'errors.owner-only-settings'
        : 'errors.save-failed-connection');
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

  if (effectiveAccessState === 'empty') {
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
          {t('more.quick-trackers.screen-title-template', { n: selectedTrackerIds.length })}
        </AppText>
        <AppText
          maxFontSizeMultiplier={SETTINGS_SUPPORTING_MAX_FONT_SIZE_MULTIPLIER}
          tone="secondary">
          {t('more.quick-trackers.hint')}
        </AppText>
        {selectionWarningKey ? (
          <Card
            accessibilityLabel={t(selectionWarningKey)}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert">
            <AppText>{t(selectionWarningKey)}</AppText>
          </Card>
        ) : null}
        {saveErrorKey ? (
          <Card
            accessibilityLabel={t(saveErrorKey)}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert">
            <AppText>{t(saveErrorKey)}</AppText>
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
                    setSelectionWarningKey('more.quick-trackers.max-reached-hint');
                  },
                  onMinimum: () => {
                    setSelectionWarningKey('more.quick-trackers.min-required-hint');
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
          label={t('common.save')}
          labelMaxFontSizeMultiplier={SETTINGS_CONTROL_MAX_FONT_SIZE_MULTIPLIER}
          loading={isSaving}
          onPress={handleSave}
        />
      </Stack>
    </Screen>
  );
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

function getQuickTrackersAccessState(
  activeCare: ReturnType<typeof useActiveCareContext>,
): QuickTrackersAccessState {
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
  trackerTile: {
    width: SETTINGS_TRACKER_TILE_WIDTH,
  },
});
