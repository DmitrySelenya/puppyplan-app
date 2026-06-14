import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design/primitives/AppText';
import { tokens } from '@/design/tokens';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | number;

export type AvatarTone = 'auto' | 'accent';

export type AvatarProps = {
  initials?: string;
  label: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  tone?: AvatarTone;
};

const avatarSizes = {
  lg: 56,
  md: 40,
  sm: 32,
  xl: 88,
} as const;

export function Avatar({
  initials,
  label,
  size = 'md',
  style,
  testID,
  tone = 'auto',
}: AvatarProps) {
  const resolvedSize = typeof size === 'number' ? size : avatarSizes[size];
  const displayInitials = (initials ?? initialsFromLabel(label)).slice(0, 2).toUpperCase();
  const backgroundColor =
    tone === 'accent' ? tokens.color.accent[100] : avatarColorForLabel(label);

  return (
    <View
      accessibilityLabel={label}
      accessible
      style={[
        styles.root,
        {
          backgroundColor,
          height: resolvedSize,
          width: resolvedSize,
        },
        style,
      ]}
      testID={testID}>
      <AppText
        maxFontSizeMultiplier={1.5}
        style={tone === 'accent' ? styles.initialsAccent : styles.initials}
        variant={resolvedSize >= 56 ? 'headline' : 'caption'}>
        {displayInitials}
      </AppText>
    </View>
  );
}

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  return parts.length === 1
    ? parts[0].slice(0, 2)
    : `${parts[0][0]}${parts[1][0]}`;
}

function avatarColorForLabel(label: string): string {
  const palette = [
    tokens.color.primary[50],
    tokens.color.primary[100],
    tokens.color.status.infoTint,
    tokens.color.status.successTint,
    tokens.color.accent[100],
  ];
  const hash = Array.from(label).reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );

  return palette[hash % palette.length];
}

const styles = StyleSheet.create({
  initials: {
    color: tokens.color.primary[800],
  },
  initialsAccent: {
    color: tokens.color.accent[700],
  },
  root: {
    alignItems: 'center',
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
