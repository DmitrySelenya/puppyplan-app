import {
  QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_SECONDS,
  QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_SECONDS,
  QUICK_LOG_FAILED_BANNER_RETRY_COUNT_THRESHOLD,
  QUICK_LOG_OPTIMISTIC_VISIBLE_TARGET_MS,
  quickLogTiming,
  shouldShowQuickLogFailedBanner,
} from '@/contracts/business-rules';
import { tokens } from '@/design/tokens';

describe('business timing rules', () => {
  it('keeps Quick Log duplicate windows on the canonical 3s and 60s values', () => {
    expect(QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_SECONDS).toBe(3);
    expect(QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_SECONDS).toBe(60);
    expect(quickLogTiming).toEqual({
      accidentalDoubleTapWindowSeconds: 3,
      duplicateCareWarningWindowSeconds: 60,
    });
  });

  it('keeps generated design timing references aligned with contract exports', () => {
    expect(tokens.business.timing).toEqual(quickLogTiming);
  });

  it('keeps Quick Log optimistic visibility and failure banner thresholds canonical', () => {
    expect(QUICK_LOG_OPTIMISTIC_VISIBLE_TARGET_MS).toBe(100);
    expect(QUICK_LOG_FAILED_BANNER_RETRY_COUNT_THRESHOLD).toBe(3);
  });

  it('shows the persistent failed banner only after three failed attempts', () => {
    expect(shouldShowQuickLogFailedBanner([
      {
        localSync: {
          state: 'failed_retryable',
          retryCount: 2,
        },
      },
    ])).toBe(false);
    expect(shouldShowQuickLogFailedBanner([
      {
        localSync: {
          state: 'failed_retryable',
          retryCount: QUICK_LOG_FAILED_BANNER_RETRY_COUNT_THRESHOLD,
        },
      },
    ])).toBe(true);
    expect(shouldShowQuickLogFailedBanner([
      {
        localSync: {
          state: 'failed_permanent',
          retryCount: QUICK_LOG_FAILED_BANNER_RETRY_COUNT_THRESHOLD,
        },
      },
    ])).toBe(true);
    expect(shouldShowQuickLogFailedBanner([
      {
        localSync: {
          state: 'pending_local',
          retryCount: QUICK_LOG_FAILED_BANNER_RETRY_COUNT_THRESHOLD,
        },
      },
    ])).toBe(false);
  });
});
