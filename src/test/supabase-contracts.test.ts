import {
  activePuppyProfileSchema,
  createInviteRequestSchema,
  createShareLinkRequestSchema,
  dateSchema,
  devicePushTokenSchema,
  eventLogInsertSchema,
  eventLogRecordSchema,
  eventTypes,
  householdMembershipRoles,
  minimalQuickLogQueueItemSchema,
  puppyQuickTrackerIds,
  puppyQuickTrackerIdsSchema,
  puppyProfileSchema,
  shareScopeRecordSchema,
  shareScopes,
  supabaseMvpTableNames,
  type EventLogInsert,
  type EventLogRecord,
} from '@/contracts/supabase';
import { defaultQuickLogTrackerIds } from '@/contracts/quick-log';

const uuidA = '00000000-0000-4000-8000-000000000001';
const uuidB = '00000000-0000-4000-8000-000000000002';
const uuidC = '00000000-0000-4000-8000-000000000003';

describe('Supabase contract vocabulary', () => {
  it('keeps household roles separate from scoped trainer sharing', () => {
    expect(householdMembershipRoles).toEqual(['owner', 'caregiver', 'viewer']);
    expect(householdMembershipRoles).not.toContain('trainer_viewer');
  });

  it('matches the MVP event type and share scope vocabulary', () => {
    expect(eventTypes).toEqual([
      'potty',
      'feeding',
      'sleep',
      'observation',
      'walk',
      'zoomies',
      'training',
      'health_record_reference',
    ]);

    expect(shareScopes).toEqual([
      'routine_summary',
      'selected_timeline_range',
      'training_notes',
      'health_summary',
      'puppy_profile',
    ]);
  });
});

describe('event log contracts', () => {
  const validEvent = {
    puppy_id: uuidA,
    household_id: uuidB,
    created_by: uuidC,
    client_event_id: 'evt_00000000-0000-4000-8000-000000000004',
    event_type: 'potty',
    occurred_at: '2026-05-17T08:32:00.000Z',
    payload_version: 1,
    payload: {
      subtype: 'outside',
    },
  } satisfies EventLogInsert;

  it('accepts event inserts with idempotency and payload version fields', () => {
    expect(eventLogInsertSchema.safeParse(validEvent).success).toBe(true);
  });

  it('exports and parses confirmed event log records separately from inserts', () => {
    const record: EventLogRecord = {
      id: '00000000-0000-4000-8000-000000000007',
      ...validEvent,
      version: 1,
      deleted_at: null,
      created_at: '2026-05-17T08:32:01.000Z',
      updated_at: '2026-05-17T08:32:01.000Z',
    };

    expect(eventLogRecordSchema.safeParse(record).success).toBe(true);
  });

  it('rejects missing idempotency key and accepts the version-2 boundary', () => {
    expect(
      eventLogInsertSchema.safeParse({
        ...validEvent,
        client_event_id: undefined,
      }).success,
    ).toBe(false);

    expect(eventLogInsertSchema.safeParse({
      ...validEvent,
      payload_version: 2,
      payload: { subtype: 'outside' },
    }).success).toBe(true);
  });

  it('rejects event types outside the PRD MVP enum', () => {
    expect(
      eventLogInsertSchema.safeParse({
        ...validEvent,
        event_type: 'weight',
      }).success,
    ).toBe(false);
  });

  it('AC-4: accepts canonical potty and walk payloads and rejects legacy quick_action', () => {
    expect(
      eventLogInsertSchema.safeParse({
        ...validEvent,
        payload: {
          subtype: 'inside',
        },
      }).success,
    ).toBe(true);

    expect(
      eventLogInsertSchema.safeParse({
        ...validEvent,
        payload: {
          subtype: 'poop',
        },
      }).success,
    ).toBe(true);

    expect(
      eventLogInsertSchema.safeParse({
        ...validEvent,
        event_type: 'walk',
        payload: {},
      }).success,
    ).toBe(true);

    expect(
      eventLogInsertSchema.safeParse({
        ...validEvent,
        event_type: 'walk',
        payload: {
          duration_minutes: 22,
        },
      }).success,
    ).toBe(true);

    expect(
      eventLogInsertSchema.safeParse({
        ...validEvent,
        payload: {
          quick_action: 'pee_outside',
        },
      }).success,
    ).toBe(false);

    expect(
      eventLogInsertSchema.safeParse({
        ...validEvent,
        event_type: 'walk',
        payload: {
          duration_minutes: 0,
        },
      }).success,
    ).toBe(false);
  });

  it('rejects payload fields outside the event-specific contract', () => {
    expect(
      eventLogInsertSchema.safeParse({
        ...validEvent,
        payload: {
          subtype: 'outside',
          notes: 'free text must not cross the Quick Log trust boundary',
        },
      }).success,
    ).toBe(false);

    expect(
      eventLogInsertSchema.safeParse({
        ...validEvent,
        event_type: 'training',
        payload: {
          topic: 'recall',
          duration_bucket: 'short',
        },
      }).success,
    ).toBe(true);
  });
});

describe('Quick Log queue contract boundary', () => {
  it('represents the minimal queue item as local-only, not a Supabase table', () => {
    expect(minimalQuickLogQueueItemSchema.safeParse({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000005',
      household_id: uuidB,
      puppy_id: uuidA,
      event_type: 'feeding',
      payload_version: 1,
      payload: { amount: 'meal' },
      occurred_at: '2026-05-17T08:35:00.000Z',
      state: 'pending_local',
      retry_count: 0,
      created_at: '2026-05-17T08:35:00.000Z',
      updated_at: '2026-05-17T08:35:00.000Z',
    }).success).toBe(true);

    expect(supabaseMvpTableNames).not.toContain('minimal_quick_log_queue_item');
  });

  it('rejects private notes in the durable Quick Log queue payload', () => {
    expect(minimalQuickLogQueueItemSchema.safeParse({
      client_event_id: 'evt_00000000-0000-4000-8000-000000000006',
      household_id: uuidB,
      puppy_id: uuidA,
      event_type: 'feeding',
      payload_version: 1,
      payload: {
        amount: 'meal',
        notes: 'do not persist free text in the local queue',
      },
      occurred_at: '2026-05-17T08:35:00.000Z',
      state: 'pending_local',
      retry_count: 0,
      created_at: '2026-05-17T08:35:00.000Z',
      updated_at: '2026-05-17T08:35:00.000Z',
    }).success).toBe(false);
  });
});

describe('profile, token, and share refinements', () => {
  it('AC-1: keeps puppy selected quick tracker ids canonical and Health-only weight excluded', () => {
    expect(puppyQuickTrackerIds).toEqual(['potty', 'feeding', 'sleep', 'walk', 'zoomies']);
    expect(puppyQuickTrackerIdsSchema.safeParse(defaultQuickLogTrackerIds).success).toBe(true);

    for (const rejectedTrackerId of [
      'weight',
      'training',
      'potty_pee_outside',
      'potty_pee_inside',
      'potty_poop',
      'feeding_meal',
      'sleep_nap',
    ]) {
      expect(puppyQuickTrackerIdsSchema.safeParse([rejectedTrackerId]).success).toBe(false);
    }
  });

  it('requires puppy profiles to include either birth date or age estimate', () => {
    const profile = {
      id: uuidA,
      household_id: uuidB,
      name: 'Puppy',
      birth_date: null,
      age_weeks_estimate: 12,
      quick_tracker_ids: defaultQuickLogTrackerIds,
      created_at: '2026-05-17T08:35:00.000Z',
      updated_at: '2026-05-17T08:35:00.000Z',
      deleted_at: null,
    };

    expect(puppyProfileSchema.safeParse(profile).success).toBe(true);
    expect(puppyProfileSchema.safeParse({
      ...profile,
      birth_date: null,
      age_weeks_estimate: null,
    }).success).toBe(false);
  });

  it('keeps selected quick trackers on puppy profile rows capped and unique', () => {
    const profile = {
      id: uuidA,
      household_id: uuidB,
      name: 'Puppy',
      birth_date: null,
      age_weeks_estimate: 12,
      quick_tracker_ids: ['feeding', 'walk'],
      created_at: '2026-05-17T08:35:00.000Z',
      updated_at: '2026-05-17T08:35:00.000Z',
      deleted_at: null,
    };

    expect(puppyProfileSchema.safeParse(profile).success).toBe(true);
    expect(puppyProfileSchema.safeParse({
      ...profile,
      quick_tracker_ids: ['feeding', 'feeding'],
    }).success).toBe(false);
    expect(puppyProfileSchema.safeParse({
      ...profile,
      quick_tracker_ids: [],
    }).success).toBe(false);
    expect(puppyProfileSchema.safeParse({
      ...profile,
      quick_tracker_ids: [
        ...defaultQuickLogTrackerIds,
        'weight',
      ],
    }).success).toBe(false);
  });

  it('adds current household role only to active puppy profile boundary results', () => {
    const activeProfile = {
      id: uuidA,
      household_id: uuidB,
      household_role: 'caregiver',
      name: 'Puppy',
      birth_date: null,
      age_weeks_estimate: 12,
      quick_tracker_ids: ['feeding', 'walk'],
      created_at: '2026-05-17T08:35:00.000Z',
      updated_at: '2026-05-17T08:35:00.000Z',
      deleted_at: null,
    };

    expect(activePuppyProfileSchema.safeParse(activeProfile).success).toBe(true);
    expect(activePuppyProfileSchema.safeParse({
      ...activeProfile,
      household_role: 'trainer_viewer',
    }).success).toBe(false);
    expect(puppyProfileSchema.safeParse(activeProfile).success).toBe(false);
  });

  it('requires at least one push token value for a device token record', () => {
    const token = {
      id: uuidA,
      user_id: uuidB,
      device_id: 'device-1',
      platform: 'ios',
      expo_push_token: 'ExponentPushToken[synthetic]',
      apns_token: null,
      fcm_token: null,
      enabled: true,
      last_seen_at: '2026-05-17T08:35:00.000Z',
      revoked_at: null,
      created_at: '2026-05-17T08:35:00.000Z',
      updated_at: '2026-05-17T08:35:00.000Z',
    };

    expect(devicePushTokenSchema.safeParse(token).success).toBe(true);
    expect(devicePushTokenSchema.safeParse({
      ...token,
      expo_push_token: null,
      apns_token: null,
      fcm_token: null,
    }).success).toBe(false);
  });

  it('AC-P2-SHARE-1: accepts a selected timeline record with explicit event types and ordered dates', () => {
    const scope = {
      id: uuidA,
      share_link_id: uuidB,
      scope: 'selected_timeline_range',
      timeline_from: '2026-05-17',
      timeline_to: '2026-05-24',
      selected_event_types: ['training'],
      created_at: '2026-05-17T08:35:00.000Z',
    };

    expect(shareScopeRecordSchema.safeParse(scope).success).toBe(true);
  });

  it('AC-P2-SHARE-1: keeps reversed dates invalid for selected timeline records', () => {
    const scope = {
      id: uuidA,
      share_link_id: uuidB,
      scope: 'selected_timeline_range',
      timeline_from: '2026-05-25',
      timeline_to: '2026-05-24',
      selected_event_types: ['training'],
      created_at: '2026-05-17T08:35:00.000Z',
    };

    expect(shareScopeRecordSchema.safeParse(scope).success).toBe(false);
  });

  it('AC-P2-SHARE-1: rejects a selected timeline record with null selected event types', () => {
    expect(shareScopeRecordSchema.safeParse({
      id: uuidA,
      share_link_id: uuidB,
      scope: 'selected_timeline_range',
      timeline_from: '2026-05-17',
      timeline_to: '2026-05-24',
      selected_event_types: null,
      created_at: '2026-05-17T08:35:00.000Z',
    }).success).toBe(false);
  });

  it('AC-P2-SHARE-1: rejects a selected timeline record with empty selected event types', () => {
    expect(shareScopeRecordSchema.safeParse({
      id: uuidA,
      share_link_id: uuidB,
      scope: 'selected_timeline_range',
      timeline_from: '2026-05-17',
      timeline_to: '2026-05-24',
      selected_event_types: [],
      created_at: '2026-05-17T08:35:00.000Z',
    }).success).toBe(false);
  });

  it('AC-P2-SHARE-1: keeps null selected event types valid for another share scope', () => {
    expect(shareScopeRecordSchema.safeParse({
      id: uuidA,
      share_link_id: uuidB,
      scope: 'routine_summary',
      timeline_from: null,
      timeline_to: null,
      selected_event_types: null,
      created_at: '2026-05-17T08:35:00.000Z',
    }).success).toBe(true);
  });

  it('rejects invalid calendar dates instead of accepting regex-only matches', () => {
    expect(dateSchema.safeParse('2026-05-24').success).toBe(true);
    expect(dateSchema.safeParse('2026-13-40').success).toBe(false);
  });
});

describe('privileged invite and share contracts', () => {
  it('keeps household invite creation free of raw token fields', () => {
    const result = createInviteRequestSchema.safeParse({
      household_id: uuidB,
      role: 'caregiver',
      recipient_email_hash: 'sha256:recipient-hash',
      expires_at: '2026-05-24T23:59:59.000Z',
    });

    expect(result.success).toBe(true);
    expect(createInviteRequestSchema.safeParse({
      household_id: uuidB,
      role: 'owner',
      token_hash: 'sha256:token-hash',
      token_last4: '1234',
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(false);

    expect(createInviteRequestSchema.safeParse({
      household_id: uuidB,
      role: 'owner',
      recipient_email_hash: 'sha256:recipient-hash',
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(false);
  });

  it('requires trainer shares to use whitelisted scopes and expiry', () => {
    expect(createShareLinkRequestSchema.safeParse({
      household_id: uuidB,
      puppy_id: uuidA,
      role: 'trainer_viewer',
      scopes: [{ scope: 'routine_summary' }, { scope: 'training_notes' }],
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(true);

    expect(createShareLinkRequestSchema.safeParse({
      household_id: uuidB,
      puppy_id: uuidA,
      role: 'trainer_viewer',
      scopes: [{ scope: 'billing' }],
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(false);
  });

  it('requires selected timeline share requests to include an ordered date range', () => {
    expect(createShareLinkRequestSchema.safeParse({
      household_id: uuidB,
      puppy_id: uuidA,
      role: 'trainer_viewer',
      scopes: [{ scope: 'selected_timeline_range' }],
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(false);
  });

  it('AC-P2-SHARE-1: accepts a selected timeline request with explicit event types and ordered dates', () => {
    expect(createShareLinkRequestSchema.safeParse({
      household_id: uuidB,
      puppy_id: uuidA,
      role: 'trainer_viewer',
      scopes: [{
        scope: 'selected_timeline_range',
        timeline_from: '2026-05-17',
        timeline_to: '2026-05-24',
        selected_event_types: ['training'],
      }],
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(true);
  });

  it('AC-P2-SHARE-1: rejects a selected timeline request that omits selected event types', () => {
    expect(createShareLinkRequestSchema.safeParse({
      household_id: uuidB,
      puppy_id: uuidA,
      role: 'trainer_viewer',
      scopes: [{
        scope: 'selected_timeline_range',
        timeline_from: '2026-05-17',
        timeline_to: '2026-05-24',
      }],
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(false);
  });

  it('AC-P2-SHARE-1: rejects a selected timeline request with null selected event types', () => {
    expect(createShareLinkRequestSchema.safeParse({
      household_id: uuidB,
      puppy_id: uuidA,
      role: 'trainer_viewer',
      scopes: [{
        scope: 'selected_timeline_range',
        timeline_from: '2026-05-17',
        timeline_to: '2026-05-24',
        selected_event_types: null,
      }],
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(false);
  });

  it('AC-P2-SHARE-1: rejects a selected timeline request with empty selected event types', () => {
    expect(createShareLinkRequestSchema.safeParse({
      household_id: uuidB,
      puppy_id: uuidA,
      role: 'trainer_viewer',
      scopes: [{
        scope: 'selected_timeline_range',
        timeline_from: '2026-05-17',
        timeline_to: '2026-05-24',
        selected_event_types: [],
      }],
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(false);
  });

  it('AC-P2-SHARE-1: keeps unknown event types invalid for selected timeline requests', () => {
    expect(createShareLinkRequestSchema.safeParse({
      household_id: uuidB,
      puppy_id: uuidA,
      role: 'trainer_viewer',
      scopes: [{
        scope: 'selected_timeline_range',
        timeline_from: '2026-05-17',
        timeline_to: '2026-05-24',
        selected_event_types: ['unknown_event'],
      }],
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(false);
  });

  it('AC-P2-SHARE-1: keeps reversed dates invalid for selected timeline requests', () => {
    expect(createShareLinkRequestSchema.safeParse({
      household_id: uuidB,
      puppy_id: uuidA,
      role: 'trainer_viewer',
      scopes: [{
        scope: 'selected_timeline_range',
        timeline_from: '2026-05-25',
        timeline_to: '2026-05-24',
        selected_event_types: ['training'],
      }],
      expires_at: '2026-05-24T23:59:59.000Z',
    }).success).toBe(false);
  });
});
