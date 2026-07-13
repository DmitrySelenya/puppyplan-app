# Shared-account dogfood contract

This is a temporary dogfood mode for two phones signed into the same PuppyPlan account. It is not
family sharing and it cannot identify which person performed an action. The UI may say `You` for
the shared identity; it must not invent owner/caregiver attribution.

## Safe use

1. Install the same local build on both phones and sign into the same development account.
2. Keep one phone's form submission in flight at a time. Quick Log facts may be created offline;
   routine writes are online-first and retain the open form with a visible retry error.
3. On returning to PuppyPlan, foreground refresh is the correctness boundary. Diary invalidates
   both fact and routine query keys and converges to the server result without Realtime.
4. If both phones check off the same planned occurrence, the deterministic client event id plus
   the database uniqueness constraint converges to one live fact. Every check-off payload,
   including Observation v2, preserves the exact `reminder_link`; this is what allows the client
   to distinguish a planned occurrence from an accidental spontaneous-log id collision.
5. Sign out only after pending Quick Log facts have synced. Sign-out does not delete server facts;
   it removes the authenticated care context, cancels this app's scheduled notifications, and
   unmounts unsaved form state. A durable queued fact is committed user data, not a disposable
   draft, and is therefore not silently discarded.

## Synthetic verification record

- Client A mutation invalidates the exact household/puppy timeline and reminder list keys.
- Client B foreground invalidates the same keys and replaces its stale rows from server truth.
- Offline detailed Quick Log payload v2 retains the original `occurred_at` and private note through
  SQLite replay; a repeated server insert is treated as the same `client_event_id`, then the local
  queue row is removed after success.
- A legacy Observation queue row created before `reminder_link` preservation is not silently
  accepted as a duplicate. It remains visible for discard, followed by a fresh check-off.
- Reminder mutation failure remains visible and the canonical editor keeps its controlled draft.
- No private note text is used in this document, logs, notification content, analytics, or broad
  share projections.

Executable evidence lives in `diary-day-query.test.ts`, `reminders-query.test.ts`,
`quick-log-mutation.test.ts`, `quick-log-queue-storage.test.ts`, `supabase-events.test.ts`,
`auth-context.test.tsx`, and `local-reminder-notifications.test.ts`.
