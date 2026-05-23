import type { PropsWithChildren } from 'react';
import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { tokens } from '@/design/tokens';

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
    color: tokens.color.text.primary,
  },
  body: {
    fontSize: tokens.typography.scale.body.fontSize,
    lineHeight: tokens.typography.scale.body.lineHeight,
  },
  caption: {
    color: tokens.color.text.secondary,
    fontSize: tokens.typography.scale.footnote.fontSize,
    lineHeight: tokens.typography.scale.footnote.lineHeight,
  },
  title: {
    fontSize: tokens.typography.scale.title1.fontSize,
    fontWeight: '600',
    lineHeight: tokens.typography.scale.title1.lineHeight,
  },
});
