# Post-PUP-18 Next Batch - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant PuppyPlan skills, and this plan task-by-task. Do not implement from the master roadmap alone.
> Living document: update this file as Linear issues, route coverage, contracts, schema decisions, UX states, or verification evidence change.

**Goal:** Plan and split the next small batch after `PUP-18` so the app can move from auth/session foundation into care context without losing Milestone A route/design coverage.

**Status:** Active.

**Current phase:** Phase 5 - `PUP-21` local verification and handoff. Local care-context implementation and SE emulator repair evidence are complete. The first approved selected-tracker migration (`20260608212607_puppy_quick_tracker_ids.sql`) was applied to `PuppyPlan Dev`, runtime pgTAP passed for that schema, and remote typegen updated `src/contracts/database.types.ts`. The follow-up non-empty constraint migration (`20260609120000_puppy_quick_tracker_ids_non_empty.sql`) was explicitly approved for `PuppyPlan Dev`, applied there on 2026-06-11, and verified with a focused runtime constraint check returning `check_count=5`, `pass_count=5`, `fail_count=0`; repeat dry-run is now no-op and Supabase lint reports no schema errors. The final signoff execution now passes on the required SE simulator and the approved `iPhone 16e` partial surrogate for onboarding validation, Quick Log creation, Today continuity, Timeline continuity, tab switching, and stale route warning removal. App-owned UX issues found during the `iPhone 16e` pass were fixed: active Quick Log sheets now expose a visible Close action, and the persistent FAB no longer overlaps tab hit areas on compact phones. A production Supabase database is not needed for the current development batch. Production database creation/configuration and production migration verification are deferred until release readiness after exact production Supabase approval; production was not touched. CTO release signoff still carries the generated native warning caveat described in the emulator evidence below.

**Architecture:** The batch is split into two lanes. `PUP-19`/`PUP-20` are synthetic, development-only Milestone A enablers for route coverage, atlas mapping, and native design gallery. `PUP-21` is the production care-context lane: onboarding, puppy profile, selected quick trackers, and active care context consumed by Quick Log/Today. Production work must use the `PUP-18` Supabase Auth session actor, existing Supabase/RLS boundaries, TanStack Query server state, `src/design` primitives, typed EN/RU/ES i18n, and Zod contracts.

**Linear:** `PUP-19`, `PUP-20`, and `PUP-21` created on 2026-06-08 under team `PUP` / project `PuppyPlan MVP`. `PUP-19` owns route coverage/settings namespace/storage recommendation and is in review. `PUP-20` owns the synthetic dev-gallery lane and is in review after local verification. `PUP-21` owns production care context; selected tracker persistence received explicit `quick_tracker_ids` approval in this thread, local implementation is complete, and development schema/RLS/typegen evidence is recorded for both selected-tracker migrations on `PuppyPlan Dev`. The production database is a release-prep responsibility after exact production Supabase approval, not a current development prerequisite.

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
   - **Approval:** explicit user approval for `quick_tracker_ids` was granted in this thread on 2026-06-08. ADR-0007 and data-model docs record this additive delta. The migration is verified on `PuppyPlan Dev`. Production rollout is deferred until release readiness after exact production Supabase approval, when a clean production Supabase project should be created or connected and built from the repo migrations.

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
- [x] pgTAP tests added or updated for owner/caregiver/viewer/non-member behavior and selected-tracker duplicate, >5, empty selected set, and unknown tracker id rejection.
- [x] pgTAP execution evidence recorded against non-production `PuppyPlan Dev` for the first selected-tracker migration: focused runtime pgTAP returned plan `1..11`, `ok_count=11`, `not_ok_count=0`, no diagnostics. The local Docker-backed `npm run supabase:test` runner still cannot run on this machine.
- [x] Applied `20260609120000_puppy_quick_tracker_ids_non_empty.sql` to non-production `PuppyPlan Dev` after explicit approval naming that action. Runtime constraint evidence passed on 2026-06-11: migration history includes `20260609120000`, `puppy_quick_tracker_ids_non_empty` exists on `public.puppy`, no persisted puppy rows have empty quick trackers, an empty selected-tracker update is rejected at runtime, and synthetic runtime rows were cleaned up (`check_count=5`, `pass_count=5`, `fail_count=0`).

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
- [x] Dynamic Type XXL/XXXL visual review for onboarding CTA, tracker tiles, Today/Timeline rows, Quick Log sheet, More rows, and settings modals completed on the required SE simulator.

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
- [x] If schema changes were approved, run migration diff/destructive check, pgTAP, and remote typegen gate as appropriate. Completed against development `PuppyPlan Dev`: migration applied, repeat dry-run no-op, Supabase lint, focused runtime pgTAP, remote typegen. Production database setup and migration verification are deferred until release readiness after exact production Supabase approval.
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
- [x] migration diff/destructive check if persistence changes schema: pre-apply dry-run listed only `20260609120000_puppy_quick_tracker_ids_non_empty.sql`; after approved dev apply, repeat `npm run db:push:remote:dry-run` reports the remote database is up to date.
- [x] RLS pgTAP tests if puppy profile or selected tracker writes change: tracked `supabase/tests/rls_baseline.sql` coverage includes owner/caregiver/viewer/non-member update cases plus duplicate, >5, empty selected set, and unknown tracker id rejection. Focused runtime evidence for the empty-set constraint passed on `PuppyPlan Dev` with `check_count=5`, `pass_count=5`, `fail_count=0`. The local `npm run supabase:test` wrapper still requires Docker and fails on this machine before running tests.
- [x] no direct feature UI import of `@supabase/supabase-js`
- [x] remote/non-production typegen gate after applying the migration outside production: `npm run db:types` completed and updated `src/contracts/database.types.ts`.
- [ ] production migration/release gate: deferred until release readiness after exact production Supabase approval. Current development uses `PuppyPlan Dev`; do not create or touch production for this batch. During release prep, after that exact approval, create/connect the real PuppyPlan production Supabase project, apply the repo migrations to a clean production baseline, then run production dry-run/no-op/schema/RLS/typegen/advisor verification.

### UI / Mobile Gates

- [x] React Native Testing Library render/integration tests
- [x] Dynamic Type XXL/XXXL visual review for onboarding CTA and tracker picker
- [x] Accessibility labels/states covered in render tests for tracker picker and profile form
- [x] string budget and i18n parity checks
- [x] Required local iOS smoke on `Grith iPhone SE 3 iOS 26.3`.
- [x] Approved limited iOS matrix smoke on `iPhone 16e` as a partial surrogate only, including default text size and feasible `accessibilityXXXL` coverage.
- [ ] Formal `393/430` iOS matrix on ordinary `iPhone 16` and `iPhone 16 Plus`: deferred for this signoff because those simulator profiles are not currently available on this machine and disk headroom is tight.
- [ ] Android compact/medium smoke: deferred to a separate Android bring-up issue.
- [ ] Tablet, landscape, and dark mode: out-of-scope for v1 per `DESIGN.md` scope.

### Release / Platform Gates

- [x] no EAS/TestFlight/Play action
- [x] no Supabase production migration/deploy
- [x] no push/PR/rebase/tag/release action. Local commits are allowed by this run's explicit instructions.

---

## PUP-21 Emulator Repair Evidence - 2026-06-09

**Code repair scope:** fixed the stale root Stack child registration (`onboarding/index`), added a navigation-contract guard for stale root route names, shared modal close fallback (`back()` when possible, otherwise `replace('/today')`), field-aware onboarding validation with strict whole-number age parsing, server-backed `listEvents`, query-backed Quick Log/Today/Timeline rows, same-day cache creation for Quick Log mutations before Today mounts, and native-compatible Quick Log client event id generation for Hermes runtimes without `crypto.randomUUID`. No new dependency, generated `ios/`/`android/` edit, production migration, release action, commit, push, or PR was performed.

**Emulator flow:** passed on `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`). Verified debug signed-in Today empty/setup state, Health tab, More tab, Quick Log unavailable modal open/close, onboarding welcome -> profile validation (`name`, `8abc` age rejection) -> tracker limit warning -> plan reveal, Quick Log first `Feeding` event, Today immediate update, stop/relaunch cold start with Today durable `Feeding`, Timeline durable `Feeding`, and Timeline close returning to Today. Screenshot evidence is local-only under `/tmp/puppyplan-pup21-smoke/2026-06-09-emulator-repair/` (`01` through `12`).

**Runtime logs:** latest final-run logs are `/Users/dmitryselenya/Library/Developer/XcodeBuildMCP/workspaces/puppy_app-8174d5b31ce1/logs/com.dmitry-selenya.puppyplan-app_2026-06-09T20-20-25-148Z_helperpid62918_ownerpid64767_1b8a3d6a.log` and `/Users/dmitryselenya/Library/Developer/XcodeBuildMCP/workspaces/puppy_app-8174d5b31ce1/logs/com.dmitry-selenya.puppyplan-app_oslog_2026-06-09T20-20-27-303Z_helperpid62956_ownerpid64767_aed37c7f.log`. Search found no `[Layout children]` warning and no stale `No route named "onboarding"` warning. Native warnings remain for duplicate `RCTSwiftUI` classes and generated UIApplication background delegate methods without `UIBackgroundModes` (`fetch`, `remote-notification`). `app.config.ts` and app-owned plugins do not declare background modes; no false background capabilities were added only to silence logs.

**Verification:** passed `git diff --check`; focused Jest suites for route close, onboarding, timeline rows, Today/Timeline durable rows, Supabase events, and Quick Log mutation; `npm run check` with 49 Jest suites / 314 tests, 108 Node tests, scaffold/i18n/privacy/text hygiene/token gates; `npm run supabase:lint`; `npm run db:push:remote:dry-run` showing only existing pending `20260609120000_puppy_quick_tracker_ids_non_empty.sql` and no write.

**Dynamic Type hardening follow-up:** completed on `Grith iPhone SE 3 iOS 26.3` with content size `accessibility-extra-extra-extra-large`. Fixed test warning cleanup, replaced cache-only Quick Log rows with query-backed durable rows that preserve local recovery rows, and hardened adaptive UI: Today/Timeline event rows wrap safely, modal close actions remain visible, the Today timeline entry no longer competes with the FAB, Quick Log tracker labels and helper text remain reachable, onboarding resets scroll per step, onboarding plan reveal shows the first-log CTA before supporting detail, tracker/settings grids use SE-fitting two-column tile widths, segmented labels no longer truncate `Birth date`, profile/settings age parsing rejects `8abc`, and compact control/supporting text uses bounded Dynamic Type while primary readable body/errors remain scalable. Screenshot evidence is local-only under `/tmp/puppyplan-pup21-smoke/2026-06-09-dynamic-type-hardening/` (`01` through `15`).

**Runtime diagnostics follow-up:** Metro shutdown surfaced repeated Expo SecureStore `No keychain is available` failures from Supabase auth auto-refresh persistence. This was app-owned JS behavior, not generated native code. The SecureStore auth adapter now falls back to in-memory storage when the native module exists but rejects at runtime, preventing unhandled auto-refresh errors while preserving secure persistence whenever SecureStore succeeds. A relaunch on the required SE simulator after the fix produced no repeated SecureStore/keychain errors in Metro output.

**Follow-up verification:** passed `git diff --check`; focused Jest suites for onboarding, settings, timeline, Today, Quick Log, auth storage, primitives, and i18n after each repair batch; final `npm run check` with 50 Jest suites / 316 tests, 108 Node tests, and scaffold/i18n/privacy/text hygiene/token gates; `npm run supabase:lint`; `npm run db:push:remote:dry-run` showing only existing pending `20260609120000_puppy_quick_tracker_ids_non_empty.sql` and no write.

**CTO assessment:** conditional pass for app architecture and data correctness. Boundaries remain intact (`app/` thin, Supabase behind wrappers, TanStack Query server state, SQLite queue for local Quick Log only), durable event history is server-backed after cold restart, and no production mutation occurred. Native generated warnings are tracked as a release-like audit caveat, not an app-owned blocker, until the team confirms whether they disappear in a releasable build or require Expo/RN dependency/native-generation work.

**Product Director assessment:** pass for the tested first-run habit loop. The user can complete setup, see validation in place, hit tracker limit guidance, reach plan reveal, log the first event, and see Today continuity after restart. Failure recovery remains understandable through unavailable modal, field errors, retry/undo affordances, and durable row recovery.

**UX/UI Design Director assessment:** pass for the SE and accessibility XXXL viewport tested here, with one tracked release-quality caveat: settings forms naturally require vertical scrolling at maximum Dynamic Type. No CTA, tab, FAB, modal close, tracker tile, or Save action obstruction was observed; onboarding CTA and plan CTA are visible in the intended first viewport; tracker grids stay readable; profile errors appear next to the relevant field and clear on edit; touch targets are backed by primitives and render tests.

---

## PUP-21 Final Signoff Evidence - 2026-06-11

**Scope:** executed the approved final signoff plan after the local commit. No production Supabase, EAS/TestFlight/release action, push/PR, new dependency, generated `ios/`/`android/` edit, or false `UIBackgroundModes` change was performed. XcodeBuildMCP defaults were confirmed before simulator work. The approved extra simulator was `iPhone 16e` (`53A53E69-C5E6-4696-AD46-06D89C40B2CF`) and is recorded as a partial surrogate only, not as completion of the formal `393/430` matrix.

**Native warning audit:** required SE run used `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`). Runtime logs inspected:
- `/Users/dmitryselenya/Library/Developer/XcodeBuildMCP/workspaces/puppy_app-8174d5b31ce1/logs/com.dmitry-selenya.puppyplan-app_2026-06-11T14-45-16-691Z_helperpid12931_ownerpid96850_3dd209c7.log`
- `/Users/dmitryselenya/Library/Developer/XcodeBuildMCP/workspaces/puppy_app-8174d5b31ce1/logs/com.dmitry-selenya.puppyplan-app_2026-06-11T14-45-57-805Z_helperpid13803_ownerpid96850_d373f457.log`
- `/Users/dmitryselenya/Library/Developer/XcodeBuildMCP/workspaces/puppy_app-8174d5b31ce1/logs/com.dmitry-selenya.puppyplan-app_oslog_2026-06-11T14-45-59-268Z_helperpid13893_ownerpid96850_be4f16c4.log`

Search found no `[Layout children]` warning and no stale Expo Router `No route named` warning in the inspected 2026-06-11 app/runtime logs. Debug runtime warnings remain for duplicate `RCTSwiftUI` classes linked from `React.framework/React` and `PuppyPlan.debug.dylib`, plus generated UIApplication background delegate warnings for missing `fetch` and `remote-notification` `UIBackgroundModes`. `app.config.ts` declares no background modes, `package.json` has no notification/background/task-manager dependency, and no app-owned config requires background execution. Per scope, no false background capability was added only to silence logs.

**SE flow:** passed on the required SE simulator. Verified debug sign-in, Today empty state, Health and More tab switching, Quick Log open/close, first `Feeding` event, Today immediate update, Timeline durable rows, and cold restart continuity. Screenshot evidence is local-only under `/tmp/puppyplan-pup21-smoke/2026-06-11-final-signoff/se/` (`01` through `07`).

**Limited `iPhone 16e` flow:** passed default text size and feasible `accessibility-extra-extra-extra-large` checks. Verified debug sign-in, onboarding welcome, profile validation (`name` target and strict `8abc` age rejection), tracker limit behavior, plan reveal, Quick Log modal open/close, normal Today-context `Poop` log, Today immediate update, cold restart Today continuity, Timeline continuity, Health/More/Today tab switching, and More/settings surfaces. Screenshot evidence is local-only under `/tmp/puppyplan-pup21-smoke/2026-06-11-final-signoff/iphone-16e/` (`01` through `19`).

**App-owned fixes during signoff:** the `iPhone 16e` run exposed two UX defects and both were fixed with focused render tests plus emulator confirmation. First, active Quick Log sheets relied on drag dismissal and had no visible Close action; `src/features/quick-log/screens/QuickLogShell.tsx` now renders a tertiary Close button for the active sheet state. Second, the bottom-right FAB overlapped the More tab hit area on compact width; `app/(tabs)/_layout.tsx` now centers the FAB and raises it above tab hit areas, with `src/test/tab-layout.render.test.tsx` covering that contract. Post-fix emulator snapshots confirmed More opens More, Health opens Health, Today opens Today, and the FAB still opens Quick Log.

**Final verification:** passed `git diff --check`; focused Jest suites for Quick Log sheet/route and tab layout (`3` suites / `20` tests); `node scripts/checks/check-shell-i18n.mjs`; `npm run test:scaffold`; `npm run check` with `50` Jest suites / `322` tests, `108` Node tests, and scaffold/i18n/privacy/text hygiene/token gates; `npm run supabase:lint` with no schema errors; `npm run db:push:remote:dry-run` reporting the remote database is up to date and no push performed. Supabase CLI only reported an available update from `v2.101.0` to `v2.106.0`; no CLI/dependency change was made in this scope.

**Deferred/out-of-scope matrix:** ordinary `iPhone 16` and `iPhone 16 Plus` are not currently available locally, so the formal `393/430` iOS matrix is deferred and must not be claimed complete. Android compact/medium remains a separate bring-up issue. Tablet, landscape, and dark mode remain out-of-scope for v1 according to `DESIGN.md`; the v1 app remains portrait, phone-only, light mode.

**CTO assessment:** conditional pass for app-owned architecture and data correctness. Supabase access stays behind wrappers, server state stays in TanStack Query, durable Today/Timeline history survives cold restart, navigation stale-route and modal-close issues are fixed, and no production mutation occurred. CTO platform caveat remains for debug/dev-client generated native warnings (`RCTSwiftUI` duplicate classes and generated background delegate warnings) until a release-like native audit or Expo/RN dependency/native-generation decision explicitly closes it.

**Product Director assessment:** pass for the tested first-run and daily habit loop. The user can set up a profile, see field-specific validation, understand tracker limits, reach plan reveal, log the first event, and return after restart with Today/Timeline continuity intact. Recovery states remain understandable through unavailable/close affordances, inline validation, retry/undo surfaces, and durable row recovery.

**UX/UI Design Director assessment:** pass for the SE and `iPhone 16e` scopes tested here after the two signoff fixes. Compact layouts keep CTA/tab/FAB targets reachable, active modals have a visible Close action, profile errors appear next to affected fields, tracker warning behavior remains visible, Dynamic Type XXXL is usable on tested surfaces, and screenshot polish is acceptable for the current v1 phone-only light-mode scope. Caveat: formal `393/430` device coverage, Android, tablet, landscape, and dark mode are not complete in this signoff.

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
- 2026-06-09: Received explicit approval for the remaining production migration/release gate, but could not execute it safely because no PuppyPlan production Supabase project/ref/DB URL is configured or visible. Supabase project discovery returned `PuppyPlan Dev` (`olymqppxsadsxfrcyskh`) and an unrelated inactive project only; local `.env` `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_PROJECT_REF`, and `SUPABASE_DB_URL` all resolve to the dev ref; Supabase branches for dev show only the default `main` on the same ref. Safe verification still passed before handoff: `npm run check` passed with 46 Jest suites / 286 tests and 108 Node tests; `npm run db:push:remote:dry-run` reported the dev remote database up to date; `npm run supabase:lint` found no schema errors; `npm run db:types` produced no generated type diff; `node scripts/checks/check-database-types-generated.mjs` passed; focused dev runtime RLS/constraint check returned `check_count=11`, `pass_count=11`, `fail_count=0`, and rollback verification confirmed no synthetic test rows persisted. No production migration, deploy, push, PR, release, or git commit was performed.
- 2026-06-09: Re-attempted the production gate after the user's follow-up instruction to implement it with available tools. Supabase MCP `_list_projects`, Supabase CLI `projects list`, local `.env`, process env, `supabase/.temp/linked-project.json`, and Supabase branches still expose no PuppyPlan production target. Creating a new empty Supabase project was not used as a workaround because the required production sequence is to apply only `20260608212607_puppy_quick_tracker_ids.sql` to an existing PuppyPlan production baseline, not to bootstrap a new environment with unknown auth/service configuration. No production migration, production service configuration, deploy, push, PR, release, or git commit was performed.
- 2026-06-09: Fresh local verification after the production-target re-attempt and doc/Linear sync passed: `git diff --check` produced no output and `npm run check` passed with 46 Jest suites / 286 tests, 108 Node tests, and scaffold/i18n/privacy/text hygiene/token gates ok. Known React `act(...)` warnings in onboarding reduced-motion tests remain warnings only.
- 2026-06-09: Reclassified the missing production Supabase target from a current development blocker to a deferred release gate. `PUP-21` development remains valid on `PuppyPlan Dev`; production database creation/configuration and production migration verification will happen during release readiness after exact production Supabase approval instead of this batch.
- 2026-06-09: Applied deep-review fixes: promoted the missing selected-tracker RLS/constraint coverage into tracked pgTAP and node guardrail expectations for non-member update denial plus unknown tracker id rejection, and made release-readiness wording explicitly retain the exact production Supabase approval requirement.
- 2026-06-09: Applied follow-up review fixes for PUP-21 care context/settings: owner-only puppy profile and quick-tracker settings are gated by active household role and surface owner-only copy instead of connection copy on permission denial; selected quick trackers now require 1..5 ids in contracts and a follow-up `puppy_quick_tracker_ids_non_empty` migration with pgTAP/static guardrail coverage; Quick Log defensively falls back to default trackers for empty runtime input; active puppy selection is explicitly scoped through the current user's first accepted non-revoked household membership; manual Quick Log retry preserves the recovery surface; onboarding/settings limit warnings reset after valid selection changes; `database.types.ts` already retained its trailing newline. Verification passed: focused Jest suites for contracts/query/UI/queue/mutation, `node --test scripts/checks/supabase-baseline.test.mjs`, `npm run lint`, `npm run typecheck`, `git diff --check`, `npm run check` with 46 Jest suites / 297 tests and 108 Node tests, `npm run db:push:remote:dry-run` showing only `20260609120000_puppy_quick_tracker_ids_non_empty.sql`, and `npm run supabase:lint`. `npm run supabase:test` remains blocked locally by the Docker guard.
- 2026-06-09: Corrected the local iOS simulator guardrail after an attempted smoke incorrectly selected `iPhone 17 Pro` from an empty/default simulator session. The wrong simulator was shut down and Metro was stopped. The project docs now require `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) for local iOS smoke on this M1 MacBook Air, with `iPhone SE (3rd generation)` (`1319D7E1-AE4E-4165-8EB9-B3A78DE62867`) as the only fallback. Offline CoreSimulator inspection confirmed PuppyPlan (`com.dmitry-selenya.puppyplan-app`) and Grith (`com.grith.app`) already coexist on the same SE simulator with separate bundle identifiers and data containers; reinstalling PuppyPlan updates only PuppyPlan.
- 2026-06-09: Implemented the PUP-21 emulator signoff repair plan and reran the required SE simulator flow. Fixed Expo Router stale root route registration, modal close fallback, onboarding field-aware validation and strict age parsing, durable `listEvents` timeline rows, Today same-day query usage, Timeline/root durable query usage, same-day optimistic cache creation before Today mounts, and native-compatible Quick Log client event id generation for Hermes runtimes without `crypto.randomUUID`. Verification passed: focused Jest suites including the new native UUID and Today pre-mount cache regressions; `git diff --check`; `npm run check` with 49 Jest suites / 314 tests and 108 Node tests; `npm run supabase:lint`; `npm run db:push:remote:dry-run`. Emulator evidence on `Grith iPhone SE 3 iOS 26.3` confirmed onboarding validation/tracker warning/plan reveal, Quick Log first `Feeding`, Today immediate update, stop/relaunch durable Today history, durable Timeline history, modal close, and no `[Layout children]` warning. Remaining CTO release-like audit caveat: generated native `RCTSwiftUI` duplicate class warnings plus generated background delegate warnings without app-owned `UIBackgroundModes`; this is not an app-owned blocker unless it reproduces in a releasable build or app-owned config/dependencies require the capability. No false background mode or generated native edit was added.
- 2026-06-09: Completed SE accessibility XXXL hardening after Product/CTO/UX review. Removed current React `act(...)` warnings from changed render tests, kept Quick Log/Today/Timeline history server-backed while preserving local recovery rows, and fixed adaptive UI issues found on emulator: Today FAB/Timeline CTA collision, Timeline close/status overflow, More row truncation, Quick Log tile/helper accessibility, onboarding welcome/profile/tracker/plan density and scroll reset, settings profile strict age parsing, segmented `Birth date` truncation, and quick-tracker/settings two-column grid fit. Also added SecureStore runtime fallback for simulator keychain unavailability during auth auto-refresh. Verification passed: `git diff --check`; final `npm run check` with 50 Jest suites / 316 tests and 108 Node tests; `npm run supabase:lint`; `npm run db:push:remote:dry-run` showing only `20260609120000_puppy_quick_tracker_ids_non_empty.sql` would be pushed and no write was performed.
- 2026-06-10: Applied review fixes for local-day behavior, Timeline loading/row ordering, Quick Log modal cache-only local recovery rows, Today/Timeline manual retry source-surface telemetry, tokenized feature-screen spacing, RU copy, and owner-only update role future-proofing. Also corrected this plan's development schema gate status: `20260609120000_puppy_quick_tracker_ids_non_empty.sql` remains pending on `PuppyPlan Dev`, so empty selected-set runtime evidence and Linear acceptance sync cannot be completed until explicit approval names the dev migration apply action.
- 2026-06-11: Received exact approval to apply `20260609120000_puppy_quick_tracker_ids_non_empty.sql` to non-production `PuppyPlan Dev`. Preflight confirmed local env targets `PuppyPlan Dev` (`olymqppxsadsxfrcyskh`) and dry-run listed only that migration. Applied it with `node scripts/supabase/run-remote-cli.mjs push`; post-apply `npm run db:push:remote:dry-run` reports the remote database is up to date; `npm run supabase:lint` reports no schema errors; focused runtime SQL check passed with `check_count=5`, `pass_count=5`, `fail_count=0`, including empty selected-set rejection and synthetic row cleanup; `npm run db:types`, `node scripts/checks/check-database-types-generated.mjs`, and `git diff --check` completed successfully. No production migration, deploy, push, PR, release, or git commit was performed.
- 2026-06-11: Executed the final PUP-21 signoff plan after the local commit. Confirmed XcodeBuildMCP defaults, audited SE runtime logs, reran the PUP-21 smoke on `Grith iPhone SE 3 iOS 26.3`, and ran the approved limited `iPhone 16e` partial matrix at default text size plus feasible `accessibilityXXXL`. Fixed two app-owned UX defects found on `iPhone 16e`: active Quick Log sheets now have a visible Close action, and the FAB is centered/raised so it no longer overlaps tab hit areas. Screenshot evidence is local-only under `/tmp/puppyplan-pup21-smoke/2026-06-11-final-signoff/`. Final verification passed: `git diff --check`; focused Jest suites for Quick Log sheet/route/tab layout (`3` suites / `20` tests); `npm run test:scaffold`; `npm run check` with `50` Jest suites / `322` tests and `108` Node tests; `npm run supabase:lint`; `npm run db:push:remote:dry-run` reporting the remote database is up to date. Evidence mirrored to Linear `PUP-21` comment `941e06ef-dca1-4126-b098-1a622e0766af`. No production Supabase, EAS/TestFlight/release action, push/PR, new dependency, generated native edit, false `UIBackgroundModes`, or git commit was performed.
