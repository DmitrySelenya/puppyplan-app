import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { scaffoldTokens } from '@/design/tokens/scaffold';

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: scaffoldTokens.spacing.gap,
    paddingHorizontal: scaffoldTokens.spacing.screenX,
    paddingVertical: scaffoldTokens.spacing.screenY,
  },
  safeArea: {
    backgroundColor: scaffoldTokens.color.background,
    flex: 1,
  },
});
