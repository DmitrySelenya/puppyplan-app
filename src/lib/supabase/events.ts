import {
  eventLogRecordSchema,
  type EventLogInsert,
  type EventLogRecord,
} from '@/contracts/supabase';
import type { QuickLogQueueFailureKind } from '@/lib/queue';

import { getSupabaseClient } from './client';

export type QuickLogSupabaseErrorPhase =
  | 'insert'
  | 'select_existing_after_23505'
  | 'select_for_tombstone'
  | 'tombstone';

export type QuickLogSupabaseErrorSignals = Readonly<{
  isAuthRefreshing?: boolean;
}>;

export type QuickLogSupabaseErrorClassification = Readonly<{
  kind: QuickLogQueueFailureKind;
  retryAfterMs: number | null;
}>;

export type QuickLogSupabaseFailure = Error & {
  kind: QuickLogQueueFailureKind;
  retryAfterMs: number | null;
};

export type SupabaseEventLogRepository = Readonly<{
  insertEvent(insert: EventLogInsert): Promise<EventLogRecord>;
  selectExistingEvent(input: Readonly<{
    householdId: string;
    clientEventId: string;
  }>): Promise<EventLogRecord | null>;
  tombstoneByClientEventId(input: Readonly<{
    householdId: string;
    clientEventId: string;
    deletedAt: string;
  }>): Promise<EventLogRecord>;
}>;

type EventLogClient = Readonly<{
  insertEventLog(insert: EventLogInsert): PromiseLike<EventLogClientResponse>;
  selectEventLogByClientEventId(input: Readonly<{
    householdId: string;
    clientEventId: string;
  }>): PromiseLike<EventLogClientResponse>;
  tombstoneEventLogById(input: Readonly<{
    id: string;
    deletedAt: string;
  }>): PromiseLike<EventLogClientResponse>;
}>;

type EventLogClientResponse = Readonly<{
  data: unknown;
  error: unknown;
  status?: number;
}>;

export function createSupabaseEventLogRepository(
  client: EventLogClient = createDefaultEventLogClient(),
  options: Readonly<{ signals?: QuickLogSupabaseErrorSignals }> = {},
): SupabaseEventLogRepository {
  return {
    insertEvent: async (insert) => {
      const insertResponse = await client.insertEventLog(insert);

      if (!insertResponse.error) {
        return parseEventLogRecord(insertResponse.data);
      }

      if (getErrorCode(insertResponse.error) !== '23505') {
        throw createQuickLogSupabaseFailure(insertResponse.error, {
          phase: 'insert',
          signals: options.signals,
        });
      }

      const existing = await selectExistingEvent(client, {
        householdId: insert.household_id,
        clientEventId: insert.client_event_id,
        signals: options.signals,
      });

      if (existing === null) {
        throw createQuickLogSupabaseFailure({
          code: 'PGRST116',
          status: 406,
        }, {
          phase: 'select_existing_after_23505',
          signals: options.signals,
        });
      }

      if (!isQuickLogIdempotentDuplicate(insert, existing)) {
        throw createQuickLogSupabaseFailure({
          code: '23514',
          status: 409,
        }, {
          phase: 'select_existing_after_23505',
          signals: options.signals,
        });
      }

      return existing;
    },
    selectExistingEvent: (input) => selectExistingEvent(client, {
      ...input,
      signals: options.signals,
    }),
    tombstoneByClientEventId: async (input) => {
      const existing = await selectExistingEvent(client, {
        householdId: input.householdId,
        clientEventId: input.clientEventId,
        signals: options.signals,
        phase: 'select_for_tombstone',
      });

      if (existing === null) {
        throw createQuickLogSupabaseFailure({
          code: 'PGRST116',
          status: 406,
        }, {
          phase: 'select_for_tombstone',
          signals: options.signals,
        });
      }

      const tombstoneResponse = await client.tombstoneEventLogById({
        id: existing.id,
        deletedAt: input.deletedAt,
      });

      if (tombstoneResponse.error) {
        throw createQuickLogSupabaseFailure(tombstoneResponse.error, {
          phase: 'tombstone',
          signals: options.signals,
        });
      }

      return parseEventLogRecord(tombstoneResponse.data);
    },
  };
}

function createDefaultEventLogClient(): EventLogClient {
  return {
    insertEventLog: (insert) => getSupabaseClient()
      .from('event_log')
      .insert(insert)
      .select('*')
      .maybeSingle(),
    selectEventLogByClientEventId: (input) => getSupabaseClient()
      .from('event_log')
      .select('*')
      .eq('household_id', input.householdId)
      .eq('client_event_id', input.clientEventId)
      .maybeSingle(),
    tombstoneEventLogById: (input) => getSupabaseClient()
      .from('event_log')
      .update({
        deleted_at: input.deletedAt,
      })
      .eq('id', input.id)
      .select('*')
      .maybeSingle(),
  };
}

export function isQuickLogIdempotentDuplicate(
  insert: EventLogInsert,
  existing: EventLogRecord,
): boolean {
  return insert.household_id === existing.household_id
    && insert.client_event_id === existing.client_event_id
    && insert.created_by === existing.created_by
    && insert.puppy_id === existing.puppy_id
    && insert.event_type === existing.event_type
    && insert.payload_version === existing.payload_version
    && insert.occurred_at === existing.occurred_at;
}

export function classifyQuickLogSupabaseError(
  error: unknown,
  context: Readonly<{
    phase: QuickLogSupabaseErrorPhase;
    signals?: QuickLogSupabaseErrorSignals;
  }>,
): QuickLogSupabaseErrorClassification {
  const code = getErrorCode(error);
  const status = getErrorStatus(error);
  const name = getStringProperty(error, 'name');
  const message = getStringProperty(error, 'message')?.toLowerCase() ?? '';

  if (
    context.phase === 'select_existing_after_23505'
    && (code === 'PGRST116' || status === 406)
  ) {
    return {
      kind: 'unknown',
      retryAfterMs: null,
    };
  }

  if (code === '42501' || status === 401 || status === 403) {
    return {
      kind: context.signals?.isAuthRefreshing === true
        ? 'auth_refresh_in_progress'
        : 'permission_denied',
      retryAfterMs: null,
    };
  }

  if (
    code === '23502'
    || code === '23503'
    || code === '23514'
    || code === '22P02'
  ) {
    return {
      kind: 'invalid_payload',
      retryAfterMs: null,
    };
  }

  if (status === 429) {
    return {
      kind: 'rate_limited',
      retryAfterMs: getNumberProperty(error, 'retryAfterMs') ?? null,
    };
  }

  if (typeof status === 'number' && status >= 500) {
    return {
      kind: 'server_5xx',
      retryAfterMs: null,
    };
  }

  if (
    name === 'AbortError'
    || code === 'ABORT_ERR'
    || message.includes('timeout')
  ) {
    return {
      kind: 'request_timeout',
      retryAfterMs: null,
    };
  }

  if (
    name === 'TypeError'
    && (message.includes('fetch') || message.includes('network request failed'))
  ) {
    return {
      kind: 'network_unavailable',
      retryAfterMs: null,
    };
  }

  return {
    kind: 'unknown',
    retryAfterMs: null,
  };
}

export function createQuickLogSupabaseFailure(
  error: unknown,
  context: Readonly<{
    phase: QuickLogSupabaseErrorPhase;
    signals?: QuickLogSupabaseErrorSignals;
  }>,
): QuickLogSupabaseFailure {
  const classification = classifyQuickLogSupabaseError(error, context);
  const failure = new Error('Quick Log Supabase event request failed') as QuickLogSupabaseFailure;

  failure.kind = classification.kind;
  failure.retryAfterMs = classification.retryAfterMs;

  return failure;
}

async function selectExistingEvent(
  client: EventLogClient,
  input: Readonly<{
    householdId: string;
    clientEventId: string;
    signals?: QuickLogSupabaseErrorSignals;
    phase?: QuickLogSupabaseErrorPhase;
  }>,
): Promise<EventLogRecord | null> {
  const response = await client.selectEventLogByClientEventId({
    householdId: input.householdId,
    clientEventId: input.clientEventId,
  });

  if (response.error) {
    const code = getErrorCode(response.error);
    const status = getErrorStatus(response.error);

    if (code === 'PGRST116' || status === 406) {
      return null;
    }

    throw createQuickLogSupabaseFailure(response.error, {
      phase: input.phase ?? 'select_existing_after_23505',
      signals: input.signals,
    });
  }

  if (response.data === null || response.data === undefined) {
    return null;
  }

  return parseEventLogRecord(response.data);
}

function parseEventLogRecord(value: unknown): EventLogRecord {
  const result = eventLogRecordSchema.safeParse(value);

  if (!result.success) {
    throw createQuickLogSupabaseFailure({
      code: '23514',
      status: 400,
    }, {
      phase: 'insert',
    });
  }

  return result.data;
}

function getErrorCode(error: unknown): string | undefined {
  return getStringProperty(error, 'code');
}

function getErrorStatus(error: unknown): number | undefined {
  const status = getNumberProperty(error, 'status');

  return status ?? getNumberProperty(error, 'statusCode');
}

function getStringProperty(value: unknown, property: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const propertyValue = value[property];

  return typeof propertyValue === 'string' ? propertyValue : undefined;
}

function getNumberProperty(value: unknown, property: string): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const propertyValue = value[property];

  return typeof propertyValue === 'number' ? propertyValue : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
