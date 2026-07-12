import { z } from 'zod';

import {
  dateSchema,
  reminderLinkPayloadSchema,
  timestampSchema,
  type JsonValue,
} from './supabase';

/**
 * Reminder schedule contracts (PUP-28).
 *
 * The routine template is the existing `reminder` row: `reminder_type` carries a canonical
 * tracker id and `schedule_rule` (jsonb) carries the shape validated here. No schema change —
 * legacy `{ repeat: 'daily', time }` rows parse as a subset (see reminders-contract.test.ts).
 *
 * Privacy: `note` is private user content. It stays inside the contract/DB payload and must
 * never be copied into logs or analytics.
 */

// Canonical routine taxonomy, shared with detailed Quick Log.
export const reminderTrackerIds = [
  'potty',
  'feeding',
  'sleep',
  'walk',
  'zoomies',
  'training',
  'observation',
] as const;
export const reminderTrackerIdSchema = z.enum(reminderTrackerIds);
export type ReminderTrackerId = z.infer<typeof reminderTrackerIdSchema>;

// Which trackers carry a meaningful scheduled amount, and in what unit. `null` = no amount.
export const reminderAmountUnitByTracker = {
  potty: null,
  feeding: 'g',
  sleep: 'min',
  walk: 'min',
  zoomies: null,
  training: null,
  observation: null,
} as const satisfies Record<ReminderTrackerId, 'g' | 'min' | null>;

export const reminderVariantIds = [
  'outside',
  'inside',
  'poop',
  'play',
  'training',
] as const;
export const reminderVariantSchema = z.enum(reminderVariantIds);
export type ReminderVariant = z.infer<typeof reminderVariantSchema>;

const reminderVariantsByTracker: Record<ReminderTrackerId, readonly ReminderVariant[]> = {
  potty: ['outside', 'inside', 'poop'],
  feeding: [],
  sleep: [],
  walk: [],
  zoomies: [],
  training: ['play', 'training'],
  observation: [],
};

export const reminderAmountUnits = ['g', 'min'] as const;
export const reminderAmountUnitSchema = z.enum(reminderAmountUnits);

// `H:mm` or `HH:mm`, 24-hour. Accepts the legacy single-digit-hour default ('7:30').
export const reminderTimeSchema = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, {
  message: 'time must be a 24-hour H:mm or HH:mm value',
});

// ISO weekday: 1 = Monday .. 7 = Sunday.
export const isoWeekdaySchema = z.number().int().min(1).max(7);

export const reminderCustomDaysRepeatSchema = z
  .object({
    days: z
      .array(isoWeekdaySchema)
      .min(1)
      .superRefine((days, context) => {
        if (new Set(days).size !== days.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'custom repeat days must be unique',
          });
        }
      }),
  })
  .strict();

export const reminderRepeatSchema = z.union([
  z.literal('never'),
  z.literal('daily'),
  z.literal('weekdays'),
  reminderCustomDaysRepeatSchema,
]);

export type ReminderRepeat = z.infer<typeof reminderRepeatSchema>;

export const reminderAmountSchema = z
  .object({
    value: z.number().positive(),
    unit: reminderAmountUnitSchema,
  })
  .strict();

export type ReminderAmount = z.infer<typeof reminderAmountSchema>;

export const REMINDER_NOTE_MAX_LENGTH = 500;
export const REMINDER_TITLE_MAX_LENGTH = 80;

export const scheduleRuleSchema = z
  .object({
    time: reminderTimeSchema,
    repeat: reminderRepeatSchema,
    date: dateSchema.optional(),
    amount: reminderAmountSchema.optional(),
    note: z.string().trim().min(1).max(REMINDER_NOTE_MAX_LENGTH).optional(),
    title: z.string().trim().min(1).max(REMINDER_TITLE_MAX_LENGTH).optional(),
    variant: reminderVariantSchema.optional(),
  })
  .strict()
  .superRefine((rule, context) => {
    const isOneOff = rule.repeat === 'never';

    if (isOneOff && rule.date === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'a one-off (repeat: never) rule requires a date',
        path: ['date'],
      });
    }

    if (!isOneOff && rule.date !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'a recurring rule must not carry a one-off date',
        path: ['date'],
      });
    }
  });

export type ScheduleRule = z.infer<typeof scheduleRuleSchema>;

export function parseScheduleRule(value: unknown): ScheduleRule {
  return scheduleRuleSchema.parse(value);
}

// Form-level draft: ties the tracker id to the rule and enforces amount meaningfulness.
export const reminderScheduleDraftSchema = z
  .object({
    trackerId: reminderTrackerIdSchema,
    rule: scheduleRuleSchema,
  })
  .strict()
  .superRefine((draft, context) => {
    const amount = draft.rule.amount;

    if (amount === undefined) {
      // Variant validation is independent from optional amount validation.
    } else {
      const expectedUnit = reminderAmountUnitByTracker[draft.trackerId];

      if (expectedUnit === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `amount is not meaningful for the ${draft.trackerId} tracker`,
          path: ['rule', 'amount'],
        });
      } else if (amount.unit !== expectedUnit) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `amount unit for ${draft.trackerId} must be ${expectedUnit}`,
          path: ['rule', 'amount', 'unit'],
        });
      }
    }

    const variant = draft.rule.variant;
    if (variant !== undefined && !reminderVariantsByTracker[draft.trackerId].includes(variant)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `variant ${variant} is not meaningful for the ${draft.trackerId} tracker`,
        path: ['rule', 'variant'],
      });
    }

    // Diary check-off materializes an observation fact, whose payload requires a title or note.
    if (
      draft.trackerId === 'observation'
      && draft.rule.title === undefined
      && draft.rule.note === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'an observation routine requires a title or note',
        path: ['rule', 'title'],
      });
    }
  });

export type ReminderScheduleDraft = z.infer<typeof reminderScheduleDraftSchema>;

// ---------------------------------------------------------------------------
// Occurrence expansion (Invariant 1): pure, deterministic, DST-correct.
// ---------------------------------------------------------------------------

export type ReminderForExpansion = Readonly<{
  id: string;
  trackerId: ReminderTrackerId;
  rule: ScheduleRule;
  enabled: boolean;
  deletedAt?: string | null;
}>;

export type PlannedSlot = Readonly<{
  reminderId: string;
  trackerId: ReminderTrackerId;
  scheduledFor: string;
  time: string;
  amount?: ReminderAmount;
  note?: string;
  title?: string;
  variant?: ReminderVariant;
}>;

export type ExpandOccurrencesInput = Readonly<{
  reminders: readonly ReminderForExpansion[];
  day: string;
  timeZone: string;
}>;

export function expandOccurrencesForDay(input: ExpandOccurrencesInput): PlannedSlot[] {
  const dayParts = parseCalendarDay(input.day);
  const isoWeekday = getIsoWeekday(dayParts);

  const slots: PlannedSlot[] = [];

  for (const reminder of input.reminders) {
    if (!reminder.enabled || (reminder.deletedAt ?? null) !== null) {
      continue;
    }

    if (!ruleFiresOnDay(reminder.rule, input.day, isoWeekday)) {
      continue;
    }

    const [hour, minute] = parseTimeParts(reminder.rule.time);
    const scheduledFor = zonedWallTimeToUtc(
      { ...dayParts, hour, minute },
      input.timeZone,
    ).toISOString();

    slots.push({
      reminderId: reminder.id,
      trackerId: reminder.trackerId,
      scheduledFor,
      time: reminder.rule.time,
      ...(reminder.rule.amount !== undefined ? { amount: reminder.rule.amount } : {}),
      ...(reminder.rule.note !== undefined ? { note: reminder.rule.note } : {}),
      ...(reminder.rule.title !== undefined ? { title: reminder.rule.title } : {}),
      ...(reminder.rule.variant !== undefined ? { variant: reminder.rule.variant } : {}),
    });
  }

  return slots.sort(comparePlannedSlots);
}

function comparePlannedSlots(a: PlannedSlot, b: PlannedSlot): number {
  if (a.scheduledFor !== b.scheduledFor) {
    return a.scheduledFor < b.scheduledFor ? -1 : 1;
  }

  if (a.reminderId === b.reminderId) {
    return 0;
  }

  return a.reminderId < b.reminderId ? -1 : 1;
}

function ruleFiresOnDay(rule: ScheduleRule, day: string, isoWeekday: number): boolean {
  if (rule.repeat === 'daily') {
    return true;
  }

  if (rule.repeat === 'weekdays') {
    return isoWeekday >= 1 && isoWeekday <= 5;
  }

  if (rule.repeat === 'never') {
    return rule.date === day;
  }

  return rule.repeat.days.includes(isoWeekday);
}

type CalendarDayParts = Readonly<{ year: number; month: number; day: number }>;

function parseCalendarDay(day: string): CalendarDayParts {
  const parsed = dateSchema.parse(day);
  const [year, month, dayOfMonth] = parsed.split('-').map((part) => Number.parseInt(part, 10));

  return { year, month, day: dayOfMonth };
}

function parseTimeParts(time: string): readonly [number, number] {
  const [hour, minute] = time.split(':').map((part) => Number.parseInt(part, 10));

  return [hour, minute];
}

function getIsoWeekday(parts: CalendarDayParts): number {
  // Weekday of a calendar date is timezone-independent; compute via a UTC anchor.
  const sundayZeroBased = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();

  return sundayZeroBased === 0 ? 7 : sundayZeroBased;
}

type WallTimeParts = CalendarDayParts & Readonly<{ hour: number; minute: number }>;

/**
 * Convert a wall-clock time in an IANA time zone to the corresponding UTC instant.
 * DST-correct via a two-pass offset resolution (guess UTC, measure the zone offset at that
 * guess, re-measure at the adjusted instant to settle transition days).
 */
function zonedWallTimeToUtc(wall: WallTimeParts, timeZone: string): Date {
  const guessUtcMs = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  const firstOffsetMs = getTimeZoneOffsetMs(guessUtcMs, timeZone);
  const adjustedMs = guessUtcMs - firstOffsetMs;
  const secondOffsetMs = getTimeZoneOffsetMs(adjustedMs, timeZone);

  const candidateMs = guessUtcMs - secondOffsetMs;

  if (wallTimeMatches(candidateMs, wall, timeZone)) {
    return new Date(candidateMs);
  }

  // A spring-forward gap has no exact instant. Select the first later real local wall time
  // (02:30 -> 03:00 for a one-hour gap), never an earlier occurrence.
  for (let deltaMinutes = 1; deltaMinutes <= 180; deltaMinutes += 1) {
    const shiftedMs = candidateMs + deltaMinutes * 60_000;
    const local = getWallTimeParts(shiftedMs, timeZone);

    if (
      local.year === wall.year
      && local.month === wall.month
      && local.day === wall.day
      && (local.hour > wall.hour || (local.hour === wall.hour && local.minute >= wall.minute))
    ) {
      return new Date(shiftedMs);
    }
  }

  return new Date(candidateMs);
}

function wallTimeMatches(utcMs: number, wall: WallTimeParts, timeZone: string): boolean {
  const local = getWallTimeParts(utcMs, timeZone);
  return local.year === wall.year
    && local.month === wall.month
    && local.day === wall.day
    && local.hour === wall.hour
    && local.minute === wall.minute;
}

function getWallTimeParts(utcMs: number, timeZone: string): WallTimeParts {
  const lookup: Record<string, string> = {};
  for (const part of getOffsetFormatter(timeZone).formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') lookup[part.type] = part.value;
  }
  return {
    year: Number(lookup.year), month: Number(lookup.month), day: Number(lookup.day),
    hour: Number(lookup.hour), minute: Number(lookup.minute),
  };
}

// ---------------------------------------------------------------------------
// Check-off (Option B, Invariant 3): a completion is an event_log fact linked to its
// slot via payload.reminder_link. Idempotence comes from a DETERMINISTIC client_event_id
// derived from (reminder_id, scheduled_for) + the existing event_log
// UNIQUE (household_id, client_event_id) constraint and the repository's 23505 dedupe.
// ---------------------------------------------------------------------------

export type ReminderLink = Readonly<{
  reminderId: string;
  scheduledFor: string;
}>;

const reminderLinkInputSchema = z
  .object({
    reminderId: z.string().uuid(),
    scheduledFor: timestampSchema,
  })
  .strict();

export function createReminderCheckOffClientEventId(link: ReminderLink): string {
  const parsed = reminderLinkInputSchema.parse(link);
  const bytes = deterministicBytes16(`reminder-checkoff|${parsed.reminderId}|${parsed.scheduledFor}`);

  // v4-shaped so quickLogClientEventIdSchema accepts it (version nibble 4, variant 10xx).
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

  return `evt_${[
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')}`;
}

export function getReminderLinkFromPayload(
  payload: Readonly<Record<string, JsonValue>>,
): ReminderLink | null {
  const parsed = reminderLinkPayloadSchema.safeParse(payload.reminder_link);

  if (!parsed.success) {
    return null;
  }

  return {
    reminderId: parsed.data.reminder_id,
    scheduledFor: parsed.data.scheduled_for,
  };
}

export type SlotStatus = 'upcoming' | 'done' | 'missed';

export type SlotWithStatus = PlannedSlot & Readonly<{
  status: SlotStatus;
}>;

export type ReminderLinkedFact = Readonly<{
  occurred_at: string;
  payload: Readonly<Record<string, JsonValue>>;
}>;

export type DeriveSlotStatusesInput = Readonly<{
  slots: readonly PlannedSlot[];
  facts: readonly ReminderLinkedFact[];
  nowMs: number;
}>;

// Missed is COMPUTED, never persisted (Locked Decision 4). Facts without a link are
// spontaneous logs and never satisfy a slot (auto-linking is an explicit non-goal).
export function deriveSlotStatuses(input: DeriveSlotStatusesInput): SlotWithStatus[] {
  const completedSlotKeys = new Set<string>();

  for (const fact of input.facts) {
    const link = getReminderLinkFromPayload(fact.payload);

    if (link !== null) {
      completedSlotKeys.add(slotKey(link.reminderId, link.scheduledFor));
    }
  }

  return input.slots.map((slot) => {
    if (completedSlotKeys.has(slotKey(slot.reminderId, slot.scheduledFor))) {
      return { ...slot, status: 'done' };
    }

    const scheduledMs = Date.parse(slot.scheduledFor);

    return {
      ...slot,
      status: scheduledMs < input.nowMs ? 'missed' : 'upcoming',
    };
  });
}

function slotKey(reminderId: string, scheduledFor: string): string {
  return `${reminderId}|${scheduledFor}`;
}

// FNV-1a over the key with four seed variants, finalized with an avalanche mix. Pure and
// deterministic (dedupe key derivation, not cryptography).
function deterministicBytes16(key: string): Uint8Array {
  const bytes = new Uint8Array(16);

  for (let chunk = 0; chunk < 4; chunk += 1) {
    let hash = (0x811c9dc5 ^ (chunk * 0x9e3779b9)) >>> 0;

    for (let index = 0; index < key.length; index += 1) {
      hash ^= key.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }

    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b) >>> 0;
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
    hash ^= hash >>> 16;

    bytes[chunk * 4] = (hash >>> 24) & 0xff;
    bytes[chunk * 4 + 1] = (hash >>> 16) & 0xff;
    bytes[chunk * 4 + 2] = (hash >>> 8) & 0xff;
    bytes[chunk * 4 + 3] = hash & 0xff;
  }

  return bytes;
}

const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getOffsetFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = offsetFormatterCache.get(timeZone);

  if (cached !== undefined) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  offsetFormatterCache.set(timeZone, formatter);

  return formatter;
}

// Offset (ms) that `timeZone` is ahead of UTC at the given UTC instant.
function getTimeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = getOffsetFormatter(timeZone).formatToParts(new Date(utcMs));
  const lookup: Record<string, number> = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      lookup[part.type] = Number.parseInt(part.value, 10);
    }
  }

  const asUtcMs = Date.UTC(
    lookup.year,
    lookup.month - 1,
    lookup.day,
    lookup.hour === 24 ? 0 : lookup.hour,
    lookup.minute,
    lookup.second,
  );

  return asUtcMs - utcMs;
}
