import { z } from 'zod';

import {
  uuidSchema,
  timestampSchema,
} from '@/contracts/supabase';
import type { HealthRecord } from '@/contracts/supabase';
import type {
  HealthRecordDelete,
  HealthRecordInsert,
  HealthRecordRestore,
  HealthRecordUpdate,
  SupabaseHealthRecordRepository,
} from '@/lib/supabase/health-records';
import type { HealthOutboxStorage } from './storage';

export const healthOutboxStates = [
  'pending_local',
  'sending',
  'server_confirmed',
  'failed_retryable',
  'failed_permanent',
] as const;

export const healthOutboxOperations = [
  'create',
  'update',
  'delete',
  'restore',
] as const;

export const healthOutboxRetryableErrorCategories = [
  'network_unavailable',
  'request_timeout',
  'server_5xx',
  'rate_limited',
  'auth_refresh_in_progress',
  'unknown',
] as const;

export const healthOutboxPermanentErrorCategories = [
  'permission_denied',
  'invalid_payload',
  'missing_context',
  'server_validation_failed',
  'unsupported_schema_version',
  'unknown_retry_exhausted',
] as const;

const healthOutboxStateSchema = z.enum(healthOutboxStates);
const healthOutboxOperationSchema = z.enum(healthOutboxOperations);
const healthOutboxRetryableErrorCategorySchema = z.enum(healthOutboxRetryableErrorCategories);
const healthOutboxPermanentErrorCategorySchema = z.enum(healthOutboxPermanentErrorCategories);
const healthOutboxErrorCategorySchema = z.enum([
  ...healthOutboxRetryableErrorCategories,
  ...healthOutboxPermanentErrorCategories,
]);

const nullableTrimmedStringSchema = z.string().nullable();

const healthRecordInsertSchema = z.object({
  completed_at: timestampSchema.nullable(),
  id: uuidSchema.optional(),
  notes: nullableTrimmedStringSchema,
  provider_name: nullableTrimmedStringSchema,
  puppy_id: uuidSchema,
  record_type: z.string().min(1),
  scheduled_for: z.string().nullable(),
  source: z.enum(['template', 'manual', 'confirmed']),
  status: z.string().min(1),
  title: z.string().min(1),
  updated_by: uuidSchema,
}).strict();

const healthRecordUpdateSchema = healthRecordInsertSchema.extend({
  id: uuidSchema,
  updated_at: timestampSchema,
});

const healthRecordDeleteSchema = z.object({
  deleted_at: timestampSchema,
  id: uuidSchema,
  puppy_id: uuidSchema,
  updated_at: timestampSchema,
  updated_by: uuidSchema,
}).strict();

const healthRecordRestoreSchema = z.object({
  id: uuidSchema,
  puppy_id: uuidSchema,
  updated_at: timestampSchema,
  updated_by: uuidSchema,
}).strict();

const healthOutboxPayloadSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('create'),
    payload: z.object({
      insert: healthRecordInsertSchema,
    }).strict(),
  }).strict(),
  z.object({
    operation: z.literal('update'),
    payload: z.object({
      update: healthRecordUpdateSchema,
    }).strict(),
  }).strict(),
  z.object({
    operation: z.literal('delete'),
    payload: z.object({
      delete: healthRecordDeleteSchema,
    }).strict(),
  }).strict(),
  z.object({
    operation: z.literal('restore'),
    payload: z.object({
      restore: healthRecordRestoreSchema,
    }).strict(),
  }).strict(),
]);

const healthOutboxEnqueueInputBaseSchema = z.object({
  actor_id: uuidSchema,
  household_id: uuidSchema,
  operation_id: uuidSchema,
  puppy_id: uuidSchema,
});

const healthOutboxEnqueueInputSchema = z.discriminatedUnion('operation', [
  healthOutboxEnqueueInputBaseSchema.extend({
    operation: z.literal('create'),
    payload: z.object({
      insert: healthRecordInsertSchema,
    }).strict(),
  }).strict(),
  healthOutboxEnqueueInputBaseSchema.extend({
    operation: z.literal('update'),
    payload: z.object({
      update: healthRecordUpdateSchema,
    }).strict(),
  }).strict(),
  healthOutboxEnqueueInputBaseSchema.extend({
    operation: z.literal('delete'),
    payload: z.object({
      delete: healthRecordDeleteSchema,
    }).strict(),
  }).strict(),
  healthOutboxEnqueueInputBaseSchema.extend({
    operation: z.literal('restore'),
    payload: z.object({
      restore: healthRecordRestoreSchema,
    }).strict(),
  }).strict(),
]);

const healthOutboxStoredItemSchema = z.object({
  actor_id: uuidSchema.nullable(),
  created_at: timestampSchema,
  household_id: uuidSchema,
  last_error_category: healthOutboxErrorCategorySchema.nullable(),
  operation: healthOutboxOperationSchema,
  operation_id: uuidSchema,
  payload: z.unknown(),
  puppy_id: uuidSchema,
  retry_after_at: timestampSchema.nullable(),
  retry_count: z.number().int().min(0),
  state: healthOutboxStateSchema,
  updated_at: timestampSchema,
}).strict().superRefine((item, context) => {
  const payloadResult = healthOutboxPayloadSchema.safeParse({
    operation: item.operation,
    payload: item.payload,
  });

  if (payloadResult.success) {
    return;
  }

  for (const issue of payloadResult.error.issues) {
    context.addIssue(issue);
  }
});

export type HealthOutboxState = z.infer<typeof healthOutboxStateSchema>;
export type HealthOutboxOperation = z.infer<typeof healthOutboxOperationSchema>;
export type HealthOutboxRetryableErrorCategory = z.infer<
  typeof healthOutboxRetryableErrorCategorySchema
>;
export type HealthOutboxPermanentErrorCategory = z.infer<
  typeof healthOutboxPermanentErrorCategorySchema
>;
export type HealthOutboxErrorCategory = z.infer<typeof healthOutboxErrorCategorySchema>;
export type HealthOutboxStoredItem = z.infer<typeof healthOutboxStoredItemSchema>;

export type HealthOutboxTransition =
  | Readonly<{ type: 'mark_sending'; now: string }>
  | Readonly<{ type: 'mark_server_confirmed'; now: string }>
  | Readonly<{
    type: 'mark_failed_retryable';
    errorCategory: HealthOutboxErrorCategory | string;
    retryAfterAt: string | null;
    now: string;
  }>
  | Readonly<{
    type: 'mark_failed_permanent';
    errorCategory: HealthOutboxErrorCategory | string;
    now: string;
  }>;

export type HealthOutboxFailureKind =
  | HealthOutboxRetryableErrorCategory
  | 'permission_denied'
  | 'invalid_payload'
  | 'missing_context'
  | 'server_validation_failed'
  | 'unsupported_schema_version';

export type HealthOutboxRetryDecision =
  | Readonly<{
    decision: 'retryable';
    category: HealthOutboxErrorCategory;
    retryAfterMs: number | null;
  }>
  | Readonly<{
    decision: 'permanent';
    category: HealthOutboxErrorCategory;
    retryAfterMs: null;
  }>;

export type HealthOutboxReplayRepository = Pick<
  SupabaseHealthRecordRepository,
  'deleteHealthRecord' | 'insertHealthRecord' | 'restoreHealthRecord' | 'updateHealthRecord'
>;

export type HealthOutboxReplayResult =
  | Readonly<{ operation: 'create'; record: HealthRecord }>
  | Readonly<{ operation: 'update'; record: HealthRecord }>
  | Readonly<{ operation: 'delete' }>
  | Readonly<{ operation: 'restore'; record: HealthRecord }>;

export type HealthOutboxProcessorStorage = Pick<
  HealthOutboxStorage,
  | 'claimNextReadyToSend'
  | 'markFailedPermanent'
  | 'markFailedRetryable'
  | 'markServerConfirmed'
>;

export type HealthOutboxProcessorResult =
  | Readonly<{ outcome: 'idle' }>
  | Readonly<{
    outcome: 'sent';
    operationId: string;
    item: HealthOutboxStoredItem;
    replay: HealthOutboxReplayResult;
  }>
  | Readonly<{
    outcome: 'failed_retryable';
    operationId: string;
    category: HealthOutboxErrorCategory;
    item: HealthOutboxStoredItem;
  }>
  | Readonly<{
    outcome: 'failed_permanent';
    operationId: string;
    category: HealthOutboxErrorCategory;
    item: HealthOutboxStoredItem;
  }>;

const allowedTransitions = {
  pending_local: ['sending', 'failed_permanent'],
  sending: ['server_confirmed', 'failed_retryable', 'failed_permanent'],
  server_confirmed: [],
  failed_retryable: ['sending', 'failed_permanent'],
  failed_permanent: [],
} as const satisfies Record<HealthOutboxState, readonly HealthOutboxState[]>;

const healthOutboxFailureKinds = new Set<HealthOutboxFailureKind>([
  'network_unavailable',
  'request_timeout',
  'server_5xx',
  'rate_limited',
  'auth_refresh_in_progress',
  'permission_denied',
  'invalid_payload',
  'missing_context',
  'server_validation_failed',
  'unsupported_schema_version',
  'unknown',
]);

export function createHealthOutboxItem(
  input: unknown,
  options: Readonly<{ now: string }>,
): HealthOutboxStoredItem {
  const parsed = healthOutboxEnqueueInputSchema.parse(input);

  return createStoredHealthOutboxItem({
    ...parsed,
    created_at: options.now,
    last_error_category: null,
    retry_after_at: null,
    retry_count: 0,
    state: 'pending_local',
    updated_at: options.now,
  });
}

export function createStoredHealthOutboxItem(input: unknown): HealthOutboxStoredItem {
  return healthOutboxStoredItemSchema.parse(input);
}

export function canTransitionHealthOutboxState(
  from: HealthOutboxState,
  to: HealthOutboxState,
): boolean {
  return (allowedTransitions[from] as readonly HealthOutboxState[]).includes(to);
}

export function applyHealthOutboxTransition(
  item: HealthOutboxStoredItem,
  transition: HealthOutboxTransition,
): HealthOutboxStoredItem {
  switch (transition.type) {
    case 'mark_sending':
      return transitionHealthOutboxItem(item, 'sending', {
        last_error_category: null,
        retry_after_at: null,
        updated_at: transition.now,
      });

    case 'mark_server_confirmed':
      return transitionHealthOutboxItem(item, 'server_confirmed', {
        last_error_category: null,
        retry_after_at: null,
        updated_at: transition.now,
      });

    case 'mark_failed_retryable':
      return transitionHealthOutboxItem(item, 'failed_retryable', {
        last_error_category: parseHealthOutboxRetryableErrorCategory(transition.errorCategory),
        retry_after_at: transition.retryAfterAt,
        retry_count: item.retry_count + 1,
        updated_at: transition.now,
      });

    case 'mark_failed_permanent':
      return transitionHealthOutboxItem(item, 'failed_permanent', {
        last_error_category: parseHealthOutboxPermanentErrorCategory(transition.errorCategory),
        retry_after_at: null,
        retry_count: item.retry_count + 1,
        updated_at: transition.now,
      });
  }
}

export function normalizeHealthOutboxFailureForPersistence(
  input: Readonly<{ error: unknown; retryCount: number }>,
): HealthOutboxRetryDecision {
  return classifyHealthOutboxError({
    kind: getHealthOutboxFailureKind(input.error),
    retryAfterMs: getHealthOutboxRetryAfterMs(input.error),
    retryCount: input.retryCount,
  });
}

export const HEALTH_OUTBOX_BASE_RETRY_DELAY_MS = 30_000;
export const HEALTH_OUTBOX_MAX_RETRY_DELAY_MS = 600_000;

export function getDefaultHealthOutboxRetryDelayMs(retryCount: number): number {
  const boundedRetryCount = Math.min(Math.max(retryCount, 0), 10);

  return Math.min(
    HEALTH_OUTBOX_BASE_RETRY_DELAY_MS * 2 ** boundedRetryCount,
    HEALTH_OUTBOX_MAX_RETRY_DELAY_MS,
  );
}

export function classifyHealthOutboxError(
  input: Readonly<{
    kind: HealthOutboxFailureKind;
    retryCount: number;
    retryAfterMs?: number | null;
  }>,
): HealthOutboxRetryDecision {
  // A null retryAfterMs would persist retry_after_at = NULL, which the claim query treats
  // as immediately ready — a zero-backoff hot loop. Every retryable decision therefore
  // carries an explicit delay.
  const defaultRetryAfterMs = getDefaultHealthOutboxRetryDelayMs(input.retryCount);

  switch (input.kind) {
    case 'network_unavailable':
    case 'request_timeout':
    case 'server_5xx':
    case 'auth_refresh_in_progress':
      return {
        category: input.kind,
        decision: 'retryable',
        retryAfterMs: defaultRetryAfterMs,
      };

    case 'rate_limited':
      return {
        category: 'rate_limited',
        decision: 'retryable',
        retryAfterMs: input.retryAfterMs ?? defaultRetryAfterMs,
      };

    case 'permission_denied':
    case 'invalid_payload':
    case 'missing_context':
    case 'server_validation_failed':
    case 'unsupported_schema_version':
      return {
        category: input.kind,
        decision: 'permanent',
        retryAfterMs: null,
      };

    case 'unknown':
      if (input.retryCount >= 3) {
        return {
          category: 'unknown_retry_exhausted',
          decision: 'permanent',
          retryAfterMs: null,
        };
      }

      return {
        category: 'unknown',
        decision: 'retryable',
        retryAfterMs: defaultRetryAfterMs,
      };
  }
}

export async function replayHealthOutboxItem(
  item: HealthOutboxStoredItem,
  dependencies: Readonly<{ repository: HealthOutboxReplayRepository }>,
): Promise<HealthOutboxReplayResult> {
  if (item.actor_id === null) {
    throw new Error('health_outbox_missing_actor');
  }

  const operationPayload = healthOutboxPayloadSchema.parse({
    operation: item.operation,
    payload: item.payload,
  });

  switch (operationPayload.operation) {
    case 'create':
      return {
        operation: 'create',
        record: await dependencies.repository.insertHealthRecord(
          operationPayload.payload.insert as HealthRecordInsert,
        ),
      };

    case 'update':
      return {
        operation: 'update',
        record: await dependencies.repository.updateHealthRecord(
          operationPayload.payload.update as HealthRecordUpdate,
        ),
      };

    case 'delete':
      await dependencies.repository.deleteHealthRecord(
        operationPayload.payload.delete as HealthRecordDelete,
      );
      return { operation: 'delete' };

    case 'restore':
      return {
        operation: 'restore',
        record: await dependencies.repository.restoreHealthRecord(
          operationPayload.payload.restore as HealthRecordRestore,
        ),
      };
  }
}

export async function processNextHealthOutboxItem(
  dependencies: Readonly<{
    now: string;
    repository: HealthOutboxReplayRepository;
    storage: HealthOutboxProcessorStorage;
  }>,
): Promise<HealthOutboxProcessorResult> {
  const item = await dependencies.storage.claimNextReadyToSend({
    now: dependencies.now,
  });

  if (!item) {
    return { outcome: 'idle' };
  }

  try {
    const replay = await replayHealthOutboxItem(item, {
      repository: dependencies.repository,
    });
    const confirmedItem = await dependencies.storage.markServerConfirmed(item.operation_id, {
      now: dependencies.now,
    });

    return {
      item: confirmedItem,
      operationId: item.operation_id,
      outcome: 'sent',
      replay,
    };
  } catch (error) {
    const decision = normalizeHealthOutboxFailureForPersistence({
      error,
      retryCount: item.retry_count,
    });

    if (decision.decision === 'retryable') {
      const failedItem = await dependencies.storage.markFailedRetryable(item.operation_id, {
        errorCategory: decision.category,
        now: dependencies.now,
        retryAfterAt: retryAfterAtFromDecision(dependencies.now, decision.retryAfterMs),
      });

      return {
        category: decision.category,
        item: failedItem,
        operationId: item.operation_id,
        outcome: 'failed_retryable',
      };
    }

    const failedItem = await dependencies.storage.markFailedPermanent(item.operation_id, {
      errorCategory: decision.category,
      now: dependencies.now,
    });

    return {
      category: decision.category,
      item: failedItem,
      operationId: item.operation_id,
      outcome: 'failed_permanent',
    };
  }
}

function transitionHealthOutboxItem(
  item: HealthOutboxStoredItem,
  nextState: HealthOutboxState,
  updates: Partial<HealthOutboxStoredItem>,
): HealthOutboxStoredItem {
  if (!canTransitionHealthOutboxState(item.state, nextState)) {
    throw new Error(`Invalid Health outbox transition: ${item.state} -> ${nextState}`);
  }

  return createStoredHealthOutboxItem({
    ...item,
    ...updates,
    state: nextState,
  });
}

function parseHealthOutboxRetryableErrorCategory(
  category: unknown,
): HealthOutboxRetryableErrorCategory {
  const result = healthOutboxRetryableErrorCategorySchema.safeParse(category);

  if (!result.success) {
    throw new Error('Invalid Health outbox retryable error category');
  }

  return result.data;
}

function parseHealthOutboxPermanentErrorCategory(
  category: unknown,
): HealthOutboxPermanentErrorCategory {
  const result = healthOutboxPermanentErrorCategorySchema.safeParse(category);

  if (!result.success) {
    throw new Error('Invalid Health outbox permanent error category');
  }

  return result.data;
}

function getHealthOutboxFailureKind(error: unknown): HealthOutboxFailureKind {
  if (
    isRecord(error)
    && typeof error.kind === 'string'
    && healthOutboxFailureKinds.has(error.kind as HealthOutboxFailureKind)
  ) {
    return error.kind as HealthOutboxFailureKind;
  }

  return 'unknown';
}

function getHealthOutboxRetryAfterMs(error: unknown): number | null {
  if (!isRecord(error) || typeof error.retryAfterMs !== 'number') {
    return null;
  }

  return error.retryAfterMs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function retryAfterAtFromDecision(now: string, retryAfterMs: number | null): string | null {
  if (retryAfterMs === null) {
    return null;
  }

  return new Date(Date.parse(now) + retryAfterMs).toISOString();
}
