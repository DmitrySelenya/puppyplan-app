# PuppyPlan

Native iOS/Android app for adults managing the first 90 days with a puppy.
The beta must make one operational habit work: create a puppy profile, log routine events quickly, understand Today, coordinate care, and share selected context safely.

This repo is optimized for AI-coding-first delivery. Architecture must be enforced by files, types, lint, tests, CI, and review checklists rather than memory.

## Source Of Truth

Read these before non-trivial work:

1. Relevant section of `puppyplan-prd-v2.md`
2. Relevant section of `DESIGN.md`
3. Relevant `docs/architecture/*.md` files
4. Related ADRs under `docs/architecture/adr/`
5. Feature-local `AGENTS.md`, once feature directories exist

Primary architecture entry point: `docs/architecture/00-overview.md`.
Agent-specific rules: `docs/architecture/18-ai-agent-guide.md`.

## Target Tech Stack

- Expo native mobile app, not a PWA-first product
- Expo Router for navigation
- TypeScript strict
- Supabase Postgres as durable source of truth
- Supabase RLS and privileged Edge Functions for access enforcement
- TanStack Query for server state
- Zustand only for UI/workflow state
- Zod for runtime contracts
- Expo SQLite only for the Minimal Durable Quick Log Queue
- `react-i18next` with typed keys and string-budget checks
- PostHog for product/UI flags
- Sentry or equivalent through shared observability wrappers only

## Non-Negotiables

- `Today | Health | More` are the only primary tabs.
- Quick Log is a persistent FAB/action, not a tab.
- Supabase Postgres is the durable source of truth.
- Realtime is an enhancement, not a correctness dependency.
- RLS and Edge Functions enforce access; UI guards are convenience only.
- Every user-facing string comes through i18n.
- No raw puppy names, notes, emails, provider names, photos, or tokens in analytics/logs.
- Any schema change beyond PRD section 6.10 requires ADR-0007 process and CTO approval.
- OTA/EAS Update stays off in MVP.
- Generated `ios/` and `android/` files are not edited directly.

## Target Repo Structure

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
docs/plans/
```

`app/` must stay thin. It wires layouts, providers, routes, auth redirects, and modal presentation only. Business logic, Supabase calls, hooks, and screen components live outside `app/`.

## Architecture Rules

- **Bounded contexts:** one workstream edits one ownership area at a time. Cross-workstream changes require an architecture doc and ADR note explaining why.
- **No cross-feature imports:** features may import `src/design`, `src/contracts`, and `src/lib` APIs, but not other feature internals.
- **Contracts first:** data-shape changes start in `src/contracts/`, then migrations/generated DB types/RLS tests as needed.
- **Supabase boundary:** feature UI code never imports `@supabase/supabase-js` directly. Use wrappers in `src/lib/supabase` and query hooks in `src/lib/query`.
- **State boundary:** server-derived rows do not live in Zustand. Zustand is for UI/workflow state only.
- **Design boundary:** feature code must not import raw colors, spacing, typography, icons, `Pressable`, haptics, or direct business-error alerts. Use `src/design` primitives/wrappers.
- **Observability boundary:** feature code must not call `Sentry.captureException` directly. Use shared observability wrappers that scrub PII.
- **i18n boundary:** no raw user-facing strings in UI code; use typed i18n keys and ICU plurals.
- **Quick Log invariants:** accidental double tap is 3 seconds; household duplicate-care warning is 10 minutes. These constants live in `src/contracts/business-rules.ts` and must be tested.

## Agent-Friendly Development

- Keep diffs small and task-scoped. Avoid drive-by refactors.
- Prefer pure deterministic core logic behind narrow TypeScript APIs; isolate storage, network, time, random, notifications, analytics, and haptics behind adapters.
- Treat tests as the executable spec.
- When a requirement sounds like "always" or "never", write it as an invariant in `docs/plans/` and map it to a test.
- Prefer extension through existing contracts over broad rewrites. Modify existing code for bug fixes and focused refactors.
- Add dependencies only after explicit approval.

## Workflow

- Restate the goal and success criteria before coding.
- Read relevant PRD/design/architecture/ADR docs before editing.
- For UX, flow, API, storage, schema, permissions, release, or architecture changes, create or update a `docs/plans/YYYY-MM-DD-<topic>.md` plan/contract.
- If a plan exists, read the full plan before implementation, identify the current phase, and update checkboxes/changelog as work completes.
- For behavior changes, write or update tests before, or at minimum alongside, implementation.
- If anything is unclear, ask one blocking question rather than guessing.

## Task Contract

Use this shape for non-trivial tasks:

- **Goal:** what should change for the user/system
- **Non-goals:** what is explicitly out of scope
- **Constraints:** compatibility, privacy, UX, security, no-refactor limits
- **Acceptance:** concrete, testable done criteria
- **Likely files:** expected paths to touch
- **Verification:** commands, screenshots, RLS tests, migration checks, or manual flows required

## Definition Of Done

- Acceptance criteria are met.
- Relevant architecture docs, ADRs, diagrams, contracts, migrations, generated types, i18n keys, and tests are updated.
- No PII or secrets are exposed in logs, analytics, fixtures, docs, screenshots, or PR text.
- Touched behavior has focused tests.
- Touched UI uses design primitives, has accessibility labels/states, respects touch-target and Dynamic Type rules, and uses i18n keys.
- Checks for the touched area are run and reported. Once scripts exist, prefer `npm run check` as the full local gate.

Target gate order once the app scaffold exists:

```text
lint
typecheck
unit
integration
RLS pgTAP
supabase migration diff / destructive check
contract/codegen diff
EAS build smoke
Maestro smoke
a11y / Dynamic Type / string-budget / token drift checks
platform compliance preflight checks
```

## Review Checklist

Review for:

- RLS impact and permission drift
- PII/logging leaks
- contract/schema/codegen drift
- query key and invalidation correctness
- Quick Log queue correctness and dedupe behavior
- accessibility labels, touch targets, Dynamic Type, and string budgets
- platform submission risk
- diagrams or ADRs that should have changed with the code

## Project Graph Context

`project-graph-context` is not active until this directory is a git repository root with code to index.
After `git init` and the app scaffold exist, use the Codex `project-graph-context` skill before non-trivial edits, reviews, impact analysis, or related-file discovery.

Graph output is advisory only. Always read the actual source files and tests before editing or making review claims.

## Mobile E2E

Use Maestro for MVP E2E once an installable Expo dev build exists.

Critical future flows:

- onboarding -> puppy profile -> first Quick Log -> Today update
- offline Quick Log -> reconnect -> dedupe
- family invite accept/revoke
- trainer share preview/revoke
- reminder schedule/fire/action
- notification permission denied fallback

Do not add a tracked `tools/mobile-e2e/` toolkit until the Expo app id, simulator profile, and dev-build workflow are real.

## Boundaries

**Always:** read relevant docs before modifying; keep changes scoped; run and report relevant verification.

**Ask first:** new dependencies, schema changes beyond PRD section 6.10, architecture changes, new external services, production configuration, release actions, or destructive operations.

**Never:** commit secrets, bypass TypeScript errors, use `any` / `as unknown as` / `ts-ignore` without ADR, put server state in Zustand, use raw Supabase in UI, use raw UI strings, edit generated native project files directly, or store private user content in analytics/logs.

## Release / Production Guardrail

Never perform any release, production, or irreversible repository action without the user's explicit approval for that exact action.

This includes, but is not limited to:

- EAS builds, EAS updates, TestFlight, Play Internal Testing, App Store / Play Store submission, OTA publishing, or release channel changes.
- Supabase production migrations, Edge Function deploys, production environment changes, production cron/automation changes, or live production smoke writes.
- App Store Connect, Google Play Console, PostHog, Sentry, Supabase, Cloudflare, IAP provider, or other production service configuration changes.
- Git commits, pushes, tags, branch merges, PR publication, rebases, force pushes, or any other remote repository mutation.

Approval must name the specific action. A broad instruction such as "do it", "continue", or "finish everything" is not release approval.
