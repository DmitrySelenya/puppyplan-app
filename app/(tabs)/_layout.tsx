import { router, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { primaryTabs, quickLogAction } from '@/contracts/navigation';
import { FAB } from '@/design/primitives/FAB';
import { scaffoldTokens } from '@/design/tokens/scaffold';

const [todayTab, healthTab, moreTab] = primaryTabs;

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: scaffoldTokens.color.primaryStrong,
          tabBarInactiveTintColor: scaffoldTokens.color.textSecondary,
          tabBarStyle: styles.tabBar,
        }}>
        <Tabs.Screen
          name="today/index"
          options={{
            title: t(todayTab.labelKey),
            tabBarAccessibilityLabel: t(todayTab.accessibilityLabelKey),
          }}
        />
        <Tabs.Screen
          name="health/index"
          options={{
            title: t(healthTab.labelKey),
            tabBarAccessibilityLabel: t(healthTab.accessibilityLabelKey),
          }}
        />
        <Tabs.Screen
          name="more/index"
          options={{
            title: t(moreTab.labelKey),
            tabBarAccessibilityLabel: t(moreTab.accessibilityLabelKey),
          }}
        />
      </Tabs>
      <FAB
        accessibilityLabel={t(quickLogAction.labelKey)}
        accessibilityHint={t(quickLogAction.accessibilityHintKey)}
        onPress={() => router.push(quickLogAction.href)}
        style={styles.quickLog}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: scaffoldTokens.color.surfaceRaised,
    borderTopColor: scaffoldTokens.color.stroke,
  },
  quickLog: {
    bottom: 88,
    position: 'absolute',
    right: 16,
  },
});
