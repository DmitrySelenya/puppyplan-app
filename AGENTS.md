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
Agent operating model: `docs/agents/00-operating-model.md`.
Linear workflow rules: `docs/agents/linear-workflow.md`.
Context engineering rules: `docs/agents/context-engineering.md`.

## Project Skills

Canonical PuppyPlan project skills live under `.agents/skills/`:

- `.agents/skills/plan/SKILL.md`
- `.agents/skills/implement/SKILL.md`
- `.agents/skills/review/SKILL.md`
- `.agents/skills/review-deep/SKILL.md`
- `.agents/skills/tdd/SKILL.md`

Use these project skills before generic or personal skills with the same names. Claude Code discovers `.claude/skills/*` adapters that point back to `.agents/skills/*`. Codex may not auto-discover repo-local skills, so Codex agents must read the matching `.agents/skills/<name>/SKILL.md` manually when the task matches one of these workflows.

Do not put PuppyPlan-specific process rules in global user skills such as `~/.codex/skills` or `~/.claude/skills`; keep project behavior in this repo.

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
- MVP ships with English, Russian, and Spanish locale files from the start; typed-key parity and string-budget checks must cover all three.
- No raw puppy names, notes, emails, provider names, photos, or tokens in analytics/logs.
- Any schema change beyond the ADR-0007 schema baseline / PRD §6 "Модель Данных" requires ADR-0007 process and CTO approval.
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
  active/
  completed/
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
- **Quick Log invariants:** accidental double tap is 3 seconds; duplicate-care warning is 60 seconds. These constants live in `src/contracts/business-rules.ts` and must be tested.

## Agent-Friendly Development

- Keep diffs small and task-scoped. Avoid drive-by refactors.
- Prefer pure deterministic core logic behind narrow TypeScript APIs; isolate storage, network, time, random, notifications, analytics, and haptics behind adapters.
- Treat tests as the executable spec.
- When a requirement sounds like "always" or "never", write it as an invariant in `docs/plans/` and map it to a test.
- Prefer extension through existing contracts over broad rewrites. Modify existing code for bug fixes and focused refactors.
- Add dependencies only after explicit approval.

## Linear Operating System

Linear is the operational tracker. GitHub is the code review, PR, branch, and CI surface. Repository docs are the canonical knowledge base for product, architecture, decisions, plans, and verification evidence.

Use Linear team `PUP` and project `PuppyPlan MVP` for PuppyPlan work. Do not create PuppyPlan work in any legacy or non-PuppyPlan stream. Non-trivial work starts from a `PUP-___` issue unless the user explicitly says this is a no-Linear exception.

Linear issue lifecycle:

```text
Backlog -> Todo -> In Progress -> In Review -> Done
```

- **Backlog:** captured but not ready to implement.
- **Todo:** scoped enough to start planning or implementation.
- **In Progress:** one active agent or human is working it.
- **In Review:** implementation is ready for review or verification.
- **Done:** merged or otherwise completed with verification evidence recorded.

For Linear-backed work, keeping the Linear issue current is mandatory. Agents must update Linear when work starts, when a phase/checklist item completes, when scope or blockers change, and when verification is ready. Do not rely on repo plan updates alone: mirror concise progress, blocker, and verification status back to the Linear issue before ending the turn.

Before working from Linear, an agent must read the issue, linked docs/plans, relevant PRD/DESIGN/architecture/ADR sections, and any attached Linear document. If the issue lacks acceptance criteria, source docs, or privacy/security constraints, add or request that context before implementation.

Linear issues must use the task contract from this file: Goal, Non-goals, Constraints, Acceptance, Likely files, Verification. Use labels from `docs/agents/linear-workflow.md`; apply `agent-ready` only when a task has enough context for an implementation agent to start without guessing.

Linear documents/pages are allowed as hubs, status summaries, meeting notes, and indexes. They must not become the source of truth for product scope, architecture decisions, schema contracts, security policy, or implementation plans. Move durable decisions into repo docs, ADRs, or `docs/plans/`.

Never put secrets, tokens, production credentials, raw puppy names, raw notes, raw emails, provider names, photos, invite/share tokens, push tokens, screenshots with private data, or other private user content in Linear issues, Linear documents, PRs, branch names, commit messages, docs, fixtures, logs, or analytics.

## Workflow

- Restate the goal and success criteria before coding.
- For Linear-backed work, use the issue's Linear-generated `gitBranchName` without modification (for example `dimaselenya/pup-123-quick-log-queue`). If Linear does not expose a generated branch, use `pup-<issue-number>-<short-slug>`. Include the matching `PUP-___` in the PR title and Work Tracking section, and keep one primary issue per branch.
- For Linear-backed work, move or comment the issue into `In Progress` at start, keep phase/checklist progress mirrored in Linear, and move to `In Review` only after verification evidence is recorded there.
- Read relevant PRD/design/architecture/ADR docs before editing.
- For UX, flow, API, storage, schema, permissions, release, or architecture changes, create or update a `docs/plans/active/YYYY-MM-DD-<topic>.md` plan/contract.
- If a plan exists, read the full plan before implementation, identify the current phase, and update checkboxes/changelog as work completes.
- When a plan has no remaining plan-owned work, move it to `docs/plans/completed/`, update its `Status`, and update `docs/plans/README.md`.
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
- The tracked Linear issue reflects the current status, completed checklist items, blockers/dependencies, and verification evidence.
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

Local iOS simulator smoke on this M1 MacBook Air must use the lightweight SE profile:

- Primary simulator: `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).
- Fallback simulator, only if the primary profile is missing: `iPhone SE (3rd generation)` (`1319D7E1-AE4E-4165-8EB9-B3A78DE62867`).
- Do not auto-select the first available simulator from `xcrun simctl list` or XcodeBuildMCP `list_sims`; high-end devices such as iPhone Pro/Pro Max and iPad simulators are not allowed for local smoke unless the user explicitly approves that exact device.
- Before any iOS simulator build/run, confirm XcodeBuildMCP/session defaults point at the SE profile. If defaults are empty or point elsewhere, set them to the SE profile or stop and report the blocker.
- Keep one simulator plus Metro open at a time. PuppyPlan (`com.dmitry-selenya.puppyplan-app`) can coexist on the same SE simulator with Grith (`com.grith.app`) because the bundle identifiers and app data containers are separate; reinstalling PuppyPlan updates only PuppyPlan.

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

**Ask first:** new dependencies, schema changes beyond the ADR-0007 schema baseline / PRD §6 "Модель Данных", architecture changes, new external services, production configuration, release actions, or destructive operations.

**Never:** commit secrets, bypass TypeScript errors, use `any` / `as unknown as` / `ts-ignore` without ADR, put server state in Zustand, use raw Supabase in UI, use raw UI strings, edit generated native project files directly, or store private user content in analytics/logs.

## Release / Production Guardrail

Never perform any release, production, or irreversible repository action without the user's explicit approval for that exact action.

This includes, but is not limited to:

- EAS builds, EAS updates, TestFlight, Play Internal Testing, App Store / Play Store submission, OTA publishing, or release channel changes.
- Supabase production migrations, Edge Function deploys, production environment changes, production cron/automation changes, or live production smoke writes.
- App Store Connect, Google Play Console, PostHog, Sentry, Supabase, Cloudflare, IAP provider, or other production service configuration changes.
- Git commits, pushes, tags, branch merges, PR publication, rebases, force pushes, or any other remote repository mutation.

Approval must name the specific action. A broad instruction such as "do it", "continue", or "finish everything" is not release approval.
