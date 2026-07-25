import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppIcon } from '@/design/primitives/AppIcon';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';

const HIT_SIZE = 44;
const RING_SIZE = 28;

export type CheckCircleProps = {
  accessibilityLabel: string;
  checked: boolean;
  onPress?: () => void;
  /** Muted variant for past rows: neutral ring instead of the active clay ring. */
  quiet?: boolean;
  /**
   * The linked write is still reaching the server. Shows a spinner in a bordered ring on the
   * tapped control itself and marks the checkbox busy, until the write settles into `checked`.
   */
  syncing?: boolean;
  testID?: string;
};

/** A 44pt round check-toggle used on Diary routine rows. */
export function CheckCircle({
  accessibilityLabel,
  checked,
  onPress,
  quiet = false,
  syncing = false,
  testID,
}: CheckCircleProps) {
  const ringBorder = quiet ? tokens.color.stroke.strong : tokens.color.primary[400];
  // While syncing the ring stays bordered-and-empty (no premature green fill) with a spinner, so the
  // control the user just tapped is where the progress shows.
  const filled = checked && !syncing;

  return (
    <Touchable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      // A checkbox with no handler still looks and announces like one, so a tap on it is a silent
      // no-op: the control promises a toggle it cannot honour. If there is no way back, say so.
      accessibilityState={{ busy: syncing, checked, disabled: onPress === undefined }}
      minTarget="none"
      onPress={onPress}
      style={styles.hit}
      testID={testID}>
      <View
        style={[
          styles.ring,
          filled
            ? { backgroundColor: tokens.color.sage[500] }
            : { borderColor: ringBorder, borderWidth: 2 },
        ]}
        testID={testID ? `${testID}-ring` : undefined}>
        {syncing ? (
          <ActivityIndicator
            color={tokens.color.primary[400]}
            size="small"
            testID={testID ? `${testID}-spinner` : undefined}
          />
        ) : filled ? (
          <AppIcon color={tokens.color.text.onPrimary} name="check" size={17} />
        ) : null}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    height: HIT_SIZE,
    justifyContent: 'center',
    width: HIT_SIZE,
  },
  ring: {
    alignItems: 'center',
    borderRadius: tokens.radius.full,
    height: RING_SIZE,
    justifyContent: 'center',
    width: RING_SIZE,
  },
});
