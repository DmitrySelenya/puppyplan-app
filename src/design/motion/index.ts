import { useSyncExternalStore } from 'react';
import type { ViewStyle } from 'react-native';
import { AccessibilityInfo } from 'react-native';

import { tokens } from '@/design/tokens';

export const motionPresets = {
  celebration: {
    durationMs: tokens.motion.duration.slow,
    reducedMotion: 'static',
  },
  fade: {
    durationMs: tokens.motion.duration.fast,
    reducedMotion: 'opacity',
  },
  sheet: {
    durationMs: tokens.motion.duration.base,
    reducedMotion: 'cross-fade',
  },
  snackbar: {
    durationMs: tokens.motion.duration.base,
    reducedMotion: 'opacity',
  },
  tap: {
    durationMs: tokens.motion.duration.fast,
    pressedScale: 0.97,
    reducedMotion: 'opacity',
  },
} as const;

export function pressedScaleStyle(
  pressed: boolean,
  reducedMotion = false,
  scale = motionPresets.tap.pressedScale,
): ViewStyle | null {
  return pressed && !reducedMotion ? { transform: [{ scale }] } : null;
}

type ReducedMotionListener = () => void;
type ReducedMotionSubscription = {
  remove?: () => void;
};

let reducedMotionSnapshot = true;
let reducedMotionSubscription: ReducedMotionSubscription | null = null;
let reducedMotionSubscriberCount = 0;
let reducedMotionProbeVersion = 0;
const reducedMotionListeners = new Set<ReducedMotionListener>();

function emitReducedMotionChange() {
  reducedMotionListeners.forEach((listener) => {
    listener();
  });
}

function setReducedMotionSnapshot(enabled: boolean) {
  const nextSnapshot = Boolean(enabled);

  if (reducedMotionSnapshot !== nextSnapshot) {
    reducedMotionSnapshot = nextSnapshot;
    emitReducedMotionChange();
  }
}

function refreshReducedMotionSnapshot() {
  const probeVersion = reducedMotionProbeVersion + 1;
  reducedMotionProbeVersion = probeVersion;

  void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
    .then((enabled) => {
      if (probeVersion === reducedMotionProbeVersion) {
        setReducedMotionSnapshot(Boolean(enabled));
      }
    })
    .catch(() => {
      if (probeVersion === reducedMotionProbeVersion) {
        setReducedMotionSnapshot(false);
      }
    });
}

function startReducedMotionStore() {
  if (reducedMotionSubscription) {
    return;
  }

  refreshReducedMotionSnapshot();
  reducedMotionSubscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    setReducedMotionSnapshot,
  );
}

function stopReducedMotionStore() {
  reducedMotionProbeVersion += 1;
  reducedMotionSubscription?.remove?.();
  reducedMotionSubscription = null;
}

function subscribeToReducedMotion(listener: ReducedMotionListener) {
  reducedMotionListeners.add(listener);
  reducedMotionSubscriberCount += 1;
  startReducedMotionStore();

  return () => {
    reducedMotionListeners.delete(listener);
    reducedMotionSubscriberCount = Math.max(0, reducedMotionSubscriberCount - 1);

    if (reducedMotionSubscriberCount === 0) {
      stopReducedMotionStore();
    }
  };
}

function getReducedMotionSnapshot() {
  return reducedMotionSnapshot;
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionSnapshot,
  );
}
