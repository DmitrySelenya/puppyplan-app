import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ReminderEditStatePreview } from '@/features/reminders/screens/ReminderEditScreen';
import { i18n } from '@/lib/i18n';

import ReminderEditRoute from '../../app/(modals)/reminders/edit';

const mockRouterBack = jest.fn();
const mockCreateReminderMutateAsync = jest.fn();
const mockUpdateReminderMutateAsync = jest.fn();
let mockReminderId: string | undefined;
const mockCareContext = {
  householdId: '00000000-0000-4000-8000-000000004102',
  householdRole: 'owner',
  puppyId: '00000000-0000-4000-8000-000000004103',
  selectedTrackerIds: ['feeding'],
  todayDate: '2026-07-02',
  userId: '00000000-0000-4000-8000-000000004101',
};

jest.mock('expo-router', () => ({
  router: { back: () => mockRouterBack() },
  useLocalSearchParams: () => ({ reminderId: mockReminderId }),
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'AccessibilityInfo', {
    value: {
      ...actual.AccessibilityInfo,
      isReduceMotionEnabled: jest.fn(() => new Promise<boolean>(() => {})),
    },
  });
});

jest.mock('@/lib/query/active-care-context', () => ({
  useActiveCareContext: () => ({ careContext: mockCareContext, puppy: null, status: 'ready' }),
}));

jest.mock('@/lib/query/reminders', () => ({
  useCreateReminderMutation: () => ({
    isPending: false,
    mutateAsync: mockCreateReminderMutateAsync,
  }),
  useRemindersQuery: () => ({
    data: [{
      assigned_to: null,
      created_at: '2026-07-02T10:00:00.000Z',
      created_by: mockCareContext.userId,
      deleted_at: null,
      enabled: true,
      id: 'synthetic-reminder',
      puppy_id: mockCareContext.puppyId,
      quiet_hours: null,
      reminder_type: 'feeding',
      schedule_rule: { amount: { unit: 'g', value: 60 }, repeat: 'daily', time: '08:00' },
      timezone: 'UTC',
      trusted_sitter_visible: false,
      updated_at: '2026-07-02T10:00:00.000Z',
      version: 1,
    }],
    isError: false,
    isLoading: false,
  }),
  useUpdateReminderScheduleMutation: () => ({
    isPending: false,
    mutateAsync: mockUpdateReminderMutateAsync,
  }),
}));

describe('ReminderEditRoute canonical routine lifecycle', () => {
  beforeEach(async () => {
    mockRouterBack.mockClear();
    mockReminderId = undefined;
    mockCreateReminderMutateAsync.mockReset().mockResolvedValue({ id: 'synthetic-reminder' });
    mockUpdateReminderMutateAsync.mockReset();
    await i18n.changeLanguage('en');
  });

  it('renders the canonical routine anatomy and closes through Cancel', () => {
    render(<ReminderEditRoute />);

    expect(screen.getByText(i18n.t('reminders.form.routine.title'))).toBeTruthy();
    expect(screen.getByTestId('routine-event-grid')).toBeTruthy();
    expect(screen.getByTestId('routine-time-picker')).toBeTruthy();
    expect(screen.queryByTestId('reminder-edit-sound-toggle')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.form.cancel') }));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('saves a canonical schedule before showing the post-save permission primer', async () => {
    render(<ReminderEditRoute />);

    fireEvent.press(screen.getByTestId('routine-event-feeding'));
    fireEvent.changeText(screen.getByTestId('routine-title'), 'Morning meal');
    fireEvent.changeText(screen.getByTestId('routine-amount'), '60');
    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.form.save') }));

    await waitFor(() => expect(mockCreateReminderMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: mockCareContext.householdId,
        puppyId: mockCareContext.puppyId,
        reminderName: 'Morning meal',
        schedule: {
          trackerId: 'feeding',
          rule: expect.objectContaining({
            amount: { unit: 'g', value: 60 },
            repeat: 'daily',
            title: 'Morning meal',
          }),
        },
      }),
    ));
    expect(screen.getByTestId('routine-permission-primer')).toBeTruthy();
    expect(mockRouterBack).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('routine-primer-not-now'));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('keeps deterministic loading, pending, error, and offline state previews accessible', () => {
    render(<>
      <ReminderEditStatePreview state="loading" />
      <ReminderEditStatePreview state="pending-write" />
      <ReminderEditStatePreview state="error" />
      <ReminderEditStatePreview state="offline-read" />
    </>);

    expect(screen.getByTestId('reminder-edit-state-error').props.accessibilityRole).toBe('alert');
    expect(screen.getByTestId('reminder-edit-state-pending-write').props.accessibilityLiveRegion)
      .toBe('polite');
  });

  it('loads and updates an existing canonical routine through the update mutation', async () => {
    mockReminderId = 'synthetic-reminder';
    mockUpdateReminderMutateAsync.mockResolvedValue({ id: mockReminderId });
    render(<ReminderEditRoute />);

    expect(screen.getByTestId('routine-amount').props.value).toBe('60');
    fireEvent.changeText(screen.getByTestId('routine-amount'), '75');
    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.form.save') }));

    await waitFor(() => expect(mockUpdateReminderMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        reminderId: 'synthetic-reminder',
        schedule: expect.objectContaining({
          trackerId: 'feeding',
          rule: expect.objectContaining({ amount: { unit: 'g', value: 75 } }),
        }),
      }),
    ));
  });
});
