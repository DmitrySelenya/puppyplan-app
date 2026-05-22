import type { PropsWithChildren } from 'react';
import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { scaffoldTokens } from '@/design/tokens/scaffold';

type AppTextVariant = 'title' | 'body' | 'caption';

type AppTextProps = PropsWithChildren<
  TextProps & {
    style?: StyleProp<TextStyle>;
    variant?: AppTextVariant;
  }
>;

export function AppText({ children, style, variant = 'body', ...props }: AppTextProps) {
  return (
    <Text
      {...props}
      allowFontScaling
      style={[styles.base, styles[variant], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: scaffoldTokens.color.textPrimary,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    color: scaffoldTokens.color.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
  },
});
