import type { ComponentType, ReactElement } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';

import { formatDurationMinutes } from '@/lib/datetime/duration-label';
import { i18n } from '@/lib/i18n';
import { formatLocalCalendarDate } from '@/lib/i18n/format-date';
import { createPuppyPlanQueryClient } from '@/lib/query/client';
import { queryKeys, type TimelineFilters } from '@/lib/query/keys';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import {
  TodayScreen,
  type TodayScreenProps,
} from '@/features/today/screens/TodayScreen';
import { IconChip } from '@/design/primitives/IconChip';
import { tokens } from '@/design/tokens';

const mockListEvents = jest.fn();

jest.mock('@/lib/supabase/events', () => ({
  ...jest.requireActual('@/lib/supabase/events'),
  createSupabaseEventLogRepository: () => ({
    listEvents: mockListEvents,
  }),
}));

const householdId = '00000000-0000-4000-8000-000000001501';
const puppyId = '00000000-0000-4000-8000-000000001502';
const createdBy = '00000000-0000-4000-8000-000000001503';
const todayDate = '2026-05-27';

const careContext = {
  authState: 'authenticated',
  householdId,
  householdRole: 'owner',
  puppyId,
  todayDate,
} as const;
const openTimeline = jest.fn();
const openOnboarding = jest.fn();
const testQueryClients: ReturnType<typeof createPuppyPlanQueryClient>[] = [];
type DiaryParityTodayProps = TodayScreenProps & Readonly<{
  onShareText?: (text: string) => Promise<void> | void;
}>;
const DiaryParityTodayScreen = TodayScreen as ComponentType<DiaryParityTodayProps>;

function todayTimelineKey() {
  return queryKeys.events.timeline(householdId, puppyId, {
    from: todayDate,
    to: todayDate,
  });
}

function previousDaySleepTimelineKey() {
  return queryKeys.events.timeline(householdId, puppyId, {
    eventTypes: ['sleep'],
    from: '2026-05-26',
    to: '2026-05-26',
  });
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
    id: '00000000-0000-4000-8000-000000001504',
    household_id: householdId,
    puppy_id: puppyId,
    created_by: createdBy,
    client_event_id: 'evt_00000000-0000-4000-8000-000000001505',
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

describe('Today Quick Log state integration', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockListEvents.mockReset();
    mockListEvents.mockResolvedValue([]);
    openTimeline.mockClear();
    openOnboarding.mockClear();
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
      <TodayScreen
        careContext={null}
        openOnboarding={openOnboarding}
        openTimeline={openTimeline}
      />,
    );

    expect(screen.getByText(i18n.t('today.states.unavailable.status'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.unavailable.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.unavailable.body'))).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('today.quick-log.setup-entry'),
    }));
    expect(openOnboarding).toHaveBeenCalledTimes(1);
    expect(openTimeline).not.toHaveBeenCalled();
    expect(screen.queryByText(i18n.t('states.empty-first-run.title'))).toBeNull();
    expect(queryClient.getQueryCache().findAll()).toHaveLength(0);
  });

  it('renders pending Quick Log rows with Undo and Delete actions', async () => {
    const actions = {
      onDelete: jest.fn(),
      onRetry: jest.fn(),
      onUndo: jest.fn(),
    };
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={actions}
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [
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
      expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    });
    expect(screen.getByText(i18n.t('timeline.pills.pending'))).toBeTruthy();
    expect(screen.queryByLabelText(i18n.t('timeline.pills.pending'))).toBeNull();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    }));

    expect(actions.onUndo).toHaveBeenCalledWith(expect.objectContaining({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001505',
      eventType: 'feeding',
      householdId,
      puppyId,
      todayDate,
    }));
    expect(actions.onDelete).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001505',
      eventType: 'feeding',
      householdId,
      puppyId,
      status: 'pending',
      todayDate,
    });
  });

  it('renders failed rows with Retry/Delete and gates the persistent banner by retry count', async () => {
    const actions = {
      onDelete: jest.fn(),
      onRetry: jest.fn(),
      onUndo: jest.fn(),
    };
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={actions}
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [
        createRow({
          localSync: {
            state: 'failed_retryable',
            category: 'request_timeout',
            retryCount: 2,
          },
        }),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('timeline.pills.failed'))).toBeTruthy();
    });
    expect(screen.queryByLabelText(i18n.t('timeline.pills.failed'))).toBeNull();
    expect(screen.queryByText(i18n.t('quick-log.failed.persistent-banner'))).toBeNull();

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [
        createRow({
          localSync: {
            state: 'failed_retryable',
            category: 'request_timeout',
            retryCount: 3,
          },
        }),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.failed.persistent-banner'))).toBeTruthy();
    });
    expect(screen.getByLabelText(i18n.t('quick-log.failed.persistent-banner'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    }));

    expect(actions.onRetry).toHaveBeenCalledWith(
      'evt_00000000-0000-4000-8000-000000001505',
      'manual_retry',
      'today',
    );
    expect(actions.onDelete).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001505',
      eventType: 'feeding',
      householdId,
      puppyId,
      status: 'failed',
      todayDate,
    });
  });

  it('AC-P33-READ AC-P33-CORRECT AC-P36-5 renders note readback and confirms visible Delete inline', async () => {
    const notedRow = createRow({
      event_type: 'observation',
      payload: {
        note: 'Synthetic private context for readback',
        title: 'Calm pause',
      },
      payload_version: 2,
    });
    mockListEvents.mockResolvedValue([notedRow]);
    const actions = {
      onDelete: jest.fn(),
      onEdit: jest.fn(),
      onRetry: jest.fn(),
      onUndo: jest.fn(),
    };
    const { queryClient, toJSON } = renderWithQuery(
      <TodayScreen
        actions={actions}
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [
        notedRow,
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText('Synthetic private context for readback')).toBeTruthy();
    });
    expect(screen.getByTestId('diary-history-logged-fact-card').props.accessibilityLabel)
      .toContain('Synthetic private context for readback');
    expect(
      StyleSheet.flatten(screen.getByTestId('diary-history-logged-fact-card').props.style)
        .backgroundColor,
    ).toBe(tokens.color.surface.sunken);
    const itemActions = screen.getByRole('button', {
      name: i18n.t('today.history.item-actions'),
    });
    const itemActionStyleProp = itemActions.props.style;
    const itemActionStyle = StyleSheet.flatten(
      typeof itemActionStyleProp === 'function'
        ? itemActionStyleProp({ pressed: false })
        : itemActionStyleProp,
    );

    expect(itemActionStyle.minHeight).toBeGreaterThanOrEqual(44);
    expect(itemActionStyle.minWidth).toBeGreaterThanOrEqual(44);
    const factCard = screen.getByTestId('diary-history-logged-fact-card');
    fireEvent.press(factCard);
    expect(actions.onEdit).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001505',
      eventType: 'observation',
      householdId,
      puppyId,
      todayDate,
      trackerId: 'observation',
    });
    actions.onEdit.mockClear();

    fireEvent.press(itemActions);
    expect(screen.getByRole('button', { name: i18n.t('common.edit') })).toBeTruthy();
    const deleteAction = screen.getByRole('button', {
      name: i18n.t('today.history.delete-action'),
    });
    expect(deleteAction).toBeTruthy();
    // AC-P33-DEL: deleting a logged record is the one destructive action in the day list. Styled
    // as a tertiary link it reads as a peer of Edit and shares the same accent, so nothing but the
    // word warns the owner. The design system carries a destructive variant for exactly this.
    expect(
      StyleSheet.flatten(
        typeof deleteAction.props.style === 'function'
          ? deleteAction.props.style({ pressed: false })
          : deleteAction.props.style,
      ).backgroundColor,
    ).toBe(tokens.color.status.danger);
    expect(actions.onEdit).not.toHaveBeenCalled();
    fireEvent.press(deleteAction);
    expect(actions.onDelete).not.toHaveBeenCalled();
    expect(screen.getByTestId('diary-history-delete-confirmation')).toBeTruthy();
    expect(screen.getByText(i18n.t('timeline.delete-confirm.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('timeline.delete-confirm.body'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('timeline.delete-confirm.primary'),
    })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('timeline.delete-confirm.secondary'),
    }));

    expect(actions.onDelete).not.toHaveBeenCalled();
    expect(screen.getByTestId('diary-history-logged-fact')).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('common.edit') })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('today.history.delete-action'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('timeline.delete-confirm.primary'),
    }));

    expect(actions.onDelete).toHaveBeenCalledTimes(1);
    expect(actions.onDelete).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001505',
      eventType: 'observation',
      householdId,
      puppyId,
      status: 'synced',
      todayDate,
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

  it('AC-P33-EXPORT shares only the selected today rows even when the history drawer contains multiple days', async () => {
    const onShareText = jest.fn();
    const selectedDayRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001581',
      event_type: 'observation',
      occurred_at: '2026-05-27T09:00:00.000Z',
      payload: { note: 'Synthetic selected-day note', title: 'Calm greeting' },
      payload_version: 2,
    });
    const otherDayRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001582',
      event_type: 'observation',
      occurred_at: '2026-05-26T08:00:00.000Z',
      payload: { note: 'Synthetic other-day private note', title: 'Earlier context' },
      payload_version: 2,
    });
    const { queryClient } = renderWithQuery(
      <DiaryParityTodayScreen
        careContext={careContext}
        onShareText={onShareText}
        openTimeline={openTimeline}
      />,
    );
    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [selectedDayRow]);
      queryClient.setQueryData(
        queryKeys.events.timeline(householdId, puppyId, {}),
        [selectedDayRow, otherDayRow],
      );
    });

    await waitFor(() => expect(screen.getByText('Synthetic selected-day note')).toBeTruthy());
    expect(onShareText).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('today.history.open-action'),
    }));
    await waitFor(() => expect(screen.getByText('Synthetic other-day private note')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-share-day'));

    expect(onShareText).toHaveBeenCalledTimes(1);
    const sharedText = onShareText.mock.calls[0]?.[0] as string;
    expect(sharedText.split('\n')).toHaveLength(1);
    expect(sharedText).toContain('Calm greeting — Synthetic selected-day note');
    expect(sharedText).not.toContain('Earlier context');
    expect(sharedText).not.toContain('Synthetic other-day private note');
  });

  it('AC-P33-EXPORT shares the selected past day without leaking cached today rows', async () => {
    const onShareText = jest.fn();
    const selectedPastDate = '2026-05-26';
    const todayRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001583',
      event_type: 'observation',
      payload: { note: 'Synthetic today-only note', title: 'Today context' },
      payload_version: 2,
    });
    const selectedPastRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001584',
      event_type: 'observation',
      occurred_at: '2026-05-26T08:00:00.000Z',
      payload: { note: 'Synthetic selected-past note', title: 'Past context' },
      payload_version: 2,
    });
    mockListEvents.mockImplementation((request: { filters?: TimelineFilters }) => {
      if (request.filters?.from === selectedPastDate) {
        return Promise.resolve([selectedPastRow]);
      }

      return Promise.resolve([todayRow]);
    });
    const { queryClient } = renderWithQuery(
      <DiaryParityTodayScreen
        careContext={careContext}
        onShareText={onShareText}
        openTimeline={openTimeline}
      />,
    );
    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [todayRow]);
    });

    fireEvent.press(screen.getByTestId(`week-strip-day-${selectedPastDate}`));
    await waitFor(() => expect(screen.getByText('Synthetic selected-past note')).toBeTruthy());
    fireEvent.press(screen.getByTestId('diary-share-day'));

    expect(onShareText).toHaveBeenCalledTimes(1);
    const sharedText = onShareText.mock.calls[0]?.[0] as string;
    expect(sharedText).toContain('Past context — Synthetic selected-past note');
    expect(sharedText).not.toContain('Today context');
    expect(sharedText).not.toContain('Synthetic today-only note');
  });

  it('deletes a synced Diary history fact via the accessibility action (VoiceOver/TalkBack parity)', async () => {
    mockListEvents.mockResolvedValue([createRow()]);
    const actions = {
      onDelete: jest.fn(),
    };
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={actions}
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [
        createRow(),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    });

    const factCard = screen.getByTestId('diary-history-logged-fact-card');
    fireEvent(factCard, 'accessibilityAction', {
      nativeEvent: { actionName: 'delete' },
    });

    expect(actions.onDelete).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001505',
      eventType: 'feeding',
      householdId,
      puppyId,
      status: 'synced',
      todayDate,
    });
  });

  it('omits pending and failed action buttons when handlers are not wired', async () => {
    const { queryClient } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [
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
    expect(screen.queryByLabelText(i18n.t('timeline.pills.pending'))).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    })).toBeNull();

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [
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
    expect(screen.queryByLabelText(i18n.t('timeline.pills.failed'))).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    })).toBeNull();
  });

  const factCardAccentCases: readonly {
    accent: 'clay' | 'honey' | 'mauve';
    eventType: 'feeding' | 'potty' | 'sleep' | 'walk' | 'zoomies';
    icon: string;
    payload: Record<string, string>;
  }[] = [
    { accent: 'clay', eventType: 'feeding', icon: 'bowl', payload: { amount: 'meal' } },
    { accent: 'clay', eventType: 'walk', icon: 'walk', payload: {} },
    { accent: 'mauve', eventType: 'sleep', icon: 'moon', payload: { sleep_kind: 'nap' } },
    { accent: 'honey', eventType: 'zoomies', icon: 'ball', payload: {} },
    { accent: 'honey', eventType: 'potty', icon: 'water', payload: { subtype: 'outside' } },
    { accent: 'honey', eventType: 'potty', icon: 'pottyInside', payload: { subtype: 'inside' } },
  ];

  it.each(factCardAccentCases)(
    'wires the Clay accent map for a $eventType fact card ($icon/$accent)',
    async ({ accent, eventType, icon, payload }) => {
      mockListEvents.mockResolvedValue([
        createRow({
          event_type: eventType,
          payload,
        }),
      ]);
      renderWithQuery(
        <TodayScreen
          careContext={careContext}
          openTimeline={openTimeline}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('diary-history-logged-fact')).toBeTruthy();
      });

      const chip = screen.UNSAFE_getByType(IconChip);
      expect(chip.props.accent).toBe(accent);
      expect(chip.props.icon).toBe(icon);
    },
  );

  const factCardV2AccentCases: readonly {
    accent: 'honey' | 'mauve';
    eventType: 'potty' | 'sleep';
    icon: string;
    payload: Record<string, string>;
  }[] = [
    {
      accent: 'honey',
      eventType: 'potty',
      icon: 'water',
      payload: { note: 'Synthetic private context', subtype: 'outside' },
    },
    {
      accent: 'honey',
      eventType: 'potty',
      icon: 'poop',
      payload: { note: 'Synthetic private context', subtype: 'poop' },
    },
    {
      accent: 'mauve',
      eventType: 'sleep',
      icon: 'moon',
      payload: { action: 'start', note: 'Synthetic private context' },
    },
  ];

  it.each(factCardV2AccentCases)(
    'AC-QN-POLISH reads a noted v2 $eventType payload for its icon ($icon/$accent)',
    async ({ accent, eventType, icon, payload }) => {
      // A v2 payload carrying a note fails the strict v1 schema. Parsing version-blind made the
      // fact fall back to the wrong icon — an outside pee read as an indoor accident.
      mockListEvents.mockResolvedValue([
        createRow({
          event_type: eventType,
          payload,
          payload_version: 2,
        }),
      ]);
      renderWithQuery(
        <TodayScreen
          careContext={careContext}
          openTimeline={openTimeline}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('diary-history-logged-fact')).toBeTruthy();
      });

      const chip = screen.UNSAFE_getByType(IconChip);
      expect(chip.props.accent).toBe(accent);
      expect(chip.props.icon).toBe(icon);
    },
  );

  it('fetches same-day durable rows when Today opens with an empty cache', async () => {
    mockListEvents.mockResolvedValue([createRow()]);

    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    });
    expect(mockListEvents).toHaveBeenCalledWith({
      filters: {
        from: todayDate,
        to: todayDate,
      },
      householdId,
      puppyId,
    });
  });

  it('AC-QN-NIGHT renders last night as one interval on the wake day, not a bare wake', async () => {
    // Local wall-clock: the sleep starts the evening before the day being read.
    const startedAt = new Date(2026, 4, 26, 23, 41, 0).toISOString();
    const endedAt = new Date(2026, 4, 27, 6, 35, 0).toISOString();
    const start = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001591',
      event_type: 'sleep',
      id: '00000000-0000-4000-8000-000000001592',
      occurred_at: startedAt,
      payload: { action: 'start' },
      payload_version: 2,
    });
    const wake = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001593',
      event_type: 'sleep',
      id: '00000000-0000-4000-8000-000000001594',
      occurred_at: endedAt,
      payload: { action: 'wake' },
      payload_version: 2,
    });
    // Honour the requested window the way the real repository does, so the start row is only
    // reachable through the previous-day lookup and the test cannot pass without it.
    mockListEvents.mockImplementation(async ({ filters }: { filters: TimelineFilters }) =>
      [wake, start].filter((row) => {
        const day = formatLocalCalendarDate(row.occurred_at);

        return (filters.from === undefined || day >= filters.from)
          && (filters.to === undefined || day <= filters.to);
      }));

    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openOnboarding={openOnboarding}
        openTimeline={openTimeline}
      />,
    );

    // 23:41 -> 06:35 is 414 minutes, read back as hours; before cross-midnight pairing this could
    // not be shown at all.
    expect(await screen.findByText(/6 hr 54 min/)).toBeTruthy();
    expect(mockListEvents).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({ from: '2026-05-26', to: '2026-05-26' }),
    }));
  });

  it('AC-P33-DOG-RETRO renders retrospective sleep with its localized derived interval title', async () => {
    const endedAt = new Date('2026-05-27T08:16:00.000Z');
    const durationMinutes = 34;
    const startedAt = new Date(endedAt.getTime() - durationMinutes * 60_000);
    const retrospective = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001599',
      event_type: 'sleep',
      id: '00000000-0000-4000-8000-000000001600',
      occurred_at: endedAt.toISOString(),
      payload: { action: 'retrospective', duration_minutes: durationMinutes },
      payload_version: 2,
    });
    mockListEvents.mockImplementation(async ({ filters }: { filters: TimelineFilters }) =>
      filters.eventTypes?.includes('sleep') ? [] : [retrospective]);

    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    const formatter = new Intl.DateTimeFormat(i18n.language, {
      hour: 'numeric',
      minute: '2-digit',
    });
    const title = i18n.t('today.history.sleep-interval', {
      duration: formatDurationMinutes(durationMinutes, i18n.t),
      end: formatter.format(endedAt),
      start: formatter.format(startedAt),
    });

    expect(await screen.findByText(title)).toBeTruthy();
  });

  it('AC-QN-FIX-NIGHT-STATUS does not present a bare wake while previous-day pairing input is loading', async () => {
    const wake = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001595',
      event_type: 'sleep',
      id: '00000000-0000-4000-8000-000000001596',
      occurred_at: '2026-05-27T06:35:00.000Z',
      payload: { action: 'wake' },
      payload_version: 2,
    });
    const pendingPreviousDay = new Promise<readonly QuickLogCachedEventRow[]>(() => undefined);
    mockListEvents.mockImplementation(({ filters }: { filters: TimelineFilters }) =>
      filters.eventTypes?.includes('sleep')
        ? pendingPreviousDay
        : Promise.resolve([wake]));

    const { queryClient } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(queryClient.getQueryState(todayTimelineKey())?.status).toBe('success');
      expect(queryClient.getQueryState(previousDaySleepTimelineKey())?.status).toBe('pending');
    });

    expect(screen.queryByText(i18n.t('quick-log.details.sleep.action.wake'))).toBeNull();
    expect(screen.getByText(i18n.t('today.states.loading.title'))).toBeTruthy();
  });

  it('AC-QN-FIX-NIGHT-STATUS surfaces previous-day pairing failure without a bare wake', async () => {
    const wake = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001597',
      event_type: 'sleep',
      id: '00000000-0000-4000-8000-000000001598',
      occurred_at: '2026-05-27T06:35:00.000Z',
      payload: { action: 'wake' },
      payload_version: 2,
    });
    mockListEvents.mockImplementation(({ filters }: { filters: TimelineFilters }) =>
      filters.eventTypes?.includes('sleep')
        ? Promise.reject(new Error('synthetic previous-day query failure'))
        : Promise.resolve([wake]));

    const { queryClient } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(queryClient.getQueryState(todayTimelineKey())?.status).toBe('success');
      expect(queryClient.getQueryState(previousDaySleepTimelineKey())?.status).toBe('error');
    });

    expect(screen.queryByText(i18n.t('quick-log.details.sleep.action.wake'))).toBeNull();
    expect(screen.getByText(i18n.t('today.states.error.title'))).toBeTruthy();
  });

  it('AC-QN-FIX-NIGHT-STATUS keeps ready current-day facts visible when sleep pairing fails', async () => {
    const feeding = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001599',
      id: '00000000-0000-4000-8000-000000001600',
    });
    const wake = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001601',
      event_type: 'sleep',
      id: '00000000-0000-4000-8000-000000001602',
      occurred_at: '2026-05-27T06:35:00.000Z',
      payload: { action: 'wake' },
      payload_version: 2,
    });
    mockListEvents.mockImplementation(({ filters }: { filters: TimelineFilters }) =>
      filters.eventTypes?.includes('sleep')
        ? Promise.reject(new Error('synthetic previous-day query failure'))
        : Promise.resolve([feeding, wake]));

    const { queryClient } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(queryClient.getQueryState(todayTimelineKey())?.status).toBe('success');
      expect(queryClient.getQueryState(previousDaySleepTimelineKey())?.status).toBe('error');
    });

    expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('quick-log.details.sleep.action.wake'))).toBeNull();
    expect(screen.getByText(i18n.t('today.states.error.title'))).toBeTruthy();
  });

  it('PUP-27 I5 does not show a today Quick Log row while viewing a selected past day', async () => {
    const todayRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001551',
      occurred_at: '2026-05-27T08:00:00.000Z',
    });
    const pastDate = '2026-05-26';
    mockListEvents.mockImplementation((request: { filters?: TimelineFilters }) => {
      if (request.filters?.from === todayDate) {
        return Promise.resolve([todayRow]);
      }

      return Promise.resolve([]);
    });
    const { queryClient } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [todayRow]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId(`week-strip-day-${pastDate}`));

    await waitFor(() => {
      expect(screen.getByTestId('diary-selected-day-empty-state')).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('quick-log.trackers.feeding'))).toBeNull();
    expect(queryClient.getQueryData(todayTimelineKey())).toEqual([todayRow]);
  });

  it('PUP-27 keeps a selected-day delete request scoped to the real today', async () => {
    const pastDate = '2026-05-26';
    const pastRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000001561',
      id: '00000000-0000-4000-8000-000000001571',
      occurred_at: '2026-05-26T08:00:00.000Z',
      created_at: '2026-05-26T08:00:01.000Z',
      updated_at: '2026-05-26T08:00:01.000Z',
    });
    mockListEvents.mockImplementation((request: { filters?: TimelineFilters }) => {
      if (request.filters?.from === pastDate) {
        return Promise.resolve([pastRow]);
      }

      return Promise.resolve([]);
    });
    const actions = {
      onDelete: jest.fn(),
    };
    renderWithQuery(
      <TodayScreen
        actions={actions}
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('today-week-strip')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId(`week-strip-day-${pastDate}`));

    const factCard = await screen.findByTestId('diary-history-logged-fact-card');
    fireEvent(factCard, 'accessibilityAction', {
      nativeEvent: { actionName: 'delete' },
    });

    // Invalidation is keyed off todayDate (queryKeys.today.dashboard); a
    // selected past/future day must not leak into the today-scoped request.
    expect(actions.onDelete).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001561',
      eventType: 'feeding',
      householdId,
      puppyId,
      status: 'synced',
      todayDate,
    });
  });
});
