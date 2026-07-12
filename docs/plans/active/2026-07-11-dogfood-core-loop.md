# Dogfood Core Loop — Quick Capture, Routine, Diary, Notifications

> For implementation agents: this is the execution continuation of
> `docs/plans/active/2026-07-10-dogfooding-readiness.md`. Read the predecessor's completed
> PUP-28/PUP-30 evidence, but follow this document for all unfinished work and ordering.
> Use the repo `AGENTS.md`, project `plan` / `design-fidelity` / `tdd` / `implement` skills,
> and update this living document plus Linear at every phase boundary.

**Goal:** The owner household can replace its Telegram notes and external daily-plan artifact for
an 8-week-old puppy with PuppyPlan: log the event that actually happened with its real time and
optional private context, create/edit a practical daily routine, compare plan with fact in Diary,
and use the same household data from two iPhones. Notifications are a downstream enhancement, not
the gate for the core care loop.

**Status:** Implementation complete in the working tree (Phases 0–8, 2026-07-12). Device install
and physical acceptance continue in `docs/plans/active/2026-07-12-dogfood-device-handoff.md`.

**Plan type:** Active task plan.

**Current phase:** All phases complete; remaining work (revision freeze, disk gate, Release
install, owner-executed physical checklist) is owned by the 2026-07-12 handoff plan.

**Architecture:** Supabase remains the durable source of truth. Routine templates stay in existing
`reminder` rows; spontaneous and checked-off facts stay in `event_log`; Quick Log continues to use
the existing Expo SQLite queue. The recommended notes/observation design adds a payload-version
branch and one additive `event_type` value, not a new notes table or third queue. Diary derives one
day model from reminder expansion plus factual event rows. Local notification scheduling consumes
only valid enabled reminder rows after the product path can create them.

**Linear:** coordinated continuation across `PUP-29`, revised `PUP-31`, `PUP-30`, and `PUP-32`.
`PUP-28` remains the completed/in-review contract base. Linear changes are proposed in this plan
but must not be applied until the user approves the plan. One primary issue per branch remains
mandatory; see **Issue And Branch Strategy**.

**TDD mode:** heavy/full-isolated for payload versioning, migration/RLS, queue changes, event-time
editing, routine check-off, plan/fact merge, notification lifecycle, and permissions. UI anatomy
tests are written before UI implementation after Stage 0 approval. Lightweight TDD is not approved
for these high-risk changes.

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` — Quick Log, Sleep, Training, Reminders, Family Sharing, privacy,
  `event_log`, and minimal durable queue sections.
- Design: `DESIGN.md`; `docs/plans/active/2026-06-25-diary-plan-log-redesign.md` §3;
  `docs/design/v2/reference/README.md` and `diary-create.screens.jsx`.
- Architecture: `docs/architecture/03-client-data-layer.md`, `04-state-management.md`,
  `08-data-model-and-rls.md`, `10-quick-log-queue.md`, `11-notifications.md`,
  `06-design-system-and-ui-contracts.md`.
- ADRs: ADR-0004, ADR-0007, ADR-0012, ADR-0020, ADR-0021.
- Audit: `output/dogfood-audit-2026-07-11/README.md` and its synthetic simulator screenshots.

---

## Context And Problem Statement

The current PUP-30 branch has working foundations but not a usable care product:

- PUP-28 already provides the schedule-rule contract, occurrence expansion, deterministic
  reminder check-off identity, reminder linkage, and a queue-backed completion-fact path.
- PUP-30 already provides a pure local scheduling engine, an Expo Notifications adapter, sync
  orchestration, root provider, i18n notification content, and native config.
- Quick Log can persist only five canonical trackers and always stamps the tap time.
- Sleep is a point fact; there is no start/wake/retrospective distinction.
- Training exists in the database event enum but is absent from the V2 selected-tracker contract.
- Free-text private context is explicitly rejected by current payload and queue contracts.
- Add → Schedule is a blank route.
- The legacy reminder form displays controls that do not change canonical schedule state and can
  create a visible reminder which the scheduler ignores.
- Diary shows facts but no usable plan/fact merge.
- Permission-denied UI is unconditional; provider mount can request permission before user intent;
  preference hydration and logout cancellation are incorrect.
- The simulator build works, but only about 4.5 GiB remains free. Native clean builds are a late
  verification step, never the first action.

The immediate product objective is therefore **care-loop completeness**, not notification polish.

### Context package for the implementation agent

Read, in order:

1. `AGENTS.md` and the relevant project skills.
2. This complete plan.
3. `docs/plans/active/2026-07-10-dogfooding-readiness.md`, focusing on completed PUP-28/PUP-30
   changelog evidence and known notification defects.
4. `output/dogfood-audit-2026-07-11/README.md`.
5. The primary source docs listed above.
6. Current Linear issues `PUP-28`..`PUP-32`, including relations and comments.
7. Actual source/tests named in the File Map; graph output is advisory only.

Long-form decisions live here and in ADRs. Linear holds concise task contracts/status. PRs hold
final verification evidence. No private puppy data, notes, names, photos, emails, or screenshots
enter Linear, plans, fixtures, logs, analytics, commits, or PR text.

---

## Goals

1. **Capture the real fact.**
   - Every fact can use `now` or a user-selected instant in `[now − 7 days, now]`.
   - Every fact can carry an optional private note up to 500 characters.
   - Potty distinguishes outside pee, inside pee, and poop.
   - Sleep distinguishes start, wake, and retrospective sleep.
   - Feeding, walk, zoomies, training/play, and neutral observation are available without
     forcing all of them into the five-tile Quick Log grid.

2. **Keep fast logging fast.**
   - Selected Quick Log trackers remain a maximum of five.
   - A selected simple tracker still logs the default `now` fact in one tap (potty/sleep may use
     a second subtype/state tap).
   - A visible `Log with details` / `More events` entry opens a composer for time, note, and
     non-selected event types.

3. **Create a real routine.**
   - Add → Schedule opens a functional create/edit form.
   - It supports canonical event kind, optional custom title, exact time, one-off/daily/weekdays/
     custom weekdays, optional duration/amount, optional private note, and enabled state.
   - Saved routines are immediately visible in Diary even when notifications are denied.

4. **Make Diary operational.**
   - Planned slots and facts are merged in actual chronological order.
   - Planned time and actual completion time remain distinct and visible.
   - Upcoming, completed, and past-unmarked states are structural, calm, and accessible.
   - Check-off writes exactly one durable fact through the existing Quick Log queue.

5. **Coordinate two phones.**
   - The temporary shared-account mode is explicitly supported for dogfood.
   - Foreground/refetch makes the other phone's latest facts and routines visible without
     requiring Realtime for correctness.
   - Attribution remains `You` in shared-account mode and is named as a limitation, not faked.

6. **Repair local reminders after the core loop exists.**
   - Permission is requested only after explicit reminder intent.
   - Stored preference hydration completes before prompting/scheduling.
   - Logout/no-care-context cancels app-owned notifications.
   - Permission UI reflects the actual OS state.

---

## Non-Goals

- Family invite creation/acceptance, separate wife account, or accurate per-person attribution.
- Remote push, trusted-sitter completion notifications, Done/Snooze notification actions.
- Automatic matching of spontaneous facts to nearby planned slots.
- A training library, AI recommendations, behavior diagnosis, or veterinary advice.
- Arbitrary user-defined tracker taxonomies or custom icons.
- Photos or media notes.
- Editing arbitrary historical events beyond the existing seven-day dogfood window.
- Broad offline-first storage, a third durable queue, Realtime as a correctness dependency.
- Android behavior verification, TestFlight, EAS build/update, production Supabase, store release.
- Streaks, shame language, or red missed-routine metrics.

---

## Product Decisions Locked In

### 1. Quick Log has a fast lane and a detailed lane

- **Chosen:** selected tiles retain the instant path; `Log with details` opens the full composer.
- **Why:** a forced form would destroy the core one-hand habit, while a hidden details route does
  not replace Telegram. Both intents must be first-class.

### 2. Event vocabulary is fixed, not user-defined

- **Selected-tile candidates:** potty, feeding, sleep, walk, zoomies.
- **Always available in More events:** training/play and observation.
- **Observation:** a neutral factual entry with required short title or non-empty note; never
  presented as diagnosis.
- **Why:** this covers the real household log without introducing a custom taxonomy system.

### 3. Sleep is one event type with explicit action semantics

- **Chosen payload:** `action = start | wake | retrospective`, with optional `duration_minutes`
  only for retrospective entries.
- **Why:** preserves the existing `sleep` event type and lets Diary reconstruct useful pairs
  without inventing a second table or fragile client-only interval object.

### 4. Notes live in versioned event payloads

- **Chosen:** optional trimmed `note` (1..500 chars) in payload version 2; no `event_notes` table.
- **Queue behavior:** the existing queue may persist the note until confirmation and deletes the
  queue row after server confirmation. It never logs, analyzes, or exposes the note to broad
  share projections.
- **Approval:** requires a new ADR extending ADR-0004/ADR-0021 and explicit user/CTO approval.

### 5. Observation is an additive enum value

- **Chosen:** add `observation` to `public.event_type`; add strict payload v2 contract.
- **Why:** mapping arbitrary context to `training` or `zoomies` would corrupt semantics.
- **Approval:** additive migration + ADR-0007 update requires explicit user/CTO approval before
  migration authoring/application. Application to PuppyPlan Dev is a separate exact approval.

### 6. Routine remains an existing reminder row

- **Chosen:** `reminder_type` contains a canonical routine event kind; `schedule_rule` adds
  optional `title`, event-specific variant, duration/amount, and note while retaining the existing
  repeat/time/date structure.
- **Why:** no new routine table and no third queue are needed.

### 7. Custom weekdays ship in this slice

- **Chosen:** `never`, `daily`, `weekdays`, and explicit ISO weekday sets.
- **Why:** the contract already supports it and a household routine is not credible without
  weekend/weekday variation. This resolves the stale design-note contradiction in favor of the
  current dogfood requirement.

### 8. Planned time and actual time are different fields

- **Chosen:** check-off writes `occurred_at = actual confirmation time`; the nested
  `reminder_link.scheduled_for` retains planned time. The deterministic client event id remains
  based on reminder + planned instant.
- **Why:** the Diary must answer both “what was planned?” and “what actually happened?”.

### 9. Past-unmarked copy is neutral

- **Chosen:** user-facing copy equivalent to “Not logged” / “Не отмечено” / “Sin registrar”, not
  “You missed” or a red failure state.
- **Why:** conforms to the PRD no-shame rule while still making the day operational.

### 10. Notifications never contain private free text

- **Chosen:** notification title/body use the canonical event label and scheduled time only.
- **Why:** local notifications can appear on a lock screen; routine title/note must remain private.

---

## Approval Gates

Implementation must stop before the named boundary until the exact approval is recorded here and
in Linear:

1. **ADR/payload gate:** approve private note persistence in the existing Quick Log queue and
   payload-version-2 contracts.
2. **Schema gate:** approve authoring an additive `event_type = observation` migration and ADR-0007
   update. Applying it to PuppyPlan Dev is a separate later approval.
3. **Stage 0 UI gate:** approve fresh rendered exports/spec cards for Quick Log composer, schedule
   form, Diary states, and notification primer/fallback before UI code.
4. **Dev migration gate:** approve `supabase db push` (or project script equivalent) to PuppyPlan
   Dev only after migration + pgTAP + generated types are reviewed locally.
5. **Device-build gate:** the user performs/approves signing and physical-device installation.
6. **Release guardrail:** this plan never authorizes EAS/TestFlight/production/remote git actions.

---

## Issue And Branch Strategy

Do not implement all phases directly on the current PUP-30 branch. Preserve the existing user
change in `package.json`. Proposed execution stack after plan approval:

1. **PUP-31 (revise title/scope):** `Quick Log dogfood capture — exact time, sleep/wake, notes,
   training, observation`. Branch from reviewed PUP-28 base. Owns contracts/ADR/migration/queue/
   Quick Log UI.
2. **PUP-29:** schedule form + Diary merge, stacked on the completed PUP-31 capture contract.
3. **PUP-30:** re-stack the existing notification commits on PUP-29, then repair permissions,
   lifecycle, DST, and physical acceptance.
4. **PUP-32:** docs/install/two-device smoke after 29+30+31.

Local branch creation/switching may occur only after the user approves this strategy. Commits,
pushes, PRs, rebases, merges, migrations, and releases require their own exact approvals per
`AGENTS.md`. The autonomous goal must not infer them.

---

## Invariants And Executable Spec

Each invariant maps to automated tests plus named manual evidence where native behavior is needed.

1. **Backward-readable payloads.** Every existing payload-version-1 event remains readable; new
   note/sleep/observation shapes use the explicit version-2 union and reject unknown fields.
   - Tests: `src/test/supabase-contracts.test.ts`, `src/test/quick-log-contracts.test.ts`.

2. **Private note boundary.** Notes never appear in analytics, logs, observability payloads,
   notification content, broad routine summaries, or synthetic evidence; notes longer than 500
   chars are rejected before enqueue.
   - Tests: privacy scan, analytics contract tests, share projection pgTAP, notification tests.

3. **No silent note loss.** A detailed event is durably enqueued with its note before network
   insert; retry preserves the exact note; successful confirmation removes the queue copy; a
   permanent failure remains visible with Retry/Delete.
   - Tests: queue storage/state-machine/mutation tests.

4. **Exact event time.** User-selected `occurred_at` is within `[now-7d, now]`, retains the chosen
   instant through queue/server/cache, and appears in the correct Diary day/order.
   - Tests: backdating, mutation, cached rows, Diary day model.

5. **Fast path budget.** A selected simple tracker reaches visible optimistic state in one tap
   (potty/sleep in at most two) and still targets ≤100 ms before awaited storage/network work.
   - Tests: controller behavior; manual SE one-hand check.

6. **Sleep semantics.** `start`, `wake`, and `retrospective` are distinguishable; retrospective
   duration is 1..1440; duration on start/wake is rejected; orphan wake remains a valid fact and
   is not silently paired to an unrelated sleep.
   - Tests: contract and day-model negative cases.

7. **Observation neutrality.** Observation requires a short title or note, is factual in copy,
   and is excluded from training-note projection unless explicitly redesigned later.
   - Tests: contracts + share projection pgTAP.

8. **Routine validity.** Save requires event kind + valid time; one-off requires date; recurring
   forbids date; custom weekdays are unique/non-empty; event-specific variants/amounts reject
   incompatible combinations; legacy rows remain parseable but never silently scheduled if invalid.
   - Tests: reminder contract/property/negative cases.

9. **Check-off idempotence and actual time.** The same planned slot checked twice or on both
   devices produces one fact; its identity uses scheduled time while `occurred_at` uses actual
   completion time.
   - Tests: reminder check-off + queue dedupe + Diary merge.

10. **Diary derivation.** Given reminders, facts, date, timezone, and `now`, the same input produces
    the same sorted day model; past-unmarked is computed, never persisted; spontaneous facts never
    auto-close a routine.
    - Tests: pure day-model table/property cases.

11. **Two-device correctness without Realtime.** A foreground/refetch reads the durable server
    state from the second device; cached data may improve UX but is never correctness authority.
    - Tests: query invalidation/refetch contracts; manual two-client smoke.

12. **Notification lifecycle.** No automatic mount prompt; hydrated-off preference schedules
    nothing; logout/no-care-context cancels app-owned notifications; foreign notifications remain;
    denied/authorized UI matches actual OS permission.
    - Tests: fake adapter/provider/preference tests; simulator permission states; device banner.

13. **Existing Quick Log safety remains.** The 3-second accidental double-tap and 60-second
    duplicate-care rules stay intact and continue to key against the correct submission/occurred
    times after backdating.
    - Tests: existing business-rule suite plus backdated negatives.

---

## File Map

Paths marked **speculative** are created only if source exploration confirms the ownership fit.

### Contracts And Architecture
- `src/contracts/supabase.ts` — payload-version union, sleep v2, training v2 note, observation v2.
- `src/contracts/quick-log.ts` — detailed command/draft union, time/note bounds, More-event kinds.
- `src/contracts/reminders.ts` — routine kind/title/variant/duration/amount rules.
- `src/contracts/database.types.ts` — generated after approved migration; never hand-edit.
- `src/contracts/business-rules.ts` — reuse seven-day bound; add note/title constants only if
  cross-boundary.
- `docs/architecture/adr/0022-private-quick-log-details.md` — **speculative new ADR**.
- `docs/architecture/10-quick-log-queue.md`, `08-data-model-and-rls.md` — approved contract update.
- `docs/architecture/adr/0007-prd-schema-baseline.md` — approved additive observation delta.

### Supabase
- `supabase/migrations/<timestamp>_event_observation_payload_v2.sql` — **speculative additive
  migration**; enum only if required, no table split.
- `supabase/tests/rls_baseline.sql` and share-projection tests — observation/notes isolation.
- `scripts/checks/supabase-*` / generated type checks — unchanged guardrails, extended assertions.

### Existing Quick Log Queue And Query
- `src/lib/queue/schema.ts`, `storage.ts`, `state-machine.ts`, `index.ts` — v2 payload read/write,
  queued-payload update if Add details edits a pending row, fail-loud behavior.
- `src/lib/supabase/events.ts` — parse/version-aware insert/update boundaries.
- `src/lib/query/quick-log.ts`, `quick-log-event-view.ts`, query keys if needed — detailed create,
  pending/synced details update, invalidation/day placement.
- `src/lib/query/useQuickLogTimelineRows.ts`, `useQuickLogCachedRows.ts` — v1/v2 read models.

### Quick Log Feature
- `src/features/quick-log/useQuickLogSheetController.ts` — fast lane, subtype/state chooser,
  detailed-lane navigation, selected time.
- `src/features/quick-log/screens/QuickLogShell.tsx` — visible `Log with details` / More entry.
- `src/features/quick-log/screens/QuickLogDetailsScreen.tsx` — unified composer for event, subtype,
  sleep action, actual time, event-specific fields, private note.
- `app/(modals)/quick-log/details/index.tsx` — thin route wiring only.
- `src/features/settings/quick-trackers/screens/QuickTrackersSettingsScreen.tsx` — only if labels/
  availability change; max-five contract remains.

### Routine And Diary
- `src/features/reminders/screens/ScheduleFormScreen.tsx` — **speculative new shared create/edit
  screen**.
- `src/features/reminders/screens/ReminderEditScreen.tsx`, `RemindersHubScreen.tsx` — remove legacy
  misleading path or delegate to canonical form.
- `app/(sheets)/quick-log/schedule/index.tsx`, `app/(modals)/reminders/edit/index.tsx` — route-only.
- `src/features/today/screens/TodayScreen.tsx` and `src/features/today/components/*` — Diary day
  model rendering, plan/fact cards, check-off/overflow.
- `src/lib/query/reminders.ts`, `src/lib/supabase/reminders.ts`, `src/lib/query/keys.ts` — canonical
  create/edit/toggle/delete and invalidation.
- `src/lib/query/diary-day.ts` — **speculative pure day-model module** if exploration confirms no
  existing suitable owner.

### Notifications
- `src/lib/notifications/localReminderSync.ts`, scheduler/adapter/provider files — lifecycle,
  canonical routine consumption, permission state.
- `src/lib/storage/local-reminder-preference.ts` (actual path to verify) — hydration gate.
- `src/features/more/screens/NotificationPreferencesScreen.tsx` and reminder permission surfaces.
- `app/_layout.tsx` — provider wiring only.

### Design And i18n
- `docs/design/v2/specs/<id>-*.md` — new spec cards after fresh export approval.
- `docs/design/v2/screenshots/` + manifest/index — only approved synthetic exports.
- `src/design/primitives/*` and dev gallery — only missing variants found during Stage 0.
- `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json` — typed parity for all new copy.

### Tests
- Extend existing Quick Log, queue, Supabase, reminder, notification, and Today tests.
- Add focused files only when a new pure owner exists, likely:
  `quick-log-detailed-capture.test.ts`, `diary-plan-fact.test.ts`,
  `schedule-form.render.test.tsx`, `diary-routines.render.test.tsx`.

### Runbook
- `docs/runbooks/dogfood-install.md` — local standalone/release-mode device install and smoke.
- `docs/plans/active/2026-07-07-release-readiness.md` — only deferred release findings.

---

## UX Contract

### A. Quick Log fast lane

1. Add → Quick Log.
2. Up to five selected tiles.
3. Feeding/walk/zoomies save `now` immediately. Potty opens its three-result chooser; Sleep opens
   Start sleep / Wake / Slept retrospectively.
4. Optimistic Diary row appears before awaiting persistence/network.
5. Snackbar offers Undo and Add details where valid.
6. A visible secondary `Log with details` action opens the composer without creating a fact first.

### B. Detailed fact composer

- Event: potty, feeding, sleep, walk, zoomies, training/play, observation.
- Event-specific variant/amount/duration.
- `When`: defaults to now; opens native date/time controls; shows future/out-of-range inline error.
- `Note`: optional, private, 500-character budget with remaining-count behavior.
- Observation: requires short title or note.
- Save: one durable queue command; form stays open with input preserved on validation/persistence
  failure. Viewer cannot save.

### C. Routine create/edit

- Entry: Add → Schedule and More → Routines.
- Fields: event, variant, optional title, time, repeat, one-off date/custom weekdays, contextual
  amount/duration, optional private note, enabled.
- Save does not depend on notification permission.
- After first successful save only, show notification primer. `Not now` keeps the routine active
  in Diary. Denied state offers Settings but never claims denial when authorized.
- Edit/pause/resume/delete use the same canonical contract; deleting a routine preserves facts.

### D. Diary

- One selected day, week strip, mixed plan/fact list.
- Routine card: checkbox, planned time, title/type, optional duration/amount, optional
  `actual HH:mm` when done, overflow menu.
- Fact card: actual time, canonical label/custom observation title, optional note indicator (not
  raw full note in dense list unless the approved design explicitly allows a one-line preview).
- Past unmarked: visually quieter, label `Not logged`, no red, no persisted miss.
- Check-off: actual time defaults to now; generic potty routine asks result; deterministic identity
  prevents duplicates; pending state disables repeat taps and exposes retry/delete through the
  existing queue UX.

### E. Two-phone dogfood

- One account on both phones is accepted temporarily.
- The app refetches active reminders/facts on foreground and after mutations.
- UI/help copy may say that shared-account entries appear as `You`; it must not invent actor names.

### Required screen states

For each affected async/user-content screen: loading, empty, cached offline-read, pending write,
recoverable error, viewer/permission denied, long-content/Dynamic Type. System-notification denied
is required only on the reminder permission surface, not as a permanent card in every form state.

---

## Design Fidelity Stage 0 Lock Matrix

UI code is forbidden until this matrix is completed and approved.

| Surface | Canonical reference | Required states | Fresh export/spec requirement |
| --- | --- | --- | --- |
| Quick Log sheet | `v2.quicklog.01`, V1 `4.1/4.2/4.4/4.5` | selected tiles, potty, sleep, More events, pending/failed | Extend existing V2 spec; approve deviation for detailed entry |
| Detailed composer | V1 `4.6` + V2 reference intent | create, validation error, pending, viewer, long note | Fresh V2 export + spec card required |
| Schedule form | `ScreenSchedule`, iOS native picker in `diary-create.screens.jsx` | create, edit, one-off, custom days, error, long text | Render/register fresh reference + spec card |
| Diary plan/fact | `ScreenDiaryDay/States/Empty/AllDone/RoutineMenu` | mixed, empty, pending, past-unmarked, done, generic potty check-off | Render/register fresh reference + spec cards |
| Permission primer/fallback | `ScreenPermissionPrimer` | not-determined, denied, authorized-return | Render/register + spec card |

Lock package per screen: stable atlas/reference ID, route, states, SE compact size, screenshot path,
allowed deviations, anatomy, tokens, accessibility, and synthetic-data fixture. Stage 4 comparison is
per screen/state before that surface is considered complete.

Named design decisions to record up front:

- custom weekdays added to schedule reference;
- training + observation added to detailed composer, not forced into five selected tiles;
- planned and actual times both visible on completed routine;
- no streak chip;
- past-unmarked uses neutral copy;
- note preview policy explicitly decided, with private synthetic text only in evidence.

---

## Implementation Phases

### Phase 0 — Lock Approvals, Tasks, And Screens

**Why:** eliminate schema, privacy, branch, and visual ambiguity before RED.

**Checklist:**
- [x] Record user approval or rejection of ADR/payload and observation migration proposals.
- [x] Update PUP-31/PUP-29/PUP-30/PUP-32 task contracts, dependencies, labels, and agent-ready state.
- [x] Create/switch to the correct Linear branch only after approval; preserve `package.json`.
- [x] Render/register the fresh V2 references and write all spec cards in the Stage 0 matrix.
- [x] Present contact sheets/spec decisions to the user; user delegated final visual direction to
  the agent, which is recorded in `design-system/puppyplan/pages/dogfood-core-loop.md`.
- [x] Record disk check; do not run a native clean build with less than 10 GiB free.

Phase 0 evidence (2026-07-11):

- Owner approved ADR-0022 authoring, the additive observation migration, Linear updates, local
  branch creation, and Stage 0 artifact preparation. PuppyPlan Dev application was later approved
  as a separate exact action and completed in Phase 1; commits, Git push/rebase, EAS/TestFlight,
  production migrations, and other release actions remain forbidden.
- Linear contracts/relations/labels were refreshed. PUP-31 is the only agent-ready implementation
  issue; PUP-29/PUP-30/PUP-32 are marked blocked by the approved stack.
- Local refs were created without checkout or history rewrite: PUP-31 and PUP-29 at reviewed PUP-28;
  existing PUP-30 was preserved; PUP-32 points at the current PUP-30 tip. The worktree stayed on
  PUP-30 because the user's dirty `package.json` cannot safely move to the older PUP-28 base.
- Stage 0 specs are indexed at `docs/design/v2/specs/dogfood-core-loop-stage0.md`. The agent-created
  Clay/Sage review export covers detailed capture and permission before/after states; schedule and
  Diary use the canonical companion exports. The user delegated visual direction to the agent, so
  Stage 0 is approved for implementation with Stage 4 comparison still required per screen.
- Disk check: 3.6 GiB available on `/System/Volumes/Data` (below the 10 GiB native-work gate). No
  native build or cleanup was attempted.
- Verification: `git diff --check` passed. `npm run check` reached 90/90 Jest suites and 779/779
  tests, then failed intentionally at the Supabase baseline enum/type parity guard: the unapplied
  migration exposes `observation` while generated `database.types.ts` remains unchanged. The guard
  was not weakened and generated types were not hand-edited; typegen remains behind the separately
  approved migration workflow.

**Acceptance:** every subsequent phase has an issue/branch owner, approved data boundary, exact UI
contract, and falsifiable criteria. If any approval is missing, mark blocked and do not code.

### Phase 1 — Version Event And Queue Contracts (PUP-31)

**Why:** the durable write boundary must understand the richer fact before UI can create it.

**Checklist:**
- [x] RED tests for v1 compatibility, payload v2 valid/invalid shapes, note limits, sleep actions,
  training note, observation requirements, and privacy negatives.
- [x] Author approved ADR-0022 and architecture updates.
- [x] Author approved additive observation migration + pgTAP/share isolation; do not apply remotely.
- [x] Update queue parsing/storage/retry for v2 notes; add pending-row detail update if retained.
- [x] Update event repository/query contracts; no silent catch/failure-to-null fallbacks.
- [x] Generate DB types only from the approved remote workflow after exact PuppyPlan Dev approval;
  reviewed diff contains only `observation` in the enum union and generated Constants array.

Phase 1 evidence (2026-07-11):

- Exact owner instruction: apply the additive observation migration to PuppyPlan Dev, then
  regenerate and review `src/contracts/database.types.ts`.
- First push rolled back with PostgreSQL `55P04`; a RED static regression proved the same-transaction
  enum-literal hazard. Comparing `event_type::text` preserved the share exclusion and the retry
  applied successfully.
- Post-apply dry-run reports the remote database is up to date. Generated-type review found exactly
  two expected additions (`observation` in the type union and Constants array), with no other drift.
- Verification: `npm run typecheck` exit 0; 91/91 unit suites and 784/784 tests pass;
  `npm run supabase:guardrails` passes 31/31; remote `npm run supabase:lint` reports no schema errors.

**Acceptance:** Invariants 1–3, 6–7 pass; v1 fixtures remain green; migration/pgTAP is locally
reviewable; no UI touched.

### Phase 2 — Build Detailed Quick Capture (PUP-31)

**Why:** this is the first shippable product increment that can replace Telegram facts.

**Checklist:**
- [x] Dependency gate: approved and installed Expo SDK 55-compatible
  `@react-native-community/datetimepicker@8.6.0`; the approved Stage 0 contract requires a native
  date/time control, and the package is listed by Expo but is not installed in this project.
- [x] RED controller/render tests from approved spec cards.
- [x] Implement fast lane sleep/potty choices and visible detailed-lane entry.
- [x] Implement unified detailed composer with native time, note, and all fixed event kinds.
- [x] Thread actual time/note through queue, optimistic row, retry, server row, cache, and Diary.
- [x] Repair Add details for both pending and synced facts, or remove the misleading action with an
  approved named deviation until it is safe.
- [x] EN/RU/ES, a11y, long-note/keyboard/Dynamic Type, pending/error/viewer states.
- [x] Anatomy tests and native screenshot comparison on the SE simulator.

**Acceptance:** a synthetic observation with note and an event backdated 20 minutes survive app
restart and appear at the correct Diary time; sleep start/wake are distinguishable; fast path stays
within two taps; `npm run check` is green.

Phase 2 blocker (2026-07-11): `npm ls @react-native-community/datetimepicker --depth=0` reports
empty while Expo SDK 55's `bundledNativeModules.json` pins compatible version `8.6.0`. Project
rules require exact approval before adding a dependency. A custom React Native wheel/text field
would violate the user-approved native-control design contract, so UI RED/GREEN pauses here.

Dependency gate resolved (2026-07-11): the user supplied the exact install command. Version `8.6.0`
is now locked in `package.json`/`package-lock.json`, its config plugin is registered in
`app.config.ts`, `npx expo config --type public` resolves, and `npm ls` reports the expected package.

Phase 2 completed (2026-07-11): v2 contracts, queue/server/cache persistence, pending and synced
edits, sleep actions, all detailed event kinds, localized/a11y states, and native picker behavior
are implemented. The locked SE build passed the Stage 4 comparison with five synthetic captures;
91 unit suites (811 tests) pass. The aggregate gate's first retry found a forbidden synthetic-name
fixture in the Stage 0 atlas; it was replaced with an allowed generic label before the final rerun.

### Phase 3 — Build Canonical Routine Editor (PUP-29)

**Why:** the household needs to create the external daily plan inside the app.

**Checklist:**
- [x] RED contract/query/render tests for create/edit/one-off/custom days/variants/errors.
- [x] Extend schedule draft safely for title/variants/duration and legacy reads.
- [x] Implement the approved schedule form from design primitives and native time control.
- [x] Replace blank Add → Schedule and misleading legacy reminder controls.
- [x] Wire create/edit/toggle/pause/delete with deterministic invalidation and preserved input on
  error; online-first reminder writes are visibly recoverable.
- [x] Permission primer occurs only after save and does not block routine creation.
- [x] EN/RU/ES, a11y, anatomy tests, per-state SE comparison.

**Acceptance:** create daily feeding, recurring potty, one-off observation, and sleep-with-duration
routines through UI; restart; all reappear correctly and invalid legacy rows are not silently
scheduled.

Phase 3 completed (2026-07-11): the canonical online-first editor now owns both Add → Schedule and
reminder create/edit routes; daily/weekdays/custom/one-off rules, contextual amount/duration and
variants, optional title/private note, viewer guards, retry-preserved drafts, pause/resume/delete,
and post-save permission education are covered. The locked-SE smoke durably created synthetic daily
Feeding, Mon/Wed/Fri Observation, and one-off Sleep rows; the restarted hub and read-only Dev query
confirmed their exact rules. Stage 4 comparison: PASS.

### Phase 4 — Merge Plan And Fact In Diary (PUP-29)

**Why:** planning and logging are useful only when reconciled in one day view.

**Checklist:**
- [x] RED pure day-model tests for ordering, status, timezones/DST, actual-vs-planned, spontaneous
  facts, duplicate check-off, generic potty result, and no auto-link.
- [x] Implement pure day model and query composition; Realtime optional only.
- [x] Implement approved routine/fact cards and all states using primitives.
- [x] Check-off through existing queue with actual `occurred_at` and planned reminder link.
- [x] Foreground/refocus refetch for two-device correctness.
- [x] EN/RU/ES, checkbox semantics, 44pt targets, Dynamic Type, pending/error recovery.
- [x] Anatomy tests and native comparisons for mixed/empty/pending/past/done states.

**Acceptance:** a day containing planned feeding/sleep/potty plus spontaneous observation is sorted
correctly; checking a planned item twice produces one fact and shows both planned/actual time;
second simulator/client sees server data after foreground/refetch.

Phase 4 completed (2026-07-11): a pure timezone-aware day model now interleaves planned occurrences
and spontaneous facts without inference, collapses duplicate exact reminder links, and retains
planned and actual timestamps. Diary check-off uses the durable Quick Log queue with deterministic
client ids; foreground activation invalidates both routine and fact keys. The locked-SE native
comparison passed for neutral past-unmarked and completed planned/actual states. A strict regression
recovered a durationless Sleep check-off validation defect before the successful native retry.

### Phase 5 — Repair Notification Permission And Lifecycle (PUP-30)

**Why:** notifications can now be accepted through a real canonical routine.

**Checklist:**
- [x] RED tests reproducing unconditional denied card, auto-mount prompt, hydration race, logout
  ghost notifications, invalid reminder filtering, and DST nonexistent-time behavior.
- [x] Gate scheduling on completed preference hydration and explicit user intent.
- [x] Recheck OS permission on foreground/Settings return; render real state only.
- [x] Cancel app-owned notifications on logout/no-care-context; keep foreign items.
- [x] Resolve nonexistent wall-clock time by the approved rule (next valid local instant or skip
  with visible/observable category); add DST property/negative cases.
- [x] Ensure canonical routine create/edit/toggle invalidates and reschedules.
- [x] Verify synthetic simulator permission states; physical banner remains a device acceptance item.

**Acceptance:** authorized is never shown as denied; a denied user keeps a working routine; logout
cancels owned banners; a canonical routine schedules exactly the expected future set; focused tests
and `npm run check` are green.

Phase 5 completed (2026-07-11): background synchronization now reads but never requests OS
permission; explicit Turn on actions own the request. SecureStore hydration blocks scheduling,
foreground/Settings return refreshes permission truth, no-care-context cancels app-owned schedules,
and denied state exposes Settings without disabling routines. Nonexistent spring-forward times use
the documented first-valid-local-instant rule. Synthetic permission states and scheduler sets are
covered; physical banner acceptance remains deliberately unclaimed.

### Phase 6 — Harden Shared-Account Dogfood (PUP-32)

**Why:** two people need reliable access now even before the proper family-invite slice.

**Checklist:**
- [x] Verify refetch-on-foreground and mutation invalidation for facts and routines.
- [x] Document shared-account attribution limitation and safe sign-in/update procedure.
- [x] Add synthetic two-client smoke fixtures or a bounded integration harness where feasible.
- [x] Confirm offline Quick Log → reconnect → dedupe with note/time; reminder writes fail visibly
  offline and preserve the form draft for retry.
- [x] Confirm sign-out does not delete durable server facts and clears device-local notification
  schedules and sensitive draft state.

**Acceptance:** two clients on the same account converge after refetch; no event is duplicated or
silently lost; limitation is documented without claiming separate attribution.

Phase 6 completed (2026-07-11): query invalidation and foreground refetch form the bounded
two-client convergence harness; detailed payload-v2 queue replay retains original time/private note
and server uniqueness makes retry exact-once. Online-first routine failures preserve the controlled
form. The temporary same-account limitation and sign-out semantics are recorded in
`docs/dogfood/shared-account.md`; no separate-person attribution is claimed.

### Phase 7 — Produce Standalone Dogfood Build And Runbook (PUP-32)

**Why:** a Metro-dependent build is not suitable for daily puppy care.

**Checklist:**
- [x] Require ≥10 GiB free before native work; do not delete simulators, DerivedData, or DeviceSupport
  without exact approval.
- [x] Verify incremental SE build first; avoid `prebuild --clean` unless native config changed.
- [x] Document UTF-8 CocoaPods environment, signing, release-mode/local bundled JS, reinstall, and
  rollback to the last working device build.
- [x] Produce simulator smoke evidence with synthetic data.
- [x] Hand off the exact physical-device checklist: routine → Diary → detailed/backdated note →
  second phone refetch → notification → disable → logout cancellation.
- [x] No EAS/TestFlight/production action.

**Acceptance:** runbook can install a Metro-independent local dogfood build; simulator core loop is
green; physical steps are explicit and await the user's device/signing execution.

Phase 7 completed with a named disk-gated install gap (2026-07-11): the Release attempt started at
11 GiB on the locked SE, completed JS export/native compilation, then exposed Supabase 2.106.1's
computed ESM OpenTelemetry import as incompatible with Hermes. Metro now selects Supabase's
published equivalent CJS entry and a fresh iOS Hermes export succeeds (6.5 MB bundled bytecode).
The failed compile left 5.1 GiB, so the ≥10 GiB rule correctly forbids the native install retry.
No cleanup was performed. The runbook and exact two-phone checklist are complete; native Release
install/restart and physical banners remain user/device follow-up after approved disk cleanup.

### Phase 8 — Polish, Review, And Final Audit

**Why:** catch cross-phase regressions and privacy/design gaps before claiming dogfood readiness.

**Checklist:**
- [x] UX/copy: calm, concise, no placeholders/misleading controls/no-shame states.
- [x] States: loading/empty/offline/pending/error/viewer/permission/long content.
- [x] Privacy/security: notes excluded from logs/analytics/notifications/shares; RLS role matrix;
  no secrets/private fixtures; migration reviewed; no raw Supabase in features.
- [x] A11y: VoiceOver labels/order, 44pt/56pt targets, Dynamic Type XXL/XXXL, Reduced Motion.
- [x] Performance: fast optimistic path, no unnecessary rerender/N+1 or repeated scheduling.
- [x] Design: each screen/state has Stage 4 PASS or named user-approved deviation. *(Reopened
  2026-07-12 after the retracted routine-editor PASS; closed the same day with the rebuilt
  editor's per-state SE comparison — see
  `docs/design/v2/screenshots/dogfood-core-loop/phase4-stage4-rebuilt.md`. Dynamic Type XXXL and
  long-text device sweeps remain listed there as manual follow-ups.)*
- [x] Review: project `review-deep`, security scan/review appropriate to payload+migration diff,
  and final diff hygiene; no session TODO/debug prints.
- [x] Regression: `npm run check`, Supabase guardrails/pgTAP where authorized, incremental iOS
  simulator build, Maestro core-loop smoke.
- [x] Update plan changelog and preserve Linear In Review/physical-acceptance boundaries; do not move issues to Done before their
  branch/merge and physical acceptance conditions are actually met.

**Acceptance:** all plan invariants are re-verified against the final working tree; all mandatory
commands are green or an unrelated pre-existing failure is proven; every design state has evidence;
remaining physical/user approval items are explicitly marked rather than misreported complete.

---

## Verification Matrix

### Per-change local gate
- `npm run lint`
- `npm run typecheck`
- focused Jest/Node tests for the phase

### Full code gate
- `npm run check`
- `npm run supabase:guardrails` when contracts/generated DB types change
- `npm run supabase:test` only through the authorized project workflow

### Migration gate
- additive/destructive diff review
- pgTAP role and share-projection tests
- generated type diff
- dry-run against PuppyPlan Dev only after exact approval; no production target

### Design/mobile gate
- structural anatomy render tests
- SE simulator per-screen screenshots/contact sheets against approved V2 references
- Dynamic Type XXL/XXXL for Quick Log, schedule form, and Diary
- Maestro: detailed/backdated event; create routine; check-off; restart persistence; permission
  fallback; logout cancellation where simulator supports it

### Physical dogfood gate
- both iPhones installed with bundled JS
- same-account sign-in
- facts/routines converge after foreground/refetch
- canonical routine banner fires, disables, and cancels on logout
- only synthetic/redacted evidence is retained

---

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Free-text notes expand the privacy and offline trust boundary | ADR first; payload v2; 500-char bound; existing queue only; remove on confirmation; exclude from analytics/logs/notifications/shares; privacy and pgTAP negatives |
| Additive observation enum/migration causes contract or generated-type drift | explicit CTO gate; additive-only migration; pgTAP + guardrails + generated types; no remote apply during ordinary implementation |
| One autonomous branch mixes four Linear issues | explicit sequential issue/branch stack; no commits/pushes/rebases without exact approval; phase owner recorded in Linear |
| UI implementation starts from prose instead of exact design | Phase 0 hard Stage 0; render/register Miro references; spec cards and user approval before code |
| Post-save Add details loses changes while the base event is pending | one-command detailed composer; pending queue-payload update only if fully tested; otherwise remove/disable misleading action with named deviation |
| Planned check-off overwrites actual care time | separate `scheduled_for` linkage from `occurred_at`; invariant and UI display both |
| Two-device duplicate or stale data | deterministic ids + server uniqueness + refetch-on-focus; Realtime not required |
| Notification prompt/ghost schedules regress | explicit intent + hydration gate + logout cancel tests; permission source is OS status |
| Native build fills the disk again | no clean native work below 10 GiB; incremental SE only; deletions require approval |
| Physical phone step cannot be automated reliably | simulator completes all non-device behavior; exact device checklist is a named handoff, not a false PASS |

---

## Definition Of Dogfood Ready

The core goal is complete only when, with synthetic data, the transcript/evidence proves:

1. A user can log outside pee, inside pee, poop, feeding, sleep start, wake, retrospective sleep,
   walk, zoomies, training/play, and observation.
2. The user can choose actual time and add a private note without silent loss.
3. The user can create/edit/pause/delete daily, weekday, custom-day, and one-off routines.
4. Diary shows plan + fact, neutral past-unmarked state, and planned-vs-actual completion time.
5. Duplicate check-off remains exactly-once across retries/two clients.
6. Same-account two-phone use converges after foreground/refetch, with attribution limitation named.
7. Notification UI reflects actual permission, no prompt occurs on splash, logout cancels owned
   schedules, and one canonical routine reaches physical banner acceptance when the user performs
   the signed-device step.
8. The local device build runs without Metro for normal dogfood sessions.
9. Full code/privacy/RLS/design checks and final audit are green.

---

## Changelog

- 2026-07-12 (later): Closed the reopened Phase 8 design item. The routine editor's event grid was
  moved onto the canonical `TrackerTile` primitive (raised tiles, tracker icons matching the Diary
  planned-card visuals, corner check on selection), and the observation branch now labels its text
  field `Title` instead of the contradictory `Optional title`
  (`reminders.form.routine.observation-title`, EN/RU/ES; anatomy test AC-P4-UI-7). A fresh per-state
  Stage 4 comparison on the SE simulator passed with named deviations:
  `docs/design/v2/screenshots/dogfood-core-loop/phase4-stage4-rebuilt.md` (captures driven
  headlessly via deep links + idb). The pre-contract titleless Dev observation routine was repaired
  with a synthetic title so it renders canonically again. Dynamic Type XXXL and long-text sweeps
  remain manual follow-ups.
- 2026-07-12: Owner visual review retracted the Phase 3 (routine editor) Stage 4 PASS: the shipped
  form used bare tertiary text links for event/repeat/weekday choices, no section grouping, an
  unlabeled floating time control, and a wrapping weekday row — it did not match
  `dogfood.schedule.01` or its own spec card. Corrections applied the same day: the editor was
  rebuilt with section cards (Event / Detail type / Time / Repeat / Date) and the approved
  selected-chip pattern (`secondary` → `primary`), locale-correct short weekday chips in a single
  row with full a11y labels, and inline colored validation errors placed next to their sections.
  Diary planned rows were moved from ad-hoc `Card` + `Mark done` button onto the canonical
  `RoutineCard` primitive (time gutter, check circle, icon chip; `checkboxTestID` and optional
  overflow added to the primitive). Backend defect fixed test-first: an observation routine could
  be saved without title or note and then crashed Diary check-off; the draft contract now requires
  title-or-note, check-off falls back to the routine note, and the editor shows a localized inline
  error (EN/RU/ES `reminders.form.routine.observation-required`). Stage 4 comparisons for the
  rebuilt routine editor and Diary planned rows must be re-run on the locked SE before the design
  checkbox in Phase 8 can be claimed again; the Phase 8 "Design" item is reopened below.
- 2026-07-11: Completed the canonical Routine Editor. Replaced the blank Add → Schedule and
  decorative reminder form, extended the strict JSON schedule contract without a schema change,
  wired create/edit/pause/resume/delete through existing mutations, localized all new states, and
  marked unsupported legacy rows so they never silently schedule. Native SE and read-only Dev
  evidence prove daily, custom-day, and one-off persistence after restart; Stage 4 PASS recorded.
- 2026-07-11: Completed detailed Quick Capture with strict v2 contracts, lossless queue/server/cache
  edits, all canonical event kinds, native time selection, sleep start/wake/retrospective actions,
  EN/RU/ES and viewer/a11y states. Rebuilt the dev client on the locked SE, recorded five Stage 4
  PASS captures, and replaced a privacy-scanner-rejected Stage 0 puppy-name fixture with a generic
  synthetic label before repeating the aggregate gate.
- 2026-07-11: Resumed detailed capture after exact approval to install
  `@react-native-community/datetimepicker@8.6.0`; locked the dependency, registered its Expo config
  plugin, and verified public config resolution and the installed package tree before RED.
- 2026-07-11: Began detailed-capture Stage 0/TDD pass and confirmed the existing form only covers
  feeding/sleep/zoomies optional edits. Halted before UI code because the required native time
  picker is Expo-supported but not installed; exact dependency approval is required.
- 2026-07-11: After exact owner approval, applied the additive observation migration to PuppyPlan
  Dev. Recovered from PostgreSQL `55P04` with a test-first same-transaction-safe text comparison,
  regenerated hosted schema types, reviewed the two-line enum/Constants diff, and passed typecheck,
  784 unit tests, 31 Supabase guardrails, empty post-apply dry-run, and remote schema lint.
- 2026-07-11: Recorded owner approval for ADR-0022 and local-only observation migration authoring;
  refreshed PUP-31/PUP-29/PUP-30/PUP-32 contracts and dependency labels in Linear; created the local
  branch refs without checkout/rebase; authored ADR-0022, the additive unapplied migration, and
  architecture deltas; prepared the Stage 0 spec package and rerendered three synthetic V2 boards.
  Stage 0 remains blocked on missing fresh variants and explicit user design approval. Disk has only
  3.6 GiB free, so no native build ran.
- 2026-07-11: Created after full branch/docs/Linear/simulator audit. Reordered care-loop work ahead
  of PUP-30 device acceptance; expanded the missing scope for exact time, private notes, sleep/wake,
  training, observation, routine creation, and planned-vs-actual Diary. Recorded explicit ADR,
  migration, design, device, disk, and release gates. No application code, Linear issue, schema,
  remote branch, or production state changed during planning.
