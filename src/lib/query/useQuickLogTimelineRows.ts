import { useMemo } from 'react';
import {
  useQueries,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';

import type { EventType } from '@/contracts/supabase';
import { formatLocalCalendarDate } from '@/lib/i18n/format-date';
import { createSupabaseEventLogRepository } from '@/lib/supabase/events';

import { queryKeys, type TimelineFilters } from './keys';
import {
  getQuickLogCareContextUserId,
  getQuickLogIntentOwner,
  isQuickLogRowVisibleToActor,
} from './quick-log-actor-visibility';
import type { QuickLogSurfaceCareContext } from './quick-log-event-view';
import type { QuickLogCachedEventRow } from './quick-log';

export type QuickLogTimelineRowsStatus = 'error' | 'loading' | 'ready' | 'unavailable';

export type QuickLogTimelineRowsResult = Readonly<{
  error: unknown;
  rows: readonly QuickLogCachedEventRow[];
  status: QuickLogTimelineRowsStatus;
}>;

type TimelineRowsQuery = Readonly<{
  queryFn: () => Promise<readonly QuickLogCachedEventRow[]>;
  queryKey: QueryKey;
}>;

const emptyRows: readonly QuickLogCachedEventRow[] = [];
const emptyFilters: TimelineFilters = {};

export function useQuickLogTimelineRows(
  careContext: QuickLogSurfaceCareContext | null,
  filters: TimelineFilters = emptyFilters,
): QuickLogTimelineRowsResult {
  const householdId = careContext?.householdId ?? null;
  const puppyId = careContext?.puppyId ?? null;
  const userId = getQuickLogCareContextUserId(careContext);
  const normalizedFilters = useNormalizedTimelineFilters(filters);
  const queryClient = useQueryClient();
  const queryKey = useMemo<QueryKey | null>(() => {
    if (householdId === null || puppyId === null) {
      return null;
    }

    return queryKeys.events.timeline(householdId, puppyId, normalizedFilters);
  }, [householdId, normalizedFilters, puppyId]);
  const timelineRootKey = useMemo<QueryKey | null>(() => {
    if (householdId === null || puppyId === null) {
      return null;
    }

    return queryKeys.events.timelineRoot(householdId, puppyId);
  }, [householdId, puppyId]);
  const queries = useMemo<TimelineRowsQuery[]>(() => {
    if (
      queryKey === null
      || timelineRootKey === null
      || householdId === null
      || puppyId === null
    ) {
      return [];
    }

    return [
      {
        queryFn: async (): Promise<readonly QuickLogCachedEventRow[]> => {
          const durableRows = await createSupabaseEventLogRepository().listEvents({
            filters: normalizedFilters,
            householdId,
            puppyId,
          });
          const cachedRows = getCachedTimelineRows(
            queryClient,
            timelineRootKey,
            normalizedFilters,
            userId,
          );
          const composedCachedRows = composeDurableRowsWithDeleteSentinels(
            queryClient,
            durableRows,
            cachedRows,
          );
          retainDeleteSentinelsInTimelineRoot(
            queryClient,
            timelineRootKey,
            queryKey,
            composedCachedRows,
            userId,
          );

          return mergeDurableRowsWithLocalRows(
            queryClient,
            durableRows,
            composedCachedRows,
            userId,
          );
        },
        queryKey,
      },
    ];
  }, [householdId, normalizedFilters, puppyId, queryClient, queryKey, timelineRootKey, userId]);
  const results = useQueries({ queries });
  const query = results[0];
  const actorVisibleQueryRows = filterRowsForActor(
    queryClient,
    query?.data ?? emptyRows,
    userId,
  );
  const visibleQueryRows = actorVisibleQueryRows.some((row) =>
    row.localSync?.state === 'deleted_before_sync')
    ? actorVisibleQueryRows.filter((row) => row.localSync?.state !== 'deleted_before_sync')
    : actorVisibleQueryRows;

  if (householdId === null || puppyId === null) {
    return {
      error: null,
      rows: emptyRows,
      status: 'unavailable',
    };
  }

  if (query === undefined || query.isLoading) {
    return {
      error: null,
      rows: visibleQueryRows,
      status: 'loading',
    };
  }

  if (query.isError) {
    return {
      error: query.error,
      rows: visibleQueryRows,
      status: 'error',
    };
  }

  return {
    error: null,
    rows: visibleQueryRows,
    status: 'ready',
  };
}

function retainDeleteSentinelsInTimelineRoot(
  queryClient: QueryClient,
  timelineRootKey: QueryKey,
  activeTimelineKey: QueryKey,
  cachedRows: readonly QuickLogCachedEventRow[],
  userId: string | null,
): void {
  const deleteSentinels = cachedRows.filter((row) =>
    row.localSync?.state === 'deleted_before_sync');
  if (deleteSentinels.length === 0) {
    return;
  }

  const deleteSentinelsByClientEventId = new Map(deleteSentinels.map((row) => [
    row.client_event_id,
    row,
  ]));
  const matchingQueries = queryClient.getQueriesData<QuickLogCachedEventRow[]>({
    exact: false,
    queryKey: timelineRootKey,
  });
  for (const [queryKey, rows] of matchingQueries) {
    if (rows === undefined || isSameTimelineQueryKey(queryKey, activeTimelineKey)) {
      continue;
    }

    let changed = false;
    const reconciledRows = rows.map((row) => {
      const sentinel = deleteSentinelsByClientEventId.get(row.client_event_id);
      if (
        sentinel === undefined
        || row.household_id !== sentinel.household_id
        || row.puppy_id !== sentinel.puppy_id
      ) {
        return row;
      }

      changed = true;
      return sentinel;
    });
    if (changed) {
      queryClient.setQueryData<QuickLogCachedEventRow[]>(queryKey, reconciledRows);
    }
  }

  queryClient.setQueryData<QuickLogCachedEventRow[]>(timelineRootKey, (previousRows = []) => {
    const retainedIds = new Set(deleteSentinels.map((row) => row.client_event_id));
    return [
      ...deleteSentinels,
      ...filterRowsForActor(queryClient, previousRows, userId)
        .filter((row) => !retainedIds.has(row.client_event_id)),
    ];
  });
}

function useNormalizedTimelineFilters(filters: TimelineFilters): TimelineFilters {
  return useMemo(() => {
    const normalized: {
      from?: string;
      to?: string;
      eventTypes?: EventType[];
      cursor?: string;
    } = {};

    if (isNonEmptyString(filters.from)) {
      normalized.from = filters.from;
    }

    if (isNonEmptyString(filters.to)) {
      normalized.to = filters.to;
    }

    if (filters.eventTypes !== undefined && filters.eventTypes.length > 0) {
      normalized.eventTypes = [...new Set(filters.eventTypes)].sort();
    }

    if (isNonEmptyString(filters.cursor)) {
      normalized.cursor = filters.cursor;
    }

    return normalized;
  }, [filters.cursor, filters.eventTypes, filters.from, filters.to]);
}

function isNonEmptyString(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}

function composeDurableRowsWithDeleteSentinels(
  queryClient: QueryClient,
  durableRows: readonly QuickLogCachedEventRow[],
  cachedRows: readonly QuickLogCachedEventRow[],
): readonly QuickLogCachedEventRow[] {
  const durableRowsByClientEventId = new Map(durableRows
    .filter((row) => row.localSync === undefined && row.deleted_at === null)
    .map((row) => [row.client_event_id, row]));
  let changed = false;
  const composedRows = cachedRows.map((row) => {
    if (row.localSync?.state !== 'deleted_before_sync') {
      return row;
    }

    const durableRow = durableRowsByClientEventId.get(row.client_event_id);
    if (
      durableRow === undefined
      || durableRow.created_by === getQuickLogIntentOwner(queryClient, row)
    ) {
      return row;
    }

    changed = true;
    return {
      ...durableRow,
      localSync: row.localSync,
    };
  });

  return changed ? composedRows : cachedRows;
}

function isSameTimelineQueryKey(left: QueryKey, right: QueryKey): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeDurableRowsWithLocalRows(
  queryClient: QueryClient,
  durableRows: readonly QuickLogCachedEventRow[],
  cachedRows: readonly QuickLogCachedEventRow[],
  userId: string | null,
): readonly QuickLogCachedEventRow[] {
  const visibleDurableRowsForActor = filterRowsForActor(queryClient, durableRows, userId);
  const visibleCachedRows = filterRowsForActor(queryClient, cachedRows, userId);
  const retainedDeleteClientEventIds = new Set(cachedRows
    .filter((row) => row.localSync?.state === 'deleted_before_sync')
    .map((row) => row.client_event_id));
  const visibleDurableRows = visibleDurableRowsForActor.filter((row) =>
    !retainedDeleteClientEventIds.has(row.client_event_id));

  if (visibleCachedRows.length === 0) {
    return visibleDurableRows;
  }

  const durableClientEventIds = new Set(visibleDurableRows.map((row) => row.client_event_id));
  const durableIds = new Set(visibleDurableRows.map((row) => row.id));
  const missingCachedRows = visibleCachedRows.filter(
    (row) => row.localSync?.state !== 'deleted_before_sync'
      && !durableClientEventIds.has(row.client_event_id) && !durableIds.has(row.id),
  );

  return [...missingCachedRows, ...visibleDurableRows].sort(compareRowsByNewestFirst);
}

function getCachedTimelineRows(
  queryClient: QueryClient,
  timelineRootKey: QueryKey,
  filters: TimelineFilters,
  userId: string | null,
): readonly QuickLogCachedEventRow[] {
  const matchingQueries = queryClient.getQueriesData<readonly QuickLogCachedEventRow[]>({
    exact: false,
    queryKey: timelineRootKey,
  });
  const rowsByClientEventId = new Map<string, QuickLogCachedEventRow>();

  for (const [, rows] of matchingQueries) {
    for (const row of rows ?? emptyRows) {
      if (
        (row.localSync?.state === 'deleted_before_sync'
          || isQuickLogRowVisibleToActor(queryClient, row, userId))
        && row.deleted_at === null
        && rowMatchesTimelineFilters(row, filters)
      ) {
        const currentRow = rowsByClientEventId.get(row.client_event_id);

        if (
          currentRow === undefined
          || isPreferredLocalRowVersion(row, currentRow)
        ) {
          rowsByClientEventId.set(row.client_event_id, row);
        }
      }
    }
  }

  return [...rowsByClientEventId.values()];
}

function filterRowsForActor(
  queryClient: QueryClient,
  rows: readonly QuickLogCachedEventRow[],
  userId: string | null,
): readonly QuickLogCachedEventRow[] {
  const visibleRows = rows.filter((row) =>
    isQuickLogRowVisibleToActor(queryClient, row, userId));

  return visibleRows.length === rows.length ? rows : visibleRows;
}

function isPreferredLocalRowVersion(
  candidate: QuickLogCachedEventRow,
  current: QuickLogCachedEventRow,
): boolean {
  const candidateUpdatedAt = parseTimestampOrMin(candidate.updated_at);
  const currentUpdatedAt = parseTimestampOrMin(current.updated_at);

  if (candidateUpdatedAt !== currentUpdatedAt) {
    return candidateUpdatedAt > currentUpdatedAt;
  }

  const candidateCreatedAt = parseTimestampOrMin(candidate.created_at);
  const currentCreatedAt = parseTimestampOrMin(current.created_at);

  if (candidateCreatedAt !== currentCreatedAt) {
    return candidateCreatedAt > currentCreatedAt;
  }

  return candidate.id.localeCompare(current.id) > 0;
}

function parseTimestampOrMin(timestamp: string): number {
  const parsed = Date.parse(timestamp);

  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function rowMatchesTimelineFilters(
  row: QuickLogCachedEventRow,
  filters: TimelineFilters,
): boolean {
  if (filters.cursor !== undefined) {
    return false;
  }

  if (
    filters.eventTypes !== undefined
    && !filters.eventTypes.includes(row.event_type)
  ) {
    return false;
  }

  const occurredDate = formatLocalCalendarDate(row.occurred_at);

  if (filters.from !== undefined && occurredDate < filters.from) {
    return false;
  }

  if (filters.to !== undefined && occurredDate > filters.to) {
    return false;
  }

  return true;
}

function compareRowsByNewestFirst(
  left: QuickLogCachedEventRow,
  right: QuickLogCachedEventRow,
): number {
  const occurredDelta = Date.parse(right.occurred_at) - Date.parse(left.occurred_at);

  if (occurredDelta !== 0) {
    return occurredDelta;
  }

  const createdDelta = Date.parse(right.created_at) - Date.parse(left.created_at);

  if (createdDelta !== 0) {
    return createdDelta;
  }

  return right.client_event_id.localeCompare(left.client_event_id);
}
