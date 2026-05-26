import { quickLogTrackerDefinitions } from '@/contracts/quick-log';
import { getQuickLogInvalidationKeys, queryKeys } from '@/lib/query/keys';

const householdId = '00000000-0000-4000-8000-000000000001';
const puppyId = '00000000-0000-4000-8000-000000000002';
const shareLinkId = '00000000-0000-4000-8000-000000000003';

describe('query key factory', () => {
  it('centralizes Today, Timeline, puppy summary, duplicate source, reminders, and sharing keys', () => {
    expect(queryKeys.today.dashboard(householdId, puppyId, '2026-05-26')).toEqual([
      'today',
      householdId,
      puppyId,
      '2026-05-26',
    ]);
    expect(queryKeys.events.timeline(householdId, puppyId, {
      to: '2026-05-26',
      from: '2026-05-01',
      eventTypes: ['potty', 'feeding'],
    })).toEqual([
      'events',
      householdId,
      puppyId,
      'timeline',
      {
        from: '2026-05-01',
        to: '2026-05-26',
        eventTypes: ['feeding', 'potty'],
      },
    ]);
    expect(queryKeys.puppy.detail(puppyId)).toEqual([
      'puppy',
      puppyId,
    ]);
    expect(queryKeys.puppy.summary(householdId, puppyId)).toEqual([
      'puppy',
      householdId,
      puppyId,
      'summary',
    ]);
    expect(queryKeys.events.duplicateWarningSource(householdId, puppyId, 'feeding')).toEqual([
      'events',
      householdId,
      puppyId,
      'duplicate-warning-source',
      'feeding',
    ]);
    expect(queryKeys.reminders.list(householdId, puppyId)).toEqual([
      'reminders',
      householdId,
      puppyId,
    ]);
    expect(queryKeys.sharing.list(householdId, puppyId)).toEqual([
      'sharing',
      householdId,
      puppyId,
      'list',
    ]);
    expect(queryKeys.sharing.preview(shareLinkId)).toEqual([
      'sharing',
      'preview',
      shareLinkId,
    ]);
    expect(() => queryKeys.sharing.preview('raw-share-token')).toThrow();
    expect(queryKeys.sharing.projection(householdId, puppyId, 'routine_summary')).toEqual([
      'sharing',
      householdId,
      puppyId,
      'projection',
      'routine_summary',
    ]);
  });

  it('normalizes empty Timeline filters to a stable key segment', () => {
    expect(queryKeys.events.timeline(householdId, puppyId)).toEqual([
      'events',
      householdId,
      puppyId,
      'timeline',
      {},
    ]);
    expect(queryKeys.events.timeline(householdId, puppyId, {
      eventTypes: [],
      from: '',
      to: '',
      cursor: 'cursor-1',
    })).toEqual([
      'events',
      householdId,
      puppyId,
      'timeline',
      {
        cursor: 'cursor-1',
      },
    ]);
    expect(queryKeys.events.timeline(householdId, puppyId, {
      from: '',
      to: '',
      eventTypes: [],
      cursor: '',
    })).toEqual([
      'events',
      householdId,
      puppyId,
      'timeline',
      {},
    ]);
    expect(queryKeys.events.timeline(householdId, puppyId, {
      eventTypes: ['potty', 'feeding', 'potty'],
    })).toEqual([
      'events',
      householdId,
      puppyId,
      'timeline',
      {
        eventTypes: ['feeding', 'potty'],
      },
    ]);
  });
});

describe('Quick Log invalidation map', () => {
  it('covers exactly the documented Quick Log invalidation keys for every event type', () => {
    const quickLogEventTypes = [
      ...new Set(
        Object.values(quickLogTrackerDefinitions).map((definition) => definition.event_type),
      ),
    ];

    expect(quickLogEventTypes).toEqual([
      'potty',
      'feeding',
      'sleep',
      'zoomies',
      'training',
    ]);

    for (const eventType of quickLogEventTypes) {
      expect(getQuickLogInvalidationKeys({
        householdId,
        puppyId,
        eventType,
        todayDate: '2026-05-26',
      })).toEqual([
        ['today', householdId, puppyId, '2026-05-26'],
        ['events', householdId, puppyId, 'timeline'],
        ['puppy', householdId, puppyId, 'summary'],
        ['events', householdId, puppyId, 'duplicate-warning-source', eventType],
      ]);
    }
  });
});
