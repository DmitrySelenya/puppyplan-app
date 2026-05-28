# PUP-15 Today/Timeline Quick Log State Integration - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes contracts, schema, RLS, UX, routes, data flow, or verification evidence.

**Goal:** Integrate Quick Log pending, failed, retry/delete/undo, and server-confirmed replacement states into Today and a minimal Timeline modal without fake production IDs.

**Status:** Completed.

**Current phase:** Completed - merged via PR #15; plan-owned work complete.

**Architecture:** Supabase remains the durable source of truth, TanStack Query owns server-state cache, and the existing Minimal Durable Quick Log Queue remains the only durable local-write exception. Today and Timeline consume query/cache rows through shared lib helpers and feature screens; `app/` stays route-thin. Production Quick Log remains unavailable until a real active household/puppy/session context exists.

**Linear:** `PUP-15` - Today and Timeline Quick Log pending/failed state integration.

**Branch:** Linear `gitBranchName`: `dimaselenya/pup-15-today-and-timeline-quick-log-pendingfailed-state-integration`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - Quick Log, Today Screen Contract, Timeline Item Contract, Minimal Durable Quick Log Queue, MVP acceptance.
- Design: `DESIGN.md` - §2.3.9 Pending / Failed / Retry States, §2.4 Timeline, performance checklist.
- Architecture: `docs/architecture/03-client-data-layer.md`, `04-state-management.md`, `05-navigation-and-deeplinks.md`, `10-quick-log-queue.md`, `screen-states-matrix.md`.
- ADR: `docs/architecture/adr/0004-quick-log-queue-sqlite.md`.

---

## Context

PUP-13 implemented the mutation/cache lifecycle and PUP-14 implemented the Quick Log sheet, snackbar, duplicate warning, and unavailable state. The current app still has a placeholder Today screen and no Timeline route file. There is also no real active care context source, so production UI must not invent household, puppy, or session actor IDs.

- **Context package:** `AGENTS.md`, Linear `PUP-15`, this plan, completed PUP-13/PUP-14 plans, relevant PRD/DESIGN/architecture docs, graph-context output, and current source/tests.
- **Context placement:** Linear keeps operational status; this plan holds durable implementation scope; PR text will hold final verification evidence.
- **Deferred follow-up:** Active care context source for production Quick Log. It must cover puppy setup/profile selection, active household/puppy query, session-backed actor source, no-context/loading/permission states, and no fake IDs.

---

## Goals

1. **Today shows local Quick Log state.**
   - Pending and failed rows remain visible and actionable.
   - Server confirmation replaces only the matching optimistic row.
   - No-context is a distinct unavailable state, not an empty-event state.
2. **Timeline modal shows minimal Quick Log rows.**
   - `/timeline` is modal-only and never a primary tab.
   - Rows show pending/failed/synced state with accessible labels and non-color-only status.
   - No inert filters, range pickers, edit flows, or full Timeline scope in PUP-15.
3. **Optimistic visibility is fast.**
   - Quick Log cached row is visible before slow async work and targets `<=100ms`.
   - Network send still waits for durable queue enqueue.

---

## Non-Goals

- Do not create fake production `householdId`, `puppyId`, or session actor IDs.
- Do not implement the full PRD Today Screen Contract: puppy top bar, household avatars, activity strip, hero decision engine, daily cards, starter guidance, missed-reminder card, invite attribution, and weekly summaries remain deferred.
- Do not implement full Timeline filtering/range/custom date/edit scope. Do not render non-working filter chips.
- Do not add schema/RLS migrations, dependencies, analytics, or broad design-system refactors.

---

## Product Decisions Locked In

1. **Active care context**
   - **Chosen:** Missing active context renders unavailable surfaces and blocks Quick Log mutation.
   - **Reason:** The repo has no real source of active household/puppy/session identity; fake IDs are forbidden.

2. **Failed banner threshold**
   - **Chosen:** Persistent Today banner appears when any visible failed Quick Log row has `retryCount >= 3`.
   - **Reason:** DESIGN specifies the persistent Today banner after three failed attempts.

3. **Timeline scope**
   - **Chosen:** PUP-15 ships row-state visibility and actions only.
   - **Reason:** Linear allows splitting full Timeline scope; rendering inert filters would violate UX quality.

4. **Optimistic row hot path**
   - **Chosen:** `onMutate` inserts the cache row before awaiting queue/network work and must not fetch session identity in the hot path.
   - **Reason:** Quick Log tap-to-visible optimistic UI must be `<=100ms`.

---

## Invariants And Executable Spec

- **Invariant 1:** Quick Log timing constants stay canonical in `src/contracts/business-rules.ts`.
  - **Test:** `src/test/business-rules.test.ts`
- **Invariant 2:** Failed Today banner appears only after the retry threshold.
  - **Test:** `src/test/business-rules.test.ts`, `src/test/today-quick-log.render.test.tsx`
- **Invariant 3:** Optimistic cache visibility happens before async session/queue/network work.
  - **Test:** `src/test/quick-log-mutation.test.ts`
- **Invariant 4:** Pending/failed rows remain visible and actionable in Today and Timeline.
  - **Test:** `src/test/today-quick-log.render.test.tsx`, `src/test/timeline-quick-log.render.test.tsx`
- **Invariant 5:** Server confirmation replaces only the matching optimistic row and Undo/Delete prevents late-success resurrection.
  - **Test:** `src/test/quick-log-mutation.test.ts`
- **Invariant 6:** No active context never creates fake query keys or fake product IDs.
  - **Test:** `src/test/today-quick-log.render.test.tsx`, `src/test/timeline-quick-log.render.test.tsx`
- **Invariant 7:** Reading Quick Log cached rows does not churn QueryCache subscriptions on unrelated parent rerenders.
  - **Test:** `src/test/use-quick-log-cached-rows.test.tsx`
- **Invariant 8:** Today/Timeline only render pending/failed action buttons when the matching handler is wired.
  - **Test:** `src/test/today-quick-log.render.test.tsx`, `src/test/timeline-quick-log.render.test.tsx`
- **Invariant 9:** The Today failed banner does not double-announce the same accessible label.
  - **Test:** `src/test/today-quick-log.render.test.tsx`

---

## File Map

### App Shell
- `app/(modals)/timeline/index.tsx` - thin Timeline modal route.
- `app/(modals)/_layout.tsx` - modal route registration only if needed.

### Feature
- `src/features/today/screens/TodayScreen.tsx` - Today PUP-15 surface.
- `src/features/timeline/*` - minimal Timeline modal screen/components.
- `src/features/more/screens/MoreScreen.tsx` - Timeline entry point.
- `src/features/quick-log/useQuickLogSheetController.ts` - import shared tracker-label helper.

### Contracts
- `src/contracts/business-rules.ts` - timing/failure constants and banner helper.
- `src/contracts/quick-log.ts` - only if tracker-label helper belongs here.

### Data And Query
- `src/lib/query/quick-log.ts` - optimistic hot-path ordering and `retryCount` in `localSync`.
- `src/lib/query/quick-log-event-view.ts` - shared event-row view helper for Today/Timeline.
- `src/lib/query/keys.ts` - only if a new helper is required.

### i18n
- `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json` - new Today/Timeline unavailable/action labels if existing keys are insufficient.

### Tests
- `src/test/business-rules.test.ts`
- `src/test/quick-log-mutation.test.ts`
- `src/test/today-quick-log.render.test.tsx`
- `src/test/timeline-quick-log.render.test.tsx`
- Existing shell/navigation tests if routes or labels change.

---

## Implementation Plan

### Phase 0 - Read And Lock Scope

**Checklist:**
- [x] Read `AGENTS.md`, Linear `PUP-15`, source docs, completed PUP-13/PUP-14 plans, and current source/tests.
- [x] Confirm branch: `dimaselenya/pup-15-today-and-timeline-quick-log-pendingfailed-state-integration`.
- [x] Move Linear `PUP-15` to In Progress and comment the active-context follow-up.
- [x] Confirm no schema/RLS/dependency changes are required.

**Acceptance criteria:** Scope is explicit enough to implement without guessing.

### Phase 1 - RED Tests

**Checklist:**
- [x] Add failing business-rule tests for optimistic target and failed-banner threshold/helper.
- [x] Add failing mutation/cache test proving optimistic row visibility does not wait for async session/queue/network work.
- [x] Add failing Today render tests for no-context unavailable state, pending/failed row actions, and persistent banner threshold.
- [x] Add failing Timeline render tests for modal row states/actions and no-context unavailable state.

**Acceptance criteria:** Targeted tests fail for missing PUP-15 behavior before production code changes.

### Phase 2 - Contracts, Query, And Shared View Model

**Checklist:**
- [x] Add business-rule constants/helper.
- [x] Move tracker label key mapping to a shared non-React helper.
- [x] Add `retryCount` to `QuickLogCachedEventRow.localSync` and keep it updated from queue rows.
- [x] Reorder optimistic cache insertion so it happens before slow async work while preserving durable enqueue before network send.
- [x] Add shared Quick Log event view helper for Today/Timeline.

**Acceptance criteria:** Contract/query tests pass and existing PUP-13 mutation invariants still pass.

### Phase 3 - Today, Timeline, Route, And i18n

**Checklist:**
- [x] Implement Today PUP-15 surface with unavailable, empty, pending, failed, synced, and failed-banner states.
- [x] Implement minimal `src/features/timeline` modal screen and `app/(modals)/timeline/index.tsx`.
- [x] Add Today and More `/timeline` entry points without creating a Timeline tab.
- [x] Add or reuse EN/RU/ES i18n keys with parity.
- [x] Keep all user-facing strings behind typed i18n.

**Acceptance criteria:** Today/Timeline render tests pass, navigation contract remains valid, and i18n checks pass.

### Phase 4 - Verification And Handoff

**Checklist:**
- [x] Run targeted Jest suites.
- [x] Run `npm run test:scaffold`.
- [x] Run `npm run typecheck`.
- [x] Run `node scripts/checks/privacy-scan.mjs`.
- [x] Run `node scripts/checks/text-hygiene.mjs`.
- [x] Run `npm run check`.
- [x] Run `git diff --check`.
- [x] Record evidence in this plan and Linear `PUP-15`.

**Acceptance criteria:** PUP-15 is locally implemented and ready for review handoff. Git commit/push/PR waits for explicit approval.

---

## Verification Log

- 2026-05-27: Started implementation on Linear branch, moved `PUP-15` to In Progress, and recorded active-context source as a deferred follow-up in Linear.
- 2026-05-27 RED: `npx jest --runInBand src/test/business-rules.test.ts src/test/quick-log-mutation.test.ts src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx` failed on missing constants/helper, missing Timeline screen, placeholder Today, missing `retryCount`, and optimistic row visibility after enqueue.
- 2026-05-27 GREEN targeted: `npx jest --runInBand src/test/business-rules.test.ts src/test/quick-log-mutation.test.ts src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx src/test/app-shell.render.test.tsx` passed 5 suites / 34 tests.
- 2026-05-27 targeted regression: `npx jest --runInBand src/test/quick-log-local-events.render.test.tsx` passed after covering pending and failed delete actions.
- 2026-05-27 targeted clean-exit check: `npx jest --runInBand src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx src/test/quick-log-mutation.test.ts` passed 3 suites / 24 tests.
- 2026-05-27 full gate: `npm run check` passed lint, typecheck, 22 Jest suites / 175 tests, 97 Node tests, scaffold, design token, privacy, and text hygiene checks.
- 2026-05-27 whitespace gate: `git diff --check` passed.
- 2026-05-28 review-fix RED: `npx jest --runInBand src/test/quick-log-mutation.test.ts src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx src/test/quick-log-event-view.test.ts src/test/use-quick-log-cached-rows.test.tsx` failed on enqueue rollback, missing synced row state, unsupported payload filtering, and locale-aware time formatting.
- 2026-05-28 review-fix GREEN targeted: `npx jest --runInBand src/test/quick-log-mutation.test.ts src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx src/test/quick-log-event-view.test.ts src/test/use-quick-log-cached-rows.test.tsx src/test/i18n.test.ts` passed 6 suites / 39 tests.
- 2026-05-28 review-fix full gate: `npm run check` passed lint, typecheck, 24 Jest suites / 181 tests, 97 Node tests, scaffold, design token, privacy, and text hygiene checks.
- 2026-05-28 post-handoff doc checks: `git diff --check`, `node scripts/checks/text-hygiene.mjs`, `node scripts/checks/privacy-scan.mjs`, and `node scripts/checks/check-i18n.mjs` passed after updating this plan and Linear evidence.
- 2026-05-28 second review-fix RED: `npx jest --runInBand src/test/use-quick-log-cached-rows.test.tsx src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx src/test/quick-log-event-view.test.ts` failed on QueryCache subscription churn, silent no-op action buttons, and duplicated failed-banner accessibility label.
- 2026-05-28 second review-fix GREEN targeted: `npx jest --runInBand src/test/use-quick-log-cached-rows.test.tsx src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx src/test/quick-log-event-view.test.ts` passed 4 suites / 15 tests.
- 2026-05-28 second review-fix full gate: `npm run check` passed lint, typecheck, 24 Jest suites / 185 tests, 97 Node tests, scaffold, design token, privacy, i18n, and text hygiene checks.
- 2026-05-28 third review-fix targeted: `npx jest --runInBand src/test/app-shell.render.test.tsx src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx src/test/i18n.test.ts` passed 4 suites / 26 tests after moving Timeline navigation callbacks into route shells and adding minimal Timeline empty copy.
- 2026-05-28 third review-fix full gate: `npm run check` passed lint, typecheck, 24 Jest suites / 186 tests, 97 Node tests, scaffold, design token, privacy, i18n, and text hygiene checks.
- 2026-05-28 third review-fix whitespace gate: `git diff --check` passed.
- 2026-05-28 fourth review-fix RED: `npx jest --runInBand src/test/business-rules.test.ts` failed when the `failed_permanent` failed-banner branch was temporarily removed, proving the added assertion covers the OR branch.
- 2026-05-28 fourth review-fix targeted: `npx jest --runInBand src/test/business-rules.test.ts src/test/quick-log-mutation.test.ts src/test/quick-log-event-view.test.ts src/test/quick-log-controller.test.tsx src/test/quick-log-sheet.render.test.tsx src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx` passed 7 suites / 51 tests after adding review-context comments, aliasing the shared care context type, and covering `failed_permanent`.
- 2026-05-28 fourth review-fix typecheck: `npm run typecheck` passed.
- 2026-05-28 fourth review-fix full gate: `npm run check` passed lint, typecheck, 24 Jest suites / 186 tests, 97 Node tests, scaffold, design token, privacy, i18n, and text hygiene checks.
- 2026-05-28 fourth review-fix whitespace gate: `git diff --check` passed.
- 2026-05-28 fifth review-fix RED: `npx jest --runInBand src/test/quick-log-mutation.test.ts src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx` failed on root Timeline cache visibility when only filtered caches existed and rendered synced status text containing `"OK"`.
- 2026-05-28 fifth review-fix GREEN targeted: `npx jest --runInBand src/test/quick-log-mutation.test.ts src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx` passed 3 suites / 31 tests after always updating the root Timeline cache and replacing the raw synced status text marker.
- 2026-05-28 fifth review-fix full gate: `npm run check` passed lint, typecheck, 24 Jest suites / 187 tests, 97 Node tests, scaffold, design token, privacy, i18n, and text hygiene checks.

---

## Changelog

- 2026-05-27: Created active implementation plan from reviewed PUP-15 scope.
- 2026-05-27: Implemented PUP-15 local Today/Timeline Quick Log pending/failed/confirmed state integration, including failed-banner threshold, optimistic hot-path cache visibility, shared event view helper, modal Timeline route, EN/RU/ES strings, and focused tests.
- 2026-05-28: Fixed deep-review findings for enqueue-failure rollback, synced row status, Quick Log payload validation, locale-aware event times, and query-cache subscription scope.
- 2026-05-28: Fixed confirmed second-review findings for QueryCache subscription churn, silent no-op action buttons, failed-banner double announcement, dead `todayDate` fallback, and locale default coverage.
- 2026-05-28: Fixed final review findings by moving `expo-router` usage out of Today/More/Timeline feature screens, adding minimal Timeline empty-state copy, and aligning Quick Log lifecycle architecture docs with the optimistic hot path.
- 2026-05-28: Fixed latest review warnings with code comments for the deferred actor-label assumption and intentional optimistic-cancel ordering, aliased the duplicated care-context type, and added failed-banner coverage for `failed_permanent`.
- 2026-05-28: Fixed fifth deep-review blockers by keeping the root Timeline cache updated alongside compatible filtered caches and removing raw `"OK"` synced status text from Today/Timeline rows.
- 2026-05-28: Moved the plan to completed after `PUP-15` reached Linear `Done` and PR #15 was merged.

## Follow-Ups Logged Outside PUP-15

- Active care context wiring must provide a synchronous session actor to `createQuickLogMutationOptions`; the current null default is documented as temporary while production Quick Log is gated.
- Move the Quick Log tracker label key helper next to the tracker contract before adding another non-Quick-Log-shell consumer.
- Extract the duplicated Today/Timeline Quick Log row into a shared design/lib primitive before adding more Timeline row states or visual changes.
- Replace placeholder status text glyphs with real design-system icons before visual review of Today/Timeline.
