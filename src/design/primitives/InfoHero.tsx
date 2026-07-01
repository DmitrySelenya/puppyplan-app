import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { tokens } from '@/design/tokens';

export type InfoHeroProps = {
  message: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Calm mauve guidance banner shown above the Diary day list. */
export function InfoHero({ message, style, testID }: InfoHeroProps) {
  return (
    <View accessible accessibilityRole="summary" style={[styles.hero, style]} testID={testID}>
      <AppIcon color={tokens.color.status.info} name="infoCircle" size={24} />
      <AppText style={styles.copy} variant="callout">
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: tokens.color.status.infoTint,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: tokens.layout.screenPaddingPhone,
    paddingVertical: 15,
  },
});
