import {
  createQuickLogRecentEvents,
} from '@/features/quick-log/screens/QuickLogShell';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';

function createCachedRow(
  overrides: Partial<QuickLogCachedEventRow> = {},
): QuickLogCachedEventRow {
  return {
    id: '00000000-0000-4000-8000-000000008101',
    household_id: '00000000-0000-4000-8000-000000008102',
    puppy_id: '00000000-0000-4000-8000-000000008103',
    created_by: '00000000-0000-4000-8000-000000008104',
    client_event_id: 'evt_00000000-0000-4000-8000-000000008105',
    created_at: '2026-06-09T08:00:00.000Z',
    deleted_at: null,
    event_type: 'feeding',
    occurred_at: '2026-06-09T08:00:00.000Z',
    payload: {
      amount: 'meal',
    },
    payload_version: 1,
    updated_at: '2026-06-09T08:00:00.000Z',
    version: 1,
    ...overrides,
  };
}

describe('createQuickLogRecentEvents', () => {
  it('returns newest non-deleted duplicate-warning candidates first', () => {
    expect(createQuickLogRecentEvents([
      createCachedRow({
        client_event_id: 'evt_00000000-0000-4000-8000-000000008201',
        occurred_at: '2026-06-09T08:00:00.000Z',
      }),
      createCachedRow({
        client_event_id: 'evt_00000000-0000-4000-8000-000000008202',
        occurred_at: '2026-06-09T08:00:40.000Z',
      }),
      createCachedRow({
        client_event_id: 'evt_00000000-0000-4000-8000-000000008203',
        deleted_at: '2026-06-09T08:00:45.000Z',
        occurred_at: '2026-06-09T08:00:45.000Z',
      }),
      createCachedRow({
        client_event_id: 'evt_00000000-0000-4000-8000-000000008204',
        event_type: 'health_record_reference',
        occurred_at: '2026-06-09T08:00:50.000Z',
      }),
      createCachedRow({
        client_event_id: 'evt_00000000-0000-4000-8000-000000008205',
        event_type: 'sleep',
        occurred_at: 'not-a-timestamp',
        payload: {
          duration_minutes: 30,
        },
      }),
    ])).toEqual([
      {
        occurredAtMs: Date.parse('2026-06-09T08:00:40.000Z'),
        trackerId: 'feeding',
      },
      {
        occurredAtMs: Date.parse('2026-06-09T08:00:00.000Z'),
        trackerId: 'feeding',
      },
    ]);
  });

  it('AC-2: preserves potty subtype payloads for duplicate-care checks', () => {
    expect(createQuickLogRecentEvents([
      createCachedRow({
        event_type: 'potty',
        occurred_at: '2026-06-09T08:00:00.000Z',
        payload: {
          subtype: 'outside',
        },
      }),
      createCachedRow({
        client_event_id: 'evt_00000000-0000-4000-8000-000000008301',
        event_type: 'potty',
        occurred_at: '2026-06-09T08:01:00.000Z',
        payload: {
          subtype: 'inside',
        },
      }),
    ])).toEqual([
      {
        occurredAtMs: Date.parse('2026-06-09T08:01:00.000Z'),
        payload: {
          subtype: 'inside',
        },
        trackerId: 'potty',
      },
      {
        occurredAtMs: Date.parse('2026-06-09T08:00:00.000Z'),
        payload: {
          subtype: 'outside',
        },
        trackerId: 'potty',
      },
    ]);
  });
});
