# Queue

Minimal Durable Quick Log Queue core.

This module is intentionally narrow:

- Expo SQLite local storage for unsent Quick Log routine events only.
- Pure state-machine and retry helpers.
- Atomic storage claim for the next ready-to-send item.
- Local schema versioning separate from Supabase migrations.
- Scrubbed error categories only; no notes, photos, names, emails, tokens, media URLs, or raw backend errors.

It does not own Supabase mutation hooks, TanStack Query invalidation, React hooks, Zustand mirrors, analytics, or a generic offline outbox.
