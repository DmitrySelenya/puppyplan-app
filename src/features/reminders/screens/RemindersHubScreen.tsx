import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { expandOccurrencesForDay, reminderScheduleDraftSchema } from '@/contracts/reminders';
import type { Reminder } from '@/contracts/supabase';
import {
  AppIcon,
  type AppIconName,
  AppText,
  Button,
  Card,
  IconButton,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  Stack,
  StatusPill,
  RoutineLifecycleMenu,
  SwipeToDelete,
  type StatusPillTone,
  Toggle,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { useSnackbar } from '@/design/primitives/Snackbar';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';
import { formatCalendarDate } from '@/lib/i18n/format-date';
import { useActiveCareContext } from '@/lib/query/active-care-context';
import {
  useDeleteReminderMutation,
  useRemindersQuery,
  useToggleReminderEnabledMutation,
} from '@/lib/query/reminders';

type ReminderSegment = 'active' | 'off';
export type ReminderHubState =
  | 'empty'
  | 'error'
  | 'loading'
  | 'offline-read'
  | 'pending-write';
type ReminderSection = 'feeding' | 'health' | 'sitter' | 'other';
type OneOffScheduleProjection = 'not-applicable' | 'future' | 'expired' | 'unavailable';
type LifecycleSelection = Readonly<{
  canEdit: boolean;
  initialView: 'actions' | 'delete-confirmation';
  reminder: Reminder;
  scopeKey: string;
  title: string;
}>;
type LifecycleSelectionRequest = Omit<LifecycleSelection, 'scopeKey'>;

const trackerLabelKeys = {
  potty: 'quick-log.details.tabs.potty',
  feeding: 'quick-log.details.tabs.feeding',
  sleep: 'quick-log.details.tabs.sleep',
  walk: 'quick-log.details.tabs.walk',
  zoomies: 'quick-log.details.tabs.zoomies',
  training: 'quick-log.details.tabs.training',
  observation: 'quick-log.details.tabs.observation',
} as const;
const weekdayLabelKeys = [
  'reminders.form.routine.weekdays.0',
  'reminders.form.routine.weekdays.1',
  'reminders.form.routine.weekdays.2',
  'reminders.form.routine.weekdays.3',
  'reminders.form.routine.weekdays.4',
  'reminders.form.routine.weekdays.5',
  'reminders.form.routine.weekdays.6',
] as const;

type ReminderStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
  liveRegion?: 'polite';
  role?: 'alert';
  statusKey: I18nKey;
  titleKey: I18nKey;
  tone: StatusPillTone;
}>;

const reminderStateMeta: Record<ReminderHubState, ReminderStateMeta> = {
  empty: {
    bodyKey: 'reminders.states.empty.body',
    icon: 'bell',
    statusKey: 'reminders.states.empty.status',
    titleKey: 'reminders.states.empty.title',
    tone: 'template',
  },
  error: {
    bodyKey: 'reminders.states.error.body',
    icon: 'warningTriangle',
    role: 'alert',
    statusKey: 'reminders.states.error.status',
    titleKey: 'reminders.states.error.title',
    tone: 'failed',
  },
  loading: {
    bodyKey: 'reminders.states.loading.body',
    icon: 'bell',
    statusKey: 'reminders.states.loading.status',
    titleKey: 'reminders.states.loading.title',
    tone: 'pending',
  },
  'offline-read': {
    bodyKey: 'reminders.states.offline-read.body',
    icon: 'bell',
    statusKey: 'reminders.states.offline-read.status',
    titleKey: 'reminders.states.offline-read.title',
    tone: 'template',
  },
  'pending-write': {
    bodyKey: 'reminders.states.pending-write.body',
    icon: 'bell',
    liveRegion: 'polite',
    statusKey: 'reminders.states.pending-write.status',
    titleKey: 'reminders.states.pending-write.title',
    tone: 'pending',
  },
};

const sectionOrder: readonly ReminderSection[] = ['feeding', 'health', 'sitter', 'other'];
const sectionIcon: Record<ReminderSection, AppIconName> = {
  feeding: 'bowl',
  health: 'stethoscope',
  other: 'bell',
  sitter: 'personCluster',
};

export type RemindersHubScreenProps = Readonly<{
  onAddReminder: () => void;
  onBack: () => void;
  onDeleteReminder?: (reminderId: string) => void;
  onEditReminder?: (reminderId: string) => void;
  onToggleReminder?: (reminderId: string, enabled: boolean) => void;
  pendingDeleteReminderId?: string;
  mutationErrorReminderId?: string;
  onClearMutationError?: () => void;
  pendingToggleReminderId?: string;
  reminders?: readonly Reminder[];
  reviewState?: ReminderHubState;
  lifecycleScopeKey?: string;
}>;

export function ConnectedRemindersHubScreen({
  onAddReminder,
  onBack,
  onEditReminder,
}: Readonly<{
  onAddReminder: () => void;
  onBack: () => void;
  onEditReminder?: (reminderId: string) => void;
}>) {
  const activeCare = useActiveCareContext();
  const { t } = useAppTranslation();
  const { showSnackbar } = useSnackbar();
  const remindersQuery = useRemindersQuery(
    activeCare.careContext?.householdId,
    activeCare.careContext?.puppyId,
  );
  const toggleReminderMutation = useToggleReminderEnabledMutation();
  const deleteReminderMutation = useDeleteReminderMutation();

  if (activeCare.status === 'loading') {
    return (
      <RemindersHubScreen
        onAddReminder={onAddReminder}
        onBack={onBack}
        reviewState="loading"
      />
    );
  }

  if (activeCare.status === 'error' || activeCare.careContext === null) {
    return (
      <RemindersHubScreen
        onAddReminder={onAddReminder}
        onBack={onBack}
        reviewState="error"
      />
    );
  }

  const careContext = activeCare.careContext;
  const canManage = careContext.householdRole !== 'viewer';

  if (remindersQuery.isLoading) {
    return (
      <RemindersHubScreen
        onAddReminder={onAddReminder}
        onBack={onBack}
        reviewState="loading"
      />
    );
  }

  if (remindersQuery.isError) {
    return (
      <RemindersHubScreen
        onAddReminder={onAddReminder}
        onBack={onBack}
        reviewState="error"
      />
    );
  }

  // A failed lifecycle mutation stays a row-level recoverable error; durable rows keep rendering.
  const mutationErrorReminderId = deleteReminderMutation.isError
    ? deleteReminderMutation.variables?.reminderId
    : toggleReminderMutation.isError
      ? toggleReminderMutation.variables?.reminderId
      : undefined;

  return (
    <RemindersHubScreen
      onAddReminder={onAddReminder}
      onBack={onBack}
      onDeleteReminder={canManage ? (reminderId) => {
        if (toggleReminderMutation.isError) {
          toggleReminderMutation.reset();
        }
        deleteReminderMutation.mutate({
          deletedAt: new Date().toISOString(),
          householdId: careContext.householdId,
          puppyId: careContext.puppyId,
          reminderId,
          todayDate: careContext.todayDate,
        });
      } : undefined}
      onEditReminder={canManage ? onEditReminder : undefined}
      onToggleReminder={canManage ? (reminderId, enabled) => {
        if (deleteReminderMutation.isError) {
          deleteReminderMutation.reset();
        }
        const variables = {
          enabled,
          householdId: careContext.householdId,
          puppyId: careContext.puppyId,
          reminderId,
          todayDate: careContext.todayDate,
        };

        if (enabled) {
          toggleReminderMutation.mutate(variables);
          return;
        }

        toggleReminderMutation.mutate(variables, {
          onSuccess: () => {
            const message = t('reminders.lifecycle.paused-snackbar');
            showSnackbar({
              accessibilityLabel: message,
              id: 'reminder-lifecycle-paused',
              message,
              tone: 'info',
            });
          },
        });
      } : undefined}
      pendingDeleteReminderId={deleteReminderMutation.isPending
        ? deleteReminderMutation.variables?.reminderId
        : undefined}
      pendingToggleReminderId={toggleReminderMutation.isPending
        ? toggleReminderMutation.variables?.reminderId
        : undefined}
      mutationErrorReminderId={mutationErrorReminderId}
      onClearMutationError={() => {
        deleteReminderMutation.reset();
        toggleReminderMutation.reset();
      }}
      reminders={remindersQuery.data ?? []}
      lifecycleScopeKey={[
        careContext.userId,
        careContext.householdId,
        careContext.puppyId,
        careContext.householdRole,
      ].join(':')}
    />
  );
}

export function RemindersHubScreen({
  mutationErrorReminderId,
  onAddReminder,
  onBack,
  onClearMutationError,
  onDeleteReminder,
  onEditReminder,
  onToggleReminder,
  pendingDeleteReminderId,
  pendingToggleReminderId,
  reminders = [],
  reviewState,
  lifecycleScopeKey = 'static',
}: RemindersHubScreenProps) {
  const { t } = useAppTranslation();
  const [segment, setSegment] = useState<ReminderSegment>('active');
  const [lifecycleSelection, setLifecycleSelection] = useState<LifecycleSelection | null>(null);
  const lifecycleActionsAvailable = onDeleteReminder !== undefined
    && onEditReminder !== undefined
    && onToggleReminder !== undefined;
  const visibleRows = reminders.filter((reminder) => reminder.enabled === (segment === 'active'));
  const groupedRows = groupReminders(visibleRows);
  const visibleState = reviewState ?? (visibleRows.length === 0 ? 'empty' : undefined);

  useEffect(() => {
    setLifecycleSelection(null);
  }, [lifecycleActionsAvailable, lifecycleScopeKey]);

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader
        backLabel={t('more.screen-title')}
        onBack={onBack}
        title={t('reminders.screen-title')}
        trailing={(
          <IconButton
            accessibilityLabel={t('reminders.actions.add')}
            icon={<AppIcon color={tokens.color.text.link} name="plus" />}
            onPress={onAddReminder}
          />
        )}
      />

      <SegmentedControl<ReminderSegment>
        accessibilityLabel={t('reminders.segments-a11y')}
        onValueChange={setSegment}
        options={[
          { label: t('reminders.segments.0'), value: 'active' },
          { label: t('reminders.segments.1'), value: 'off' },
        ]}
        value={segment}
      />

      {visibleState ? <RemindersHubStatePreview state={visibleState} /> : null}

      {visibleState === undefined ? (
        <Stack gap="lg">
          {sectionOrder.map((section) => {
            const rows = groupedRows[section];

            if (rows.length === 0) {
              return null;
            }

            return (
              <Stack gap="xs" key={section}>
                <SectionHeader title={t(getSectionTitleKey(section))} />
                <ListGroup>
                  {rows.map((reminder) => (
                    <ReminderRow
                      key={reminder.id}
                      mutationError={mutationErrorReminderId === reminder.id}
                      onOpenLifecycle={lifecycleActionsAvailable
                        ? (selection) => {
                          onClearMutationError?.();
                          setLifecycleSelection({ ...selection, scopeKey: lifecycleScopeKey });
                        }
                        : undefined}
                      onToggleReminder={onToggleReminder}
                      pending={pendingToggleReminderId === reminder.id
                        || pendingDeleteReminderId === reminder.id}
                      reminder={reminder}
                      section={section}
                    />
                  ))}
                </ListGroup>
              </Stack>
            );
          })}
        </Stack>
      ) : null}

      {segment === 'off' && visibleState === undefined ? (
        <AppText tone="secondary" variant="footnote">
          {t('reminders.lifecycle.paused-diary-hint')}
        </AppText>
      ) : null}

      <AppText tone="secondary" variant="footnote">
        {t('reminders.footer-quiet-hours')}
      </AppText>

      {lifecycleSelection !== null
        && lifecycleSelection.scopeKey === lifecycleScopeKey
        && onDeleteReminder !== undefined
        && onEditReminder !== undefined
        && onToggleReminder !== undefined ? (
          <RoutineLifecycleMenu
            enabled={lifecycleSelection.reminder.enabled}
            initialView={lifecycleSelection.initialView}
            onClose={() => {
              setLifecycleSelection(null);
            }}
            onDelete={() => {
              onDeleteReminder(lifecycleSelection.reminder.id);
            }}
            onEdit={lifecycleSelection.canEdit ? () => {
              onEditReminder(lifecycleSelection.reminder.id);
            } : undefined}
            onToggleEnabled={(enabled) => {
              onToggleReminder(lifecycleSelection.reminder.id, enabled);
            }}
            pending={pendingDeleteReminderId === lifecycleSelection.reminder.id
              || pendingToggleReminderId === lifecycleSelection.reminder.id}
            title={lifecycleSelection.title}
          />
        ) : null}
    </Screen>
  );
}

export function RemindersHubStatePreview({ state }: Readonly<{ state: ReminderHubState }>) {
  const { t } = useAppTranslation();
  const meta = reminderStateMeta[state];
  const status = t(meta.statusKey);
  const title = t(meta.titleKey);
  const body = t(meta.bodyKey);

  return (
    <Card
      accessibilityLabel={[status, title, body].join('. ')}
      accessibilityLiveRegion={meta.liveRegion ?? (state === 'loading' ? 'polite' : undefined)}
      accessibilityRole={meta.role}
      testID={`reminders-hub-state-${state}`}
      variant={state === 'offline-read' || state === 'empty' ? 'mutedTemplate' : 'resting'}>
      <Stack gap="sm">
        <StatusPill
          accessibilityLabel={status}
          icon={(
            <AppIcon
              color={tokens.color.text.secondary}
              name={meta.icon}
              size={14}
            />
          )}
          label={status}
          tone={meta.tone}
        />
        <AppText variant="bodyEmph">{title}</AppText>
        <AppText tone="secondary" variant="body">
          {body}
        </AppText>
      </Stack>
    </Card>
  );
}

function ReminderRow({
  mutationError,
  onOpenLifecycle,
  onToggleReminder,
  pending,
  reminder,
  section,
}: Readonly<{
  mutationError: boolean;
  onOpenLifecycle?: (selection: LifecycleSelectionRequest) => void;
  onToggleReminder?: (reminderId: string, enabled: boolean) => void;
  pending: boolean;
  reminder: Reminder;
  section: ReminderSection;
}>) {
  const { locale, t } = useAppTranslation();
  const canonicalResult = reminderScheduleDraftSchema.safeParse({
    trackerId: reminder.reminder_type,
    rule: reminder.schedule_rule,
  });
  const title = canonicalResult.success
    ? canonicalResult.data.rule.title ?? t(trackerLabelKeys[canonicalResult.data.trackerId])
    : reminder.reminder_type;
  const scheduleProjection: OneOffScheduleProjection = canonicalResult.success
    ? projectCanonicalOneOffSchedule(reminder, canonicalResult.data)
    : 'not-applicable';
  const canonicalSubtitle = canonicalResult.success
    ? formatCanonicalSubtitle(canonicalResult.data.rule, locale, t)
    : t('reminders.form.legacy-unsupported');
  // The marker leads so the two-line subtitle clamp truncates the schedule tail, never the state.
  const subtitle = scheduleProjection === 'unavailable'
    ? t('reminders.row-schedule-unavailable')
    : scheduleProjection === 'expired'
      ? `${t('reminders.row-expired')} · ${canonicalSubtitle}`
      : canonicalSubtitle;
  const quiet = !reminder.enabled
    || scheduleProjection === 'expired'
    || scheduleProjection === 'unavailable';
  const openLifecycle = (initialView: LifecycleSelectionRequest['initialView'] = 'actions') => {
    onOpenLifecycle?.({ canEdit: canonicalResult.success, initialView, reminder, title });
  };
  const row = (
    <ListRow
      leading={(
        <View
          style={[styles.reminderIcon, quiet
            ? styles.pausedReminderIcon
            : styles.activeReminderIcon]}
          testID={`reminder-row-icon-${reminder.id}`}>
          <AppIcon
            color={quiet ? tokens.color.text.secondary : tokens.color.primary[700]}
            name={sectionIcon[section]}
            size={20}
          />
        </View>
      )}
      subtitle={reminder.enabled ? subtitle : t('reminders.lifecycle.paused-subtitle')}
      testID={`reminder-row-${reminder.id}`}
      title={title}
      titleNumberOfLines={2}
      trailing={(
        <Stack align="center" direction="horizontal" gap="xs">
          {pending ? (
            <Stack testID={`reminder-row-pending-${reminder.id}`}>
              <StatusPill
                accessibilityLabel={t('reminders.row-pending')}
                icon={<AppIcon name="bell" size={14} />}
                label={t('reminders.row-pending')}
                tone="pending"
              />
            </Stack>
          ) : null}
          {reminder.enabled ? (
            <Toggle
              accessibilityLabel={title}
              disabled={pending || onToggleReminder === undefined}
              onValueChange={(enabled) => {
                onToggleReminder?.(reminder.id, enabled);
              }}
              testID={`reminder-row-toggle-${reminder.id}`}
              value
            />
          ) : null}
          {!reminder.enabled ? (
            <Button
              disabled={pending || onToggleReminder === undefined}
              label={t('reminders.lifecycle.resume')}
              onPress={() => {
                onToggleReminder?.(reminder.id, true);
              }}
              style={styles.resumeButton}
              variant="secondary"
            />
          ) : null}
          {onOpenLifecycle !== undefined ? (
            <IconButton
              accessibilityLabel={t('reminders.lifecycle.open-actions-template', { title })}
              disabled={pending}
              icon={<AppIcon color={tokens.color.text.secondary} name="more" size={22} />}
              onPress={() => {
                openLifecycle();
              }}
              style={styles.lifecycleOverflow}
            />
          ) : null}
        </Stack>
      )}
      variant="settings"
    />
  );

  const content = !onOpenLifecycle || pending ? row : (
    <SwipeToDelete
      deleteLabel={t('common.delete')}
      onDelete={() => {
        openLifecycle('delete-confirmation');
      }}
      testID={`reminder-row-delete-${reminder.id}`}>
      {row}
    </SwipeToDelete>
  );

  if (!mutationError) {
    return content;
  }

  return (
    <Stack gap="xs">
      {content}
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        testID={`hub-reminder-lifecycle-error-${reminder.id}`}>
        <Card>
          <Stack gap="xs">
            <AppText variant="bodyEmph">
              {t('reminders.lifecycle.mutation-error-title')}
            </AppText>
            <AppText tone="secondary">
              {t('reminders.lifecycle.mutation-error-body')}
            </AppText>
          </Stack>
        </Card>
      </View>
    </Stack>
  );
}

function formatCanonicalSubtitle(
  rule: ReturnType<typeof reminderScheduleDraftSchema.parse>['rule'],
  locale: ReturnType<typeof useAppTranslation>['locale'],
  t: ReturnType<typeof useAppTranslation>['t'],
): string {
  if (rule.repeat === 'daily') {
    return t('reminders.row-subtitle-daily-template', { time: rule.time });
  }
  if (rule.repeat === 'weekdays') {
    return t('reminders.row-subtitle-weekdays-template', { time: rule.time });
  }
  if (rule.repeat === 'never') {
    return t('reminders.row-subtitle-once-template', {
      date: formatCalendarDate(rule.date ?? '', locale),
      time: rule.time,
    });
  }

  const days = rule.repeat.days
    .map((day) => t(weekdayLabelKeys[day - 1]).slice(0, 2))
    .join(', ');
  return t('reminders.row-subtitle-custom-template', { days, time: rule.time });
}

function projectCanonicalOneOffSchedule(
  reminder: Reminder,
  schedule: ReturnType<typeof reminderScheduleDraftSchema.parse>,
): OneOffScheduleProjection {
  if (!reminder.enabled || schedule.rule.repeat !== 'never' || schedule.rule.date === undefined) {
    return 'not-applicable';
  }

  if (!isValidIanaTimeZone(reminder.timezone)) {
    return 'unavailable';
  }

  const [occurrence] = expandOccurrencesForDay({
    day: schedule.rule.date,
    reminders: [{
      enabled: true,
      id: reminder.id,
      rule: schedule.rule,
      trackerId: schedule.trackerId,
    }],
    timeZone: reminder.timezone,
  });

  if (occurrence === undefined) {
    return 'unavailable';
  }

  return Date.parse(occurrence.scheduledFor) <= Date.now() ? 'expired' : 'future';
}

function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return true;
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }

    return false;
  }
}

function groupReminders(reminders: readonly Reminder[]): Record<ReminderSection, Reminder[]> {
  return reminders.reduce<Record<ReminderSection, Reminder[]>>((groups, reminder) => {
    groups[getReminderSection(reminder)].push(reminder);
    return groups;
  }, {
    feeding: [],
    health: [],
    other: [],
    sitter: [],
  });
}

function getReminderSection(reminder: Reminder): ReminderSection {
  const label = reminder.reminder_type.toLowerCase();

  if (reminder.trusted_sitter_visible || label.includes('sitter') || label.includes('checklist')) {
    return 'sitter';
  }

  if (
    label.includes('dhpp')
    || label.includes('health')
    || label.includes('vet')
    || label.includes('vaccine')
    || label.includes('booster')
  ) {
    return 'health';
  }

  if (label.includes('feed') || label.includes('meal') || label.includes('bowl')) {
    return 'feeding';
  }

  return 'other';
}

function getSectionTitleKey(section: ReminderSection): I18nKey {
  return `reminders.sections.${section}`;
}

const styles = StyleSheet.create({
  activeReminderIcon: {
    backgroundColor: tokens.color.primary[50],
  },
  content: {
    paddingBottom: tokens.layout.tabBarHeight + tokens.space[6],
  },
  lifecycleOverflow: {
    height: tokens.layout.tapTargetMin,
    width: tokens.layout.tapTargetMin,
  },
  pausedReminderIcon: {
    backgroundColor: tokens.color.surface.sunken,
  },
  reminderIcon: {
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  resumeButton: {
    minHeight: tokens.layout.tapTargetMin,
  },
});
