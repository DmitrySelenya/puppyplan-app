import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { EventType } from '@/contracts/supabase';
import { AppText } from '@/design/primitives/AppText';
import { AppIcon } from '@/design/primitives/AppIcon';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { IconButton } from '@/design/primitives/IconButton';
import { ListGroup } from '@/design/primitives/ListGroup';
import { Screen } from '@/design/primitives/Screen';
import { SectionHeader } from '@/design/primitives/SectionHeader';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';
import {
  useAppTranslation,
  type AppTranslate,
  type I18nKey,
  type SupportedLocale,
} from '@/lib/i18n';
import {
  calendarDateToUtc,
  formatLocalCalendarDate,
  shiftCalendarDate,
} from '@/lib/i18n/format-date';
import { type TimelineFilters } from '@/lib/query/keys';
import {
  createQuickLogDeleteRequest,
  createQuickLogEditRequest,
  createQuickLogEventView,
  createQuickLogUndoRequest,
  type QuickLogEventActionHandlers,
  type QuickLogEventView,
  type QuickLogSurfaceCareContext,
} from '@/lib/query/quick-log-event-view';
import { useQuickLogTimelineRows } from '@/lib/query/useQuickLogTimelineRows';

export type TimelineScreenProps = Readonly<{
  actions?: QuickLogEventActionHandlers;
  careContext?: QuickLogSurfaceCareContext | null;
  onClose: () => void;
}>;

const emptyActions: QuickLogEventActionHandlers = {};

type TimelineFilterValue =
  | 'all'
  | 'potty'
  | 'feeding'
  | 'sleep'
  | 'zoomies'
  | 'training'
  | 'health_record_reference';

const timelineFilterSpecs = [
  {
    eventTypes: undefined,
    labelKey: 'timeline.filter-chips.0',
    value: 'all',
  },
  {
    eventTypes: ['potty'],
    labelKey: 'timeline.filter-chips.1',
    value: 'potty',
  },
  {
    eventTypes: ['feeding'],
    labelKey: 'timeline.filter-chips.2',
    value: 'feeding',
  },
  {
    eventTypes: ['sleep'],
    labelKey: 'timeline.filter-chips.3',
    value: 'sleep',
  },
  {
    eventTypes: ['zoomies'],
    labelKey: 'timeline.filter-chips.4',
    value: 'zoomies',
  },
  {
    eventTypes: ['training'],
    labelKey: 'timeline.filter-chips.5',
    value: 'training',
  },
  {
    eventTypes: ['health_record_reference'],
    labelKey: 'timeline.filter-chips.6',
    value: 'health_record_reference',
  },
] as const satisfies readonly Readonly<{
  eventTypes: readonly EventType[] | undefined;
  labelKey: I18nKey;
  value: TimelineFilterValue;
}>[];

export function TimelineScreen({
  actions = emptyActions,
  careContext = null,
  onClose,
}: TimelineScreenProps) {
  const { locale, t } = useAppTranslation();
  const [selectedFilter, setSelectedFilter] = useState<TimelineFilterValue>('all');
  const filterOptions = useMemo(() =>
    timelineFilterSpecs.map((option) => ({
      label: t(option.labelKey),
      value: option.value,
    })), [t]);
  const filters = useMemo(() => createTimelineFilters(selectedFilter), [selectedFilter]);
  const timelineRows = useQuickLogTimelineRows(careContext, filters);
  const rows = timelineRows.rows;

  if (careContext === null) {
    return (
      <Screen contentStyle={styles.content}>
        <TimelineHeader onClose={onClose} />
        <Card>
          <Stack gap="sm">
            <AppText variant="headline">{t('timeline.unavailable.title')}</AppText>
            <AppText tone="secondary">{t('timeline.unavailable.body')}</AppText>
          </Stack>
        </Card>
      </Screen>
    );
  }

  const dayBuckets = groupEventsByDay(
    rows.flatMap((row) => {
      const event = createQuickLogEventView(row, {
        locale,
        t,
        todayDate: careContext.todayDate,
      });

      return event === null
        ? []
        : [{ event, occurredDate: formatLocalCalendarDate(row.occurred_at) }];
    }),
    careContext.todayDate,
    locale,
    t,
  );

  return (
    <Screen contentStyle={styles.content} modal>
      <TimelineHeader onClose={onClose} />
      <TimelineFilterChips
        options={filterOptions}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
        t={t}
      />
      {dayBuckets.length > 0 ? (
        <View>
          {dayBuckets.map((bucket, index) => (
            <Stack
              gap="xs"
              key={bucket.key}
              style={index > 0 ? styles.dayGroupSpacing : undefined}>
              <SectionHeader
                title={bucket.caption}
                titleStyle={styles.sectionCaption}
              />
              <ListGroup testID={`timeline-day-group-${bucket.key}`}>
                {bucket.events.map((event) => (
                  <TimelineQuickLogEventRow
                    actions={actions}
                    event={event}
                    key={event.clientEventId}
                  />
                ))}
              </ListGroup>
            </Stack>
          ))}
        </View>
      ) : timelineRows.status === 'error' ? (
        <Card
          accessibilityLabel={t('errors.load-failed')}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          <AppText>{t('errors.load-failed')}</AppText>
        </Card>
      ) : (
        <Card>
          <AppText tone="secondary">
            {selectedFilter === 'all'
              ? t('timeline.empty')
              : t('timeline.empty-filter')}
          </AppText>
        </Card>
      )}
    </Screen>
  );
}

function TimelineFilterChips({
  options,
  selectedFilter,
  setSelectedFilter,
  t,
}: Readonly<{
  options: readonly {
    label: string;
    value: TimelineFilterValue;
  }[];
  selectedFilter: TimelineFilterValue;
  setSelectedFilter: (value: TimelineFilterValue) => void;
  t: AppTranslate;
}>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroller}>
      <Stack direction="horizontal" gap="sm">
        {options.map((option) => {
          const selected = option.value === selectedFilter;

          return (
            <Touchable
              accessibilityLabel={option.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => setSelectedFilter(option.value)}
              style={[styles.chip, selected ? styles.chipSelected : null]}>
              <AppText
                maxFontSizeMultiplier={1.4}
                style={selected ? styles.chipLabelSelected : styles.chipLabel}
                variant="label">
                {option.label}
              </AppText>
            </Touchable>
          );
        })}
      </Stack>
    </ScrollView>
  );
}

function TimelineHeader({ onClose }: Readonly<{ onClose: () => void }>) {
  const { t } = useAppTranslation();

  return (
    <Stack gap="sm">
      <Stack align="center" direction="horizontal" justify="space-between">
        <Button
          label={t('tabs.today')}
          labelMaxFontSizeMultiplier={1.4}
          labelVariant="callout"
          onPress={onClose}
          style={styles.navButton}
          variant="tertiary"
        />
        <AppText variant="headline">{t('timeline.title')}</AppText>
        <AppIcon name="search" size={24} />
      </Stack>
      <AppText variant="title1">{t('timeline.title')}</AppText>
    </Stack>
  );
}

function TimelineQuickLogEventRow({
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const editRequest = createQuickLogEditRequest(event);
  const showOverflow = (
    event.status === 'synced'
    && ((onEdit !== undefined && editRequest !== null) || onDelete !== undefined)
  ) || (
    event.status === 'pending'
    && (onUndo !== undefined || onDelete !== undefined)
  );
  const showCompactActions = event.status === 'failed' && (onRetry !== undefined || onDelete !== undefined);
  const deleteRequest = createQuickLogDeleteRequest(event);

  return (
    <View style={styles.eventRow}>
      <View style={styles.eventTimeColumn}>
        <AppText
          maxFontSizeMultiplier={1.4}
          numberOfLines={1}
          style={styles.eventTime}
          tone="tertiary"
          variant="footnote">
          {event.occurredAtLabel}
        </AppText>
      </View>
      <View style={styles.eventIconColumn}>
        <AppIcon
          color={tokens.color.text.primary}
          name={eventIcon(event.eventType)}
          size={22}
          testID={`timeline-event-icon-${event.eventType}`}
        />
      </View>
      <Stack
        gap="xs"
        style={styles.eventText}>
        <Stack
          align="center"
          direction="horizontal"
          gap="sm"
          justify="space-between">
          <AppText
            numberOfLines={1}
            style={styles.eventTitle}
            variant="bodyEmph">
            {event.title}
          </AppText>
          {event.status === 'synced' ? null : (
            <StatusPill
              accessibilityLabel={event.statusLabel}
              icon={
                <AppText
                  accessibilityElementsHidden
                  allowFontScaling={false}
                  style={styles.statusGlyph}
                  variant="caption">
                  {statusIcon(event.status)}
                </AppText>
              }
              label={event.statusLabel}
              style={styles.statusPill}
              tone={statusTone(event.status)}
            />
          )}
          {showOverflow ? (
            <IconButton
              accessibilityActions={[
                ...(onEdit !== undefined && editRequest !== null
                  ? [{
                      label: t('timeline.overflow-actions.0'),
                      name: 'edit',
                    } as const]
                  : []),
                ...(onDelete !== undefined
                  ? [{
                      label: event.status === 'pending'
                        ? t('quick-log.failed.tertiary')
                        : t('timeline.overflow-actions.1'),
                      name: 'delete',
                    } as const]
                  : []),
                ...(event.status === 'pending' && onUndo !== undefined
                  ? [{
                      label: t('quick-log.snackbar.undo'),
                      name: 'undo',
                    } as const]
                  : []),
              ]}
              accessibilityLabel={t('timeline.more-actions')}
              icon={<AppIcon name="more" size={20} />}
              onAccessibilityAction={(actionEvent) => {
                const actionName = actionEvent.nativeEvent.actionName;

                if (actionName === 'edit' && onEdit !== undefined && editRequest !== null) {
                  onEdit(editRequest);
                }

                if (actionName === 'delete' && onDelete !== undefined) {
                  if (event.status === 'pending') {
                    onDelete(deleteRequest);
                  } else {
                    setDeleteConfirmOpen(true);
                  }
                  setOverflowOpen(false);
                }

                if (actionName === 'undo' && event.status === 'pending' && onUndo !== undefined) {
                  onUndo(createQuickLogUndoRequest(event));
                  setOverflowOpen(false);
                }
              }}
              onPress={() => {
                setDeleteConfirmOpen(false);
                setOverflowOpen((isOpen) => !isOpen);
              }}
              style={styles.overflowButton}
            />
          ) : null}
        </Stack>
        <AppText
          maxFontSizeMultiplier={1.4}
          numberOfLines={1}
          tone="tertiary"
          variant="footnote">
          {event.actorLabel}
        </AppText>
        {overflowOpen ? (
          <Stack
            direction="horizontal"
            gap="sm"
            style={styles.compactActions}
            wrap>
            {onEdit !== undefined && editRequest !== null ? (
              <Button
                label={t('timeline.overflow-actions.0')}
                labelMaxFontSizeMultiplier={1.2}
                labelVariant="footnote"
                onPress={() => {
                  setOverflowOpen(false);
                  onEdit(editRequest);
                }}
                style={styles.compactActionButton}
                variant="secondary"
              />
            ) : null}
            {onDelete !== undefined ? (
              <Button
                label={event.status === 'pending'
                  ? t('quick-log.failed.tertiary')
                  : t('timeline.overflow-actions.1')}
                labelMaxFontSizeMultiplier={1.2}
                labelVariant="footnote"
                onPress={() => {
                  setOverflowOpen(false);
                  if (event.status === 'pending') {
                    onDelete(deleteRequest);
                  } else {
                    setDeleteConfirmOpen(true);
                  }
                }}
                style={styles.compactActionButton}
                variant="tertiary"
              />
            ) : null}
            {event.status === 'pending' && onUndo !== undefined ? (
              <Button
                label={t('quick-log.snackbar.undo')}
                labelMaxFontSizeMultiplier={1.2}
                labelVariant="footnote"
                onPress={() => {
                  setOverflowOpen(false);
                  onUndo(createQuickLogUndoRequest(event));
                }}
                style={styles.compactActionButton}
                variant="tertiary"
              />
            ) : null}
          </Stack>
        ) : null}
        {deleteConfirmOpen && onDelete !== undefined ? (
          <Card
            accessibilityLabel={t('timeline.delete-confirm.title')}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.deleteConfirmCard}>
            <Stack gap="sm">
              <AppText variant="headline">{t('timeline.delete-confirm.title')}</AppText>
              <AppText tone="secondary" variant="footnote">{t('timeline.delete-confirm.body')}</AppText>
              <Stack direction="horizontal" gap="sm" wrap>
                <Button
                  label={t('timeline.delete-confirm.primary')}
                  labelMaxFontSizeMultiplier={1.2}
                  labelVariant="footnote"
                  onPress={() => {
                    setDeleteConfirmOpen(false);
                    onDelete(deleteRequest);
                  }}
                  style={styles.compactActionButton}
                  variant="destructive"
                />
                <Button
                  label={t('timeline.delete-confirm.secondary')}
                  labelMaxFontSizeMultiplier={1.2}
                  labelVariant="footnote"
                  onPress={() => setDeleteConfirmOpen(false)}
                  style={styles.compactActionButton}
                  variant="tertiary"
                />
              </Stack>
            </Stack>
          </Card>
        ) : null}
        {showCompactActions ? (
          <Stack
            direction="horizontal"
            gap="sm"
            style={styles.compactActions}
            wrap>
        {event.status === 'failed' && (onRetry !== undefined || onDelete !== undefined) ? (
          <>
            {onRetry !== undefined ? (
              <Button
                label={t('quick-log.failed.primary')}
                labelMaxFontSizeMultiplier={1.2}
                labelVariant="footnote"
                onPress={() => {
                  onRetry(event.clientEventId, 'manual_retry', 'timeline');
                }}
                style={styles.compactActionButton}
                variant="secondary"
              />
            ) : null}
            {onDelete !== undefined ? (
              <Button
                label={t('quick-log.failed.tertiary')}
                labelMaxFontSizeMultiplier={1.2}
                labelVariant="footnote"
                onPress={() => {
                  onDelete(createQuickLogDeleteRequest(event));
                }}
                style={styles.compactActionButton}
                variant="tertiary"
              />
            ) : null}
          </>
        ) : null}
          </Stack>
        ) : null}
      </Stack>
    </View>
  );
}

type TimelineDayBucket = Readonly<{
  caption: string;
  events: readonly QuickLogEventView[];
  key: string;
}>;

function groupEventsByDay(
  entries: readonly Readonly<{
    event: QuickLogEventView;
    occurredDate: string;
  }>[],
  todayDate: string,
  locale: SupportedLocale,
  t: AppTranslate,
): readonly TimelineDayBucket[] {
  const order: string[] = [];
  const eventsByDate = new Map<string, QuickLogEventView[]>();

  for (const entry of entries) {
    const existing = eventsByDate.get(entry.occurredDate);

    if (existing === undefined) {
      eventsByDate.set(entry.occurredDate, [entry.event]);
      order.push(entry.occurredDate);
    } else {
      existing.push(entry.event);
    }
  }

  return order.map((occurredDate) => ({
    caption: formatDayCaption(occurredDate, todayDate, locale, t),
    events: eventsByDate.get(occurredDate) ?? [],
    key: occurredDate,
  }));
}

function formatDayCaption(
  occurredDate: string,
  todayDate: string,
  locale: SupportedLocale,
  t: AppTranslate,
): string {
  const weekday = formatWeekday(occurredDate, locale);

  if (occurredDate === todayDate) {
    return t('timeline.section-today', { weekday });
  }

  if (occurredDate === shiftCalendarDate(todayDate, -1)) {
    return t('timeline.section-yesterday', { weekday });
  }

  return t('timeline.section-date', {
    date: formatDayDate(occurredDate, locale),
    weekday,
  });
}

function formatWeekday(calendarDate: string, locale: SupportedLocale): string {
  const date = calendarDateToUtc(calendarDate);

  if (date === null) {
    return calendarDate;
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long',
  }).format(date);
}

function formatDayDate(calendarDate: string, locale: SupportedLocale): string {
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

function createTimelineFilters(selectedFilter: TimelineFilterValue): TimelineFilters {
  const spec = timelineFilterSpecs.find((option) => option.value === selectedFilter);

  if (spec?.eventTypes === undefined) {
    return {};
  }

  return {
    eventTypes: spec.eventTypes,
  };
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

function eventIcon(
  eventType: QuickLogEventView['eventType'],
): 'bowl' | 'moon' | 'poop' | 'spark' | 'today' {
  if (eventType === 'feeding') {
    return 'bowl';
  }

  if (eventType === 'sleep') {
    return 'moon';
  }

  if (eventType === 'zoomies') {
    return 'spark';
  }

  if (eventType === 'potty') {
    return 'poop';
  }

  return 'today';
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  chipLabel: {
    color: tokens.color.text.secondary,
  },
  chipLabelSelected: {
    color: tokens.color.text.onPrimary,
  },
  chipScroller: {
    marginHorizontal: -tokens.layout.screenPaddingPhone,
    paddingHorizontal: tokens.layout.screenPaddingPhone,
  },
  chipSelected: {
    backgroundColor: tokens.color.primary[600],
    borderColor: tokens.color.primary[600],
  },
  content: {
    paddingBottom: tokens.space[10],
    paddingTop: tokens.space[6],
  },
  dayGroupSpacing: {
    marginTop: tokens.space[5],
  },
  compactActionButton: {
    minHeight: 32,
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1],
  },
  compactActions: {
    marginLeft: -tokens.space[2],
    marginTop: tokens.space[1],
  },
  deleteConfirmCard: {
    marginTop: tokens.space[2],
    padding: tokens.space[3],
  },
  eventIconColumn: {
    alignItems: 'center',
    paddingTop: tokens.space[1],
    width: 24,
  },
  eventRow: {
    alignItems: 'flex-start',
    backgroundColor: tokens.color.surface.raised,
    borderBottomColor: tokens.color.stroke.dividerHairline,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
  },
  eventText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  eventTime: {
    fontVariant: ['tabular-nums'],
  },
  eventTimeColumn: {
    paddingTop: tokens.space[1],
    width: 48,
  },
  eventTitle: {
    flex: 1,
    minWidth: 0,
  },
  navButton: {
    paddingHorizontal: 0,
  },
  overflowButton: {
    minHeight: 32,
    minWidth: 32,
  },
  statusGlyph: {
    color: tokens.color.pill.confirmed.text,
    lineHeight: tokens.component.pill.icon,
  },
  sectionCaption: {
    color: tokens.color.text.tertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
});
