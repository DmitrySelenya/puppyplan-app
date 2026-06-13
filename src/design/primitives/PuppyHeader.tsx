import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { tokens } from '@/design/tokens';

export type PuppyHeaderProps = {
  ageLabel?: string;
  name?: string;
};

export function PuppyHeader({
  ageLabel = '8 weeks',
  name = 'Puppy A',
}: PuppyHeaderProps) {
  const initial = name.trim().charAt(0).toLocaleUpperCase() || 'P';

  return (
    <View style={styles.root}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <AppText
            allowFontScaling={false}
            style={styles.avatarInitial}
            variant="caption">
            {initial}
          </AppText>
        </View>
        <View>
          <AppText
            maxFontSizeMultiplier={1.4}
            variant="headline">
            {name}
          </AppText>
          <AppText
            maxFontSizeMultiplier={1.4}
            tone="tertiary"
            variant="caption">
            {ageLabel}
          </AppText>
        </View>
      </View>
      <AppIcon name="bell" size={24} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: tokens.color.accent[100],
    borderRadius: tokens.radius.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  avatarInitial: {
    color: tokens.color.accent[700],
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  root: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
});
