import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';

import { buildDiaryDayModel, type DiaryDayModel } from '@/contracts/diary-day';
import { toReminderForExpansion } from '@/lib/notifications/localReminderSync';

import type { QuickLogSurfaceCareContext } from './quick-log-event-view';
import type { QuickLogCachedEventRow } from './quick-log';
import { queryKeys } from './keys';
import { useRemindersQuery } from './reminders';
import { useQuickLogTimelineRows } from './useQuickLogTimelineRows';

export type DiaryDayQueryResult = Readonly<{
  model: DiaryDayModel | null;
  status: 'error' | 'loading' | 'ready' | 'unavailable';
}>;

export function useDiaryDayModel(
  careContext: QuickLogSurfaceCareContext | null,
  day: string | null,
  nowMs: number,
): DiaryDayQueryResult {
  const queryClient = useQueryClient();
  const remindersQuery = useRemindersQuery(
    careContext?.householdId,
    careContext?.puppyId,
  );
  const timeline = useQuickLogTimelineRows(
    careContext,
    day === null ? {} : { from: day, to: day },
  );
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const reminders = remindersQuery.data;
  const model = useMemo(() => {
    if (careContext === null || day === null || reminders === undefined) {
      return null;
    }

    const canonicalReminders = reminders.flatMap((reminder) => {
      const entry = toReminderForExpansion(reminder);
      return entry === null ? [] : [entry.expansion];
    });

    return buildDiaryDayModel({
      day,
      facts: timeline.rows.map(toDiaryDayFact),
      nowMs,
      reminders: canonicalReminders,
      timeZone,
    });
  }, [careContext, day, nowMs, reminders, timeZone, timeline.rows]);

  useEffect(() => {
    if (careContext === null) {
      return undefined;
    }

    const keys = createDiaryForegroundKeys(careContext.householdId, careContext.puppyId);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refetchDiaryKeys(queryClient, keys);
      }
    });

    return () => subscription.remove();
  }, [careContext, queryClient]);

  if (careContext === null || day === null) {
    return { model: null, status: 'unavailable' };
  }
  if (remindersQuery.isError || timeline.status === 'error') {
    return { model, status: 'error' };
  }
  if (remindersQuery.isLoading || timeline.status === 'loading') {
    return { model, status: 'loading' };
  }

  return { model, status: 'ready' };
}

export function createDiaryForegroundKeys(
  householdId: string,
  puppyId: string,
): readonly QueryKey[] {
  return [
    queryKeys.reminders.list(householdId, puppyId),
    queryKeys.events.timelineRoot(householdId, puppyId),
  ];
}

export async function refetchDiaryKeys(
  queryClient: Pick<QueryClient, 'invalidateQueries'>,
  keys: readonly QueryKey[],
): Promise<void> {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

function toDiaryDayFact(row: QuickLogCachedEventRow) {
  return {
    clientEventId: row.client_event_id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    payload: row.payload,
  };
}
