---
name: review-deep
description: Use when PuppyPlan work needs a thorough pre-merge, pre-release, schema, permission, security, or cross-boundary review - runs focused passes for security, logic, tests, performance, and platform compliance.
---

# PuppyPlan Deep Review

## Use When

- Before merging multi-file or cross-boundary work.
- Before release gates, EAS builds, production migrations, Edge Function deploys, or store submission prep.
- For changes touching auth, RLS, schema, sharing, privacy, push notifications, Quick Log queue, or core app shell.

Use `review` for small local changes.

## Required Context

Read `AGENTS.md`, the relevant `PUP-___` issue, linked plan, PRD/DESIGN/architecture/ADR docs, and changed files before judging.

## Process

1. Gather scope:
   - `git status --short --branch`
   - `git diff --stat`
   - `git diff`
2. Identify boundaries crossed:
   - contracts
   - Supabase migrations/RLS/functions
   - query/cache
   - design/i18n/observability
   - app routes/providers
   - release or platform configuration
3. Run five review passes:
   - Security and access
   - Logic and correctness
   - Test coverage
   - Performance and resource use
   - PuppyPlan platform compliance
4. Synthesize and deduplicate findings. Escalate issues flagged by multiple passes.

## Parallelism

- Claude Code may use parallel subagents if available.
- Codex must not spawn subagents unless the user explicitly asks for parallel agent work. If not authorized, run the five passes locally and sequentially.
- In all cases, the final answer must be one consolidated report.

## Pass Checklist

### Security And Access

- Zod/runtime validation at trust boundaries.
- RLS coverage for new or changed tables, policies, views, functions, and realtime publications.
- Edge Functions use privileged access only behind explicit authorization checks.
- No service role key, secret, token, or private user data leaks to client, logs, analytics, screenshots, fixtures, issues, docs, or PR text.
- No SQL, command, deep-link, URL, webview, or notification injection path.

### Logic And Correctness

- Null, empty, boundary, timezone, locale, and plural behavior.
- Offline/retry/replay behavior.
- Realtime is freshness only, not correctness.
- Query keys, invalidation, optimistic update, rollback, and stale state.
- Quick Log 3-second and 60-second invariants.

### Tests

- Focused tests for changed behavior.
- Contract tests for business rules.
- pgTAP/RLS tests for permission changes.
- Migration diff/destructive checks for schema changes.
- Maestro or simulator smoke only once a dev build exists.

### Performance

- No unbounded queries, N+1 Supabase calls, repeated large JSON parsing, listener leaks, or JS-thread blocking work.
- Realtime subscriptions clean up.
- App shell avoids heavy startup imports.
- SQLite queue writes are bounded and idempotent.

### Platform Compliance

- `app/` stays thin.
- Feature internals do not import other feature internals.
- UI uses `src/design` and typed i18n.
- Observability wrappers scrub PII.
- Generated native project files are not edited directly.
- Release Guardrail is respected.

## Output

```markdown
## Deep Review Findings

### Critical
1. [Security/Logic/Tests/Performance/Platform] file:line - issue - fix

### High
1. ...

### Medium
1. ...

### Low / Notes
1. ...

## Coverage Gaps
- [ ] ...

## AGENTS.md Compliance
- RLS/privacy/contracts/i18n/design/query/Quick Log/a11y/release:

## Verdict
Block / Fix before merge / Approve with notes / No issues found
```

## Rules

- Do not commit, push, merge, deploy, migrate, publish, or mutate production systems.
- Do not treat agent self-review as the final review gate for critical work; the user is the final reviewer in solo development.
