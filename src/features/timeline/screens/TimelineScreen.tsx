import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { EventType } from '@/contracts/supabase';
import { AppText } from '@/design/primitives/AppText';
import { AppIcon } from '@/design/primitives/AppIcon';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';
import { useAppTranslation, type AppTranslate, type I18nKey } from '@/lib/i18n';
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

  const eventViews = rows.flatMap((row) => {
    const event = createQuickLogEventView(row, {
      locale,
      t,
      todayDate: careContext.todayDate,
    });

    return event === null ? [] : [event];
  });

  return (
    <Screen contentStyle={styles.content}>
      <TimelineHeader onClose={onClose} />
      <TimelineFilterChips
        options={filterOptions}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
        t={t}
      />
      {eventViews.length > 0 ? (
        <View style={styles.timelineList}>
          {eventViews.map((event) => (
            <TimelineQuickLogEventRow
              actions={actions}
              event={event}
              key={event.clientEventId}
            />
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
  const editRequest = createQuickLogEditRequest(event);

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
          name={eventIcon(event.title)}
          size={22}
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
        </Stack>
        <AppText
          maxFontSizeMultiplier={1.4}
          numberOfLines={1}
          tone="tertiary"
          variant="footnote">
          {t('timeline.row-meta-template', {
            actor: event.actorLabel,
            time: event.occurredAtLabel,
          })}
        </AppText>
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
        {event.status === 'pending' && (onUndo !== undefined || onDelete !== undefined) ? (
          <>
            {onUndo !== undefined ? (
              <Button
                label={t('quick-log.snackbar.undo')}
                labelMaxFontSizeMultiplier={1.2}
                labelVariant="footnote"
                onPress={() => {
                  onUndo(createQuickLogUndoRequest(event));
                }}
                style={styles.compactActionButton}
                variant="tertiary"
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
        {event.status === 'synced' && ((onEdit !== undefined && editRequest !== null) || onDelete !== undefined) ? (
          <>
            {onEdit !== undefined && editRequest !== null ? (
              <Button
                label={t('timeline.overflow-actions.0')}
                labelMaxFontSizeMultiplier={1.2}
                labelVariant="footnote"
                onPress={() => {
                  onEdit(editRequest);
                }}
                style={styles.compactActionButton}
                variant="secondary"
              />
            ) : null}
            {onDelete !== undefined ? (
              <Button
                label={t('timeline.overflow-actions.1')}
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
      </Stack>
    </View>
  );
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

function eventIcon(title: string): 'bowl' | 'moon' | 'poop' | 'spark' | 'today' | 'water' {
  const normalized = title.toLowerCase();

  if (normalized.includes('feed') || normalized.includes('food') || normalized.includes('корм')) {
    return 'bowl';
  }

  if (normalized.includes('sleep') || normalized.includes('nap') || normalized.includes('сон')) {
    return 'moon';
  }

  if (normalized.includes('zoom')) {
    return 'spark';
  }

  if (normalized.includes('poop') || normalized.includes('potty') || normalized.includes('pee')) {
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
  closeButton: {
    alignSelf: 'flex-start',
  },
  content: {
    paddingBottom: tokens.space[10],
    paddingTop: tokens.space[2],
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
  statusGlyph: {
    color: tokens.color.pill.confirmed.text,
    lineHeight: tokens.component.pill.icon,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  timelineList: {
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
  },
});
