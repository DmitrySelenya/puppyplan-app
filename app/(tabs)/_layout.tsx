import { router, Tabs, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { primaryTabs, quickLogAction } from '@/contracts/navigation';
import { AppIcon } from '@/design/primitives/AppIcon';
import { FAB } from '@/design/primitives/FAB';
import { useSnackbarActive } from '@/design/primitives/Snackbar';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

const [diaryTab, petTab, moreTab] = primaryTabs;

export default function TabLayout() {
  const { t } = useAppTranslation();
  const pathname = usePathname();
  const snackbarActive = useSnackbarActive();
  const showQuickLogFab = !snackbarActive && isFabLogSurfacePath(pathname);

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
          name="diary/index"
          options={{
            tabBarIcon: ({ color, focused, size }) => (
              <AppIcon color={color} filled={focused} name="book" size={size} />
            ),
            title: t(diaryTab.labelKey),
            tabBarAccessibilityLabel: t(diaryTab.accessibilityLabelKey),
          }}
        />
        <Tabs.Screen
          name="pet/index"
          options={{
            tabBarIcon: ({ color, focused, size }) => (
              <AppIcon color={color} filled={focused} name="paw" size={size} />
            ),
            title: t(petTab.labelKey),
            tabBarAccessibilityLabel: t(petTab.accessibilityLabelKey),
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
        {/* Legacy redirect routes (today→diary, health→pet): keep them navigable for old
            links, but hide from the tab bar so only the three primary tabs render. */}
        <Tabs.Screen name="today/index" options={{ href: null }} />
        <Tabs.Screen name="health/index" options={{ href: null }} />
      </Tabs>
      {showQuickLogFab ? (
        <FAB
          accessibilityLabel={t(quickLogAction.labelKey)}
          accessibilityHint={t(quickLogAction.accessibilityHintKey)}
          onPress={() => router.push(quickLogAction.href)}
          style={styles.quickLog}
        />
      ) : null}
    </View>
  );
}

function isFabLogSurfacePath(pathname: string) {
  return pathname === '/' ||
    pathname.startsWith('/diary') ||
    pathname.startsWith('/pet');
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
