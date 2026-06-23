import {
  QUICK_LOG_QUEUE_SCHEMA_VERSION,
  QUICK_LOG_QUEUE_TABLE_NAME,
} from './schema';
import type { QuickLogQueueSqlRunner } from './storage';

export async function applyQuickLogQueueMigrations(
  executor: QuickLogQueueSqlRunner,
): Promise<void> {
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
    await migrateQuickLogQueueSchemaV3(executor);
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
): Promise<void> {
  const rows = await executor.getAllAsync<{
    client_event_id: string;
    payload_json: string;
  }>(
    `SELECT client_event_id, payload_json
      FROM ${QUICK_LOG_QUEUE_TABLE_NAME}
      WHERE event_type = ?`,
    ['potty'],
  );

  for (const row of rows) {
    const migratedPayloadJson = migrateLegacyPottyPayloadJson(row);

    if (migratedPayloadJson === null) {
      continue;
    }

    await executor.runAsync(
      `UPDATE ${QUICK_LOG_QUEUE_TABLE_NAME}
        SET payload_json = ?
        WHERE client_event_id = ?`,
      [migratedPayloadJson, row.client_event_id],
    );
  }

  await executor.execAsync(`PRAGMA user_version = ${QUICK_LOG_QUEUE_SCHEMA_VERSION};`);
}

function migrateLegacyPottyPayloadJson(row: Readonly<{
  client_event_id: string;
  payload_json: string;
}>): string | null {
  const payload = parseQueueMigrationPayload(row);

  if ('subtype' in payload) {
    return null;
  }

  const quickAction = payload.quick_action;

  if (quickAction === 'pee_outside') {
    return JSON.stringify({ subtype: 'outside' });
  }

  if (quickAction === 'pee_inside') {
    return JSON.stringify({ subtype: 'inside' });
  }

  if (quickAction === 'poop') {
    return JSON.stringify({ subtype: 'poop' });
  }

  return null;
}

function parseQueueMigrationPayload(row: Readonly<{
  client_event_id: string;
  payload_json: string;
}>): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(row.payload_json);
  } catch (error) {
    throw new Error(
      `Quick Log queue payload migration failed for ${row.client_event_id}: invalid JSON`,
      { cause: error },
    );
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      `Quick Log queue payload migration failed for ${row.client_event_id}: expected object payload`,
    );
  }

  return parsed as Record<string, unknown>;
}
