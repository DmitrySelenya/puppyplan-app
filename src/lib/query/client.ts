import { QueryClient } from '@tanstack/react-query';

export const PUPPYPLAN_QUERY_STALE_TIME_MS = 30_000;
export const PUPPYPLAN_QUERY_GC_TIME_MS = 30 * 60_000;

export function createPuppyPlanQueryClient(): QueryClient {
  const gcTime = process.env.NODE_ENV === 'test'
    ? Infinity
    : PUPPYPLAN_QUERY_GC_TIME_MS;

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: PUPPYPLAN_QUERY_STALE_TIME_MS,
        gcTime,
        retry: false,
      },
      mutations: {
        gcTime,
        retry: false,
      },
    },
  });
}
