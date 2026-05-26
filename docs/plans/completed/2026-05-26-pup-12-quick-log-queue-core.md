# PUP-12 Quick Log Queue Core - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes contracts, schema, queue behavior, or verification evidence.

**Goal:** Implement the Minimal Durable Quick Log Queue core so unsent Quick Log routine events are locally durable, retryable, privacy-safe, and deterministic under Undo/Delete races.

**Status:** Completed.

**Plan type:** Linear task plan for `PUP-12`.

**Current phase:** Completed.

**Architecture:** Supabase Postgres remains the durable source of truth for confirmed `event_log` rows. Expo SQLite owns only unsent Quick Log queue items. The queue core exposes deterministic state-machine, retry, migration, and storage APIs under `src/lib/queue/`; PUP-13 will wire typed Supabase mutation and TanStack Query optimistic lifecycle.

**Linear:** `PUP-12` - https://linear.app/dmitryselenya/issue/PUP-12/expo-sqlite-quick-log-queue-core

**Branch:** `dimaselenya/pup-12-expo-sqlite-quick-log-queue-core`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - Quick Log, Minimal Durable Quick Log Queue, data model, retry/dedupe readiness.
- Design: `DESIGN.md` - Quick Log pending, failed retry, undo/delete states.
- Architecture: `docs/architecture/03-client-data-layer.md`, `04-state-management.md`, `10-quick-log-queue.md`, `13-observability-error-handling-performance.md`, `17-testing-ci-release.md`.
- ADR: `docs/architecture/adr/0003-state-ownership-matrix.md`, `0004-quick-log-queue-sqlite.md`, `0007-prd-schema-baseline.md`.
- Parent plan: `docs/plans/completed/2026-05-25-quick-log-mvp.md`.

---

## Context

PUP-11 added Quick Log tracker contracts, generated `client_event_id` validation, routine-event queue item validation, business-rule windows, and query invalidation keys. `src/lib/queue/README.md` is still a placeholder. PUP-12 fills that local queue core without implementing UI or Supabase mutation hooks.

- **Context package:** PUP-12 issue, this plan, source docs above, `src/contracts/quick-log.ts`, `src/contracts/supabase.ts`, `src/test/quick-log-contracts.test.ts`, `src/test/supabase-contracts.test.ts`, and advisory project graph context.
- **Context placement:** Linear holds status/evidence, this plan holds implementation context, and the PR will hold final verification evidence.
- **Ownership area:** `src/lib/queue/` and focused queue tests under `src/test/`.
- **Open questions:** None for PUP-12. Server cleanup after Undo success remains PUP-13 typed data-layer work.

---

## Goals

1. **Durable local queue core**
   - Create explicit local schema versioning and a Quick Log-only SQLite table.
   - Keep storage separate from Supabase migrations and tables.

2. **Deterministic queue behavior**
   - Encode allowed state transitions, retry classification, retry backoff, manual retry bypass, and Undo/Delete race outcomes.
   - Retry always reuses the original `client_event_id`.

3. **Privacy-safe persistence**
   - Persist only stable IDs, event type, payload version, event payload, queue state, retry metadata, timestamps, and scrubbed error categories.
   - Reject private/free-text fields and raw backend errors before persistence.

---

## Non-Goals

- Do not build Quick Log UI.
- Do not implement Supabase mutation hooks or server cleanup helpers.
- Do not create a general durable outbox or local-first event store.
- Do not add a Supabase queue table or any Supabase migration.
- Do not add dependencies.
- Do not commit, push, create a PR, run EAS, or perform production actions without explicit approval.

---

## Product Decisions Locked In

1. **Queue storage**
   - **Chosen:** Expo SQLite for Minimal Durable Quick Log Queue.
   - **Reason:** ADR-0004 rejects AsyncStorage, SecureStore, and TanStack persisted mutations for this state machine.

2. **Queue scope**
   - **Chosen:** Quick Log routine events only.
   - **Reason:** MVP needs a narrow pending-write safety net, not a broad offline store.

3. **Retry identity**
   - **Chosen:** Retry uses the original `client_event_id`.
   - **Reason:** Server idempotency is `(household_id, client_event_id)`.

4. **Privacy boundary**
   - **Chosen:** Store scrubbed error categories only.
   - **Reason:** Raw backend errors and free text can contain PII.

---

## Invariants And Executable Spec

- **Acceptance mapping:** Linear issue -> this plan -> automated tests -> Linear/PR verification evidence.
- **Invariant 1:** Queue schema versioning is explicit and local-only.
  - **Test:** `src/test/quick-log-queue-storage.test.ts`
- **Invariant 2:** State transitions follow `pending_local -> sending -> server_confirmed`, `sending -> failed_retryable -> sending`, `sending -> failed_permanent`, and `any before server_confirmed -> deleted_before_sync`.
  - **Test:** `src/test/quick-log-queue.test.ts`
- **Invariant 3:** Invalid transitions throw a deterministic queue error.
  - **Test:** `src/test/quick-log-queue.test.ts`
- **Invariant 4:** Retryable errors remain retryable, permanent errors stop automatic retry, and unknown errors become permanent after a bounded number of attempts.
  - **Test:** `src/test/quick-log-queue.test.ts`
- **Invariant 5:** Backoff is 1s, 2s, 4s, capped at 10s, with injectable deterministic jitter.
  - **Test:** `src/test/quick-log-queue.test.ts`
- **Invariant 6:** Manual retry bypasses current delay once and never creates a duplicate queue item.
  - **Test:** `src/test/quick-log-queue-storage.test.ts`
- **Invariant 7:** Storage claim for the next ready-to-send item is atomic enough that a ready item is claimed once and moved to `sending`.
  - **Test:** `src/test/quick-log-queue-storage.test.ts`
- **Invariant 8:** `deleted_before_sync` wins over later in-flight success and returns an explicit race outcome for PUP-13 cleanup.
  - **Test:** `src/test/quick-log-queue.test.ts` and `src/test/quick-log-queue-storage.test.ts`
- **Invariant 9:** Storage rejects disallowed private/free-text fields and raw error values.
  - **Test:** `src/test/quick-log-queue-storage.test.ts`

---

## File Map

### Queue Core
- `src/lib/queue/schema.ts` - local table/version constants, stored item schema, scrubbed error categories.
- `src/lib/queue/migrations.ts` - local SQLite migration/version runner.
- `src/lib/queue/state-machine.ts` - allowed transitions and race handling.
- `src/lib/queue/retry.ts` - error classification, bounded unknown retry, backoff, manual retry metadata.
- `src/lib/queue/storage.ts` - SQLite adapter boundary and testable executor contract.
- `src/lib/queue/index.ts` - public Quick Log queue exports.

### Tests
- `src/test/quick-log-queue.test.ts` - pure state machine and retry behavior.
- `src/test/quick-log-queue-storage.test.ts` - migration/storage/privacy/idempotency behavior.

### Docs
- `docs/plans/active/2026-05-26-pup-12-quick-log-queue-core.md` - implementation evidence.
- `docs/plans/README.md` - active plan index.

---

## Contracts, Schema, And Permissions

### Zod Contracts

- [ ] Reuse `quickLogQueueItemSchema`, `minimalQuickLogQueueItemSchema`, and `quickLogQueueStateSchema`.
- [ ] Add queue-local stored row schemas only for SQLite serialization and retry metadata.
- [ ] Add tests for valid, invalid, and boundary queue payloads.

### Database / RLS

- [ ] Migration required: no Supabase migration.
- [ ] Destructive migration risk reviewed: N/A for Supabase; local SQLite migrations are additive for schema version 1.
- [ ] RLS policy impact reviewed: no server policy change in PUP-12.
- [ ] pgTAP tests added or updated: no.

### Edge Functions

- [ ] Edge Function required: no.
- [ ] Server cleanup after Undo success remains a typed data-layer follow-up for PUP-13.

---

## Privacy, Analytics, And Observability

- [ ] No raw puppy names, notes, emails, provider names, photos, media URLs, invite/share tokens, or raw backend errors in queue rows, tests, docs, Linear, logs, or comments.
- [ ] Error persistence uses scrubbed categories only.
- [ ] Fixtures use synthetic UUIDs and generated-looking `evt_` IDs only.
- [ ] No analytics or observability events are added in PUP-12.

---

## Implementation Plan

### Phase 0 - Read And Lock Scope

**Checklist:**
- [x] Read PUP-12 and confirm Linear branch name.
- [x] Read PRD/DESIGN/architecture/ADR source docs.
- [x] Confirm goals, non-goals, ownership, and no open blockers.
- [x] Record RED/GREEN evidence as implementation proceeds.

**Acceptance criteria:**
- Scope is explicit enough to implement without guessing.

### Phase 1 - RED Tests

**Checklist:**
- [x] Add pure queue tests for state transitions, invalid transitions, retry classification, backoff, manual retry, and Undo/Delete race.
- [x] Add storage tests for migration/versioning, enqueue idempotency, transactional state updates, row serialization, minimal persistence, ready-item claim, and private-field rejection.
- [x] Run targeted Jest and record expected RED failure.

**Acceptance criteria:**
- New tests fail for missing queue implementation, not syntax/setup errors.

### Phase 2 - Queue Core Implementation

**Checklist:**
- [x] Implement schema/constants and stored item validation.
- [x] Implement local SQLite migrations/version strategy.
- [x] Implement state-machine helpers.
- [x] Implement retry helpers.
- [x] Implement storage adapter with transactional boundary, ready-item claim, and injected executor for tests.
- [x] Export only Quick Log queue primitives from `src/lib/queue/index.ts`.

**Acceptance criteria:**
- Targeted queue tests pass.

### Phase 3 - Verification And Handoff

**Checklist:**
- [x] Run targeted queue Jest command.
- [x] Run `npm run typecheck`.
- [x] Run `npm run check`.
- [x] Complete review pass and fix actionable issues.
- [x] Update this plan and Linear with verification evidence.

**Acceptance criteria:**
- PUP-12 is ready for review handoff with local evidence.

---

## Verification Log

- 2026-05-26: Branch prepared and Linear moved to `In Progress`.
- 2026-05-26: RED `npm run test:unit -- --runTestsByPath src/test/quick-log-queue.test.ts src/test/quick-log-queue-storage.test.ts` failed because `@/lib/queue` did not exist.
- 2026-05-26: GREEN targeted Jest command passed after review fixes: 2 suites, 17 tests.
- 2026-05-26: `npm run typecheck` passed after queue typing fixes.
- 2026-05-26: RED/GREEN added for storage-level ready-item claim; storage test passed with 7 tests.
- 2026-05-26: Review fixes added RED/GREEN coverage for manual retry from permanent failures; storage now requires transactional executor and no longer uses `as unknown as`.
- 2026-05-26: `npm run check` passed cleanly: lint, typecheck, 105 Jest tests, node checks, scaffold checks, token check, privacy scan, and text hygiene.
- 2026-05-26: Deep-review fixes added RED/GREEN coverage for retryable/permanent error-category class enforcement and bounded ready-row claim. Targeted queue tests passed: 2 suites, 20 tests. `npm run typecheck` passed. `npm run check` passed cleanly: lint, typecheck, 108 Jest tests, node checks, scaffold checks, token check, privacy scan, and text hygiene.
- 2026-05-26: Review-follow-up RED targeted Jest failed because `list({ states })` parsed an unrelated corrupt row before SQL state filtering. GREEN targeted queue tests then passed: 2 suites, 23 tests.
- 2026-05-26: Review-follow-up `npm run check` passed cleanly: lint, typecheck, 111 Jest tests, node checks, scaffold checks, token check, privacy scan, and text hygiene.
- 2026-05-26: Real `expo-sqlite` integration smoke remains deferred until PUP-13 consuming hooks/dev-build verification; PUP-12 is limited to the injected executor boundary and local unit coverage.

## Changelog

- 2026-05-26: Created PUP-12 active implementation plan.
- 2026-05-26: Added Quick Log queue schema, migrations, state machine, retry helpers, storage adapter, README, and focused queue tests.
- 2026-05-26: Addressed final review findings for permanent manual retry, transaction enforcement, Expo SQLite transaction typing, and neutral invalid-category fixtures.
- 2026-05-26: Addressed deep-review findings by enforcing retryable/permanent error-category classes at state-machine and storage boundaries, and by changing ready-item claim to a bounded SQL `LIMIT 1` query inside the exclusive transaction.
- 2026-05-26: Addressed external review follow-up by adding cooling retry claim coverage, negative manual retry coverage, SQL-backed `list({ states })` filtering, migration/manual-retry comments, and an architecture table update for the actual local queue columns.
