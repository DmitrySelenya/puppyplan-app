import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { decorativeViewProps } from '@/design/a11y';
import { AppText } from '@/design/primitives/AppText';
import { tokens } from '@/design/tokens';

export type StatusPillTone = keyof typeof tokens.color.pill;
type StatusPillIcon = Exclude<ReactNode, boolean | null | undefined>;

export type StatusPillProps = {
  accessibilityLabel: string;
  icon: StatusPillIcon;
  label: string;
  style?: StyleProp<ViewStyle>;
  tone: StatusPillTone;
};

export function StatusPill({
  accessibilityLabel,
  icon,
  label,
  style,
  tone,
}: StatusPillProps) {
  const toneTokens = tokens.color.pill[tone];

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible
      style={[
        styles.root,
        { backgroundColor: toneTokens.fill },
        style,
      ]}>
      <View
        {...decorativeViewProps}
        style={styles.icon}>
        {icon}
      </View>
      <AppText
        maxFontSizeMultiplier={2}
        numberOfLines={1}
        style={{ color: toneTokens.text }}
        variant="label">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    height: tokens.component.pill.icon,
    justifyContent: 'center',
    width: tokens.component.pill.icon,
  },
  root: {
    alignItems: 'center',
    borderRadius: tokens.component.pill.radius,
    flexDirection: 'row',
    gap: tokens.space[1],
    minHeight: tokens.component.pill.height,
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1],
  },
});
