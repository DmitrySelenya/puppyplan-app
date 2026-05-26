import type { QuickLogTrackerId } from './quick-log';

export const QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_SECONDS = 3;
export const QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_SECONDS = 60;

export const QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_MS =
  QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_SECONDS * 1000;
export const QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS =
  QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_SECONDS * 1000;

export const quickLogTiming = {
  accidentalDoubleTapWindowSeconds: QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_SECONDS,
  duplicateCareWarningWindowSeconds: QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_SECONDS,
} as const;

export type QuickLogAccidentalDoubleTapInput = Readonly<{
  previousTrackerId: QuickLogTrackerId;
  nextTrackerId: QuickLogTrackerId;
  previousOccurredAtMs: number;
  nextOccurredAtMs: number;
}>;

export type QuickLogDuplicateCareWarningInput = Readonly<{
  previousTrackerId: QuickLogTrackerId;
  nextTrackerId: QuickLogTrackerId;
  previousOccurredAtMs: number;
  nextOccurredAtMs: number;
}>;

export type QuickLogDuplicateCareWarningKey =
  | 'feeding_meal'
  | 'potty_pee_outside'
  | 'potty_poop';

export function isQuickLogAccidentalDoubleTap(input: QuickLogAccidentalDoubleTapInput): boolean {
  return input.previousTrackerId === input.nextTrackerId
    && isForwardDeltaWithinWindow(
      input.previousOccurredAtMs,
      input.nextOccurredAtMs,
      QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_MS,
    );
}

export function shouldShowQuickLogDuplicateCareWarning(
  input: QuickLogDuplicateCareWarningInput,
): boolean {
  const previousWarningKey = getQuickLogDuplicateCareWarningKey(input.previousTrackerId);
  const nextWarningKey = getQuickLogDuplicateCareWarningKey(input.nextTrackerId);

  return previousWarningKey !== null
    && previousWarningKey === nextWarningKey
    && isForwardDeltaWithinWindow(
      input.previousOccurredAtMs,
      input.nextOccurredAtMs,
      QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS,
    );
}

export function getQuickLogDuplicateCareWarningKey(
  trackerId: QuickLogTrackerId,
): QuickLogDuplicateCareWarningKey | null {
  return quickLogDuplicateCareWarningKeys[trackerId];
}

function isForwardDeltaWithinWindow(
  previousOccurredAtMs: number,
  nextOccurredAtMs: number,
  windowMs: number,
): boolean {
  const deltaMs = nextOccurredAtMs - previousOccurredAtMs;

  return Number.isFinite(deltaMs) && deltaMs >= 0 && deltaMs <= windowMs;
}

const quickLogDuplicateCareWarningKeys = {
  // PRD excludes indoor accidents; sleep, zoomies, and training stay non-warning visibility trackers.
  potty_pee_outside: 'potty_pee_outside',
  potty_pee_inside: null,
  potty_poop: 'potty_poop',
  feeding_meal: 'feeding_meal',
  sleep_nap: null,
  zoomies: null,
  training: null,
} as const satisfies Record<QuickLogTrackerId, QuickLogDuplicateCareWarningKey | null>;
