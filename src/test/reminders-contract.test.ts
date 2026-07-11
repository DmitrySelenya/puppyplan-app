import {
  parseScheduleRule,
  reminderAmountUnitByTracker,
  reminderScheduleDraftSchema,
  reminderTrackerIds,
  scheduleRuleSchema,
} from '@/contracts/reminders';

const validTimes = ['0:00', '7:30', '07:30', '09:05', '23:59'];
const invalidTimes = ['24:00', '7:60', '7:5', '7', '07:30:00', 'noon', '-1:00'];

describe('scheduleRuleSchema', () => {
  it('parses the legacy hardcoded daily rule shape', () => {
    const legacy = { repeat: 'daily', time: '7:30' };

    expect(() => scheduleRuleSchema.parse(legacy)).not.toThrow();
    expect(scheduleRuleSchema.parse(legacy)).toEqual({ repeat: 'daily', time: '7:30' });
  });

  it.each(validTimes)('accepts a valid time %s', (time) => {
    expect(scheduleRuleSchema.safeParse({ repeat: 'daily', time }).success).toBe(true);
  });

  it.each(invalidTimes)('rejects an invalid time %s', (time) => {
    expect(scheduleRuleSchema.safeParse({ repeat: 'daily', time }).success).toBe(false);
  });

  it('rejects a rule with no time', () => {
    expect(scheduleRuleSchema.safeParse({ repeat: 'daily' }).success).toBe(false);
  });

  it('requires a date when repeat is never', () => {
    expect(scheduleRuleSchema.safeParse({ repeat: 'never', time: '08:00' }).success).toBe(false);
    expect(
      scheduleRuleSchema.safeParse({ repeat: 'never', time: '08:00', date: '2026-07-10' }).success,
    ).toBe(true);
  });

  it('forbids a date when repeat is recurring', () => {
    expect(
      scheduleRuleSchema.safeParse({ repeat: 'daily', time: '08:00', date: '2026-07-10' }).success,
    ).toBe(false);
  });

  it('accepts weekdays and custom-day repeat shapes', () => {
    expect(scheduleRuleSchema.safeParse({ repeat: 'weekdays', time: '08:00' }).success).toBe(true);
    expect(
      scheduleRuleSchema.safeParse({ repeat: { days: [1, 3, 5] }, time: '08:00' }).success,
    ).toBe(true);
  });

  it('rejects unknown or empty repeat shapes', () => {
    expect(scheduleRuleSchema.safeParse({ repeat: 'monthly', time: '08:00' }).success).toBe(false);
    expect(scheduleRuleSchema.safeParse({ repeat: { days: [] }, time: '08:00' }).success).toBe(false);
    expect(scheduleRuleSchema.safeParse({ repeat: { days: [8] }, time: '08:00' }).success).toBe(false);
    expect(
      scheduleRuleSchema.safeParse({ repeat: { days: [1, 1] }, time: '08:00' }).success,
    ).toBe(false);
  });

  it('rejects unknown keys on the rule', () => {
    expect(
      scheduleRuleSchema.safeParse({ repeat: 'daily', time: '08:00', foo: 'bar' }).success,
    ).toBe(false);
  });

  it('accepts an optional amount and private note', () => {
    const parsed = scheduleRuleSchema.parse({
      repeat: 'daily',
      time: '08:00',
      amount: { value: 60, unit: 'g' },
      note: 'kibble',
    });

    expect(parsed.amount).toEqual({ value: 60, unit: 'g' });
    expect(parsed.note).toBe('kibble');
  });

  it('rejects a non-positive amount value', () => {
    expect(
      scheduleRuleSchema.safeParse({ repeat: 'daily', time: '08:00', amount: { value: 0, unit: 'g' } })
        .success,
    ).toBe(false);
  });

  it('parseScheduleRule throws on invalid input', () => {
    expect(() => parseScheduleRule({ repeat: 'daily' })).toThrow();
  });
});

describe('reminderScheduleDraftSchema (tracker + rule)', () => {
  it('rejects an unknown tracker id', () => {
    expect(
      reminderScheduleDraftSchema.safeParse({
        trackerId: 'grooming',
        rule: { repeat: 'daily', time: '08:00' },
      }).success,
    ).toBe(false);
  });

  it('accepts amount only on trackers where it is meaningful, matching the unit', () => {
    expect(
      reminderScheduleDraftSchema.safeParse({
        trackerId: 'feeding',
        rule: { repeat: 'daily', time: '08:00', amount: { value: 60, unit: 'g' } },
      }).success,
    ).toBe(true);

    expect(
      reminderScheduleDraftSchema.safeParse({
        trackerId: 'walk',
        rule: { repeat: 'daily', time: '08:00', amount: { value: 20, unit: 'min' } },
      }).success,
    ).toBe(true);
  });

  it('rejects amount on a tracker where it is not meaningful', () => {
    expect(
      reminderScheduleDraftSchema.safeParse({
        trackerId: 'potty',
        rule: { repeat: 'daily', time: '08:00', amount: { value: 5, unit: 'min' } },
      }).success,
    ).toBe(false);
  });

  it('rejects an amount whose unit does not match the tracker', () => {
    expect(
      reminderScheduleDraftSchema.safeParse({
        trackerId: 'feeding',
        rule: { repeat: 'daily', time: '08:00', amount: { value: 20, unit: 'min' } },
      }).success,
    ).toBe(false);
  });

  it('keeps the amount-unit map aligned with the tracker taxonomy', () => {
    expect(Object.keys(reminderAmountUnitByTracker).sort()).toEqual([...reminderTrackerIds].sort());
  });
});
