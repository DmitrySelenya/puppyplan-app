import {
  QUICK_LOG_QUEUE_SCHEMA_VERSION,
  QUICK_LOG_QUEUE_TABLE_NAME,
  applyQuickLogQueueMigrations,
  createQuickLogQueueStorage,
  type QuickLogQueueSqlExecutor,
  type QuickLogQueueSqlParams,
  type QuickLogQueueSqlRunner,
  type QuickLogQueueStorage,
  type QuickLogStoredQueueItem,
} from '@/lib/queue';

const householdId = '00000000-0000-4000-8000-000000000011';
const puppyId = '00000000-0000-4000-8000-000000000012';
const clientEventId = 'evt_00000000-0000-4000-8000-000000000013';
const occurredAt = '2026-05-26T08:00:00.000Z';
const createdAt = '2026-05-26T08:00:01.000Z';
const createdBy = '00000000-0000-4000-8000-000000000017';

type QueueRow = {
  client_event_id: string;
  household_id: string;
  puppy_id: string;
  created_by: string | null;
  event_type: string;
  payload_version: number;
  payload_json: string;
  occurred_at: string;
  state: string;
  retry_count: number;
  last_error_category: string | null;
  retry_after_at: string | null;
  created_at: string;
  updated_at: string;
};

class TestQueueSqlExecutor implements QuickLogQueueSqlExecutor {
  public userVersion = 0;
  public readonly columns = new Set([
    'client_event_id',
    'household_id',
    'puppy_id',
    'event_type',
    'payload_version',
    'payload_json',
    'occurred_at',
    'state',
    'retry_count',
    'last_error_category',
    'retry_after_at',
    'created_at',
    'updated_at',
  ]);
  public readonly rows = new Map<string, QueueRow>();
  public readonly statements: string[] = [];
  public activeExclusiveTransactions = 0;
  public exclusiveTransactionRuns = 0;
  public failNextTransactionalRun = false;
  public afterNextQueueItemStateWrite: (() => Promise<void>) | undefined;
  public afterNextDetailWrite: (() => Promise<void>) | undefined;

  public async execAsync(sql: string): Promise<void> {
    this.statements.push(sql);

    if (/ADD COLUMN created_by TEXT/i.test(sql)) {
      this.columns.add('created_by');
    }

    const userVersion = sql.match(/PRAGMA user_version = (\d+)/i)?.[1];

    if (userVersion) {
      this.userVersion = Number(userVersion);
    }
  }

  public async runAsync(sql: string, params: QuickLogQueueSqlParams = []): Promise<void> {
    this.statements.push(sql);

    if (this.failNextTransactionalRun) {
      this.failNextTransactionalRun = false;
      throw new Error('synthetic transactional failure');
    }

    if (/INSERT OR IGNORE INTO queue_item/i.test(sql)) {
      const row = rowFromParams(params);

      if (!this.rows.has(row.client_event_id)) {
        this.rows.set(row.client_event_id, row);
      }

      return;
    }

    if (/UPDATE queue_item\s+SET payload_json = \?/i.test(sql)) {
      const payload_json = params[0];
      const client_event_id = params[1];

      if (typeof payload_json !== 'string' || typeof client_event_id !== 'string') {
        throw new Error('Missing payload migration update parameters');
      }

      const existing = this.rows.get(client_event_id);

      if (!existing) {
        return;
      }

      this.rows.set(client_event_id, {
        ...existing,
        payload_json,
      });

      return;
    }

    if (/UPDATE queue_item\s+SET payload_version = \?/i.test(sql)) {
      const payload_version = params[0];
      const payload_json = params[1];
      const nextOccurredAt = params[2];
      const updated_at = params[3];
      const client_event_id = params[4];

      if (
        typeof payload_version !== 'number'
        || typeof payload_json !== 'string'
        || typeof nextOccurredAt !== 'string'
        || typeof updated_at !== 'string'
        || typeof client_event_id !== 'string'
      ) {
        throw new Error('Missing detail update parameters');
      }

      const existing = this.rows.get(client_event_id);
      if (existing) {
        this.rows.set(client_event_id, {
          ...existing,
          occurred_at: nextOccurredAt,
          payload_json,
          payload_version,
          updated_at,
        });
      }

      const afterWrite = this.afterNextDetailWrite;
      this.afterNextDetailWrite = undefined;
      await afterWrite?.();
      return;
    }

    if (/UPDATE queue_item[\s\S]+created_by IS NULL/i.test(sql)) {
      const updatedAt = params.find((value) =>
        typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value));
      if (typeof updatedAt !== 'string') {
        throw new Error('Missing legacy quarantine timestamp');
      }

      for (const [rowId, row] of this.rows) {
        if (
          row.created_by === null
          && ['pending_local', 'sending', 'failed_retryable'].includes(row.state)
        ) {
          this.rows.set(rowId, {
            ...row,
            state: 'failed_permanent',
            retry_count: row.retry_count + 1,
            last_error_category: 'missing_context',
            retry_after_at: null,
            updated_at: updatedAt,
          });
        }
      }

      return;
    }

    if (/UPDATE queue_item\s+SET state = \?,\s+retry_count = retry_count \+ 1/i.test(sql)) {
      const state = params[0];
      const last_error_category = params[1];
      const payload_json = params[2];
      const client_event_id = params[3];

      if (
        typeof state !== 'string' ||
        typeof last_error_category !== 'string' ||
        typeof payload_json !== 'string' ||
        typeof client_event_id !== 'string'
      ) {
        throw new Error('Missing corrupt payload quarantine update parameters');
      }

      const existing = this.rows.get(client_event_id);

      if (!existing) {
        return;
      }

      this.rows.set(client_event_id, {
        ...existing,
        state,
        retry_count: existing.retry_count + 1,
        last_error_category,
        retry_after_at: null,
        payload_json,
      });

      return;
    }

    if (/UPDATE queue_item/i.test(sql)) {
      // Parameter order mirrors writeQueueItemState in src/lib/queue/storage.ts.
      const client_event_id = params[5];

      if (typeof client_event_id !== 'string') {
        throw new Error('Missing client_event_id update parameter');
      }

      const existing = this.rows.get(client_event_id);

      if (!existing) {
        return;
      }

      this.rows.set(client_event_id, {
        ...existing,
        state: String(params[0]),
        retry_count: Number(params[1]),
        last_error_category: typeof params[2] === 'string' ? params[2] : null,
        retry_after_at: typeof params[3] === 'string' ? params[3] : null,
        updated_at: String(params[4]),
      });

      const afterWrite = this.afterNextQueueItemStateWrite;
      this.afterNextQueueItemStateWrite = undefined;
      await afterWrite?.();

      return;
    }

    if (/DELETE FROM queue_item/i.test(sql)) {
      const client_event_id = params[0];

      if (typeof client_event_id === 'string') {
        this.rows.delete(client_event_id);
      }
    }
  }

  public async getFirstAsync<T>(sql: string, params: QuickLogQueueSqlParams = []): Promise<T | null> {
    this.statements.push(sql);

    if (/PRAGMA user_version/i.test(sql)) {
      return { user_version: this.userVersion } as T;
    }

    if (/SELECT \* FROM queue_item[\s\S]+LIMIT 1/i.test(sql)) {
      const nowParameterIndex = sqlParameterIndex(sql, /julianday\(\?\)/i);
      const actorParameterIndex = sqlParameterIndex(sql, /created_by\s*=\s*\?/i);
      const now = String(nowParameterIndex === null ? '' : params[nowParameterIndex]);
      const actorId = actorParameterIndex === null
        ? null
        : String(params[actorParameterIndex]);
      const sortedRows = Array.from(this.rows.values())
        .filter((row) =>
          (actorId === null || row.created_by === actorId)
          && (
            row.state === 'pending_local'
            || (
              row.state === 'failed_retryable'
              && (row.retry_after_at === null || Date.parse(row.retry_after_at) <= Date.parse(now))
            )
          ))
        .sort((left, right) => left.created_at.localeCompare(right.created_at));

      return (sortedRows[0] ?? null) as T | null;
    }

    if (/SELECT \* FROM queue_item WHERE client_event_id/i.test(sql)) {
      const client_event_id = params[0];

      if (typeof client_event_id !== 'string') {
        return null;
      }

      return (this.rows.get(client_event_id) ?? null) as T | null;
    }

    return null;
  }

  public async getAllAsync<T>(
    sql: string,
    params: QuickLogQueueSqlParams = [],
  ): Promise<T[]> {
    this.statements.push(sql);

    if (/SELECT client_event_id, payload_json, state\s+FROM queue_item/i.test(sql)) {
      const eventType = String(params[0]);

      return Array.from(this.rows.values())
        .filter((row) => row.event_type === eventType)
        .map((row) => ({
          client_event_id: row.client_event_id,
          payload_json: row.payload_json,
          state: row.state,
        })) as T[];
    }

    if (/SELECT \* FROM queue_item/i.test(sql)) {
      let rows = Array.from(this.rows.values());

      if (/WHERE state IN/i.test(sql)) {
        const states = new Set(params.map(String));
        rows = rows.filter((row) => states.has(row.state));
      }

      return rows as T[];
    }

    if (/PRAGMA table_info\(queue_item\)/i.test(sql)) {
      return Array.from(this.columns).map((name) => ({ name })) as T[];
    }

    return [];
  }

  public async withExclusiveTransactionAsync<T>(
    task: (executor: QuickLogQueueSqlRunner) => Promise<T>,
  ): Promise<T> {
    const snapshot = new Map(this.rows);
    this.exclusiveTransactionRuns += 1;
    this.activeExclusiveTransactions += 1;

    try {
      return await task(this);
    } catch (error) {
      this.rows.clear();

      for (const [clientEventIdValue, row] of snapshot) {
        this.rows.set(clientEventIdValue, row);
      }

      throw error;
    } finally {
      this.activeExclusiveTransactions -= 1;
    }
  }
}

function enqueueInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    client_event_id: clientEventId,
    household_id: householdId,
    puppy_id: puppyId,
    created_by: createdBy,
    event_type: 'feeding',
    payload_version: 1,
    payload: {
      amount: 'meal',
    },
    occurred_at: occurredAt,
    created_at: createdAt,
    ...overrides,
  };
}

function rowFromParams(params: QuickLogQueueSqlParams): QueueRow {
  return {
    client_event_id: String(params[0]),
    household_id: String(params[1]),
    puppy_id: String(params[2]),
    created_by: typeof params[3] === 'string' ? params[3] : null,
    event_type: String(params[4]),
    payload_version: Number(params[5]),
    payload_json: String(params[6]),
    occurred_at: String(params[7]),
    state: String(params[8]),
    retry_count: Number(params[9]),
    last_error_category: typeof params[10] === 'string' ? params[10] : null,
    retry_after_at: typeof params[11] === 'string' ? params[11] : null,
    created_at: String(params[12]),
    updated_at: String(params[13]),
  };
}

function sqlParameterIndex(sql: string, pattern: RegExp): number | null {
  const match = pattern.exec(sql);
  if (match?.index === undefined) return null;
  return (sql.slice(0, match.index).match(/\?/g) ?? []).length;
}

type LegacyMissingActorQuarantineStorage = Readonly<{
  quarantineLegacyMissingActorItems(options: Readonly<{ now: string }>): Promise<void>;
}>;

type ActorAwareManualRetryStorage = Readonly<{
  manualRetryIfOwned(
    expectedClientEventId: string,
    options: Readonly<{
      expectedCreatedBy: string;
      isActorCurrent: () => boolean;
      now: string;
      recoverySurface?: 'manual_retry';
    }>,
  ): Promise<Awaited<ReturnType<QuickLogQueueStorage['manualRetry']>> | null>;
}>;

type ActorAwareDetailUpdateStorage = Readonly<{
  updateDetails(
    expectedClientEventId: string,
    options: Readonly<{
      expectedCreatedBy: string;
      isActorCurrent: () => boolean;
      now: string;
      occurredAt: string;
      payload: Record<string, import('@/contracts/supabase').JsonValue>;
      payloadVersion: 1 | 2;
    }>,
  ): Promise<QuickLogStoredQueueItem | null>;
}>;

function requireLegacyMissingActorQuarantine(
  storage: QuickLogQueueStorage,
): LegacyMissingActorQuarantineStorage['quarantineLegacyMissingActorItems'] {
  const quarantine = (storage as QuickLogQueueStorage & Partial<
    LegacyMissingActorQuarantineStorage
  >).quarantineLegacyMissingActorItems;

  if (quarantine === undefined) {
    throw new Error('Expected Quick Log storage to expose legacy missing-actor quarantine');
  }

  return quarantine.bind(storage);
}

function requireActorAwareManualRetry(
  storage: QuickLogQueueStorage,
): ActorAwareManualRetryStorage['manualRetryIfOwned'] {
  const manualRetryIfOwned = (storage as QuickLogQueueStorage & Partial<
    ActorAwareManualRetryStorage
  >).manualRetryIfOwned;

  if (manualRetryIfOwned === undefined) {
    throw new Error('Expected Quick Log storage to expose actor-aware manual Retry');
  }

  return manualRetryIfOwned.bind(storage);
}

function requireActorAwareDetailUpdate(
  storage: QuickLogQueueStorage,
): ActorAwareDetailUpdateStorage['updateDetails'] {
  const updateDetails = (storage as QuickLogQueueStorage & Partial<
    ActorAwareDetailUpdateStorage
  >).updateDetails;

  if (updateDetails === undefined) {
    throw new Error('Expected Quick Log storage to expose actor-aware detail updates');
  }

  return updateDetails.bind(storage);
}

function createStorageWriteGate(): Readonly<{
  promise: Promise<void>;
  resolve(): void;
  signal(): void;
  signaled: Promise<void>;
}> {
  let releaseWrite = (): void => {
    throw new Error('Expected detail write release gate to be initialized');
  };
  let signalWrite = (): void => {
    throw new Error('Expected detail write signal gate to be initialized');
  };
  const promise = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  const signaled = new Promise<void>((resolve) => {
    signalWrite = resolve;
  });

  return {
    promise,
    resolve: releaseWrite,
    signal: signalWrite,
    signaled,
  };
}

describe('Quick Log queue SQLite storage boundary', () => {
  it('applies explicit local schema versioning without Supabase migrations', async () => {
    const executor = new TestQueueSqlExecutor();

    await applyQuickLogQueueMigrations(executor);

    expect(QUICK_LOG_QUEUE_SCHEMA_VERSION).toBe(3);
    expect(executor.userVersion).toBe(QUICK_LOG_QUEUE_SCHEMA_VERSION);
    expect(QUICK_LOG_QUEUE_TABLE_NAME).toBe('queue_item');
    expect(executor.statements.join('\n')).toContain('CREATE TABLE IF NOT EXISTS queue_item');
    expect(executor.statements.join('\n')).toContain('client_event_id TEXT PRIMARY KEY');
    expect(executor.statements.join('\n')).toContain('created_by TEXT');
    expect(executor.statements.join('\n')).toContain('payload_json TEXT NOT NULL');
    expect(executor.statements.join('\n')).toContain('last_error_category TEXT');
    expect(executor.statements.join('\n')).toContain('PRAGMA user_version = 3');
  });

  it('migrates local schema v1 queues by adding created_by in place', async () => {
    const executor = new TestQueueSqlExecutor();

    executor.userVersion = 1;

    await applyQuickLogQueueMigrations(executor);

    expect(executor.userVersion).toBe(QUICK_LOG_QUEUE_SCHEMA_VERSION);
    expect(executor.columns.has('created_by')).toBe(true);
    expect(executor.statements.join('\n')).toContain('ALTER TABLE queue_item ADD COLUMN created_by TEXT');
    expect(executor.statements.join('\n')).not.toContain('CREATE TABLE IF NOT EXISTS queue_item');
  });

  it('migrates local schema v2 legacy potty quick_action payloads before queue parsing', async () => {
    const executor = new TestQueueSqlExecutor();

    executor.userVersion = 2;
    executor.columns.add('created_by');
    executor.rows.set(clientEventId, {
      client_event_id: clientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'potty',
      payload_version: 1,
      payload_json: '{"quick_action":"pee_inside"}',
      occurred_at: occurredAt,
      state: 'pending_local',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
      created_at: createdAt,
      updated_at: createdAt,
    });

    await applyQuickLogQueueMigrations(executor);

    expect(executor.userVersion).toBe(QUICK_LOG_QUEUE_SCHEMA_VERSION);
    expect(executor.rows.get(clientEventId)?.payload_json).toBe('{"subtype":"inside"}');

    const storage = createQuickLogQueueStorage(executor);

    await expect(storage.getByClientEventId(clientEventId)).resolves.toMatchObject({
      client_event_id: clientEventId,
      event_type: 'potty',
      payload: {
        subtype: 'inside',
      },
    });
  });

  it('AC-1/AC-2: quarantines corrupt v2 legacy potty payloads without blocking healthy rows', async () => {
    const executor = new TestQueueSqlExecutor();
    const observability = {
      captureException: jest.fn(),
    };
    const corruptJsonClientEventId = 'evt_00000000-0000-4000-8000-000000000018';
    const nonObjectClientEventId = 'evt_00000000-0000-4000-8000-000000000019';
    const invalidObjectClientEventId = 'evt_00000000-0000-4000-8000-000000000020';
    const invalidSubtypeClientEventId = 'evt_00000000-0000-4000-8000-000000000021';

    executor.userVersion = 2;
    executor.columns.add('created_by');
    executor.rows.set(corruptJsonClientEventId, {
      client_event_id: corruptJsonClientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'potty',
      payload_version: 1,
      payload_json: '{not-json',
      occurred_at: occurredAt,
      state: 'pending_local',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
      created_at: '2026-05-26T07:58:00.000Z',
      updated_at: '2026-05-26T07:58:00.000Z',
    });
    executor.rows.set(nonObjectClientEventId, {
      client_event_id: nonObjectClientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'potty',
      payload_version: 1,
      payload_json: '[]',
      occurred_at: occurredAt,
      state: 'pending_local',
      retry_count: 2,
      last_error_category: null,
      retry_after_at: null,
      created_at: '2026-05-26T07:59:00.000Z',
      updated_at: '2026-05-26T07:59:00.000Z',
    });
    executor.rows.set(invalidObjectClientEventId, {
      client_event_id: invalidObjectClientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'potty',
      payload_version: 1,
      payload_json: '{}',
      occurred_at: occurredAt,
      state: 'pending_local',
      retry_count: 1,
      last_error_category: null,
      retry_after_at: null,
      created_at: '2026-05-26T07:59:30.000Z',
      updated_at: '2026-05-26T07:59:30.000Z',
    });
    executor.rows.set(invalidSubtypeClientEventId, {
      client_event_id: invalidSubtypeClientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'potty',
      payload_version: 1,
      payload_json: '{"subtype":"pee_outside"}',
      occurred_at: occurredAt,
      state: 'pending_local',
      retry_count: 1,
      last_error_category: null,
      retry_after_at: null,
      created_at: '2026-05-26T07:59:45.000Z',
      updated_at: '2026-05-26T07:59:45.000Z',
    });
    executor.rows.set(clientEventId, {
      client_event_id: clientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'potty',
      payload_version: 1,
      payload_json: '{"quick_action":"poop"}',
      occurred_at: occurredAt,
      state: 'pending_local',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
      created_at: createdAt,
      updated_at: createdAt,
    });

    await applyQuickLogQueueMigrations(executor, { observability });

    expect(executor.userVersion).toBe(QUICK_LOG_QUEUE_SCHEMA_VERSION);
    expect(executor.rows.get(corruptJsonClientEventId)).toMatchObject({
      state: 'failed_permanent',
      retry_count: 1,
      last_error_category: 'corrupt_payload',
      retry_after_at: null,
      payload_json: '{}',
    });
    expect(executor.rows.get(nonObjectClientEventId)).toMatchObject({
      state: 'failed_permanent',
      retry_count: 3,
      last_error_category: 'corrupt_payload',
      retry_after_at: null,
      payload_json: '{}',
    });
    expect(executor.rows.get(invalidObjectClientEventId)).toMatchObject({
      state: 'failed_permanent',
      retry_count: 2,
      last_error_category: 'corrupt_payload',
      retry_after_at: null,
      payload_json: '{}',
    });
    expect(executor.rows.get(invalidSubtypeClientEventId)).toMatchObject({
      state: 'failed_permanent',
      retry_count: 2,
      last_error_category: 'corrupt_payload',
      retry_after_at: null,
      payload_json: '{}',
    });
    expect(executor.rows.get(clientEventId)?.payload_json).toBe('{"subtype":"poop"}');
    expect(observability.captureException).toHaveBeenCalledTimes(4);
    expect(observability.captureException).toHaveBeenCalledWith(expect.any(Error), {
      area: 'quick_log_queue',
      errorCategory: 'corrupt_payload',
      operation: 'schema_migration_v3',
      tags: {
        migration: 'v3',
      },
    });

    const storage = createQuickLogQueueStorage(executor);

    await expect(storage.getByClientEventId(corruptJsonClientEventId)).resolves.toMatchObject({
      client_event_id: corruptJsonClientEventId,
      last_error_category: 'corrupt_payload',
      payload: {},
      state: 'failed_permanent',
    });
    await expect(storage.getByClientEventId(invalidSubtypeClientEventId)).resolves.toMatchObject({
      client_event_id: invalidSubtypeClientEventId,
      last_error_category: 'corrupt_payload',
      payload: {},
      state: 'failed_permanent',
    });
    await expect(storage.manualRetry(invalidSubtypeClientEventId, {
      now: '2026-05-26T08:01:00.000Z',
    })).rejects.toThrow();
    await expect(storage.remove(corruptJsonClientEventId)).resolves.toBeUndefined();
    expect(executor.rows.has(corruptJsonClientEventId)).toBe(false);
    await expect(storage.claimNextReadyToSend({
      now: '2026-05-26T08:02:00.000Z',
    })).resolves.toMatchObject({
      client_event_id: clientEventId,
      payload: {
        subtype: 'poop',
      },
      state: 'sending',
    });
  });

  it('AC-3: preserves deleted-before-sync corrupt rows as terminal during v3 migration', async () => {
    const executor = new TestQueueSqlExecutor();
    const observability = {
      captureException: jest.fn(),
    };
    const deletedClientEventId = 'evt_00000000-0000-4000-8000-000000000022';

    executor.userVersion = 2;
    executor.columns.add('created_by');
    executor.rows.set(deletedClientEventId, {
      client_event_id: deletedClientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'potty',
      payload_version: 1,
      payload_json: '{not-json',
      occurred_at: occurredAt,
      state: 'deleted_before_sync',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
      created_at: '2026-05-26T07:57:00.000Z',
      updated_at: '2026-05-26T07:57:00.000Z',
    });

    await applyQuickLogQueueMigrations(executor, { observability });

    expect(executor.rows.get(deletedClientEventId)).toMatchObject({
      state: 'deleted_before_sync',
      retry_count: 1,
      last_error_category: 'corrupt_payload',
      retry_after_at: null,
      payload_json: '{}',
    });

    const storage = createQuickLogQueueStorage(executor);

    await expect(storage.getByClientEventId(deletedClientEventId)).resolves.toMatchObject({
      client_event_id: deletedClientEventId,
      last_error_category: 'corrupt_payload',
      payload: {},
      state: 'deleted_before_sync',
    });
    await expect(storage.claimNextReadyToSend({
      now: '2026-05-26T08:02:00.000Z',
    })).resolves.toBeNull();
  });

  it('AC-1: keeps corrupt server-confirmed rows terminal and readable during v3 migration', async () => {
    const executor = new TestQueueSqlExecutor();
    const observability = {
      captureException: jest.fn(),
    };
    const confirmedClientEventId = 'evt_00000000-0000-4000-8000-000000000023';

    executor.userVersion = 2;
    executor.columns.add('created_by');
    executor.rows.set(confirmedClientEventId, {
      client_event_id: confirmedClientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'potty',
      payload_version: 1,
      payload_json: '{not-json',
      occurred_at: occurredAt,
      state: 'server_confirmed',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
      created_at: '2026-05-26T07:56:00.000Z',
      updated_at: '2026-05-26T07:56:00.000Z',
    });

    await applyQuickLogQueueMigrations(executor, { observability });

    expect(executor.rows.get(confirmedClientEventId)).toMatchObject({
      state: 'server_confirmed',
      retry_count: 1,
      last_error_category: 'corrupt_payload',
      retry_after_at: null,
      payload_json: '{}',
    });

    const storage = createQuickLogQueueStorage(executor);

    await expect(storage.getByClientEventId(confirmedClientEventId)).resolves.toMatchObject({
      client_event_id: confirmedClientEventId,
      last_error_category: 'corrupt_payload',
      payload: {},
      state: 'server_confirmed',
    });
  });

  it('serializes the minimal Quick Log queue payload with the original actor', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    const stored = await storage.enqueue(enqueueInput(), {
      now: createdAt,
    });
    const row = executor.rows.get(clientEventId);

    expect(stored).toMatchObject({
      client_event_id: clientEventId,
      created_by: createdBy,
      state: 'pending_local',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
    });
    expect(row).toBeDefined();
    expect(row?.created_by).toBe(createdBy);
    expect(row?.payload_json).toBe('{"amount":"meal"}');
    expect(JSON.stringify(row)).not.toContain('notes');
    expect(JSON.stringify(row)).not.toContain('puppy_name');
    expect(JSON.stringify(row)).not.toContain('private-contact-marker');
  });

  it('AC-P1-RECOVERY-10 atomically persists a full actor-scoped synced-delete intent', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor) as ReturnType<
      typeof createQuickLogQueueStorage
    > & {
      enqueueDeletedBeforeSync(
        input: unknown,
        options: Readonly<{
          now: string;
          retryAfterAt?: string;
        }>,
      ): Promise<unknown>;
    };

    await expect(storage.enqueueDeletedBeforeSync(enqueueInput(), {
      now: createdAt,
    })).resolves.toMatchObject({
      client_event_id: clientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'feeding',
      payload_version: 1,
      payload: { amount: 'meal' },
      occurred_at: occurredAt,
      state: 'deleted_before_sync',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
    });
    expect(executor.rows.get(clientEventId)).toMatchObject({
      created_by: createdBy,
      payload_json: '{"amount":"meal"}',
      retry_after_at: null,
      state: 'deleted_before_sync',
    });

    const delayedClientEventId = 'evt_00000000-0000-4000-8000-000000000040';
    const retryAfterAt = '2026-05-26T08:00:05.000Z';
    await expect(storage.enqueueDeletedBeforeSync(enqueueInput({
      client_event_id: delayedClientEventId,
    }), {
      now: createdAt,
      retryAfterAt,
    })).resolves.toMatchObject({
      client_event_id: delayedClientEventId,
      retry_count: 0,
      retry_after_at: retryAfterAt,
      state: 'deleted_before_sync',
    });
    expect(executor.rows.get(delayedClientEventId)).toMatchObject({
      retry_after_at: retryAfterAt,
      state: 'deleted_before_sync',
    });

    const failedClientEventId = 'evt_00000000-0000-4000-8000-000000000041';
    executor.failNextTransactionalRun = true;
    await expect(storage.enqueueDeletedBeforeSync(enqueueInput({
      client_event_id: failedClientEventId,
    }), {
      now: '2026-05-26T08:00:02.000Z',
    })).rejects.toThrow('synthetic transactional failure');
    expect(executor.rows.has(failedClientEventId)).toBe(false);
  });

  it('AC-P3-ACTOR-1 removes a local Undo intent only when state and expected actor match atomically', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor) as ReturnType<
      typeof createQuickLogQueueStorage
    > & {
      removeIfState(
        expectedClientEventId: string,
        expectedState: 'deleted_before_sync',
        options: Readonly<{ expectedCreatedBy: string }>,
      ): Promise<boolean>;
    };
    const otherActorId = '00000000-0000-4000-8000-000000000099';

    await storage.enqueueDeletedBeforeSync(enqueueInput(), { now: createdAt });

    await expect(storage.removeIfState(clientEventId, 'deleted_before_sync', {
      expectedCreatedBy: otherActorId,
    })).resolves.toBe(false);
    await expect(storage.getByClientEventId(clientEventId)).resolves.toMatchObject({
      client_event_id: clientEventId,
      created_by: createdBy,
      state: 'deleted_before_sync',
    });

    await expect(storage.removeIfState(clientEventId, 'deleted_before_sync', {
      expectedCreatedBy: createdBy,
    })).resolves.toBe(true);
    await expect(storage.getByClientEventId(clientEventId)).resolves.toBeNull();
  });

  it('AC-P3-ACTOR-8 atomically recovers sending only for the matching real SQLite owner', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const recoverIfOwned = storage.markFailedRetryableIfOwned;
    if (recoverIfOwned === undefined) throw new Error('Expected atomic recovery capability');
    const otherActorId = '00000000-0000-4000-8000-000000000099';

    await storage.enqueue(enqueueInput(), { now: createdAt });
    await storage.markSending(clientEventId, { now: '2026-05-26T08:00:02.000Z' });
    const before = await storage.getByClientEventId(clientEventId);

    await expect(recoverIfOwned(clientEventId, {
      errorCategory: 'unknown',
      expectedCreatedBy: otherActorId,
      expectedState: 'sending',
      retryAfterAt: '2026-05-26T08:10:00.000Z',
      now: '2026-05-26T08:00:03.000Z',
    })).resolves.toBeNull();
    await expect(storage.getByClientEventId(clientEventId)).resolves.toEqual(before);
    await expect(recoverIfOwned(clientEventId, {
      errorCategory: 'unknown',
      expectedCreatedBy: createdBy,
      expectedState: 'sending',
      retryAfterAt: '2026-05-26T08:10:00.000Z',
      now: '2026-05-26T08:00:03.000Z',
    })).resolves.toMatchObject({
      created_by: createdBy,
      last_error_category: 'unknown',
      state: 'failed_retryable',
    });
  });

  it('AC-P3-ACTOR-3 transitions sending to deleted only when source state and expected actor match atomically', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor) as ReturnType<
      typeof createQuickLogQueueStorage
    > & {
      markDeletedBeforeSync(
        expectedClientEventId: string,
        options: Readonly<{
          expectedCreatedBy: string;
          expectedState: 'sending';
          now: string;
        }>,
      ): Promise<QuickLogStoredQueueItem | null>;
    };
    const pendingClientEventId = 'evt_00000000-0000-4000-8000-000000000042';
    const foreignClientEventId = 'evt_00000000-0000-4000-8000-000000000043';
    const matchingClientEventId = 'evt_00000000-0000-4000-8000-000000000044';
    const otherActorId = '00000000-0000-4000-8000-000000000099';

    await storage.enqueue(enqueueInput({ client_event_id: pendingClientEventId }), {
      now: createdAt,
    });
    await storage.enqueue(enqueueInput({ client_event_id: foreignClientEventId }), {
      now: createdAt,
    });
    await storage.enqueue(enqueueInput({ client_event_id: matchingClientEventId }), {
      now: createdAt,
    });
    await storage.markSending(foreignClientEventId, { now: '2026-05-26T08:00:02.000Z' });
    await storage.markSending(matchingClientEventId, { now: '2026-05-26T08:00:02.000Z' });

    const pendingBefore = await storage.getByClientEventId(pendingClientEventId);
    const foreignBefore = await storage.getByClientEventId(foreignClientEventId);
    const outcomes = await Promise.all([
      storage.markDeletedBeforeSync(pendingClientEventId, {
        expectedCreatedBy: createdBy,
        expectedState: 'sending',
        now: '2026-05-26T08:00:03.000Z',
      }),
      storage.markDeletedBeforeSync(foreignClientEventId, {
        expectedCreatedBy: otherActorId,
        expectedState: 'sending',
        now: '2026-05-26T08:00:03.000Z',
      }),
      storage.markDeletedBeforeSync(matchingClientEventId, {
        expectedCreatedBy: createdBy,
        expectedState: 'sending',
        now: '2026-05-26T08:00:03.000Z',
      }),
    ]);

    expect({
      foreignAfter: await storage.getByClientEventId(foreignClientEventId),
      outcomes,
      pendingAfter: await storage.getByClientEventId(pendingClientEventId),
    }).toEqual({
      foreignAfter: foreignBefore,
      outcomes: [
        null,
        null,
        expect.objectContaining({
          client_event_id: matchingClientEventId,
          created_by: createdBy,
          state: 'deleted_before_sync',
        }),
      ],
      pendingAfter: pendingBefore,
    });
  });

  it.each([
    'pending_local',
    'failed_retryable',
    'failed_permanent',
  ] as const)(
    'AC-P3-ACTOR-3 removes a %s row only when source state and expected actor match atomically',
    async (expectedState) => {
      const executor = new TestQueueSqlExecutor();
      const storage = createQuickLogQueueStorage(executor);
      const otherActorId = '00000000-0000-4000-8000-000000000099';

      await storage.enqueue(enqueueInput(), { now: createdAt });
      if (expectedState !== 'pending_local') {
        await storage.markSending(clientEventId, { now: '2026-05-26T08:00:02.000Z' });
        if (expectedState === 'failed_retryable') {
          await storage.markFailedRetryable(clientEventId, {
            errorCategory: 'network_unavailable',
            now: '2026-05-26T08:00:03.000Z',
            retryAfterAt: '2026-05-26T08:00:04.000Z',
          });
        } else {
          await storage.markFailedPermanent(clientEventId, {
            errorCategory: 'permission_denied',
            now: '2026-05-26T08:00:03.000Z',
          });
        }
      }
      const before = await storage.getByClientEventId(clientEventId);

      await expect(storage.removeIfState?.(clientEventId, expectedState, {
        expectedCreatedBy: otherActorId,
      })).resolves.toBe(false);
      await expect(storage.getByClientEventId(clientEventId)).resolves.toEqual(before);
      await expect(storage.removeIfState?.(clientEventId, expectedState, {
        expectedCreatedBy: createdBy,
      })).resolves.toBe(true);
      await expect(storage.getByClientEventId(clientEventId)).resolves.toBeNull();
    },
  );

  it.each([
    'pending_local',
    'sending',
    'failed_retryable',
    'failed_permanent',
    'server_confirmed',
  ] as const)(
    'AC-P1-RECOVERY-10 atomically converts a colliding %s row into a non-insertable delete intent',
    async (existingState) => {
      const executor = new TestQueueSqlExecutor();
      const storage = createQuickLogQueueStorage(executor);

      await storage.enqueue(enqueueInput(), { now: createdAt });
      if (existingState !== 'pending_local') {
        await storage.markSending(clientEventId, { now: '2026-05-26T08:00:02.000Z' });
      }
      if (existingState === 'failed_retryable') {
        await storage.markFailedRetryable(clientEventId, {
          errorCategory: 'network_unavailable',
          retryAfterAt: '2026-05-26T08:05:00.000Z',
          now: '2026-05-26T08:00:03.000Z',
        });
      } else if (existingState === 'failed_permanent') {
        await storage.markFailedPermanent(clientEventId, {
          errorCategory: 'permission_denied',
          now: '2026-05-26T08:00:03.000Z',
        });
      } else if (existingState === 'server_confirmed') {
        await storage.resolveInFlightSuccess(clientEventId, {
          now: '2026-05-26T08:00:03.000Z',
        });
      }

      const outcome = await storage.enqueueDeletedBeforeSync(enqueueInput(), {
        now: '2026-05-26T08:00:04.000Z',
        retryAfterAt: '2026-05-26T08:00:09.000Z',
      }).then(
        (value) => ({ status: 'accepted' as const, value }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );

      if (outcome.status === 'rejected') {
        expect(outcome.error).toBeInstanceOf(Error);
        return;
      }

      expect(outcome.value).toMatchObject({
        client_event_id: clientEventId,
        state: 'deleted_before_sync',
        retry_after_at: '2026-05-26T08:00:09.000Z',
      });
      await expect(storage.getByClientEventId(clientEventId)).resolves.toMatchObject({
        state: 'deleted_before_sync',
      });
      await expect(storage.claimNextReadyToSend({
        createdBy,
        now: '2099-05-26T08:00:00.000Z',
      })).resolves.toBeNull();
    },
  );

  it.each([
    {
      label: 'household_id',
      override: { household_id: '00000000-0000-4000-8000-000000000042' },
    },
    {
      label: 'puppy_id',
      override: { puppy_id: '00000000-0000-4000-8000-000000000043' },
    },
    {
      label: 'event_type',
      override: { event_type: 'potty', payload: { subtype: 'outside' } },
    },
    {
      label: 'payload_version',
      override: { payload_version: 2 },
    },
    {
      label: 'occurred_at',
      override: { occurred_at: '2026-05-26T08:00:30.000Z' },
    },
  ])(
    'AC-P1-RECOVERY-10 rejects a destructive client-id collision with mismatched $label atomically',
    async ({ override }) => {
      const executor = new TestQueueSqlExecutor();
      const storage = createQuickLogQueueStorage(executor);

      await storage.enqueue(enqueueInput(), { now: createdAt });
      const originalRow = executor.rows.get(clientEventId);
      if (originalRow === undefined) throw new Error('Expected a synthetic queue row');

      const outcome = await storage.enqueueDeletedBeforeSync(enqueueInput(override), {
        now: '2026-05-26T08:00:04.000Z',
        retryAfterAt: '2026-05-26T08:00:09.000Z',
      }).then(
        () => ({ status: 'accepted' as const }),
        (error: unknown) => ({ error, status: 'rejected' as const }),
      );

      expect(outcome).toEqual({
        error: expect.any(Error),
        status: 'rejected',
      });
      expect(executor.rows.size).toBe(1);
      expect(executor.rows.get(clientEventId)).toEqual(originalRow);
      expect(executor.rows.get(clientEventId)?.state).toBe('pending_local');
      await expect(storage.claimNextReadyToSend({
        createdBy,
        now: '2099-05-26T08:00:00.000Z',
      })).resolves.toMatchObject({
        client_event_id: clientEventId,
        state: 'sending',
      });
    },
  );

  it('AC-3/AC-4: persists and retries a v2 observation without changing its note or time', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const observationId = 'evt_00000000-0000-4000-8000-000000000024';
    const observationInput = enqueueInput({
      client_event_id: observationId,
      event_type: 'observation',
      payload_version: 2,
      payload: {
        title: 'Settled after walk',
        note: 'Synthetic context retained exactly',
      },
    });

    await expect(storage.enqueue(observationInput, { now: createdAt })).resolves.toMatchObject({
      client_event_id: observationId,
      payload_version: 2,
      occurred_at: occurredAt,
      payload: observationInput.payload,
      state: 'pending_local',
    });
    await storage.markSending(observationId, { now: '2026-05-26T08:00:02.000Z' });
    await storage.markFailedRetryable(observationId, {
      errorCategory: 'network_unavailable',
      retryAfterAt: null,
      now: '2026-05-26T08:00:03.000Z',
    });

    await expect(storage.manualRetry(observationId, {
      now: '2026-05-26T08:00:04.000Z',
    })).resolves.toMatchObject({
      item: {
        client_event_id: observationId,
        payload_version: 2,
        occurred_at: occurredAt,
        payload: observationInput.payload,
        state: 'sending',
      },
    });
  });

  it('AC-6 atomically updates pending-local details without changing queue state', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    await storage.enqueue(enqueueInput(), { now: createdAt });

    await expect(storage.updateDetails(clientEventId, {
      now: '2026-05-26T08:00:02.000Z',
      occurredAt: '2026-05-26T07:40:00.000Z',
      payload: { amount: 'water', note: 'Synthetic private context' },
      payloadVersion: 2,
    })).resolves.toMatchObject({
      occurred_at: '2026-05-26T07:40:00.000Z',
      payload: { amount: 'water', note: 'Synthetic private context' },
      payload_version: 2,
      state: 'pending_local',
    });
  });

  it.each([
    'pending_local',
    'failed_retryable',
    'failed_permanent',
  ] as const)(
    'AC-P3-ACTOR-8 atomically rejects a foreign actor detail update for a %s row without changing private bytes',
    async (state) => {
      const executor = new TestQueueSqlExecutor();
      const storage = createQuickLogQueueStorage(executor);
      const updateDetails = requireActorAwareDetailUpdate(storage);
      const foreignActorId = '00000000-0000-4000-8000-000000000099';
      const privatePayload = {
        note: 'Synthetic retained private context',
        title: 'Synthetic retained title',
      };

      await storage.enqueue(enqueueInput({
        event_type: 'observation',
        payload: privatePayload,
        payload_version: 2,
      }), { now: createdAt });
      if (state !== 'pending_local') {
        await storage.markSending(clientEventId, {
          now: '2026-05-26T08:00:02.000Z',
        });
        if (state === 'failed_retryable') {
          await storage.markFailedRetryable(clientEventId, {
            errorCategory: 'network_unavailable',
            retryAfterAt: '2026-05-26T08:10:00.000Z',
            now: '2026-05-26T08:00:03.000Z',
          });
        } else {
          await storage.markFailedPermanent(clientEventId, {
            errorCategory: 'permission_denied',
            now: '2026-05-26T08:00:03.000Z',
          });
        }
      }
      const before = executor.rows.get(clientEventId);
      const transactionsBefore = executor.exclusiveTransactionRuns;

      await expect(updateDetails(clientEventId, {
        expectedCreatedBy: foreignActorId,
        isActorCurrent: () => true,
        now: '2026-05-26T08:00:04.000Z',
        occurredAt: '2026-05-26T07:40:00.000Z',
        payload: {
          note: 'Synthetic unauthorized replacement',
          title: 'Synthetic unauthorized title',
        },
        payloadVersion: 2,
      })).resolves.toBeNull();

      expect(executor.exclusiveTransactionRuns - transactionsBefore).toBe(1);
      expect(executor.rows.get(clientEventId)).toEqual(before);
    },
  );

  it('AC-P3-ACTOR-8 rolls back a detail update when the expected actor is superseded during the awaited SQLite write', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const updateDetails = requireActorAwareDetailUpdate(storage);
    const secondaryActorId = '00000000-0000-4000-8000-000000000099';
    let currentActorId = createdBy;
    const writeGate = createStorageWriteGate();

    await storage.enqueue(enqueueInput({
      event_type: 'observation',
      payload: {
        note: 'Synthetic retained private context',
        title: 'Synthetic retained title',
      },
      payload_version: 2,
    }), { now: createdAt });
    const before = executor.rows.get(clientEventId);
    const transactionsBefore = executor.exclusiveTransactionRuns;
    executor.afterNextDetailWrite = async () => {
      writeGate.signal();
      await writeGate.promise;
    };

    const updating = updateDetails(clientEventId, {
      expectedCreatedBy: createdBy,
      isActorCurrent: () => {
        expect(executor.activeExclusiveTransactions).toBe(1);
        return currentActorId === createdBy;
      },
      now: '2026-05-26T08:00:04.000Z',
      occurredAt: '2026-05-26T07:40:00.000Z',
      payload: {
        note: 'Synthetic superseded replacement',
        title: 'Synthetic superseded title',
      },
      payloadVersion: 2,
    });

    await writeGate.signaled;
    currentActorId = secondaryActorId;
    writeGate.resolve();

    await expect(updating).resolves.toBeNull();
    expect(executor.exclusiveTransactionRuns - transactionsBefore).toBe(1);
    expect(executor.rows.get(clientEventId)).toEqual(before);
  });

  it('AC-P3-ACTOR-8 atomically updates details for the stable expected actor', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const updateDetails = requireActorAwareDetailUpdate(storage);

    await storage.enqueue(enqueueInput({
      event_type: 'observation',
      payload: { note: 'Synthetic original note', title: 'Synthetic original title' },
      payload_version: 2,
    }), { now: createdAt });

    await expect(updateDetails(clientEventId, {
      expectedCreatedBy: createdBy,
      isActorCurrent: () => true,
      now: '2026-05-26T08:00:04.000Z',
      occurredAt: '2026-05-26T07:40:00.000Z',
      payload: { note: 'Synthetic revised note', title: 'Synthetic revised title' },
      payloadVersion: 2,
    })).resolves.toMatchObject({
      client_event_id: clientEventId,
      created_by: createdBy,
      occurred_at: '2026-05-26T07:40:00.000Z',
      payload: { note: 'Synthetic revised note', title: 'Synthetic revised title' },
      payload_version: 2,
      state: 'pending_local',
    });
  });

  it('rejects new enqueue attempts without an original actor before writing a row', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    await expect(storage.enqueue(enqueueInput({
      created_by: undefined,
    }), {
      now: createdAt,
    })).rejects.toThrow();

    expect(executor.rows.size).toBe(0);
  });

  it('keeps legacy rows with missing actors local and marks them missing_context', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    executor.rows.set(clientEventId, {
      client_event_id: clientEventId,
      household_id: householdId,
      puppy_id: puppyId,
      created_by: null,
      event_type: 'feeding',
      payload_version: 1,
      payload_json: '{"amount":"meal"}',
      occurred_at: occurredAt,
      state: 'pending_local',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
      created_at: createdAt,
      updated_at: createdAt,
    });

    await expect(storage.claimNextReadyToSend({
      now: '2026-05-26T08:02:00.000Z',
    })).resolves.toBeNull();
    await expect(storage.getByClientEventId(clientEventId)).resolves.toMatchObject({
      client_event_id: clientEventId,
      created_by: null,
      state: 'failed_permanent',
      last_error_category: 'missing_context',
    });
  });

  it('AC-P3-LEGACY-2 atomically and idempotently quarantines all non-terminal actorless rows without changing identity or payload', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const quarantine = requireLegacyMissingActorQuarantine(storage);
    const quarantineAt = '2026-07-17T08:00:00.000Z';
    const legacyStates = ['pending_local', 'sending', 'failed_retryable'] as const;
    const legacyIds = legacyStates.map((state, index) =>
      `evt_00000000-0000-4000-8000-00000000010${index}`);
    const actorOwnedId = 'evt_00000000-0000-4000-8000-000000000110';
    const permanentId = 'evt_00000000-0000-4000-8000-000000000111';
    const confirmedId = 'evt_00000000-0000-4000-8000-000000000112';
    const deletedId = 'evt_00000000-0000-4000-8000-000000000113';
    const baseRow = rowFromParams([
      clientEventId,
      householdId,
      puppyId,
      null,
      'feeding',
      1,
      '{"amount":"meal"}',
      occurredAt,
      'pending_local',
      2,
      'network_unavailable',
      '2099-07-17T08:00:00.000Z',
      createdAt,
      createdAt,
    ]);

    legacyStates.forEach((state, index) => {
      const rowId = legacyIds[index];
      if (rowId === undefined) throw new Error('Expected synthetic legacy row id');
      executor.rows.set(rowId, {
        ...baseRow,
        client_event_id: rowId,
        state,
      });
    });
    executor.rows.set(actorOwnedId, {
      ...baseRow,
      client_event_id: actorOwnedId,
      created_by: createdBy,
    });
    executor.rows.set(permanentId, {
      ...baseRow,
      client_event_id: permanentId,
      state: 'failed_permanent',
    });
    executor.rows.set(confirmedId, {
      ...baseRow,
      client_event_id: confirmedId,
      state: 'server_confirmed',
    });
    executor.rows.set(deletedId, {
      ...baseRow,
      client_event_id: deletedId,
      state: 'deleted_before_sync',
    });
    const originals = new Map(executor.rows);

    await quarantine({ now: quarantineAt });

    for (const rowId of legacyIds) {
      const original = originals.get(rowId);
      expect(executor.rows.get(rowId)).toEqual({
        ...original,
        state: 'failed_permanent',
        retry_count: (original?.retry_count ?? 0) + 1,
        last_error_category: 'missing_context',
        retry_after_at: null,
        updated_at: quarantineAt,
      });
    }
    expect(executor.rows.get(actorOwnedId)).toEqual(originals.get(actorOwnedId));
    expect(executor.rows.get(permanentId)).toEqual(originals.get(permanentId));
    expect(executor.rows.get(confirmedId)).toEqual(originals.get(confirmedId));
    expect(executor.rows.get(deletedId)).toEqual(originals.get(deletedId));

    const afterFirstQuarantine = new Map(executor.rows);
    await quarantine({ now: '2026-07-17T08:01:00.000Z' });
    expect(executor.rows).toEqual(afterFirstQuarantine);

    const freshExecutor = new TestQueueSqlExecutor();
    const freshStorage = createQuickLogQueueStorage(freshExecutor);
    const freshQuarantine = requireLegacyMissingActorQuarantine(freshStorage);
    freshExecutor.rows.set(clientEventId, baseRow);
    freshExecutor.failNextTransactionalRun = true;
    await expect(freshQuarantine({ now: quarantineAt }))
      .rejects.toThrow('synthetic transactional failure');
    expect(freshExecutor.rows.get(clientEventId)).toEqual(baseRow);
  });

  it('rejects disallowed private and free-text persistence before writing a row', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    await expect(storage.enqueue(enqueueInput({
      payload: {
        amount: 'meal',
        notes: 'private free text',
      },
    }), { now: createdAt })).rejects.toThrow();
    await expect(storage.enqueue(enqueueInput({
      puppy_name: 'private display name',
    }), { now: createdAt })).rejects.toThrow();
    await expect(storage.markFailedRetryable(clientEventId, {
      errorCategory: 'not_a_scrubbed_category',
      retryAfterAt: null,
      now: createdAt,
    })).rejects.toThrow('Invalid Quick Log queue retryable error category');

    expect(executor.rows.size).toBe(0);
  });

  it('rejects mismatched retry category classes before writing state', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    await storage.enqueue(enqueueInput(), { now: createdAt });
    await storage.markSending(clientEventId, {
      now: '2026-05-26T08:00:02.000Z',
    });

    await expect(storage.markFailedRetryable(clientEventId, {
      errorCategory: 'permission_denied',
      retryAfterAt: null,
      now: '2026-05-26T08:00:03.000Z',
    })).rejects.toThrow('Invalid Quick Log queue retryable error category');
    await expect(storage.markFailedPermanent(clientEventId, {
      errorCategory: 'network_unavailable',
      now: '2026-05-26T08:00:03.000Z',
    })).rejects.toThrow('Invalid Quick Log queue permanent error category');

    expect(await storage.getByClientEventId(clientEventId)).toMatchObject({
      state: 'sending',
      retry_count: 0,
      last_error_category: null,
    });
  });

  it('keeps enqueue idempotent by client_event_id without overwriting failed or deleted rows', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    await storage.enqueue(enqueueInput(), { now: createdAt });
    await storage.markSending(clientEventId, {
      now: '2026-05-26T08:00:02.000Z',
    });
    await storage.markFailedRetryable(clientEventId, {
      errorCategory: 'request_timeout',
      retryAfterAt: '2026-05-26T08:00:05.000Z',
      now: '2026-05-26T08:00:03.000Z',
    });

    await storage.enqueue(enqueueInput({
      payload: {
        amount: 'snack',
      },
    }), { now: '2026-05-26T08:00:04.000Z' });

    expect(executor.rows.size).toBe(1);
    expect(await storage.getByClientEventId(clientEventId)).toMatchObject({
      client_event_id: clientEventId,
      state: 'failed_retryable',
      payload: {
        amount: 'meal',
      },
      retry_count: 1,
      last_error_category: 'request_timeout',
    });

    await storage.markDeletedBeforeSync(clientEventId, {
      now: '2026-05-26T08:00:06.000Z',
    });
    await storage.enqueue(enqueueInput(), {
      now: '2026-05-26T08:00:07.000Z',
    });

    expect(await storage.getByClientEventId(clientEventId)).toMatchObject({
      state: 'deleted_before_sync',
      payload: {
        amount: 'meal',
      },
    });
  });

  it('rolls back a failed transactional state update', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    await storage.enqueue(enqueueInput(), { now: createdAt });
    executor.failNextTransactionalRun = true;

    await expect(storage.markSending(clientEventId, {
      now: '2026-05-26T08:01:00.000Z',
    })).rejects.toThrow('synthetic transactional failure');

    expect(await storage.getByClientEventId(clientEventId)).toMatchObject({
      state: 'pending_local',
      retry_count: 0,
      updated_at: createdAt,
    });
  });

  it('claims a ready item for send only once', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    await storage.enqueue(enqueueInput(), { now: createdAt });

    const firstClaim = await storage.claimNextReadyToSend({
      now: '2026-05-26T08:01:00.000Z',
    });
    const secondClaim = await storage.claimNextReadyToSend({
      now: '2026-05-26T08:01:01.000Z',
    });

    expect(firstClaim).toMatchObject({
      client_event_id: clientEventId,
      state: 'sending',
      updated_at: '2026-05-26T08:01:00.000Z',
    });
    expect(secondClaim).toBeNull();
    expect(await storage.getByClientEventId(clientEventId)).toMatchObject({
      state: 'sending',
      updated_at: '2026-05-26T08:01:00.000Z',
    });
  });

  it('AC-P1-RECOVERY-3 claims the next ready row only for the active actor', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const otherActorId = '00000000-0000-4000-8000-000000000034';
    const otherActorEventId = 'evt_00000000-0000-4000-8000-000000000035';
    const activeActorEventId = 'evt_00000000-0000-4000-8000-000000000036';

    await storage.enqueue(enqueueInput({
      client_event_id: otherActorEventId,
      created_by: otherActorId,
      created_at: '2026-05-26T07:59:00.000Z',
    }), { now: '2026-05-26T07:59:00.000Z' });
    await storage.enqueue(enqueueInput({
      client_event_id: activeActorEventId,
      created_at: '2026-05-26T08:00:00.000Z',
    }), { now: '2026-05-26T08:00:00.000Z' });

    const activeActorClaim = {
      createdBy,
      now: '2026-05-26T08:01:00.000Z',
    };
    await expect(storage.claimNextReadyToSend(activeActorClaim)).resolves.toMatchObject({
      client_event_id: activeActorEventId,
      created_by: createdBy,
      state: 'sending',
    });
    await expect(storage.getByClientEventId(otherActorEventId)).resolves.toMatchObject({
      created_by: otherActorId,
      state: 'pending_local',
    });
  });

  it('AC-P1-RECOVERY-5 recovers stale sending rows after restart without resurrecting terminal rows', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const staleSendingId = 'evt_00000000-0000-4000-8000-000000000031';
    const confirmedId = 'evt_00000000-0000-4000-8000-000000000032';
    const deletedId = 'evt_00000000-0000-4000-8000-000000000033';
    const row = rowFromParams([
      staleSendingId,
      householdId,
      puppyId,
      createdBy,
      'feeding',
      1,
      '{"amount":"meal"}',
      occurredAt,
      'sending',
      1,
      null,
      null,
      createdAt,
      createdAt,
    ]);

    executor.userVersion = QUICK_LOG_QUEUE_SCHEMA_VERSION;
    executor.columns.add('created_by');
    executor.rows.set(staleSendingId, row);
    executor.rows.set(confirmedId, {
      ...row,
      client_event_id: confirmedId,
      state: 'server_confirmed',
    });
    executor.rows.set(deletedId, {
      ...row,
      client_event_id: deletedId,
      state: 'deleted_before_sync',
    });

    await storage.initialize();

    const visibleRecoverable = await storage.list({
      states: ['pending_local', 'failed_retryable', 'failed_permanent'],
    });
    expect(visibleRecoverable.map((item) => item.client_event_id)).toEqual([staleSendingId]);
    await expect(storage.claimNextReadyToSend({
      now: '2026-05-26T08:02:00.000Z',
    })).resolves.toMatchObject({
      client_event_id: staleSendingId,
      state: 'sending',
    });
    await expect(storage.claimNextReadyToSend({
      now: '2026-05-26T08:02:01.000Z',
    })).resolves.toBeNull();
    await expect(storage.getByClientEventId(confirmedId)).resolves.toMatchObject({
      state: 'server_confirmed',
    });
    await expect(storage.getByClientEventId(deletedId)).resolves.toMatchObject({
      state: 'deleted_before_sync',
    });
  });

  it('AC-P3-LEGACY-4 initializes then quarantines actorless sending rows with one total retry increment while recovering actor-owned rows', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const quarantine = requireLegacyMissingActorQuarantine(storage);
    const actorlessEventId = 'evt_00000000-0000-4000-8000-000000000114';
    const actorOwnedEventId = 'evt_00000000-0000-4000-8000-000000000115';
    const quarantineAt = '2026-07-17T09:00:00.000Z';
    const originalRetryCount = 4;
    const sendingRow = rowFromParams([
      actorlessEventId,
      householdId,
      puppyId,
      null,
      'feeding',
      1,
      '{"amount":"meal"}',
      occurredAt,
      'sending',
      originalRetryCount,
      null,
      null,
      createdAt,
      createdAt,
    ]);

    executor.userVersion = QUICK_LOG_QUEUE_SCHEMA_VERSION;
    executor.columns.add('created_by');
    executor.rows.set(actorlessEventId, sendingRow);
    executor.rows.set(actorOwnedEventId, {
      ...sendingRow,
      client_event_id: actorOwnedEventId,
      created_by: createdBy,
    });

    await storage.initialize();
    await quarantine({ now: quarantineAt });

    await expect(storage.getByClientEventId(actorlessEventId)).resolves.toMatchObject({
      client_event_id: actorlessEventId,
      created_by: null,
      state: 'failed_permanent',
      retry_count: originalRetryCount + 1,
      last_error_category: 'missing_context',
      retry_after_at: null,
      updated_at: quarantineAt,
    });
    await expect(storage.getByClientEventId(actorOwnedEventId)).resolves.toMatchObject({
      client_event_id: actorOwnedEventId,
      created_by: createdBy,
      state: 'failed_retryable',
      retry_count: originalRetryCount + 1,
      last_error_category: 'unknown',
      retry_after_at: null,
    });
  });

  it('skips failed retryable rows whose retry delay is still cooling down', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const readyClientEventId = 'evt_00000000-0000-4000-8000-000000000014';

    await storage.enqueue(enqueueInput(), { now: createdAt });
    await storage.markSending(clientEventId, {
      now: '2026-05-26T08:01:10.000Z',
    });
    await storage.markFailedRetryable(clientEventId, {
      errorCategory: 'network_unavailable',
      retryAfterAt: '2026-05-26T08:10:00.000Z',
      now: '2026-05-26T08:01:11.000Z',
    });
    await storage.enqueue(enqueueInput({
      client_event_id: readyClientEventId,
      created_at: '2026-05-26T08:01:12.000Z',
    }), { now: '2026-05-26T08:01:12.000Z' });

    await expect(storage.claimNextReadyToSend({
      now: '2026-05-26T08:02:00.000Z',
    })).resolves.toMatchObject({
      client_event_id: readyClientEventId,
      state: 'sending',
    });
    expect(await storage.getByClientEventId(clientEventId)).toMatchObject({
      state: 'failed_retryable',
      retry_after_at: '2026-05-26T08:10:00.000Z',
    });

    const coolingOnlyExecutor = new TestQueueSqlExecutor();
    const coolingOnlyStorage = createQuickLogQueueStorage(coolingOnlyExecutor);

    await coolingOnlyStorage.enqueue(enqueueInput(), { now: createdAt });
    await coolingOnlyStorage.markSending(clientEventId, {
      now: '2026-05-26T08:01:10.000Z',
    });
    await coolingOnlyStorage.markFailedRetryable(clientEventId, {
      errorCategory: 'network_unavailable',
      retryAfterAt: '2026-05-26T08:10:00.000Z',
      now: '2026-05-26T08:01:11.000Z',
    });

    await expect(coolingOnlyStorage.claimNextReadyToSend({
      now: '2026-05-26T08:02:00.000Z',
    })).resolves.toBeNull();
  });

  it('claims a bounded ready row without parsing unrelated queue rows', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const readyClientEventId = 'evt_00000000-0000-4000-8000-000000000014';

    executor.rows.set('evt_00000000-0000-4000-8000-000000000015', {
      client_event_id: 'evt_00000000-0000-4000-8000-000000000015',
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'feeding',
      payload_version: 1,
      payload_json: '{"notes":"corrupt non-queue free text"}',
      occurred_at: occurredAt,
      state: 'server_confirmed',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
      created_at: '2026-05-26T07:59:00.000Z',
      updated_at: '2026-05-26T07:59:00.000Z',
    });
    await storage.enqueue(enqueueInput({
      client_event_id: readyClientEventId,
      created_at: '2026-05-26T08:01:30.000Z',
    }), { now: '2026-05-26T08:01:30.000Z' });

    await expect(storage.claimNextReadyToSend({
      now: '2026-05-26T08:02:00.000Z',
    })).resolves.toMatchObject({
      client_event_id: readyClientEventId,
      state: 'sending',
    });
    expect(executor.statements.join('\n')).toContain('LIMIT 1');
  });

  it('filters listed states in SQL before parsing rows', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    executor.rows.set('evt_00000000-0000-4000-8000-000000000016', {
      client_event_id: 'evt_00000000-0000-4000-8000-000000000016',
      household_id: householdId,
      puppy_id: puppyId,
      created_by: createdBy,
      event_type: 'feeding',
      payload_version: 1,
      payload_json: '{"notes":"corrupt non-queue free text"}',
      occurred_at: occurredAt,
      state: 'server_confirmed',
      retry_count: 0,
      last_error_category: null,
      retry_after_at: null,
      created_at: '2026-05-26T07:59:00.000Z',
      updated_at: '2026-05-26T07:59:00.000Z',
    });
    await storage.enqueue(enqueueInput(), { now: createdAt });

    await expect(storage.list({ states: ['pending_local'] })).resolves.toEqual([
      expect.objectContaining({
        client_event_id: clientEventId,
        state: 'pending_local',
      }),
    ]);
    expect(executor.statements.join('\n')).toContain('WHERE state IN (?)');
  });

  it('manual retry can re-send a permanent failure without auto-claiming it', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    await storage.enqueue(enqueueInput(), { now: createdAt });
    await storage.markSending(clientEventId, {
      now: '2026-05-26T08:01:10.000Z',
    });
    await storage.markFailedPermanent(clientEventId, {
      errorCategory: 'permission_denied',
      now: '2026-05-26T08:01:11.000Z',
    });

    expect(await storage.claimNextReadyToSend({
      now: '2026-05-26T08:01:12.000Z',
    })).toBeNull();

    const retry = await storage.manualRetry(clientEventId, {
      now: '2026-05-26T08:01:13.000Z',
      recoverySurface: 'manual_retry',
    });

    expect(retry).toMatchObject({
      client_event_id: clientEventId,
      bypasses_delay: true,
      recovery_surface: 'manual_retry',
      item: {
        state: 'sending',
        last_error_category: null,
      },
    });
  });

  it('AC-P3-ACTOR-4 atomically retries only the row owned by the expected actor', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const manualRetryIfOwned = requireActorAwareManualRetry(storage);
    const otherActorId = '00000000-0000-4000-8000-000000000099';

    await storage.enqueue(enqueueInput(), { now: createdAt });
    await storage.markSending(clientEventId, {
      now: '2026-05-26T08:01:10.000Z',
    });
    await storage.markFailedRetryable(clientEventId, {
      errorCategory: 'network_unavailable',
      retryAfterAt: '2026-05-26T08:10:00.000Z',
      now: '2026-05-26T08:01:11.000Z',
    });
    const beforeForeignAttempt = await storage.getByClientEventId(clientEventId);

    await expect(manualRetryIfOwned(clientEventId, {
      expectedCreatedBy: otherActorId,
      isActorCurrent: () => true,
      now: '2026-05-26T08:01:12.000Z',
      recoverySurface: 'manual_retry',
    })).resolves.toBeNull();
    await expect(storage.getByClientEventId(clientEventId)).resolves.toEqual(
      beforeForeignAttempt,
    );

    await expect(manualRetryIfOwned(clientEventId, {
      expectedCreatedBy: createdBy,
      isActorCurrent: () => true,
      now: '2026-05-26T08:01:13.000Z',
      recoverySurface: 'manual_retry',
    })).resolves.toMatchObject({
      client_event_id: clientEventId,
      item: {
        client_event_id: clientEventId,
        created_by: createdBy,
        state: 'sending',
      },
    });
    await expect(storage.getByClientEventId(clientEventId)).resolves.toMatchObject({
      client_event_id: clientEventId,
      created_by: createdBy,
      state: 'sending',
    });
  });

  it('AC-P3-ACTOR-4 rolls back an owned Retry when actor liveness changes during its awaited SQLite write', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);
    const manualRetryIfOwned = requireActorAwareManualRetry(storage);
    const secondaryActorId = '00000000-0000-4000-8000-000000000099';
    let currentActorId = createdBy;
    let releaseWrite = (): void => {
      throw new Error('Expected write release gate to be initialized');
    };
    let signalWrite = (): void => {
      throw new Error('Expected write signal gate to be initialized');
    };
    const writeReached = new Promise<void>((resolve) => {
      signalWrite = resolve;
    });
    const writeRelease = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });

    await storage.enqueue(enqueueInput(), { now: createdAt });
    await storage.markSending(clientEventId, {
      now: '2026-05-26T08:01:10.000Z',
    });
    await storage.markFailedRetryable(clientEventId, {
      errorCategory: 'network_unavailable',
      retryAfterAt: '2026-05-26T08:10:00.000Z',
      now: '2026-05-26T08:01:11.000Z',
    });
    const originalItem = await storage.getByClientEventId(clientEventId);
    const transactionsBeforeRetry = executor.exclusiveTransactionRuns;
    executor.afterNextQueueItemStateWrite = async () => {
      signalWrite();
      await writeRelease;
    };

    const retrying = manualRetryIfOwned(clientEventId, {
      expectedCreatedBy: createdBy,
      isActorCurrent: () => {
        expect(executor.activeExclusiveTransactions).toBe(1);
        return currentActorId === createdBy;
      },
      now: '2026-05-26T08:01:12.000Z',
      recoverySurface: 'manual_retry',
    });

    await writeReached;
    currentActorId = secondaryActorId;
    releaseWrite();

    await expect(retrying).resolves.toBeNull();
    expect(executor.exclusiveTransactionRuns - transactionsBeforeRetry).toBe(1);
    await expect(storage.getByClientEventId(clientEventId)).resolves.toEqual(originalItem);
  });

  it('supports manual retry and late-success delete race outcomes with the original ID', async () => {
    const executor = new TestQueueSqlExecutor();
    const storage = createQuickLogQueueStorage(executor);

    await storage.enqueue(enqueueInput(), { now: createdAt });
    await storage.markSending(clientEventId, {
      now: '2026-05-26T08:02:00.000Z',
    });
    await storage.markFailedRetryable(clientEventId, {
      errorCategory: 'network_unavailable',
      retryAfterAt: '2026-05-26T08:02:10.000Z',
      now: '2026-05-26T08:02:01.000Z',
    });

    const retry = await storage.manualRetry(clientEventId, {
      now: '2026-05-26T08:02:03.000Z',
    });

    expect(retry).toMatchObject({
      client_event_id: clientEventId,
      bypasses_delay: true,
      item: {
        client_event_id: clientEventId,
        state: 'sending',
        retry_after_at: null,
      },
    });
    expect(executor.rows.size).toBe(1);

    await storage.markDeletedBeforeSync(clientEventId, {
      now: '2026-05-26T08:02:04.000Z',
    });

    await expect(storage.resolveInFlightSuccess(clientEventId, {
      now: '2026-05-26T08:02:05.000Z',
    })).resolves.toMatchObject({
      outcome: 'requires_server_cleanup',
      item: {
        client_event_id: clientEventId,
        state: 'deleted_before_sync',
      },
    });

    expect(await storage.getByClientEventId(clientEventId)).toMatchObject({
      state: 'deleted_before_sync',
    });
  });
});
