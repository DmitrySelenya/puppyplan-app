# PUP-14 Quick Log Sheet UI And Interaction States - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes design primitives, Quick Log UI/controller behavior, i18n keys, CI hardening, or verification evidence.

**Goal:** Implement the Quick Log sheet UI and interaction states with a design-owned Snackbar primitive, non-blocking logging feedback, duplicate warnings, unavailable state, and CI hardening follow-ups.

**Status:** Active - local implementation verified, awaiting handoff/PR approval.

**Plan type:** Linear task plan for `PUP-14`.

**Current phase:** Phase 5 - Verification, Review, And Handoff.

**Architecture:** Quick Log UI behavior flows through a controller port shaped around the PUP-13 mutation/cache boundary. `app/` stays route-thin. Snackbar is shared design infrastructure under `src/design`, hosted globally above modal routes, so post-dismiss success/failure/undo feedback survives the Quick Log sheet lifecycle. The production route remains in the unavailable state until a real active household/puppy/session source exists; PUP-14 does not use fake IDs.

**Linear:** `PUP-14` - https://linear.app/dmitryselenya/issue/PUP-14/quick-log-sheet-ui-and-interaction-states

**Branch:** `dimaselenya/pup-14-quick-log-sheet-ui-and-interaction-states`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - Quick Log, onboarding tracker selection, epic acceptance.
- Design: `DESIGN.md` - §2.3 Quick Log sheet, snackbar, failed states, duplicate warning.
- Architecture: `docs/architecture/06-design-system-and-ui-contracts.md`, `10-quick-log-queue.md`, `12-i18n-and-content.md`, `17-testing-ci-release.md`, `18-ai-agent-guide.md`, `screen-states-matrix.md`.
- ADR: `docs/architecture/adr/0003-state-ownership-matrix.md`, `0004-quick-log-queue-sqlite.md`, `0010-react-i18next-typed-keys.md`, `0011-design-system-runtime.md`.
- Prior plans: `docs/plans/completed/2026-05-25-quick-log-mvp.md`, `docs/plans/completed/2026-05-26-pup-12-quick-log-queue-core.md`, `docs/plans/completed/2026-05-26-pup-13-quick-log-mutation-cache.md`.

---

## Context

PUP-13 implemented the typed Quick Log mutation/cache lifecycle and failed localSync metadata. The UI is still a placeholder `QuickLogShell`. Current repo has no active puppy/household context source of truth and no Snackbar primitive.

- **Context package:** PUP-14 Linear issue, this plan, source docs above, `src/features/quick-log/screens/QuickLogShell.tsx`, `src/lib/query/quick-log.ts`, `src/contracts/quick-log.ts`, `src/contracts/business-rules.ts`, `src/lib/providers/AppProviders.tsx`, `src/design/primitives/*`, `STRINGS.en/ru/es.json`, workflow and metadata checks.
- **Ownership areas:** `src/design/` for Snackbar primitive/provider, `src/features/quick-log/` for sheet/controller UI, `src/lib/providers/` for provider ordering, `.github/` and `scripts/checks/` for CI housekeeping.
- **Current limitation:** PUP-14 can make sheet dismissal and snackbar feedback non-blocking at the controller/UI seam. It cannot honestly guarantee Today/Timeline row visibility within 100 ms because current PUP-13 `onMutate` awaits session, query cancellation, and queue enqueue before cache upsert. Strict row-latency and production active-context/mutation adapter wiring remain follow-up acceptance for the Today/data-layer integration work.

---

## Goals

1. **Design-owned Snackbar**
   - Add global `SnackbarProvider`/host and primitive API under `src/design`.
   - Support `showSnackbar`, `replaceSnackbar`, and `dismissSnackbar` by stable `id`.

2. **Quick Log sheet UI**
   - Render up to five default trackers with typed EN/RU/ES labels.
   - Keep route shell thin and put behavior in feature-owned controller/components.
   - Render missing-context/session as a calm permission-denied-flavoured unavailable state.

3. **Interaction states**
   - Show non-blocking success snackbar and close the sheet without awaiting queue/network work.
   - Bridge mutation failure after sheet dismiss through mutation-driven snackbar replacement.
   - Keep duplicate warning non-blocking: Add anyway always logs.

4. **CI hardening**
   - Align PR template metadata wording.
   - Pin GitHub Actions by SHA with version comments and add Dependabot for GitHub Actions.

---

## Non-Goals

- Do not add `/quick-log/details` or Edit Trackers routes.
- Do not show Add details until the details route exists.
- Do not implement the 8-second failed timer; PUP-14 uses real mutation/queue failure only.
- Do not implement persistent Today banner after repeated failures; that belongs to PUP-15.
- Do not add analytics/telemetry; PUP-16 owns observability.
- Do not add schema/RLS changes, new dependencies, or production/release actions.
- Do not promise strict Today/Timeline optimistic-row latency from this UI task.
- Do not invent an active care context, session provider, or production mutation adapter before the source of truth exists.

---

## Product Decisions Locked In

1. **Snackbar ownership**
   - **Chosen:** Implement as a scoped design-system primitive and provider.
   - **Reason:** Architecture explicitly forbids feature-local copies for Snackbar/InlineAlert.

2. **Snackbar host lifecycle**
   - **Chosen:** Host lives in global providers, above modal routes.
   - **Reason:** DESIGN requires snackbar after sheet dismissal; route-local host would unmount.

3. **Provider order**
   - **Chosen:** `I18nextProvider > SafeAreaProvider > SnackbarProvider > QueryClientProvider > app`.
   - **Reason:** Snackbar needs i18n and safe area; mutation lifecycle can call snackbar while query hooks live under QueryClient.

4. **Active context**
   - **Chosen:** No active household/puppy/session renders unavailable state and blocks mutation.
   - **Reason:** Repo has no active care context source; fake production IDs are forbidden.

5. **Failure UX**
   - **Chosen:** Mutation-driven failure snackbar replaces the success snackbar by `id`; no 8s timer.
   - **Reason:** Avoids a post-dismiss UX hole without taking Today/Timeline ownership.

6. **Actor source**
   - **Chosen:** Controller never passes `created_by`; PUP-13 mutation reads the session actor.
   - **Reason:** Retry must preserve original actor and UI must not own identity.

---

## Invariants And Executable Spec

- **Invariant 1:** Snackbar is design-owned, global, replaceable by stable `id`, and status uses icon + text + tone.
  - **Test:** `src/test/design-primitives.render.test.tsx`
- **Invariant 2:** `AppProviders` order keeps Snackbar outside QueryClient and inside i18n/safe area.
  - **Test:** `src/test/app-shell.render.test.tsx`
- **Invariant 3:** Missing active care context/session renders unavailable copy and never calls the mutation.
  - **Test:** `src/test/quick-log-controller.test.tsx`, `src/test/quick-log-sheet.render.test.tsx`
- **Invariant 4:** `logTracker()` returns `void`, triggers immediate snackbar feedback, and does not await mutation/queue/network.
  - **Test:** `src/test/quick-log-controller.test.tsx`
- **Invariant 5:** Mutation failure after sheet dismiss replaces the success snackbar with failed copy and Retry/Delete actions.
  - **Test:** `src/test/quick-log-controller.test.tsx`
- **Invariant 6:** Duplicate-care warning uses `src/contracts/business-rules.ts` and never blocks Add anyway.
  - **Test:** `src/test/quick-log-controller.test.tsx`
- **Invariant 7:** Quick Log sheet renders no more than `MAX_VISIBLE_QUICK_LOG_TRACKERS`.
  - **Test:** `src/test/quick-log-sheet.render.test.tsx`
- **Invariant 8:** CI workflows use full SHA-pinned actions with version comments.
  - **Test:** `scripts/checks/workflow-hardening.test.mjs`
- **Invariant 9:** Quick Log modal content uses the design-owned `SheetSurface` contract, not a feature-local panel.
  - **Test:** `src/test/quick-log-sheet.render.test.tsx`
- **Invariant 10:** Snackbar auto-dismisses after the 4-second default and sits above the FAB/tab area.
  - **Test:** `src/test/design-primitives.render.test.tsx`

---

## File Map

### App Shell
- `src/lib/providers/AppProviders.tsx` - provider order and global Snackbar.
- `app/(modals)/quick-log/index.tsx` - remains route-thin.

### Design
- `src/design/primitives/Snackbar.tsx` - primitive/provider/hook/host.
- `src/design/primitives/index.ts` - exports.
- `src/test/design-primitives.render.test.tsx` - primitive behavior.

### Feature
- `src/features/quick-log/screens/QuickLogShell.tsx` - screen composition only.
- `src/features/quick-log/useQuickLogSheetController.ts` - controller seam.
- `src/features/quick-log/components/*` - tracker grid, duplicate warning, local rows.

### i18n
- `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json` - unavailable state keys.

### CI
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/*.yml`
- `.github/dependabot.yml`
- `scripts/checks/workflow-hardening.test.mjs`
- `scripts/checks/pr-metadata.test.mjs`

### Tests
- `src/test/quick-log-controller.test.tsx`
- `src/test/quick-log-sheet.render.test.tsx`
- `src/test/quick-log-local-events.render.test.tsx`

---

## Implementation Plan

### Phase 0 - Read And Lock Scope

**Checklist:**
- [x] Sync local `main` to PUP-13 squash commit.
- [x] Verify PUP-13 squash tree for touched files.
- [x] Read PUP-14 Linear issue and use exact `gitBranchName`.
- [x] Read PRD/DESIGN/architecture/ADR source docs.
- [x] Record plan decisions after external review.

**Acceptance criteria:**
- Scope is explicit enough to implement without guessing.

### Phase 1 - RED Tests

**Checklist:**
- [x] Add RED Snackbar primitive/provider tests.
- [x] Add RED Quick Log controller tests.
- [x] Add RED Quick Log sheet/local-event render tests.
- [x] Add RED CI hardening tests.
- [x] Run targeted tests and record expected failures.

**Acceptance criteria:**
- New tests fail for missing PUP-14 implementation, not syntax/setup errors.

### Phase 2 - Design Snackbar And Provider

**Checklist:**
- [x] Implement `SnackbarProvider`, host, hook, replace/dismiss API.
- [x] Add icon + text + tone rendering and reduced-motion-safe behavior.
- [x] Wire provider order in `AppProviders`.
- [x] Export primitive API.
- [x] Run targeted design/app-shell tests.

**Acceptance criteria:**
- Snackbar survives modal route dismissal and is usable from mutation/controller layers.

### Phase 3 - Quick Log Sheet And Controller

**Checklist:**
- [x] Implement controller seam with injected care context/session/mutation dependencies.
- [x] Render tracker grid, unavailable state, duplicate warning, pending/failed local rows.
- [x] Ensure `logTracker()` is fire-and-forget and returns `void`.
- [x] Hide Add details and Edit trackers until routes exist.
- [x] Add EN/RU/ES unavailable keys.
- [x] Run targeted Quick Log tests.

**Acceptance criteria:**
- Quick Log sheet is usable without fake IDs and all PUP-14 interaction states are tested.

### Phase 4 - CI Housekeeping

**Checklist:**
- [x] Align PR template with metadata checker wording.
- [x] Pin workflow actions by verified SHA with version comments.
- [x] Add weekly Dependabot updates for GitHub Actions.
- [x] Update workflow hardening tests.
- [x] Run node check tests.

**Acceptance criteria:**
- CI guardrails enforce the hardened workflow format.

### Phase 5 - Verification, Review, And Handoff

**Checklist:**
- [x] Run targeted Jest suites.
- [x] Run `npm run typecheck`.
- [x] Run `npm run test:scaffold`.
- [x] Run `npm run check`.
- [x] Run deep review and fix actionable findings.
- [x] Update this plan, `docs/plans/README.md`, and Linear with verification evidence.

**Acceptance criteria:**
- PUP-14 is ready for local review handoff. Commit/push/PR still require exact approval.

---

## Verification Log

- 2026-05-27: Synced `main` to `origin/main` at PUP-13 squash commit and verified PUP-13 touched-file diff is empty.
- 2026-05-27: Linear `PUP-14` moved to `In Progress`; branch created from updated `main`.
- 2026-05-27: RED targeted suites failed before implementation for missing Snackbar/controller/local-event behavior and workflow hardening.
- 2026-05-27: Verified action tag SHAs with `git ls-remote`: `actions/checkout@v6.0.2` -> `de0fac2e4500dabe0009e67214ff5f5447ce83dd`, `actions/setup-node@v6.4.0` -> `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e`, `actions/upload-artifact@v4.6.2` -> `ea165f8d65b6e75b540449e92b4886f43607fa02`.
- 2026-05-27: Targeted Quick Log/design/app-shell Jest suites passed after implementation.
- 2026-05-27: `npm run typecheck` passed.
- 2026-05-27: `npm run test:scaffold` passed.
- 2026-05-27: `npm run lint` passed.
- 2026-05-27: `npm run test:unit` passed: 19 suites, 158 tests.
- 2026-05-27: `npm run test:node` passed: 89 tests.
- 2026-05-27: `npm run check` passed.
- 2026-05-27: Sidecar deep review found design-boundary, SheetSurface, Snackbar auto-dismiss/offset, workflow-hardening, and docs index issues; code/docs were updated.
- 2026-05-27: Targeted post-review checks passed: `npm run typecheck`; Quick Log/design targeted Jest suites; `node --test scripts/checks/workflow-hardening.test.mjs scripts/checks/pr-metadata.test.mjs scripts/checks/supabase-baseline.test.mjs`; `npm run lint`; `git diff --check`.
- 2026-05-27: Final `npm run check` passed after post-review fixes: 19 Jest suites / 160 unit tests, 89 node tests, scaffold/i18n/privacy/text/token checks all green.
- 2026-05-27: Linear `PUP-14` updated with local implementation status, verification evidence, and the active-context/mutation-adapter residual integration note. Issue intentionally remains `In Progress` until commit/push/PR approval.
- 2026-05-27: Deep review follow-up RED tests failed for route-unmount failure feedback, pending local-row Undo context, and snackbar action accessibility grouping.
- 2026-05-27: Implemented global `QuickLogFeedbackProvider`/observer above modal routes, moved post-dismiss feedback state out of the route-local controller path, added full-context pending local-row Undo, split snackbar status live announcement from action buttons, and removed untracked local `.claude/settings.json`.
- 2026-05-27: Targeted follow-up suites passed: `npx jest --runInBand src/test/quick-log-sheet.render.test.tsx src/test/quick-log-local-events.render.test.tsx src/test/design-primitives.render.test.tsx src/test/app-shell.render.test.tsx src/test/quick-log-controller.test.tsx`.
- 2026-05-27: `npm run typecheck` passed after follow-up fixes.
- 2026-05-27: `git diff --check && npm run check` passed after follow-up fixes: 19 Jest suites / 161 unit tests, 89 node tests, scaffold/i18n/privacy/text/token checks all green.
- 2026-05-27: Reviewed external report follow-ups. Confirmed and fixed the duplicated Quick Log mutation feedback state machine, the conditional QuickLogShell feedback hook seam, provider-level `failed_permanent`/pending Undo coverage, route close coverage, and redundant authenticated-only guards. Left snackbar modal offset, locale copy future pluralization, Dependabot labels, and workflow SHA map maintenance as non-blocking follow-ups because they are not required for PUP-14 correctness.
- 2026-05-27: RED test failed before refactor for snackbar seam toggling resetting controller duplicate-warning state.
- 2026-05-27: Post-report targeted suites passed: `npx jest --runInBand src/test/quick-log-controller.test.tsx src/test/quick-log-sheet.render.test.tsx src/test/quick-log-local-events.render.test.tsx src/test/quick-log-route.render.test.tsx src/test/design-primitives.render.test.tsx src/test/app-shell.render.test.tsx` - 6 suites / 53 tests.
- 2026-05-27: `npm run typecheck`, `npm run lint`, and `git diff --check` passed after post-report refactor.
- 2026-05-27: Final post-report `npm run check` passed: 20 Jest suites / 165 unit tests, 89 node tests, scaffold/i18n/privacy/text/token checks all green.
- 2026-05-27: Post-review fixes added RED/GREEN coverage for Quick Log sheet outer horizontal padding and active-context-without-mutation safety. `QuickLogShell` now treats a missing mutation adapter as unavailable instead of silently accepting logs, and sheet content removes the outer `Screen` horizontal padding so three 110pt tracker tiles fit with `SheetSurface` padding. Verification passed: `npx jest --runInBand src/test/quick-log-sheet.render.test.tsx`; `npm run check`; `git diff --check`; `node scripts/checks/text-hygiene.mjs`.
- 2026-05-27: Security-pattern follow-up split `@ts-ignore`/`@ts-nocheck` from `@ts-expect-error`, kept type-contract tests excluded, excluded the `.claude` security config/guidance files from directive self-matches, and aligned model-backed guidance wording with AGENTS.md. Added `scripts/checks/security-patterns.test.mjs`. Verification passed: `node --test scripts/checks/security-patterns.test.mjs`; `npm run check`; `git diff --check`.
