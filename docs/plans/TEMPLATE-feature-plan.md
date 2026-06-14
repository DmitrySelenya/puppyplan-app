# [FEATURE_NAME] - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes contracts, schema, RLS, UX, routes, data flow, or verification evidence.
> Suggested practice: when a section is implemented, mark its checklist item and add a short note under Changelog.

**Goal:** [What user/system outcome this feature must deliver.]

**Status:** Active.

**Current phase:** Phase 0 - Read And Lock Scope.

**Architecture:** [How the feature fits PuppyPlan: Supabase source of truth, Edge Function/RLS boundary, client query/cache flow, Quick Log queue if relevant.]

**Linear:** PUP-___ / no-Linear exception: [reason]

**Branch:** Linear `gitBranchName` / N/A

**TDD mode:** heavy/full-isolated / lightweight / N/A. If lightweight is used for high-risk work, record the exact user approval and reduced-assurance reason.

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - [section]
- Design: `DESIGN.md` - [section]
- Architecture: `docs/architecture/[file].md`
- ADR: `docs/architecture/adr/[file].md` or `N/A`

---

## Context

[Describe the current state.]

- **Context package:** [Exact Linear issue, source docs, ADRs, plans, screenshots, logs, graph/context output, and tool observations an implementation agent must load.]
- **Context placement:** Linear issue stays short, this plan holds long-form implementation context, and the PR holds final verification evidence.
- What already exists?
- Which architecture decisions constrain this work?
- Which ownership area owns the change?
- What problem does the current implementation/spec leave unsolved?

---

## Goals

1. **[Goal 1]**
   - [Concrete detail]
2. **[Goal 2]**
   - [Concrete detail]
3. **[Goal 3]**
   - [Concrete detail]

---

## Non-Goals

- [Out-of-scope behavior]
- [Deferred feature]
- [Architecture or product path explicitly not taken]

---

## Product Decisions Locked In

These decisions are fixed for this implementation pass:

1. **[Decision]**
   - **Chosen:** [Specific answer]
   - **Reason:** [Short rationale]

2. **[Decision]**
   - **Chosen:** [Specific answer]
   - **Reason:** [Short rationale]

---

## Invariants And Executable Spec

Each invariant must map to at least one automated test. Use property-based tests only when the state space justifies it and the dependency is approved.

- **Acceptance mapping:** Linear issue -> this plan -> automated test/manual check -> PR verification evidence.
- **Spec-defect halt rule:** if criteria are contradictory, privacy-unsafe, schema-unsafe, design-ambiguous, or impossible to verify, stop before RED and repair the spec.
- **Shallow-green caveat:** green tests are evidence, not proof. Add negative, property-style, mutation-style, or broader scenario checks when hardcoded or lookup-table implementations could pass examples.
- **Invariant 1:** [Always/never rule.]
  - **Test:** `src/test/[feature].test.ts` or `supabase/tests/[feature].sql`
- **Invariant 2:** [Always/never rule.]
  - **Test:** `src/test/[feature].test.ts`
- **Invariant 3:** [Always/never rule.]
  - **Test:** `[path]`

Important PuppyPlan invariants to reuse when relevant:

- Quick Log accidental double tap window is 3 seconds.
- Duplicate-care warning window is 60 seconds.
- Realtime can improve freshness but cannot be required for correctness.
- UI guards are not permission enforcement; RLS and Edge Functions are.
- Private puppy/user data must not appear in analytics, logs, screenshots, docs, or PR text.

---

## File Map

### App Shell
- `app/[route].tsx` - [route/layout-only changes, if any]

### Feature
- `src/features/[feature]/...` - [screen/components/hooks owned by this feature]

### Design
- `src/design/[area]/...` - [only if shared primitive/token behavior changes]

### Contracts
- `src/contracts/[contract].ts` - [Zod schemas, payloads, business rules]

### Data And Query
- `src/lib/supabase/[module].ts` - [Supabase wrapper]
- `src/lib/query/[module].ts` - [query keys/hooks/cache invalidation]
- `src/lib/queue/[module].ts` - [Quick Log queue, if relevant]

### Backend / Supabase
- `supabase/migrations/[timestamp]_[name].sql` - [schema changes]
- `supabase/functions/[function]/...` - [privileged operation]
- `supabase/tests/[test].sql` - [RLS/pgTAP coverage]

### Tests
- `src/test/[feature].test.ts` - [unit/contract]
- `src/test/[feature].render.test.tsx` - [render/integration]
- `supabase/tests/[feature].sql` - [RLS]

### Docs
- `docs/architecture/[file].md` - [if contract/architecture changes]
- `docs/architecture/diagrams/[diagram].mmd` - [if flow/data contract changes]
- `docs/architecture/adr/[file].md` - [if decision changes architecture]

---

## Contracts, Schema, And Permissions

### Zod Contracts

- [ ] Add or update request/response/domain schemas in `src/contracts/`.
- [ ] Add contract tests for valid, invalid, and boundary payloads.
- [ ] Update generated or re-exported DB types if applicable.

### Database / RLS

- [ ] Migration required: yes / no.
- [ ] Destructive migration risk reviewed: yes / no / N/A.
- [ ] RLS policy impact reviewed.
- [ ] pgTAP tests added or updated.

### Edge Functions

- [ ] Edge Function required: yes / no.
- [ ] Privileged operation is not exposed through UI-only guards.
- [ ] Input/output schemas are imported from contracts or tested against contracts.

---

## UX Spec

### Navigation And Entry Points

- [Route / tab / FAB / modal / deep link]

### States

- **Loading:** [What the user sees]
- **Empty:** [What the user sees]
- **Success:** [What the user sees]
- **Error:** [Recoverable message and action]
- **Offline / pending write:** [If relevant]
- **Permission denied / revoked / expired:** [If relevant]

### Accessibility

- [ ] Touch targets meet iOS 44pt / Android 48dp minimums.
- [ ] Quick Log / FAB target is 56pt+.
- [ ] Interactive elements have labels, roles, and state/hint when needed.
- [ ] Status does not rely on color alone.
- [ ] Swipe actions have non-swipe alternatives.
- [ ] Dynamic Type XXL/XXXL reviewed for affected core screens.

### i18n And String Budgets

- [ ] No raw user-facing strings in UI.
- [ ] EN/RU/ES key parity updated.
- [ ] ICU plurals used where needed, including locale forms such as Russian `one`/`few`/`many`/`other` and Spanish `one`/`other`.
- [ ] String-budget-sensitive labels checked: tabs, CTAs, pills, tracker tiles, notification actions.

---

## Privacy, Analytics, And Observability

- [ ] Analytics event schema added/updated in `src/contracts/` if needed.
- [ ] No raw puppy names, notes, emails, provider names, photos, or tokens in events/logs.
- [ ] Errors go through shared observability wrappers, not direct feature calls.
- [ ] Screenshots or fixtures use synthetic data only.
- [ ] Platform privacy/compliance declarations reviewed if data collection or permissions changed.

---

## Implementation Plan

### Phase 0 - Read And Lock Scope

**Files:**
- Read: `puppyplan-prd-v2.md`
- Read: `DESIGN.md`
- Read: `docs/architecture/[file].md`
- Read: related ADRs

**Checklist:**
- [ ] Confirm goals and non-goals.
- [ ] Confirm ownership area.
- [ ] Confirm whether contracts/schema/RLS/i18n/diagrams change.
- [ ] List open questions or mark none.

**Acceptance criteria:**
- Scope is explicit enough to implement without guessing.

---

### Phase 1 - Contracts, Business Rules, And Permissions

**Files:**
- Modify/Create: `src/contracts/[file].ts`
- Modify/Create: `src/test/[feature].test.ts`
- Modify/Create: `supabase/tests/[feature].sql` if RLS changes

**Checklist:**
- [ ] Confirm TDD mode: heavy/full-isolated for high-risk behavior; lightweight only for small low-risk edits unless the user explicitly approves a lower-assurance lightweight run for exact high-risk work.
- [ ] Lock AC/EC/ERR criteria before RED or document spec-defect halt.
- [ ] Write failing contract/business-rule tests.
- [ ] Add/update Zod schemas and business constants.
- [ ] Add/update RLS tests if permissions change.
- [ ] Run targeted tests and record result.

**Acceptance criteria:**
- Contracts reject invalid payloads and accept expected payloads.
- Permission behavior is enforced outside UI.

---

### Phase 2 - Data Access, Query, And Queue

**Files:**
- Modify/Create: `src/lib/supabase/[file].ts`
- Modify/Create: `src/lib/query/[file].ts`
- Modify/Create: `src/lib/queue/[file].ts` if relevant
- Test: `src/test/[feature].test.ts`

**Checklist:**
- [ ] Implement thin Supabase/Edge Function wrapper.
- [ ] Add query key and invalidation behavior.
- [ ] Add Quick Log queue integration if relevant.
- [ ] Cover offline/pending/error paths when relevant.

**Acceptance criteria:**
- Feature code has no raw Supabase client access.
- Query/cache behavior is deterministic and tested.

---

### Phase 3 - UI And Interaction

**Files:**
- Modify/Create: `src/features/[feature]/...`
- Modify: `app/[route].tsx` only for route/layout wiring
- Test: `src/test/[feature].render.test.tsx`

**Checklist:**
- [ ] Build UI using `src/design` primitives.
- [ ] Add loading/empty/error/offline/permission states.
- [ ] Add i18n keys and string budget updates.
- [ ] Add render/integration tests for critical flows.
- [ ] Map each changed screen/state to `docs/design/v1/manifest.json` artboards and reference screenshots.
- [ ] Capture native screenshots for affected screen states and compare them side-by-side with the atlas.

**Acceptance criteria:**
- UI matches design contracts and approved atlas screenshots; any deviation is explicitly recorded and approved before the batch can close.
- Critical user path works with realistic mocked data.

---

### Phase 4 - Integration And Side Effects

Use only if this feature touches notifications, sharing, analytics, observability, feature flags, or platform permissions.

**Files:**
- Modify/Create: `src/lib/notifications/[file].ts`
- Modify/Create: `src/lib/analytics/[file].ts`
- Modify/Create: `src/lib/observability/[file].ts`
- Modify/Create: `supabase/functions/[function]/...`

**Checklist:**
- [ ] Side effects go through shared wrappers.
- [ ] Analytics/log payloads are scrubbed.
- [ ] Permission-denied paths are user-visible and tested.
- [ ] Feature flags are owned by PostHog unless backend-critical config requires Supabase `app_config`.

**Acceptance criteria:**
- Side effects are typed, permission-aware, and privacy-safe.

---

### Phase 5 - Hardening And Release Readiness

**Checklist:**
- [ ] Update architecture docs, diagrams, ADRs, and screen-states matrix if applicable.
- [ ] Run relevant local verification.
- [ ] Capture manual QA notes/screenshots only with synthetic data.
- [ ] Record Design Fidelity Gate result: affected artboards, simulator/device, screenshot paths, pass/fail, and unresolved deviations.
- [ ] Review platform privacy/compliance impact.
- [ ] Update Changelog.

**Acceptance criteria:**
- The feature can be reviewed without reconstructing decisions from chat history.

---

## Verification Checklist

Run what exists and applies. Record exact commands and results in the Changelog.

### Local Code Gates

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run check`

### Supabase / Contract Gates

- [ ] contract/codegen diff checked
- [ ] migration diff/destructive check
- [ ] RLS pgTAP tests
- [ ] Edge Function contract tests

### UI / Mobile Gates

- [ ] React Native Testing Library render/integration tests
- [ ] Maestro flow, if an installable build exists
- [ ] Dynamic Type XXL/XXXL review for affected screens
- [ ] Design atlas side-by-side screenshot review for every changed UI state
- [ ] VoiceOver/TalkBack checklist if core flow changed
- [ ] token drift / contrast / string budget checks

### Release / Platform Gates

- [ ] iOS privacy manifest impact reviewed
- [ ] Android permission/data safety impact reviewed
- [ ] No EAS/TestFlight/Play/Supabase production action run without explicit approval for that exact action

---

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| [Risk 1] | [Mitigation] |
| [Risk 2] | [Mitigation] |
| [Risk 3] | [Mitigation] |

---

## Changelog

- [YYYY-MM-DD]: Initial plan created.
