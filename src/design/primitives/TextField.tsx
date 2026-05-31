import { forwardRef } from 'react';
import type { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/design/primitives/AppText';
import { tokens } from '@/design/tokens';

type TextFieldAccessibilityState = NonNullable<TextInputProps['accessibilityState']> & {
  invalid?: boolean;
};

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  errorText?: string;
  label: string;
};

export const TextField = forwardRef<RNTextInput, TextFieldProps>(function TextField(
  { accessibilityLabel, accessibilityState, errorText, label, ...props },
  ref,
) {
  const hasError = Boolean(errorText);
  const mergedAccessibilityState: TextFieldAccessibilityState = {
    ...accessibilityState,
    invalid: hasError,
  };

  return (
    <View style={styles.root}>
      <AppText tone="secondary" variant="subheadline">
        {label}
      </AppText>
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={mergedAccessibilityState}
        placeholderTextColor={tokens.color.text.tertiary}
        style={[styles.input, hasError ? styles.inputError : null]}
      />
      {hasError ? (
        <AppText style={styles.errorText} variant="footnote">
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  errorText: {
    color: tokens.color.status.danger,
  },
  input: {
    backgroundColor: tokens.color.surface.base,
    borderColor: tokens.color.stroke.default,
    borderRadius: tokens.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    color: tokens.color.text.primary,
    fontSize: tokens.typography.scale.body.fontSize,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  inputError: {
    borderColor: tokens.color.status.danger,
  },
  root: {
    gap: tokens.space[2],
  },
});
