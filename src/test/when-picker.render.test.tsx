import { fireEvent, render, screen } from '@testing-library/react-native';

import { WhenPicker } from '@/design/primitives';
import { tokens } from '@/design/tokens';
import { formatWhenLabel } from '@/lib/datetime/when-label';

// The native picker serializes its bound props to epoch milliseconds.
function toTimestamp(value: Date | number): number {
  return typeof value === 'number' ? value : value.getTime();
}

function renderPicker(overrides: Partial<React.ComponentProps<typeof WhenPicker>> = {}) {
  const props = {
    hint: 'Pick a day and time',
    label: 'When',
    maximumDate: new Date(2026, 6, 14, 12, 56, 0),
    minimumDate: new Date(2026, 6, 7, 12, 56, 0),
    onChange: jest.fn(),
    onOpenChange: jest.fn(),
    open: false,
    testID: 'when',
    value: new Date(2026, 6, 14, 9, 5, 0),
    valueText: '09:05',
    ...overrides,
  };

  return { props, ...render(<WhenPicker {...props} />) };
}

describe('WhenPicker', () => {
  it('renders a pill carrying the label and the formatted value, wheel closed', () => {
    renderPicker();

    const pill = screen.getByTestId('when-pill');

    expect(pill.props.accessibilityLabel).toBe('When');
    expect(pill.props.accessibilityValue).toEqual({ text: '09:05' });
    expect(pill.props.accessibilityRole).toBe('button');
    expect(screen.queryByTestId('when-wheel')).toBeNull();
  });

  it('asks its owner to open on tap rather than opening itself', () => {
    const onOpenChange = jest.fn();
    renderPicker({ onOpenChange });

    fireEvent.press(screen.getByTestId('when-pill'));

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByTestId('when-wheel')).toBeNull();
  });

  it('shows the wheel within its bounds when open', () => {
    const { props } = renderPicker({ open: true });

    const wheel = screen.getByTestId('when-wheel');

    expect(toTimestamp(wheel.props.maximumDate)).toBe(props.maximumDate.getTime());
    expect(toTimestamp(wheel.props.minimumDate)).toBe(props.minimumDate.getTime());
    expect(screen.getByTestId('when-pill').props.accessibilityState.expanded).toBe(true);
  });

  it('reports a whole timestamp so a day change never drops the time', () => {
    const onChange = jest.fn();
    const { props } = renderPicker({ onChange, open: true });
    const lastNight = new Date(2026, 6, 13, 23, 41, 0);

    fireEvent(screen.getByTestId('when-wheel'), 'onChange', {
      nativeEvent: { timestamp: lastNight.getTime() },
    });

    expect(onChange).toHaveBeenCalledWith(lastNight);
    expect(props.value.getTime()).not.toBe(lastNight.getTime());
  });

  it('keeps the pill at a thumb-sized target on a sunken surface', () => {
    renderPicker();

    const style = screen.getByTestId('when-pill').props.style;
    const flattened = Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;

    expect(flattened.backgroundColor).toBe(tokens.color.surface.sunken);
    expect(flattened.borderRadius).toBe(tokens.radius.full);
  });
});

describe('formatWhenLabel', () => {
  it('shows a bare 24-hour time for today', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 12, 56, 0));

    try {
      expect(formatWhenLabel(new Date(2026, 6, 14, 9, 5, 0), 'en')).toBe('09:05');
    } finally {
      jest.useRealTimers();
    }
  });

  it('prefixes the day for any other date and keeps the time', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 12, 56, 0));

    try {
      const label = formatWhenLabel(new Date(2026, 6, 13, 23, 41, 0), 'en');

      expect(label).toContain('23:41');
      expect(label).not.toBe('23:41');
    } finally {
      jest.useRealTimers();
    }
  });
});
