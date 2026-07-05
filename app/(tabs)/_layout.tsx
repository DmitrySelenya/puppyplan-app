import { Tabs } from 'expo-router';

import { primaryTabs } from '@/contracts/navigation';
import { AppIcon } from '@/design/primitives/AppIcon';
import { CapsuleTabBar } from '@/design/primitives/CapsuleTabBar';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

const [diaryTab, petTab, moreTab] = primaryTabs;

export default function TabLayout() {
  const { t } = useAppTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.primary[700],
        tabBarInactiveTintColor: tokens.color.text.secondary,
      }}
      tabBar={(props) => <CapsuleTabBar {...props} />}>
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
  );
}
