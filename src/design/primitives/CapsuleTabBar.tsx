import * as React from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  noteAction,
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

const primaryTabCount = primaryTabs.length;
const capsuleSlotMinWidth =
  (tokens.layout.tapTargetThumbZone * primaryTabCount) +
  (tokens.space[1] * (primaryTabCount - 1)) +
  (tokens.space[2] * 2);
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
  const { fontScale } = useWindowDimensions();
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
      <View
        pointerEvents={open ? 'none' : 'auto'}
        style={styles.capsuleSlot}
        testID="nav-capsule-slot">
        {!open ? (
          <View
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
                  accessible
                  accessibilityLabel={t(tab.labelKey)}
                  accessibilityRole={Platform.OS === 'ios' ? 'button' : 'tab'}
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
                  style={selected ? [styles.tab, styles.activeTab] : styles.tab}>
                  <AppIcon
                    color={color}
                    filled={selected}
                    name={TAB_ICON[tab.routeName]}
                    size={tokens.component.tabBar.icon}
                  />
                  {fontScale < 2 ? (
                    <AppText
                      style={selected ? styles.activeLabel : undefined}
                      tone={tone}
                      variant="caption">
                      {t(tab.labelKey)}
                    </AppText>
                  ) : null}
                </Touchable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View
        style={styles.addSlot}
        testID="nav-add-slot">
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
      </View>

      {open ? (
        <Chooser
          onClose={() => setOpen(false)}
          onNote={() => {
            setOpen(false);
            router.push(noteAction.href);
          }}
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

/**
 * The morphed close control floats above the chooser sheet, so the sheet reserves the control's
 * footprint at its bottom edge; otherwise the last slab renders underneath it.
 */
const closeControlClearance = tokens.component.fab.size + (tokens.space[2] * 2);

function Chooser({
  onClose,
  onNote,
  onQuickLog,
  onSchedule,
  progress,
  reducedMotion,
}: {
  onClose: () => void;
  onNote: () => void;
  onQuickLog: () => void;
  onSchedule: () => void;
  progress: SharedValue<number>;
  reducedMotion: boolean;
}) {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
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
      <Animated.View
        style={[styles.sheet, sheetStyle, { paddingBottom: closeControlClearance + insets.bottom }]}
        testID="nav-chooser-sheet">
        <View
          style={styles.dragHandle}
          testID="nav-drag-handle"
        />
        <Slab
          accessibilityHint={t('nav.quick-log-slab-subtitle')}
          icon="spark"
          iconColor={tokens.color.accent[700]}
          iconTint={tokens.color.accent[100]}
          onPress={onQuickLog}
          subtitle={t('nav.quick-log-slab-subtitle')}
          title={t('nav.quick-log-slab')}
        />
        <Slab
          accessibilityHint={t('nav.note-slab-subtitle')}
          icon="docText"
          iconColor={tokens.color.primary[700]}
          iconTint={tokens.color.primary[50]}
          onPress={onNote}
          subtitle={t('nav.note-slab-subtitle')}
          title={t('nav.note-slab')}
        />
        <Slab
          accessibilityHint={t('nav.schedule-slab-subtitle')}
          icon="calendar"
          iconColor={tokens.color.status.info}
          iconTint={tokens.color.status.infoTint}
          onPress={onSchedule}
          subtitle={t('nav.schedule-slab-subtitle')}
          title={t('nav.schedule-slab')}
        />
      </Animated.View>
    </View>
  );
}

function Slab({
  accessibilityHint,
  icon,
  iconColor,
  iconTint,
  onPress,
  subtitle,
  title,
}: {
  accessibilityHint: string;
  icon: AppIconName;
  iconColor: string;
  iconTint: string;
  onPress: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <Touchable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={title}
      accessibilityRole="button"
      minTarget="thumb"
      onPress={onPress}
      style={styles.slab}
      testID="nav-slab">
      <View style={[styles.slabIcon, { backgroundColor: iconTint }]}>
        <AppIcon color={iconColor} name={icon} size={tokens.component.tabBar.icon} />
      </View>
      <View style={styles.slabCopy}>
        <AppText variant="headline">{title}</AppText>
        <AppText tone="secondary" variant="subheadline">
          {subtitle}
        </AppText>
      </View>
      <AppIcon
        color={tokens.color.text.tertiary}
        name="chevronRight"
        testID="nav-slab-chevron"
      />
    </Touchable>
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
  activeTab: {
    backgroundColor: tokens.color.primary[50],
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
  addSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: navLayer.add,
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
  capsuleSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: capsuleSlotMinWidth,
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
    backgroundColor: tokens.color.surface.raised,
    borderRadius: tokens.radius.lg,
    flexDirection: 'row',
    gap: tokens.space[3],
    minHeight: tokens.layout.tapTargetThumbZone + tokens.space[2],
    paddingHorizontal: tokens.layout.cardPadding,
    paddingVertical: tokens.space[3],
    ...elevationStyle(1),
  },
  slabCopy: {
    flex: 1,
    gap: tokens.space[1],
    minWidth: 0,
  },
  slabIcon: {
    alignItems: 'center',
    borderRadius: tokens.radius.md,
    height: tokens.layout.tapTargetThumbZone,
    justifyContent: 'center',
    width: tokens.layout.tapTargetThumbZone,
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
