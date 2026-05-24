import type { PropsWithChildren } from 'react';
import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { tokens } from '@/design/tokens';

export type AppTextVariant =
  | 'display'
  | 'title'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'bodyEmph'
  | 'callout'
  | 'subheadline'
  | 'footnote'
  | 'caption'
  | 'label'
  | 'code';

export type AppTextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'disabled'
  | 'link'
  | 'onPrimary'
  | 'onAccent';

export type AppTextProps = PropsWithChildren<
  TextProps & {
    style?: StyleProp<TextStyle>;
    tone?: AppTextTone;
    variant?: AppTextVariant;
  }
>;

export const APP_TEXT_MAX_FONT_SIZE_MULTIPLIER = 3;

export function AppText({
  allowFontScaling = true,
  children,
  maxFontSizeMultiplier,
  style,
  tone = 'primary',
  variant = 'body',
  ...props
}: AppTextProps) {
  const multiplier = maxFontSizeMultiplier ?? APP_TEXT_MAX_FONT_SIZE_MULTIPLIER;

  return (
    <Text
      {...props}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={multiplier}
      style={[styles.base, toneStyles[tone], variantStyles[variant], style]}>
      {children}
    </Text>
  );
}

function textStyleForToken(
  tokenStyle: (typeof tokens.typography.scale)[keyof typeof tokens.typography.scale],
): TextStyle {
  return {
    fontSize: tokenStyle.fontSize,
    fontWeight: String(tokenStyle.fontWeight) as TextStyle['fontWeight'],
    letterSpacing: tokenStyle.letterSpacing,
    lineHeight: tokenStyle.lineHeight,
  };
}

const styles = StyleSheet.create({
  base: {
    color: tokens.color.text.primary,
  },
});

const toneStyles = StyleSheet.create({
  disabled: {
    color: tokens.color.text.disabled,
  },
  link: {
    color: tokens.color.text.link,
  },
  onAccent: {
    color: tokens.color.text.onAccent,
  },
  onPrimary: {
    color: tokens.color.text.onPrimary,
  },
  primary: {
    color: tokens.color.text.primary,
  },
  secondary: {
    color: tokens.color.text.secondary,
  },
  tertiary: {
    color: tokens.color.text.tertiary,
  },
});

const variantStyles = StyleSheet.create({
  body: textStyleForToken(tokens.typography.scale.body),
  bodyEmph: textStyleForToken(tokens.typography.scale.bodyEmph),
  callout: textStyleForToken(tokens.typography.scale.callout),
  caption: textStyleForToken(tokens.typography.scale.caption),
  code: textStyleForToken(tokens.typography.scale.code),
  display: textStyleForToken(tokens.typography.scale.display),
  footnote: textStyleForToken(tokens.typography.scale.footnote),
  headline: textStyleForToken(tokens.typography.scale.headline),
  // Compact control labels intentionally share the caption type token.
  label: textStyleForToken(tokens.typography.scale.caption),
  subheadline: textStyleForToken(tokens.typography.scale.subheadline),
  title: textStyleForToken(tokens.typography.scale.title1),
  title1: textStyleForToken(tokens.typography.scale.title1),
  title2: textStyleForToken(tokens.typography.scale.title2),
  title3: textStyleForToken(tokens.typography.scale.title3),
});
