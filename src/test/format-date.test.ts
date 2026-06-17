import {
  calendarDateToUtc,
  formatCalendarDate,
  formatLocalCalendarDate,
  getLocalCalendarDate,
  shiftCalendarDate,
} from '@/lib/i18n/format-date';

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

  it('AC-3: formats timestamps as local calendar dates for filters and section groups', () => {
    const localDate = new Date(2026, 0, 2, 3, 4, 5);

    expect(getLocalCalendarDate(localDate.toISOString())).toBe('2026-01-02');
    expect(formatLocalCalendarDate(localDate.toISOString())).toBe('2026-01-02');
    expect(getLocalCalendarDate('not-a-date')).toBeNull();
    expect(formatLocalCalendarDate('not-a-date')).toBe('not-a-date');
  });

  it('AC-3: shifts calendar dates and rejects impossible UTC calendar days', () => {
    expect(shiftCalendarDate('2024-03-01', -1)).toBe('2024-02-29');
    expect(shiftCalendarDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftCalendarDate('not-a-date', -1)).toBe('not-a-date');
    expect(calendarDateToUtc('2024-02-29')?.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    expect(calendarDateToUtc('2026-02-29')).toBeNull();
    expect(calendarDateToUtc('not-a-date')).toBeNull();
  });
});
