# PUP-16 Quick Log Privacy-Safe Analytics And Observability - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes contracts, privacy gates, data flow, or verification evidence.

**Goal:** Add Quick Log-specific typed analytics and scrubbed observability coverage so product reliability signals are measurable without leaking private user, puppy, invite/share, media, note, provider, token, or raw backend-error data.

**Status:** Completed; merged via PR #16 and Linear `PUP-16` is Done.

**Current phase:** Completed.

**Architecture:** Analytics events are contracts in `src/contracts` and are emitted only through `src/lib/analytics`. Observability is reported only through `src/lib/observability` with scrubbed categories and no direct SDK calls from features. Quick Log queue persistence remains local-only and stores only stable error categories in `last_error_category`.

**Linear:** `PUP-16` - Quick Log privacy-safe analytics and observability.

**Branch:** Linear `gitBranchName`: `dimaselenya/pup-16-quick-log-privacy-safe-analytics-and-observability`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - analytics taxonomy, privacy, Quick Log reliability, Minimal Durable Quick Log Queue.
- Design: `DESIGN.md` - data-handling QA and performance QA.
- Architecture: `docs/architecture/10-quick-log-queue.md`, `docs/architecture/13-observability-error-handling-performance.md`, `docs/architecture/17-testing-ci-release.md`.
- ADR: `docs/architecture/adr/0008-privacy-safe-analytics.md`.
- Parent plan: `docs/plans/completed/2026-05-25-quick-log-mvp.md`.

---

## Context

`PUP-11` through `PUP-15` implemented the Quick Log contracts, SQLite queue, mutation/cache lifecycle, sheet UI, and Today/Timeline pending/failed visibility. The analytics and observability folders currently exist as scaffold README files only. `PUP-16` must add typed, testable wrappers and wire Quick Log lifecycle signals without adding a provider SDK or solving the app-wide observability foundation beyond this issue.

- **Context package:** `AGENTS.md`, Linear `PUP-16`, this plan, PRD/DESIGN sections above, architecture docs above, ADR-0008, completed PUP-5 plan Phase 5, current Quick Log query/controller/queue files, current privacy/text hygiene checks, and advisory project graph output.
- **Context placement:** Linear keeps operational status and verification evidence; this plan holds durable implementation scope and decisions; final PR text will hold review-ready evidence.
- **Graph note:** Graph context points at `src/lib/query/quick-log.ts`, `src/lib/queue/storage.ts`, queue state-machine/schema helpers, and current Quick Log tests. It is advisory only; source and tests are authoritative.

---

## Goals

1. **Typed Quick Log analytics.**
   - Add a Zod-backed whitelist for emitted Quick Log event names and properties.
   - Reject unknown properties and private-looking fields.
2. **Scrubbed observability.**
   - Provide a shared observability wrapper that accepts stable categories and strips denied values from messages, tags, contexts, breadcrumbs, and extras.
3. **Queue-safe error normalization.**
   - Normalize backend/queue failures before analytics, observability, or local queue persistence.
   - Persist only `last_error_category`, never raw backend messages.

---

## Non-Goals

- Do not add PostHog, Sentry, or any new dependency.
- Do not enable autocapture or session replay.
- Do not add camera/photo details, new permissions, schema/RLS migrations, Edge Functions, or production service configuration.
- Do not emit household ID, puppy ID, user ID, raw client event ID, raw notes, puppy names, emails, provider names, media URLs, invite/share tokens, push tokens, or raw backend errors.

---

## Product Decisions Locked In

1. **Provider integration**
   - **Chosen:** Use no-op/testable ports only in PUP-16.
   - **Reason:** Linear forbids new external analytics/observability service integration without explicit approval.

2. **Platform privacy impact**
   - **Chosen:** Document no new SDK, no new permissions, no photo/camera, and no `PrivacyInfo.xcprivacy` or Android Data Safety change required.
   - **Reason:** PUP-16 adds typed internal wrappers only.

3. **Privacy scan deny-list**
   - **Chosen:** Keep `scripts/checks/privacy-scan.mjs` unchanged unless new tests expose a static-check gap.
   - **Reason:** Contract and observability tests should reject private telemetry payloads directly; static deny-list expansion is only needed for uncovered fixture/key patterns.

---

## Invariants And Executable Spec

- **Invariant 1:** Analytics accepts only the PUP-16 Quick Log event taxonomy and whitelisted stable categories.
  - **Test:** `src/test/analytics-contracts.test.ts`
- **Invariant 2:** Analytics rejects unknown properties and private-looking values/fields.
  - **Test:** `src/test/analytics-contracts.test.ts`
- **Invariant 3:** Observability never forwards raw private values or raw backend errors.
  - **Test:** `src/test/observability-pii.test.ts`
- **Invariant 4:** Queue failure persistence receives normalized stable categories only.
  - **Test:** `src/test/quick-log-queue-storage.test.ts`, `src/test/quick-log-mutation.test.ts`
- **Invariant 5:** Feature and query code use shared analytics/observability ports only.
  - **Test:** targeted Quick Log mutation/controller tests plus scaffold guardrails/privacy scan.

---

## File Map

### Contracts
- `src/contracts/analytics.ts` - analytics event names, property schemas, private payload rejection.

### Analytics And Observability
- `src/lib/analytics/README.md` and new wrapper module(s) - no-op/testable event sink and Quick Log helpers.
- `src/lib/observability/README.md` and new wrapper module(s) - scrubber and report helper.

### Quick Log Query, Queue, And Feature
- `src/lib/query/quick-log.ts` - mutation lifecycle telemetry and normalized queue failure persistence.
- `src/lib/queue/*` - only if queue-local normalizer or public helper is needed.
- `src/features/quick-log/useQuickLogSheetController.ts` and `src/features/quick-log/QuickLogFeedbackProvider.tsx` - duplicate warning, confirm, undo, retry/delete telemetry through injected ports.

### Tests And Checks
- `src/test/analytics-contracts.test.ts`
- `src/test/observability-pii.test.ts`
- `src/test/quick-log-mutation.test.ts`
- `src/test/quick-log-controller.test.tsx`
- `src/test/quick-log-queue-storage.test.ts`
- `scripts/checks/privacy-scan.mjs` only if RED tests show static deny-list coverage must expand.

---

## Implementation Plan

### Phase 0 - Read, Branch, And Plan Hygiene

**Checklist:**
- [x] Fast-forward local `main` to `origin/main`.
- [x] Create branch `dimaselenya/pup-16-quick-log-privacy-safe-analytics-and-observability` from `origin/main`.
- [x] Move Linear `PUP-16` to In Progress and record the start comment.
- [x] Move the merged `PUP-15` plan to completed and update `docs/plans/README.md`.
- [x] Create this active `PUP-16` implementation plan.

**Acceptance criteria:** Work is on the Linear branch, stale `PUP-15` plan state is closed, and `PUP-16` has a durable repo plan.

### Phase 1 - RED Tests

**Checklist:**
- [x] Add failing analytics contract tests for allowed taxonomy, unknown property rejection, and private payload rejection.
- [x] Add failing observability scrubber tests for denied private values and raw backend error leakage.
- [x] Add failing queue/mutation test proving raw backend errors normalize before failed queue state persistence.
- [x] Add failing controller/feedback tests for duplicate warning, confirm, undo, retry/delete telemetry through a port.

**Acceptance criteria:** Targeted tests fail for missing PUP-16 behavior before production code changes.

### Phase 2 - Contracts And Wrappers

**Checklist:**
- [x] Implement `src/contracts/analytics.ts` with strict event/property schemas.
- [x] Implement `src/lib/analytics` no-op/test adapter and typed Quick Log tracking helper.
- [x] Implement `src/lib/observability` scrubber and report helper.
- [x] Update READMEs to document no direct SDK calls, no autocapture/session replay, and no private payloads.

**Acceptance criteria:** Analytics/observability contract tests pass and no provider SDK is introduced.

### Phase 3 - Quick Log Wiring And Queue Normalization

**Checklist:**
- [x] Wire `src/lib/query/quick-log.ts` mutation lifecycle telemetry through injected analytics/observability ports.
- [x] Normalize errors before calling queue failure persistence methods.
- [x] Wire Quick Log controller/feedback action telemetry through injected analytics ports.
- [x] Keep telemetry optional/no-op by default so production context remains unavailable-safe.

**Acceptance criteria:** Quick Log tests pass, queue persists only stable categories, and no raw identifiers/private content enters telemetry.

### Phase 4 - Verification And Handoff

**Checklist:**
- [x] Run targeted Jest suites.
- [x] Run `node scripts/checks/privacy-scan.mjs`.
- [x] Run `node scripts/checks/text-hygiene.mjs`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run check`.
- [x] Run `git diff --check`.
- [x] Record verification evidence in this plan and Linear `PUP-16`.
- [x] Move Linear `PUP-16` to In Review only after verification evidence is recorded.

**Acceptance criteria:** PUP-16 is locally implemented, verified, and ready for review handoff. Git commit/push/PR waits for explicit approval.

---

## Verification Log

- 2026-05-28: Started implementation on the Linear branch after fast-forwarding `main`; moved `PUP-16` to In Progress; created active plan; moved merged `PUP-15` plan to completed.
- 2026-05-28 RED: `npx jest --runInBand src/test/analytics-contracts.test.ts src/test/observability-pii.test.ts src/test/quick-log-queue.test.ts src/test/quick-log-mutation.test.ts src/test/quick-log-controller.test.tsx` failed on missing analytics/observability modules, missing queue failure normalizer, and missing Quick Log telemetry calls.
- 2026-05-28 GREEN targeted: `npx jest --runInBand src/test/analytics-contracts.test.ts src/test/observability-pii.test.ts src/test/quick-log-queue.test.ts src/test/quick-log-mutation.test.ts src/test/quick-log-controller.test.tsx` passed 5 suites / 45 tests.
- 2026-05-28 typecheck: `npm run typecheck` passed.
- 2026-05-28 privacy/text gates: `node scripts/checks/privacy-scan.mjs` passed with `privacy scan ok`; `node scripts/checks/text-hygiene.mjs` passed with `text hygiene ok`.
- 2026-05-28 full gate: `npm run check` passed lint, typecheck, 26 Jest suites / 196 tests, 97 Node tests, scaffold, design token, privacy, and text hygiene checks.
- 2026-05-28 whitespace gate: `git diff --check` passed.
- 2026-05-28 deep-review RED: `npx jest --runInBand src/test/analytics-contracts.test.ts src/test/observability-pii.test.ts src/test/quick-log-controller.test.tsx src/test/quick-log-local-events.render.test.tsx src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx` failed on `health_record_reference` analytics acceptance, incomplete observability deny-list coverage, missing snackbar Undo/delete telemetry, and old delete action payloads; `node --test scripts/checks/privacy-scan.test.mjs` failed on missing direct-Sentry/PostHog autocapture/session-replay guardrails.
- 2026-05-28 deep-review GREEN targeted: `npx jest --runInBand src/test/analytics-contracts.test.ts src/test/observability-pii.test.ts src/test/quick-log-controller.test.tsx src/test/quick-log-local-events.render.test.tsx src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx src/test/quick-log-mutation.test.ts` passed 7 suites / 50 tests; `node --test scripts/checks/privacy-scan.test.mjs` passed 12 tests.
- 2026-05-28 deep-review full gate: `npm run check` passed lint, typecheck, 26 Jest suites / 201 tests, 99 Node tests, scaffold, design token, privacy, and text hygiene checks.
- 2026-05-28 deep-review follow-up checks: `npm run lint`, `npm run typecheck`, `node scripts/checks/privacy-scan.mjs`, `node scripts/checks/text-hygiene.mjs`, and `git diff --check` passed after the final import/doc cleanup.
- 2026-05-28 review-remediation RED: `npx jest --runInBand src/test/quick-log-mutation.test.ts src/test/quick-log-controller.test.tsx src/test/quick-log-sheet.render.test.tsx src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx src/test/observability-pii.test.ts` failed on hardcoded recovery surface, missing manual retry surface propagation, and observability identity-key leakage; `node --test scripts/checks/privacy-scan.test.mjs` failed on incomplete Sentry/PostHog SDK guard coverage and wrapper allowlist.
- 2026-05-28 review-remediation targeted GREEN: `npx jest --runInBand src/test/analytics-contracts.test.ts src/test/quick-log-contracts.test.ts src/test/quick-log-event-view.test.ts src/test/quick-log-mutation.test.ts src/test/quick-log-controller.test.tsx src/test/quick-log-sheet.render.test.tsx src/test/today-quick-log.render.test.tsx src/test/timeline-quick-log.render.test.tsx src/test/observability-pii.test.ts` passed 9 suites / 75 tests; `node --test scripts/checks/privacy-scan.test.mjs` passed 14 tests; `npm run typecheck` passed.
- 2026-05-28 review-remediation full gate: `node scripts/checks/privacy-scan.mjs` passed with `privacy scan ok`; `git diff --check` passed; `npm run check` passed lint, typecheck, 26 Jest suites / 204 tests, 101 Node tests, scaffold, design token, privacy, and text hygiene checks.

---

## Changelog

- 2026-05-28: Created active implementation plan from reviewed PUP-16 scope and closed stale PUP-15 plan index state.
- 2026-05-28: Added strict Quick Log analytics contracts, no-op/testable analytics and observability wrappers, queue failure normalization before persistence, and Quick Log mutation/controller telemetry wiring.
- 2026-05-28: Verified PUP-16 locally; no new SDK, dependencies, permissions, camera/photo scope, schema/RLS, Edge Function, PrivacyInfo, or Android Data Safety changes were introduced.
- 2026-05-28: Implemented deep-review follow-ups: Quick Log-only analytics event types, stronger observability and static telemetry SDK privacy guardrails, snackbar Undo/delete analytics, local-row delete metadata payloads, and success/recovery telemetry coverage.
- 2026-05-28: Implemented review-remediation follow-ups: recovery telemetry now uses caller-provided retry surface, direct Sentry/PostHog SDK static guard coverage was broadened with wrapper allowlists, observability now drops canonical identity keys, retry actions pass `manual_retry`, and low-risk style/defensive Quick Log cleanup was applied.
