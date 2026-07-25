import {
  createPuppyPlanQueryClient,
  PUPPYPLAN_QUERY_GC_TIME_MS,
} from '@/lib/query/client';

describe('PuppyPlan query client lifecycle', () => {
  it('disables both query and mutation garbage-collection timers in tests', () => {
    const queryClient = createPuppyPlanQueryClient();
    const defaults = queryClient.getDefaultOptions();

    expect(PUPPYPLAN_QUERY_GC_TIME_MS).toBe(30 * 60_000);
    expect(defaults.queries?.gcTime).toBe(Infinity);
    expect(defaults.mutations?.gcTime).toBe(Infinity);

    queryClient.clear();
  });
});
