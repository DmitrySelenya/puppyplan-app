import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

import type { QuickLogSurfaceCareContext } from './quick-log-event-view';
import type { QuickLogCachedEventRow } from './quick-log';
import { queryKeys } from './keys';

const emptyRows: readonly QuickLogCachedEventRow[] = [];

export function useQuickLogCachedRows(
  careContext: QuickLogSurfaceCareContext | null,
): readonly QuickLogCachedEventRow[] {
  const queryClient = useQueryClient();
  const householdId = careContext?.householdId ?? null;
  const puppyId = careContext?.puppyId ?? null;
  const queryKey = useMemo<QueryKey | null>(() => {
    if (householdId === null || puppyId === null) {
      return null;
    }

    return queryKeys.events.timelineRoot(householdId, puppyId);
  }, [householdId, puppyId]);
  const snapshotReader = useMemo(() => {
    if (queryKey === null) {
      return null;
    }

    return createCachedRowsSnapshotReader(queryClient, queryKey);
  }, [queryClient, queryKey]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (queryKey === null) {
        return () => undefined;
      }

      return queryClient.getQueryCache().subscribe((event) => {
        if (isQueryCacheEventForKey(event, queryKey)) {
          onStoreChange();
        }
      });
    },
    [queryClient, queryKey],
  );

  const getSnapshot = useCallback(() => {
    if (snapshotReader === null) {
      return emptyRows;
    }

    return snapshotReader();
  }, [snapshotReader]);

  return useSyncExternalStore(subscribe, getSnapshot, getEmptyRowsSnapshot);
}

function getEmptyRowsSnapshot(): readonly QuickLogCachedEventRow[] {
  return emptyRows;
}

function createCachedRowsSnapshotReader(
  queryClient: QueryClient,
  timelineRootKey: QueryKey,
): () => readonly QuickLogCachedEventRow[] {
  let previousSignature = '';
  let previousRows: readonly QuickLogCachedEventRow[] = emptyRows;

  return () => {
    const rows = getCachedRowsForTimelineRoot(queryClient, timelineRootKey);

    if (rows.length === 0) {
      previousSignature = '';
      previousRows = emptyRows;

      return emptyRows;
    }

    const signature = createRowsSignature(rows);

    if (signature === previousSignature) {
      return previousRows;
    }

    previousSignature = signature;
    previousRows = rows;

    return rows;
  };
}

function getCachedRowsForTimelineRoot(
  queryClient: QueryClient,
  timelineRootKey: QueryKey,
): readonly QuickLogCachedEventRow[] {
  const matchingQueries = queryClient.getQueriesData<readonly QuickLogCachedEventRow[]>({
    exact: false,
    queryKey: timelineRootKey,
  });
  const rowsByClientEventId = new Map<string, QuickLogCachedEventRow>();

  for (const [, rows] of matchingQueries) {
    for (const row of rows ?? emptyRows) {
      const currentRow = rowsByClientEventId.get(row.client_event_id);

      if (
        currentRow === undefined
        || isPreferredCachedRowVersion(row, currentRow)
      ) {
        rowsByClientEventId.set(row.client_event_id, row);
      }
    }
  }

  return [...rowsByClientEventId.values()].sort(compareRowsByNewestFirst);
}

function isPreferredCachedRowVersion(
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

function compareRowsByNewestFirst(
  left: QuickLogCachedEventRow,
  right: QuickLogCachedEventRow,
): number {
  const leftOccurredAt = parseTimestampOrMin(left.occurred_at);
  const rightOccurredAt = parseTimestampOrMin(right.occurred_at);

  if (leftOccurredAt !== rightOccurredAt) {
    return rightOccurredAt - leftOccurredAt;
  }

  return right.id.localeCompare(left.id);
}

function parseTimestampOrMin(timestamp: string): number {
  const parsed = Date.parse(timestamp);

  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function createRowsSignature(rows: readonly QuickLogCachedEventRow[]): string {
  return rows.map((row) => [
    row.client_event_id,
    row.id,
    row.updated_at,
    row.created_at,
    row.deleted_at ?? '',
    row.localSync?.state ?? '',
    row.localSync?.category ?? '',
    row.localSync?.retryCount ?? '',
    row.occurred_at,
  ].join('|')).join('\n');
}

function isQueryCacheEventForKey(event: unknown, queryKey: QueryKey): boolean {
  const eventQueryKey = getEventQueryKey(event);

  if (eventQueryKey === null || eventQueryKey.length < queryKey.length) {
    return false;
  }

  return queryKey.every((part, index) => eventQueryKey[index] === part);
}

function getEventQueryKey(event: unknown): QueryKey | null {
  if (!isRecord(event)) {
    return null;
  }

  const query = event.query;

  if (!isRecord(query) || !Array.isArray(query.queryKey)) {
    return null;
  }

  return query.queryKey;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
