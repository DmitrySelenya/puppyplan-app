import { quickLogClientEventIdSchema, createQuickLogEventInsert } from '@/contracts/quick-log';
import {
  createReminderCheckOffClientEventId,
  deriveSlotStatuses,
  getReminderLinkFromPayload,
  type PlannedSlot,
} from '@/contracts/reminders';

const reminderId = '00000000-0000-4000-8000-000000000021';
const otherReminderId = '00000000-0000-4000-8000-000000000022';
const scheduledFor = '2026-07-10T08:00:00.000Z';
const otherScheduledFor = '2026-07-10T18:00:00.000Z';

const householdId = '00000000-0000-4000-8000-000000000001';
const puppyId = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000003';

function slot(overrides: Partial<PlannedSlot> = {}): PlannedSlot {
  return {
    reminderId: overrides.reminderId ?? reminderId,
    trackerId: overrides.trackerId ?? 'feeding',
    scheduledFor: overrides.scheduledFor ?? scheduledFor,
    time: overrides.time ?? '08:00',
    ...(overrides.amount !== undefined ? { amount: overrides.amount } : {}),
    ...(overrides.note !== undefined ? { note: overrides.note } : {}),
  };
}

describe('createReminderCheckOffClientEventId (Invariant 3, client half)', () => {
  it('is deterministic: same slot always yields the same id', () => {
    const first = createReminderCheckOffClientEventId({ reminderId, scheduledFor });
    const second = createReminderCheckOffClientEventId({ reminderId, scheduledFor });

    expect(first).toBe(second);
  });

  it('differs across reminders and across scheduled instants', () => {
    const base = createReminderCheckOffClientEventId({ reminderId, scheduledFor });

    expect(
      createReminderCheckOffClientEventId({ reminderId: otherReminderId, scheduledFor }),
    ).not.toBe(base);
    expect(
      createReminderCheckOffClientEventId({ reminderId, scheduledFor: otherScheduledFor }),
    ).not.toBe(base);
  });

  it('matches the Quick Log client event id shape (evt_ + v4 uuid)', () => {
    const id = createReminderCheckOffClientEventId({ reminderId, scheduledFor });

    expect(quickLogClientEventIdSchema.safeParse(id).success).toBe(true);
  });
});

describe('reminder_link payload threading through createQuickLogEventInsert', () => {
  const base = {
    client_event_id: createReminderCheckOffClientEventId({ reminderId, scheduledFor }),
    household_id: householdId,
    puppy_id: puppyId,
    created_by: userId,
    occurred_at: scheduledFor,
    reminder_link: { reminder_id: reminderId, scheduled_for: scheduledFor },
  } as const;

  it('carries the link on a feeding completion fact', () => {
    const insert = createQuickLogEventInsert({ ...base, tracker_id: 'feeding' });

    expect(insert.payload).toMatchObject({
      amount: 'meal',
      reminder_link: { reminder_id: reminderId, scheduled_for: scheduledFor },
    });
  });

  it('carries the link on potty and walk completion facts', () => {
    const potty = createQuickLogEventInsert({ ...base, tracker_id: 'potty', subtype: 'outside' });
    const walk = createQuickLogEventInsert({ ...base, tracker_id: 'walk' });

    expect(potty.payload).toMatchObject({
      subtype: 'outside',
      reminder_link: { reminder_id: reminderId, scheduled_for: scheduledFor },
    });
    expect(walk.payload).toMatchObject({
      reminder_link: { reminder_id: reminderId, scheduled_for: scheduledFor },
    });
  });

  it('leaves spontaneous logs unchanged when no link is supplied', () => {
    const insert = createQuickLogEventInsert({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000004',
      household_id: householdId,
      puppy_id: puppyId,
      created_by: userId,
      occurred_at: scheduledFor,
      tracker_id: 'feeding',
    });

    expect(insert.payload).toEqual({ amount: 'meal' });
  });

  it('rejects a malformed link', () => {
    expect(() =>
      createQuickLogEventInsert({
        ...base,
        tracker_id: 'feeding',
        reminder_link: { reminder_id: 'not-a-uuid', scheduled_for: scheduledFor },
      }),
    ).toThrow();
  });
});

describe('getReminderLinkFromPayload', () => {
  it('extracts a valid link and ignores payloads without one', () => {
    expect(
      getReminderLinkFromPayload({
        amount: 'meal',
        reminder_link: { reminder_id: reminderId, scheduled_for: scheduledFor },
      }),
    ).toEqual({ reminderId, scheduledFor });
    expect(getReminderLinkFromPayload({ amount: 'meal' })).toBeNull();
    expect(getReminderLinkFromPayload({ reminder_link: { reminder_id: 'nope' } })).toBeNull();
  });
});

describe('deriveSlotStatuses (plan/fact merge core)', () => {
  const nowMs = Date.parse('2026-07-10T12:00:00.000Z');

  it('marks a slot done when a fact links to it, regardless of slot time', () => {
    const statuses = deriveSlotStatuses({
      slots: [slot()],
      facts: [
        {
          occurred_at: scheduledFor,
          payload: { amount: 'meal', reminder_link: { reminder_id: reminderId, scheduled_for: scheduledFor } },
        },
      ],
      nowMs,
    });

    expect(statuses).toEqual([expect.objectContaining({ status: 'done' })]);
  });

  it('marks a past unmatched slot missed and a future one upcoming', () => {
    const statuses = deriveSlotStatuses({
      slots: [
        slot({ scheduledFor: '2026-07-10T08:00:00.000Z' }),
        slot({ reminderId: otherReminderId, scheduledFor: '2026-07-10T18:00:00.000Z' }),
      ],
      facts: [],
      nowMs,
    });

    expect(statuses.map((entry) => entry.status)).toEqual(['missed', 'upcoming']);
  });

  it('does not match a fact from a different slot of the same reminder', () => {
    const statuses = deriveSlotStatuses({
      slots: [slot({ scheduledFor: '2026-07-10T18:00:00.000Z' })],
      facts: [
        {
          occurred_at: scheduledFor,
          payload: { amount: 'meal', reminder_link: { reminder_id: reminderId, scheduled_for: scheduledFor } },
        },
      ],
      nowMs,
    });

    expect(statuses[0].status).toBe('upcoming');
  });

  it('ignores spontaneous facts without a link (no auto-linking, per plan non-goal)', () => {
    const statuses = deriveSlotStatuses({
      slots: [slot()],
      facts: [{ occurred_at: scheduledFor, payload: { amount: 'meal' } }],
      nowMs,
    });

    expect(statuses[0].status).toBe('missed');
  });
});
