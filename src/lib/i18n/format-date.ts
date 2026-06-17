import type { SupportedLocale } from '@/lib/i18n';

export function formatCalendarDate(dateValue: string, locale: SupportedLocale): string {
  const date = calendarDateToUtc(dateValue);

  if (date === null) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date);
}

export function getLocalCalendarDate(timestamp: string): string | null {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function formatLocalCalendarDate(timestamp: string): string {
  return getLocalCalendarDate(timestamp) ?? timestamp.slice(0, 10);
}

export function shiftCalendarDate(calendarDate: string, deltaDays: number): string {
  const date = calendarDateToUtc(calendarDate);

  if (date === null) {
    return calendarDate;
  }

  date.setUTCDate(date.getUTCDate() + deltaDays);

  return formatUtcCalendarDate(date);
}

export function calendarDateToUtc(calendarDate: string): Date | null {
  const parts = parseCalendarDateParts(calendarDate);

  if (parts === null) {
    return null;
  }

  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? date
    : null;
}

function parseCalendarDateParts(calendarDate: string): [number, number, number] | null {
  const parts = calendarDate.split('-').map(Number);
  const [year, month, day] = parts;

  if (
    parts.length !== 3
    || !Number.isInteger(year)
    || !Number.isInteger(month)
    || !Number.isInteger(day)
    || month < 1
    || month > 12
    || day < 1
    || day > 31
  ) {
    return null;
  }

  return [year, month, day];
}

function formatUtcCalendarDate(date: Date): string {
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}
