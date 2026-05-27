import { QueryClient } from '@tanstack/react-query';

export const PUPPYPLAN_QUERY_STALE_TIME_MS = 30_000;
export const PUPPYPLAN_QUERY_GC_TIME_MS = 30 * 60_000;

export function createPuppyPlanQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: PUPPYPLAN_QUERY_STALE_TIME_MS,
        gcTime: PUPPYPLAN_QUERY_GC_TIME_MS,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
