import type { ReactElement } from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';

import { TimelineScreen } from '@/features/timeline/screens/TimelineScreen';
import { i18n } from '@/lib/i18n';
import { createPuppyPlanQueryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';

const mockListEvents = jest.fn();

jest.mock('@/lib/supabase/events', () => ({
  ...jest.requireActual('@/lib/supabase/events'),
  createSupabaseEventLogRepository: () => ({
    listEvents: mockListEvents,
  }),
}));

const householdId = '00000000-0000-4000-8000-000000001601';
const puppyId = '00000000-0000-4000-8000-000000001602';
const createdBy = '00000000-0000-4000-8000-000000001603';
const todayDate = '2026-05-27';

const careContext = {
  authState: 'authenticated',
  householdId,
  householdRole: 'owner',
  puppyId,
  todayDate,
} as const;
const onClose = jest.fn();
const testQueryClients: ReturnType<typeof createPuppyPlanQueryClient>[] = [];

function timelineKey() {
  return queryKeys.events.timeline(householdId, puppyId);
}

function renderWithQuery(element: ReactElement) {
  const queryClient = createPuppyPlanQueryClient();
  testQueryClients.push(queryClient);

  const view = render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        {element}
      </QueryClientProvider>
    </I18nextProvider>,
  );

  return {
    queryClient,
    ...view,
  };
}

function createRow(
  overrides: Partial<QuickLogCachedEventRow> = {},
): QuickLogCachedEventRow {
  return {
    id: '00000000-0000-4000-8000-000000001604',
    household_id: householdId,
    puppy_id: puppyId,
    created_by: createdBy,
    client_event_id: 'evt_00000000-0000-4000-8000-000000001605',
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

describe('Timeline Quick Log state integration', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockListEvents.mockReset();
    mockListEvents.mockResolvedValue([]);
    onClose.mockClear();
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    reduceMotionProbe.mockRestore();
    for (const queryClient of testQueryClients) {
      queryClient.clear();
    }

    testQueryClients.length = 0;
  });

  it('renders a distinct unavailable state without creating fake event query keys', () => {
    const { queryClient } = renderWithQuery(
      <TimelineScreen
        careContext={null}
        onClose={onClose}
      />,
    );

    expect(screen.getByText(i18n.t('timeline.unavailable.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('timeline.unavailable.body'))).toBeTruthy();
    expect(queryClient.getQueryCache().findAll()).toHaveLength(0);
  });

  it('renders a minimal empty state without range or filter copy', () => {
    renderWithQuery(
      <TimelineScreen
        careContext={careContext}
        onClose={onClose}
      />,
    );

    expect(screen.getByText(i18n.t('timeline.empty'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('timeline.empty-filter'))).toBeNull();
  });

  it('renders pending rows with overflow-only Undo/Delete actions', async () => {
    const actions = {
      onDelete: jest.fn(),
      onRetry: jest.fn(),
      onUndo: jest.fn(),
    };
    const { queryClient } = renderWithQuery(
      <TimelineScreen
        actions={actions}
        careContext={careContext}
        onClose={onClose}
      />,
    );

    act(() => {
      queryClient.setQueryData(timelineKey(), [
        createRow({
          localSync: {
            state: 'pending_local',
            category: null,
            retryCount: 0,
          },
        }),
      ]);
    });

    expect(screen.getAllByText(i18n.t('timeline.title')).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    });
    expect(screen.getByText(i18n.t('timeline.pills.pending'))).toBeTruthy();
    expect(screen.getByText(i18n.t('timeline.filter-chips.0'))).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    })).toBeNull();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('timeline.more-actions'),
    }));

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    }));

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('timeline.more-actions'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    }));

    expect(actions.onUndo).toHaveBeenCalledWith(expect.objectContaining({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001605',
      eventType: 'feeding',
      householdId,
      puppyId,
      todayDate,
    }));
    expect(actions.onDelete).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001605',
      eventType: 'feeding',
      householdId,
      puppyId,
      status: 'pending',
      todayDate,
    });
  });

  it('renders failed rows with Retry/Delete and does not show raw technical errors', async () => {
    const actions = {
      onDelete: jest.fn(),
      onRetry: jest.fn(),
      onUndo: jest.fn(),
    };
    const { queryClient } = renderWithQuery(
      <TimelineScreen
        actions={actions}
        careContext={careContext}
        onClose={onClose}
      />,
    );

    act(() => {
      queryClient.setQueryData(timelineKey(), [
        createRow({
          localSync: {
            state: 'failed_permanent',
            category: 'server_5xx',
            retryCount: 4,
          },
        }),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('timeline.pills.failed'))).toBeTruthy();
    });
    expect(screen.queryByText(/server_5xx|HTTP 500/i)).toBeNull();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    }));

    expect(actions.onRetry).toHaveBeenCalledWith(
      'evt_00000000-0000-4000-8000-000000001605',
      'manual_retry',
      'timeline',
    );
    expect(actions.onDelete).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001605',
      eventType: 'feeding',
      householdId,
      puppyId,
      status: 'failed',
      todayDate,
    });
  });

  it('renders synced rows without non-synced status pills or local-only actions', async () => {
    mockListEvents.mockResolvedValue([createRow()]);
    const actions = {
      onDelete: jest.fn(),
      onRetry: jest.fn(),
      onUndo: jest.fn(),
    };
    const { queryClient, toJSON } = renderWithQuery(
      <TimelineScreen
        actions={actions}
        careContext={careContext}
        onClose={onClose}
      />,
    );

    act(() => {
      queryClient.setQueryData(timelineKey(), [
        createRow(),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('timeline.pills.synced'))).toBeNull();
    expect(screen.queryByText('OK')).toBeNull();
    expect(JSON.stringify(toJSON())).not.toContain('"OK"');
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toBeNull();
  });

  it('omits pending and failed action buttons when handlers are not wired', async () => {
    const { queryClient } = renderWithQuery(
      <TimelineScreen
        careContext={careContext}
        onClose={onClose}
      />,
    );

    act(() => {
      queryClient.setQueryData(timelineKey(), [
        createRow({
          localSync: {
            state: 'pending_local',
            category: null,
            retryCount: 0,
          },
        }),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('timeline.pills.pending'))).toBeTruthy();
    });
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    })).toBeNull();

    act(() => {
      queryClient.setQueryData(timelineKey(), [
        createRow({
          localSync: {
            state: 'failed_retryable',
            category: 'request_timeout',
            retryCount: 1,
          },
        }),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('timeline.pills.failed'))).toBeTruthy();
    });
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    })).toBeNull();
  });

  it('groups events under per-day section captions with their own grouped card', async () => {
    const todayWeekday = new Intl.DateTimeFormat('en', {
      timeZone: 'UTC',
      weekday: 'long',
    }).format(new Date(Date.UTC(2026, 4, 27)));
    const yesterdayWeekday = new Intl.DateTimeFormat('en', {
      timeZone: 'UTC',
      weekday: 'long',
    }).format(new Date(Date.UTC(2026, 4, 26)));
    mockListEvents.mockResolvedValue([
      createRow({
        client_event_id: 'evt_today',
        event_type: 'feeding',
        occurred_at: '2026-05-27T08:00:00.000Z',
      }),
      createRow({
        client_event_id: 'evt_yesterday',
        event_type: 'potty',
        id: '00000000-0000-4000-8000-000000001699',
        occurred_at: '2026-05-26T18:00:00.000Z',
        payload: { quick_action: 'pee_outside' },
      }),
    ]);

    renderWithQuery(
      <TimelineScreen
        careContext={careContext}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(i18n.t('timeline.section-today', { weekday: todayWeekday })),
      ).toBeTruthy();
    });
    expect(
      screen.getByText(i18n.t('timeline.section-yesterday', { weekday: yesterdayWeekday })),
    ).toBeTruthy();
    expect(
      screen.getByTestId('timeline-day-group-2026-05-27', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByTestId('timeline-day-group-2026-05-26', { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it('fetches durable timeline rows when Timeline opens with an empty cache', async () => {
    mockListEvents.mockResolvedValue([createRow()]);

    renderWithQuery(
      <TimelineScreen
        careContext={careContext}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    });
    expect(mockListEvents).toHaveBeenCalledWith({
      filters: {},
      householdId,
      puppyId,
    });
  });
});
