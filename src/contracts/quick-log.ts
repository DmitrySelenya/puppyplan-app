import { z } from 'zod';

import {
  eventLogInsertSchema,
  eventPayloadSchemasV2,
  eventNoteSchema,
  eventTitleSchema,
  eventTypes,
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
  EventType;
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
  'potty',
  'feeding',
  'sleep',
  'walk',
  'zoomies',
  'training',
  'observation',
] as const;

export const quickLogDetailTrackerIdSchema = z.enum(quickLogDetailTrackerIds);

export const quickLogFeedingDetailDraftSchema = z.object({
  amount: z.enum(['meal', 'snack', 'water']).optional(),
  note: eventNoteSchema.optional(),
  occurredAt: timestampSchema.optional(),
  trackerId: z.literal('feeding'),
}).strict();

export const quickLogSleepDetailDraftSchema = z.object({
  action: z.enum(['start', 'wake', 'retrospective']).optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  note: eventNoteSchema.optional(),
  occurredAt: timestampSchema.optional(),
  trackerId: z.literal('sleep'),
}).strict();

export const quickLogZoomiesDetailDraftSchema = z.object({
  intensity: z.enum(['low', 'medium', 'high']).optional(),
  note: eventNoteSchema.optional(),
  occurredAt: timestampSchema.optional(),
  trackerId: z.literal('zoomies'),
}).strict();

const quickLogTimedDetailDraftFields = {
  note: eventNoteSchema.optional(),
  occurredAt: timestampSchema,
} as const;

export const quickLogPottyDetailDraftSchema = z.object({
  ...quickLogTimedDetailDraftFields,
  subtype: quickLogPottySubtypeSchema.optional(),
  trackerId: z.literal('potty'),
}).strict();

export const quickLogWalkDetailDraftSchema = z.object({
  ...quickLogTimedDetailDraftFields,
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  trackerId: z.literal('walk'),
}).strict();

export const quickLogTrainingDetailDraftSchema = z.object({
  ...quickLogTimedDetailDraftFields,
  durationBucket: z.enum(['short', 'medium', 'long']).optional(),
  topic: z.enum(['recall', 'sit', 'crate', 'leash', 'settling', 'other']).optional(),
  trackerId: z.literal('training'),
}).strict();

export const quickLogObservationDetailDraftSchema = z.object({
  ...quickLogTimedDetailDraftFields,
  title: eventTitleSchema.optional(),
  trackerId: z.literal('observation'),
}).strict();

export const quickLogDetailDraftSchema = z.discriminatedUnion('trackerId', [
  quickLogPottyDetailDraftSchema,
  quickLogFeedingDetailDraftSchema,
  quickLogSleepDetailDraftSchema,
  quickLogWalkDetailDraftSchema,
  quickLogZoomiesDetailDraftSchema,
  quickLogTrainingDetailDraftSchema,
  quickLogObservationDetailDraftSchema,
]).superRefine((draft, context) => {
  if (draft.trackerId === 'observation' && draft.title === undefined && draft.note === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Observation requires a title or note.',
      path: ['note'],
    });
  }
});

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
    note: eventNoteSchema.optional(),
    subtype: quickLogPottySubtypeSchema,
  }).strict(),
  z.object({
    ...quickLogCommandBaseSchema,
    amount: z.enum(['meal', 'snack', 'water']).optional(),
    note: eventNoteSchema.optional(),
    tracker_id: z.literal('feeding'),
  }).strict(),
  z.object({
    ...quickLogCommandBaseSchema,
    action: z.enum(['start', 'wake', 'retrospective']).optional(),
    duration_minutes: z.number().int().min(1).max(1440).optional(),
    note: eventNoteSchema.optional(),
    tracker_id: z.literal('sleep'),
  }).strict(),
  z.object({
    ...quickLogCommandBaseSchema,
    duration_minutes: z.number().int().min(1).max(1440).optional(),
    note: eventNoteSchema.optional(),
    tracker_id: z.literal('walk'),
    payload: walkEventPayloadSchema.optional(),
  }).strict(),
  z.object({
    ...quickLogCommandBaseSchema,
    intensity: z.enum(['low', 'medium', 'high']).optional(),
    note: eventNoteSchema.optional(),
    tracker_id: z.literal('zoomies'),
  }).strict(),
  z.object({
    ...quickLogCommandBaseSchema,
    duration_bucket: z.enum(['short', 'medium', 'long']).optional(),
    note: eventNoteSchema.optional(),
    topic: z.enum(['recall', 'sit', 'crate', 'leash', 'settling', 'other']),
    tracker_id: z.literal('training'),
  }).strict(),
  z.object({
    ...quickLogCommandBaseSchema,
    tracker_id: z.literal('observation'),
    title: eventTitleSchema.optional(),
    note: eventNoteSchema.optional(),
  }).strict(),
]).superRefine((command, context) => {
  if (
    command.tracker_id === 'observation'
    && command.title === undefined
    && command.note === undefined
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Observation requires a title or note.',
      path: ['note'],
    });
  }

  if (command.tracker_id === 'feeding' && command.note !== undefined && command.amount === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Detailed feeding requires amount.',
      path: ['amount'],
    });
  }

  if (command.tracker_id === 'sleep') {
    const isDetailed = command.action !== undefined
      || command.duration_minutes !== undefined
      || command.note !== undefined;
    if (isDetailed && command.action === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Detailed sleep requires action.',
        path: ['action'],
      });
    }
    if (command.action === 'retrospective' && command.duration_minutes === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Retrospective sleep requires duration_minutes.',
        path: ['duration_minutes'],
      });
    }
    if (command.action !== undefined
      && command.action !== 'retrospective'
      && command.duration_minutes !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start and wake sleep actions cannot include duration_minutes.',
        path: ['duration_minutes'],
      });
    }
  }
});

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

  const createV2Insert = (
    eventType: Exclude<EventType, 'health_record_reference'>,
    payload: Record<string, JsonValue>,
  ): QuickLogEventInsert => eventLogInsertSchema.parse({
    puppy_id: parsedCommand.puppy_id,
    household_id: parsedCommand.household_id,
    created_by: parsedCommand.created_by,
    client_event_id: parsedCommand.client_event_id,
    event_type: eventType,
    occurred_at: parsedCommand.occurred_at,
    payload_version: 2,
    payload,
  }) as QuickLogEventInsert;

  if (parsedCommand.tracker_id === 'observation') {
    return createV2Insert('observation', {
      ...(parsedCommand.title === undefined ? {} : { title: parsedCommand.title }),
      ...(parsedCommand.note === undefined ? {} : { note: parsedCommand.note }),
      ...(parsedCommand.reminder_link === undefined
        ? {}
        : { reminder_link: parsedCommand.reminder_link }),
    });
  }

  if (parsedCommand.tracker_id === 'training') {
    return createV2Insert('training', {
      topic: parsedCommand.topic,
      ...(parsedCommand.duration_bucket === undefined
        ? {}
        : { duration_bucket: parsedCommand.duration_bucket }),
      ...(parsedCommand.note === undefined ? {} : { note: parsedCommand.note }),
    });
  }

  if (parsedCommand.tracker_id === 'sleep' && parsedCommand.action !== undefined) {
    return createV2Insert('sleep', {
      action: parsedCommand.action,
      ...(parsedCommand.duration_minutes === undefined
        ? {}
        : { duration_minutes: parsedCommand.duration_minutes }),
      ...(parsedCommand.note === undefined ? {} : { note: parsedCommand.note }),
      ...(parsedCommand.reminder_link === undefined
        ? {}
        : { reminder_link: parsedCommand.reminder_link }),
    });
  }

  if (parsedCommand.tracker_id === 'potty' && parsedCommand.note !== undefined) {
    return createV2Insert('potty', {
      subtype: parsedCommand.subtype,
      note: parsedCommand.note,
      ...(parsedCommand.reminder_link === undefined
        ? {}
        : { reminder_link: parsedCommand.reminder_link }),
    });
  }

  if (parsedCommand.tracker_id === 'feeding'
    && (parsedCommand.amount !== undefined || parsedCommand.note !== undefined)) {
    return createV2Insert('feeding', {
      amount: parsedCommand.amount ?? 'meal',
      ...(parsedCommand.note === undefined ? {} : { note: parsedCommand.note }),
      ...(parsedCommand.reminder_link === undefined
        ? {}
        : { reminder_link: parsedCommand.reminder_link }),
    });
  }

  if (parsedCommand.tracker_id === 'walk'
    && (parsedCommand.duration_minutes !== undefined || parsedCommand.note !== undefined)) {
    return createV2Insert('walk', {
      ...(parsedCommand.duration_minutes === undefined
        ? {}
        : { duration_minutes: parsedCommand.duration_minutes }),
      ...(parsedCommand.note === undefined ? {} : { note: parsedCommand.note }),
      ...(parsedCommand.reminder_link === undefined
        ? {}
        : { reminder_link: parsedCommand.reminder_link }),
    });
  }

  if (parsedCommand.tracker_id === 'zoomies'
    && (parsedCommand.intensity !== undefined || parsedCommand.note !== undefined)) {
    return createV2Insert('zoomies', {
      ...(parsedCommand.intensity === undefined ? {} : { intensity: parsedCommand.intensity }),
      ...(parsedCommand.note === undefined ? {} : { note: parsedCommand.note }),
      ...(parsedCommand.reminder_link === undefined
        ? {}
        : { reminder_link: parsedCommand.reminder_link }),
    });
  }

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
  const result = quickLogDetailTrackerIdSchema.safeParse(eventType);

  return result.success ? result.data : null;
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

  let payload: Record<string, JsonValue>;

  if (input.draft.trackerId === 'potty') {
    payload = {
      ...(input.draft.subtype === undefined ? {} : { subtype: input.draft.subtype }),
      ...(input.draft.note === undefined ? {} : { note: input.draft.note }),
    };
  } else if (input.draft.trackerId === 'feeding') {
    payload = {
      amount: input.draft.amount ?? 'meal',
      ...(input.draft.note === undefined ? {} : { note: input.draft.note }),
    };
  } else if (input.draft.trackerId === 'sleep') {
    const action = input.draft.action
      ?? (input.draft.durationMinutes === undefined ? 'start' : 'retrospective');
    payload = {
      action,
      ...(input.draft.durationMinutes === undefined ? {} : {
        duration_minutes: input.draft.durationMinutes,
      }),
      ...(input.draft.note === undefined ? {} : { note: input.draft.note }),
    };
  } else if (input.draft.trackerId === 'walk') {
    payload = {
      ...(input.draft.durationMinutes === undefined
        ? {}
        : { duration_minutes: input.draft.durationMinutes }),
      ...(input.draft.note === undefined ? {} : { note: input.draft.note }),
    };
  } else if (input.draft.trackerId === 'zoomies') {
    payload = {
      ...(input.draft.intensity === undefined ? {} : { intensity: input.draft.intensity }),
      ...(input.draft.note === undefined ? {} : { note: input.draft.note }),
    };
  } else if (input.draft.trackerId === 'training') {
    payload = {
      ...(input.draft.topic === undefined ? {} : { topic: input.draft.topic }),
      ...(input.draft.durationBucket === undefined
        ? {}
        : { duration_bucket: input.draft.durationBucket }),
      ...(input.draft.note === undefined ? {} : { note: input.draft.note }),
    };
  } else {
    payload = {
      ...(input.draft.title === undefined ? {} : { title: input.draft.title }),
      ...(input.draft.note === undefined ? {} : { note: input.draft.note }),
    };
  }

  return eventPayloadSchemasV2[input.eventType].parse(payload) as Record<string, JsonValue>;
}

const quickLogQueueEventTypes = eventTypes.filter((eventType) => eventType !== 'health_record_reference');
const quickLogEventTypeSet = new Set<EventType>(quickLogQueueEventTypes);

export function isQuickLogEventType(eventType: EventType): eventType is QuickLogEventType {
  return quickLogEventTypeSet.has(eventType);
}
