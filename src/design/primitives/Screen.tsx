import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design/tokens';

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: tokens.space[3],
    paddingHorizontal: tokens.layout.screenPaddingPhone,
    paddingVertical: tokens.layout.screenPaddingY,
  },
  safeArea: {
    backgroundColor: tokens.color.surface.base,
    flex: 1,
  },
});
