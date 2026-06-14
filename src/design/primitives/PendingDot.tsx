import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { decorativeViewProps } from '@/design/a11y';
import { tokens } from '@/design/tokens';

export type PendingDotProps = {
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function PendingDot({
  accessibilityLabel,
  style,
  testID,
}: PendingDotProps) {
  return (
    <View
      {...(accessibilityLabel
        ? {
            accessibilityLabel,
            accessible: true,
          }
        : decorativeViewProps)}
      style={[styles.root, style]}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: tokens.color.status.info,
    borderRadius: tokens.radius.full,
    height: 8,
    width: 8,
  },
});
