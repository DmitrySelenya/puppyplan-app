# Quick Log Durable-Write Lifecycle, Sheet Exit, Time Gutter - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes contracts, schema, RLS, UX, routes, data flow, or verification evidence.

**Goal:** A quick log tapped in the sheet must reach the durable SQLite queue even though the same
tap closes the sheet; the sheet must always offer an explicit close affordance; the Diary time
gutter must match the artboard at default type size without breaking the no-truncation lock.

**Status:** Completed — merged to `main` via PR #34 (squash `33d6e8c`) on 2026-07-20. All three
findings shipped: session-scoped Quick Log pipeline (Finding 1, critical silent-data-loss fix),
explicit sheet close control (Finding 2), left-aligned time gutter (Finding 3). `npm run check`
green on CI (Local Gate), natively verified on the SE sim (Feeding chip-log persists across app
relaunch). Linear PUP-37 closed.

**Current phase:** Done.

**Architecture:** Client-only. Moves ownership of the Quick Log mutation pipeline (queue handle,
drain loop, mutation port, session-epoch guard) from four route components into one
session-scoped provider under the existing `src/lib/query/quick-log.ts` boundary. No Supabase,
schema, RLS, or queue state-machine change. Queue semantics per ADR-0004/0021 and
`docs/architecture/10-quick-log-queue.md` are preserved bit-for-bit; only the React lifetime that
hosts them changes.

**Linear:** PUP-37

**Branch:** working tree currently carries uncommitted PUP-36 work on
`dimaselenya/pup-36-...`; PUP-37 commits target Linear `gitBranchName`
`dimaselenya/pup-37-quick-log-silent-data-loss-durable-write-pipeline-dies-with` —
branch/commit split is an explicit user decision at commit time.

**TDD mode:** heavy/full-isolated for Finding 1 (data-loss layer). Lightweight for Findings 2-3
(pure UI affordance/layout with anatomy tests), consistent with prior UI-polish passes.

**Primary source docs:**
- Architecture: `docs/architecture/10-quick-log-queue.md` (UI contract: "Durable enqueue must
  still complete before the Supabase insert starts")
- ADR: `docs/architecture/adr/0021-durable-local-write-strategy.md` (no engine change here),
  ADR-0017 (auth/session identity)
- Design: `docs/design/v2/specs/diary-v2.md` (TimeGutter 46pt, right-aligned, meridiem stacked),
  `docs/design/v2/specs/diary-telegram-parity.md` (62pt no-truncation lock, line 50)
- Precedent: `docs/design/v2/specs/routine-lifecycle-menu.md` (modal must always expose an
  explicit accessible dismissal path)

---

## Context

Root cause of Finding 1, confirmed live on the approved SE simulator (native process sample,
queue-DB forensics, code trace):

1. `useQuickLogSheetController.logTracker` calls `closeSheet()` before `mutation.mutate()`
   (`src/features/quick-log/useQuickLogSheetController.ts:266` vs `:300`).
2. Sheet-route unmount runs `useQuickLogMutationPort` cleanup (`src/lib/query/quick-log.ts:876`),
   which bumps the session epoch and nulls `userIdRef` — the same signal as a real sign-out.
3. `onMutate` resumes after `await cancelQueries` (`quick-log.ts:538`) and throws
   `QuickLogActorSupersededError` at the actor assert (`quick-log.ts:539`).
4. The superseded catch deliberately keeps the optimistic cache row and reports nothing
   (`quick-log.ts:548`); onError appends no event because no queue row exists
   (`quick-log.ts:1118`).

Observable result: eternal "Saving" row + permanent "Sync in progress" banner, zero queue rows,
zero network traffic, record silently lost on restart. This violates the queue UI contract and
the repo "silent failures = lost data" rule.

`useQuickLogMutationPort` is mounted independently in four routes (quick-log sheet, Diary tab,
quick-note screen, details modal): four queue handles, four epochs, four 5s drain intervals.
The port that executes a sheet mutation dies with the sheet.

- **Context package:** PUP-37, this plan, `quick-log.ts` (port + mutation options),
  `useQuickLogSheetController.ts`, `QuickLogShell.tsx`, `TimeGutter.tsx`, the four mounting
  routes, `src/test/today-quick-log.render.test.tsx`, `src/test/diary-primitives.render.test.tsx`.
- **Context placement:** Linear stays short; this plan holds the mechanism; PR holds evidence.

---

## Goals

1. **Durable write survives sheet close (Finding 1, critical).**
   - The pipeline outlives any single route; supersession fires only on real session change.
2. **Sheet always dismissible (Finding 2).**
   - Explicit close affordance in the main sheet state, независимо от высоты контента.
3. **Time gutter artboard-faithful at default scale (Finding 3).**
   - 46pt at default font scale, 62pt at enlarged scales; no valid localized time truncates;
     Spanish "p. m." meridiem no longer drops its second token.

## Non-Goals

- No queue engine extraction (ADR-0021 sequencing unchanged).
- No change to queue schema, state machine, retry policy, dedupe windows, or idempotency.
- No redesign of snackbar/undo flow or of the sheet's close-before-mutate UX ordering
  (with a session-scoped pipeline the ordering becomes safe).
- No fix for RU "Возобновить" Off-tab squeeze or other open PUP-36 follow-ups.

---

## Product Decisions Locked In

1. **Pipeline ownership**
   - **Chosen:** One session-scoped `QuickLogPipelineProvider` mounted in `app/_layout.tsx`
     (inside AuthProvider, alongside `QuickLogFeedbackProvider`); `useQuickLogMutationPort()`
     keeps its exact public API but reads from context.
   - **Reason:** Kills the unmount/epoch misfire class entirely, deduplicates 4 drain loops,
     matches the port/provider pattern already used for feedback; a mutate-before-close reorder
     would only shrink the race window, not close it.
2. **Supersession guard semantics**
   - **Chosen:** Keep the guard and its retain-row-on-supersede behavior unchanged; only its
     trigger becomes provider unmount/actor change (real sign-out or account switch).
   - **Reason:** The guard's cross-actor safety design is correct; the bug was its host's lifetime.
3. **mutationEvents scope**
   - **Chosen:** Session-scoped (provider-lived) instead of route-lived; existing cap
     (`slice(-50)`) retained.
   - **Reason:** Reopening the sheet should still show in-flight/failed cards; matches the
     durable queue's own lifetime.
4. **Sheet close affordance**
   - **Chosen:** `SheetHeader` gains `onClose={closeSheet}` in the main state, reusing
     `quick-log.sheet.dismiss` (exists in EN/RU/ES); drag handle stays decorative.
   - **Reason:** Same anatomy as the sheet's other two states; precedent in
     routine-lifecycle-menu spec ("can always be dismissed"); no new strings.
5. **Gutter width**
   - **Chosen:** `TimeGutter` width 46pt when `fontScale <= 1`, 62pt otherwise; alignment,
     typography, stacked meridiem unchanged; fix meridiem splitting to keep the full remainder
     ("p. m.", not "p.").
   - **Reason:** Restores the artboard value at default scale (diary-v2.md line 40) while
     keeping the parity lock's no-truncation guarantee where it was actually needed (AXL);
     both endpoints are already-locked design values, no invented numbers.

---

## Invariants And Executable Spec

- **Acceptance mapping:** PUP-37 -> this plan -> tests below -> PR evidence.
- **Invariant 1:** A quick log mutate reaches the durable queue (row in `pending_local`/later)
  even when the mounting route unmounts synchronously after `mutate()` returns.
  - **Test:** `src/test/quick-log-pipeline-lifecycle.test.tsx` (new; RED first reproduces the
    phantom: unmount consumer -> enqueue never called with route-lived port).
- **Invariant 2:** After a real actor change (sign-out / different user), an in-flight mutation
  still supersedes: no enqueue under the old actor, optimistic row handling unchanged.
  - **Test:** same file, sign-out scenario (guards against over-fixing).
- **Invariant 3:** Exactly one queue open + one drain interval per signed-in session regardless
  of how many routes consume the port.
  - **Test:** same file (openQuickLogQueueStorage call count with two consumers).
- **Invariant 4:** Main-state sheet renders a visible, accessible close control that fires
  `closeSheet`; view-only and unavailable states keep theirs.
  - **Test:** `src/test/today-quick-log.render.test.tsx` (anatomy; `getByLabelText` +
    role/press assertions — visible-affordance check via icon-button presence).
- **Invariant 5:** TimeGutter: width 46 at fontScale 1 and 62 at >1; clock and meridiem each
  stay one line; "11:59 p. m." renders meridiem "p. m." intact.
  - **Test:** `src/test/diary-primitives.render.test.tsx`.

---

## File Map

### App Shell
- `app/_layout.tsx` - mount `QuickLogPipelineProvider`.
- `app/(sheets)/quick-log/index.tsx`, `app/(tabs)/diary/index.tsx`,
  `app/(modals)/quick-log/details/index.tsx` - unchanged call sites (API preserved) or trivial.

### Feature
- `src/features/quick-log/screens/QuickLogShell.tsx` - main-state SheetHeader onClose.
- `src/features/quick-log/screens/ConnectedQuickNoteScreen.tsx` - unchanged call site.

### Design
- `src/design/primitives/TimeGutter.tsx` - scale-aware width + meridiem split fix.

### Data And Query
- `src/lib/query/quick-log.ts` - extract hook body into provider; context; hook reads context.

### Tests
- `src/test/quick-log-pipeline-lifecycle.test.tsx` - new (Invariants 1-3).
- `src/test/today-quick-log.render.test.tsx` - close affordance (Invariant 4).
- `src/test/diary-primitives.render.test.tsx` - gutter (Invariant 5).
- Existing quick-log/mutation tests must pass unchanged except provider wrappers.

### Docs
- `docs/design/v2/specs/diary-telegram-parity.md` - line 50 gutter lock rewording.
- `docs/architecture/10-quick-log-queue.md` - one line: pipeline is session-scoped.
- This plan's changelog.

No contracts, migrations, RLS, Edge Function, analytics-schema, or i18n-key changes.

---

## UX Spec

- **Sheet main state:** header row gains the standard close icon button (44pt target,
  `quick-log.sheet.dismiss` label) leading the title, matching the other two sheet states;
  Edit trackers button unchanged.
- **Error/pending cards, duplicate warning, pickers:** unchanged.
- **Diary rows:** identical anatomy; at default type size the time column narrows by 16pt and
  content widens accordingly; at AXL nothing changes.
- Accessibility: close control labeled + button role; no color-only state; 44pt target.
- i18n: reuses existing keys; ES meridiem now shows full "p. m.".

---

## Privacy, Analytics, And Observability

- No new events or logging; `reportQuickLogActorSuperseded` call sites move with the code.
- Evidence screenshots use synthetic data only.

---

## Locked Spec (Findings 1; TDD heavy)

### Acceptance Criteria
- AC-1: Given a signed-in pipeline provider and a consumer component that calls `port.mutate()`
  and unmounts in the same React commit, the enqueue input with that mutation's
  `client_event_id` reaches queue storage and the mutation is not superseded.
- AC-2: With two consumer components mounted under one provider, `openQuickLogQueueStorage` is
  called exactly once for the signed-in session.
- AC-3: When auth transitions to signed-out while a mutation is between optimistic insert and
  durable enqueue, enqueue is never called for the old actor (supersession preserved).
- AC-4: All existing quick-log suites pass with only test-harness wrapper additions.

### Edge Cases
- EC-1: Sheet consumer unmounts while Diary consumer stays mounted -> mutation events remain
  observable through the surviving consumer (session-scoped `mutationEvents`).

### Error Cases
- ERR-1: `useQuickLogMutationPort()` outside the provider throws a descriptive error.

### Constraints
- Public API of `useQuickLogMutationPort` unchanged; queue state machine and storage contract
  untouched; no assertion weakening in existing tests.

### Out of Scope
- Findings 2-3 (own lightweight specs in Phases 3-4).

---

## Implementation Plan

### Phase 1 - RED: lifecycle failing tests (Finding 1)

- [x] Wrote `src/test/quick-log-pipeline-lifecycle.test.tsx` (AC-1, AC-2, AC-3, EC-1, ERR-1).
  RED confirmed: AC-1/AC-2/EC-1/ERR-1 failed for the intended behavior (enqueue never called on
  consumer unmount; two queue opens; no shared events; no descriptive throw). AC-3 passed
  (guards against over-fixing).

### Phase 2 - GREEN: session-scoped provider

- [x] Extracted the pipeline body into `useQuickLogPipeline` hosted by `QuickLogPipelineProvider`
  in `src/lib/query/quick-log.ts`; `useQuickLogMutationPort()` reads context and throws a
  descriptive error when the provider is absent. Public API unchanged.
- [x] Provider mounted once in `app/_layout.tsx` inside `AuthProvider` + `QuickLogFeedbackProvider`.
- [x] Lifecycle suite 5/5 green; the 7 route-render suites (94 tests) pass (they mock the port);
  `quick-log-mutation-port.test.tsx` wrapper added (harness-only, no assertion change).

### Phase 3 - Sheet close affordance (Finding 2)

- [x] RED in `quick-log-sheet.render.test.tsx`: anatomy asserts a `quick-log-sheet-close`
  control (button role, `quick-log.sheet.dismiss` label) plus `AC-P37-2` press wiring.
- [x] GREEN: leading `IconButton` close in the main-state header row (`[X] title … Edit
  trackers`), reusing `quick-log.sheet.dismiss`; drag handle stays decorative. Scrim-specific
  tests retargeted by testID (intent-preserving, no assertion weakening). Suite 28/28.

### Phase 4 - Time gutter (Finding 3) — owner chose left-align

- Escalated to the owner (spec conflict: parity line 50 locks 62pt + no-truncation, PUP-36 test
  asserts right-align). Owner decision 2026-07-20: **left-align the time within the unchanged
  62pt column.** Width stays 62pt so the no-truncation guarantee is untouched; only alignment
  moved right→left, so short times sit on the screen-edge side and the left dead zone is gone.
- [x] RED: flipped the `AC-P33-GUTTER`/`AC-P37-3` assertion to `alignItems: 'flex-start'`
  (kept width 62 at fontScale 1/1.9/2). GREEN: `TimeGutter` `alignItems: 'flex-start'`.
- [x] Specs updated: `diary-telegram-parity.md` line 50 and `diary-v2.md` RoutineCard note record
  the left-align deviation and that width/truncation are unchanged.

### Phase 5 - Verification and evidence

- [x] `npm run check` green: lint (0 errors), typecheck, 1275/1275 jest across 105 suites, plus
  test:node and test:scaffold (i18n parity, tokens, privacy, plans-index).
- [x] Rebuilt embedded release bundle, swapped into the approved SE sim. Chip-logged Feeding:
  success snackbar, sheet closed, durable queue DB written (mtime advanced from the frozen
  broken-state timestamp), event synced (`server_confirmed` → queue row removed per contract),
  and — decisively — the record **persisted across a full app relaunch** (the exact silent-loss
  repro is gone). Evidence: `output/ux-audit/pup37-fix-2026-07-19/` (synthetic data only).
- [x] Sheet close: header "Dismiss Quick Log" control present (a11y tree) and functionally
  dismisses the sheet on tap.
- [x] Gutter left-align confirmed live (time hugs the screen-edge side).
- [ ] Update PUP-37, this changelog; move plan to completed after user review.

---

## Risks

- Provider-hoist changes React ownership around auth transitions: mitigated by Invariant 2 test
  and by keeping the guard logic byte-identical.
- Session-scoped mutationEvents may resurface old failed cards after re-opening the sheet:
  intended behavior (matches durable queue), noted for owner review.
- Test harnesses that renderHook the port need wrappers; only harness code changes, no
  assertion weakening.

## Changelog

- 2026-07-19: Plan created from live root-cause session (PUP-37).
- 2026-07-20: Findings 1 & 2 implemented via heavy TDD.
  - Finding 1: pipeline is now session-scoped (`QuickLogPipelineProvider` in `app/_layout.tsx`;
    `useQuickLogMutationPort` context-backed, API unchanged). New
    `src/test/quick-log-pipeline-lifecycle.test.tsx` (5/5) proves a chip-log survives the
    sheet-route unmount that used to supersede it, while a real sign-out still supersedes, and
    only one queue opens per session.
  - Finding 2: main-state sheet gained a leading close `IconButton` (`quick-log-sheet-close`),
    reachable at the top of the bottom-anchored sheet even when retained error cards grow it.
    This is a named deviation from `dogfood-quick-log-sheet.md` (which specified scrim-only
    dismissal); justified by the audit trap and the routine-lifecycle-menu precedent ("can
    always be dismissed"). Sheet suite 28/28.
  - Finding 3 (time gutter): owner chose left-align (2026-07-20). Time is left-aligned in the
    unchanged 62pt column; width/no-truncation guarantee untouched. Specs updated.
- 2026-07-20: Native verification on the approved SE sim with the freshly rebuilt release bundle.
  All three fixes confirmed live: Feeding chip-log persists across app relaunch (durable-write
  regression gone; queue DB write observed then synced+cleaned), header close control dismisses
  the sheet, time gutter left-aligned. `npm run check` fully green. Evidence in
  `output/ux-audit/pup37-fix-2026-07-19/`. Nothing committed; awaiting owner review.
