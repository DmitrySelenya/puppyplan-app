import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RoutineEditorScreen } from '@/features/reminders/screens/RoutineEditorScreen';
import { i18n } from '@/lib/i18n';

describe('RoutineEditorScreen', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('AC-P4-UI-1 requires an event and exposes the canonical repeat controls', () => {
    render(<RoutineEditorScreen onCancel={jest.fn()} onSave={jest.fn()} />);

    expect(screen.getByRole('button', { name: i18n.t('reminders.form.save') })
      .props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('routine-event-grid')).toBeTruthy();
    expect(screen.getByTestId('routine-repeat-never')).toBeTruthy();
    expect(screen.getByTestId('routine-repeat-daily')).toBeTruthy();
    expect(screen.getByTestId('routine-repeat-weekdays')).toBeTruthy();
    expect(screen.getByTestId('routine-repeat-custom')).toBeTruthy();
  });

  it('AC-P4-UI-2 shows amount or duration only for compatible events', () => {
    render(<RoutineEditorScreen onCancel={jest.fn()} onSave={jest.fn()} />);

    fireEvent.press(screen.getByTestId('routine-event-feeding'));
    expect(screen.getByTestId('routine-amount')).toBeTruthy();
    expect(screen.queryByTestId('routine-duration')).toBeNull();

    fireEvent.press(screen.getByTestId('routine-event-sleep'));
    expect(screen.getByTestId('routine-duration')).toBeTruthy();
    expect(screen.queryByTestId('routine-amount')).toBeNull();

    fireEvent.press(screen.getByTestId('routine-event-observation'));
    expect(screen.queryByTestId('routine-duration')).toBeNull();
    expect(screen.queryByTestId('routine-amount')).toBeNull();
  });

  it('AC-P4-UI-7 does not label the observation title as optional', () => {
    render(<RoutineEditorScreen onCancel={jest.fn()} onSave={jest.fn()} />);

    fireEvent.press(screen.getByTestId('routine-event-feeding'));
    expect(screen.getByText(i18n.t('reminders.form.routine.optional-title'))).toBeTruthy();

    fireEvent.press(screen.getByTestId('routine-event-observation'));
    expect(screen.getByText(i18n.t('reminders.form.routine.observation-title'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('reminders.form.routine.optional-title'))).toBeNull();
  });

  it('AC-P4-UI-3 preserves the draft and offers retry after an online save failure', async () => {
    const onSave = jest.fn().mockRejectedValueOnce(new Error('offline'));
    render(<RoutineEditorScreen onCancel={jest.fn()} onSave={onSave} />);

    fireEvent.press(screen.getByTestId('routine-event-observation'));
    fireEvent.changeText(screen.getByTestId('routine-title'), 'Check calm greeting');
    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.form.save') }));

    await waitFor(() => expect(screen.getByTestId('routine-save-error')).toBeTruthy());
    expect(screen.getByTestId('routine-title').props.value).toBe('Check calm greeting');
    expect(screen.getByTestId('routine-retry')).toBeTruthy();
  });

  it('AC-P4-UI-4 blocks viewer mutation', () => {
    render(<RoutineEditorScreen mode="viewer" onCancel={jest.fn()} onSave={jest.fn()} />);

    expect(screen.getByRole('button', { name: i18n.t('reminders.form.save') })
      .props.accessibilityState.disabled).toBe(true);
  });

  it('AC-P4-UI-5 exposes compatible variants and full weekday accessibility labels', () => {
    render(<RoutineEditorScreen onCancel={jest.fn()} onSave={jest.fn()} />);

    fireEvent.press(screen.getByTestId('routine-event-potty'));
    expect(screen.getByTestId('routine-variant-outside')).toBeTruthy();
    expect(screen.getByTestId('routine-variant-inside')).toBeTruthy();
    expect(screen.getByTestId('routine-variant-poop')).toBeTruthy();

    fireEvent.press(screen.getByTestId('routine-repeat-custom'));
    expect(screen.getByLabelText(i18n.t('reminders.form.routine.weekdays.0'))).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('reminders.form.routine.weekdays.6'))).toBeTruthy();
  });

  it('AC-P4-UI-6 reports an empty custom-day combination inline', () => {
    render(<RoutineEditorScreen onCancel={jest.fn()} onSave={jest.fn()} />);

    fireEvent.press(screen.getByTestId('routine-event-observation'));
    fireEvent.press(screen.getByTestId('routine-repeat-custom'));
    fireEvent.press(screen.getByTestId('routine-day-1'));

    expect(screen.getByTestId('routine-validation-error').props.accessibilityRole).toBe('alert');
    expect(screen.getByText(i18n.t('reminders.form.error-no-days'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('reminders.form.save') })
      .props.accessibilityState.disabled).toBe(true);
  });
});
