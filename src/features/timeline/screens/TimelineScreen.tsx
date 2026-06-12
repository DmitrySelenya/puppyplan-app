import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import type { EventType } from '@/contracts/supabase';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { SegmentedControl } from '@/design/primitives/SegmentedControl';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
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
        <Stack
          align="flex-start"
          direction="horizontal"
          gap="sm"
          justify="space-between"
          wrap>
          <AppText
            style={styles.title}
            variant="title">
            {t('timeline.title')}
          </AppText>
          <Button
            label={t('timeline.close')}
            labelMaxFontSizeMultiplier={2}
            labelVariant="label"
            onPress={onClose}
            style={styles.closeButton}
            variant="tertiary"
          />
        </Stack>
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
      <Stack
        align="flex-start"
          direction="horizontal"
          gap="sm"
          justify="space-between"
          wrap>
        <AppText
          style={styles.title}
          variant="title">
          {t('timeline.title')}
        </AppText>
        <Button
          label={t('timeline.close')}
          labelMaxFontSizeMultiplier={2}
          labelVariant="label"
          onPress={onClose}
          style={styles.closeButton}
          variant="tertiary"
        />
      </Stack>
      <TimelineFilterChips
        options={filterOptions}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
        t={t}
      />
      {eventViews.length > 0 ? (
        <Stack gap="sm">
          {eventViews.map((event) => (
            <TimelineQuickLogEventRow
              actions={actions}
              event={event}
              key={event.clientEventId}
            />
          ))}
        </Stack>
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
    <SegmentedControl
      accessibilityLabel={t('timeline.title')}
      onValueChange={setSelectedFilter}
      options={options}
      value={selectedFilter}
    />
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
    <Card>
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
        </Stack>
        {event.status === 'failed' && (onRetry !== undefined || onDelete !== undefined) ? (
          <Stack direction="horizontal" gap="sm" wrap>
            {onRetry !== undefined ? (
              <Button
                label={t('quick-log.failed.primary')}
                onPress={() => {
                  onRetry(event.clientEventId, 'manual_retry', 'timeline');
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
        {event.status === 'synced' && ((onEdit !== undefined && editRequest !== null) || onDelete !== undefined) ? (
          <Stack direction="horizontal" gap="sm" wrap>
            {onEdit !== undefined && editRequest !== null ? (
              <Button
                label={t('timeline.overflow-actions.0')}
                onPress={() => {
                  onEdit(editRequest);
                }}
                variant="secondary"
              />
            ) : null}
            {onDelete !== undefined ? (
              <Button
                label={t('timeline.overflow-actions.1')}
                onPress={() => {
                  onDelete(createQuickLogDeleteRequest(event));
                }}
                variant="tertiary"
              />
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Card>
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

const styles = StyleSheet.create({
  closeButton: {
    alignSelf: 'flex-start',
  },
  content: {
    paddingBottom: tokens.space[10],
  },
  eventText: {
    flexShrink: 1,
    minWidth: 0,
  },
  statusPill: {
    alignSelf: 'flex-start',
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
  },
});
