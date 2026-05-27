# Client Data Layer

## Source Of Truth

Supabase Postgres is durable source of truth. TanStack Query is the client server-state cache. Zustand never owns server rows.

## Supabase Client

- One singleton in `src/lib/supabase/client.ts`.
- Auth/session sensitive values use Expo SecureStore.
- Query cache persistence uses AsyncStorage only for whitelisted non-sensitive reads.
- UI features call typed hooks/wrappers, not raw Supabase client.

## Query Key Factory

All query keys come from `src/lib/query/keys.ts`. Free-form array keys are forbidden.

Example shape:

```ts
export const queryKeys = {
  puppy: {
    detail: (puppyId: string) => ['puppy', puppyId] as const,
  },
  today: {
    dashboard: (householdId: string, puppyId: string, date: string) =>
      ['today', householdId, puppyId, date] as const,
  },
  events: {
    timeline: (householdId: string, puppyId: string, filters: TimelineFilters) =>
      ['events', householdId, puppyId, 'timeline', filters] as const,
  },
  reminders: {
    list: (householdId: string, puppyId: string) =>
      ['reminders', householdId, puppyId] as const,
  },
};
```

Invalidation must use the factory.

## Mutation Invalidation Contract

Feature plans must list the query keys invalidated by each mutation before implementation. Do not rely on broad cache clearing as the default.

Baseline invalidation map:

| Mutation | Required invalidation |
| --- | --- |
| Quick Log insert/sync/delete/undo | `today.dashboard`, `events.timeline`, affected puppy summaries, duplicate-warning source queries |
| Reminder create/update/action | `today.dashboard`, `reminders.list`, affected reminder occurrence queries |
| Health record create/update/delete | `today.dashboard`, health summary/detail queries, share projection queries if shared |
| Household member invite/accept/revoke | membership queries, `today.dashboard`, sharing/settings queries |
| Share link create/revoke/expire | share preview queries, share projection queries, settings/share list queries |

Each feature may add narrower keys, but it may not omit the affected Today/Timeline/share projection surfaces.

## Mutation Pattern

Quick Log mutations must use `onMutate`, `onSuccess`, `onError`, and `onSettled`.

Required lifecycle:

1. Generate `client_event_id`.
2. Read `supabase.auth.getSession()` once and persist that actor as `created_by`.
3. Build one insert payload and derive the affected query keys.
4. Cancel all relevant Today/Timeline/summary/duplicate-warning queries before cache writes.
5. Snapshot previous cache by `client_event_id`.
6. Enqueue the same identity in Expo SQLite.
7. Optimistically insert pending event.
8. Send Supabase insert through `src/lib/supabase/events.ts`.
9. On success, replace only the matching optimistic row with the typed server row and remove the queue item.
10. On retryable or permanent failure, keep the row visible with `QuickLogCachedEventRow.localSync`.
11. Invalidate relevant query keys on settle and return invalidation promises.

Rollback must not hide a valid pending event for retryable network failures. Until Timeline query `select` merges local queue rows into server results, mutation failures must not invalidate the Timeline root/prefix because an active refetch would replace the local failed row with Supabase-only data. Failure settlement still invalidates the non-Timeline dependent keys.

Undo/delete before sync removes the optimistic row. If a late success returns after `deleted_before_sync`, the typed Supabase wrapper selects by `(household_id, client_event_id)` to obtain `id`, then tombstones by `id`; cache must not resurrect the row. If cleanup fails, keep the local `deleted_before_sync` record for a future cleanup-recovery pass and skip event-derived invalidations that could refetch the surviving server row. If the in-flight insert fails after Undo, `deleted_before_sync` remains terminal and no failed-state transition is attempted.

Filtered Timeline cache compatibility must use the local calendar date supplied by the mutation/replay path, not a UTC date sliced from `occurred_at`, so near-midnight logs stay visible on the user's intended Today/Timeline date.

`auth_refresh_in_progress` classification requires a shared auth-refresh signal to be passed into `createSupabaseEventLogRepository`. Until the auth/session implementation wires that signal, 401/403 responses are treated as `permission_denied`.

## Hydration Cache

Persist only:

- puppy profile;
- Today dashboard;
- first page of Timeline.

Do not persist:

- share tokens;
- invite previews;
- raw health notes;
- media signed URLs beyond their TTL;
- authenticated secrets.

Default TTL: 24 hours unless a feature-specific ADR changes it.
