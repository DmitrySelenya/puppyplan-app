# ADR-0003: State Ownership Matrix

Status: Accepted

## Context

The app has server data, temporary UI flows, durable queued writes, navigation state, forms, and secrets. Mixing these stores would cause stale views and hard-to-debug bugs.

## Decision

Use:

- Supabase Postgres as durable source of truth;
- TanStack Query for server-state cache;
- Zustand for UI/workflow state only;
- Expo SQLite for the Quick Log durable queue only;
- React Hook Form for form-local drafts;
- SecureStore for auth/session secrets;
- Expo Router for navigation state.

## Consequences

- Server rows must not be stored in Zustand.
- Feature code must consume typed hooks and query keys, not raw Supabase calls.
- New durable local state requires an ADR.
