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
  enqueueDeletedBeforeSync?(
    input: unknown,
    options: Readonly<{ now: string; retryAfterAt?: string }>,
  ): Promise<QuickLogStoredQueueItem>;
  getByClientEventId(clientEventId: string): Promise<QuickLogStoredQueueItem | null>;
  list(filter?: Readonly<{ states?: readonly QuickLogQueueState[] }>): Promise<QuickLogStoredQueueItem[]>;
  quarantineLegacyMissingActorItems?(
    options: Readonly<{ now: string }>,
  ): Promise<void>;
  claimNextReadyToSend(options: Readonly<{
    createdBy?: string;
    now: string;
  }>): Promise<QuickLogStoredQueueItem | null>;
  markSending(clientEventId: string, options: Readonly<{ now: string }>): Promise<QuickLogStoredQueueItem>;
  markFailedRetryable(
    clientEventId: string,
    options: Readonly<{
      errorCategory: QuickLogQueueErrorCategory | string;
      retryAfterAt: string | null;
      now: string;
    }>,
  ): Promise<QuickLogStoredQueueItem>;
  markFailedRetryableIfOwned?(
    clientEventId: string,
    options: Readonly<{
      errorCategory: QuickLogQueueErrorCategory | string;
      expectedCreatedBy: string;
      expectedState: 'sending';
      retryAfterAt: string | null;
      now: string;
    }>,
  ): Promise<QuickLogStoredQueueItem | null>;
  markFailedPermanent(
    clientEventId: string,
    options: Readonly<{
      errorCategory: QuickLogQueueErrorCategory | string;
      now: string;
    }>,
  ): Promise<QuickLogStoredQueueItem>;
  markDeletedBeforeSync(
    clientEventId: string,
    options: Readonly<{
      expectedCreatedBy?: string;
      expectedState?: QuickLogQueueState;
      now: string;
    }>,
  ): Promise<QuickLogStoredQueueItem | null>;
  retainDeletedBeforeSync?(
    clientEventId: string,
    options: Readonly<{
      errorCategory: QuickLogQueueErrorCategory | string;
      retryAfterAt: string | null;
      now: string;
    }>,
  ): Promise<QuickLogStoredQueueItem>;
  manualRetry(
    clientEventId: string,
    options: Readonly<{ now: string; recoverySurface?: QuickLogRecoverySurface }>,
  ): Promise<QuickLogManualRetry>;
  manualRetryIfOwned?(
    clientEventId: string,
    options: Readonly<{
      expectedCreatedBy: string;
      isActorCurrent: () => boolean;
      now: string;
      recoverySurface?: QuickLogRecoverySurface;
    }>,
  ): Promise<QuickLogManualRetry | null>;
  resolveInFlightSuccess(
    clientEventId: string,
    options: Readonly<{ now: string }>,
  ): Promise<QuickLogInFlightSuccessResolution>;
  removeIfState?(
    clientEventId: string,
    expectedState: QuickLogQueueState,
    options?: Readonly<{ expectedCreatedBy?: string }>,
  ): Promise<boolean>;
  remove(clientEventId: string): Promise<void>;
  updateDetails?(clientEventId: string, options: Readonly<{
    expectedCreatedBy?: string;
    isActorCurrent?: () => boolean;
    now: string;
    occurredAt: string;
    payload: Record<string, JsonValue>;
    payloadVersion: 1 | 2;
  }>): Promise<QuickLogStoredQueueItem | null>;
}>;

export function createQuickLogQueueStorage(
  executor: QuickLogQueueSqlExecutor,
): QuickLogQueueStorage & Required<Pick<
  QuickLogQueueStorage,
  | 'enqueueDeletedBeforeSync'
  | 'quarantineLegacyMissingActorItems'
  | 'markFailedRetryableIfOwned'
  | 'retainDeletedBeforeSync'
  | 'updateDetails'
>> {
  return {
    initialize: async () => {
      await applyQuickLogQueueMigrations(executor);
      await recoverStaleSendingQueueItems(executor);
    },
    enqueue: (input, options) => enqueueQueueItem(executor, input, options),
    enqueueDeletedBeforeSync: (input, options) => enqueueDeletedQueueItem(
      executor,
      input,
      options,
    ),
    getByClientEventId: (clientEventId) => getQueueItem(executor, clientEventId),
    list: (filter) => listQueueItems(executor, filter),
    quarantineLegacyMissingActorItems: (options) => quarantineLegacyMissingActorQueueItems(
      executor,
      options,
    ),
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
    markFailedRetryableIfOwned: async (clientEventId, options) => {
      parseQuickLogQueueRetryableErrorCategory(options.errorCategory);

      return runExclusive(executor, async (transaction) => {
        const item = await getQueueItem(transaction, clientEventId);
        if (
          item?.created_by !== options.expectedCreatedBy
          || item.state !== options.expectedState
        ) {
          return null;
        }
        const recoveredItem = applyQuickLogQueueTransition(item, {
          type: 'mark_failed_retryable',
          errorCategory: options.errorCategory,
          retryAfterAt: options.retryAfterAt,
          now: options.now,
        });
        await writeQueueItemState(transaction, recoveredItem);
        return recoveredItem;
      });
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
    markDeletedBeforeSync: (clientEventId, options) => {
      if (
        options.expectedCreatedBy === undefined
        && options.expectedState === undefined
      ) {
        return updateQueueItem(
          executor,
          clientEventId,
          (item) => applyQuickLogQueueTransition(item, {
            type: 'mark_deleted_before_sync',
            now: options.now,
          }),
        );
      }

      return runExclusive(executor, async (transaction) => {
        const item = await getQueueItem(transaction, clientEventId);
        if (
          item === null
          || (
            options.expectedState !== undefined
            && item.state !== options.expectedState
          )
          || (
            options.expectedCreatedBy !== undefined
            && item.created_by !== options.expectedCreatedBy
          )
        ) {
          return null;
        }

        const updatedItem = applyQuickLogQueueTransition(item, {
          type: 'mark_deleted_before_sync',
          now: options.now,
        });
        await writeQueueItemState(transaction, updatedItem);
        return updatedItem;
      });
    },
    retainDeletedBeforeSync: (clientEventId, options) => updateQueueItem(
      executor,
      clientEventId,
      (item) => createStoredQuickLogQueueItem({
        ...item,
        state: 'deleted_before_sync',
        retry_count: item.retry_count + 1,
        last_error_category: options.errorCategory,
        retry_after_at: options.retryAfterAt,
        updated_at: options.now,
      }),
    ),
    manualRetry: (clientEventId, options) => runExclusive(executor, async (transaction) => {
      const item = await getRequiredQueueItem(transaction, clientEventId);
      const retry = createManualQuickLogRetry(item, options);

      await writeQueueItemState(transaction, retry.item);

      return retry;
    }),
    manualRetryIfOwned: async (clientEventId, options) => {
      try {
        return await runExclusive(executor, async (transaction) => {
          assertManualRetryActorIsCurrent(options.isActorCurrent);
          const item = await getQueueItem(transaction, clientEventId);
          assertManualRetryActorIsCurrent(options.isActorCurrent);
          if (item?.created_by !== options.expectedCreatedBy) {
            return null;
          }

          const retry = createManualQuickLogRetry(item, options);
          assertManualRetryActorIsCurrent(options.isActorCurrent);
          await writeQueueItemState(transaction, retry.item);
          assertManualRetryActorIsCurrent(options.isActorCurrent);
          return retry;
        });
      } catch (error) {
        if (error instanceof ManualRetryActorSupersededError) {
          return null;
        }
        throw error;
      }
    },
    resolveInFlightSuccess: (clientEventId, options) => runExclusive(executor, async (transaction) => {
      const item = await getRequiredQueueItem(transaction, clientEventId);
      const resolution = resolveQuickLogInFlightSuccess(item, options);

      if (resolution.outcome === 'server_confirmed') {
        await writeQueueItemState(transaction, resolution.item);
      }

      return resolution;
    }),
    removeIfState: (clientEventId, expectedState, options) => runExclusive(
      executor,
      async (transaction) => {
        const item = await getQueueItem(transaction, clientEventId);
        if (
          item?.state !== expectedState
          || (
            options?.expectedCreatedBy !== undefined
            && item.created_by !== options.expectedCreatedBy
          )
        ) {
          return false;
        }

        await transaction.runAsync(
          `DELETE FROM ${QUICK_LOG_QUEUE_TABLE_NAME} WHERE client_event_id = ?`,
          [clientEventId],
        );
        return true;
      },
    ),
    remove: (clientEventId) => runExclusive(executor, async (transaction) => {
      await transaction.runAsync(
        `DELETE FROM ${QUICK_LOG_QUEUE_TABLE_NAME} WHERE client_event_id = ?`,
        [clientEventId],
      );
    }),
    updateDetails: async (clientEventId, options) => {
      try {
        return await runExclusive(executor, async (transaction) => {
          assertDetailUpdateActorIsCurrent(options.isActorCurrent);
          const item = await getRequiredQueueItem(transaction, clientEventId);
          assertDetailUpdateActorIsCurrent(options.isActorCurrent);
          if (
            options.expectedCreatedBy !== undefined
            && item.created_by !== options.expectedCreatedBy
          ) {
            return null;
          }
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

          assertDetailUpdateActorIsCurrent(options.isActorCurrent);
          await transaction.runAsync(
            `UPDATE ${QUICK_LOG_QUEUE_TABLE_NAME}
              SET payload_version = ?,
                  payload_json = ?,
                  occurred_at = ?,
                  updated_at = ?
              WHERE client_event_id = ?
                AND created_by = ?
                AND state IN (?, ?, ?)`,
            [
              updatedItem.payload_version,
              serializeQuickLogQueuePayload(updatedItem.payload),
              updatedItem.occurred_at,
              updatedItem.updated_at,
              updatedItem.client_event_id,
              item.created_by,
              'pending_local',
              'failed_retryable',
              'failed_permanent',
            ],
          );
          assertDetailUpdateActorIsCurrent(options.isActorCurrent);
          const persistedItem = await getRequiredQueueItem(transaction, clientEventId);
          assertDetailUpdateActorIsCurrent(options.isActorCurrent);
          return persistedItem;
        });
      } catch (error) {
        if (error instanceof DetailUpdateActorSupersededError) {
          return null;
        }
        throw error;
      }
    },
  };
}

const editableDetailStates = new Set<QuickLogQueueState>([
  'pending_local',
  'failed_retryable',
  'failed_permanent',
]);

class DetailUpdateActorSupersededError extends Error {
  public constructor() {
    super('Quick Log detail update actor changed');
    this.name = 'DetailUpdateActorSupersededError';
  }
}

function assertDetailUpdateActorIsCurrent(
  isActorCurrent: (() => boolean) | undefined,
): void {
  if (isActorCurrent !== undefined && !isActorCurrent()) {
    throw new DetailUpdateActorSupersededError();
  }
}

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

async function quarantineLegacyMissingActorQueueItems(
  executor: QuickLogQueueSqlExecutor,
  options: Readonly<{ now: string }>,
): Promise<void> {
  await runExclusive(executor, async (transaction) => {
    await transaction.runAsync(
      `UPDATE ${QUICK_LOG_QUEUE_TABLE_NAME}
        SET state = ?,
            retry_count = retry_count + 1,
            last_error_category = ?,
            retry_after_at = NULL,
            updated_at = ?
        WHERE created_by IS NULL
          AND state IN (?, ?, ?)`,
      [
        'failed_permanent',
        'missing_context',
        options.now,
        'pending_local',
        'sending',
        'failed_retryable',
      ],
    );
  });
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
    const existingItem = await getQueueItem(transaction, item.client_event_id);

    // A re-check reuses the deterministic check-off id of an un-check whose delete has not yet
    // drained, so the deterministic id collides with a terminal `deleted_before_sync` row. The
    // latest intent (re-check) supersedes the pending delete — mirroring `enqueueDeletedQueueItem`
    // in the opposite direction — otherwise `INSERT OR IGNORE` silently returns the stale delete
    // and the re-check gets stuck until the app restarts. Any other existing state keeps the
    // idempotent no-op that dedupes an accidental double tap.
    if (existingItem !== null && existingItem.state === 'deleted_before_sync') {
      assertMatchingQueueClientEventIdentity(existingItem, item);
      await transaction.runAsync(
        `DELETE FROM ${QUICK_LOG_QUEUE_TABLE_NAME} WHERE client_event_id = ?`,
        [item.client_event_id],
      );
    }

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

function assertMatchingQueueClientEventIdentity(
  existingItem: QuickLogStoredQueueItem,
  item: QuickLogStoredQueueItem,
): void {
  if (
    existingItem.household_id !== item.household_id
    || existingItem.puppy_id !== item.puppy_id
    || existingItem.event_type !== item.event_type
    || existingItem.payload_version !== item.payload_version
    || existingItem.occurred_at !== item.occurred_at
  ) {
    throw new Error('Quick Log queue client event identity does not match');
  }
}

async function enqueueDeletedQueueItem(
  executor: QuickLogQueueSqlExecutor,
  input: unknown,
  options: Readonly<{ now: string; retryAfterAt?: string }>,
): Promise<QuickLogStoredQueueItem> {
  const parsedInput = quickLogQueueEnqueueInputSchema.parse(input);
  const createdAt = parsedInput.created_at ?? options.now;
  const item = createStoredQuickLogQueueItem({
    ...parsedInput,
    state: 'deleted_before_sync',
    retry_count: 0,
    last_error_category: null,
    retry_after_at: options.retryAfterAt ?? null,
    created_at: createdAt,
    updated_at: options.now,
  });

  return runExclusive(executor, async (transaction) => {
    const existingItem = await getQueueItem(transaction, item.client_event_id);
    if (existingItem !== null) {
      assertMatchingQueueClientEventIdentity(existingItem, item);
    }

    // A deterministic client id can already belong to an insert/retry state. Replacing that row
    // inside the same SQLite transaction makes the user's delete intent authoritative and keeps
    // the active actor carried by `item`; the prior row can no longer be claimed for insertion.
    await transaction.runAsync(
      `DELETE FROM ${QUICK_LOG_QUEUE_TABLE_NAME} WHERE client_event_id = ?`,
      [item.client_event_id],
    );
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
  options: Readonly<{ createdBy?: string; now: string }>,
): Promise<QuickLogStoredQueueItem | null> {
  return runExclusive(executor, async (transaction) => {
    const actorClause = options.createdBy === undefined ? '' : 'created_by = ? AND ';
    const readyRow = await transaction.getFirstAsync<QuickLogQueueStoredRow>(
      `SELECT * FROM ${QUICK_LOG_QUEUE_TABLE_NAME}
        WHERE ${actorClause}(state = ? OR (
          state = ?
          AND (retry_after_at IS NULL OR julianday(retry_after_at) <= julianday(?))
        ))
        ORDER BY created_at ASC
        LIMIT 1`,
      [
        ...(options.createdBy === undefined ? [] : [options.createdBy]),
        'pending_local',
        'failed_retryable',
        options.now,
      ],
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

async function recoverStaleSendingQueueItems(
  executor: QuickLogQueueSqlExecutor,
): Promise<void> {
  await runExclusive(executor, async (transaction) => {
    const rows = await transaction.getAllAsync<QuickLogQueueStoredRow>(
      `SELECT * FROM ${QUICK_LOG_QUEUE_TABLE_NAME}
        WHERE state IN (?)
        ORDER BY created_at ASC`,
      ['sending'],
    );

    for (const row of rows) {
      if (row.created_by === null) {
        continue;
      }

      const item = rowToQueueItem(row);
      const recoveredItem = applyQuickLogQueueTransition(item, {
        type: 'mark_failed_retryable',
        errorCategory: 'unknown',
        retryAfterAt: null,
        now: new Date().toISOString(),
      });

      await writeQueueItemState(transaction, recoveredItem);
    }
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

class ManualRetryActorSupersededError extends Error {
  public constructor() {
    super('Quick Log manual Retry actor changed');
    this.name = 'ManualRetryActorSupersededError';
  }
}

function assertManualRetryActorIsCurrent(isActorCurrent: () => boolean): void {
  if (!isActorCurrent()) {
    throw new ManualRetryActorSupersededError();
  }
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
