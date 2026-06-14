import { router, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { primaryTabs, quickLogAction } from '@/contracts/navigation';
import { AppIcon } from '@/design/primitives/AppIcon';
import { FAB } from '@/design/primitives/FAB';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

const [todayTab, healthTab, moreTab] = primaryTabs;

export default function TabLayout() {
  const { t } = useAppTranslation();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: tokens.color.primary[700],
          tabBarInactiveTintColor: tokens.color.text.secondary,
          tabBarStyle: styles.tabBar,
        }}>
        <Tabs.Screen
          name="today/index"
          options={{
            tabBarIcon: ({ color, focused, size }) => (
              <AppIcon color={color} filled={focused} name="today" size={size} />
            ),
            title: t(todayTab.labelKey),
            tabBarAccessibilityLabel: t(todayTab.accessibilityLabelKey),
          }}
        />
        <Tabs.Screen
          name="health/index"
          options={{
            tabBarIcon: ({ color, focused, size }) => (
              <AppIcon color={color} filled={focused} name="heart" size={size} />
            ),
            title: t(healthTab.labelKey),
            tabBarAccessibilityLabel: t(healthTab.accessibilityLabelKey),
          }}
        />
        <Tabs.Screen
          name="more/index"
          options={{
            tabBarIcon: ({ color, focused, size }) => (
              <AppIcon color={color} filled={focused} name="more" size={size} />
            ),
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
    backgroundColor: tokens.color.surface.raised,
    borderTopColor: tokens.color.stroke.default,
  },
  quickLog: {
    bottom:
      tokens.layout.tabBarHeight +
      tokens.component.fab.size / 2 +
      tokens.layout.tapGapMin,
    position: 'absolute',
    right: tokens.space[4],
  },
});
