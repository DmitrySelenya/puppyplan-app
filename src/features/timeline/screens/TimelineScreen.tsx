import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Screen } from '@/design/primitives/Screen';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
import { useAppTranslation } from '@/lib/i18n';
import {
  createQuickLogEventView,
  createQuickLogUndoRequest,
  type QuickLogEventActionHandlers,
  type QuickLogEventView,
  type QuickLogSurfaceCareContext,
} from '@/lib/query/quick-log-event-view';
import { useQuickLogCachedRows } from '@/lib/query/useQuickLogCachedRows';

export type TimelineScreenProps = Readonly<{
  actions?: QuickLogEventActionHandlers;
  careContext?: QuickLogSurfaceCareContext | null;
  onClose: () => void;
}>;

const emptyActions: QuickLogEventActionHandlers = {};

export function TimelineScreen({
  actions = emptyActions,
  careContext = null,
  onClose,
}: TimelineScreenProps) {
  const { locale, t } = useAppTranslation();
  const rows = useQuickLogCachedRows(careContext);

  if (careContext === null) {
    return (
      <Screen>
        <Stack
          align="center"
          direction="horizontal"
          justify="space-between">
          <AppText variant="title">{t('timeline.title')}</AppText>
          <Button
            label={t('timeline.close')}
            onPress={onClose}
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
    <Screen>
      <Stack
        align="center"
        direction="horizontal"
        justify="space-between">
        <AppText variant="title">{t('timeline.title')}</AppText>
        <Button
          label={t('timeline.close')}
          onPress={onClose}
          variant="tertiary"
        />
      </Stack>
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
      ) : (
        <Card>
          <AppText tone="secondary">{t('timeline.empty')}</AppText>
        </Card>
      )}
    </Screen>
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
                  onRetry(event.clientEventId);
                }}
                variant="secondary"
              />
            ) : null}
            {onDelete !== undefined ? (
              <Button
                label={t('quick-log.failed.tertiary')}
                onPress={() => {
                  onDelete(event.clientEventId);
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
                  onDelete(event.clientEventId);
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
