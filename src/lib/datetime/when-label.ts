const BACKDATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;

/**
 * The window a fact may be backdated into. Capture surfaces bind their picker to
 * these bounds so an out-of-range time cannot be entered in the first place.
 */
export function getBackdateBounds(now: Date = new Date()): Readonly<{
  maximumDate: Date;
  minimumDate: Date;
}> {
  return {
    maximumDate: now,
    minimumDate: new Date(now.getTime() - BACKDATE_WINDOW_MS),
  };
}

/**
 * Renders an occurrence time for a capture pill: bare 24-hour time for today, day-prefixed
 * otherwise, so a backdated entry never reads as if it happened just now.
 */
export function formatWhenLabel(date: Date, locale: string, now: Date = new Date()): string {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  if (isSameDay(date, now)) {
    return time;
  }

  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);

  return `${day}, ${time}`;
}

function isSameDay(date: Date, other: Date): boolean {
  return date.getFullYear() === other.getFullYear()
    && date.getMonth() === other.getMonth()
    && date.getDate() === other.getDate();
}
