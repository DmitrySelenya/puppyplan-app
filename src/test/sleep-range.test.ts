import { describe, expect, it } from '@jest/globals';

import { SLEEP_RANGE_MAX_MINUTES, getSleepRangeMinutes } from '@/lib/datetime/sleep-range';

function at(year: number, month: number, day: number, hour: number, minute: number): number {
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

describe('getSleepRangeMinutes', () => {
  it('AC-P33-RANGE-OVERNIGHT: derives minutes across midnight', () => {
    // The owner's Telegram night: fell asleep 23:41, woke 06:35 the next morning.
    const result = getSleepRangeMinutes(at(2026, 7, 14, 23, 41), at(2026, 7, 15, 6, 35));

    expect(result).toEqual({ durationMinutes: 414, ok: true });
  });

  it('AC-P33-RANGE-SAME-DAY: derives minutes inside one day', () => {
    const result = getSleepRangeMinutes(at(2026, 7, 15, 13, 0), at(2026, 7, 15, 15, 30));

    expect(result).toEqual({ durationMinutes: 150, ok: true });
  });

  it('AC-P33-RANGE-BACKWARDS: rejects a wake time before the sleep time', () => {
    const result = getSleepRangeMinutes(at(2026, 7, 15, 6, 35), at(2026, 7, 14, 23, 41));

    expect(result).toEqual({ ok: false, reason: 'not-positive' });
  });

  it('AC-P33-RANGE-ZERO: rejects an empty range', () => {
    const result = getSleepRangeMinutes(at(2026, 7, 15, 6, 35), at(2026, 7, 15, 6, 35));

    expect(result).toEqual({ ok: false, reason: 'not-positive' });
  });

  it('AC-P33-RANGE-MAX: accepts exactly the payload ceiling', () => {
    const result = getSleepRangeMinutes(at(2026, 7, 14, 6, 0), at(2026, 7, 15, 6, 0));

    expect(result).toEqual({ durationMinutes: SLEEP_RANGE_MAX_MINUTES, ok: true });
  });

  it('AC-P33-RANGE-TOO-LONG: rejects a range the v2 payload cannot carry', () => {
    const result = getSleepRangeMinutes(at(2026, 7, 14, 6, 0), at(2026, 7, 15, 6, 1));

    expect(result).toEqual({ ok: false, reason: 'too-long' });
  });

  it('AC-P33-RANGE-SECONDS: rounds to whole minutes so seconds carried by `new Date()` cannot round down to an invalid zero', () => {
    const start = new Date(2026, 6, 15, 6, 0, 40, 0).getTime();
    const end = new Date(2026, 6, 15, 6, 1, 20, 0).getTime();

    expect(getSleepRangeMinutes(start, end)).toEqual({ durationMinutes: 1, ok: true });
  });

  it('AC-P33-RANGE-NAN: rejects unparseable input rather than emitting NaN minutes', () => {
    expect(getSleepRangeMinutes(Number.NaN, at(2026, 7, 15, 6, 35)))
      .toEqual({ ok: false, reason: 'not-positive' });
  });
});
