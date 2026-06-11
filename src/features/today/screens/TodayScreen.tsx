import { StyleSheet } from 'react-native';

import { shouldShowQuickLogFailedBanner } from '@/contracts/business-rules';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';
import {
  createQuickLogDeleteRequest,
  createQuickLogEventView,
  createQuickLogUndoRequest,
  type QuickLogEventActionHandlers,
  type QuickLogEventView,
  type QuickLogSurfaceCareContext,
} from '@/lib/query/quick-log-event-view';
import { useQuickLogTimelineRows } from '@/lib/query/useQuickLogTimelineRows';

export type TodayScreenProps = Readonly<{
  actions?: QuickLogEventActionHandlers;
  careContext?: QuickLogSurfaceCareContext | null;
  openOnboarding?: () => void;
  openTimeline: () => void;
}>;

const emptyActions: QuickLogEventActionHandlers = {};

export function TodayScreen({
  actions = emptyActions,
  careContext = null,
  openOnboarding,
  openTimeline,
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

  if (careContext === null) {
    return (
      <Screen>
        <AppText variant="title">{t('tabs.today')}</AppText>
        <Card>
          <Stack gap="sm">
            <AppText variant="headline">{t('today.quick-log.unavailable.title')}</AppText>
            <AppText tone="secondary">{t('today.quick-log.unavailable.body')}</AppText>
          </Stack>
        </Card>
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

  return (
    <Screen contentStyle={styles.content}>
      <AppText variant="title">{t('tabs.today')}</AppText>
      {shouldShowQuickLogFailedBanner(rows) ? (
        <Card>
          <AppText variant="headline">{t('quick-log.failed.persistent-banner')}</AppText>
        </Card>
      ) : null}
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
            {t('today.quick-log.section-title')}
          </AppText>
          <Button
            label={t('today.quick-log.timeline-entry')}
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
    </Screen>
  );
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
  const onRetry = actions.onRetry;
  const onUndo = actions.onUndo;

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
              {event.actorLabel} - {event.occurredAtLabel}
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
    paddingBottom: tokens.space[14] * 2 + tokens.space[4],
  },
  eventText: {
    flexShrink: 1,
    minWidth: 0,
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
});
