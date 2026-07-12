import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { reminderScheduleDraftSchema } from '@/contracts/reminders';
import type { Reminder } from '@/contracts/supabase';
import {
  AppIcon,
  type AppIconName,
  AppText,
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
  SwipeToDelete,
  type StatusPillTone,
  Toggle,
} from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { type I18nKey, useAppTranslation } from '@/lib/i18n';
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
  pendingToggleReminderId?: string;
  reminders?: readonly Reminder[];
  reviewState?: ReminderHubState;
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

  if (remindersQuery.isError || toggleReminderMutation.isError || deleteReminderMutation.isError) {
    return (
      <RemindersHubScreen
        onAddReminder={onAddReminder}
        onBack={onBack}
        reviewState="error"
      />
    );
  }

  return (
    <RemindersHubScreen
      onAddReminder={onAddReminder}
      onBack={onBack}
      onDeleteReminder={canManage ? (reminderId) => {
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
        toggleReminderMutation.mutate({
          enabled,
          householdId: careContext.householdId,
          puppyId: careContext.puppyId,
          reminderId,
          todayDate: careContext.todayDate,
        });
      } : undefined}
      pendingDeleteReminderId={deleteReminderMutation.isPending
        ? deleteReminderMutation.variables?.reminderId
        : undefined}
      pendingToggleReminderId={toggleReminderMutation.isPending
        ? toggleReminderMutation.variables?.reminderId
        : undefined}
      reminders={remindersQuery.data ?? []}
    />
  );
}

export function RemindersHubScreen({
  onAddReminder,
  onBack,
  onDeleteReminder,
  onEditReminder,
  onToggleReminder,
  pendingDeleteReminderId,
  pendingToggleReminderId,
  reminders = [],
  reviewState,
}: RemindersHubScreenProps) {
  const { t } = useAppTranslation();
  const [segment, setSegment] = useState<ReminderSegment>('active');
  const visibleRows = reminders.filter((reminder) => reminder.enabled === (segment === 'active'));
  const groupedRows = groupReminders(visibleRows);
  const visibleState = reviewState ?? (visibleRows.length === 0 ? 'empty' : undefined);

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

      <AppText style={styles.pageTitle} variant="title1">
        {t('reminders.screen-title')}
      </AppText>

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
                      onDeleteReminder={onDeleteReminder}
                      onEditReminder={onEditReminder}
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

      <AppText tone="secondary" variant="footnote">
        {t('reminders.footer-quiet-hours')}
      </AppText>
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
  onDeleteReminder,
  onEditReminder,
  onToggleReminder,
  pending,
  reminder,
  section,
}: Readonly<{
  onDeleteReminder?: (reminderId: string) => void;
  onEditReminder?: (reminderId: string) => void;
  onToggleReminder?: (reminderId: string, enabled: boolean) => void;
  pending: boolean;
  reminder: Reminder;
  section: ReminderSection;
}>) {
  const { t } = useAppTranslation();
  const canonicalResult = reminderScheduleDraftSchema.safeParse({
    trackerId: reminder.reminder_type,
    rule: reminder.schedule_rule,
  });
  const isCanonical = canonicalResult.success;
  const title = canonicalResult.success
    ? canonicalResult.data.rule.title ?? t(trackerLabelKeys[canonicalResult.data.trackerId])
    : reminder.reminder_type;
  const subtitle = canonicalResult.success
    ? formatCanonicalSubtitle(canonicalResult.data.rule, t)
    : t('reminders.form.legacy-unsupported');
  const row = (
    <ListRow
      accessibilityActions={onDeleteReminder && !pending ? [{ name: 'delete' }] : undefined}
      accessibilityLabel={`${title}. ${subtitle}`}
      leading={<AppIcon color={tokens.color.text.secondary} name={sectionIcon[section]} />}
      onPress={isCanonical && onEditReminder ? () => onEditReminder(reminder.id) : undefined}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'delete' && !pending) {
          onDeleteReminder?.(reminder.id);
        }
      }}
      subtitle={subtitle}
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
          <Toggle
            accessibilityLabel={title}
            disabled={pending || onToggleReminder === undefined}
            onValueChange={(enabled) => {
              onToggleReminder?.(reminder.id, enabled);
            }}
            testID={`reminder-row-toggle-${reminder.id}`}
            value={reminder.enabled}
          />
        </Stack>
      )}
      variant="settings"
    />
  );

  if (!onDeleteReminder || pending) {
    return row;
  }

  return (
    <SwipeToDelete
      deleteLabel={t('common.delete')}
      onDelete={() => {
        onDeleteReminder(reminder.id);
      }}
      testID={`reminder-row-delete-${reminder.id}`}>
      {row}
    </SwipeToDelete>
  );
}

function formatCanonicalSubtitle(
  rule: ReturnType<typeof reminderScheduleDraftSchema.parse>['rule'],
  t: ReturnType<typeof useAppTranslation>['t'],
): string {
  if (rule.repeat === 'daily') {
    return t('reminders.row-subtitle-daily-template', { time: rule.time });
  }
  if (rule.repeat === 'weekdays') {
    return t('reminders.row-subtitle-weekdays-template', { time: rule.time });
  }
  if (rule.repeat === 'never') {
    return t('reminders.row-subtitle-once-template', { date: rule.date ?? '', time: rule.time });
  }

  const days = rule.repeat.days
    .map((day) => t(weekdayLabelKeys[day - 1]).slice(0, 2))
    .join(', ');
  return t('reminders.row-subtitle-custom-template', { days, time: rule.time });
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
  content: {
    paddingBottom: tokens.layout.tabBarHeight + tokens.space[6],
  },
  pageTitle: {
    marginTop: tokens.space[1],
  },
});
