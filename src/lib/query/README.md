# Query

TanStack Query owns PuppyPlan server-state cache.

This module provides:

- `client.ts`: one QueryClient factory with explicit defaults and no Devtools.
- `keys.ts`: the only allowed query key factory.
- `quick-log.ts`: Quick Log mutation/cache helpers for optimistic event rows, queue replay, undo cleanup, and invalidation.

Do not store server rows in Zustand. Feature UI should consume typed query/mutation helpers from `src/lib/query` rather than raw Supabase calls.
