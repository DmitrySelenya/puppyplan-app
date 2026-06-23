import type { PropsWithChildren } from 'react';
import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { designFontFamilies } from '@/design/fonts';
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
    numeric?: boolean;
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
  numeric = false,
  style,
  tone = 'primary',
  variant = 'body',
  ...props
}: AppTextProps) {
  const multiplier = maxFontSizeMultiplier ?? APP_TEXT_MAX_FONT_SIZE_MULTIPLIER;
  const numericStyle = numeric || variant === 'code' ? styles.numeric : null;

  return (
    <Text
      {...props}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={multiplier}
      style={[styles.base, toneStyles[tone], variantStyles[variant], numericStyle, style]}>
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
  numeric: {
    fontVariant: ['tabular-nums'],
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
  body: {
    ...textStyleForToken(tokens.typography.scale.body),
    fontFamily: designFontFamilies.text.regular,
  },
  bodyEmph: {
    ...textStyleForToken(tokens.typography.scale.bodyEmph),
    fontFamily: designFontFamilies.text.bold,
  },
  callout: {
    ...textStyleForToken(tokens.typography.scale.callout),
    fontFamily: designFontFamilies.text.regular,
  },
  caption: {
    ...textStyleForToken(tokens.typography.scale.caption),
    fontFamily: designFontFamilies.text.regular,
  },
  code: {
    ...textStyleForToken(tokens.typography.scale.code),
    fontFamily: tokens.typography.fontFamily.mono[0],
  },
  display: {
    ...textStyleForToken(tokens.typography.scale.display),
    fontFamily: designFontFamilies.display.semibold,
  },
  footnote: {
    ...textStyleForToken(tokens.typography.scale.footnote),
    fontFamily: designFontFamilies.text.regular,
  },
  headline: {
    ...textStyleForToken(tokens.typography.scale.headline),
    fontFamily: designFontFamilies.display.semibold,
  },
  // Compact control labels intentionally share the caption type token.
  label: {
    ...textStyleForToken(tokens.typography.scale.caption),
    fontFamily: designFontFamilies.text.regular,
  },
  subheadline: {
    ...textStyleForToken(tokens.typography.scale.subheadline),
    fontFamily: designFontFamilies.text.regular,
  },
  title: {
    ...textStyleForToken(tokens.typography.scale.title1),
    fontFamily: designFontFamilies.display.semibold,
  },
  title1: {
    ...textStyleForToken(tokens.typography.scale.title1),
    fontFamily: designFontFamilies.display.semibold,
  },
  title2: {
    ...textStyleForToken(tokens.typography.scale.title2),
    fontFamily: designFontFamilies.display.semibold,
  },
  title3: {
    ...textStyleForToken(tokens.typography.scale.title3),
    fontFamily: designFontFamilies.display.semibold,
  },
});
