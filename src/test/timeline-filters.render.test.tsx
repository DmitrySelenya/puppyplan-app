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

const householdId = '00000000-0000-4000-8000-000000004601';
const puppyId = '00000000-0000-4000-8000-000000004602';
const createdBy = '00000000-0000-4000-8000-000000004603';
const todayDate = '2026-06-12';
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

  return {
    queryClient,
    ...render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          {element}
        </QueryClientProvider>
      </I18nextProvider>,
    ),
  };
}

function createRow(
  overrides: Partial<QuickLogCachedEventRow> = {},
): QuickLogCachedEventRow {
  return {
    id: '00000000-0000-4000-8000-000000004604',
    household_id: householdId,
    puppy_id: puppyId,
    created_by: createdBy,
    client_event_id: 'evt_00000000-0000-4000-8000-000000004605',
    event_type: 'feeding',
    occurred_at: '2026-06-12T08:00:00.000Z',
    payload_version: 1,
    payload: {
      amount: 'meal',
    },
    version: 1,
    deleted_at: null,
    created_at: '2026-06-12T08:00:01.000Z',
    updated_at: '2026-06-12T08:00:01.000Z',
    ...overrides,
  };
}

describe('Timeline filters and actions', () => {
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

  it('applies filter chips through the Timeline query key and shows filtered empty copy', async () => {
    renderWithQuery(
      <TimelineScreen
        careContext={careContext}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    await waitFor(() => {
      expect(mockListEvents).toHaveBeenCalledWith({
        filters: {
          eventTypes: ['feeding'],
        },
        householdId,
        puppyId,
      });
    });
    expect(screen.getByText(i18n.t('timeline.empty-filter'))).toBeTruthy();
  });

  it('derives Quick Log filter chips from the canonical tracker vocabulary', () => {
    renderWithQuery(
      <TimelineScreen
        careContext={careContext}
        onClose={onClose}
      />,
    );

    for (const trackerKey of [
      'quick-log.trackers.potty',
      'quick-log.trackers.feeding',
      'quick-log.trackers.sleep',
      'quick-log.trackers.walk',
      'quick-log.trackers.zoomies',
    ] as const) {
      expect(screen.getByRole('tab', {
        name: i18n.t(trackerKey),
      })).toBeTruthy();
    }

    expect(screen.queryByRole('tab', {
      name: i18n.t('quick-log.trackers.training'),
    })).toBeNull();
    expect(screen.queryByRole('tab', {
      name: 'Food',
    })).toBeNull();
    expect(i18n.getResource('en', 'translation', 'timeline.filter-chips')).toEqual([
      'All',
      'Potty',
      'Feeding',
      'Sleep',
      'Walk',
      'Zoomies',
      'Health',
    ]);
  });

  it('renders potty subtype in Timeline row title and row accessibility text', async () => {
    mockListEvents.mockResolvedValue([
      createRow({
        event_type: 'potty',
        payload: {
          subtype: 'outside',
        },
      }),
    ]);

    renderWithQuery(
      <TimelineScreen
        careContext={careContext}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.trackers.potty-outside'))).toBeTruthy();
    });
    expect(screen.getByLabelText([
      i18n.t('quick-log.trackers.potty-outside'),
      i18n.t('timeline.actor-you'),
      i18n.t('timeline.pills.synced'),
    ].join(', '))).toBeTruthy();
  });

  it('renders filtered empty state with a clear-filter action', async () => {
    renderWithQuery(
      <TimelineScreen
        careContext={careContext}
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('timeline.filter-chips.6'),
    }));

    await waitFor(() => {
      expect(screen.getByRole('button', {
        name: i18n.t('timeline.empty-filter-clear'),
      })).toBeTruthy();
    });
    expect(screen.getByText(i18n.t('timeline.empty-filter-title'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('timeline.empty-filter-clear'),
    }));

    expect(screen.getByRole('tab', {
      name: i18n.t('timeline.filter-chips.0'),
    }).props.accessibilityState.selected).toBe(true);
  });

  it('keeps pending local rows visible when a matching filtered Timeline query refetches', async () => {
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

    fireEvent.press(screen.getByRole('tab', {
      name: i18n.t('quick-log.trackers.feeding'),
    }));

    await waitFor(() => {
      expect(screen.getByText(i18n.t('timeline.pills.pending'))).toBeTruthy();
    });
    expect(screen.getByText(i18n.t('timeline.pills.pending'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('timeline.empty-filter'))).toBeNull();
  });

  it('renders the actor subline without duplicating the left-column time', async () => {
    mockListEvents.mockResolvedValue([createRow({ event_type: 'feeding' })]);

    const { toJSON } = renderWithQuery(
      <TimelineScreen
        careContext={careContext}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('timeline.actor-you'))).toBeTruthy();
    });
    const tree = JSON.stringify(toJSON());
    expect(tree).not.toContain(`${i18n.t('timeline.actor-you')} · `);
  });

  it('keys row icons from event type instead of localized title text', async () => {
    mockListEvents.mockResolvedValue([createRow({
      event_type: 'feeding',
    })]);

    renderWithQuery(
      <TimelineScreen
        careContext={careContext}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('timeline-event-icon-feeding', {
        includeHiddenElements: true,
      })).toBeTruthy();
    });
  });

  it('opens synced row overflow actions without running edit or delete on menu press', async () => {
    const actions = {
      onDelete: jest.fn(),
      onEdit: jest.fn(),
      onRetry: jest.fn(),
      onUndo: jest.fn(),
    };
    mockListEvents.mockResolvedValue([createRow()]);

    renderWithQuery(
      <TimelineScreen
        actions={actions}
        careContext={careContext}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', {
        name: i18n.t('timeline.more-actions'),
      })).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('timeline.pills.synced'))).toBeNull();

    expect(screen.queryByRole('button', {
      name: i18n.t('timeline.overflow-actions.0'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('timeline.overflow-actions.1'),
    })).toBeNull();

    const overflowButton = screen.getByRole('button', {
      name: i18n.t('timeline.more-actions'),
    });

    expect(overflowButton.props.accessibilityActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: i18n.t('timeline.overflow-actions.0'),
          name: 'edit',
        }),
        expect.objectContaining({
          label: i18n.t('timeline.overflow-actions.1'),
          name: 'delete',
        }),
      ]),
    );

    fireEvent.press(overflowButton);
    expect(actions.onEdit).not.toHaveBeenCalled();
    expect(actions.onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {
      name: i18n.t('timeline.overflow-actions.0'),
    })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('timeline.overflow-actions.1'),
    })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('timeline.overflow-actions.0'),
    }));

    expect(actions.onEdit).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000004605',
      eventType: 'feeding',
      householdId,
      puppyId,
      todayDate,
      trackerId: 'feeding',
    });

    fireEvent(overflowButton, 'accessibilityAction', {
      nativeEvent: { actionName: 'edit' },
    });

    expect(actions.onEdit).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000004605',
      eventType: 'feeding',
      householdId,
      puppyId,
      todayDate,
      trackerId: 'feeding',
    });
  });

  it('requires explicit confirmation before deleting a synced row from overflow actions', async () => {
    const actions = {
      onDelete: jest.fn(),
      onEdit: jest.fn(),
    };
    mockListEvents.mockResolvedValue([createRow()]);

    renderWithQuery(
      <TimelineScreen
        actions={actions}
        careContext={careContext}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', {
        name: i18n.t('timeline.more-actions'),
      })).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('timeline.more-actions'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('timeline.overflow-actions.1'),
    }));

    expect(actions.onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(i18n.t('timeline.delete-confirm.title'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('timeline.delete-confirm.primary'),
    }));

    expect(actions.onDelete).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000004605',
      eventType: 'feeding',
      householdId,
      puppyId,
      status: 'synced',
      todayDate,
    });
  });
});
