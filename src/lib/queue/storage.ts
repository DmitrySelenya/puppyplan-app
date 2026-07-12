import type { SQLiteDatabase } from 'expo-sqlite';

import {
  QUICK_LOG_QUEUE_DATABASE_NAME,
  QUICK_LOG_QUEUE_TABLE_NAME,
  createStoredQuickLogQueueItem,
  parseQuickLogQueuePermanentErrorCategory,
  parseQuickLogQueuePayload,
  parseQuickLogQueueRetryableErrorCategory,
  quickLogQueueEnqueueInputSchema,
  serializeQuickLogQueuePayload,
  type QuickLogQueueErrorCategory,
  type QuickLogQueueState,
  type QuickLogQueueStoredRow,
  type QuickLogStoredQueueItem,
} from './schema';
import { applyQuickLogQueueMigrations } from './migrations';
import {
  applyQuickLogQueueTransition,
  resolveQuickLogInFlightSuccess,
  type QuickLogInFlightSuccessResolution,
} from './state-machine';
import { createManualQuickLogRetry, type QuickLogManualRetry } from './retry';
import type { QuickLogRecoverySurface } from '@/contracts/analytics';
import type { JsonValue } from '@/contracts/supabase';

export type QuickLogQueueSqlValue = string | number | null;
export type QuickLogQueueSqlParams = QuickLogQueueSqlValue[];

export type QuickLogQueueSqlRunner = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: QuickLogQueueSqlParams): Promise<unknown>;
  getFirstAsync<T>(sql: string, params?: QuickLogQueueSqlParams): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: QuickLogQueueSqlParams): Promise<T[]>;
};

export type QuickLogQueueSqlExecutor = QuickLogQueueSqlRunner & {
  withExclusiveTransactionAsync<T>(
    task: (executor: QuickLogQueueSqlRunner) => Promise<T>,
  ): Promise<T>;
};

export type QuickLogQueueStorage = Readonly<{
  initialize(): Promise<void>;
  enqueue(input: unknown, options: Readonly<{ now: string }>): Promise<QuickLogStoredQueueItem>;
  getByClientEventId(clientEventId: string): Promise<QuickLogStoredQueueItem | null>;
  list(filter?: Readonly<{ states?: readonly QuickLogQueueState[] }>): Promise<QuickLogStoredQueueItem[]>;
  claimNextReadyToSend(options: Readonly<{ now: string }>): Promise<QuickLogStoredQueueItem | null>;
  markSending(clientEventId: string, options: Readonly<{ now: string }>): Promise<QuickLogStoredQueueItem>;
  markFailedRetryable(
    clientEventId: string,
    options: Readonly<{
      errorCategory: QuickLogQueueErrorCategory | string;
      retryAfterAt: string | null;
      now: string;
    }>,
  ): Promise<QuickLogStoredQueueItem>;
  markFailedPermanent(
    clientEventId: string,
    options: Readonly<{
      errorCategory: QuickLogQueueErrorCategory | string;
      now: string;
    }>,
  ): Promise<QuickLogStoredQueueItem>;
  markDeletedBeforeSync(
    clientEventId: string,
    options: Readonly<{ now: string }>,
  ): Promise<QuickLogStoredQueueItem>;
  manualRetry(
    clientEventId: string,
    options: Readonly<{ now: string; recoverySurface?: QuickLogRecoverySurface }>,
  ): Promise<QuickLogManualRetry>;
  resolveInFlightSuccess(
    clientEventId: string,
    options: Readonly<{ now: string }>,
  ): Promise<QuickLogInFlightSuccessResolution>;
  remove(clientEventId: string): Promise<void>;
  updateDetails?(clientEventId: string, options: Readonly<{
    now: string;
    occurredAt: string;
    payload: Record<string, JsonValue>;
    payloadVersion: 1 | 2;
  }>): Promise<QuickLogStoredQueueItem>;
}>;

export function createQuickLogQueueStorage(
  executor: QuickLogQueueSqlExecutor,
): QuickLogQueueStorage & Required<Pick<QuickLogQueueStorage, 'updateDetails'>> {
  return {
    initialize: () => applyQuickLogQueueMigrations(executor),
    enqueue: (input, options) => enqueueQueueItem(executor, input, options),
    getByClientEventId: (clientEventId) => getQueueItem(executor, clientEventId),
    list: (filter) => listQueueItems(executor, filter),
    claimNextReadyToSend: (options) => claimNextReadyQueueItem(executor, options),
    markSending: (clientEventId, options) => updateQueueItem(
      executor,
      clientEventId,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_sending',
        now: options.now,
      }),
    ),
    markFailedRetryable: async (clientEventId, options) => {
      parseQuickLogQueueRetryableErrorCategory(options.errorCategory);

      return updateQueueItem(
        executor,
        clientEventId,
        (item) => applyQuickLogQueueTransition(item, {
          type: 'mark_failed_retryable',
          errorCategory: options.errorCategory,
          retryAfterAt: options.retryAfterAt,
          now: options.now,
        }),
      );
    },
    markFailedPermanent: async (clientEventId, options) => {
      parseQuickLogQueuePermanentErrorCategory(options.errorCategory);

      return updateQueueItem(
        executor,
        clientEventId,
        (item) => applyQuickLogQueueTransition(item, {
          type: 'mark_failed_permanent',
          errorCategory: options.errorCategory,
          now: options.now,
        }),
      );
    },
    markDeletedBeforeSync: (clientEventId, options) => updateQueueItem(
      executor,
      clientEventId,
      (item) => applyQuickLogQueueTransition(item, {
        type: 'mark_deleted_before_sync',
        now: options.now,
      }),
    ),
    manualRetry: (clientEventId, options) => runExclusive(executor, async (transaction) => {
      const item = await getRequiredQueueItem(transaction, clientEventId);
      const retry = createManualQuickLogRetry(item, options);

      await writeQueueItemState(transaction, retry.item);

      return retry;
    }),
    resolveInFlightSuccess: (clientEventId, options) => runExclusive(executor, async (transaction) => {
      const item = await getRequiredQueueItem(transaction, clientEventId);
      const resolution = resolveQuickLogInFlightSuccess(item, options);

      if (resolution.outcome === 'server_confirmed') {
        await writeQueueItemState(transaction, resolution.item);
      }

      return resolution;
    }),
    remove: (clientEventId) => runExclusive(executor, async (transaction) => {
      await transaction.runAsync(
        `DELETE FROM ${QUICK_LOG_QUEUE_TABLE_NAME} WHERE client_event_id = ?`,
        [clientEventId],
      );
    }),
    updateDetails: (clientEventId, options) => runExclusive(executor, async (transaction) => {
      const item = await getRequiredQueueItem(transaction, clientEventId);
      if (!editableDetailStates.has(item.state)) {
        throw new Error(`Quick Log queue details cannot be edited in state: ${item.state}`);
      }

      const updatedItem = createStoredQuickLogQueueItem({
        ...item,
        occurred_at: options.occurredAt,
        payload: options.payload,
        payload_version: options.payloadVersion,
        updated_at: options.now,
      });

      await transaction.runAsync(
        `UPDATE ${QUICK_LOG_QUEUE_TABLE_NAME}
          SET payload_version = ?,
              payload_json = ?,
              occurred_at = ?,
              updated_at = ?
          WHERE client_event_id = ?`,
        [
          updatedItem.payload_version,
          serializeQuickLogQueuePayload(updatedItem.payload),
          updatedItem.occurred_at,
          updatedItem.updated_at,
          updatedItem.client_event_id,
        ],
      );

      return getRequiredQueueItem(transaction, clientEventId);
    }),
  };
}

const editableDetailStates = new Set<QuickLogQueueState>([
  'pending_local',
  'failed_retryable',
  'failed_permanent',
]);

export function createExpoSQLiteQueueExecutor(
  database: SQLiteDatabase,
): QuickLogQueueSqlExecutor {
  return {
    ...createExpoSQLiteQueueRunner(database),
    withExclusiveTransactionAsync: async <T>(task: (executor: QuickLogQueueSqlRunner) => Promise<T>) => {
      let result: Readonly<{ value: T }> | undefined;

      await database.withExclusiveTransactionAsync(async (transaction) => {
        result = {
          value: await task(createExpoSQLiteQueueRunner(transaction)),
        };
      });

      if (!result) {
        throw new Error('Quick Log queue transaction did not return a result.');
      }

      return result.value;
    },
  };
}

export async function openQuickLogQueueStorage(): Promise<QuickLogQueueStorage> {
  const sqlite = await import('expo-sqlite');
  const database = await sqlite.openDatabaseAsync(QUICK_LOG_QUEUE_DATABASE_NAME);
  const storage = createQuickLogQueueStorage(createExpoSQLiteQueueExecutor(database));

  await storage.initialize();

  return storage;
}

async function enqueueQueueItem(
  executor: QuickLogQueueSqlExecutor,
  input: unknown,
  options: Readonly<{ now: string }>,
): Promise<QuickLogStoredQueueItem> {
  const parsedInput = quickLogQueueEnqueueInputSchema.parse(input);
  const createdAt = parsedInput.created_at ?? options.now;
  const item = createStoredQuickLogQueueItem({
    ...parsedInput,
    state: 'pending_local',
    retry_count: 0,
    last_error_category: null,
    retry_after_at: null,
    created_at: createdAt,
    updated_at: createdAt,
  });

  return runExclusive(executor, async (transaction) => {
    await transaction.runAsync(
      `INSERT OR IGNORE INTO ${QUICK_LOG_QUEUE_TABLE_NAME} (
        client_event_id,
        household_id,
        puppy_id,
        created_by,
        event_type,
        payload_version,
        payload_json,
        occurred_at,
        state,
        retry_count,
        last_error_category,
        retry_after_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      rowParamsFromItem(item),
    );

    return getRequiredQueueItem(transaction, item.client_event_id);
  });
}

async function updateQueueItem(
  executor: QuickLogQueueSqlExecutor,
  clientEventId: string,
  update: (item: QuickLogStoredQueueItem) => QuickLogStoredQueueItem,
): Promise<QuickLogStoredQueueItem> {
  return runExclusive(executor, async (transaction) => {
    const item = await getRequiredQueueItem(transaction, clientEventId);
    const updatedItem = update(item);

    await writeQueueItemState(transaction, updatedItem);

    return updatedItem;
  });
}

async function claimNextReadyQueueItem(
  executor: QuickLogQueueSqlExecutor,
  options: Readonly<{ now: string }>,
): Promise<QuickLogStoredQueueItem | null> {
  return runExclusive(executor, async (transaction) => {
    const readyRow = await transaction.getFirstAsync<QuickLogQueueStoredRow>(
      `SELECT * FROM ${QUICK_LOG_QUEUE_TABLE_NAME}
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

    const readyItem = rowToQueueItem(readyRow);

    if (readyItem.created_by === null) {
      await writeQueueItemState(transaction, createStoredQuickLogQueueItem({
        ...readyItem,
        state: 'failed_permanent',
        retry_count: readyItem.retry_count + 1,
        last_error_category: 'missing_context',
        retry_after_at: null,
        updated_at: options.now,
      }));

      return null;
    }

    const sendingItem = applyQuickLogQueueTransition(readyItem, {
      type: 'mark_sending',
      now: options.now,
    });

    await writeQueueItemState(transaction, sendingItem);

    return sendingItem;
  });
}

async function getQueueItem(
  executor: QuickLogQueueSqlRunner,
  clientEventId: string,
): Promise<QuickLogStoredQueueItem | null> {
  const row = await executor.getFirstAsync<QuickLogQueueStoredRow>(
    `SELECT * FROM ${QUICK_LOG_QUEUE_TABLE_NAME} WHERE client_event_id = ?`,
    [clientEventId],
  );

  return row ? rowToQueueItem(row) : null;
}

async function getRequiredQueueItem(
  executor: QuickLogQueueSqlRunner,
  clientEventId: string,
): Promise<QuickLogStoredQueueItem> {
  const item = await getQueueItem(executor, clientEventId);

  if (!item) {
    throw new Error(`Quick Log queue item not found: ${clientEventId}`);
  }

  return item;
}

async function listQueueItems(
  executor: QuickLogQueueSqlRunner,
  filter: Readonly<{ states?: readonly QuickLogQueueState[] }> = {},
): Promise<QuickLogStoredQueueItem[]> {
  const states = filter.states ?? [];
  const statePlaceholders = states.map(() => '?').join(', ');
  const rows = await executor.getAllAsync<QuickLogQueueStoredRow>(
    `SELECT * FROM ${QUICK_LOG_QUEUE_TABLE_NAME}${
      states.length > 0 ? ` WHERE state IN (${statePlaceholders})` : ''
    } ORDER BY created_at ASC`,
    [...states],
  );

  return rows.map(rowToQueueItem);
}

async function writeQueueItemState(
  executor: QuickLogQueueSqlRunner,
  item: QuickLogStoredQueueItem,
): Promise<void> {
  await executor.runAsync(
    `UPDATE ${QUICK_LOG_QUEUE_TABLE_NAME}
      SET state = ?,
          retry_count = ?,
          last_error_category = ?,
          retry_after_at = ?,
          updated_at = ?
      WHERE client_event_id = ?`,
    [
      item.state,
      item.retry_count,
      item.last_error_category,
      item.retry_after_at,
      item.updated_at,
      item.client_event_id,
    ],
  );
}

async function runExclusive<T>(
  executor: QuickLogQueueSqlExecutor,
  task: (executor: QuickLogQueueSqlRunner) => Promise<T>,
): Promise<T> {
  return executor.withExclusiveTransactionAsync(task);
}

function rowParamsFromItem(item: QuickLogStoredQueueItem): QuickLogQueueSqlParams {
  return [
    item.client_event_id,
    item.household_id,
    item.puppy_id,
    item.created_by,
    item.event_type,
    item.payload_version,
    serializeQuickLogQueuePayload(item.payload),
    item.occurred_at,
    item.state,
    item.retry_count,
    item.last_error_category,
    item.retry_after_at,
    item.created_at,
    item.updated_at,
  ];
}

function rowToQueueItem(row: QuickLogQueueStoredRow): QuickLogStoredQueueItem {
  return createStoredQuickLogQueueItem({
    client_event_id: row.client_event_id,
    household_id: row.household_id,
    puppy_id: row.puppy_id,
    created_by: row.created_by,
    event_type: row.event_type,
    payload_version: row.payload_version,
    payload: parseQuickLogQueuePayload(row.payload_json),
    occurred_at: row.occurred_at,
    state: row.state,
    retry_count: row.retry_count,
    last_error_category: row.last_error_category,
    retry_after_at: row.retry_after_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function createExpoSQLiteQueueRunner(database: QuickLogQueueExpoRunner): QuickLogQueueSqlRunner {
  return {
    execAsync: (sql) => database.execAsync(sql),
    runAsync: (sql, params = []) => database.runAsync(sql, params),
    getFirstAsync: <T>(sql: string, params: QuickLogQueueSqlParams = []) =>
      database.getFirstAsync<T>(sql, params),
    getAllAsync: <T>(sql: string, params: QuickLogQueueSqlParams = []) =>
      database.getAllAsync<T>(sql, params),
  };
}

type QuickLogQueueExpoRunner = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;
