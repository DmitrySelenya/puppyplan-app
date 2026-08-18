# PUP-13 Quick Log Mutation Cache Lifecycle - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes contracts, schema, query/cache behavior, queue behavior, docs, or verification evidence.

**Goal:** Implement the typed Quick Log Supabase mutation, optimistic TanStack Query cache lifecycle, and PUP-12 queue handoff so Quick Log writes feel instant while confirmed events remain Supabase/RLS-authoritative.

**Status:** Completed.

**Plan type:** Linear task plan for `PUP-13`.

**Current phase:** Completed - local implementation verified and Linear moved to In Review.

**Architecture:** Supabase Postgres is the durable source of truth for confirmed `event_log` rows. TanStack Query owns server-state cache and optimistic rows. Expo SQLite owns only unsent Quick Log queue state and must preserve the original actor for retries.

**Linear:** `PUP-13`

**Branch:** `dimaselenya/pup-13-typed-quick-log-supabase-mutation-and-optimistic-cache`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - Quick Log, event log data model, RLS shape, local-only queue.
- Design: `DESIGN.md` - §2.3 Quick Log pending, failed retry, snackbar/undo, duplicate warning.
- Architecture: `docs/architecture/03-client-data-layer.md`, `04-state-management.md`, `08-data-model-and-rls.md`, `10-quick-log-queue.md`, `13-observability-error-handling-performance.md`, `17-testing-ci-release.md`.
- ADR: `docs/architecture/adr/0003-state-ownership-matrix.md`, `0004-quick-log-queue-sqlite.md`, `0007-prd-schema-baseline.md`.
- Parent plan: `docs/plans/completed/2026-05-25-quick-log-mvp.md`.

---

## Context

PUP-11 added Quick Log contracts and query keys. PUP-12 added the SQLite queue core, but the queue does not yet persist `created_by`, and no typed Supabase event wrapper or TanStack Query mutation lifecycle exists.

- **Context package:** PUP-13 issue, this plan, source docs above, `src/contracts/quick-log.ts`, `src/contracts/supabase.ts`, `src/lib/query/keys.ts`, `src/lib/queue/*`, `src/lib/supabase/client.ts`, existing tests in `src/test/`, Supabase JS docs for insert/select and `maybeSingle`, and advisory project graph context.
- **Context placement:** Linear holds progress/evidence, this plan holds implementation context, and the PR will hold final verification evidence.
- **Ownership area:** `src/contracts/`, `src/lib/supabase/`, `src/lib/query/`, `src/lib/queue/`, focused tests and docs.
- **Open questions:** None. If a Supabase schema/RLS/helper change becomes necessary, stop and request exact approval before implementing it.

---

## Goals

1. **Typed Supabase event boundary**
   - Add wrappers for insert, duplicate lookup, and soft-delete/tombstone without exposing raw Supabase access to feature UI.

2. **Optimistic mutation lifecycle**
   - Add a typed mutation API that generates one `client_event_id`, reads the actor once, enqueues the same event, updates cache optimistically, and handles success/failure/undo deterministically.

3. **Retry-safe queue actor persistence**
   - Migrate the local queue to schema v2 with `created_by`, and reject legacy rows without actor as `missing_context` instead of sending as the current session user.

---

## Non-Goals

- Do not build Quick Log UI, Today/Timeline rendering, analytics/observability events, a broad offline outbox, privileged Edge Functions, or Supabase schema/RLS changes.
- Do not add React Query Devtools.
- Do not commit, push, create a PR, merge, delete local branches, run production actions, or perform Supabase remote mutations without exact approval.

---

## Product Decisions Locked In

1. **TanStack Query dependency**
   - **Chosen:** Add `@tanstack/react-query@5.100.14` after explicit approval.
   - **Reason:** It is the target server-state stack in AGENTS/ADR and PUP-13 owns query mutation lifecycle.

2. **Actor source**
   - **Chosen:** Mutation reads `supabase.auth.getSession()` once before enqueue and rejects without `session.user.id`.
   - **Reason:** Retry after session rotation must preserve the original event author.

3. **Idempotent duplicate criteria**
   - **Chosen:** Match identity/routing fields only: `household_id`, `client_event_id`, `created_by`, `puppy_id`, `event_type`, `payload_version`, `occurred_at`.
   - **Reason:** JSON payload comparison is fragile; server row is authoritative after identity match.

4. **Undo race cleanup**
   - **Chosen:** Late success after `deleted_before_sync` never resurrects cache; typed tombstone runs after server confirmation.
   - **Reason:** Undo/delete before local confirmation wins by architecture contract.

---

## Invariants And Executable Spec

- **Invariant 1:** `client_event_id` is created once and reused for optimistic row, queue row, insert, duplicate resolution, and retry.
  - **Test:** `src/test/quick-log-mutation.test.ts`
- **Invariant 2:** `created_by` is read once before enqueue; missing session blocks enqueue; retry uses stored actor.
  - **Test:** `src/test/quick-log-mutation.test.ts`, `src/test/quick-log-queue-storage.test.ts`
- **Invariant 3:** Queue v2 stores `created_by`, migrates additively, and legacy null actor becomes `missing_context`.
  - **Test:** `src/test/quick-log-queue-storage.test.ts`
- **Invariant 4:** `23505` duplicate success requires identity match, not payload match; no-row/`PGRST116` during duplicate lookup is retryable.
  - **Test:** `src/test/supabase-events.test.ts`
- **Invariant 5:** Retryable and permanent failures remain visible in cache as `QuickLogCachedEventRow.localSync`; no blanket rollback hides valid pending rows.
  - **Test:** `src/test/quick-log-mutation.test.ts`
- **Invariant 6:** All affected queries are cancelled before optimistic cache writes and invalidated on settle through `getQuickLogInvalidationKeys`.
  - **Test:** `src/test/quick-log-mutation.test.ts`, `src/test/query-keys.test.ts`
- **Invariant 7:** Undo/delete transition behavior follows the locked state table and late success cannot resurrect a deleted row.
  - **Test:** `src/test/quick-log-mutation.test.ts`
- **Invariant 8:** Raw backend details, notes, puppy names, emails, tokens, and `error.details` are not persisted or used for logic.
  - **Test:** `src/test/supabase-events.test.ts`, `src/test/quick-log-queue-storage.test.ts`, privacy scan.

---

## File Map

### Contracts
- `src/contracts/supabase.ts` - export `EventLogRecord`.
- `src/contracts/quick-log.ts` - update queue mirror contract if needed for `created_by`.

### Data And Query
- `src/lib/supabase/events.ts` - typed `event_log` insert, duplicate lookup, soft-delete/tombstone, and error mapping.
- `src/lib/query/client.ts` - QueryClient factory and defaults.
- `src/lib/query/quick-log.ts` - mutation lifecycle, cache helpers, cached row type, undo/replay helpers.
- `src/lib/providers/AppProviders.tsx` - QueryClientProvider wiring.
- `src/lib/query/keys.ts` - extend tests only unless key shape must change.

### Queue
- `src/lib/queue/schema.ts` - schema version 2, `created_by`, legacy/null handling.
- `src/lib/queue/migrations.ts` - additive local SQLite migration.
- `src/lib/queue/storage.ts` - row params/parsing/enqueue/update logic.
- `src/lib/queue/index.ts` - exports as needed.
- `src/lib/queue/README.md` - v2 queue docs.

### Tests
- `src/test/quick-log-mutation.test.ts`
- `src/test/supabase-events.test.ts`
- `src/test/quick-log-queue-storage.test.ts`
- `src/test/query-keys.test.ts`
- `src/test/supabase-contracts.test.ts`

### Docs
- `docs/plans/completed/2026-05-26-pup-13-quick-log-mutation-cache.md`
- `docs/plans/README.md`
- `docs/architecture/03-client-data-layer.md`
- `docs/architecture/10-quick-log-queue.md`

---

## Contracts, Schema, And Permissions

### Zod Contracts

- [x] Export `EventLogRecord`.
- [x] Add typed cached row shape in query layer without changing server row contract.
- [x] Update queue item schemas so new writes require `created_by`.
- [x] Extend contract tests for queue local-only shape and privacy exclusions.

### Database / RLS

- [x] Supabase migration required: no.
- [x] Local SQLite migration required: yes, queue schema v2.
- [x] RLS policy impact reviewed: yes; no RLS changes planned.
- [x] Tombstone path uses existing table access only; remote RLS verification skipped because no Supabase change is in this PR.

### Edge Functions

- [x] Edge Function required: no.

---

## Privacy, Analytics, And Observability

- [x] No raw puppy names, notes, emails, provider names, photos, media URLs, invite/share tokens, raw backend details, or `error.details` in queue rows, tests, docs, Linear, logs, or comments.
- [x] Queue persists only stable IDs, event payload, retry state/category, timestamps, and original actor UUID.
- [x] No analytics or observability events are added in PUP-13; PUP-16 owns telemetry.

---

## Post-Review Decisions And Follow-Ups

- [x] Active Timeline observers must not refetch away retryable/permanent local rows after mutation failure. PUP-13 skips Timeline prefix invalidation on mutation errors until Timeline query selection merges local queue rows into Supabase results.
- [x] Late success after `deleted_before_sync` must not resurrect cache when server tombstone cleanup fails. PUP-13 keeps the local `deleted_before_sync` queue row and leaves retry-on-next-start cleanup/surfacing as follow-up work.
- [x] Late failure after `deleted_before_sync` must not transition the queue row into failed state or re-show the event. The local delete remains terminal.
- [x] Failed tombstone cleanup suppresses all event-derived invalidations, not only Timeline invalidation, because the server row may still be live until a cleanup-recovery pass tombstones it.
- [x] Filtered Timeline optimistic/replay cache writes use the supplied local calendar date instead of slicing the UTC `occurred_at` date.
- [x] Native `TypeError: Network request failed` maps to retryable `network_unavailable`.
- [x] `markSending` is required on the mutation queue dependency; success resolution depends on the real `pending_local -> sending -> server_confirmed` state-machine path.
- [x] 401/403 classification maps to `auth_refresh_in_progress` only when a future auth/session layer supplies an explicit refresh signal. Until then, production 401/403 remains `permission_denied`.
- [ ] Follow-up: add a cleanup-recovery pass that scans `deleted_before_sync`, looks up `(household_id, client_event_id)`, tombstones surviving server rows, and records scrubbed telemetry when PUP-16 observability exists.
- [ ] Follow-up: wire an auth-refresh signal source into `createSupabaseEventLogRepository` when persistent auth/session handling lands.
- [ ] Follow-up: consider a more diagnostic bounded retry category for `23505` duplicate lookup with no visible row, so transient replication lag remains retryable without hiding RLS/identity mismatches from operators.

---

## Implementation Plan

### Phase 0 - Read And Lock Scope

**Checklist:**
- [x] Read PUP-13 and confirm Linear branch name.
- [x] Sync local `main` and create PUP-13 branch.
- [x] Read PRD/DESIGN/architecture/ADR source docs.
- [x] Check TanStack version/peer dependency and record Linear note.
- [x] Record Supabase docs/changelog context.

**Acceptance criteria:**
- Scope is explicit enough to implement without guessing.

### Phase 1 - RED Tests

**Checklist:**
- [x] Add RED tests for Supabase event wrapper: insert success, `23505` exact identity success, mismatched duplicate failure, no-row/`PGRST116` retryable, error mapping, tombstone select-id-then-update.
- [x] Add RED mutation tests for actor read, client id reuse, query cancellation, optimistic row, queue handoff, retryable/permanent cache state, per-client rollback, undo transitions, and replay `setQueryData`.
- [x] Extend RED queue storage tests for schema v2 `created_by`, migration, legacy null actor, and obsolete privacy assertion removal.
- [x] Extend query/contract tests for invalidation and `EventLogRecord`.
- [x] Run targeted Jest and record expected RED failures.

**Acceptance criteria:**
- New tests fail for missing PUP-13 implementation, not syntax/setup errors.

### Phase 2 - Contracts, Queue v2, And Query Provider

**Checklist:**
- [x] Install approved TanStack dependency.
- [x] Export `EventLogRecord`.
- [x] Add QueryClient factory and provider wiring.
- [x] Implement queue schema v2 and storage/migration changes.
- [x] Run targeted queue/provider/contract tests.

**Acceptance criteria:**
- Queue actor persistence and QueryClient setup are typed and tested.

### Phase 3 - Supabase Event Boundary

**Checklist:**
- [x] Implement typed insert/select-existing/tombstone wrappers.
- [x] Implement stable error mapping without using `error.details`.
- [x] Parse returned server rows through `eventLogRecordSchema`.
- [x] Run targeted Supabase wrapper tests.

**Acceptance criteria:**
- Supabase event calls are centralized, typed, and deterministic under duplicate/error cases.

### Phase 4 - Mutation Lifecycle And Cache

**Checklist:**
- [x] Implement `QuickLogCachedEventRow`, mutation variables/context, cache helpers, and undo/replay helpers.
- [x] Cancel affected queries before optimistic writes.
- [x] Snapshot per `client_event_id`.
- [x] Keep retryable/permanent rows visible with `localSync`.
- [x] Resolve late success/delete races without resurrecting removed rows.
- [x] Run targeted mutation tests.

**Acceptance criteria:**
- Query/cache behavior is deterministic and tested for success, duplicate success, retryable failure, permanent failure, undo, and replay.

### Phase 5 - Docs, Verification, And Handoff

**Checklist:**
- [x] Update queue/query architecture docs and READMEs.
- [x] Update this plan and `docs/plans/README.md`.
- [x] Run targeted Jest command.
- [x] Run `npm run typecheck`.
- [x] Run `npm run check`.
- [x] Record verification in Linear and leave issue ready for review handoff.

**Acceptance criteria:**
- Acceptance criteria are met with local evidence; no Supabase remote/schema/RLS action was taken.

---

## Verification Log

- 2026-05-26: Branch created from updated `main` at `e6def2d`; Linear moved to `In Progress`.
- 2026-05-26: Verified before dependency install planning: project uses `react@19.2.0`; npm reports `@tanstack/react-query@5.100.14` with peer `react: ^18 || ^19`.
- 2026-05-26: Installed approved `@tanstack/react-query@5.100.14`.
- 2026-05-26 RED: `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts src/test/supabase-events.test.ts src/test/quick-log-queue-storage.test.ts src/test/query-keys.test.ts src/test/supabase-contracts.test.ts` failed for missing `src/lib/query/quick-log`, missing `src/lib/supabase/events`, queue schema v1/no `created_by`, and legacy actor send behavior.
- 2026-05-26 GREEN: `npm run test:unit -- --runTestsByPath src/test/quick-log-queue-storage.test.ts src/test/quick-log-queue.test.ts src/test/supabase-contracts.test.ts src/test/quick-log-contracts.test.ts` passed: 4 suites, 52 tests.
- 2026-05-26 GREEN: `npm run test:unit -- --runTestsByPath src/test/supabase-events.test.ts` passed: 1 suite, 6 tests.
- 2026-05-26 GREEN: `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts` passed: 1 suite, 8 tests.
- 2026-05-26 GREEN: `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts src/test/supabase-events.test.ts src/test/quick-log-queue-storage.test.ts src/test/query-keys.test.ts src/test/supabase-contracts.test.ts` passed: 5 suites, 48 tests.
- 2026-05-26: `npm run typecheck` passed after strict type fixes.
- 2026-05-26: `npm run check` passed: lint, typecheck, Jest unit suite (16 suites, 129 tests), node checks (86 tests), scaffold checks, tokens, privacy scan, and text hygiene.
- 2026-05-26: Linear `PUP-13` updated with verification evidence and moved to `In Review`.
- 2026-05-26 RED deep-review follow-up: `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts src/test/supabase-events.test.ts src/test/quick-log-queue-storage.test.ts` failed on missing undo invalidation, tombstone-cleanup failure hiding the row, incompatible Timeline cache insertion, and the forbidden Supabase client double assertion.
- 2026-05-26 GREEN deep-review follow-up: targeted Jest passed 3 suites / 36 tests after fixes; `npm run typecheck` passed; `npm run check` passed with lint, typecheck, 16 Jest suites / 137 tests, 86 node tests, scaffold checks, tokens, privacy scan, and text hygiene.
- 2026-05-26 RED external-review follow-up: `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts` failed because active Timeline invalidation removed a failed row and cleanup failure resurrected an undone row; `npm run typecheck` failed because `markSending` was still optional for the mutation queue dependency.
- 2026-05-26 GREEN external-review follow-up: `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts` passed: 1 suite, 13 tests; `npm run typecheck` passed.
- 2026-05-26 GREEN external-review targeted gate: `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts src/test/supabase-events.test.ts src/test/quick-log-queue-storage.test.ts src/test/query-keys.test.ts src/test/supabase-contracts.test.ts` passed: 5 suites, 59 tests; `npm run typecheck` passed.
- 2026-05-26 GREEN external-review full gate: `npm run check` passed with lint, typecheck, 16 Jest suites / 140 tests, 86 node tests, scaffold checks, tokens, privacy scan, and text hygiene.
- 2026-05-27 RED final deep-review follow-up: `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts src/test/supabase-events.test.ts` failed on `deleted_before_sync -> failed_retryable` after late insert failure, event-derived invalidation after failed tombstone cleanup, UTC-date filtered Timeline cache misses, and native network errors classified as `unknown`.
- 2026-05-27 GREEN final deep-review targeted gate: `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts src/test/supabase-events.test.ts src/test/quick-log-queue-storage.test.ts src/test/query-keys.test.ts src/test/supabase-contracts.test.ts` passed: 5 suites, 64 tests; `npm run typecheck` passed.
- 2026-05-27 GREEN final deep-review full gate: `npm run check` passed with lint, typecheck, 16 Jest suites / 145 tests, 86 node tests, scaffold checks, tokens, privacy scan, and text hygiene.

---

## Changelog

- 2026-05-26: Created active PUP-13 implementation plan after reading Linear issue, source docs, ADRs, current queue/query/supabase files, and Supabase/TanStack docs.
- 2026-05-26: Added queue v2 actor persistence, Supabase event wrapper, QueryClient provider, Quick Log mutation/cache lifecycle, targeted RED/GREEN tests, and architecture README updates.
- 2026-05-26: Addressed deep-review blockers by replacing the Supabase wrapper double assertion with a typed adapter, invalidating affected queries after undo cleanup, preserving visible failed rows when late-success tombstone cleanup fails, filtering Timeline optimistic inserts by query filters, and adding queue v1 migration regression coverage.
- 2026-05-26: Addressed external-review blockers by preserving failed rows under active Timeline observers, requiring `markSending`, preventing cache resurrection on tombstone cleanup failure, aligning mutation lifecycle docs with code order, and recording follow-up gaps.
- 2026-05-27: Addressed final deep-review blockers by making `deleted_before_sync` terminal on late insert failure, suppressing event-derived invalidations when tombstone cleanup fails, matching filtered Timeline cache writes with the supplied local calendar date, and classifying native network failures as retryable.
