import type { ReactNode } from 'react';
import type { AccessibilityRole, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';

export type ListRowAccessory = 'chevron' | 'none';
export type ListRowVariant = 'default' | 'settings' | 'health' | 'timeline';

export type ListRowProps = {
  accessibilityActions?: PressableProps['accessibilityActions'];
  accessibilityLabel?: string;
  accessory?: ListRowAccessory;
  disabled?: boolean;
  leading?: ReactNode;
  meta?: string;
  onAccessibilityAction?: PressableProps['onAccessibilityAction'];
  onPress?: PressableProps['onPress'];
  selectionRole?: Extract<AccessibilityRole, 'checkbox' | 'radio'>;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title: string;
  titleNumberOfLines?: number;
  trailing?: ReactNode;
  variant?: ListRowVariant;
};

export function ListRow({
  accessibilityActions,
  accessibilityLabel,
  accessory = 'none',
  disabled = false,
  leading,
  meta,
  onAccessibilityAction,
  onPress,
  selectionRole,
  selected = false,
  style,
  subtitle,
  title,
  titleNumberOfLines,
  trailing,
  variant = 'default',
}: ListRowProps) {
  const reducedMotion = useReducedMotion();
  const rowStyle = [
    styles.root,
    variantStyles[variant],
    selected ? styles.selected : null,
    disabled ? styles.disabled : null,
    style,
  ];
  const resolvedTrailing = trailing ?? (accessory === 'chevron'
    ? (
        <AppIcon
          color={tokens.color.text.tertiary}
          name="chevronRight"
          testID="list-row-chevron"
        />
      )
    : null);
  const metaInCopy = variant === 'health';
  const content = (
    <>
      {leading ? <View style={styles.slot}>{leading}</View> : null}
      <View style={styles.copy}>
        <AppText numberOfLines={titleNumberOfLines} variant="headline">
          {title}
        </AppText>
        {subtitle ? (
          <AppText numberOfLines={2} tone="secondary" variant="subheadline">
            {subtitle}
          </AppText>
        ) : null}
        {meta && metaInCopy ? (
          <AppText numberOfLines={2} tone="tertiary" variant="footnote">
            {meta}
          </AppText>
        ) : null}
      </View>
      {meta && !metaInCopy ? (
        <AppText numberOfLines={1} tone="tertiary" variant="footnote">
          {meta}
        </AppText>
      ) : null}
      {resolvedTrailing ? <View style={styles.slot}>{resolvedTrailing}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Touchable
        accessibilityActions={accessibilityActions}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole={selectionRole ?? 'button'}
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
    flexShrink: 1,
    gap: tokens.space[1],
    minWidth: 0,
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

const variantStyles = StyleSheet.create({
  default: {},
  health: {
    minHeight: 72,
  },
  settings: {
    minHeight: tokens.component.listItem.minHeight,
  },
  timeline: {
    minHeight: 64,
  },
});
