import {
  createStoredQuickLogQueueItem,
  parseQuickLogQueueErrorCategory,
  type QuickLogQueueErrorCategory,
  type QuickLogStoredQueueItem,
} from './schema';

export const QUICK_LOG_QUEUE_MAX_UNKNOWN_RETRY_COUNT = 3;
export const QUICK_LOG_QUEUE_RETRY_BASE_DELAY_MS = 1_000;
export const QUICK_LOG_QUEUE_RETRY_MAX_DELAY_MS = 10_000;

export type QuickLogQueueFailureKind =
  | 'network_unavailable'
  | 'request_timeout'
  | 'server_5xx'
  | 'rate_limited'
  | 'auth_refresh_in_progress'
  | 'permission_denied'
  | 'invalid_payload'
  | 'missing_context'
  | 'expired_context'
  | 'server_validation_failed'
  | 'unsupported_schema_version'
  | 'corrupt_payload'
  | 'unknown';

const quickLogQueueFailureKinds = new Set<QuickLogQueueFailureKind>([
  'network_unavailable',
  'request_timeout',
  'server_5xx',
  'rate_limited',
  'auth_refresh_in_progress',
  'permission_denied',
  'invalid_payload',
  'missing_context',
  'expired_context',
  'server_validation_failed',
  'unsupported_schema_version',
  'corrupt_payload',
  'unknown',
]);

export type QuickLogQueueRetryDecision =
  | Readonly<{
    decision: 'retryable';
    category: QuickLogQueueErrorCategory;
    retryAfterMs: number | null;
  }>
  | Readonly<{
    decision: 'permanent';
    category: QuickLogQueueErrorCategory;
    retryAfterMs: null;
  }>;

export type QuickLogManualRetry = Readonly<{
  client_event_id: string;
  bypasses_delay: true;
  item: QuickLogStoredQueueItem;
}>;

export function normalizeQuickLogQueueFailureForPersistence(
  input: Readonly<{ error: unknown; retryCount: number }>,
): QuickLogQueueRetryDecision {
  return classifyQuickLogQueueError({
    kind: getQuickLogQueueFailureKind(input.error),
    retryCount: input.retryCount,
    retryAfterMs: getQuickLogRetryAfterMs(input.error),
  });
}

export function classifyQuickLogQueueError(
  input: Readonly<{
    kind: QuickLogQueueFailureKind;
    retryCount: number;
    retryAfterMs?: number | null;
  }>,
): QuickLogQueueRetryDecision {
  switch (input.kind) {
    case 'network_unavailable':
    case 'request_timeout':
    case 'server_5xx':
    case 'auth_refresh_in_progress':
      return {
        decision: 'retryable',
        category: parseQuickLogQueueErrorCategory(input.kind),
        retryAfterMs: null,
      };

    case 'rate_limited':
      return {
        decision: 'retryable',
        category: 'rate_limited',
        retryAfterMs: input.retryAfterMs ?? null,
      };

    case 'permission_denied':
    case 'invalid_payload':
    case 'missing_context':
    case 'expired_context':
    case 'server_validation_failed':
    case 'unsupported_schema_version':
    case 'corrupt_payload':
      return {
        decision: 'permanent',
        category: parseQuickLogQueueErrorCategory(input.kind),
        retryAfterMs: null,
      };

    case 'unknown':
      if (input.retryCount >= QUICK_LOG_QUEUE_MAX_UNKNOWN_RETRY_COUNT) {
        return {
          decision: 'permanent',
          category: 'unknown_retry_exhausted',
          retryAfterMs: null,
        };
      }

      return {
        decision: 'retryable',
        category: 'unknown',
        retryAfterMs: null,
      };
  }
}

function getQuickLogQueueFailureKind(error: unknown): QuickLogQueueFailureKind {
  if (
    isRecord(error)
    && typeof error.kind === 'string'
    && quickLogQueueFailureKinds.has(error.kind as QuickLogQueueFailureKind)
  ) {
    return error.kind as QuickLogQueueFailureKind;
  }

  return 'unknown';
}

function getQuickLogRetryAfterMs(error: unknown): number | null {
  if (!isRecord(error) || typeof error.retryAfterMs !== 'number') {
    return null;
  }

  return error.retryAfterMs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getQuickLogRetryDelayMs(
  input: Readonly<{ retryCount: number; jitterRatio?: number }>,
): number {
  const retryCount = Math.max(1, input.retryCount);
  const baseDelay = Math.min(
    QUICK_LOG_QUEUE_RETRY_BASE_DELAY_MS * (2 ** (retryCount - 1)),
    QUICK_LOG_QUEUE_RETRY_MAX_DELAY_MS,
  );
  const jitteredDelay = Math.round(baseDelay * (1 + (input.jitterRatio ?? 0)));

  return Math.max(0, Math.min(jitteredDelay, QUICK_LOG_QUEUE_RETRY_MAX_DELAY_MS));
}

export function createManualQuickLogRetry(
  item: QuickLogStoredQueueItem,
  options: Readonly<{ now: string }>,
): QuickLogManualRetry {
  if (item.state !== 'failed_retryable' && item.state !== 'failed_permanent') {
    throw new Error(`Invalid Quick Log manual retry state: ${item.state}`);
  }

  // User-driven Retry is the only path that can revive failed_permanent.
  const retryItem = createStoredQuickLogQueueItem({
    ...item,
    state: 'sending',
    last_error_category: null,
    retry_after_at: null,
    updated_at: options.now,
  });

  return {
    client_event_id: item.client_event_id,
    bypasses_delay: true,
    item: retryItem,
  };
}
