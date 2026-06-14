import type { SupportedLocale } from '@/lib/i18n';

export function formatCalendarDate(dateValue: string, locale: SupportedLocale): string {
  const parts = dateValue.split('-').map(Number);
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
    return dateValue;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date);
}
