import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Reminder } from '@/contracts/supabase';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import RemindersHubRoute from '../../app/(modals)/reminders';

const householdId = '00000000-0000-4000-8000-000000005001';
const puppyId = '00000000-0000-4000-8000-000000005002';
const userId = '00000000-0000-4000-8000-000000005003';

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseRemindersQuery = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
    push: (href: string) => mockRouterPush(href),
  },
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => mockUseActiveCareContext(),
}));

jest.mock('@/lib/query/reminders', () => ({
  useRemindersQuery: (
    receivedHouseholdId: string | undefined,
    receivedPuppyId: string | undefined,
  ) => mockUseRemindersQuery(receivedHouseholdId, receivedPuppyId),
}));

describe('RemindersHubRoute', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    mockRouterBack.mockClear();
    mockRouterPush.mockClear();
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId,
        householdRole: 'owner',
        puppyId,
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-07-02',
        userId,
      },
      puppy: null,
      status: 'ready',
    });
    mockUseRemindersQuery.mockReturnValue({
      data: [
        createReminder({
          enabled: true,
          id: '00000000-0000-4000-8000-000000005101',
          reminder_type: 'Morning feeding',
          schedule_rule: { repeat: 'daily', time: '7:30' },
        }),
        createReminder({
          enabled: false,
          id: '00000000-0000-4000-8000-000000005102',
          reminder_type: 'DHPP booster',
          schedule_rule: { repeat: 'daily', time: '9:00' },
        }),
      ],
      isError: false,
      isLoading: false,
    });
  });

  it('AC-REM-HUB-2 AC-REM-HUB-3 renders durable active reminder rows from the active care context', () => {
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(mockUseRemindersQuery).toHaveBeenCalledWith(householdId, puppyId);
    expect(screen.getByRole('header', { name: i18n.t('reminders.screen-title') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('more.screen-title') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('reminders.actions.add') })).toBeTruthy();
    expect(screen.getByRole('tab', { name: i18n.t('reminders.segments.0') }).props.accessibilityState)
      .toEqual(expect.objectContaining({ selected: true }));
    expect(screen.getByText(i18n.t('reminders.sections.feeding'))).toBeTruthy();
    expect(screen.getByText('Morning feeding')).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.row-subtitle-daily-template', {
      time: '7:30',
    }))).toBeTruthy();
    expect(screen.getByTestId('reminder-row-toggle-00000000-0000-4000-8000-000000005101').props.value)
      .toBe(true);

    expect(screen.queryByText('DHPP booster')).toBeNull();
  });

  it('AC-REM-HUB-3 switches to disabled reminders without rendering active rows', () => {
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    fireEvent.press(screen.getByRole('tab', { name: i18n.t('reminders.segments.1') }));

    expect(screen.getByText('DHPP booster')).toBeTruthy();
    expect(screen.getByTestId('reminder-row-toggle-00000000-0000-4000-8000-000000005102').props.value)
      .toBe(false);
    expect(screen.queryByText('Morning feeding')).toBeNull();
  });

  it('AC-REM-HUB-4 keeps back and add actions wired to the modal routes', () => {
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    fireEvent.press(screen.getByRole('button', { name: i18n.t('more.screen-title') }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.actions.add') }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith('/reminders/edit');
  });

  it('AC-REM-HUB-2 renders loading, empty, and error states without fake durable rows', () => {
    mockUseRemindersQuery.mockReturnValueOnce({
      data: undefined,
      isError: false,
      isLoading: true,
    });
    const loading = render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByText(i18n.t('reminders.states.loading.title'))).toBeTruthy();
    expect(screen.queryByText('Morning feeding')).toBeNull();
    loading.unmount();

    mockUseRemindersQuery.mockReturnValueOnce({
      data: [],
      isError: false,
      isLoading: false,
    });
    const empty = render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByText(i18n.t('reminders.states.empty.title'))).toBeTruthy();
    expect(screen.queryByText('Morning feeding')).toBeNull();
    empty.unmount();

    mockUseRemindersQuery.mockReturnValueOnce({
      data: undefined,
      isError: true,
      isLoading: false,
    });
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByText(i18n.t('reminders.states.error.title'))).toBeTruthy();
    expect(screen.queryByText('Morning feeding')).toBeNull();
  });
});

function createReminder(overrides: Readonly<{
  enabled: boolean;
  id: string;
  reminder_type: string;
  schedule_rule: Record<string, string>;
}>): Reminder {
  return {
    assigned_to: null,
    created_at: '2026-07-02T10:00:00.000Z',
    created_by: userId,
    deleted_at: null,
    enabled: overrides.enabled,
    id: overrides.id,
    puppy_id: puppyId,
    quiet_hours: null,
    reminder_type: overrides.reminder_type,
    schedule_rule: overrides.schedule_rule,
    timezone: 'UTC',
    trusted_sitter_visible: false,
    updated_at: '2026-07-02T10:05:00.000Z',
    version: 1,
  };
}
