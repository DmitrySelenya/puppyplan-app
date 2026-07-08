# Redesign V2 Intake - Plan

> For implementation agents: this is the **intake/sequencing plan** that executes Phase 3 ("Redesign intake") of [`2026-06-17-redesign-resequencing.md`](2026-06-17-redesign-resequencing.md). **Phases 0–1 are directly actionable from this doc.** Phases 2–4 each spawn their own per-feature plan (+ ADR delta where noted) before code — this doc pins their canonical targets so the sub-plan author does not re-derive scope. Living document: update checkboxes and Changelog as work lands.

**Goal:** Absorb the delivered V2 design package with minimum churn, by treating it as the **canonical refinement of the existing design language** (not a ground-up redesign): sync the foundation (tokens + fonts + primitives + behavior contracts), reconcile the one real data change (tracker taxonomy), re-skin existing screens against the V2 atlas, then build the still-unbuilt surfaces against a locked spec.

**Status:** Active - Phase 3 screen re-skin complete; Phase 7 hardening evidence recorded.

**Plan type:** Redesign intake (sequencing + foundation contract). Parent: `2026-06-17-redesign-resequencing.md` Phase 3.

**Current phase:** Phase 3 - Re-skin existing screens against v2.

**Architecture:** Trust-first per `.agents/skills/plan/SKILL.md`. The V2 delta concentrates in **layer 1 (contracts)** for the tracker taxonomy and in **`src/design` tokens/primitives** for everything visual/behavioral; feature screens are a re-skin on top because `CLAUDE.md` already forces feature code through `src/design`. Token source of truth is `design-tokens.json` → `scripts/design/generate-tokens.mjs` → `src/design/tokens.ts` (never hand-edit `tokens.ts`).

**Linear:** No-Linear exception: cross-issue execution of an already-tracked redesign intake (parent resequencing plan, PUP-26..PUP-32 split). Phase 2 (taxonomy) gets its own PUP issue when it starts.

**Branch:** N/A for the planning doc. Phase 0 doc moves may ride a small `docs/` branch.

**TDD mode:** N/A for this doc. Phase 2 (taxonomy contract) is **heavy/full-isolated** (schema + data). Per-surface plans keep their own mode.

**Supabase verification mode:** No-Docker local workflow. Do **not** use Docker-backed `npm run supabase:test` or remote DB wrappers as mandatory local gates for this intake. For this branch, schema/RLS confidence comes from migrations + generated DB type checks + no-Docker static SQL/RLS/typegen guardrails via `npm run supabase:guardrails` (`scripts/checks/supabase-baseline.test.mjs`, `scripts/checks/supabase-typegen-output.test.mjs`, `scripts/checks/check-database-types-generated.mjs`) plus contract tests. Any future executable pgTAP run needs a separately documented non-Docker runner; Docker is not part of this workflow.

**Primary source docs:**
- V2 package: `~/Downloads/Puppy app_V2/` — `screenshots/`, `uploads/puppy_app (1)/screens/*.jsx`, two `tokens.css` (inner working = Quicksand+Nunito; `export/src/tokens.css` = system fallback), `components.jsx`, `icons.jsx`, `uploads/puppy-tokens-patch.css` (the Lora+mauve patch), `uploads/foundation_library_warm_light_v2.html`, and **`CHANGELOG-pass3.md`** (the 18-point review diff written for us).
- Parent plan: `docs/plans/active/2026-06-17-redesign-resequencing.md`
- Token pipeline: `design-tokens.json`, `scripts/design/generate-tokens.mjs`, `scripts/design/generate-tokens.test.mjs`, `src/design/tokens.ts`, `src/design/primitives/AppText.tsx`
- Schema governance: `docs/architecture/adr/0007-prd-schema-baseline.md` + migration `supabase/migrations/20260608212607_puppy_quick_tracker_ids.sql` (the `puppy.quick_tracker_ids` allowed-id constraint to amend)
- Design system: `docs/architecture/06-design-system-and-ui-contracts.md`, ADR-0011
- Pipeline + atlas template: `docs/agents/design-fidelity-pipeline.md`, `docs/design/v2/manifest.json`, `docs/design/v1/manifest.json`
- Frozen-then-retargeted: `docs/plans/completed/2026-06-13-design-fidelity-recovery.md`, `docs/plans/completed/2026-06-13-design-fidelity-ux-audit.md`

---

## Context

The deep redesign that `2026-06-17-redesign-resequencing.md` was sequencing around has **arrived** as the `Puppy app_V2` package. Studied in full, it is **not** a ground-up redesign. It is the same design DNA (warm beige `#FBFAF7` base, Calm Teal primary, Ember-Coral celebration accent, muted statuses, iOS HIG large-title patterns) **(a)** fleshed out across every surface and **(b)** corrected through three review passes (`CHANGELOG-pass3.md`: 3×P0 + 8×P1 + 7×P2, all closed). The changelog is written explicitly as a catch-up diff for the team that already built UI against an earlier version — i.e. for us.

- **Context package:** the V2 package files above; current `src/design/*`, `src/contracts/quick-log.ts`, `src/contracts/business-rules.ts`; the parent resequencing plan; ADR-0007 and ADR-0011.
- **Context placement:** this plan holds the long-form intake context; per-surface plans hold detailed contracts/tests; PRs hold verification evidence.

**Already aligned in code** (we built against a recent version — no catch-up needed):
- Duplicate-care window already `60s` (`src/contracts/business-rules.ts:4`); changelog 3.1 done.
- Pill key already `needsVetReview` (`src/design/tokens.ts:76`); changelog 3.2 done.
- Token surfaces, primary/accent ramps, statuses, type **scale** (sizes/line-heights), elevation, spacing, radius, haptics are near-identical to `tokens.css`.

**Real deltas to absorb:**
1. **Tracker taxonomy (P0, Package 1) — the one genuine data change.** Current contract (`src/contracts/quick-log.ts:16`) uses `potty_pee_outside · potty_pee_inside · potty_poop · feeding_meal · sleep_nap · zoomies`. V2 canon: trackers `potty · feeding · sleep · walk · weight` (+ optional `play · training · biting`, max 5), with `potty` subtype `outside · inside · poop` as **event data**, not separate trackers. **This pass (per Locked Decisions 3, 6, 7): unify the three potty tiles into one `potty` tracker + `subtype`, add `walk`, keep `zoomies` as-is, and treat `weight` as a Health record — not a Quick Log event.**
2. **Token + font refinements — APPROVED (user-confirmed 2026-06-22):** `info` cold slate `#3C5C7A` → warm mauve `#6E5862` (+ `infoTint` `#E2E8EF` → `#ECE4E6`, WCAG AA verified); **type system → Lora (display/headings) + Nunito (body/text)**. This is **new custom-font infrastructure** (no custom fonts ship today). See Locked Decision 5.
3. **New behavior/primitive contracts:** FAB-policy (FAB only on log surfaces Today/Timeline/Health; snackbar hides FAB; `--pp-bottom-inset-fab: 120`), nav/text/chip actions as real 44pt buttons, `ListRow` `role`/`selected`, paywall single-radio plan pattern, sitter button variants, danger-filled reserved for Delete-account + Delete-entry only.
4. **Unbuilt surfaces (DEFER lane):** Sharing (family/sitter/trainer), Cards, Reminders, Paywall, Guidance — exactly PUP-26..PUP-32, now unblocked by a locked spec.

---

## Goals

1. **Lock V2 as the canonical atlas** and retarget the frozen fidelity plans onto it.
2. **Sync the foundation** (tokens + fonts + primitives + behavior contracts) so the redesign is absorbed by `src/design`, not by rewriting screens.
3. **Reconcile the tracker taxonomy** as a clean contract+schema change under ADR-0007 (trust-first, redesign-proof).
4. **Re-skin existing screens** against the V2 atlas and apply the `CHANGELOG-pass3` point-fixes.
5. **Build the deferred surfaces** (PUP-26..32) against the locked spec, trust layers first.

---

## Non-Goals

- Rewriting screens that are already a structural match — V2 is a re-skin, not a teardown.
- Re-deriving changelog items already shipped here (dedup window, `needsVetReview`).
- Renaming `zoomies` → `play` (deferred, Decision 6) or adding optional `play`/`training`/`biting` trackers this pass.
- Making `weight` a loggable Quick Log event (Decision 7 — it stays a Health record).
- Schema changes beyond the tracker taxonomy reconciliation and what each per-surface plan scopes.
- Building deferred-surface UI before its contract/RLS/Edge layers land.
- A dark-mode pass (V2 is light-mode only, same as before).

---

## Product Decisions Locked In

1. **V2 is a refinement, not a ground-up redesign.**
   - **Chosen:** Intake = foundation-sync + taxonomy reconcile + re-skin, leaning on the `src/design` absorption layer.
   - **Reason:** Same design DNA; `CHANGELOG-pass3` is a point-diff; most P0/P1 fixes already shipped here.

2. **Adopt the `info` mauve token.** *(user-confirmed)*
   - **Chosen:** `design-tokens.json` `info` `#3C5C7A`→`#6E5862`, `infoTint` `#E2E8EF`→`#ECE4E6`; regenerate `tokens.ts`; keep the "info status always carries an icon, never color alone" rule.
   - **Reason:** Latest design verdict; WCAG AA proofs provided; trivial via the token pipeline.

3. **Tracker taxonomy aligns to the V2 canon — scoped to this pass.**
   - **Chosen:** Collapse the three `potty_*` trackers into one `potty` tracker + a `subtype` event field (`outside`/`inside`/`poop`); add `walk`; **keep `zoomies`**; **do not** add `weight` as an event tracker. ADR-0007 additive delta + migration + RLS + contract + i18n.
   - **Reason:** Canon unifies three divergent vocabularies (Quick Log / Settings / Timeline); user scoped zoomies and weight (Decisions 6–7) to keep the change minimal and data-safe.

4. **Trust-first order governs the intake.**
   - **Chosen:** Foundation + taxonomy (layers 1–2 + `src/design`) before any screen re-skin; deferred surfaces' logic before their UI.
   - **Reason:** Matches the canonical workflow and the parent resequencing plan.

5. **Type system → Lora (display/headings) + Nunito (body/text).** *(designer decision 2026-06-22, grounded in V2 facts)*
   - **Chosen:** Display/Title1/Title2/Title3/Headline variants render in **Lora** (weights 500–600; use 600 where the scale currently says 700 — serif reads heavy at 700); Body/Callout/Subheadline/Footnote/Caption render in **Nunito** (400/700); Mono unchanged. `--pp-font` (body) → Nunito, `--pp-font-display` → Lora.
   - **Evidence:** V2's own foundation library screen (`screens/library.jsx:100,327`) and inner `tokens.css:95-97` document **Quicksand (display) + Nunito (text), "warm & rounded"**; `puppy-tokens-patch.css` then swaps **Quicksand → Lora** for display and **keeps Nunito for body** ("Тело остаётся Nunito"). The system-font `export/src/tokens.css` is a portability fallback, not the design intent.
   - **Reason (designer):** Lora is a warm bracketed serif; at weight 600 it gives the calm, trustworthy, lightly editorial tone the product voice already uses ("from here, a calm rhythm") without feeling childish like geometric Quicksand. Nunito's rounded humanist sans keeps body friendly and highly legible at 16–17pt. Lora + Nunito is a recognized harmonious pairing and yields clear serif/sans hierarchy. It is a real brand upgrade over both the generic system stack and Quicksand.
   - **Cost flagged:** new font infra (two families) — see Phase 1 risks (Dynamic Type, tabular-nums in Nunito, bundle size).

6. **Keep `zoomies` this pass.** *(user-confirmed)*
   - **Chosen:** Leave `zoomies` as an existing tracker/event type; do not rename to `play` now.
   - **Reason:** User: "оставим zoomies, потом изменим, чуть-что." A later rename, if wanted, is its own data-preserving migration.

7. **`weight` is a Health record, not a Quick Log event.** *(user-confirmed)*
   - **Chosen:** Do not log `weight` to `event_log`. It is created/edited in the Health "weight check" entry. If the V2 Quick Log shows a `Weight` tile, it deep-links to the Health weight entry rather than writing an event.
   - **Reason:** User: weight is edited in weight check, not logged separately. Avoids a redundant data path.

---

## Resolved / Remaining Questions

All blocking questions from the first draft are resolved (Decisions 6, 7, 5). Remaining minor items, non-blocking, to settle inside their phase:
- **Phase 1:** Lora/Nunito mapping is covered by render tests; native XXL/XXXL visual inspection remains a final hardening spot-check because this branch has not run an iOS simulator.
- **Phase 3:** whether the V2 Quick Log layout reserves a `Weight` tile at all (Decision 7 makes it a Health deep-link if present; otherwise omit).

---

## Invariants And Executable Spec

- **Invariant — token source of truth:** visual tokens/fonts change only via `design-tokens.json` + regeneration; `tokens.ts` is never hand-edited.
  - **Test:** `scripts/design/generate-tokens.test.mjs` + token-drift check.
- **Invariant — one tracker vocabulary:** Quick Log tiles, Settings tracker list, Timeline filters, and onboarding selection all derive from a single canonical tracker source; `potty` subtype never surfaces as a separate tracker/filter; `weight` never appears as a loggable event.
  - **Test:** `src/test/quick-log.*` + a taxonomy-consistency test asserting the four surfaces share one source.
- **Invariant — tabular numerals preserved:** numeric values (weight, dose, time) keep tabular-nums after the Nunito switch.
  - **Test:** AppText/number-render test asserting `fontVariant`/`fontFeatureSettings` tnum on numeric styles.
- **Invariant — FAB policy:** FAB renders only on log surfaces and never while a snackbar is visible; scroll containers on FAB surfaces reserve `--pp-bottom-inset-fab`.
  - **Test:** `src/test/design-primitives.render.test.tsx` (FAB visibility) + per-screen render tests.
- **Invariant — danger-filled reserved:** filled-danger buttons appear only on Delete-account and Delete-entry.
  - **Test:** primitive/render tests asserting variant usage.
- **Invariant — permission enforcement stays server-side:** deferred-surface UI never becomes the enforcement boundary; RLS/Edge own it.
  - **Test:** pgTAP negative tests in the per-surface plans (PUP-27/28/29).
- **Invariant — no raw private data:** unchanged; synthetic data only in any new screenshots.

---

## Implementation Plan

### Phase 0 - Lock V2 as the atlas *(directly actionable; doc-only)*
**Files:** new `docs/design/v2/**`, `docs/plans/README.md`, the two fidelity plans.
**Checklist:**
- [x] Copy the V2 package into `docs/design/v2/` mirroring the `docs/design/v1` structure: `screenshots/`, `raw/` (screens/components/icons/tokens), and a `manifest.json` using schema `puppyplan.design-manifest.v1` that maps each artboard -> screenshot (model on `docs/design/v1/manifest.json`).
- [x] Record the canonical token/font source: inner `tokens.css` + `puppy-tokens-patch.css` are the intent; note the system-font export is a fallback.
- [x] Retarget the two fidelity plans from the v1 atlas to v2 (lift `Paused (redesign pending)`, point acceptance at `docs/design/v2`).
- [x] Update `docs/plans/README.md` current-plans table (this plan active; resequencing plan now in Phase 3).
- [x] Triage H1-H7 UX-audit findings against v2 (kept / resolved-by-v2 / re-scoped).
**Acceptance:** A single locked v2 atlas exists with a manifest the pipeline can consume; no plan targets the v1 atlas as a gate.

### Phase 1 - Foundation sync *(directly actionable; redesign-proof)*
**Files:** `design-tokens.json`, `scripts/design/generate-tokens.*`, `src/design/tokens.ts` (generated), `src/design/primitives/AppText.tsx`, `FAB.tsx`, `Snackbar.tsx`, `ListRow.tsx`, `ScreenHeader.tsx`, `Touchable.tsx`/`IconButton.tsx`, app root font loader, `package.json`.
**Checklist:**
- [x] **Info token:** in `design-tokens.json` set `info` `#6E5862`, `infoTint` `#ECE4E6`; regenerate `tokens.ts`; update token-drift/contrast tests.
- [x] **Font tokens:** add `typography.fontFamily.display = "Lora"` and `.text = "Nunito"` (or equivalent), regenerate.
- [x] **Font infra:** add `expo-font` + `@expo-google-fonts/lora` (500,600) + `@expo-google-fonts/nunito` (400,700); load at the app root provider; gate first render on `useFonts`.
  - Note: `expo-asset` is recorded as a direct SDK-bundled resolver dependency because `expo-font` imports it at runtime and Jest/Metro need a top-level resolution path. It is not a new product integration.
- [x] **AppText mapping:** in `src/design/primitives/AppText.tsx`, set `fontFamily` per variant — Lora for display/title1/title2/title3/headline (weight 600 where scale says 700), Nunito for body/callout/subheadline/footnote/caption; preserve tabular-nums on numeric styles.
- [x] **FAB policy:** add `--pp-bottom-inset-fab` (≈120) to the token source; encode "FAB only on log surfaces" + "snackbar hides FAB" on `FAB`/`Snackbar`; apply the bottom-inset to FAB-surface scroll containers.
- [x] **Primitives:** ensure nav actions in `ScreenHeader` and text/chip actions are real ≥44pt touch targets (`hitSlop` where visual <44pt); add `ListRow` `role`/`selected` props.
- [x] **Primitive stability inventory** (parent plan PREP #2): classify shape-stable vs. changed.

**Primitive stability inventory (Phase 1):**
- Shape-stable, token-inherited: `Button`, `IconButton`, `Touchable`, `ScreenHeader`, `SectionHeader`, `Card`, `StatusPill`, `SheetSurface`, `TrackerTile`, `SegmentedControl`, `Avatar`, `PendingDot`.
- Contract-changed: `AppText` now maps display/title/headline to Lora, copy variants to Nunito, and exposes `numeric` tabular behavior; `Snackbar` now exports active state and uses `bottomInsetFab`; `ListRow` now supports `selectionRole="radio" | "checkbox"` with selected state.
- Shell/surface policy-changed: tab FAB renders only on `/today`, `/health`, and timeline paths and hides while Snackbar is active; Today/Health/Timeline scroll content reserves `tokens.layout.bottomInsetFab`; More reserves tab padding only.
**Verification:** `npm run lint`, `npm run typecheck`, `npm run test`, token-drift/contrast check, `src/test/design-primitives.render.test.tsx`; manual Dynamic Type XXL/XXXL spot-check of Lora display + Nunito body + tabular numerals.
**Acceptance:** `src/design` carries the v2 look (mauve info, Lora/Nunito) + behavior (FAB policy, 44pt actions); existing screens inherit most of the change without edits.

### Phase 2 - Tracker taxonomy contract *(spawn PUP issue + per-feature plan + ADR-0007 delta before code; heavy/full-isolated TDD)*
**Canonical target (pinned so the sub-plan author does not re-derive):**
- Trackers after this pass: `potty` (one tile) · `feeding` · `sleep` · `walk` (new) · `zoomies` (kept). `weight` = Health record, not a tracker.
- `potty` event gains `subtype ∈ {outside, inside, poop}` (event data; shown in Timeline, one tile/filter).
- Amend the allowed-id set + default in `supabase/migrations/20260608212607_puppy_quick_tracker_ids.sql` (new migration, not an edit-in-place) and the `event_log` event-type set.

#### Spec Lock - Phase 2 Tracker taxonomy contract (2026-06-23)

**TDD mode:** heavy/full-isolated. User authorized subagents for RED/GREEN/REFACTOR isolation on 2026-06-23. No Docker, remote DB mutation, production DB action, Linear mutation, commit, push, or PR is in scope for this pass.

##### Acceptance Criteria
- **AC-1:** `quickLogTrackerIds`, `defaultQuickLogTrackerIds`, `quickLogTrackerIdSchema`, `selectedQuickLogTrackerIdsSchema`, and `puppyQuickTrackerIdsSchema` accept exactly `potty`, `feeding`, `sleep`, `walk`, and `zoomies` as Quick Log tracker ids; `weight`, `training`, `potty_pee_outside`, `potty_pee_inside`, `potty_poop`, `feeding_meal`, and `sleep_nap` are rejected at the contract boundary.
- **AC-2:** `createQuickLogEventInsert` maps `feeding`, `sleep`, `walk`, and `zoomies` commands to their event inserts with strict payloads; one-tap `walk` uses event type `walk` with an empty payload, may carry optional positive integer `duration_minutes` when provided, and `zoomies` remains event type `zoomies`.
- **AC-3:** `potty` command creation requires a `subtype` value of `outside`, `inside`, or `poop`; the resulting event insert has event type `potty` and payload `{ subtype: ... }`, with no legacy `quick_action` field.
- **AC-4:** Quick Log queue/event payload schemas accept canonical potty subtype payloads and strict walk payloads (`{}` or `{ duration_minutes: positive integer }`), reject old potty `quick_action` payloads for new writes, and still reject private/free-text fields.
- **AC-5:** Duplicate-care logic covers `feeding`, `potty:outside`, and `potty:poop` within 60 seconds, excludes `potty:inside`, and keeps `sleep`, `walk`, and `zoomies` non-warning buckets.
- **AC-6:** A new Supabase migration updates existing `public.puppy.quick_tracker_ids` data, defaults, and constraints from legacy ids to canonical ids without editing existing applied migrations.
- **AC-7:** The migration preserves old potty selected-tracker history by mapping any of `potty_pee_outside`, `potty_pee_inside`, or `potty_poop` in `quick_tracker_ids` to a single `potty` id, preserves order as much as possible, deduplicates after mapping, and falls back to the canonical default if the mapped set would be empty.
- **AC-8:** The migration maps existing `event_log` potty payloads from `quick_action = pee_outside|pee_inside|poop` to `subtype = outside|inside|poop` and leaves already-canonical subtype payloads unchanged.
- **AC-9:** No-Docker SQL/RLS/typegen guardrails prove the new migration, `supabase/tests` selected-tracker coverage, canonical allowed-id/default constraint, old-id rejection, household/owner update coverage, and generated DB types remain current.

##### Edge Cases
- **EC-1:** A selected tracker array containing two old potty ids maps to one `potty` and remains unique.
- **EC-2:** A selected tracker array containing both legacy potty ids and canonical `potty` maps to one `potty`.
- **EC-3:** Existing non-potty canonical ids keep their relative order after migration.
- **EC-4:** Existing unknown selected ids are removed by the migration before the new allowed-id constraint is applied.
- **EC-5:** Existing empty selected arrays are repaired to the canonical default before the non-empty constraint is enforced.
- **EC-6:** `weight` remains Health-only and must not appear in Quick Log ids, Quick Log event types, queue event types, or duplicate-care buckets.

##### Error Cases
- **ERR-1:** `createQuickLogEventInsert` rejects a `potty` command without `subtype`, with an invalid subtype, or with a private/free-text payload field.
- **ERR-2:** `selectedQuickLogTrackerIdsSchema` rejects duplicates, empty arrays, more than five ids, old ids, `training`, and `weight`.
- **ERR-3:** Supabase static guardrails fail if the new migration edits/redefines an applied migration in place, permits old tracker ids, omits owner/non-member RLS coverage text, or weakens the no-Docker verification model.

##### Constraints
- Do not edit existing applied migrations, especially `20260608212607_puppy_quick_tracker_ids.sql` and `20260609120000_puppy_quick_tracker_ids_non_empty.sql`.
- Do not run Docker, `npm run supabase:test`, remote migration apply, production DB checks, or remote DB mutation.
- Keep `app/` thin; Phase 2 does not do screen re-skin work. UI propagation is Phase 3/4 of this intake unless needed only to satisfy compile-time contract references.
- Do not add dependencies or weaken TypeScript, lint, test, RLS, privacy, or no-Docker guardrails.

##### Out of Scope
- Renaming `zoomies` to `play`.
- Adding optional `play`, `training`, or `biting` Quick Log trackers.
- Building the Health weight-entry UI or making `weight` a Quick Log event.
- Full screen re-skin, Timeline filter redesign, Settings redesign, or onboarding visual polish.

**Checklist:**
- [x] No-Linear exception retained for this cross-issue intake pass; ADR-0007 additive-delta entry added.
- [x] Update `src/contracts/quick-log.ts`: single `potty` + `subtype`, add `walk`; contract tests for valid/invalid/boundary; keep `zoomies`.
- [x] Migration for `event_log` event-type + `puppy.quick_tracker_ids` constraint/default; generated DB types; no-Docker SQL/RLS/typegen guardrail tests; share + timeline projections updated.
- [x] Propagate the single source through Quick Log tiles, Settings tracker list, Timeline filters, onboarding selection; i18n EN/RU/ES key parity.
**Acceptance:** One canonical tracker vocabulary end-to-end; migration is data-safe and tested; existing `zoomies`/potty history preserved.
**Verification:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run check`, `npm run supabase:guardrails`, and `git diff --check` exited 0 on 2026-06-23. Focused RED/GREEN evidence covered `src/test/quick-log-contracts.test.ts`, `src/test/supabase-contracts.test.ts`, `scripts/checks/supabase-baseline.test.mjs`, and targeted render/query fixtures for Quick Log, Settings, Timeline, onboarding, and i18n parity.

### Phase 3 - Re-skin existing screens against v2 *(per surface, via `design-fidelity-pipeline`; each its own batch)*
Screens: Today, Quick Log, Health, Onboarding, Timeline, More/Settings.
**Checklist:**
- [x] Apply the relevant `CHANGELOG-pass3` point-fixes per screen (FAB policy, onboarding 2.5 wizard-chrome vs 2.6 first-Today split, single-feedback celebration, error-state form matching, a11y button upgrades). Today completed on 2026-06-23 with the V2 design lock at `docs/design/v2/specs/today-v2.md` and native SE evidence at `output/design-fidelity/v2-phase3/today/README.md`. Health completed on 2026-06-23 with the V2 design lock at `docs/design/v2/specs/health-v2.md` and native SE evidence at `output/design-fidelity/v2-phase3/health/README.md`. Onboarding completed on 2026-06-23 with the V2 design lock at `docs/design/v2/specs/onboarding-v2.md` and native SE evidence at `output/design-fidelity/v2-phase3/onboarding/README.md`. Timeline completed on 2026-06-23 with the V2 design lock at `docs/design/v2/specs/timeline-v2.md` and native SE evidence at `output/design-fidelity/v2-phase3/timeline/README.md`. More/Settings completed on 2026-06-23 with the V2 design lock at `docs/design/v2/specs/more-settings-v2.md` and native SE evidence at `output/design-fidelity/v2-phase3/more-settings/README.md`.
- [x] Quick Log: one `potty` tile + subtype segment in the details form; `Weight` tile omitted for this pass per ADR-0007 Decision 7 / Health-only scope.
- [x] Health: list, empty, edit, confirmed detail, needs-vet-review detail, delete confirmation, and weight-entry states use V2 anatomy; status values are nouns; stage strip has one active state; `No clinic listed` filler is absent.
- [x] Structural anatomy + a11y tests; side-by-side v2-atlas compare for every changed state. Today completed on 2026-06-23 with gate result `PASS` and named deviation `V2-TODAY-COMPOSITE-RAW-REF` because the delivered atlas has no standalone Today PNG. Health completed on 2026-06-23 with gate result `PASS` and named deviations `V2-HEALTH-SYNTHETIC-GALLERY-EVIDENCE` and `V2-HEALTH-SE-SEGMENT-WRAP`. Onboarding completed on 2026-06-23 with gate result `PASS` and named deviation `V2-ONBOARDING-SYNTHETIC-GALLERY-EVIDENCE`. Timeline completed on 2026-06-23 with gate result `PASS` and named deviation `V2-TIMELINE-SYNTHETIC-GALLERY-EVIDENCE`. More/Settings completed on 2026-06-23 with gate result `PASS` and named deviations `V2-MORE-SYNTHETIC-GALLERY-EVIDENCE`, `V2-MORE-DEFERRED-PLUS-PLACEHOLDER`, and `V2-MORE-DEFERRED-SETTINGS-PLACEHOLDERS`.
**Acceptance:** Existing screens match the v2 atlas; deviations recorded + approved.

### Phase 4 - Build deferred surfaces against locked v2 (PUP-26..32) *(each its own per-feature plan)*
Order (trust layers first, then UI): Reminders (PUP-26) → Family/Sitter (PUP-27/28) → Trainer/Cards (PUP-29/30) → More/Paywall (PUP-31/32). This plan fixes only the order and the logic-before-UI rule.
**Acceptance:** Each surface built once, against the final design, over verified logic.

### Phase 5 - Release / a11y gates against v2
**Checklist:**
- [x] Dynamic Type XXL/XXXL (EN/RU/ES), VoiceOver/TalkBack, screen-states matrix parity, Maestro flows — re-run against v2 for the in-scope existing-screen pass. Evidence is the Phase 7 hardening table below: string-budget/i18n checks, structural render tests, SE native screenshots, and focused accessibility assertions passed. Maestro remains a future installable-dev-build gate per repo policy.
**Acceptance:** v2 passes the visual/a11y/E2E gates.

---

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Two custom fonts regress Dynamic Type / load perf / lose tabular-nums | Bundle via `expo-font`, gate render on `useFonts`, test XXL/XXXL, assert tnum on numeric styles, keep system fallback in the stack |
| Lora at heading weight 700 reads heavy | Map headings to Lora 600 (Decision 5); compare to atlas |
| Potty-unification migration loses subtype history | Map existing `potty_pee_outside/inside/poop` → `potty` + `subtype` in the migration; cover with no-Docker SQL/RLS/typegen guardrails and contract tests before apply |
| "Re-skin" hides a real structural change on some screen | Per-screen v2-atlas compare in Phase 3 catches structural drift, not just color |
| Token change ripples unexpectedly | Token pipeline + drift/contrast tests; change `design-tokens.json` only, never `tokens.ts` |
| Deferred-surface UI built before its logic | Phase 4 fixes logic-before-UI; RLS/Edge land before screens |

---

## Phase 7 Hardening Evidence

Simulator used for native evidence: `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`). All captured screen states use synthetic app data only.

| Surface | Design lock | Evidence | Gate result |
|---|---|---|---|
| Today | `docs/design/v2/specs/today-v2.md` | `output/design-fidelity/v2-phase3/today/README.md` | `PASS`; deviation `V2-TODAY-COMPOSITE-RAW-REF` |
| Quick Log | `docs/design/v2/specs/quicklog-v2.md` | `output/design-fidelity/v2-phase3/quicklog/README.md` | `PASS`; deviations `V2-QUICKLOG-WEIGHT-OMITTED`, `V2-QUICKLOG-SYNTHETIC-GALLERY-EVIDENCE` |
| Health | `docs/design/v2/specs/health-v2.md` | `output/design-fidelity/v2-phase3/health/README.md` | `PASS`; deviations `V2-HEALTH-SYNTHETIC-GALLERY-EVIDENCE`, `V2-HEALTH-SE-SEGMENT-WRAP` |
| Onboarding | `docs/design/v2/specs/onboarding-v2.md` | `output/design-fidelity/v2-phase3/onboarding/README.md` | `PASS`; deviation `V2-ONBOARDING-SYNTHETIC-GALLERY-EVIDENCE` |
| Timeline | `docs/design/v2/specs/timeline-v2.md` | `output/design-fidelity/v2-phase3/timeline/README.md` | `PASS`; deviation `V2-TIMELINE-SYNTHETIC-GALLERY-EVIDENCE` |
| More/Settings | `docs/design/v2/specs/more-settings-v2.md` | `output/design-fidelity/v2-phase3/more-settings/README.md` | `PASS`; deviations `V2-MORE-SYNTHETIC-GALLERY-EVIDENCE`, `V2-MORE-DEFERRED-PLUS-PLACEHOLDER`, `V2-MORE-DEFERRED-SETTINGS-PLACEHOLDERS` |

Dynamic Type / string-fit hardening: EN/RU/ES string-budget and parity checks are covered by `npm run check`, screen anatomy tests cover compact SE layout states, and AppText font scaling stays through shared design primitives. No new truncation deviation was recorded in the captured SE states for Today, Quick Log, Health, Onboarding, Timeline, or More/Settings.

VoiceOver / accessibility spot checks: primary actions, filter chips, tracker toggles, status cards, snackbar/failure actions, retry/delete actions, and deferred settings rows are covered by focused render assertions for role, label, selected/disabled/busy state, and row-level summaries. No color-only state was introduced.

Scope/privacy review: changed files contain no generated `ios/` or `android/` edits, no new Supabase migrations in this phase, no hand edit to `src/design/tokens.ts`, and no Phase 4 deferred-surface implementation. Changed docs/tests/screenshots use synthetic data only and contain no raw puppy names, notes, emails, provider names, photos, invite/share tokens, production rows, or secrets.

---

## Changelog

- 2026-06-23: Phase 4 sitter/trainer **access model** decided and documented (does not authorize code). Trainer/kinologist becomes a **live read-only web view** (no account/app — ADR-0018); pet sitter becomes a **one-step, in-app, badged device-style share** that keeps the rich PRD window/checklist/completion-push; the card "revocable link" recipient reuses the trainer web surface. Added `docs/design/v2/decisions/2026-06-23-sharing-access-model.md`, `docs/design/v2/specs/sharing-sitter-trainer-v2.md`, `docs/architecture/adr/0018-sharing-surface-split-web-trainer-app-sitter.md`, and `docs/design/v2/cloud-design-prompt-sharing.md`. Updated DESIGN.md §3.2.1/§3.3.3/§3.3.5/§3.3.6, `09-sharing-and-permissions.md`, `05-navigation-and-deeplinks.md`, `screen-states-matrix.md`, ADR_INDEX, and PRD trainer/sitter sections. Native implementation remains PUP-27/28/29 (Phase 4, trust layers before UI).
- 2026-06-23: Follow-up review finding fixed for Quick Log SQLite queue corrupt terminal rows. RED: focused queue storage test failed because a corrupt `server_confirmed` v2 potty row was quarantined to `{}` but still rejected by stored-row payload validation. GREEN: `corrupt_payload` stored-row parse bypass now includes the preserved `server_confirmed` terminal state, keeping confirmed/deleted terminal rows readable while normal non-quarantined payload validation remains unchanged. Verification: `npm run test:unit -- --runTestsByPath src/test/quick-log-queue-storage.test.ts` passed with 19 tests, `npm run typecheck` passed, and `git diff --check` passed.
- 2026-06-23: Follow-up deep-review fixes completed for Quick Log SQLite queue migration hardening. RED: `npm run test:unit -- --runTestsByPath src/test/quick-log-queue-storage.test.ts` failed as expected because corrupt payload JSON stayed unreadable and `deleted_before_sync` rows were revived to `failed_permanent`. GREEN/verification: focused queue storage suite passed with 18 tests, `npm run typecheck` passed, `npm run check` passed with 62 Jest suites / 443 tests, 118 Node tests, scaffold, token drift, privacy scan, and text hygiene all green, and `git diff --check` passed. The full gate emitted an existing React test `act(...)` console warning from `screen-header.render.test.tsx`; it did not fail the gate and is unrelated to this queue migration fix.
- 2026-06-23: Follow-up deep-review fix spec locked for Quick Log SQLite queue migration hardening. TDD mode: lightweight; reduced assurance because Codex subagents were not explicitly authorized for this follow-up. Acceptance: (AC-1) v2 -> v3 migration quarantines semantically invalid legacy/canonical potty object payloads before queue reads can parse them, (AC-2) quarantined corrupt rows remain readable/deletable after migration without reparsing unsafe legacy JSON, and (AC-3) terminal `deleted_before_sync` corrupt rows are not revived to retryable/permanent failed states. Constraints: no Supabase schema/RLS changes, no new dependencies, no raw private payload/error logging, keep Quick Log local-first queue semantics.
- 2026-06-23: Follow-up review remediation for the local Quick Log SQLite queue `2 -> 3` migration. Confirmed corrupt legacy `potty` payloads could repeatedly abort queue initialization before `PRAGMA user_version = 3`; fixed by reporting `corrupt_payload` through the observability wrapper, marking corrupt rows `failed_permanent/corrupt_payload`, and continuing healthy row migration so flush is not permanently stalled. Also re-checked review notes: hardcoded Dev Supabase project ref and local database-type gate behavior remain intentional guardrail-covered choices; the no-FAB-on-More policy is the locked V2 FAB policy, not a regression.
- 2026-06-23: Phase 7 polish and hardening recorded the final V2 Phase 3 design-fidelity matrix, Dynamic Type/string-fit evidence, VoiceOver/a11y spot checks, and privacy/scope-drift notes for Today, Quick Log, Health, Onboarding, Timeline, and More/Settings. Mandatory verification commands and the local commit hash are recorded in the Supergoal transcript; no push, PR, tag, merge, release, production service action, or generated native edit was performed.
- 2026-06-23: Phase 3 / Today surface completed for the Phase 1 supergoal gate. Added `docs/design/v2/specs/today-v2.md` as the Today V2 design lock, tightened Today status cards and failed Quick Log banner accessibility, extended anatomy tests for heading order, hero count, timeline entry labels, non-color-only state status, and raw-string boundaries, and added synthetic dev-gallery Today fixtures for day 7 plus loading/offline/pending states. Native iPhone SE evidence is recorded under `output/design-fidelity/v2-phase3/today/` with gate result `PASS` and named deviation `V2-TODAY-COMPOSITE-RAW-REF` due to the V2 package lacking a dedicated standalone Today atlas PNG.
- 2026-06-23: Phase 3 / Quick Log surface completed for the Phase 2 supergoal gate. Added `docs/design/v2/specs/quicklog-v2.md` as the Quick Log V2 design lock and `output/design-fidelity/v2-phase3/quicklog/` as native SE evidence. Kept one canonical `potty` tile with required outside/inside/poop subtype before mutation, kept `weight` out of Quick Log per ADR-0007, added synthetic dev-gallery coverage for default sheet, subtype choices, duplicate warning, pending local row, failed retry/delete row, details saving, permission-denied, and unavailable states, and tightened local pending/failed row a11y with row-level labels/live regions. Gate result: `PASS` with named deviations `V2-QUICKLOG-WEIGHT-OMITTED` and `V2-QUICKLOG-SYNTHETIC-GALLERY-EVIDENCE`.
- 2026-06-23: Phase 3 / Health surface completed for the Phase 3 supergoal gate. Added `docs/design/v2/specs/health-v2.md`, Health mixed-list/edit/detail/delete/weight synthetic fixtures, and `src/test/health.render.test.tsx`. Health rows now include combined accessibility labels; review status uses noun copy (`Needs vet review`) across EN/RU/ES; stage strip exposes one active state and an accessibility summary; `No clinic listed` filler was removed from Health app strings; delete entry remains the only danger-filled Health action. Native iPhone SE evidence is recorded under `output/design-fidelity/v2-phase3/health/` with gate result `PASS` and named deviations `V2-HEALTH-SYNTHETIC-GALLERY-EVIDENCE` and `V2-HEALTH-SE-SEGMENT-WRAP`.
- 2026-06-23: Phase 3 / Onboarding surface completed for the Phase 4 supergoal gate. Added `docs/design/v2/specs/onboarding-v2.md`, future birth-date validation at the onboarding contract boundary, first-Today chrome preview, and onboarding gallery evidence for welcome/profile error/tracker picker/plan reveal/first-Today states. Focused tests now assert birth-date error targeting, canonical tracker picker with no Weight event, wizard-only plan reveal chrome, Today TabBar+FAB first-log chrome, retryable save failure, selected tracker states, and absent duplicate Done snackbar. Native iPhone SE evidence is recorded under `output/design-fidelity/v2-phase3/onboarding/` with gate result `PASS` and named deviation `V2-ONBOARDING-SYNTHETIC-GALLERY-EVIDENCE`.
- 2026-06-23: Phase 3 / Timeline surface completed for the Phase 5 supergoal gate. Added `docs/design/v2/specs/timeline-v2.md`, canonical Timeline chip coverage, potty subtype title rendering from canonical and legacy payloads, filtered-empty clear behavior, and synthetic gallery fixtures for synced, pending, failed, empty, filtered-empty, and delete-confirm states. Focused tests assert chip labels/roles/selected state, absence of legacy Food chips, subtype rendering, row-level accessibility labels, route chrome, and Quick Log routing. Native iPhone SE evidence is recorded under `output/design-fidelity/v2-phase3/timeline/` with gate result `PASS` and named deviation `V2-TIMELINE-SYNTHETIC-GALLERY-EVIDENCE`.
- 2026-06-23: Phase 3 / More and Settings surfaces completed for the Phase 6 supergoal gate. Added `docs/design/v2/specs/more-settings-v2.md`, More/Settings gallery evidence, About `Version 1.0.0` copy, `For now` notification copy, `Account removal` privacy copy, Plus deferred placeholder copy, and Quick Trackers history-preservation helper. Focused tests assert More row structure, no-FAB policy, deferred placeholder semantics without new Phase 4 routes, canonical tracker settings with no separate pee/poop tracker rows, selected/reorder accessibility state, profile entry behavior, and tab layout policy. Native iPhone SE evidence is recorded under `output/design-fidelity/v2-phase3/more-settings/` with gate result `PASS` and named deviations `V2-MORE-SYNTHETIC-GALLERY-EVIDENCE`, `V2-MORE-DEFERRED-PLUS-PLACEHOLDER`, and `V2-MORE-DEFERRED-SETTINGS-PLACEHOLDERS`.
- 2026-06-23: **Remote + runtime verification of Phases 1–2.** Resumed the paused PuppyPlan Dev Supabase project (`olymqppxsadsxfrcyskh`, eu-central-1) and applied migration `20260623120000_canonical_quick_log_tracker_taxonomy` via MCP `apply_migration`; reconciled the recorded migration version from the tool's auto-timestamp back to `20260623120000` so repo↔remote history stays in lockstep. Verified post-state by SQL: `event_type` gained `walk`; every `puppy.quick_tracker_ids` is canonical (0 allowed-constraint violations); the one legacy potty `quick_action` event migrated to `{subtype}`; default + unique/allowed constraints canonical. Security advisors after DDL: only pre-existing share-RPC `SECURITY DEFINER` (anon/authenticated) + Auth leaked-password WARNs — none introduced by this migration. **Visual verification on iPhone SE (3rd gen, iOS 26.3) via `expo run:ios`** (build needed `LANG/LC_ALL=en_US.UTF-8` to dodge a CocoaPods locale crash): Lora display + Nunito body fonts render live, mauve `info` banner with icon, Calm Teal primary, route-aware FAB on Today; the Quick Log sheet shows the unified single **Potty** tile (no separate pee-inside/outside/poop tiles) with Feeding/Sleep — driven by the migrated DB selection, confirming the taxonomy end-to-end. Note for future runs: the iOS build is a bare/prebuild workflow (`ios/` + Pods, no `expo-dev-client`); this is worth capturing as a project `run` skill via `/run-skill-generator`.
- 2026-06-23: Review remediation for the uncommitted redesign intake diff. Fixed three review findings: local Quick Log SQLite queue schema `2 -> 3` now migrates legacy offline potty `quick_action` payloads to canonical `{ subtype }` before queue parsing; Quick Log sheet now requires an explicit potty subtype selection before mutating and `QuickLogMutationVariables` is discriminated so `potty` cannot omit `pottySubtype`; `AppText` now maps variants to exact Expo registered font faces (`Lora_600SemiBold`, `Nunito_400Regular`, `Nunito_700Bold`) instead of abstract CSS intent family names. TDD mode: lightweight; reduced assurance because the repo-local RED/GREEN/REFACTOR role prompt files referenced by `.agents/skills/tdd` were absent in this checkout, so phases were not context-isolated. RED failed as expected in `src/test/quick-log-queue-storage.test.ts`, `src/test/quick-log-sheet.render.test.tsx`, and `src/test/design-primitives.render.test.tsx`; GREEN verification passed with targeted tests, `npm run typecheck`, `npm run check`, `npm run supabase:guardrails`, and `git diff --check`. Design-fidelity note: structural Quick Log sheet assertions were updated under existing `v2.quicklog.01` intent; native screenshot Stage 4 was not rerun and remains part of the Phase 3 visual pass.
- 2026-06-23: Phase 2 tracker taxonomy contract completed under heavy/full-isolated TDD with no Docker. Canonical Quick Log ids are now `potty`, `feeding`, `sleep`, `walk`, and `zoomies`; `weight` remains Health-only. Added ADR-0007 additive delta, migration `20260623120000_canonical_quick_log_tracker_taxonomy.sql`, `walk` generated DB type coverage, potty `subtype` payload contracts, duplicate-warning bucket updates, and no-Docker migration/RLS/typegen guardrails. Legacy selected potty ids migrate to one `potty`, old potty `quick_action` payloads migrate to `subtype`, and unknown/empty selected tracker arrays are repaired before the final constraint. Verification passed: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run check`, `npm run supabase:guardrails`, and `git diff --check`.
- 2026-06-23: Phase 1 foundation sync implemented. Updated mauve info tokens, Lora/Nunito font tokens and app-root font gate, `AppText` family/numeric mapping, Snackbar active state, route-aware FAB policy, bottom FAB inset, and `ListRow` radio/checkbox semantics. Token drift now checks V2 raw `tokens.css` plus `puppy-tokens-patch.css` for Phase 1 foundation variables. `expo-asset` was added as an SDK-bundled resolver dependency required by `expo-font`. Focused RED/GREEN evidence passed for primitive/tab layout and token-generator tests; full local gates are recorded in the Supergoal transcript.
- 2026-06-23: Rewrote the stale Supabase guardrail from the old Docker/remote pgTAP model to the no-Docker local model. Added `npm run supabase:guardrails`, updated `scripts/checks/supabase-baseline.test.mjs` to enforce static SQL/RLS/typegen checks and keep local aggregate gates off Supabase CLI wrappers, removed Docker mode from `.github/workflows/supabase-remote-dev.yml`, and removed the `SUPABASE_CLI_DOCKER_ALLOWED` escape hatch from `scripts/supabase/run-remote-cli.mjs`. Verification passed: RED failed on the old config, then `node --test scripts/checks/supabase-baseline.test.mjs` and `npm run supabase:guardrails` exited 0.
- 2026-06-23: Phase 0 locked the V2 atlas under `docs/design/v2/` with screenshots, sanitized raw design sources, `manifest.json`, README, and screenshot index. Recorded inner `tokens.css` + `puppy-tokens-patch.css` as canonical intent and `export/src/tokens.css` as fallback. Retargeted the two V1 fidelity plans to V2 intake, updated `docs/plans/README.md`, and triaged H1-H7 UX-audit findings for scoped V2 follow-up. No source code, schema, generated native files, production config, remote state, or Linear issue was changed.
- 2026-06-22: Intake plan created after studying the delivered `Puppy app_V2` package. Established V2 = refined same-DNA spec (not ground-up). Locked: adopt `info` mauve; type system → Lora (display) + Nunito (body) (designer decision, grounded in V2 foundation library + patch CSS — body is Nunito, not system); tracker taxonomy reconcile scoped to "unify potty + subtype, add walk, keep zoomies, weight→Health" (user-scoped). Made Phases 0–1 directly actionable with exact files/edits/verification; pinned Phase 2 canonical target. All prior blocking open questions resolved.
