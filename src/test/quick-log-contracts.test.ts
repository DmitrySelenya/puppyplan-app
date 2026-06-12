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
  potty_pee_outside: {
    event_type: 'potty',
    payload: {
      quick_action: 'pee_outside',
    },
  },
  potty_pee_inside: {
    event_type: 'potty',
    payload: {
      quick_action: 'pee_inside',
    },
  },
  potty_poop: {
    event_type: 'potty',
    payload: {
      quick_action: 'poop',
    },
  },
  feeding_meal: {
    event_type: 'feeding',
    payload: {
      amount: 'meal',
    },
  },
  sleep_nap: {
    event_type: 'sleep',
    payload: {
      sleep_kind: 'nap',
    },
  },
  zoomies: {
    event_type: 'zoomies',
    payload: {},
  },
  training: {
    event_type: 'training',
    payload: {
      topic: 'other',
    },
  },
} as const;

function quickLogClientEventId(index: number): string {
  return `evt_00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;
}

describe('Quick Log tracker contracts', () => {
  it('keeps the first-screen tracker selection capped at five visible trackers', () => {
    expect(MAX_VISIBLE_QUICK_LOG_TRACKERS).toBe(5);
    expect(defaultQuickLogTrackerIds).toEqual([
      'potty_pee_outside',
      'potty_pee_inside',
      'potty_poop',
      'feeding_meal',
      'sleep_nap',
    ]);
    expect(defaultQuickLogTrackerIds).toHaveLength(MAX_VISIBLE_QUICK_LOG_TRACKERS);
    expect(defaultQuickLogTrackerIds).not.toContain('zoomies');
    expect(defaultQuickLogTrackerIds).not.toContain('training');

    expect(selectedQuickLogTrackerIdsSchema.safeParse(defaultQuickLogTrackerIds).success).toBe(true);
    expect(
      selectedQuickLogTrackerIdsSchema.safeParse([
        ...defaultQuickLogTrackerIds,
        'zoomies',
      ]).success,
    ).toBe(false);
    expect(
      selectedQuickLogTrackerIdsSchema.safeParse([
        'potty_pee_outside',
        'potty_pee_outside',
      ]).success,
    ).toBe(false);
    expect(selectedQuickLogTrackerIdsSchema.safeParse([]).success).toBe(false);
    expect(
      selectedQuickLogTrackerIdsSchema.safeParse([
        'potty_pee_outside',
        'feeding_meal',
        'sleep_nap',
        'zoomies',
        'training',
      ]).success,
    ).toBe(true);
  });

  it('maps every selectable tracker to a strict existing event payload contract', () => {
    expect(quickLogTrackerIds).toEqual([
      'potty_pee_outside',
      'potty_pee_inside',
      'potty_poop',
      'feeding_meal',
      'sleep_nap',
      'zoomies',
      'training',
    ]);

    for (const trackerId of quickLogTrackerIds) {
      const definition = quickLogTrackerDefinitions[trackerId];
      expect(definition).toEqual(expectedQuickLogTrackerDefinitions[trackerId]);

      const result = eventLogInsertSchema.safeParse({
        puppy_id: puppyId,
        household_id: householdId,
        created_by: userId,
        client_event_id: `event-${trackerId}`,
        event_type: definition.event_type,
        occurred_at: occurredAt,
        payload_version: 1,
        payload: definition.payload,
      });

      expect(result.success).toBe(true);
    }
  });

  it('converts every one-tap tracker command into its canonical event insert', () => {
    for (const [index, trackerId] of quickLogTrackerIds.entries()) {
      const command = {
        client_event_id: quickLogClientEventId(index + 10),
        household_id: householdId,
        puppy_id: puppyId,
        created_by: userId,
        tracker_id: trackerId,
        occurred_at: occurredAt,
      };

      expect(quickLogCommandSchema.safeParse(command).success).toBe(true);

      const insert = createQuickLogEventInsert(command);
      const definition = expectedQuickLogTrackerDefinitions[trackerId];

      expect(insert).toEqual({
        puppy_id: puppyId,
        household_id: householdId,
        created_by: userId,
        client_event_id: command.client_event_id,
        event_type: definition.event_type,
        occurred_at: occurredAt,
        payload_version: 1,
        payload: definition.payload,
      });
      expect(eventLogInsertSchema.safeParse(insert).success).toBe(true);
    }
  });

  it('rejects invalid or incomplete commands before event inserts are created', () => {
    const command = {
      client_event_id: clientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: userId,
      tracker_id: 'feeding_meal',
      occurred_at: occurredAt,
    };

    expect(() => createQuickLogEventInsert({
      ...command,
      client_event_id: 'evt_00000000-0000-1000-8000-000000000004',
    })).toThrow();
    expect(() => createQuickLogEventInsert({
      ...command,
      occurred_at: undefined,
    })).toThrow();
  });

  it('rejects private or free-text fields on Quick Log commands', () => {
    const command = {
      client_event_id: clientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: userId,
      tracker_id: 'feeding_meal',
      occurred_at: occurredAt,
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
  it('uses the canonical 3s accidental double-tap and 60s duplicate-care windows', () => {
    expect(QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_MS).toBe(3000);
    expect(QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS).toBe(60000);

    expect(isQuickLogAccidentalDoubleTap({
      previousTrackerId: 'feeding_meal',
      nextTrackerId: 'feeding_meal',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 1000 + QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_MS,
    })).toBe(true);
    expect(isQuickLogAccidentalDoubleTap({
      previousTrackerId: 'feeding_meal',
      nextTrackerId: 'feeding_meal',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 1001 + QUICK_LOG_ACCIDENTAL_DOUBLE_TAP_WINDOW_MS,
    })).toBe(false);
    expect(isQuickLogAccidentalDoubleTap({
      previousTrackerId: 'feeding_meal',
      nextTrackerId: 'sleep_nap',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(false);
    expect(isQuickLogAccidentalDoubleTap({
      previousTrackerId: 'feeding_meal',
      nextTrackerId: 'feeding_meal',
      previousOccurredAtMs: 2000,
      nextOccurredAtMs: 1000,
    })).toBe(false);
    expect(isQuickLogAccidentalDoubleTap({
      previousTrackerId: 'feeding_meal',
      nextTrackerId: 'feeding_meal',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: Number.POSITIVE_INFINITY,
    })).toBe(false);

    expect(shouldShowQuickLogDuplicateCareWarning({
      previousTrackerId: 'feeding_meal',
      nextTrackerId: 'feeding_meal',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 1000 + QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS,
    })).toBe(true);
    expect(shouldShowQuickLogDuplicateCareWarning({
      previousTrackerId: 'feeding_meal',
      nextTrackerId: 'feeding_meal',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 1001 + QUICK_LOG_DUPLICATE_CARE_WARNING_WINDOW_MS,
    })).toBe(false);
    expect(shouldShowQuickLogDuplicateCareWarning({
      previousTrackerId: 'feeding_meal',
      nextTrackerId: 'sleep_nap',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(false);
    expect(shouldShowQuickLogDuplicateCareWarning({
      previousTrackerId: 'potty_pee_inside',
      nextTrackerId: 'potty_pee_inside',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(false);
    expect(shouldShowQuickLogDuplicateCareWarning({
      previousTrackerId: 'sleep_nap',
      nextTrackerId: 'sleep_nap',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: 2000,
    })).toBe(false);
    expect(shouldShowQuickLogDuplicateCareWarning({
      previousTrackerId: 'feeding_meal',
      nextTrackerId: 'feeding_meal',
      previousOccurredAtMs: 2000,
      nextOccurredAtMs: 1000,
    })).toBe(false);
    expect(shouldShowQuickLogDuplicateCareWarning({
      previousTrackerId: 'feeding_meal',
      nextTrackerId: 'feeding_meal',
      previousOccurredAtMs: 1000,
      nextOccurredAtMs: Number.NaN,
    })).toBe(false);
  });

  it('maps duplicate-care warning keys only for product-approved care buckets', () => {
    expect(
      Object.fromEntries(
        quickLogTrackerIds.map((trackerId) => [
          trackerId,
          getQuickLogDuplicateCareWarningKey(trackerId),
        ]),
      ),
    ).toEqual({
      potty_pee_outside: 'potty_pee_outside',
      potty_pee_inside: null,
      potty_poop: 'potty_poop',
      feeding_meal: 'feeding_meal',
      sleep_nap: null,
      zoomies: null,
      training: null,
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
