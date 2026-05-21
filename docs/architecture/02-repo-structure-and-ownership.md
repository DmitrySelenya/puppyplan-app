# Repo Structure And Ownership

## Structure

Use one Expo app. No Turborepo, no `packages/ui`, no multi-app workspace in MVP.

```text
app/                         # Expo Router routes/layouts only
src/
  features/                  # product workstreams
  design/                    # tokens, primitives, motion, haptics, a11y
  lib/
    supabase/
    query/
    queue/
    analytics/
    observability/
    notifications/
    i18n/
    storage/
  contracts/                 # Zod schemas, payloads, business rules
  state/                     # Zustand UI stores only
  test/
supabase/
  migrations/
  functions/
  tests/
  seed/
docs/architecture/
```

`app/` must stay thin. It wires layouts, providers, routes, auth redirects, and modal presentation only. Business logic, Supabase calls, hooks, and screen components live outside `app/`.

## Ownership

Ownership is defined in `OWNERSHIP.md`. A future repo should enforce this with:

- `eslint-plugin-boundaries`;
- CODEOWNERS or equivalent;
- per-feature `AGENTS.md`;
- ADR requirement for shared contract changes.

## Import Rules

Allowed:

- features import `src/design`, `src/contracts`, and `src/lib` APIs;
- feature-local components import only their feature and shared design primitives;
- data hooks import Supabase wrappers, never raw config from UI.

Forbidden:

- cross-feature imports;
- feature code importing `@supabase/supabase-js` directly;
- feature code importing raw colors, spacing, typography, icons, `Pressable`, or haptics directly;
- server-derived rows in Zustand.

## Contract Layer

`src/contracts/` is the shared semantic boundary:

- Zod payload schemas;
- Edge Function input/output schemas;
- analytics event schemas;
- business rules;
- generated DB types re-export if/when generated.

Any change to `src/contracts/`, `src/lib/query`, `src/lib/queue`, or Supabase schema requires an ADR reference.

