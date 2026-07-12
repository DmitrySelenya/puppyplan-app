# Dogfood Device Handoff — From Green Simulator To Two Household iPhones

> For implementation agents: this is the execution continuation of
> `docs/plans/active/2026-07-11-dogfood-core-loop.md` (Phases 0–8 complete in the working tree).
> The software care loop is done and verified in the simulator; **nothing here is feature work**.
> This plan closes the gap between "green in simulator via Metro" and "two people actually caring
> for the puppy from their own iPhones". Follow `AGENTS.md` approval gates exactly — most steps in
> this plan are user-executed or user-approved by design.

**Goal:** Both household iPhones run the same Metro-independent Release build of the completed
core loop, signed into the shared dogfood account, with the owner-executed physical acceptance
checklist in `docs/dogfood/local-ios-build.md` completed and recorded.

**Status:** Active.

**Plan type:** Active task plan.

**Linear:** PUP-32 (build/runbook/two-device smoke) remains the owning issue; PUP-30 owns the
physical notification-banner acceptance item. Do not move either to Done before the physical
checklist is recorded.

---

## Why the app is not usable for the household yet

Verified state on 2026-07-12:

1. **No installed standalone build.** The app has only ever run on the
   `Grith iPhone SE 3 iOS 26.3` simulator through Metro. The Release JS export (Hermes bytecode,
   ~6.5 MB) already succeeds after the Supabase CJS-entry fix, but no Release binary was ever
   installed on the simulator or any physical iPhone.
2. **Disk gate is failing.** `/System/Volumes/Data` had **2.0 GiB free**; the hard project rule
   requires **≥ 10 GiB** before any native build work. This blocks every native step below and
   only the owner can free space (or give exact approval for specific deletions).
3. **The entire implementation is uncommitted.** ~81 modified/untracked files (all of Phases 1–8
   plus the 2026-07-12 design/contract corrections) sit in the working tree of
   `dimaselenya/pup-30-local-notifications-from-reminders-ios-first`, on top of commit `ff3447f`.
   The rollback procedure in the runbook depends on "the last known working local revision", which
   currently does not exist for this work. Committing requires exact user approval.
4. **Physical acceptance was never run.** The 8-item owner checklist in
   `docs/dogfood/local-ios-build.md` (install A/B, same-account sign-in, cross-phone routine and
   backdated-note convergence, planned-vs-actual check-off, one physical notification banner,
   disable, logout cancellation) is deliberately user-executed and remains fully open.
5. **Minor named follow-ups.** Dynamic Type XXXL and long-text device sweeps
   (`docs/design/v2/screenshots/dogfood-core-loop/phase4-stage4-rebuilt.md`); the superseded
   predecessor plan `2026-07-10-dogfooding-readiness.md` still says `Status: Active`.

Everything else in the Definition Of Dogfood Ready (core-loop items 1–6 and the software half of
7–9) is implemented and green: `npm run check` exit 0, 95 Jest suites / 835 tests, Supabase
guardrails, and the per-state Stage 4 comparison.

## Non-Goals

- Any feature, contract, schema, or UI change. If a defect is found during acceptance, record it
  and stop; do not fix-forward inside this plan without a new user decision.
- EAS, TestFlight, OTA, production Supabase, App Store — all remain forbidden.
- Family invites / per-person attribution (shared-account mode is the accepted dogfood contract,
  see `docs/dogfood/shared-account.md`).

---

## Phases

### Phase 1 — Freeze the revision (agent + user approval)

**Why:** two phones must run one known revision; rollback needs a commit to return to.

- [x] Re-run the full gate on the exact tree being frozen: `npm run typecheck`, `npm run check`,
  `npx jest` — all must be green with zero new warnings.
- [x] Review `git status`/`git diff` for stray files (scratch captures, `.env`, secrets, private
  data). Evidence PNGs under `docs/design/v2/screenshots/` are intentional and synthetic-only.
- [x] Propose a commit plan to the user (single commit or the PUP-31/29/30/32 stack split named in
  the core-loop plan — recommend whichever the user prefers; a single reviewed commit on the
  current branch is acceptable for dogfood).
- [x] **STOP: obtain exact user approval, then commit.** No push/rebase/merge/PR without its own
  separate exact approval.

**Acceptance:** `git status` is clean; the frozen revision hash is recorded in this plan's
changelog. *(Done 2026-07-12: app revision `3916b8b`.)*

### Phase 2 — Disk gate (user-executed)

- [x] Owner frees space until `df -h /System/Volumes/Data` shows **≥ 10 GiB** available, or gives
  exact approval for specific named deletions (candidates to propose, never delete unprompted:
  old simulator runtimes, DerivedData, Xcode caches). Record what was done.

**Acceptance:** ≥ 10 GiB free, recorded in the changelog. *(Done 2026-07-12: 15 GiB free.)*

### Phase 3 — Metro-independent simulator smoke (agent)

**Why:** prove the Release binary works standalone before touching physical phones.

- [ ] Build and install per `docs/dogfood/local-ios-build.md` (Release, `--no-bundler`, UTF-8 env,
  SE simulator `5C46B6CC-…`, incremental — no `prebuild --clean` unless native config changed).
- [ ] Stop Metro, relaunch via `simctl launch`, and walk the core loop with synthetic data only:
  Quick Log fast lane, detailed backdated fact with note, routine create, Diary check-off, app
  restart persistence.
- [ ] Capture synthetic evidence screenshots (headless `simctl`/`idb` driving works when the Mac
  is locked; relaunch the app between edit deep links — same-route remount does not re-read
  `initialDraft`).
- [ ] Run the deferred manual sweeps in the same Release build: Dynamic Type XXXL and long-text on
  Quick Log composer, routine editor, Diary; record results in `phase4-stage4-rebuilt.md`.

**Acceptance:** Release app completes the loop with Metro stopped; evidence recorded.

### Phase 4 — Two physical iPhones (user-executed, agent-guided)

- [ ] Owner opens the Xcode workspace, selects Release + own signing team, and installs the frozen
  revision on each explicitly selected iPhone (Developer Mode / trust prompts are owner actions).
- [ ] Both phones sign into the same development account per `docs/dogfood/shared-account.md`.
- [ ] Owner executes the 8-item acceptance checklist in `docs/dogfood/local-ios-build.md`,
  including the physical notification banner and logout cancellation.
- [ ] Record pass/fail per item here and in Linear (PUP-32; banner item closes the PUP-30
  physical-acceptance boundary). No private data (real puppy name, notes, photos) in any evidence.

**Acceptance:** all checklist items recorded; any failure becomes a named finding, not a silent
retry.

### Phase 5 — Housekeeping (agent)

- [ ] Mark `docs/plans/active/2026-07-10-dogfooding-readiness.md` as superseded by the core-loop
  plan (Status line + pointer), and move it plus `2026-07-11-dogfood-core-loop.md` to
  `docs/plans/` archive location per `docs/plans/README.md` conventions once Phase 4 is recorded.
- [ ] Update Linear PUP-29/PUP-30/PUP-31/PUP-32 statuses to reflect reality (requires the standing
  workflow approval that review sessions do not have; confirm with the user first).
- [ ] Update `docs/plans/README.md` registrations accordingly.

**Acceptance:** plans index and Linear match the recorded physical outcome.

---

## Definition Of Done

Two iPhones run the same committed, Metro-independent Release revision; the owner-executed
acceptance checklist is fully recorded (including one physical notification banner and logout
cancellation); XXXL/long-text sweeps are recorded; plans/Linear reflect the outcome. Only then may
anyone claim "the household can track the puppy in PuppyPlan".

## Changelog

- 2026-07-12: Phase 1 revision freeze complete. Full gate re-run green on the exact tree
  (typecheck, `npm run check` exit 0, 95 suites / 835 tests); tree reviewed for strays; owner
  approved a single commit on the current branch. Frozen app revision: `3916b8b` (114 files).
  Push/PR remain unapproved. Phases 3–5 are handed to the follow-up agent.
- 2026-07-12: Phase 2 disk gate passed. With the owner's "clean safe junk" approval, regenerable
  caches were deleted: Xcode DerivedData (7.4 GiB incl. the PuppyPlan build dir and module caches
  — next build is a cold build), npm cache (2.7 GiB), CocoaPods cache (1.5 GiB), pip cache,
  Homebrew cleanup, and regenerable project-graph/devtools caches (~0.8 GiB). Simulators,
  runtimes, browser caches, and Trash were not touched. Free space: 2.0 → 15 GiB.

- 2026-07-12: Plan created after a full audit of `2026-07-11-dogfood-core-loop.md`. Software loop
  verified complete in-tree (95 suites / 835 tests, `npm run check` exit 0, Stage 4 re-passed);
  blockers to real use identified as: uncommitted tree (~81 files on `ff3447f`), 2.0 GiB free disk
  vs the 10 GiB native gate, no installed standalone build, and the never-run physical acceptance
  checklist.
