import type { AccessibilityActionEvent, AccessibilityActionInfo } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { IconChip, type EventAccent } from '@/design/primitives/IconChip';
import { TimeGutter } from '@/design/primitives/TimeGutter';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';

export type FactCardProps = {
  accent?: EventAccent;
  accessibilityActions?: readonly AccessibilityActionInfo[];
  accessibilityLabel: string;
  actionsLabel?: string;
  caption?: string;
  icon: AppIconName;
  note?: string;
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  onActionsPress?: () => void;
  onPress?: () => void;
  testID?: string;
  time: string;
  title: string;
};

/** A logged, already-happened Diary fact (play, sleep, spontaneous events). */
export function FactCard({
  accent = 'honey',
  accessibilityActions,
  accessibilityLabel,
  actionsLabel,
  caption,
  icon,
  note,
  onAccessibilityAction,
  onActionsPress,
  onPress,
  testID,
  time,
  title,
}: FactCardProps) {
  const content = (
    <>
      <IconChip accent={accent} icon={icon} />
      <View style={styles.copy}>
        <AppText variant="headline">{title}</AppText>
        {caption ? (
          <AppText style={styles.caption} variant="footnote">
            {caption}
          </AppText>
        ) : null}
        {note ? (
          <AppText numberOfLines={2} style={styles.note} variant="subheadline">
            {note}
          </AppText>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={styles.row} testID={testID}>
      <TimeGutter time={time} />
      {onPress === undefined ? (
        <View
          accessibilityActions={accessibilityActions}
          accessibilityLabel={accessibilityLabel}
          accessible
          onAccessibilityAction={onAccessibilityAction}
          style={styles.card}
          testID={testID ? `${testID}-card` : undefined}>
          {content}
        </View>
      ) : (
        <Touchable
          accessibilityActions={accessibilityActions}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onAccessibilityAction={onAccessibilityAction}
          onPress={onPress}
          style={styles.card}
          testID={testID ? `${testID}-card` : undefined}>
          {content}
        </Touchable>
      )}
      {actionsLabel !== undefined && onActionsPress !== undefined ? (
        <Touchable
          accessibilityLabel={actionsLabel}
          accessibilityRole="button"
          onPress={onActionsPress}
          style={styles.actions}>
          <AppIcon color={tokens.color.text.secondary} name="more" size={22} />
        </Touchable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    marginTop: 1,
  },
  actions: {
    alignItems: 'center',
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
    marginLeft: tokens.space[1],
  },
  card: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.sunken,
    borderRadius: tokens.radius.card,
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  note: {
    color: tokens.color.text.primary,
    marginTop: tokens.space[1],
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
