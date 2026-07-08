# V2 Nav Redesign — Coverage & Gap Analysis

Date: 2026-06-29
Status: **Stage-0 lock started — native UI implementation still gated per screen.** A repo-native
lock package now exists under `docs/design/v1/specs/`, but route-specific native coding still requires
using the relevant spec card, adding anatomy tests, and recording native-vs-atlas comparison before Done.
Derived from board comparison + DESIGN.md.
Owner: Product owner
Relates to: `DESIGN.md` (§3 Collaboration, §4 Records & Settings, §2 Daily Core), `docs/plans/active/2026-06-25-diary-plan-log-redesign.md`, `docs/plans/active/2026-06-27-diary-pet-nav-design-brief.md`, design-fidelity pipeline (`docs/agents/design-fidelity-pipeline.md`).

## 0. Purpose

Map which screens are **already redesigned** under the new bottom-nav model vs which still
carry the old design / are missing, so the remaining redesign work can be sequenced into the
design-fidelity pipeline (lock artboards → primitives → anatomy tests → atlas compare).

## 1. Sources & method

- **Source / full design + references** — Miro board `uXjVL0aEXPU=` ("PupApp"): raw V2 mockups
  (old nav Today/Health/More), competitor references (Zigzag, Budi, etc.), and a Russian design
  brief note. Read visually via browser; small text is approximate.
- **Updated design (freeze)** — Miro board `uXjVHA5hn48=` ("PuppyPlan V2 — Design Freeze Canvas"):
  a single imported-HTML embed from Claude Design. Read by **decompiling the embed bundle**
  (gzip JS modules) → authoritative for copy and for the section/artboard markers below.
- **Canon** — repo `DESIGN.md` (3508 lines), which the freeze references by section number.

**Confidence:** freeze coverage is derived from the embed's own authored markers
(`// PuppyPlan …`, numbered `// N.N …`, `§x.y` refs) + extracted `title`/`subtitle` strings —
high confidence for *what exists*. Items marked 🟡 need a visual confirm of completeness; items
marked ⛔ are not blocked on visual interpretation and require a named architecture/native-dependency
approval before code.

### Freeze authored scope (from embed source comments)
- `// PuppyPlan - Batch 2 Diary / Create surfaces.`
- `// PuppyPlan Batch 2 — Pet tab`
- `// PuppyPlan — Reminders, More tab, Paywall (DESIGN.md §4.2, 4.4)`
- `// PuppyPlan — Sharing screens (DESIGN.md §3.1 Family, §3.2 Sitter, §3.3 Trainer, §3.3.6 Revoked)`
- `// PuppyPlan — primitive components` + `// PuppyPlan — icon library`
- Numbered artboard markers present: **6.1, 6.2, 6.3** (Family), **8.1, 8.2, 8.3** (Trainer),
  **10.1** (Revoked/Expired), **12.4** (Reminder push, iOS lock-screen), **14.5** (Delete confirm, 2 states).
- Explicit **out-of-batch** notes:
  - `// No standalone health charts or milestone surfaces in this active batch.`
  - `// Profile and lightweight health context are folded into Pet. No standalone [Health tab].`
  - `// Legacy FAB calls remain in old screens, but the [new TabBar+Add replaces them].`
- Two theme variants authored: **A · Dusk**, **B · Minimal** (pick one as canon).
- Component contracts authored: **TabBar + Add, StatusPill, ListRow, TrackerTile, TimePicker**;
  spec notes: **Dynamic Type Risk, Form states, Feedback + motion, Routine lifecycle**.

## 2. New navigation model

Bottom nav changed **Today / Health / More** → **Diary · Pet · More** + a raised central
**Add → Quick Log**. Implications:
- "Today" becomes **Diary**; standalone **Timeline** folds into Diary history.
- "Health" tab is removed; profile + lightweight health **fold into Pet**.
- The corner **Quick Log FAB** is replaced by the central Add button (legacy FAB still on un-migrated screens).

## 3. Legend

- ✅ updated & present in freeze (new nav)
- 🟡 partially in freeze — needs finishing / visual confirm
- ❌ old mockup exists (board `uXjVL0aEXPU=`) but **not yet re-skinned** to new design/nav
- ➕ **net-new** — required by the new model, absent on both boards
- 🚫 explicitly **deferred / out-of-batch** by the freeze itself
- ❓ **open** — scope undecided pending a source check (named inline)
- ⛔ **approval gate** — visual/JS slices are complete; remaining work requires named
  architecture/native-dependency approval before implementation

## 4. Coverage matrix

### Diary (was Today) — DESIGN.md §2.2
- [x] ✅ Layout & anatomy (§2.2.1)
- [x] ✅ Day 1 / first value + empty ("Your Diary starts empty…") (§2.2.2)
- [x] ✅ Day 2 morning (§2.2.3)
- [x] ✅ Household attribution ("Caregiver A logged…/Owner A…") (§2.2.6 / §3.1.8)
- [x] ✅ Accident recovery (§2.2.4) — locked as `diary-accident-recovery`; production
      contract selects `accident_recovery` from inside-potty events and Diary renders the calm
      info-hero anatomy. RED/GREEN evidence recorded in §10; route-wide Stage 4 remains under
      the Diary route gate.
- [x] ✅ After-feeding pattern (§2.2.5) — locked as `diary-after-feeding`; production contract
      emits `feeding_pattern` and Diary renders it as a single soft contextual tip. RED/GREEN
      evidence recorded in §10; route-wide Stage 4 remains under the Diary route gate.
- [x] ✅ Missed reminder on Diary (§2.2.7) — locked as `diary-missed-reminder`; synthetic
      reminder visual anatomy renders as a calm past-unchecked-routine preview with no shame
      language. Live reminder data remains deferred to Reminders production wiring.
- [x] ✅ Day 7 weekly rhythm / summary (§2.2.8) — locked as `diary-weekly-rhythm`; production
      contract selects `day_7_weekly_rhythm` when the week summary exists, with prioritization and
      Diary render coverage. Route-wide Stage 4 remains under the Diary route gate.
- [x] ✅ Loading / empty / offline / pending states (§2.2.9) — locked grouped-state templates are
      covered by RED/GREEN gallery tests and Stage 4 SE captures for loading/offline plus
      pending/error. Clay production-route state polish remains governed by
      `2026-06-30-v2-screen-polish-backlog.md`.

### Quick Log (central Add) — DESIGN.md §2.3
- [x] ✅ Trigger & sheet anatomy (§2.3.1) — tiles Walk/Feeding/Nap/Play/Sleep/Potty
- [x] ✅ Potty / Feeding / Sleep editors (§2.3.3–2.3.5) — Amount, Note, TimePicker, Add to schedule
- [x] ✅ Zoomies editor (§2.3.6) — details screen supports typed Zoomies intensity draft.
      Training quick tracker/editor is intentionally deferred by the accepted 2026-06-23 canonical
      tracker taxonomy; adding it now would require a separate ADR-0007 schema/contract delta.
- [x] ✅ Optional details — Note (§2.3.7)
- [x] ✅ Snackbar / Undo (§2.3.8) — native route anatomy implemented: after-tap success
      snackbar, polite live region, Undo/Add details actions, and `saveSuccess` feedback contract.
      Stage 4 SE native screenshot comparison PASS recorded 2026-07-02 on the production route.
- [x] ✅ Pending / failed / retry (§2.3.9) — failed-save inline row anatomy implemented
      with retry/discard; snackbar replacement uses error feedback; pending mutation events now
      render inline before cached rows refresh. Stage 4 SE native screenshot comparison PASS
      recorded 2026-07-02 for synthetic pending+failed route anatomy.
- [x] ✅ Duplicate warning (§2.3.10) — native route anatomy implemented: warning tint,
      warning glyph, localized save-anyway/cancel actions, and no mutation before explicit confirm.
      Stage 4 SE native screenshot comparison PASS recorded 2026-07-02 on the production route.
- [x] ✅ **Tracker grid "Edit Trackers"** config (§2.3.2 / §4.4.3) — implemented as
      `/settings/quick-trackers`, reachable from Quick Log sheet and More, with implicit-save
      toggle/reorder rows and owner-only guardrails. Stage 4 SE native screenshot comparison PASS
      recorded 2026-07-02.

### Timeline / history — DESIGN.md §2.4
- [x] ✅ **Decision: fold history into Diary** (no standalone Events tab). Filters (per-tracker)
      and a date-range control live *inside* Diary; old standalone Events screen is dropped.
- [x] ✅ Item anatomy / edit / delete / undo within Diary history (§2.4.3–2.4.4) — inline
      Clay history, filter chips, FactCard anatomy, edit action, and swipe/accessibility delete
      are implemented and Stage-4 verified. Durable synced delete RLS/client failure handling is now
      implemented by `20260703235553_fix_event_log_tombstone_rls.sql` plus the Quick Log
      synced-delete port fix. RED pgTAP failed the owner/caregiver `event_log` soft-delete/restore
      positives while viewer/non-member/anon/trainer-share negatives stayed green; GREEN pgTAP passed
      116/116 after the migration. Dev smoke returned `event_soft_delete status=200 count=1`,
      `event_restore status=200 count=1`, and cleanup count 1. Synced delete now shows the shared
      warning Snackbar after durable success and restores through a typed Quick Log restore path.
      History-scroll/fold-in is implemented by the inline `Review history` slice with Stage 4
      evidence at `output/v2-nav-gaps-stage4/diary-history-inline-stage4.jpg`; the More tab no
      longer exposes the legacy Timeline entry point.

#### 4.1 Diary synced-delete snackbar undo follow-up

**2026-07-04 next implementation slice:** route-level synced logged-fact delete undo after the
`event_log` RLS/client blocker was resolved.

**Stage 0 lock**
- Source canon: `docs/design/v2/specs/diary-v2.md` (`4-diary-populated`, `5b-diary-history`),
  `docs/design/v2/reference/diary-create.screens.jsx` Feedback + motion contract
  "Delete: warning + snackbar undo", and `docs/design/v1/specs/03-diary-route.md` item
  edit/delete/undo row.
- Device/screenshot target: iPhone SE 3 compact simulator. Existing Diary history / Quick Log
  snackbar Stage 4 evidence remains valid for anatomy; this slice needs focused route/behavior
  evidence and a native snackbar capture if runtime seeding is available.
- Allowed deviations: no new snackbar visual primitive; use the existing global
  `src/design/primitives/Snackbar` warning tone, 5-second duration, and existing localized Undo
  label. No new schema, migration, native module, or trainer/share mutation path.

**Acceptance Criteria**
- AC-DIARY-DELETE-UNDO-1: a successful synced logged-fact delete waits for the typed
  `deleteSynced` Promise before showing feedback; failed delete must not show an undo snackbar.
- AC-DIARY-DELETE-UNDO-2: success shows the shared warning Snackbar for 5 seconds with localized
  delete copy, localized Undo action, warning haptic metadata, and polite Snackbar anatomy.
- AC-DIARY-DELETE-UNDO-3: pressing Undo calls a typed Quick Log restore path with the same
  `clientEventId`, `eventType`, `householdId`, `puppyId`, and `todayDate`, then invalidates the same
  Diary/timeline query families as synced delete.
- AC-DIARY-DELETE-UNDO-4: restore failure is surfaced through existing calm error feedback and is
  not converted into fake success.
- AC-DIARY-DELETE-UNDO-5: viewer care contexts still receive no write handlers; trainer/share
  projections do not get a base `event_log` mutation path.

**Out of scope**
- History scroll positioning, new filter UI, event edit details changes, offline queue behavior,
  new RLS migrations, and native DatePicker work.

**TDD evidence — 2026-07-04**
- Mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.
- RED command:
  `npm run test:unit -- --runTestsByPath src/test/today-route.render.test.tsx src/test/timeline-route.render.test.tsx src/test/quick-log-mutation.test.ts src/test/supabase-events.test.ts`
  failed as expected: Diary/Timeline showed zero snackbar calls, `restoreSyncedQuickLogEvent` was
  not exported, and `repository.restoreByClientEventId` did not exist.
- GREEN command:
  `npm run test:unit -- --runTestsByPath src/test/today-route.render.test.tsx src/test/timeline-route.render.test.tsx src/test/quick-log-mutation.test.ts src/test/supabase-events.test.ts`
  passed: 4 suites, 61 tests.
- Typecheck: `npm run typecheck` passed.
- Supabase guardrails: `npm run supabase:guardrails` passed: 30/30 static SQL/RLS/typegen checks.
- Final gate: `npm run check` passed: lint, typecheck, 82 Jest suites / 669 tests, 118 node tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing non-failing reduced-motion `act(...)`
  warnings remained unchanged.
- Stage 4: no new snackbar visual primitive or layout anatomy was introduced. This slice reuses the
  already Stage-4-verified global Snackbar host and Diary/Timeline delete action anatomy; runtime
  route evidence is focused behavior/unit coverage. A live native snackbar capture remains optional
  if a seeded synced Diary row is already available in the SE simulator.

#### 4.2 More legacy Timeline entry removal

**2026-07-04 next implementation slice:** remove the remaining user-facing `Timeline` entry point
from More now that history scroll/filtering lives inside Diary.

**Stage 0 lock**
- Source canon: `DESIGN.md` V2 override ("Standalone `Timeline` removed: history lives inside
  `Diary`"), §5 decision 1 in this plan, `docs/design/v2/reference/diary-create.screens.jsx`
  `ScreenDiaryHistory` note "Scrolled history state inside Diary. No Timeline route.", and
  `docs/design/v1/specs/06-more-privacy-paywall.md` More anatomy, which lists reminders,
  notifications, privacy/account, support, paywall, and sharing but does not include Timeline as a
  More row.
- Allowed deviations: keep the legacy `/timeline` modal route and `TimelineScreen` tests as fallback
  infrastructure for now; this slice removes the production More entry point only.
- Device/screenshot target: existing More Stage 4 default-shell screenshot remains valid for row
  anatomy; this slice is a navigation/IA cleanup proven by structural render tests.

**Acceptance Criteria**
- AC-MORE-NO-TIMELINE-1: the production More hub does not render a `Timeline`/Events row under
  Records and notifications.
- AC-MORE-NO-TIMELINE-2: `app/(tabs)/more/index.tsx` no longer wires an `openTimeline` action to
  `router.push('/timeline')`.
- AC-MORE-NO-TIMELINE-3: Reminders and Notifications remain reachable from the same Records and
  notifications section, preserving existing touch-target/list-row anatomy.
- AC-MORE-NO-TIMELINE-4: no i18n strings are removed in this slice; legacy Timeline strings remain
  available while the fallback modal route still exists.

**Out of scope**
- Deleting `app/(modals)/timeline`, removing `TimelineScreen`, changing Diary inline history
  implementation, or changing share/export history policy.

**TDD evidence — 2026-07-04**
- Mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.
- RED command: `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  failed as expected because the More hub still rendered the `Timeline` row under Records and
  notifications (`Expected: null; Received: <View ...>`).
- GREEN command:
  `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/app-shell.render.test.tsx`
  passed: 2 suites / 50 tests.
- Typecheck: `npm run typecheck` passed.
- Final gate: `npm run check` passed: lint, typecheck, 82 Jest suites / 669 tests, 118 node tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing non-failing reduced-motion `act(...)`
  warnings remained unchanged.
- Stage 4: no new UI anatomy, visual primitive, color, typography, or motion state was introduced.
  This is an IA cleanup that removes a stale entry point while preserving the existing More list-row
  anatomy for Reminders and Notifications; structural render tests are the route evidence. Existing
  legacy `/timeline` modal route remains as fallback infrastructure only.

### Pet (new tab) — DESIGN.md §4.1 (folded) + §4.4.2
- [x] ✅ Edit pet profile — Name/Breed/Sex/Current weight/Age (§4.4.2)
- [x] ✅ Lightweight Health in Pet — Vaccinations, Vet visits ("No visit recorded yet"), Add record affordance
- [x] ✅ Template suggestion ("Template timing · dose not verified") (§4.1.5)
- [x] ➕ **Pet tab landing/hub** — native anatomy slice implemented: profile hub + health below +
      actionable Quick Trackers entry. Stage 4 SE native screenshot comparison PASS recorded
      2026-07-02 for the production landing/empty-health state.
- [x] 🚫 **Multi-pet switcher** — out of scope. `multi-pet/foster` is Deferred in
      `puppyplan-prd-v2.md` (§1 "Нет полноценного multi-pet/foster workflow") and
      `docs/architecture/01-principles-and-scope.md` (Deferred list). MVP = single current pet.
- [x] 🚫 Standalone Health tab anatomy (§4.1.1) — out-of-batch (folded into Pet)
- [x] 🚫 Health charts / milestone surfaces — explicitly out-of-batch
- [ ] ⛔ Add Record full flow (§4.1.3) — native route now opens from Pet, shows record-type
      chooser, empty form anatomy, and deterministic loading / pending-write / error / offline-read /
      permission-denied state templates. Stage 4 SE native screenshot comparison PASS recorded
      2026-07-02 for chooser + empty form + the new state templates. Durable create/list refresh is
      now implemented through the typed health-record repository and query hooks. Durable edit/delete/
      restore data-layer contracts are also implemented; production read-only detail-route wiring is
      implemented at `/pet/health-record/[recordId]`. The authored `DHPP, 12 weeks` template
      generation is implemented for active puppies with `age_weeks_estimate === 12`. Health offline
      write architecture is decided by ADR-0019 and the JS-only Health outbox CORE is implemented:
      separate local `health_outbox_item` schema, state machine, retry classification with default
      exponential backoff, storage claim path, terminal-row re-enqueue re-activation, missing-actor
      quarantine, processor replay, and query invalidation are covered by RED/GREEN tests. Focused
      evidence: `src/test/health-outbox.test.ts`, `src/test/health-outbox-storage.test.ts`,
      `src/test/health-records-query.test.ts`. Review audit 2026-07-05: the outbox is NOT yet wired
      into the production mutation path — no production code calls `enqueue` on a failed Health
      mutation and nothing calls `processNextHealthOutboxItem` on reconnect/startup, so failed
      offline Health writes are not yet durably buffered at runtime. Mutation-path wiring
      (enqueue-on-failure + drain trigger) is a deferred follow-up slice. Native DatePicker also
      remains open behind the unapproved native dependency gate after the native build blocker is
      addressed.
- [x] ✅ Edit record / delete (undo) (§4.1.4) — native detail/delete confirm/undo-toast
      anatomy implemented. Stage 4 SE native screenshot comparison PASS recorded 2026-07-02.
      Durable edit/delete/restore data-layer contracts are now implemented with source preservation,
      affected-date invalidation, zero-row delete failure handling, and single-record detail loading.
      Production detail routing and delete + 5-second undo restore snackbar wiring are implemented;
      editable dirty-state UI now saves through the typed update mutation. Seeded production Stage 4
      detail/read, edit, and delete-confirm evidence is recorded. RLS follow-up proof recorded
      2026-07-03: migration `20260703181913_fix_tombstone_update_rls.sql` allows owner/caregiver
      Health soft-delete/restore while preserving viewer/non-member/anon denial. RED pgTAP failed on
      current policy for positive Health tests 78-81, GREEN pgTAP passed 104/104 with the migration,
      and Supabase Dev authenticated-client smoke returned `health_soft_delete status=204 count=1`
      plus `health_restore status=200`; synthetic Health row cleanup returned count 1.
- [x] ✅ Status transitions visualisation Template→Confirmed→Done (§4.1.6) — native detail
      status strip now renders four visible icon+label steps with exactly one active filled state and
      full sequence accessibility label. Stage 4 SE native screenshot comparison PASS recorded 2026-07-02.
- [x] ✅ Vet visit prep card (§4.1.7) — native reference-card anatomy implemented inside Pet
      Health: visit subtitle, four checklist rows, Add item affordance, and non-instruction disclaimer.
      Local checklist completion state is now implemented with primitive checkbox controls. Stage 4
      SE native screenshot comparison PASS recorded 2026-07-02. Durable checklist editing/data
      wiring remains open.
- [x] 🚫 Medication card + "Request a Refill" — out of this wave. `docs/design/v1/specs/05-pet-health.md`
      explicitly defers medication/refill, and §5.3 limits Pet/Health depth to lightweight + minimal CRUD.

### Sharing (lives under More) — DESIGN.md §3.1–3.3 — **fully in freeze** ✅
- [x] ✅ Family list / owner view (§3.1.1 → 6.1)
- [x] ✅ Family invite — role pick / scope confirm (§3.1.2 → 6.2)
- [x] ✅ Invite sent / pending (§3.1.3 → 6.3)
- [x] ✅ Trainer invite — scope selector / ScopeStripe (§3.3.2 → 8.1)
- [x] ✅ Trainer preview — included / excluded (§3.3.3 → 8.2)
- [x] ✅ Trainer accepted read-only view (§3.3.5 → 8.3)
- [x] ✅ Revoked / expired share (§3.3.6 → 10.1) — `/share/[token]` now renders a native
      closed-access shell with neutral privacy copy, locked status, next-step card, and Stage 4
      SE evidence. Live token lookup/provider payload remains deferred.
- [x] ✅ Trusted Sitter mode owner setup shell (§3.2) — More Trainer/Sitter now opens
      `/settings/sitter-mode`, with caregiver row, time window, checklist, visibility preview, and
      enable CTA. Deterministic no-caregiver / pending / active / exit-confirm state templates now
      have dev-gallery coverage. Live enable mutation, real active status, completion push,
      auto-expire, and exit mutation remain open; Stage 4 native SE screenshot comparison passed
      2026-07-02 for the owner shell and compact state templates.
- [x] ✅ Accept-invite flow, caregiver-side (§3.1.4) — `/invite/[token]` native shell
      implemented: inviter/puppy context, caregiver role, included/excluded preview, disclosure,
      Accept/Decline actions, token-safe rendering, and deterministic loading / load-error /
      expired / already-member state templates. Stage 4 native SE screenshot comparison passed
      2026-07-02; live token lookup/accept/decline remain open.
- [x] ✅ Manage household (§3.1.6) — `/settings/household` native shell implemented:
      More Family row opens owner household preview with members, pending invite, non-color-only
      status badges, overflow affordances, privacy-safe invite label, and Invite CTA. Pending invite
      rows now read owner-readable `public.invite` rows when available; live member query, role
      changes, removal, resend/revoke, invite creation, and confirm sheets remain open; Stage 4
      native SE screenshot comparison passed 2026-07-02, with an additional invite-read fallback
      capture on 2026-07-03.
- [x] ➕ **Shareable Puppy Cards** (§3.4) — **decision: IN scope this wave, MINIMAL only**: a static /
      signed-link card + preview + expiry (PRD-allowed). Native shell implemented at
      `/sharing/puppy-card`: More entry, builder fields, health disclosure, 3:4 preview, share CTA,
      public-link disclosure, and active-card list. Rich builder / multi-template editor → roadmap,
      not this wave. Deterministic empty-builder / health-on / share-options / loading /
      pending-write / error / offline-read state templates now have dev-gallery coverage. Live
      OS share sheet handoff is now wired with privacy-safe localized card copy. Signed-link
      creation, expiry editing, and revoke actions remain open; Stage 4 native SE screenshot
      comparison passed 2026-07-02 for the route shell and state templates.

### Reminders / Routines — DESIGN.md §4.2
- [x] ✅ Reminders/Routines hub + lifecycle (Mark done / Back-date / Skip / Pause / Delete; "Diary entries stay")
      — `/reminders` native durable-list hub is implemented with active/off segments, durable row
      grouping, More navigation, and Stage 4 native SE evidence from a synthetic dev-gallery handoff
      shell. Enabled/off toggle persistence and row-level pending feedback are implemented. Row
      delete UI/query wiring now has RLS runtime proof: migration
      `20260703181913_fix_tombstone_update_rls.sql` allows owner/caregiver Reminder soft-delete while
      preserving viewer/non-member/anon denial. RED pgTAP failed on current policy for positive
      Reminder tests 85-86, GREEN pgTAP passed 104/104 with the migration, and Supabase Dev
      authenticated-client smoke returned `reminder_soft_delete status=200 count=1`; synthetic
      Reminder cleanup returned count 1. Mark done/back-date/skip/pause lifecycle actions,
      occurrence generation, and local notification scheduling remain deferred.
- [x] ✅ Reminder push — iOS lock-screen (§4.2.4 → 12.4)
- [x] ✅ Reminder card on Diary (§4.2.5)
- [x] ✅ Quiet hours picker (§4.2.3) — native reminder-edit anatomy slice implemented:
      quiet-hours card, example range, per-puppy toggle, and calm helper copy. Create payload now
      persists the existing quiet-hours toggle to `public.reminder.quiet_hours`; real range editing,
      validation, timezone conversion, and scheduling remain open. Stage 4 native SE screenshot
      comparison passed 2026-07-02.
- [x] ✅ Sitter checklist reminders (§4.2.6) — native structural anatomy implemented
      inside `/reminders/edit`: trusted-sitter source label, person icon slot, left accent rail,
      1/3 progress bar, and localized action set. Stage 4 native SE screenshot comparison passed
      2026-07-02; real sitter checklist data, completion push, scheduling, and pending-sync state
      remain open.
- [x] ✅ Create / edit reminder form (§4.2.2) — native route anatomy implemented at
      `/reminders/edit`: title/name/category/time/repeat/timezone/toggles/helper copy and disabled
      Save state, plus deterministic loading / pending-write / error / offline-read state templates.
      Stage 4 native SE screenshot comparison passed 2026-07-02 for the base form; durable create
      persistence is now wired through the typed reminder repository/query layer. Local notification
      scheduling, occurrence generation, and native post-save capture remain open.
- [x] ✅ Push permission denied — calm in-app state (§4.2.7) — native non-modal permission card
      implemented inside `/reminders/edit`; reminder creation remains visually available and not
      blocked. Stage 4 native SE screenshot comparison passed 2026-07-02; OS settings deeplink
      is now wired through the route's calm permission card. Real permission state wiring remains open.

#### 4.2.7a Reminder permission settings handoff

Stage-0 lock:
- Source: DESIGN.md §4.2.7 and the implemented `/reminders/edit` permission-denied card.
- Scope: route-level handoff only. No native permission prompt, no permission-state probing, no
  scheduling/persistence changes, and no new native module.

Acceptance:
- AC-REM-SETTINGS-1: pressing `How to enable` calls the platform settings handoff through
  `Linking.openSettings()`.
- AC-REM-SETTINGS-2: the reminder edit route stays open; this action must not close the modal or
  block reminder creation.
- AC-REM-SETTINGS-3: if the settings handoff rejects, the route renders the existing reminder
  edit error state instead of swallowing the failure into a no-op.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx` failed as
  expected while the permission-card CTA still had a no-op handler: `Linking.openSettings()` was
  never called and the error state never rendered after a rejected settings handoff.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx` — PASS:
  1 suite, 8 tests.

#### 4.2.7b Reminders Hub optimistic pending feedback

Stage-0 lock:
- Source: `docs/design/v1/specs/12-1-reminders-hub.md` Reminders Hub row pending state.
- Scope: visible in-row pending feedback for the already-implemented durable enabled/off toggle
  mutation only. No occurrence generation, mark-done/back-date/skip/pause/delete lifecycle,
  local notification scheduling, permission probing, schema change, or native module.

Acceptance:
- AC-REM-PENDING-1: while a reminder toggle mutation is pending, the affected durable row renders a
  visible non-color-only pending indicator with stable `reminder-row-pending-${id}` anatomy.
- AC-REM-PENDING-2: the pending indicator uses design primitives, typed EN/RU/ES i18n copy, and an
  icon plus label so status is not color-only.
- AC-REM-PENDING-3: unaffected rows do not render a pending indicator; the existing pending-row
  disabled toggle behavior remains.

TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-hub-route.render.test.tsx` — FAIL as
  expected before implementation: unable to find
  `reminder-row-pending-00000000-0000-4000-8000-000000005101`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-hub-route.render.test.tsx` — PASS:
  1 suite, 6 tests. Existing motion-related `act(...)` warnings remain non-failing.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 76 suites / 612 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing motion-related `act(...)` warnings remain
  non-failing.

### Guidance cards — DESIGN.md §4.3
- [x] 🚫 Guidance card anatomy + states (Read/Practiced/Skip) + topics (§4.3) — deferred for this
      V2 nav-redesign wave by `2026-06-27-diary-pet-nav-design-brief.md` and
      `docs/design/v1/specs/08-deferred-reference.md`. Active Diary now emits no `guidanceCard` and
      ignores legacy guidance card payloads; only the lightweight contextual tip slot remains allowed.

### More tab — DESIGN.md §4.4
- [x] ✅ More tab anatomy (Family / Trainer-sitter / Data and account / Settings / About v1.0.0 / Privacy / Terms)
- [x] ✅ Privacy & account incl. Delete confirm, 2 states (§4.4.5 → 14.5)
- [x] ✅ Subscription / paywall shell — "Choose a plan / Yearly / Monthly / Best value" (§4.4.7)
- [x] ✅ Quick Trackers settings (§4.4.3) — implemented as `/settings/quick-trackers`; see §14.
- [x] ✅ Notification preferences (§4.4.4) — `/settings/notifications` native anatomy slice
      implemented: local reminders, push reminders/sitter completion, quiet hours, timezone rows,
      and More hub navigation. Stage 4 SE native screenshot comparison PASS recorded 2026-07-02.
      OS settings handoff is now wired from the push toggles. Persistence and real permission-state
      wiring remain open.

#### 4.4.4a Notification preferences OS settings handoff

Stage-0 lock:
- Source: DESIGN.md §4.4.4 and the implemented `/settings/notifications` push section.
- Scope: route-level OS settings handoff only. No permission probing, no notification scheduling,
  no persistence, and no new native module.

Acceptance:
- AC-NOTIF-SETTINGS-1: changing a push toggle opens the platform settings handoff through
  `Linking.openSettings()`.
- AC-NOTIF-SETTINGS-2: the route stays open and does not mutate local reminder toggles.
- AC-NOTIF-SETTINGS-3: if the settings handoff rejects, the route renders the existing notification
  preferences error state instead of swallowing the failure.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx` failed as
  expected while the push toggles still had no-op handlers: `Linking.openSettings()` was never
  called and no notification preferences error state rendered after a rejected settings handoff.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx` — PASS:
  1 suite, 25 tests.

#### 4.4.4b Notification preferences durable push toggles

Stage-0 lock:
- Source: DESIGN.md §4.4.4, existing `public.notification_preference` schema/RLS, and the
  implemented `/settings/notifications` push section.
- Scope: durable read/upsert for the two existing push preference booleans only:
  `reminder_push_enabled` and `trusted_sitter_completion_push_enabled`.
- Out of scope: OS permission probing, local reminder scheduling, push token registration,
  quiet-hours editing/persistence, timezone editing, diagnostics, migrations, and new native modules.

Acceptance:
- AC-NOTIF-PERSIST-1: the Supabase boundary can read the current user's household notification
  preference row and parse it through the existing Zod contract.
- AC-NOTIF-PERSIST-2: if no row exists yet, the query layer exposes the app defaults
  (`reminder_push_enabled=true`, `trusted_sitter_completion_push_enabled=true`) without treating the
  missing row as an error.
- AC-NOTIF-PERSIST-3: changing either push toggle upserts the existing `notification_preference`
  row identity (`user_id`, `household_id`) and invalidates the notification preferences query.
- AC-NOTIF-PERSIST-4: the connected `/settings/notifications` route renders loading/error states from
  query status and pending-write/error states from mutation status while keeping the existing OS
  settings handoff behavior.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/notification-preferences-query.test.ts src/test/notification-preferences-repository.test.ts`
  — FAIL before implementation: 2 suites failed, 8 tests failed on
  `notification_preference_*_not_implemented` stubs.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern AC-NOTIF-PERSIST-4`
  — FAIL before implementation: persisted reminder toggle expected `false`, received `true`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/notification-preferences-query.test.ts src/test/notification-preferences-repository.test.ts`
  — PASS: 2 suites, 8 tests.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  — PASS: 1 suite, 27 tests.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts src/test/app-shell.render.test.tsx`
  — PASS: 3 suites, 46 tests.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 74 suites / 592 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing non-failing `act(...)` warnings remain in
  motion-related render tests.

#### 4.4.4c Notification preferences local reminders UI toggle

Stage-0 lock:
- Source: DESIGN.md §4.4.4 and `docs/design/v1/specs/06-more-privacy-paywall.md`
  notification preferences anatomy.
- Scope: local, in-screen control state for the existing `Local reminders` toggle only, so the row
  behaves like a real switch while native scheduling/persistence remains deferred.
- Out of scope: local notification scheduling, native permission probing, durable preference schema,
  push token registration, quiet-hours editing, timezone editing, diagnostics, migrations, and new
  native modules.

Acceptance:
- AC-NOTIF-LOCAL-1: changing `notifications-local-all-toggle` updates the visible toggle value inside
  the mounted notification preferences screen.
- AC-NOTIF-LOCAL-2: changing the local reminders toggle does not call `Linking.openSettings()` and
  does not invoke the push preference mutation callbacks.
- AC-NOTIF-LOCAL-3: push toggles keep their existing OS settings handoff and durable push preference
  behavior unchanged.

TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern AC-NOTIF-LOCAL`
  — FAIL as expected before implementation: local reminders toggle stayed `true` after
  `valueChange=false`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern AC-NOTIF-LOCAL`
  — PASS: 1 focused test.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx` — PASS:
  1 suite, 29 tests.
- `npm run test:unit -- --runTestsByPath src/test/notification-preferences-query.test.ts src/test/notification-preferences-repository.test.ts`
  — PASS: 2 suites, 8 tests.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 76 suites / 616 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing non-failing reduced-motion `act(...)`
  warnings remain unrelated to this slice.
- Stage 4 note: default `/settings/notifications` native screenshot evidence remains the
  2026-07-02 PASS already recorded for the same route anatomy. This slice does not add new layout,
  copy, tokens, or native state; the new transient off-state is covered by structural render
  assertions and keeps scheduling/persistence deferred.

#### 4.4.4d Notification preferences local reminders opt-out persistence

Stage-0 lock:
- Source: DESIGN.md §4.4.4 and `docs/design/v1/specs/06-more-privacy-paywall.md`.
- Scope: persist only the existing `Local reminders` on/off preference on device, so a user opt-out
  survives route remounts. Stored data is a single boolean flag; no puppy, household, user, reminder,
  notification body, push token, or private content is stored.
- Out of scope: local notification scheduling/cancellation, native permission probing or requests,
  push token registration, quiet-hours editing/persistence, timezone editing, diagnostics, Supabase
  schema changes, migrations, new native modules, and `ios/` / `android/` edits.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-NOTIF-LOCAL-PERSIST-1: the storage boundary reads a missing local reminder preference as the
  default enabled state.
- AC-NOTIF-LOCAL-PERSIST-2: changing `notifications-local-all-toggle` writes the local preference
  and the connected `/settings/notifications` route reflects the stored value after remount.
- AC-NOTIF-LOCAL-PERSIST-3: local reminder preference read/write failures are reported through the
  shared observability boundary with stable non-PII context and render the existing notification
  error state instead of failing silently.
- AC-NOTIF-LOCAL-PERSIST-4: local reminder changes do not call `Linking.openSettings()`, do not call
  push preference mutations, and do not change the durable Supabase push preference row.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/local-reminder-preference.test.ts src/test/more-settings.render.test.tsx --testNamePattern "AC-NOTIF-LOCAL-PERSIST"` failed before
  implementation because the storage stub never called `getItem`/`setItem`, always returned
  enabled, ignored storage failures, ignored the injected local-reminder screen props, and did not
  surface connected local preference read failures.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/local-reminder-preference.test.ts src/test/more-settings.render.test.tsx --testNamePattern "AC-NOTIF-LOCAL-PERSIST"`:
  2 suites / 6 tests passed after adding the SecureStore-backed local preference controller and
  connected screen wiring.
- `npm run test:unit -- --runTestsByPath src/test/notification-preferences-query.test.ts src/test/notification-preferences-repository.test.ts src/test/more-settings.render.test.tsx src/test/local-reminder-preference.test.ts`:
  4 suites / 49 tests passed, covering the unchanged durable push preference query/mutation path.
- `npm run typecheck`: passed.
- Stage 4 screenshot not recaptured for this slice: anatomy and visual copy are unchanged from
  §4.4.4c; this slice only persists the existing switch state and error path.

#### 4.4.5a Privacy & Account route shell

Stage-0 lock:
- Source: DESIGN.md §4.4.5 and `docs/design/v1/specs/06-more-privacy-paywall.md`.
- Route: `/settings/privacy-account` from the More hub `Data and account` row.
- Scope: native privacy/account shell, local consent toggles, local export-request notice, and local
  delete-confirm preview only.
- Out of scope: real data export, account deletion, sign-out mutation, analytics consent persistence,
  crash-report preference persistence, backend ticket/job creation, schema changes, and native modules.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-MORE-PRIVACY-1: More `Data and account` row is an active chevron row and opens
  `/settings/privacy-account`.
- AC-MORE-PRIVACY-2: `/settings/privacy-account` renders modal header, Consents, Error collection,
  Your data, and Account sections with typed EN/RU/ES copy.
- AC-MORE-PRIVACY-3: Usage analytics and Error reports use native switch anatomy and toggle local
  in-screen state without persisting or calling external services.
- AC-MORE-PRIVACY-4: Export row shows a local, privacy-safe request notice without performing a live
  export.
- AC-MORE-PRIVACY-5: Delete account opens a local confirm preview; the destructive action remains
  disabled until the user types the localized confirmation word, and no live deletion occurs.
- AC-MORE-PRIVACY-6: route/navigation contract, shell i18n, and scaffold guardrails include
  `/settings/privacy-account`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/navigation-contract.test.ts --testNamePattern "editable settings|planned route files"`
  failed as expected while `settingsRoutes` and `plannedRouteFiles` did not include
  `/settings/privacy-account`.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern "AC-MORE-PRIVACY|privacy row active|opens Pet settings"`
  failed as expected while More still rendered `Data and account` as a disabled Deferred row.
- `node scripts/checks/check-navigation-contract.mjs` failed as expected while the executable locked
  settings route list did not include `/settings/privacy-account`.
- Stage 4 visual follow-up exposed `ScreenHeader` compact title truncation/overlap on the SE route
  screenshot; `npm run test:unit -- --runTestsByPath src/test/screen-header.render.test.tsx --testNamePattern "wide center lane"`
  failed as expected before the primitive allowed the single-line title to shrink.

GREEN / regression evidence:
- Added `PrivacyAccountScreen` and `/settings/privacy-account` route shell. More now opens the active
  chevron row; the screen uses design primitives for local analytics/error-report toggles, export
  notice, and typed delete-confirm preview. No live export/delete/sign-out/persistence/backend call,
  schema change, native module, or native-project edit was introduced.
- Updated route/navigation contract, shell i18n keys, and local Expo typed routes so
  `router.push('/settings/privacy-account')` typechecks.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx` — PASS: 32/32.
- `npm run test:unit -- --runTestsByPath src/test/navigation-contract.test.ts` — PASS: 12/12.
- `npm run test:unit -- --runTestsByPath src/test/screen-header.render.test.tsx` — PASS: 5/5
  (existing reduced-motion `act(...)` warning remains non-failing).
- `node scripts/checks/check-i18n.mjs` — PASS.
- `node scripts/checks/check-navigation-contract.mjs` / `node scripts/checks/check-shell-i18n.mjs` /
  `node scripts/checks/check-scaffold-guardrails.mjs` — PASS.
- `npm run typecheck` — PASS after regenerating local Expo typed routes with
  `npx expo start --localhost`.
- `npm run check` — PASS: lint, typecheck, 76 Jest suites / 620 tests, 118 node tests,
  navigation/shell/i18n/scaffold guardrails, tokens, privacy scan, and text hygiene. Existing
  reduced-motion React `act(...)` warnings remain non-failing.
- Stage 4 PASS on primary SE simulator (`Grith iPhone SE 3 iOS 26.3`,
  `5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) using installed PuppyPlan.app over Metro:
  `output/v2-nav-gaps-stage4/settings-privacy-account-stage4.jpg`. Runtime snapshot exposed the
  full `Data and account` title, More back action, analytics/error switches, export row, and delete
  row. The first screenshot exposed title truncation and row-hint clipping; fixed via
  `ScreenHeader` single-line font fitting and full-width privacy hints before recording PASS.

#### 4.4.5b Privacy & Account sign-out action

Stage-0 lock:
- Source: `docs/design/v1/specs/06-more-privacy-paywall.md` privacy/account anatomy and
  always-available soft-lock actions.
- Scope: expose the existing authenticated sign-out action inside `/settings/privacy-account`
  using the shared `SignOutButton` and auth boundary. No export job, account deletion, consent
  persistence, backend call beyond existing sign-out, schema change, native module, analytics
  payload, or native project edit is introduced.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-MORE-PRIVACY-SIGNOUT-1: `/settings/privacy-account` renders a localized Sign out action in the
  Account section.
- AC-MORE-PRIVACY-SIGNOUT-2: pressing the action calls the existing auth `signOut()` path, not a
  route-local fake state.
- AC-MORE-PRIVACY-SIGNOUT-3: existing `SignOutButton` failure handling remains responsible for
  visible localized error feedback.
- AC-MORE-PRIVACY-SIGNOUT-4: real export, account deletion, analytics/error-report persistence,
  backend jobs, schema changes, native modules, and native project edits remain deferred.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern "AC-MORE-PRIVACY-SIGNOUT|Privacy Account route shell"`
  failed before production code because `/settings/privacy-account` exposed no localized Sign out
  button in the Account section.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern "AC-MORE-PRIVACY-SIGNOUT|Privacy Account route shell"`
  passed: 1 suite, 2 focused tests.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/sign-out-button.render.test.tsx --testNamePattern "AC-MORE-PRIVACY-SIGNOUT|Privacy Account route shell|sign-out failures"`
  passed: 2 suites, 3 focused tests.

Implementation notes:
- `PrivacyAccountScreen` now reuses the existing `SignOutButton`, so success and localized
  failure feedback continue to flow through the shared auth/snackbar boundary. Real export,
  account deletion, analytics/error-report persistence, backend jobs, schema changes, native
  modules, and native project edits remain deferred.
- Stage 4 PASS (2026-07-03): launched the already installed PuppyPlan.app on the primary SE
  simulator over `npx expo start`, opened `puppyplan://settings/privacy-account`, and verified the
  runtime snapshot includes `Data and account`, `Export your data`, `Delete account`, and tappable
  `Sign out`. Native evidence:
  `output/v2-nav-gaps-stage4/settings-privacy-account-signout-stage4.jpg`.

#### 4.4.5c Privacy & Account State Templates (§4.5)

**2026-07-03 global-state slice:** deterministic `/settings/privacy-account` loading,
pending-write, error, offline-read, and permission-denied state templates for §4.5.

- Source spec card: `docs/design/v1/specs/14-5-privacy-account.md`.
- Source atlas: `docs/design/v1/screenshots/more/14-5.png`,
  `docs/design/v1/screenshots/more/14-6.png`.
- Route/component: `/settings/privacy-account` via
  `src/features/more/screens/PrivacyAccountScreen.tsx`.
- Dev-gallery handoff: `/_dev/components` should render the state templates inside a visible
  `SyntheticPrivacyAccountStatesShell`.
- Allowed deviation: this slice only standardizes deterministic state cards and dev-gallery
  handoff. Real export jobs, account deletion jobs, analytics/error-report persistence, backend
  jobs, schema/native modules, and `ios/` / `android/` edits remain out of scope.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-MORE-PRIVACY-STATES-1: the privacy/account surface exposes deterministic loading,
  pending-write, error, offline-read, and permission-denied state templates with stable
  `privacy-account-state-*` test IDs.
- AC-MORE-PRIVACY-STATES-2: each state uses design primitives (`Card`, `StatusPill`, `AppIcon`,
  `AppText`) and typed EN/RU/ES i18n status/title/body copy.
- AC-MORE-PRIVACY-STATES-3: loading and pending-write announce politely; error and
  permission-denied use alert semantics; offline-read uses the muted template surface.
- AC-MORE-PRIVACY-STATES-4: state copy exposes no raw puppy names, notes, emails, provider names,
  photos, tokens, diagnostics payloads, or private contact data.
- AC-MORE-PRIVACY-STATES-5: the dev-gallery route-shell preview includes all five privacy/account
  state templates for native Stage 4 handoff.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern AC-MORE-PRIVACY-STATES`
  failed as expected before implementation because `PrivacyAccountStatePreview` was not exported.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern "route-shell preview states"`
  failed as expected before implementation because `SyntheticPrivacyAccountStatesShell` was not
  exported/rendered.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern AC-MORE-PRIVACY-STATES`
  — PASS: 1 suite, 1 matching test.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern "route-shell preview states"`
  — PASS: 1 suite, 1 matching test.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/dev-gallery.render.test.tsx src/test/i18n.test.ts`
  — PASS: 3 suites, 55 tests.

Stage 4 evidence:
- Primary SE simulator: `Grith iPhone SE 3 iOS 26.3`
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).
- Installed `PuppyPlan.app` launched over `npx expo start --localhost` in development-build mode,
  then opened `puppyplan:///_dev/components`.
- Runtime snapshot confirmed `Data and account`, `Privacy and account loading, saving, error,
  offline, and sign-in-required states.`, `Showing saved privacy controls`, and
  `privacy-account-state-permission-denied`.
- Evidence files:
  `output/v2-nav-gaps-stage4/settings-privacy-account-states-top-stage4.jpg`,
  `output/v2-nav-gaps-stage4/settings-privacy-account-states-bottom-stage4.jpg`.

- [x] ✅ App support / help (§4.4.6) — `/settings/help` native anatomy slice implemented:
      topic shortcuts, diagnostics rows, privacy-safe support note, and More hub navigation.
      Stage 4 SE native screenshot comparison PASS recorded 2026-07-02. Email handoff is now wired
      as a privacy-safe mail draft; diagnostics upload remains open.

#### 4.4.6a Help support email handoff

Stage-0 lock:
- Source: DESIGN.md §4.4.6 and the implemented `/settings/help` support note row.
- Scope: route-level email draft only. No backend ticket creation, no diagnostics upload, no
  private user data collection, and no automatic send.

Acceptance:
- AC-HELP-SUPPORT-1: pressing `Prepare support note` opens a `mailto:` draft to the public support
  address from typed i18n.
- AC-HELP-SUPPORT-2: the draft subject/body are localized and privacy-safe; the body reminds the
  user not to include puppy names, notes, emails, providers, photos, or tokens.
- AC-HELP-SUPPORT-3: if the platform handoff rejects, the screen renders a visible support error
  state instead of swallowing the failure.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx` failed as
  expected while `Prepare support note` still had a no-op handler: `Linking.openURL()` was never
  called and no visible support error rendered after a rejected email handoff.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx` — PASS:
  1 suite, 23 tests.
- `node scripts/checks/check-i18n.mjs` — PASS.
- [x] ✅ Full PuppyPlan Plus screen (features list + Restore purchases) — `/paywall` native shell
      implemented: feature list, annual/monthly/lifetime plan rows, primary CTA, Restore purchases,
      soft-lock note, and deterministic loading / pending-purchase / purchase-error / offline-read /
      active-subscription state templates. Stage 4 SE native screenshot comparison PASS recorded
      2026-07-02 after the compact modal header fix. Live IAP/restore/purchase provider wiring
      remains open.

### Onboarding / intake — DESIGN.md §2.1
- [ ] ⛔ First-run variants — visual slices are implemented across Welcome, Puppy Setup, Tracker
      Selection, Plan Reveal, First Log, and post-value account/notification prompt previews.
      The post-first-value Quick Log source-marker scheduler and 48-hour prompt cadence are now
      implemented; permission probing, native OS permission request, and native DatePicker
      integration remain explicitly deferred/partial under the rows below. Blocker audit 2026-07-03:
      `expo-notifications` is not installed, so real permission probing/request would add a new
      native dependency; native DatePicker has the same dependency gate. Completion audit 2026-07-04:
      this is an Approval Gate, not a missing visual slice. Required named decisions: (1) approve or
      reject an `expo-notifications` native-module slice for permission probing/request, token
      registration, and scheduling; (2) approve or reject the native DatePicker dependency once the
      native build path is viable.
- [x] ✅ Welcome (§2.1.1) — native initial `/onboarding` anatomy implemented: decorative warm
      illustration frame, locked H1/subtitle, primary setup CTA, and secondary sign-in action.
      Stage 4 native SE screenshot comparison passed 2026-07-02.
- [ ] ⛔ Puppy Setup (§2.1.2) — native profile-step chrome/stepper slice implemented: visible
      back/step chrome, age section label, locked age-stepper anatomy, birth-date date-zone wrapper,
      and disabled-until-name CTA behavior. Stage 4 native SE screenshot comparison passed
      2026-07-02; real platform DatePicker replacement remains open. Blocker audit 2026-07-03:
      no native DatePicker package is present, and adding one is a native-dependency decision while
      the local native rebuild path is blocked. Completion audit 2026-07-04: this is an Approval
      Gate, not a remaining Clay anatomy gap; do not replace it with a bespoke JS date picker unless
      the design spec is explicitly changed.
- [x] ✅ Age Hint (§2.1.3) — native profile-step inline hint implemented: info icon, status info tint,
      localized age-range copy, and accessible "Hint. …" label before tracker selection. Stage 4
      native SE screenshot comparison passed 2026-07-02.
- [x] ✅ Quick Tracker Selection (§2.1.4) — native tracker-step chrome/anatomy slice implemented:
      visible Step 3 chrome, helper copy, selected checkmark, selected/unselected a11y labels,
      zero-selected Skip Selection CTA, and skip-to-default save normalization. Stage 4 native SE
      screenshot comparison passed 2026-07-02.
- [x] ✅ Plan Reveal (§2.1.5) — native value-moment anatomy slice implemented: puppy summary row,
      Honey/accent HeroCard 96pt, three separate DailyCard starter actions, and bottom first-log CTA.
      Stage 4 native SE screenshot comparison passed 2026-07-02.
- [x] ✅ First Log (§2.1.6) — native first-value completion anatomy implemented: Diary chrome,
      pending/local-only state, no pre-value account pressure, and celebration snackbar. Real Quick
      Log sheet selection/persistence remains covered by Quick Log slices; Stage 4 native SE
      comparison passed for content/chrome and transient celebration snackbar visual capture 2026-07-02.
- [x] ✅ Account/Notifications prompts (§2.1.7) — post-first-value V2 native preview slices
      implemented as skippable SheetSurface prompts with account and quiet-reminder actions.
      Stage 4 native SE screenshot comparison passed 2026-07-02; notification settings handoff is
      wired through the quiet-reminder prompt. The route/source-marker runtime scheduler and
      48-hour re-prompt cadence are now implemented; native permission probing remains deferred.

### Cross-cutting
- [x] ✅ **Apply new TabBar (Diary/Pet/More + Add) to every migrated screen** — the tab shell now
      delegates bottom chrome to `CapsuleTabBar`; legacy Today/Health aliases are hidden with `href:null`;
      V1 FAB tab-layout assertions are retired; no default full-width tab bar or absolute bottom-right
      FAB remains under `app/(tabs)`. See §36.
- [x] ✅ **Global screen states** (Loading / Empty / Offline read banner / Pending write / Permission
      denied / Revoked) re-applied per new screen (§4.5) — primitives (StatusPill, Form states) exist;
      in-scope migrated screen coverage is now complete. Health Add Record now has RED/GREEN state templates for
      loading, pending write, error, offline read, and permission denied plus Stage 4 SE captures;
      Reminder Edit now has RED/GREEN state templates for loading, pending write, error, and
      offline read plus compact dev-gallery and Stage 4 SE captures; Notification Preferences now
      has RED/GREEN state templates for loading, pending write, error, and offline read plus
      dev-gallery coverage; Help Support now has RED/GREEN state templates for loading, pending
      write, error, and offline read plus dev-gallery and Stage 4 SE evidence;
      PuppyPlan Plus now has RED/GREEN templates for loading products, pending purchase, purchase
      error, offline read, and active subscription plus dev-gallery coverage;
      Accept Invite now has RED/GREEN templates for loading, load error, expired, and
      already-member plus dev-gallery coverage;
      Shareable Puppy Card now has RED/GREEN templates for empty builder, health disclosure,
      share options, loading, pending write, error, and offline-read plus dev-gallery coverage;
      Sitter Mode now has RED/GREEN templates for no caregiver, pending, active, and exit-confirm
      plus dev-gallery coverage;
      Quick Trackers settings now has RED/GREEN templates for loading, error, empty, and
      owner-only access plus dev-gallery and Stage 4 SE evidence;
      Pet Health main list now has RED/GREEN templates for loading, error, and offline-read
      plus production route loading/error wiring, dev-gallery coverage, and Stage 4 SE evidence;
      Privacy & Account now has RED/GREEN templates for loading, pending-write, error,
      offline-read, and permission-denied plus dev-gallery coverage and Stage 4 SE evidence;
      Reminders Hub now has RED/GREEN templates for loading, pending-write, error, offline-read,
      and empty plus dev-gallery coverage and Stage 4 SE evidence;
      Quick Log Details now has RED/GREEN templates for loading, pending-write, error, offline-read,
      and permission-denied plus dev-gallery coverage and Stage 4 SE evidence. Remaining state-like
      work is explicitly owned by the separate blocked/deferred rows for native pickers, offline
      queues, permission probing, and Health soft-delete RLS.
- [x] ✅ **Theme resolved** → B · Minimal canonical (see §5.2)

## 5. Decisions (resolved 2026-06-29)
1. **Events/Timeline** → ✅ **fold history into Diary** (filters + date-range inside Diary; no standalone Events).
2. **Theme** → ✅ **B · Minimal = canonical light theme**; Dusk's warm tints reused only for accent
   moments (celebration / empty-state / onboarding hero); Dusk palette → basis for future **dark mode** (v2).
   Rationale: contrast + Dynamic Type + outdoor legibility + "whitespace = calm" + solo-dev maintainability.
6. **Primary CTA colour** → ✅ **terracotta `#c96442`** (as the freeze already uses). **Applied 2026-06-30:
   DESIGN.md §2.3/2.4** — primary moved from the retired Calm Teal ramp to a terracotta ramp; Ember Coral stays
   celebration-only. Needs a proper ramp + `text/on-primary` contrast re-check (white on `#c96442` ≈ 4.0:1 —
   may need a slightly darker 600 stop to clear 4.5:1).
3. **Pet/Health depth** → ✅ **lightweight + minimal CRUD** (profile + list + add/edit + status Template→Confirmed→Done). Defer charts/milestones/medication+refill.
4. **Onboarding** → ✅ **re-skin now** (activation funnel + trial/paywall placement depends on it).
5. **Shareable Puppy Cards (§3.4)** → ✅ **in scope this wave — minimal signed-link/static card only**
   (preview + expiry). Rich builder deferred to roadmap to keep the wave shippable for a solo dev.

## 6. Monetization model — time-gated soft-lock (decided 2026-06-29)

Decided with founder given the **solo-dev constraint**: avoid deep per-feature freemium (too much to
build/maintain). A 3-agent panel (competitor / audience-JTBD / strategy) informed the trade-offs; the
chosen model is a **time-gated trial → soft-lock**, collapsing monetization to a single entitlement check.

> **Scope boundary — model decided, enforcement deferred.** Per `puppyplan-prd-v2.md` §1
> ("Нет обязательного live IAP/paywall до подтверждения beta retention") and the
> `01-principles-and-scope.md` Deferred list ("live IAP/subscription provider"), **live paid
> enforcement does NOT ship in this nav-redesign wave.** This wave ships only: the paywall + soft-lock
> *design surfaces* and a **feature-flagged-off** entitlement shell. Turning enforcement on (real IAP,
> live write-gate) is a separate future plan gated behind confirmed beta retention.

### 6.1 Model
- **Days 0–30: full access, no card, paywall skippable.** The whole app works (the single MVP pet,
  all sharing, full history, all reminders) — free for the first 30 days.
- **Day 30+ without active subscription → soft-lock:** subscription gates **writes** only.
  **Read-only viewing + export of own data always stays available. Trainer share link stays live
  regardless** of the owner's subscription (no-account `WebFrame` projection — keeping it on is less
  code than gating it, and preserves the referral loop).
- **Entitlement = one check:** `active subscription OR within 30-day trial` → gates writes only.
  **Trial clock anchor:** starts at the first durable puppy profile's `household.created_at` (NOT
  auth-user creation, NOT first app open); tied to the Supabase account so reinstall does not reset it.
  *(Anchor to confirm at implementation.)*

**Write taxonomy (precise — a single `gates writes` boolean is too blunt and could brick safety/privacy actions):**
- **Gated at soft-lock:** create new logs/routines/reminders, edit existing entries, create new
  shares/invites.
- **ALWAYS allowed (even expired trial, no sub):** export own data, delete own data, delete account,
  privacy/account settings, revoke an existing share, restore / manage subscription, notification
  opt-out, sign-out, read-only viewing. *(Required by the "silent failures = lost data" rule and the
  privacy guardrails — these must never sit behind a paywall.)*

### 6.2 Why this model (and what it removes)
- **Simplicity (the point):** one boolean, not a feature matrix. **Removes** per-feature gating,
  2nd-pet gate, trainer-depth gate, history-window gate, reminders cap, seat counting,
  archive-not-delete. Paying = full app; trial = full app; expired = read-only + export. (This is why
  the per-feature questions — reminders cap, history window, 2nd-pet, trainer-depth — are now moot.)
- **Conversion (read with care):** RevenueCat's D35 benchmark (hard paywall 10.7% vs freemium 2.1%)
  supports moving paywall timing *earlier/stronger* — but our model (30-day free, no card upfront,
  skippable first paywall) is an **app-managed free-access period, not a hard paywall**, so that ~5×
  figure does **not** transfer directly. Treat it as directional evidence to A/B test, not a forecast.
- **Two landmines defused vs a pure hard wall:** (a) never brick a user's own data → no "data hostage"
  1-star reviews, satisfies the "silent failures = lost data" rule; (b) keep the trainer link live →
  preserve the only affordable growth channel for a solo dev.

### 6.3 Plans & trial
- **Annual $39.99/yr (default)** + **Monthly $8.99 (anchor)** + **Lifetime / "puppyhood pass" ~$79–99
  (one-time)**. Annual pre-selected, "$3.33/mo" framing; lifetime captures cash from high-intent early
  adopters (fits a time-boxed product).
- **30-day trial**, no card upfront, first paywall **skippable** (aligns with PRD "no first-screen
  hard paywall" + "paywall after value moment"). Long trial converts better than short.
- Optional later: **graduation path** (transition to a lightweight adult-dog record) to extend LTV
  past the ~90-day puppy window.

### 6.4 Design surfaces this implies (➕ — much smaller than feature-freemium)
- [x] ➕ **Paywall screen** (fills the flagged `NoOpEntitlementProvider` shell): 3 plan cards
      (annual preselected + monthly + lifetime), value bullets, trust row + **Restore Purchases**,
      real-reviews slot (ship empty — no fake social proof). Two entries: skippable early version +
      day-30 gate version.
- [x] ➕ **Trial status indicator** — subtle "X days left" (gentle, non-nagging).
- [x] ➕ **Soft-lock state** — read-only banner ("Subscribe to add new entries"), export still
      reachable; applied app-wide via the single entitlement check.
- [x] (no new screen) **Trainer link** stays live regardless of subscription.

### 6.4.1 Trainer Share Soft-Lock Contract Slice

Stage-0 lock:
- Source: this plan §6.1-§6.4 and `docs/architecture/14-feature-flags-and-entitlements.md`.
- Scope: executable contract only. No live IAP provider, no remote entitlement adapter, no schema
  change, and no production paywall enforcement in this nav-redesign wave.

Acceptance:
- AC-ENT-1: `active` and `trial` app entitlement states allow write actions.
- AC-ENT-2: `soft_locked` disallows new writes: new logs, routines, reminders, edits, and new
  share/invite creation.
- AC-ENT-3: `soft_locked` still allows read/export/delete/privacy/revoke/restore/manage
  subscription/notification opt-out/sign-out actions.
- AC-ENT-4: `soft_locked` still allows existing trainer share viewing, so public trainer links stay
  live regardless of the owner's subscription.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/entitlements-contracts.test.ts` failed as expected
  while the new entitlement contract stub returned `false` for `active`/`trial` writes and all
  soft-lock allowed actions.

GREEN evidence:
- `npm run test:unit -- --runTestsByPath src/test/entitlements-contracts.test.ts` — PASS: 1 suite,
  4 tests.

Implementation notes:
- Added `src/contracts/entitlements.ts` as the executable app entitlement action taxonomy. The
  contract keeps live IAP/enforcement deferred, gates new write actions for `soft_locked`, and keeps
  `view_existing_trainer_share` available for both `soft_locked` and `loading` states so trainer
  links are not accidentally bricked by subscription state.

### 6.5 Reconcile with existing docs
- **PRD §8** used to specify feature-tiered freemium (1 puppy / 3 reminders / 7-day timeline /
  premium €49.99–54.99). This model **replaces that** with time-gated single-entitlement; applied 2026-06-30.
- **DESIGN §4.4.7 "Free vs Premium" block** used to list the old feature-freemium matrix and multi-pet
  (which is Deferred). Rewritten 2026-06-30 to: trial = full app, expired = read-only + export, sub = full app
  (no per-feature tiers).
- **`docs/architecture/14-feature-flags-and-entitlements.md`**: entitlement becomes a single
  `active sub OR within trial` check gating writes (household-scoped `subscription_entitlement` still
  fits); paywall shell stays feature-flagged off until beta retention is confirmed.

## 7. Next steps (design-fidelity pipeline)
1. [x] Update canon docs: **DESIGN.md §2.3/2.4** (terracotta primary ramp + contrast re-check);
   **PRD §8** (monetization *policy* — note: DESIGN §8 is *Haptics*, not monetization); **DESIGN
   §4.4.7** incl. its former **"Free vs Premium" block** — rewritten to the soft-lock model; and
   `14-feature-flags-and-entitlements.md` → §6 time-gated soft-lock model.
2. [x] Create initial Stage-0 lock package: `docs/design/v1/specs/v2-redesign-lock-package.md` plus
   section spec cards for the 88-board Codex Design handoff. Before native code, split any section card
   into route-specific cards when the implementation needs tighter assertions.
3. [ ] For each ❌/➕/🟡/⛔ item kept in scope during native implementation: confirm route-specific artboard
   IDs + spec card, per `docs/agents/design-fidelity-pipeline.md`, before code.
4. [ ] Sequence by tab: **Diary states → Quick Log states → Pet/Health → Reminders forms → Onboarding
   (+ skippable paywall) → More sub-screens → Sharing → paywall + soft-lock states → Shareable Cards**,
   applying the new TabBar as each screen migrates.
5. [ ] Keep DESIGN.md the canon; update §refs if screens are added/merged.

## 8–26. Evidence log (moved)

Per-route Stage-0 lock and handoff evidence (former §8–§26: Codex handoff, native
route-label/icon, Diary, Quick Log, failed-save row, snackbar/undo, Quick Trackers
settings, Pet hub, Health add/detail, vet visit prep, reminder edit, sitter checklist,
and Onboarding anatomy evidence) moved to
`docs/plans/active/2026-06-29-v2-nav-redesign-gaps-evidence.md` on 2026-07-07.
References like “evidence recorded in §10” in the coverage matrix above resolve there.

## Remaining blocker audit — 2026-07-03

The remaining unchecked rows are no longer generic design-fidelity or anatomy gaps. The in-scope
screens have RED/GREEN and Stage 4 evidence where a JS-only route implementation was possible. The
remaining pieces require one of the following explicit follow-up decisions before code should continue:

- **Diary history durable delete + snackbar undo:** resolved. `event_log` tombstone RLS and Quick Log
  synced-delete error swallowing are resolved by the 2026-07-04 Event Log slice. Migration
  `20260703235553_fix_event_log_tombstone_rls.sql` passed 116/116 pgTAP assertions after RED failed
  only owner/caregiver `event_log` tombstone positives; the Quick Log port now returns the
  synced-delete Promise instead of swallowing rejection with `.catch(() => undefined)`. Supabase Dev
  authenticated-client smoke returned `event_soft_delete status=200 count=1`,
  `event_restore status=200 count=1`, and cleanup count 1. The follow-up route slice now waits for
  successful synced delete, shows the shared warning Snackbar with Undo, and restores via
  `restoreSyncedQuickLogEvent`. The product history-scroll/fold-in follow-up is also closed by the
  inline `Review history` implementation and Stage 4 screenshot evidence; the remaining stale
  standalone Timeline entry point in More was removed on 2026-07-04.
- **Pet Health Add Record offline queue:** architecture decided by ADR-0019; the JS-only Health
  outbox CORE is implemented and tested, but runtime wiring is still open. `src/lib/queue/README.md`
  and `docs/architecture/10-quick-log-queue.md` keep the Quick Log queue routine-event-only while
  Health uses a separate local outbox under `src/lib/queue/health-outbox/`. RED/GREEN coverage
  proves Health outbox contracts, state-machine transitions, scrubbed retry classification with
  default exponential backoff, local SQLite schema, ready-row claim, terminal-row re-enqueue
  re-activation, retry-delay gating, missing-actor quarantine, processor replay, and query
  invalidation. Review audit 2026-07-05: no production caller enqueues failed Health mutations and
  no drain trigger invokes `processNextHealthOutboxItem`, so the durability path is not active at
  runtime yet — enqueue-on-failure + drain wiring is a deferred follow-up slice.
- **Health Record delete/undo runtime proof:** resolved for this plan's Health scope by
  `20260703181913_fix_tombstone_update_rls.sql`. RED pgTAP failed on current policy for
  owner/caregiver Health soft-delete/restore; GREEN pgTAP passed 104/104 with the migration.
  Supabase Dev authenticated-client smoke returned `health_soft_delete status=204 count=1` and
  `health_restore status=200`, then synthetic cleanup returned count 1.
- **Reminder row delete runtime proof:** resolved for this plan's Reminder scope by the same
  migration. RED pgTAP failed on current policy for owner/caregiver Reminder soft-delete; GREEN
  pgTAP passed 104/104 with the migration. Supabase Dev authenticated-client smoke returned
  `reminder_soft_delete status=200 count=1`, then synthetic cleanup returned count 1.
- **Puppy Setup / Health Record native DatePicker:** blocked by native dependency scope. No native
  DatePicker package is installed; adding one is a new native dependency while native rebuilds are
  currently blocked by the known `expo-sqlite` / Xcode 26.2 issue. Completion audit 2026-07-04
  confirmed `package.json` has no DateTimePicker dependency.
- **First-run permission probing/request:** blocked by native dependency scope. `expo-notifications`
  is not installed; real permission probing/request, token registration, and scheduling require an
  approved notification native-module slice. Current implemented work is limited to in-app settings
  handoff and local preference persistence. Completion audit 2026-07-04 confirmed `package.json`
  has no `expo-notifications` dependency, while `docs/architecture/11-notifications.md` and ADR-0012
  require Expo Notifications for real local reminder scheduling and permission behavior.

## Changelog
- 2026-07-05: Pre-merge review fix pass. (1) Synced Quick Log delete snackbar now dismisses after a
  successful Undo restore instead of staying visible over the restored row. (2) Restored synced rows
  are re-bucketed by the device-local calendar date (matching insert/timeline grouping) instead of
  the UTC date slice, fixing undo appearing to do nothing for negative UTC offsets. (3) The
  production `/settings/household` screen no longer renders a fabricated member roster or a phantom
  pending invite: it shows the current member with their real role, live invites only, and a
  localized empty-invites row (new `member-you` / `invites-empty` i18n keys in en/es/ru). (4) Health
  outbox hardening: retryable failures now persist a default exponential backoff (30s base, 10min
  cap) instead of a NULL retry_after_at zero-backoff hot loop; re-enqueueing over a terminal
  `failed_permanent` row re-activates it as fresh `pending_local` instead of returning the stale
  unclaimable row; the health-record repository attaches shared scrubbed failure kinds so
  permission/validation errors classify as permanent instead of retried `unknown`; delete replays
  invalidate the whole Today dashboard family via `queryKeys.today.dashboardRoot`. (5) Corrected the
  outbox status rows above: the outbox core is implemented and tested but NOT wired into the
  production mutation path — enqueue-on-failure and a drain trigger remain a deferred follow-up
  slice.
- 2026-07-04: Implemented the approved Health offline outbox architecture slice. Added ADR-0019,
  active implementation plan, separate JS-only `health_outbox_item` SQLite storage, Health outbox
  contracts/state/retry/replay processor, query replay invalidation, client-generated insert `id`
  support, and RED/GREEN coverage. The Add Record full-flow row now leaves only the unapproved native
  DatePicker gate; native DatePicker and `expo-notifications` remain untouched.
- 2026-07-04: Reclassified the final unchecked top-matrix rows as explicit Approval Gates after
  current-state audit. Health Add Record offline writes require a separate Health offline-outbox ADR
  because the current SQLite queue is Quick Log-only; Puppy Setup / Health Record date fields require
  a real native DatePicker dependency; First-run notification permission probing/request requires an
  `expo-notifications` native-module slice. No bespoke JS picker, generic outbox, or notification
  dependency was added in this pass.
- 2026-07-04: Removed the legacy user-facing `Timeline` entry point from the More tab now that
  history lives inside Diary. More no longer renders the Timeline row under Records and
  notifications, `app/(tabs)/more/index.tsx` no longer routes to `/timeline`, and Reminders /
  Notifications remain reachable. Legacy `/timeline` modal infrastructure and i18n strings remain
  intentionally in place as fallback/out-of-scope.
- 2026-07-04: Implemented the Diary/Timeline synced-delete snackbar undo follow-up. Added RED/GREEN
  route coverage proving successful synced delete waits for the Promise before showing the shared
  warning Snackbar, and pressing Undo calls the typed restore path. Added `event_log` restore wrapper
  coverage and query coverage that restored rows are upserted back into timeline cache while
  invalidating the same Diary/timeline query families as delete. Focused GREEN: 4 suites / 61 tests;
  `npm run typecheck` passed.
- 2026-07-04: Implemented the Event Log tombstone RLS/client follow-up. Added pgTAP coverage for
  owner/caregiver `event_log` soft-delete/restore plus viewer/non-member/anon/trainer-share denials,
  created migration `20260703235553_fix_event_log_tombstone_rls.sql`, proved GREEN with 116/116
  assertions, applied the single migration to non-production Supabase Dev for runtime proof, and
  verified authenticated-client `event_log` soft-delete/restore with synthetic cleanup count 1. Added
  a focused Quick Log port RED/GREEN test and removed only the synced-delete
  `.catch(() => undefined)` path so RLS/server errors no longer become fake success.
- 2026-07-03: Implemented the Health + Reminder tombstone RLS follow-up. Added pgTAP coverage for
  owner/caregiver Health soft-delete/restore and Reminder soft-delete plus viewer/non-member/anon
  denials. Created migration `20260703181913_fix_tombstone_update_rls.sql`, proved GREEN with 104/104
  pgTAP assertions, applied the single migration to non-production Supabase Dev for runtime proof,
  and verified authenticated-client Health soft-delete/restore plus Reminder soft-delete with
  synthetic cleanup counts of 1. Diary `event_log` synced-delete remains explicitly out of scope.
- 2026-07-03: Reproduced the shared RLS tombstone blocker with focused Supabase Dev
  authenticated-client smokes. Normal Health `UPDATE title` passed as the debug owner, but Health
  `deleted_at` updates returned `42501` with and without `updated_by`; Reminder `deleted_at` update
  returned the same `42501`. Synthetic smoke rows were cleaned up. The plan now treats Health,
  Reminder, and Diary durable delete/undo as one RLS tombstone-transition follow-up rather than as
  independent UI/anatomy gaps.
- 2026-07-03: Added a remaining-blocker audit for the final unchecked matrix rows. The audit
  separates completed JS/design-fidelity work from follow-up decisions that require RLS/schema work,
  Health offline-outbox architecture, or new native notification/DatePicker dependencies. No
  production code changed.
- 2026-07-03: Reconciled the cross-cutting Global screen states matrix row as complete for all
  in-scope migrated screens. The row now points to the per-screen RED/GREEN and Stage 4 evidence
  already recorded for Diary, Pet/Health, Quick Log Details, Reminders, More subroutes, sharing,
  paywall, sitter mode, puppy card, and revoked/expired share states. Remaining state-like work is
  not a generic template gap; it is explicitly deferred/blocked by native picker, offline queue,
  permission probing, and Health soft-delete RLS rows.
- 2026-07-03: Added Quick Log Details loading, pending-write, error, offline-read, and
  permission-denied state templates with RED/GREEN render and route coverage, dev-gallery handoff,
  EN/RU/ES copy, and primary SE Stage 4 screenshots. Real offline detail queueing, native pickers,
  schema/native modules, analytics, and native project edits remain out of scope.
- 2026-07-03: Added deterministic Puppy Profile settings loading, pending-write, error,
  offline-read, and permission-denied state templates with RED/GREEN render coverage, typed EN/RU/ES
  copy, alert/live-region semantics, visible dev-gallery handoff, and primary SE Stage 4 screenshots.
  Photo editing, breed/search pickers, sex picker, native date picker, offline queue, schema/native
  modules, analytics, and native project edits remain out of scope.
- 2026-07-03: Added deterministic Manage Household loading, pending-write, error, and offline-read
  state templates with RED/GREEN render coverage, dev-gallery handoff coverage, typed EN/RU/ES copy,
  alert/live-region semantics, privacy-safe non-token/non-email copy, full `npm run check`, and
  primary SE Stage 4 screenshots. Live member/invite queries, role changes, access removal, invite
  resend/revoke, confirm sheets, schema/native modules, and native project edits remain deferred.
- 2026-07-03: Added Notification Preferences local reminder opt-out persistence: the existing
  `Local reminders` switch now reads/writes a single device-local SecureStore boolean through the
  notifications boundary, reports storage failures via the shared PII-scrubbed observability wrapper,
  and keeps local changes separate from OS settings handoff and durable Supabase push preferences.
  RED/GREEN local preference and More render tests, adjacent notification query/repository tests, and
  typecheck passed. Scheduling/cancellation, permission probing, push token registration, quiet-hours
  editing, schema/native modules, and native project edits remain out of scope.
- 2026-07-03: Reconciled More Support / Help email composer handoff: the current production
  `/settings/help` route already opens a privacy-safe localized `mailto:` draft and renders a visible
  error card when the OS email handoff rejects. Updated the support/help spec and plan so email
  composer handoff is no longer listed as deferred; live ticket submission, diagnostics upload,
  schema/native modules, analytics, and native project edits remain out of scope. Focused support
  email tests, i18n parity, and text hygiene passed.
- 2026-07-03: Added Reminders Hub row soft-delete lifecycle wiring: typed Supabase repository
  `deleted_at` update scoped by `id` + `puppy_id`, zero-row failure guard, TanStack delete mutation
  invalidating the durable reminders list and current Diary dashboard, row `SwipeToDelete` plus
  VoiceOver/TalkBack delete action, pending-row disable/hide behavior, and calm error state reuse.
  Targeted RED/GREEN Reminders tests, i18n, tokens, typecheck, and full `npm run check` passed. No
  occurrence generation, notification scheduling, schema/native module, analytics, or native project
  edit was introduced.
- 2026-07-03: Added Pet Health main loading/error/offline-read state templates and production `/pet`
  loading/error wiring from active-care and health-record queries. The cards use design primitives,
  typed EN/RU/ES copy, alert/live-region semantics, and dev-gallery handoff coverage without adding
  schema/native/offline-queue work. Targeted Health/Pet/dev-gallery tests, i18n, token drift,
  typecheck, and whitespace checks passed. Stage 4 SE evidence is now recorded for the compact
  dev-gallery handoff.
- 2026-07-02: Wired `/sharing/puppy-card` Share CTA to the React Native OS share sheet with existing
  localized, privacy-safe card copy. The route now shows pending-write while the OS sheet is pending,
  share-options after success, and the existing error state on rejection without closing the modal.
  RED/GREEN route tests, adjacent More/navigation/dev-gallery/app-shell tests, typecheck, and scaffold
  checks passed.
- 2026-07-02: Added production Health detail editable dirty-state UI: loaded server records expose
  Edit, the form preloads title/date/status/provider/notes, Save is disabled until dirty, update uses
  the typed mutation with source preservation and previous-date invalidation, success keeps the modal
  open with the returned record, and failure keeps the form visible with the existing error state.
  RED/GREEN route tests, adjacent Health/query tests, typecheck, and full `npm run check` passed.
- 2026-07-02: Wired production Health detail delete + 5-second undo snackbar: loaded detail records
  now expose destructive controls, delete calls the typed mutation, success closes back to Pet and
  shows warning snackbar with Undo, restore uses the typed restore mutation, and delete failure keeps
  the route visible with the existing error state. RED/GREEN route tests, adjacent Health/query/
  Snackbar tests, and typecheck passed. Runtime SE evidence confirms route loading but not the loaded
  delete path because the debug account lacks a deterministic health-record seed.
- 2026-07-02: Added Pet Health Add Record durable create/list refresh on the existing
  `health_record` schema: typed Supabase repository, health query/mutation hooks, normalized
  create draft, targeted invalidation, Pet route server-row rendering, and Add Record Save wiring.
  RED/GREEN repository/query/route tests, typecheck, and SE form evidence recorded. Edit/delete,
  offline queue, native DatePicker, and urgent persistence remain open. The authored `DHPP, 12 weeks`
  template generation is now implemented in the follow-up template slice.
- 2026-07-02: Added deterministic Quick Trackers settings loading, error, empty, and owner-only
  state templates with RED/GREEN render coverage, dev-gallery native handoff, EN/RU/ES copy, and
  primary SE Stage 4 evidence. Existing implicit-save/reorder persistence coverage remains in the
  main Quick Trackers slice; live authorization/data wiring remains deferred to app services.
- 2026-07-02: Tightened the First-run variants row so the remaining partial scope is explicit:
  visual onboarding slices are implemented, while runtime prompt scheduling, OS permission handoff,
  and native DatePicker integration remain deferred/partial.
- 2026-07-02: Reconciled onboarding coverage rows with existing evidence: Quick Tracker Selection,
  Plan Reveal, and First Log now reflect their RED/GREEN coverage and SE Stage 4 screenshots in the
  top matrix; Puppy Setup remains partial because real platform DatePicker wiring is still blocked
  until a native picker module can be used safely.
- 2026-07-02: Reconciled the top Diary/Timeline coverage rows with current Clay evidence: grouped
  Diary loading/offline/pending/error templates are now marked implemented with RED/GREEN gallery
  coverage and SE Stage 4 screenshots, while Diary history item actions remain explicitly partial
  because durable synced delete + snackbar undo are deferred behind the known RLS blocker.
- 2026-07-02: Closed the Pet/More IA duplication follow-up from the screen-polish backlog: Pet is now
  the canonical home for puppy profile and Quick Trackers, More renders a single localized
  `Pet settings` deep link to `/pet`, and Pet `Edit profile` opens `/settings/puppy-profile`.
  RED/GREEN More/Health/Pet route coverage, i18n parity, Stage 4 SE screenshots, and full
  `npm run check` passed.
- 2026-07-02: Closed the WeekStrip non-interactive a11y quick sub-fix: `WeekStrip` now removes
  `tablist`/`tab` semantics when `onSelectDay` is absent, preserves real `button` semantics for
  interactive use, and no longer exposes `selected` promises on the current Diary route.
- 2026-07-02: Closed the Diary grouped-state template Stage 4 follow-up: added RED/GREEN coverage
  for the development-only gallery error fixture, exposed `loading`, `offline-read`, `pending-write`,
  and `error` in the deterministic Today/Diary shell preview, and captured native SE evidence at
  `output/v2-nav-gaps-stage4/diary-state-templates-loading-offline-stage4.jpg` plus
  `output/v2-nav-gaps-stage4/diary-state-templates-pending-error-stage4.jpg`.
- 2026-07-02: Closed the no-new-screen trainer-link soft-lock contract: added
  `src/contracts/entitlements.ts` plus RED/GREEN coverage proving `active`/`trial` allow writes,
  `soft_locked` blocks new writes, owner data/privacy/restore/revoke actions remain available, and
  existing trainer share viewing remains live for `soft_locked` / `loading` states without adding live
  IAP or production paywall enforcement.
- 2026-07-02: Closed Quick Log snackbar/undo Stage 4: added RED/GREEN coverage that active
  snackbar messages render through `FullWindowOverlay` above native-stack screens, captured production
  SE evidence at
  `output/v2-nav-gaps-stage4/quick-log-production-snackbar-full-window-fast3-stage4.png`, and verified
  the visible success surface carries `Logged · Feeding`, `Undo`, and `Add details`.
- 2026-07-02: Closed the remaining Onboarding First Log snackbar Stage 4 gap after the shared
  `FullWindowOverlay` snackbar fix: captured native SE evidence at
  `output/v2-nav-gaps-stage4/onboarding-first-log-snackbar-full-window-direct-stage4.png` with the
  first-value Diary preview and visible `Done. You can keep going.` celebration snackbar.
- 2026-07-02: Closed Quick Log Stage 4 for duplicate warning and pending/failed inline rows:
  production route screenshots verify the default sheet and duplicate warning; a temporary restored
  dev-route harness verifies pending and failed local rows. The snackbar visual gap is now closed by
  the follow-up `FullWindowOverlay` fix above.
- 2026-07-01: Closed Quick Log §2.3.9 pending route coverage: `started` mutation events now render
  inline pending rows before cached rows refresh, reuse existing pending-row anatomy/i18n, and wire
  Undo through the active care context. RED/GREEN route tests and adjacent Quick Log render suites pass;
  Stage 4 screenshot comparison remains open.
- 2026-07-01: Reconciled the cross-cutting V2 TabBar row and Pet deferred-scope rows with current
  code/spec evidence: `app/(tabs)` now delegates to `CapsuleTabBar`, Today/Health aliases are hidden,
  V1 FAB tab-layout assertions are retired, the focused nav suites pass 28/28, and multi-pet,
  standalone Health, charts/milestones, and medication/refill are closed as explicit out-of-wave scope.
- 2026-07-01: Reconciled Guidance §4.3 with the locked V2 nav wave: active Diary no longer emits or
  renders `guidanceCard` / read-practiced-skip states, while guidance content/contracts remain only
  as deferred reference. Targeted RED/GREEN suites, typecheck, scaffold checks, diff whitespace, and
  raw-style scan passed; Diary contextual-tip Stage 4 remains part of the Diary screenshot backlog.
- 2026-06-30: Added the Shareable Puppy Card shell: More now opens `/sharing/puppy-card`, the route
  renders builder fields, health disclosure, 3:4 preview, share CTA, public-link disclosure, and an
  active-card row with privacy-safe sample data; route/i18n/scaffold contracts were updated. Live
  signed-link creation, real share sheet, revoke/extend/history states, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/sharing/puppy-card`: captured native SE top/middle screenshots
  from the installed PuppyPlan.app over Metro and verified the modal header, builder fields, health
  disclosure, locked 3:4 preview anatomy, Share CTA, public-link disclosure, active-card row, and
  privacy-safe visible copy. Live signed-link and share operations remain deferred.
- 2026-06-30: Added the Trusted Sitter mode owner setup shell: More Trainer / sitter now opens
  `/settings/sitter-mode`, with caregiver row, time window rows, checklist anatomy, included/excluded
  visibility preview, disclosure, and enable CTA. Live sitter data/mutations, owner active status,
  completion push, auto-expire, exit confirm, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/settings/sitter-mode`: captured native SE top/bottom screenshots
  from the installed PuppyPlan.app over Metro and verified the owner-side setup shell, caregiver row,
  time window, selected/unselected checklist icons, visibility included/excluded icons, disclosure,
  and enable CTA. Live sitter data and mutations remain deferred.
- 2026-06-30: Added PuppyPlan Plus trial/soft-lock shell states: default `/paywall` now shows a
  subtle trial-days-left status and note; synthetic `accessState="softLocked"` renders the read-only
  write-gate banner with export and Restore purchases still reachable. Live entitlement enforcement,
  purchase/restore, and Stage 4 screenshots remain open.
- 2026-06-30: Added the Manage Household shell: More Family now opens `/settings/household`, with
  owner/caregiver rows, pending invite row, role/status badges, overflow affordances, privacy-safe
  invite labeling, and Invite CTA. Live member queries, role changes, removal, invite actions,
  confirm sheets, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/settings/household`: captured native SE top/bottom screenshots
  from the installed PuppyPlan.app over Metro and verified the modal header, intro card, household
  member rows, pending invite row, non-color-only status badges, overflow affordances, guidance card,
  privacy-safe invite label, and Invite CTA. Live member/invite operations remain deferred.
- 2026-06-30: Added the caregiver-side Accept Invite shell: `/invite/[token]` now renders
  inviter/puppy context, caregiver role, included/excluded preview, disclosure, and Accept/Decline
  actions without exposing raw invite tokens; public token routes are tracked in navigation
  contracts. Live token lookup, accept/decline RPCs, already-member/expired states, post-accept
  redirect, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/invite/[token]`: captured a native SE screenshot from the
  installed PuppyPlan.app over Metro using a synthetic invite deep link and verified the caregiver
  role shell, included/excluded permission anatomy, owner revocation disclosure, Accept/Decline
  actions, and token-safe visible copy. Live token lookup and accept/decline flows remain deferred.
- 2026-07-02: Added deterministic Accept Invite loading, load-error, expired, and already-member
  state templates with RED/GREEN render coverage, dev-gallery native handoff, EN/RU/ES copy, and
  primary SE Stage 4 screenshots. Live token lookup, provider payload parsing, accept/decline RPCs,
  and post-accept redirect remain deferred.
- 2026-06-29: Initial coverage/gap analysis from board `uXjVL0aEXPU=` (source) vs `uXjVHA5hn48=`
  (freeze) cross-referenced against DESIGN.md.
- 2026-06-29: Resolved §5 decisions (Events→Diary, Health lightweight+CRUD, Onboarding now,
  Shareable Cards in-scope; theme pending).
- 2026-06-29: Monetization decided — **time-gated soft-lock** (30-day full free trial, skippable
  paywall → writes gated by subscription, read-only+export always free, trainer link stays live).
  Plans: Annual $39.99 / Monthly $8.99 / Lifetime ~$79–99. Replaces PRD §8 feature-freemium
  (per-feature gating questions dropped). Supersedes the earlier 3-agent freemium proposal.
- 2026-06-29: Theme decided — **B · Minimal canonical**, Dusk → accents + future dark mode (rendered
  both for comparison). Primary CTA = **terracotta `#c96442`** → update DESIGN.md §2.3/2.4 (was Calm Teal).
- 2026-06-29: Applied review feedback — (1) multi-pet switcher → 🚫 (Deferred per PRD/arch); (2) added
  explicit write taxonomy + always-allowed list (export/delete/privacy/revoke/restore/sign-out never
  gated); (3) softened RevenueCat 5× claim (our model isn't a hard paywall); (4) pinned trial-clock
  anchor (first durable puppy `household.created_at`); (5) Shareable Cards scoped to minimal signed-link
  only; (6) added scope boundary — monetization *model* decided but live *enforcement* deferred until
  beta-retention (PRD §1 / arch Deferred); (7) fixed canon refs — monetization policy = PRD §8 (DESIGN
  §8 is Haptics), paywall = DESIGN §4.4.7 + its Free/Premium block needs rewrite; (8) resolved stale
  "Pick a theme" matrix line; Guidance §4.3 marked ❓ pending brief check.
- 2026-06-30: Implemented first plan batch: reconciled canon docs for Terracotta Clay primary,
  time-gated trial → write soft-lock monetization, and entitlement taxonomy; created
  `docs/design/v1/specs/v2-redesign-lock-package.md` plus eight section spec cards covering the
  expanded 88-board Codex Design handoff.
- 2026-06-30: Updated the Codex/Open Design project itself: added the top all-board coverage map,
  `handoff-manifest.json`, refreshed `critique.json`, sanitized real-looking caregiver placeholders,
  and verified rendered DOM coverage for all 88 boards / 176 previews.
- 2026-06-30: Re-verified the Codex/Open Design preview in a real browser after the user's viewport
  concern: Playwright snapshot and full-page screenshot confirm the complete 88-board / 176-preview
  handoff is present in the main canvas.
- 2026-06-30: Repacked the Codex/Open Design entry as a static complete handoff for Claude Design/Miro:
  `index.html` and `miro-complete.html` now contain all 88 boards / 176 native previews directly;
  `index.dynamic.html` keeps the previous JS-rendered source.
- 2026-06-30: Implemented and verified the native route-label/icon slice: Diary/Pet/More primary tabs,
  book/paw/more icon contract, first-log Diary selection, V2 shell/string scaffold guardrails, and
  full `npm run check` pass. Stage 4 per-screen native screenshot comparison remains open.
- 2026-06-30: Split the Diary section card into `03-diary-route.md` so the next native Diary
  implementation pass has a route-specific Stage-0 lock before code.
- 2026-06-30: Added the first native Diary anatomy slice from the lock: seven-day week strip with
  separate selected/today states, i18n/shell contract coverage, RED/GREEN render test, and full
  `npm run check` pass. Re-checked the Open Design static handoff directly in the project directory:
  both `index.html` and `miro-complete.html` contain all 88 boards and 176 iOS/Android previews.
- 2026-06-30: Fixed the Open/Codex Design legacy canvas entry that matched the user's partial-canvas
  screenshot: `mqxri78o-Canvas.dc.html` is no longer a redirect page and now contains the same complete
  static 88-board / 176-preview handoff as `index.html`; fresh DOM + headless Chrome verification passed.
- 2026-06-30: Added the Diary history language slice: embedded history now says `Diary history` /
  `Review history` and the Diary card copy no longer exposes standalone Timeline wording; RED/GREEN
  render coverage and full `npm run check` pass recorded.
- 2026-06-30: Added the first Diary item-anatomy slice: synced logged facts hide the visible synced
  pill in embedded Diary history while pending/failed states remain visible and actionable; RED/GREEN
  render coverage and full `npm run check` pass recorded.
- 2026-06-30: Added the next Diary item-anatomy slice: embedded Diary history logged facts now use
  the quiet/sunken `mutedTemplate` card surface with a structural render assertion for
  `tokens.color.surface.sunken`; targeted Diary tests, typecheck, scaffold checks, and full
  `npm run check` pass.
- 2026-06-30: Added the Diary synced-item action slice: synced logged facts now have a 44pt+
  `IconButton` overflow/edit affordance wired through `createQuickLogEditRequest`, with EN/RU/ES
  `today.history.item-actions` copy and RED/GREEN render coverage.
- 2026-06-30: Added the Diary past-unchecked-reminder language slice: synthetic reminder preview
  copy no longer exposes visible `missed reminder` / shame language, with RED/GREEN render coverage,
  i18n parity, typecheck, and scaffold checks.
- 2026-06-30: Added the Diary accident-recovery / after-feeding contextual anatomy slice: normal
  Diary hero eyebrow copy moved off legacy `Today`, feeding-pattern now renders as a soft contextual
  tip (`diary-contextual-tip-card` / `mutedTemplate`), and RED/GREEN render coverage plus full
  `npm run check` pass were recorded.
- 2026-06-30: Added the Diary all-done state slice: synthetic `screenState="all-done"` renders a
  calm completed status card with EN/RU/ES copy, RED/GREEN render coverage, and full `npm run check`
  pass.
- 2026-06-30: Added the Diary empty-with-history state slice: synthetic `screenState="empty-history"`
  renders the locked quiet-day status without falling back to first-day onboarding, with EN/RU/ES copy
  and RED/GREEN render coverage plus full `npm run check` pass.
- 2026-06-30: Added the Diary cold-start state slice: synthetic `screenState="cold-start"` renders
  the locked no-logs/no-routines setup status without falling back to first-day onboarding, with
  EN/RU/ES copy and RED/GREEN render coverage plus full `npm run check` pass.
- 2026-07-02: Reconciled the top Diary coverage matrix with the existing Diary lock evidence:
  accident recovery, after-feeding pattern, past-unchecked reminder, and Day 7 weekly rhythm are now
  marked implemented where contract and render coverage already existed; the route-wide Stage 4
  screenshot gate remains open.
- 2026-06-30: Added the Diary synthetic pending-write state slice: `screenState="pending-write"` now
  renders the locked pending-write status without requiring queued local rows, with RED/GREEN render
  coverage and full `npm run check` pass recorded.
- 2026-06-30: Added the synced Diary item delete-action slice: synced logged facts now expose a
  localized destructive delete action wired through `createQuickLogDeleteRequest`, with RED/GREEN
  render coverage, shell i18n allowlist coverage, and full `npm run check` pass recorded.
- 2026-07-02: Closed Stage 4 for inline Diary history (`5b-diary-history`): captured a native SE
  screenshot from the installed PuppyPlan.app over Metro after pressing `Review history`, verifying
  visible filter chips, day divider, logged FactCard anatomy, and canonical bottom chrome. Runtime
  snapshot evidence confirmed the state stayed inside Diary and did not route to standalone Timeline.
- 2026-06-30: Added the Quick Log duplicate-warning anatomy slice: duplicate detection now renders
  a warning-tinted card with a warning glyph and localized save-anyway/cancel actions, while blocking
  mutation until explicit confirmation; targeted Quick Log + design primitive suites and full
  `npm run check` pass.
- 2026-06-30: Added the Quick Log failed-save row anatomy slice: failed local rows now have a
  structural failed-card hook, muted danger tint/border, non-color-only failed status pill, and
  inline retry/discard controls; targeted local/sheet suites and full `npm run check` pass.
- 2026-06-30: Added the Quick Log snackbar/undo after-tap slice: the route-level success snackbar
  anatomy is locked, shared Snackbar accepts haptic feedback metadata, normal Quick Log saves use
  `saveSuccess`, failed replacements use `error`, and targeted/full checks passed.
- 2026-06-30: Reconciled the Quick Trackers settings/Edit Trackers plan item with the implemented
  native route: Quick Log and More both open `/settings/quick-trackers`, atlas-style implicit-save
  rows are covered by render tests, and `training` remains deferred by the accepted canonical tracker
  taxonomy rather than added as an unapproved schema delta.
- 2026-07-02: Closed Stage 4 for `/settings/quick-trackers`: captured a native SE screenshot from the
  installed PuppyPlan.app over Metro and verified the modal header, max-5 guidance, selected count,
  selected tracker rows with reorder handles/icons/toggles, More Options rows, history-preservation
  hint, and absence of a bottom Save CTA against the locked acceptance. The live owner state showed
  3 of 5 selected; max-reached hint remains covered by render tests.
- 2026-06-30: Added and verified the Pet tab landing/hub native anatomy slice: `/pet` now shows a
  profile hub before lightweight Health, includes avatar/profile facts/Edit/Add weight, and routes
  the Quick Trackers entry to `/settings/quick-trackers`; targeted Pet/i18n/navigation tests and
  full `npm run check` passed. Stage 4 screenshot comparison remains open.
- 2026-07-02: Closed Stage 4 for `/pet` landing/hub production state: captured top and scrolled native
  SE screenshots from the installed PuppyPlan.app over Metro, verifying the Pet title, neutral profile
  placeholder, age/breed/weight facts, Edit profile, Add weight, Quick Trackers entry, health filters,
  empty Health state, Add entry, disabled Browse templates, and non-diagnostic footer copy without
  bottom-chrome overlap. Mixed health list, add-record modal, detail/delete, and vet-prep Stage 4
  remain separate items.
- 2026-06-30: Added the first Health Add Record route slice: empty Pet Health can open
  `/pet/health-record-edit`, the modal shows a native record-type chooser and then the health record
  form anatomy, shell i18n/typed-route contracts were updated, and targeted/typecheck/scaffold checks
  plus full `npm run check` passed. Save/persistence/loading/error/offline/edit/delete remain open.
- 2026-07-02: Closed Stage 4 for `/pet/health-record-edit`: fixed the static `Card` accessibility
  contract so labelled containers no longer collapse nested controls in native snapshots, then captured
  native SE chooser and form screenshots over Metro. Chooser targets (`Vaccination`, `Parasite treatment`,
  `Preventive care`, `Vet visit`, `Close`) are exposed to the runtime snapshot; form top/bottom evidence
  covers Cancel/New entry/disabled Save, main fields, status control, note/privacy copy, and urgent toggle.
  Save/persistence and native captures for state variants remain open.
- 2026-07-02: Added Health Add Record state templates for loading, pending write, error, offline read,
  and permission denied with typed EN/RU/ES copy, alert/live-region accessibility, dev-gallery preview
  coverage, RED/GREEN route tests, and Stage 4 SE captures from the native dev gallery. Durable
  save/persistence remains open.
- 2026-06-30: Added the Health detail status/delete anatomy slice: record detail now shows a
  non-color-only four-step status strip with one active filled state, and delete pending shows the
  localized undo-toast preview; targeted health tests, typecheck, scaffold checks, related route/i18n
  suites, and full `npm run check` passed. Real timed undo restore/persistence and Stage 4 screenshots
  remain open.
- 2026-07-02: Closed Stage 4 for Health detail status/delete: captured native SE confirmed,
  needs-vet-review, stage-strip, and delete-pending screenshots from the synthetic health preview over
  Metro. Evidence covers noun status pills, detail rows, four icon+label stage steps with exactly one
  active filled state, aggregate stage accessibility labels in runtime snapshot, busy delete action,
  confirm card, disabled destructive button, and undo-toast preview. Durable edit/delete persistence,
  warning haptic, and timed restore remain open.
- 2026-06-30: Added the Vet Visit Prep card anatomy slice inside Pet Health: localized visit subtitle,
  four 36pt+ checklist rows, Add item affordance, and non-instruction disclaimer; RED/GREEN health
  render coverage, related route/i18n suites, typecheck, scaffold checks, and full `npm run check`
  passed. Real checklist editing/data wiring and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for the `/pet` vet-prep state: captured native SE evidence over Metro
  showing the Health list context, vet-prep title/subtitle, all four checklist rows, Add item affordance,
  and non-instruction/non-medical-advice footer copy. Real checklist editing, actual visit data,
  item completion state, and notifications remain open.
- 2026-07-02: Closed Stage 4 for `/reminders/edit` create/edit, quiet-hours, and permission-denied
  anatomy: captured native SE top/form/quiet/permission screenshots from the installed PuppyPlan.app
  over Metro, with runtime snapshot evidence for the modal actions, disabled Save, category selector,
  time/repeat/timezone rows, toggles, quiet-hours range/per-puppy control, permission CTA, and fallback
  copy. Sitter checklist Stage 4 remains separate.
- 2026-07-02: Closed Stage 4 for the trusted-sitter checklist reminder card inside `/reminders/edit`:
  captured native SE evidence for the source label, person icon slot, left accent rail, evening
  checklist title, privacy-safe caregiver label, progress bar, and Open checklist / Mark all done /
  Skip actions. Real sitter checklist data, completion push, and pending-sync state remain open.
- 2026-07-02: Closed Stage 4 for `/onboarding` Welcome: restarted the installed PuppyPlan.app over
  Metro, captured clean native SE evidence for the decorative warm illustration frame, locked H1,
  subtitle, primary Get started CTA, and secondary sign-in action, and verified the runtime snapshot
  no longer included stale Reminders modal targets.
- 2026-07-02: Closed Stage 4 for the `/onboarding` Age Hint slice: captured native SE filled-profile
  evidence over Metro showing Step 2 chrome, privacy-safe synthetic name input, Age/Birth date
  segmented control, 8-week stepper, info-tinted age hint, and enabled Continue action without keyboard
  overlay.
- 2026-07-02: Closed Stage 4 for `/onboarding` Puppy Setup default/filled/error states: captured native
  SE evidence for disabled-until-name default, filled age-stepper/age-hint state, and future birth-date
  validation error. Real platform DatePicker replacement remains open.
- 2026-07-02: Closed Stage 4 for `/onboarding` Quick Tracker Selection: captured native SE selected
  and zero-selected states over Metro, verifying Step 3 chrome, helper copy, selected checkmarks,
  selected/unselected accessibility labels in runtime snapshot, counter changes from 5/5 to 0/5, and
  the zero-state `Skip selection` CTA without a minimum-warning alert.
- 2026-07-02: Closed Stage 4 for `/onboarding` Plan Reveal: captured native SE evidence over Metro
  after the debug-account tracker flow, verifying the puppy summary row, title/supporting copy,
  Honey/accent first-log hero card, three separate starter cards, and bottom `Start your first log`
  CTA.
- 2026-06-30: Added the Reminder edit route anatomy slice: `/reminders/edit` now renders the create/edit
  form, quiet-hours preview, and calm permission-denied state with design primitives and existing
  localized copy; RED/GREEN route/navigation tests, typecheck, and scaffold checks passed. Real
  scheduling/persistence/permission deeplink and Stage 4 screenshots remain open.
- 2026-07-02: Added `/reminders/edit` state templates for loading, pending write, error, and offline
  read with typed EN/RU/ES copy, alert/live-region accessibility, busy Save feedback for pending write,
  dev-gallery preview coverage, and Stage 4 native evidence. Durable save/scheduling remains open.
- 2026-07-02: Closed the compact Stage 4 handoff for `/reminders/edit` state templates: exported
  `ReminderEditStatePreview`, changed the dev-gallery shell from nested full edit screens to compact
  state cards, added RED/GREEN coverage that the handoff excludes the time picker form chrome, and
  captured native SE loading/pending plus error/offline evidence over Metro.
- 2026-06-30: Added the trusted-sitter checklist reminder anatomy slice inside `/reminders/edit`:
  source label, person icon slot, left accent rail, 1/3 progress bar, and localized Open checklist /
  Mark all done / Skip actions; RED/GREEN route coverage and related i18n/navigation suites passed.
  Real sitter data, completion push, pending-sync state, and Stage 4 screenshots remain open.
- 2026-06-30: Re-checked the Codex/Open Design full handoff after the user's visibility concern:
  default `index.html` and all portable aliases contain the static complete canvas; direct preview
  audit found 88 unique iOS screens, 88 unique Android screens, 352 total preview nodes across the
  compact contact sheet plus full-size boards, and no missing required surfaces.
- 2026-06-30: Added the first Onboarding re-skin slice: `/onboarding` Welcome now has a locked
  native illustration frame, H1/subtitle/primary CTA anatomy, and a real secondary sign-in action
  wired to `/sign-in`; RED/GREEN onboarding tests, related route/i18n suites, typecheck, and scaffold
  checks plus full `npm run check` passed. Puppy setup, age hint, tracker picker, plan reveal, first
  log, prompts, and Stage 4 screenshots remain open.
- 2026-06-30: Added the Onboarding Age Hint native anatomy slice: Puppy Setup now shows the inline
  age hint card before tracker selection with an info icon, status info tint, localized age copy, and
  accessible `Hint. …` label; RED/GREEN onboarding render coverage plus full `npm run check` passed.
  Full Puppy Setup re-skin and Stage 4 screenshots remain open.
- 2026-06-30: Added the Onboarding Puppy Setup chrome/stepper anatomy slice: profile step now has
  localized back/step chrome, explicit Age section label, tokenized age stepper with adjustable a11y,
  disabled-until-name Continue, and a birth-date date-zone wrapper. RED/GREEN onboarding coverage,
  i18n parity, typecheck, scaffold checks, and full `npm run check` passed. Real platform DatePicker
  and Stage 4 screenshots remain open.
- 2026-06-30: Added the Onboarding Quick Tracker Selection anatomy slice: tracker step now has
  localized Step 3 chrome, tracker helper copy, selected checkmarks, selected/unselected tile a11y,
  zero-selected `Skip selection`, and skip-to-default save normalization. RED/GREEN onboarding
  coverage, i18n/design primitive suites, typecheck, scaffold checks, and full `npm run check` passed.
  Stage 4 screenshots remain open.
- 2026-06-30: Added the Onboarding Plan Reveal anatomy slice: plan step now has the locked puppy
  summary row, accent 96pt HeroCard, three separate starter action cards, and bottom first-log CTA.
  RED/GREEN onboarding coverage, i18n parity, typecheck, scaffold checks, diff whitespace check, and
  full `npm run check` passed. Stage 4 screenshots remain open.
- 2026-06-30: Added the Onboarding First Log anatomy slice: first-value preview now lands in Diary
  chrome with pending/local-only state, no legacy Today copy, and a design Snackbar celebration.
  RED/GREEN onboarding coverage, i18n parity, typecheck, dev-gallery regression coverage, scaffold
  checks, diff whitespace check, and full `npm run check` passed. Stage 4 screenshots remain open.
- 2026-07-02: Added partial Stage 4 native evidence for Onboarding First Log: primary SE simulator
  screenshots verify Diary-selected chrome, Pet/More tabs, separate Quick Log FAB, pending/local-only
  first event state, Diary copy, and absence of account/notification pressure. Transient celebration
  snackbar visual capture remains open after dev-gallery and temporary route-harness attempts; render
  tests continue to cover the Snackbar primitive contract and celebration haptic metadata.
- 2026-06-30: Reconciled the Onboarding Account/Notifications prompt slice as implemented and verified:
  skippable account and quiet-reminder SheetSurface previews pass onboarding anatomy coverage, with
  scheduler / OS permission handoff and Stage 4 screenshots still open.
- 2026-07-02: Closed Stage 4 for the Onboarding Account/Notifications prompt previews: captured clean
  native SE screenshots from the installed PuppyPlan.app over Metro for the account sheet and quiet
  reminder sheet, verifying the skippable SheetSurface anatomy and required actions. Runtime scheduler
  and OS permission handoff remain deferred.
- 2026-07-03: Added the Onboarding post-first-value prompt scheduler: Plan Reveal opens Quick Log with
  `source=onboarding-first-value`, successful Quick Log saves return to
  `/onboarding?postFirstValuePrompt=account`, and the runtime post-value state advances account prompt
  -> notification prompt -> first-log completion. RED/GREEN render/route coverage and full
  `npm run check` passed; primary SE Stage 4 screenshots captured both runtime prompt states. The
  permission probing/native permission request, push-token registration, notification scheduling, and
  persistence remain deferred.
- 2026-07-03: Added the Onboarding 48-hour post-value prompt cadence: account/notification `Not now`
  actions persist prompt-kind timestamps through a shared storage boundary, requested prompts skip
  cooled-down sheets while keeping the first-log completion surface visible, and storage failures are
  reported through shared observability with non-PII context. No native dependency, schema change,
  permission probe, push-token persistence, analytics payload, or native project edit was introduced.
- 2026-07-03: Reconciled Notification Preferences OS settings handoff wording: §4.4.4a already
  covers push-toggle `Linking.openSettings()` behavior, while persistence, real permission-state
  probing, scheduling, and device-token registration remain deferred. Focused notification handoff
  tests and full `npm run check` passed.
- 2026-06-30: Added the More Notification Preferences anatomy slice: More now opens
  `/settings/notifications`, the screen renders local reminders, push reminders/sitter completion,
  quiet hours, and timezone sections with design primitives, navigation/scaffold contracts were updated,
  and full `npm run check` passed. Persistence and real permission-state probing remain open; the
  push-toggle OS settings deeplink is covered by §4.4.4a.
- 2026-07-02: Closed Stage 4 for `/settings/notifications`: captured a native SE screenshot from the
  installed PuppyPlan.app over Metro and verified the modal header, local reminders toggle, push
  reminders/sitter completion toggles, quiet-hours row, and timezone row against the locked More
  notification preferences anatomy. Persistence and real permission-state probing remain deferred;
  the push-toggle OS settings deeplink is covered by §4.4.4a.
- 2026-07-02: Added `/settings/notifications` state templates for loading, pending write, error, and
  offline read with typed EN/RU/ES copy, alert/live-region accessibility, no raw push-token details,
  and dev-gallery preview coverage. Persistence and real permission-state probing remain deferred;
  the push-toggle OS settings deeplink is covered by §4.4.4a.
- 2026-07-02: Closed Stage 4 for `/settings/notifications` state templates: captured native SE
  dev-gallery screenshots over Metro for loading/pending/error and offline-read cards. Real
  persistence, scheduling, and real permission-state probing remain deferred; the push-toggle OS
  settings deeplink is covered by §4.4.4a.
- 2026-06-30: Added the More Support / Help anatomy slice: More now opens `/settings/help`, the
  screen renders topic shortcuts, diagnostics rows, contact affordance, and a privacy-safe support
  note with EN/RU/ES typed copy; navigation/scaffold contracts were updated, and full `npm run check`
  passed. Real support ticket creation, diagnostics upload, and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/settings/help`: captured top and bottom native screenshots on the
  required SE simulator from the installed PuppyPlan.app over Metro, verified the modal header, intro
  card, topic rows, diagnostics/contact rows, and visible privacy note against
  `docs/design/v1/specs/06-4-more-support-help.md`. Real support ticket creation and diagnostics
  upload remain deferred.
- 2026-07-03: Added deterministic Help Support loading, pending-write, error, and offline-read state
  templates with RED/GREEN render coverage, dev-gallery native handoff, EN/RU/ES copy, and primary
  SE Stage 4 screenshot. Real support ticket creation and diagnostics upload remain deferred.
- 2026-07-03: Added Help Support email composer availability probing: the support contact row now
  checks `Linking.canOpenURL()` before opening the privacy-safe localized `mailto:` draft, and
  unavailable/rejected probes render the existing visible support error card without calling
  `openURL`. Live support ticket creation and diagnostics upload remain deferred.
- 2026-07-03: Added `/settings/privacy-account` as a native UI-only shell from More `Data and account`:
  local analytics/error-report toggles, export-request notice, typed delete-confirm preview, route
  and shell-i18n contracts, RED/GREEN render/navigation coverage, Expo typed-route regeneration, and
  primary SE Stage 4 screenshot. Real export, delete, analytics/error-report persistence,
  backend jobs, schema changes, and native modules remain deferred. Stage 4 also tightened
  `ScreenHeader` long-title fitting and moved privacy hints out of switch rows so compact SE text is
  not truncated.
- 2026-07-03: Added the real Privacy & Account sign-out action by reusing the shared `SignOutButton`
  on `/settings/privacy-account`. RED/GREEN route coverage verifies the localized action calls the
  existing auth `signOut()` path; export, delete, analytics/error-report persistence, backend jobs,
  schema changes, and native modules remain deferred. Primary SE Stage 4 screenshot:
  `output/v2-nav-gaps-stage4/settings-privacy-account-signout-stage4.jpg`.
- 2026-07-03: Added deterministic Privacy & Account loading, pending-write, error, offline-read,
  and permission-denied state templates with RED/GREEN render coverage, dev-gallery native handoff,
  EN/RU/ES copy, and primary SE Stage 4 screenshots. Real export jobs, account deletion jobs,
  analytics/error-report persistence, backend jobs, schema changes, and native modules remain
  deferred.
- 2026-06-30: Added the PuppyPlan Plus paywall shell slice: More now opens `/paywall`, the screen
  renders feature rows, annual/monthly/lifetime plan rows, Choose plan, Restore purchases, legal copy,
  and soft-lock availability note with EN/RU/ES typed copy; navigation/scaffold contracts were updated,
  and full `npm run check` passed. Live IAP/restore/entitlement enforcement and Stage 4 screenshots remain open.
- 2026-07-02: Closed Stage 4 for `/paywall`: SE screenshot review initially exposed a truncated
  `PuppyPlan Plus` modal title; added RED/GREEN `ScreenHeader` primitive coverage and widened the
  title lane, then recaptured top/bottom native screenshots showing the full header, feature rows,
  plan rows, Choose plan, Restore purchases, soft-lock info, and legal note. Live IAP/restore/
  entitlement enforcement remains deferred.
- 2026-07-02: Added deterministic PuppyPlan Plus loading, pending-purchase, purchase-error,
  offline-read, and active-subscription state templates with RED/GREEN render coverage,
  dev-gallery native handoff, EN/RU/ES copy, and primary SE Stage 4 screenshots. Live IAP,
  restore, product lookup, and entitlement enforcement remain deferred.
- 2026-07-02: Added deterministic Shareable Puppy Card empty-builder, health-on, share-options,
  loading, pending-write, error, and offline-read state templates with RED/GREEN render coverage,
  dev-gallery native handoff, EN/RU/ES copy, and primary SE Stage 4 screenshots. First visual pass
  exposed truncated helper copy in list rows; the state anatomy was corrected to wrapping rows before
  recording Stage 4 PASS. Live signed-link creation, OS share sheet, expiry editing, revoke/extend,
  and public web projection remain deferred.
- 2026-07-02: Added deterministic Trusted Sitter Mode no-caregiver, pending, active, and exit-confirm
  state templates with RED/GREEN render coverage, dev-gallery native handoff, EN/RU/ES copy, and
  primary SE Stage 4 screenshots. Live caregiver lookup, enable/exit mutations, active checklist data,
  completion push, auto-expire, and pending-sync behavior remain deferred.
- 2026-07-02: Rebuilt `/share/[token]` revoked/expired as a native closed-access shell with
  privacy-safe neutral copy, locked status pill, info/next-step cards, CTA, EN/RU/ES shell keys,
  RED/GREEN render coverage, shell i18n contract update, and primary SE Stage 4 screenshot. Live
  token lookup, provider payload parsing, and public projection remain deferred.
- 2026-07-02: Added a non-production Supabase Dev health-record seed for the existing debug account
  and closed seeded production Stage 4 evidence for `/pet/health-record/[recordId]` loaded detail,
  edit mode, and delete-confirm anatomy. The runtime pass exposed an iOS accessibility issue where
  the delete-confirm alert Card swallowed nested `Cancel` / `Delete` button targets; added RED/GREEN
  coverage and an explicit `Card accessible={false}` override for this nested-button container.
  Real delete/undo snackbar Stage 4 remains blocked by the known deferred Health soft-delete RLS gap:
  authenticated `deleted_at` update returns `42501`; the dev seed was restored afterward.
- 2026-07-02: Added the Reminders Hub durable enabled/off toggle slice: `public.reminder.enabled`
  updates now go through the typed Supabase/query boundary, invalidate the durable reminders list plus
  current Diary dashboard, and the `/reminders` row switch sends active care context while disabling
  the pending row and surfacing mutation failure through the existing calm error card. No scheduling,
  occurrence generation, native module, schema, analytics, or native-project edit was introduced.
- 2026-07-03: Added deterministic Reminders Hub loading, pending-write, error, offline-read, and
  empty state templates with RED/GREEN render coverage, dev-gallery native handoff, EN/RU/ES copy,
  and primary SE Stage 4 screenshots. Reminder scheduling, occurrence generation, local
  notifications, permission probing, row edit menus, schema/native modules, and native-project edits
  remain deferred.
- 2026-07-03: Added Manage Household pending invite read-only wiring: owner-readable `public.invite`
  rows now flow through a typed Supabase/query boundary into `/settings/household`, using a
  household-scoped privacy-safe cache key and rendering only localized role/status/date copy.
  Current RLS still blocks a full live member list without an approved RLS/RPC design, so member
  data, role changes, invite creation, resend/revoke, confirm sheets, and token/contact display
  remain deferred.
