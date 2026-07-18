import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { tokens } from '@/design/tokens';

export type InfoHeroProps = {
  message: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /**
   * Optional heading above the message. Pass it separately rather than concatenating it into
   * `message`: a title joined onto the body renders in the body's face and tone, so it reads as
   * a stray first sentence instead of a title.
   */
  title?: string;
};

/** Calm mauve guidance banner shown above the Diary day list. */
export function InfoHero({ message, style, testID, title }: InfoHeroProps) {
  return (
    <View accessible accessibilityRole="summary" style={[styles.hero, style]} testID={testID}>
      <AppIcon color={tokens.color.status.info} name="infoCircle" size={24} />
      <View style={styles.copy}>
        {title === undefined ? null : <AppText variant="headline">{title}</AppText>}
        <AppText tone={title === undefined ? 'primary' : 'secondary'} variant="callout">
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: tokens.space[1],
  },
  hero: {
    alignItems: 'center',
    backgroundColor: tokens.color.status.infoTint,
    borderRadius: tokens.radius.hero,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: tokens.layout.screenPaddingPhone,
    paddingVertical: 15,
  },
});
