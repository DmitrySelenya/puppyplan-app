import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppText } from '@/design/primitives/AppText';
import { FAB } from '@/design/primitives/FAB';
import { Screen } from '@/design/primitives/Screen';
import { scaffoldTokens } from '@/design/tokens/scaffold';

describe('design primitives', () => {
  it('keeps AppText scalable for Dynamic Type readiness', () => {
    render(<AppText variant="title">Shell title</AppText>);

    const title = screen.getByText('Shell title');
    const style = StyleSheet.flatten(title.props.style);

    expect(title.props.allowFontScaling).toBe(true);
    expect(style.color).toBe(scaffoldTokens.color.textPrimary);
    expect(style.fontSize).toBe(28);
  });

  it('renders Screen content inside the scaffold surface', () => {
    render(
      <Screen>
        <AppText>Screen body</AppText>
      </Screen>,
    );

    expect(screen.getByText('Screen body')).toBeTruthy();
  });

  it('keeps the Quick Log FAB accessible and at least 56pt', () => {
    const onPress = jest.fn();

    render(
      <FAB
        accessibilityHint="Double tap to open."
        accessibilityLabel="Quick log"
        onPress={onPress}
      />,
    );

    const button = screen.getByRole('button', { name: 'Quick log' });
    const baseStyle = StyleSheet.flatten(button.props.style);

    expect(button.props.accessibilityHint).toBe('Double tap to open.');
    expect(baseStyle.height).toBeGreaterThanOrEqual(56);
    expect(baseStyle.width).toBeGreaterThanOrEqual(56);
    expect(baseStyle.height).toBe(scaffoldTokens.spacing.fabSize);

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
