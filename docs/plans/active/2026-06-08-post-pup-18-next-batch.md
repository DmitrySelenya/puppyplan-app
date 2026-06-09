# Post-PUP-18 Next Batch - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant PuppyPlan skills, and this plan task-by-task. Do not implement from the master roadmap alone.
> Living document: update this file as Linear issues, route coverage, contracts, schema decisions, UX states, or verification evidence change.

**Goal:** Plan and split the next small batch after `PUP-18` so the app can move from auth/session foundation into care context without losing Milestone A route/design coverage.

**Status:** Active.

**Current phase:** Phase 5 - `PUP-21` local verification and handoff. The selected-tracker schema blocker is removed for non-production: the approved migration is applied to `PuppyPlan Dev`, runtime pgTAP passed, and remote typegen updated `src/contracts/database.types.ts`. Production migration/release remains unapproved and was not performed.

**Architecture:** The batch is split into two lanes. `PUP-19`/`PUP-20` are synthetic, development-only Milestone A enablers for route coverage, atlas mapping, and native design gallery. `PUP-21` is the production care-context lane: onboarding, puppy profile, selected quick trackers, and active care context consumed by Quick Log/Today. Production work must use the `PUP-18` Supabase Auth session actor, existing Supabase/RLS boundaries, TanStack Query server state, `src/design` primitives, typed EN/RU/ES i18n, and Zod contracts.

**Linear:** `PUP-19`, `PUP-20`, and `PUP-21` created on 2026-06-08 under team `PUP` / project `PuppyPlan MVP`. `PUP-19` owns route coverage/settings namespace/storage recommendation and is in review. `PUP-20` owns the synthetic dev-gallery lane and is in review after local verification. `PUP-21` owns production care context; selected tracker persistence received explicit `quick_tracker_ids` approval in this thread, local implementation is complete, and non-production schema/RLS/typegen evidence is recorded.

**Branch:** Current implementation branch: `dimaselenya/pup-21-onboarding-puppy-profile-tracker-settings-and-active-care`. Completed local branches/commits: `dimaselenya/pup-19-route-coverage-map-settings-namespace-and-selected-tracker` (`ba5bbc1`) and `dimaselenya/pup-20-development-only-native-design-gallery-and-synthetic-route` (`c6632bd`).

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - sections 3, 4, 6, 9, 10, 11, and 12.
- Design: `DESIGN.md` - sections 1, 2.1, 3 route map, 4.4.2, 4.4.3, and acceptance screenshot set.
- Architecture: `docs/architecture/00-overview.md`, `03-client-data-layer.md`, `04-state-management.md`, `05-navigation-and-deeplinks.md`, `06-design-system-and-ui-contracts.md`, `08-data-model-and-rls.md`, `12-i18n-and-content.md`, `17-testing-ci-release.md`, `18-ai-agent-guide.md`.
- ADR: `docs/architecture/adr/0007-prd-schema-baseline.md`, `docs/architecture/adr/0010-react-i18next-typed-keys.md`, `docs/architecture/adr/0011-design-system-runtime.md`, `docs/architecture/adr/0017-auth-identity-session.md`.
- Active roadmaps: `docs/plans/active/2026-05-29-full-prd-native-app-master-roadmap.md`, `docs/plans/active/2026-05-21-design-handoff-agent-gallery.md`, `docs/plans/active/2026-05-21-phase-0-architecture-cleanup.md`.

---

## Context

`PUP-18` is complete. The app now has email OTP sign-in, SecureStore-backed Supabase session persistence, route gating, sign-out, and `bootstrap_current_user`, which creates a household and owner membership for the authenticated user. The next critical gap is no longer identity; it is care context. Quick Log and Today currently have a tested unavailable state when no active household/puppy context is available, and Quick Log production mutation explicitly requires an authenticated session actor.

The master roadmap points to `PUP-21` as the main product slice because onboarding, puppy profile, and tracker setup create the missing care context. It also keeps `PUP-19`/`PUP-20` available before or in parallel, because route coverage and a native development gallery make Milestone A reviewable without pretending synthetic data is production data.

The main implementation risk is selected quick tracker persistence. The PRD requires selected quick trackers, and existing Quick Log contracts already cap and validate selected tracker ids. The current Supabase baseline has `public.puppy` with `name`, `birth_date`, and `age_weeks_estimate`, but it does not visibly persist selected tracker order. Any schema change beyond the accepted ADR-0007 baseline requires the ADR-0007 process and CTO approval before implementation.

- **Context package:** this plan, the three active roadmaps above, `PUP-18` completed plan, PRD onboarding/Quick Log/data/analytics sections, Design onboarding/profile/quick tracker sections, ADR-0017, current app routes, current Quick Log/Today files, current Supabase migrations and pgTAP tests, and graph-context findings for onboarding/profile/tracker/auth files.
- **Context placement:** Linear issues stay concise and operational; this plan holds the implementation contract and decisions; PRs hold final verification evidence.
- **Ownership areas:** route shell/dev gallery under `app/` and `src/features/_dev`; production care context under `src/contracts`, `src/lib/query`, `src/lib/supabase`, `src/features/onboarding`, `src/features/profile`, and `src/features/settings`.

---

## Role Consensus

1. **Product director**
   - `PUP-21` is the highest user-value slice because no later Today/Quick Log loop feels real without a puppy profile and selected trackers.
   - Keep the first production path short: profile in under 45 seconds, age hint, up to 5 trackers, plan reveal, first-log entry.
   - Do not pull Health, reminders, sharing, paywall, or full Today guidance into this batch.

2. **Backend lead**
   - Use the existing `household`, `household_membership`, and `puppy` baseline; do not create direct client writes for household or membership.
   - Owner can insert/update `puppy` under current RLS, but selected tracker persistence needs an explicit storage decision.
   - Recommended storage if approval is granted: add ordered `quick_tracker_ids` to `public.puppy` with max 5, allowed ids, uniqueness, and RLS tests, instead of adding a new table with a larger RLS surface.

3. **Frontend lead**
   - `PUP-19`/`PUP-20` can parallelize with `PUP-21` only if they stay synthetic and development-only.
   - Onboarding/profile/settings screens must use `src/design` primitives, typed i18n, and render tests for default/error/limit states.
   - Quick Log should consume active selected trackers from care context instead of hard-coded defaults once `PUP-21` lands.

4. **Chief architect**
   - Separate Milestone A reviewability from Milestone B production behavior.
   - Use one production settings namespace: More is the entry point, while editable settings routes live under `/settings/*`; atlas labels such as `/more/puppy-profile` map to the chosen native route in the coverage table.
   - Create Linear issues before implementation. Do not let this planning branch become the implementation branch for all three tasks.

---

## Recommended Next Batch

| Track | Purpose | Include now | Why |
| --- | --- | --- | --- |
| `PUP-19` | Route coverage map, settings namespace decision, care-context storage decision, and implementation contracts | Yes, first | Makes the split agent-ready and resolves selected tracker persistence before production UI guesses. |
| `PUP-20` | Development-only native design gallery and missing synthetic route shells | Yes, parallel after `PUP-19` route map | Gives Milestone A clickable skeleton and design review without backend coupling. |
| `PUP-21` | Onboarding, puppy profile, quick tracker setup, active care context | Yes, production lane after storage decision | Unlocks the real Quick Log/Today loop and the later `PUP-22`/`PUP-23` work. |
| `PUP-22` | Today core and guidance | No | Depends on real care context and should not start before `PUP-21` exits. |
| `PUP-23` | Quick Log details and Timeline completion | No | Depends on selected tracker/care context and should follow the core setup slice. |

The small batch is therefore `PUP-19` + `PUP-20` + the first production phases of `PUP-21`. If the selected tracker storage decision cannot be approved quickly, `PUP-20` can continue, but `PUP-21` must stop after contracts/local draft UI and must not claim durable selected tracker behavior.

---

## Goals

1. **Create the missing implementation contracts for care context.**
   - Define onboarding draft, puppy profile input, age/date validation, age bucket hints, selected tracker ids/order, and active care context.
   - Decide selected tracker persistence before writing production save behavior.

2. **Reach a reviewable Milestone A without fake production behavior.**
   - Add route coverage and dev-gallery fixtures for missing atlas groups using synthetic data only.
   - Keep gallery routes development-only and out of user navigation.

3. **Prepare `PUP-21` to unlock Milestone B.**
   - Onboarding creates or updates a real `puppy` row for the authenticated bootstrapped owner.
   - Quick Log and Today can read active household/puppy/tracker context through tested query hooks.

---

## Non-Goals

- Do not implement Today day 2-7 guidance, reminder cards, or full Today hero in this batch.
- Do not implement Quick Log details, Timeline editing/filter completion, Health, reminders, sharing, trainer, sitter, cards, or paywall.
- Do not add dependencies.
- Do not change schema without ADR-0007/CTO approval.
- Do not use synthetic dev-gallery data as production care context.
- Do not perform EAS builds, release actions, Supabase production migrations/deploys, commits, pushes, PRs, rebases, or tags without exact approval.

---

## Product Decisions Locked In

1. **Batch boundary**
   - **Chosen:** include `PUP-19`, `PUP-20`, and `PUP-21` only.
   - **Reason:** this is the smallest set that satisfies product value, backend trust, frontend reviewability, and architecture sequencing.

2. **Synthetic vs production split**
   - **Chosen:** `PUP-19`/`PUP-20` may use synthetic fixtures; `PUP-21` must use real auth/session and Supabase/RLS boundaries.
   - **Reason:** Milestone A needs clickability, but Milestone B needs trustworthy durable behavior.

3. **Settings route namespace**
   - **Chosen:** More remains the entry point; editable settings screens use `/settings/*`, including `/settings/puppy-profile` and `/settings/quick-trackers`.
   - **Reason:** avoids parallel `/more/*` and `/settings/*` route trees while preserving More as the user-facing hub.

4. **Selected tracker persistence**
   - **Chosen:** approved ordered `quick_tracker_ids` column on `public.puppy`.
   - **Reason:** selected tracker order is per-puppy, low-cardinality, and already validated in app contracts. A column avoids a new table and broader RLS surface.
   - **Approval:** explicit user approval for `quick_tracker_ids` was granted in this thread on 2026-06-08. ADR-0007 and data-model docs record this additive delta. No production migration was applied.

5. **Quick Log defaults**
   - **Chosen:** Quick Log may keep current default trackers until active care context is available, but must consume selected trackers once `PUP-21` lands.
   - **Reason:** current tests preserve existing behavior while the production setup path is added.

---

## Invariants And Executable Spec

- **Acceptance mapping:** Linear issue -> this plan -> automated test/manual check -> PR verification evidence.
- **Invariant 1:** only `Today | Health | More` are primary tabs; Quick Log stays a FAB/modal action.
  - **Test:** `src/test/navigation-contract.test.ts`, `src/test/tab-layout.render.test.tsx`, `scripts/checks/check-navigation-contract.mjs`.
- **Invariant 2:** dev-gallery and synthetic route shells cannot write production data and cannot import raw Supabase.
  - **Test:** route-shell guardrails plus render tests under `src/test/dev-gallery*.test.tsx`.
- **Invariant 3:** selected quick trackers are unique, ordered, and capped at 5.
  - **Test:** existing `src/test/quick-log-contracts.test.ts` plus new onboarding/settings contract tests.
- **Invariant 4:** a production active care context always includes authenticated `userId`, `householdId`, `puppyId`, selected tracker ids, and `todayDate`.
  - **Test:** `src/test/active-care-context.test.tsx` or equivalent query-hook tests.
- **Invariant 5:** puppy profile requires a name and either birth date or age estimate.
  - **Test:** existing `src/test/supabase-contracts.test.ts` plus onboarding form tests.
- **Invariant 6:** owner can create/update puppy profile through RLS; viewer cannot write; direct household/membership writes remain denied.
  - **Test:** `supabase/tests/rls_baseline.sql` update or focused `supabase/tests/puppy_profile.sql`.
- **Invariant 7:** all visible UI strings use typed EN/RU/ES i18n and respect compact string budgets for CTAs and tracker tiles.
  - **Test:** `npm run test:scaffold`, `src/test/i18n.test.ts`, relevant render tests.
- **Invariant 8:** no puppy names, raw emails, notes, provider names, media, invite/share tokens, or push tokens appear in analytics/logs/docs/screenshots.
  - **Test:** `node scripts/checks/privacy-scan.mjs`, analytics/observability contract tests if events are added.

---

## File Map

### App Shell
- `app/onboarding/index.tsx` - onboarding route shell only.
- `app/(modals)/settings/puppy-profile/index.tsx` - future puppy profile settings route shell.
- `app/(modals)/settings/quick-trackers/index.tsx` - future quick tracker settings route shell.
- `app/_dev/design.tsx` or `app/(modals)/_dev/design.tsx` - future development-only gallery route.
- `app/_layout.tsx`, `app/(modals)/_layout.tsx` - route registration only.

### Feature
- `src/features/onboarding/` - onboarding flow screens, draft controller, and form components.
- `src/features/profile/` - reusable puppy profile view/edit components.
- `src/features/settings/quick-trackers/` - selected tracker edit screen.
- `src/features/_dev/design-gallery/` - synthetic native gallery fixtures.
- `src/features/quick-log/screens/QuickLogShell.tsx` - consume selected tracker ids after active care context exists.
- `src/features/today/screens/TodayScreen.tsx` - consume active care context and first setup states after `PUP-21`.
- `src/features/more/screens/MoreScreen.tsx` - add navigation entries to settings routes.

### Design
- `src/design/primitives/` - use existing primitives first. Add shared primitives only if repeated across the batch and covered by tests.
- `docs/design/v1/manifest.json`, `docs/design/v1/screenshots/index.md` - atlas inputs for route/state coverage.

### Contracts
- `src/contracts/onboarding.ts` - future onboarding draft, age/date, selected tracker, and plan reveal contracts.
- `src/contracts/quick-log.ts` - reuse tracker ids and max selected count; update only if selected tracker contract belongs here.
- `src/contracts/navigation.ts` - route contract updates for `/settings/*` and dev-gallery route guardrails.
- `src/contracts/supabase.ts` - update only for approved persistence/schema contract changes.

### Data And Query
- `src/lib/supabase/puppies.ts` - future typed Supabase wrapper for puppy reads/inserts/updates.
- `src/lib/query/puppy.ts` - future puppy profile query/mutation hooks.
- `src/lib/query/active-care-context.ts` - future active care context hook.
- `src/lib/query/keys.ts` - add stable keys for onboarding/profile/settings selected trackers.
- `src/lib/storage/onboardingDraft.ts` - only if local temporary draft is needed before durable save.

### Backend / Supabase
- `supabase/migrations/[timestamp]_puppy_quick_trackers.sql` - only if approved.
- `supabase/tests/puppy_profile.sql` or `supabase/tests/rls_baseline.sql` - RLS for puppy create/update and selected tracker persistence.
- `src/contracts/database.types.ts` - regenerate only through the approved remote typegen gate if schema changes.

### Tests
- `src/test/onboarding-contracts.test.ts`
- `src/test/onboarding-flow.render.test.tsx`
- `src/test/puppy-profile-query.test.tsx`
- `src/test/quick-trackers-settings.render.test.tsx`
- `src/test/active-care-context.test.tsx`
- `src/test/dev-gallery.render.test.tsx`
- `src/test/navigation-contract.test.ts`
- `supabase/tests/puppy_profile.sql` if schema/RLS changes.

### Docs
- `docs/architecture/05-navigation-and-deeplinks.md` - settings namespace update.
- `docs/architecture/08-data-model-and-rls.md` - selected tracker persistence note if approved.
- `docs/architecture/adr/0007-prd-schema-baseline.md` - process/update if persistence changes schema beyond baseline.
- `docs/plans/README.md` and master roadmap - status/index updates.

---

## Contracts, Schema, And Permissions

### Zod Contracts

- [x] Add onboarding draft and submitted profile schemas.
- [x] Reuse `quickLogTrackerIdSchema`, `selectedQuickLogTrackerIdsSchema`, and `MAX_VISIBLE_QUICK_LOG_TRACKERS`.
- [x] Add age hint bucket helper with non-medical copy categories.
- [x] Add active care context schema.
- [x] Add contract tests for valid, invalid, and boundary payloads.

### Database / RLS

- [x] Migration required: selected tracker persistence was approved and an additive `public.puppy.quick_tracker_ids` migration was created.
- [x] Destructive migration risk reviewed: `npm run db:push:remote:dry-run` reported only the new additive migration; no production push was performed.
- [x] RLS policy impact reviewed for puppy create/update and selected tracker updates.
- [x] pgTAP tests added or updated for owner/caregiver/viewer/non-member behavior.
- [x] pgTAP execution evidence recorded against non-production `PuppyPlan Dev`: focused runtime pgTAP returned plan `1..11`, `ok_count=11`, `not_ok_count=0`, no diagnostics. The local Docker-backed `npm run supabase:test` runner still cannot run on this machine, but the selected-tracker RLS/constraint blocker is verified on the real dev database.

### Edge Functions

- [x] Edge Function required: no for the recommended `PUP-21` first slice.
- [x] `bootstrap_current_user` remains the only first-household creation path.
- [x] No direct client inserts into `household` or `household_membership`.

---

## UX Spec

### Navigation And Entry Points

- `/onboarding` starts after signed-in bootstrap when no active puppy exists.
- `/settings/puppy-profile` opens from More and reuses profile contracts.
- `/settings/quick-trackers` opens from More and lets users edit selected trackers.
- `/quick-log` remains a modal/FAB action and is hidden or disabled on onboarding screens where it would cover the primary CTA.
- Dev-gallery route is development-only and not linked from production tabs.

### States

- **Loading:** auth/session or active care context is resolving.
- **Empty:** signed-in user has no active puppy profile yet; route to onboarding.
- **Success:** profile is saved, trackers selected, plan reveal shows 3 starter actions.
- **Error:** validation or save error, with calm retry copy.
- **Offline / pending write:** temporary onboarding draft only; do not promise durable offline writes outside Quick Log.
- **Permission denied:** viewer/non-owner cannot edit puppy/settings and sees read-only or unavailable state.

### Accessibility

- [x] Touch targets meet iOS 44pt / Android 48dp minimums through existing `src/design` touchable primitives and compact route render coverage.
- [x] Quick Log / FAB target remains 56pt+.
- [x] Tracker tiles expose selected state and accessible labels.
- [x] Age/date input announces selected mode and validation.
- [x] Limit warnings do not rely on color alone.
- [ ] Dynamic Type XXL/XXXL visual review for onboarding CTA and tracker tiles remains a device/screenshot follow-up.

### i18n And String Budgets

- [x] No raw user-facing strings in UI.
- [x] EN/RU/ES key parity updated.
- [x] ICU/plural-sensitive selected count and age week copy use typed keys.
- [x] String-budget-sensitive labels checked by scaffold/i18n gates and focused render tests: CTAs, tracker tiles, settings rows, snackbar/action labels.

---

## Privacy, Analytics, And Observability

- [x] Analytics event schemas added only if the implementation records onboarding/profile/tracker events; no new analytics events were added.
- [x] Analytics payloads use age bucket, selected tracker count, and tracker category set only, never raw puppy name; no new analytics payloads were added.
- [x] Errors go through shared observability wrappers, not direct feature calls; no new feature observability calls were added.
- [x] Dev-gallery fixtures and screenshots use synthetic data only.
- [x] No permission or platform privacy impact unless new analytics/storage behavior is added.

---

## Implementation Plan

### Phase 0 - Linear Split And Storage Decision

**Files:**
- Read/update: `docs/plans/active/2026-05-29-full-prd-native-app-master-roadmap.md`
- Read/update: `docs/plans/README.md`
- Read/update: this plan
- Future create/update: Linear issues `PUP-19`, `PUP-20`, `PUP-21`

**Checklist:**
- [x] Create `PUP-19` with Goal, Non-goals, Constraints, Acceptance, Likely files, Verification, and source docs.
- [x] Create `PUP-20` with `agent-ready` only after `PUP-19` records the route/state coverage map.
- [x] Create `PUP-21` with `needs-plan` until selected tracker persistence is decided.
- [x] Decide selected tracker storage. If schema changes, run ADR-0007 process and get CTO approval before implementation.
- [x] Move implementation work to the Linear-generated branch for each issue.

**Phase 0 result:** Linear issues now exist. The selected tracker storage recommendation is approved as `public.puppy.quick_tracker_ids`; ADR-0007/data-model docs were updated and no production migration was applied.

**Acceptance criteria:**
- Linear and repo docs agree on the batch boundary and blockers before code implementation starts.

### Phase 1 - `PUP-19` Route Coverage And Contract Preflight

**Files:**
- Modify/create: `docs/design/v1/native-coverage.md`
- Modify: `src/contracts/navigation.ts`
- Modify: `docs/architecture/05-navigation-and-deeplinks.md`
- Modify: `scripts/checks/check-navigation-contract.mjs`
- Test: `src/test/navigation-contract.test.ts`

**Checklist:**
- [x] Map every onboarding/profile/quick-tracker/settings artboard to a native route, dev-gallery fixture, or deferred issue.
- [x] Lock `/settings/*` as the editable settings namespace.
- [x] Add or update navigation contract checks for required route files without adding production business logic to `app/`.
- [x] Record selected tracker persistence recommendation and approval status.
- [x] Run targeted navigation/scaffold checks.

**Phase 1 result:** `docs/design/v1/native-coverage.md` records the route/state map, `/settings/puppy-profile` and `/settings/quick-trackers` are locked as editable settings routes, atlas `/more/puppy-profile` maps to `/settings/puppy-profile`, and `/_dev/components` is the development-only native gallery route. Targeted checks passed: `npm run test:unit -- src/test/navigation-contract.test.ts`; `node scripts/checks/check-navigation-contract.mjs`.

**Acceptance criteria:**
- Agents can implement `PUP-20` route shells and `PUP-21` production routes without guessing route names or state ownership.

### Phase 2 - `PUP-20` Synthetic Route Shells And Native Gallery

**Files:**
- Create: `app/_dev/design.tsx` or approved equivalent
- Create: `src/features/_dev/design-gallery/`
- Create/update: route shells under `app/(modals)/...`
- Test: `src/test/dev-gallery.render.test.tsx`
- Test/update: route render and navigation contract tests

**Checklist:**
- [x] Add development-only native gallery for primitives and key screen states.
- [x] Add synthetic route shells for missing atlas groups needed for Milestone A.
- [x] Use only synthetic fixtures and typed i18n keys.
- [x] Ensure dev-gallery cannot write production data or appear in primary navigation.
- [x] Run `npm run check`.

**Phase 2 result:** Added `/_dev/components`, `/onboarding`, `/settings/puppy-profile`, and `/settings/quick-trackers` route shells backed by `src/features/_dev/design-gallery` synthetic screens. The route shells do not import Supabase or production write adapters, are not linked from primary navigation, and use typed EN/RU/ES strings. Verification passed: `npm run test:unit -- src/test/dev-gallery.render.test.tsx src/test/navigation-contract.test.ts`; `node scripts/checks/check-navigation-contract.mjs`; `npm run typecheck`; `npm run test:scaffold`; `git diff --check`; `npm run check`.

**Acceptance criteria:**
- Milestone A can be reviewed locally with clickable/screenshotable synthetic states, with no production behavior claims.

### Phase 3 - `PUP-21` Contracts And Data Access

**Files:**
- Create: `src/contracts/onboarding.ts`
- Modify: `src/contracts/quick-log.ts` only if selected tracker ownership needs a re-export/helper.
- Create: `src/lib/supabase/puppies.ts`
- Create: `src/lib/query/puppy.ts`
- Create: `src/lib/query/active-care-context.ts`
- Modify: `src/lib/query/keys.ts`
- Test: `src/test/onboarding-contracts.test.ts`
- Test: `src/test/puppy-profile-query.test.tsx`
- Test: `src/test/active-care-context.test.tsx`

**Checklist:**
- [x] Write failing contract tests for profile validation, age/date mode, age hints, and selected tracker cap/uniqueness/order.
- [x] Add Supabase wrapper for puppy read/create/update through `src/lib/supabase`, not feature UI.
- [x] Add query keys and active care context hook.
- [x] Add RLS/pgTAP tests if schema or policy behavior changes.
- [x] Wire active care context to expose selected tracker ids or keep the implementation blocked if persistence is undecided.

**Phase 3 result:** Added onboarding/profile/active-care Zod contracts, the puppy Supabase wrapper, TanStack Query hooks/keys, active care context, approved additive `quick_tracker_ids` migration, generated-type contract update, and RLS/pgTAP coverage text. RED tests failed before implementation, then focused contract/query tests passed locally.

**Acceptance criteria:**
- Production UI has typed, tested care-context APIs before it renders or saves onboarding/profile data.

### Phase 4 - `PUP-21` Onboarding/Profile/Tracker UI

**Files:**
- Create: `src/features/onboarding/`
- Create: `src/features/profile/`
- Create: `src/features/settings/quick-trackers/`
- Modify: `src/features/more/screens/MoreScreen.tsx`
- Modify: `src/features/quick-log/screens/QuickLogShell.tsx`
- Modify: `src/features/today/screens/TodayScreen.tsx`
- Modify: `app/onboarding/index.tsx`
- Modify/create: `app/(modals)/settings/...`
- Test: `src/test/onboarding-flow.render.test.tsx`
- Test: `src/test/quick-trackers-settings.render.test.tsx`
- Test/update: Quick Log and Today render tests

**Checklist:**
- [x] Build onboarding welcome/profile/tracker picker/plan reveal with design primitives.
- [x] Use typed i18n keys for EN/RU/ES, including selected-count and validation strings.
- [x] Reuse profile form in `/settings/puppy-profile`.
- [x] Reuse selected tracker contract in `/settings/quick-trackers`.
- [x] Quick Log grid reads selected tracker ids from active care context.
- [x] Today empty/unavailable states route to onboarding when care context is missing.

**Phase 4 result:** Added connected production onboarding, puppy profile settings, quick tracker settings, More entries, Today setup routing, and Quick Log selected tracker consumption. The real onboarding route moved to `app/onboarding/index.tsx` because the previous route group did not expose `/onboarding`.

**Acceptance criteria:**
- A signed-in bootstrapped owner can create a puppy profile, select up to 5 trackers, see plan reveal, and open Quick Log with those trackers.

### Phase 5 - Verification And Handoff

**Checklist:**
- [x] Run `npm run lint`.
- [x] Run `npm run typecheck`.
- [x] Run focused tests for changed contracts/query/UI.
- [x] Run `npm run check`.
- [x] If schema changes were approved, run migration diff/destructive check, pgTAP, and remote typegen gate as appropriate. Completed against non-production `PuppyPlan Dev`: migration applied, repeat dry-run no-op, Supabase lint, focused runtime pgTAP, remote typegen.
- [x] Record verification evidence in Linear.
- [x] Update this plan changelog and `docs/plans/README.md`.

**Acceptance criteria:**
- The batch is reviewable with exact commands, source docs, Linear state, and no hidden production/release actions.

---

## Verification Checklist

### Local Code Gates

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] focused changed-area unit/render tests
- [x] `npm run check`

### Supabase / Contract Gates

- [x] contract/codegen diff checked with remote/non-production typegen; `src/contracts/database.types.ts` was regenerated from `PuppyPlan Dev`.
- [x] migration diff/destructive check if persistence changes schema: pre-apply `npm run db:push:remote:dry-run` showed only `20260608212607_puppy_quick_tracker_ids.sql`; post-apply dry-run reported the remote database up to date.
- [x] RLS pgTAP tests if puppy profile or selected tracker writes change: focused runtime pgTAP against `PuppyPlan Dev` returned plan `1..11`, `ok_count=11`, `not_ok_count=0`, no diagnostics. The local `npm run supabase:test` wrapper still requires Docker and fails on this machine before running tests, so the runtime evidence was collected through Supabase MCP/direct SQL instead.
- [x] no direct feature UI import of `@supabase/supabase-js`
- [x] remote/non-production typegen gate after applying the migration outside production: `npm run db:types` completed and updated `src/contracts/database.types.ts`.

### UI / Mobile Gates

- [x] React Native Testing Library render/integration tests
- [ ] Dynamic Type XXL/XXXL visual review for onboarding CTA and tracker picker
- [x] Accessibility labels/states covered in render tests for tracker picker and profile form
- [x] string budget and i18n parity checks

### Release / Platform Gates

- [x] no EAS/TestFlight/Play action
- [x] no Supabase production migration/deploy
- [x] no push/PR/rebase/tag/release action. Local commits are allowed by this run's explicit instructions.

---

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Selected tracker persistence is not in the visible schema baseline. | Resolve in Phase 0. Use ADR-0007/CTO approval for any schema change; otherwise stop production durability claims. |
| Dev-gallery synthetic data leaks into production flows. | Keep `PUP-20` under `_dev`/synthetic ownership and test that route shells do not import Supabase or write data. |
| `PUP-21` becomes too large. | Keep first slice to setup/profile/tracker/active-context only; defer Today core, guidance, Quick Log details, and Timeline completion. |
| Route namespace forks between `/more/*` and `/settings/*`. | Lock `/settings/*` for editable settings in `PUP-19`; More remains the entry point only. |
| Puppy names or emails leak into telemetry/docs. | Use analytics buckets/counts only, synthetic fixtures, and privacy scan before handoff. |

---

## Changelog

- 2026-06-08: Created post-`PUP-18` next-batch plan after reviewing the master roadmap, active design/foundation roadmaps, PRD onboarding/Quick Log/data sections, Design onboarding/profile/quick tracker specs, navigation/RLS/auth ADR docs, current app routes, current Quick Log/Today code, Supabase baseline migrations/tests, Linear PUP issue state, and project graph findings.
- 2026-06-08: Mirrored planning evidence to Linear `PUP-17` comment `4d1c74ac-1b94-42c1-9d1a-4d45beef89dd`. Verification passed: `git diff --check`; `npm run check` with lint, typecheck, 38 Jest suites / 258 tests, 106 Node tests, scaffold guardrails, token drift, privacy scan, and text hygiene.
- 2026-06-08: Created Linear `PUP-19`, `PUP-20`, and `PUP-21`; switched to `PUP-19` generated branch; completed `PUP-19` route coverage/settings namespace preflight. Added `docs/design/v1/native-coverage.md`, navigation contract exports/checks for `/settings/*`, atlas route aliasing, planned route metadata, and dev-only `/_dev/components`. At that point selected tracker persistence was still held pending exact ADR-0007/CTO schema approval, so no migration or save behavior was added in the `PUP-19` phase.
- 2026-06-08: Completed local `PUP-20` synthetic dev-gallery lane on generated branch `dimaselenya/pup-20-development-only-native-design-gallery-and-synthetic-route`. Added `/_dev/components` gallery and synthetic `/onboarding`, `/settings/puppy-profile`, and `/settings/quick-trackers` route shells using typed EN/RU/ES copy and synthetic fixtures only. No production data writes, Supabase imports, primary navigation exposure, schema migration, push, PR, or deploy action was performed. `PUP-21` remains blocked before migration/save behavior pending exact selected tracker persistence approval.
- 2026-06-08: Received explicit approval for `public.puppy.quick_tracker_ids` selected-tracker persistence and completed local `PUP-21` implementation on generated branch `dimaselenya/pup-21-onboarding-puppy-profile-tracker-settings-and-active-care`. Added production onboarding, puppy profile, quick tracker settings, active care context, Supabase puppy wrapper/query hooks, approved additive migration, RLS/pgTAP coverage text, More/Today/Quick Log integration, typed EN/RU/ES strings, and focused tests. Verification passed locally: focused changed-area tests, `node --test scripts/checks/supabase-baseline.test.mjs`, `npm run lint`, `npm run typecheck`, `npm run test:scaffold`, `npm run check`, `npm run db:push:remote:dry-run`, and `npm run supabase:lint`. `npm run supabase:test` is blocked locally by the repo Docker guard, and remote/non-production typegen remains pending until the migration is applied outside production. Evidence mirrored to Linear `PUP-21` comment `b0999e55-e841-42d5-a07a-20e4488af697`.
- 2026-06-09: Applied local review fixes: wired the production Quick Log route to a TanStack Query/SQLite mutation port so active selected trackers render and submit from `/quick-log`, added retryable save-error copy for onboarding/profile/quick-tracker saves, and reconciled selected tracker approval status in native coverage/master roadmap docs. Focused render tests and `npm run typecheck` passed locally.
- 2026-06-09: Removed the selected-tracker schema blocker on non-production `PuppyPlan Dev` (`olymqppxsadsxfrcyskh`). Confirmed the DB URL project ref before write, applied `20260608212607_puppy_quick_tracker_ids.sql`, verified migration history includes `20260608212607`, confirmed schema shape for `public.puppy.quick_tracker_ids`, reran `npm run db:push:remote:dry-run` with no pending migrations, ran `npm run supabase:lint` with no schema errors, executed focused runtime pgTAP through Supabase MCP/direct SQL with plan `1..11`, `ok_count=11`, `not_ok_count=0`, regenerated `src/contracts/database.types.ts` with `npm run db:types`, and recorded that Supabase advisors only report pre-existing baseline security/performance warnings unrelated to `quick_tracker_ids`. No production migration, deploy, push, PR, release, or git commit was performed.
