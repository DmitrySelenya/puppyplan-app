import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { decorativeViewProps } from '@/design/a11y';
import { elevationStyle } from '@/design/primitives/elevationStyle';
import { tokens } from '@/design/tokens';

export type SheetSurfaceProps = PropsWithChildren<{
  accessibilityLabel: string;
  showDragHandle?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function SheetSurface({
  accessibilityLabel,
  children,
  showDragHandle = true,
  style,
}: SheetSurfaceProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityViewIsModal
      importantForAccessibility="yes"
      style={[styles.root, style]}>
      {showDragHandle ? (
        <View
          {...decorativeViewProps}
          style={styles.dragHandle}
          testID="sheet-drag-handle"
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dragHandle: {
    alignSelf: 'center',
    backgroundColor: tokens.color.stroke.strong,
    borderRadius: tokens.radius.full,
    height: tokens.component.bottomSheet.dragHandle.height,
    marginBottom: tokens.space[4],
    width: tokens.component.bottomSheet.dragHandle.width,
  },
  root: {
    backgroundColor: tokens.color.surface.overlay,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    gap: tokens.space[4],
    padding: tokens.layout.cardPadding,
    ...elevationStyle(2),
  },
});
