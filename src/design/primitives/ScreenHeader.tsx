import { StyleSheet, View } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/design/a11y';
import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { tokens } from '@/design/tokens';

type ScreenHeaderCommonProps = {
  title: string;
  trailing?: React.ReactNode;
  testID?: string;
};

type ScreenHeaderBackProps =
  | {
    onBack: () => void;
    backLabel: string;
  }
  | {
    onBack?: undefined;
    backLabel?: undefined;
  };

export type ScreenHeaderProps = ScreenHeaderCommonProps & ScreenHeaderBackProps;

export function ScreenHeader({
  backLabel,
  onBack,
  testID,
  title,
  trailing,
}: ScreenHeaderProps) {
  return (
    <View
      style={styles.root}
      testID={testID}>
      <View style={styles.side}>
        {onBack ? (
          <Touchable
            accessibilityLabel={backLabel}
            accessibilityRole="button"
            minTarget="none"
            onPress={onBack}
            style={styles.backControl}>
            <AppIcon
              name="chevronRight"
              size={24}
              style={styles.backChevron}
            />
            {backLabel ? (
              <AppText
                numberOfLines={1}
                style={styles.backLabel}
                variant="body">
                {backLabel}
              </AppText>
            ) : null}
          </Touchable>
        ) : null}
      </View>
      <AppText
        accessibilityRole="header"
        numberOfLines={1}
        style={styles.title}
        variant="headline">
        {title}
      </AppText>
      <View style={[styles.side, styles.trailingSide]}>
        {trailing ? (
          <View style={styles.trailing}>
            {trailing}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backChevron: {
    transform: [{ scaleX: -1 }],
  },
  backControl: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[1],
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'flex-start',
  },
  backLabel: {
    color: tokens.color.text.link,
  },
  root: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.space[2],
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET,
  },
  side: {
    flex: 1,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  title: {
    flex: 1,
    fontWeight: '600',
    textAlign: 'center',
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  trailingSide: {
    alignItems: 'flex-end',
  },
});
