import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { shouldShowQuickLogFailedBanner } from '@/contracts/business-rules';
import {
  buildTodayPlan,
  type TodayPlan,
  type TodayPlanInput,
} from '@/contracts/today';
import {
  eventPayloadSchemas,
  type EventType,
} from '@/contracts/supabase';
import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { DayDivider } from '@/design/primitives/DayDivider';
import { EmptyIllustration } from '@/design/primitives/EmptyIllustration';
import { FactCard } from '@/design/primitives/FactCard';
import { IconButton } from '@/design/primitives/IconButton';
import { type EventAccent } from '@/design/primitives/IconChip';
import { InfoHero } from '@/design/primitives/InfoHero';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
import { SwipeToDelete } from '@/design/primitives/SwipeToDelete';
import { Touchable } from '@/design/primitives/Touchable';
import { WeekStrip, type WeekStripDay } from '@/design/primitives/WeekStrip';
import { tokens } from '@/design/tokens';
import { useAppTranslation, type I18nKey } from '@/lib/i18n';
import {
  calendarDateToUtc,
  formatLocalCalendarDate,
  getLocalCalendarDate,
  shiftCalendarDate,
} from '@/lib/i18n/format-date';
import type { TimelineFilters } from '@/lib/query/keys';
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

import { DiaryHeader } from '../components/DiaryHeader';
import {
  TodayStatusCard,
  todayHeroCopy,
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
  puppyName?: string;
  screenState?: TodayScreenStateOverride;
  todayPlanInput?: Partial<TodayPlanInput>;
}>;

const emptyActions: QuickLogEventActionHandlers = {};
const DIARY_HISTORY_SECTION_GAP = 10;
const DIARY_COLD_START_PADDING_TOP = 44;
const DIARY_EMPTY_HISTORY_PADDING_TOP = 86;
const DIARY_EMPTY_HORIZONTAL_PADDING = 28;
const DIARY_EMPTY_BODY_MAX_WIDTH = 280;
const DIARY_EMPTY_QUIET_BODY_MAX_WIDTH = 260;
const diaryEmptyStateCopy: Record<'cold-start' | 'empty-history', {
  bodyKey: I18nKey;
  titleKey: I18nKey;
}> = {
  'cold-start': {
    bodyKey: 'today.states.cold-start.body',
    titleKey: 'today.states.cold-start.title',
  },
  'empty-history': {
    bodyKey: 'today.states.empty-history.body',
    titleKey: 'today.states.empty-history.title',
  },
};
type DiaryHistoryFilterValue = 'all' | 'feeding' | 'potty' | 'sleep';
type DiaryHistoryFilterSpec = Readonly<{
  eventTypes: readonly EventType[] | undefined;
  labelKey: I18nKey;
  value: DiaryHistoryFilterValue;
}>;
type DiaryEventRow = Readonly<{
  event: QuickLogEventView;
  row: QuickLogCachedEventRow;
}>;
type DiaryHistoryDayGroup = Readonly<{
  eventRows: readonly DiaryEventRow[];
  key: string;
  label: string;
}>;
const diaryHistoryFilterSpecs = [
  {
    eventTypes: undefined,
    labelKey: 'timeline.filter-chips.0',
    value: 'all',
  },
  {
    eventTypes: ['feeding'],
    labelKey: 'timeline.filter-chips.2',
    value: 'feeding',
  },
  {
    eventTypes: ['potty'],
    labelKey: 'timeline.filter-chips.1',
    value: 'potty',
  },
  {
    eventTypes: ['sleep'],
    labelKey: 'timeline.filter-chips.3',
    value: 'sleep',
  },
] as const satisfies readonly DiaryHistoryFilterSpec[];

export function TodayScreen({
  actions = emptyActions,
  careContext = null,
  openOnboarding,
  openQuickLog,
  openTimeline,
  puppyName,
  screenState,
  todayPlanInput,
}: TodayScreenProps) {
  const { locale, t } = useAppTranslation();
  const [diaryHistoryOpen, setDiaryHistoryOpen] = useState(false);
  const [selectedHistoryFilter, setSelectedHistoryFilter] =
    useState<DiaryHistoryFilterValue>('all');
  const historyFilters = useMemo(
    () => createDiaryHistoryFilters(selectedHistoryFilter),
    [selectedHistoryFilter],
  );
  const timelineRows = useQuickLogTimelineRows(
    careContext,
    careContext === null
      ? undefined
      : {
        from: careContext.todayDate,
        to: careContext.todayDate,
      },
  );
  const historyTimelineRows = useQuickLogTimelineRows(
    diaryHistoryOpen ? careContext : null,
    historyFilters,
  );
  const rows = timelineRows.rows;
  const visibleRows = diaryHistoryOpen ? historyTimelineRows.rows : rows;
  const visibleTimelineStatus = diaryHistoryOpen ? historyTimelineRows.status : timelineRows.status;
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
        <DiaryHeader puppyName={puppyName} />
        <TodayStatusCard state="unavailable" />
        <Button
          label={t('today.quick-log.setup-entry')}
          onPress={openOnboarding ?? openTimeline}
          variant="primary"
        />
      </Screen>
    );
  }

  const todayEventRows = rows.flatMap((row) => {
    const event = createQuickLogEventView(row, {
      locale,
      t,
      todayDate: careContext.todayDate,
    });

    return event === null ? [] : [{ event, row }];
  });
  const eventRows = visibleRows.flatMap((row) => {
    const event = createQuickLogEventView(row, {
      locale,
      t,
      todayDate: careContext.todayDate,
    });

    return event === null ? [] : [{ event, row }];
  });
  const todayEventViews = todayEventRows.map((eventRow) => eventRow.event);
  const eventViews = eventRows.map((eventRow) => eventRow.event);
  const todayStatus = getTodayStatusState({
    careContext,
    eventViews: todayEventViews,
    rows,
    screenState,
    timelineStatus: timelineRows.status,
  });
  const showTodayPlan = todayPlan !== null
    && todayStatus !== 'all-done'
    && screenState !== 'cold-start'
    && screenState !== 'empty-history'
    && screenState !== 'pending-write'
    && !(timelineRows.status === 'loading' && rows.length === 0);
  const showQuickLogSection = diaryHistoryOpen
    || eventViews.length > 0
    || timelineRows.status === 'error'
    || hasPendingLocalRows(rows)
    || shouldShowQuickLogFailedBanner(rows);

  return (
    <Screen contentStyle={styles.content}>
      <DiaryHeader
        puppyName={puppyName}
        timeOfDay={todayPlanInput?.timeOfDay}
        todayDate={careContext.todayDate}
      />
      <DiaryWeekStrip
        selectedDate={todayPlanSourceInput?.todayDate ?? careContext.todayDate}
        todayDate={careContext.todayDate}
      />
      <DiaryClayState
        onPrimaryAction={openQuickLog ?? openTimeline}
        onSecondaryAction={openTimeline}
        state={todayStatus}
      />
      {todayStatus === null
        || isClayDiaryState(todayStatus)
        || (todayStatus === 'empty' && todayPlan !== null)
        ? null
        : <TodayStatusCard state={todayStatus} />}
      {showTodayPlan && todayPlan !== null ? (
        <DiaryInfoHero
          hero={todayPlan.hero}
          onPrimaryAction={openQuickLog}
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
      <Stack
        gap="sm"
        style={styles.historySection}
        testID="diary-history-section">
        <Stack
          align="flex-start"
          direction="horizontal"
          gap="sm"
          justify="space-between"
          wrap>
          <AppText
            style={styles.sectionTitle}
            variant="title3">
            {t('today.history.section-title')}
          </AppText>
          <Button
            label={t('today.history.open-action')}
            labelMaxFontSizeMultiplier={2}
            labelVariant="label"
            onPress={() => {
              setDiaryHistoryOpen(true);
            }}
            style={styles.timelineEntry}
            variant="tertiary"
          />
        </Stack>
        {diaryHistoryOpen ? (
          <>
            <DiaryHistoryFilterBar
              selectedFilter={selectedHistoryFilter}
              setSelectedFilter={setSelectedHistoryFilter}
            />
            {eventViews.length > 0 ? (
              <DiaryHistoryDayGroups
                actions={actions}
                eventRows={eventRows}
                locale={locale}
                t={t}
                todayDate={careContext.todayDate}
              />
            ) : visibleTimelineStatus === 'error' ? (
              <Card
                accessibilityLabel={t('errors.load-failed')}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert">
                <AppText>{t('errors.load-failed')}</AppText>
              </Card>
            ) : (
              <Card>
                <AppText tone="secondary">{t('timeline.empty-filter')}</AppText>
              </Card>
            )}
          </>
        ) : eventViews.length > 0 ? (
          eventRows.map(({ event, row }) => (
            <DiaryFactRow
              actions={actions}
              event={event}
              key={event.clientEventId}
              row={row}
            />
          ))
        ) : visibleTimelineStatus === 'error' ? (
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

function DiaryHistoryFilterBar({
  selectedFilter,
  setSelectedFilter,
}: Readonly<{
  selectedFilter: DiaryHistoryFilterValue;
  setSelectedFilter: (value: DiaryHistoryFilterValue) => void;
}>) {
  const { t } = useAppTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.historyFilterScroller}
      testID="diary-history-filter-bar">
      <Stack direction="horizontal" gap="sm">
        {diaryHistoryFilterSpecs.map((option) => {
          const selected = option.value === selectedFilter;
          const label = t(option.labelKey);

          return (
            <Touchable
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={option.value}
              minTarget="thumb"
              onPress={() => {
                setSelectedFilter(option.value);
              }}
              style={[styles.historyFilterChip, selected ? styles.historyFilterChipSelected : null]}>
              <AppText
                maxFontSizeMultiplier={1.4}
                style={selected ? styles.historyFilterLabelSelected : styles.historyFilterLabel}
                variant="label">
                {label}
              </AppText>
            </Touchable>
          );
        })}
      </Stack>
    </ScrollView>
  );
}

function DiaryHistoryDayGroups({
  actions,
  eventRows,
  locale,
  t,
  todayDate,
}: Readonly<{
  actions: QuickLogEventActionHandlers;
  eventRows: readonly DiaryEventRow[];
  locale: string;
  t: ReturnType<typeof useAppTranslation>['t'];
  todayDate: string;
}>) {
  const groups = groupDiaryHistoryRows(eventRows, todayDate, locale, t);

  return (
    <Stack gap="md">
      {groups.map((group) => (
        <Stack gap="sm" key={group.key}>
          <DayDivider
            label={group.label}
            testID={`diary-history-day-${group.key}`}
          />
          {group.eventRows.map(({ event, row }) => (
            <DiaryFactRow
              actions={actions}
              event={event}
              key={event.clientEventId}
              row={row}
            />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

function DiaryClayState({
  onPrimaryAction,
  onSecondaryAction,
  state,
}: Readonly<{
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  state: TodayStatusState | null;
}>) {
  if (state === 'all-done') {
    return <DiaryAllDoneCard />;
  }

  if (state === 'cold-start' || state === 'empty-history') {
    return (
      <DiaryEmptyState
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
        state={state}
      />
    );
  }

  return null;
}

function isClayDiaryState(state: TodayStatusState): boolean {
  return state === 'all-done' || state === 'cold-start' || state === 'empty-history';
}

function DiaryEmptyState({
  onPrimaryAction,
  onSecondaryAction,
  state,
}: Readonly<{
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  state: 'cold-start' | 'empty-history';
}>) {
  const { t } = useAppTranslation();
  const copy = diaryEmptyStateCopy[state];
  const label = `${t(copy.titleKey)}. ${t(copy.bodyKey)}`;
  const isColdStart = state === 'cold-start';

  return (
    <View
      accessibilityLabel={label}
      accessible
      style={[
        styles.diaryEmptyState,
        isColdStart ? styles.diaryColdStartState : styles.diaryEmptyHistoryState,
      ]}
      testID={`diary-empty-state-${state}`}>
      <EmptyIllustration />
      <Stack
        align="center"
        gap="xs">
        <AppText
          accessibilityRole="header"
          style={styles.diaryEmptyTitle}
          variant="title3">
          {t(copy.titleKey)}
        </AppText>
        <AppText
          style={[
            styles.diaryEmptyBody,
            isColdStart ? styles.diaryColdStartBody : styles.diaryEmptyHistoryBody,
          ]}
          tone="secondary"
          variant="callout">
          {t(copy.bodyKey)}
        </AppText>
      </Stack>
      {isColdStart ? (
        <Stack
          align="stretch"
          gap="sm"
          style={styles.diaryEmptyActions}>
          <Button
            label={t('nav.quick-log-slab')}
            onPress={onPrimaryAction}
            variant="primary"
          />
          <Button
            label={t('nav.schedule-slab')}
            onPress={onSecondaryAction}
            variant="secondary"
          />
        </Stack>
      ) : null}
    </View>
  );
}

function DiaryAllDoneCard() {
  const { t } = useAppTranslation();

  return (
    <Card
      accessibilityLabel={`${t('today.states.all-done.title')}. ${t('today.states.all-done.body')}`}
      style={styles.diaryAllDoneCard}
      testID="diary-all-done-card">
      <Stack gap="sm">
        <StatusPill
          accessibilityLabel={t('today.states.all-done.status')}
          icon={
            <AppIcon
              color={tokens.color.pill.completed.text}
              name="check"
              size={14}
            />
          }
          label={t('today.states.all-done.status')}
          tone="completed"
        />
        <AppText variant="title3">{t('today.states.all-done.title')}</AppText>
        <AppText variant="callout">{t('today.states.all-done.body')}</AppText>
      </Stack>
    </Card>
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
  const weekDays = useMemo<WeekStripDay[]>(
    () => days.map((day) => ({
      accessibilityLabel: day.accessibilityLabel,
      day: day.dayNumber,
      dow: day.shortWeekday,
      key: day.date,
    })),
    [days],
  );
  const selectedIndex = days.findIndex((day) => day.isSelected);
  const todayIndex = days.findIndex((day) => day.isToday);

  return (
    <WeekStrip
      accessibilityLabel={t('today.week-strip.label')}
      days={weekDays}
      selectedIndex={selectedIndex === -1 ? 0 : selectedIndex}
      testID="today-week-strip"
      todayIndex={todayIndex === -1 ? undefined : todayIndex}
    />
  );
}

/** Collapses the day's single priority signal (`plan.hero`) into one Clay guidance tip. */
function DiaryInfoHero({
  hero,
  onPrimaryAction,
}: Readonly<{
  hero: TodayPlan['hero'];
  onPrimaryAction?: () => void;
}>) {
  const { t } = useAppTranslation();
  const copy = todayHeroCopy[hero.variant];
  const body = hero.variant === 'first_day' ? '' : t(copy.bodyKey);
  const message = body.trim() ? `${t(copy.titleKey)}\n${body}` : t(copy.titleKey);
  const primaryKey = 'primaryKey' in copy ? copy.primaryKey : undefined;

  return (
    <Stack gap="sm">
      <InfoHero message={message} testID="diary-info-hero" />
      {primaryKey === undefined || onPrimaryAction === undefined ? null : (
        <Button
          label={t(primaryKey)}
          onPress={onPrimaryAction}
          style={styles.infoHeroAction}
          variant="primary"
        />
      )}
    </Stack>
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

function createDiaryHistoryFilters(selectedFilter: DiaryHistoryFilterValue): TimelineFilters {
  const spec = diaryHistoryFilterSpecs.find((option) => option.value === selectedFilter);

  if (spec?.eventTypes === undefined) {
    return {};
  }

  return {
    eventTypes: spec.eventTypes,
  };
}

function groupDiaryHistoryRows(
  eventRows: readonly DiaryEventRow[],
  todayDate: string,
  locale: string,
  t: ReturnType<typeof useAppTranslation>['t'],
): readonly DiaryHistoryDayGroup[] {
  const order: string[] = [];
  const rowsByDate = new Map<string, DiaryEventRow[]>();

  for (const eventRow of eventRows) {
    const occurredDate = formatLocalCalendarDate(eventRow.row.occurred_at);
    const existingRows = rowsByDate.get(occurredDate);

    if (existingRows === undefined) {
      rowsByDate.set(occurredDate, [eventRow]);
      order.push(occurredDate);
    } else {
      existingRows.push(eventRow);
    }
  }

  return order.map((dateKey) => ({
    eventRows: rowsByDate.get(dateKey) ?? [],
    key: dateKey,
    label: formatDiaryHistoryDayLabel(dateKey, todayDate, locale, t),
  }));
}

function formatDiaryHistoryDayLabel(
  calendarDate: string,
  todayDate: string,
  locale: string,
  t: ReturnType<typeof useAppTranslation>['t'],
): string {
  const weekday = formatDiaryHistoryWeekday(calendarDate, locale);

  if (calendarDate === todayDate) {
    return t('timeline.section-today', { weekday });
  }

  if (calendarDate === shiftCalendarDate(todayDate, -1)) {
    return t('timeline.section-yesterday', { weekday });
  }

  return t('timeline.section-date', {
    date: formatDiaryHistoryDate(calendarDate, locale),
    weekday,
  });
}

function formatDiaryHistoryWeekday(calendarDate: string, locale: string): string {
  const date = calendarDateToUtc(calendarDate);

  if (date === null) {
    return calendarDate;
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long',
  }).format(date);
}

function formatDiaryHistoryDate(calendarDate: string, locale: string): string {
  const date = calendarDateToUtc(calendarDate);

  if (date === null) {
    return calendarDate;
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function DiaryFactRow({
  actions,
  event,
  row,
}: Readonly<{
  actions: QuickLogEventActionHandlers;
  event: QuickLogEventView;
  row: QuickLogCachedEventRow;
}>) {
  const { t } = useAppTranslation();
  const onDelete = actions.onDelete;
  const onEdit = actions.onEdit;
  const onRetry = actions.onRetry;
  const onUndo = actions.onUndo;
  const editRequest = event.status === 'synced' ? createQuickLogEditRequest(event) : null;
  const visual = getFactCardVisual(row);
  const canSwipeDelete = event.status === 'synced' && onDelete !== undefined;
  const deleteLabel = t('today.history.delete-action');
  const factCard = (
    <FactCard
      accent={visual.accent}
      accessibilityActions={canSwipeDelete ? [{ name: 'delete', label: deleteLabel }] : undefined}
      accessibilityLabel={t('today.history.fact-a11y-label', {
        caption: event.status === 'synced' ? event.actorLabel : event.statusLabel,
        time: event.occurredAtLabel,
        title: event.title,
      })}
      caption={event.status === 'synced' ? event.actorLabel : event.statusLabel}
      icon={visual.icon}
      onAccessibilityAction={canSwipeDelete ? (accessibilityEvent) => {
        if (accessibilityEvent.nativeEvent.actionName === 'delete' && onDelete !== undefined) {
          onDelete(createQuickLogDeleteRequest(event));
        }
      } : undefined}
      testID="diary-history-logged-fact"
      time={event.occurredAtLabel}
      title={event.title}
    />
  );

  return (
    <Stack gap="xs">
      <Stack
        align="center"
        direction="horizontal"
        gap="sm">
        <View style={styles.factCard}>
          {canSwipeDelete && onDelete !== undefined ? (
            <SwipeToDelete
              deleteLabel={deleteLabel}
              onDelete={() => {
                onDelete(createQuickLogDeleteRequest(event));
              }}
              testID="diary-history-swipe-delete">
              {factCard}
            </SwipeToDelete>
          ) : factCard}
        </View>
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
        ) : null}
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
    </Stack>
  );
}

function getFactCardVisual(
  row: QuickLogCachedEventRow,
): { accent: EventAccent; icon: AppIconName } {
  if (row.event_type === 'feeding') {
    return { accent: 'clay', icon: 'bowl' };
  }

  if (row.event_type === 'walk') {
    return { accent: 'clay', icon: 'walk' };
  }

  if (row.event_type === 'sleep') {
    return { accent: 'mauve', icon: 'moon' };
  }

  if (row.event_type === 'zoomies') {
    return { accent: 'honey', icon: 'ball' };
  }

  if (row.event_type === 'potty') {
    const quickAction = getTodayQuickAction(row);

    if (quickAction === 'pee_outside') {
      return { accent: 'honey', icon: 'water' };
    }

    if (quickAction === 'poop') {
      return { accent: 'honey', icon: 'poop' };
    }

    return { accent: 'honey', icon: 'pottyInside' };
  }

  return { accent: 'honey', icon: 'paw' };
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: tokens.layout.bottomInsetFab,
    paddingTop: tokens.space[2],
  },
  diaryAllDoneCard: {
    backgroundColor: tokens.color.sage[100],
    borderColor: tokens.color.sage[300],
    borderRadius: tokens.radius.hero,
    marginBottom: tokens.space[5],
    padding: tokens.space[5],
  },
  diaryColdStartBody: {
    maxWidth: DIARY_EMPTY_BODY_MAX_WIDTH,
  },
  diaryColdStartState: {
    paddingTop: DIARY_COLD_START_PADDING_TOP,
  },
  diaryEmptyActions: {
    alignSelf: 'stretch',
    marginTop: tokens.space[3],
  },
  diaryEmptyBody: {
    textAlign: 'center',
  },
  diaryEmptyHistoryBody: {
    maxWidth: DIARY_EMPTY_QUIET_BODY_MAX_WIDTH,
  },
  diaryEmptyHistoryState: {
    paddingTop: DIARY_EMPTY_HISTORY_PADDING_TOP,
  },
  diaryEmptyState: {
    alignItems: 'center',
    gap: tokens.space[5],
    paddingBottom: tokens.layout.bottomInsetFab,
    paddingHorizontal: DIARY_EMPTY_HORIZONTAL_PADDING,
  },
  diaryEmptyTitle: {
    textAlign: 'center',
  },
  factCard: {
    flex: 1,
    minWidth: 0,
  },
  historySection: {
    gap: DIARY_HISTORY_SECTION_GAP,
  },
  eventActionsButton: {
    minHeight: tokens.layout.tapTargetMin,
    minWidth: tokens.layout.tapTargetMin,
  },
  historyFilterChip: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: tokens.layout.tapTargetMin,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  historyFilterChipSelected: {
    backgroundColor: tokens.color.primary[50],
    borderColor: tokens.color.primary[300],
  },
  historyFilterLabel: {
    color: tokens.color.text.secondary,
  },
  historyFilterLabelSelected: {
    color: tokens.color.primary[700],
  },
  historyFilterScroller: {
    marginHorizontal: -tokens.layout.screenPaddingPhone,
    paddingHorizontal: tokens.layout.screenPaddingPhone,
  },
  infoHeroAction: {
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    flexShrink: 1,
  },
  timelineEntry: {
    alignSelf: 'flex-start',
  },
});
