# ADR-0004: Quick Log Queue Uses Expo SQLite

Status: Accepted

## Context

Quick Log is the core habit loop. It must feel instant and survive poor connectivity, but the MVP should not become offline-first.

## Decision

Implement a Minimal Durable Quick Log Queue in Expo SQLite. Zustand may mirror queue status for UI, but SQLite owns durable queued writes.

Rejected storage options: AsyncStorage, SecureStore, and TanStack Query persisted mutations.

## Consequences

- The queue stores only routine-event payloads needed for Quick Log.
- `client_event_id` is generated before optimistic UI and queue insert.
- Server idempotency is enforced with `UNIQUE (household_id, client_event_id)`.
- Broader outbox behavior requires a future ADR. (Resolved: ADR-0021 accepts a shared outbox engine with per-domain schemas; ADR-0019 added the Health outbox.)
