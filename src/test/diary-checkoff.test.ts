import type { DiaryPlannedItem } from '@/contracts/diary-day';
import { createQuickLogDetailDraft, createQuickLogEventInsert } from '@/contracts/quick-log';
import { createDiaryCheckOffVariables } from '@/features/today/createReminderCheckOff';

const baseItem: DiaryPlannedItem = {
  displayAt: '2026-07-11T06:00:00.000Z',
  kind: 'planned',
  plannedAt: '2026-07-11T06:00:00.000Z',
  reminderId: '00000000-0000-4000-8000-000000000301',
  scheduledFor: '2026-07-11T06:00:00.000Z',
  status: 'upcoming',
  time: '08:00',
  trackerId: 'feeding',
};

const context = {
  householdId: '00000000-0000-4000-8000-000000000001',
  puppyId: '00000000-0000-4000-8000-000000000002',
  todayDate: '2026-07-11',
};

describe('createDiaryCheckOffVariables', () => {
  it('AC-P5-ACTUAL uses actual completion time and preserves planned linkage', () => {
    const variables = createDiaryCheckOffVariables({
      context,
      item: baseItem,
      occurredAt: '2026-07-11T06:17:00.000Z',
    });

    expect(variables).toEqual(expect.objectContaining({
      occurredAt: '2026-07-11T06:17:00.000Z',
      reminderLink: {
        reminderId: baseItem.reminderId,
        scheduledFor: baseItem.scheduledFor,
      },
    }));
    expect(variables.clientEventId).toMatch(/^evt_/u);
    expect(variables.detailDraft).toEqual(expect.objectContaining({
      occurredAt: '2026-07-11T06:17:00.000Z',
      trackerId: 'feeding',
    }));
    expect(() => createQuickLogDetailDraft(variables.detailDraft)).not.toThrow();
  });

  it('AC-P5-POTTY requires subtype for a generic potty routine', () => {
    const potty = { ...baseItem, trackerId: 'potty' as const };

    expect(() => createDiaryCheckOffVariables({
      context,
      item: potty,
      occurredAt: '2026-07-11T06:17:00.000Z',
    })).toThrow('reminder_potty_requires_subtype');

    expect(createDiaryCheckOffVariables({
      context,
      item: potty,
      occurredAt: '2026-07-11T06:17:00.000Z',
      pottySubtype: 'outside',
    }).detailDraft).toEqual({
      occurredAt: '2026-07-11T06:17:00.000Z',
      subtype: 'outside',
      trackerId: 'potty',
    });
  });

  it('reuses the exact deterministic id across client attempts', () => {
    const first = createDiaryCheckOffVariables({
      context,
      item: baseItem,
      occurredAt: '2026-07-11T06:17:00.000Z',
    });
    const second = createDiaryCheckOffVariables({
      context,
      item: baseItem,
      occurredAt: '2026-07-11T06:18:00.000Z',
    });

    expect(first.clientEventId).toBe(second.clientEventId);
  });

  it('builds the same strict sleep insert used by the queue mutation', () => {
    const variables = createDiaryCheckOffVariables({
      context,
      item: { ...baseItem, trackerId: 'sleep' },
      occurredAt: '2026-07-11T20:53:00.000Z',
    });
    const draft = createQuickLogDetailDraft(variables.detailDraft);
    const reminderLink = variables.reminderLink;

    if (reminderLink === undefined) {
      throw new Error('Expected a planned check-off reminder link');
    }

    expect(() => createQuickLogEventInsert({
      action: draft.trackerId === 'sleep' ? draft.action : undefined,
      client_event_id: variables.clientEventId,
      created_by: '00000000-0000-4000-8000-000000000003',
      household_id: variables.householdId,
      occurred_at: variables.occurredAt,
      puppy_id: variables.puppyId,
      reminder_link: {
        reminder_id: reminderLink.reminderId,
        scheduled_for: reminderLink.scheduledFor,
      },
      tracker_id: 'sleep',
    })).not.toThrow();
  });
});
