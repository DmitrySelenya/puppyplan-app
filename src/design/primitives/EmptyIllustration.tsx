import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { decorativeViewProps } from '@/design/a11y';
import { AppIcon, type AppIconName } from '@/design/primitives/AppIcon';
import { tokens } from '@/design/tokens';

const EMPTY_ILLUSTRATION_SIZE = 96;
const EMPTY_ILLUSTRATION_ICON_SIZE = 46;

export type EmptyIllustrationProps = {
  icon?: AppIconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function EmptyIllustration({
  icon = 'trainingPaw',
  style,
  testID = 'diary-empty-illustration',
}: EmptyIllustrationProps) {
  return (
    <View
      {...decorativeViewProps}
      style={[styles.root, style]}
      testID={testID}>
      <AppIcon
        color={tokens.color.primary[500]}
        name={icon}
        size={EMPTY_ILLUSTRATION_ICON_SIZE}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[50],
    borderRadius: EMPTY_ILLUSTRATION_SIZE / 2,
    height: EMPTY_ILLUSTRATION_SIZE,
    justifyContent: 'center',
    width: EMPTY_ILLUSTRATION_SIZE,
  },
});
