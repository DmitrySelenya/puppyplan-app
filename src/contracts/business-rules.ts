import type { QuickLogTrackerId } from './quick-log';

export const QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_SECONDS = 3;
export const QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_SECONDS = 60;
export const QUICK_LOG_OPTIMISTIC_VISIBLE_TARGET_MS = 100;
export const QUICK_LOG_FAILED_BANNER_RETRY_COUNT_THRESHOLD = 3;

// Backdating bound: an event may be logged at `now` or up to this many days earlier, never
// in the future. The 3s double-tap window stays keyed to submission time; the 60s duplicate-care
// window keeps comparing occurred_at values (see quick-log-backdating.test.ts).
export const QUICK_LOG_BACKDATE_MAX_DAYS = 7;

export const QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_MS =
  QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_SECONDS * 1000;
export const QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS =
  QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_SECONDS * 1000;
export const QUICK_LOG_BACKDATE_MAX_MS =
  QUICK_LOG_BACKDATE_MAX_DAYS * 24 * 60 * 60 * 1000;

export const quickLogTiming = {
  accidentalDoubleTapWindowSeconds: QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_SECONDS,
  duplicateCareWarningWindowSeconds: QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_SECONDS,
} as const;

export type QuickLogFailedBannerRow = Readonly<{
  localSync?: Readonly<{
    retryCount?: number;
    state: string;
  }>;
}>;

export type QuickLogAccidentalDoubleTapInput = Readonly<{
  previousTrackerId: QuickLogTrackerId;
  nextTrackerId: QuickLogTrackerId;
  previousOccurredAtMs: number;
  nextOccurredAtMs: number;
}>;

export type QuickLogDuplicateCareWarningInput = Readonly<{
  previousPayload?: QuickLogDuplicateCareWarningPayload;
  previousTrackerId: QuickLogTrackerId;
  nextPayload?: QuickLogDuplicateCareWarningPayload;
  nextTrackerId: QuickLogTrackerId;
  previousOccurredAtMs: number;
  nextOccurredAtMs: number;
}>;

export type QuickLogDuplicateCareWarningKey =
  | 'feeding'
  | 'potty:outside'
  | 'potty:poop';

export type QuickLogDuplicateCareWarningPayload = Readonly<{
  subtype?: unknown;
}>;

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
  const previousWarningKey = getQuickLogDuplicateCareWarningKey(
    input.previousTrackerId,
    input.previousPayload,
  );
  const nextWarningKey = getQuickLogDuplicateCareWarningKey(input.nextTrackerId, input.nextPayload);

  return previousWarningKey !== null
    && previousWarningKey === nextWarningKey
    && isForwardDeltaWithinWindow(
      input.previousOccurredAtMs,
      input.nextOccurredAtMs,
      QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS,
    );
}

export type QuickLogOccurredAtBoundsInput = Readonly<{
  occurredAtMs: number;
  nowMs: number;
}>;

export function isQuickLogOccurredAtWithinBackdateWindow(
  input: QuickLogOccurredAtBoundsInput,
): boolean {
  const { occurredAtMs, nowMs } = input;

  if (!Number.isFinite(occurredAtMs) || !Number.isFinite(nowMs)) {
    return false;
  }

  return occurredAtMs <= nowMs && occurredAtMs >= nowMs - QUICK_LOG_BACKDATE_MAX_MS;
}

export function shouldShowQuickLogFailedBanner(
  rows: readonly QuickLogFailedBannerRow[],
): boolean {
  return rows.some((row) =>
    (row.localSync?.state === 'failed_retryable' || row.localSync?.state === 'failed_permanent')
    && (row.localSync.retryCount ?? 0) >= QUICK_LOG_FAILED_BANNER_RETRY_COUNT_THRESHOLD);
}

export function getQuickLogDuplicateCareWarningKey(
  trackerId: QuickLogTrackerId,
  payload?: QuickLogDuplicateCareWarningPayload,
): QuickLogDuplicateCareWarningKey | null {
  if (trackerId === 'potty') {
    if (payload?.subtype === 'outside') {
      return 'potty:outside';
    }

    if (payload?.subtype === 'poop') {
      return 'potty:poop';
    }

    return null;
  }

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
  potty: null,
  feeding: 'feeding',
  sleep: null,
  walk: null,
  zoomies: null,
} as const satisfies Record<QuickLogTrackerId, QuickLogDuplicateCareWarningKey | null>;
