import { StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { CheckCircle } from '@/design/primitives/CheckCircle';
import { IconChip, type EventAccent } from '@/design/primitives/IconChip';
import { TimeGutter } from '@/design/primitives/TimeGutter';
import { Touchable } from '@/design/primitives/Touchable';
import { elevationStyle } from '@/design/primitives/elevationStyle';
import { tokens } from '@/design/tokens';

export type RoutineCardState = 'done' | 'upcoming' | 'past';

export type RoutineCardProps = {
  accent?: EventAccent;
  accessibilityLabel: string;
  checkboxLabel: string;
  checkboxTestID?: string;
  icon: AppIconName;
  meta?: string;
  onOverflow?: () => void;
  onToggleDone?: () => void;
  overflowLabel?: string;
  reminderOff?: boolean;
  reminderOffLabel?: string;
  state?: RoutineCardState;
  /** The linked check-off write is still syncing: spinner on the checkbox, card held off the done fill. */
  syncing?: boolean;
  testID?: string;
  time: string;
  title: string;
};

/** A planned/checkable Diary routine row (feeding, walk, nap…). */
export function RoutineCard({
  accent = 'clay',
  accessibilityLabel,
  checkboxLabel,
  checkboxTestID,
  icon,
  meta,
  onOverflow,
  onToggleDone,
  overflowLabel,
  reminderOff = false,
  reminderOffLabel,
  state = 'upcoming',
  syncing = false,
  testID,
  time,
  title,
}: RoutineCardProps) {
  const done = state === 'done';
  const past = state === 'past';
  // Optimistically-done but not yet confirmed: keep the row visually pending until the write settles.
  const settledDone = done && !syncing;

  return (
    <View style={styles.row} testID={testID}>
      <TimeGutter time={time} />
      <View
        style={[
          styles.card,
          settledDone ? styles.cardDone : styles.cardDefault,
          past ? styles.cardPast : elevationStyle(1),
        ]}
        testID={testID ? `${testID}-card` : undefined}>
        <CheckCircle
          accessibilityLabel={checkboxLabel}
          checked={done}
          onPress={onToggleDone}
          quiet={past}
          syncing={syncing}
          testID={checkboxTestID}
        />
        <IconChip accent={settledDone ? 'sage' : accent} icon={icon} quiet={past} />
        <View accessibilityLabel={accessibilityLabel} accessible style={styles.copy}>
          <AppText variant="headline">{title}</AppText>
          {meta ? (
            <AppText style={styles.meta} variant="footnote">
              {meta}
            </AppText>
          ) : null}
          {reminderOff && reminderOffLabel ? (
            <View style={styles.reminderRow}>
              <AppIcon color={tokens.color.text.primary} name="bellSlash" size={13} />
              <AppText variant="footnote">{reminderOffLabel}</AppText>
            </View>
          ) : null}
        </View>
        {overflowLabel !== undefined ? (
          <Touchable
            accessibilityLabel={overflowLabel}
            accessibilityRole="button"
            minTarget="none"
            onPress={onOverflow}
            style={styles.overflow}>
            <AppIcon color={tokens.color.text.secondary} name="more" size={22} />
          </Touchable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: tokens.radius.card,
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    minWidth: 0,
    paddingBottom: 10,
    paddingLeft: 13,
    paddingRight: 7,
    paddingTop: 10,
  },
  cardDefault: {
    backgroundColor: tokens.color.surface.raised,
  },
  cardDone: {
    backgroundColor: tokens.color.sage[100],
  },
  cardPast: {
    backgroundColor: tokens.color.surface.raised,
    opacity: 0.78,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  meta: {
    marginTop: 1,
  },
  overflow: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  reminderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
