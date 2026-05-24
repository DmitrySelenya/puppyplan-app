import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { pressedScaleStyle, useReducedMotion } from '@/design/motion';
import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
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
              numberOfLines={1}
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
    color: tokens.color.primary[700],
  },
  option: {
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: tokens.space[3],
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
    color: tokens.color.text.onPrimary,
  },
  selectedOption: {
    backgroundColor: tokens.color.primary[600],
  },
});
