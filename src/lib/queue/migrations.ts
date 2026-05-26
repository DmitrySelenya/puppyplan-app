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

  // Version 1 is idempotent; wrap future multi-step migrations in an exclusive transaction.
  await executor.execAsync(`
CREATE TABLE IF NOT EXISTS ${QUICK_LOG_QUEUE_TABLE_NAME} (
  client_event_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  puppy_id TEXT NOT NULL,
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
}
