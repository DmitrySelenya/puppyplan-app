# PUP-5 Quick Log MVP - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes contracts, schema, RLS, UX, routes, data flow, or verification evidence.
> `PUP-5` is planning-only. Do not implement Quick Log in this issue; split coding work into scoped follow-up Linear issues after this plan is reviewed.

**Goal:** Create the implementation contract for the Quick Log MVP flow so the app can later support one-tap routine event logging, durable pending saves, undo/delete before server confirmation, duplicate warnings, retry recovery, and Today/Timeline cache consistency without guessing across PRD, design, architecture, and existing contracts.

**Status:** Completed.

**Plan type:** Linear task plan for `PUP-5`.

**Current phase:** Completed; implementation handed off to scoped Linear issues `PUP-11` through `PUP-16`.

**Architecture:** Quick Log is the app's core habit loop. Supabase Postgres remains the durable source of truth for confirmed `event_log` rows. TanStack Query owns server-state cache and optimistic Today/Timeline rows. Expo SQLite owns only the Minimal Durable Quick Log Queue for unsent Quick Log events. Zustand may mirror queue/UI status but must not own server rows. Feature UI composes `src/design` primitives and typed i18n keys. Supabase access stays behind `src/lib/supabase` wrappers and query/mutation hooks.

**Linear:** `PUP-5` - https://linear.app/dmitryselenya/issue/PUP-5/create-quick-log-mvp-implementation-plan

**Branch:** `dimaselenya/pup-5-create-quick-log-mvp-implementation-plan`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - Quick Log, Minimal Durable Quick Log Queue, data model, analytics, release readiness.
- Design: `DESIGN.md` - Part 2.3 Quick Log, required states, FAB, tracker tiles, snackbar/undo, pending/failed/retry, duplicate warning.
- Architecture: `docs/architecture/03-client-data-layer.md`, `04-state-management.md`, `05-navigation-and-deeplinks.md`, `06-design-system-and-ui-contracts.md`, `08-data-model-and-rls.md`, `10-quick-log-queue.md`, `13-observability-error-handling-performance.md`, `17-testing-ci-release.md`, `screen-states-matrix.md`.
- ADRs: `docs/architecture/adr/0003-state-ownership-matrix.md`, `0004-quick-log-queue-sqlite.md`, `0007-prd-schema-baseline.md`, `0011-design-system-runtime.md`.

---

## Context

Foundation work is now in place:

- `PUP-2` created the Expo Router shell with `Today | Health | More` tabs and a persistent Quick Log FAB/modal route.
- `PUP-3` created Supabase contracts, migrations, RLS baseline, remote Supabase gate, and `src/contracts/database.types.ts`.
- `PUP-4` created local/CI gates through `npm run check`.
- `PUP-8`, `PUP-9`, and `PUP-10` created design tokens, native primitives, and typed i18n/string-budget gates.

Current Quick Log runtime is still only a shell: `app/(modals)/quick-log/index.tsx` re-exports `src/features/quick-log/screens/QuickLogShell.tsx`, and that shell renders the title/helper from typed i18n. `src/lib/queue/README.md` and `src/lib/query/README.md` are placeholders. `src/contracts/supabase.ts` already has MVP event payload schemas, `eventLogInsertSchema`, `quickLogQueueStates`, and `minimalQuickLogQueueItemSchema`. `src/contracts/business-rules.ts` already owns the 3-second accidental double-tap window and 60-second duplicate-care warning window.

- **Context package:** `PUP-5`, this plan, `AGENTS.md`, the source docs above, `docs/plans/active/2026-05-21-phase-0-architecture-cleanup.md`, `docs/plans/README.md`, current `app/(modals)/quick-log/index.tsx`, `app/(tabs)/_layout.tsx`, `src/features/quick-log/screens/QuickLogShell.tsx`, `src/features/today/screens/TodayScreen.tsx`, `src/contracts/supabase.ts`, `src/contracts/business-rules.ts`, `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json`, `src/test/supabase-contracts.test.ts`, and advisory project graph observations.
- **Context placement:** Linear holds concise status and verification evidence. This plan holds implementation context. Future PRs hold final verification evidence and issue split links.
- **Ownership area:** Today / Quick Log / Timeline plus shared data/query/queue boundaries.
- **Graph note:** project graph found current Quick Log shell dependencies on i18n and design primitives, plus app shell tests. It did not surface queue/query implementation files because those layers are currently placeholders; actual source reads above are authoritative.

---

## Goals

1. **Make Quick Log implementation-ready without coding it in `PUP-5`.**
   - Define phases, file ownership, tests, query invalidation, queue behavior, UI states, i18n, privacy, and verification.
   - Split later implementation into small, reviewable Linear issues.

2. **Protect the core logging action under poor connectivity.**
   - Use Expo SQLite only for unsent Quick Log queue items.
   - Keep optimistic Today/Timeline rows visible and reversible.
   - Retry on reconnect, foreground, controlled backoff, and manual Retry.

3. **Keep trust boundaries explicit.**
   - Supabase/RLS enforce confirmed event access and idempotency.
   - Typed wrappers own Supabase mutations.
   - Query keys/invalidation are centralized.
   - Analytics/observability use scrubbed, typed wrappers only.

4. **Make user control deterministic.**
   - Undo/Delete before local `server_confirmed` wins over later in-flight server responses.
   - Duplicate warnings are non-blocking and cannot cause data loss.
   - Failed permanent states offer Retry/Delete with calm copy.

---

## Non-Goals

- Do not implement Quick Log UI, queue code, query hooks, Supabase wrappers, analytics wrappers, or migrations in `PUP-5`.
- Do not change schema beyond PRD section 6.10 without ADR-0007 process.
- Do not add dependencies without explicit approval.
- Do not introduce a broad durable outbox, local-first event store, sync conflict resolver, or general offline-write system.
- Do not put notes, photos, free text, provider names, raw puppy names, emails, tokens, or raw backend errors in the local queue, analytics, logs, Linear, PR text, fixtures, or screenshots.
- Do not edit generated `ios/` or `android/` files.
- Do not run release, production, EAS, TestFlight, Play, Supabase production, commit, push, or PR actions without explicit approval for that exact action.

---

## Product Decisions Locked In

1. **Queue storage**
   - **Chosen:** Expo SQLite for Minimal Durable Quick Log Queue.
   - **Reason:** ADR-0004 rejects AsyncStorage, SecureStore, and TanStack persisted mutations for this state machine; SQLite owns durable queued writes.

2. **Server source of truth**
   - **Chosen:** Supabase `event_log` is durable source after confirmation.
   - **Reason:** PRD and architecture are Supabase-first; queue is only a pending-write safety net.

3. **Idempotency**
   - **Chosen:** Generate `client_event_id` before optimistic UI and queue insert; retry uses the same ID.
   - **Reason:** Supabase enforces `UNIQUE (household_id, client_event_id)` so retry cannot duplicate confirmed events.

4. **Duplicate windows**
   - **Chosen:** 3 seconds for accidental double tap, 60 seconds for household duplicate-care warning.
   - **Reason:** CTO verdict and `src/contracts/business-rules.ts` already encode these windows.

5. **Details after save**
   - **Chosen:** optional details do not block initial save.
   - **Reason:** Quick Log must stay <=2 taps for the core event; details can be added via snackbar or Timeline edit.

6. **No raw Supabase in feature UI**
   - **Chosen:** Quick Log screens call feature hooks/data APIs, not `@supabase/supabase-js`.
   - **Reason:** Supabase boundary and query cache behavior must be testable and centralized.

---

## Invariants And Executable Spec

- **Acceptance mapping:** Linear issue -> this plan -> follow-up implementation issues -> automated tests/manual checks -> PR verification evidence.

- **Invariant 1:** Quick Log remains a persistent FAB/action and modal/sheet route, never a primary tab.
  - **Tests:** existing `src/test/navigation-contract.test.ts`, `src/test/tab-layout.render.test.tsx`, plus future `src/test/quick-log.render.test.tsx`.

- **Invariant 2:** The first Quick Log screen shows at most 5 visible trackers.
  - **Tests:** future `src/test/quick-log-contracts.test.ts`, `src/test/quick-log.render.test.tsx`, and i18n/string-budget checks.

- **Invariant 3:** `client_event_id` is created before optimistic insert and queue insert, then reused for all retries.
  - **Tests:** future `src/test/quick-log-mutation.test.ts`, `src/test/quick-log-queue.test.ts`, and existing/future `src/test/supabase-contracts.test.ts`.

- **Invariant 4:** Retry with the same `(household_id, client_event_id)` never creates duplicate server events.
  - **Tests:** future `src/test/quick-log-mutation.test.ts`, `supabase/tests/rls_baseline.sql` or follow-up pgTAP, and remote Supabase gate.

- **Invariant 5:** Undo/Delete before local `server_confirmed` wins over an in-flight success response.
  - **Tests:** future `src/test/quick-log-queue.test.ts` and `src/test/quick-log-mutation.test.ts`.

- **Invariant 6:** Retryable failures keep a visible pending/failed row and never roll back the user's real event as if it never happened.
  - **Tests:** future `src/test/quick-log-mutation.test.ts`, `src/test/today-quick-log.integration.test.tsx`, and `src/test/timeline-quick-log.integration.test.tsx`.

- **Invariant 7:** Permanent failures do not loop forever and expose Retry/Delete.
  - **Tests:** future `src/test/quick-log-queue.test.ts` and render tests for failed state.

- **Invariant 8:** Duplicate warning is non-blocking and cannot cause data loss.
  - **Tests:** future `src/test/quick-log-duplicate-warning.test.ts` and render tests for Add anyway/Cancel.

- **Invariant 9:** Successful retry, idempotent duplicate success, undo cleanup, and permanent failure invalidate `today.dashboard`, `events.timeline`, affected puppy summaries, and duplicate-warning source queries.
  - **Tests:** future `src/test/query-keys.test.ts` and `src/test/quick-log-mutation.test.ts`.

- **Invariant 10:** Local queue stores only minimal event payloads and scrubbed error categories.
  - **Tests:** existing `src/test/supabase-contracts.test.ts`, future `src/test/quick-log-queue-storage.test.ts`, and privacy scan.

- **Invariant 11:** No Quick Log UI string bypasses typed i18n.
  - **Tests:** existing `npm run test:scaffold`, future render tests for Quick Log states, and EN/RU/ES parity/string-budget checks.

- **Invariant 12:** Quick Log tap to visible optimistic row is <=100ms in the tested path.
  - **Tests:** future lightweight performance/unit timing test around the mutation state transition plus manual QA notes until mobile profiling exists.

Important PuppyPlan invariants reused here:

- `Today | Health | More` are the only primary tabs.
- Quick Log accidental double tap window is 3 seconds.
- Duplicate-care warning window is 60 seconds.
- Realtime can improve freshness but cannot be required for correctness.
- UI guards are not permission enforcement; RLS and privileged server functions/helpers are.
- Private puppy/user data must not appear in analytics, logs, screenshots, docs, Linear, or PR text.

---

## File Map

### App Shell
- `app/(modals)/quick-log/index.tsx` - keep route thin; re-export feature-owned Quick Log screen/sheet only.
- `app/(modals)/quick-log/details.tsx` - future route if optional details becomes a separate modal route.
- `app/(tabs)/_layout.tsx` - keep persistent FAB route wiring; hide/show rules may remain route-level only.
- `app/(tabs)/today/index.tsx` - keep route thin; Today implementation remains under `src/features/today`.

### Feature
- `src/features/quick-log/screens/QuickLogShell.tsx` - evolve from placeholder into sheet/screen composition.
- `src/features/quick-log/components/` - future tracker grid, duplicate warning, snackbar bridge, pending/failed state pieces.
- `src/features/quick-log/hooks/` - future feature hooks that compose query/mutation/queue APIs.
- `src/features/today/` - future pending/failed optimistic row and Today invalidation/render integration.
- `src/features/timeline/` - future timeline entry points and failed row Retry/Delete states; directory does not exist yet and should be created only in the scoped implementation issue.

### Design
- `src/design/primitives/TrackerTile.tsx`, `Button.tsx`, `FAB.tsx`, `SheetSurface.tsx`, `StatusPill.tsx`, `ListRow.tsx`, `AppText.tsx` - reuse existing primitives before adding shared UI.
- `src/design/haptics/index.ts` and `src/design/motion/index.ts` - use design-owned haptic/motion wrappers.

### Contracts
- `src/contracts/business-rules.ts` - existing timing constants; add duplicate warning helpers only if they are pure business rules.
- `src/contracts/supabase.ts` - existing event and minimal queue schemas; update only for PRD §6.10-compatible payload needs.
- Future `src/contracts/quick-log.ts` - create if queue/mutation commands need feature-specific schemas outside Supabase row contracts.
- Future `src/contracts/analytics.ts` - create when typed analytics events are implemented.

### Data And Query
- `src/lib/supabase/client.ts` and future `src/lib/supabase/events.ts` - thin typed event insert/delete wrappers; no raw Supabase in feature UI.
- `src/lib/query/keys.ts` - query key factory for Today, Timeline, puppy summaries, duplicate-warning source queries, reminders, sharing.
- `src/lib/query/quick-log.ts` - future mutation hook and invalidation helpers.
- `src/lib/queue/` - Expo SQLite queue schema, local schema version/migration runner, adapter, state machine, retry scheduler, lifecycle/foreground hooks, and queue mirror subscription.
- `src/state/` - only UI/workflow mirrors such as snackbar/FAB visibility/pending queue status; never server rows.

### Backend / Supabase
- Existing `supabase/migrations/*.sql` - already includes baseline `event_log` idempotency and RLS.
- Future migration only if implementation discovers PRD §6.10 drift; otherwise no schema change for Quick Log MVP planning.
- `supabase/tests/rls_baseline.sql` - extend only when server-side Quick Log behavior or idempotent/tombstone cleanup requires new pgTAP coverage.

### Tests
- `src/test/quick-log-contracts.test.ts` - tracker limits, duplicate windows, payload command validation.
- `src/test/quick-log-queue.test.ts` - state machine, retry classification, backoff, manual retry, permanent fail, Undo race.
- `src/test/quick-log-queue-storage.test.ts` - SQLite adapter contract and minimal persisted payload.
- `src/test/query-keys.test.ts` - factory shape and invalidation map.
- `src/test/quick-log-mutation.test.ts` - optimistic lifecycle, queue integration, Supabase wrapper calls, invalidation.
- `src/test/quick-log.render.test.tsx` - sheet states, duplicate warning, pending, failed retry, a11y labels.
- `src/test/today-quick-log.integration.test.tsx` - Today optimistic/pending/failed row behavior.
- `src/test/timeline-quick-log.integration.test.tsx` - Timeline Retry/Delete rows once Timeline exists.
- Existing `src/test/supabase-contracts.test.ts`, `business-rules.test.ts`, `tab-layout.render.test.tsx`, and `app-shell.render.test.tsx` remain regression coverage.

### Docs
- `docs/architecture/03-client-data-layer.md` - update if query key or invalidation contract changes.
- `docs/architecture/10-quick-log-queue.md` - update if queue state machine, storage, or retry contract changes.
- `docs/architecture/screen-states-matrix.md` - update if states are added/changed.
- `docs/architecture/diagrams/03-quick-log-flow.mmd` - update once implementation finalizes flow details.
- ADR required only if changing storage, source-of-truth, schema baseline, or broader offline behavior.

---

## Contracts, Schema, And Permissions

### Zod Contracts

- [ ] Reuse existing `eventLogInsertSchema`, event payload schemas, `quickLogQueueStateSchema`, and `minimalQuickLogQueueItemSchema`.
- [ ] Add feature command schemas only if UI/mutation inputs need more precise validation than the Supabase insert shape.
- [ ] Keep optional notes/photos out of the local queue unless a future ADR explicitly expands the queue.
- [ ] Add tests for tracker limit, payload strictness, state transitions, and error classification.

### Database / RLS

- [ ] Migration required: no for the planning pass; likely no for first Quick Log implementation because `event_log` idempotency exists.
- [ ] Destructive migration risk reviewed: N/A unless implementation discovers schema drift.
- [ ] RLS policy impact reviewed: confirmed event writes/read access rely on existing household membership policies.
- [ ] pgTAP tests required only for new server behavior, idempotent tombstone cleanup, or policy drift.

### Edge Functions

- [ ] Edge Function required: no for baseline direct typed event insert unless implementation chooses privileged cleanup for Undo-after-success.
- [ ] If best-effort server delete/tombstone after Undo needs privilege, create a scoped follow-up plan/issue for that helper, pgTAP coverage, and remote Supabase gate evidence.
- [ ] Input/output schemas must be imported from contracts or tested against contracts.

---

## UX Spec

### Navigation And Entry Points

- Persistent Quick Log FAB from primary tabs.
- Modal/native sheet route at `/quick-log`.
- Optional details path may be route or nested sheet state, but initial save must not wait for details.
- Timeline is opened from Today/More, not a primary tab.

### States

- **Loading:** Quick Log critical entry path should avoid route-level suspension; loading only for tracker preferences or duplicate source data if unavailable.
- **Empty:** first-run/default tracker set uses recommended defaults: potty outside, potty inside, poop, feeding, sleep/nap.
- **Success:** event appears immediately in Today/Timeline with snackbar `Undo` and `Add details`.
- **Duplicate warning:** non-blocking inline/sheet warning for same event type within 60 seconds from any household member; actions Add anyway/Cancel.
- **Accidental double tap:** identical tracker action within 3 seconds should be caught locally and should not create a second queue item without explicit user intent.
- **Pending write:** optimistic row has pending dot/pill and remains visible while queue sends/retries.
- **Failed retryable:** row stays visible with Retry/Delete; retry uses same `client_event_id`.
- **Failed permanent:** row shows calm failed state with Retry/Delete and no infinite retry loop.
- **Offline-read:** Today/Timeline can show cached content and pending local rows honestly.
- **Permission denied:** caregiver/viewer restrictions hide or disable write actions based on role, but RLS remains enforcement.
- **Revoked/expired:** invite/share deep-link access uses the existing route-level `src/features/linking/screens/AccessUnavailableScreen.tsx` neutral unavailable surface. Quick Log queued writes rejected because membership/share context was revoked or expired stay inline with the affected pending/failed event row as `failed_permanent` plus Retry/Delete or Delete, without disclosing the exact access reason.

### Accessibility

- [ ] Touch targets meet iOS 44pt / Android 48dp minimums.
- [ ] Quick Log FAB target is 56pt+.
- [ ] Tracker tiles are individual accessible controls with labels, roles, and selected/disabled/busy states where applicable.
- [ ] Sheet focus starts at title; snackbar/undo announcement uses polite live region semantics where React Native supports it.
- [ ] Pending/failed/duplicate states do not rely on color alone.
- [ ] Swipe actions have non-swipe alternatives.
- [ ] Dynamic Type XXL/XXXL reviewed for Quick Log, Today pending row, Timeline failed row, and Sharing Preview before release gates.

### i18n And String Budgets

- [ ] No raw user-facing strings in UI.
- [ ] EN/RU/ES key parity updated for any new Quick Log states.
- [ ] ICU/plural handling used for count-bearing duplicate matches and retry summaries where needed.
- [ ] String-budget-sensitive labels checked: tracker tiles, CTAs, pills, snackbar actions, duplicate warning actions.
- [ ] Duplicate warning copy continues to refer to the last 60 seconds.

---

## Privacy, Analytics, And Observability

- [ ] Analytics event schema added before logging PRD-backed Quick Log taxonomy such as `event_logged`, `event_save_failed`, `pending_quick_log_created`, `pending_quick_log_deleted`, `duplicate_warning_seen`, `duplicate_warning_confirmed`, `undo_used`, or `offline_or_failed_log_recovered`.
- [ ] Analytics properties are whitelisted stable categories only: event type, retry count bucket, recovery surface, time-since-previous bucket, entitlement state if already available.
- [ ] No raw puppy names, notes, emails, provider names, photos, media URLs, invite/share tokens, push tokens, or raw backend errors in events/logs.
- [ ] Errors go through shared observability wrappers, not direct feature calls. This plan owns only Quick Log-specific telemetry/scrubber coverage; the app-wide observability PII scrubber gate remains open on the foundation roadmap until shared wrappers exist.
- [ ] Store only scrubbed error category in queue `last_error`; never raw server messages.
- [ ] Screenshots/fixtures use synthetic data only.
- [ ] Platform privacy/compliance declarations reviewed if analytics, camera/photo details, or new permissions are added.

---

## Implementation Plan

### Phase 0 - Read And Lock Scope

**Files:**
- Read: `PUP-5`
- Read: `puppyplan-prd-v2.md`
- Read: `DESIGN.md`
- Read: `docs/architecture/03-client-data-layer.md`
- Read: `docs/architecture/04-state-management.md`
- Read: `docs/architecture/10-quick-log-queue.md`
- Read: `docs/architecture/screen-states-matrix.md`
- Read: related ADRs and current Quick Log shell/contracts/tests

**Checklist:**
- [x] Confirm goals and non-goals.
- [x] Confirm ownership area.
- [x] Confirm no Quick Log implementation belongs in `PUP-5`.
- [x] Confirm contracts/schema/RLS/i18n/diagrams likely implementation impact.
- [x] List open questions or mark none.

**Acceptance criteria:**
- Scope is explicit enough to split implementation without guessing.

### Phase 1 - Contracts, Business Rules, And Permissions

**Files:**
- Modify/Create: `src/contracts/quick-log.ts` if feature command schemas are needed.
- Modify: `src/contracts/supabase.ts` only for PRD-compatible event payload refinements.
- Modify: `src/contracts/business-rules.ts` only for pure duplicate helper logic.
- Test: `src/test/quick-log-contracts.test.ts`, `src/test/business-rules.test.ts`, `src/test/supabase-contracts.test.ts`.
- Supabase: `supabase/tests/rls_baseline.sql` only if new server behavior is added.

**Checklist:**
- [ ] RED: tracker limit, duplicate windows, payload strictness, queue state vocabulary, and invalid payload tests fail where behavior is missing.
- [ ] GREEN: add command schemas/helpers with no `any`, `ts-ignore`, or UI-owned validation bypass.
- [ ] Confirm `minimal_quick_log_queue_item` remains local-only and no Supabase table is added.
- [ ] Confirm event payloads remain strict and do not allow free text in the queue.
- [ ] Run targeted tests and record result.

**Acceptance criteria:**
- Contracts reject invalid payloads and accept expected Quick Log commands.
- Permission behavior is enforced outside UI when applicable.

### Phase 2 - Query Keys, Supabase Wrapper, And Queue Core

**Files:**
- Create: `src/lib/query/keys.ts`
- Create: `src/lib/query/quick-log.ts`
- Create: `src/lib/supabase/events.ts`
- Create: `src/lib/queue/schema.ts`, `migrations.ts` or `schema-version.ts`, `state-machine.ts`, `storage.ts`, `retry.ts`, `index.ts`
- Test: `src/test/query-keys.test.ts`, `src/test/quick-log-queue.test.ts`, `src/test/quick-log-queue-storage.test.ts`, `src/test/quick-log-mutation.test.ts`

**Checklist:**
- [ ] RED: query key factory and invalidation tests fail before implementation.
- [ ] RED: queue state machine tests fail for retry/permanent classification, backoff, manual retry, and Undo race.
- [ ] GREEN: implement Expo SQLite queue adapter with transactional state changes.
- [ ] GREEN: define the local SQLite schema version and migration strategy for queue table changes, separate from Supabase migrations and aligned with ADR-0004.
- [ ] GREEN: implement typed Supabase event insert/delete/tombstone wrapper.
- [ ] GREEN: implement Quick Log mutation lifecycle: `onMutate`, `onSuccess`, `onError`, `onSettled`.
- [ ] Ensure retryable failure keeps pending/failed state and permanent failure stops infinite retry.
- [ ] Ensure invalidation uses query key factory and covers Today/Timeline/puppy summaries/duplicate sources.

**Acceptance criteria:**
- Feature code has no raw Supabase client access.
- Queue and cache behavior are deterministic and tested.
- Retry cannot create duplicate queue items or duplicate server events.

### Phase 3 - Quick Log UI And Interaction

**Files:**
- Modify: `src/features/quick-log/screens/QuickLogShell.tsx`
- Create: `src/features/quick-log/components/*`
- Create: `src/features/quick-log/hooks/*`
- Modify: `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json`
- Test: `src/test/quick-log.render.test.tsx`

**Checklist:**
- [ ] RED: render tests fail for default tracker grid, max 5 visible trackers, duplicate warning, pending, failed retry, and a11y labels.
- [ ] Build UI using existing `src/design` primitives.
- [ ] Add tracker grid, duplicate warning, snackbar/undo, pending/failed controls, and optional Add details entry.
- [ ] Add EN/RU/ES i18n keys with budget coverage.
- [ ] Add accessibility labels/roles/states and Dynamic Type-friendly layout.

**Acceptance criteria:**
- Quick Log sheet supports the core <=2 tap save path and required states.
- UI remains inside design/i18n boundaries.

### Phase 4 - Today, Timeline, And Cache Integration

**Files:**
- Modify: `src/features/today/*`
- Create/Modify: `src/features/timeline/*` when Timeline scope is created.
- Test: `src/test/today-quick-log.integration.test.tsx`, `src/test/timeline-quick-log.integration.test.tsx`
- Docs: update `docs/architecture/screen-states-matrix.md` if implementation narrows or expands states.

**Checklist:**
- [ ] RED: Today optimistic/pending/failed row tests fail before integration.
- [ ] Render pending event immediately after Quick Log action.
- [ ] Render failed retryable/permanent controls with Retry/Delete.
- [ ] Remove optimistic row on Undo/Delete before confirmation.
- [ ] Replace pending row with server-confirmed row after success/idempotent success.
- [ ] Confirm Timeline entry points and row states are covered or split into a dedicated follow-up if Timeline scope is too large.

**Acceptance criteria:**
- Today and Timeline do not become stale after Quick Log save, retry, undo, or failure.
- Pending/failed state remains visible and actionable.

### Phase 5 - Analytics, Observability, And Privacy Gates

**Files:**
- Create/Modify: `src/contracts/analytics.ts`
- Create/Modify: `src/lib/analytics/*`
- Create/Modify: `src/lib/observability/*`
- Test: `src/test/analytics-contracts.test.ts`, `src/test/observability-pii.test.ts`
- Scripts: update privacy/static checks if new wrappers or deny-list fixtures are added.

**Checklist:**
- [ ] RED: analytics schema rejects unknown or private properties.
- [ ] RED: observability scrubber rejects raw private values.
- [ ] GREEN: add typed analytics wrapper/events for Quick Log taxonomy.
- [ ] GREEN: normalize backend/queue errors into stable categories.
- [ ] If Undo-after-success cleanup or permission recovery introduces an Edge Function or privileged helper, add pgTAP/remote Supabase coverage before treating the issue as implementation-ready.
- [ ] Ensure no autocapture/session replay is enabled.
- [ ] Review platform privacy impact if camera/photo details are implemented.

**Acceptance criteria:**
- Product telemetry captures useful operational signals without PII.
- Feature errors are observable through scrubbed wrappers.

### Phase 6 - Hardening, Docs, And Issue Split

**Files:**
- Update: this plan
- Update: `docs/plans/README.md`
- Update: relevant architecture docs/diagram if implementation contract changes
- Update: Linear follow-up issues

**Checklist:**
- [x] Update this plan.
- [x] Update `docs/plans/README.md`.
- [x] Confirm no architecture docs or diagrams need contract changes beyond the `PUP-5` handoff.
- [x] Add implementation split issues with Goal, Non-goals, Constraints, Acceptance, Likely files, Verification.
- [x] Run `npm run check`.
- [x] Run targeted documentation/privacy checks from phases touched.
- [x] Confirm remote Supabase checks are not required because this handoff did not touch schema, RLS, migrations, or privileged helpers.
- [x] Record verification evidence in Linear.

**Acceptance criteria:**
- A new implementation agent can start the first coding issue without relying on chat history.

---

## Implementation Issue Split After PUP-5

1. **`PUP-11` - Quick Log contracts and query key factory**
   - Scope: feature command schemas if needed, business helper tests, `queryKeys`, invalidation map.
   - Likely labels: `contracts`, `quick-log`, `agent-ready`.

2. **`PUP-12` - Expo SQLite Quick Log queue core**
   - Scope: queue table/schema, local schema version/migration runner, state machine, retry classification/backoff, Undo race tests.
   - Likely labels: `quick-log`, `privacy`, `contracts`.

3. **`PUP-13` - Typed Quick Log Supabase mutation and optimistic cache lifecycle**
   - Scope: event wrapper, mutation hook, queue integration, Today/Timeline invalidation tests.
   - Likely labels: `quick-log`, `rls`, `contracts`.

4. **`PUP-14` - Quick Log sheet UI and interaction states**
   - Scope: tracker grid, duplicate warning, snackbar/undo, pending/failed controls, EN/RU/ES strings, a11y render tests.
   - Likely labels: `quick-log`, `a11y`, `i18n`.

5. **`PUP-15` - Today and Timeline Quick Log pending/failed state integration**
   - Scope: visible optimistic/pending/failed rows, Retry/Delete, cache replacement after confirmation.
   - Likely labels: `quick-log`, `a11y`, `i18n`.

6. **`PUP-16` - Quick Log privacy-safe analytics and observability**
   - Scope: typed analytics events using the PRD event taxonomy, scrubbed Quick Log observability coverage, and PII tests for any telemetry/error wrappers added by the Quick Log implementation. App-wide observability wrapper coverage stays on the foundation release/privacy gate.
   - Likely labels: `quick-log`, `privacy`, `release-gate`.

---

## Verification Checklist

Run what exists and applies. Record exact commands and results in the Changelog.

### PUP-5 Planning Verification

- [x] `git diff --check`
- [x] `python3 -m json.tool STRINGS.en.json`
- [x] `python3 -m json.tool STRINGS.ru.json`
- [x] `python3 -m json.tool STRINGS.es.json`
- [x] `npm run check`

### PUP-5 Completion Handoff Verification

- [x] `git diff --check`
- [x] `python3 -m json.tool STRINGS.en.json`
- [x] `python3 -m json.tool STRINGS.ru.json`
- [x] `python3 -m json.tool STRINGS.es.json`
- [x] `node scripts/checks/text-hygiene.mjs`
- [x] `node scripts/checks/privacy-scan.mjs`
- [x] `npm run check`

### Future Local Code Gates

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run check`

### Future Supabase / Contract Gates

- [ ] contract/codegen diff checked
- [ ] `npm run supabase:verify:remote` when schema/RLS changes or when a privileged Edge Function/helper affects Quick Log cleanup permissions
- [ ] `npm run supabase:ci:remote` through GitHub remote gate when pgTAP/typegen evidence is required, including Undo-after-success privileged helper coverage

### Future UI / Mobile Gates

- [ ] React Native Testing Library render/integration tests
- [ ] Maestro flow once an installable dev build exists
- [ ] Dynamic Type XXL/XXXL review for Today, Quick Log, Health, Sharing Preview
- [ ] VoiceOver/TalkBack checklist for Quick Log
- [ ] token drift / contrast / string budget checks

### Release / Platform Gates

- [ ] iOS privacy manifest impact reviewed
- [ ] Android permission/data safety impact reviewed
- [ ] No EAS/TestFlight/Play/Supabase production action run without explicit approval for that exact action

---

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Queue grows into a broad offline outbox | Keep queue API Quick Log-only, assert local-only contract, require ADR for broader durable local writes |
| Undo race resurrects a user-deleted event | Make `deleted_before_sync` transactional and add in-flight success cleanup tests |
| Optimistic rows drift from server rows | Centralize query keys/invalidation and replace pending rows with server-confirmed rows on success |
| Duplicate warning blocks real care | Keep warning non-blocking and test Add anyway/Cancel paths |
| PII leaks through queue errors or telemetry | Store scrubbed error categories only, whitelist analytics properties, add Quick Log-specific observability PII tests when telemetry/error wrappers are introduced; keep the app-wide scrubber gate tracked by the foundation roadmap |
| UI becomes inaccessible under large text | Use design primitives, allow wrapping/min heights, and require Dynamic Type review |
| Timeline scope is too large for the first implementation issue | Split Timeline pending/failed state into its own issue after Quick Log sheet/mutation core |

---

## Open Questions

- None blocking for implementation planning.
- Implementation-time decision: whether best-effort Undo-after-success cleanup can use the existing typed data layer/RLS or needs a privileged helper. If privilege is needed, create a scoped follow-up issue with pgTAP coverage and run the remote Supabase gate before coding that path.
- Implementation-time decision: whether optional details are in-route sheet state or a separate `/quick-log/details` route. The initial save must not wait for this decision.

---

## Changelog

- 2026-05-25: Created `PUP-5` planning contract after reading the Linear issue, PRD Quick Log/queue/data sections, DESIGN Quick Log states, architecture data/query/state/queue/RLS/testing/observability docs, related ADRs, existing Quick Log shell, Supabase contracts, business-rule constants, locale files, and advisory project graph output. No Quick Log implementation was added in this pass.
- 2026-05-25: Verification passed: `git diff --check`; `python3 -m json.tool STRINGS.en.json`; `python3 -m json.tool STRINGS.ru.json`; `python3 -m json.tool STRINGS.es.json`; `npm run check` with lint, typecheck, 10 Jest suites / 74 tests, 86 Node tests, navigation/i18n/scaffold checks, token drift, privacy scan, and text hygiene.
- 2026-05-25: Addressed review follow-ups by clarifying route-level unavailable handling versus inline Quick Log permission failures, adding local SQLite schema version/migration ownership for the queue core, threading privileged Undo-after-success helpers into remote Supabase verification, and separating Quick Log-specific observability coverage from the app-wide foundation privacy gate.
- 2026-05-25: Verification after review follow-ups passed: `git diff --check`; `python3 -m json.tool STRINGS.en.json`; `python3 -m json.tool STRINGS.ru.json`; `python3 -m json.tool STRINGS.es.json`; `node scripts/checks/text-hygiene.mjs`; `node scripts/checks/privacy-scan.mjs`; `npm run check` with lint, typecheck, 10 Jest suites / 74 tests, 86 Node tests, navigation/i18n/scaffold checks, token drift, privacy scan, and text hygiene.
- 2026-05-25: Completed the `PUP-5` plan-owned handoff by creating scoped Linear implementation issues `PUP-11` through `PUP-16` for contracts/query keys, SQLite queue core, Supabase mutation/cache lifecycle, Quick Log sheet UI, Today/Timeline integration, and privacy-safe analytics/observability. No Quick Log runtime implementation was added in `PUP-5`.
- 2026-05-25: Completion handoff verification passed: `git diff --check`; `python3 -m json.tool STRINGS.en.json`; `python3 -m json.tool STRINGS.ru.json`; `python3 -m json.tool STRINGS.es.json`; `node scripts/checks/text-hygiene.mjs`; `node scripts/checks/privacy-scan.mjs`; `npm run check` with lint, typecheck, 10 Jest suites / 74 tests, 86 Node tests, navigation/i18n/scaffold checks, token drift, privacy scan, and text hygiene.
