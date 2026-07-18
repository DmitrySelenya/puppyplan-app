import type { ReactElement } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react-native';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';

import { createPuppyPlanQueryClient } from '@/lib/query/client';
import { queryKeys, type TimelineFilters } from '@/lib/query/keys';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import { useQuickLogTimelineRows } from '@/lib/query/useQuickLogTimelineRows';

const mockListEvents = jest.fn();

jest.mock('@/lib/supabase/events', () => ({
  ...jest.requireActual('@/lib/supabase/events'),
  createSupabaseEventLogRepository: () => ({
    listEvents: mockListEvents,
  }),
}));

const householdId = '00000000-0000-4000-8000-000000001901';
const puppyId = '00000000-0000-4000-8000-000000001902';
const createdBy = '00000000-0000-4000-8000-000000001903';
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

function renderWithQuery(
  element: ReactElement,
  queryClient: QueryClient = createPuppyPlanQueryClient(),
) {
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

describe('useQuickLogTimelineRows', () => {
  beforeEach(() => {
    mockListEvents.mockReset();
    mockListEvents.mockResolvedValue([createRow()]);
  });

  afterEach(() => {
    cleanup();
    for (const queryClient of testQueryClients) {
      queryClient.clear();
    }

    testQueryClients.length = 0;
  });

  it('fetches durable rows through the Supabase event repository with timeline filters', async () => {
    let observedRows: readonly QuickLogCachedEventRow[] = [];
    let observedStatus = '';

    function RowsProbe() {
      const result = useQuickLogTimelineRows(careContext, {
        from: todayDate,
        to: todayDate,
      });
      observedRows = result.rows;
      observedStatus = result.status;

      return null;
    }

    renderWithQuery(<RowsProbe />);

    await waitFor(() => {
      expect(observedRows).toHaveLength(1);
    });
    expect(observedStatus).toBe('ready');
    expect(mockListEvents).toHaveBeenCalledWith({
      filters: {
        from: todayDate,
        to: todayDate,
      },
      householdId,
      puppyId,
    });
  });

  it('stays unavailable and does not fetch when care context is missing', () => {
    let observedRows: readonly QuickLogCachedEventRow[] = [];
    let observedStatus = '';

    function RowsProbe() {
      const result = useQuickLogTimelineRows(null);
      observedRows = result.rows;
      observedStatus = result.status;

      return null;
    }

    renderWithQuery(<RowsProbe />);

    expect(observedRows).toEqual([]);
    expect(observedStatus).toBe('unavailable');
    expect(mockListEvents).not.toHaveBeenCalled();
  });

  it('reports loading before the first durable Timeline fetch resolves', () => {
    let observedRows: readonly QuickLogCachedEventRow[] = [];
    let observedStatus = '';

    mockListEvents.mockReturnValue(new Promise<readonly QuickLogCachedEventRow[]>(() => {}));

    function RowsProbe() {
      const result = useQuickLogTimelineRows(careContext);
      observedRows = result.rows;
      observedStatus = result.status;

      return null;
    }

    renderWithQuery(<RowsProbe />);

    expect(observedRows).toEqual([]);
    expect(observedStatus).toBe('loading');
  });

  it('AC-P3-ACTOR-5 synchronously filters a foreign local row already stored as query data', () => {
    const foreignActorId = '00000000-0000-4000-8000-000000001910';
    const foreignDelete = createRow({
      client_event_id: 'evt_foreign_private_delete',
      created_by: foreignActorId,
      event_type: 'observation',
      id: '00000000-0000-4000-8000-000000001911',
      localSync: {
        state: 'deleted_before_sync',
        category: 'network_unavailable',
        retryCount: 2,
      },
      payload_version: 2,
      payload: {
        title: 'Synthetic actor A private title',
        note: 'Synthetic actor A private note',
      },
    });
    const sharedDurableRow = createRow({
      client_event_id: 'evt_shared_durable_actor_a',
      created_by: foreignActorId,
      id: '00000000-0000-4000-8000-000000001912',
    });
    const currentActorLocalRow = createRow({
      client_event_id: 'evt_current_actor_local',
      id: '00000000-0000-4000-8000-000000001913',
      localSync: {
        state: 'pending_local',
        category: null,
        retryCount: 0,
      },
    });
    const queryClient = createPuppyPlanQueryClient();
    let observedRows: readonly QuickLogCachedEventRow[] = [];

    queryClient.setQueryData(queryKeys.events.timeline(householdId, puppyId), [
      foreignDelete,
      sharedDurableRow,
      currentActorLocalRow,
    ]);

    function RowsProbe() {
      observedRows = useQuickLogTimelineRows(careContext).rows;

      return null;
    }

    renderWithQuery(<RowsProbe />, queryClient);

    expect(observedRows).toEqual([sharedDurableRow, currentActorLocalRow]);
    expect(mockListEvents).not.toHaveBeenCalled();
  });

  it('keeps merged local recovery rows sorted by newest occurrence first', async () => {
    const queryClient = createPuppyPlanQueryClient();
    const localRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001906',
      id: '00000000-0000-4000-8000-000000001907',
      localSync: {
        state: 'failed_retryable',
        category: 'request_timeout',
        retryCount: 1,
      },
      occurred_at: '2026-05-27T08:00:00.000Z',
    });
    const durableRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001908',
      id: '00000000-0000-4000-8000-000000001909',
      occurred_at: '2026-05-27T09:00:00.000Z',
    });
    let observedRows: readonly QuickLogCachedEventRow[] = [];
    let observedStatus = '';

    queryClient.setQueryData(queryKeys.events.timeline(householdId, puppyId), [localRow], {
      updatedAt: 0,
    });
    mockListEvents.mockResolvedValue([durableRow]);

    function RowsProbe() {
      observedRows = useQuickLogTimelineRows(careContext).rows;

      return null;
    }

    renderWithQuery(<RowsProbe />, queryClient);

    await waitFor(() => {
      expect(observedRows.map((row) => row.client_event_id)).toEqual([
        durableRow.client_event_id,
        localRow.client_event_id,
      ]);
    });
  });

  it('AC-P1-RECOVERY-10 keeps a durable refetch from resurrecting a retained delete intent', async () => {
    const queryClient = createPuppyPlanQueryClient();
    const durableRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001930',
      id: '00000000-0000-4000-8000-000000001931',
    });
    const retainedDelete = createRow({
      ...durableRow,
      localSync: {
        state: 'deleted_before_sync',
        category: 'network_unavailable',
        retryCount: 1,
      },
      updated_at: '2026-05-27T08:00:02.000Z',
    });
    let observedRows: readonly QuickLogCachedEventRow[] = [];
    let observedStatus = '';

    queryClient.setQueryData(
      queryKeys.events.timeline(householdId, puppyId),
      [retainedDelete],
      { updatedAt: 0 },
    );
    mockListEvents.mockResolvedValue([durableRow]);

    function RowsProbe() {
      const result = useQuickLogTimelineRows(careContext, {
        from: todayDate,
        to: todayDate,
      });
      observedRows = result.rows;
      observedStatus = result.status;

      return null;
    }

    renderWithQuery(<RowsProbe />, queryClient);

    await waitFor(() => expect(observedStatus).toBe('ready'));
    expect(mockListEvents).toHaveBeenCalledTimes(1);
    expect(observedRows).toEqual([]);
    expect(queryClient.getQueryData<QuickLogCachedEventRow[]>(
      queryKeys.events.timeline(householdId, puppyId),
    )).toEqual([retainedDelete]);
  });

  it('matches local recovery rows against local calendar dates instead of UTC prefixes', async () => {
    const queryClient = createPuppyPlanQueryClient();
    const occurredAt = '2026-05-26T22:30:00.000Z';
    const localOccurredDate = formatTestLocalCalendarDate(occurredAt);
    const localRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001916',
      id: '00000000-0000-4000-8000-000000001917',
      localSync: {
        state: 'pending_local',
        category: null,
        retryCount: 0,
      },
      occurred_at: occurredAt,
    });
    let observedRows: readonly QuickLogCachedEventRow[] = [];

    queryClient.setQueryData(queryKeys.events.timeline(householdId, puppyId), [localRow], {
      updatedAt: 0,
    });
    mockListEvents.mockResolvedValue([]);

    function RowsProbe() {
      observedRows = useQuickLogTimelineRows(careContext, {
        from: localOccurredDate,
        to: localOccurredDate,
      }).rows;

      return null;
    }

    renderWithQuery(<RowsProbe />, queryClient);

    await waitFor(() => {
      expect(observedRows.map((row) => row.client_event_id)).toEqual([
        localRow.client_event_id,
      ]);
    });
  });

  it('dedupes cached local recovery rows by freshest row timestamps', async () => {
    const queryClient = createPuppyPlanQueryClient();
    const staleRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001926',
      id: '00000000-0000-4000-8000-000000001927',
      localSync: {
        state: 'failed_retryable',
        category: 'request_timeout',
        retryCount: 1,
      },
      updated_at: '2026-05-27T08:00:01.000Z',
    });
    const freshRow = createRow({
      client_event_id: staleRow.client_event_id,
      id: '00000000-0000-4000-8000-000000001928',
      localSync: {
        state: 'failed_retryable',
        category: 'request_timeout',
        retryCount: 2,
      },
      updated_at: '2026-05-27T08:00:02.000Z',
    });
    let observedRows: readonly QuickLogCachedEventRow[] = [];

    queryClient.setQueryData(
      queryKeys.events.timeline(householdId, puppyId, {
        from: todayDate,
      }),
      [freshRow],
    );
    queryClient.setQueryData(queryKeys.events.timeline(householdId, puppyId), [staleRow]);
    mockListEvents.mockResolvedValue([]);

    function RowsProbe() {
      observedRows = useQuickLogTimelineRows(careContext, {
        to: todayDate,
      }).rows;

      return null;
    }

    renderWithQuery(<RowsProbe />, queryClient);

    await waitFor(() => {
      expect(observedRows[0]?.id).toBe(freshRow.id);
    });
    expect(observedRows).toHaveLength(1);
    expect(observedRows[0]?.localSync?.retryCount).toBe(2);
  });

  it('uses a stable query key for equivalent empty filter objects', () => {
    const filters: TimelineFilters = {};
    let renderCount = 0;

    function RowsProbe() {
      renderCount += 1;
      useQuickLogTimelineRows(careContext, filters);

      return null;
    }

    const view = renderWithQuery(<RowsProbe />);

    view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RowsProbe />
      </QueryClientProvider>,
    );

    expect(renderCount).toBe(2);
    expect(mockListEvents).toHaveBeenCalledTimes(1);
  });
});

function createRow(
  overrides: Partial<QuickLogCachedEventRow> = {},
): QuickLogCachedEventRow {
  return {
    id: '00000000-0000-4000-8000-000000001904',
    household_id: householdId,
    puppy_id: puppyId,
    created_by: createdBy,
    client_event_id: 'evt_00000000-0000-4000-8000-000000001905',
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

function formatTestLocalCalendarDate(timestamp: string): string {
  const date = new Date(timestamp);

  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
