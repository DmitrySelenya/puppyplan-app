import type { ReactElement } from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { createPuppyPlanQueryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import { useQuickLogCachedRows } from '@/lib/query/useQuickLogCachedRows';

const householdId = '00000000-0000-4000-8000-000000001801';
const puppyId = '00000000-0000-4000-8000-000000001802';
const createdBy = '00000000-0000-4000-8000-000000001803';
const todayDate = '2026-05-27';
const careContext = {
  authState: 'authenticated',
  householdId,
  householdRole: 'owner',
  puppyId,
  todayDate,
  userId: createdBy,
} as const;
const testQueryClients: ReturnType<typeof createPuppyPlanQueryClient>[] = [];

function renderWithQuery(element: ReactElement) {
  const queryClient = createPuppyPlanQueryClient();
  testQueryClients.push(queryClient);

  const view = render(
    <QueryClientProvider client={queryClient}>
      {element}
    </QueryClientProvider>,
  );

  return {
    queryClient,
    ...view,
  };
}

describe('useQuickLogCachedRows', () => {
  afterEach(() => {
    cleanup();
    for (const queryClient of testQueryClients) {
      queryClient.clear();
    }

    testQueryClients.length = 0;
  });

  it('does not rerender for unrelated query cache updates', () => {
    let renderCount = 0;
    let observedRows: readonly QuickLogCachedEventRow[] = [];

    function RowsProbe() {
      renderCount += 1;
      observedRows = useQuickLogCachedRows(careContext);

      return null;
    }

    const { queryClient } = renderWithQuery(<RowsProbe />);

    expect(renderCount).toBe(1);

    act(() => {
      queryClient.setQueryData(['unrelated'], ['value']);
    });

    expect(renderCount).toBe(1);

    act(() => {
      queryClient.setQueryData(queryKeys.events.timelineRoot(householdId, puppyId), [
        createRow(),
      ]);
    });

    expect(renderCount).toBe(2);
    expect(observedRows).toHaveLength(1);
  });

  it('includes rows from filtered timeline queries under the same root', () => {
    let observedRows: readonly QuickLogCachedEventRow[] = [];

    function RowsProbe() {
      observedRows = useQuickLogCachedRows(careContext);

      return null;
    }

    const { queryClient } = renderWithQuery(<RowsProbe />);
    const durableRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001806',
      id: '00000000-0000-4000-8000-000000001807',
    });

    act(() => {
      queryClient.setQueryData(
        queryKeys.events.timeline(householdId, puppyId, {
          from: todayDate,
          to: todayDate,
        }),
        [durableRow],
      );
    });

    expect(observedRows.map((row) => row.client_event_id)).toEqual([
      durableRow.client_event_id,
    ]);
  });

  it('AC-P3-ACTOR-5 synchronously excludes every foreign-actor local state while retaining shared durable and current-actor local rows', () => {
    const foreignActorId = '00000000-0000-4000-8000-000000001808';
    const localStates = [
      'pending_local',
      'sending',
      'server_confirmed',
      'failed_retryable',
      'failed_permanent',
      'deleted_before_sync',
    ] as const;
    const foreignLocalRows = localStates.map((state, index) => createRow({
      client_event_id: `evt_foreign_local_${state}`,
      created_by: foreignActorId,
      id: `00000000-0000-4000-8000-${String(1810 + index).padStart(12, '0')}`,
      localSync: {
        state,
        category: state === 'deleted_before_sync' ? 'network_unavailable' : null,
        retryCount: index,
      },
      occurred_at: `2026-05-27T07:00:0${index}.000Z`,
    }));
    const sharedDurableRow = createRow({
      client_event_id: 'evt_shared_durable_actor_a',
      created_by: foreignActorId,
      id: '00000000-0000-4000-8000-000000001816',
      occurred_at: '2026-05-27T09:00:00.000Z',
    });
    const currentActorLocalRow = createRow({
      client_event_id: 'evt_current_actor_local',
      id: '00000000-0000-4000-8000-000000001817',
      localSync: {
        state: 'failed_retryable',
        category: 'request_timeout',
        retryCount: 1,
      },
      occurred_at: '2026-05-27T10:00:00.000Z',
    });
    const queryClient = createPuppyPlanQueryClient();
    let observedRows: readonly QuickLogCachedEventRow[] = [];

    queryClient.setQueryData(queryKeys.events.timelineRoot(householdId, puppyId), [
      ...foreignLocalRows,
      sharedDurableRow,
      currentActorLocalRow,
    ]);

    function RowsProbe() {
      observedRows = useQuickLogCachedRows(careContext);

      return null;
    }

    renderWithQueryClient(<RowsProbe />, queryClient);

    expect(observedRows.map((row) => row.client_event_id)).toEqual([
      currentActorLocalRow.client_event_id,
      sharedDurableRow.client_event_id,
    ]);
  });

  it('does not resubscribe to the query cache on unrelated parent rerenders', () => {
    let renderCount = 0;

    function RowsProbe() {
      renderCount += 1;
      useQuickLogCachedRows(careContext);

      return null;
    }

    const queryClient = createPuppyPlanQueryClient();
    testQueryClients.push(queryClient);
    const subscribeSpy = jest.spyOn(queryClient.getQueryCache(), 'subscribe');
    const view = render(
      <QueryClientProvider client={queryClient}>
        <RowsProbe />
      </QueryClientProvider>,
    );

    expect(renderCount).toBe(1);
    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <RowsProbe />
      </QueryClientProvider>,
    );

    expect(renderCount).toBe(2);
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });
});

function renderWithQueryClient(
  element: ReactElement,
  queryClient: ReturnType<typeof createPuppyPlanQueryClient>,
) {
  testQueryClients.push(queryClient);

  return render(
    <QueryClientProvider client={queryClient}>
      {element}
    </QueryClientProvider>,
  );
}

function createRow(overrides: Partial<QuickLogCachedEventRow> = {}): QuickLogCachedEventRow {
  return {
    id: '00000000-0000-4000-8000-000000001804',
    household_id: householdId,
    puppy_id: puppyId,
    created_by: createdBy,
    client_event_id: 'evt_00000000-0000-4000-8000-000000001805',
    event_type: 'feeding',
    occurred_at: '2026-05-27T08:00:00.000Z',
    payload_version: 1,
    payload: {
      amount: 'meal',
    },
    version: 1,
    deleted_at: null,
    created_at: '2026-05-27T08:00:01.000Z',
    updated_at: '2026-05-27T08:00:01.000Z',
    ...overrides,
  };
}
