import { Profiler, type ReactElement } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';

import { tokens } from '@/design/tokens';
import {
  buildDiaryDayModel,
  type DiaryDayModel,
  type DiaryPlannedItem,
} from '@/contracts/diary-day';
import { i18n } from '@/lib/i18n';
import { createPuppyPlanQueryClient } from '@/lib/query/client';
import { queryKeys, type TimelineFilters } from '@/lib/query/keys';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import { TodayScreen } from '@/features/today/screens/TodayScreen';

const mockListEvents = jest.fn();
let mockFontScale = 1;

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'useWindowDimensions', {
    value: () => ({
      fontScale: mockFontScale,
      height: 667,
      scale: 2,
      width: 375,
    }),
  });
});

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
  userId: createdBy,
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

function timelineKeyForDate(date: string) {
  return queryKeys.events.timeline(householdId, puppyId, {
    from: date,
    to: date,
  });
}

function diaryHistoryTimelineKey(filters: TimelineFilters = {}) {
  return queryKeys.events.timeline(householdId, puppyId, filters);
}

function renderWithQuery(
  element: ReactElement,
  queryClient: QueryClient = createPuppyPlanQueryClient(),
) {
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

function createPlannedItem(
  overrides: Partial<DiaryPlannedItem> = {},
): DiaryPlannedItem {
  return {
    displayAt: '2026-06-12T08:00:00.000Z',
    kind: 'planned',
    plannedAt: '2026-06-12T08:00:00.000Z',
    reminderId: '00000000-0000-4000-8000-000000002701',
    scheduledFor: '2026-06-12T08:00:00.000Z',
    status: 'upcoming',
    time: '08:00',
    trackerId: 'feeding',
    ...overrides,
  };
}

function createDayModel(items: readonly DiaryDayModel['items'][number][]): DiaryDayModel {
  return { day: todayDate, items, timeZone: 'UTC' };
}

describe('Today core card rendering', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockFontScale = 1;
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

  it.each([
    { fontScale: 1.999, heroAfterDayList: false },
    { fontScale: 2, heroAfterDayList: true },
  ])('AC-DT-2 AC-DT-3 AC-DT-4 places the full Diary hero around the day list at fontScale $fontScale', async ({
    fontScale,
    heroAfterDayList,
  }) => {
    mockFontScale = fontScale;
    const { toJSON } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        dayModel={createDayModel([createPlannedItem()])}
        dayModelStatus="ready"
        openQuickLog={openQuickLog}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('diary-info-hero')).toBeTruthy();
      expect(screen.getByTestId('diary-history-section')).toBeTruthy();
    });

    const hero = screen.getByTestId('diary-info-hero');
    expect(hero.props.accessibilityRole).toBe('summary');
    expect(screen.getAllByTestId('diary-info-hero')).toHaveLength(1);
    expect(screen.getByText(i18n.t('today.hero.first-day.title'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('today.hero.first-day.primary'),
    })).toBeTruthy();

    const tree = JSON.stringify(toJSON());
    const heroIndex = tree.indexOf('diary-info-hero');
    const dayListIndex = tree.indexOf('diary-history-section');
    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(dayListIndex).toBeGreaterThanOrEqual(0);
    expect(heroAfterDayList ? heroIndex > dayListIndex : heroIndex < dayListIndex).toBe(true);
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

  it('PUP-27 I1 renders a selectable Diary week strip with per-day testIDs and selected state', async () => {
    const { queryClient } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [createRow()]);
    });

    await waitFor(() => {
      expect(screen.getByTestId('diary-header')).toBeTruthy();
    });

    const weekStrip = screen.getByLabelText(i18n.t('today.week-strip.label'));
    expect(weekStrip.props.accessibilityRole).toBeUndefined();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    const selectedToday = screen.getByLabelText(i18n.t('today.week-strip.day-label', {
      date: 'Jun 12',
      state: i18n.t('today.week-strip.state-selected-today'),
      weekday: 'Friday',
    }));
    const calendarWeekStart = screen.getByLabelText(i18n.t('today.week-strip.day-label', {
      date: 'Jun 8',
      state: i18n.t('today.week-strip.state-default'),
      weekday: 'Monday',
    }));
    const rollingWindowOverflow = screen.queryByLabelText(i18n.t('today.week-strip.day-label', {
      date: 'Jun 15',
      state: i18n.t('today.week-strip.state-default'),
      weekday: 'Monday',
    }));

    expect(screen.getByTestId('week-strip-day-2026-06-12')).toBeTruthy();
    expect(screen.getByTestId('week-strip-day-2026-06-08')).toBeTruthy();
    expect(selectedToday.props.accessibilityRole).toBe('button');
    expect(calendarWeekStart.props.accessibilityRole).toBe('button');
    expect(rollingWindowOverflow).toBeNull();
    expect(selectedToday.props.accessibilityState?.selected).toBe(true);
    expect(calendarWeekStart.props.accessibilityState?.selected).toBe(false);
  });

  it('PUP-27 I2 selects a past WeekStrip day and renders only that day timeline', async () => {
    const todayRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000002621',
      event_type: 'feeding',
      id: '00000000-0000-4000-8000-000000002631',
      occurred_at: '2026-06-12T08:00:00.000Z',
      payload: { amount: 'meal' },
    });
    const pastRow = createRow({
      client_event_id: 'evt_00000000-0000-4000-8000-000000002622',
      event_type: 'potty',
      id: '00000000-0000-4000-8000-000000002632',
      occurred_at: '2026-06-11T07:15:00.000Z',
      payload: { subtype: 'outside' },
    });
    mockListEvents.mockImplementation((request: { filters?: TimelineFilters }) => {
      if (request.filters?.from === '2026-06-11') {
        return Promise.resolve([pastRow]);
      }

      if (request.filters?.from === todayDate) {
        return Promise.resolve([todayRow]);
      }

      return Promise.resolve([]);
    });

    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('week-strip-day-2026-06-11'));

    await waitFor(() => {
      expect(screen.getByTestId('diary-selected-day-timeline')).toBeTruthy();
    });
    expect(screen.getByTestId('diary-selected-day-header')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.trackers.potty-outside'))).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('quick-log.trackers.feeding'))).toBeNull();
    expect(screen.queryByTestId('diary-info-hero')).toBeNull();
    expect(screen.queryByTestId('diary-history-filter-bar')).toBeNull();
  });

  it('PUP-27 I3 returns to today behavior when today is tapped after another day', async () => {
    mockListEvents.mockImplementation((request: { filters?: TimelineFilters }) => {
      if (request.filters?.from === todayDate) {
        return Promise.resolve([createRow()]);
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
      queryClient.setQueryData(todayTimelineKey(), [createRow()]);
      queryClient.setQueryData(timelineKeyForDate('2026-06-11'), []);
    });

    await waitFor(() => {
      expect(screen.getByTestId('diary-info-hero')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('week-strip-day-2026-06-11'));

    await waitFor(() => {
      expect(screen.queryByTestId('diary-info-hero')).toBeNull();
    });

    fireEvent.press(screen.getByTestId('week-strip-day-2026-06-12'));

    await waitFor(() => {
      expect(screen.getByTestId('diary-info-hero')).toBeTruthy();
    });
    expect(screen.getByRole('button', {
      name: i18n.t('today.history.open-action'),
    })).toBeTruthy();
  });

  it('PUP-27 I4 shows the existing empty style for a future selected day without today-only content', async () => {
    mockListEvents.mockImplementation((request: { filters?: TimelineFilters }) => {
      if (request.filters?.from === todayDate) {
        return Promise.resolve([createRow()]);
      }

      return Promise.resolve([]);
    });
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('week-strip-day-2026-06-14'));

    await waitFor(() => {
      expect(screen.getByTestId('diary-selected-day-empty-state')).toBeTruthy();
    });
    expect(screen.getByText(i18n.t('today.quick-log.empty.title'))).toBeTruthy();
    expect(screen.queryByTestId('diary-info-hero')).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('today.history.open-action'),
    })).toBeNull();
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

  it('AC-P3-HISTORY-1 keeps an older failed delete sentinel visible as the only Retry-only history row', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000002801';
    const durableRow = createRow({
      client_event_id: clientEventId,
      id: '00000000-0000-4000-8000-000000002802',
      occurred_at: '2026-06-11T07:15:00.000Z',
      updated_at: '2026-06-11T07:15:01.000Z',
    });
    const retainedDelete = createRow({
      ...durableRow,
      localSync: {
        state: 'deleted_before_sync',
        category: 'network_unavailable',
        retryCount: 2,
      },
      updated_at: '2026-06-11T07:15:02.000Z',
    });
    const actions = {
      onDelete: jest.fn(),
      onEdit: jest.fn(),
      onRetry: jest.fn(),
      onUndo: jest.fn(),
    };
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={actions}
        careContext={careContext}
        dayModel={createDayModel([createPlannedItem()])}
        dayModelStatus="ready"
        onCheckOff={jest.fn()}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), []);
      queryClient.setQueryData(diaryHistoryTimelineKey(), [durableRow]);
      queryClient.setQueryData(timelineKeyForDate('2026-06-11'), [retainedDelete]);
    });

    await waitFor(() => expect(screen.getByTestId('diary-mixed-day-list')).toBeTruthy());
    expect(screen.getByTestId('diary-planned-upcoming')).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toBeNull();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('today.history.open-action'),
    }));

    await waitFor(() => {
      expect(screen.getByTestId('diary-history-day-2026-06-11')).toBeTruthy();
      expect(screen.getAllByTestId('diary-history-logged-fact')).toHaveLength(1);
      expect(screen.getByText(i18n.t('timeline.pills.failed'))).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('timeline.actor-you'))).toBeNull();
    expect(screen.queryByTestId('diary-history-swipe-delete')).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('today.history.item-actions'),
    })).toBeNull();
    expect(screen.queryByText(i18n.t('today.history.delete-action'))).toBeNull();
    expect(screen.queryByText(i18n.t('common.edit'))).toBeNull();
    expect(screen.queryByText(i18n.t('quick-log.snackbar.undo'))).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    })).toBeNull();

    fireEvent.press(screen.getByTestId('diary-history-logged-fact'));
    fireEvent.press(screen.getByTestId('diary-history-logged-fact-card'));
    expect(actions.onEdit).not.toHaveBeenCalled();

    const retryAction = screen.getByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    });
    expect(screen.getAllByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toHaveLength(1);
    fireEvent.press(retryAction);
    expect(actions.onRetry).toHaveBeenCalledTimes(1);
    expect(actions.onRetry).toHaveBeenCalledWith(clientEventId, 'manual_retry', 'today');
    expect(actions.onDelete).not.toHaveBeenCalled();
    expect(actions.onEdit).not.toHaveBeenCalled();
    expect(actions.onUndo).not.toHaveBeenCalled();
  });

  it('AC-P3-HISTORY-1 closes synced history actions when a newer failed delete sentinel takes over', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000002813';
    const durableRow = createRow({
      client_event_id: clientEventId,
      id: '00000000-0000-4000-8000-000000002814',
      occurred_at: '2026-06-11T09:15:00.000Z',
      updated_at: '2026-06-11T09:15:01.000Z',
    });
    const retainedDelete = createRow({
      ...durableRow,
      localSync: {
        state: 'deleted_before_sync',
        category: 'network_unavailable',
        retryCount: 1,
      },
      updated_at: '2026-06-11T09:15:02.000Z',
    });
    const actions = {
      onDelete: jest.fn(),
      onEdit: jest.fn(),
      onRetry: jest.fn(),
      onUndo: jest.fn(),
    };
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={actions}
        careContext={careContext}
        dayModel={createDayModel([createPlannedItem()])}
        dayModelStatus="ready"
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), []);
      queryClient.setQueryData(diaryHistoryTimelineKey(), [durableRow]);
      queryClient.setQueryData(timelineKeyForDate('2026-06-11'), [durableRow]);
    });

    fireEvent.press(await screen.findByRole('button', {
      name: i18n.t('today.history.open-action'),
    }));

    const itemActions = await screen.findByRole('button', {
      name: i18n.t('today.history.item-actions'),
    });
    fireEvent.press(itemActions);
    expect(screen.getByRole('button', { name: i18n.t('common.edit') })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('today.history.delete-action'),
    })).toBeTruthy();
    fireEvent.press(screen.getByTestId('diary-history-logged-fact-card'));
    expect(actions.onEdit).toHaveBeenCalledTimes(1);

    act(() => {
      queryClient.setQueryData(timelineKeyForDate('2026-06-11'), [retainedDelete]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('timeline.pills.failed'))).toBeTruthy();
      expect(screen.queryByRole('button', {
        name: i18n.t('today.history.item-actions'),
      })).toBeNull();
      expect(screen.queryByRole('button', { name: i18n.t('common.edit') })).toBeNull();
      expect(screen.queryByRole('button', {
        name: i18n.t('today.history.delete-action'),
      })).toBeNull();
      expect(screen.queryByRole('button', {
        name: i18n.t('quick-log.failed.tertiary'),
      })).toBeNull();
      expect(screen.queryByText(i18n.t('quick-log.snackbar.undo'))).toBeNull();
    });

    fireEvent.press(screen.getByTestId('diary-history-logged-fact'));
    fireEvent.press(screen.getByTestId('diary-history-logged-fact-card'));
    expect(actions.onEdit).toHaveBeenCalledTimes(1);

    const retryAction = screen.getByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    });
    expect(screen.getAllByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toHaveLength(1);
    fireEvent.press(retryAction);
    expect(actions.onRetry).toHaveBeenCalledTimes(1);
    expect(actions.onRetry).toHaveBeenCalledWith(clientEventId, 'manual_retry', 'today');
    expect(actions.onDelete).not.toHaveBeenCalled();
    expect(actions.onUndo).not.toHaveBeenCalled();
  });

  it('AC-P3-HISTORY-1 keeps an accepted older delete hidden while suppressing its durable history row', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000002803';
    const durableRow = createRow({
      client_event_id: clientEventId,
      event_type: 'potty',
      id: '00000000-0000-4000-8000-000000002804',
      occurred_at: '2026-06-11T08:15:00.000Z',
      payload: { subtype: 'outside' },
      updated_at: '2026-06-11T08:15:01.000Z',
    });
    const retainedDelete = createRow({
      ...durableRow,
      localSync: {
        state: 'deleted_before_sync',
        category: null,
        retryCount: 0,
      },
      updated_at: '2026-06-11T08:15:02.000Z',
    });
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={{ onRetry: jest.fn() }}
        careContext={careContext}
        dayModel={createDayModel([createPlannedItem()])}
        dayModelStatus="ready"
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), []);
      queryClient.setQueryData(diaryHistoryTimelineKey(), [durableRow]);
      queryClient.setQueryData(timelineKeyForDate('2026-06-11'), [retainedDelete]);
    });

    fireEvent.press(await screen.findByRole('button', {
      name: i18n.t('today.history.open-action'),
    }));

    await waitFor(() => expect(screen.getByTestId('diary-history-filter-bar')).toBeTruthy());
    expect(screen.queryAllByTestId('diary-history-logged-fact')).toHaveLength(0);
    expect(screen.queryByTestId('diary-history-day-2026-06-11')).toBeNull();
    expect(screen.getByText(i18n.t('timeline.empty-filter'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('timeline.actor-you'))).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toBeNull();
  });

  it('AC-P3-HISTORY-2 filters and deterministically dedupes failed history sentinels by client id', async () => {
    const feedingClientEventId = 'evt_00000000-0000-4000-8000-000000002805';
    const pottyClientEventId = 'evt_00000000-0000-4000-8000-000000002806';
    const feedingDurable = createRow({
      client_event_id: feedingClientEventId,
      id: '00000000-0000-4000-8000-000000002807',
      occurred_at: '2026-06-10T07:15:00.000Z',
      updated_at: '2026-06-10T07:15:01.000Z',
    });
    const pottyDurable = createRow({
      client_event_id: pottyClientEventId,
      event_type: 'potty',
      id: '00000000-0000-4000-8000-000000002808',
      occurred_at: '2026-06-09T07:15:00.000Z',
      payload: { subtype: 'outside' },
      updated_at: '2026-06-09T07:15:01.000Z',
    });
    const feedingDeleteOlder = createRow({
      ...feedingDurable,
      localSync: {
        state: 'deleted_before_sync',
        category: 'network_unavailable',
        retryCount: 1,
      },
      updated_at: '2026-06-10T07:15:02.000Z',
    });
    const feedingDeletePreferred = createRow({
      ...feedingDeleteOlder,
      localSync: {
        state: 'deleted_before_sync',
        category: 'server_5xx',
        retryCount: 3,
      },
      updated_at: '2026-06-10T07:15:03.000Z',
    });
    const pottyDelete = createRow({
      ...pottyDurable,
      localSync: {
        state: 'deleted_before_sync',
        category: 'network_unavailable',
        retryCount: 1,
      },
      updated_at: '2026-06-09T07:15:02.000Z',
    });
    const actions = { onRetry: jest.fn() };
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={actions}
        careContext={careContext}
        dayModel={createDayModel([createPlannedItem()])}
        dayModelStatus="ready"
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), []);
      queryClient.setQueryData(diaryHistoryTimelineKey(), [feedingDurable, pottyDurable]);
      queryClient.setQueryData(diaryHistoryTimelineKey({ eventTypes: ['feeding'] }), [
        feedingDurable,
      ]);
      queryClient.setQueryData(timelineKeyForDate('2026-06-10'), [feedingDeleteOlder]);
      queryClient.setQueryData(queryKeys.events.timeline(householdId, puppyId, {
        eventTypes: ['feeding'],
        from: '2026-06-10',
        to: '2026-06-10',
      }), [feedingDeletePreferred]);
      queryClient.setQueryData(timelineKeyForDate('2026-06-09'), [pottyDelete]);
    });

    fireEvent.press(await screen.findByRole('button', {
      name: i18n.t('today.history.open-action'),
    }));
    fireEvent.press(await screen.findByRole('tab', {
      name: i18n.t('timeline.filter-chips.2'),
    }));

    await waitFor(() => {
      expect(screen.getAllByTestId('diary-history-logged-fact')).toHaveLength(1);
      expect(screen.getByText(i18n.t('timeline.pills.failed'))).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('quick-log.trackers.potty-outside'))).toBeNull();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    }));
    expect(actions.onRetry).toHaveBeenCalledTimes(1);
    expect(actions.onRetry).toHaveBeenCalledWith(
      feedingClientEventId,
      'manual_retry',
      'today',
    );
  });

  it('AC-P3-HISTORY-2 ignores a matching delete sentinel from another Timeline root', async () => {
    const clientEventId = 'evt_00000000-0000-4000-8000-000000002809';
    const durableRow = createRow({
      client_event_id: clientEventId,
      id: '00000000-0000-4000-8000-000000002810',
      occurred_at: '2026-06-11T09:15:00.000Z',
      updated_at: '2026-06-11T09:15:01.000Z',
    });
    const otherRootDelete = createRow({
      ...durableRow,
      household_id: '00000000-0000-4000-8000-000000002811',
      localSync: {
        state: 'deleted_before_sync',
        category: 'network_unavailable',
        retryCount: 1,
      },
      puppy_id: '00000000-0000-4000-8000-000000002812',
      updated_at: '2026-06-11T09:15:02.000Z',
    });
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={{ onRetry: jest.fn() }}
        careContext={careContext}
        dayModel={createDayModel([createPlannedItem()])}
        dayModelStatus="ready"
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), []);
      queryClient.setQueryData(diaryHistoryTimelineKey(), [durableRow]);
      queryClient.setQueryData(queryKeys.events.timeline(
        otherRootDelete.household_id,
        otherRootDelete.puppy_id,
      ), [otherRootDelete]);
    });

    fireEvent.press(await screen.findByRole('button', {
      name: i18n.t('today.history.open-action'),
    }));

    await waitFor(() => {
      expect(screen.getAllByTestId('diary-history-logged-fact')).toHaveLength(1);
      expect(screen.getByText(i18n.t('timeline.actor-you'))).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('timeline.pills.failed'))).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toBeNull();
  });

  it.each(['current day', 'history'] as const)(
    'AC-P3-ACTOR-5 never renders a foreign local private v2 row in %s while preserving actor-owned local and shared durable rows',
    (surface) => {
      const foreignActorId = '00000000-0000-4000-8000-000000002820';
      const occurredAt = surface === 'current day'
        ? '2026-06-12T09:00:00.000Z'
        : '2026-06-11T09:00:00.000Z';
      const foreignLocalRow = createRow({
        client_event_id: 'evt_foreign_private_delete',
        created_by: foreignActorId,
        event_type: 'observation',
        id: '00000000-0000-4000-8000-000000002821',
        localSync: {
          state: 'deleted_before_sync',
          category: 'network_unavailable',
          retryCount: 2,
        },
        occurred_at: occurredAt,
        payload_version: 2,
        payload: {
          title: 'Synthetic actor A private title',
          note: 'Synthetic actor A private note',
        },
      });
      const currentActorLocalRow = createRow({
        client_event_id: 'evt_current_actor_local_observation',
        event_type: 'observation',
        id: '00000000-0000-4000-8000-000000002822',
        localSync: {
          state: 'failed_retryable',
          category: 'request_timeout',
          retryCount: 1,
        },
        occurred_at: occurredAt,
        payload_version: 2,
        payload: { title: 'Synthetic current actor local title' },
      });
      const sharedDurableRow = createRow({
        client_event_id: 'evt_shared_durable_observation',
        created_by: foreignActorId,
        event_type: 'observation',
        id: '00000000-0000-4000-8000-000000002823',
        occurred_at: occurredAt,
        payload_version: 2,
        payload: { title: 'Synthetic shared durable title' },
      });
      const queryClient = createPuppyPlanQueryClient();
      const rows = [foreignLocalRow, currentActorLocalRow, sharedDurableRow];
      const dayModel = surface === 'current day'
        ? buildDiaryDayModel({
            day: todayDate,
            facts: rows.map((row) => ({
              clientEventId: row.client_event_id,
              eventType: row.event_type,
              occurredAt: row.occurred_at,
              payload: row.payload,
            })),
            nowMs: Date.parse('2026-06-12T12:00:00.000Z'),
            reminders: [],
            timeZone: 'UTC',
          })
        : createDayModel([createPlannedItem()]);

      queryClient.setQueryData(todayTimelineKey(), surface === 'current day' ? rows : []);
      queryClient.setQueryData(queryKeys.events.timeline(householdId, puppyId, {
        eventTypes: ['sleep'],
        from: '2026-06-11',
        to: '2026-06-11',
      }), []);
      queryClient.setQueryData(diaryHistoryTimelineKey(), surface === 'history' ? rows : []);

      renderWithQuery(
        <TodayScreen
          actions={{ onRetry: jest.fn() }}
          careContext={careContext}
          dayModel={dayModel}
          dayModelStatus="ready"
          openTimeline={openTimeline}
        />,
        queryClient,
      );

      if (surface === 'history') {
        fireEvent.press(screen.getByRole('button', {
          name: i18n.t('today.history.open-action'),
        }));
      }

      expect(screen.queryByText('Synthetic actor A private title')).toBeNull();
      expect(screen.queryByText('Synthetic actor A private note')).toBeNull();
      expect(screen.getByText('Synthetic current actor local title')).toBeTruthy();
      expect(screen.getByText('Synthetic shared durable title')).toBeTruthy();
      expect(mockListEvents).not.toHaveBeenCalled();
    },
  );

  it('AC-P5-UI renders upcoming, neutral past-unmarked, and done planned rows', async () => {
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        dayModel={createDayModel([
          createPlannedItem(),
          createPlannedItem({
            displayAt: '2026-06-12T09:00:00.000Z',
            plannedAt: '2026-06-12T09:00:00.000Z',
            reminderId: '00000000-0000-4000-8000-000000002702',
            scheduledFor: '2026-06-12T09:00:00.000Z',
            status: 'past-unmarked',
            time: '09:00',
            trackerId: 'sleep',
          }),
          createPlannedItem({
            actualAt: '2026-06-12T10:12:00.000Z',
            displayAt: '2026-06-12T10:00:00.000Z',
            plannedAt: '2026-06-12T10:00:00.000Z',
            reminderId: '00000000-0000-4000-8000-000000002703',
            scheduledFor: '2026-06-12T10:00:00.000Z',
            status: 'done',
            time: '10:00',
            trackerId: 'walk',
          }),
        ])}
        dayModelStatus="ready"
        onCheckOff={jest.fn()}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('diary-mixed-day-list')).toBeTruthy());
    expect(screen.getByTestId('diary-planned-upcoming')).toBeTruthy();
    expect(screen.getByTestId('diary-planned-past-unmarked')).toBeTruthy();
    expect(screen.getByTestId('diary-planned-done')).toBeTruthy();
    expect(screen.getByText(i18n.t('today.plan.past-unmarked'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.plan.actual-template', { time: '10:12 AM' }))).toBeTruthy();
  });

  it('AC-P33-UNCHECK takes the mark back off a done routine and deletes its linked event', async () => {
    const onDelete = jest.fn();
    mockListEvents.mockResolvedValue([
      createRow({
        client_event_id: 'evt_00000000-0000-4000-8000-000000002710',
        event_type: 'walk',
        occurred_at: '2026-06-12T10:12:00.000Z',
        payload: {},
      }),
    ]);

    renderWithQuery(
      <TodayScreen
        actions={{ onDelete }}
        careContext={careContext}
        dayModel={createDayModel([
          createPlannedItem({
            actualAt: '2026-06-12T10:12:00.000Z',
            clientEventId: 'evt_00000000-0000-4000-8000-000000002710',
            displayAt: '2026-06-12T10:00:00.000Z',
            plannedAt: '2026-06-12T10:00:00.000Z',
            reminderId: '00000000-0000-4000-8000-000000002703',
            scheduledFor: '2026-06-12T10:00:00.000Z',
            status: 'done',
            time: '10:00',
            trackerId: 'walk',
          }),
        ])}
        dayModelStatus="ready"
        onCheckOff={jest.fn()}
        openTimeline={openTimeline}
      />,
    );

    // The linked event arrives with the timeline query, not with the day model, so the way back
    // only opens once it lands.
    await waitFor(() => {
      expect(
        screen.getByLabelText(i18n.t('today.plan.uncheck')).props.accessibilityState,
      ).toMatchObject({ disabled: false });
    });

    // `done` is derived purely from a linked fact existing, so removing that fact is the exact
    // inverse of the check-off. Without it a mis-tap on a 44pt checkbox was a one-way door: the
    // handler was dropped at `done`, and the linked event never gets a row of its own to delete.
    await act(async () => {
      fireEvent.press(screen.getByRole('checkbox', { name: i18n.t('today.plan.uncheck') }));
      await Promise.resolve();
    });

    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({
      clientEventId: 'evt_00000000-0000-4000-8000-000000002710',
    }));
  });

  it('AC-P33-UNCHECK-6 does not delete the linked event twice when the checkbox is tapped twice', async () => {
    // The row stays `done` until the delete settles and the day model catches up, so a second tap
    // in that window would otherwise fire a second delete at the same event.
    let settleDelete: (() => void) | undefined;
    const onDelete = jest.fn().mockReturnValue(new Promise<void>((resolve) => {
      settleDelete = resolve;
    }));
    mockListEvents.mockResolvedValue([
      createRow({
        client_event_id: 'evt_00000000-0000-4000-8000-000000002712',
        event_type: 'walk',
        occurred_at: '2026-06-12T10:12:00.000Z',
        payload: {},
      }),
    ]);

    renderWithQuery(
      <TodayScreen
        actions={{ onDelete }}
        careContext={careContext}
        dayModel={createDayModel([
          createPlannedItem({
            actualAt: '2026-06-12T10:12:00.000Z',
            clientEventId: 'evt_00000000-0000-4000-8000-000000002712',
            displayAt: '2026-06-12T10:00:00.000Z',
            plannedAt: '2026-06-12T10:00:00.000Z',
            reminderId: '00000000-0000-4000-8000-000000002704',
            scheduledFor: '2026-06-12T10:00:00.000Z',
            status: 'done',
            time: '10:00',
            trackerId: 'walk',
          }),
        ])}
        dayModelStatus="ready"
        onCheckOff={jest.fn()}
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText(i18n.t('today.plan.uncheck')).props.accessibilityState,
      ).toMatchObject({ disabled: false });
    });

    fireEvent.press(screen.getByRole('checkbox', { name: i18n.t('today.plan.uncheck') }));
    await waitFor(() => {
      expect(
        screen.getByLabelText(i18n.t('today.plan.uncheck')).props.accessibilityState,
      ).toMatchObject({ disabled: true });
    });
    fireEvent.press(screen.getByRole('checkbox', { name: i18n.t('today.plan.uncheck') }));

    expect(onDelete).toHaveBeenCalledTimes(1);

    await act(async () => {
      settleDelete?.();
      await Promise.resolve();
    });
  });

  it('AC-P33-UNCHECK stops announcing a checkbox when the mark cannot be taken back', async () => {
    mockListEvents.mockResolvedValue([]);

    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        dayModel={createDayModel([
          createPlannedItem({
            actualAt: '2026-06-12T10:12:00.000Z',
            clientEventId: 'evt_00000000-0000-4000-8000-000000002711',
            displayAt: '2026-06-12T10:00:00.000Z',
            plannedAt: '2026-06-12T10:00:00.000Z',
            reminderId: '00000000-0000-4000-8000-000000002704',
            scheduledFor: '2026-06-12T10:00:00.000Z',
            status: 'done',
            time: '10:00',
            trackerId: 'walk',
          }),
        ])}
        dayModelStatus="ready"
        openTimeline={openTimeline}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('diary-planned-done')).toBeTruthy());

    // A read-only viewer has no way back, so the control must not keep promising a toggle it
    // cannot honour: an enabled `checkbox` role that silently no-ops is the defect itself.
    expect(screen.getByLabelText(i18n.t('today.plan.uncheck')).props.accessibilityState)
      .toMatchObject({ checked: true, disabled: true });
  });

  it('AC-P5-POTTY asks subtype before checking off a generic potty routine', async () => {
    const onCheckOff = jest.fn().mockResolvedValue(undefined);
    const potty = createPlannedItem({ trackerId: 'potty' });
    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        dayModel={createDayModel([potty])}
        dayModelStatus="ready"
        onCheckOff={onCheckOff}
        openTimeline={openTimeline}
      />,
    );

    fireEvent.press(await screen.findByTestId(`diary-check-off-${potty.reminderId}`));
    expect(screen.getByTestId('diary-potty-subtype')).toBeTruthy();
    expect(onCheckOff).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('today.plan.potty-outside') }));
    await waitFor(() => expect(onCheckOff).toHaveBeenCalledWith(potty, 'outside'));
  });

  it('AC-P5-RECOVERY keeps viewer read-only and exposes a retry after check-off failure', async () => {
    const item = createPlannedItem();
    const failing = jest.fn().mockRejectedValue(new Error('offline'));
    const first = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        dayModel={createDayModel([item])}
        dayModelStatus="ready"
        onCheckOff={failing}
        openTimeline={openTimeline}
      />,
    );

    fireEvent.press(await screen.findByTestId(`diary-check-off-${item.reminderId}`));
    await waitFor(() => {
      expect(screen.getByTestId('diary-check-off-error-persistence')).toBeTruthy();
      expect(
        screen.getByTestId(`diary-check-off-${item.reminderId}`).props.accessibilityState,
      ).toMatchObject({ disabled: false });
    });
    expect(screen.getByTestId('diary-check-off-error-persistence').props.accessibilityRole)
      .toBe('alert');
    await new Promise<void>((resolve) => setImmediate(resolve));
    first.rerender(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={first.queryClient}>
          <TodayScreen
            careContext={{ ...careContext, householdRole: 'viewer' }}
            dayModel={createDayModel([item])}
            dayModelStatus="ready"
            openTimeline={openTimeline}
          />
        </QueryClientProvider>
      </I18nextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('diary-mixed-day-list')).toBeTruthy());
    expect(screen.queryByTestId(`diary-check-off-${item.reminderId}`)).toBeNull();
  });

  it('AC-P1-RECOVERY-8 removes an obsolete check-off failure when the same routine converges to done', async () => {
    const item = createPlannedItem();
    const linkedClientEventId = 'evt_00000000-0000-4000-8000-000000002714';
    const failing = jest.fn().mockRejectedValue(new Error('offline'));
    const actualLabel = i18n.t('today.plan.actual-template', { time: '10:12 AM' });
    const failureLabel = i18n.t('today.plan.check-failed');
    const committedFrames: Array<Readonly<{ actual: boolean; failure: boolean }>> = [];
    let observeCommits = false;
    const observeCommit = () => {
      if (!observeCommits) return;
      committedFrames.push({
        actual: screen.queryByText(actualLabel) !== null,
        failure: screen.queryByText(failureLabel) !== null,
      });
    };
    const view = renderWithQuery(
      <Profiler id="ac-p1-recovery-8" onRender={observeCommit}>
        <TodayScreen
          careContext={careContext}
          dayModel={createDayModel([item])}
          dayModelStatus="ready"
          onCheckOff={failing}
          openTimeline={openTimeline}
        />
      </Profiler>,
    );

    fireEvent.press(await screen.findByTestId(`diary-check-off-${item.reminderId}`));
    await waitFor(() => {
      expect(screen.getByText(failureLabel)).toBeTruthy();
    });
    observeCommits = true;

    act(() => {
      view.queryClient.setQueryData(todayTimelineKey(), [createRow({
        client_event_id: linkedClientEventId,
        occurred_at: '2026-06-12T10:12:00.000Z',
      })]);
    });
    view.rerender(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={view.queryClient}>
          <Profiler id="ac-p1-recovery-8" onRender={observeCommit}>
            <TodayScreen
              careContext={careContext}
              dayModel={createDayModel([createPlannedItem({
                actualAt: '2026-06-12T10:12:00.000Z',
                clientEventId: linkedClientEventId,
                status: 'done',
              })])}
              dayModelStatus="ready"
              onCheckOff={failing}
              openTimeline={openTimeline}
            />
          </Profiler>
        </QueryClientProvider>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(actualLabel)).toBeTruthy();
    });
    expect(screen.queryByText(failureLabel)).toBeNull();
    expect(committedFrames.length).toBeGreaterThan(0);
    expect(committedFrames).not.toContainEqual({ actual: true, failure: true });
  });

  it('AC-P1-RECOVERY-9 keeps a reminder-linked local failure visible and actionable instead of showing Done', async () => {
    const linkedClientEventId = 'evt_00000000-0000-4000-8000-000000002715';
    const actions = {
      onDelete: jest.fn(),
      onRetry: jest.fn(),
    };
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={actions}
        careContext={careContext}
        dayModel={createDayModel([createPlannedItem({
          actualAt: '2026-06-12T10:12:00.000Z',
          clientEventId: linkedClientEventId,
          status: 'done',
        })])}
        dayModelStatus="ready"
        onCheckOff={jest.fn()}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [createRow({
        client_event_id: linkedClientEventId,
        localSync: {
          state: 'failed_permanent',
          category: 'server_5xx',
          retryCount: 4,
        },
        occurred_at: '2026-06-12T10:12:00.000Z',
      })]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('quick-log.failed.persistent-banner'))).toBeTruthy();
    });
    expect(screen.getByTestId('diary-planned-done')).toBeTruthy();
    expect(screen.queryByText(i18n.t('today.plan.actual-template', {
      time: '10:12 AM',
    }))).toBeNull();
    expect(screen.getByText(i18n.t('timeline.pills.failed'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.failed.primary'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.failed.tertiary'))).toBeTruthy();
  });

  it('AC-P1-RECOVERY-10 renders an accepted delete intent as pending and never as ordinary Done', async () => {
    const linkedClientEventId = 'evt_00000000-0000-4000-8000-000000002716';
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={{ onDelete: jest.fn(), onRetry: jest.fn() }}
        careContext={careContext}
        dayModel={createDayModel([createPlannedItem({
          actualAt: '2026-06-12T10:12:00.000Z',
          clientEventId: linkedClientEventId,
          status: 'done',
        })])}
        dayModelStatus="ready"
        onCheckOff={jest.fn()}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [createRow({
        client_event_id: linkedClientEventId,
        localSync: {
          state: 'deleted_before_sync',
          category: null,
          retryCount: 0,
        },
        occurred_at: '2026-06-12T10:12:00.000Z',
      })]);
    });

    await waitFor(() => {
      expect(screen.getByText(i18n.t('today.states.pending-write.title'))).toBeTruthy();
    });
    expect(screen.queryByText(i18n.t('today.plan.actual-template', {
      time: '10:12 AM',
    }))).toBeNull();
    expect(screen.queryByText(i18n.t('timeline.pills.synced'))).toBeNull();
  });

  it.each(['network_unavailable', 'permission_denied'] as const)(
    'AC-P1-RECOVERY-10 keeps a retained %s delete failure actionable without ordinary Done',
    async (category) => {
      const linkedClientEventId = category === 'network_unavailable'
        ? 'evt_00000000-0000-4000-8000-000000002717'
        : 'evt_00000000-0000-4000-8000-000000002718';
      const actions = {
        onDelete: jest.fn(),
        onRetry: jest.fn(),
      };
      const { queryClient } = renderWithQuery(
        <TodayScreen
          actions={actions}
          careContext={careContext}
          dayModel={createDayModel([createPlannedItem({
            actualAt: '2026-06-12T10:12:00.000Z',
            clientEventId: linkedClientEventId,
            status: 'done',
          })])}
          dayModelStatus="ready"
          onCheckOff={jest.fn()}
          openTimeline={openTimeline}
        />,
      );

      act(() => {
        queryClient.setQueryData(todayTimelineKey(), [createRow({
          client_event_id: linkedClientEventId,
          localSync: {
            state: 'deleted_before_sync',
            category,
            retryCount: 1,
          },
          occurred_at: '2026-06-12T10:12:00.000Z',
        })]);
      });

      await waitFor(() => {
        expect(screen.getByText(i18n.t('quick-log.failed.primary'))).toBeTruthy();
      });
      expect(screen.getByText(i18n.t('timeline.pills.failed'))).toBeTruthy();
      expect(screen.queryByText(i18n.t('quick-log.failed.tertiary'))).toBeNull();
      expect(screen.queryByText(i18n.t('today.plan.actual-template', {
        time: '10:12 AM',
      }))).toBeNull();
      fireEvent.press(screen.getByRole('button', {
        name: i18n.t('quick-log.failed.primary'),
      }));
      expect(actions.onRetry).toHaveBeenCalledWith(
        linkedClientEventId,
        'manual_retry',
        'today',
      );
      expect(actions.onDelete).not.toHaveBeenCalled();
    },
  );

  it('AC-P1-RECOVERY-10 exposes Retry-only for a retained linked delete failure when the real day model is unmarked', async () => {
    const reminderId = '00000000-0000-4000-8000-000000002719';
    const scheduledFor = '2026-06-12T08:00:00.000Z';
    const linkedClientEventId = 'evt_00000000-0000-4000-8000-000000002720';
    const actions = {
      onDelete: jest.fn(),
      onRetry: jest.fn(),
    };
    const model = buildDiaryDayModel({
      day: todayDate,
      facts: [],
      nowMs: Date.parse('2026-06-12T12:00:00.000Z'),
      reminders: [{
        enabled: true,
        id: reminderId,
        rule: { repeat: 'daily', time: '08:00' },
        trackerId: 'feeding',
      }],
      timeZone: 'UTC',
    });
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={actions}
        careContext={careContext}
        dayModel={model}
        dayModelStatus="ready"
        onCheckOff={jest.fn()}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(todayTimelineKey(), [createRow({
        client_event_id: linkedClientEventId,
        localSync: {
          state: 'deleted_before_sync',
          category: 'network_unavailable',
          retryCount: 1,
        },
        occurred_at: '2026-06-12T08:12:00.000Z',
        payload: {
          amount: 'meal',
          reminder_link: {
            reminder_id: reminderId,
            scheduled_for: scheduledFor,
          },
        },
      })]);
    });

    const retry = await screen.findByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    });
    expect(screen.queryByText(i18n.t('quick-log.failed.tertiary'))).toBeNull();
    expect(screen.queryByText(i18n.t('today.plan.actual-template', {
      time: '8:12 AM',
    }))).toBeNull();
    fireEvent.press(retry);
    expect(actions.onRetry).toHaveBeenCalledWith(
      linkedClientEventId,
      'manual_retry',
      'today',
    );
    expect(actions.onDelete).not.toHaveBeenCalled();
  });

  it('AC-P1-RECOVERY-10 ignores retained delete sentinels outside the selected local calendar day', async () => {
    const { queryClient } = renderWithQuery(
      <TodayScreen
        actions={{ onDelete: jest.fn(), onRetry: jest.fn() }}
        careContext={careContext}
        dayModel={createDayModel([createPlannedItem()])}
        dayModelStatus="ready"
        onCheckOff={jest.fn()}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(timelineKeyForDate('2026-06-11'), [
        createRow({
          client_event_id: 'evt_00000000-0000-4000-8000-000000002721',
          localSync: {
            state: 'deleted_before_sync',
            category: null,
            retryCount: 0,
          },
          occurred_at: '2026-06-11T12:00:00.000Z',
        }),
        createRow({
          client_event_id: 'evt_00000000-0000-4000-8000-000000002722',
          localSync: {
            state: 'deleted_before_sync',
            category: 'network_unavailable',
            retryCount: 1,
          },
          occurred_at: '2026-06-11T13:00:00.000Z',
        }),
      ]);
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(timelineKeyForDate('2026-06-11'))).toHaveLength(2);
    });
    expect(screen.queryByText(i18n.t('today.states.pending-write.title'))).toBeNull();
    expect(screen.queryByText(i18n.t('quick-log.failed.persistent-banner'))).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toBeNull();
  });
});
