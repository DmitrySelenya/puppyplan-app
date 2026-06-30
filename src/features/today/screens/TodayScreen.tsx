import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { shouldShowQuickLogFailedBanner } from '@/contracts/business-rules';
import {
  buildTodayPlan,
  type TodayPlanInput,
} from '@/contracts/today';
import {
  eventPayloadSchemas,
  type EventType,
} from '@/contracts/supabase';
import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { IconButton } from '@/design/primitives/IconButton';
import { PuppyHeader } from '@/design/primitives/PuppyHeader';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';
import {
  calendarDateToUtc,
  getLocalCalendarDate,
  shiftCalendarDate,
} from '@/lib/i18n/format-date';
import {
  createQuickLogDeleteRequest,
  createQuickLogEditRequest,
  createQuickLogEventView,
  createQuickLogUndoRequest,
  type QuickLogEventActionHandlers,
  type QuickLogEventView,
  type QuickLogSurfaceCareContext,
} from '@/lib/query/quick-log-event-view';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import { useQuickLogTimelineRows } from '@/lib/query/useQuickLogTimelineRows';

import {
  TodayPlanCards,
  TodayStatusCard,
  type TodayStatusState,
} from '../components/TodayCards';

export type TodayScreenStateOverride =
  | 'all-done'
  | 'cold-start'
  | 'empty-history'
  | 'offline-read'
  | 'pending-write';

export type TodayScreenProps = Readonly<{
  actions?: QuickLogEventActionHandlers;
  careContext?: QuickLogSurfaceCareContext | null;
  openOnboarding?: () => void;
  openQuickLog?: () => void;
  openTimeline: () => void;
  puppyAgeLabel?: string;
  puppyName?: string;
  screenState?: TodayScreenStateOverride;
  todayPlanInput?: Partial<TodayPlanInput>;
}>;

const emptyActions: QuickLogEventActionHandlers = {};

export function TodayScreen({
  actions = emptyActions,
  careContext = null,
  openOnboarding,
  openQuickLog,
  openTimeline,
  puppyAgeLabel,
  puppyName,
  screenState,
  todayPlanInput,
}: TodayScreenProps) {
  const { locale, t } = useAppTranslation();
  const timelineRows = useQuickLogTimelineRows(
    careContext,
    careContext === null
      ? undefined
      : {
        from: careContext.todayDate,
        to: careContext.todayDate,
      },
  );
  const rows = timelineRows.rows;
  const todayPlanSourceInput = useMemo(() => careContext === null
    ? null
    : createTodayPlanInput({
      careContext,
      overrides: todayPlanInput,
      rows,
    }), [careContext, rows, todayPlanInput]);
  const todayPlan = useMemo(
    () => todayPlanSourceInput === null ? null : buildTodayPlan(todayPlanSourceInput),
    [todayPlanSourceInput],
  );

  if (careContext === null) {
    return (
      <Screen>
        <PuppyHeader ageLabel={puppyAgeLabel} name={puppyName} />
        <TodayTitle todayDate={undefined} />
        <TodayStatusCard state="unavailable" />
        <Button
          label={t('today.quick-log.setup-entry')}
          onPress={openOnboarding ?? openTimeline}
          variant="primary"
        />
      </Screen>
    );
  }

  const eventViews = rows.flatMap((row) => {
    const event = createQuickLogEventView(row, {
      locale,
      t,
      todayDate: careContext.todayDate,
    });

    return event === null ? [] : [event];
  });
  const todayStatus = getTodayStatusState({
    careContext,
    eventViews,
    rows,
    screenState,
    timelineStatus: timelineRows.status,
  });
  const showTodayPlan = todayPlan !== null
    && screenState !== 'cold-start'
    && screenState !== 'empty-history'
    && screenState !== 'pending-write'
    && !(timelineRows.status === 'loading' && rows.length === 0);
  const showQuickLogSection = eventViews.length > 0
    || timelineRows.status === 'error'
    || hasPendingLocalRows(rows)
    || shouldShowQuickLogFailedBanner(rows);

  return (
    <Screen contentStyle={styles.content}>
      <PuppyHeader ageLabel={puppyAgeLabel} name={puppyName} />
      <TodayTitle todayDate={careContext.todayDate} />
      <DiaryWeekStrip
        selectedDate={todayPlanSourceInput?.todayDate ?? careContext.todayDate}
        todayDate={careContext.todayDate}
      />
      {todayStatus === null || (todayStatus === 'empty' && todayPlan !== null)
        ? null
        : <TodayStatusCard state={todayStatus} />}
      {showTodayPlan ? (
        <TodayPlanCards
          onHeroPrimaryAction={openQuickLog}
          plan={todayPlan}
        />
      ) : null}
      {hasPendingLocalRows(rows) ? <TodayStatusCard state="pending-write" /> : null}
      {shouldShowQuickLogFailedBanner(rows) ? (
        <Card
          accessibilityLabel={t('quick-log.failed.persistent-banner')}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          <AppText variant="headline">{t('quick-log.failed.persistent-banner')}</AppText>
        </Card>
      ) : null}
      {showQuickLogSection ? (
      <Stack gap="sm">
        <Stack
          align="flex-start"
          direction="horizontal"
          gap="sm"
          justify="space-between"
          wrap>
          <AppText
            style={styles.sectionTitle}
            variant="headline">
            {t('today.history.section-title')}
          </AppText>
          <Button
            label={t('today.history.open-action')}
            labelMaxFontSizeMultiplier={2}
            labelVariant="label"
            onPress={openTimeline}
            style={styles.timelineEntry}
            variant="tertiary"
          />
        </Stack>
        {eventViews.length > 0 ? (
          eventViews.map((event) => (
            <TodayQuickLogEventRow
              actions={actions}
              event={event}
              key={event.clientEventId}
            />
          ))
        ) : timelineRows.status === 'error' ? (
          <Card
            accessibilityLabel={t('errors.load-failed')}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert">
            <AppText>{t('errors.load-failed')}</AppText>
          </Card>
        ) : (
          <Card>
            <Stack gap="sm">
              <AppText variant="bodyEmph">{t('today.quick-log.empty.title')}</AppText>
              <AppText tone="secondary">{t('today.quick-log.empty.body')}</AppText>
            </Stack>
          </Card>
        )}
      </Stack>
      ) : null}
    </Screen>
  );
}

function DiaryWeekStrip({
  selectedDate,
  todayDate,
}: Readonly<{
  selectedDate: string;
  todayDate: string;
}>) {
  const { locale, t } = useAppTranslation();
  const days = useMemo(() => createDiaryWeekDays({
    locale,
    selectedDate,
    t,
    todayDate,
  }), [locale, selectedDate, t, todayDate]);

  return (
    <View
      accessibilityLabel={t('today.week-strip.label')}
      accessible
      style={styles.weekStrip}
      testID="today-week-strip">
      {days.map((day) => (
        <Touchable
          accessibilityLabel={day.accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ selected: day.isSelected }}
          key={day.date}
          onPress={() => undefined}
          pressedStyle={styles.weekDayPressed}
          style={[
            styles.weekDay,
            day.isToday ? styles.weekDayToday : null,
            day.isSelected ? styles.weekDaySelected : null,
          ]}
          testID="today-week-day">
          <AppText
            maxFontSizeMultiplier={2}
            style={day.isSelected ? styles.weekDayTextSelected : styles.weekDayText}
            variant="caption">
            {day.shortWeekday}
          </AppText>
          <AppText
            maxFontSizeMultiplier={2}
            numeric
            style={[
              styles.weekDayNumber,
              day.isSelected ? styles.weekDayTextSelected : styles.weekDayText,
            ]}
            variant="bodyEmph">
            {day.dayNumber}
          </AppText>
          {day.isToday ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.weekDayTodayMarker,
                day.isSelected ? styles.weekDayTodayMarkerSelected : null,
              ]}
            />
          ) : null}
        </Touchable>
      ))}
    </View>
  );
}

function createDiaryWeekDays(input: Readonly<{
  locale: string;
  selectedDate: string;
  t: ReturnType<typeof useAppTranslation>['t'];
  todayDate: string;
}>): readonly {
  accessibilityLabel: string;
  date: string;
  dayNumber: string;
  isSelected: boolean;
  isToday: boolean;
  shortWeekday: string;
}[] {
  return [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const date = shiftCalendarDate(input.todayDate, offset);
    const utcDate = calendarDateToUtc(date);
    const isSelected = date === input.selectedDate;
    const isToday = date === input.todayDate;
    const stateLabel = getDiaryWeekDayStateLabel({
      isSelected,
      isToday,
      t: input.t,
    });
    const weekday = formatDiaryWeekday(utcDate, input.locale, 'long');
    const shortWeekday = formatDiaryWeekday(utcDate, input.locale, 'short');
    const shortDate = utcDate === null
      ? date
      : new Intl.DateTimeFormat(input.locale, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(utcDate);

    return {
      accessibilityLabel: input.t('today.week-strip.day-label', {
        date: shortDate,
        state: stateLabel,
        weekday,
      }),
      date,
      dayNumber: utcDate === null
        ? date.slice(-2)
        : new Intl.DateTimeFormat(input.locale, {
          day: 'numeric',
          timeZone: 'UTC',
        }).format(utcDate),
      isSelected,
      isToday,
      shortWeekday,
    };
  });
}

function getDiaryWeekDayStateLabel(input: Readonly<{
  isSelected: boolean;
  isToday: boolean;
  t: ReturnType<typeof useAppTranslation>['t'];
}>): string {
  if (input.isSelected && input.isToday) {
    return input.t('today.week-strip.state-selected-today');
  }

  if (input.isSelected) {
    return input.t('today.week-strip.state-selected');
  }

  if (input.isToday) {
    return input.t('today.week-strip.state-today');
  }

  return input.t('today.week-strip.state-default');
}

function formatDiaryWeekday(
  date: Date | null,
  locale: string,
  weekday: 'long' | 'short',
): string {
  if (date === null) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday,
  }).format(date);
}

export function createTodayPlanInputFromPuppy(input: Readonly<{
  now?: Date;
  puppyCreatedAt: string;
  todayDate: string;
}>): Partial<TodayPlanInput> {
  return {
    dayNumber: getPuppyPlanDayNumber(input),
    timeOfDay: getTodayTimeOfDay(input.now ?? new Date()),
  };
}

function getTodayStatusState(input: Readonly<{
  careContext: QuickLogSurfaceCareContext;
  eventViews: readonly QuickLogEventView[];
  rows: readonly QuickLogCachedEventRow[];
  screenState?: TodayScreenStateOverride;
  timelineStatus: 'error' | 'loading' | 'ready' | 'unavailable';
}>): TodayStatusState | null {
  if (input.screenState === 'all-done') {
    return 'all-done';
  }

  if (input.screenState === 'cold-start') {
    return 'cold-start';
  }

  if (input.screenState === 'empty-history') {
    return 'empty-history';
  }

  if (input.screenState === 'offline-read') {
    return 'offline-read';
  }

  if (input.screenState === 'pending-write') {
    return 'pending-write';
  }

  if (input.careContext.householdRole === 'viewer') {
    return 'permission-denied';
  }

  if (input.timelineStatus === 'loading' && input.rows.length === 0) {
    return 'loading';
  }

  if (input.timelineStatus === 'error') {
    return 'error';
  }

  if (input.timelineStatus === 'ready' && input.eventViews.length === 0) {
    return 'empty';
  }

  return null;
}

function createTodayPlanInput(input: Readonly<{
  careContext: QuickLogSurfaceCareContext;
  overrides?: Partial<TodayPlanInput>;
  rows: readonly QuickLogCachedEventRow[];
}>): TodayPlanInput {
  const eventCounts = createEventCounts(input.rows);
  const lastEvents = input.rows.flatMap((row) => {
    const summary = createTodayEventSummary(row);

    return summary === null ? [] : [summary];
  });
  const latestMealRow = input.rows.find((row) => row.event_type === 'feeding');
  const baseInput: TodayPlanInput = {
    dayNumber: 1,
    eventCounts,
    feedingPattern: latestMealRow === undefined
      ? undefined
      : {
        lastFeedingLocalTime: formatLocalHourMinute(latestMealRow.occurred_at),
        usualAmount: 'meal',
      },
    lastEvents,
    suggestedDailyCards: lastEvents.length === 0
      ? []
      : ['timeline_review', 'potty_rhythm', 'sleep_rhythm'],
    todayDate: input.careContext.todayDate,
  };

  return {
    ...baseInput,
    ...input.overrides,
  };
}

function createEventCounts(rows: readonly QuickLogCachedEventRow[]): NonNullable<TodayPlanInput['eventCounts']> {
  const eventCounts: Partial<Record<EventType, number>> = {};

  for (const row of rows) {
    eventCounts[row.event_type] = (eventCounts[row.event_type] ?? 0) + 1;
  }

  return eventCounts;
}

function createTodayEventSummary(
  row: QuickLogCachedEventRow,
): NonNullable<TodayPlanInput['lastEvents']>[number] | null {
  const occurredAt = Date.parse(row.occurred_at);

  if (Number.isNaN(occurredAt)) {
    return null;
  }

  return {
    eventType: row.event_type,
    minutesAgo: Math.min(60 * 24 * 7, Math.max(0, Math.floor((Date.now() - occurredAt) / 60000))),
    quickAction: getTodayQuickAction(row),
  };
}

function getPuppyPlanDayNumber(input: Readonly<{
  puppyCreatedAt: string;
  todayDate: string;
}>): number {
  const createdDate = getLocalCalendarDate(input.puppyCreatedAt);
  const createdDayStart = createdDate === null ? null : getUtcDayStartMs(createdDate);
  const todayDayStart = getUtcDayStartMs(input.todayDate);

  if (createdDayStart === null || todayDayStart === null) {
    return 1;
  }

  const inclusiveDayNumber = Math.floor((todayDayStart - createdDayStart) / 86_400_000) + 1;

  return Math.min(90, Math.max(1, inclusiveDayNumber));
}

function getUtcDayStartMs(calendarDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(calendarDate);

  if (match === null) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const normalized = new Date(timestamp);

  return normalized.getUTCFullYear() === year
    && normalized.getUTCMonth() === month - 1
    && normalized.getUTCDate() === day
    ? timestamp
    : null;
}

function getTodayTimeOfDay(now: Date): NonNullable<TodayPlanInput['timeOfDay']> {
  const hour = now.getHours();

  if (hour < 11) {
    return 'morning';
  }

  if (hour < 17) {
    return 'midday';
  }

  return 'evening';
}

function getTodayQuickAction(
  row: QuickLogCachedEventRow,
): NonNullable<TodayPlanInput['lastEvents']>[number]['quickAction'] {
  if (row.event_type === 'potty') {
    const payloadResult = eventPayloadSchemas.potty.safeParse(row.payload);

    if (!payloadResult.success) {
      return 'other';
    }

    if (payloadResult.data.subtype === 'outside') {
      return 'pee_outside';
    }

    if (payloadResult.data.subtype === 'inside') {
      return 'pee_inside';
    }

    return 'poop';
  }

  if (row.event_type === 'feeding') {
    const payloadResult = eventPayloadSchemas.feeding.safeParse(row.payload);

    return payloadResult.success && payloadResult.data.amount === 'meal'
      ? 'meal'
      : 'other';
  }

  if (row.event_type === 'sleep') {
    const payloadResult = eventPayloadSchemas.sleep.safeParse(row.payload);

    return payloadResult.success && payloadResult.data.sleep_kind === 'nap'
      ? 'nap'
      : 'other';
  }

  return 'other';
}

function hasPendingLocalRows(rows: readonly QuickLogCachedEventRow[]): boolean {
  return rows.some((row) =>
    row.localSync?.state === 'pending_local' || row.localSync?.state === 'sending');
}

function formatLocalHourMinute(occurredAt: string): string {
  const date = new Date(occurredAt);

  if (Number.isNaN(date.getTime())) {
    return '00:00';
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function TodayQuickLogEventRow({
  actions,
  event,
}: Readonly<{
  actions: QuickLogEventActionHandlers;
  event: QuickLogEventView;
}>) {
  const { t } = useAppTranslation();
  const onDelete = actions.onDelete;
  const onEdit = actions.onEdit;
  const onRetry = actions.onRetry;
  const onUndo = actions.onUndo;
  const editRequest = event.status === 'synced' ? createQuickLogEditRequest(event) : null;

  return (
    <Card
      testID="diary-history-logged-fact"
      variant="mutedTemplate">
      <Stack gap="md">
        <Stack
          align="center"
          direction="horizontal"
          gap="sm"
          justify="space-between"
          wrap>
          <Stack
            gap="xs"
            style={styles.eventText}>
            <AppText variant="bodyEmph">{event.title}</AppText>
            <AppText
              maxFontSizeMultiplier={2}
              tone="secondary"
              variant="footnote">
              {t('timeline.row-meta-template', {
                actor: event.actorLabel,
                time: event.occurredAtLabel,
              })}
            </AppText>
          </Stack>
          {editRequest !== null && onEdit !== undefined ? (
            <IconButton
              accessibilityLabel={t('today.history.item-actions')}
              icon={
                <AppIcon
                  color={tokens.color.text.secondary}
                  name="more"
                  size={22}
                />
              }
              onPress={() => {
                onEdit(editRequest);
              }}
              style={styles.eventActionsButton}
            />
          ) : event.status === 'synced' ? null : (
            <StatusPill
              accessibilityLabel={event.statusLabel}
              icon={
                <AppText
                  accessibilityElementsHidden
                  maxFontSizeMultiplier={2}>
                  {statusIcon(event.status)}
                </AppText>
              }
              label={event.statusLabel}
              style={styles.statusPill}
              tone={statusTone(event.status)}
            />
          )}
        </Stack>
        {event.status === 'failed' && (onRetry !== undefined || onDelete !== undefined) ? (
          <Stack direction="horizontal" gap="sm" wrap>
            {onRetry !== undefined ? (
              <Button
                label={t('quick-log.failed.primary')}
                onPress={() => {
                  onRetry(event.clientEventId, 'manual_retry', 'today');
                }}
                variant="secondary"
              />
            ) : null}
            {onDelete !== undefined ? (
              <Button
                label={t('quick-log.failed.tertiary')}
                onPress={() => {
                  onDelete(createQuickLogDeleteRequest(event));
                }}
                variant="tertiary"
              />
            ) : null}
          </Stack>
        ) : null}
        {event.status === 'pending' && (onUndo !== undefined || onDelete !== undefined) ? (
          <Stack direction="horizontal" gap="sm" wrap>
            {onUndo !== undefined ? (
              <Button
                label={t('quick-log.snackbar.undo')}
                onPress={() => {
                  onUndo(createQuickLogUndoRequest(event));
                }}
                variant="tertiary"
              />
            ) : null}
            {onDelete !== undefined ? (
              <Button
                label={t('quick-log.failed.tertiary')}
                onPress={() => {
                  onDelete(createQuickLogDeleteRequest(event));
                }}
                variant="tertiary"
              />
            ) : null}
          </Stack>
        ) : null}
        {event.status === 'synced' && onDelete !== undefined ? (
          <Stack direction="horizontal" gap="sm" wrap>
            <Button
              label={t('today.history.delete-action')}
              onPress={() => {
                onDelete(createQuickLogDeleteRequest(event));
              }}
              variant="destructive"
            />
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

function statusIcon(status: QuickLogEventView['status']): string {
  if (status === 'failed') {
    return '!';
  }

  if (status === 'pending') {
    return '...';
  }

  return '\u2713';
}

function statusTone(status: QuickLogEventView['status']): 'confirmed' | 'failed' | 'pending' {
  if (status === 'failed') {
    return 'failed';
  }

  if (status === 'pending') {
    return 'pending';
  }

  return 'confirmed';
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.layout.bottomInsetFab,
    paddingTop: tokens.space[2],
  },
  eventText: {
    flexShrink: 1,
    minWidth: 0,
  },
  eventActionsButton: {
    minHeight: 44,
    minWidth: 44,
  },
  largeTitle: {
    fontWeight: '700',
  },
  sectionTitle: {
    flexShrink: 1,
  },
  statusPill: {
    alignSelf: 'flex-start',
  },
  timelineEntry: {
    alignSelf: 'flex-start',
  },
  weekDay: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    flex: 1,
    gap: tokens.space[1],
    paddingHorizontal: tokens.space[1],
    paddingVertical: tokens.space[2],
  },
  weekDayNumber: {
    fontWeight: '700',
    lineHeight: 22,
  },
  weekDayPressed: {
    opacity: 0.72,
  },
  weekDaySelected: {
    backgroundColor: tokens.color.primary[700],
    borderColor: tokens.color.primary[700],
  },
  weekDayText: {
    color: tokens.color.text.secondary,
  },
  weekDayTextSelected: {
    color: tokens.color.text.onPrimary,
  },
  weekDayToday: {
    borderColor: tokens.color.primary[600],
  },
  weekDayTodayMarker: {
    backgroundColor: tokens.color.primary[600],
    borderRadius: tokens.radius.full,
    height: 4,
    width: 16,
  },
  weekDayTodayMarkerSelected: {
    backgroundColor: tokens.color.text.onPrimary,
  },
  weekStrip: {
    flexDirection: 'row',
    gap: tokens.space[1],
    marginTop: -tokens.space[1],
  },
});

function TodayTitle({ todayDate }: Readonly<{ todayDate?: string }>) {
  const { locale, t } = useAppTranslation();

  return (
    <Stack gap="xs">
      <AppText style={styles.largeTitle} variant="display">{t('tabs.diary')}</AppText>
      <AppText tone="tertiary" variant="callout">
        {formatTodayDate(todayDate, locale)}
      </AppText>
    </Stack>
  );
}

function formatTodayDate(todayDate: string | undefined, locale: string): string {
  const date = todayDate === undefined ? new Date() : new Date(`${todayDate}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date).replace(',', ' ·');
}
