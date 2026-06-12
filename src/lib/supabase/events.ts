import {
  eventPayloadSchemas,
  eventLogRecordSchema,
  type EventType,
  type EventLogInsert,
  type EventLogRecord,
  type JsonValue,
} from '@/contracts/supabase';
import type { QuickLogQueueFailureKind } from '@/lib/queue';

import { getSupabaseClient } from './client';

export type QuickLogSupabaseErrorPhase =
  | 'insert'
  | 'list'
  | 'select_existing_after_23505'
  | 'select_for_update_payload'
  | 'select_for_tombstone'
  | 'tombstone'
  | 'update_payload';

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

export type EventLogListFilters = Readonly<{
  from?: string;
  to?: string;
  eventTypes?: readonly EventType[];
  cursor?: string;
}>;

export type SupabaseEventLogRepository = Readonly<{
  insertEvent(insert: EventLogInsert): Promise<EventLogRecord>;
  listEvents(input: Readonly<{
    householdId: string;
    puppyId: string;
    filters?: EventLogListFilters;
  }>): Promise<readonly EventLogRecord[]>;
  selectExistingEvent(input: Readonly<{
    householdId: string;
    clientEventId: string;
  }>): Promise<EventLogRecord | null>;
  tombstoneByClientEventId(input: Readonly<{
    householdId: string;
    clientEventId: string;
    deletedAt: string;
  }>): Promise<EventLogRecord>;
  updatePayloadByClientEventId(input: Readonly<{
    householdId: string;
    clientEventId: string;
    eventType: EventType;
    payload: Record<string, JsonValue>;
  }>): Promise<EventLogRecord>;
}>;

type EventLogClient = Readonly<{
  insertEventLog(insert: EventLogInsert): PromiseLike<EventLogClientResponse>;
  listEventLog(input: Readonly<{
    householdId: string;
    puppyId: string;
    filters: EventLogListFilters;
  }>): PromiseLike<EventLogClientResponse>;
  selectEventLogByClientEventId(input: Readonly<{
    householdId: string;
    clientEventId: string;
  }>): PromiseLike<EventLogClientResponse>;
  tombstoneEventLogById(input: Readonly<{
    id: string;
    deletedAt: string;
  }>): PromiseLike<EventLogClientResponse>;
  updateEventLogPayloadById(input: Readonly<{
    id: string;
    payload: Record<string, JsonValue>;
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
        return parseEventLogRecord(insertResponse.data, 'insert');
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
    listEvents: async (input) => {
      const response = await client.listEventLog({
        filters: input.filters ?? {},
        householdId: input.householdId,
        puppyId: input.puppyId,
      });

      if (response.error) {
        throw createQuickLogSupabaseFailure(response.error, {
          phase: 'list',
          signals: options.signals,
        });
      }

      return parseEventLogRecords(response.data);
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

      return parseEventLogRecord(tombstoneResponse.data, 'tombstone');
    },
    updatePayloadByClientEventId: async (input) => {
      const payload = parseEventPayload(input.eventType, input.payload, 'update_payload');
      const existing = await selectExistingEvent(client, {
        householdId: input.householdId,
        clientEventId: input.clientEventId,
        signals: options.signals,
        phase: 'select_for_update_payload',
      });

      if (existing === null || existing.event_type !== input.eventType) {
        throw createQuickLogSupabaseFailure({
          code: '23514',
          status: 400,
        }, {
          phase: 'select_for_update_payload',
          signals: options.signals,
        });
      }

      const updateResponse = await client.updateEventLogPayloadById({
        id: existing.id,
        payload,
      });

      if (updateResponse.error) {
        throw createQuickLogSupabaseFailure(updateResponse.error, {
          phase: 'update_payload',
          signals: options.signals,
        });
      }

      return parseEventLogRecord(updateResponse.data, 'update_payload');
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
    listEventLog: (input) => {
      let query = getSupabaseClient()
        .from('event_log')
        .select('*')
        .eq('household_id', input.householdId)
        .eq('puppy_id', input.puppyId)
        .is('deleted_at', null);

      if (input.filters.from !== undefined) {
        query = query.gte('occurred_at', createLocalDayIsoRange(input.filters.from).startIso);
      }

      if (input.filters.to !== undefined) {
        query = query.lte('occurred_at', createLocalDayIsoRange(input.filters.to).endIso);
      }

      if (input.filters.cursor !== undefined) {
        query = query.lt('occurred_at', input.filters.cursor);
      }

      if (input.filters.eventTypes !== undefined && input.filters.eventTypes.length > 0) {
        query = query.in('event_type', [...input.filters.eventTypes]);
      }

      return query
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
    },
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
    updateEventLogPayloadById: (input) => getSupabaseClient()
      .from('event_log')
      .update({
        payload: input.payload,
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

  return parseEventLogRecord(response.data, input.phase ?? 'select_existing_after_23505');
}

function parseEventLogRecord(
  value: unknown,
  phase: QuickLogSupabaseErrorPhase,
): EventLogRecord {
  const result = eventLogRecordSchema.safeParse(value);

  if (!result.success) {
    throw createQuickLogSupabaseFailure({
      code: '23514',
      status: 400,
    }, {
      phase,
    });
  }

  return result.data;
}

function parseEventLogRecords(value: unknown): readonly EventLogRecord[] {
  const result = eventLogRecordSchema.array().safeParse(value);

  if (!result.success) {
    throw createQuickLogSupabaseFailure({
      code: '23514',
      status: 400,
    }, {
      phase: 'list',
    });
  }

  return result.data;
}

function parseEventPayload(
  eventType: EventType,
  payload: Record<string, JsonValue>,
  phase: QuickLogSupabaseErrorPhase,
): Record<string, JsonValue> {
  const result = eventPayloadSchemas[eventType].safeParse(payload);

  if (!result.success) {
    throw createQuickLogSupabaseFailure({
      code: '23514',
      status: 400,
    }, {
      phase,
    });
  }

  return result.data as Record<string, JsonValue>;
}

export function createLocalDayIsoRange(date: string): Readonly<{
  endIso: string;
  startIso: string;
}> {
  const [year, month, day] = date.split('-').map((part) => Number.parseInt(part, 10));

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw createQuickLogSupabaseFailure({
      code: '23514',
      status: 400,
    }, {
      phase: 'list',
    });
  }

  return {
    endIso: new Date(year, month - 1, day, 23, 59, 59, 999).toISOString(),
    startIso: new Date(year, month - 1, day, 0, 0, 0, 0).toISOString(),
  };
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
