import { StyleSheet, View } from 'react-native';

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
  const [clock, meridiem] = time.split(' ');

  return (
    <View style={styles.gutter} testID={testID}>
      <AppText numeric style={styles.clock} tone="secondary" variant="footnote">
        {clock}
      </AppText>
      {meridiem ? (
        <AppText style={styles.meridiem} tone="secondary" variant="caption">
          {meridiem}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
