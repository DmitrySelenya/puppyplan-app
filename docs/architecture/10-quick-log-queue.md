# Quick Log Queue

## Purpose

Minimal Durable Quick Log Queue protects the most important beta action: logging a puppy routine event when the network is slow or unavailable.

It is not a full outbox, local-first store, sync engine, or conflict resolver.

## Storage

Use Expo SQLite.

Zustand may mirror queue status for UI rendering, but SQLite is the source of truth for queued local writes.

Rejected:

- AsyncStorage: poor atomicity and race risk for state-machine updates;
- SecureStore: not for frequent queue writes and may have small-value limits;
- TanStack Query persisted mutations: no independent business state machine.

## Table

Local-only table:

```sql
CREATE TABLE queue_item (
  client_event_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

No notes/photos/free text unless a future ADR explicitly expands the queue.

## State Machine

```text
pending_local -> sending -> server_confirmed
sending -> failed_retryable -> sending
any before server_confirmed -> deleted_before_sync
sending -> failed_permanent
```

## Retry Triggers

- reconnect;
- app foreground;
- manual Retry;
- controlled retry loop with backoff.

Initial backoff sequence: 1s, 2s, 4s, then cap at 10s with jitter. Manual Retry may bypass the current delay once, but it must not create a second queue item.

## Error Classification

Retryable:

- network unavailable;
- request timeout;
- Supabase/PostgREST 5xx;
- transient rate limit with retry-after;
- auth refresh in progress.

Permanent until user action:

- RLS deny or permission revoked;
- invalid payload/schema version;
- missing puppy/household;
- expired invite/share context for a queued action;
- server validation failure.

Unknown errors start as retryable for a bounded number of attempts, then move to `failed_permanent` with Retry/Delete. Do not loop forever.

Store only scrubbed error category in `last_error`; never store raw server messages that may contain PII.

## Undo And In-Flight Sync

Undo/Delete before local `server_confirmed` wins in the client state machine.

Required behavior:

1. Mark the queue item `deleted_before_sync` transactionally.
2. Remove the optimistic row from Today/Timeline.
3. If an in-flight insert later returns success for the same `client_event_id`, issue a best-effort server delete/tombstone through the typed data layer, then invalidate affected query keys.
4. If best-effort server cleanup fails, show a recoverable conflict state rather than silently resurrecting the event.

This is not a general conflict UI. It is a narrow guard for the Quick Log Undo race.

## UI Contract

- Pending event appears immediately in Today/Timeline.
- Quick Log tap to visible optimistic UI must be <=100ms.
- Pending event uses dot/pill `pending`, not skeleton replacement.
- User can Undo/Delete before server confirmation.
- Failed permanent state shows Retry/Delete with calm copy.

## Server Idempotency

Supabase enforces `UNIQUE (household_id, client_event_id)`. Retry with the same `client_event_id` must not create duplicates.

Successful retry, duplicate/idempotent success, Undo cleanup, and permanent failure all invalidate the affected query keys listed in `03-client-data-layer.md`.

## Duplicate Detection

Use two explicit windows from the CTO verdict:

- 3 seconds: accidental double-tap warning for identical tracker action;
- 10 minutes: household duplicate-care warning for the same routine event type.

Constants live in `src/contracts/business-rules.ts`. Duplicate warnings must never block a caregiver from intentionally logging a real second event.
