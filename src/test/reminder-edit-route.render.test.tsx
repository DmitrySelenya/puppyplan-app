import { AccessibilityInfo, Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { tokens } from '@/design/tokens';
import {
  ReminderEditScreen,
  ReminderEditStatePreview,
} from '@/features/reminders/screens/ReminderEditScreen';
import { i18n } from '@/lib/i18n';

import ReminderEditRoute from '../../app/(modals)/reminders/edit';

const mockRouterBack = jest.fn();
const mockCreateReminderMutateAsync = jest.fn();
const mockCareContext = {
  householdId: '00000000-0000-4000-8000-000000004102',
  householdRole: 'owner',
  puppyId: '00000000-0000-4000-8000-000000004103',
  selectedTrackerIds: ['feeding'],
  todayDate: '2026-07-02',
  userId: '00000000-0000-4000-8000-000000004101',
};

jest.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
  },
}));

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => ({
    careContext: mockCareContext,
    puppy: null,
    status: 'ready',
  }),
}));

jest.mock('@/lib/query/reminders', () => ({
  useCreateReminderMutation: () => ({
    isError: false,
    isPending: false,
    mutateAsync: mockCreateReminderMutateAsync,
  }),
}));

describe('ReminderEditRoute', () => {
  let openSettingsSpy: jest.SpyInstance<Promise<void>, []>;
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    mockRouterBack.mockClear();
    mockCreateReminderMutateAsync.mockReset();
    mockCreateReminderMutateAsync.mockResolvedValue({
      assigned_to: null,
      created_at: '2026-07-02T10:00:00.000Z',
      created_by: mockCareContext.userId,
      deleted_at: null,
      enabled: true,
      id: '00000000-0000-4000-8000-000000004104',
      puppy_id: mockCareContext.puppyId,
      quiet_hours: null,
      reminder_type: 'Morning potty',
      schedule_rule: {
        repeat: 'daily',
        time: '7:30',
      },
      timezone: 'UTC',
      trusted_sitter_visible: false,
      updated_at: '2026-07-02T10:05:00.000Z',
      version: 1,
    });
    openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    openSettingsSpy.mockRestore();
    reduceMotionProbe.mockRestore();
  });

  it('AC-REM-EDIT renders the create reminder form anatomy with native-picker rows', () => {
    render(<ReminderEditRoute />);

    expect(screen.getByRole('button', {
      name: i18n.t('reminders.form.cancel'),
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.form.title-new'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('reminders.form.save'),
    }).props.accessibilityState.disabled).toBe(true);

    expect(screen.getByLabelText(i18n.t('reminders.form.field-name'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.form.field-category'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.form.category-options.3'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.form.category-health-hint'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.form.field-time'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.form.field-repeat'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.form.field-tz'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.form.tz-auto-example'))).toBeTruthy();

    expect(screen.getByTestId('reminder-edit-time-picker-row')).toBeTruthy();
    expect(screen.getByTestId('reminder-edit-repeat-picker-row')).toBeTruthy();
    expect(screen.getByTestId('reminder-edit-timezone-picker-row')).toBeTruthy();
    expect(screen.getByTestId('reminder-edit-quiet-toggle')).toBeTruthy();
    expect(screen.getByTestId('reminder-edit-sound-toggle')).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.form.hint'))).toBeTruthy();
    expect(screen.queryByText(/diagnosis|dosage|treatment plan|emergency/i)).toBeNull();
  });

  it('AC-REM-QUIET renders quiet hours and calm notification-denied states without blocking save', () => {
    render(<ReminderEditRoute />);

    expect(screen.getByTestId('reminder-quiet-hours-card')).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.quiet-hours.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.quiet-hours.range-example'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.quiet-hours.hint'))).toBeTruthy();
    expect(screen.getByTestId('reminder-quiet-hours-puppy-toggle')).toBeTruthy();

    const deniedCard = screen.getByTestId('reminder-permission-denied-card');
    expect(deniedCard.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: expect.any(String),
        }),
      ]),
    );
    expect(screen.getByText(i18n.t('reminders.permission-denied.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.permission-denied.body'))).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('reminders.permission-denied.how-to-enable'),
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.permission-denied.tone-fallback'))).toBeTruthy();
  });

  it('AC-REM-SITTER renders trusted sitter checklist reminder anatomy', () => {
    render(<ReminderEditRoute />);

    const sitterCard = screen.getByTestId('reminder-sitter-checklist-card');
    expect(sitterCard).toBeTruthy();
    expect(screen.getByTestId('reminder-sitter-accent').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: tokens.color.primary[600],
        width: 3,
      }),
    );
    expect(screen.getByTestId('reminder-sitter-icon')).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.sections.sitter'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.sitter-card.title-example'))).toBeTruthy();
    expect(screen.getByText(i18n.t('reminders.sitter-card.subtitle-template', {
      n: 3,
      name: 'Caregiver A',
    }))).toBeTruthy();

    expect(screen.getByLabelText(i18n.t('reminders.sitter-card.progress-a11y-template', {
      completed: 1,
      total: 3,
    }))).toBeTruthy();
    expect(screen.getByTestId('reminder-sitter-progress-fill').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: tokens.color.primary[600],
        }),
        expect.objectContaining({
          flex: 1,
        }),
      ]),
    );
    expect(screen.getByTestId('reminder-sitter-progress-rest').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flex: 2,
        }),
      ]),
    );

    expect(screen.getByRole('button', {
      name: i18n.t('reminders.sitter-card.actions.0'),
    })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('reminders.sitter-card.actions.1'),
    })).toBeTruthy();
    expect(screen.getByRole('button', {
      name: i18n.t('reminders.sitter-card.actions.2'),
    })).toBeTruthy();
  });

  it('AC-REM-EDIT closes through the modal back action', () => {
    render(<ReminderEditRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('reminders.form.cancel'),
    }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('AC-REM-DURABLE-4 saves a named reminder from the connected route before closing', async () => {
    render(<ReminderEditRoute />);

    const saveButton = screen.getByRole('button', {
      name: i18n.t('reminders.form.save'),
    });
    expect(saveButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('reminders.form.field-name')),
      ' Morning potty ',
    );
    fireEvent(
      screen.getByTestId('reminder-edit-quiet-toggle'),
      'valueChange',
      false,
    );
    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('reminders.form.save'),
    }));

    await waitFor(() => {
      expect(mockCreateReminderMutateAsync).toHaveBeenCalledWith({
        householdId: mockCareContext.householdId,
        puppyId: mockCareContext.puppyId,
        reminderName: ' Morning potty ',
        respectQuietHours: false,
        todayDate: mockCareContext.todayDate,
        userId: mockCareContext.userId,
      });
    });
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('AC-REM-SETTINGS opens OS settings from the calm permission card without closing the route', async () => {
    render(<ReminderEditRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('reminders.permission-denied.how-to-enable'),
    }));

    await waitFor(() => {
      expect(openSettingsSpy).toHaveBeenCalledTimes(1);
    });
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(screen.getByText(i18n.t('reminders.form.title-new'))).toBeTruthy();
  });

  it('AC-REM-SETTINGS renders the route error state when OS settings handoff fails', async () => {
    openSettingsSpy.mockRejectedValueOnce(new Error('settings failed'));
    render(<ReminderEditRoute />);

    fireEvent.press(screen.getByRole('button', {
      name: i18n.t('reminders.permission-denied.how-to-enable'),
    }));

    await waitFor(() => {
      expect(screen.getByTestId('reminder-edit-state-error')).toBeTruthy();
    });
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('AC-REM-EDIT-STATES renders deterministic loading, pending, error, and offline states', () => {
    render(
      <>
        <ReminderEditScreen onClose={mockRouterBack} reviewState="loading" />
        <ReminderEditScreen onClose={mockRouterBack} reviewState="pending-write" />
        <ReminderEditScreen onClose={mockRouterBack} reviewState="error" />
        <ReminderEditScreen onClose={mockRouterBack} reviewState="offline-read" />
      </>,
    );

    for (const state of [
      'loading',
      'pending-write',
      'error',
      'offline-read',
    ] as const) {
      expect(screen.getByTestId(`reminder-edit-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`reminders.form.states.${state}.title`))).toBeTruthy();
      expect(screen.getByText(i18n.t(`reminders.form.states.${state}.body`))).toBeTruthy();
    }

    expect(screen.getByTestId('reminder-edit-state-error').props.accessibilityRole).toBe('alert');
    expect(screen.getByTestId('reminder-edit-state-pending-write').props.accessibilityLiveRegion)
      .toBe('polite');
    expect(screen.getAllByRole('button', {
      name: i18n.t('reminders.form.save'),
    }).some((button) => button.props.accessibilityState.busy)).toBe(true);
    expect(screen.queryByText(/diagnosis|dosage|treatment plan|emergency/i)).toBeNull();
  });

  it('AC-REM-EDIT-STATES renders compact state previews for native handoff', () => {
    render(
      <>
        <ReminderEditStatePreview state="loading" />
        <ReminderEditStatePreview state="pending-write" />
        <ReminderEditStatePreview state="error" />
        <ReminderEditStatePreview state="offline-read" />
      </>,
    );

    for (const state of [
      'loading',
      'pending-write',
      'error',
      'offline-read',
    ] as const) {
      expect(screen.getByTestId(`reminder-edit-state-${state}`)).toBeTruthy();
      expect(screen.getByText(i18n.t(`reminders.form.states.${state}.title`))).toBeTruthy();
    }

    expect(screen.queryByLabelText(i18n.t('reminders.form.field-name'))).toBeNull();
    expect(screen.queryByTestId('reminder-edit-time-picker-row')).toBeNull();
  });
});
