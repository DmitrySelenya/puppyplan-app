import {
  HEALTH_OUTBOX_SCHEMA_VERSION,
  HEALTH_OUTBOX_TABLE_NAME,
  createHealthOutboxStorage,
  type HealthOutboxSqlExecutor,
  type HealthOutboxSqlParams,
  type HealthOutboxSqlRunner,
} from '@/lib/queue/health-outbox/storage';
import type { HealthRecordInsert } from '@/lib/supabase/health-records';

const operationId = '00000000-0000-4000-8000-000000005001';
const secondOperationId = '00000000-0000-4000-8000-000000005002';
const householdId = '00000000-0000-4000-8000-000000005003';
const puppyId = '00000000-0000-4000-8000-000000005004';
const actorId = '00000000-0000-4000-8000-000000005005';
const recordId = '00000000-0000-4000-8000-000000005006';
const now = '2026-07-04T11:00:00.000Z';

type HealthOutboxRow = {
  actor_id: string | null;
  created_at: string;
  household_id: string;
  last_error_category: string | null;
  operation: string;
  operation_id: string;
  payload_json: string;
  puppy_id: string;
  retry_after_at: string | null;
  retry_count: number;
  state: string;
  updated_at: string;
};

class TestHealthOutboxSqlExecutor implements HealthOutboxSqlExecutor {
  public userVersion = 0;
  public readonly rows = new Map<string, HealthOutboxRow>();
  public readonly statements: string[] = [];

  public async execAsync(sql: string): Promise<void> {
    this.statements.push(sql);

    const userVersion = sql.match(/PRAGMA user_version = (\d+)/i)?.[1];

    if (userVersion) {
      this.userVersion = Number(userVersion);
    }
  }

  public async runAsync(sql: string, params: HealthOutboxSqlParams = []): Promise<void> {
    this.statements.push(sql);

    if (/INSERT OR IGNORE INTO health_outbox_item/i.test(sql)) {
      const row = rowFromParams(params);

      if (!this.rows.has(row.operation_id)) {
        this.rows.set(row.operation_id, row);
      }

      return;
    }

    if (/INSERT OR REPLACE INTO health_outbox_item/i.test(sql)) {
      const row = rowFromParams(params);

      this.rows.set(row.operation_id, row);

      return;
    }

    if (/UPDATE health_outbox_item/i.test(sql)) {
      const operation_id = params[5];

      if (typeof operation_id !== 'string') {
        throw new Error('Missing operation_id update parameter');
      }

      const existing = this.rows.get(operation_id);

      if (!existing) {
        return;
      }

      this.rows.set(operation_id, {
        ...existing,
        state: String(params[0]),
        retry_count: Number(params[1]),
        last_error_category: typeof params[2] === 'string' ? params[2] : null,
        retry_after_at: typeof params[3] === 'string' ? params[3] : null,
        updated_at: String(params[4]),
      });
    }
  }

  public async getFirstAsync<T>(
    sql: string,
    params: HealthOutboxSqlParams = [],
  ): Promise<T | null> {
    this.statements.push(sql);

    if (/PRAGMA user_version/i.test(sql)) {
      return { user_version: this.userVersion } as T;
    }

    if (/SELECT \* FROM health_outbox_item\s+WHERE \(state = \?/i.test(sql)) {
      const currentTime = String(params[2]);
      const sortedRows = Array.from(this.rows.values())
        .filter((row) =>
          row.state === 'pending_local'
          || (
            row.state === 'failed_retryable'
            && (row.retry_after_at === null || Date.parse(row.retry_after_at) <= Date.parse(currentTime))
          ))
        .sort((left, right) => left.created_at.localeCompare(right.created_at));

      return (sortedRows[0] ?? null) as T | null;
    }

    if (/SELECT \* FROM health_outbox_item WHERE operation_id/i.test(sql)) {
      const selectedOperationId = params[0];

      if (typeof selectedOperationId !== 'string') {
        return null;
      }

      return (this.rows.get(selectedOperationId) ?? null) as T | null;
    }

    return null;
  }

  public async getAllAsync<T>(
    sql: string,
    params: HealthOutboxSqlParams = [],
  ): Promise<T[]> {
    this.statements.push(sql);

    if (/SELECT \* FROM health_outbox_item/i.test(sql)) {
      let rows = Array.from(this.rows.values());

      if (/WHERE state IN/i.test(sql)) {
        const states = new Set(params.map(String));
        rows = rows.filter((row) => states.has(row.state));
      }

      return rows as T[];
    }

    return [];
  }

  public async withExclusiveTransactionAsync<T>(
    task: (executor: HealthOutboxSqlRunner) => Promise<T>,
  ): Promise<T> {
    const snapshot = new Map(this.rows);

    try {
      return await task(this);
    } catch (error) {
      this.rows.clear();

      for (const [id, row] of snapshot) {
        this.rows.set(id, row);
      }

      throw error;
    }
  }
}

function enqueueInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    actor_id: actorId,
    household_id: householdId,
    operation: 'create',
    operation_id: operationId,
    payload: {
      insert,
    },
    puppy_id: puppyId,
    ...overrides,
  };
}

const insert: HealthRecordInsert & Readonly<{ id: string }> = {
  completed_at: null,
  id: recordId,
  notes: 'Bring paper record',
  provider_name: 'Example Vet',
  puppy_id: puppyId,
  record_type: 'vaccination',
  scheduled_for: '2026-07-04',
  source: 'manual',
  status: 'confirmed',
  title: 'DHPP booster',
  updated_by: actorId,
};

function rowFromParams(params: HealthOutboxSqlParams): HealthOutboxRow {
  return {
    operation_id: String(params[0]),
    household_id: String(params[1]),
    puppy_id: String(params[2]),
    actor_id: typeof params[3] === 'string' ? params[3] : null,
    operation: String(params[4]),
    payload_json: String(params[5]),
    state: String(params[6]),
    retry_count: Number(params[7]),
    last_error_category: typeof params[8] === 'string' ? params[8] : null,
    retry_after_at: typeof params[9] === 'string' ? params[9] : null,
    created_at: String(params[10]),
    updated_at: String(params[11]),
  };
}

describe('Health outbox SQLite storage boundary', () => {
  it('AC-HO-4 applies an independent local schema without changing Quick Log storage', async () => {
    const executor = new TestHealthOutboxSqlExecutor();
    const storage = createHealthOutboxStorage(executor);

    await storage.initialize();

    expect(HEALTH_OUTBOX_SCHEMA_VERSION).toBe(1);
    expect(HEALTH_OUTBOX_TABLE_NAME).toBe('health_outbox_item');
    expect(executor.userVersion).toBe(HEALTH_OUTBOX_SCHEMA_VERSION);
    expect(executor.statements.join('\n')).toContain('CREATE TABLE IF NOT EXISTS health_outbox_item');
    expect(executor.statements.join('\n')).toContain('operation_id TEXT PRIMARY KEY');
    expect(executor.statements.join('\n')).toContain('actor_id TEXT');
    expect(executor.statements.join('\n')).toContain('payload_json TEXT NOT NULL');
  });

  it('AC-HO-4 enqueues and lists Health operations transactionally', async () => {
    const executor = new TestHealthOutboxSqlExecutor();
    const storage = createHealthOutboxStorage(executor);

    const item = await storage.enqueue(enqueueInput(), { now });
    const listed = await storage.list();

    expect(item).toMatchObject({
      actor_id: actorId,
      operation: 'create',
      operation_id: operationId,
      state: 'pending_local',
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(item);
  });

  it('AC-HO-4 claims the next ready row and marks it sending', async () => {
    const executor = new TestHealthOutboxSqlExecutor();
    const storage = createHealthOutboxStorage(executor);
    await storage.enqueue(enqueueInput({
      operation_id: secondOperationId,
    }), { now: '2026-07-04T11:00:02.000Z' });
    await storage.enqueue(enqueueInput(), { now });

    const claimed = await storage.claimNextReadyToSend({ now: '2026-07-04T11:00:03.000Z' });

    expect(claimed).toMatchObject({
      operation_id: operationId,
      state: 'sending',
      updated_at: '2026-07-04T11:00:03.000Z',
    });
    await expect(storage.getByOperationId(operationId)).resolves.toMatchObject({
      state: 'sending',
    });
  });

  it('AC-HO-4 skips failed retry rows until retry_after_at is due', async () => {
    const executor = new TestHealthOutboxSqlExecutor();
    const storage = createHealthOutboxStorage(executor);
    await storage.enqueue(enqueueInput(), { now });
    await storage.markSending(operationId, { now: '2026-07-04T11:00:01.000Z' });
    await storage.markFailedRetryable(operationId, {
      errorCategory: 'network_unavailable',
      now: '2026-07-04T11:00:02.000Z',
      retryAfterAt: '2026-07-04T11:01:00.000Z',
    });

    await expect(storage.claimNextReadyToSend({
      now: '2026-07-04T11:00:30.000Z',
    })).resolves.toBeNull();
    await expect(storage.claimNextReadyToSend({
      now: '2026-07-04T11:01:00.000Z',
    })).resolves.toMatchObject({
      operation_id: operationId,
      state: 'sending',
    });
  });

  it('AC-HO-4 re-activates a permanently failed operation on re-enqueue instead of returning the stale row', async () => {
    const executor = new TestHealthOutboxSqlExecutor();
    const storage = createHealthOutboxStorage(executor);
    await storage.enqueue(enqueueInput(), { now });
    await storage.markSending(operationId, { now: '2026-07-04T11:00:01.000Z' });
    await storage.markFailedPermanent(operationId, {
      errorCategory: 'invalid_payload',
      now: '2026-07-04T11:00:02.000Z',
    });

    const requeued = await storage.enqueue(enqueueInput(), { now: '2026-07-04T11:00:03.000Z' });

    expect(requeued).toMatchObject({
      last_error_category: null,
      operation_id: operationId,
      retry_count: 0,
      state: 'pending_local',
    });
    await expect(storage.claimNextReadyToSend({
      now: '2026-07-04T11:00:04.000Z',
    })).resolves.toMatchObject({
      operation_id: operationId,
      state: 'sending',
    });
  });

  it('AC-HO-4 quarantines legacy missing-actor rows instead of claiming them', async () => {
    const executor = new TestHealthOutboxSqlExecutor();
    const storage = createHealthOutboxStorage(executor);
    await storage.enqueue(enqueueInput(), { now });
    executor.rows.set(operationId, {
      ...executor.rows.get(operationId)!,
      actor_id: null,
    });

    await expect(storage.claimNextReadyToSend({
      now: '2026-07-04T11:00:30.000Z',
    })).resolves.toBeNull();
    await expect(storage.getByOperationId(operationId)).resolves.toMatchObject({
      actor_id: null,
      last_error_category: 'missing_context',
      state: 'failed_permanent',
    });
  });

  it('AC-HO-4 keeps claiming after quarantining a legacy missing-actor row', async () => {
    const executor = new TestHealthOutboxSqlExecutor();
    const storage = createHealthOutboxStorage(executor);
    await storage.enqueue(enqueueInput(), { now });
    await storage.enqueue(enqueueInput({
      operation_id: secondOperationId,
    }), { now: '2026-07-04T11:00:02.000Z' });
    executor.rows.set(operationId, {
      ...executor.rows.get(operationId)!,
      actor_id: null,
    });

    await expect(storage.claimNextReadyToSend({
      now: '2026-07-04T11:00:30.000Z',
    })).resolves.toMatchObject({
      operation_id: secondOperationId,
      state: 'sending',
    });
    await expect(storage.getByOperationId(operationId)).resolves.toMatchObject({
      actor_id: null,
      last_error_category: 'missing_context',
      state: 'failed_permanent',
    });
  });
});
