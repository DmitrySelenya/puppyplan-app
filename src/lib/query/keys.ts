import { uuidSchema, type EventType, type ShareScope } from '@/contracts/supabase';

export type TimelineFilters = Readonly<{
  from?: string;
  to?: string;
  eventTypes?: readonly EventType[];
  cursor?: string;
}>;

export type QuickLogInvalidationInput = Readonly<{
  householdId: string;
  puppyId: string;
  eventType: EventType;
  todayDate: string;
}>;

export const queryKeys = {
  puppy: {
    detail: (puppyId: string) => ['puppy', puppyId] as const,
    summary: (householdId: string, puppyId: string) =>
      ['puppy', householdId, puppyId, 'summary'] as const,
  },
  today: {
    dashboard: (householdId: string, puppyId: string, date: string) =>
      ['today', householdId, puppyId, date] as const,
  },
  events: {
    timelineRoot: getEventsTimelineRootKey,
    timeline: (householdId: string, puppyId: string, filters: TimelineFilters = {}) =>
      [...getEventsTimelineRootKey(householdId, puppyId), normalizeTimelineFilters(filters)] as const,
    duplicateWarningSource: (householdId: string, puppyId: string, eventType: EventType) =>
      ['events', householdId, puppyId, 'duplicate-warning-source', eventType] as const,
  },
  reminders: {
    list: (householdId: string, puppyId: string) =>
      ['reminders', householdId, puppyId] as const,
  },
  sharing: {
    list: (householdId: string, puppyId: string) =>
      ['sharing', householdId, puppyId, 'list'] as const,
    preview: (shareLinkId: string) => [
      'sharing',
      'preview',
      // Share-link ids only; never put raw invite/share tokens in cache keys.
      uuidSchema.parse(shareLinkId),
    ] as const,
    projection: (householdId: string, puppyId: string, scope: ShareScope) =>
      ['sharing', householdId, puppyId, 'projection', scope] as const,
  },
} as const;

export function getQuickLogInvalidationKeys(input: QuickLogInvalidationInput) {
  return [
    queryKeys.today.dashboard(input.householdId, input.puppyId, input.todayDate),
    queryKeys.events.timelineRoot(input.householdId, input.puppyId),
    queryKeys.puppy.summary(input.householdId, input.puppyId),
    queryKeys.events.duplicateWarningSource(input.householdId, input.puppyId, input.eventType),
  ] as const;
}

function getEventsTimelineRootKey(householdId: string, puppyId: string) {
  return ['events', householdId, puppyId, 'timeline'] as const;
}

function normalizeTimelineFilters(filters: TimelineFilters): TimelineFilters {
  const normalized: {
    from?: string;
    to?: string;
    eventTypes?: EventType[];
    cursor?: string;
  } = {};

  if (isNonEmptyString(filters.from)) {
    normalized.from = filters.from;
  }

  if (isNonEmptyString(filters.to)) {
    normalized.to = filters.to;
  }

  if (filters.eventTypes !== undefined && filters.eventTypes.length > 0) {
    normalized.eventTypes = [...new Set(filters.eventTypes)].sort();
  }

  if (isNonEmptyString(filters.cursor)) {
    normalized.cursor = filters.cursor;
  }

  return normalized;
}

function isNonEmptyString(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}
