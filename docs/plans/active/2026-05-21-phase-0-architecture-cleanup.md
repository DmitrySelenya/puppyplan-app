# Architecture Foundation Roadmap - Execution Plan

> For implementation agents: do not execute this document as one task. Use repo `AGENTS.md`, relevant Codex/superpowers skills, and the scoped Linear issue that owns the phase you are implementing.
> Living document: update this file as implementation changes contracts, schema, RLS, CI, release checks, or verification evidence.

**Goal:** Turn the architecture review findings into enforceable contracts before the Expo/Supabase scaffold grows enough to drift.

**Status:** Active.

**Plan type:** Foundation roadmap. This is a dependency map, not a single agent-ready Linear task.

**Current execution:** Split into scoped Linear issues. `PUP-2` owns the Expo scaffold prerequisite. `PUP-3` owns Supabase contracts/RLS. `PUP-4` owns CI/local verification gates. Quick Log and release/privacy work should be split into follow-up issues when ready.

**Relationship to `PUP-7`:** `PUP-7` can run design handoff Phases 1-3 before this roadmap is complete. `PUP-7` Phases 4-7 require the Expo scaffold and package scripts from `PUP-2` before implementation.

**Architecture:** This plan does not change product scope. It sharpens the existing Expo + Supabase + RLS + Edge Function architecture around privacy, sharing projections, Quick Log queue correctness, and release gates.

**Linear:** N/A as a direct task. Execute through the scoped issues listed in Current execution.

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - sharing, Quick Log, privacy, testing, release readiness.
- Design: `DESIGN.md` - UI contracts remain unchanged.
- Architecture: `docs/architecture/03-client-data-layer.md`, `07-backend-topology.md`, `08-data-model-and-rls.md`, `09-sharing-and-permissions.md`, `10-quick-log-queue.md`, `13-observability-error-handling-performance.md`, `15-ios-runtime-and-compliance.md`, `17-testing-ci-release.md`.
- ADRs: ADR-0004, ADR-0005, ADR-0006, ADR-0008, ADR-0009, ADR-0015, ADR-0016.

---

## Context

The repo is currently documentation-first. There is no Expo app scaffold, no Supabase migrations, no generated native projects, and no CI scripts yet. That makes this the right time to convert high-risk architecture notes into executable future requirements.

The external review surfaced several useful risks. Some were already documented, but not specific enough to guide migration SQL, tests, or CI. This plan captures the cleanup needed before implementation agents start writing schema, Edge Functions, queue code, and release automation.

This document is not the current `PUP-7` task. Treat it as the roadmap that explains which foundation work must exist before later design runtime phases can proceed.

---

## Goals

1. **Make sharing privacy enforceable.**
   - Define sanitized projection contracts for trainer/share views.
   - Require pgTAP negative tests that prove base table access and private fields are blocked.

2. **Make invite/share creation server-owned.**
   - Route create/accept/revoke through Edge Functions or SECURITY DEFINER helpers.
   - Forbid direct client inserts/updates where tokens, scopes, or membership transitions are involved.

3. **Make Quick Log sync deterministic.**
   - Define retry/permanent error classification.
   - Define Undo vs in-flight server response behavior.
   - Define query invalidation after queue sync.

4. **Make release/privacy checks executable.**
   - Document Expo-safe privacy manifest path.
   - Add future CI gates for AASA/assetlinks, PII scrub tests, and platform preflight.

---

## Non-Goals

- No schema changes are made by this documentation pass.
- No generated `ios/` or `android/` files are created or edited.
- No production service configuration is changed.
- No GitHub repository, commit, push, branch protection, or remote CI setup is created without explicit approval for that exact action.

---

## Product Decisions Locked In

1. **External sharing uses projections, not base table reads.**
   - **Chosen:** trainer/share access goes through sanitized views or RPC responses.
   - **Reason:** notes, provider names, photos, and private health details must not leak through broad RLS on base rows.

2. **Invite/share mutation is privileged.**
   - **Chosen:** Edge Functions own create/accept/revoke transitions.
   - **Reason:** tokens, scopes, revocation, and membership transitions need one audited server boundary.

3. **Privacy manifest is generated through the Expo build path.**
   - **Chosen:** derive `PrivacyInfo.xcprivacy` from dependency audit and include it through app config/config plugin/source asset, not manual edits to generated `ios/`.
   - **Reason:** generated native folders are read-only for agents.

4. **Private GitHub repo should happen before scaffold/CI, not as an incidental side effect.**
   - **Chosen:** create it in a separate approved step after this cleanup.
   - **Reason:** GitHub creation, commits, pushes, and branch protection are remote repository actions and need explicit approval.

---

## Invariants And Executable Spec

- **Invariant 1:** trainer/share can never read unrestricted `event_log` or `health_record` base rows.
  - **Test:** `supabase/tests/sharing_rls.sql`.

- **Invariant 2:** `health_summary` excludes notes, provider names, media URLs, photos, medication details, and private comments unless a future ADR changes the projection.
  - **Test:** `supabase/tests/sharing_projection.sql`.

- **Invariant 3:** anonymous users and normal authenticated clients cannot directly create external shares or invites.
  - **Test:** `supabase/tests/invite_share_mutation_rls.sql`.

- **Invariant 4:** Quick Log Undo before local `server_confirmed` wins over a later in-flight response in the client UI and queue state.
  - **Test:** `src/test/quick-log-queue.test.ts`.

- **Invariant 5:** retryable Quick Log failures keep user-visible pending/failed state; permanent failures do not loop forever.
  - **Test:** `src/test/quick-log-queue.test.ts`.

- **Invariant 6:** no Sentry/analytics event may contain puppy names, notes, raw emails, provider names, media URLs, push tokens, invite tokens, or share tokens.
  - **Test:** `src/test/observability-pii.test.ts`.

---

## File Map

### Architecture Docs
- `docs/architecture/03-client-data-layer.md` - query invalidation contract.
- `docs/architecture/07-backend-topology.md` - privileged mutation boundary.
- `docs/architecture/08-data-model-and-rls.md` - RLS test and policy shape.
- `docs/architecture/09-sharing-and-permissions.md` - projection contract.
- `docs/architecture/10-quick-log-queue.md` - retry/error/race contract.
- `docs/architecture/13-observability-error-handling-performance.md` - PII test gate.
- `docs/architecture/15-ios-runtime-and-compliance.md` - Expo-safe privacy manifest path.
- `docs/architecture/17-testing-ci-release.md` - future CI checks.

### Future Implementation
- `src/contracts/` - Zod schemas for share scopes, queue error categories, analytics events.
- `src/lib/query/keys.ts` - query key factory and invalidation helpers.
- `src/lib/queue/` - Quick Log state machine and retry scheduling.
- `src/lib/observability/` - Sentry wrapper and scrubber tests.
- `supabase/migrations/` - share projections, RLS policies, SECURITY DEFINER helpers.
- `supabase/functions/` - create/accept/revoke invite/share flows.
- `supabase/tests/` - pgTAP/RLS negative tests.
- `.github/workflows/` - lint/type/test/RLS/deep-link/platform gates once scaffold exists.

---

## Implementation Plan

### Phase 0 - Documentation Lock

**Checklist:**
- [x] Add this Phase 0 plan.
- [x] Strengthen sharing projection docs.
- [x] Strengthen invite/share privileged mutation docs.
- [x] Strengthen Quick Log queue sync docs.
- [x] Strengthen privacy/release CI docs.

**Acceptance criteria:**
- A future implementation agent can write migration/tests/CI from docs without guessing the security or queue behavior.

### Phase 1 - Repo And Scaffold Setup

**Execution owner:** `PUP-2` for Expo scaffold. `PUP-4` for branch protection after CI checks exist.

**Checklist:**
- [x] With explicit approval, initialize local git if still absent.
- [x] With explicit approval, create a private GitHub repository.
- [x] With explicit approval, make initial commit and push.
- [ ] Add branch protection and required checks after CI scripts exist.
- [ ] Scaffold Expo app without editing generated native folders directly.

**Acceptance criteria:**
- Private remote exists, baseline docs are versioned, and no secrets are committed.

### Phase 2 - Supabase Contracts And RLS

**Execution owner:** `PUP-3` or a scoped Supabase/RLS follow-up issue.

**Checklist:**
- [ ] Add schema migration for baseline tables.
- [ ] Add share projection views/RPCs.
- [ ] Add Edge Functions or SECURITY DEFINER helpers for invite/share mutations.
- [ ] Add pgTAP negative tests for membership, shares, projections, revoked access, anonymous writes, and token secrecy.

**Acceptance criteria:**
- Tests prove private fields and base rows cannot be read through trainer/share access.

### Phase 3 - Client Queue And Query Enforcement

**Execution owner:** `PUP-5` or a scoped Quick Log implementation issue after the app scaffold exists.

**Checklist:**
- [ ] Add query key factory.
- [ ] Add invalidation helpers for Quick Log, reminders, health, sharing, and membership mutations.
- [ ] Add Quick Log queue state machine tests.
- [ ] Add retry/permanent error classification.
- [ ] Add Undo vs in-flight response regression test.

**Acceptance criteria:**
- Quick Log remains visible, deduped, retryable, and cancellable without stale Today/Timeline state.

### Phase 4 - Release And Privacy Gates

**Execution owner:** `PUP-4` for local/CI gates, plus later release-readiness issues when platform workflows exist.

**Checklist:**
- [ ] Add PII scrubber tests.
- [ ] Add AASA and assetlinks validation script.
- [ ] Add privacy manifest generation/check into Expo build path.
- [ ] Add platform preflight gate before TestFlight/Internal Testing.

**Acceptance criteria:**
- Release candidates cannot proceed with missing privacy manifest, broken deep links, or failing PII scrub tests.

---

## Verification

Until the app scaffold exists, verification is documentation-level:

- `rg -n "share_link_view|Projection SQL|deleted_before_sync|PrivacyInfo|AASA|assetlinks|PII" docs`
- `find docs -maxdepth 3 -name "*.md" -print`

Once scripts exist, prefer:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run check`
- Supabase pgTAP tests
- platform compliance preflight

---

## Changelog

- 2026-05-21: Created Phase 0 cleanup plan from architecture review findings.
- 2026-05-21: Created private GitHub repository `DmitrySelenya/puppyplan-app`, pushed initial architecture baseline, and added repository labels/milestones/settings. Branch protection is deferred until CI checks exist.
- 2026-05-21: Clarified this document as a foundation roadmap executed through scoped Linear issues, not a direct task; recorded the dependency relationship to `PUP-7`.
