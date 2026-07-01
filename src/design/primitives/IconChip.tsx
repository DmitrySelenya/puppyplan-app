import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { tokens } from '@/design/tokens';

/**
 * Diary event accent families (Clay design-freeze `DIARY_ACCENTS`).
 * Each maps to a chip background + foreground (icon) colour.
 */
export type EventAccent = 'clay' | 'sage' | 'honey' | 'mauve';

export const eventAccentColors: Record<EventAccent, { bg: string; fg: string }> = {
  clay: { bg: tokens.color.primary[50], fg: tokens.color.primary[600] },
  honey: { bg: tokens.color.accent[100], fg: tokens.color.accent[700] },
  mauve: { bg: tokens.color.status.infoTint, fg: tokens.color.status.info },
  sage: { bg: tokens.color.sage[100], fg: tokens.color.sage[700] },
};

const CHIP_SIZE = 44;
const CHIP_RADIUS = 13;
const GLYPH_SIZE = 22;

export type IconChipProps = {
  accent?: EventAccent;
  icon: AppIconName;
  /** Muted variant for past/dimmed rows: neutral surface + secondary icon. */
  quiet?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function IconChip({ accent = 'clay', icon, quiet = false, style, testID }: IconChipProps) {
  const colors = eventAccentColors[accent];
  const backgroundColor = quiet ? tokens.color.surface.base : colors.bg;
  const iconColor = quiet ? tokens.color.text.secondary : colors.fg;

  return (
    <View style={[styles.chip, { backgroundColor }, style]} testID={testID}>
      <AppIcon color={iconColor} name={icon} size={GLYPH_SIZE} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: CHIP_RADIUS,
    height: CHIP_SIZE,
    justifyContent: 'center',
    width: CHIP_SIZE,
  },
});
