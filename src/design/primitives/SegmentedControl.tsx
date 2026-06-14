import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { elevationStyle } from '@/design/primitives/elevationStyle';
import { tokens } from '@/design/tokens';

export type SegmentedControlOption<Value extends string> = {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  value: Value;
};

export type SegmentedControlProps<Value extends string> = {
  accessibilityLabel: string;
  disabled?: boolean;
  onValueChange: (value: Value) => void;
  options: readonly SegmentedControlOption<Value>[];
  style?: StyleProp<ViewStyle>;
  value: Value;
};

export function SegmentedControl<Value extends string>({
  accessibilityLabel,
  disabled = false,
  onValueChange,
  options,
  style,
  value,
}: SegmentedControlProps<Value>) {
  const reducedMotion = useReducedMotion();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
      style={[styles.root, disabled ? styles.disabled : null, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        const optionDisabled = disabled || option.disabled || false;

        return (
          <Touchable
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityRole="tab"
            accessibilityState={{ disabled: optionDisabled, selected }}
            disabled={optionDisabled}
            key={option.value}
            onPress={() => {
              if (!selected) {
                onValueChange(option.value);
              }
            }}
            style={({ pressed }) => [
              styles.option,
              selected ? styles.selectedOption : null,
              pressed && !optionDisabled ? styles.pressedOption : null,
              pressedScaleStyle(pressed && !optionDisabled, reducedMotion),
            ]}>
            <AppText
              maxFontSizeMultiplier={2}
              numberOfLines={2}
              style={selected ? styles.selectedLabel : styles.label}
              variant="label">
              {option.label}
            </AppText>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.4,
  },
  label: {
    color: tokens.color.text.secondary,
  },
  option: {
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: tokens.space[1],
    paddingVertical: tokens.space[2],
  },
  pressedOption: {
    opacity: 0.86,
  },
  root: {
    backgroundColor: tokens.color.surface.sunken,
    borderRadius: tokens.radius.sm,
    flexDirection: 'row',
    gap: tokens.space[1],
    padding: tokens.space[1],
  },
  selectedLabel: {
    color: tokens.color.text.primary,
  },
  selectedOption: {
    backgroundColor: tokens.color.surface.raised,
    ...elevationStyle(1),
  },
});
