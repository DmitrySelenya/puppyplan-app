import type { PropsWithChildren } from 'react';
import type { PressableProps, StyleProp, ViewProps, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { Touchable } from '@/design/primitives/Touchable';
import { elevationStyle } from '@/design/primitives/elevationStyle';
import { tokens } from '@/design/tokens';

export type CardVariant = 'resting' | 'interactive' | 'hero' | 'mutedTemplate';
type StaticCardVariant = Exclude<CardVariant, 'interactive'>;

type StaticCardProps = PropsWithChildren<{
  accessibilityLiveRegion?: ViewProps['accessibilityLiveRegion'];
  accessibilityLabel?: string;
  accessibilityRole?: ViewProps['accessibilityRole'];
  onPress?: undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: StaticCardVariant;
}>;

type InteractiveCardProps = PropsWithChildren<{
  accessibilityLiveRegion?: never;
  accessibilityLabel: string;
  accessibilityRole?: never;
  onPress: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: CardVariant;
}>;

export type CardProps = StaticCardProps | InteractiveCardProps;

export function Card({
  accessibilityLabel,
  accessibilityLiveRegion,
  accessibilityRole,
  children,
  onPress,
  style,
  testID,
  variant = onPress ? 'interactive' : 'resting',
}: CardProps) {
  const reducedMotion = useReducedMotion();
  const rootStyle = [
    styles.root,
    cardVariantStyles[variant],
    onPress ? styles.interactiveElevation : null,
    style,
  ];

  if (onPress) {
    return (
      <Touchable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          rootStyle,
          pressed ? styles.pressed : null,
          pressedScaleStyle(pressed, reducedMotion),
        ]}
        testID={testID}>
        {children}
      </Touchable>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={accessibilityLiveRegion}
      accessibilityRole={accessibilityRole}
      accessible={Boolean(accessibilityLabel || accessibilityLiveRegion || accessibilityRole)}
      style={rootStyle}
      testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
  },
  root: {
    backgroundColor: tokens.color.surface.raised,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: tokens.layout.cardPadding,
  },
  interactiveElevation: elevationStyle(1),
});

const cardVariantStyles = StyleSheet.create({
  hero: {
    padding: tokens.space[5],
  },
  interactive: {},
  mutedTemplate: {
    backgroundColor: tokens.color.surface.sunken,
  },
  resting: {},
});
