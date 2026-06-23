import {
  QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_MS,
  QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS,
  getQuickLogDuplicateCareWarningKey,
  isQuickLogAccidentalDoubleTap,
  shouldShowQuickLogDuplicateCareWarning,
} from '@/contracts/business-rules';
import {
  MAX_VISIBLE_QUICK_LOG_TRACKERS,
  createQuickLogEventInsert,
  defaultQuickLogTrackerIds,
  quickLogQueueItemSchema,
  quickLogCommandSchema,
  quickLogTrackerIdSchema,
  quickLogTrackerDefinitions,
  quickLogTrackerIds,
  selectedQuickLogTrackerIdsSchema,
} from '@/contracts/quick-log';
import {
  eventLogInsertSchema,
  minimalQuickLogQueueItemSchema,
  quickLogQueueStates,
} from '@/contracts/supabase';

const householdId = '00000000-0000-4000-8000-000000000001';
const puppyId = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000003';
const occurredAt = '2026-05-26T06:55:00.000Z';
const clientEventId = 'evt_00000000-0000-4000-8000-000000000004';

const expectedQuickLogTrackerDefinitions = {
  potty: {
    event_type: 'potty',
  },
  feeding: {
    event_type: 'feeding',
    payload: {
      amount: 'meal',
    },
  },
  sleep: {
    event_type: 'sleep',
    payload: {
      sleep_kind: 'nap',
    },
  },
  walk: {
    event_type: 'walk',
    payload: {},
  },
  zoomies: {
    event_type: 'zoomies',
    payload: {},
  },
} as const;

function quickLogClientEventId(index: number): string {
  return `evt_00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;
}

describe('Quick Log tracker contracts', () => {
  it('AC-1: keeps the selected Quick Log tracker vocabulary canonical and capped at five', () => {
    expect(MAX_VISIBLE_QUICK_LOG_TRACKERS).toBe(5);
    expect(quickLogTrackerIds).toEqual(['potty', 'feeding', 'sleep', 'walk', 'zoomies']);
    expect(defaultQuickLogTrackerIds).toEqual(['potty', 'feeding', 'sleep', 'walk', 'zoomies']);
    expect(defaultQuickLogTrackerIds).toHaveLength(MAX_VISIBLE_QUICK_LOG_TRACKERS);

    expect(selectedQuickLogTrackerIdsSchema.safeParse(defaultQuickLogTrackerIds).success).toBe(true);
    expect(selectedQuickLogTrackerIdsSchema.safeParse(['potty', 'potty']).success).toBe(false);
    expect(selectedQuickLogTrackerIdsSchema.safeParse([]).success).toBe(false);
    expect(
      selectedQuickLogTrackerIdsSchema.safeParse([
        'potty',
        'feeding',
        'sleep',
        'walk',
        'zoomies',
        'weight',
      ]).success,
    ).toBe(false);

    for (const rejectedTrackerId of [
      'weight',
      'training',
      'potty_pee_outside',
      'potty_pee_inside',
      'potty_poop',
      'feeding_meal',
      'sleep_nap',
    ]) {
      expect(quickLogTrackerIdSchema.safeParse(rejectedTrackerId).success).toBe(false);
      expect(selectedQuickLogTrackerIdsSchema.safeParse([rejectedTrackerId]).success).toBe(false);
    }
  });

  it('AC-2 AC-3: maps canonical trackers to strict event payload contracts', () => {
    expect(Object.keys(quickLogTrackerDefinitions)).toEqual([
      'potty',
      'feeding',
      'sleep',
      'walk',
      'zoomies',
    ]);
    expect(quickLogTrackerDefinitions).toMatchObject(expectedQuickLogTrackerDefinitions);

    for (const definition of [
      expectedQuickLogTrackerDefinitions.feeding,
      expectedQuickLogTrackerDefinitions.sleep,
      expectedQuickLogTrackerDefinitions.walk,
      expectedQuickLogTrackerDefinitions.zoomies,
    ]) {
      const result = eventLogInsertSchema.safeParse({
        puppy_id: puppyId,
        household_id: householdId,
        created_by: userId,
        client_event_id: clientEventId,
        event_type: definition.event_type,
        occurred_at: occurredAt,
        payload_version: 1,
        payload: definition.payload,
      });

      expect(result.success).toBe(true);
    }
  });

  it('AC-2: converts feeding, sleep, walk, and zoomies commands into canonical event inserts', () => {
    const commands = [
      {
        commandPayload: undefined,
        expected: expectedQuickLogTrackerDefinitions.feeding,
        trackerId: 'feeding',
      },
      {
        commandPayload: undefined,
        expected: expectedQuickLogTrackerDefinitions.sleep,
        trackerId: 'sleep',
      },
      {
        commandPayload: undefined,
        expected: expectedQuickLogTrackerDefinitions.walk,
        trackerId: 'walk',
      },
      {
        commandPayload: { duration_minutes: 22 },
        expected: {
          event_type: 'walk',
          payload: { duration_minutes: 22 },
        },
        trackerId: 'walk',
      },
      {
        commandPayload: undefined,
        expected: expectedQuickLogTrackerDefinitions.zoomies,
        trackerId: 'zoomies',
      },
    ] as const;

    for (const [index, item] of commands.entries()) {
      const command = {
        client_event_id: quickLogClientEventId(index + 10),
        household_id: householdId,
        puppy_id: puppyId,
        created_by: userId,
        tracker_id: item.trackerId,
        occurred_at: occurredAt,
        ...(item.commandPayload === undefined
          ? {}
          : { payload: item.commandPayload }),
      };

      expect(quickLogCommandSchema.safeParse(command).success).toBe(true);

      const insert = createQuickLogEventInsert(command);

      expect(insert).toEqual({
        puppy_id: puppyId,
        household_id: householdId,
        created_by: userId,
        client_event_id: command.client_event_id,
        event_type: item.expected.event_type,
        occurred_at: occurredAt,
        payload_version: 1,
        payload: item.expected.payload,
      });
      expect(eventLogInsertSchema.safeParse(insert).success).toBe(true);
    }
  });

  it('AC-3: requires potty subtype commands and emits subtype payloads without quick_action', () => {
    for (const subtype of ['outside', 'inside', 'poop'] as const) {
      const command = {
        client_event_id: clientEventId,
        household_id: householdId,
        puppy_id: puppyId,
        created_by: userId,
        tracker_id: 'potty',
        occurred_at: occurredAt,
        subtype,
      };

      expect(quickLogCommandSchema.safeParse(command).success).toBe(true);
      expect(createQuickLogEventInsert(command)).toEqual({
        puppy_id: puppyId,
        household_id: householdId,
        created_by: userId,
        client_event_id: clientEventId,
        event_type: 'potty',
        occurred_at: occurredAt,
        payload_version: 1,
        payload: { subtype },
      });
    }

    const outsideInsert = createQuickLogEventInsert({
      client_event_id: clientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: userId,
      tracker_id: 'potty',
      occurred_at: occurredAt,
      subtype: 'outside',
    });

    expect(outsideInsert.payload).not.toHaveProperty('quick_action');
  });

  it('AC-3: rejects invalid or incomplete commands before event inserts are created', () => {
    const command = {
      client_event_id: clientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: userId,
      tracker_id: 'potty',
      occurred_at: occurredAt,
      subtype: 'outside',
    };

    expect(() => createQuickLogEventInsert({
      ...command,
      client_event_id: 'evt_00000000-0000-1000-8000-000000000004',
    })).toThrow();
    expect(() => createQuickLogEventInsert({
      ...command,
      occurred_at: undefined,
    })).toThrow();
    expect(() => createQuickLogEventInsert({
      ...command,
      subtype: undefined,
    })).toThrow();
    expect(() => createQuickLogEventInsert({
      ...command,
      subtype: 'pee_outside',
    })).toThrow();
  });

  it('AC-3 AC-4: rejects private or free-text fields on Quick Log commands', () => {
    const command = {
      client_event_id: clientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: userId,
      tracker_id: 'potty',
      occurred_at: occurredAt,
      subtype: 'outside',
    };

    expect(quickLogCommandSchema.safeParse({
      ...command,
      notes: 'free text must stay out of this command',
    }).success).toBe(false);
    expect(quickLogCommandSchema.safeParse({
      ...command,
      puppy_name: 'private display value',
    }).success).toBe(false);
    expect(quickLogCommandSchema.safeParse({
      ...command,
      raw_error: 'backend message',
    }).success).toBe(false);
    expect(quickLogCommandSchema.safeParse({
      ...command,
      client_event_id: 'caregiver@example.com',
    }).success).toBe(false);
    expect(quickLogCommandSchema.safeParse({
      ...command,
      client_event_id: 'raw-server-error-token',
    }).success).toBe(false);
    expect(quickLogCommandSchema.safeParse({
      ...command,
      client_event_id: 'evt_00000000-0000-1000-8000-000000000004',
    }).success).toBe(false);
    expect(quickLogCommandSchema.safeParse({
      ...command,
      client_event_id: `evt_${'a'.repeat(80)}`,
    }).success).toBe(false);
  });
});

describe('Quick Log duplicate windows', () => {
  it('AC-5: uses the canonical 3s accidental double-tap and 60s duplicate-care windows', () => {
    expect(QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_MS).toBe(3000);
    expect(QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS).toBe(60000);

    expect(isQuickLogAccidentalDoubleTap({
      previousTrackerId: 'feeding',
      nextTrackerId: 'feeding',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 1000 + QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_MS,
    })).toBe(true);
    expect(isQuickLogAccidentalDoubleTap({
      previousTrackerId: 'feeding',
      nextTrackerId: 'feeding',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 1001 + QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_MS,
    })).toBe(false);
    expect(isQuickLogAccidentalDoubleTap({
      previousTrackerId: 'feeding',
      nextTrackerId: 'sleep',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(false);
    expect(isQuickLogAccidentalDoubleTap({
      previousTrackerId: 'feeding',
      nextTrackerId: 'feeding',
      previousOccurredAtMs: 2000,
      nextOccurredAtMs: 1000,
    })).toBe(false);
    expect(isQuickLogAccidentalDoubleTap({
      previousTrackerId: 'feeding',
      nextTrackerId: 'feeding',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: Number.POSITIVE_INFINITY,
    })).toBe(false);

    expect(duplicateWarningFor({
      previousTrackerId: 'feeding',
      nextTrackerId: 'feeding',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 1000 + QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS,
    })).toBe(true);
    expect(duplicateWarningFor({
      previousTrackerId: 'feeding',
      nextTrackerId: 'feeding',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 1001 + QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS,
    })).toBe(false);
    expect(duplicateWarningFor({
      previousTrackerId: 'feeding',
      nextTrackerId: 'sleep',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(false);
    expect(duplicateWarningFor({
      previousPayload: { subtype: 'outside' },
      previousTrackerId: 'potty',
      nextPayload: { subtype: 'outside' },
      nextTrackerId: 'potty',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(true);
    expect(duplicateWarningFor({
      previousPayload: { subtype: 'poop' },
      previousTrackerId: 'potty',
      nextPayload: { subtype: 'poop' },
      nextTrackerId: 'potty',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(true);
    expect(duplicateWarningFor({
      previousPayload: { subtype: 'inside' },
      previousTrackerId: 'potty',
      nextPayload: { subtype: 'inside' },
      nextTrackerId: 'potty',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(false);
    expect(duplicateWarningFor({
      previousTrackerId: 'sleep',
      nextTrackerId: 'sleep',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(false);
    expect(duplicateWarningFor({
      previousTrackerId: 'walk',
      nextTrackerId: 'walk',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(false);
    expect(duplicateWarningFor({
      previousTrackerId: 'zoomies',
      nextTrackerId: 'zoomies',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(false);
    expect(duplicateWarningFor({
      previousTrackerId: 'feeding',
      nextTrackerId: 'feeding',
      previousOccurredAtMs: 2000,
      nextOccurredAtMs: 1000,
    })).toBe(false);
    expect(duplicateWarningFor({
      previousTrackerId: 'feeding',
      nextTrackerId: 'feeding',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: Number.NaN,
    })).toBe(false);
  });

  it('AC-5: maps duplicate-care warning keys only for product-approved care buckets', () => {
    expect(
      Object.fromEntries([
        ['potty:outside', duplicateCareWarningKeyFor('potty', { subtype: 'outside' })],
        ['potty:inside', duplicateCareWarningKeyFor('potty', { subtype: 'inside' })],
        ['potty:poop', duplicateCareWarningKeyFor('potty', { subtype: 'poop' })],
        ['feeding', duplicateCareWarningKeyFor('feeding')],
        ['sleep', duplicateCareWarningKeyFor('sleep')],
        ['walk', duplicateCareWarningKeyFor('walk')],
        ['zoomies', duplicateCareWarningKeyFor('zoomies')],
      ]),
    ).toEqual({
      'potty:outside': 'potty:outside',
      'potty:inside': null,
      'potty:poop': 'potty:poop',
      feeding: 'feeding',
      sleep: null,
      walk: null,
      zoomies: null,
    });
  });
});

describe('Quick Log queue payload boundary', () => {
  const validQueueItem = {
    client_event_id: clientEventId,
    household_id: householdId,
    puppy_id: puppyId,
    event_type: 'feeding',
    payload_version: 1,
    payload: {
      amount: 'meal',
    },
    occurred_at: occurredAt,
    state: 'pending_local',
    retry_count: 0,
    created_at: occurredAt,
    updated_at: occurredAt,
  };

  it('keeps the queue state vocabulary aligned with the SQLite state machine', () => {
    expect(quickLogQueueStates).toEqual([
      'pending_local',
      'sending',
      'server_confirmed',
      'failed_retryable',
      'failed_permanent',
      'deleted_before_sync',
    ]);
  });

  it('rejects private or free-text queue payload fields', () => {
    for (const privateField of [
      'notes',
      'photo_uri',
      'puppy_name',
      'email',
      'token',
      'provider_name',
      'raw_error',
    ]) {
      expect(minimalQuickLogQueueItemSchema.safeParse({
        ...validQueueItem,
        payload: {
          amount: 'meal',
          [privateField]: 'private value',
        },
      }).success).toBe(false);
    }
  });

  it('rejects invalid event-specific payloads before they can enter the queue', () => {
    expect(minimalQuickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      payload: {
        amount: 'full bowl',
      },
    }).success).toBe(false);

    expect(minimalQuickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      event_type: 'sleep',
      payload: {
        sleep_kind: 'nap',
        duration_minutes: 0,
      },
    }).success).toBe(false);

    expect(minimalQuickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      event_type: 'potty',
      payload: {
        quick_action: 'pee_outside',
      },
    }).success).toBe(false);

    expect(minimalQuickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      event_type: 'walk',
      payload: {
        duration_minutes: 0,
      },
    }).success).toBe(false);
  });

  it('AC-4: accepts canonical potty subtype and walk queue payloads', () => {
    expect(quickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      event_type: 'potty',
      payload: {
        subtype: 'outside',
      },
    }).success).toBe(true);
    expect(quickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      event_type: 'potty',
      payload: {
        subtype: 'inside',
      },
    }).success).toBe(true);
    expect(quickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      event_type: 'potty',
      payload: {
        subtype: 'poop',
      },
    }).success).toBe(true);
    expect(quickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      event_type: 'walk',
      payload: {},
    }).success).toBe(true);
    expect(quickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      event_type: 'walk',
      payload: {
        duration_minutes: 22,
      },
    }).success).toBe(true);
    expect(quickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      event_type: 'walk',
      payload: {
        duration_minutes: 22,
        notes: 'free text must not cross the Quick Log trust boundary',
      },
    }).success).toBe(false);
  });

  it('keeps the Quick Log queue schema scoped to Quick Log routine events and generated IDs', () => {
    expect(quickLogQueueItemSchema.safeParse(validQueueItem).success).toBe(true);
    expect(quickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      client_event_id: 'raw free text',
    }).success).toBe(false);
    expect(quickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      client_event_id: 'evt_00000000-0000-1000-8000-000000000004',
    }).success).toBe(false);
    expect(quickLogQueueItemSchema.safeParse({
      ...validQueueItem,
      event_type: 'health_record_reference',
      payload: {
        health_record_id: '00000000-0000-4000-8000-000000000004',
      },
    }).success).toBe(false);
  });
});

function duplicateCareWarningKeyFor(
  trackerId: string,
  payload?: Readonly<Record<string, string>>,
): string | null {
  return Reflect.apply(getQuickLogDuplicateCareWarningKey, undefined, [trackerId, payload]) as string | null;
}

function duplicateWarningFor(input: Readonly<Record<string, unknown>>): boolean {
  return Reflect.apply(shouldShowQuickLogDuplicateCareWarning, undefined, [input]) as boolean;
}
