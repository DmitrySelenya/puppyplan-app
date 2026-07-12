import type { EventType, JsonValue } from './supabase';
import {
  expandOccurrencesForDay,
  getReminderLinkFromPayload,
  type PlannedSlot,
  type ReminderForExpansion,
} from './reminders';

export type DiaryDayFact = Readonly<{
  clientEventId: string;
  eventType: EventType;
  occurredAt: string;
  payload: Readonly<Record<string, JsonValue>>;
}>;

export type DiaryPlannedStatus = 'upcoming' | 'past-unmarked' | 'done';

export type DiaryPlannedItem = PlannedSlot & Readonly<{
  actualAt?: string;
  clientEventId?: string;
  displayAt: string;
  kind: 'planned';
  plannedAt: string;
  status: DiaryPlannedStatus;
}>;

export type DiaryFactItem = Readonly<{
  clientEventId: string;
  displayAt: string;
  eventType: EventType;
  kind: 'fact';
  occurredAt: string;
  payload: Readonly<Record<string, JsonValue>>;
}>;

export type DiaryDayItem = DiaryPlannedItem | DiaryFactItem;

export type DiaryDayModel = Readonly<{
  day: string;
  items: readonly DiaryDayItem[];
  timeZone: string;
}>;

export type BuildDiaryDayModelInput = Readonly<{
  day: string;
  facts: readonly DiaryDayFact[];
  nowMs: number;
  reminders: readonly ReminderForExpansion[];
  timeZone: string;
}>;

/**
 * Deterministic plan/fact projection for one local calendar day.
 *
 * Only an explicit reminder_link completes a planned slot. A linked fact is represented by the
 * planned row (with both planned and actual instants), while every unlinked fact remains a
 * spontaneous row. Past state is derived from `nowMs`; it is never persisted.
 */
export function buildDiaryDayModel(input: BuildDiaryDayModelInput): DiaryDayModel {
  const slots = expandOccurrencesForDay({
    day: input.day,
    reminders: input.reminders,
    timeZone: input.timeZone,
  });
  const facts = input.facts
    .filter((fact) => calendarDayInTimeZone(fact.occurredAt, input.timeZone) === input.day)
    .slice()
    .sort(compareFacts);
  const linkedFactBySlot = new Map<string, DiaryDayFact>();
  const spontaneousFacts: DiaryDayFact[] = [];

  for (const fact of facts) {
    const link = getReminderLinkFromPayload(fact.payload);

    if (link === null) {
      spontaneousFacts.push(fact);
      continue;
    }

    const key = slotKey(link.reminderId, link.scheduledFor);
    if (!linkedFactBySlot.has(key)) {
      linkedFactBySlot.set(key, fact);
    }
  }

  const plannedItems: DiaryPlannedItem[] = slots.map((slot) => {
    const linkedFact = linkedFactBySlot.get(slotKey(slot.reminderId, slot.scheduledFor));

    if (linkedFact !== undefined) {
      return {
        ...slot,
        actualAt: linkedFact.occurredAt,
        clientEventId: linkedFact.clientEventId,
        displayAt: slot.scheduledFor,
        kind: 'planned',
        plannedAt: slot.scheduledFor,
        status: 'done',
      };
    }

    return {
      ...slot,
      displayAt: slot.scheduledFor,
      kind: 'planned',
      plannedAt: slot.scheduledFor,
      status: Date.parse(slot.scheduledFor) < input.nowMs ? 'past-unmarked' : 'upcoming',
    };
  });
  const factItems: DiaryFactItem[] = spontaneousFacts.map((fact) => ({
    clientEventId: fact.clientEventId,
    displayAt: fact.occurredAt,
    eventType: fact.eventType,
    kind: 'fact',
    occurredAt: fact.occurredAt,
    payload: fact.payload,
  }));

  return {
    day: input.day,
    items: [...plannedItems, ...factItems].sort(compareItems),
    timeZone: input.timeZone,
  };
}

function compareFacts(left: DiaryDayFact, right: DiaryDayFact): number {
  return left.occurredAt.localeCompare(right.occurredAt)
    || left.clientEventId.localeCompare(right.clientEventId);
}

function compareItems(left: DiaryDayItem, right: DiaryDayItem): number {
  return left.displayAt.localeCompare(right.displayAt)
    || itemStableKey(left).localeCompare(itemStableKey(right));
}

function itemStableKey(item: DiaryDayItem): string {
  return item.kind === 'planned'
    ? `0|${item.reminderId}|${item.scheduledFor}`
    : `1|${item.clientEventId}`;
}

function slotKey(reminderId: string, scheduledFor: string): string {
  return `${reminderId}|${scheduledFor}`;
}

const dayFormatterCache = new Map<string, Intl.DateTimeFormat>();

function calendarDayInTimeZone(timestamp: string, timeZone: string): string {
  let formatter = dayFormatterCache.get(timeZone);

  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone,
      year: 'numeric',
    });
    dayFormatterCache.set(timeZone, formatter);
  }

  const parts = formatter.formatToParts(new Date(timestamp));
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}
