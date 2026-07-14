import { i18n, t } from '@/lib/i18n';
import { createQuickLogEventView } from '@/lib/query/quick-log-event-view';
import type { QuickLogCachedEventRow } from '@/lib/query/quick-log';

const householdId = '00000000-0000-4000-8000-000000001701';
const puppyId = '00000000-0000-4000-8000-000000001702';
const createdBy = '00000000-0000-4000-8000-000000001703';
const todayDate = '2026-05-27';

describe('Quick Log event view model', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('returns null for non-Quick-Log rows and malformed Quick Log payloads', () => {
    expect(createQuickLogEventView(createRow({
      event_type: 'health_record_reference',
      payload: {
        health_record_id: '00000000-0000-4000-8000-000000001704',
      },
    }), {
      t,
      todayDate,
    })).toBeNull();
    expect(createQuickLogEventView(createRow({
      event_type: 'potty',
      payload: {
        quick_action: 'unsupported',
      },
    }), {
      t,
      todayDate,
    })).toBeNull();
  });

  it('formats event time with the supplied locale', () => {
    const event = createQuickLogEventView(createRow(), {
      locale: 'ru',
      t,
      todayDate,
    });

    if (event === null) {
      throw new Error('Expected feeding row to produce a Quick Log event view');
    }

    expect(event.occurredAtLabel).toBe(
      new Intl.DateTimeFormat('ru', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date('2026-05-27T08:00:00.000Z')),
    );
  });

  it('formats event time with the platform locale when no locale is supplied', () => {
    const event = createQuickLogEventView(createRow(), {
      t,
      todayDate,
    });

    if (event === null) {
      throw new Error('Expected feeding row to produce a Quick Log event view');
    }

    expect(event.occurredAtLabel).toBe(
      new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date('2026-05-27T08:00:00.000Z')),
    );
  });

  it('keeps valid edited feeding detail rows visible', () => {
    for (const amount of ['snack', 'water'] as const) {
      const event = createQuickLogEventView(createRow({
        payload: {
          amount,
        },
      }), {
        t,
        todayDate,
      });

      expect(event).toMatchObject({
        eventType: 'feeding',
        title: i18n.t('quick-log.trackers.feeding'),
      });
    }
  });

  it.each([
    [
      'training',
      { topic: 'settling', duration_bucket: 'short', note: 'Synthetic training note' },
      'quick-log.details.tabs.training',
    ],
    [
      'observation',
      { title: 'Calm greeting', note: 'Synthetic observation note' },
      null,
    ],
  ] as const)('AC-P33-READ exposes the canonical title and private note for authenticated %s readback', (
    eventType,
    payload,
    titleKey,
  ) => {
    const event = createQuickLogEventView(createRow({
      event_type: eventType,
      payload_version: 2,
      payload,
    }), { t, todayDate });

    expect(event).toMatchObject({
      eventType,
      note: payload.note,
      title: titleKey === null ? 'Calm greeting' : i18n.t(titleKey),
    });
  });

  it.each([
    ['start', undefined, 'quick-log.details.sleep.action.start'],
    ['wake', undefined, 'quick-log.details.sleep.action.wake'],
    ['retrospective', 90, 'quick-log.details.sleep.action.retrospective'],
  ] as const)('AC-P33-SLEEP reads %s as an explicit sleep action', (
    action,
    durationMinutes,
    titleKey,
  ) => {
    const event = createQuickLogEventView(createRow({
      event_type: 'sleep',
      payload_version: 2,
      payload: {
        action,
        ...(durationMinutes === undefined ? {} : { duration_minutes: durationMinutes }),
        note: 'Synthetic sleep note',
      },
    }), { t, todayDate });

    expect(event).toMatchObject({
      ...(durationMinutes === undefined ? {} : { durationMinutes }),
      eventType: 'sleep',
      note: 'Synthetic sleep note',
      title: i18n.t(titleKey),
    });
  });
});

function createRow(
  overrides: Partial<QuickLogCachedEventRow> = {},
): QuickLogCachedEventRow {
  return {
    id: '00000000-0000-4000-8000-000000001705',
    household_id: householdId,
    puppy_id: puppyId,
    created_by: createdBy,
    client_event_id: 'evt_00000000-0000-4000-8000-000000001706',
    event_type: 'feeding',
    occurred_at: '2026-05-27T08:00:00.000Z',
    payload_version: 1,
    payload: {
      amount: 'meal',
    },
    version: 1,
    deleted_at: null,
    created_at: '2026-05-27T08:00:01.000Z',
    updated_at: '2026-05-27T08:00:01.000Z',
    ...overrides,
  };
}
