# Queue

Minimal Durable Quick Log Queue core.

This module is intentionally narrow:

- Expo SQLite local storage for unsent Quick Log routine events only.
- Pure state-machine and retry helpers.
- Atomic storage claim for the next ready-to-send item.
- Local schema versioning separate from Supabase migrations. Schema v2 stores `created_by` so retry uses the original actor.
- Scrubbed error categories only; no notes, photos, names, emails, tokens, media URLs, or raw backend errors.

Legacy rows without `created_by` are never sent as the current session user. They are kept local and marked `failed_permanent` with `missing_context`.

It does not own Supabase mutation hooks, TanStack Query invalidation, React hooks, Zustand mirrors, analytics, or a generic offline outbox.
