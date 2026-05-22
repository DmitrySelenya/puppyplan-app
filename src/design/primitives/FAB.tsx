import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/design/primitives/AppText';
import { scaffoldTokens } from '@/design/tokens/scaffold';

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
    backgroundColor: scaffoldTokens.color.primaryStrong,
    borderRadius: scaffoldTokens.spacing.fabSize / 2,
    height: scaffoldTokens.spacing.fabSize,
    justifyContent: 'center',
    shadowColor: scaffoldTokens.color.textPrimary,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    width: scaffoldTokens.spacing.fabSize,
  },
  symbol: {
    color: scaffoldTokens.color.surfaceRaised,
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 36,
  },
});
