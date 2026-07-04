# Queue

Local durable write queues.

This module is intentionally narrow. It owns two separate local mechanisms:

- Minimal Durable Quick Log Queue: Expo SQLite local storage for unsent Quick Log routine events only.
- Health Offline Outbox: a separate ADR-0019 SQLite outbox for Health Record create/update/delete/
  restore operations only.
- Pure state-machine and retry helpers.
- Atomic storage claim for the next ready-to-send item.
- Local schema versioning separate from Supabase migrations. Quick Log schema v2 stores `created_by`
  so retry uses the original actor; Health outbox rows must likewise preserve the original actor and
  never replay legacy missing-actor work as the current session user.
- Scrubbed error categories only; no notes, photos, names, emails, tokens, media URLs, or raw backend errors.

Legacy rows without `created_by` are never sent as the current session user. They are kept local and marked `failed_permanent` with `missing_context`.

It does not own Supabase mutation hooks, TanStack Query invalidation, React hooks, Zustand mirrors,
analytics, or a generic offline outbox. Health replay must call the typed Health repository/query
boundary.
