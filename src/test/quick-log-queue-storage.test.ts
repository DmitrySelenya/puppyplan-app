import {
  QUICK_LOG_QUEUE_SCHEMA_VERSION,
  QUICK_LOG_QUEUE_TABLE_NAME,
  applyQuickLogQueueMigrations,
  createQuickLogQueueStorage,
  type QuickLogQueueSqlExecutor,
  type QuickLogQueueSqlParams,
  type QuickLogQueueSqlRunner,
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
  public failNextTransactionalRun = false;

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

    if (/SELECT \* FROM queue_item\s+WHERE \(state = \?/i.test(sql)) {
      const now = String(params[2]);
      const sortedRows = Array.from(this.rows.values())
        .filter((row) =>
          row.state === 'pending_local'
          || (
            row.state === 'failed_retryable'
            && (row.retry_after_at === null || Date.parse(row.retry_after_at) <= Date.parse(now))
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

    if (/SELECT client_event_id, payload_json\s+FROM queue_item/i.test(sql)) {
      const eventType = String(params[0]);

      return Array.from(this.rows.values())
        .filter((row) => row.event_type === eventType)
        .map((row) => ({
          client_event_id: row.client_event_id,
          payload_json: row.payload_json,
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

    try {
      return await task(this);
    } catch (error) {
      this.rows.clear();

      for (const [clientEventIdValue, row] of snapshot) {
        this.rows.set(clientEventIdValue, row);
      }

      throw error;
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
