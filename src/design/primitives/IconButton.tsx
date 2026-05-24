import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { DEFAULT_HIT_SLOP, decorativeViewProps } from '@/design/a11y';
import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';

export type IconButtonVariant = 'plain' | 'filled' | 'tinted';
type IconButtonPressHandler = NonNullable<PressableProps['onPress']>;

export type IconButtonProps = Omit<PressableProps, 'children' | 'onPress' | 'style'> & {
  accessibilityLabel: string;
  icon: ReactNode;
  onPress: IconButtonPressHandler;
  style?: StyleProp<ViewStyle>;
  variant?: IconButtonVariant;
};

export function IconButton({
  accessibilityLabel,
  disabled = false,
  hitSlop = DEFAULT_HIT_SLOP,
  icon,
  style,
  variant = 'plain',
  ...props
}: IconButtonProps) {
  const reducedMotion = useReducedMotion();

  return (
    <Touchable
      {...props}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.root,
        iconButtonVariantStyles[variant],
        pressed && !disabled ? styles.pressed : null,
        pressedScaleStyle(pressed && !disabled, reducedMotion),
        disabled ? styles.disabled : null,
        style,
      ]}>
      <View {...decorativeViewProps}>
        {icon}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.86,
  },
  root: {
    alignItems: 'center',
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
  },
});

const iconButtonVariantStyles = StyleSheet.create({
  filled: {
    backgroundColor: tokens.color.primary[600],
  },
  plain: {
    backgroundColor: 'transparent',
  },
  tinted: {
    backgroundColor: tokens.color.primary[50],
  },
});
