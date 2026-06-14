import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

import { THUMB_TOUCH_TARGET } from '@/design/a11y';
import { haptic } from '@/design/haptics';
import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { AppIcon } from '@/design/primitives/AppIcon';
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
      <AppIcon
        color={tokens.color.surface.raised}
        name="plus"
        size={28}
        testID="fab-symbol"
      />
    </Touchable>
  );
}

const styles = StyleSheet.create<{
  pressed: ViewStyle;
  root: ViewStyle;
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
});
