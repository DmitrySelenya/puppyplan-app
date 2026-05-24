import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';

export type ListRowProps = {
  accessibilityActions?: PressableProps['accessibilityActions'];
  accessibilityLabel?: string;
  disabled?: boolean;
  leading?: ReactNode;
  meta?: string;
  onAccessibilityAction?: PressableProps['onAccessibilityAction'];
  onPress?: PressableProps['onPress'];
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title: string;
  trailing?: ReactNode;
};

export function ListRow({
  accessibilityActions,
  accessibilityLabel,
  disabled = false,
  leading,
  meta,
  onAccessibilityAction,
  onPress,
  selected = false,
  style,
  subtitle,
  title,
  trailing,
}: ListRowProps) {
  const reducedMotion = useReducedMotion();
  const rowStyle = [
    styles.root,
    selected ? styles.selected : null,
    disabled ? styles.disabled : null,
    style,
  ];
  const content = (
    <>
      {leading ? <View style={styles.slot}>{leading}</View> : null}
      <View style={styles.copy}>
        <AppText numberOfLines={1} variant="headline">
          {title}
        </AppText>
        {subtitle ? (
          <AppText numberOfLines={2} tone="secondary" variant="subheadline">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {meta ? (
        <AppText numberOfLines={1} tone="tertiary" variant="footnote">
          {meta}
        </AppText>
      ) : null}
      {trailing ? <View style={styles.slot}>{trailing}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Touchable
        accessibilityActions={accessibilityActions}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        accessibilityState={{ disabled, selected }}
        disabled={disabled}
        onAccessibilityAction={onAccessibilityAction}
        onPress={onPress}
        style={({ pressed }) => [
          rowStyle,
          pressed && !disabled ? styles.pressed : null,
          pressedScaleStyle(pressed && !disabled, reducedMotion),
        ]}>
        {content}
      </Touchable>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
      style={rowStyle}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: tokens.space[1],
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.9,
  },
  root: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderBottomColor: tokens.color.stroke.dividerHairline,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: tokens.space[3],
    minHeight: tokens.component.listItem.minHeight,
    paddingHorizontal: tokens.layout.cardPadding,
    paddingVertical: tokens.space[3],
  },
  selected: {
    backgroundColor: tokens.color.primary[50],
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
