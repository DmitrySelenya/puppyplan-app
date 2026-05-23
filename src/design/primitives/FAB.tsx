import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/design/primitives/AppText';
import { tokens } from '@/design/tokens';

type FABProps = {
  accessibilityHint: string;
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FAB({ accessibilityHint, accessibilityLabel, onPress, style }: FABProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed ? styles.pressed : null, style]}>
      <AppText accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.symbol}>
        +
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  root: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[600],
    borderRadius: tokens.component.fab.size / 2,
    height: tokens.component.fab.size,
    justifyContent: 'center',
    shadowColor: tokens.color.text.primary,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    width: tokens.component.fab.size,
  },
  symbol: {
    color: tokens.color.surface.raised,
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 36,
  },
});
