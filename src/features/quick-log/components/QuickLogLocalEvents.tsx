import { AppText } from '@/design/primitives/AppText';
import { Button } from '@/design/primitives/Button';
import { Card } from '@/design/primitives/Card';
import { Stack } from '@/design/primitives/Stack';
import { StatusPill } from '@/design/primitives/StatusPill';
import { useAppTranslation } from '@/lib/i18n';
import type { QuickLogQueueState } from '@/lib/queue';

import type { QuickLogUndoRequest } from '../useQuickLogSheetController';

export type QuickLogLocalEventView = Readonly<{
  clientEventId: string;
  eventType: QuickLogUndoRequest['eventType'];
  householdId: string;
  puppyId: string;
  state: Extract<QuickLogQueueState, 'pending_local' | 'sending' | 'failed_retryable' | 'failed_permanent'>;
  todayDate: string;
  trackerName: string;
}>;

export type QuickLogLocalEventsProps = Readonly<{
  events: readonly QuickLogLocalEventView[];
  onDelete: (clientEventId: string) => void;
  onRetry: (clientEventId: string) => void;
  onUndo: (request: QuickLogUndoRequest) => void;
}>;

export function QuickLogLocalEvents({
  events,
  onDelete,
  onRetry,
  onUndo,
}: QuickLogLocalEventsProps) {
  const { t } = useAppTranslation();

  if (events.length === 0) {
    return null;
  }

  return (
    <Stack gap="sm">
      {events.map((event) => {
        const failed = event.state === 'failed_retryable' || event.state === 'failed_permanent';

        return (
          <Card key={event.clientEventId}>
            <Stack gap="md">
              <Stack
                align="center"
                direction="horizontal"
                gap="sm"
                justify="space-between">
                <AppText variant="bodyEmph">{event.trackerName}</AppText>
                {failed ? (
                  <StatusPill
                    accessibilityLabel={t('quick-log.failed.pill')}
                    icon={<AppText accessibilityElementsHidden>!</AppText>}
                    label={t('quick-log.failed.pill')}
                    tone="failed"
                  />
                ) : (
                  <StatusPill
                    accessibilityLabel={t('quick-log.pending.label')}
                    icon={<AppText accessibilityElementsHidden>...</AppText>}
                    label={t('quick-log.pending.label')}
                    tone="pending"
                  />
                )}
              </Stack>
            {failed ? (
              <Stack direction="horizontal" gap="sm" wrap>
                <Button
                  label={t('quick-log.failed.primary')}
                  onPress={() => {
                    onRetry(event.clientEventId);
                  }}
                  variant="secondary"
                />
                <Button
                  label={t('quick-log.failed.tertiary')}
                  onPress={() => {
                    onDelete(event.clientEventId);
                  }}
                  variant="tertiary"
                />
              </Stack>
            ) : (
              <Stack direction="horizontal" gap="sm" wrap>
                <Button
                  label={t('quick-log.snackbar.undo')}
                  onPress={() => {
                    onUndo({
                      clientEventId: event.clientEventId,
                      eventType: event.eventType,
                      householdId: event.householdId,
                      puppyId: event.puppyId,
                      todayDate: event.todayDate,
                    });
                  }}
                  variant="tertiary"
                />
                <Button
                  label={t('quick-log.failed.tertiary')}
                  onPress={() => {
                    onDelete(event.clientEventId);
                  }}
                  variant="tertiary"
                />
              </Stack>
            )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
