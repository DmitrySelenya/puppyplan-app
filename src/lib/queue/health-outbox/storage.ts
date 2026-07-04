import type { SQLiteDatabase } from 'expo-sqlite';

import {
  applyHealthOutboxTransition,
  createHealthOutboxItem,
  createStoredHealthOutboxItem,
  type HealthOutboxErrorCategory,
  type HealthOutboxState,
  type HealthOutboxStoredItem,
} from './index';

export const HEALTH_OUTBOX_DATABASE_NAME = 'health-outbox.db';
export const HEALTH_OUTBOX_SCHEMA_VERSION = 1;
export const HEALTH_OUTBOX_TABLE_NAME = 'health_outbox_item';

export type HealthOutboxSqlValue = string | number | null;
export type HealthOutboxSqlParams = HealthOutboxSqlValue[];

export type HealthOutboxSqlRunner = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: HealthOutboxSqlParams): Promise<unknown>;
  getFirstAsync<T>(sql: string, params?: HealthOutboxSqlParams): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: HealthOutboxSqlParams): Promise<T[]>;
};

export type HealthOutboxSqlExecutor = HealthOutboxSqlRunner & {
  withExclusiveTransactionAsync<T>(
    task: (executor: HealthOutboxSqlRunner) => Promise<T>,
  ): Promise<T>;
};

export type HealthOutboxStorage = Readonly<{
  initialize(): Promise<void>;
  enqueue(input: unknown, options: Readonly<{ now: string }>): Promise<HealthOutboxStoredItem>;
  getByOperationId(operationId: string): Promise<HealthOutboxStoredItem | null>;
  list(filter?: Readonly<{ states?: readonly HealthOutboxState[] }>): Promise<HealthOutboxStoredItem[]>;
  claimNextReadyToSend(options: Readonly<{ now: string }>): Promise<HealthOutboxStoredItem | null>;
  markSending(operationId: string, options: Readonly<{ now: string }>): Promise<HealthOutboxStoredItem>;
  markFailedRetryable(
    operationId: string,
    options: Readonly<{
      errorCategory: HealthOutboxErrorCategory | string;
      retryAfterAt: string | null;
      now: string;
    }>,
  ): Promise<HealthOutboxStoredItem>;
  markFailedPermanent(
    operationId: string,
    options: Readonly<{
      errorCategory: HealthOutboxErrorCategory | string;
      now: string;
    }>,
  ): Promise<HealthOutboxStoredItem>;
  markServerConfirmed(
    operationId: string,
    options: Readonly<{ now: string }>,
  ): Promise<HealthOutboxStoredItem>;
}>;

export type HealthOutboxStoredRow = Readonly<{
  actor_id: string | null;
  created_at: string;
  household_id: string;
  last_error_category: HealthOutboxErrorCategory | null;
  operation: string;
  operation_id: string;
  payload_json: string;
  puppy_id: string;
  retry_after_at: string | null;
  retry_count: number;
  state: HealthOutboxState;
  updated_at: string;
}>;

export function createHealthOutboxStorage(
  executor: HealthOutboxSqlExecutor,
): HealthOutboxStorage {
  return {
    initialize: () => applyHealthOutboxMigrations(executor),
    enqueue: (input, options) => enqueueHealthOutboxItem(executor, input, options),
    getByOperationId: (operationId) => getHealthOutboxItem(executor, operationId),
    list: (filter) => listHealthOutboxItems(executor, filter),
    claimNextReadyToSend: (options) => claimNextReadyHealthOutboxItem(executor, options),
    markSending: (operationId, options) => updateHealthOutboxItem(
      executor,
      operationId,
      (item) => applyHealthOutboxTransition(item, {
        now: options.now,
        type: 'mark_sending',
      }),
    ),
    markFailedRetryable: (operationId, options) => updateHealthOutboxItem(
      executor,
      operationId,
      (item) => applyHealthOutboxTransition(item, {
        errorCategory: options.errorCategory,
        now: options.now,
        retryAfterAt: options.retryAfterAt,
        type: 'mark_failed_retryable',
      }),
    ),
    markFailedPermanent: (operationId, options) => updateHealthOutboxItem(
      executor,
      operationId,
      (item) => applyHealthOutboxTransition(item, {
        errorCategory: options.errorCategory,
        now: options.now,
        type: 'mark_failed_permanent',
      }),
    ),
    markServerConfirmed: (operationId, options) => updateHealthOutboxItem(
      executor,
      operationId,
      (item) => applyHealthOutboxTransition(item, {
        now: options.now,
        type: 'mark_server_confirmed',
      }),
    ),
  };
}

export function createExpoSQLiteHealthOutboxExecutor(
  database: SQLiteDatabase,
): HealthOutboxSqlExecutor {
  return {
    ...createExpoSQLiteHealthOutboxRunner(database),
    withExclusiveTransactionAsync: async <T>(
      task: (executor: HealthOutboxSqlRunner) => Promise<T>,
    ) => {
      let result: Readonly<{ value: T }> | undefined;

      await database.withExclusiveTransactionAsync(async (transaction) => {
        result = {
          value: await task(createExpoSQLiteHealthOutboxRunner(transaction)),
        };
      });

      if (!result) {
        throw new Error('Health outbox transaction did not return a result.');
      }

      return result.value;
    },
  };
}

export async function openHealthOutboxStorage(): Promise<HealthOutboxStorage> {
  const sqlite = await import('expo-sqlite');
  const database = await sqlite.openDatabaseAsync(HEALTH_OUTBOX_DATABASE_NAME);
  const storage = createHealthOutboxStorage(createExpoSQLiteHealthOutboxExecutor(database));

  await storage.initialize();

  return storage;
}

async function applyHealthOutboxMigrations(
  executor: HealthOutboxSqlRunner,
): Promise<void> {
  const versionRow = await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > HEALTH_OUTBOX_SCHEMA_VERSION) {
    throw new Error(`Unsupported Health outbox schema version: ${currentVersion}`);
  }

  if (currentVersion >= HEALTH_OUTBOX_SCHEMA_VERSION) {
    return;
  }

  await executor.execAsync(`
CREATE TABLE IF NOT EXISTS ${HEALTH_OUTBOX_TABLE_NAME} (
  operation_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  puppy_id TEXT NOT NULL,
  actor_id TEXT,
  operation TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  state TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error_category TEXT,
  retry_after_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS health_outbox_item_state_retry_after_idx
  ON ${HEALTH_OUTBOX_TABLE_NAME} (state, retry_after_at, created_at);
PRAGMA user_version = ${HEALTH_OUTBOX_SCHEMA_VERSION};
`);
}

async function enqueueHealthOutboxItem(
  executor: HealthOutboxSqlExecutor,
  input: unknown,
  options: Readonly<{ now: string }>,
): Promise<HealthOutboxStoredItem> {
  const item = createHealthOutboxItem(input, options);

  return runExclusive(executor, async (transaction) => {
    await transaction.runAsync(
      `INSERT OR IGNORE INTO ${HEALTH_OUTBOX_TABLE_NAME} (
        operation_id,
        household_id,
        puppy_id,
        actor_id,
        operation,
        payload_json,
        state,
        retry_count,
        last_error_category,
        retry_after_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      rowParamsFromItem(item),
    );

    return getRequiredHealthOutboxItem(transaction, item.operation_id);
  });
}

async function claimNextReadyHealthOutboxItem(
  executor: HealthOutboxSqlExecutor,
  options: Readonly<{ now: string }>,
): Promise<HealthOutboxStoredItem | null> {
  return runExclusive(executor, async (transaction) => {
    const readyRow = await transaction.getFirstAsync<HealthOutboxStoredRow>(
      `SELECT * FROM ${HEALTH_OUTBOX_TABLE_NAME}
        WHERE (state = ? OR (
          state = ?
          AND (retry_after_at IS NULL OR julianday(retry_after_at) <= julianday(?))
        ))
        ORDER BY created_at ASC
        LIMIT 1`,
      ['pending_local', 'failed_retryable', options.now],
    );

    if (!readyRow) {
      return null;
    }

    const readyItem = rowToHealthOutboxItem(readyRow);

    if (readyItem.actor_id === null) {
      await writeHealthOutboxItemState(transaction, createStoredHealthOutboxItem({
        ...readyItem,
        last_error_category: 'missing_context',
        retry_after_at: null,
        retry_count: readyItem.retry_count + 1,
        state: 'failed_permanent',
        updated_at: options.now,
      }));

      return null;
    }

    const sendingItem = applyHealthOutboxTransition(readyItem, {
      now: options.now,
      type: 'mark_sending',
    });

    await writeHealthOutboxItemState(transaction, sendingItem);

    return sendingItem;
  });
}

async function updateHealthOutboxItem(
  executor: HealthOutboxSqlExecutor,
  operationId: string,
  update: (item: HealthOutboxStoredItem) => HealthOutboxStoredItem,
): Promise<HealthOutboxStoredItem> {
  return runExclusive(executor, async (transaction) => {
    const item = await getRequiredHealthOutboxItem(transaction, operationId);
    const updatedItem = update(item);

    await writeHealthOutboxItemState(transaction, updatedItem);

    return updatedItem;
  });
}

async function getHealthOutboxItem(
  executor: HealthOutboxSqlRunner,
  operationId: string,
): Promise<HealthOutboxStoredItem | null> {
  const row = await executor.getFirstAsync<HealthOutboxStoredRow>(
    `SELECT * FROM ${HEALTH_OUTBOX_TABLE_NAME} WHERE operation_id = ?`,
    [operationId],
  );

  return row ? rowToHealthOutboxItem(row) : null;
}

async function getRequiredHealthOutboxItem(
  executor: HealthOutboxSqlRunner,
  operationId: string,
): Promise<HealthOutboxStoredItem> {
  const item = await getHealthOutboxItem(executor, operationId);

  if (!item) {
    throw new Error(`Health outbox item not found: ${operationId}`);
  }

  return item;
}

async function listHealthOutboxItems(
  executor: HealthOutboxSqlRunner,
  filter: Readonly<{ states?: readonly HealthOutboxState[] }> = {},
): Promise<HealthOutboxStoredItem[]> {
  const states = filter.states ?? [];
  const statePlaceholders = states.map(() => '?').join(', ');
  const rows = await executor.getAllAsync<HealthOutboxStoredRow>(
    `SELECT * FROM ${HEALTH_OUTBOX_TABLE_NAME}${
      states.length > 0 ? ` WHERE state IN (${statePlaceholders})` : ''
    } ORDER BY created_at ASC`,
    [...states],
  );

  return rows.map(rowToHealthOutboxItem);
}

async function writeHealthOutboxItemState(
  executor: HealthOutboxSqlRunner,
  item: HealthOutboxStoredItem,
): Promise<void> {
  await executor.runAsync(
    `UPDATE ${HEALTH_OUTBOX_TABLE_NAME}
      SET state = ?,
          retry_count = ?,
          last_error_category = ?,
          retry_after_at = ?,
          updated_at = ?
      WHERE operation_id = ?`,
    [
      item.state,
      item.retry_count,
      item.last_error_category,
      item.retry_after_at,
      item.updated_at,
      item.operation_id,
    ],
  );
}

async function runExclusive<T>(
  executor: HealthOutboxSqlExecutor,
  task: (executor: HealthOutboxSqlRunner) => Promise<T>,
): Promise<T> {
  return executor.withExclusiveTransactionAsync(task);
}

function rowParamsFromItem(item: HealthOutboxStoredItem): HealthOutboxSqlParams {
  return [
    item.operation_id,
    item.household_id,
    item.puppy_id,
    item.actor_id,
    item.operation,
    JSON.stringify(item.payload),
    item.state,
    item.retry_count,
    item.last_error_category,
    item.retry_after_at,
    item.created_at,
    item.updated_at,
  ];
}

function rowToHealthOutboxItem(row: HealthOutboxStoredRow): HealthOutboxStoredItem {
  return createStoredHealthOutboxItem({
    actor_id: row.actor_id,
    created_at: row.created_at,
    household_id: row.household_id,
    last_error_category: row.last_error_category,
    operation: row.operation,
    operation_id: row.operation_id,
    payload: parseHealthOutboxPayload(row.payload_json),
    puppy_id: row.puppy_id,
    retry_after_at: row.retry_after_at,
    retry_count: row.retry_count,
    state: row.state,
    updated_at: row.updated_at,
  });
}

function parseHealthOutboxPayload(payloadJson: string): unknown {
  return JSON.parse(payloadJson) as unknown;
}

function createExpoSQLiteHealthOutboxRunner(
  database: HealthOutboxExpoRunner,
): HealthOutboxSqlRunner {
  return {
    execAsync: (sql) => database.execAsync(sql),
    getAllAsync: <T>(sql: string, params: HealthOutboxSqlParams = []) =>
      database.getAllAsync<T>(sql, params),
    getFirstAsync: <T>(sql: string, params: HealthOutboxSqlParams = []) =>
      database.getFirstAsync<T>(sql, params),
    runAsync: (sql, params = []) => database.runAsync(sql, params),
  };
}

type HealthOutboxExpoRunner = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;
