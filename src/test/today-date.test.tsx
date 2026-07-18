import type { AppStateStatus } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';

import {
  getMillisecondsUntilNextLocalMidnight,
  getTodayDate,
  useTodayDate,
} from '@/lib/datetime/today-date';

function createFakeAppState() {
  const handlers: ((status: AppStateStatus) => void)[] = [];

  return {
    appState: {
      addEventListener: (_type: 'change', handler: (status: AppStateStatus) => void) => {
        handlers.push(handler);

        return { remove: () => undefined };
      },
    },
    emit: (status: AppStateStatus) => {
      for (const handler of handlers) {
        handler(status);
      }
    },
  };
}

describe('today date', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('formats today dates from the device-local calendar day', () => {
    const deviceLocalDate = {
      getDate: () => 8,
      getFullYear: () => 2026,
      getMonth: () => 5,
      toISOString: () => '2026-06-09T00:30:00.000Z',
    } as Date;

    expect(getTodayDate(deviceLocalDate)).toBe('2026-06-08');
  });

  it('counts to the next local midnight rather than a fixed 24 hour offset', () => {
    // 23:58 local, so the boundary is two minutes out.
    const almostMidnight = new Date(2026, 6, 14, 23, 58, 0, 0);

    expect(getMillisecondsUntilNextLocalMidnight(almostMidnight)).toBe(2 * 60 * 1_000);

    const justAfterMidnight = new Date(2026, 6, 15, 0, 0, 1, 0);

    expect(getMillisecondsUntilNextLocalMidnight(justAfterMidnight))
      .toBe((24 * 60 * 60 - 1) * 1_000);
  });

  it('AC-P33-MIDNIGHT rolls the day over while the app stays open', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 23, 58, 0, 0));
    const { appState } = createFakeAppState();

    const { result } = renderHook(() => useTodayDate(appState));

    expect(result.current).toBe('2026-07-14');

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1_000);
    });

    expect(result.current).toBe('2026-07-15');
  });

  it('AC-P33-MIDNIGHT resyncs the day when the app returns to the foreground', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 14, 23, 58, 0, 0));
    const { appState, emit } = createFakeAppState();

    const { result } = renderHook(() => useTodayDate(appState));

    expect(result.current).toBe('2026-07-14');

    // Backgrounded across midnight: timers are throttled, so only the foreground probe can notice.
    jest.setSystemTime(new Date(2026, 6, 15, 7, 30, 0, 0));

    act(() => {
      emit('active');
    });

    expect(result.current).toBe('2026-07-15');
  });
});
