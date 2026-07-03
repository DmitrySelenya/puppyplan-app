# V2 Tombstone RLS Follow-Up - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, `.agents/skills/tdd/SKILL.md`,
> `.agents/skills/implement/SKILL.md`, and this plan task-by-task. Do not skip the failing-test
> step for behavior changes.
> Living document: update this file as implementation changes contracts, schema, RLS, data flow, or
> verification evidence.

**Goal:** unblock V2 durable delete/undo by allowing authorized owner/caregiver clients to soft-delete
and restore app-owned tombstone rows without weakening household/privacy RLS.

**Status:** Active - approval required before implementation.

**Current phase:** Phase 0 - Approval Gate And Spec Lock.

**Plan type:** Active task plan.

**Architecture:** Supabase Postgres remains the durable source of truth. UI guards remain convenience
only; RLS must enforce delete/restore permissions. The intended fix is an RLS-policy/migration slice
with pgTAP coverage, not a UI workaround, SECURITY DEFINER bypass, or client-side suppression of
`42501` failures.

**Linear:** no-Linear exception: continuation of local V2 nav-redesign goal without a supplied PUP id.

**Branch:** `redesign-v2-nav-codex-wip`

**TDD mode:** heavy/full-isolated preferred because this is RLS/security behavior. If isolation tooling
is unavailable, stop unless the user explicitly approves lower-assurance lightweight TDD for this exact
RLS slice and record that approval here.

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
     `health_record`, `reminder`, and relevant Quick Log `event_log` rows when the row is currently
     visible and non-deleted.
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
- **Invariant 5:** Diary/Quick Log event tombstones remain household-scoped and trainer/share
  projections cannot mutate base `event_log`.
  - **Test:** `supabase/tests/rls_baseline.sql`.
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
- `src/lib/query/quick-log.ts` - review delete path after RLS fix; remove or fix silent catches only
  if the RED test names the behavior and this scope is approved.

### Tests
- `src/test/health-records-query.test.ts` - keep zero-row/error rejection tests green.
- `src/test/reminders-query.test.ts` - keep zero-row/error rejection tests green.
- `src/test/quick-log-mutation.test.ts` - update only if Diary synced-delete behavior is included in
  the approved scope.

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
- [ ] Get exact user approval to create a local Supabase/RLS migration for the tombstone policy.
- [ ] Confirm whether scope includes `event_log` / Diary synced delete, or only Health + Reminder.
- [ ] Confirm TDD mode and record any reduced-assurance approval.

**Acceptance criteria:**
- Scope names exact tables and row transitions before RED tests are written.

### Phase 1 - RED pgTAP Tombstone Tests

**Files:**
- Modify: `supabase/tests/rls_baseline.sql`

**Checklist:**
- [ ] Add helper `tests.try_soft_delete_health_record(target_record_id uuid, target_puppy_id uuid,
  target_deleted_at timestamptz, target_user_id uuid)` that performs authenticated-style update and
  catches only policy/constraint failures.
- [ ] Add helper `tests.try_restore_health_record(...)` for `deleted_at = null`.
- [ ] Add helper `tests.try_soft_delete_reminder(...)`.
- [ ] Add event-log tombstone helper only if Phase 0 scope includes Diary synced delete.
- [ ] Add positive owner/caregiver tests.
- [ ] Add negative viewer/non-member/anon tests.
- [ ] Run the RLS test command and confirm the new positive tombstone tests fail for the current
  policy.

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
- [ ] Create migration with `supabase migration new fix_tombstone_update_rls`.
- [ ] Adjust policies to allow authorized tombstone post-update rows while preserving household role
  checks.
- [ ] Keep SELECT policies restrictive for normal reads.
- [ ] Avoid broad `TO authenticated` policies without ownership predicates.
- [ ] Avoid SECURITY DEFINER bypass.
- [ ] Run pgTAP/RLS tests until green.

**Acceptance criteria:**
- Owner/caregiver positive tombstone and restore tests pass.
- Viewer/non-member/anon negative tests pass.
- Trainer/share base table mutation denial remains covered.

### Phase 3 - Typegen, Static Guardrails, And Query Regression

**Files:**
- Possible generated change: `src/contracts/database.types.ts`
- Tests: existing query/repository tests.

**Checklist:**
- [ ] Run `npm run supabase:guardrails`.
- [ ] Run `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts src/test/reminders-query.test.ts`.
- [ ] If event_log is in scope, run relevant Quick Log mutation/timeline tests.
- [ ] Run `npm run typecheck`.

**Acceptance criteria:**
- Repository methods still reject Supabase errors and zero-row writes.
- No query key or invalidation regression.

### Phase 4 - Supabase Dev Runtime Smoke

**Files:**
- No committed script expected unless a reusable privacy-safe smoke helper is approved.

**Checklist:**
- [ ] On known Dev project `olymqppxsadsxfrcyskh`, sign in as the synthetic debug account.
- [ ] Insert synthetic Health record as owner; soft-delete through authenticated client; restore if
  included in scope; cleanup.
- [ ] Insert synthetic Reminder as owner; soft-delete through authenticated client; cleanup.
- [ ] If event_log is in scope, use synthetic Quick Log event only, no raw puppy names/notes.
- [ ] Record status/count/error evidence in this plan and in the nav-gaps plan.

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
- [ ] Update Health delete/undo blocker row with proof.
- [ ] Update Reminder lifecycle note with proof.
- [ ] Update Diary synced delete row only if event_log is in scope and proven.
- [ ] Run `npm run check`.
- [ ] Commit one scoped RLS slice.

**Acceptance criteria:**
- Remaining nav-gaps blocker rows accurately reflect what is actually proven.

---

## Verification Commands

- `npm run supabase:guardrails`
- `npm run supabase:test`
- `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts src/test/reminders-query.test.ts`
- If event_log is in scope:
  `npm run test:unit -- --runTestsByPath src/test/quick-log-mutation.test.ts src/test/timeline-route.render.test.tsx src/test/today-route.render.test.tsx`
- `npm run typecheck`
- `npm run check`

---

## Risks And Approvals

- **Approval required:** exact local Supabase/RLS migration creation.
- **Approval required:** any Dev remote mutation/smoke beyond synthetic debug data.
- **Approval required:** production Supabase migration apply.
- **Risk:** a policy that allows `deleted_at IS NOT NULL` in `WITH CHECK` too broadly could let
  members move rows across ownership boundaries. Mitigation: keep household/puppy identity predicates
  and negative pgTAP cases.
- **Risk:** restore may need access to a row hidden by SELECT policy. Mitigation: prove with pgTAP
  before choosing between policy shape and a separately approved helper.
- **Risk:** Diary synced-delete may involve `event_log` and the existing `deleteSynced` silent catch.
  Mitigation: include it in Phase 0 scope explicitly or leave it blocked.

---

## Changelog

- 2026-07-03: Created plan from the V2 nav-gaps blocker audit and Supabase Dev smoke evidence. No
  RLS migration or production code was changed.
