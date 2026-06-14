import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { IconButton } from '@/design/primitives/IconButton';
import { tokens } from '@/design/tokens';

type SheetHeaderBaseProps = {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  title: string;
};

export type SheetHeaderProps = SheetHeaderBaseProps &
  (
    | {
        closeAccessibilityLabel: string;
        onClose: () => void;
      }
    | {
        closeAccessibilityLabel?: undefined;
        onClose?: undefined;
      }
  );

export function SheetHeader({
  closeAccessibilityLabel,
  onClose,
  style,
  testID,
  title,
}: SheetHeaderProps) {
  return (
    <View
      style={[styles.root, style]}
      testID={testID}>
      <AppText
        accessibilityRole="header"
        style={styles.title}
        variant="title2">
        {title}
      </AppText>
      {onClose ? (
        <IconButton
          accessibilityLabel={closeAccessibilityLabel}
          icon={<AppIcon name="close" />}
          onPress={onClose}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[3],
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
});
