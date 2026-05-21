# Linear Workflow

## Canonical Setup

- Workspace: DmitrySelenya Linear workspace.
- Team: `PUP` / PuppyPlan.
- Project: `PuppyPlan MVP`.
- Repository: `DmitrySelenya/puppyplan-app`.

Do not create PuppyPlan tasks in legacy or non-PuppyPlan streams. If `PUP` is not available in Linear tools, stop Linear mutations and ask the user to create or expose the PuppyPlan team.

## Source Of Truth Split

- **Linear issue:** priority, owner, status, acceptance criteria, blockers, and current workflow state.
- **Linear document/page:** hub, status summary, project index, meeting note, or link map.
- **Repo docs:** PRD, design, architecture, ADRs, plans, implementation contracts, and verification rules.
- **GitHub PR:** code review, CI, changed files, and final verification evidence.

Linear documents must link to repo docs for durable decisions. If an agent makes a product, architecture, schema, security, or release decision in Linear, it must move that decision into the appropriate repo doc or ADR before implementation finishes.

## Status Lifecycle

Use this path:

```text
Backlog -> Todo -> In Progress -> In Review -> Done
```

- **Backlog:** captured idea, missing scope, or not scheduled.
- **Todo:** scoped and ready for planning or implementation.
- **In Progress:** actively owned. Keep one active owner unless work is intentionally split.
- **In Review:** implementation and verification evidence are ready for review.
- **Done:** accepted, merged or otherwise completed, and evidence recorded.

Use `Canceled` for work intentionally dropped and `Duplicate` only when another issue is the canonical tracker.

## Labels

Create these labels for team `PUP`:

| Label | Meaning |
|---|---|
| `agent-ready` | Task has enough context, acceptance, and verification for an agent to start. |
| `needs-plan` | Requires a `docs/plans/active/` plan before implementation. |
| `needs-adr` | Requires an ADR before or alongside implementation. |
| `contracts` | Touches Zod contracts, payloads, business rules, or generated types. |
| `rls` | Touches Supabase policies, permissions, or pgTAP coverage. |
| `quick-log` | Touches Quick Log, queue, dedupe, or Today freshness. |
| `i18n` | Touches user-facing strings, translation keys, or string budgets. |
| `a11y` | Touches accessibility, Dynamic Type, touch targets, or screen-reader behavior. |
| `privacy` | Touches logs, analytics, screenshots, permissions, sharing, or private data handling. |
| `release-gate` | Blocks or verifies release readiness. |
| `blocked` | Cannot move forward without a named dependency or decision. |
| `decision` | Captures a product or architecture choice that may need docs/ADR. |
| `docs` | Documentation-only or documentation-heavy work. |

Only use `agent-ready` when the issue has Goal, Non-goals, Constraints, Acceptance, Likely files, Verification, and links to required source docs.

## Issue Templates

### Feature

```markdown
## Goal

## User value

## Source docs
- PRD:
- Design:
- Architecture:
- ADR:
- Plan:

## Non-goals

## Constraints

## Acceptance
- [ ]

## Likely files

## Verification

## Privacy/security notes
```

### Bug

```markdown
## Problem

## Reproduction

## Expected behavior

## Actual behavior

## Source docs

## Constraints

## Acceptance
- [ ]

## Verification

## Regression test
```

### Task

```markdown
## Goal

## Context

## Non-goals

## Acceptance
- [ ]

## Verification
```

### Spike

```markdown
## Question

## Why now

## Source material

## Timebox

## Output
- Decision summary
- Recommended next issue or ADR
- Evidence links

## Non-goals
- No production changes
- No dependency or architecture change without approval
```

### ADR

```markdown
## Decision needed

## Context

## Options

## Recommendation

## Impacted docs/files

## Acceptance
- ADR added or updated under `docs/architecture/adr/`
- ADR index updated if needed
```

### Release Gate

```markdown
## Gate

## Scope

## Required evidence

## Forbidden actions without exact approval
- EAS build/update
- TestFlight/Play submission
- Supabase production migration/deploy
- Git push/merge/tag/release

## Verification
```

## Branches And PRs

- Use the issue's Linear-generated `gitBranchName` without modification, for example `dimaselenya/pup-123-quick-log-queue`.
- If Linear does not expose a generated branch, fall back to `pup-<issue-number>-<short-slug>`.
- Include the matching `PUP-___` in the PR title and Work Tracking section.
- Keep one primary issue per branch.
- Link the relevant plan and source docs in the PR.
- Put verification evidence in both the PR and the Linear issue when possible.
- Do not close an issue until verification is recorded and review expectations are satisfied.

## Initial Linear Setup Checklist

After team `PUP` exists:

- [x] Create project `PuppyPlan MVP`.
- [x] Create the labels listed above for team `PUP`.
- [x] Create hub document `PuppyPlan Agent Operating System` linking to `AGENTS.md`, `docs/agents/00-operating-model.md`, `docs/agents/context-engineering.md`, `docs/architecture/00-overview.md`, and the active plan.
- [x] Create starter issues:
  - `PUP-1` `Finalize agent operating model docs`
  - `PUP-2` `Scaffold Expo app baseline`
  - `PUP-3` `Set up Supabase contracts and RLS baseline`
  - `PUP-4` `Set up CI and local verification gates`
  - `PUP-5` `Create Quick Log MVP implementation plan`
  - `PUP-6` `Enable Linear GitHub integration and branch linking`
- [ ] Verify GitHub integration for `DmitrySelenya/puppyplan-app` with the first approved branch/PR so branches link back to Linear issues. Track this in `PUP-6`.
