import type { AccessibilityActionEvent, AccessibilityActionInfo } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { type AppIconName } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { IconChip, type EventAccent } from '@/design/primitives/IconChip';
import { TimeGutter } from '@/design/primitives/TimeGutter';
import { tokens } from '@/design/tokens';

export type FactCardProps = {
  accent?: EventAccent;
  accessibilityActions?: readonly AccessibilityActionInfo[];
  accessibilityLabel: string;
  caption?: string;
  icon: AppIconName;
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  testID?: string;
  time: string;
  title: string;
};

/** A logged, already-happened Diary fact (play, sleep, spontaneous events). */
export function FactCard({
  accent = 'honey',
  accessibilityActions,
  accessibilityLabel,
  caption,
  icon,
  onAccessibilityAction,
  testID,
  time,
  title,
}: FactCardProps) {
  return (
    <View style={styles.row} testID={testID}>
      <TimeGutter time={time} />
      <View
        accessibilityActions={accessibilityActions}
        accessibilityLabel={accessibilityLabel}
        accessible
        onAccessibilityAction={onAccessibilityAction}
        style={styles.card}
        testID={testID ? `${testID}-card` : undefined}>
        <IconChip accent={accent} icon={icon} />
        <View style={styles.copy}>
          <AppText variant="headline">{title}</AppText>
          {caption ? (
            <AppText style={styles.caption} variant="footnote">
              {caption}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    marginTop: 1,
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
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
