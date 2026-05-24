import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

import { THUMB_TOUCH_TARGET, decorativeViewProps } from '@/design/a11y';
import { haptic } from '@/design/haptics';
import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { elevationStyle } from '@/design/primitives/elevationStyle';
import { tokens } from '@/design/tokens';

type FABProps = {
  accessibilityHint: string;
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FAB({ accessibilityHint, accessibilityLabel, onPress, style }: FABProps) {
  const reducedMotion = useReducedMotion();
  const handlePress = () => {
    void haptic('tapConfirm');
    onPress();
  };

  return (
    <Touchable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      minTarget="thumb"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.root,
        pressed ? styles.pressed : null,
        pressedScaleStyle(pressed, reducedMotion),
        style,
      ]}>
      <AppText
        {...decorativeViewProps}
        allowFontScaling={false}
        maxFontSizeMultiplier={1}
        style={styles.symbol}
        testID="fab-symbol">
        +
      </AppText>
    </Touchable>
  );
}

const styles = StyleSheet.create<{
  pressed: ViewStyle;
  root: ViewStyle;
  symbol: TextStyle;
}>({
  pressed: {
    opacity: 0.82,
  },
  root: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[600],
    borderRadius: tokens.component.fab.size / 2,
    height: tokens.component.fab.size,
    justifyContent: 'center',
    minHeight: THUMB_TOUCH_TARGET,
    minWidth: THUMB_TOUCH_TARGET,
    ...elevationStyle(2),
    width: tokens.component.fab.size,
  },
  symbol: {
    color: tokens.color.surface.raised,
    fontSize: 32,
    fontWeight: tokens.typography.fontWeight.semibold,
    lineHeight: 36,
  },
});
