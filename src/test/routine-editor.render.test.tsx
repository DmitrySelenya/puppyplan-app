import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RoutineEditorScreen } from '@/features/reminders/screens/RoutineEditorScreen';
import { i18n } from '@/lib/i18n';

let mockFontScale = 1;

jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'useWindowDimensions', {
    value: () => ({ fontScale: mockFontScale, height: 667, scale: 2, width: 375 }),
  });
});

describe('RoutineEditorScreen', () => {
  beforeEach(async () => {
    mockFontScale = 1;
    await i18n.changeLanguage('en');
  });

  it.each([
    { fontScale: 1.999, expectedFlexBasis: '30%', expectedWidth: undefined },
    { fontScale: 2, expectedFlexBasis: '100%', expectedWidth: '100%' },
  ])('AC-DT-2B AC-DT-2E keeps actual routine event choices usable at fontScale $fontScale', ({
    expectedFlexBasis,
    expectedWidth,
    fontScale,
  }) => {
    mockFontScale = fontScale;
    render(<RoutineEditorScreen onCancel={jest.fn()} onSave={jest.fn()} />);

    const feeding = screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    });
    fireEvent.press(feeding);

    const tile = screen.getByTestId('routine-event-feeding');
    const style = StyleSheet.flatten(
      typeof tile.props.style === 'function' ? tile.props.style({ pressed: false }) : tile.props.style,
    );
    expect(style.flexBasis).toBe(expectedFlexBasis);
    expect(style.width).toBe(expectedWidth);
    expect(screen.getByText(i18n.t('quick-log.trackers.feeding')).props.children)
      .toBe(i18n.t('quick-log.trackers.feeding'));
    expect(screen.getByRole('button', {
      name: i18n.t('quick-log.trackers.feeding'),
    }).props.accessibilityState).toEqual(expect.objectContaining({
      disabled: false,
      selected: true,
    }));
    expect(screen.getByRole('button', { name: i18n.t('reminders.form.save') }))
      .toBeTruthy();
  });

  it.each([
    { fontScale: 1.999, expectedFlexBasis: '47%', expectedWidth: undefined },
    { fontScale: 2, expectedFlexBasis: '100%', expectedWidth: '100%' },
  ])('AC-DT-2H AC-DT-2I adapts actual repeat choices at fontScale $fontScale', ({
    expectedFlexBasis,
    expectedWidth,
    fontScale,
  }) => {
    mockFontScale = fontScale;
    render(<RoutineEditorScreen onCancel={jest.fn()} onSave={jest.fn()} />);

    const repeatCases = [
      ['never', 'reminders.form.routine.repeat-never'],
      ['daily', 'reminders.form.routine.repeat-daily'],
      ['weekdays', 'reminders.form.routine.repeat-weekdays'],
      ['custom', 'reminders.form.routine.repeat-custom'],
    ] as const;

    for (const [choice, labelKey] of repeatCases) {
      const label = i18n.t(labelKey);
      const control = screen.getByTestId(`routine-repeat-${choice}`);
      const style = StyleSheet.flatten(
        typeof control.props.style === 'function'
          ? control.props.style({ pressed: false })
          : control.props.style,
      );
      expect(style.flexBasis).toBe(expectedFlexBasis);
      expect(style.width).toBe(expectedWidth);
      expect(screen.getByText(label).props.children).toBe(label);
      expect(screen.getByRole('button', { name: label }).props.accessibilityState)
        .toEqual(expect.objectContaining({
          disabled: false,
          selected: choice === 'daily',
        }));
    }

    expect(screen.getByRole('button', { name: i18n.t('reminders.form.save') }))
      .toBeTruthy();
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

  it('AC-P33-DOG-DRAFT confirms a dirty cancel, preserves fields on Keep editing, and cancels pristine directly', () => {
    const onCancel = jest.fn();
    const view = render(<RoutineEditorScreen onCancel={onCancel} onSave={jest.fn()} />);

    fireEvent.press(screen.getByTestId('routine-event-feeding'));
    fireEvent.changeText(screen.getByTestId('routine-title'), 'Synthetic feeding routine');
    fireEvent.changeText(screen.getByTestId('routine-amount'), '42');
    fireEvent.changeText(screen.getByTestId('routine-note'), 'Synthetic private context');
    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.form.cancel') }));

    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByTestId('routine-title').props.value).toBe('Synthetic feeding routine');
    expect(screen.getByTestId('routine-amount').props.value).toBe('42');
    expect(screen.getByTestId('routine-note').props.value).toBe('Synthetic private context');

    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.form.cancel') }));
    fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    view.unmount();
    onCancel.mockClear();
    render(<RoutineEditorScreen onCancel={onCancel} onSave={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.form.cancel') }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Keep editing' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
  });

  it('AC-P33-DOG-DRAFT keeps discard confirmation ungrouped with two separate focusable actions', () => {
    render(<RoutineEditorScreen onCancel={jest.fn()} onSave={jest.fn()} />);

    fireEvent.press(screen.getByTestId('routine-event-feeding'));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.form.cancel') }));

    const keepEditing = screen.getByRole('button', {
      name: i18n.t('reminders.form.routine.keep-editing'),
    });
    const discard = screen.getByRole('button', {
      name: i18n.t('reminders.form.routine.discard'),
    });
    expect(keepEditing.props).toEqual(expect.objectContaining({
      accessibilityRole: 'button',
      accessible: true,
    }));
    expect(discard.props).toEqual(expect.objectContaining({
      accessibilityRole: 'button',
      accessible: true,
    }));

    const confirmation = screen.getByTestId('routine-discard-confirmation');
    expect(confirmation.props.accessible).not.toBe(true);
    expect(confirmation.props.accessibilityRole).toBeUndefined();
  });

  it('AC-P33-DOG-DRAFT treats reordered custom repeat days as the same pristine semantic set', () => {
    const onCancel = jest.fn();
    render(
      <RoutineEditorScreen
        initialDraft={{
          rule: {
            repeat: { days: [3, 1] },
            time: '07:30',
          },
          trackerId: 'feeding',
        }}
        mode="edit"
        onCancel={onCancel}
        onSave={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId('routine-day-3'));
    fireEvent.press(screen.getByTestId('routine-day-3'));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('reminders.form.cancel') }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('routine-discard-confirmation')).toBeNull();
  });
});
