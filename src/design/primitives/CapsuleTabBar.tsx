import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  primaryTabs,
  quickLogAction,
  scheduleAction,
} from '@/contracts/navigation';
import type { AppIconName } from '@/design/primitives/AppIcon';
import { AppIcon } from '@/design/primitives/AppIcon';
import { AppText } from '@/design/primitives/AppText';
import { Touchable } from '@/design/primitives/Touchable';
import { elevationStyle } from '@/design/primitives/elevationStyle';
import { tokens } from '@/design/tokens';
import { useAppTranslation } from '@/lib/i18n';

const TAB_ICON = {
  'diary/index': 'book',
  'pet/index': 'paw',
  'more/index': 'more',
} as const satisfies Record<(typeof primaryTabs)[number]['routeName'], AppIconName>;

type CapsuleTabBarRoute = {
  key: string;
  name: string;
};

type CapsuleTabBarNavigation = {
  emit?: (event: {
    canPreventDefault: true;
    target: string;
    type: 'tabPress';
  }) => { defaultPrevented?: boolean };
  navigate: (name: string) => void;
};

export type CapsuleTabBarProps = {
  navigation: CapsuleTabBarNavigation;
  state: {
    index: number;
    routes: readonly CapsuleTabBarRoute[];
  };
};

export function CapsuleTabBar({ state, navigation }: CapsuleTabBarProps) {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);
  const focusedRouteName = state.routes[state.index]?.name;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.root, { paddingBottom: insets.bottom + tokens.space[2] }]}>
      {!open ? (
        <View
          accessible
          accessibilityRole="tablist"
          style={styles.capsule}
          testID="nav-capsule">
          {primaryTabs.map((tab) => {
            const selected = tab.routeName === focusedRouteName;
            const tone = selected ? 'link' : 'secondary';
            const color = selected
              ? tokens.color.primary[700]
              : tokens.color.text.secondary;

            return (
              <Touchable
                accessibilityLabel={t(tab.labelKey)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={tab.routeName}
                minTarget="thumb"
                onPress={() => {
                  const route = state.routes.find((item) => item.name === tab.routeName);
                  const event = route === undefined
                    ? undefined
                    : navigation.emit?.({
                        canPreventDefault: true,
                        target: route.key,
                        type: 'tabPress',
                      });

                  if (event?.defaultPrevented !== true) {
                    navigation.navigate(tab.routeName);
                  }
                }}
                style={styles.tab}>
                <AppIcon
                  color={color}
                  filled={selected}
                  name={TAB_ICON[tab.routeName]}
                  size={tokens.component.tabBar.icon}
                />
                <AppText
                  style={selected ? styles.activeLabel : undefined}
                  tone={tone}
                  variant="caption">
                  {t(tab.labelKey)}
                </AppText>
              </Touchable>
            );
          })}
        </View>
      ) : null}

      <Touchable
        accessibilityLabel={open ? t('tabs.add-close') : t('tabs.add')}
        accessibilityRole="button"
        minTarget="thumb"
        onPress={() => setOpen((value) => !value)}
        style={styles.add}
        testID="nav-add">
        <AppIcon
          color={tokens.color.text.onPrimary}
          name={open ? 'close' : 'plus'}
          size={tokens.component.tabBar.icon + tokens.space[1]}
        />
      </Touchable>

      {open ? (
        <Chooser
          onClose={() => setOpen(false)}
          onQuickLog={() => {
            setOpen(false);
            router.push(quickLogAction.href);
          }}
          onSchedule={() => {
            setOpen(false);
            router.push(scheduleAction.href);
          }}
        />
      ) : null}
    </View>
  );
}

function Chooser({
  onClose: _onClose,
  onQuickLog: _onQuickLog,
  onSchedule: _onSchedule,
}: {
  onClose: () => void;
  onQuickLog: () => void;
  onSchedule: () => void;
}) {
  return (
    <View
      pointerEvents="box-none"
      testID="nav-chooser"
    />
  );
}

const styles = StyleSheet.create({
  activeLabel: {
    color: tokens.color.primary[700],
  },
  add: {
    alignItems: 'center',
    backgroundColor: tokens.color.primary[600],
    borderRadius: tokens.radius.full,
    height: tokens.component.fab.size,
    justifyContent: 'center',
    width: tokens.component.fab.size,
    ...elevationStyle(2),
  },
  capsule: {
    alignSelf: 'center',
    backgroundColor: tokens.color.surface.raised,
    borderRadius: tokens.radius.full,
    flexDirection: 'row',
    gap: tokens.space[1],
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1],
    ...elevationStyle(2),
  },
  root: {
    alignItems: 'center',
    bottom: tokens.space[0],
    flexDirection: 'row',
    gap: tokens.space[5],
    justifyContent: 'center',
    left: tokens.space[0],
    pointerEvents: 'box-none',
    position: 'absolute',
    right: tokens.space[0],
  },
  tab: {
    alignItems: 'center',
    borderRadius: tokens.radius.full,
    gap: tokens.space[1],
    justifyContent: 'center',
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1],
  },
});
