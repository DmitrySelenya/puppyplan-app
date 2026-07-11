import { z } from 'zod';

import {
  eventLogInsertSchema,
  minimalQuickLogQueueItemSchema,
  reminderLinkPayloadSchema,
  timestampSchema,
  uuidSchema,
  walkEventPayloadSchema,
  type EventLogInsert,
  type EventType,
  type JsonValue,
} from './supabase';

export const MAX_VISIBLE_QUICK_LOG_TRACKERS = 5;

export const quickLogTrackerIds = [
  'potty',
  'feeding',
  'sleep',
  'walk',
  'zoomies',
] as const;

export const quickLogPottySubtypes = ['outside', 'inside', 'poop'] as const;

export const defaultQuickLogTrackerIds = [
  'potty',
  'feeding',
  'sleep',
  'walk',
  'zoomies',
] as const;

export const quickLogTrackerIdSchema = z.enum(quickLogTrackerIds);
export const quickLogPottySubtypeSchema = z.enum(quickLogPottySubtypes);

export type QuickLogTrackerId = z.infer<typeof quickLogTrackerIdSchema>;
export type QuickLogNonPottyTrackerId = Exclude<QuickLogTrackerId, 'potty'>;
export type QuickLogPottySubtype = z.infer<typeof quickLogPottySubtypeSchema>;

export type QuickLogTrackerDefinition = Readonly<{
  event_type: EventType;
  payload: Readonly<Record<string, JsonValue>>;
}>;

export const quickLogClientEventIdSchema = z.string()
  .regex(/^evt_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

export const quickLogTrackerDefinitions = {
  potty: {
    event_type: 'potty',
    payload: {},
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
} as const satisfies Record<QuickLogTrackerId, QuickLogTrackerDefinition>;

export type QuickLogEventType =
  (typeof quickLogTrackerDefinitions)[QuickLogTrackerId]['event_type'];
export type QuickLogEventInsert = EventLogInsert & Readonly<{
  event_type: QuickLogEventType;
}>;

export const selectedQuickLogTrackerIdsSchema = z.array(quickLogTrackerIdSchema)
  .min(1)
  .max(MAX_VISIBLE_QUICK_LOG_TRACKERS)
  .superRefine((trackerIds, context) => {
    if (new Set(trackerIds).size === trackerIds.length) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Quick Log tracker selections must be unique.',
    });
  });

export const quickLogDetailTrackerIds = [
  'feeding',
  'sleep',
  'zoomies',
] as const;

export const quickLogDetailTrackerIdSchema = z.enum(quickLogDetailTrackerIds);

export const quickLogFeedingDetailDraftSchema = z.object({
  amount: z.enum(['meal', 'snack', 'water']).optional(),
  trackerId: z.literal('feeding'),
}).strict();

export const quickLogSleepDetailDraftSchema = z.object({
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  trackerId: z.literal('sleep'),
}).strict();

export const quickLogZoomiesDetailDraftSchema = z.object({
  intensity: z.enum(['low', 'medium', 'high']).optional(),
  trackerId: z.literal('zoomies'),
}).strict();

export const quickLogDetailDraftSchema = z.discriminatedUnion('trackerId', [
  quickLogFeedingDetailDraftSchema,
  quickLogSleepDetailDraftSchema,
  quickLogZoomiesDetailDraftSchema,
]);

const quickLogCommandBaseSchema = {
  client_event_id: quickLogClientEventIdSchema,
  household_id: uuidSchema,
  puppy_id: uuidSchema,
  created_by: uuidSchema,
  occurred_at: timestampSchema,
  // Present only for routine check-off facts (PUP-28): copied into the event payload.
  reminder_link: reminderLinkPayloadSchema.optional(),
} as const;

export const quickLogCommandSchema = z.discriminatedUnion('tracker_id', [
  z.object({
    ...quickLogCommandBaseSchema,
    tracker_id: z.literal('potty'),
    subtype: quickLogPottySubtypeSchema,
  }).strict(),
  z.object({
    ...quickLogCommandBaseSchema,
    tracker_id: z.literal('feeding'),
  }).strict(),
  z.object({
    ...quickLogCommandBaseSchema,
    tracker_id: z.literal('sleep'),
  }).strict(),
  z.object({
    ...quickLogCommandBaseSchema,
    tracker_id: z.literal('walk'),
    payload: walkEventPayloadSchema.optional(),
  }).strict(),
  z.object({
    ...quickLogCommandBaseSchema,
    tracker_id: z.literal('zoomies'),
  }).strict(),
]);

export type QuickLogCommand = z.infer<typeof quickLogCommandSchema>;
export type SelectedQuickLogTrackerIds = z.infer<typeof selectedQuickLogTrackerIdsSchema>;
export type QuickLogDetailTrackerId = z.infer<typeof quickLogDetailTrackerIdSchema>;
export type QuickLogDetailDraft = z.infer<typeof quickLogDetailDraftSchema>;

export const quickLogQueueItemSchema = minimalQuickLogQueueItemSchema
  .superRefine((queueItem, context) => {
    const clientEventIdResult = quickLogClientEventIdSchema.safeParse(queueItem.client_event_id);

    if (!clientEventIdResult.success) {
      for (const issue of clientEventIdResult.error.issues) {
        context.addIssue({
          ...issue,
          path: ['client_event_id', ...issue.path],
        });
      }
    }

    if (!quickLogEventTypeSet.has(queueItem.event_type)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quick Log queue items must use a Quick Log routine event type.',
        path: ['event_type'],
      });
    }
  });

export type QuickLogQueueItem = z.infer<typeof quickLogQueueItemSchema>;

export function createQuickLogEventInsert(command: unknown): QuickLogEventInsert {
  const parsedCommand = quickLogCommandSchema.parse(command);
  const definition = quickLogTrackerDefinitions[parsedCommand.tracker_id];
  const basePayload = parsedCommand.tracker_id === 'potty'
    ? { subtype: parsedCommand.subtype }
    : parsedCommand.tracker_id === 'walk'
      ? { ...definition.payload, ...(parsedCommand.payload ?? {}) }
      : { ...definition.payload };
  const payload = parsedCommand.reminder_link === undefined
    ? basePayload
    : { ...basePayload, reminder_link: parsedCommand.reminder_link };

  return eventLogInsertSchema.parse({
    puppy_id: parsedCommand.puppy_id,
    household_id: parsedCommand.household_id,
    created_by: parsedCommand.created_by,
    client_event_id: parsedCommand.client_event_id,
    event_type: definition.event_type,
    occurred_at: parsedCommand.occurred_at,
    payload_version: 1,
    payload,
  }) as QuickLogEventInsert;
}

export function createQuickLogDetailDraft(input: unknown): QuickLogDetailDraft {
  return quickLogDetailDraftSchema.parse(input);
}

export function getQuickLogDetailTrackerIdForEventType(
  eventType: QuickLogEventType,
): QuickLogDetailTrackerId | null {
  if (eventType === 'feeding') {
    return 'feeding';
  }

  if (eventType === 'sleep') {
    return 'sleep';
  }

  if (eventType === 'zoomies') {
    return 'zoomies';
  }

  return null;
}

export function createQuickLogDetailPayload(
  input: Readonly<{
    draft: QuickLogDetailDraft;
    eventType: QuickLogEventType;
  }>,
): Record<string, JsonValue> {
  const expectedTrackerId = getQuickLogDetailTrackerIdForEventType(input.eventType);

  if (expectedTrackerId === null || input.draft.trackerId !== expectedTrackerId) {
    throw new Error('Quick Log detail draft does not match the event type');
  }

  if (input.draft.trackerId === 'feeding') {
    return {
      amount: input.draft.amount ?? 'meal',
    };
  }

  if (input.draft.trackerId === 'sleep') {
    return input.draft.durationMinutes === undefined
      ? {
        sleep_kind: 'nap',
      }
      : {
        duration_minutes: input.draft.durationMinutes,
        sleep_kind: 'nap',
      };
  }

  return input.draft.intensity === undefined
    ? {}
    : {
      intensity: input.draft.intensity,
    };
}

const quickLogEventTypeSet = new Set<EventType>(
  Object.values(quickLogTrackerDefinitions).map((definition) => definition.event_type),
);

export function isQuickLogEventType(eventType: EventType): eventType is QuickLogEventType {
  return quickLogEventTypeSet.has(eventType);
}
