# Dogfooding Readiness — Schedule, Local Notifications, Backdating, Device Install

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes contracts, schema, RLS, UX, routes, data flow, or verification evidence.

**Goal:** The owner family (single shared account, two iPhones) can run the real daily routine of
their 8-week-old puppy in the app: set up a feeding/walk/potty schedule, get local notifications,
check planned slots off in Diary, log spontaneous events (including backdated ones), and see one
merged plan/fact day view — with no placeholder screens on that path.

**Status:** Active.

**Current phase:** Phase 0 - Read And Lock Scope.

**Architecture:** Supabase (`PuppyPlan Dev`) stays the durable source of truth. The routine
template is the existing `reminder` table (`schedule_rule` jsonb); check-offs persist as
`reminder_occurrence` rows; spontaneous facts stay in `event_log` via the Quick Log queue
(ADR-0004). Local notifications are scheduled on-device from server `reminder` rows per
`docs/architecture/11-notifications.md` / ADR-0012; remote push stays out of scope. No schema
change is expected (ADR-0007 baseline untouched).

**Linear:** created 2026-07-10 —
`PUP-28` (contracts/occurrence/data), `PUP-29` (schedule form + Diary merge),
`PUP-30` (local notifications, `blocked` until expo-notifications approval),
`PUP-31` (Quick Log backdating), `PUP-32` (install runbook + smoke).
Dependencies: PUP-28 blocks 29/30/31; PUP-32 blocked by 29+30+31. Note: the "reserved
PUP-26..PUP-32" range mentioned in the plans README never existed in Linear (verified
2026-07-10); no dedupe was needed.

**Branch:** per-issue Linear `gitBranchName` (e.g.
`dimaselenya/pup-28-schedule-contracts-occurrence-engine-and-data-layer`).

**TDD mode:** heavy/full-isolated for contracts, occurrence expansion, check-off mutation,
queue/backdating, and notification scheduling engine (all high-risk per `AGENTS.md`); lightweight
allowed only for the install runbook (docs) and copy-only edits.

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` — routines/reminders + Quick Log sections
- Design: `docs/plans/active/2026-06-25-diary-plan-log-redesign.md` (locked plan/fact model),
  `docs/design/v2/` (canonical V2 reference), ADR-0020 (V2 IA)
- Architecture: `docs/architecture/11-notifications.md`, `10-quick-log-queue.md`,
  `08-data-model-and-rls.md`, `04-state-management.md`
- ADR: ADR-0012 (notifications), ADR-0004 (Quick Log queue), ADR-0007 (schema baseline),
  ADR-0021 (durable writes / no third bespoke queue), ADR-0016 (exact-alarm policy — Android, deferred)

---

## Context

Verified current state (2026-07-09/10 code audit):

- **Schedule slab is a placeholder.** `app/(sheets)/quick-log/schedule/index.tsx` renders only a
  header. The two-slab chooser (Quick Log / Plan) exists via the V2 nav capsule.
- **Reminder CRUD exists but is minimal.** `src/lib/query/reminders.ts` +
  `src/lib/supabase/reminders.ts` insert/toggle/soft-delete `reminder` rows, but
  `toReminderInsert` hardcodes `schedule_rule = { repeat: 'daily', time: <default> }` and
  `reminder_type` is a free-form trimmed name. There is no `src/contracts/reminders.ts`.
- **`reminder_occurrence` is dark.** The table, its status enum
  (`scheduled|completed|skipped|missed|canceled`), and owner/caregiver RLS insert/update/read
  policies exist in `20260524202620_mvp_schema_baseline.sql`, but no client code references it.
  There is **no unique constraint** on `(reminder_id, scheduled_for)` — idempotence must be
  client-enforced in v1 (see Locked Decision 6).
- **No notification code exists.** `expo-notifications` is not a dependency; `src/lib/notifications/`
  does not exist; nothing schedules or fires. `notification_preference` CRUD exists.
- **Quick Log cannot backdate.** `occurred_at` is part of `quickLogCommandSchema`
  (`src/contracts/quick-log.ts`) and flows through the queue, but the sheet controller
  (`src/features/quick-log/useQuickLogSheetController.ts`) always stamps `now()`; no UI offers a
  time picker.
- **Diary (`TodayScreen`) renders facts only** plus age-derived guidance; no planned slots.
- **Install path:** bare `ios/` project (CNG output) builds via Xcode; no `eas.json`, no
  `android/`. Both dogfooding devices are iPhones. Known caveats from the roadmap: generated
  native-project warnings, and a stale XcodeBuildMCP launch failure from June.
- **Family invites are read-only** (no create/accept mutations) — worked around by a single
  shared account on both devices; real invites are explicitly out of scope here.

- **Context package:** this plan; the audit facts above; `AGENTS.md`;
  `2026-06-25-diary-plan-log-redesign.md` §3 (locked decisions) and §6 (data-model mapping);
  `docs/architecture/11-notifications.md`; ADR-0004/0007/0012/0020/0021;
  `src/contracts/quick-log.ts`; `src/lib/query/reminders.ts`; `src/lib/supabase/reminders.ts`;
  `supabase/migrations/20260524202620_mvp_schema_baseline.sql` (reminder/occurrence DDL + RLS);
  `docs/agents/design-fidelity-pipeline.md` for every UI phase.
- **Context placement:** Linear issues stay short (task contract only); this plan holds the
  long-form context; PRs hold final verification evidence.

---

## Goals

1. **Routine setup ("В расписание" form)** — event type from the canonical tracker taxonomy,
   time of day, repeat (`never`/`daily`/`weekdays`/custom days), optional quantity + note, backed
   by the existing `reminder` table.
2. **Plan/fact Diary merge** — the selected day renders planned slots (computed from
   `schedule_rule`) interleaved with Quick Log facts; checking a slot off persists a
   `reminder_occurrence` row (`completed`); missed slots are computed, not persisted.
3. **Local notifications** — enabled reminders schedule on-device local notifications
   (iOS-first), with staged permission, idempotent reschedule, and calm denied fallback.
4. **Quick Log backdating** — the user can adjust `occurred_at` (bounded: not in the future,
   ≤ 7 days back) when logging or from the details sheet.
5. **Device install runbook** — documented, repeatable local Xcode install of the dev build on
   both iPhones against `PuppyPlan Dev`, shared-account sign-in, and a manual dogfood smoke
   checklist.

---

## Non-Goals

- Family invites / second account (create+accept mutations are a separate later slice).
- Streak chips and streak rules (design spec defers rules; slot UI ships without streaks — record
  as a named deviation in the Design Fidelity evidence if the V2 mock shows a chip).
- Auto-linking Quick Log events to nearby routine slots (explicitly deferred in the design spec).
- Remote push, Edge Functions, sitter completion updates, trainer sharing.
- Android verification, exact-alarm decisions (ADR-0016), and `android/` generation.
- EAS builds / TestFlight — any such action needs its own exact user approval.
- Production Supabase — dogfooding runs entirely on `PuppyPlan Dev`.
- Paywall/entitlement gating.
- Schema changes, including a unique index on `reminder_occurrence (reminder_id, scheduled_for)`
  — flagged as a candidate ADR-0007 follow-up, not done here.

---

## Product Decisions Locked In

1. **Routine template = existing `reminder` row.**
   - **Chosen:** no new table; `reminder_type` carries the canonical tracker id;
     `schedule_rule` jsonb carries `{ time, repeat, date?, amount?, note? }`.
   - **Reason:** matches design-spec §6 ("natural sibling of the deferred Reminders surface"),
     avoids ADR-0007 process, and reuses existing RLS + soft-delete + pgTAP coverage.

2. **`schedule_rule` contract (new `src/contracts/reminders.ts`).**
   - **Chosen:** Zod schema:
     `time` `HH:mm` local; `repeat` one of `never | daily | weekdays | { days: IsoWeekday[] }`;
     `date` (`YYYY-MM-DD`) required iff `repeat = never`; optional `amount`
     (`{ value: number; unit: 'g' | 'min' }`, only for trackers where meaningful); optional
     `note` (private user content — never logged/analytics).
   - **Reason:** design-spec §3.2 form fields, one flow for recurring + one-off; jsonb keeps it
     inside the schema baseline. Existing hardcoded `{repeat:'daily', time}` rows parse as a
     subset.

3. **Check-off persists an `event_log` completion fact (REVISED 2026-07-10 → Option B).**
   - **Superseded original:** "insert a `reminder_occurrence` row." Rejected once the audit found
     that client insertion of `reminder_occurrence` is blocked by a **deliberate, tested** RLS
     invariant (`rls_baseline.sql:2058`, caregiver insert denied). Occurrences are server-created
     by design; v1 has no server creator (Edge Functions out of scope).
   - **Chosen (user-approved 2026-07-10):** checking a planned slot writes one `event_log` row for
     the tracker's event type, carrying a linkage payload `{ source: 'reminder', reminder_id,
     scheduled_for }`. `reminder_occurrence` stays unused in v1. Diary merges two sources: computed
     planned slots + `event_log` facts (completion facts and spontaneous logs), matching a slot to
     its completion by `(reminder_id, scheduled_for)`.
   - **Reason:** honors the baseline security model (no invariant reversal, no migration), and
     matches design-spec §3.3 "the check-off *is* the log" more literally than a parallel
     occurrence row. Missed stays computed (Decision 4 unchanged).

4. **Missed is computed, never written.**
   - **Chosen:** a slot whose planned time passed with no `completed` occurrence renders
     "пропущено" client-side; no `missed` rows are inserted in v1.
   - **Reason:** no background job exists to mark misses; computing keeps the server state
     append-only-by-user-action and idempotent.

5. **Notification engine = idempotent reschedule-all.**
   - **Chosen:** on app foreground/auth/reminder-mutation/timezone-change, cancel all
     app-scheduled local notifications and reschedule the next 72h horizon from enabled
     `reminder` rows. `local_notification_id` mapping stays **on-device only** (the server column
     is unused in v1, per `11-notifications.md`: ids are device-specific).
   - **Reason:** simplest strategy that is correct with two devices on one account; no server
     coordination needed; failure mode is a duplicate banner, not lost data.

6. **Check-off idempotence via deterministic `client_event_id` (REVISED 2026-07-10, follows Option B).**
   - **Superseded original:** "read existing occurrences before insert." No longer needed.
   - **Chosen:** the completion `event_log` row uses a `client_event_id` deterministically derived
     from `(reminder_id, scheduled_for)` (pure hash → v4-shaped id). The existing
     `event_log UNIQUE (household_id, client_event_id)` constraint (baseline line 107) then makes a
     double check-off — same slot, even across the two devices — a natural dedupe/no-op, exactly
     as Quick Log already dedupes. Slot UI still disables the checkbox while pending.
   - **Reason:** idempotence for free from the shipped dedupe path; no new DB constraint, no
     read-before-insert race, correct across two devices on one account.

7. **Backdating bounds.**
   - **Chosen:** `occurred_at` may be edited at log time (optional "время" affordance in the
     sheet/details); must be `<= now` and `>= now - 7 days`. The 3s accidental double-tap window
     stays keyed to *submission* time; the 60s duplicate-care warning compares `occurred_at`
     values as today.
   - **Reason:** covers the real "log it 20 minutes later" case without opening arbitrary
     history rewriting.

8. **Dogfooding auth = one shared account.**
   - **Chosen:** both iPhones sign into the same email-OTP account (owner role).
   - **Reason:** invite create/accept flows do not exist yet; this unblocks two-person care
     coordination today and is trivially reversible later.

9. **iOS-first verification.**
   - **Chosen:** notification and install verification target the two dogfooding iPhones and the
     SE simulator profile from `AGENTS.md`; Android paths must compile but are not verified.
   - **Reason:** both dogfooding devices are iPhones; Android gates live in release readiness.

---

## Invariants And Executable Spec

- **Acceptance mapping:** Linear issue → this plan → automated test/manual check → PR evidence.
- **Spec-defect halt rule:** stop before RED if criteria turn contradictory, privacy-unsafe,
  schema-unsafe, design-ambiguous, or unverifiable.
- **Shallow-green caveat:** occurrence expansion and scheduling are lookup-table-prone; include
  property-style cases (random valid rules/dates) and negative cases, not just examples.

- **Invariant 1:** Occurrence expansion is a pure deterministic function of
  `(reminder rows, target day, timezone)`; same inputs always yield identical slots, DST
  transitions included.
  - **Test:** `src/test/reminders-occurrence-expansion.test.ts`
- **Invariant 2:** `schedule_rule` contract rejects: missing `time`, malformed `HH:mm`,
  `repeat=never` without `date`, unknown repeat shapes, unknown tracker ids, `amount` on
  trackers where it is not meaningful; accepts every legacy `{repeat:'daily', time}` row.
  - **Test:** `src/test/reminders-contract.test.ts`
- **Invariant 3 (REVISED → Option B):** Checking off the same slot twice (double tap, or
  already-completed slot refetched, even from the other device) produces exactly one `event_log`
  completion fact and no error surfaced to the user — enforced by a deterministic `client_event_id`
  derived from `(reminder_id, scheduled_for)` + the existing `event_log` unique constraint.
  - **Test:** `src/test/reminders-checkoff.test.ts` — (a) pure: same slot → identical
    `client_event_id`; (b) mutation-level with a fake event_log repository: second insert dedupes.
- **Invariant 4:** A backdated `occurred_at` is clamped/rejected outside `[now-7d, now]`, and a
  backdated event sorts into the correct day/position in Diary.
  - **Test:** `src/test/quick-log-backdating.test.ts` + extension of existing timeline tests
- **Invariant 5:** Notification scheduling is idempotent: running reschedule twice with the same
  inputs leaves the same pending set; a disabled or soft-deleted reminder has zero pending
  notifications afterwards; logout cancels everything app-scheduled.
  - **Test:** `src/test/notifications-scheduler.test.ts` (fake notification adapter)
- **Invariant 6 (REVISED → Option B):** A `viewer` cannot create reminders or write completion
  facts (RLS, not UI-only). `reminder_occurrence` stays client-insert-denied for ALL roles — the
  existing `rls_baseline.sql:2058` assertion must keep passing (no new pgTAP needed; do not
  weaken it). Viewer denial for completion `event_log` writes reuses the existing event_log
  insert role-matrix coverage.
  - **Test:** existing `rls_baseline.sql` occurrence-insert-denied assertion stays green; confirm
    event_log insert denial for viewer is already covered (add a case only if a gap is found).
- **Invariant 7:** No raw puppy name, note text, or schedule note appears in analytics, logs, or
  error reports from any new code path (notification *content* on-device may show the name; log
  payloads may not).
  - **Test:** extend `scripts/checks/privacy-scan.mjs` expectations + unit assertions on emitted
    analytics payloads
- **Invariant 8 (reused):** Quick Log 3s double-tap and 60s duplicate-care windows stay keyed as
  today (`src/contracts/business-rules.ts`) and their tests keep passing after backdating lands.
  - **Test:** existing business-rules tests must stay green; add a case for backdated
    `occurred_at` vs the 60s warning.

---

## File Map

### App Shell
- `app/(sheets)/quick-log/schedule/index.tsx` — wire route to the real form (route-only change)
- `app/_layout.tsx` — notification provider/bootstrap wiring only if a provider is required

### Feature
- `src/features/reminders/screens/ScheduleFormScreen.tsx` (new) — "В расписание" form
- `src/features/reminders/screens/RemindersHubScreen.tsx` / `ReminderEditScreen.tsx` — align
  with the new contract (edit uses the same form fields)
- `src/features/today/screens/TodayScreen.tsx` + `src/features/today/components/` — planned-slot
  cards, checkbox states (upcoming/done/missed), merge ordering
- `src/features/quick-log/useQuickLogSheetController.ts` + details screen — occurred_at
  affordance

### Contracts
- `src/contracts/reminders.ts` (new) — schedule_rule schema, occurrence expansion input/output
  types, check-off payloads
- `src/contracts/quick-log.ts` — occurred_at bounds refinement
- `src/contracts/business-rules.ts` — backdating window constant (`QUICK_LOG_BACKDATE_MAX_DAYS`)

### Data And Query
- `src/lib/supabase/reminders.ts` — full-schedule insert/update; occurrence select/insert
- `src/lib/query/reminders.ts` — new drafts, occurrence day-range query, check-off mutation +
  invalidation (diary/timeline + reminders keys)
- `src/lib/query/keys.ts` — occurrence query keys
- `src/lib/notifications/` (new) — adapter over expo-notifications (permission, schedule,
  cancel, categories) + pure scheduling engine

### Backend / Supabase
- `supabase/tests/` — pgTAP additions for `reminder_occurrence` role matrix (no migrations)

### Tests
- `src/test/reminders-contract.test.ts`, `reminders-occurrence-expansion.test.ts`,
  `reminders-checkoff.test.ts`, `notifications-scheduler.test.ts`,
  `quick-log-backdating.test.ts`, render/anatomy tests for the form + Diary slot cards

### Docs
- `docs/architecture/11-notifications.md` — note the v1 on-device-only id mapping decision
- `docs/plans/active/2026-07-07-release-readiness.md` — add any newly deferred tails
- `STRINGS.en.json` / `STRINGS.ru.json` / `STRINGS.es.json` — new keys (form, slot states,
  permission primer, denied fallback, time picker)

---

## Contracts, Schema, And Permissions

### Zod Contracts
- [ ] `src/contracts/reminders.ts` schemas + tests (valid/invalid/boundary, legacy-row parse).
- [ ] `src/contracts/quick-log.ts` occurred_at bounds + tests.
- [ ] No generated DB type changes expected (`database.types.ts` untouched).

### Database / RLS

> **RESOLVED 2026-07-10 → Option B (no schema/RLS change).** Check-off writes an `event_log`
> completion fact (clients already have insert grant + RLS), not a `reminder_occurrence` row. The
> deliberate "clients cannot insert occurrences" invariant is left intact; **no migration is
> written or applied**. `PuppyPlan Dev` is untouched. The blocker analysis below is kept for the
> record.

> **BLOCKER discovered 2026-07-10 (PUP-28 Phase 2 gate).** The plan's Context claimed
> "owner/caregiver RLS insert/update/read policies exist" for `reminder_occurrence`. **That is
> inaccurate.** In `20260524202620_mvp_schema_baseline.sql` the table has only:
> - `GRANT SELECT` + `GRANT UPDATE` to `authenticated` (lines ~980–1017) — **no `GRANT INSERT`**;
> - RLS policies `reminder_occurrence_read` (SELECT) and `reminder_occurrence_update` (UPDATE)
>   only (lines 669, 681) — **no INSERT policy**.
>
> With RLS enabled (line 491) and no permissive INSERT policy + no INSERT grant, **no client role
> can insert an occurrence row**. This breaks Locked Decision 3 (check-off *inserts* a
> `completed` occurrence) and Invariant 6's "owner/caregiver *can* insert" half. Fixing it is a
> **migration** (new `GRANT INSERT` + `reminder_occurrence_insert` policy mirroring
> `reminder_insert`), which needs explicit user/CTO approval per `AGENTS.md` + `CLAUDE.md`.
> Phase 1 (pure contracts/expansion/backdating) is unaffected and is done. **Phase 2's check-off
> mutation is paused pending a decision** — see the two options in the changelog.

- [x] Migration required: **no** (Option B — check-off rides `event_log`; `reminder_occurrence`
      stays server-only and untouched). The earlier "YES" was under the rejected Option A.
- [x] Destructive migration risk: N/A (no migration).
- [ ] RLS policy impact: **none** — the existing `event_log` insert policy already covers
      completion facts. pgTAP for occurrences is unchanged; Invariant 6 becomes "verify the
      existing occurrence-insert-denied invariant still holds" (no new coverage needed).

### Edge Functions
- [ ] Edge Function required: **no** (local notifications only).

---

## UX Spec

### Navigation And Entry Points
- Central Add → bottom slab "В расписание" → schedule form sheet (existing chooser).
- Diary day view → planned slot checkbox (check-off in place).
- Quick Log sheet/details → occurred_at affordance.
- Reminders hub/edit (More/modal) → same form component for edit.

### States
- **Loading:** existing skeleton patterns per surface.
- **Empty:** Diary day with no slots/facts → existing calm empty state (unchanged copy unless
  design lock says otherwise).
- **Success:** slot flips to done (sage tint) in place; scheduled toast per existing feedback
  provider.
- **Error:** mutation failure surfaces via existing business-error path; slot reverts.
- **Offline / pending write:** reminder + occurrence mutations are **online-first with visible
  failure** in v1 (no third bespoke queue per ADR-0021); Quick Log facts keep their queue.
- **Permission denied (notifications):** calm in-app fallback card with Settings deep link, per
  `11-notifications.md`.
- **Permission denied (role):** viewer sees read-only slots (no checkbox), consistent with
  existing viewer gating.

### Accessibility
- [ ] Checkbox slots: 44pt+ targets, `checkbox` role, state announced; done/missed not conveyed
      by color alone (structure per design-spec §3.5).
- [ ] Form controls labeled; time picker accessible.
- [ ] Dynamic Type XXL pass on form + Diary slot cards (dogfood-level: screenshots on SE sim).

### i18n And String Budgets
- [ ] EN/RU/ES parity for all new keys; ICU plurals where counts appear.
- [ ] Budget-sensitive: slab labels, slot state labels ("пропущено"), notification
      title/body templates, permission primer CTA.

### Design Fidelity
- [ ] Stage 0 design lock per screen (schedule form, Diary slot states, chooser unchanged)
      against `docs/design/v2/` reference **before code**; anatomy render tests; named-deviation
      record for anything V2 shows that v1 omits (streak chip).

---

## Privacy, Analytics, And Observability

- [ ] No schedule note text, puppy name, or reminder free-text in analytics/log payloads
      (tracker ids and counts only).
- [ ] Notification scheduling errors go through shared observability wrappers with context —
      no silent catch (queue/persistence rule).
- [ ] Screenshots in evidence use synthetic puppy data only.
- [ ] iOS notification permission usage reviewed against `PrivacyInfo.xcprivacy` expectations
      (flag to release-readiness if the manifest needs an update).

---

## Implementation Plan

### Phase 0 - Read And Lock Scope
**Checklist:**
- [ ] Read the primary source docs listed above; confirm the locked decisions still hold.
- [ ] Reconcile with Linear `PUP-26..PUP-32` reservations once Linear is reachable; create the
      issues from the drafts below (user has approved issue creation).
- [x] Confirm `expo-notifications` dependency approval with the user (explicit, per `AGENTS.md`)
      **before Phase 4 starts**; record the approval here. **Approved 2026-07-10** (user: "одобряю
      expo-notifications"); PUP-30 `blocked` label removed.
- [ ] Design lock (Stage 0) for schedule form + Diary slot cards recorded in the evidence log.

**Acceptance criteria:** scope implementable without guessing; approvals recorded.

---

### Phase 1 - Contracts And Business Rules (PUP-28) — DONE 2026-07-10
**Files:** `src/contracts/reminders.ts` (new), `src/contracts/business-rules.ts`,
tests per Invariants 1, 2, 4, 8.

**Checklist:**
- [x] RED: contract tests for schedule_rule (incl. legacy-row parse) and occurred_at bounds.
- [x] GREEN: schemas + expansion pure function (`expandOccurrencesForDay`) + backdate constant.
- [x] Property-style expansion cases incl. DST boundary days and `weekdays`/custom-days rules.
- [x] Run targeted tests; record results — 42 tests green; `tsc --noEmit` exit 0; eslint clean.

**Acceptance criteria:** Invariants 1, 2, 4 (contract half), 8 pass; no UI touched. **Met.**

**Notes:**
- Backdating bounds live as a pure predicate `isQuickLogOccurredAtWithinBackdateWindow` +
  `QUICK_LOG_BACKDATE_MAX_DAYS/MS` in `business-rules.ts` (not the discriminated `quickLogCommandSchema`,
  which cannot see `now` at static parse time). Phase 2/PUP-31 threads it at the controller/queue edge.
- Tracker taxonomy for reminders reuses the canonical Quick Log set (potty/feeding/sleep/walk/zoomies);
  amount is meaningful only for feeding (`g`) and sleep/walk (`min`) via `reminderAmountUnitByTracker`.

---

### Phase 2 - Data Access, Query, And Check-off (PUP-28) — Option B, DONE 2026-07-10
**Files:** `src/contracts/reminders.ts`, `src/contracts/quick-log.ts`, `src/contracts/supabase.ts`,
`src/lib/supabase/reminders.ts`, `src/lib/query/reminders.ts`, `src/lib/query/quick-log.ts`, tests.

**Fork resolved:** the completion `event_log` write **rides the durable Quick Log SQLite queue**
(user-approved). The queue's `INSERT OR IGNORE` on `client_event_id` (PK) + the server
`event_log UNIQUE (household_id, client_event_id)` make a deterministic check-off id idempotent on
both the device queue and the server — across the two shared-account devices. No third queue (ADR-0021).

**Checklist:**
- [x] Contract: `createReminderCheckOffClientEventId({reminderId, scheduledFor})` (pure FNV-1a →
      v4-shaped `evt_` id, no new dep) + `reminder_link` nested payload (`{reminder_id, scheduled_for}`)
      threaded through `quickLogCommandSchema` → `createQuickLogEventInsert`; `getReminderLinkFromPayload`
      + `deriveSlotStatuses` (plan/fact merge core: done/missed/upcoming, missed computed, no auto-link).
- [x] Test (Invariant 3): same slot → identical id; different reminder/instant → different id;
      v4-shape accepted by `quickLogClientEventIdSchema`; payload-link round-trips; merge core cases.
- [x] Extend reminder insert/update to the full `schedule_rule` contract + `reminder_type = trackerId`
      (new `toReminderScheduleUpdate` + `updateReminderSchedule` repo method + mutation options/hook);
      legacy `reminderName` path preserved so current hub/edit callers compile unchanged.
- [x] Durable-queue wiring: `reminderLink?` threaded through `QuickLogMutationVariables` → `onMutate`
      → enqueue + insert; test asserts the link lands in both the queued item and the event insert.
- [x] Quick Log `occurred_at` threading remains **PUP-31**; Phase-1 bounds predicate already shipped.
- [x] Run focused unit tests: full suite **754 → 754+? all green**, `tsc` 0, eslint clean. No pgTAP
      change; the occurrence-insert-denied invariant is untouched (Invariant 6 stays green).

**Acceptance criteria:** no raw Supabase in features; Invariant 3 passes; the deliberate
occurrence-insert-denied invariant stays green; legacy reminders still list/toggle/delete. **Met.**

**Handoff to PUP-29 (Diary UI):** the Diary check-off calls
`port.mutate({ variables: { trackerId, occurredAt: scheduledFor, reminderLink: {reminderId, scheduledFor},
clientEventId: createReminderCheckOffClientEventId(...) , ... } })`; the day view builds slots via
`expandOccurrencesForDay` + `deriveSlotStatuses(slots, facts, nowMs)`. The schedule form calls
`toReminderInsert`/`toReminderScheduleUpdate` with a `reminderScheduleDraftSchema` draft + timezone.

---

### Phase 3 - UI: Schedule Form, Diary Merge, Backdating (PUP-29, PUP-31)
**Files:** feature + app-shell entries from the File Map; render/anatomy tests; STRINGS files.

**Checklist:**
- [ ] Schedule form per design lock (event/time/quantity/repeat/note; repeat default = daily).
- [ ] Diary merge: planned slots + facts ordered by time; upcoming/done/missed card states per
      design-spec §3.5 (structure first, color second); viewer = no checkbox.
- [ ] Check-off interaction wired to Phase 2 mutation; pending state disables the checkbox.
- [ ] Quick Log occurred_at affordance (sheet + details) with bounded picker.
- [ ] i18n keys EN/RU/ES; anatomy render tests; atlas side-by-side per screen recorded.

**Acceptance criteria:** the whole plan→check-off and backdated-log paths work against dev with
realistic data; design fidelity evidence recorded (deviations named).

---

### Phase 4 - Local Notifications (PUP-30) — gated on dependency approval

**Sub-slice 4a — pure scheduling engine (IN PROGRESS 2026-07-11):** the reschedule-all core
(`computeScheduleSet` + `reconcileSchedule` over an injected adapter port) is built and tested
against a fake adapter first — no `expo-notifications` import, no native module, no UI, so it needs
no install and keeps `tsc` green. The concrete expo adapter + provider wiring + physical-device
verification (4b) follow, since they require the native module and a real iPhone.

> **Spec lock (sub-slice 4a).**
> - **AC-1:** `computeScheduleSet({reminders, nowMs, timeZone, horizonMs?})` returns, for every
>   enabled non-deleted reminder, each planned slot whose instant is in `(nowMs, nowMs+horizon]`
>   (default horizon 72h), sorted ascending by instant, deduped by `(reminderId, scheduledFor)`.
> - **AC-2:** the result is a pure deterministic function of its inputs (same in → deep-equal out),
>   DST transitions included (reuses `expandOccurrencesForDay`).
> - **AC-3:** `reconcileSchedule(adapter, desired)` cancels all app-owned pending notifications,
>   then schedules each desired item; returns the scheduled handles. Running it twice with the same
>   desired set leaves the same owned pending set (idempotent).
> - **EC-1:** a slot exactly at `nowMs` is excluded (strictly future); a slot exactly at
>   `nowMs+horizon` is included (inclusive upper bound).
> - **EC-2:** disabled or soft-deleted reminders contribute zero items; empty `desired` (logout)
>   cancels everything owned and schedules nothing.
> - **EC-3:** `reconcileSchedule` cancels only app-owned notifications; a foreign pending item is
>   left untouched.
> - **ERR-1:** if the adapter's `schedule` rejects, `reconcileSchedule` rejects (fail-loud, no
>   silent catch) — surfaced to the caller for observability, not swallowed.
> - **Constraints:** no `expo-notifications` import in 4a; engine carries no `note`/puppy-name text
>   (privacy Invariant 7) — only `reminderId/trackerId/scheduledFor/time/amount`; no new dep.
> - **Out of scope (→ 4b):** permission staging, category registration, the concrete expo adapter,
>   provider/foreground wiring, denied-fallback UI, device verification.

**Checklist:**
- [x] Record explicit user approval for `expo-notifications` (and `expo-device` if required).
      Approved 2026-07-10 ("одобряю expo-notifications"); install deferred to 4b (device work).
- [x] Adapter + runtime wiring (**4b code core, DONE 2026-07-11**): `createExpoReminderNotificationAdapter`
      (permission, foreground handler, schedule, cancel-all-owned) behind the `NotificationSchedulerPort`;
      `toReminderForExpansion` (row → expansion, skips legacy/invalid), `syncLocalReminders` (pref/permission
      gate → reconcile, fail-loud to observability), `collectDesiredNotifications` (per-reminder-tz grouping),
      `buildReminderNotificationContent` (typed i18n, tracker-labelled, no PII); `LocalReminderSyncProvider`
      wired in the root `app/_layout.tsx` (mount + reminders/context/preference change + foreground triggers);
      `expo-notifications` config plugin added. **Named deviations (recorded):** (a) `ensurePermission`
      requests **full** authorization, not provisional-first — the provisional+in-app-primer flow is deferred
      to **4c** with the primer UI; (b) the **denied-fallback card** (Settings deep link) is deferred to the
      UI/design pass (permission is requested and, if denied, sync simply schedules nothing — no crash);
      (c) Done/Snooze notification **actions** remain a v1 non-goal (open-app only). Device banner
      verification is **4b-device** (below).
- [x] Pure scheduling engine (**4a, DONE 2026-07-11**): enabled reminders → next-72h desired set
      (`computeScheduleSet`) + idempotent `reconcileSchedule(port, desired)` over an injected
      `NotificationSchedulerPort`. Reschedule *triggers* (foreground/auth/mutation/timezone) and
      logout-cancels are the caller's job in 4b, but the engine already makes them correct: any
      trigger just recomputes + reconciles, and logout is `reconcileSchedule(port, [])`.
- [ ] Denied fallback card + Settings link; notification actions v1 = open app (Done/Snooze
      actions deferred; record deviation vs `11-notifications.md`).
- [ ] iOS behavior verified on SE simulator + at least one physical iPhone; record evidence.

**Acceptance criteria:** Invariant 5 passes with the fake adapter; a real reminder fires a
banner on a physical device; disabling the reminder stops future banners.

---

### Phase 5 - Device Install Runbook + Dogfood Smoke (PUP-32)
**Files:** `docs/runbooks/dogfood-install.md` (new), release-readiness aggregator update,
this plan's changelog.

**Checklist:**
- [ ] Runbook: Xcode local device build steps for both iPhones (signing, device registration,
      `npx expo run:ios --device`), Metro vs release-mode JS bundle choice, dev-Supabase env,
      shared-account OTP sign-in, re-install/update procedure.
- [ ] Resolve or explicitly accept the generated-native-project warnings noted in
      release-readiness §2 for the dogfood build (dogfood-level signoff, not release signoff).
- [ ] Manual smoke checklist executed on both devices: create schedule → notification fires →
      check off in Diary → spontaneous log → backdated log → offline quick log → reconnect
      dedupe → second device sees the data after refetch.
- [ ] File found issues into the polish backlog / new Linear issues; move any release-relevant
      tails to the release-readiness aggregator.

**Acceptance criteria:** both iPhones run the full daily loop for a real day without dead ends;
evidence (synthetic-data screenshots + checklist results) recorded.

---

## Linear Issues (created 2026-07-10)

Team `PUP`, project `PuppyPlan MVP`. One primary issue per branch. The contract text below is
mirrored in each issue; the issue is the tracker, this plan stays the source of truth.

### PUP-28 (was PUP-A) — Schedule contracts, occurrence engine, and data layer
- **Goal:** `reminder.schedule_rule` gets a real contract (time/repeat/date/amount/note),
  occurrence expansion is a tested pure function, check-off persists `reminder_occurrence`
  idempotently, Quick Log accepts bounded caller-supplied `occurred_at` at the contract/queue
  level.
- **Non-goals:** any UI; schema changes; notifications.
- **Constraints:** ADR-0007 baseline untouched; legacy `{repeat:'daily'}` rows must keep
  parsing; no third bespoke queue (ADR-0021) — occurrence mutations are online-first.
- **Acceptance:** plan Invariants 1, 2, 3, 4 (contract), 6, 8 green; `npm run check` green;
  focused pgTAP for occurrence role matrix recorded.
- **Likely files:** `src/contracts/reminders.ts`, `src/contracts/quick-log.ts`,
  `src/lib/supabase/reminders.ts`, `src/lib/query/reminders.ts`, `src/lib/query/keys.ts`,
  `supabase/tests/*`, `src/test/*`.
- **Verification:** `npm run check`; `npm run supabase:test` (focused); test output in PR.

### PUP-29 (was PUP-B) — Schedule slab form + Diary plan/fact merge
- **Goal:** "В расписание" form replaces the placeholder; Diary renders planned slots merged
  with facts (upcoming/done/missed) with in-place check-off.
- **Non-goals:** streaks; auto-linking; notification scheduling.
- **Constraints:** design-fidelity pipeline mandatory (Stage 0 lock before code, anatomy tests,
  atlas comparison); design primitives only; i18n EN/RU/ES; viewer role gets no checkbox.
- **Acceptance:** full plan→check-off path works on dev; fidelity evidence with named
  deviations; render tests green.
- **Likely files:** `src/features/reminders/screens/ScheduleFormScreen.tsx`,
  `src/features/today/*`, `app/(sheets)/quick-log/schedule/index.tsx`, STRINGS files.
- **Verification:** `npm run check`; SE-simulator screenshots vs V2 atlas; manual flow on dev.

### PUP-30 (was PUP-C) — Local notifications from reminders (iOS-first)
- **Goal:** enabled reminders fire local notifications on-device; idempotent reschedule-all
  engine; staged permission; denied fallback.
- **Non-goals:** remote push; Done/Snooze notification actions; Android verification;
  server-side `local_notification_id`.
- **Constraints:** **`expo-notifications` needs explicit user dependency approval before
  work starts**; all side effects behind `src/lib/notifications/` adapter; scheduling errors via
  observability wrappers (no silent catch).
- **Acceptance:** plan Invariant 5 green with fake adapter; physical-iPhone banner evidence;
  disable/logout stops notifications.
- **Likely files:** `src/lib/notifications/*`, `app/_layout.tsx`,
  `src/features/more/screens/NotificationPreferencesScreen.tsx`, `src/test/*`.
- **Verification:** `npm run check`; device evidence; permission-denied path screenshot.

### PUP-31 (was PUP-D) — Quick Log backdating UI
- **Goal:** occurred_at affordance in the Quick Log sheet/details, bounded to `[now-7d, now]`;
  backdated events sort correctly in Diary.
- **Non-goals:** editing occurred_at of already-synced historical events beyond the details
  flow; bulk editing.
- **Constraints:** 3s/60s business-rule invariants keep their current keying; design-fidelity
  pipeline for the picker UI; i18n EN/RU/ES.
- **Acceptance:** Invariant 4 green end-to-end; existing business-rules tests green.
- **Likely files:** `src/features/quick-log/*`, `src/contracts/quick-log.ts`,
  `src/contracts/business-rules.ts`, STRINGS files.
- **Verification:** `npm run check`; manual backdated-log flow on dev.

### PUP-32 (was PUP-E) — Dogfood install runbook + two-device smoke
- **Goal:** documented, repeated local Xcode install on both iPhones (shared account), and an
  executed manual smoke checklist covering the full daily loop.
- **Non-goals:** EAS/TestFlight (needs separate exact approval); Android; production Supabase.
- **Constraints:** release guardrail — no store/EAS/production action; synthetic data in all
  recorded evidence.
- **Acceptance:** runbook exists; smoke checklist executed on both devices with results
  recorded; found bugs filed.
- **Likely files:** `docs/runbooks/dogfood-install.md`, plan changelog,
  release-readiness aggregator.
- **Verification:** checklist results + screenshots in the plan/PR.

Dependency order: PUP-28 → PUP-29 → PUP-30 (30 also gated on dependency approval; 30 can start after
28 if 29 is in flight), PUP-31 after 28 (parallel with 29), PUP-32 last.

---

## Verification Checklist

### Local Code Gates
- [ ] `npm run lint` · `npm run typecheck` · `npm run test` · `npm run check`

### Supabase / Contract Gates
- [ ] No-migration confirmation (dry-run no-op) recorded
- [ ] Focused pgTAP occurrence role matrix
- [ ] Generated-types diff clean (no schema change)

### UI / Mobile Gates
- [ ] Render/anatomy tests for form + slot cards
- [ ] SE-simulator + physical iPhone flows (schedule → notify → check off → backdate)
- [ ] Dynamic Type XXL screenshots for the two new/changed screens
- [ ] Atlas side-by-side per changed screen; deviations named

### Release / Platform Gates
- [ ] No EAS/TestFlight/production action without exact approval
- [ ] Notification permission impact flagged to release-readiness (privacy manifest check)

---

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Duplicate check-off rows without a DB unique constraint (two devices, one account) | Client read-before-insert + pending-state UI; named ADR-0007 follow-up for a unique index; duplicates are visible and hand-fixable in dogfood |
| Notification scheduling drifts from reminders (stale/ghost banners) | Idempotent reschedule-all on every trigger; Invariant 5 tests; 72h horizon caps blast radius |
| `expo-notifications` behaves differently on simulator vs device | Physical-iPhone verification is part of PUP-30 acceptance, not optional |
| Legacy reminder rows break under the new contract | Contract test explicitly parses the legacy `{repeat:'daily', time}` shape; migration of rows unnecessary |
| Xcode/native warnings block device install | Dogfood-level triage in PUP-32; escalate to release-readiness §2 rather than hand-editing generated `ios/` files |
| Two devices show stale data (no realtime) | Accept refetch-on-focus for dogfood; realtime remains an enhancement per `AGENTS.md`; note friction in smoke results |
| Backdating interacts badly with dedupe windows | Invariant 8 test additions before UI ships |

---

## Changelog

- 2026-07-10: Initial plan created from the 2026-07-09/10 dogfooding-readiness code audit
  (schedule slab placeholder, dark `reminder_occurrence`, no notification code, `occurred_at`
  hardcoded to now, read-only invites). Linear issue creation was initially blocked (MCP not
  connected); drafts were recorded in this plan.
- 2026-07-10 (later): Linear reconnected; created `PUP-28`..`PUP-32` in team PUP / project
  PuppyPlan MVP with blockedBy relations (28 → 29/30/31 → 32). PUP-30 carries the `blocked`
  label until the user's explicit `expo-notifications` dependency approval is recorded here.
  Verified the "reserved PUP-26..PUP-32" range from the plans README never existed in Linear.
- 2026-07-10 (later): user explicitly approved the `expo-notifications` dependency; PUP-30
  `blocked` label removed and its description updated. Phase 1 (PUP-28) started on branch
  `dimaselenya/pup-28-schedule-contracts-occurrence-engine-and-data-layer`.
- 2026-07-10 (PUP-28 Phase 1 DONE): added `src/contracts/reminders.ts` (schedule_rule contract,
  tracker taxonomy + amount-unit map, `expandOccurrencesForDay` DST-correct pure expansion) and
  backdating bounds in `business-rules.ts`. Tests: `reminders-contract`,
  `reminders-occurrence-expansion`, `quick-log-backdating` — 42 green; `tsc --noEmit` 0; eslint clean.
  Invariants 1, 2, 4 (contract half), 8 satisfied. No UI, no DB writes.
- 2026-07-10 (BLOCKER for PUP-28 Phase 2): code audit of the baseline migration shows
  `reminder_occurrence` has **no INSERT grant and no INSERT RLS policy** (only SELECT + UPDATE).
  The plan's earlier "insert policy exists" assumption was wrong; check-off cannot persist an
  occurrence row against dev today. **Awaiting a user decision between:**
  - **Option A (recommended):** add an additive migration — `GRANT INSERT ON
    public.reminder_occurrence TO authenticated` + a `reminder_occurrence_insert` RLS policy
    (owner/caregiver `WITH CHECK`, mirroring `reminder_insert`) — plus the pgTAP role matrix.
    Keeps Locked Decision 3 intact; needs explicit approval to *apply* to `PuppyPlan Dev`
    (I can author the migration + pgTAP first, unapplied). Candidate ADR-0007 follow-up note.
  - **Option B:** persist check-off as an `event_log` row (clients already have insert grant/RLS)
    with a reminder linkage payload, and dedupe in the Diary merge — no migration, but reopens the
    double-count/linkage concern Decision 3 deliberately avoided.
  Phase 2 data-layer check-off work is paused until this is decided; Phase 1 and the Quick Log
  `occurred_at` threading (also Phase 2, unaffected by this) can proceed independently.
- 2026-07-10 (BLOCKER correction — important): the missing INSERT is **not an oversight**.
  `supabase/tests/rls_baseline.sql:2058` is a deliberate, passing pgTAP invariant —
  `'authenticated clients cannot directly insert reminder occurrences'` — asserted against a
  **caregiver** (user `…0102`, role caregiver per fixture line 691). Occurrence rows are designed
  to be created server-side; clients only READ and UPDATE status (the UPDATE policy is the
  check-off path, once rows exist). So the real gap is that v1 has no server creator (Edge
  Functions are out of scope). This re-frames the options:
  - **Option A (now heavier than first stated):** adding a client INSERT grant+policy
    *reverses* a deliberate, tested security invariant and requires rewriting that pgTAP
    assertion (caregiver insert `false → true`) — an ADR-level decision, not a bug fix.
  - **Option B (now recommended):** model check-off as an `event_log` fact (clients already have
    the insert grant/RLS), matching the design-spec "the check-off *is* the log" semantics and
    the baseline's security posture, with the Diary merge deduping planned-vs-fact. No schema or
    security-invariant change. Missed stays computed.
  I initially recommended A under the mistaken belief the block was accidental; corrected here
  and re-raised with the user before any migration is written.
- 2026-07-10 (BLOCKER resolved): user chose **Option B** with the corrected framing. Check-off is
  now an `event_log` completion fact; `reminder_occurrence` stays server-only and untouched; no
  migration is written or applied; `PuppyPlan Dev` unchanged. Updated Locked Decisions 3 & 6,
  Invariants 3 & 6, the Database/RLS section, and the Phase 2 plan. Phase 2 (check-off contract +
  reminder full-contract insert) is the next sub-task, with one open fork recorded: durable
  Quick Log queue vs online-first for the completion write (recommend: reuse the queue).
- 2026-07-10 (PUP-28 Phase 2 DONE): fork resolved to the **durable Quick Log queue** (user-approved).
  Shipped: `reminder_link` nested payload on the event payload schemas + `quickLogCommandSchema`
  (`src/contracts/supabase.ts`, `quick-log.ts`); `createReminderCheckOffClientEventId` (deterministic
  FNV-1a → v4 `evt_` id), `getReminderLinkFromPayload`, `deriveSlotStatuses` in `reminders.ts`;
  full-contract reminder insert + `toReminderScheduleUpdate`/`updateReminderSchedule`/mutation options
  + hook in the data layer; `reminderLink` threaded through the Quick Log mutation boundary
  (`onMutate` → enqueue + insert). Tests: `reminders-checkoff` (12), `reminders-query` (+7),
  `quick-log-mutation` (+1); **full unit suite 754 passing, `tsc` 0, eslint clean**. Invariant 3 met;
  the occurrence-insert-denied invariant untouched. No migration; dev untouched. PUP-28 core complete;
  UI wiring handed to PUP-29. Still no git commit (awaiting approval).
- 2026-07-11: PUP-28 (Phase 1+2) committed to the branch (`970d805`) after user approval; full
  `npm run check` green. PUP-28 stays "In Review".
- 2026-07-11 (PUP-30 sub-slice 4a DONE — pure engine, lightweight TDD): added
  `src/lib/notifications/scheduler.ts` — `computeScheduleSet` (enabled reminders → strictly-future
  72h desired set over `expandOccurrencesForDay`, deduped/sorted, DST-correct, no `note`/PII) and
  `reconcileSchedule` (cancel-all-owned → schedule desired, idempotent, fail-loud). No
  `expo-notifications` import, no native, no UI → no install needed; `tsc` stays green. Test:
  `src/test/notifications-scheduler.test.ts` (14: AC-1/2/3, EC-1/2/3, weekdays/one-off horizon,
  privacy, ERR-1 fail-loud). `npm run check` exit 0. **TDD mode: lightweight; reduced assurance
  because RED/GREEN/REFACTOR were not context-isolated** — mitigated by property/negative/idempotence
  cases on a pure module (worst-case failure per Decision 5 is a duplicate banner, not lost data).
  Sub-slice 4b (concrete expo adapter + provider/trigger wiring + physical-iPhone verification +
  `expo-notifications` install) is deferred — it needs the native module and a real device.
  Linear PUP-30 status not updated this session: the Linear MCP is unauthenticated (non-interactive).
- 2026-07-11: branch hygiene — PUP-30 work moved to its own branch
  `dimaselenya/pup-30-local-notifications-from-reminders-ios-first` (4a commit `71eca13` rides on the
  PUP-28 base, stacked); the PUP-28 branch was reset to its own commit `970d805`. Linear reconnected;
  PUP-30 set to In Progress.
- 2026-07-11 (PUP-30 sub-slice 4b code core DONE — lightweight TDD): installed `expo-notifications`
  `~55.0.24` (approved). Added the concrete adapter, `localReminderSync` orchestration
  (`toReminderForExpansion` / `syncLocalReminders` / `collectDesiredNotifications`),
  `reminderNotificationContent` (typed i18n copy `reminders.local-notification.title/body`, EN/RU/ES),
  the `LocalReminderSyncProvider` (root-layout wiring), and the `expo-notifications` config plugin.
  Test: `src/test/local-reminder-notifications.test.ts` (10 — content, row mapping, tz grouping,
  pref/permission gating, ERR fail-loud). `npm run check` exit 0. Named deviations recorded in Phase 4:
  full-permission (provisional-first primer → 4c), denied-fallback card → UI pass, Done/Snooze actions
  (v1 non-goal). Provider isolated from jest (root layout is not rendered in tests → native module never
  loaded). **Remaining: 4b-device** — `npx expo run:ios --device` native build + on-device banner
  evidence (needs the physical iPhone; may need interactive Xcode signing).
- 2026-07-11 (4b native config VALIDATED; device build handed off): set explicit
  `ios.bundleIdentifier` / `android.package` (`90448b9`) — required because the dynamic
  `app.config.ts` blocks prebuild auto-write. `npx expo prebuild -p ios --clean` then regenerates the
  iOS project cleanly WITH the expo-notifications config plugin, and `pod install` integrates
  `ExpoNotifications 55.0.24` (Podfile.lock verified). Runbook gotcha (PUP-32): CocoaPods fails with
  `Encoding::CompatibilityError` unless the shell is UTF-8 — run pods/build with
  `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`. The full simulator build (`expo run:ios`) was killed
  mid-native-compilation in this environment (during pod C++ compile, before app JS — a sandbox
  resource limit, not a code error; no compile error emitted). 4b-device is therefore handed to a
  local Mac run (also the natural home for device signing + the authed banner smoke, overlapping
  PUP-32): `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --device` → sign in (shared debug
  account) → create an enabled reminder a couple minutes out → confirm the banner → disable it →
  confirm no further banner. PUP-30 stays In Progress until that evidence lands.
- 2026-07-11 (4b-device, local run gotchas for the PUP-32 runbook): (a) fresh Mac needs Xcode →
  Settings → Accounts → Apple ID + an Apple Development certificate, then Team selection in
  Signing & Capabilities (free personal team OK for dogfood; 7-day signing validity) — otherwise
  `expo run:ios --device` fails with "No code signing certificates are available"; (b) an
  interrupted/killed build leaves a stale `ios/build` that makes ReactCodegen fail with
  `ENOENT ... unlink .../ShadowNodes.cpp` (xcodebuild exit 65) — fix: `rm -rf ios/build` and rebuild
  (escalation: clear `~/Library/Developer/Xcode/DerivedData/PuppyPlan-*`); (c) the
  `SDWebImage iOS@9.0 deployment version mismatch` warning is harmless pod noise.
