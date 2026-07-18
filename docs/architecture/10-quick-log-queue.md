# Quick Log Queue

## Purpose

Minimal Durable Quick Log Queue protects the most important beta action: logging a puppy routine event when the network is slow or unavailable.

It is not a full outbox, local-first store, sync engine, or conflict resolver.

ADR-0019 adds a separate, narrow Health Record outbox for Health create/update/delete/restore
operations. That decision does not widen this Quick Log queue table: `queue_item` remains
routine-event-only, while Health uses its own local schema under `src/lib/queue/health-outbox/`.

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
```

`created_by` is nullable only for legacy local rows created before queue schema v2. New enqueue calls must provide the original authenticated actor. Legacy rows with `created_by IS NULL` become `failed_permanent/missing_context` and must not be replayed as the current session user.

ADR-0022 permits one bounded free-text field: an optional validated event note of at most 500
characters inside a strict payload-version-2 Quick Log command. Photos and all other free-text
expansions remain forbidden. The queue must never log `payload_json`; retry preserves the exact
validated note, and server confirmation removes the queue copy.

## State Machine

```text
pending_local -> sending -> server_confirmed
sending -> failed_retryable -> sending
failed_retryable -> failed_permanent
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

Store only scrubbed error category in `last_error_category`; never store raw server messages that may contain PII.

## Undo And In-Flight Sync

Undo/Delete before local `server_confirmed` wins in the client state machine.

Required behavior:

1. Mark the queue item `deleted_before_sync` transactionally.
2. Remove the optimistic row from Today/Timeline.
3. If an in-flight insert later returns success for the same `client_event_id`, issue a best-effort server delete/tombstone through the typed data layer, then invalidate affected query keys.
4. If best-effort server cleanup fails, do not resurrect the event in cache and do not invalidate event-derived queries that could refetch the surviving server row. Keep the local `deleted_before_sync` row so a future cleanup-recovery pass can look up `(household_id, client_event_id)` and tombstone any surviving server row.
5. If the in-flight insert returns a retryable or permanent failure after Undo, keep `deleted_before_sync` terminal. Do not transition it into failed state or re-show the row.

This is not a general conflict UI. It is a narrow guard for the Quick Log Undo race. User-facing cleanup conflict surfacing, telemetry, and retry-on-next-start recovery are follow-up work, not part of the PUP-13 mutation/cache boundary.

## UI Contract

- Pending event appears immediately in Today/Timeline after local identity and payload validation, before durable enqueue or network work is awaited.
- Quick Log tap to visible optimistic UI must be <=100ms.
- Durable enqueue must still complete before the Supabase insert starts.
- Pending event uses dot/pill `pending`, not skeleton replacement.
- User can Undo/Delete before server confirmation.
- Failed permanent state shows Retry/Delete with calm copy.

## Server Idempotency

Supabase enforces `UNIQUE (household_id, client_event_id)`. Retry with the same `client_event_id` must not create duplicates.

Successful retry, duplicate/idempotent success, Undo cleanup, and permanent failure all invalidate the affected query keys listed in `03-client-data-layer.md`.

Duplicate/idempotent success never accepts a tombstoned server row. Spontaneous logs compare the
full routing identity: `household_id`, `client_event_id`, `created_by`, `puppy_id`, `event_type`,
`payload_version`, and `occurred_at`. JSON payload comparison is intentionally avoided.

Reminder check-offs are the narrow exception for actual confirmation time. When both rows have the
same valid structured `payload.reminder_link` (`reminder_id` plus `scheduled_for`) and the other
routing fields match, `occurred_at` may differ because two household devices can confirm the same
planned occurrence at different instants. Observation v2 must preserve `reminder_link` through the
Quick Log factory and durable queue just like other check-off event types. The first writer's live
server row replaces local cache. A missing or different reminder link, actor/schema mismatch, or a
tombstoned row fails visibly instead of being treated as idempotent success.

## Duplicate Detection

Use two explicit windows from the CTO verdict:

- 3 seconds: accidental double-tap warning for identical tracker action;
- 60 seconds: duplicate-care warning for product-approved care buckets, currently feeding meals, outside pee, and poop. Indoor pee accidents are deliberately excluded by PRD; sleep, zoomies, and training remain visibility trackers without duplicate-care prompts.

Constants live in `src/contracts/business-rules.ts`. Duplicate warnings must never block a caregiver from intentionally logging a real second event.
