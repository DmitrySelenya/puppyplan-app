import { useMemo } from 'react';
import {
  useQueries,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';

import type { EventType } from '@/contracts/supabase';
import { createSupabaseEventLogRepository } from '@/lib/supabase/events';

import { queryKeys, type TimelineFilters } from './keys';
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
          const cachedRows = getCachedTimelineLocalRows(
            queryClient,
            timelineRootKey,
            normalizedFilters,
          );

          return mergeDurableRowsWithLocalRows(durableRows, cachedRows);
        },
        queryKey,
      },
    ];
  }, [householdId, normalizedFilters, puppyId, queryClient, queryKey, timelineRootKey]);
  const results = useQueries({ queries });
  const query = results[0];

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
      rows: query?.data ?? emptyRows,
      status: 'loading',
    };
  }

  if (query.isError) {
    return {
      error: query.error,
      rows: query.data ?? emptyRows,
      status: 'error',
    };
  }

  return {
    error: null,
    rows: query.data ?? emptyRows,
    status: 'ready',
  };
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

function mergeDurableRowsWithLocalRows(
  durableRows: readonly QuickLogCachedEventRow[],
  cachedRows: readonly QuickLogCachedEventRow[],
): readonly QuickLogCachedEventRow[] {
  const localRows = cachedRows.filter((row) => row.localSync !== undefined);

  if (localRows.length === 0) {
    return durableRows;
  }

  const durableClientEventIds = new Set(durableRows.map((row) => row.client_event_id));
  const durableIds = new Set(durableRows.map((row) => row.id));
  const missingLocalRows = localRows.filter(
    (row) => !durableClientEventIds.has(row.client_event_id) && !durableIds.has(row.id),
  );

  return [...missingLocalRows, ...durableRows].sort(compareRowsByNewestFirst);
}

function getCachedTimelineLocalRows(
  queryClient: QueryClient,
  timelineRootKey: QueryKey,
  filters: TimelineFilters,
): readonly QuickLogCachedEventRow[] {
  const matchingQueries = queryClient.getQueriesData<readonly QuickLogCachedEventRow[]>({
    exact: false,
    queryKey: timelineRootKey,
  });
  const localRowsByClientEventId = new Map<string, QuickLogCachedEventRow>();

  for (const [, rows] of matchingQueries) {
    for (const row of rows ?? emptyRows) {
      if (
        row.localSync !== undefined
        && rowMatchesTimelineFilters(row, filters)
      ) {
        const currentRow = localRowsByClientEventId.get(row.client_event_id);

        if (
          currentRow === undefined
          || isPreferredLocalRowVersion(row, currentRow)
        ) {
          localRowsByClientEventId.set(row.client_event_id, row);
        }
      }
    }
  }

  return [...localRowsByClientEventId.values()];
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

function formatLocalCalendarDate(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp.slice(0, 10);
  }

  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
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
