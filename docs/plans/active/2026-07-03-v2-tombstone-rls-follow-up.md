# V2 Tombstone RLS Follow-Up - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, `.agents/skills/tdd/SKILL.md`,
> `.agents/skills/implement/SKILL.md`, and this plan task-by-task. Do not skip the failing-test
> step for behavior changes.
> Living document: update this file as implementation changes contracts, schema, RLS, data flow, or
> verification evidence.

**Goal:** unblock V2 durable delete/undo by allowing authorized owner/caregiver clients to soft-delete
and restore app-owned tombstone rows without weakening household/privacy RLS.

**Status:** Active - Event Log follow-up complete locally; commit pending.

**Current phase:** Event Log Phase 5 - Plan Closure complete.

**Plan type:** Active task plan.

**Architecture:** Supabase Postgres remains the durable source of truth. UI guards remain convenience
only; RLS must enforce delete/restore permissions. The intended fix is an RLS-policy/migration slice
with pgTAP coverage, not a UI workaround, SECURITY DEFINER bypass, or client-side suppression of
`42501` failures.

**Linear:** no-Linear exception: continuation of local V2 nav-redesign goal without a supplied PUP id.

**Branch:** `redesign-v2-nav-codex-wip`

**TDD mode:** lower-assurance lightweight approved for the Health/Reminder RLS slice on
2026-07-03 and for the Event Log follow-up on 2026-07-04. Full isolated mode remains preferred for
RLS/security behavior, but Docker/local Supabase isolation is unavailable in this workspace; the
user explicitly approved running RED/GREEN pgTAP against the non-production Supabase Dev project
`olymqppxsadsxfrcyskh` on synthetic data only.

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - Health Basics and Reminders data model rows (`deleted_at` tombstones).
- Design: `DESIGN.md` - `§4.1.4` Edit record/delete undo; `§4.2` Reminders/Routines lifecycle.
- Active plan: `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md` - remaining blocker audit.
- Architecture: `docs/architecture/08-data-model-and-rls.md`,
  `docs/architecture/07-backend-topology.md`, `docs/architecture/17-testing-ci-release.md`,
  `docs/architecture/18-ai-agent-guide.md`.
- ADR: `docs/architecture/adr/0006-supabase-migrations-and-pgtap.md`,
  `docs/architecture/adr/0007-prd-schema-baseline.md`.

---

## Context

Current V2 UI/query work already exposes delete/undo affordances and failure states for Health,
Reminder, and Diary-history delete paths. Runtime evidence on Supabase Dev shows the underlying
authenticated tombstone transition still fails:

- Health owner normal update passed: `UPDATE public.health_record SET title = ..., updated_by =
  auth.uid()` returned `200`, count `1`.
- Health owner tombstone update failed: `UPDATE public.health_record SET deleted_at = ...` returned
  `42501` with `new row violates row-level security policy for table "health_record"`.
- Reminder owner tombstone update failed: `UPDATE public.reminder SET deleted_at = ...` returned
  `42501` with the same policy class.
- Synthetic Dev-smoke rows were cleaned up with the dev-admin key after the probes.

The likely class of failure is that table SELECT policies hide rows after `deleted_at` becomes
non-null, while UPDATE `WITH CHECK` must validate the post-update row. The implementation must prove
the exact root cause with RED pgTAP before changing policies.

- **Context package:** `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md` lines around the
  remaining blocker audit, `supabase/migrations/20260524202620_mvp_schema_baseline.sql`,
  `supabase/tests/rls_baseline.sql`, `src/lib/supabase/health-records.ts`,
  `src/lib/supabase/reminders.ts`, `src/lib/query/health-records.ts`, `src/lib/query/reminders.ts`,
  `src/test/health-records-query.test.ts`, `src/test/reminders-query.test.ts`.
- **Context placement:** this plan holds the long-form RLS implementation contract; the nav-gaps plan
  holds V2 coverage state; PR text must hold final verification evidence if this becomes a PR.
- **Existing implementation:** Health and Reminder repository/query layers already call typed update
  methods and surface failures. They must not swallow RLS errors.
- **Ownership:** Supabase/RLS first; query/UI follow-up only if tests prove cache/runtime behavior
  needs adjustment after the RLS fix.

---

## Goals

1. **Allow authorized tombstone transitions.**
   - Owner/caregiver household members can set `deleted_at` on their household puppy's
     `health_record` and `reminder` rows when the row is currently visible and non-deleted.
2. **Allow authorized restore where the product has undo.**
   - Owner/caregiver household members can restore the same row classes when undo is within the app
     flow and the row belongs to their household puppy.
3. **Preserve privacy and least privilege.**
   - Viewers, non-members, anonymous users, expired/revoked share viewers, and trainer/share
     projections cannot directly mutate base tables.
4. **Prove through RLS tests and Dev smoke.**
   - pgTAP/RLS tests cover positive and negative paths before and after the migration.

---

## Non-Goals

- No generic offline outbox or Health offline queue.
- No native DatePicker or notification dependency work.
- No schema table split, table rename, or notes/media reshaping.
- No SECURITY DEFINER function that bypasses RLS for delete/restore.
- No production Supabase migration apply.
- No edits to generated `ios/` or `android/` files.
- No suppression of client errors or fake success on zero-row updates.

---

## Product Decisions Locked In

1. **Soft delete remains tombstone-based.**
   - **Chosen:** use existing `deleted_at` columns.
   - **Reason:** PRD/ADR-0007 already define tombstones; schema splits or hard delete are out of scope.

2. **RLS is the enforcement boundary.**
   - **Chosen:** fix policy coverage and tests, not UI-only role checks.
   - **Reason:** PuppyPlan architecture requires RLS/Edge Functions to enforce access.

3. **Restore is allowed only for app-owned undo flows.**
   - **Chosen:** restore must be scoped by household role and row identity.
   - **Reason:** undo must not become a broad way to reveal or mutate another household's deleted data.

---

## Invariants And Executable Spec

- **Invariant 1:** owner/caregiver can soft-delete their household puppy's non-deleted Health record.
  - **Test:** `supabase/tests/rls_baseline.sql` positive pgTAP helper.
- **Invariant 2:** viewer/non-member/anon cannot soft-delete Health records.
  - **Test:** `supabase/tests/rls_baseline.sql` negative pgTAP helpers.
- **Invariant 3:** owner/caregiver can restore their household puppy's tombstoned Health record only
  through the same household-scoped policy.
  - **Test:** `supabase/tests/rls_baseline.sql`.
- **Invariant 4:** owner/caregiver can soft-delete Reminder rows, and viewer/non-member/anon cannot.
  - **Test:** `supabase/tests/rls_baseline.sql`.
- **Invariant 5:** Diary/Quick Log `event_log` synced-delete is out of scope for this slice and remains
  blocked separately in the nav-gaps plan.
- **Invariant 6:** client repository methods still reject Supabase errors and zero-row writes.
  - **Test:** existing `src/test/health-records-query.test.ts`,
    `src/test/reminders-query.test.ts`, and Quick Log mutation tests.

---

## File Map

### Backend / Supabase
- `supabase/tests/rls_baseline.sql` - add RED pgTAP helpers and assertions for tombstone
  soft-delete/restore paths.
- `supabase/migrations/<generated>_fix_tombstone_update_rls.sql` - create via
  `supabase migration new fix_tombstone_update_rls` only after approval.
- `src/contracts/database.types.ts` - regenerate only if typegen changes output.

### Data And Query
- `src/lib/supabase/health-records.ts` - review only; no change expected unless migration changes
  return behavior.
- `src/lib/supabase/reminders.ts` - review only; no change expected unless migration changes return
  behavior.
- `src/lib/query/quick-log.ts` - Event Log follow-up scope includes only the synced-delete path
  proven by RED tests. Fix the `.catch(() => undefined)` at the `deleteSynced` port path; touch
  other catches only if a RED test proves they swallow the same synced-delete failure.

### Tests
- `src/test/health-records-query.test.ts` - keep zero-row/error rejection tests green.
- `src/test/reminders-query.test.ts` - keep zero-row/error rejection tests green.
- `src/test/quick-log-mutation.test.ts` - out of scope for this slice.

### Docs
- `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md` - update blocker rows and changelog after
  proof.
- `docs/plans/README.md` - keep this plan indexed.

---

## Contracts, Schema, And Permissions

### Zod Contracts

- [ ] No Zod schema change expected.
- [ ] If a migration changes row shape, stop and route through ADR-0007.

### Database / RLS

- [ ] Migration required: yes, after exact approval.
- [ ] Destructive migration risk reviewed: expected low; policy-only change, no data rewrite.
- [ ] RLS policy impact reviewed.
- [ ] pgTAP tests added/updated before policy migration.

### Edge Functions

- [ ] Edge Function required: no, unless RLS cannot express the restore policy safely.
- [ ] Do not add SECURITY DEFINER helpers unless a separate security review approves them.

---

## Implementation Plan

### Phase 0 - Approval Gate And Spec Lock

**Files:**
- Read: `AGENTS.md`
- Read: this plan
- Read: `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md`
- Read: `supabase/migrations/20260524202620_mvp_schema_baseline.sql`
- Read: `supabase/tests/rls_baseline.sql`

**Checklist:**
- [x] Exact user approval recorded on 2026-07-03 to create a local Supabase/RLS migration for the
  tombstone soft-delete/restore policy with `supabase migration new fix_tombstone_update_rls`.
- [x] Scope locked on 2026-07-03 to `health_record` + `reminder` only. `event_log` / Diary
  synced-delete is excluded from this slice and remains a separate blocked row in the nav-gaps plan.
- [x] TDD mode locked on 2026-07-03: lower-assurance lightweight approved because Docker/local
  Supabase isolation is unavailable; RED/GREEN pgTAP may run against Dev project
  `olymqppxsadsxfrcyskh` on synthetic data only.
- [x] Security constraints locked: no SECURITY DEFINER bypass, no broad `TO authenticated` policy
  without household/puppy predicates, no production migration apply, and no household/privacy RLS
  weakening.

**Acceptance criteria:**
- Scope names exact tables and row transitions before RED tests are written.

### Phase 1 - RED pgTAP Tombstone Tests

**Files:**
- Modify: `supabase/tests/rls_baseline.sql`

**Checklist:**
- [x] Add helper `tests.try_soft_delete_health_record(target_record_id uuid, target_puppy_id uuid,
  target_deleted_at timestamptz, target_user_id uuid)` that performs authenticated-style update and
  catches only policy/constraint failures.
- [x] Add helper `tests.try_restore_health_record(...)` for `deleted_at = null`.
- [x] Add helper `tests.try_soft_delete_reminder(...)`.
- [x] Skip event-log tombstone helper; Phase 0 scope excludes Diary synced delete.
- [x] Add positive owner/caregiver tests.
- [x] Add negative viewer/non-member/anon tests.
- [x] Run the RLS test command and confirm the new positive tombstone tests fail for the current
  policy.

**Evidence:**
- `npm run supabase:test` remained blocked by the repo's no-Docker wrapper before pgTAP execution
  (`Supabase CLI remote pgTAP requires Docker...`).
- Lower-assurance approved no-Docker RED runner:
  `npx -p pg@8.16.3 ... supabase/tests/rls_baseline.sql` against Dev project
  `olymqppxsadsxfrcyskh` returned `not ok` for positive tests 78-81 and 85-86:
  owner/caregiver Health soft-delete, Health restore, and Reminder soft-delete. Negative
  viewer/non-member/anon tests 82-84 and 87-89 stayed `ok`.

**Commands:**
- Targeted/static first: `npm run supabase:guardrails`
- Full RLS when authorized environment is available: `npm run supabase:test`

**Expected RED:**
- Positive owner/caregiver soft-delete tests fail with the existing policy.
- Existing negative tests remain passing.

### Phase 2 - GREEN Policy Migration

**Files:**
- Create: `supabase/migrations/<generated>_fix_tombstone_update_rls.sql`
- Modify: `supabase/tests/rls_baseline.sql` only if RED exposed missing negative coverage.

**Checklist:**
- [x] Create migration with `supabase migration new fix_tombstone_update_rls`.
- [x] Adjust policies to allow authorized tombstone post-update rows while preserving household role
  checks.
- [x] Keep SELECT policies restrictive for normal reads.
- [x] Avoid broad `TO authenticated` policies without ownership predicates.
- [x] Avoid SECURITY DEFINER bypass.
- [x] Run pgTAP/RLS tests until green.

**Evidence:**
- Created `supabase/migrations/20260703181913_fix_tombstone_update_rls.sql` with the pinned CLI
  equivalent of `supabase migration new fix_tombstone_update_rls`.
- Transactional GREEN pgTAP with migration SQL prepended returned `1..104` and `ok 1` through
  `ok 104`. DDL and seed were rolled back in that proof run.
- After applying the single migration to Dev, direct pgTAP against
  `supabase/tests/rls_baseline.sql` also returned `1..104` and `ok 1` through `ok 104`.

**Acceptance criteria:**
- Owner/caregiver positive tombstone and restore tests pass.
- Viewer/non-member/anon negative tests pass.
- Trainer/share base table mutation denial remains covered.

### Phase 3 - Typegen, Static Guardrails, And Query Regression

**Files:**
- Possible generated change: `src/contracts/database.types.ts`
- Tests: existing query/repository tests.

**Checklist:**
- [x] Run `npm run supabase:guardrails`.
- [x] Run `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts src/test/reminders-query.test.ts`.
- [x] Skip event_log/Quick Log regression; Phase 0 scope excludes Diary synced delete.
- [x] Run `npm run typecheck`.

**Evidence:**
- `npm run supabase:guardrails`: PASS, 30 checks passed.
- `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts src/test/reminders-query.test.ts`:
  PASS, 2 suites / 27 tests passed.
- `npm run typecheck`: PASS.

**Acceptance criteria:**
- Repository methods still reject Supabase errors and zero-row writes.
- No query key or invalidation regression.

### Phase 4 - Supabase Dev Runtime Smoke

**Files:**
- No committed script expected unless a reusable privacy-safe smoke helper is approved.

**Checklist:**
- [x] On known Dev project `olymqppxsadsxfrcyskh`, sign in as the synthetic debug account.
- [x] Insert synthetic Health record as owner; soft-delete through authenticated client; restore if
  included in scope; cleanup.
- [x] Insert synthetic Reminder as owner; soft-delete through authenticated client; cleanup.
- [x] Skip event_log Dev smoke; Phase 0 scope excludes Diary synced delete.
- [x] Record status/count/error evidence in this plan and in the nav-gaps plan.

**Evidence:**
- Dev dry-run before apply: only pending migration was
  `20260703181913_fix_tombstone_update_rls.sql`.
- Applied that single migration to non-production Dev project `olymqppxsadsxfrcyskh`; no production
  apply was run.
- Authenticated-client smoke evidence:
  `bootstrap status=200`, `membership_read status=200`, `active_puppy_read status=200`,
  `health_insert status=201`, `health_soft_delete status=204 count=1 error=none`,
  `health_restore status=200 error=none`, `reminder_insert status=201`,
  `reminder_soft_delete status=200 count=1 error=none`.
- Cleanup evidence: `cleanup_health status=204 count=1 error=none`; `cleanup_reminder status=204
  count=1 error=none`.

**Acceptance criteria:**
- Runtime Dev smoke returns success/count for approved tombstone transitions.
- Synthetic rows are cleaned up.
- No secrets or private user content are logged.

### Phase 5 - Nav-Gaps Closure

**Files:**
- Modify: `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md`
- Modify: this plan
- Modify: `docs/plans/README.md` if status changes.

**Checklist:**
- [x] Update Health delete/undo blocker row with proof.
- [x] Update Reminder lifecycle note with proof.
- [x] Leave Diary synced delete blocked separately because event_log is not in scope.
- [x] Run `npm run check`.
- [ ] Commit one scoped RLS slice.

**Evidence:**
- `npm run check`: PASS. Lint and typecheck passed; Jest passed 81 suites / 665 tests; node tests
  passed 118 checks; scaffold, i18n, tokens, privacy scan, and text hygiene passed. Existing
  non-failing React `act(...)` warnings from reduced-motion tests remain present.

**Acceptance criteria:**
- Remaining nav-gaps blocker rows accurately reflect what is actually proven.

---

### Event Log Phase 0 - Approval Gate And Spec Lock

**Files:**
- Modify: this plan
- Modify later: `supabase/tests/rls_baseline.sql`
- Create later: `supabase/migrations/<generated>_fix_event_log_tombstone_rls.sql`
- Modify later: `src/lib/query/quick-log.ts`

**Checklist:**
- [x] Exact user approval recorded on 2026-07-04 to create a local Supabase/RLS migration for
  `event_log` tombstone synced-delete/restore with
  `supabase migration new fix_event_log_tombstone_rls`.
- [x] Scope locked to `event_log` tombstone transitions only: soft-delete and restore if undo is in
  the product flow, plus the Quick Log/Diary synced-delete client path. No other tables are in
  scope.
- [x] Trainer/share projections remain read-only projections and cannot mutate base `event_log`;
  negative pgTAP coverage is mandatory.
- [x] Silent-catch scope locked: fix only the `.catch(() => undefined)` on the synced-delete path
  that RED tests name, with line 590 expected. Catches around undo/details/retry cleanup remain out
  of scope unless RED proves they swallow this same synced-delete path.
- [x] TDD mode locked on 2026-07-04: lower-assurance lightweight approved because Docker/local
  Supabase isolation is unavailable; RED/GREEN pgTAP may run against Dev project
  `olymqppxsadsxfrcyskh` on synthetic data only.
- [x] Dev apply is approved only for runtime proof on synthetic data. Production apply is forbidden.
- [x] Security constraints locked: no SECURITY DEFINER bypass, no broad `TO authenticated` policy
  without household/puppy predicates, and no household/privacy RLS weakening.

**Acceptance criteria:**
- Owner/caregiver can soft-delete and restore their household puppy's `event_log` row.
- Viewer, non-member, anon, and trainer/share users cannot directly mutate base `event_log`.
- The Quick Log/Diary synced-delete path does not convert server/RLS failure into fake success.
- Client fix does not touch unrelated local undo, details-save, or retry-cleanup catches unless RED
  proves they are the same synced-delete failure path.

---

### Event Log Phase 1 - RED pgTAP Tombstone Tests

**Files:**
- Modify: `supabase/tests/rls_baseline.sql`

**Checklist:**
- [x] Add `event_log` soft-delete helper that catches only policy/constraint failures.
- [x] Add `event_log` restore helper for undo.
- [x] Add positive owner/caregiver soft-delete and restore assertions.
- [x] Add negative viewer/non-member/anon assertions.
- [x] Add trainer/share base-table mutation denial assertion.
- [x] Run RED pgTAP and confirm only the new positive owner/caregiver tombstone assertions fail on
  the current policy while negative assertions stay green.

**Evidence:**
- `npm run supabase:test`: blocked by the repo's no-Docker wrapper before pgTAP execution, as
  expected for this machine.
- Lower-assurance approved no-Docker RED runner against Dev project `olymqppxsadsxfrcyskh` returned
  `1..116`, `ok_count=112`, `not_ok_count=4`. Positive tests 78-81 failed for owner/caregiver
  `event_log` soft-delete and restore; negative viewer/non-member/anon/trainer-share assertions
  stayed green.

---

### Event Log Phase 2 - GREEN Policy Migration

**Files:**
- Create: `supabase/migrations/<generated>_fix_event_log_tombstone_rls.sql`
- Modify: `supabase/tests/rls_baseline.sql` only if RED exposes missing negative coverage.

**Checklist:**
- [x] Create migration with `supabase migration new fix_event_log_tombstone_rls`.
- [x] Adjust `event_log` policies to allow authorized tombstone post-update rows while preserving
  household/puppy identity predicates.
- [x] Preserve restrictive SELECT behavior and share projection boundaries.
- [x] Avoid SECURITY DEFINER helpers and broad unscoped authenticated policies.
- [x] Run pgTAP until GREEN.

**Evidence:**
- Created `supabase/migrations/20260703235553_fix_event_log_tombstone_rls.sql` with the approved
  `supabase migration new fix_event_log_tombstone_rls` command.
- Transactional GREEN proof with migration SQL prepended and rolled back returned `1..116`,
  `ok_count=116`, `not_ok_count=0`.
- Applied the single Event Log migration to non-production Supabase Dev for runtime proof; no
  production apply was run.
- Direct pgTAP against the updated Dev state returned `1..116`, `ok_count=116`, `not_ok_count=0`.

---

### Event Log Phase 3 - Client RED/GREEN And Regression

**Files:**
- Modify: `src/test/quick-log-mutation.test.ts`
- Modify: `src/lib/query/quick-log.ts`

**Checklist:**
- [x] Write RED Jest coverage proving synced delete failures are surfaced/logged and not swallowed.
- [x] Fix only the synced-delete catch named by RED.
- [x] Run quick-log/timeline focused tests.
- [x] Run `npm run supabase:guardrails`.
- [x] Run `npm run typecheck`.

**Evidence:**
- RED `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation-port.test.tsx` failed
  because `deleteSynced` returned `undefined` instead of a Promise (`Expected: true; Received:
  false` for the Promise-like assertion).
- GREEN changed only the synced-delete port path: `deleteSynced` now returns the
  `deleteSyncedQuickLogEvent` Promise and no longer uses `.catch(() => undefined)`.
- `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation-port.test.tsx`: PASS, 1 test.
- `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts`: PASS, 32 tests.
- Focused regression `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts
  src/test/quick-log-mutation-port.test.tsx src/test/timeline-route.render.test.tsx`: PASS, 3
  suites / 39 tests.
- `npm run supabase:guardrails`: PASS, 30 checks.
- `npm run typecheck`: PASS.

---

### Event Log Phase 4 - Supabase Dev Runtime Smoke

**Files:**
- No committed smoke script expected.

**Checklist:**
- [x] Apply the Event Log migration only to non-production Dev if needed for runtime proof.
- [x] Insert synthetic `event_log` as owner.
- [x] Soft-delete through authenticated client and record status/count/error.
- [x] Restore through authenticated client if product undo path is in scope and record status/count/error.
- [x] Cleanup synthetic row and record cleanup status/count/error.
- [x] Do not log real puppy names, notes, emails, provider names, photos, tokens, or secrets.

**Evidence:**
- Dev dry-run before apply listed only `20260703235553_fix_event_log_tombstone_rls.sql`.
- Applied the Event Log migration to non-production Dev project `olymqppxsadsxfrcyskh`.
- Authenticated-client smoke evidence: `auth_sign_in error=none`, `membership_read status=200
  count=1 error=none`, `active_puppy_read status=200 count=1 error=none`, `event_insert status=201
  count=1 error=none`, `event_soft_delete status=200 count=1 error=none`, `event_restore
  status=200 count=1 error=none`.
- Cleanup evidence: `cleanup_event status=204 count=1 error=none`.

---

### Event Log Phase 5 - Plan Closure And Commit

**Files:**
- Modify: `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md`
- Modify: `docs/plans/active/2026-06-30-v2-screen-polish-backlog.md`
- Modify: this plan

**Checklist:**
- [x] Update Diary §2.4.3-2.4.4 blocker row with RLS/client proof.
- [x] Update polish backlog Known-deferred note with resolved evidence.
- [x] Run `npm run check`.
- [x] Commit one scoped Event Log RLS/client slice.

**Evidence:**
- `npm run check`: PASS. Lint and typecheck passed; Jest passed 82 suites / 666 tests; node tests
  passed 118 checks; navigation, shell i18n, i18n parity/string budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene passed. Existing non-failing React `act(...)` warnings from
  reduced-motion tests remain present.

---

## Verification Commands

- `npm run supabase:guardrails`
- `npm run supabase:test`
- `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts src/test/reminders-query.test.ts`
- `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts src/test/timeline-route.render.test.tsx`
- `npm run typecheck`
- `npm run check`

---

## Risks And Approvals

- **Approved on 2026-07-03:** exact local Supabase/RLS migration creation for Health + Reminder
  tombstone soft-delete/restore only.
- **Approved on 2026-07-03:** Dev remote RED/GREEN pgTAP and runtime smoke only on synthetic debug
  data in non-production project `olymqppxsadsxfrcyskh`.
- **Approved on 2026-07-04:** exact local Supabase/RLS migration creation for `event_log`
  tombstone synced-delete/restore only with `supabase migration new fix_event_log_tombstone_rls`;
  fix only the Quick Log/Diary synced-delete silent catch named by RED; Dev remote RED/GREEN pgTAP
  and runtime smoke allowed only on synthetic data in non-production project
  `olymqppxsadsxfrcyskh`.
- **Approval required:** production Supabase migration apply.
- **Risk:** a policy that allows `deleted_at IS NOT NULL` in `WITH CHECK` too broadly could let
  members move rows across ownership boundaries. Mitigation: keep household/puppy identity predicates
  and negative pgTAP cases.
- **Risk:** restore may need access to a row hidden by SELECT policy. Mitigation: prove with pgTAP
  before choosing between policy shape and a separately approved helper.
- **Risk:** Diary synced-delete may involve `event_log` and the existing `deleteSynced` silent catch.
  Mitigation: Event Log follow-up is now approved on 2026-07-04, but only for the synced-delete path
  proven by RED tests.

---

## Changelog

- 2026-07-03: Created plan from the V2 nav-gaps blocker audit and Supabase Dev smoke evidence. No
  RLS migration or production code was changed.
- 2026-07-03: Approval Gate lifted for a local/dev-only Health + Reminder tombstone RLS slice:
  create migration with `supabase migration new fix_tombstone_update_rls`, exclude `event_log` /
  Diary synced-delete, use lower-assurance lightweight TDD because full isolated Docker/local
  Supabase is unavailable, run only against synthetic data in Dev project `olymqppxsadsxfrcyskh`,
  and do not use SECURITY DEFINER bypasses, broad unscoped authenticated policies, production applies,
  or household/privacy RLS weakening.
- 2026-07-03: Implemented Health + Reminder tombstone RLS migration. RED pgTAP failed on the current
  policy for owner/caregiver Health soft-delete/restore and Reminder soft-delete while negative
  viewer/non-member/anon checks stayed green. GREEN pgTAP passed 104/104 with the migration SQL.
  Applied the single migration to Supabase Dev for runtime proof, then authenticated-client smoke
  returned `health_soft_delete count=1`, `health_restore status=200`, `reminder_soft_delete count=1`,
  and cleanup counts of 1 for both synthetic rows.
- 2026-07-04: Approval Gate lifted for the Event Log follow-up: create local migration with
  `supabase migration new fix_event_log_tombstone_rls`, scope only to `event_log` tombstone
  soft-delete/restore plus the Quick Log/Diary synced-delete client path, keep trainer/share
  projections unable to mutate base `event_log`, fix only RED-proven synced-delete silent catches,
  run lower-assurance pgTAP against Dev project `olymqppxsadsxfrcyskh` on synthetic data, allow Dev
  apply for runtime proof, forbid production apply, SECURITY DEFINER bypasses, broad unscoped
  authenticated policies, and household/privacy RLS weakening.
- 2026-07-04: Implemented Event Log tombstone RLS/client slice. RED pgTAP failed only the new
  owner/caregiver `event_log` soft-delete/restore positives while viewer/non-member/anon/trainer
  negatives stayed green. GREEN migration
  `20260703235553_fix_event_log_tombstone_rls.sql` preserves household/puppy predicates and passed
  116/116 pgTAP assertions transactionally and after non-production Dev apply. Client RED proved the
  synced-delete port swallowed failures by returning `undefined`; GREEN removed only that
  `.catch(() => undefined)` path so synced-delete returns a rejecting Promise. Dev smoke inserted,
  soft-deleted, restored, and cleaned up one synthetic `event_log` row with count 1 throughout.
