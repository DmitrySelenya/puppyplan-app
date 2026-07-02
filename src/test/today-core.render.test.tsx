import type { ReactElement } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';

import { tokens } from '@/design/tokens';
import { i18n } from '@/lib/i18n';
import { createPuppyPlanQueryClient } from '@/lib/query/client';
import { queryKeys, type TimelineFilters } from '@/lib/query/keys';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import { TodayScreen } from '@/features/today/screens/TodayScreen';

const mockListEvents = jest.fn();

jest.mock('@/lib/supabase/events', () => ({
  ...jest.requireActual('@/lib/supabase/events'),
  createSupabaseEventLogRepository: () => ({
    listEvents: mockListEvents,
  }),
}));

const householdId = '00000000-0000-4000-8000-000000002501';
const puppyId = '00000000-0000-4000-8000-000000002502';
const createdBy = '00000000-0000-4000-8000-000000002503';
const todayDate = '2026-06-12';

const careContext = {
  authState: 'authenticated',
  householdId,
  householdRole: 'owner',
  puppyId,
  todayDate,
} as const;

const openTimeline = jest.fn();
const openQuickLog = jest.fn();
const testQueryClients: ReturnType<typeof createPuppyPlanQueryClient>[] = [];

function todayTimelineKey() {
  return queryKeys.events.timeline(householdId, puppyId, {
    from: todayDate,
    to: todayDate,
  });
}

function diaryHistoryTimelineKey(filters: TimelineFilters = {}) {
  return queryKeys.events.timeline(householdId, puppyId, filters);
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
    id: '00000000-0000-4000-8000-000000002504',
    household_id: householdId,
    puppy_id: puppyId,
    created_by: createdBy,
    client_event_id: 'evt_00000000-0000-4000-8000-000000002505',
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

describe('Today core card rendering', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockListEvents.mockReset();
    mockListEvents.mockResolvedValue([]);
    openQuickLog.mockClear();
    openTimeline.mockClear();
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

  it('renders one Clay info-hero tip for the day\'s single priority signal', async () => {
    const { queryClient, toJSON } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        todayPlanInput={{
          dayNumber: 2,
          suggestedDailyCards: [
            'quick_log_prompt',
            'sleep_rhythm',
            'potty_rhythm',
            'health_calm_check',
            'tracker_settings',
          ],
          timeOfDay: 'morning',
        }}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [createRow()]);
    });

    await waitFor(() => {
      expect(screen.getByTestId('diary-info-hero')).toBeTruthy();
    });

    expect(screen.getAllByTestId('diary-info-hero')).toHaveLength(1);
    expect(screen.queryByTestId('today-daily-card')).toBeNull();
    expect(screen.queryByTestId('today-guidance-card')).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('guidance.action-labels.read'),
    })).toBeNull();
    expect(JSON.stringify(toJSON())).toContain(i18n.t('today.hero.day-2-morning.title'));
  });

  it('renders the loading state while active care events load', () => {
    mockListEvents.mockReturnValue(new Promise(() => {}));
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    expect(screen.getAllByText(i18n.t('today.states.loading.title')).length).toBeGreaterThan(0);
  });

  it('wires the hero primary CTA to the Quick Log action', async () => {
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openQuickLog={openQuickLog}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('today.hero.first-day.title'))).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('today.hero.first-day.primary'),
    }));

    expect(openQuickLog).toHaveBeenCalledTimes(1);
  });

  it('renders the design first-day plan instead of a separate empty card without events', async () => {
    mockListEvents.mockResolvedValue([]);
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('today.hero.first-day.title'))).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('today.states.empty.title'))).toBeNull();
  });

  it('renders a Diary week strip with selected day and today marker separated', async () => {
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        todayPlanInput={{
          todayDate: '2026-06-10',
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('diary-header')).toBeTruthy();
    });

    const weekStrip = screen.getByLabelText(i18n.t('today.week-strip.label'));
    expect(weekStrip.props.accessibilityRole).toBeUndefined();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    const selectedDay = screen.getByLabelText(i18n.t('today.week-strip.day-label', {
      date: 'Jun 10',
      state: i18n.t('today.week-strip.state-selected'),
      weekday: 'Wednesday',
    }));
    const todayMarker = screen.getByLabelText(i18n.t('today.week-strip.day-label', {
      date: 'Jun 12',
      state: i18n.t('today.week-strip.state-today'),
      weekday: 'Friday',
    }));

    expect(selectedDay.props.accessibilityRole).toBe('text');
    expect(todayMarker.props.accessibilityRole).toBe('text');
    expect(selectedDay.props.accessibilityState?.selected).toBeUndefined();
    expect(todayMarker.props.accessibilityState?.selected).toBeUndefined();
  });

  it('renders the error state when active care events cannot refresh', async () => {
    mockListEvents.mockRejectedValue(new Error('network unavailable'));
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('today.states.error.title'))).toBeTruthy();
    });
    expect(screen.getByText(i18n.t('today.states.error.status'))).toBeTruthy();
    expect(screen.getByLabelText(`${i18n.t('today.states.error.title')}. ${i18n.t('today.states.error.body')}`)).toBeTruthy();
  });

  it('renders the offline-read state from the synthetic review override', () => {
    mockListEvents.mockResolvedValue([]);
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        screenState="offline-read"
      />,
    );

    expect(screen.getByText(i18n.t('today.states.offline-read.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.offline-read.status'))).toBeTruthy();
    expect(screen.getByLabelText(`${i18n.t('today.states.offline-read.title')}. ${i18n.t('today.states.offline-read.body')}`)).toBeTruthy();
  });

  it('renders the pending-write state when local care events are waiting to sync', async () => {
    mockListEvents.mockResolvedValue([]);
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
      expect(screen.getByText(i18n.t('today.states.pending-write.title'))).toBeTruthy();
    });
    expect(screen.getByText(i18n.t('today.states.pending-write.status'))).toBeTruthy();
    expect(screen.getByLabelText(`${i18n.t('today.states.pending-write.title')}. ${i18n.t('today.states.pending-write.body')}`)).toBeTruthy();
  });

  it('renders the synthetic pending-write Diary state without needing queued local rows', async () => {
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        screenState="pending-write"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('today-state-pending-write')).toBeTruthy();
    });

    expect(screen.getByText(i18n.t('today.states.pending-write.status'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.pending-write.title'))).toBeTruthy();
    expect(screen.getByLabelText(`${i18n.t('today.states.pending-write.title')}. ${i18n.t('today.states.pending-write.body')}`)).toBeTruthy();
    expect(screen.queryByText(i18n.t('today.states.empty.title'))).toBeNull();
  });

  it('renders the all-done Diary state as a calm completion state', async () => {
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        screenState="all-done"
        todayPlanInput={{
          dayNumber: 5,
          suggestedDailyCards: ['timeline_review'],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('diary-all-done-card')).toBeTruthy();
    });

    expect(screen.getByText(i18n.t('today.states.all-done.status'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.all-done.title'))).toBeTruthy();
    expect(screen.getByLabelText(`${i18n.t('today.states.all-done.title')}. ${i18n.t('today.states.all-done.body')}`)).toBeTruthy();
    expect(screen.queryByTestId('today-state-all-done')).toBeNull();
    expect(screen.queryByText(i18n.t('today.states.empty.title'))).toBeNull();
  });

  it('renders the empty-with-history Diary state without falling back to first-day onboarding', async () => {
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        screenState="empty-history"
        todayPlanInput={{
          dayNumber: 5,
          lastEvents: [{
            eventType: 'feeding',
            minutesAgo: 60 * 24,
            quickAction: 'meal',
          }],
          suggestedDailyCards: ['timeline_review'],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('diary-empty-state-empty-history')).toBeTruthy();
    });

    expect(screen.getByTestId('diary-empty-illustration', {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.empty-history.title'))).toBeTruthy();
    expect(screen.getByLabelText(`${i18n.t('today.states.empty-history.title')}. ${i18n.t('today.states.empty-history.body')}`)).toBeTruthy();
    expect(screen.queryByTestId('today-state-empty-history')).toBeNull();
    expect(screen.queryByRole('button', { name: i18n.t('nav.quick-log-slab') })).toBeNull();
    expect(screen.queryByRole('button', { name: i18n.t('nav.schedule-slab') })).toBeNull();
    expect(screen.queryByText(i18n.t('today.hero.first-day.title'))).toBeNull();
    expect(screen.queryByTestId('today-hero-card')).toBeNull();
    expect(screen.queryByText(i18n.t('today.daily-cards.starter-section-title'))).toBeNull();
  });

  it('renders the true cold-start Diary state as a setup prompt instead of first-day onboarding', async () => {
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        screenState="cold-start"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('diary-empty-state-cold-start')).toBeTruthy();
    });

    expect(screen.getByTestId('diary-empty-illustration', {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.cold-start.title'))).toBeTruthy();
    expect(screen.getByLabelText(`${i18n.t('today.states.cold-start.title')}. ${i18n.t('today.states.cold-start.body')}`)).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('nav.quick-log-slab') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('nav.schedule-slab') })).toBeTruthy();
    expect(screen.queryByTestId('today-state-cold-start')).toBeNull();
    expect(screen.queryByText(i18n.t('today.hero.first-day.title'))).toBeNull();
    expect(screen.queryByText(i18n.t('today.daily-cards.starter-section-title'))).toBeNull();
  });

  it('renders the permission state for view-only household access', () => {
    mockListEvents.mockResolvedValue([]);
    renderWithQuery(
      <TodayScreen
        careContext={{
          ...careContext,
          householdRole: 'viewer',
        }}
        openTimeline={openTimeline}
      />,
    );

    expect(screen.getAllByText(i18n.t('today.states.permission-denied.title')).length).toBeGreaterThan(0);
  });

  it('renders the past unchecked reminder state without shame or missed language', async () => {
    const { toJSON } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        todayPlanInput={{
          syntheticSignals: {
            missedReminder: {
              reminderKind: 'feeding',
              scheduledLocalTime: '08:30',
            },
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('diary-info-hero')).toBeTruthy();
    });

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain(i18n.t('today.hero.missed-reminder.title'));
    expect(screen.queryByText(i18n.t('today.states.error.status'))).toBeNull();
    expect(tree.toLowerCase()).not.toContain('missed');
  });

  it('renders accident recovery as a Diary info-hero tip without the legacy Today title', async () => {
    mockListEvents.mockResolvedValue([
      createRow({
        event_type: 'potty',
        payload: {
          subtype: 'inside',
        },
      }),
    ]);

    const { toJSON } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        todayPlanInput={{
          dayNumber: 3,
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('diary-info-hero')).toBeTruthy();
    });

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain(i18n.t('today.hero.accident-recovery.title'));
    expect(tree).toContain(i18n.t('today.hero.accident-recovery.body'));
    // "Today" now appears once, as the Clay section title above the fact list —
    // not as the legacy large-title screen heading (that title is now a greeting).
    expect(screen.getAllByText('Today')).toHaveLength(1);
  });

  it('keeps the V2 Diary anatomy in top-to-bottom order with one embedded history entry button', async () => {
    mockListEvents.mockResolvedValue([
      createRow({
        event_type: 'potty',
        payload: {
          subtype: 'outside',
        },
      }),
    ]);
    const { toJSON } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        todayPlanInput={{
          dayNumber: 7,
          suggestedDailyCards: ['feeding_pattern', 'timeline_review', 'potty_rhythm'],
          weeklySummary: {
            feedingCount: 14,
            pottyCount: 21,
            sleepHoursPerDay: 18,
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('today.history.section-title'))).toBeTruthy();
    });

    const sectionTitle = screen.getByText(i18n.t('today.history.section-title'));
    const sectionTitleStyle = StyleSheet.flatten(sectionTitle.props.style);
    const historySection = screen.getByTestId('diary-history-section');
    const historySectionStyle = StyleSheet.flatten(historySection.props.style);
    const tree = JSON.stringify(toJSON());
    const titleIndex = tree.indexOf(i18n.t('tabs.diary'));
    const heroIndex = tree.indexOf(i18n.t('today.hero.day-7-weekly-rhythm.title'));
    const sectionIndex = tree.indexOf(i18n.t('today.history.section-title'));
    const historyIndex = tree.indexOf(i18n.t('today.history.open-action'));

    expect(sectionTitleStyle.fontSize).toBe(tokens.typography.scale.title3.fontSize);
    expect(historySectionStyle.gap).toBe(10);
    expect(titleIndex).toBeGreaterThanOrEqual(0);
    expect(heroIndex).toBeGreaterThan(titleIndex);
    expect(sectionIndex).toBeGreaterThan(heroIndex);
    expect(historyIndex).toBeGreaterThan(sectionIndex);
    expect(tree).not.toContain('Timeline');
    expect(screen.getAllByRole('button', {
      name: i18n.t('today.history.open-action'),
    })).toHaveLength(1);
  });

  it('opens filtered Diary history inline instead of routing to standalone Timeline', async () => {
    const todayFeedingRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000002601',
      event_type: 'feeding',
      id: '00000000-0000-4000-8000-000000002611',
      occurred_at: '2026-06-12T08:00:00.000Z',
      payload: {
        amount: 'meal',
      },
    });
    const yesterdayPottyRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000002602',
      event_type: 'potty',
      id: '00000000-0000-4000-8000-000000002612',
      occurred_at: '2026-06-11T07:15:00.000Z',
      payload: {
        subtype: 'outside',
      },
    });
    mockListEvents.mockResolvedValue([todayFeedingRow]);
    const { queryClient } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [todayFeedingRow]);
      queryClient.setQueryData(diaryHistoryTimelineKey(), [
        todayFeedingRow,
        yesterdayPottyRow,
      ]);
      queryClient.setQueryData(diaryHistoryTimelineKey({
        eventTypes: ['feeding'],
      }), [todayFeedingRow]);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', {
        name: i18n.t('today.history.open-action'),
      })).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('today.history.open-action'),
    }));

    expect(openTimeline).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('diary-history-filter-bar')).toBeTruthy();
    });

    expect(screen.getByRole('tab', { name: i18n.t('timeline.filter-chips.0') })).toBeTruthy();
    expect(screen.getByRole('tab', { name: i18n.t('timeline.filter-chips.2') })).toBeTruthy();
    expect(screen.getByRole('tab', { name: i18n.t('timeline.filter-chips.1') })).toBeTruthy();
    expect(screen.getByRole('tab', { name: i18n.t('timeline.filter-chips.3') })).toBeTruthy();
    expect(screen.getByTestId('diary-history-day-2026-06-12')).toBeTruthy();
    expect(screen.getByTestId('diary-history-day-2026-06-11')).toBeTruthy();
    expect(screen.getAllByTestId('diary-history-logged-fact')).toHaveLength(2);

    fireEvent.press(screen.getByRole('tab', { name: i18n.t('timeline.filter-chips.2') }));

    await waitFor(() => {
      expect(screen.getAllByTestId('diary-history-logged-fact')).toHaveLength(1);
    });
    expect(screen.queryByTestId('diary-history-day-2026-06-11')).toBeNull();
  });
});
