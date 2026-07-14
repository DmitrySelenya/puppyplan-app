import type { ReactElement } from 'react';
import { AccessibilityInfo } from 'react-native';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { QuickNoteScreen } from '@/features/quick-log/screens/QuickNoteScreen';
import { i18n } from '@/lib/i18n';

function renderNote(element: ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}

// The native picker serializes its bound props to epoch milliseconds.
function toTimestamp(value: Date | number): number {
  return typeof value === 'number' ? value : value.getTime();
}

describe('Quick note capture', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    reduceMotionProbe.mockRestore();
  });

  it('AC-QN-CAPTURE never autofocuses the note field', () => {
    renderNote(<QuickNoteScreen />);

    const field = screen.getByLabelText(i18n.t('quick-note.note-label'));

    expect(field.props.autoFocus).toBeFalsy();
    expect(field.props.multiline).toBe(true);
    expect(field.props.maxLength).toBe(500);
  });

  it('AC-QN-CAPTURE renders the capture row: a when pill prefilled to now, a field, and Add', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 9, 5, 0));

    renderNote(<QuickNoteScreen />);

    expect(screen.getByTestId('quick-note-when-pill')).toHaveProp(
      'accessibilityValue',
      { text: '09:05' },
    );
    expect(screen.getByLabelText(i18n.t('quick-note.note-label'))).toBeTruthy();
    expect(screen.getByRole('button', { name: i18n.t('quick-note.add') })).toBeTruthy();
  });

  it('AC-QN-TIME keeps the wheel closed until the pill is tapped', () => {
    renderNote(<QuickNoteScreen />);

    expect(screen.queryByTestId('quick-note-when-wheel')).toBeNull();

    fireEvent.press(screen.getByTestId('quick-note-when-pill'));

    expect(screen.getByTestId('quick-note-when-wheel')).toBeTruthy();
  });

  it('AC-QN-TIME labels a backdated pill with its day and keeps the chosen time', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 12, 56, 0));
    const lastNight = new Date(2026, 6, 13, 23, 41, 0);

    renderNote(<QuickNoteScreen />);

    fireEvent.press(screen.getByTestId('quick-note-when-pill'));
    fireEvent(screen.getByTestId('quick-note-when-wheel'), 'onChange', {
      nativeEvent: { timestamp: lastNight.getTime() },
    });

    const pill = screen.getByTestId('quick-note-when-pill');

    expect(pill.props.accessibilityValue.text).toContain('23:41');
    expect(pill.props.accessibilityValue.text).not.toBe('23:41');
  });

  it('AC-QN-TIME bounds the wheel to the last seven days and rejects the future', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 12, 0, 0));

    renderNote(<QuickNoteScreen />);
    fireEvent.press(screen.getByTestId('quick-note-when-pill'));

    const wheel = screen.getByTestId('quick-note-when-wheel');

    expect(toTimestamp(wheel.props.maximumDate)).toBe(Date.now());
    expect(toTimestamp(wheel.props.minimumDate)).toBe(Date.now() - 7 * 24 * 60 * 60 * 1_000);
  });

  it('AC-QN-PERSIST saves an observation fact at the pill time', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 12, 56, 0));
    const lastNight = new Date(2026, 6, 13, 23, 41, 0);
    const onSave = jest.fn();

    renderNote(<QuickNoteScreen onSave={onSave} />);

    fireEvent.press(screen.getByTestId('quick-note-when-pill'));
    fireEvent(screen.getByTestId('quick-note-when-wheel'), 'onChange', {
      nativeEvent: { timestamp: lastNight.getTime() },
    });
    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Synthetic settled note',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        note: 'Synthetic settled note',
        occurredAt: lastNight.toISOString(),
        trackerId: 'observation',
      });
    });
  });

  it('AC-QN-PERSIST clears the field, closes the wheel, and resets the pill after a save', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 12, 56, 0));
    const onSave = jest.fn();

    renderNote(<QuickNoteScreen onSave={onSave} />);

    fireEvent.press(screen.getByTestId('quick-note-when-pill'));
    fireEvent(screen.getByTestId('quick-note-when-wheel'), 'onChange', {
      nativeEvent: { timestamp: new Date(2026, 6, 13, 23, 41, 0).getTime() },
    });
    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Synthetic settled note',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    await waitFor(() => {
      expect(screen.getByLabelText(i18n.t('quick-note.note-label'))).toHaveProp('value', '');
    });
    expect(screen.getByTestId('quick-note-when-pill')).toHaveProp(
      'accessibilityValue',
      { text: '12:56' },
    );
    expect(screen.queryByTestId('quick-note-when-wheel')).toBeNull();
    expect(screen.getByTestId('quick-note-sheet')).toBeTruthy();
  });

  it('AC-QN-PERSIST preserves the text and shows an inline error when the save fails', async () => {
    const onSave = jest.fn(() => Promise.reject(new Error('offline')));

    renderNote(<QuickNoteScreen onSave={onSave} />);

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Synthetic settled note',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    const error = await screen.findByText(i18n.t('quick-note.persistence-error'));

    expect(error.props.accessibilityRole).toBe('alert');
    expect(screen.getByLabelText(i18n.t('quick-note.note-label'))).toHaveProp(
      'value',
      'Synthetic settled note',
    );
  });

  it('AC-QN-CAPTURE refuses to save an empty note', () => {
    const onSave = jest.fn();

    renderNote(<QuickNoteScreen onSave={onSave} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('quick-note.note-label')), '   ');
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(i18n.t('quick-note.required-error'))).toBeTruthy();
  });

  it('AC-QN-CAPTURE counts characters against the shared 500 budget', () => {
    renderNote(<QuickNoteScreen />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('quick-note.note-label')), 'Four');

    expect(screen.getByText(i18n.t('quick-note.note-helper', { count: 4 }))).toBeTruthy();
  });

  it('AC-QN-CAPTURE blocks Add for viewers instead of failing on save', () => {
    const onSave = jest.fn();

    renderNote(<QuickNoteScreen onSave={onSave} status="permission-denied" />);

    expect(
      screen.getByRole('button', { name: i18n.t('quick-note.add') }),
    ).toHaveProp('accessibilityState', expect.objectContaining({ disabled: true }));
  });

  it('closes through the sheet close action', () => {
    const onClose = jest.fn();

    renderNote(<QuickNoteScreen onClose={onClose} />);

    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.close') }));

    expect(onClose).toHaveBeenCalled();
  });
});
