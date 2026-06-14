import { fireEvent, render, screen } from '@testing-library/react-native';

import { Toggle } from '@/design/primitives/Toggle';
import { tokens } from '@/design/tokens';

describe('Toggle primitive', () => {
  it('renders as an accessible switch reflecting its value', () => {
    render(
      <Toggle
        accessibilityLabel="Enable reminders"
        onValueChange={jest.fn()}
        testID="reminders-toggle"
        value
      />,
    );

    const toggle = screen.getByTestId('reminders-toggle');

    expect(toggle.props.accessibilityRole).toBe('switch');
    expect(toggle.props.accessibilityLabel).toBe('Enable reminders');
    expect(toggle.props.value).toBe(true);
    expect(toggle.props.onTintColor).toBe(tokens.color.primary[600]);
  });

  it('fires onValueChange with the next value', () => {
    const onValueChange = jest.fn();

    render(
      <Toggle
        accessibilityLabel="Enable reminders"
        onValueChange={onValueChange}
        testID="reminders-toggle"
        value={false}
      />,
    );

    fireEvent(screen.getByTestId('reminders-toggle'), 'valueChange', true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('respects the disabled state', () => {
    render(
      <Toggle
        accessibilityLabel="Enable reminders"
        disabled
        onValueChange={jest.fn()}
        testID="reminders-toggle"
        value={false}
      />,
    );

    expect(screen.getByTestId('reminders-toggle').props.disabled).toBe(true);
  });
});
