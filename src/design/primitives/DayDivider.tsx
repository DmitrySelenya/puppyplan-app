import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design/primitives/AppText';
import { tokens } from '@/design/tokens';

export type DayDividerProps = {
  label: string;
  style?: StyleProp<ViewStyle>;
  sub?: string;
  testID?: string;
};

/** Labelled hairline separating day groups in the Diary history view. */
export function DayDivider({ label, style, sub, testID }: DayDividerProps) {
  return (
    <View accessibilityRole="header" style={[styles.row, style]} testID={testID}>
      <AppText variant="title3">{label}</AppText>
      <View style={styles.rule} />
      {sub ? (
        <AppText tone="secondary" variant="footnote">
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  rule: {
    backgroundColor: tokens.color.stroke.default,
    flex: 1,
    height: 1,
  },
});
