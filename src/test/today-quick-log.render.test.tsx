import type { ReactElement } from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';

import { i18n } from '@/lib/i18n';
import { createPuppyPlanQueryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';
import { TodayScreen } from '@/features/today/screens/TodayScreen';

const householdId = '00000000-0000-4000-8000-000000001501';
const puppyId = '00000000-0000-4000-8000-000000001502';
const createdBy = '00000000-0000-4000-8000-000000001503';
const todayDate = '2026-05-27';

const careContext = {
  authState: 'authenticated',
  householdId,
  puppyId,
  todayDate,
} as const;
const openTimeline = jest.fn();
const testQueryClients: ReturnType<typeof createPuppyPlanQueryClient>[] = [];

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
    openTimeline.mockClear();
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
    cleanup();
    for (const queryClient of testQueryClients) {
      queryClient.clear();
    }

    testQueryClients.length = 0;
  });

  it('renders a distinct unavailable state without creating fake event query keys', () => {
    const { queryClient } = renderWithQuery(
      <TodayScreen
        careContext={null}
        openTimeline={openTimeline}
      />,
    );

    expect(screen.getByText(i18n.t('today.quick-log.unavailable.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.quick-log.unavailable.body'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('states.empty-first-run.title'))).toBeNull();
    expect(queryClient.getQueryCache().findAll()).toHaveLength(0);
  });

  it('renders pending Quick Log rows with Undo and Delete actions', () => {
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
      queryClient.setQueryData(queryKeys.events.timelineRoot(householdId, puppyId), [
        createRow({
          localSync: {
            state: 'pending_local',
            category: null,
            retryCount: 0,
          },
        }),
      ]);
    });

    expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    expect(screen.getByText(i18n.t('timeline.pills.pending'))).toBeTruthy();

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
    });
  });

  it('renders failed rows with Retry/Delete and gates the persistent banner by retry count', () => {
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
      queryClient.setQueryData(queryKeys.events.timelineRoot(householdId, puppyId), [
        createRow({
          localSync: {
            state: 'failed_retryable',
            category: 'request_timeout',
            retryCount: 2,
          },
        }),
      ]);
    });

    expect(screen.getByText(i18n.t('timeline.pills.failed'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('quick-log.failed.persistent-banner'))).toBeNull();

    act(() => {
      queryClient.setQueryData(queryKeys.events.timelineRoot(householdId, puppyId), [
        createRow({
          localSync: {
            state: 'failed_retryable',
            category: 'request_timeout',
            retryCount: 3,
          },
        }),
      ]);
    });

    expect(screen.getByText(i18n.t('quick-log.failed.persistent-banner'))).toBeTruthy();
    expect(screen.queryByLabelText(i18n.t('quick-log.failed.persistent-banner'))).toBeNull();

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    }));

    expect(actions.onRetry).toHaveBeenCalledWith(
      'evt_00000000-0000-4000-8000-000000001505',
      'manual_retry',
    );
    expect(actions.onDelete).toHaveBeenCalledWith({
      clientEventId: 'evt_00000000-0000-4000-8000-000000001505',
      eventType: 'feeding',
    });
  });

  it('renders synced rows with a non-color-only status and no local-only actions', () => {
    const actions = {
      onDelete: jest.fn(),
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
      queryClient.setQueryData(queryKeys.events.timelineRoot(householdId, puppyId), [
        createRow(),
      ]);
    });

    expect(screen.getByText(i18n.t('quick-log.trackers.feeding'))).toBeTruthy();
    expect(screen.getByText(i18n.t('timeline.pills.synced'))).toBeTruthy();
    expect(screen.queryByText('OK')).toBeNull();
    expect(JSON.stringify(toJSON())).not.toContain('"OK"');
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toBeNull();
  });

  it('omits pending and failed action buttons when handlers are not wired', () => {
    const { queryClient } = renderWithQuery(
      <TodayScreen
        careContext={careContext}
        openTimeline={openTimeline}
      />,
    );

    act(() => {
      queryClient.setQueryData(queryKeys.events.timelineRoot(householdId, puppyId), [
        createRow({
          localSync: {
            state: 'pending_local',
            category: null,
            retryCount: 0,
          },
        }),
      ]);
    });

    expect(screen.getByText(i18n.t('timeline.pills.pending'))).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.snackbar.undo'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    })).toBeNull();

    act(() => {
      queryClient.setQueryData(queryKeys.events.timelineRoot(householdId, puppyId), [
        createRow({
          localSync: {
            state: 'failed_retryable',
            category: 'request_timeout',
            retryCount: 1,
          },
        }),
      ]);
    });

    expect(screen.getByText(i18n.t('timeline.pills.failed'))).toBeTruthy();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.primary'),
    })).toBeNull();
    expect(screen.queryByRole('button', {
      name: i18n.t('quick-log.failed.tertiary'),
    })).toBeNull();
  });
});
