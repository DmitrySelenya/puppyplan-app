import { z } from 'zod';

import { quickLogQueueItemSchema } from '@/contracts/quick-log';
import {
  eventTypeSchema,
  jsonObjectSchema,
  payloadVersionSchema,
  quickLogQueueStateSchema,
  timestampSchema,
  uuidSchema,
  type EventType,
  type JsonValue,
} from '@/contracts/supabase';

export const QUICK_LOG_QUEUE_DATABASE_NAME = 'quick-log-queue.db';
export const QUICK_LOG_QUEUE_SCHEMA_VERSION = 3;
export const QUICK_LOG_QUEUE_TABLE_NAME = 'queue_item';

export const quickLogQueueRetryableErrorCategories = [
  'network_unavailable',
  'request_timeout',
  'server_5xx',
  'rate_limited',
  'auth_refresh_in_progress',
  'unknown',
] as const;

export const quickLogQueuePermanentErrorCategories = [
  'permission_denied',
  'invalid_payload',
  'missing_context',
  'expired_context',
  'server_validation_failed',
  'unsupported_schema_version',
  'unknown_retry_exhausted',
  'corrupt_payload',
] as const;

export const quickLogQueueErrorCategories = [
  ...quickLogQueueRetryableErrorCategories,
  ...quickLogQueuePermanentErrorCategories,
] as const;

export const quickLogQueueRetryableErrorCategorySchema = z.enum(
  quickLogQueueRetryableErrorCategories,
);
export const quickLogQueuePermanentErrorCategorySchema = z.enum(
  quickLogQueuePermanentErrorCategories,
);
export const quickLogQueueErrorCategorySchema = z.enum(quickLogQueueErrorCategories);

export const quickLogStoredQueueItemSchema = z.object({
  client_event_id: z.string(),
  household_id: uuidSchema,
  puppy_id: uuidSchema,
  created_by: uuidSchema.nullable(),
  event_type: eventTypeSchema,
  payload_version: payloadVersionSchema,
  payload: jsonObjectSchema,
  occurred_at: timestampSchema,
  state: quickLogQueueStateSchema,
  retry_count: z.number().int().min(0),
  last_error_category: quickLogQueueErrorCategorySchema.nullable(),
  retry_after_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict().superRefine((item, context) => {
  const quickLogItemResult = quickLogQueueItemSchema.safeParse({
    client_event_id: item.client_event_id,
    household_id: item.household_id,
    puppy_id: item.puppy_id,
    created_by: item.created_by,
    event_type: item.event_type,
    payload_version: item.payload_version,
    payload: item.payload,
    occurred_at: item.occurred_at,
    state: item.state,
    retry_count: item.retry_count,
    created_at: item.created_at,
    updated_at: item.updated_at,
  });

  if (quickLogItemResult.success) {
    return;
  }

  for (const issue of quickLogItemResult.error.issues) {
    context.addIssue(issue);
  }
});

export const quickLogQueueEnqueueInputSchema = z.object({
  client_event_id: z.string(),
  household_id: uuidSchema,
  puppy_id: uuidSchema,
  created_by: uuidSchema,
  event_type: eventTypeSchema,
  payload_version: payloadVersionSchema,
  payload: jsonObjectSchema,
  occurred_at: timestampSchema,
  created_at: timestampSchema.optional(),
}).strict().superRefine((input, context) => {
  const queueItemResult = quickLogQueueItemSchema.safeParse({
    ...input,
    state: 'pending_local',
    retry_count: 0,
    created_at: input.created_at ?? input.occurred_at,
    updated_at: input.created_at ?? input.occurred_at,
  });

  if (queueItemResult.success) {
    return;
  }

  for (const issue of queueItemResult.error.issues) {
    context.addIssue(issue);
  }
});

export type QuickLogQueueState = z.infer<typeof quickLogQueueStateSchema>;
export type QuickLogQueueRetryableErrorCategory = z.infer<
  typeof quickLogQueueRetryableErrorCategorySchema
>;
export type QuickLogQueuePermanentErrorCategory = z.infer<
  typeof quickLogQueuePermanentErrorCategorySchema
>;
export type QuickLogQueueErrorCategory = z.infer<typeof quickLogQueueErrorCategorySchema>;
export type QuickLogStoredQueueItem = z.infer<typeof quickLogStoredQueueItemSchema>;
export type QuickLogQueueEnqueueInput = z.infer<typeof quickLogQueueEnqueueInputSchema>;

export type QuickLogQueueStoredRow = Readonly<{
  client_event_id: string;
  household_id: string;
  puppy_id: string;
  created_by: string | null;
  event_type: EventType;
  payload_version: number;
  payload_json: string;
  occurred_at: string;
  state: QuickLogQueueState;
  retry_count: number;
  last_error_category: QuickLogQueueErrorCategory | null;
  retry_after_at: string | null;
  created_at: string;
  updated_at: string;
}>;

export function parseQuickLogQueueErrorCategory(
  category: unknown,
): QuickLogQueueErrorCategory {
  const result = quickLogQueueErrorCategorySchema.safeParse(category);

  if (!result.success) {
    throw new Error('Invalid Quick Log queue error category');
  }

  return result.data;
}

export function parseQuickLogQueueRetryableErrorCategory(
  category: unknown,
): QuickLogQueueRetryableErrorCategory {
  const result = quickLogQueueRetryableErrorCategorySchema.safeParse(category);

  if (!result.success) {
    throw new Error('Invalid Quick Log queue retryable error category');
  }

  return result.data;
}

export function parseQuickLogQueuePermanentErrorCategory(
  category: unknown,
): QuickLogQueuePermanentErrorCategory {
  const result = quickLogQueuePermanentErrorCategorySchema.safeParse(category);

  if (!result.success) {
    throw new Error('Invalid Quick Log queue permanent error category');
  }

  return result.data;
}

export function createStoredQuickLogQueueItem(
  input: unknown,
): QuickLogStoredQueueItem {
  return quickLogStoredQueueItemSchema.parse(input);
}

export function serializeQuickLogQueuePayload(payload: Record<string, JsonValue>): string {
  return JSON.stringify(payload);
}

export function parseQuickLogQueuePayload(payloadJson: string): Record<string, JsonValue> {
  const parsedPayload = JSON.parse(payloadJson) as unknown;

  return jsonObjectSchema.parse(parsedPayload);
}
