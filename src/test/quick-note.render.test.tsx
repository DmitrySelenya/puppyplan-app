import type { ReactElement } from 'react';
import { AccessibilityInfo, StyleSheet, type ViewStyle } from 'react-native';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { QuickNoteScreen } from '@/features/quick-log/screens/QuickNoteScreen';
import { i18n } from '@/lib/i18n';

let mockFontScale = 1;

// jest-expo reports fontScale 2 by default, which would silently pin every test to the
// accessibility layout. Drive it explicitly instead.
jest.mock('react-native', () => {
  const actual = jest.requireActual<typeof import('react-native')>('react-native');

  return Object.defineProperty(Object.create(actual) as typeof actual, 'useWindowDimensions', {
    value: () => ({ fontScale: mockFontScale, height: 667, scale: 2, width: 375 }),
  });
});

function renderNote(element: ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
}

// The native picker serializes its bound props to epoch milliseconds.
function toTimestamp(value: Date | number): number {
  return typeof value === 'number' ? value : value.getTime();
}

function flattenStyle(element: { props: { style?: unknown } }): ViewStyle {
  return StyleSheet.flatten(element.props.style as ViewStyle) ?? {};
}

describe('Quick note capture', () => {
  let reduceMotionProbe: jest.SpyInstance;
  let savedAnnouncementProbe: jest.SpyInstance | undefined;

  beforeEach(async () => {
    mockFontScale = 1;
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    savedAnnouncementProbe?.mockRestore();
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

  it('AC-QN-CAPTURE keeps the note field reachable while the wheel is open', () => {
    renderNote(<QuickNoteScreen />);

    fireEvent.press(screen.getByTestId('quick-note-when-pill'));

    // The wheel takes the full width; the field must drop below it, not out of the layout.
    expect(screen.getByTestId('quick-note-when-wheel')).toBeTruthy();
    expect(screen.getByLabelText(i18n.t('quick-note.note-label'))).toBeTruthy();
    expect(flattenStyle(screen.getByTestId('quick-note-capture-row')).flexDirection)
      .toBe('column');
  });

  it('AC-QN-CAPTURE puts the time block beside the field while the wheel is closed', () => {
    renderNote(<QuickNoteScreen />);

    expect(flattenStyle(screen.getByTestId('quick-note-capture-row')).flexDirection)
      .toBe('row');
  });

  it('AC-QN-CAPTURE stacks the capture row at font scale 2 so nothing is squeezed', () => {
    mockFontScale = 2;

    renderNote(<QuickNoteScreen />);

    expect(flattenStyle(screen.getByTestId('quick-note-capture-row')).flexDirection)
      .toBe('column');
    expect(screen.getByLabelText(i18n.t('quick-note.note-label'))).toBeTruthy();
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

  it('AC-QN-PERSIST returns to the Diary timeline after an accepted save', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn(() => Promise.resolve());

    renderNote(<QuickNoteScreen onClose={onClose} onSave={onSave} />);

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Synthetic settled note',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('AC-QN-PERSIST preserves the text and shows an inline error when the save fails', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn(() => Promise.reject(new Error('offline')));

    renderNote(<QuickNoteScreen onClose={onClose} onSave={onSave} />);

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
    expect(onClose).not.toHaveBeenCalled();
  });

  it('AC-QN-FIX-A11Y-MODAL isolates the route screen from the underlying Diary', () => {
    const view = renderNote(<QuickNoteScreen />);
    const tree = view.toJSON();

    if (tree === null || Array.isArray(tree)) {
      throw new Error('Expected Quick note to render one screen root');
    }

    expect(tree.props).toMatchObject({
      accessibilityViewIsModal: true,
      importantForAccessibility: 'yes',
    });
  });

  it('AC-QN-FIX-A11Y-SAVED politely announces durable acceptance without note text', async () => {
    savedAnnouncementProbe = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const privateDraftText = 'synthetic-private-input';

    renderNote(<QuickNoteScreen onSave={() => Promise.resolve()} />);

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      privateDraftText,
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.add') }));

    await waitFor(() => {
      expect(savedAnnouncementProbe).toHaveBeenCalledTimes(1);
    });
    expect(savedAnnouncementProbe).toHaveBeenCalledWith(i18n.t('quick-note.saved-announcement'));
    expect(JSON.stringify(savedAnnouncementProbe.mock.calls)).not.toContain(privateDraftText);
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
    expect(screen.queryByTestId('quick-note-discard-confirmation')).toBeNull();
  });

  it('AC-QN-DRAFT confirms before discarding typed text and keeps it on Keep editing', () => {
    const onClose = jest.fn();

    renderNote(<QuickNoteScreen onClose={onClose} />);

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Woke at 02:24, would not settle',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.close') }));

    // Capture-first surface: a half-written note is the whole point, so it never leaves silently.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('quick-note-discard-confirmation')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.keep-editing') }));

    expect(screen.queryByTestId('quick-note-discard-confirmation')).toBeNull();
    expect(screen.getByLabelText(i18n.t('quick-note.note-label')))
      .toHaveProp('value', 'Woke at 02:24, would not settle');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('AC-QN-DRAFT discards the note only when the owner confirms', () => {
    const onClose = jest.fn();

    renderNote(<QuickNoteScreen onClose={onClose} />);

    fireEvent.changeText(
      screen.getByLabelText(i18n.t('quick-note.note-label')),
      'Chewed the crate bars again',
    );
    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.close') }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('quick-note.discard') }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC-QN-DRAFT treats whitespace as an empty draft and closes straight away', () => {
    const onClose = jest.fn();

    renderNote(<QuickNoteScreen onClose={onClose} />);

    fireEvent.changeText(screen.getByLabelText(i18n.t('quick-note.note-label')), '   ');
    fireEvent.press(screen.getByRole('button', { name: i18n.t('common.close') }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('quick-note-discard-confirmation')).toBeNull();
  });
});
