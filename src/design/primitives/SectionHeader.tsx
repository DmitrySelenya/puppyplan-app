import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design/primitives/AppText';
import { tokens } from '@/design/tokens';

export type SectionHeaderProps = {
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  title: string;
  titleStyle?: StyleProp<TextStyle>;
};

export function SectionHeader({
  action,
  style,
  testID,
  title,
  titleStyle,
}: SectionHeaderProps) {
  return (
    <View
      style={[styles.root, style]}
      testID={testID}>
      <AppText
        accessibilityRole="header"
        style={[styles.title, titleStyle]}
        tone="secondary"
        variant="subheadline">
        {title}
      </AppText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[1],
    paddingTop: tokens.space[4],
  },
  title: {
    flexShrink: 1,
    fontWeight: String(tokens.typography.fontWeight.semibold) as TextStyle['fontWeight'],
  },
});
