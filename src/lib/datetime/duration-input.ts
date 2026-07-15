/**
 * The v2 event payload caps `duration_minutes` at a day. A typed duration has to be refused at the
 * field, because everything past this point is Zod: an out-of-range value throws inside the save
 * path and surfaces as "could not save … try again", which sends the owner to retry a typo forever.
 */
export const DURATION_INPUT_MAX_MINUTES = 1_440;

export type DurationInputResult =
  /** `minutes: undefined` is a blank field — a duration nobody entered, not a duration of zero. */
  | Readonly<{ minutes: number | undefined; ok: true }>
  | Readonly<{ ok: false; reason: 'not-a-whole-number' | 'out-of-range' }>;

/**
 * Parses a duration the owner typed. Deliberately stricter than `Number()`: that accepts `1.5`,
 * `-5`, and `1e3`, all of which the contract then rejects far away from the field that produced them.
 */
export function parseDurationMinutes(raw: string): DurationInputResult {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return { minutes: undefined, ok: true };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, reason: 'not-a-whole-number' };
  }

  const minutes = Number(trimmed);

  if (minutes < 1 || minutes > DURATION_INPUT_MAX_MINUTES) {
    return { ok: false, reason: 'out-of-range' };
  }

  return { minutes, ok: true };
}
