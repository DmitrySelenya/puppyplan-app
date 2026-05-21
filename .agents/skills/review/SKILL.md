---
name: review
description: Use when reviewing PuppyPlan local changes, staged changes, branches, or PR diffs - checks correctness, privacy, RLS, contracts, i18n, design boundaries, query state, and release guardrails.
---

# PuppyPlan Review

## Use When

- The user asks for a review, audit, sanity check, or pre-commit pass.
- You need to inspect uncommitted changes, staged changes, a branch, or a PR diff.
- Work touches PuppyPlan boundaries from `AGENTS.md`.

For broad pre-merge, release, schema, permission, or cross-boundary work, use `review-deep`.

## Required Context

1. Read `AGENTS.md`.
2. Read the relevant `PUP-___` Linear issue or note the explicit no-Linear exception.
3. Read linked `docs/plans/`, PRD, DESIGN, architecture docs, and ADRs when the diff touches those areas.
4. Use the Linear-generated `gitBranchName` as the branch convention if branch work is involved.

## Process

1. Run `git status --short --branch`, `git diff --stat`, and the relevant `git diff`.
2. Enumerate every changed file. Do not review only the interesting files.
3. Open the full file, not only the diff, when it touches:
   - `app/`
   - `src/contracts/`
   - `src/features/`
   - `src/lib/query/`
   - `src/lib/supabase/`
   - `src/lib/i18n/`
   - `src/lib/observability/`
   - `src/design/`
   - `supabase/`
   - `docs/architecture/`
   - `docs/plans/`
4. Review for correctness, missing tests, privacy leaks, and architecture drift.
5. Report findings first, ordered by severity, with file and line references.

## PuppyPlan Checklist

Check every relevant item:

- Raw Supabase clients do not appear in feature UI.
- Server state stays in TanStack Query, not Zustand.
- User-facing strings use typed i18n keys and ICU plurals where needed.
- Feature UI uses `src/design` primitives/wrappers, not raw colors, spacing, typography, `Pressable`, haptics, or direct business-error alerts.
- Observability goes through shared wrappers; no direct `Sentry.captureException` in feature code.
- No raw puppy names, notes, emails, provider names, photos, push tokens, invite/share tokens, screenshots with private data, or production rows appear in logs, analytics, fixtures, docs, issues, or PR text.
- Contract/schema changes update migrations, generated DB types, RLS tests, docs, and ADRs as needed.
- Query mutations use correct query keys, invalidation, optimistic update, and rollback behavior.
- Quick Log invariants remain 3 seconds for accidental double tap and 60 seconds for household duplicate-care warning.
- Touched UI has accessibility labels/states, touch targets, Dynamic Type behavior, and string-budget coverage when scripts exist.
- Generated `ios/` and `android/` files are not edited directly.
- Release Guardrail is respected: no release, deploy, production config, migration, EAS, store, git remote mutation, or irreversible action without exact user approval.

## Output

Use this order:

```markdown
## Findings

### Critical
1. [file:line] ...

### Warnings
1. [file:line] ...

### Notes
1. [file:line] ...

## Checklist
- RLS/privacy/contracts/i18n/design/query/Quick Log/a11y/release:

## Verification Reviewed
- Commands or evidence inspected:

## Verdict
Ready / Needs fixes / Blocked
```

If there are no findings, say "No issues found" and still mention residual risk or missing verification.

## Rules

- Do not mutate remote GitHub, Linear status, releases, or production systems during review unless explicitly requested.
- Do not move a Linear issue to `In Review` unless there is a PR or the user explicitly accepts a local-only review surface.
