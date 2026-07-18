import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Reminder } from '@/contracts/supabase';
import { RemindersHubStatePreview } from '@/features/reminders/screens/RemindersHubScreen';
import { i18n } from '@/lib/i18n';
import { AppProviders } from '@/lib/providers/AppProviders';

import RemindersHubRoute from '../../app/(modals)/reminders';

const householdId = '00000000-0000-4000-8000-000000005001';
const puppyId = '00000000-0000-4000-8000-000000005002';
const userId = '00000000-0000-4000-8000-000000005003';

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
const mockUseActiveCareContext = jest.fn();
const mockUseDeleteReminderMutation = jest.fn();
const mockUseRemindersQuery = jest.fn();
const mockUseToggleReminderEnabledMutation = jest.fn();
const mockDeleteReminderMutate = jest.fn();
const mockToggleReminderMutate = jest.fn();

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
  useDeleteReminderMutation: () => mockUseDeleteReminderMutation(),
  useToggleReminderEnabledMutation: () => mockUseToggleReminderEnabledMutation(),
}));

describe('RemindersHubRoute', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
    mockDeleteReminderMutate.mockClear();
    mockRouterBack.mockClear();
    mockRouterPush.mockClear();
    mockToggleReminderMutate.mockClear();
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
    mockUseDeleteReminderMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: mockDeleteReminderMutate,
      variables: undefined,
    });
    mockUseToggleReminderEnabledMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: mockToggleReminderMutate,
      variables: undefined,
    });
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('AC-REM-HUB-2 AC-REM-HUB-3 renders durable active reminder rows from the active care context', () => {
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(mockUseRemindersQuery).toHaveBeenCalledWith(householdId, puppyId);
    expect(screen.getByRole('header', { name: i18n.t('reminders.screen-title') })).toBeTruthy();
    expect(screen.getAllByText(i18n.t('reminders.screen-title'))).toHaveLength(1);
    expect(screen.getByRole('button', { name: i18n.t('more.screen-title') })).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('reminders.actions.add') })).toBeTruthy();
    expect(screen.getByRole('tab', { name: i18n.t('reminders.segments.0') }).props.accessibilityState)
      .toEqual(expect.objectContaining({ selected: true }));
    expect(screen.getByText(i18n.t('reminders.sections.feeding'))).toBeTruthy();
    expect(screen.getByText('Morning feeding')).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.form.legacy-unsupported'))).toBeTruthy();
    expect(screen.getByTestId('reminder-row-toggle-00000000-0000-4000-8000-000000005101').props.value)
      .toBe(true);

    expect(screen.queryByText('DHPP booster')).toBeNull();
  });

  it('AC-P4-ROUNDTRIP labels canonical daily, custom-day, and one-off rows accurately', () => {
    mockUseRemindersQuery.mockReturnValue({
      data: [
        createReminder({
          id: '00000000-0000-4000-8000-000000005111',
          reminder_type: 'feeding',
          schedule_rule: { repeat: 'daily', time: '07:30', title: 'Morning meal' },
        }),
        createReminder({
          id: '00000000-0000-4000-8000-000000005112',
          reminder_type: 'observation',
          // An observation routine must carry a title or note (see reminderScheduleDraftSchema).
          schedule_rule: { repeat: { days: [1, 3, 5] }, time: '18:30', title: 'Evening check' },
        }),
        createReminder({
          id: '00000000-0000-4000-8000-000000005113',
          reminder_type: 'sleep',
          schedule_rule: { date: '2026-07-12', repeat: 'never', time: '14:00' },
        }),
      ],
      isError: false,
      isLoading: false,
    });

    render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByText('Morning meal')).toBeTruthy();
    expect(screen.getByText('Every day · 07:30')).toBeTruthy();
    expect(screen.getByText('Mo, We, Fr · 18:30')).toBeTruthy();
    expect(screen.getByText('Once · 2026-07-12 · 14:00')).toBeTruthy();
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

  it('AC-REM-TOGGLE-3 calls the enabled toggle mutation with active care context and next value', () => {
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    fireEvent(
      screen.getByTestId('reminder-row-toggle-00000000-0000-4000-8000-000000005101'),
      'valueChange',
      false,
    );

    expect(mockToggleReminderMutate).toHaveBeenCalledWith({
      enabled: false,
      householdId,
      puppyId,
      reminderId: '00000000-0000-4000-8000-000000005101',
      todayDate: '2026-07-02',
    });
  });

  it('AC-REM-TOGGLE-4 disables the pending row toggle and renders mutation errors as the calm state card', () => {
    mockUseToggleReminderEnabledMutation.mockReturnValueOnce({
      isError: false,
      isPending: true,
      mutate: mockToggleReminderMutate,
      variables: {
        enabled: false,
        householdId,
        puppyId,
        reminderId: '00000000-0000-4000-8000-000000005101',
        todayDate: '2026-07-02',
      },
    });
    const pending = render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByTestId('reminder-row-toggle-00000000-0000-4000-8000-000000005101').props.disabled)
      .toBe(true);
    expect(screen.getByTestId('reminder-row-pending-00000000-0000-4000-8000-000000005101')).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.row-pending'))).toBeTruthy();
    expect(screen.queryByTestId('reminder-row-pending-00000000-0000-4000-8000-000000005102'))
      .toBeNull();
    pending.unmount();

    mockUseToggleReminderEnabledMutation.mockReturnValueOnce({
      isError: true,
      isPending: false,
      mutate: mockToggleReminderMutate,
      variables: undefined,
    });
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByText(i18n.t('reminders.states.error.title'))).toBeTruthy();
    expect(screen.queryByText('Morning feeding')).toBeNull();
  });

  it('AC-REM-DELETE-3 calls the soft-delete mutation with active care context and current timestamp', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T08:30:00.000Z'));

    try {
      render(<RemindersHubRoute />, { wrapper: AppProviders });

      fireEvent.press(screen.getByTestId(
        'reminder-row-delete-00000000-0000-4000-8000-000000005101',
        { includeHiddenElements: true },
      ));

      expect(mockDeleteReminderMutate).toHaveBeenCalledWith({
        deletedAt: '2026-07-03T08:30:00.000Z',
        householdId,
        puppyId,
        reminderId: '00000000-0000-4000-8000-000000005101',
        todayDate: '2026-07-02',
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-REM-DELETE-3 exposes a VoiceOver parity delete action for reminder rows', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T08:30:00.000Z'));

    try {
      render(<RemindersHubRoute />, { wrapper: AppProviders });

      fireEvent(screen.getByLabelText(
        `Morning feeding. ${i18n.t('reminders.form.legacy-unsupported')}`,
      ), 'accessibilityAction', {
        nativeEvent: {
          actionName: 'delete',
        },
      });

      expect(mockDeleteReminderMutate).toHaveBeenCalledWith({
        deletedAt: '2026-07-03T08:30:00.000Z',
        householdId,
        puppyId,
        reminderId: '00000000-0000-4000-8000-000000005101',
        todayDate: '2026-07-02',
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-REM-DELETE-4 disables the toggle and hides the swipe action while a delete mutation is pending', () => {
    mockUseDeleteReminderMutation.mockReturnValueOnce({
      isError: false,
      isPending: true,
      mutate: mockDeleteReminderMutate,
      variables: {
        deletedAt: '2026-07-03T08:30:00.000Z',
        householdId,
        puppyId,
        reminderId: '00000000-0000-4000-8000-000000005101',
        todayDate: '2026-07-02',
      },
    });

    render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByTestId('reminder-row-toggle-00000000-0000-4000-8000-000000005101').props.disabled)
      .toBe(true);
    expect(screen.queryByTestId('reminder-row-delete-00000000-0000-4000-8000-000000005101'))
      .toBeNull();
    expect(screen.getByTestId('reminder-row-pending-00000000-0000-4000-8000-000000005101')).toBeTruthy();
  });

  it('AC-REM-DELETE-5 renders delete mutation errors as the calm state card', () => {
    mockUseDeleteReminderMutation.mockReturnValueOnce({
      isError: true,
      isPending: false,
      mutate: mockDeleteReminderMutate,
      variables: undefined,
    });

    render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByText(i18n.t('reminders.states.error.title'))).toBeTruthy();
    expect(screen.queryByText('Morning feeding')).toBeNull();
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

  it('AC-REM-HUB-STATES renders deterministic hub state templates', () => {
    render(
      <AppProviders>
        <RemindersHubStatePreview state="loading" />
        <RemindersHubStatePreview state="pending-write" />
        <RemindersHubStatePreview state="error" />
        <RemindersHubStatePreview state="offline-read" />
        <RemindersHubStatePreview state="empty" />
      </AppProviders>,
    );

    for (const state of [
      'loading',
      'pending-write',
      'error',
      'offline-read',
      'empty',
    ] as const) {
      expect(screen.getByTestId(`reminders-hub-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`reminders.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`reminders.states.${state}.body`))).toBeTruthy();
    }

    expect(screen.getByTestId('reminders-hub-state-error').props.accessibilityRole).toBe('alert');
    expect(screen.getByTestId('reminders-hub-state-loading').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.getByTestId('reminders-hub-state-pending-write').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.queryByText(/@|token|provider|puppy a|notes|diagnostic payload/i)).toBeNull();
  });
});

function createReminder(overrides: Readonly<{
  enabled?: boolean;
  id: string;
  reminder_type: string;
  schedule_rule: Reminder['schedule_rule'];
}>): Reminder {
  return {
    assigned_to: null,
    created_at: '2026-07-02T10:00:00.000Z',
    created_by: userId,
    deleted_at: null,
    enabled: overrides.enabled ?? true,
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
