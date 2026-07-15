const MILLISECONDS_PER_MINUTE = 60_000;

/**
 * The v2 sleep payload carries `duration_minutes` up to a day; a longer range has to be refused at
 * the input rather than silently clamped, or the saved night stops matching what was entered.
 */
export const SLEEP_RANGE_MAX_MINUTES = 1_440;

export type SleepRangeResult =
  | Readonly<{ durationMinutes: number; ok: true }>
  | Readonly<{ ok: false; reason: 'not-positive' | 'too-long' }>;

/**
 * Derives a retrospective sleep's duration from the two times the owner actually knows. Crossing
 * midnight needs no special case: both ends are absolute instants, so "23:41 → 06:35" is just
 * arithmetic.
 */
export function getSleepRangeMinutes(startMs: number, endMs: number): SleepRangeResult {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return { ok: false, reason: 'not-positive' };
  }

  // `new Date()` seeds the pickers with seconds the wheel never shows. Rounding keeps the derived
  // duration equal to the two times on screen instead of a second-level artefact of them.
  const durationMinutes = Math.round((endMs - startMs) / MILLISECONDS_PER_MINUTE);

  if (durationMinutes < 1) {
    return { ok: false, reason: 'not-positive' };
  }

  if (durationMinutes > SLEEP_RANGE_MAX_MINUTES) {
    return { ok: false, reason: 'too-long' };
  }

  return { durationMinutes, ok: true };
}
