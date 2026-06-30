import type { ReactElement } from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';

import { i18n } from '@/lib/i18n';
import { createPuppyPlanQueryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
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

  it('renders one hero, capped daily cards, and one guidance card from the active care context', async () => {
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
      expect(screen.getByTestId('today-hero-card')).toBeTruthy();
    });

    expect(screen.getAllByTestId('today-hero-card')).toHaveLength(1);
    expect(screen.getAllByTestId('today-daily-card').length).toBeLessThanOrEqual(5);
    expect(screen.getAllByTestId('today-guidance-card')).toHaveLength(1);
    expect(screen.getByText(i18n.t('today.hero.day-2-morning.title'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('guidance.potty-rhythm.title')).length).toBeGreaterThan(0);
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
    expect(screen.getByText(i18n.t('today.daily-cards.first-day-banner'))).toBeTruthy();
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
      expect(screen.getByText(i18n.t('tabs.diary'))).toBeTruthy();
    });

    expect(screen.getByLabelText(i18n.t('today.week-strip.label'))).toBeTruthy();
    expect(screen.getAllByTestId('today-week-day')).toHaveLength(7);

    const selectedDay = screen.getByRole('button', {
      name: i18n.t('today.week-strip.day-label', {
        date: 'Jun 10',
        state: i18n.t('today.week-strip.state-selected'),
        weekday: 'Wednesday',
      }),
    });
    const todayMarker = screen.getByRole('button', {
      name: i18n.t('today.week-strip.day-label', {
        date: 'Jun 12',
        state: i18n.t('today.week-strip.state-today'),
        weekday: 'Friday',
      }),
    });

    expect(selectedDay.props.accessibilityState).toMatchObject({ selected: true });
    expect(todayMarker.props.accessibilityState).toMatchObject({ selected: false });
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
      expect(screen.getByTestId('today-state-all-done')).toBeTruthy();
    });

    expect(screen.getByText(i18n.t('today.states.all-done.status'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.all-done.title'))).toBeTruthy();
    expect(screen.getByLabelText(`${i18n.t('today.states.all-done.title')}. ${i18n.t('today.states.all-done.body')}`)).toBeTruthy();
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
      expect(screen.getByTestId('today-state-empty-history')).toBeTruthy();
    });

    expect(screen.getByText(i18n.t('today.states.empty-history.status'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.empty-history.title'))).toBeTruthy();
    expect(screen.getByLabelText(`${i18n.t('today.states.empty-history.title')}. ${i18n.t('today.states.empty-history.body')}`)).toBeTruthy();
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
      expect(screen.getByTestId('today-state-cold-start')).toBeTruthy();
    });

    expect(screen.getByText(i18n.t('today.states.cold-start.status'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.cold-start.title'))).toBeTruthy();
    expect(screen.getByLabelText(`${i18n.t('today.states.cold-start.title')}. ${i18n.t('today.states.cold-start.body')}`)).toBeTruthy();
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
      expect(screen.getByText(i18n.t('today.hero.missed-reminder.title'))).toBeTruthy();
    });

    expect(screen.getByText(i18n.t('today.deferred.reminders'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('today.states.error.status'))).toBeNull();
    expect(JSON.stringify(toJSON()).toLowerCase()).not.toContain('missed');
  });

  it('renders accident recovery as a Diary helper without the legacy Today eyebrow', async () => {
    mockListEvents.mockResolvedValue([
      createRow({
        event_type: 'potty',
        payload: {
          subtype: 'inside',
        },
      }),
    ]);

    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        todayPlanInput={{
          dayNumber: 3,
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('today.hero.accident-recovery.title'))).toBeTruthy();
    });

    expect(screen.getByText(i18n.t('today.hero.accident-recovery.body'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('today.hero.eyebrow')).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('renders the after-feeding pattern as a single soft Diary contextual tip', async () => {
    mockListEvents.mockResolvedValue([
      createRow({
        event_type: 'feeding',
        occurred_at: '2026-06-12T09:30:00.000Z',
        payload: {
          amount: 'meal',
        },
      }),
    ]);

    renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
        todayPlanInput={{
          dayNumber: 4,
          suggestedDailyCards: ['timeline_review', 'potty_rhythm'],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('today.daily-cards.feeding-pattern.title'))).toBeTruthy();
    });

    const tips = screen.getAllByTestId('diary-contextual-tip-card');
    expect(tips).toHaveLength(1);
    expect(screen.getAllByText(i18n.t('today.daily-cards.feeding-pattern.title'))).toHaveLength(1);
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

    const tree = JSON.stringify(toJSON());
    const titleIndex = tree.indexOf(i18n.t('tabs.diary'));
    const heroIndex = tree.indexOf(i18n.t('today.hero.day-7-weekly-rhythm.title'));
    const sectionIndex = tree.indexOf(i18n.t('today.history.section-title'));
    const historyIndex = tree.indexOf(i18n.t('today.history.open-action'));

    expect(titleIndex).toBeGreaterThanOrEqual(0);
    expect(heroIndex).toBeGreaterThan(titleIndex);
    expect(sectionIndex).toBeGreaterThan(heroIndex);
    expect(historyIndex).toBeGreaterThan(sectionIndex);
    expect(tree).not.toContain('Timeline');
    expect(screen.getAllByRole('button', {
      name: i18n.t('today.history.open-action'),
    })).toHaveLength(1);
  });
});
