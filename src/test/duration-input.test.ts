import {
  DURATION_INPUT_MAX_MINUTES,
  parseDurationMinutes,
} from '@/lib/datetime/duration-input';

describe('parseDurationMinutes', () => {
  it('AC-P33-WALK reads a whole number of minutes', () => {
    expect(parseDurationMinutes('35')).toEqual({ minutes: 35, ok: true });
  });

  it('AC-P33-WALK treats a blank field as no duration rather than zero', () => {
    expect(parseDurationMinutes('')).toEqual({ minutes: undefined, ok: true });
    expect(parseDurationMinutes('   ')).toEqual({ minutes: undefined, ok: true });
  });

  it('AC-P33-WALK tolerates surrounding whitespace', () => {
    expect(parseDurationMinutes(' 35 ')).toEqual({ minutes: 35, ok: true });
  });

  it('AC-P33-WALK accepts the payload ceiling and refuses one past it', () => {
    expect(parseDurationMinutes(String(DURATION_INPUT_MAX_MINUTES)))
      .toEqual({ minutes: 1440, ok: true });
    expect(parseDurationMinutes(String(DURATION_INPUT_MAX_MINUTES + 1)))
      .toEqual({ ok: false, reason: 'out-of-range' });
  });

  it('AC-P33-WALK refuses zero, which the contract cannot carry', () => {
    expect(parseDurationMinutes('0')).toEqual({ ok: false, reason: 'out-of-range' });
  });

  it.each([
    ['fractional', '1.5'],
    ['negative', '-5'],
    ['exponential', '1e3'],
    ['alphabetic', 'abc'],
    ['mixed', '35min'],
  ])('AC-P33-WALK refuses a %s duration that Number() would silently accept or NaN', (
    _case,
    raw,
  ) => {
    expect(parseDurationMinutes(raw)).toEqual({ ok: false, reason: 'not-a-whole-number' });
  });
});
