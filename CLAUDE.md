# PuppyPlan - Claude Code

Primary project rules live in `AGENTS.md`. This file is intentionally short and repeats only the non-negotiables that are easy to miss.

## Must Follow

- Read `AGENTS.md` first.
- Read the relevant PRD, `DESIGN.md`, architecture file, and ADR before non-trivial work.
- Keep `app/` thin: routes/layouts/providers only.
- Use Supabase through `src/lib/supabase` / `src/lib/query`; never use raw Supabase clients in feature UI.
- Use TanStack Query for server state and Zustand only for UI/workflow state.
- Start data-shape changes in `src/contracts/`; update migrations, generated DB types, RLS tests, docs, and ADRs as needed.
- Every user-facing string uses typed i18n keys.
- Feature code uses `src/design` primitives/wrappers, not raw `Pressable`, colors, spacing, haptics, or direct business-error alerts.
- Do not log or document raw puppy names, notes, emails, provider names, photos, tokens, or other private user data.
- Do not edit generated `ios/` or `android/` files directly.

## Workflow

- Linear is the operational tracker, GitHub is for branches/PR/CI, and repo docs are the canonical knowledge base.
- Non-trivial PuppyPlan work starts from a `PUP-___` Linear issue or an explicit no-Linear exception from the user.
- Before coding from Linear, read the issue, linked plan, relevant PRD/DESIGN/architecture/ADR docs, and `docs/agents/context-engineering.md`.
- Claude project skills in `.claude/skills/*` are adapters. Follow the canonical workflows in `.agents/skills/*`.
- For UX, flow, API, storage, schema, permission, release, or architecture changes, create or update a `docs/plans/active/YYYY-MM-DD-<topic>.md` plan.
- Implement from plans phase-by-phase and update checkboxes/changelog as work completes.
- Write or update tests before, or alongside, behavior changes.
- Run relevant checks before claiming completion; once scripts exist, prefer `npm run check`.
- Use `project-graph-context` only after this directory is a git repo with code to index. Treat graph output as advisory and read real files before editing.

## Release Guardrail

Do not run release, production, deploy, migration, publish, git remote mutation, or irreversible actions without explicit user approval naming the exact action.
