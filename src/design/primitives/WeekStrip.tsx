import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { designFontFamilies } from '@/design/fonts';
import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { elevationStyle } from '@/design/primitives/elevationStyle';
import { tokens } from '@/design/tokens';

const CIRCLE_SIZE = 38;
const DOT_SIZE = 5;

export type WeekStripDay = {
  /** Composed, localized a11y label, e.g. "Thu 14, today, selected". */
  accessibilityLabel: string;
  /** Display date number (may be a localized string, e.g. non-Latin numerals). */
  day: number | string;
  /** Localized weekday abbreviation, e.g. "Thu". */
  dow: string;
  key: string;
  testID?: string;
};

export type WeekStripProps = {
  accessibilityLabel: string;
  days: WeekStripDay[];
  onSelectDay?: (index: number) => void;
  selectedIndex: number;
  testID?: string;
  todayIndex?: number;
};

/** Horizontal Mon–Sun day selector at the top of the Diary. */
export function WeekStrip({
  accessibilityLabel,
  days,
  onSelectDay,
  selectedIndex,
  testID,
  todayIndex,
}: WeekStripProps) {
  const { fontScale } = useWindowDimensions();
  const accessibilityLayout = fontScale >= 2;
  const dayButtons = days.map((entry, index) => {
    const isSelected = index === selectedIndex;
    const isToday = index === todayIndex;

    return (
      <Touchable
        accessibilityLabel={entry.accessibilityLabel}
        accessibilityRole={onSelectDay ? 'button' : 'text'}
        accessibilityState={onSelectDay ? { selected: isSelected } : undefined}
        key={entry.key}
        minTarget="none"
        onPress={onSelectDay ? () => onSelectDay(index) : undefined}
        style={[styles.day, accessibilityLayout ? styles.accessibilityDay : null]}
        testID={entry.testID}>
        <AppText tone={isSelected ? 'primary' : 'secondary'} variant="caption">
          {entry.dow}
        </AppText>
        <View style={styles.circleWrap}>
          <View
            style={[
              styles.circle,
              isSelected ? styles.circleSelected : styles.circleDefault,
            ]}>
            <AppText
              maxFontSizeMultiplier={1.5}
              numeric
              style={[styles.circleNum, isSelected ? styles.circleNumSelected : null]}>
              {entry.day}
            </AppText>
          </View>
          {isToday && !isSelected ? <View style={styles.dot} /> : null}
        </View>
      </Touchable>
    );
  });

  if (accessibilityLayout) {
    return (
      <ScrollView
        accessibilityLabel={accessibilityLabel}
        contentContainerStyle={styles.accessibilityStrip}
        horizontal
        showsHorizontalScrollIndicator={false}
        testID={testID}>
        {dayButtons}
      </ScrollView>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={styles.strip}
      testID={testID}>
      {dayButtons}
    </View>
  );
}

const styles = StyleSheet.create({
  accessibilityDay: {
    flexGrow: 0,
    flexShrink: 0,
    width: 64,
  },
  accessibilityStrip: {
    flexDirection: 'row',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[3],
  },
  circle: {
    alignItems: 'center',
    borderRadius: tokens.radius.full,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    width: CIRCLE_SIZE,
  },
  circleDefault: {
    backgroundColor: tokens.color.surface.raised,
    ...elevationStyle(1),
  },
  circleNum: {
    color: tokens.color.text.primary,
    fontFamily: designFontFamilies.display.semibold,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  circleNumSelected: {
    color: tokens.color.text.onPrimary,
  },
  circleSelected: {
    backgroundColor: tokens.color.primary[600],
    elevation: 4,
    shadowColor: tokens.color.primary[700],
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  circleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    alignItems: 'center',
    flex: 1,
    gap: 7,
    minHeight: 58,
    minWidth: 44,
  },
  dot: {
    backgroundColor: tokens.color.primary[600],
    borderRadius: tokens.radius.full,
    bottom: -DOT_SIZE - 2,
    height: DOT_SIZE,
    position: 'absolute',
    width: DOT_SIZE,
  },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[3],
  },
});
