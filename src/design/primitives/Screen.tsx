import { forwardRef, type PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Edges } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design/tokens';

export type ScreenProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edges;
  modal?: boolean;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export const Screen = forwardRef<ScrollView, ScreenProps>(function Screen({
  children,
  contentStyle,
  edges = ['top'],
  modal = false,
  scroll = true,
  style,
}, ref) {
  return (
    <SafeAreaView
      accessibilityViewIsModal={modal}
      edges={edges}
      importantForAccessibility={modal ? 'yes' : undefined}
      style={[styles.safeArea, style]}>
      {scroll ? (
        <ScrollView ref={ref} contentContainerStyle={[styles.content, contentStyle]}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fixedContent, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  content: {
    gap: tokens.space[3],
    paddingHorizontal: tokens.layout.screenPaddingPhone,
    paddingVertical: tokens.layout.screenPaddingY,
  },
  fixedContent: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: tokens.color.surface.base,
    flex: 1,
  },
});
