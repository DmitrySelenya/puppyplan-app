import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { designFontFamilies } from '@/design/fonts';
import { AppText } from '@/design/primitives/AppText';

const GUTTER_WIDTH = 46;

export type TimeGutterProps = {
  /** A clock time such as "7:15 am"; the meridiem is rendered smaller below. */
  time: string;
  testID?: string;
};

/** Right-aligned time column that anchors a Diary event row. */
export function TimeGutter({ time, testID }: TimeGutterProps) {
  const { fontScale } = useWindowDimensions();
  const normalizedTime = time.trim().replaceAll('\u00a0', ' ').replaceAll('\u202f', ' ');
  const [clock, meridiem] = normalizedTime.split(/\s+/, 2);

  return (
    <View
      style={[styles.gutter, fontScale >= 2 ? styles.accessibilityGutter : null]}
      testID={testID}>
      <AppText
        maxFontSizeMultiplier={1.3}
        numeric
        numberOfLines={1}
        style={styles.clock}
        tone="secondary"
        variant="footnote">
        {clock}
      </AppText>
      {meridiem ? (
        <AppText
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          style={styles.meridiem}
          tone="secondary"
          variant="caption">
          {meridiem}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  accessibilityGutter: {
    width: 62,
  },
  clock: {
    fontFamily: designFontFamilies.display.semibold,
    fontWeight: '700',
    lineHeight: 16,
  },
  gutter: {
    alignItems: 'flex-end',
    flexShrink: 0,
    paddingRight: 9,
    width: GUTTER_WIDTH,
  },
  meridiem: {
    fontFamily: designFontFamilies.text.bold,
    fontWeight: '700',
    lineHeight: 12,
    marginTop: 1,
  },
});
