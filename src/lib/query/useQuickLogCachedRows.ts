import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { QueryKey } from '@tanstack/react-query';
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
    if (queryKey === null) {
      return emptyRows;
    }

    return queryClient.getQueryData<readonly QuickLogCachedEventRow[]>(queryKey) ?? emptyRows;
  }, [queryClient, queryKey]);

  return useSyncExternalStore(subscribe, getSnapshot, getEmptyRowsSnapshot);
}

function getEmptyRowsSnapshot(): readonly QuickLogCachedEventRow[] {
  return emptyRows;
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
