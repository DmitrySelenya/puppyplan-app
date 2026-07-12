import {
  createQuickLogEventInsert,
  quickLogCommandSchema,
} from '@/contracts/quick-log';
import {
  eventLogInsertSchema,
  eventPayloadSchemasV2,
  parseEventPayload,
} from '@/contracts/supabase';

const ids = {
  household_id: '00000000-0000-4000-8000-000000000001',
  puppy_id: '00000000-0000-4000-8000-000000000002',
  created_by: '00000000-0000-4000-8000-000000000003',
  client_event_id: 'evt_00000000-0000-4000-8000-000000000004',
  occurred_at: '2026-07-11T08:32:00.000Z',
} as const;

describe('Quick Log payload v2 boundary', () => {
  it('AC-2: accepts a note-safe observation and rejects unknown v2 fields', () => {
    const observation = {
      ...ids,
      event_type: 'observation',
      payload_version: 2,
      payload: { title: 'Settled after walk', note: 'Synthetic context' },
    };

    expect(eventLogInsertSchema.safeParse(observation).success).toBe(true);
    expect(eventLogInsertSchema.safeParse({
      ...observation,
      payload: { title: 'Settled after walk', unexpected: true },
    }).success).toBe(false);
    expect(eventPayloadSchemasV2.observation.safeParse({ note: ' '.repeat(501) }).success).toBe(false);
  });

  it('AC-2: keeps sleep action semantics strict', () => {
    expect(parseEventPayload('sleep', 2, {
      action: 'start',
      note: 'Synthetic note',
    })).toEqual({ action: 'start', note: 'Synthetic note' });

    expect(eventLogInsertSchema.safeParse({
      ...ids,
      event_type: 'sleep',
      payload_version: 2,
      payload: { action: 'retrospective', duration_minutes: 90 },
    }).success).toBe(true);
    expect(eventLogInsertSchema.safeParse({
      ...ids,
      event_type: 'sleep',
      payload_version: 2,
      payload: { action: 'start', duration_minutes: 90 },
    }).success).toBe(false);
  });

  it.each([
    ['start', undefined],
    ['wake', undefined],
    ['retrospective', 90],
  ] as const)('AC-3: creates restart-safe sleep %s payloads', (action, durationMinutes) => {
    expect(createQuickLogEventInsert({
      ...ids,
      tracker_id: 'sleep',
      action,
      note: 'Synthetic sleep context',
      ...(durationMinutes === undefined ? {} : { duration_minutes: durationMinutes }),
    })).toMatchObject({
      event_type: 'sleep',
      payload_version: 2,
      payload: {
        action,
        note: 'Synthetic sleep context',
        ...(durationMinutes === undefined ? {} : { duration_minutes: durationMinutes }),
      },
    });
  });

  it('AC-2: creates typed v2 potty, feeding, walk, zoomies, and training details', () => {
    const cases = [
      { tracker_id: 'potty', subtype: 'inside', expected: { subtype: 'inside' } },
      { tracker_id: 'feeding', amount: 'snack', expected: { amount: 'snack' } },
      { tracker_id: 'walk', duration_minutes: 25, expected: { duration_minutes: 25 } },
      { tracker_id: 'zoomies', intensity: 'high', expected: { intensity: 'high' } },
      {
        tracker_id: 'training',
        topic: 'settling',
        duration_bucket: 'short',
        expected: { topic: 'settling', duration_bucket: 'short' },
      },
    ] as const;

    for (const { expected, ...command } of cases) {
      expect(createQuickLogEventInsert({
        ...ids,
        ...command,
        note: 'Synthetic private context',
      })).toMatchObject({
        event_type: command.tracker_id,
        payload_version: 2,
        payload: {
          ...expected,
          note: 'Synthetic private context',
        },
      });
    }
  });

  it('AC-1: keeps v1 readable while detailed v2 commands retain occurred time and note', () => {
    expect(parseEventPayload('feeding', 1, { amount: 'meal' })).toEqual({ amount: 'meal' });

    const command = quickLogCommandSchema.parse({
      ...ids,
      tracker_id: 'observation',
      title: 'Settled after walk',
      note: 'Synthetic context',
    });
    expect(createQuickLogEventInsert(command)).toMatchObject({
      event_type: 'observation',
      payload_version: 2,
      occurred_at: ids.occurred_at,
      payload: { title: 'Settled after walk', note: 'Synthetic context' },
    });
  });

  it('AC-2: rejects note overflow and observation without title or note', () => {
    expect(quickLogCommandSchema.safeParse({
      ...ids,
      tracker_id: 'observation',
      note: 'x'.repeat(501),
    }).success).toBe(false);
    expect(quickLogCommandSchema.safeParse({
      ...ids,
      tracker_id: 'observation',
    }).success).toBe(false);
  });
});
