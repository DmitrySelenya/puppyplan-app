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

**Status:** Blocked in Phase 3 — Diary fails the accessibility XXXL sweep.

**Current phase:** Phase 3 stopped at the first accessibility XXXL surface; owner decision required.

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

## Execution notes for the follow-up agent

Read before Phase 3; these are session lessons, not optional style advice.

1. **Inherited state — do not re-derive or redo.** App revision `3916b8b` (plus docs commit
   `e52c1af`) on `dimaselenya/pup-30-local-notifications-from-reminders-ios-first`; clean tree;
   full gate green at freeze (typecheck, `npm run check` exit 0, 95 suites / 835 tests); ~15 GiB
   free. DerivedData was purged on 2026-07-12, so the first Release build is a **cold build** —
   slow is not broken. Never rewrite history.
2. **A written PASS is a claim, not evidence.** The 2026-07-11 routine-editor "Stage 4 PASS" was
   false and was retracted by owner review. For every visual claim you record, open the actual
   evidence PNG next to the atlas reference / spec card. Record FAIL honestly; a truthful FAIL is
   acceptable output, a false PASS is not.
3. **Primitives first.** Before touching any screen, read the `src/design/primitives/` inventory
   (`TrackerTile`, `RoutineCard`, `CheckCircle`, `SectionHeader`, `IconChip`, …). Never build
   choice grids from raw `Card`+`Button`; selected chips are
   `variant={selected ? 'primary' : 'secondary'}`, never `tertiary`.
4. **Defects stop, they don't fix-forward.** If the Release smoke or owner checklist surfaces a
   defect or visual drift, record it here with evidence and stop for the owner's decision. Never
   weaken a check, test, or config to go green.
5. **Headless driving works while the Mac is locked.** `simctl openurl` deep links +
   `idb ui tap/swipe` + `simctl io booted screenshot`. Relaunch the app between edit deep links —
   remounting the same route does not re-read `initialDraft`.
6. **Hard limits.** No git push/PR/rebase/merge, no EAS/TestFlight/OTA/production, no schema or
   dependency changes, no deleting simulators/user files, no real puppy data in evidence. Owner
   actions (signing, device install, physical checklist, Linear approval) are never
   self-certified.

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

- [x] Build and install per `docs/dogfood/local-ios-build.md` (Release, `--no-bundler`, UTF-8 env,
  SE simulator `5C46B6CC-…`, incremental — no `prebuild --clean` unless native config changed).
- [x] Stop Metro, relaunch via `simctl launch`, and walk the core loop with synthetic data only:
  Quick Log fast lane, detailed backdated fact with note, routine create, Diary check-off, app
  restart persistence.
- [x] Capture synthetic evidence screenshots (headless `simctl`/`idb` driving works when the Mac
  is locked; relaunch the app between edit deep links — same-route remount does not re-read
  `initialDraft`).
- [ ] Run the deferred manual sweeps in the same Release build: Dynamic Type XXXL and long-text on
  Quick Log composer, routine editor, Diary; record results in `phase4-stage4-rebuilt.md`.

**Acceptance:** Release app completes the loop with Metro stopped; evidence recorded.

**Release smoke result after authorized correction (2026-07-12):** PASS. With no TCP 8081
listener, the rebuilt Release app completed Quick Log fast lane, a detailed backdated Observation
with a private note, daily Feeding routine creation, Diary planned-item check-off (planned 07:30,
actual 15:47), and terminate/plain-`simctl launch` persistence. Evidence uses the synthetic
`Demo Pup` account only:
[fast lane](../../design/v2/screenshots/dogfood-core-loop/phase4-stage4-rebuilt/release-sweeps/release-smoke-fast-lane.png),
[backdated Observation](../../design/v2/screenshots/dogfood-core-loop/phase4-stage4-rebuilt/release-sweeps/release-smoke-backdated-observation.png),
[routine created](../../design/v2/screenshots/dogfood-core-loop/phase4-stage4-rebuilt/release-sweeps/release-smoke-routine-created.png),
[Diary check-off](../../design/v2/screenshots/dogfood-core-loop/phase4-stage4-rebuilt/release-sweeps/release-smoke-diary-checkoff.png),
and [restart persistence](../../design/v2/screenshots/dogfood-core-loop/phase4-stage4-rebuilt/release-sweeps/release-smoke-restart-persistence.png).
The separate accessibility sweep then found the blocking failure below.

**Blocked finding (2026-07-12):** the cold Release build and simulator install completed with
exit 0, and the installed app contains a 6.2 MiB `main.jsbundle`. With no process listening on
TCP 8081, a terminate + plain `xcrun simctl launch` started PID 8663, then the app exited to the
home screen. The simulator log records an unhandled JS exception:
`EXPO_PUBLIC_SUPABASE_URL is required for Supabase client setup.` The build command had printed
that `.env` was loaded and the variable exported, so the standalone bundle/runtime configuration
does not match the successful build-time environment. Phase 3 smoke and the XXXL/long-text sweeps
were not run. Per the execution notes, this defect is recorded without a fix-forward attempt;
owner direction is required before continuing.

#### Authorized correction — locked regression spec

Owner authorization received on 2026-07-12 for investigation and correction of the standalone
Release configuration defect only.

Root-cause evidence:

- `src/lib/supabase/env.ts` defaults to the whole `process.env` object and reads the two public
  values through `source[name]` dynamic property access.
- Expo's public-env contract inlines only static dot-notation references such as
  `process.env.EXPO_PUBLIC_SUPABASE_URL`; bracket access, destructuring, and whole-object reads are
  not supported.
- A clean synthetic iOS export retained both environment-variable names but embedded neither the
  synthetic URL nor the synthetic publishable key. The installed Release Hermes bundle likewise
  retained the names and did not contain the known development project URL.

Acceptance criteria:

- **AC-REL-ENV-1:** the default runtime Supabase config path statically references
  `process.env.EXPO_PUBLIC_SUPABASE_URL` and
  `process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, so Expo can inline both values.
- **AC-REL-ENV-2:** explicit injected env objects remain supported for deterministic validation
  tests; missing/invalid values retain the existing fail-loud, value-scrubbed errors.
- **AC-REL-ENV-3:** a clean synthetic iOS export embeds both synthetic probe values and does not
  rely on a live Metro process.
- **ERR-REL-ENV-1:** no private key, admin credential, token, or raw `.env` value is added to code,
  tests, docs, logs, or screenshots.

Constraints: no dependency, schema, native-project, EAS, push, or PR changes; production config
remains out of scope. TDD mode: heavy/full-isolated RED, GREEN, and REFACTOR contexts.

TDD evidence:

- **RED:** `npm run test:unit -- --runTestsByPath src/test/supabase-env.test.ts` failed only
  AC-REL-ENV-1 (1 failed / 4 passed) because the required static URL reference was absent.
- **GREEN:** the default source now maps exactly two static Expo public references while preserving
  injected-object validation; the same command passed 5/5 tests.
- **REFACTOR:** no change — extraction would add churn and could defeat Expo's static analysis;
  the targeted suite passed before and after review.
- **Export integration:** a clean synthetic iOS Hermes export embedded both synthetic probe values;
  no raw `.env` value was printed or retained as evidence.

**Accessibility sweep finding (2026-07-12):** FAIL on the first required surface. At
`accessibility-extra-extra-extra-large`, Diary's greeting occupies nearly the entire SE viewport,
the week strip and diary rows are pushed below the first screen, and the bottom capsule retains
oversized text labels instead of the specified icon-only fallback, crowding the separate FAB.
Real reference-vs-native evidence is recorded in
`docs/design/v2/screenshots/dogfood-core-loop/phase4-stage4-rebuilt/release-sweeps/diary-ax-xxxl-side-by-side.png`.
Per the plan's defect rule, Quick Log composer, routine editor, and long-text sweeps were not run;
their checklist item remains open. Simulator content size was restored to `large`.

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

- 2026-07-12: Authorized Release env correction completed with heavy isolated TDD. Root cause was
  unsupported dynamic `process.env` access; RED failed 1/5, GREEN passed 5/5, REFACTOR made no
  change, a clean synthetic Hermes export embedded both probe values, and `npm run check` passed
  (95 suites / 836 tests). The rebuilt Metro-independent Release app then passed the full synthetic
  core-loop smoke and restart persistence. The first accessibility XXXL capture exposed a Diary
  layout failure (oversized greeting, content pushed below the viewport, missing icon-only tab
  fallback); real side-by-side PNG evidence is linked from `phase4-stage4-rebuilt.md`. Remaining
  sweeps and Phases 4–5 were not executed. Status returned to Blocked pending owner direction.

- 2026-07-12: Phase 3 stopped on a Release-only standalone-launch defect. The exact runbook build
  (`LANG`/`LC_ALL=en_US.UTF-8`, Release, mandated SE UDID, `--no-bundler`) succeeded with 0 errors
  and installed a bundle containing `main.jsbundle` (6.2 MiB). After confirming no TCP 8081
  listener, a plain `simctl launch` started the app, which then exited with the logged unhandled
  exception `EXPO_PUBLIC_SUPABASE_URL is required for Supabase client setup.` No core-loop,
  restart-persistence, XXXL/long-text, physical-device, Linear, or housekeeping item was claimed.
  Status changed to Blocked pending the owner's decision.

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
