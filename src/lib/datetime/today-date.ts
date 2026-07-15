import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

type AppStateLike = Readonly<{
  addEventListener: (
    type: 'change',
    handler: (state: AppStateStatus) => void,
  ) => NativeEventSubscription;
}>;

/**
 * The device-local calendar day a fact belongs to. Care surfaces bucket the Diary, the day strip,
 * and cache invalidation on this string, so it must follow the device calendar rather than UTC.
 */
export function getTodayDate(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Milliseconds until the next device-local midnight. Built from the local calendar rather than a
 * fixed 24h offset so a DST boundary still lands exactly on 00:00.
 */
export function getMillisecondsUntilNextLocalMidnight(now: Date = new Date()): number {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );

  return Math.max(1, nextMidnight.getTime() - now.getTime());
}

/**
 * Today's date, re-rendered when the day rolls over.
 *
 * An overnight puppy routine crosses midnight while the app sits open, so a day computed only at
 * mount leaves the Diary showing yesterday and files new entries under a day the owner cannot see.
 * The timer fires on the boundary; the AppState probe covers backgrounded runs, where timers are
 * throttled and can miss it entirely.
 */
export function useTodayDate(appState: AppStateLike = AppState): string {
  const [todayDate, setTodayDate] = useState(() => getTodayDate());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const syncAndSchedule = () => {
      setTodayDate(getTodayDate());

      if (timeout !== undefined) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(syncAndSchedule, getMillisecondsUntilNextLocalMidnight());
    };

    syncAndSchedule();

    const subscription = appState.addEventListener('change', (status) => {
      if (status === 'active') {
        syncAndSchedule();
      }
    });

    return () => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      subscription.remove();
    };
  }, [appState]);

  return todayDate;
}
