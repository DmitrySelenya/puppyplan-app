---
name: implement
description: Use when implementing PuppyPlan work from a docs/plans plan or scoped Linear issue - executes phases in order, updates checkboxes/changelog, tests behavior, and records verification.
---

# PuppyPlan Implementation

## Use When

- Implementing from an existing `docs/plans/active/YYYY-MM-DD-<topic>.md`.
- Executing a scoped `PUP-___` issue.
- Continuing a partially completed plan.

If work is non-trivial and no plan exists, use `plan` first unless the user explicitly makes it a no-plan exception.

## Start

1. Read `AGENTS.md`.
2. Read the Linear issue and use its Linear-generated `gitBranchName` for branch work.
3. Read the full linked plan before editing.
4. Read source docs referenced by the plan.
5. Run `git status --short --branch` and note pre-existing changes.
6. Identify the first incomplete phase and task.

## Execute

For each task:

1. Read the relevant files before editing.
2. For behavior changes, write or update tests first when feasible.
3. Make the smallest scoped change.
4. Respect boundaries:
   - no raw Supabase client in feature UI
   - no server state in Zustand
   - no raw user-facing strings
   - no raw design primitives in feature code
   - no direct observability calls that can leak PII
   - no generated native file edits
5. Update plan checkboxes and changelog as work completes.
6. Run targeted verification after meaningful changes.

## Phase Completion

Before claiming a phase is complete:

- Run the area gate. Once available, prefer `npm run check`.
- If scripts do not exist yet, run the closest available commands and say what is missing.
- Record command output or concise evidence in the plan/PR/Linear issue.
- Leave the Linear issue `In Progress` until there is a PR or the user explicitly accepts local-only review state.

## Stop Conditions

Stop and ask before:

- new dependencies
- schema changes beyond PRD section 6.10
- architecture or external service changes
- production configuration
- release, deploy, migration, store, git remote, or irreversible actions
- unclear product, UX, privacy, security, or permission decisions

## Output

```markdown
## Implementation Progress

### Completed
- [x] task (file:line)

### Current phase
Phase N - name: X/Y tasks complete

### Verification
- command: result

### Linear
PUP-___ status:

### Next step
- [ ] ...
```
