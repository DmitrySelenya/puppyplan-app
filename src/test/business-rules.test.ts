import {
  QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_SECONDS,
  QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_SECONDS,
  quickLogTiming,
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
});
