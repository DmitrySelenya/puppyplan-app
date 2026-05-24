import type { PropsWithChildren } from 'react';
import type {
  AccessibilityRole,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { touchTargetStyle } from '@/design/a11y/touch-targets';

export type TouchableStyle =
  | StyleProp<ViewStyle>
  | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
export type TouchablePressedStyle = TouchableStyle;

export type TouchableProps = PropsWithChildren<
  Omit<PressableProps, 'accessibilityLabel' | 'accessibilityRole' | 'style'> & {
    accessibilityLabel: string;
    accessibilityRole: AccessibilityRole;
    blockPresses?: boolean;
    minTarget?: 'default' | 'none' | 'thumb';
    pressedStyle?: TouchablePressedStyle;
    style?: TouchableStyle;
  }
>;

export function Touchable({
  accessibilityState,
  blockPresses = false,
  children,
  disabled,
  minTarget = 'default',
  onPress,
  pressedStyle,
  style,
  ...props
}: TouchableProps) {
  const targetStyle = minTarget === 'none' ? null : touchTargetStyles[minTarget];
  const nativeDisabled = Boolean(disabled || accessibilityState?.disabled === true);
  const pressBlocked = blockPresses || nativeDisabled;
  const accessibilityDisabled = accessibilityState?.disabled ?? Boolean(disabled);
  const accessibilityBusy = blockPresses ? true : accessibilityState?.busy;

  return (
    <Pressable
      {...props}
      accessibilityState={{
        ...accessibilityState,
        busy: accessibilityBusy,
        disabled: accessibilityDisabled,
      }}
      disabled={nativeDisabled}
      onPress={pressBlocked ? undefined : onPress}
      style={(state) => [
        targetStyle,
        typeof style === 'function' ? style(state) : style,
        state.pressed && !pressBlocked
          ? typeof pressedStyle === 'function'
            ? pressedStyle(state)
            : pressedStyle
          : null,
      ]}>
      {children}
    </Pressable>
  );
}

const touchTargetStyles = StyleSheet.create({
  default: touchTargetStyle('default'),
  thumb: touchTargetStyle('thumb'),
});
