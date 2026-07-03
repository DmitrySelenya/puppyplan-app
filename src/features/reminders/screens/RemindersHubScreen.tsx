import { useState } from 'react';
import { StyleSheet } from 'react-native';

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
type ReminderHubState = 'empty' | 'error' | 'loading';
type ReminderSection = 'feeding' | 'health' | 'sitter' | 'other';

type ReminderStateMeta = Readonly<{
  bodyKey: I18nKey;
  icon: AppIconName;
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
  onToggleReminder?: (reminderId: string, enabled: boolean) => void;
  pendingDeleteReminderId?: string;
  pendingToggleReminderId?: string;
  reminders?: readonly Reminder[];
  reviewState?: ReminderHubState;
}>;

export function ConnectedRemindersHubScreen({
  onAddReminder,
  onBack,
}: Readonly<{
  onAddReminder: () => void;
  onBack: () => void;
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
      onDeleteReminder={(reminderId) => {
        deleteReminderMutation.mutate({
          deletedAt: new Date().toISOString(),
          householdId: careContext.householdId,
          puppyId: careContext.puppyId,
          reminderId,
          todayDate: careContext.todayDate,
        });
      }}
      onToggleReminder={(reminderId, enabled) => {
        toggleReminderMutation.mutate({
          enabled,
          householdId: careContext.householdId,
          puppyId: careContext.puppyId,
          reminderId,
          todayDate: careContext.todayDate,
        });
      }}
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

      {visibleState ? <RemindersHubStateCard state={visibleState} /> : null}

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

function RemindersHubStateCard({ state }: Readonly<{ state: ReminderHubState }>) {
  const { t } = useAppTranslation();
  const meta = reminderStateMeta[state];

  return (
    <Card
      accessibilityLabel={t(meta.titleKey)}
      accessibilityLiveRegion={state === 'loading' ? 'polite' : undefined}
      accessibilityRole={meta.role}
      variant="mutedTemplate">
      <Stack gap="sm">
        <StatusPill
          accessibilityLabel={t(meta.statusKey)}
          icon={<AppIcon name={meta.icon} size={14} />}
          label={t(meta.statusKey)}
          tone={meta.tone}
        />
        <AppText variant="bodyEmph">{t(meta.titleKey)}</AppText>
        <AppText tone="secondary" variant="body">
          {t(meta.bodyKey)}
        </AppText>
      </Stack>
    </Card>
  );
}

function ReminderRow({
  onDeleteReminder,
  onToggleReminder,
  pending,
  reminder,
  section,
}: Readonly<{
  onDeleteReminder?: (reminderId: string) => void;
  onToggleReminder?: (reminderId: string, enabled: boolean) => void;
  pending: boolean;
  reminder: Reminder;
  section: ReminderSection;
}>) {
  const { t } = useAppTranslation();
  const subtitle = t('reminders.row-subtitle-daily-template', {
    time: getReminderTime(reminder),
  });
  const row = (
    <ListRow
      accessibilityActions={onDeleteReminder && !pending ? [{ name: 'delete' }] : undefined}
      accessibilityLabel={`${reminder.reminder_type}. ${subtitle}`}
      leading={<AppIcon color={tokens.color.text.secondary} name={sectionIcon[section]} />}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'delete' && !pending) {
          onDeleteReminder?.(reminder.id);
        }
      }}
      subtitle={subtitle}
      title={reminder.reminder_type}
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
            accessibilityLabel={reminder.reminder_type}
            disabled={pending}
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

function getReminderTime(reminder: Reminder): string {
  const time = reminder.schedule_rule.time;
  return typeof time === 'string' ? time : '7:30';
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
