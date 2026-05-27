import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { tokens } from '@/design/tokens';

export type StackGap = 'xs' | 'sm' | 'md' | 'lg';

export type StackProps = PropsWithChildren<{
  align?: ViewStyle['alignItems'];
  direction?: 'horizontal' | 'vertical';
  gap?: StackGap;
  justify?: ViewStyle['justifyContent'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  wrap?: boolean;
}>;

export function Stack({
  align,
  children,
  direction = 'vertical',
  gap = 'md',
  justify,
  style,
  testID,
  wrap = false,
}: StackProps) {
  return (
    <View
      style={[
        styles.root,
        direction === 'horizontal' ? styles.horizontal : styles.vertical,
        wrap ? styles.wrap : null,
        stackGapStyles[gap],
        align ? { alignItems: align } : null,
        justify ? { justifyContent: justify } : null,
        style,
      ]}
      testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontal: {
    flexDirection: 'row',
  },
  root: {},
  vertical: {
    flexDirection: 'column',
  },
  wrap: {
    flexWrap: 'wrap',
  },
});

const stackGapStyles = StyleSheet.create({
  lg: {
    gap: tokens.space[4],
  },
  md: {
    gap: tokens.space[3],
  },
  sm: {
    gap: tokens.space[2],
  },
  xs: {
    gap: tokens.space[1],
  },
});
