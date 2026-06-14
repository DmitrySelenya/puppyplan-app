import { formatCalendarDate } from '@/lib/i18n/format-date';

describe('formatCalendarDate', () => {
  it.each([
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    'not-a-date',
  ])('returns invalid calendar input unchanged for %s', (dateValue) => {
    expect(formatCalendarDate(dateValue, 'en')).toBe(dateValue);
  });

  it('formats valid boundary dates in UTC without off-by-one day drift', () => {
    expect(formatCalendarDate('2024-02-29', 'en')).toBe('Feb 29, 2024');
    expect(formatCalendarDate('2026-01-01', 'en')).toBe('Jan 1, 2026');
    expect(formatCalendarDate('2026-12-31', 'en')).toBe('Dec 31, 2026');
  });
});
