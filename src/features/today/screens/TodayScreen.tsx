import { shouldShowQuickLogFailedBanner } from '@/contracts/business-rules';
import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
import { useAppTranslation } from '@/lib/i18n';
import {
  createQuickLogDeleteRequest,
  createQuickLogEventView,
  createQuickLogUndoRequest,
  type QuickLogEventActionHandlers,
  type QuickLogEventView,
  type QuickLogSurfaceCareContext,
} from '@/lib/query/quick-log-event-view';
import { useQuickLogCachedRows } from '@/lib/query/useQuickLogCachedRows';

export type TodayScreenProps = Readonly<{
  actions?: QuickLogEventActionHandlers;
  careContext?: QuickLogSurfaceCareContext | null;
  openTimeline: () => void;
}>;

const emptyActions: QuickLogEventActionHandlers = {};

export function TodayScreen({
  actions = emptyActions,
  careContext = null,
  openTimeline,
}: TodayScreenProps) {
  const { locale, t } = useAppTranslation();
  const rows = useQuickLogCachedRows(careContext);

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
          label={t('today.quick-log.timeline-entry')}
          onPress={openTimeline}
          variant="secondary"
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
    <Screen>
      <AppText variant="title">{t('tabs.today')}</AppText>
      {shouldShowQuickLogFailedBanner(rows) ? (
        <Card>
          <AppText variant="headline">{t('quick-log.failed.persistent-banner')}</AppText>
        </Card>
      ) : null}
      <Stack gap="sm">
        <AppText variant="headline">{t('today.quick-log.section-title')}</AppText>
        {eventViews.length > 0 ? (
          eventViews.map((event) => (
            <TodayQuickLogEventRow
              actions={actions}
              event={event}
              key={event.clientEventId}
            />
          ))
        ) : (
          <Card>
            <Stack gap="sm">
              <AppText variant="bodyEmph">{t('today.quick-log.empty.title')}</AppText>
              <AppText tone="secondary">{t('today.quick-log.empty.body')}</AppText>
            </Stack>
          </Card>
        )}
      </Stack>
      <Button
        label={t('today.quick-log.timeline-entry')}
        onPress={openTimeline}
        variant="secondary"
      />
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
          justify="space-between">
          <Stack gap="xs">
            <AppText variant="bodyEmph">{event.title}</AppText>
            <AppText tone="secondary" variant="footnote">
              {event.actorLabel} - {event.occurredAtLabel}
            </AppText>
          </Stack>
          <StatusPill
            accessibilityLabel={event.statusLabel}
            icon={<AppText accessibilityElementsHidden>{statusIcon(event.status)}</AppText>}
            label={event.statusLabel}
            tone={statusTone(event.status)}
          />
        </Stack>
        {event.status === 'failed' && (onRetry !== undefined || onDelete !== undefined) ? (
          <Stack direction="horizontal" gap="sm" wrap>
            {onRetry !== undefined ? (
              <Button
                label={t('quick-log.failed.primary')}
                onPress={() => {
                  onRetry(event.clientEventId, 'manual_retry');
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
