# PUP-22/PUP-23 Today, Quick Log Details, Timeline - Implementation Plan

> For implementation agents: use `AGENTS.md`, `.agents/skills/plan`, `.agents/skills/implement`, `.agents/skills/tdd`, `.agents/skills/review`, and this plan task-by-task. Do not implement from the master roadmap alone.
> Living document: update this file as implementation changes contracts, UX, routes, data flow, query/cache behavior, verification evidence, or Linear status.

**Goal:** Complete master-roadmap Phase 3 for Milestone B: Today becomes a useful daily hub with deterministic guidance, Quick Log gains detail/slow-save variants, and Timeline becomes filterable/editable without expanding durable offline behavior beyond the existing Quick Log queue.

**Status:** Active.

**Current phase:** Phase 4 - PUP-22 Verification And Local Commit.

**Architecture:** Supabase remains durable source of truth, TanStack Query owns server state, Expo SQLite remains the only durable local-write exception for Quick Log, and feature UI composes `src/design` primitives with typed EN/RU/ES i18n. PUP-22 owns Today/guidance. PUP-23 owns Quick Log details and Timeline completion. Reminder/family-dependent Today variants are review-only slots plus synthetic dev-gallery fixtures until PUP-25/PUP-26.

**Linear:** `PUP-22` and `PUP-23` in team `PUP`, project `PuppyPlan MVP`.

**Branches:** `PUP-22` generated branch `dimaselenya/pup-22-today-core-guidance-cards-and-day-2-7-states`; `PUP-23` generated branch `dimaselenya/pup-23-quick-log-details-and-timeline-completion`. Local commits on these Linear branches are approved by the prompt. Push, PR, merge, rebase, force push, tags, release, EAS, TestFlight, Supabase mutations, and production changes remain forbidden without exact later approval.

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - Today, Day 2-7 retention journey, Quick Log, Timeline, Starter Guidance Cards, Minimal Durable Quick Log Queue, acceptance criteria, test matrix.
- Design: `DESIGN.md` - sections 2.2 Today, 2.3 Quick Log, 2.4 Timeline, 4.3 Starter Guidance Cards, generation order.
- Design atlas: `docs/design/v1/native-coverage.md`, `docs/design/v1/screenshots/index.md` Today, Quick Log, Timeline, Starter Guidance.
- Architecture: `docs/architecture/00-overview.md`, `03-client-data-layer.md`, `04-state-management.md`, `05-navigation-and-deeplinks.md`, `06-design-system-and-ui-contracts.md`, `08-data-model-and-rls.md`, `10-quick-log-queue.md`, `12-i18n-and-content.md`, `13-observability-error-handling-performance.md`, `17-testing-ci-release.md`, `18-ai-agent-guide.md`, `screen-states-matrix.md`.
- ADR: `docs/architecture/adr/0003-state-ownership-matrix.md`, `0004-quick-log-queue-sqlite.md`, `0007-prd-schema-baseline.md`, `0010-react-i18next-typed-keys.md`, `0011-design-system-runtime.md`, `0017-auth-identity-session.md`.
- Precedent plan: `docs/plans/active/2026-06-08-post-pup-18-next-batch.md`.
- Supergoal artifacts: `.supergoal/pup-22-pup-23-today-core-guidance-quick-2LeNfK/ROADMAP.md`.

---

## Context

`PUP-21` is complete on `main`, so downstream work can consume real Supabase Auth session identity, active household/puppy care context, and selected Quick Log trackers. Current Today and Timeline are partial: they show Quick Log rows and pending/failed recovery actions, but not the full Today hero/day-state system, deterministic card priority, guidance card/detail flow, Timeline filters, edit/delete/undo completion, or Quick Log details route.

Current Quick Log infrastructure already includes contracts, business-rule constants, local queue, mutation/cache lifecycle, selected tracker consumption, duplicate warning, snackbar feedback, and Today/Timeline pending/failed row visibility. This batch must extend that surface without resetting the completed trust boundaries.

- **Context package:** this plan, `PUP-22`, `PUP-23`, the source docs above, existing Today/Quick Log/Timeline files, current query/cache tests, current design-gallery fixtures, and Supergoal phase specs.
- **Context placement:** Linear issues hold operational acceptance and status; this plan holds implementation contract and evidence; `.supergoal` holds execution protocol; final PR text is out of scope until push/PR approval.
- **What already exists:** primary tabs, Quick Log FAB/modal, active care context, selected trackers, Quick Log queue/mutation/cache, partial Today/Timeline Quick Log rows, typed i18n, design primitives, dev gallery.
- **Unsolved:** Today prioritization/day-state model, one daily guidance card with detail states, synthetic review states for future reminder/family dependencies, Quick Log details route and slow-save state, Timeline filters/edit/delete/undo/full empty/error/offline states.

---

## Goals

1. **Make Today operational for Milestone B.**
   - Add deterministic hero/card prioritization.
   - Render first day, day 2 morning, accident recovery, feeding pattern, after invite, missed reminder, and day 7 weekly rhythm variants.
   - Keep reminder/family variants as declarative slots plus synthetic fixtures until their production issues.

2. **Ship starter guidance without scope creep.**
   - One starter guidance card per day.
   - Topic detail supports read, practiced, and skip states.
   - Content is locally versioned now and ready for `content_version` if server-backed content becomes scope later.

3. **Complete Quick Log details and Timeline management.**
   - Details route for sleep, feeding, and zoomies variants.
   - Slow-saving/error variants and duplicate-care warning remain tested.
   - Timeline supports filters, empty filtered state, attribution, edit/delete/undo, offline/error states, and non-swipe alternatives.

4. **Preserve trust boundaries.**
   - No schema changes.
   - No new dependencies.
   - No durable offline writes outside Quick Log SQLite queue.
   - No raw PII in code, tests, docs, screenshots, Linear, analytics, or logs.

---

## Non-Goals

- Health production work.
- Real reminders system, notification scheduling, local notification permissions, reminder occurrence persistence, or missed-reminder production actions.
- Real family invite/sharing, trainer sharing, sitter, shareable cards, paywall, or entitlement work.
- New primary tabs or changing Quick Log from FAB/modal into a tab.
- Schema changes beyond the existing ADR-0007 baseline and approved `quick_tracker_ids` delta.
- New dependencies.
- Push, PR, merge, remote git mutation, release action, EAS/TestFlight, Supabase production/dev mutation, or production configuration.
- Broad local-first event store, sync conflict resolver, durable outbox, or Timeline offline write promises.

---

## Product Decisions Locked In

1. **Reminder/family-dependent Today variants**
   - **Chosen:** Build composable card slots and synthetic `/_dev/components` fixtures only.
   - **Reason:** PUP-25/PUP-26 own real reminders and family invite behavior; this batch must not fake production reminders or sharing.

2. **Guidance content storage**
   - **Chosen:** Local versioned content in contracts/feature code for this batch unless server-backed content already exists.
   - **Reason:** PRD content_version remains the future server-backed path, but no schema change is approved for this batch.

3. **Quick Log details**
   - **Chosen:** Details are optional post-save or Timeline-edit UI; initial Quick Log save remains one-tap and does not wait for details.
   - **Reason:** PRD says optional details never block save, and the hot path must preserve <=100ms optimistic visibility.

4. **Branching**
   - **Chosen:** Execute `PUP-22` first on its generated branch, create a local commit, then execute `PUP-23` on its generated branch. If PUP-23 needs PUP-22 code for integrated verification, branch `PUP-23` from the local `PUP-22` branch and record the stacked dependency in Linear.
   - **Reason:** This respects Linear-generated branch names and one primary issue per branch while allowing local Milestone B integration without remote mutation.

---

## Invariants And Executable Spec

- **Acceptance mapping:** Linear issue -> this plan -> automated test/manual check -> Linear evidence.
- **Invariant 1:** Today prioritization is deterministic for the same input and emits exactly one hero card.
  - **Test:** `src/test/today-prioritization.test.ts`.
- **Invariant 2:** Today shows at most 5 visible daily cards and at most one guidance card per day.
  - **Test:** `src/test/today-prioritization.test.ts`, `src/test/today-core.render.test.tsx`.
- **Invariant 3:** Reminder/family-dependent Today states are production-deferred and only exposed through explicit synthetic fixtures.
  - **Test:** `src/test/dev-gallery.render.test.tsx`, static assertions that production routes do not import reminder/family write adapters.
- **Invariant 4:** Guidance state transitions are typed and limited to read, practiced, skip.
  - **Test:** `src/test/guidance-contracts.test.ts`, `src/test/guidance.render.test.tsx`.
- **Invariant 5:** Quick Log accidental double tap remains 3 seconds and duplicate-care warning remains 60 seconds; indoor accident remains excluded.
  - **Test:** `src/test/business-rules.test.ts`, `src/test/quick-log-controller.test.tsx`.
- **Invariant 6:** Quick Log details never block the initial Quick Log save or local queue enqueue path.
  - **Test:** `src/test/quick-log-details.test.tsx`, `src/test/quick-log-controller.test.tsx`, `src/test/quick-log-mutation.test.ts`.
- **Invariant 7:** Timeline filter keys normalize deterministically and cache updates preserve local pending/failed rows.
  - **Test:** `src/test/query-keys.test.ts`, `src/test/use-quick-log-timeline-rows.test.tsx`, `src/test/timeline-filters.render.test.tsx`.
- **Invariant 8:** Feature UI uses `src/design` primitives and typed i18n strings only.
  - **Test:** `npm run test:scaffold`, render tests, text hygiene/privacy scan.
- **Invariant 9:** No schema changes are introduced.
  - **Test:** `npm run db:push:remote:dry-run` expected no-op, `npm run supabase:lint`.

---

## File Map

### App Shell
- `app/(tabs)/today/index.tsx` - route wiring only.
- `app/(modals)/quick-log/index.tsx` - route wiring only.
- `app/(modals)/quick-log/details/index.tsx` - new thin details route if needed.
- `app/(modals)/timeline/index.tsx` - route wiring only.
- `app/_dev/components.tsx` - dev gallery entry remains development-only.

### Feature
- `src/features/today/screens/TodayScreen.tsx` - compose Today sections.
- `src/features/today/components/*` - small Today hero/card/guidance/activity components.
- `src/features/today/todayPrioritization.ts` - pure deterministic priority model if not placed in contracts.
- `src/features/today/guidanceContent.ts` - local versioned starter guidance content if not contract-owned.
- `src/features/quick-log/screens/QuickLogShell.tsx` - entry and details navigation.
- `src/features/quick-log/screens/QuickLogDetailsScreen.tsx` - optional details route.
- `src/features/quick-log/components/*` - detail forms, slow/error states.
- `src/features/quick-log/useQuickLogSheetController.ts` - details/slow-save controller extensions if needed.
- `src/features/timeline/screens/TimelineScreen.tsx` - filters and management flow composition.
- `src/features/timeline/components/*` - filter row, range picker, event row, action sheet, empty states.
- `src/features/_dev/design-gallery/*` - synthetic states for Today, guidance, Quick Log details/slow-save, Timeline.

### Contracts
- `src/contracts/today.ts` - Today card input/output schemas and deterministic priority contract.
- `src/contracts/guidance.ts` - guidance content/state schemas.
- `src/contracts/quick-log.ts` - optional detail payload extensions only if current payload contract is insufficient.
- `src/contracts/business-rules.ts` - helper additions only; timing constants must not change.
- `src/contracts/navigation.ts` - route metadata if details route needs contract updates.

### Data And Query
- `src/lib/query/keys.ts` - timeline filter/query key updates.
- `src/lib/query/quick-log.ts` - mutation/cache updates for details/edit/delete/undo.
- `src/lib/query/useQuickLogTimelineRows.ts` - filter/local-row merge behavior.
- `src/lib/query/quick-log-event-view.ts` - row/view attribution/details indicators.
- `src/lib/query/active-care-context.ts` - read-only context surface additions only if needed.
- `src/lib/supabase/events.ts` - typed event update/delete wrapper if current wrapper lacks it.

### Tests
- `src/test/today-prioritization.test.ts`
- `src/test/today-core.render.test.tsx`
- `src/test/guidance-contracts.test.ts`
- `src/test/guidance.render.test.tsx`
- `src/test/quick-log-details.test.tsx`
- `src/test/quick-log-controller.test.tsx`
- `src/test/quick-log-mutation.test.ts`
- `src/test/timeline-filters.render.test.tsx`
- `src/test/timeline-quick-log.render.test.tsx`
- `src/test/query-keys.test.ts`
- `src/test/use-quick-log-timeline-rows.test.tsx`
- `src/test/dev-gallery.render.test.tsx`
- `src/test/i18n.test.ts`

### Docs
- `docs/plans/active/2026-06-12-pup-22-23-today-quicklog-timeline.md`
- `docs/plans/README.md`
- `docs/plans/active/2026-05-29-full-prd-native-app-master-roadmap.md`
- Architecture docs/ADRs only if implementation reveals actual contract drift; no planned schema/ADR changes.

---

## Contracts, Schema, And Permissions

### Zod Contracts

- [ ] Add Today card/prioritization contracts.
- [ ] Add guidance content/state contracts.
- [ ] Add Quick Log details payload contracts only where existing `event_log.payload` parsing is insufficient.
- [ ] Add contract tests for valid, invalid, and boundary payloads.

### Database / RLS

- [ ] Migration required: no.
- [ ] Destructive migration risk reviewed: N/A.
- [ ] RLS policy impact reviewed: read/update/delete behavior must use existing `event_log` RLS and typed wrappers.
- [ ] pgTAP update required: no expected schema/RLS policy changes.

### Edge Functions

- [ ] Edge Function required: no.
- [ ] No privileged operation is exposed through UI-only guards.
- [ ] Existing Supabase wrappers remain the only data access boundary.

---

## UX Spec

### Navigation And Entry Points

- `/today` is the daily hub with one hero and Quick Log FAB still outside the tab list.
- `/quick-log` remains the modal/FAB sheet.
- `/quick-log/details` is a modal route only if needed for post-save/details edit; route file stays thin.
- `/timeline` opens from Today and More; it is not a primary tab.
- `/_dev/components` contains synthetic state fixtures and is not linked from production tabs/More.

### States

- **Today loading:** skeleton cards with TopBar available where local context exists.
- **Today empty:** calm start state leading to Quick Log/onboarding as appropriate.
- **Today success:** one hero, up to 5 daily cards, one guidance card, Timeline entry.
- **Today error/offline-read:** honest cached/offline copy; no raw errors.
- **Today pending-write:** pending Quick Log rows visible with status dot/pill.
- **Quick Log details loading/error/pending:** optional details are recoverable and never block initial log.
- **Timeline empty:** no events.
- **Timeline empty filtered:** selected filters return no rows.
- **Timeline failed/offline:** calm retry/delete or offline-read copy; no raw backend errors.
- **Timeline permission denied:** write actions hidden/disabled for viewer context.

### Accessibility

- [ ] Touch targets meet iOS 44pt / Android 48dp minimums.
- [ ] Quick Log / FAB target remains 56pt+.
- [ ] Interactive elements have labels, roles, and state/hint when needed.
- [ ] Status does not rely on color alone.
- [ ] Swipe actions have visible non-swipe alternatives.
- [ ] Dynamic Type XXXL reviewed for Today, guidance, Quick Log details, and Timeline rows.

### i18n And String Budgets

- [ ] No raw user-facing strings in UI.
- [ ] EN/RU/ES key parity updated.
- [ ] ICU plurals used for count-sensitive strings.
- [ ] String-budget-sensitive labels checked: CTAs, pills, tracker tiles, Timeline filters, guidance actions.

---

## Privacy, Analytics, And Observability

- [ ] Analytics schemas are unchanged unless a narrow, privacy-safe event is needed.
- [ ] No raw puppy names, notes, emails, provider names, photos, invite/share tokens, push tokens, or production data in events/logs/docs/screenshots.
- [ ] Errors go through shared observability wrappers or normalized UI categories, not direct `Sentry.captureException`.
- [ ] Screenshots and dev-gallery fixtures use synthetic data only.
- [ ] Platform privacy/compliance declarations reviewed; no expected permission/data collection changes.

---

## Implementation Plan

### Phase 0 - Supergoal Plan Review Gate

**Checklist:**
- [x] Read AGENTS/CLAUDE, relevant project skills, Linear workflow, and source docs.
- [x] Create PUP-22 and PUP-23 in Linear.
- [x] Create this repo plan.
- [x] User approves the Supergoal phase plan.

**Acceptance criteria:**
- Plan is explicit enough to implement without guessing after user approval.

---

### Phase 1 - Branches And Scope Lock

**Files:**
- `docs/plans/active/2026-06-12-pup-22-23-today-quicklog-timeline.md`
- Linear PUP-22/PUP-23 comments/status

**Checklist:**
- [x] Create/switch to `dimaselenya/pup-22-today-core-guidance-cards-and-day-2-7-states`.
- [x] Move or comment PUP-22 and PUP-23 to In Progress with scope/branch notes.
- [x] Re-read this plan, source docs, and relevant current files.
- [x] Record pre-existing worktree state.

**Acceptance criteria:**
- Branch context and Linear status are explicit before code edits.

---

### Phase 2 - Today Contracts And Guidance Model

**Files:**
- `src/contracts/today.ts`
- `src/contracts/guidance.ts`
- `src/test/today-prioritization.test.ts`
- `src/test/guidance-contracts.test.ts`
- `src/lib/query/keys.ts` only if Today/guidance needs a key extension

**Checklist:**
- [x] RED: write failing tests for Today prioritization variants.
- [x] RED: write failing tests for guidance content/state.
- [x] GREEN: implement deterministic priority and guidance contracts.
- [x] REFACTOR while tests stay green.

**Acceptance criteria:**
- Deterministic Today card output covers first day, day 2, accident, feeding pattern, after invite synthetic input, missed reminder synthetic input, and day 7.
- Guidance state is limited to read/practiced/skip and content is versioned.

---

### Phase 3 - Today UI And Dev Gallery

**Files:**
- `src/features/today/screens/TodayScreen.tsx`
- `src/features/today/components/*`
- `src/features/_dev/design-gallery/*`
- `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json`
- `src/test/today-core.render.test.tsx`
- `src/test/guidance.render.test.tsx`
- `src/test/dev-gallery.render.test.tsx`

**Checklist:**
- [x] RED: render tests for Today states and guidance interactions.
- [x] GREEN: compose Today from small prop-driven components.
- [x] Add synthetic fixtures for reminder/family-dependent variants only.
- [x] Add dev-gallery states for Today/guidance.
- [x] Update i18n keys in EN/RU/ES.

**Acceptance criteria:**
- Today renders one hero, up to 5 daily cards, one guidance card, pending/error/offline states, and synthetic deferrals without production fake behavior.

---

### Phase 4 - PUP-22 Verification And Local Commit

**Files:**
- PUP-22 changed files and this plan.

**Checklist:**
- [x] Run focused Today/guidance/dev-gallery tests.
- [x] Run `npm run check`.
- [x] Run Supabase no-op gates if no schema changed.
- [x] Update PUP-22 Linear with evidence.
- [x] Commit local PUP-22 branch only.

**Acceptance criteria:**
- PUP-22 is locally complete with evidence recorded and no remote mutation.

---

### Phase 5 - Quick Log Details

**Files:**
- `app/(modals)/quick-log/details/index.tsx`
- `src/contracts/quick-log.ts`
- `src/features/quick-log/screens/QuickLogDetailsScreen.tsx`
- `src/features/quick-log/components/*`
- `src/features/quick-log/useQuickLogSheetController.ts`
- `src/features/_dev/design-gallery/*`
- `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json`
- `src/test/quick-log-details.test.tsx`
- `src/test/quick-log-controller.test.tsx`
- `src/test/quick-log-mutation.test.ts`

**Checklist:**
- [ ] Create/switch to `dimaselenya/pup-23-quick-log-details-and-timeline-completion` locally.
- [ ] RED: Quick Log details route/component/controller tests.
- [ ] GREEN: implement sleep, feeding, zoomies detail variants.
- [ ] Add slow-saving/error synthetic state for missing atlas 4.3.
- [ ] Keep duplicate-care constants unchanged and tested.

**Acceptance criteria:**
- Optional details are available after save/Timeline edit and never block initial save or queue behavior.

---

### Phase 6 - Timeline Completion

**Files:**
- `src/features/timeline/screens/TimelineScreen.tsx`
- `src/features/timeline/components/*`
- `src/lib/query/keys.ts`
- `src/lib/query/useQuickLogTimelineRows.ts`
- `src/lib/query/quick-log.ts`
- `src/lib/query/quick-log-event-view.ts`
- `src/lib/supabase/events.ts`
- `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json`
- `src/test/timeline-filters.render.test.tsx`
- `src/test/timeline-quick-log.render.test.tsx`
- `src/test/query-keys.test.ts`
- `src/test/use-quick-log-timeline-rows.test.tsx`

**Checklist:**
- [ ] RED: filter/query key/edit/delete/undo tests.
- [ ] GREEN: implement Timeline filters, empty filtered state, attribution, edit/delete/undo, offline/error states.
- [ ] Preserve local pending/failed rows in filtered and unfiltered caches.
- [ ] Add non-swipe alternatives for edit/delete.

**Acceptance criteria:**
- Timeline supports required filters and management flows with deterministic query/cache behavior and accessibility alternatives.

---

### Phase 7 - Integration, Docs, And Linear Sync

**Files:**
- `docs/plans/active/2026-06-12-pup-22-23-today-quicklog-timeline.md`
- `docs/plans/README.md`
- `docs/plans/active/2026-05-29-full-prd-native-app-master-roadmap.md`
- Linear PUP-22/PUP-23 comments/status

**Checklist:**
- [ ] Update plan checkboxes and changelog.
- [ ] Update `docs/plans/README.md`.
- [ ] Add master-roadmap changelog/status note for PUP-22/PUP-23 local completion or current state.
- [ ] Mirror phase evidence and blockers to Linear.

**Acceptance criteria:**
- Repo docs and Linear reflect the actual local implementation state.

---

### Phase 8 - Polish And Harden

**Files:**
- Entire batch diff.

**Checklist:**
- [ ] Run final `npm run check`.
- [ ] Run `npm run supabase:lint`.
- [ ] Run `npm run db:push:remote:dry-run`.
- [ ] Run privacy/text/i18n gates or confirm they are included in `npm run check`.
- [ ] Perform local iOS smoke on `Grith iPhone SE 3 iOS 26.3` only, screenshots under `/tmp/puppyplan-pup22-23-smoke/`.
- [ ] Check Dynamic Type XXXL for Today, guidance, Quick Log details, and Timeline rows.
- [ ] Review diff for PII, raw strings, raw colors/spacing, raw Supabase in UI, direct observability, debug logs, TODO/FIXME from this session.
- [ ] Commit local PUP-23 branch only.
- [ ] Update PUP-22/PUP-23 Linear with final local evidence; move to In Review only if local-only review is explicitly accepted or a PR is later created.

**Acceptance criteria:**
- All batch acceptance criteria are met or a blocker is recorded in the plan and Linear with a precise approval/request needed.

---

## Verification Commands

Expected final gate:

```text
npm run check
npm run supabase:lint
npm run db:push:remote:dry-run
```

Focused commands are phase-specific and should use `npm run test:unit -- --runTestsByPath ...` or `npx jest --runInBand --runTestsByPath ...` depending on what the repo accepts at execution time.

Manual evidence:
- iOS smoke on `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) only, fallback `iPhone SE (3rd generation)` only if primary is missing.
- Screenshots saved locally under `/tmp/puppyplan-pup22-23-smoke/`.
- Dynamic Type XXXL checks for affected screens.

---

## Risks And Mitigations

1. **Today/guidance scope can accidentally build future reminders/family production behavior.**
   - **Mitigation:** test/dev-gallery-only fixtures for those variants, plan deferral notes, no reminder/family write adapters.

2. **Timeline filters can drop local pending/failed rows on refetch.**
   - **Mitigation:** query key/filter normalization tests plus local-row merge tests before UI implementation.

3. **Large UI/i18n surface can introduce raw strings or design-boundary drift.**
   - **Mitigation:** typed EN/RU/ES updates alongside components, render tests, scaffold/text/privacy gates, final diff review.

---

## Approval Boundaries

Already approved by this prompt:
- Local issue creation in Linear for PUP-22/PUP-23.
- Local branch creation/switching using Linear-generated branch names.
- Local commits on the generated Linear branches.

Not approved:
- Push, PR, merge, rebase, force push, tags, remote GitHub mutation.
- Supabase migrations or production/dev schema mutations.
- New dependencies.
- EAS, TestFlight, App Store, Play Store, release channel, OTA/update actions.
- Production service configuration.

---

## Changelog

- 2026-06-12: Created PUP-22/PUP-23 Linear issues and initial active implementation plan from master roadmap Phase 3.
- 2026-06-12: Phase 1 complete. PUP-22/PUP-23 moved to In Progress with Linear start comments, local PUP-22 branch created, pre-code worktree state recorded, and source docs/current files re-read before feature edits.
- 2026-06-12: Phase 2 complete. Added deterministic Today/guidance contracts plus RED/GREEN tests; focused contract suites and full `npm run test:unit` passed.
- 2026-06-12: Phase 3 complete. Added Today hero/daily/guidance components, active-context Today screen states, synthetic reminder/invite dev-gallery fixtures, EN/RU/ES keys, and render coverage; `npm run test:unit` (54 suites, 340 tests), `npm run test:scaffold`, `npm run typecheck`, and `npm run lint` passed.
- 2026-06-12: Phase 4 verification gates passed before local commit: focused Today/guidance/dev-gallery tests, `npm run check`, `npm run supabase:lint`, and `npm run db:push:remote:dry-run`.
- 2026-06-12: PUP-22 local commit created on `dimaselenya/pup-22-today-core-guidance-cards-and-day-2-7-states`; no push or PR was created.
