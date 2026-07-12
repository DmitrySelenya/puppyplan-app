import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { decorativeViewProps } from '@/design/a11y';
import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { AppText, type AppTextVariant } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
type ButtonPressHandler = NonNullable<PressableProps['onPress']>;

export type ButtonProps = Omit<PressableProps, 'children' | 'onPress' | 'style'> & {
  label: string;
  labelMaxFontSizeMultiplier?: number;
  labelVariant?: AppTextVariant;
  leading?: ReactNode;
  loading?: boolean;
  onPress: ButtonPressHandler;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  trailing?: ReactNode;
  variant?: ButtonVariant;
};

export function Button({
  accessibilityHint,
  accessibilityLabel,
  accessibilityState,
  disabled = false,
  label,
  labelMaxFontSizeMultiplier,
  labelVariant = 'headline',
  leading,
  loading = false,
  onPress,
  style,
  textStyle,
  trailing,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled);
  const blocksPress = isDisabled || loading;
  const reducedMotion = useReducedMotion();
  const variantStyle = buttonStylesByVariant[variant];

  return (
    <Touchable
      {...props}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, busy: loading, disabled: isDisabled }}
      blockPresses={loading}
      disabled={isDisabled}
      onPress={blocksPress ? undefined : onPress}
      style={({ pressed }) => [
        styles.root,
        variantStyle.root,
        pressed && !blocksPress ? styles.pressed : null,
        pressedScaleStyle(pressed && !blocksPress, reducedMotion),
        pressed && !blocksPress ? variantStyle.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}>
      {leading ? <View style={styles.slot}>{leading}</View> : null}
      <View style={styles.labelFrame}>
        {loading ? (
          <ActivityIndicator
            {...decorativeViewProps}
            color={variantStyle.loaderColor}
            size={16}
            style={styles.loadingIndicator}
            testID="button-loading-indicator"
          />
        ) : null}
        <AppText
          maxFontSizeMultiplier={labelMaxFontSizeMultiplier}
          style={[styles.label, variantStyle.label, loading ? styles.hiddenLabel : null, textStyle]}
          variant={labelVariant}>
          {label}
        </AppText>
      </View>
      {trailing ? <View style={styles.slot}>{trailing}</View> : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.4,
  },
  hiddenLabel: {
    opacity: 0,
  },
  label: {
    textAlign: 'center',
  },
  labelFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
  },
  pressed: {
    opacity: 0.86,
  },
  root: {
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    flexDirection: 'row',
    gap: tokens.space[2],
    justifyContent: 'center',
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[3],
  },
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const variantStyleSheet = StyleSheet.create({
  destructiveLabel: {
    color: tokens.color.text.onPrimary,
  },
  destructivePressed: {
    backgroundColor: tokens.color.status.danger,
  },
  destructiveRoot: {
    backgroundColor: tokens.color.status.danger,
  },
  primaryLabel: {
    color: tokens.color.text.onPrimary,
  },
  primaryPressed: {
    backgroundColor: tokens.color.primary[700],
  },
  primaryRoot: {
    backgroundColor: tokens.color.primary[600],
  },
  secondaryLabel: {
    color: tokens.color.primary[700],
  },
  secondaryPressed: {
    backgroundColor: tokens.color.primary[100],
  },
  secondaryRoot: {
    backgroundColor: tokens.color.primary[50],
    borderColor: tokens.color.primary[200],
    borderWidth: StyleSheet.hairlineWidth,
  },
  tertiaryLabel: {
    color: tokens.color.primary[700],
  },
  tertiaryPressed: {
    backgroundColor: tokens.color.primary[50],
  },
  tertiaryRoot: {
    backgroundColor: 'transparent',
    paddingHorizontal: tokens.space[2],
  },
});

const buttonStylesByVariant: Record<
  ButtonVariant,
  { label: TextStyle; loaderColor: string; pressed: ViewStyle; root: ViewStyle }
> = {
  destructive: {
    label: variantStyleSheet.destructiveLabel,
    loaderColor: tokens.color.text.onPrimary,
    pressed: variantStyleSheet.destructivePressed,
    root: variantStyleSheet.destructiveRoot,
  },
  primary: {
    label: variantStyleSheet.primaryLabel,
    loaderColor: tokens.color.text.onPrimary,
    pressed: variantStyleSheet.primaryPressed,
    root: variantStyleSheet.primaryRoot,
  },
  secondary: {
    label: variantStyleSheet.secondaryLabel,
    loaderColor: tokens.color.primary[700],
    pressed: variantStyleSheet.secondaryPressed,
    root: variantStyleSheet.secondaryRoot,
  },
  tertiary: {
    label: variantStyleSheet.tertiaryLabel,
    loaderColor: tokens.color.primary[700],
    pressed: variantStyleSheet.tertiaryPressed,
    root: variantStyleSheet.tertiaryRoot,
  },
};
