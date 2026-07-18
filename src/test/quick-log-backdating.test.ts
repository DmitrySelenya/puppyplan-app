import {
  QUICK_LOG_BACKDATE_MAX_DAYS,
  QUICK_LOG_BACKDATE_MAX_MS,
  QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS,
  isQuickLogOccurredAtWithinBackdateWindow,
  shouldShowQuickLogDuplicateCareWarning,
} from '@/contracts/business-rules';

const nowMs = Date.parse('2026-07-10T12:00:00.000Z');

describe('quick log backdating bounds', () => {
  it('exposes a 7-day backdate window constant', () => {
    expect(QUICK_LOG_BACKDATE_MAX_DAYS).toBe(7);
    expect(QUICK_LOG_BACKDATE_MAX_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('accepts now and any instant within the last 7 days', () => {
    expect(isQuickLogOccurredAtWithinBackdateWindow({ occurredAtMs: nowMs, nowMs })).toBe(true);
    expect(
      isQuickLogOccurredAtWithinBackdateWindow({ occurredAtMs: nowMs - 20 * 60 * 1000, nowMs }),
    ).toBe(true);
    expect(
      isQuickLogOccurredAtWithinBackdateWindow({ occurredAtMs: nowMs - QUICK_LOG_BACKDATE_MAX_MS, nowMs }),
    ).toBe(true);
  });

  it('rejects future instants', () => {
    expect(
      isQuickLogOccurredAtWithinBackdateWindow({ occurredAtMs: nowMs + 60 * 1000, nowMs }),
    ).toBe(false);
  });

  it('rejects instants older than 7 days', () => {
    expect(
      isQuickLogOccurredAtWithinBackdateWindow({
        occurredAtMs: nowMs - QUICK_LOG_BACKDATE_MAX_MS - 1,
        nowMs,
      }),
    ).toBe(false);
  });
});

describe('backdating interaction with the 60s duplicate-care window (Invariant 8)', () => {
  it('does not falsely warn when a backdated event sits far before the previous one', () => {
    const previousOccurredAtMs = nowMs;
    const backdatedOccurredAtMs = nowMs - 30 * 60 * 1000; // 30 min earlier

    expect(
      shouldShowQuickLogDuplicateCareWarning({
        previousTrackerId: 'feeding',
        nextTrackerId: 'feeding',
        previousOccurredAtMs,
        nextOccurredAtMs: backdatedOccurredAtMs,
      }),
    ).toBe(false);
  });

  it('still warns when two feedings are backdated to within 60s of each other', () => {
    const previousOccurredAtMs = nowMs - 30 * 60 * 1000;
    const nextOccurredAtMs = previousOccurredAtMs + QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS - 1;

    expect(
      shouldShowQuickLogDuplicateCareWarning({
        previousTrackerId: 'feeding',
        nextTrackerId: 'feeding',
        previousOccurredAtMs,
        nextOccurredAtMs,
      }),
    ).toBe(true);
  });
});
