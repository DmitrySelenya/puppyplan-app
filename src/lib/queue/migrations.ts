import {
  QUICK_LOG_QUEUE_SCHEMA_VERSION,
  QUICK_LOG_QUEUE_TABLE_NAME,
} from './schema';
import type { QuickLogQueueSqlRunner } from './storage';
import {
  createObservabilityReporter,
  type ObservabilityReporter,
} from '@/lib/observability';
import { pottyEventPayloadSchema } from '@/contracts/supabase';

type QuickLogQueueMigrationOptions = Readonly<{
  observability?: ObservabilityReporter;
}>;

export async function applyQuickLogQueueMigrations(
  executor: QuickLogQueueSqlRunner,
  options: QuickLogQueueMigrationOptions = {},
): Promise<void> {
  const observability = options.observability ?? createObservabilityReporter();
  const versionRow = await executor.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > QUICK_LOG_QUEUE_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported Quick Log queue schema version: ${currentVersion}`,
    );
  }

  if (currentVersion >= QUICK_LOG_QUEUE_SCHEMA_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await executor.execAsync(`
CREATE TABLE IF NOT EXISTS ${QUICK_LOG_QUEUE_TABLE_NAME} (
  client_event_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  puppy_id TEXT NOT NULL,
  created_by TEXT,
  event_type TEXT NOT NULL,
  payload_version INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  state TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error_category TEXT,
  retry_after_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS queue_item_state_retry_after_idx
  ON ${QUICK_LOG_QUEUE_TABLE_NAME} (state, retry_after_at, created_at);
PRAGMA user_version = ${QUICK_LOG_QUEUE_SCHEMA_VERSION};
`);
    return;
  }

  if (currentVersion < 2) {
    await migrateQuickLogQueueSchemaV2(executor);
  }

  if (currentVersion < 3) {
    await migrateQuickLogQueueSchemaV3(executor, observability);
  }
}

async function migrateQuickLogQueueSchemaV2(
  executor: QuickLogQueueSqlRunner,
): Promise<void> {
  const columns = await executor.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${QUICK_LOG_QUEUE_TABLE_NAME})`,
  );
  const hasCreatedBy = columns.some((column) => column.name === 'created_by');

  await executor.execAsync(`
${hasCreatedBy ? '' : `ALTER TABLE ${QUICK_LOG_QUEUE_TABLE_NAME} ADD COLUMN created_by TEXT;`}
PRAGMA user_version = 2;
`);
}

async function migrateQuickLogQueueSchemaV3(
  executor: QuickLogQueueSqlRunner,
  observability: ObservabilityReporter,
): Promise<void> {
  const rows = await executor.getAllAsync<{
    client_event_id: string;
    payload_json: string;
    state: string;
  }>(
    `SELECT client_event_id, payload_json, state
      FROM ${QUICK_LOG_QUEUE_TABLE_NAME}
      WHERE event_type = ?`,
    ['potty'],
  );

  for (const row of rows) {
    const migrationResult = migrateLegacyPottyPayloadJson(row);

    if (migrationResult.outcome === 'corrupt') {
      observability.captureException(migrationResult.error, {
        area: 'quick_log_queue',
        errorCategory: 'corrupt_payload',
        operation: 'schema_migration_v3',
        tags: {
          migration: 'v3',
        },
      });
      await quarantineCorruptQueuePayload(executor, {
        clientEventId: row.client_event_id,
        state: row.state,
      });
      continue;
    }

    if (migrationResult.payloadJson === null) {
      continue;
    }

    await executor.runAsync(
      `UPDATE ${QUICK_LOG_QUEUE_TABLE_NAME}
        SET payload_json = ?
        WHERE client_event_id = ?`,
      [migrationResult.payloadJson, row.client_event_id],
    );
  }

  await executor.execAsync(`PRAGMA user_version = ${QUICK_LOG_QUEUE_SCHEMA_VERSION};`);
}

type LegacyPottyPayloadMigrationResult =
  | Readonly<{
    outcome: 'ok';
    payloadJson: string | null;
  }>
  | Readonly<{
    outcome: 'corrupt';
    error: Error;
  }>;

function migrateLegacyPottyPayloadJson(row: Readonly<{
  client_event_id: string;
  payload_json: string;
}>): LegacyPottyPayloadMigrationResult {
  const payloadResult = parseQueueMigrationPayload(row);

  if (payloadResult.outcome === 'corrupt') {
    return payloadResult;
  }

  const payload = payloadResult.payload;

  if ('subtype' in payload) {
    if (!pottyEventPayloadSchema.safeParse(payload).success) {
      return {
        outcome: 'corrupt',
        error: new Error('Quick Log queue payload migration failed: invalid potty subtype payload'),
      };
    }

    return {
      outcome: 'ok',
      payloadJson: null,
    };
  }

  const quickAction = payload.quick_action;

  if (quickAction === 'pee_outside') {
    return {
      outcome: 'ok',
      payloadJson: JSON.stringify({ subtype: 'outside' }),
    };
  }

  if (quickAction === 'pee_inside') {
    return {
      outcome: 'ok',
      payloadJson: JSON.stringify({ subtype: 'inside' }),
    };
  }

  if (quickAction === 'poop') {
    return {
      outcome: 'ok',
      payloadJson: JSON.stringify({ subtype: 'poop' }),
    };
  }

  return {
    outcome: 'corrupt',
    error: new Error('Quick Log queue payload migration failed: unknown legacy potty payload'),
  };
}

function parseQueueMigrationPayload(row: Readonly<{
  client_event_id: string;
  payload_json: string;
}>): Readonly<{
  outcome: 'ok';
  payload: Record<string, unknown>;
}> | Readonly<{
  outcome: 'corrupt';
  error: Error;
}> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(row.payload_json);
  } catch (error) {
    return {
      outcome: 'corrupt',
      error: new Error(
        'Quick Log queue payload migration failed: invalid JSON',
        { cause: error },
      ),
    };
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      outcome: 'corrupt',
      error: new Error('Quick Log queue payload migration failed: expected object payload'),
    };
  }

  return {
    outcome: 'ok',
    payload: parsed as Record<string, unknown>,
  };
}

async function quarantineCorruptQueuePayload(
  executor: QuickLogQueueSqlRunner,
  row: Readonly<{
    clientEventId: string;
    state: string;
  }>,
): Promise<void> {
  const terminalState = row.state === 'deleted_before_sync' || row.state === 'server_confirmed';
  const state = terminalState ? row.state : 'failed_permanent';

  await executor.runAsync(
    `UPDATE ${QUICK_LOG_QUEUE_TABLE_NAME}
      SET state = ?,
          retry_count = retry_count + 1,
          last_error_category = ?,
          retry_after_at = NULL,
          payload_json = ?
      WHERE client_event_id = ?`,
    [state, 'corrupt_payload', '{}', row.clientEventId],
  );
}
