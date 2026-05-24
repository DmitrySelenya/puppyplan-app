import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { decorativeViewProps } from '@/design/a11y';
import { haptic } from '@/design/haptics';
import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';

export type TrackerTileSize = 'compact' | 'threeColumn' | 'twoColumn';
type TrackerTilePressHandler = NonNullable<PressableProps['onPress']>;

export type TrackerTileProps = Omit<PressableProps, 'children' | 'onPress' | 'style'> & {
  icon?: ReactNode;
  label: string;
  onPress: TrackerTilePressHandler;
  recent?: boolean;
  selected?: boolean;
  size?: TrackerTileSize;
  style?: StyleProp<ViewStyle>;
};

export function TrackerTile({
  accessibilityHint,
  accessibilityLabel,
  disabled = false,
  icon,
  label,
  onPress,
  recent = false,
  selected = false,
  size = 'threeColumn',
  style,
  ...props
}: TrackerTileProps) {
  const isDisabled = Boolean(disabled);
  const reducedMotion = useReducedMotion();
  const handlePress: PressableProps['onPress'] = (event) => {
    void haptic('tapConfirm');
    onPress(event);
  };

  return (
    <Touchable
      {...props}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, selected }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.root,
        sizeStyles[size],
        recent ? styles.recent : null,
        selected ? styles.selected : null,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
        pressedScaleStyle(pressed && !isDisabled, reducedMotion),
        style,
      ]}>
      {icon ? (
        <View
          {...decorativeViewProps}
          style={styles.icon}>
          {icon}
        </View>
      ) : null}
      <AppText numberOfLines={2} style={styles.label} variant="label">
        {label}
      </AppText>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.4,
  },
  icon: {
    alignItems: 'center',
    height: tokens.component.trackerTile.icon,
    justifyContent: 'center',
    width: tokens.component.trackerTile.icon,
  },
  label: {
    color: tokens.color.text.primary,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
  recent: {
    backgroundColor: tokens.color.primary[50],
  },
  root: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.space[2],
    justifyContent: 'center',
    minHeight: tokens.component.trackerTile.min.height,
    minWidth: tokens.component.trackerTile.min.width,
    padding: tokens.space[3],
  },
  selected: {
    borderColor: tokens.color.primary[600],
  },
});

const sizeStyles = StyleSheet.create({
  compact: {
    minHeight: tokens.component.trackerTile.min.height,
    minWidth: tokens.component.trackerTile.min.width,
  },
  threeColumn: {
    minHeight: tokens.component.trackerTile.threeCol.height,
    width: tokens.component.trackerTile.threeCol.width,
  },
  twoColumn: {
    minHeight: tokens.component.trackerTile.twoCol.height,
    width: tokens.component.trackerTile.twoCol.width,
  },
});
