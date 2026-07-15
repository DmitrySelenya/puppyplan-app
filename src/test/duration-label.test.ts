import { formatDurationMinutes } from '@/lib/datetime/duration-label';
import { i18n } from '@/lib/i18n';

describe('duration label', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('AC-P33-DURATION reads an overnight stretch in hours rather than raw minutes', () => {
    // 414 raw minutes is the overnight sleep an owner would otherwise have to divide in their head.
    expect(formatDurationMinutes(414, i18n.t)).toBe('6 hr 54 min');
  });

  it('AC-P33-DURATION keeps short naps in minutes', () => {
    expect(formatDurationMinutes(1, i18n.t)).toBe('1 min');
    expect(formatDurationMinutes(54, i18n.t)).toBe('54 min');
  });

  it('AC-P33-DURATION drops a zero minute remainder', () => {
    expect(formatDurationMinutes(120, i18n.t)).toBe('2 hr');
  });

  it('AC-P33-DURATION floors sub-minute and negative input to zero minutes', () => {
    expect(formatDurationMinutes(0, i18n.t)).toBe('0 min');
    expect(formatDurationMinutes(-5, i18n.t)).toBe('0 min');
  });

  it('AC-P33-DURATION localises the units', async () => {
    await i18n.changeLanguage('ru');

    expect(formatDurationMinutes(414, i18n.t)).toBe('6 ч 54 мин');

    await i18n.changeLanguage('en');
  });
});
