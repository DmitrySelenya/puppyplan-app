# Health Offline Outbox Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this
> plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes contracts, local storage, query flow,
> or verification evidence.

**Goal:** Add a narrow JS-only offline outbox for Health Record create/update/delete/restore so Pet
Health can preserve user writes during transient offline/save failures without broadening the Quick
Log queue into a generic outbox.

**Status:** Active.

**Current phase:** Phase 0 - Architecture locked; ready for RED tests.

**Architecture:** ADR-0019 chooses a separate `src/lib/queue/health-outbox/` local queue using the
already installed Expo SQLite runtime. Quick Log queue remains ADR-0004 Quick Log-only. Replay uses
the existing typed `src/lib/supabase/health-records.ts` repository and
`src/lib/query/health-records.ts` invalidation contracts.

**Linear:** no-Linear exception: user-approved continuation of the active V2 nav redesign plan.

**Branch:** `redesign-v2-nav-codex-wip`

**TDD mode:** lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated in
this Codex session. The user explicitly approved the Health offline outbox ADR/slice on 2026-07-04.

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - Health Basics and offline-write boundaries.
- Design: `DESIGN.md` - §4.1.3 Add Record Flow, pending/offline states.
- Architecture: `docs/architecture/10-quick-log-queue.md`, `docs/architecture/03-client-data-layer.md`.
- ADR: `docs/architecture/adr/0004-quick-log-queue-sqlite.md`,
  `docs/architecture/adr/0019-health-offline-outbox.md`.
- Parent plan: `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md`.

---

## Context

Pet Health already has native route anatomy, create/list query wiring, editable detail, delete/restore
mutations, RLS tombstone fixes, and Stage 4 visual evidence. The remaining Add Record full-flow gap is
offline write durability. The current `src/lib/queue/` implementation stores only Quick Log routine
events and rejects missing actors for legacy rows. It is not a generic outbox.

- **Context package:** this plan, ADR-0019, ADR-0004, `docs/architecture/10-quick-log-queue.md`,
  `src/lib/queue/*`, `src/lib/query/health-records.ts`, `src/lib/supabase/health-records.ts`,
  `src/test/health-records-query.test.ts`, `src/test/quick-log-queue*.test.ts`.
- **Context placement:** this plan holds the implementation contract; ADR-0019 holds the durable
  architecture decision; the parent nav-gaps plan records final slice evidence.
- **Ownership:** Data Access / queue boundary under `src/lib/queue/health-outbox/`, with query
  integration in `src/lib/query/health-records.ts`.
- **No-guess rule:** stop before code if implementation requires a Supabase migration/RLS change,
  new native dependency, DatePicker work, notifications work, or raw private content in logs.

---

## Goals

1. **Health write durability**
   - Store Health Record create/update/delete/restore operations in a local Expo SQLite outbox before
     replay.
   - Preserve the original actor from the draft/repository payload.

2. **Deterministic retry and claim path**
   - Support `pending_local -> sending -> server_confirmed`.
   - Support retryable and permanent failures with scrubbed error categories.
   - Claim only ready pending/retryable rows and quarantine legacy missing-actor rows.

3. **Existing Health query behavior remains authoritative**
   - Replay calls existing repository methods.
   - Successful replay runs existing Health invalidation semantics.
   - Existing Quick Log queue tests remain green.

---

## Non-Goals

- No native DatePicker work.
- No `expo-notifications` work.
- No new native dependency and no native rebuild.
- No Supabase schema, migration, RLS, Edge Function, or generated DB type changes.
- No broad local-first sync engine, conflict UI, attachments/photos, or generic durable outbox.
- No logging raw notes, provider names, puppy names, emails, photos, tokens, or backend messages.

---

## Product Decisions Locked In

1. **Outbox architecture**
   - **Chosen:** separate `health-outbox` under the queue module.
   - **Reason:** preserves ADR-0004 Quick Log-only boundary and keeps Health privacy/actor rules
     isolated.

2. **Replay actor semantics**
   - **Chosen:** legacy rows without `actor_id` / `updated_by` are marked permanent
     `missing_context` and are not sent.
   - **Reason:** replaying as the current session user would corrupt `created_by`/`updated_by`
     provenance.

3. **Storage scope**
   - **Chosen:** local-only Expo SQLite table with scrubbed status/error metadata.
   - **Reason:** JS-only approval allows the already installed SQLite runtime only; Supabase schema
     and RLS are out of scope.

---

## Invariants And Executable Spec

- **Invariant 1:** Quick Log queue remains Quick Log-only.
  - **Test:** existing `src/test/quick-log-queue.test.ts` and `src/test/quick-log-queue-storage.test.ts`.

- **Invariant 2:** Health outbox rejects or quarantines missing-actor work.
  - **Test:** `src/test/health-outbox.test.ts`.

- **Invariant 3:** Health outbox persists only scrubbed error categories.
  - **Test:** `src/test/health-outbox.test.ts`.

- **Invariant 4:** Health outbox claim path atomically marks one ready row `sending` and skips
  future retry rows.
  - **Test:** `src/test/health-outbox-storage.test.ts`.

- **Invariant 5:** Successful replay calls the typed Health repository and existing invalidation
  logic; failed replay does not silently succeed.
  - **Test:** `src/test/health-records-query.test.ts` or `src/test/health-outbox.test.ts`.

### Acceptance Criteria

- **AC-HO-1:** ADR-0019 and architecture docs record that Health uses a separate outbox while Quick
  Log remains Quick Log-only.
- **AC-HO-2:** Health outbox contracts accept create/update/delete/restore operation payloads and
  reject unsupported operations or missing actor.
- **AC-HO-3:** State machine supports pending, sending, server-confirmed, failed-retryable, and
  failed-permanent states with invalid-transition protection.
- **AC-HO-4:** Storage initializes a local schema, enqueues rows transactionally, claims next ready
  row, marks retry/permanent failures with scrubbed categories, and quarantines missing-actor legacy
  rows.
- **AC-HO-5:** Replay sends operations through `SupabaseHealthRecordRepository` and does not swallow
  failures.
- **AC-HO-6:** Existing Quick Log queue tests remain green.
- **AC-HO-7:** No native dependency, native rebuild, Supabase migration/RLS, DatePicker, or
  notifications changes.

---

## File Map

### Queue / Data
- Create: `src/lib/queue/health-outbox/schema.ts`
- Create: `src/lib/queue/health-outbox/state-machine.ts`
- Create: `src/lib/queue/health-outbox/retry.ts`
- Create: `src/lib/queue/health-outbox/migrations.ts`
- Create: `src/lib/queue/health-outbox/storage.ts`
- Create: `src/lib/queue/health-outbox/replay.ts`
- Create: `src/lib/queue/health-outbox/index.ts`
- Modify: `src/lib/queue/index.ts`
- Modify: `src/lib/query/health-records.ts`

### Tests
- Create: `src/test/health-outbox.test.ts`
- Create: `src/test/health-outbox-storage.test.ts`
- Modify: `src/test/health-records-query.test.ts`
- Keep green: `src/test/quick-log-queue.test.ts`, `src/test/quick-log-queue-storage.test.ts`

### Docs
- Create: `docs/architecture/adr/0019-health-offline-outbox.md`
- Modify: `docs/architecture/ADR_INDEX.md`
- Modify: `docs/architecture/10-quick-log-queue.md`
- Modify: `src/lib/queue/README.md`
- Modify: `docs/plans/README.md`
- Modify: `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md`

---

## Contracts, Schema, And Permissions

### Zod Contracts

- [ ] Add Health outbox operation schemas under `src/lib/queue/health-outbox/schema.ts`.
- [ ] Add tests for valid create/update/delete/restore operations and invalid/missing actor payloads.

### Database / RLS

- [ ] Supabase migration required: no.
- [ ] Destructive migration risk reviewed: N/A.
- [ ] RLS policy impact reviewed: no RLS changes; replay uses existing RLS-enforced repository.
- [ ] pgTAP tests added or updated: no.

### Local SQLite

- [ ] Add local Health outbox schema versioning independent of Supabase migrations.
- [ ] Do not alter Quick Log queue `queue_item` schema.

---

## Privacy, Analytics, And Observability

- [ ] No raw puppy names, notes, provider names, emails, photos, tokens, backend messages, or
  production data in logs/analytics/docs/screenshots.
- [ ] Persist only scrubbed error categories such as `network_unavailable`, `server_5xx`,
  `permission_denied`, `server_validation_failed`, `missing_context`, or `unknown`.
- [ ] Any observability usage goes through shared wrappers with non-PII context only.
- [ ] No silent catch; replay failures are classified and recorded or propagated.

---

## Implementation Plan

### Phase 0 - Design / Architecture Lock

**Files:**
- Create: `docs/architecture/adr/0019-health-offline-outbox.md`
- Create: `docs/plans/active/2026-07-04-health-offline-outbox.md`
- Modify: `docs/architecture/ADR_INDEX.md`
- Modify: `docs/architecture/10-quick-log-queue.md`
- Modify: `src/lib/queue/README.md`
- Modify: `docs/plans/README.md`

**Checklist:**
- [x] Read ADR-0004 and current Quick Log queue docs.
- [x] Compare extending Quick Log queue vs separate health-outbox.
- [x] Lock ADR-0019 with trade-offs.
- [ ] Commit architecture/design phase.

**Acceptance criteria:**
- AC-HO-1 is satisfied without code behavior changes.

---

### Phase 1 - RED Contracts And State Machine

**Files:**
- Create: `src/test/health-outbox.test.ts`
- Create stubs if needed: `src/lib/queue/health-outbox/*`

**Steps:**
1. Write failing tests for AC-HO-2, AC-HO-3, AC-HO-5 missing-actor/no-silent-failure behavior.
2. Run:
   `npm run test:unit -- --runTestsByPath src/test/health-outbox.test.ts`
3. Expected RED: tests fail because Health outbox contracts/state/replay do not exist.

**Checklist:**
- [x] RED test fails for the expected missing behavior, not import typos after minimal stubs.
- [x] Record RED output in this plan.

**Evidence - 2026-07-04**
- RED command:
  `npm run test:unit -- --runTestsByPath src/test/health-outbox.test.ts`
- RED result: failed as expected with 6 failures from `health_outbox_not_implemented`; imports and
  TypeScript setup were valid.

---

### Phase 2 - GREEN Contracts And State Machine

**Files:**
- Create: `src/lib/queue/health-outbox/schema.ts`
- Create: `src/lib/queue/health-outbox/state-machine.ts`
- Create: `src/lib/queue/health-outbox/retry.ts`
- Create: `src/lib/queue/health-outbox/replay.ts`
- Create: `src/lib/queue/health-outbox/index.ts`
- Modify: `src/lib/queue/index.ts`

**Steps:**
1. Implement minimal schemas, transitions, retry classification, and replay dispatch.
2. Run:
   `npm run test:unit -- --runTestsByPath src/test/health-outbox.test.ts`
3. Run quick-log regression:
   `npm run test:unit -- --runTestsByPath src/test/quick-log-queue.test.ts`

**Checklist:**
- [x] AC-HO-2 and AC-HO-3 green.
- [x] Replay failures are not swallowed.
- [x] Quick Log state-machine tests remain green.

**Evidence - 2026-07-04**
- GREEN command:
  `npm run test:unit -- --runTestsByPath src/test/health-outbox.test.ts`
- GREEN result: PASS, 1 suite / 7 tests.
- Quick Log regression:
  `npm run test:unit -- --runTestsByPath src/test/quick-log-queue.test.ts`
- Quick Log result: PASS, 1 suite / 12 tests.
- Typecheck: `npm run typecheck` passed.

---

### Phase 3 - RED/GREEN Storage Claim Path

**Files:**
- Create: `src/test/health-outbox-storage.test.ts`
- Create: `src/lib/queue/health-outbox/migrations.ts`
- Create: `src/lib/queue/health-outbox/storage.ts`

**Steps:**
1. Write failing storage tests for AC-HO-4.
2. Run:
   `npm run test:unit -- --runTestsByPath src/test/health-outbox-storage.test.ts`
3. Implement local SQLite storage using the same executor style as Quick Log storage, with a separate
   Health table/database.
4. Re-run focused storage tests and:
   `npm run test:unit -- --runTestsByPath src/test/quick-log-queue-storage.test.ts`

**Checklist:**
- [x] Enqueue/list/get/claim behavior covered.
- [x] Missing actor legacy row becomes failed-permanent/missing-context and is not returned for send.
- [x] Future retry rows are not claimed.
- [x] Quick Log storage tests remain green.

**Evidence - 2026-07-04**
- RED command:
  `npm run test:unit -- --runTestsByPath src/test/health-outbox-storage.test.ts`
- RED result: failed as expected with 5 failures from `health_outbox_storage_not_implemented`.
- GREEN command:
  `npm run test:unit -- --runTestsByPath src/test/health-outbox-storage.test.ts`
- GREEN result: PASS, 1 suite / 5 tests.
- Quick Log storage regression:
  `npm run test:unit -- --runTestsByPath src/test/quick-log-queue-storage.test.ts`
- Quick Log storage result: PASS, 1 suite / 19 tests.

---

### Phase 4 - Query Integration

**Files:**
- Modify: `src/lib/query/health-records.ts`
- Modify: `src/test/health-records-query.test.ts`

**Steps:**
1. Write RED tests proving Health create/update/delete/restore can be replayed through repository
   dependencies and existing invalidation semantics.
2. Implement minimal query-side helpers for enqueue/replay without changing UI anatomy.
3. Run:
   `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts src/test/health-outbox.test.ts src/test/health-outbox-storage.test.ts`

**Checklist:**
- [ ] Existing mutation behavior remains compatible.
- [ ] Replay uses existing typed repository methods.
- [ ] Errors classify/propagate; no empty catch.

---

### Phase 5 - Verification And Parent Plan Update

**Files:**
- Modify: `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md`
- Modify: this plan Changelog

**Steps:**
1. Run targeted regression:
   `npm run test:unit -- --runTestsByPath src/test/health-outbox.test.ts src/test/health-outbox-storage.test.ts src/test/health-records-query.test.ts src/test/quick-log-queue.test.ts src/test/quick-log-queue-storage.test.ts`
2. Run:
   `npm run check`
3. Update parent nav-gaps Add Record row with actual evidence.
4. Commit final scoped implementation/docs phase.

**Checklist:**
- [ ] `npm run check` green.
- [ ] Parent plan Add Record row records Health offline outbox evidence and leaves only native
  DatePicker gate if still applicable.
- [ ] No push/PR.

---

## Verification Checklist

- [ ] `npm run test:unit -- --runTestsByPath src/test/health-outbox.test.ts`
- [ ] `npm run test:unit -- --runTestsByPath src/test/health-outbox-storage.test.ts`
- [ ] `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts src/test/quick-log-queue.test.ts src/test/quick-log-queue-storage.test.ts`
- [ ] `npm run check`

---

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Health outbox becomes a broad generic outbox | Keep operation enum limited to Health Record create/update/delete/restore and record review triggers in ADR-0019. |
| Private notes/provider names leak in logs | Persist operation payload locally, but observability/error metadata uses scrubbed categories only; tests assert classification does not include raw error strings. |
| Legacy missing-actor rows corrupt provenance | Claim path marks missing-actor rows `failed_permanent/missing_context` and never replays them as current user. |
| Quick Log regressions | Do not alter Quick Log schema; run existing Quick Log queue tests in every implementation phase. |

---

## Changelog

- 2026-07-04: Added Health outbox storage RED/GREEN coverage and implemented a separate local
  `health_outbox_item` SQLite schema with enqueue/list/get/claim, retry delay gating, and missing
  actor quarantine. Quick Log storage regression remains green.
- 2026-07-04: Added RED/GREEN Health outbox contract, state-machine, scrubbed retry-classification,
  and replay tests. Implemented the first minimal Health outbox module and allowed client-generated
  `health_record.id` on inserts for idempotent offline create replay without a Supabase migration.
- 2026-07-04: Created plan and ADR-0019 after explicit user approval for Health offline outbox only.
  Native DatePicker and `expo-notifications` remain unapproved and out of scope.
