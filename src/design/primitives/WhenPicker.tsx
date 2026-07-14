import { StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';

export type WhenPickerProps = Readonly<{
  hint: string;
  label: string;
  maximumDate: Date;
  minimumDate: Date;
  onChange: (value: Date) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  testID: string;
  value: Date;
  valueText: string;
}>;

/**
 * A time pill that expands into a native day+time wheel. The wheel reports one whole
 * timestamp, so picking a different day cannot drop the chosen time — the defect that made
 * overnight backdating impossible with a separate date control and HH:MM field.
 *
 * Open state is controlled so a surface can collapse the wheel when it resets its own value.
 */
export function WhenPicker({
  hint,
  label,
  maximumDate,
  minimumDate,
  onChange,
  onOpenChange,
  open,
  testID,
  value,
  valueText,
}: WhenPickerProps) {
  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const timestamp = selectedDate?.getTime() ?? event.nativeEvent.timestamp;
    if (timestamp === undefined) {
      return;
    }

    onChange(new Date(timestamp));
  };

  return (
    <View style={styles.root}>
      <Touchable
        accessibilityHint={hint}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityValue={{ text: valueText }}
        minTarget="default"
        onPress={() => onOpenChange(!open)}
        style={styles.pill}
        testID={`${testID}-pill`}>
        <AppText maxFontSizeMultiplier={2} variant="bodyEmph">
          {valueText}
        </AppText>
      </Touchable>
      {open ? (
        <DateTimePicker
          accessibilityLabel={label}
          display="spinner"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          mode="datetime"
          onChange={handleChange}
          testID={`${testID}-wheel`}
          value={value}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: tokens.color.surface.sunken,
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
    // Wide enough that the control reads as a pill rather than a blob at the shortest label
    // ("09:05"), while the 44pt minimum target comes from Touchable.
    paddingHorizontal: tokens.space[4],
  },
  root: {
    gap: tokens.space[2],
  },
});
