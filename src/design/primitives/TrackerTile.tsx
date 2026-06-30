import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { decorativeViewProps } from '@/design/a11y';
import { haptic } from '@/design/haptics';
import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { AppIcon } from '@/design/primitives/AppIcon';
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
      {selected ? (
        <View
          {...decorativeViewProps}
          style={styles.selectedCheck}
          testID="tracker-tile-checkmark">
          <AppIcon
            color={tokens.color.text.onPrimary}
            name="check"
            size={12}
          />
        </View>
      ) : null}
      <AppText
        maxFontSizeMultiplier={2}
        numberOfLines={3}
        style={styles.label}
        variant="label">
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
    fontSize: 14,
    fontWeight: String(tokens.typography.fontWeight.semibold) as TextStyle['fontWeight'],
    textAlign: 'left',
  },
  pressed: {
    opacity: 0.88,
  },
  recent: {
    backgroundColor: tokens.color.primary[50],
  },
  root: {
    alignItems: 'flex-start',
    backgroundColor: tokens.color.surface.raised,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: tokens.space[2],
    justifyContent: 'flex-start',
    minHeight: tokens.component.trackerTile.min.height,
    minWidth: tokens.component.trackerTile.min.width,
    padding: tokens.space[3],
    position: 'relative',
  },
  selected: {
    borderColor: tokens.color.primary[600],
    borderWidth: 1.5,
  },
  selectedCheck: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[600],
    borderRadius: tokens.radius.full,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: tokens.space[2],
    top: tokens.space[2],
    width: 20,
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
