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
2. Cancel relevant Today/Timeline queries.
3. Snapshot previous cache.
4. Optimistically insert pending event.
5. Enqueue durable queue item in Expo SQLite.
6. Send Supabase insert.
7. On success, replace pending row with server row and remove queue item.
8. On retryable failure, keep pending/failed state.
9. On permanent invalid state, mark failed with Retry/Delete.
10. Invalidate relevant query keys on settle.

Rollback must not hide a valid pending event for retryable network failures.

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
