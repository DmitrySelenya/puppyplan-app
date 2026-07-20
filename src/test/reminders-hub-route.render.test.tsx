import { AccessibilityInfo, StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import type { Reminder } from '@/contracts/supabase';
import { designFontFamilies } from '@/design/fonts';
import { tokens } from '@/design/tokens';
import { RemindersHubStatePreview } from '@/features/reminders/screens/RemindersHubScreen';
import { formatCalendarDate } from '@/lib/i18n/format-date';
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
const mockDeleteReminderReset = jest.fn();
const mockToggleReminderMutate = jest.fn();
const mockToggleReminderReset = jest.fn();
const mockShowSnackbar = jest.fn();
const legacyNoEditKey = 'reminders.lifecycle.legacy-no-edit';
const scheduleUnavailableKey = 'reminders.row-schedule-unavailable';
const pausedSnackbarKey = 'reminders.lifecycle.paused-snackbar';
const pausedSnackbarCopy = 'Paused. Find it in Reminders → Off.';

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

jest.mock('@/design/primitives/Snackbar', () => {
  const actual = jest.requireActual<typeof import('@/design/primitives/Snackbar')>(
    '@/design/primitives/Snackbar',
  );

  return {
    ...actual,
    useSnackbar: () => ({
      dismissSnackbar: jest.fn(),
      replaceSnackbar: jest.fn(),
      showSnackbar: mockShowSnackbar,
    }),
  };
});

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
    mockShowSnackbar.mockReset();
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
          reminder_type: 'observation',
          schedule_rule: { repeat: 'daily', time: '09:00', title: 'DHPP booster' },
        }),
      ],
      isError: false,
      isLoading: false,
    });
    mockDeleteReminderReset.mockClear();
    mockToggleReminderReset.mockClear();
    mockUseDeleteReminderMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: mockDeleteReminderMutate,
      reset: mockDeleteReminderReset,
      variables: undefined,
    });
    mockUseToggleReminderEnabledMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: mockToggleReminderMutate,
      reset: mockToggleReminderReset,
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
    expect(screen.getByTestId('reminder-row-00000000-0000-4000-8000-000000005101').props.accessible)
      .toBe(false);
    const overflow = screen.getByRole('button', {
      name: 'Routine actions for Morning feeding',
    });
    const overflowStyle = StyleSheet.flatten(overflow.props.style) ?? {};
    expect(Math.max(overflowStyle.width ?? 0, overflowStyle.minWidth ?? 0))
      .toBeGreaterThanOrEqual(44);
    expect(Math.max(overflowStyle.height ?? 0, overflowStyle.minHeight ?? 0))
      .toBeGreaterThanOrEqual(44);

    expect(screen.queryByText('DHPP booster')).toBeNull();
  });

  it('AC-P4-MENU-1 opens visible lifecycle actions and routes Edit for a canonical active row', () => {
    mockUseRemindersQuery.mockReturnValue({
      data: [createReminder({
        enabled: true,
        id: '00000000-0000-4000-8000-000000005101',
        reminder_type: 'feeding',
        schedule_rule: { repeat: 'daily', time: '07:30', title: 'Morning feeding' },
      })],
      isError: false,
      isLoading: false,
    });
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    fireEvent.press(screen.getByRole('button', {
      name: 'Routine actions for Morning feeding',
    }));

    expect(screen.getByTestId('routine-lifecycle-modal').props.accessibilityViewIsModal).toBe(true);
    expect(screen.getByText('Edit routine')).toBeTruthy();
    expect(screen.getByText('Pause')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
    expect(screen.getByText('Diary entries stay')).toBeTruthy();
    expect(screen.queryByText(i18n.t(legacyNoEditKey))).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Edit routine' }));

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/reminders/edit',
      params: { reminderId: '00000000-0000-4000-8000-000000005101' },
    });
    expect(mockToggleReminderMutate).not.toHaveBeenCalled();
  });

  it('AC-P36-9 renders the typed legacy-edit explanation in every supported locale when editing is unavailable', async () => {
    for (const locale of ['en', 'ru', 'es'] as const) {
      await i18n.changeLanguage(locale);
      const localizedCaption = i18n.t(legacyNoEditKey);

      // A missing typed key returns the key itself, so this also verifies EN/RU/ES parity.
      expect(localizedCaption).not.toBe(legacyNoEditKey);

      const view = render(<RemindersHubRoute />, { wrapper: AppProviders });
      fireEvent.press(screen.getByRole('button', {
        name: i18n.t('reminders.lifecycle.open-actions-template', { title: 'Morning feeding' }),
      }));

      const caption = screen.getByText(localizedCaption);
      const existingMutedExplanation = screen.getByText(
        i18n.t('reminders.lifecycle.diary-entries-stay'),
      );
      const captionStyle = StyleSheet.flatten(caption.props.style);
      const mutedExplanationStyle = StyleSheet.flatten(existingMutedExplanation.props.style);
      expect(caption.props.numberOfLines).toBe(1);
      expect(captionStyle).toEqual(expect.objectContaining({
        color: mutedExplanationStyle?.color,
        fontFamily: mutedExplanationStyle?.fontFamily,
        fontSize: mutedExplanationStyle?.fontSize,
        fontWeight: mutedExplanationStyle?.fontWeight,
        lineHeight: mutedExplanationStyle?.lineHeight,
      }));
      expect(screen.queryByText(i18n.t('reminders.lifecycle.edit'))).toBeNull();
      expect(screen.getByText(i18n.t('reminders.lifecycle.pause'))).toBeTruthy();
      expect(screen.getByText(i18n.t('reminders.lifecycle.delete'))).toBeTruthy();
      expect(mockRouterPush).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it('AC-P4-MENU-2 AC-P36-7 pauses from the active-row menu with the active care context and success-only feedback', () => {
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(i18n.t(pausedSnackbarKey)).toBe(pausedSnackbarCopy);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('reminders.lifecycle.open-actions-template', { title: 'Morning feeding' }),
    }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.lifecycle.pause') }));

    expect(mockToggleReminderMutate).toHaveBeenCalledWith({
      enabled: false,
      householdId,
      puppyId,
      reminderId: '00000000-0000-4000-8000-000000005101',
      todayDate: '2026-07-02',
    }, expect.objectContaining({
      onSuccess: expect.any(Function),
    }));
    expect(mockShowSnackbar).not.toHaveBeenCalled();

    const pauseOptions = mockToggleReminderMutate.mock.calls[0]?.[1];
    pauseOptions?.onSuccess?.();

    expect(mockShowSnackbar).toHaveBeenCalledTimes(1);
    const [pausedSnackbar] = mockShowSnackbar.mock.calls[0] ?? [];
    expect(pausedSnackbar).toEqual(expect.objectContaining({
      accessibilityLabel: pausedSnackbarCopy,
      id: 'reminder-lifecycle-paused',
      message: pausedSnackbarCopy,
    }));
    expect(['info', 'success']).toContain(pausedSnackbar?.tone);
    expect(pausedSnackbar).not.toHaveProperty('durationMs');
    expect(pausedSnackbar).not.toHaveProperty('primaryAction');
    expect(pausedSnackbar).not.toHaveProperty('secondaryAction');
  });

  it('AC-P36-7 emits no Hub Snackbar for Resume or a rejected Pause while preserving the row error', () => {
    const view = render(<RemindersHubRoute />, { wrapper: AppProviders });
    fireEvent.press(screen.getByRole('tab', { name: i18n.t('reminders.segments.1') }));
    const pausedRow = screen.getByTestId('reminder-row-00000000-0000-4000-8000-000000005102');
    fireEvent.press(within(pausedRow).getByRole('button', { name: i18n.t('reminders.lifecycle.resume') }));

    mockUseToggleReminderEnabledMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: mockToggleReminderMutate,
      reset: mockToggleReminderReset,
      variables: {
        enabled: true,
        householdId,
        puppyId,
        reminderId: '00000000-0000-4000-8000-000000005102',
        todayDate: '2026-07-02',
      },
    });
    view.rerender(<RemindersHubRoute />);

    expect(mockShowSnackbar).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('tab', { name: i18n.t('reminders.segments.0') }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('reminders.lifecycle.open-actions-template', { title: 'Morning feeding' }),
    }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.lifecycle.pause') }));

    mockUseToggleReminderEnabledMutation.mockReturnValue({
      isError: true,
      isPending: false,
      mutate: mockToggleReminderMutate,
      reset: mockToggleReminderReset,
      variables: {
        enabled: false,
        householdId,
        puppyId,
        reminderId: '00000000-0000-4000-8000-000000005101',
        todayDate: '2026-07-02',
      },
    });
    view.rerender(<RemindersHubRoute />);

    expect(screen.getByTestId('hub-reminder-lifecycle-error-00000000-0000-4000-8000-000000005101'))
      .toBeTruthy();
    expect(mockShowSnackbar).not.toHaveBeenCalled();
  });

  it('ERR-P36-PAUSE-1 supersedes a stale Delete error when a direct toggle on another row fails', () => {
    const deleteReminderId = '00000000-0000-4000-8000-000000005101';
    const toggleReminderId = '00000000-0000-4000-8000-000000005102';
    let deleteFailed = true;
    let toggleFailed = false;
    const resetDeleteError = jest.fn(() => {
      deleteFailed = false;
    });
    const failToggle = jest.fn(() => {
      toggleFailed = true;
    });

    mockUseDeleteReminderMutation.mockImplementation(() => ({
      isError: deleteFailed,
      isPending: false,
      mutate: mockDeleteReminderMutate,
      reset: resetDeleteError,
      variables: {
        deletedAt: '2026-07-03T08:30:00.000Z',
        householdId,
        puppyId,
        reminderId: deleteReminderId,
        todayDate: '2026-07-02',
      },
    }));
    mockUseToggleReminderEnabledMutation.mockImplementation(() => ({
      isError: toggleFailed,
      isPending: false,
      mutate: failToggle,
      reset: mockToggleReminderReset,
      variables: toggleFailed ? {
        enabled: true,
        householdId,
        puppyId,
        reminderId: toggleReminderId,
        todayDate: '2026-07-02',
      } : undefined,
    }));

    const view = render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByTestId(`hub-reminder-lifecycle-error-${deleteReminderId}`)).toBeTruthy();
    fireEvent.press(screen.getByRole('tab', { name: i18n.t('reminders.segments.1') }));
    fireEvent.press(within(screen.getByTestId(`reminder-row-${toggleReminderId}`)).getByRole(
      'button',
      { name: i18n.t('reminders.lifecycle.resume') },
    ));
    view.rerender(<RemindersHubRoute />);

    expect(screen.queryByTestId(`hub-reminder-lifecycle-error-${deleteReminderId}`)).toBeNull();
    expect(screen.getByTestId(`hub-reminder-lifecycle-error-${toggleReminderId}`)).toBeTruthy();
    expect(mockShowSnackbar).not.toHaveBeenCalled();
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
      ],
      isError: false,
      isLoading: false,
    });

    render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByText('Morning meal')).toBeTruthy();
    expect(screen.getByText('Every day · 07:30')).toBeTruthy();
    expect(screen.getByText('Mo, We, Fr · 18:30')).toBeTruthy();
  });

  it.each([
    { date: '2026-02-18', locale: 'en', time: '06:45' },
    { date: '2026-07-12', locale: 'es', time: '14:00' },
    { date: '2026-11-03', locale: 'ru', time: '09:15' },
  ] as const)('AC-P36-3 formats a canonical one-off date with active locale $locale instead of raw ISO', async ({
    date,
    locale,
    time,
  }) => {
    jest.useFakeTimers();
    // Keep every formatting fixture ahead of the render clock; expiry is covered separately.
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    try {
      await i18n.changeLanguage(locale);
      const formattedDate = formatCalendarDate(date, locale);
      const expectedSubtitle = i18n.t('reminders.row-subtitle-once-template', {
        date: formattedDate,
        time,
      });
      const rawSubtitle = i18n.t('reminders.row-subtitle-once-template', { date, time });
      mockUseRemindersQuery.mockReturnValue({
        data: [createReminder({
          id: '00000000-0000-4000-8000-000000005113',
          reminder_type: 'sleep',
          schedule_rule: { date, repeat: 'never', time },
        })],
        isError: false,
        isLoading: false,
      });

      render(<RemindersHubRoute />, { wrapper: AppProviders });

      expect(formattedDate).not.toBe(date);
      expect(screen.getByText(expectedSubtitle)).toBeTruthy();
      expect(screen.queryByText(rawSubtitle)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-P36-4 EC-P36-TIME-1 recomputes one-off expiry at its Los Angeles wall-clock boundary', async () => {
    await i18n.changeLanguage('ru');
    jest.useFakeTimers();
    // July 11, 23:30 in America/Los_Angeles is July 12, 06:30Z: the local and UTC dates differ.
    jest.setSystemTime(new Date('2026-07-12T06:29:00.000Z'));
    mockUseRemindersQuery.mockReturnValue({
      data: [
        createReminder({
          id: '00000000-0000-4000-8000-000000005114',
          reminder_type: 'sleep',
          schedule_rule: { date: '2026-07-11', repeat: 'never', time: '23:30' },
          timezone: 'America/Los_Angeles',
        }),
        createReminder({
          enabled: false,
          id: '00000000-0000-4000-8000-000000005116',
          reminder_type: 'observation',
          schedule_rule: { repeat: 'daily', time: '08:00', title: 'Paused comparison' },
        }),
      ],
      isError: false,
      isLoading: false,
    });

    try {
      const view = render(<RemindersHubRoute />, { wrapper: AppProviders });
      const futureQuietStyle = StyleSheet.flatten(screen.getByTestId(
        'reminder-row-icon-00000000-0000-4000-8000-000000005114',
      ).props.style);
      const futureGlyphStroke = getRowIconGlyphStroke('00000000-0000-4000-8000-000000005114');

      expect(screen.queryByText('Прошло')).toBeNull();

      jest.setSystemTime(new Date('2026-07-12T06:30:00.000Z'));
      view.rerender(<RemindersHubRoute />);

      const expiredReminderRow = screen.getByTestId('reminder-row-00000000-0000-4000-8000-000000005114');
      const expiredSubtitle = within(expiredReminderRow).getByText(/^Прошло · .*23:30/);
      const expiredQuietStyle = StyleSheet.flatten(screen.getByTestId(
        'reminder-row-icon-00000000-0000-4000-8000-000000005114',
      ).props.style);
      const expiredGlyphStroke = getRowIconGlyphStroke('00000000-0000-4000-8000-000000005114');
      expect(expiredSubtitle.props.numberOfLines).toBe(2);
      expect(expiredQuietStyle).not.toEqual(futureQuietStyle);
      expect(expiredGlyphStroke).not.toBe(futureGlyphStroke);
      expect(screen.getByTestId('reminder-row-toggle-00000000-0000-4000-8000-000000005114').props.disabled)
        .toBe(false);
      fireEvent(
        screen.getByTestId('reminder-row-toggle-00000000-0000-4000-8000-000000005114'),
        'valueChange',
        false,
      );
      expect(mockToggleReminderMutate).toHaveBeenLastCalledWith(expect.objectContaining({
        enabled: false,
        reminderId: '00000000-0000-4000-8000-000000005114',
      }), expect.objectContaining({
        onSuccess: expect.any(Function),
      }));
      expect(screen.getByRole('button', {
        name: i18n.t('reminders.lifecycle.open-actions-template', {
          title: i18n.t('quick-log.details.tabs.sleep'),
        }),
      })).toBeTruthy();

      fireEvent.press(screen.getByRole('tab', { name: i18n.t('reminders.segments.1') }));
      const pausedQuietStyle = StyleSheet.flatten(screen.getByTestId(
        'reminder-row-icon-00000000-0000-4000-8000-000000005116',
      ).props.style);
      const pausedGlyphStroke = getRowIconGlyphStroke('00000000-0000-4000-8000-000000005116');
      expect(expiredQuietStyle).toEqual(pausedQuietStyle);
      expect(expiredGlyphStroke).toBe(pausedGlyphStroke);
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-P36-4 uses each one-off reminder IANA timezone instead of a Los Angeles-only offset', async () => {
    await i18n.changeLanguage('ru');
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-12T06:30:00.000Z'));
    mockUseRemindersQuery.mockReturnValue({
      data: [
        createReminder({
          id: '00000000-0000-4000-8000-000000005117',
          reminder_type: 'observation',
          schedule_rule: {
            date: '2026-07-12',
            repeat: 'never',
            time: '09:00',
            title: 'Los Angeles comparison',
          },
          timezone: 'America/Los_Angeles',
        }),
        createReminder({
          id: '00000000-0000-4000-8000-000000005118',
          reminder_type: 'observation',
          schedule_rule: {
            date: '2026-07-12',
            repeat: 'never',
            time: '09:00',
            title: 'Tokyo comparison',
          },
          timezone: 'Asia/Tokyo',
        }),
      ],
      isError: false,
      isLoading: false,
    });

    try {
      render(<RemindersHubRoute />, { wrapper: AppProviders });

      expect(within(screen.getByTestId('reminder-row-00000000-0000-4000-8000-000000005117'))
        .queryByText(/Прошло/)).toBeNull();
      expect(within(screen.getByTestId('reminder-row-00000000-0000-4000-8000-000000005118'))
        .getByText(/^Прошло · .*09:00/)).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-P36-4 projects an invalid persisted timezone as a localized, quiet, editable unavailable schedule', async () => {
    for (const locale of ['en', 'ru', 'es'] as const) {
      await i18n.changeLanguage(locale);
      const unavailableSubtitle = i18n.t(scheduleUnavailableKey);

      // A missing typed key resolves to itself, so this verifies EN/RU/ES parity before rendering.
      expect(unavailableSubtitle).not.toBe(scheduleUnavailableKey);

      const view = render(<RemindersHubRoute />, { wrapper: AppProviders });
      const invalidReminderId = '00000000-0000-4000-8000-000000005119';
      const pausedReminderId = '00000000-0000-4000-8000-000000005120';
      mockUseRemindersQuery.mockReturnValue({
        data: [
          createReminder({
            id: invalidReminderId,
            reminder_type: 'observation',
            schedule_rule: {
              date: '2026-12-01',
              repeat: 'never',
              time: '09:00',
              title: 'Schedule repair',
            },
            timezone: 'Mars/Olympus',
          }),
          createReminder({
            enabled: false,
            id: pausedReminderId,
            reminder_type: 'observation',
            schedule_rule: { repeat: 'daily', time: '08:00', title: 'Paused baseline' },
          }),
        ],
        isError: false,
        isLoading: false,
      });
      view.rerender(<RemindersHubRoute />);

      const invalidRow = screen.getByTestId(`reminder-row-${invalidReminderId}`);
      const invalidQuietStyle = StyleSheet.flatten(screen.getByTestId(
        `reminder-row-icon-${invalidReminderId}`,
      ).props.style);
      const invalidGlyphStroke = getRowIconGlyphStroke(invalidReminderId);
      expect(within(invalidRow).getByText(unavailableSubtitle)).toBeTruthy();
      expect(within(invalidRow).queryByText(i18n.t('reminders.row-expired'))).toBeNull();
      expect(screen.queryByText('Mars/Olympus')).toBeNull();
      expect(screen.getByTestId(`reminder-row-toggle-${invalidReminderId}`).props.disabled).toBe(false);
      const overflow = screen.getByRole('button', {
        name: i18n.t('reminders.lifecycle.open-actions-template', { title: 'Schedule repair' }),
      });
      expect(overflow).toBeTruthy();
      fireEvent(
        screen.getByTestId(`reminder-row-toggle-${invalidReminderId}`),
        'valueChange',
        false,
      );
      expect(mockToggleReminderMutate).toHaveBeenLastCalledWith(expect.objectContaining({
        enabled: false,
        reminderId: invalidReminderId,
      }), expect.objectContaining({
        onSuccess: expect.any(Function),
      }));
      fireEvent.press(overflow);
      expect(screen.getByRole('button', { name: i18n.t('reminders.lifecycle.edit') })).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.lifecycle.cancel') }));

      fireEvent.press(screen.getByRole('tab', { name: i18n.t('reminders.segments.1') }));
      const pausedQuietStyle = StyleSheet.flatten(screen.getByTestId(
        `reminder-row-icon-${pausedReminderId}`,
      ).props.style);
      expect(invalidQuietStyle).toEqual(pausedQuietStyle);
      expect(invalidGlyphStroke).toBe(getRowIconGlyphStroke(pausedReminderId));
      view.unmount();
    }
  });

  it('AC-P4-MENU-1 AC-P4-MENU-2 renders a quiet paused row with direct Resume and overflow', () => {
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    fireEvent.press(screen.getByRole('tab', { name: i18n.t('reminders.segments.1') }));

    expect(screen.getByText('DHPP booster')).toBeTruthy();
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.getByText('Paused routines do not appear in Diary.')).toBeTruthy();
    expect(screen.queryByTestId('reminder-row-toggle-00000000-0000-4000-8000-000000005102'))
      .toBeNull();
    const pausedRow = screen.getByTestId(
      'reminder-row-00000000-0000-4000-8000-000000005102',
    );
    expect(pausedRow.props.accessible).toBe(false);
    expect(StyleSheet.flatten(pausedRow.props.style)?.opacity ?? 1).toBe(1);
    expect(StyleSheet.flatten(screen.getByTestId(
      'reminder-row-icon-00000000-0000-4000-8000-000000005102',
    ).props.style)?.backgroundColor).toBe(tokens.color.surface.sunken);
    expect(screen.queryByLabelText('Paused')).toBeNull();
    const resume = screen.getByRole('button', { name: 'Resume' });
    expect(resume).toBeTruthy();
    expect(screen.getByRole('button', {
      name: 'Routine actions for DHPP booster',
    })).toBeTruthy();
    expect(screen.queryByText('Morning feeding')).toBeNull();

    fireEvent.press(resume);
    expect(mockToggleReminderMutate).toHaveBeenCalledWith({
      enabled: true,
      householdId,
      puppyId,
      reminderId: '00000000-0000-4000-8000-000000005102',
      todayDate: '2026-07-02',
    });
  });

  it('AC-P36-8 keeps the exact paused row Resume rendered beneath its focus-isolating lifecycle modal', () => {
    render(<RemindersHubRoute />, { wrapper: AppProviders });
    fireEvent.press(screen.getByRole('tab', { name: i18n.t('reminders.segments.1') }));

    const pausedRow = screen.getByTestId('reminder-row-00000000-0000-4000-8000-000000005102');
    expect(within(pausedRow).getByRole('button', {
      name: i18n.t('reminders.lifecycle.resume'),
    })).toBeTruthy();
    fireEvent.press(within(pausedRow).getByRole('button', {
      name: i18n.t('reminders.lifecycle.open-actions-template', { title: 'DHPP booster' }),
    }));

    expect(within(pausedRow).getByRole('button', {
      name: i18n.t('reminders.lifecycle.resume'),
    })).toBeTruthy();
    const lifecycleModal = screen.getByTestId('routine-lifecycle-modal');
    expect(lifecycleModal.props.accessibilityViewIsModal).toBe(true);
    expect(within(lifecycleModal).getByRole('button', {
      name: i18n.t('reminders.lifecycle.resume'),
    })).toBeTruthy();
  });

  it('AC-P4-MENU-DESIGN renders the paused-row Resume action as secondary', () => {
    render(<RemindersHubRoute />, { wrapper: AppProviders });
    fireEvent.press(screen.getByRole('tab', { name: i18n.t('reminders.segments.1') }));

    const resume = screen.getByRole('button', { name: 'Resume' });
    const resumeStyle = StyleSheet.flatten(
      typeof resume.props.style === 'function'
        ? resume.props.style({ pressed: false })
        : resume.props.style,
    ) ?? {};
    expect(resumeStyle.backgroundColor).toBe(tokens.color.primary[50]);
    expect(resumeStyle.borderColor).toBe(tokens.color.primary[200]);
  });

  it('AC-P4-MENU-2 exposes Resume from a paused row lifecycle menu', () => {
    render(<RemindersHubRoute />, { wrapper: AppProviders });
    fireEvent.press(screen.getByRole('tab', { name: i18n.t('reminders.segments.1') }));
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('reminders.lifecycle.open-actions-template', { title: 'DHPP booster' }),
    }));

    const lifecycleModal = screen.getByTestId('routine-lifecycle-modal');
    expect(within(lifecycleModal).getByText(i18n.t('reminders.lifecycle.edit'))).toBeTruthy();
    expect(within(lifecycleModal).getByText(i18n.t('reminders.lifecycle.resume'))).toBeTruthy();
    expect(within(lifecycleModal).getByText(i18n.t('reminders.lifecycle.delete'))).toBeTruthy();
    fireEvent.press(within(lifecycleModal).getByRole('button', {
      name: i18n.t('reminders.lifecycle.resume'),
    }));

    expect(mockToggleReminderMutate).toHaveBeenCalledWith(expect.objectContaining({
      enabled: true,
      reminderId: '00000000-0000-4000-8000-000000005102',
    }));
  });

  it('AC-P4-MENU-SCOPE drops an A selection across viewer and B care-context transitions', () => {
    const view = render(<RemindersHubRoute />, { wrapper: AppProviders });
    fireEvent.press(screen.getByRole('button', {
      name: 'Routine actions for Morning feeding',
    }));

    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId,
        householdRole: 'viewer',
        puppyId,
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-07-02',
        userId,
      },
      puppy: null,
      status: 'ready',
    });
    view.rerender(<RemindersHubRoute />);
    expect(screen.queryByTestId('routine-lifecycle-modal')).toBeNull();

    const householdB = '00000000-0000-4000-8000-000000005021';
    const puppyB = '00000000-0000-4000-8000-000000005022';
    mockUseActiveCareContext.mockReturnValue({
      careContext: {
        authState: 'authenticated',
        householdId: householdB,
        householdRole: 'owner',
        puppyId: puppyB,
        selectedTrackerIds: ['feeding'],
        todayDate: '2026-07-04',
        userId,
      },
      puppy: null,
      status: 'ready',
    });
    mockUseRemindersQuery.mockReturnValue({
      data: [createReminder({
        id: '00000000-0000-4000-8000-000000005121',
        reminder_type: 'Evening feeding',
        schedule_rule: { repeat: 'daily', time: '18:30' },
      })],
      isError: false,
      isLoading: false,
    });
    view.rerender(<RemindersHubRoute />);

    const stalePause = screen.queryByRole('button', { name: 'Pause' });
    if (stalePause !== null) {
      fireEvent.press(stalePause);
    }
    expect(mockToggleReminderMutate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('routine-lifecycle-modal')).toBeNull();
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
    }, expect.objectContaining({
      onSuccess: expect.any(Function),
    }));
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
      reset: mockToggleReminderReset,
      variables: {
        enabled: false,
        householdId,
        puppyId,
        reminderId: '00000000-0000-4000-8000-000000005101',
        todayDate: '2026-07-02',
      },
    });
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    // A failed lifecycle mutation is a row-level recoverable error, not a full-screen takeover.
    expect(screen.getByText('Morning feeding')).toBeTruthy();
    expect(screen.queryByText(i18n.t('reminders.states.error.title'))).toBeNull();
    const error = screen.getByTestId(
      'hub-reminder-lifecycle-error-00000000-0000-4000-8000-000000005101',
    );
    expect(error.props.accessibilityRole).toBe('alert');
    expect(screen.getByText(i18n.t('reminders.lifecycle.mutation-error-title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.lifecycle.mutation-error-body'))).toBeTruthy();
  });

  it('AC-P4-MENU-3 confirms the reassurance before soft-delete with active care context', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T08:30:00.000Z'));

    try {
      render(<RemindersHubRoute />, { wrapper: AppProviders });

      fireEvent.press(screen.getByRole('button', {
        name: 'Routine actions for Morning feeding',
      }));
      fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

      expect(mockDeleteReminderMutate).not.toHaveBeenCalled();
      expect(screen.getByText('Delete this routine?')).toBeTruthy();
      expect(screen.getByText('Existing Diary entries will stay.')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockDeleteReminderMutate).not.toHaveBeenCalled();

      fireEvent.press(screen.getByRole('button', {
        name: 'Routine actions for Morning feeding',
      }));
      fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

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

  it('AC-P36-6 preserves a routine title as two-line text-face context in delete confirmation', () => {
    const routineTitle = 'Long routine title kept visible during the destructive confirmation step';
    mockUseRemindersQuery.mockReturnValue({
      data: [createReminder({
        id: '00000000-0000-4000-8000-000000005115',
        reminder_type: 'observation',
        schedule_rule: { repeat: 'daily', time: '07:30', title: routineTitle },
      })],
      isError: false,
      isLoading: false,
    });
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    fireEvent.press(screen.getByRole('button', {
      name: `Routine actions for ${routineTitle}`,
    }));
    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    const confirmationTitle = within(screen.getByTestId('routine-lifecycle-modal'))
      .getAllByText(routineTitle).filter((node) => (
      StyleSheet.flatten(node.props.style)?.fontFamily === designFontFamilies.text.regular
      ));
    expect(confirmationTitle).toHaveLength(1);
    expect(confirmationTitle[0]?.props.numberOfLines).toBe(2);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('AC-P4-MENU-3 keeps VoiceOver Delete reachable through the independent overflow', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T08:30:00.000Z'));

    try {
      render(<RemindersHubRoute />, { wrapper: AppProviders });

      fireEvent.press(screen.getByRole('button', {
        name: 'Routine actions for Morning feeding',
      }));
      fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

      expect(mockDeleteReminderMutate).not.toHaveBeenCalled();
      expect(screen.getByText('Existing Diary entries will stay.')).toBeTruthy();
      fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

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

  it('AC-REM-DELETE-4 disables row controls while a delete mutation is pending', () => {
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
    expect(screen.getByRole('button', {
      name: 'Routine actions for Morning feeding',
    }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('reminder-row-pending-00000000-0000-4000-8000-000000005101')).toBeTruthy();
  });

  it('AC-REM-DELETE-5 renders delete mutation errors beside the affected durable row', () => {
    mockUseDeleteReminderMutation.mockReturnValueOnce({
      isError: true,
      isPending: false,
      mutate: mockDeleteReminderMutate,
      reset: mockDeleteReminderReset,
      variables: {
        deletedAt: '2026-07-03T08:30:00.000Z',
        householdId,
        puppyId,
        reminderId: '00000000-0000-4000-8000-000000005101',
        todayDate: '2026-07-02',
      },
    });

    render(<RemindersHubRoute />, { wrapper: AppProviders });

    expect(screen.getByText('Morning feeding')).toBeTruthy();
    expect(screen.queryByText(i18n.t('reminders.states.error.title'))).toBeNull();
    expect(screen.getByTestId(
      'hub-reminder-lifecycle-error-00000000-0000-4000-8000-000000005101',
    )).toBeTruthy();
    expect(screen.queryByTestId(
      'hub-reminder-lifecycle-error-00000000-0000-4000-8000-000000005102',
    )).toBeNull();
  });

  it('AC-P4-MENU-ERR clears the lifecycle mutation error when routine actions reopen', () => {
    mockUseToggleReminderEnabledMutation.mockReturnValue({
      isError: true,
      isPending: false,
      mutate: mockToggleReminderMutate,
      reset: mockToggleReminderReset,
      variables: {
        enabled: false,
        householdId,
        puppyId,
        reminderId: '00000000-0000-4000-8000-000000005101',
        todayDate: '2026-07-02',
      },
    });
    render(<RemindersHubRoute />, { wrapper: AppProviders });

    fireEvent.press(screen.getByRole('button', {
      name: 'Routine actions for Morning feeding',
    }));

    expect(mockToggleReminderReset).toHaveBeenCalledTimes(1);
    expect(mockDeleteReminderReset).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('routine-lifecycle-modal')).toBeTruthy();
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
  timezone?: string;
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
    timezone: overrides.timezone ?? 'UTC',
    trusted_sitter_visible: false,
    updated_at: '2026-07-02T10:05:00.000Z',
    version: 1,
  };
}

function getRowIconGlyphStroke(reminderId: string): unknown {
  return screen.getByTestId(`reminder-row-icon-${reminderId}`)
    .findByProps({ viewBox: '0 0 24 24' }).props.stroke;
}
