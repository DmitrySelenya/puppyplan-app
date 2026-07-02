import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  MAX_VISIBLE_QUICK_LOG_TRACKERS,
  quickLogTrackerIds,
  selectedQuickLogTrackerIdsSchema,
  type QuickLogTrackerId,
} from '@/contracts/quick-log';
import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Card } from '@/design/primitives/Card';
import { ListGroup } from '@/design/primitives/ListGroup';
import { ListRow } from '@/design/primitives/ListRow';
import { Screen } from '@/design/primitives/Screen';
import { ScreenHeader } from '@/design/primitives/ScreenHeader';
import { SectionHeader } from '@/design/primitives/SectionHeader';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill, type StatusPillTone } from '@/design/primitives/StatusPill';
import { Toggle } from '@/design/primitives/Toggle';
import { tokens } from '@/design/tokens';
import { type AppTranslate, useAppTranslation } from '@/lib/i18n';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import { getQuickLogTrackerLabelKey } from '@/lib/query/quick-log-event-view';
import {
  isPuppyProfileOwnerRequiredError,
  useSavePuppyProfileMutation,
} from '@/lib/query/puppy';

type QuickTrackersAccessState = 'loading' | 'empty' | 'error' | 'owner' | 'nonOwner';
type QuickTrackersStateTemplate = Exclude<QuickTrackersAccessState, 'owner'>;

const quickTrackersStateMeta = {
  empty: {
    icon: 'paw',
    statusKey: 'more.quick-trackers.states.empty.status',
    titleKey: 'more.quick-trackers.states.empty.title',
    bodyKey: 'more.quick-trackers.states.empty.body',
    testId: 'quick-trackers-state-empty',
    tone: 'template',
  },
  error: {
    icon: 'warningTriangle',
    statusKey: 'more.quick-trackers.states.error.status',
    titleKey: 'more.quick-trackers.states.error.title',
    bodyKey: 'more.quick-trackers.states.error.body',
    testId: 'quick-trackers-state-error',
    tone: 'failed',
  },
  loading: {
    icon: 'sliders',
    statusKey: 'more.quick-trackers.states.loading.status',
    titleKey: 'more.quick-trackers.states.loading.title',
    bodyKey: 'more.quick-trackers.states.loading.body',
    testId: 'quick-trackers-state-loading',
    tone: 'pending',
  },
  nonOwner: {
    icon: 'lock',
    statusKey: 'more.quick-trackers.states.non-owner.status',
    titleKey: 'more.quick-trackers.states.non-owner.title',
    bodyKey: 'more.quick-trackers.states.non-owner.body',
    testId: 'quick-trackers-state-non-owner',
    tone: 'failed',
  },
} as const satisfies Record<QuickTrackersStateTemplate, {
  bodyKey: Parameters<AppTranslate>[0];
  icon: AppIconName;
  statusKey: Parameters<AppTranslate>[0];
  testId: string;
  titleKey: Parameters<AppTranslate>[0];
  tone: StatusPillTone;
}>;

const trackerIconNames: Record<QuickLogTrackerId, AppIconName> = {
  feeding: 'bowl',
  potty: 'paw',
  sleep: 'moon',
  walk: 'calendar',
  zoomies: 'spark',
};

export type QuickTrackersSettingsScreenProps = Readonly<{
  accessState?: QuickTrackersAccessState;
  canManagePuppySettings?: boolean;
  isSaving?: boolean;
  onBack?: () => void;
  saveSelectedTrackerIds: (trackerIds: QuickLogTrackerId[]) => Promise<unknown> | unknown;
  selectedTrackerIds: readonly QuickLogTrackerId[];
}>;

export function ConnectedQuickTrackersSettingsScreen() {
  const activeCare = useActiveCareContext();
  const saveMutation = useSavePuppyProfileMutation();
  const router = useRouter();

  return (
    <QuickTrackersSettingsScreen
      accessState={getQuickTrackersAccessState(activeCare)}
      isSaving={saveMutation.isPending}
      onBack={() => router.back()}
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
  onBack,
  saveSelectedTrackerIds,
  selectedTrackerIds: initialSelectedTrackerIds,
}: QuickTrackersSettingsScreenProps) {
  const { t } = useAppTranslation();
  const [selectedTrackerIds, setSelectedTrackerIds] = useState<QuickLogTrackerId[]>([
    ...initialSelectedTrackerIds,
  ]);
  const selectedTrackerIdsRef = useRef<QuickLogTrackerId[]>([
    ...initialSelectedTrackerIds,
  ]);
  const lastConfirmedTrackerIdsRef = useRef<QuickLogTrackerId[]>([
    ...initialSelectedTrackerIds,
  ]);
  const saveQueueRef = useRef<Promise<void> | null>(null);
  const [selectionWarningKey, setSelectionWarningKey] = useState<
    'more.quick-trackers.max-reached-hint' | 'more.quick-trackers.min-required-hint' | null
  >(getSelectionCapWarningKey(initialSelectedTrackerIds));
  const [saveErrorKey, setSaveErrorKey] = useState<
    'errors.owner-only-settings' | 'errors.save-failed-connection' | null
  >(null);
  const effectiveAccessState = accessState ?? (canManagePuppySettings ? 'owner' : 'nonOwner');

  useEffect(() => {
    const next = [...initialSelectedTrackerIds];

    selectedTrackerIdsRef.current = next;
    lastConfirmedTrackerIdsRef.current = next;
    setSelectedTrackerIds(next);
    setSelectionWarningKey(getSelectionCapWarningKey(initialSelectedTrackerIds));
  }, [initialSelectedTrackerIds]);

  const commitSelectedTrackerIds = (next: QuickLogTrackerId[]) => {
    selectedTrackerIdsRef.current = [...next];
    setSelectedTrackerIds(next);
  };

  // Implicit-save model: any valid change to the selection (toggle or reorder)
  // persists immediately via the save mutation. There is no bottom Save CTA.
  const persist = (
    next: QuickLogTrackerId[],
  ) => {
    const handleSaveSuccess = () => {
      lastConfirmedTrackerIdsRef.current = [...next];
    };
    const handleSaveError = (error: unknown) => {
      if (!areTrackerSelectionsEqual(selectedTrackerIdsRef.current, next)) {
        return;
      }

      const confirmedTrackerIds = [...lastConfirmedTrackerIdsRef.current];

      selectedTrackerIdsRef.current = confirmedTrackerIds;
      setSelectedTrackerIds(confirmedTrackerIds);
      setSelectionWarningKey(getSelectionCapWarningKey(confirmedTrackerIds));
      setSaveErrorKey(isPuppyProfileOwnerRequiredError(error)
        ? 'errors.owner-only-settings'
        : 'errors.save-failed-connection');
    };
    const runSave = (): Promise<void> | null => {
      setSaveErrorKey(null);

      try {
        const result = saveSelectedTrackerIds(next);

        if (isPromiseLike(result)) {
          return Promise.resolve(result).then(handleSaveSuccess, handleSaveError);
        }

        handleSaveSuccess();
      } catch (error) {
        handleSaveError(error);
      }

      return null;
    };
    const queuedSave = saveQueueRef.current === null
      ? runSave()
      : saveQueueRef.current.then(
        () => runSave() ?? undefined,
        () => runSave() ?? undefined,
      );

    if (queuedSave === null) {
      return;
    }

    const queueSlot = queuedSave.catch(() => undefined);

    saveQueueRef.current = queueSlot;
    void queueSlot.finally(() => {
      if (saveQueueRef.current === queueSlot) {
        saveQueueRef.current = null;
      }
    });
  };

  const applyToggle = (trackerId: QuickLogTrackerId) => {
    const current = selectedTrackerIdsRef.current;
    const next = toggleTracker(current, trackerId, {
      onLimit: () => {
        setSelectionWarningKey('more.quick-trackers.max-reached-hint');
      },
      onMinimum: () => {
        setSelectionWarningKey('more.quick-trackers.min-required-hint');
      },
      onValid: (next) => {
        setSelectionWarningKey(getSelectionCapWarningKey(next));
        persist(next);
      },
    });

    commitSelectedTrackerIds(next);
  };

  const applyReorder = (trackerId: QuickLogTrackerId, actionName: 'moveUp' | 'moveDown') => {
    const current = selectedTrackerIdsRef.current;
    const next = moveSelectedTracker(current, trackerId, actionName);

    if (!areTrackerSelectionsEqual(next, current)) {
      setSelectionWarningKey(getSelectionCapWarningKey(next));
      persist(next);
    }

    commitSelectedTrackerIds(next);
  };

  if (effectiveAccessState === 'loading') {
    return <StateScreen onBack={onBack} state="loading" />;
  }

  if (effectiveAccessState === 'error') {
    return <StateScreen onBack={onBack} state="error" />;
  }

  if (effectiveAccessState === 'empty') {
    return <StateScreen onBack={onBack} state="empty" />;
  }

  if (effectiveAccessState === 'nonOwner') {
    return <StateScreen onBack={onBack} state="nonOwner" />;
  }

  const selectedRows = selectedTrackerIds;
  const moreRows = quickLogTrackerIds.filter((trackerId) => !selectedTrackerIds.includes(trackerId));
  const atCap = selectedTrackerIds.length >= MAX_VISIBLE_QUICK_LOG_TRACKERS;

  return (
    <Screen>
      {onBack ? (
        <ScreenHeader
          backLabel={t('more.screen-title')}
          onBack={onBack}
          title={t('more.quick-trackers.screen-title')}
        />
      ) : (
        <ScreenHeader title={t('more.quick-trackers.screen-title')} />
      )}
      <AppText tone="secondary">{t('more.quick-trackers.hint')}</AppText>
      <AppText tone="secondary" variant="subheadline">
        {t('more.quick-trackers.selected-count', {
          count: selectedTrackerIds.length,
          max: MAX_VISIBLE_QUICK_LOG_TRACKERS,
        })}
      </AppText>
      {selectionWarningKey === 'more.quick-trackers.min-required-hint' ? (
        <AlertStateCardContent message={t(selectionWarningKey)} />
      ) : null}
      {saveErrorKey ? <AlertStateCardContent message={t(saveErrorKey)} /> : null}
      <ListGroup>
        {selectedRows.map((trackerId, index) => (
          <TrackerSettingsRow
            key={trackerId}
            disabled={false}
            onReorderAction={(actionName) => applyReorder(trackerId, actionName)}
            onToggle={() => applyToggle(trackerId)}
            reorderActions={createReorderActions(index, selectedRows.length, t)}
            selected
            trackerId={trackerId}
          />
        ))}
      </ListGroup>
      {moreRows.length > 0 ? (
        <Stack gap="xs">
          <SectionHeader
            title={t('more.quick-trackers.more-options')}
            titleStyle={styles.sectionTitle}
          />
          <ListGroup>
            {moreRows.map((trackerId) => (
              <TrackerSettingsRow
                key={trackerId}
                disabled={atCap}
                onReorderAction={() => undefined}
                onToggle={() => applyToggle(trackerId)}
                reorderActions={[]}
                selected={false}
                trackerId={trackerId}
              />
            ))}
          </ListGroup>
        </Stack>
      ) : null}
      {selectionWarningKey === 'more.quick-trackers.max-reached-hint' ? (
        <AppText style={styles.footerHint} tone="tertiary" variant="footnote">
          {t('more.quick-trackers.max-reached-hint')}
        </AppText>
      ) : null}
      <AppText style={styles.footerHint} tone="tertiary" variant="footnote">
        {t('more.quick-trackers.history-hint')}
      </AppText>
    </Screen>
  );
}

function TrackerSettingsRow({
  disabled,
  onReorderAction,
  onToggle,
  reorderActions,
  selected,
  trackerId,
}: Readonly<{
  disabled: boolean;
  onReorderAction: (actionName: 'moveUp' | 'moveDown') => void;
  onToggle: () => void;
  reorderActions: readonly { label: string; name: 'moveUp' | 'moveDown' }[];
  selected: boolean;
  trackerId: QuickLogTrackerId;
}>) {
  const { t } = useAppTranslation();
  const label = t(getQuickLogTrackerLabelKey(trackerId));
  const iconColor = selected ? tokens.color.text.primary : tokens.color.text.tertiary;

  return (
    <ListRow
      accessibilityActions={reorderActions}
      accessibilityLabel={label}
      disabled={disabled}
      leading={(
        <View style={styles.leading}>
          <AppIcon
            color={tokens.color.text.tertiary}
            name="sliders"
            size={18}
            testID={`tracker-reorder-handle-${trackerId}`}
          />
          <AppIcon color={iconColor} name={trackerIconNames[trackerId]} />
        </View>
      )}
      onAccessibilityAction={(actionEvent) => {
        const actionName = actionEvent.nativeEvent.actionName;

        if (actionName === 'moveUp' || actionName === 'moveDown') {
          onReorderAction(actionName);
        }
      }}
      onPress={onToggle}
      selected={selected}
      title={label}
      trailing={(
        <Toggle
          accessibilityLabel={t('more.quick-trackers.toggle-a11y', { label })}
          disabled={disabled}
          onValueChange={onToggle}
          testID={`tracker-toggle-${trackerId}`}
          value={selected}
        />
      )}
      variant="settings"
    />
  );
}

function moveSelectedTracker(
  current: readonly QuickLogTrackerId[],
  trackerId: QuickLogTrackerId,
  actionName: 'moveUp' | 'moveDown',
): QuickLogTrackerId[] {
  const fromIndex = current.indexOf(trackerId);

  if (fromIndex < 0) {
    return [...current];
  }

  const toIndex = actionName === 'moveUp' ? fromIndex - 1 : fromIndex + 1;

  if (toIndex < 0 || toIndex >= current.length) {
    return [...current];
  }

  const next = [...current];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];

  return next;
}

function createReorderActions(
  index: number,
  rowCount: number,
  t: AppTranslate,
): { label: string; name: 'moveUp' | 'moveDown' }[] {
  const actions: { label: string; name: 'moveUp' | 'moveDown' }[] = [];

  if (index > 0) {
    actions.push({ label: t('more.quick-trackers.move-up'), name: 'moveUp' });
  }

  if (index < rowCount - 1) {
    actions.push({ label: t('more.quick-trackers.move-down'), name: 'moveDown' });
  }

  return actions;
}

function StateScreen({
  onBack,
  state,
}: Readonly<{
  onBack?: () => void;
  state: QuickTrackersStateTemplate;
}>) {
  const { t } = useAppTranslation();

  return (
    <Screen>
      {onBack ? (
        <ScreenHeader
          backLabel={t('more.screen-title')}
          onBack={onBack}
          title={t('more.quick-trackers.screen-title')}
        />
      ) : (
        <ScreenHeader title={t('more.quick-trackers.screen-title')} />
      )}
      <QuickTrackersStatePreview state={state} />
    </Screen>
  );
}

function AlertStateCardContent({ message }: Readonly<{ message: string }>) {
  return (
    <Card
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      <AppText>{message}</AppText>
    </Card>
  );
}

export function QuickTrackersStatePreview({
  state,
}: Readonly<{
  state: QuickTrackersStateTemplate;
}>) {
  const { t } = useAppTranslation();
  const meta = quickTrackersStateMeta[state];
  const status = t(meta.statusKey);
  const isAlert = state === 'error' || state === 'nonOwner';
  const isLoading = state === 'loading';

  return (
    <Card
      accessibilityLabel={t(meta.titleKey)}
      accessibilityLiveRegion={isLoading ? 'polite' : undefined}
      accessibilityRole={isAlert ? 'alert' : undefined}
      testID={meta.testId}
      variant={state === 'empty' ? 'mutedTemplate' : 'resting'}>
      <Stack gap="sm">
        <StatusPill
          accessibilityLabel={status}
          icon={(
            <AppIcon
              color={tokens.color.pill[meta.tone].text}
              name={meta.icon}
              size={tokens.component.pill.icon}
            />
          )}
          label={status}
          tone={meta.tone}
        />
        <Stack gap="xs">
          <AppText variant="headline">{t(meta.titleKey)}</AppText>
          <AppText tone="secondary">{t(meta.bodyKey)}</AppText>
        </Stack>
      </Stack>
    </Card>
  );
}

function toggleTracker(
  current: readonly QuickLogTrackerId[],
  trackerId: QuickLogTrackerId,
  callbacks: Readonly<{
    onLimit: () => void;
    onMinimum: () => void;
    onValid: (next: QuickLogTrackerId[]) => void;
  }>,
): QuickLogTrackerId[] {
  if (current.includes(trackerId)) {
    if (current.length === 1) {
      callbacks.onMinimum();
      return [...current];
    }

    const next = current.filter((selected) => selected !== trackerId);
    callbacks.onValid(next);
    return next;
  }

  const candidate = [...current, trackerId];
  const result = selectedQuickLogTrackerIdsSchema.safeParse(candidate);

  if (!result.success) {
    callbacks.onLimit();
    return [...current];
  }

  callbacks.onValid(result.data);
  return result.data;
}

function getSelectionCapWarningKey(
  trackerIds: readonly QuickLogTrackerId[],
): 'more.quick-trackers.max-reached-hint' | null {
  return trackerIds.length >= MAX_VISIBLE_QUICK_LOG_TRACKERS
    ? 'more.quick-trackers.max-reached-hint'
    : null;
}

function areTrackerSelectionsEqual(
  left: readonly QuickLogTrackerId[],
  right: readonly QuickLogTrackerId[],
): boolean {
  return left.length === right.length && left.every((trackerId, index) => trackerId === right[index]);
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object'
    && value !== null
    && 'then' in value
    && typeof value.then === 'function'
  );
}

const styles = StyleSheet.create({
  footerHint: {
    paddingLeft: tokens.space[1],
  },
  leading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  sectionTitle: {
    textTransform: 'uppercase',
  },
});

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
