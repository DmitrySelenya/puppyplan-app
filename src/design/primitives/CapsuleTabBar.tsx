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
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import * as haptics from '@/design/haptics';
import * as motion from '@/design/motion';
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

const emphasizedEasing = easingFromCubicBezierToken(tokens.motion.easing.emphasized);
const navLayer = {
  chooser: tokens.elevation[1].androidElevation,
  add: tokens.elevation[1].androidElevation + tokens.elevation[2].androidElevation,
} as const;

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
  const reducedMotion = motion.useReducedMotion();
  const progress = useSharedValue(open ? 1 : 0);
  const addGlyphStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : Math.max(progress.value, 1 - progress.value),
    transform: reducedMotion ? [] : [{ rotate: `${progress.value * 45}deg` }],
  }));

  React.useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: reducedMotion
        ? tokens.motion.duration.fast
        : tokens.motion.duration.base,
      easing: emphasizedEasing,
    });
  }, [open, progress, reducedMotion]);

  const toggleAdd = () => {
    void haptics.haptic('tapConfirm');
    setOpen((value) => !value);
  };

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
                    if (!selected) {
                      void haptics.haptic('selection');
                    }
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
        onPress={toggleAdd}
        style={styles.add}
        testID="nav-add">
        <Animated.View style={addGlyphStyle}>
          <AppIcon
            color={tokens.color.text.onPrimary}
            name="plus"
            size={tokens.component.tabBar.icon + tokens.space[1]}
          />
        </Animated.View>
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
          progress={progress}
          reducedMotion={reducedMotion}
        />
      ) : null}
    </View>
  );
}

function Chooser({
  onClose,
  onQuickLog,
  onSchedule,
  progress,
  reducedMotion,
}: {
  onClose: () => void;
  onQuickLog: () => void;
  onSchedule: () => void;
  progress: SharedValue<number>;
  reducedMotion: boolean;
}) {
  const { t } = useAppTranslation();
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? progress.value : 1,
    transform: reducedMotion
      ? []
      : [
          {
            translateY:
              (1 - progress.value) * tokens.component.bottomSheet.minHeight,
          },
        ],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={styles.chooser}
      testID="nav-chooser">
      <Animated.View style={[styles.scrimLayer, scrimStyle]}>
        <Touchable
          accessible={false}
          accessibilityLabel={t('tabs.add-close')}
          accessibilityRole="button"
          minTarget="none"
          onPress={onClose}
          style={styles.scrim}
          testID="nav-scrim"
        />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View
          style={styles.dragHandle}
          testID="nav-drag-handle"
        />
        <Touchable
          accessibilityLabel={t('nav.quick-log-slab')}
          accessibilityRole="button"
          minTarget="thumb"
          onPress={onQuickLog}
          style={styles.slab}>
          <AppText variant="headline">{t('nav.quick-log-slab')}</AppText>
        </Touchable>
        <Touchable
          accessibilityLabel={t('nav.schedule-slab')}
          accessibilityRole="button"
          minTarget="thumb"
          onPress={onSchedule}
          style={styles.slab}>
          <AppText variant="headline">{t('nav.schedule-slab')}</AppText>
        </Touchable>
      </Animated.View>
    </View>
  );
}

function easingFromCubicBezierToken(value: string) {
  const match = value.match(
    /^cubic-bezier\(([-\d.]+), ([-\d.]+), ([-\d.]+), ([-\d.]+)\)$/,
  );

  if (match === null) {
    return Easing.linear;
  }

  const [, x1, y1, x2, y2] = match;

  return Easing.bezier(
    Number(x1),
    Number(y1),
    Number(x2),
    Number(y2),
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
    zIndex: navLayer.add,
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
  chooser: {
    ...StyleSheet.absoluteFillObject,
    zIndex: navLayer.chooser,
  },
  dragHandle: {
    alignSelf: 'center',
    backgroundColor: tokens.color.stroke.strong,
    borderRadius: tokens.radius.full,
    height: tokens.component.bottomSheet.dragHandle.height,
    width: tokens.component.bottomSheet.dragHandle.width,
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
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.color.surface.scrim,
  },
  scrimLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: tokens.color.surface.raised,
    borderTopLeftRadius: tokens.component.bottomSheet.radiusTop,
    borderTopRightRadius: tokens.component.bottomSheet.radiusTop,
    bottom: tokens.space[0],
    gap: tokens.space[3],
    left: tokens.space[0],
    padding: tokens.space[4],
    position: 'absolute',
    right: tokens.space[0],
    ...elevationStyle(2),
  },
  slab: {
    alignItems: 'center',
    backgroundColor: tokens.color.surface.base,
    borderRadius: tokens.radius.lg,
    justifyContent: 'center',
    minHeight: tokens.layout.tapTargetThumbZone + tokens.space[2],
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
