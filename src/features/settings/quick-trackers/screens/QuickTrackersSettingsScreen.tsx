import { useEffect, useState } from 'react';

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
import { useAppTranslation } from '@/lib/i18n';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { getQuickLogTrackerLabelKey } from '@/lib/query/quick-log-event-view';
import { useSavePuppyProfileMutation } from '@/lib/query/puppy';

export type QuickTrackersSettingsScreenProps = Readonly<{
  isSaving?: boolean;
  saveSelectedTrackerIds: (trackerIds: QuickLogTrackerId[]) => Promise<unknown> | unknown;
  selectedTrackerIds: readonly QuickLogTrackerId[];
}>;

export function ConnectedQuickTrackersSettingsScreen() {
  const activeCare = useActiveCareContext();
  const saveMutation = useSavePuppyProfileMutation();

  return (
    <QuickTrackersSettingsScreen
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
  isSaving = false,
  saveSelectedTrackerIds,
  selectedTrackerIds: initialSelectedTrackerIds,
}: QuickTrackersSettingsScreenProps) {
  const { t } = useAppTranslation();
  const [selectedTrackerIds, setSelectedTrackerIds] = useState<QuickLogTrackerId[]>([
    ...initialSelectedTrackerIds,
  ]);
  const [limitVisible, setLimitVisible] = useState(false);

  useEffect(() => {
    setSelectedTrackerIds([...initialSelectedTrackerIds]);
  }, [initialSelectedTrackerIds]);

  const handleSave = async () => {
    await saveSelectedTrackerIds(selectedTrackerIds);
  };

  return (
    <Screen>
      <Stack gap="lg">
        <AppText variant="title">
          {t('more.quick-trackers.screen-title-template', { n: selectedTrackerIds.length })}
        </AppText>
        <AppText tone="secondary">{t('more.quick-trackers.hint')}</AppText>
        {limitVisible ? (
          <Card>
            <AppText>{t('more.quick-trackers.max-reached-hint')}</AppText>
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
          label={t('common.save')}
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
