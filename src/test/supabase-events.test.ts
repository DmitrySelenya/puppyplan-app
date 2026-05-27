import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  classifyQuickLogSupabaseError,
  createSupabaseEventLogRepository,
  isQuickLogIdempotentDuplicate,
} from '@/lib/supabase/events';
import type { EventLogInsert, EventLogRecord } from '@/contracts/supabase';

const householdId = '00000000-0000-4000-8000-000000000101';
const puppyId = '00000000-0000-4000-8000-000000000102';
const createdBy = '00000000-0000-4000-8000-000000000103';
const clientEventId = 'evt_00000000-0000-4000-8000-000000000104';
const occurredAt = '2026-05-26T08:00:00.000Z';

const insert: EventLogInsert = {
  household_id: householdId,
  puppy_id: puppyId,
  created_by: createdBy,
  client_event_id: clientEventId,
  event_type: 'feeding',
  occurred_at: occurredAt,
  payload_version: 1,
  payload: {
    amount: 'meal',
  },
};

const serverRow: EventLogRecord = {
  id: '00000000-0000-4000-8000-000000000105',
  ...insert,
  version: 1,
  deleted_at: null,
  created_at: '2026-05-26T08:00:01.000Z',
  updated_at: '2026-05-26T08:00:01.000Z',
};

describe('Quick Log Supabase event wrappers', () => {
  it('keeps the wrapper free of forbidden double assertions', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/supabase/events.ts'), 'utf8');

    expect(source).not.toContain('as unknown as');
  });

  it('accepts an idempotent duplicate when identity fields match without comparing payload', () => {
    expect(isQuickLogIdempotentDuplicate(insert, {
      ...serverRow,
      payload: {
        amount: 'snack',
      },
    })).toBe(true);
  });

  it('rejects an idempotent duplicate when routing identity differs', () => {
    expect(isQuickLogIdempotentDuplicate(insert, {
      ...serverRow,
      created_by: '00000000-0000-4000-8000-000000000106',
    })).toBe(false);
    expect(isQuickLogIdempotentDuplicate(insert, {
      ...serverRow,
      occurred_at: '2026-05-26T08:00:02.000Z',
    })).toBe(false);
  });

  it('maps duplicate lookup races to retryable unknown instead of permanent validation', () => {
    expect(classifyQuickLogSupabaseError({
      code: 'PGRST116',
      status: 406,
      details: 'raw database details must not drive logic',
    }, {
      phase: 'select_existing_after_23505',
    })).toEqual({
      kind: 'unknown',
      retryAfterMs: null,
    });
  });

  it('maps auth refresh only from an explicit signal', () => {
    expect(classifyQuickLogSupabaseError({
      code: '42501',
      status: 401,
    }, {
      phase: 'insert',
      signals: {
        isAuthRefreshing: true,
      },
    })).toEqual({
      kind: 'auth_refresh_in_progress',
      retryAfterMs: null,
    });
    expect(classifyQuickLogSupabaseError({
      code: '42501',
      status: 401,
    }, {
      phase: 'insert',
    })).toEqual({
      kind: 'permission_denied',
      retryAfterMs: null,
    });
  });

  it('uses SQLSTATE and status without branching on raw details', () => {
    expect(classifyQuickLogSupabaseError({
      code: '23514',
      status: 400,
      details: 'constraint event_log_payload_private_name_idx',
    }, {
      phase: 'insert',
    })).toEqual({
      kind: 'invalid_payload',
      retryAfterMs: null,
    });
    expect(classifyQuickLogSupabaseError({
      status: 503,
      details: 'private server internals',
    }, {
      phase: 'insert',
    })).toEqual({
      kind: 'server_5xx',
      retryAfterMs: null,
    });
  });

  it('maps native fetch network failures to retryable network_unavailable', () => {
    expect(classifyQuickLogSupabaseError(new TypeError('Network request failed'), {
      phase: 'insert',
    })).toEqual({
      kind: 'network_unavailable',
      retryAfterMs: null,
    });
  });

  it('inserts an event and parses the returned server row', async () => {
    const client = new RecordingEventLogClient([
      { data: serverRow, error: null, status: 201 },
    ]);
    const repository = createSupabaseEventLogRepository(client);

    await expect(repository.insertEvent(insert)).resolves.toEqual(serverRow);
    expect(client.calls).toEqual([
      'from:event_log',
      'insert',
      'select:*',
      'maybeSingle',
    ]);
  });

  it('resolves an insert 23505 through the existing idempotent row', async () => {
    const client = new RecordingEventLogClient([
      { data: null, error: { code: '23505', status: 409 }, status: 409 },
      { data: serverRow, error: null, status: 200 },
    ]);
    const repository = createSupabaseEventLogRepository(client);

    await expect(repository.insertEvent(insert)).resolves.toEqual(serverRow);
    expect(client.calls).toEqual([
      'from:event_log',
      'insert',
      'select:*',
      'maybeSingle',
      'from:event_log',
      'select:*',
      `eq:household_id:${householdId}`,
      `eq:client_event_id:${clientEventId}`,
      'maybeSingle',
    ]);
  });

  it('rejects an insert 23505 when the existing row identity does not match', async () => {
    const client = new RecordingEventLogClient([
      { data: null, error: { code: '23505', status: 409 }, status: 409 },
      {
        data: {
          ...serverRow,
          puppy_id: '00000000-0000-4000-8000-000000000106',
        },
        error: null,
        status: 200,
      },
    ]);
    const repository = createSupabaseEventLogRepository(client);

    await expect(repository.insertEvent(insert)).rejects.toMatchObject({
      kind: 'invalid_payload',
      retryAfterMs: null,
    });
  });

  it('keeps an insert 23505 with no visible row retryable', async () => {
    const client = new RecordingEventLogClient([
      { data: null, error: { code: '23505', status: 409 }, status: 409 },
      { data: null, error: { code: 'PGRST116', status: 406 }, status: 406 },
    ]);
    const repository = createSupabaseEventLogRepository(client);

    await expect(repository.insertEvent(insert)).rejects.toMatchObject({
      kind: 'unknown',
      retryAfterMs: null,
    });
  });

  it('selects a server row by composite id before tombstoning by row id', async () => {
    const client = new RecordingEventLogClient([
      { data: serverRow, error: null, status: 200 },
      { data: { ...serverRow, deleted_at: '2026-05-26T08:00:04.000Z' }, error: null, status: 200 },
    ]);
    const repository = createSupabaseEventLogRepository(client);

    await expect(repository.tombstoneByClientEventId({
      householdId,
      clientEventId,
      deletedAt: '2026-05-26T08:00:04.000Z',
    })).resolves.toMatchObject({
      id: serverRow.id,
      deleted_at: '2026-05-26T08:00:04.000Z',
    });

    expect(client.calls).toEqual([
      'from:event_log',
      'select:*',
      `eq:household_id:${householdId}`,
      `eq:client_event_id:${clientEventId}`,
      'maybeSingle',
      'from:event_log',
      'update:deleted_at',
      `eq:id:${serverRow.id}`,
      'select:*',
      'maybeSingle',
    ]);
  });
});

type EventLogClientResponse = Readonly<{
  data: unknown;
  error: unknown;
  status: number;
}>;

class RecordingEventLogClient {
  public readonly calls: string[] = [];
  private responseIndex = 0;

  public constructor(private readonly responses: readonly EventLogClientResponse[]) {}

  public async insertEventLog(insertValue: EventLogInsert): Promise<EventLogClientResponse> {
    void insertValue;

    return this.from('event_log')
      .insert()
      .select('*')
      .maybeSingle();
  }

  public async selectEventLogByClientEventId(input: {
    householdId: string;
    clientEventId: string;
  }): Promise<EventLogClientResponse> {
    return this.from('event_log')
      .select('*')
      .eq('household_id', input.householdId)
      .eq('client_event_id', input.clientEventId)
      .maybeSingle();
  }

  public async tombstoneEventLogById(input: {
    id: string;
    deletedAt: string;
  }): Promise<EventLogClientResponse> {
    return this.from('event_log')
      .update({
        deleted_at: input.deletedAt,
      })
      .eq('id', input.id)
      .select('*')
      .maybeSingle();
  }

  public from(table: string): RecordingEventLogQuery {
    this.calls.push(`from:${table}`);

    return new RecordingEventLogQuery(this);
  }

  public nextResponse(): EventLogClientResponse {
    const response = this.responses[this.responseIndex];

    if (!response) {
      throw new Error('Missing fake Supabase response');
    }

    this.responseIndex += 1;

    return response;
  }
}

class RecordingEventLogQuery {
  public constructor(private readonly client: RecordingEventLogClient) {}

  public insert(): RecordingEventLogQuery {
    this.client.calls.push('insert');

    return this;
  }

  public update(values: Readonly<Record<string, unknown>>): RecordingEventLogQuery {
    this.client.calls.push(`update:${Object.keys(values).sort().join(',')}`);

    return this;
  }

  public select(columns = '*'): RecordingEventLogQuery {
    this.client.calls.push(`select:${columns}`);

    return this;
  }

  public eq(column: string, value: string): RecordingEventLogQuery {
    this.client.calls.push(`eq:${column}:${value}`);

    return this;
  }

  public async maybeSingle(): Promise<EventLogClientResponse> {
    this.client.calls.push('maybeSingle');

    return this.client.nextResponse();
  }
}
