import { z } from 'zod';

import {
  eventLogInsertSchema,
  minimalQuickLogQueueItemSchema,
  timestampSchema,
  uuidSchema,
  type EventLogInsert,
  type EventType,
  type JsonValue,
} from './supabase';

export const MAX_VISIBLE_QUICK_LOG_TRACKERS = 5;

export const quickLogTrackerIds = [
  'potty_pee_outside',
  'potty_pee_inside',
  'potty_poop',
  'feeding_meal',
  'sleep_nap',
  'zoomies',
  'training',
] as const;

export const defaultQuickLogTrackerIds = [
  'potty_pee_outside',
  'potty_pee_inside',
  'potty_poop',
  'feeding_meal',
  'sleep_nap',
] as const;

export const quickLogTrackerIdSchema = z.enum(quickLogTrackerIds);

export type QuickLogTrackerId = z.infer<typeof quickLogTrackerIdSchema>;

export type QuickLogTrackerDefinition = Readonly<{
  event_type: EventType;
  payload: Readonly<Record<string, JsonValue>>;
}>;

export const quickLogClientEventIdSchema = z.string()
  .regex(/^evt_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

export const quickLogTrackerDefinitions = {
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
  'feeding_meal',
  'sleep_nap',
  'zoomies',
] as const;

export const quickLogDetailTrackerIdSchema = z.enum(quickLogDetailTrackerIds);

export const quickLogFeedingDetailDraftSchema = z.object({
  amount: z.enum(['meal', 'snack', 'water']).optional(),
  trackerId: z.literal('feeding_meal'),
}).strict();

export const quickLogSleepDetailDraftSchema = z.object({
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  trackerId: z.literal('sleep_nap'),
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

export const quickLogCommandSchema = z.object({
  client_event_id: quickLogClientEventIdSchema,
  household_id: uuidSchema,
  puppy_id: uuidSchema,
  created_by: uuidSchema,
  tracker_id: quickLogTrackerIdSchema,
  occurred_at: timestampSchema,
}).strict();

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

  return eventLogInsertSchema.parse({
    puppy_id: parsedCommand.puppy_id,
    household_id: parsedCommand.household_id,
    created_by: parsedCommand.created_by,
    client_event_id: parsedCommand.client_event_id,
    event_type: definition.event_type,
    occurred_at: parsedCommand.occurred_at,
    payload_version: 1,
    payload: {
      ...definition.payload,
    },
  }) as QuickLogEventInsert;
}

export function createQuickLogDetailDraft(input: unknown): QuickLogDetailDraft {
  return quickLogDetailDraftSchema.parse(input);
}

const quickLogEventTypeSet = new Set<EventType>(
  Object.values(quickLogTrackerDefinitions).map((definition) => definition.event_type),
);

export function isQuickLogEventType(eventType: EventType): eventType is QuickLogEventType {
  return quickLogEventTypeSet.has(eventType);
}
