import { ScrollView, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppText } from '@/design/primitives/AppText';
import { FAB } from '@/design/primitives/FAB';
import { Screen } from '@/design/primitives/Screen';
import { tokens } from '@/design/tokens';

describe('design primitives', () => {
  it('keeps AppText scalable for Dynamic Type readiness', () => {
    render(<AppText variant="title">Shell title</AppText>);

    const title = screen.getByText('Shell title');
    const style = StyleSheet.flatten(title.props.style);

    expect(title.props.allowFontScaling).toBe(true);
    expect(style.color).toBe(tokens.color.text.primary);
    expect(style.fontSize).toBe(tokens.typography.scale.title1.fontSize);
  });

  it('renders Screen content inside the scaffold surface', () => {
    const { UNSAFE_getByType } = render(
      <Screen>
        <AppText>Screen body</AppText>
      </Screen>,
    );
    const scrollView = UNSAFE_getByType(ScrollView);
    const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);

    expect(screen.getByText('Screen body')).toBeTruthy();
    expect(contentStyle.paddingVertical).toBe(tokens.layout.screenPaddingY);
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
    expect(baseStyle.height).toBe(tokens.component.fab.size);

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
