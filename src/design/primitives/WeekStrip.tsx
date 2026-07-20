import { useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { designFontFamilies } from '@/design/fonts';
import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { elevationStyle } from '@/design/primitives/elevationStyle';
import { tokens } from '@/design/tokens';

const CIRCLE_SIZE = 38;
const DOT_SIZE = 5;

type DayLayout = {
  generation: string;
  index: number;
  width: number;
  x: number;
};

type WidthMeasurement = {
  generation: string;
  width: number;
};

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
  const layoutGeneration = JSON.stringify([
    accessibilityLayout,
    days.map((entry) => entry.key),
  ]);
  const scrollViewRef = useRef<ScrollView>(null);
  const dayLayoutsRef = useRef(new Map<number, Omit<DayLayout, 'index'>>());
  const lastScrollCommandRef = useRef<string | null>(null);
  const [contentMeasurement, setContentMeasurement] = useState<WidthMeasurement | null>(null);
  const [selectedDayLayout, setSelectedDayLayout] = useState<DayLayout | null>(null);
  const [viewportMeasurement, setViewportMeasurement] = useState<WidthMeasurement | null>(null);
  const contentWidth = contentMeasurement?.generation === layoutGeneration
    ? contentMeasurement.width
    : null;
  const viewportWidth = viewportMeasurement?.generation === layoutGeneration
    ? viewportMeasurement.width
    : null;
  const scrollEnabled = contentWidth !== null
    && viewportWidth !== null
    && contentWidth > viewportWidth;

  useEffect(() => {
    for (const [index, measurement] of dayLayoutsRef.current) {
      if (measurement.generation !== layoutGeneration) {
        dayLayoutsRef.current.delete(index);
      }
    }

    lastScrollCommandRef.current = null;
    setContentMeasurement((currentMeasurement) =>
      currentMeasurement?.generation === layoutGeneration ? currentMeasurement : null);
    setSelectedDayLayout((currentLayout) =>
      currentLayout?.generation === layoutGeneration ? currentLayout : null);
    setViewportMeasurement((currentMeasurement) => {
      if (!currentMeasurement || currentMeasurement.generation === layoutGeneration) {
        return currentMeasurement;
      }

      return { generation: layoutGeneration, width: currentMeasurement.width };
    });
  }, [layoutGeneration]);

  useEffect(() => {
    const measuredLayout = dayLayoutsRef.current.get(selectedIndex);

    setSelectedDayLayout((currentLayout) => {
      if (!measuredLayout || measuredLayout.generation !== layoutGeneration) {
        return null;
      }

      if (
        currentLayout?.generation === layoutGeneration
        && currentLayout.index === selectedIndex
        && currentLayout.width === measuredLayout.width
        && currentLayout.x === measuredLayout.x
      ) {
        return currentLayout;
      }

      return { index: selectedIndex, ...measuredLayout };
    });
  }, [layoutGeneration, selectedIndex]);

  useEffect(() => {
    if (
      !scrollEnabled
      || contentWidth === null
      || viewportWidth === null
      || selectedDayLayout?.generation !== layoutGeneration
      || selectedDayLayout?.index !== selectedIndex
    ) {
      lastScrollCommandRef.current = null;
      return;
    }

    const maxOffset = contentWidth - viewportWidth;
    const selectedRightEdge = selectedDayLayout.x + selectedDayLayout.width;
    const x = Math.min(Math.max(selectedRightEdge - viewportWidth, 0), maxOffset);
    const commandKey = [
      layoutGeneration,
      selectedIndex,
      viewportWidth,
      contentWidth,
      selectedDayLayout.x,
      selectedDayLayout.width,
      x,
    ].join(':');

    if (lastScrollCommandRef.current === commandKey) {
      return;
    }

    lastScrollCommandRef.current = commandKey;
    scrollViewRef.current?.scrollTo({ animated: false, x, y: 0 });
  }, [
    contentWidth,
    layoutGeneration,
    scrollEnabled,
    selectedDayLayout,
    selectedIndex,
    viewportWidth,
  ]);

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;
    setContentMeasurement((currentMeasurement) =>
      currentMeasurement?.generation === layoutGeneration
        && currentMeasurement.width === measuredWidth
        ? currentMeasurement
        : { generation: layoutGeneration, width: measuredWidth });
  };

  const handleContentSizeChange = (width: number) => {
    setContentMeasurement((currentMeasurement) =>
      currentMeasurement?.generation === layoutGeneration && currentMeasurement.width === width
        ? currentMeasurement
        : { generation: layoutGeneration, width });
  };

  const handleDayLayout = (index: number, event: LayoutChangeEvent) => {
    const { width, x } = event.nativeEvent.layout;
    const currentLayout = dayLayoutsRef.current.get(index);

    if (
      currentLayout?.generation === layoutGeneration
      && currentLayout.width === width
      && currentLayout.x === x
    ) {
      return;
    }

    const nextLayout = { generation: layoutGeneration, width, x };
    dayLayoutsRef.current.set(index, nextLayout);

    if (index === selectedIndex) {
      setSelectedDayLayout({ index, ...nextLayout });
    }
  };

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;
    setViewportMeasurement((currentMeasurement) =>
      currentMeasurement?.generation === layoutGeneration
        && currentMeasurement.width === measuredWidth
        ? currentMeasurement
        : { generation: layoutGeneration, width: measuredWidth });
  };

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
        onLayout={(event) => handleDayLayout(index, event)}
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

  return (
    <ScrollView
      accessibilityLabel={accessibilityLabel}
      horizontal
      onContentSizeChange={handleContentSizeChange}
      onLayout={handleViewportLayout}
      ref={scrollViewRef}
      scrollEnabled={scrollEnabled}
      showsHorizontalScrollIndicator={false}
      testID={testID}>
      <View
        onLayout={handleContentLayout}
        style={accessibilityLayout ? styles.accessibilityStrip : styles.strip}
        testID="week-strip-content">
        {dayButtons}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  accessibilityDay: {
    flexGrow: 0,
    flexShrink: 0,
    width: 64,
  },
  accessibilityStrip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: tokens.space[2],
    minWidth: '100%',
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
    minWidth: '100%',
    paddingHorizontal: tokens.space[3],
  },
});
