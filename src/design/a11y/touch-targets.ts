import type { Insets, ViewStyle } from 'react-native';
import { Platform } from 'react-native';

import { tokens } from '@/design/tokens';

export const MIN_TOUCH_TARGET_BY_PLATFORM = {
  android: 48,
  default: tokens.layout.tapTargetMin,
  ios: tokens.layout.tapTargetMin,
} as const;

export const MIN_TOUCH_TARGET =
  Platform.select(MIN_TOUCH_TARGET_BY_PLATFORM) ?? MIN_TOUCH_TARGET_BY_PLATFORM.default;
export const THUMB_TOUCH_TARGET = tokens.layout.tapTargetThumbZone;
export const DEFAULT_HIT_SLOP = {
  bottom: 10,
  left: 10,
  right: 10,
  top: 10,
} as const satisfies Insets;

export function getHitSlopForVisualSize(
  visualSize: number,
  minimumTarget = MIN_TOUCH_TARGET,
): Insets {
  const inset = Math.max(0, Math.ceil((minimumTarget - visualSize) / 2));

  return {
    bottom: inset,
    left: inset,
    right: inset,
    top: inset,
  };
}

export function touchTargetStyle(target: 'default' | 'thumb' = 'default'): ViewStyle {
  const size = target === 'thumb' ? THUMB_TOUCH_TARGET : MIN_TOUCH_TARGET;

  return {
    minHeight: size,
    minWidth: size,
  };
}

export const decorativeViewProps = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;
