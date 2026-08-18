# Scaffold Expo App Baseline - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip verification, even when package scripts are minimal.
> Living document: update this file as scaffold files, package scripts, route contracts, or verification evidence change.

**Goal:** Create the initial Expo native app scaffold for PuppyPlan without implementing product features beyond the shell.

**Status:** Completed.

**Plan type:** Linear task plan for `PUP-2`.

**Current phase:** Completed.

**Architecture:** This establishes the single Expo app from ADR-0002, with Expo Router route shells in `app/` and product/runtime code under `src/`. It prepares the design, i18n, query, observability, storage, and test boundaries needed by later `PUP-7`, `PUP-3`, `PUP-4`, and Quick Log work, but it does not create Supabase schema, product data flows, or native generated projects.

**Linear:** `PUP-2`

**Branch:** `dimaselenya/pup-2-scaffold-expo-app-baseline`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - MVP thesis, IA, mobile stack, workstreams, accessibility, screen spec pack.
- Design: `DESIGN.md` - non-negotiable IA, visual contract, tab bar, Quick Log FAB, required states, i18n contract.
- Architecture: `docs/architecture/00-overview.md`, `docs/architecture/02-repo-structure-and-ownership.md`, `docs/architecture/03-client-data-layer.md`, `docs/architecture/04-state-management.md`, `docs/architecture/05-navigation-and-deeplinks.md`, `docs/architecture/06-design-system-and-ui-contracts.md`, `docs/architecture/12-i18n-and-content.md`, `docs/architecture/13-observability-error-handling-performance.md`, `docs/architecture/17-testing-ci-release.md`, `docs/architecture/18-ai-agent-guide.md`.
- ADR: `docs/architecture/adr/0002-single-expo-app-structure.md`, `docs/architecture/adr/0010-react-i18next-typed-keys.md`, `docs/architecture/adr/0011-design-system-runtime.md`, `docs/architecture/adr/0014-ota-disabled-for-mvp.md`.
- External implementation references to re-check before dependency approval: official Expo `create-expo-app`, Expo Router installation, SDK 55, and New Architecture docs. Treat package versions and template names as current-at-install-time facts, not plan-locked facts.

---

## Context

The repo is currently documentation-first. It has architecture docs, root `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json`, `design-tokens.json`, design handoff artifacts under `docs/design/v1/`, and design extraction scripts. It does not have `package.json`, `app/`, `src/`, root `supabase/`, generated `ios/`, or generated `android/`.

`PUP-7` has completed repo-native design handoff work and is blocked for native token/primitives/i18n/gallery phases until this scaffold exists. The foundation roadmap also identifies `PUP-2` as the prerequisite for later CI/local gates (`PUP-4`) and Supabase/RLS work (`PUP-3`).

- **Context package:** `PUP-2`, this plan, `AGENTS.md`, the primary source docs above, `docs/plans/README.md`, `docs/plans/active/2026-05-21-phase-0-architecture-cleanup.md`, and `docs/plans/active/2026-05-21-design-handoff-agent-gallery.md`.
- **Context placement:** Linear holds concise status and verification evidence, this plan holds implementation context, and the PR will hold final changed-file and command evidence.
- **Ownership area:** app scaffold, routing shell, initial package scripts, and boundary folders/placeholders.
- **Current constraint:** dependency approval was granted for local PUP-2 scaffold work on 2026-05-22. Remote, release, production, commit, push, PR, EAS, store, and Supabase production actions remain unapproved.

## Goals

1. **Create the Expo native baseline.**
   - Add the SDK 55 app scaffold using npm and Expo Router.
   - Keep the app managed by Expo; do not track or directly edit generated `ios/` or `android/`.
   - Keep OTA/EAS Update off for MVP.

2. **Establish the route shell and app boundary.**
   - `app/` contains route/layout wiring only.
   - Primary tabs are exactly `Today | Health | More`.
   - Quick Log is a persistent action/FAB and modal route, not a tab.

3. **Prepare architecture boundaries without implementing product features.**
   - Create the target `src/` ownership areas with lightweight README or minimal shell modules only where implementation needs them.
   - Use existing root string files for visible shell labels; do not introduce raw user-facing strings.
   - Prepare query, observability, analytics, queue, storage, notifications, contracts, and design boundaries for later plans.

4. **Add minimal local gates.**
   - Provide `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run check`.
   - Keep tests/checks small but executable, focused on route/i18n/scaffold invariants.

## Non-Goals

- Do not implement onboarding, puppy profile creation, Today cards, Health records, More settings, Quick Log saving, Timeline, sharing, reminders, analytics, or observability runtime behavior beyond shell placeholders.
- Do not add Supabase migrations, Edge Functions, RLS policies, or pgTAP tests.
- Do not add production service configuration, EAS builds, TestFlight, Play Internal Testing, OTA updates, or release workflows.
- Do not add CI/branch protection beyond local scripts; `PUP-4` owns broader verification gates.
- Do not migrate design tokens into native primitives beyond minimal scaffold support; `PUP-7` owns token pipeline and native design gallery phases after this.
- Do not commit, push, create PRs, or run remote/release actions without explicit approval for that exact action.

## Product Decisions Locked In

1. **Scaffold import strategy**
   - **Chosen:** generate the Expo SDK 55 template in a temporary directory, then copy only reviewed scaffold files into the existing repo.
   - **Reason:** the current repo is not empty and already contains source-of-truth docs, design artifacts, and scripts that must not be overwritten by a template generator.

2. **Package manager**
   - **Chosen:** npm.
   - **Reason:** `PUP-2` verification commands are `npm run ...`, and the repo has no existing lockfile or package manager convention.

3. **Route shell**
   - **Chosen:** Expo Router with route groups for auth/onboarding/tabs/modals/deep links.
   - **Reason:** matches PRD, architecture, and ADR-0002.

4. **Feature surface**
   - **Chosen:** placeholder shell screens only, backed by i18n keys and minimal design primitives/wrappers.
   - **Reason:** acceptance requires a scaffold and route boundaries, not product behavior.

5. **Boundary placeholders**
   - **Chosen:** add README/placeholders for future shared areas unless a minimal module is needed by the shell.
   - **Reason:** avoids fake abstractions while making ownership visible for future agents.

## Invariants And Executable Spec

- **Acceptance mapping:** Linear `PUP-2` -> this plan -> static/TypeScript checks -> final PR verification evidence.

- **Invariant 1:** `app/` remains route/layout-only.
  - **Check:** lint/static check rejects business hooks, Supabase imports, raw product modules, and non-route logic in `app/`.

- **Invariant 2:** primary tabs are exactly Today, Health, and More.
  - **Check:** `src/contracts/navigation.ts` exports the primary tab contract and a script or test asserts the exact list.

- **Invariant 3:** Quick Log is not a tab.
  - **Check:** navigation contract asserts Quick Log is represented as a persistent action/modal route and is absent from primary tabs.

- **Invariant 4:** shell user-facing labels come from i18n resources.
  - **Check:** shell tab/FAB label keys resolve in EN/RU/ES and a parity check covers the keys used by the scaffold.

- **Invariant 5:** generated native folders are not edited or tracked.
  - **Check:** `git status --short` and `git check-ignore ios android` confirm generated native directories stay ignored if created locally.

- **Invariant 6:** local gates are real commands.
  - **Check:** `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run check` run successfully or fail for actionable scaffold issues.

Important PuppyPlan invariants that still apply:

- Supabase Postgres remains the durable source of truth once backend work starts.
- RLS and Edge Functions enforce access; UI guards are convenience only.
- TanStack Query owns server state; Zustand owns UI/workflow state only.
- No raw puppy names, notes, emails, provider names, photos, tokens, or production data in logs, fixtures, docs, screenshots, or PR text.

## File Map

### App Shell
- `package.json` - Expo scripts and dependency manifest.
- `package-lock.json` - npm lockfile generated from approved dependency install.
- `app.config.ts` - Expo app config, typed routes, scheme `puppyplan`, no OTA/EAS Update enablement.
- `tsconfig.json` - strict TypeScript config compatible with Expo.
- `eslint.config.*` or generated Expo ESLint config - lint baseline.
- `expo-env.d.ts` - Expo CLI generated local type support; ignored through the Expo-managed `.gitignore` block.
- `app/_layout.tsx` - root layout and provider wiring only.
- `app/(tabs)/_layout.tsx` - tab labels/icons/action wiring only.
- `app/(tabs)/today/index.tsx` - imports Today shell screen only.
- `app/(tabs)/health/index.tsx` - imports Health shell screen only.
- `app/(tabs)/more/index.tsx` - imports More shell screen only.
- `app/(auth)/_layout.tsx` - auth group placeholder only if the template/router needs it.
- `app/(onboarding)/_layout.tsx` - onboarding group placeholder only if needed.
- `app/(modals)/quick-log/index.tsx` - Quick Log modal/sheet shell.
- `app/invite/[token].tsx` - deep-link placeholder route with no token logging.
- `app/share/[token].tsx` - deep-link placeholder route with no token logging.

### Feature Shells
- `src/features/today/screens/TodayScreen.tsx` - placeholder screen, no data fetching.
- `src/features/health/screens/HealthScreen.tsx` - placeholder screen, no health behavior.
- `src/features/more/screens/MoreScreen.tsx` - placeholder screen, no settings behavior.
- `src/features/quick-log/screens/QuickLogShell.tsx` - placeholder shell only.

### Design
- `src/design/README.md` - ownership and PUP-7 handoff note.
- `src/design/primitives/Screen.tsx` - minimal safe-area/surface wrapper if needed by shell screens.
- `src/design/primitives/AppText.tsx` - minimal text wrapper if needed by shell screens.
- `src/design/primitives/FAB.tsx` - minimal Quick Log action wrapper if needed by tab layout.
- `src/design/tokens/README.md` - token pipeline deferred to PUP-7.

### Contracts
- `src/contracts/navigation.ts` - primary tabs, modal routes, deep-link route names, and i18n key references.
- `src/contracts/README.md` - future Zod/business-rule contract boundary.

### Shared Runtime Boundaries
- `src/lib/providers/AppProviders.tsx` - root provider composition; kept outside `src/app` because Expo Router treats `src/app` as a route root when present.
- `src/lib/i18n/` - minimal shell i18n resources and key typing for existing EN/RU/ES root strings.
- `src/lib/query/README.md` - TanStack Query boundary deferred until server-state work.
- `src/lib/supabase/README.md` - raw client boundary deferred until `PUP-3`.
- `src/lib/queue/README.md` - Quick Log durable queue boundary deferred until Quick Log work.
- `src/lib/analytics/README.md` - analytics wrapper boundary deferred.
- `src/lib/observability/README.md` - Sentry wrapper boundary deferred.
- `src/lib/notifications/README.md` - notifications boundary deferred.
- `src/lib/storage/README.md` - storage boundary deferred.
- `src/state/README.md` - Zustand UI/workflow state boundary deferred.
- `src/test/README.md` - test harness convention.

### Scripts And Checks
- `scripts/checks/check-navigation-contract.mjs` - static route/tab contract check.
- `scripts/checks/check-shell-i18n.mjs` - EN/RU/ES shell key parity check.

### Backend / Supabase
- Do not create root `supabase/` placeholders in `PUP-2` unless a later implementation note proves the scaffold needs them. `PUP-3` owns root Supabase migrations, functions, tests, seed files, and backend boundary setup.
- `src/lib/supabase/README.md` is enough for the client-side raw Supabase import boundary in this scaffold.

### Docs
- `docs/plans/README.md` - add this active plan to the index.
- `docs/plans/completed/2026-05-22-scaffold-expo-app-baseline.md` - this plan.
- `README.md` - update Local Setup only after scripts exist.

## Contracts, Schema, And Permissions

### Zod Contracts

- [x] No product Zod schema is required for scaffold-only work.
- [x] Add `src/contracts/navigation.ts` as a TypeScript contract, not a product data schema.
- [x] Do not add payload shapes for events, puppies, health, sharing, or reminders in this issue.

### Database / RLS

- [x] Migration required: no.
- [x] Destructive migration risk reviewed: N/A.
- [x] RLS policy impact reviewed: no runtime permission changes in this plan.
- [x] pgTAP tests required: no for `PUP-2`.

### Edge Functions

- [x] Edge Function required: no.
- [x] Invite/share token resolution routes are placeholders only; no token handling logic is implemented here.

## UX Spec

### Navigation And Entry Points

- Primary tabs: Today, Health, More.
- Persistent action: Quick Log FAB/action visible on primary tabs.
- Modal route: Quick Log shell opens from the persistent action.
- Deep-link placeholders: invite and share token routes exist but must not log or reveal token values.
- Dev-only routes: do not add `_dev/components` yet unless `PUP-7` is explicitly continued in the same branch.

### States

`PUP-2` does not implement full screen-state behavior. Each shell screen may render a neutral placeholder state only. Required states stay documented in `DESIGN.md` and will be implemented by feature-specific plans.

### Accessibility

- [x] Tab labels, selected states, and hints use i18n keys from EN/RU/ES resources.
- [x] Quick Log action target is 56pt+.
- [x] Quick Log action has an accessibility label and hint from i18n.
- [x] Shell placeholders do not rely on color alone.
- [x] No fixed-height text containers that would block future Dynamic Type work.

### i18n And String Budgets

- [x] No raw user-facing strings in route/screen code.
- [x] Existing `STRINGS.en.json`, `STRINGS.ru.json`, and `STRINGS.es.json` tab/FAB keys are used.
- [x] Shell i18n parity check covers the keys referenced by the scaffold.
- [x] Full typed-key generation and string-budget pipeline are deferred to `PUP-4`/`PUP-7`.

## Privacy, Analytics, And Observability

- [x] Do not add analytics events in `PUP-2`.
- [x] Do not initialize Sentry/PostHog directly in feature code.
- [x] Do not log invite/share route tokens.
- [x] Use synthetic placeholder content only.
- [x] Do not add screenshots with private data.

## Implementation Plan

### Phase 0 - Read And Lock Scope

**Files:**
- Read: `AGENTS.md`
- Read: `PUP-2`
- Read: source docs and ADRs listed above.
- Read: `docs/plans/README.md`
- Read: `docs/plans/active/2026-05-21-phase-0-architecture-cleanup.md`
- Read: `docs/plans/active/2026-05-21-design-handoff-agent-gallery.md`

**Checklist:**
- [x] Confirm goals and non-goals.
- [x] Confirm branch name from Linear.
- [x] Confirm current repo has no Expo scaffold, `app/`, `src/`, `package.json`, or lockfile.
- [x] Confirm `PUP-7` native implementation phases are blocked on this scaffold.
- [x] Confirm no schema/RLS/production/release action belongs in `PUP-2`.

**Acceptance criteria:**
- Scope is explicit enough to implement without guessing.

### Phase 1 - Dependency Approval And Scaffold Import

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `app.config.ts`
- Create/Modify: `tsconfig.json`
- Create/Modify: Expo/ESLint generated config files as needed.

**Checklist:**
- [x] Ask the user for explicit approval to add the Expo/RN scaffold dependencies before running install/scaffold commands.
- [x] Generate an Expo SDK 55 template in a temporary directory, not directly over the repo root.
- [x] Compare generated files against existing repo files before copying.
- [x] Copy only required scaffold/package/config files into the repo.
- [x] Set package scripts: `lint`, `typecheck`, `test`, `check`.
- [x] Ensure `app.config.ts` has scheme `puppyplan`, typed routes enabled, and no OTA/EAS Update enablement.
- [x] Confirm `ios/` and `android/` remain ignored and untracked.

**Acceptance criteria:**
- Expo package baseline exists without overwriting docs/design artifacts.
- Dependency addition was explicitly approved and recorded in Linear/PR evidence.

### Phase 2 - Route Shell And Navigation Contract

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/today/index.tsx`
- Create: `app/(tabs)/health/index.tsx`
- Create: `app/(tabs)/more/index.tsx`
- Create: `app/(modals)/quick-log/index.tsx`
- Create: `app/invite/[token].tsx`
- Create: `app/share/[token].tsx`
- Create: `src/contracts/navigation.ts`
- Create: `src/features/today/screens/TodayScreen.tsx`
- Create: `src/features/health/screens/HealthScreen.tsx`
- Create: `src/features/more/screens/MoreScreen.tsx`
- Create: `src/features/quick-log/screens/QuickLogShell.tsx`

**Checklist:**
- [x] Write the navigation contract before wiring route files.
- [x] Use `Today | Health | More` as the only primary tabs.
- [x] Wire Quick Log as a persistent action/FAB and modal route, not a tab.
- [x] Keep route files thin: route imports and layout options only.
- [x] Keep invite/share route placeholders from logging raw route params.

**Acceptance criteria:**
- Navigation shape matches PRD/DESIGN/architecture.
- `app/` contains no product business logic or raw Supabase access.

### Phase 3 - Minimal Shared Boundaries

**Files:**
- Create: `src/lib/providers/AppProviders.tsx`
- Create: `src/design/README.md`
- Create: `src/design/primitives/Screen.tsx` if needed by shell screens.
- Create: `src/design/primitives/AppText.tsx` if needed by shell screens.
- Create: `src/design/primitives/FAB.tsx` if needed by the Quick Log action.
- Create: `src/lib/i18n/...`
- Create README/placeholders under `src/lib/query`, `src/lib/supabase`, `src/lib/queue`, `src/lib/analytics`, `src/lib/observability`, `src/lib/notifications`, `src/lib/storage`, `src/state`, and `src/test`.

**Checklist:**
- [x] Add only minimal primitives/providers required by the shell.
- [x] Use existing root EN/RU/ES string files for tab/FAB labels and hints.
- [x] Avoid raw colors/spacing/icons in feature code; keep temporary styling in design-owned wrappers.
- [x] Do not add TanStack Query, Supabase, Zustand, Sentry, PostHog, or notification runtime code unless separately approved and required by scaffold execution.

**Acceptance criteria:**
- Future ownership areas are visible, but no fake product data layer is introduced.

### Phase 4 - Local Verification Scripts

**Files:**
- Create: `scripts/checks/check-navigation-contract.mjs`
- Create: `scripts/checks/check-shell-i18n.mjs`
- Modify: `package.json`
- Modify: `README.md`

**Checklist:**
- [x] Implement a navigation contract check for the exact tab list and Quick Log exclusion.
- [x] Implement a shell i18n key parity check for tab/FAB keys in EN/RU/ES.
- [x] Make `npm run test` run the scaffold checks or the chosen minimal test runner.
- [x] Make `npm run check` aggregate lint, typecheck, and test.
- [x] Update README Local Setup after scripts exist.

**Acceptance criteria:**
- The four `PUP-2` verification commands are executable and documented.

### Phase 5 - Plan, Linear, And Handoff Cleanup

**Files:**
- Modify: `docs/plans/README.md`
- Modify: this plan changelog.
- Optional Modify: `docs/plans/active/2026-05-21-design-handoff-agent-gallery.md` only if implementation unblocks or changes its dependency note.

**Checklist:**
- [x] Record executed verification commands and outcomes in this plan changelog.
- [x] Mirror progress and final verification evidence to Linear `PUP-2`.
- [x] Remove `needs-plan` only after this repo plan exists and has been linked from Linear.
- [x] Use `agent-ready` only when the task has enough context to start without guessing; if dependency approval is still missing, keep/add `blocked` until approval is granted.
- [x] Move Linear to `In Review` only after scaffold verification passes.

**Acceptance criteria:**
- A reviewer can evaluate `PUP-2` from the plan, changed files, and Linear evidence without reconstructing chat context.

## Verification Checklist

Run what exists after each relevant phase and record exact results in the changelog.

### Local Code Gates

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run check`

### Scaffold/Boundary Gates

- [x] `git status --short`
- [x] `git check-ignore ios android`
- [x] static check that `app/` has no raw Supabase imports.
- [x] static check that Quick Log is not in primary tabs.
- [x] shell i18n parity check for EN/RU/ES tab/FAB keys.

### Supabase / Contract Gates

- [x] No Supabase migration required.
- [x] No RLS pgTAP test required.
- [x] No generated DB type required.

### UI / Mobile Gates

- [x] Expo starts successfully if a local dev server is run.
- [x] Primary tabs render with Today/Health/More labels.
- [x] Quick Log action opens the modal shell.
- [x] No generated `ios/` or `android/` edits are included.

### Release / Platform Gates

- [x] No EAS/TestFlight/Play/Supabase production action run.
- [x] OTA/EAS Update remains off for MVP.
- [x] Deep-link placeholders do not log invite/share tokens.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| `create-expo-app` overwrites existing docs or design artifacts. | Generate in a temporary directory and copy reviewed files only. |
| Scaffold pulls in broad product dependencies too early. | Install only the approved Expo/router/i18n/test baseline; defer Supabase/TanStack/Zustand/Sentry/PostHog unless explicitly approved. |
| Placeholder screens create raw strings or design drift. | Use existing EN/RU/ES keys and minimal design-owned wrappers. |
| `app/` becomes a product logic dumping ground. | Add a navigation/static check and keep route files route-only. |
| Generated native folders appear from local tooling. | Keep `ios/` and `android/` ignored, untracked, and out of implementation diffs. |
| PUP-2 overlaps with PUP-7 token/primitives work. | Keep design runtime minimal and document PUP-7 as the owner of token generation, native primitive expansion, and `_dev/components`. |
| Expo config tooling keeps a transitive `uuid` advisory open through `xcode@3.0.1`. | Use a scoped npm override for `xcode` -> `uuid@11.1.1`; verify `xcode` still generates PBX UUIDs and rerun audit plus Expo checks. |

## Open Questions / Approvals

- **Approval received:** local dependency installation for the PUP-2 scaffold was approved in the goal prompt on 2026-05-22.
- **No product blocker:** `PUP-2` implementation is local-only and remains inside the scaffold shell scope.
- **Dependency audit:** `npm audit --omit=dev --audit-level=moderate` passes after a scoped transitive `uuid` override; no Expo downgrade or force fix was applied.
- **Reference project note:** `<other-local-project>` was inspected as an Expo reference. Its EAS project IDs, OTA update config, bundle/package IDs, and submission settings were not copied because PuppyPlan MVP keeps OTA/EAS Update off and remote/release configuration still requires explicit approval.

## Changelog

- 2026-05-22: Initial `PUP-2` scaffold plan created; Linear moved to In Progress; branch `dimaselenya/pup-2-scaffold-expo-app-baseline` created locally.
- 2026-05-22: Review follow-up clarified Linear label rules, changed Expo docs note from checked fact to re-check-at-implementation requirement, deferred root `supabase/` placeholders to `PUP-3`, and recorded that Linear was synced with labels/comment.
- 2026-05-22: Re-checked official Expo docs, recorded local dependency approval in Linear, generated an SDK 55 template in `/tmp`, imported reviewed scaffold/config files, added root `app/` routes, minimal `src/` boundaries, shell i18n, navigation contract checks, and README setup instructions. `npm install`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run check` passed. `npx expo start --localhost --port 8082` started Metro successfully after moving providers out of `src/app` so Expo Router uses root `app/`. Browser smoke on `http://localhost:8082/today` verified Today/Health/More labels and opened the Quick Log modal shell.
- 2026-05-22: Final verification evidence mirrored to Linear; `PUP-2` moved to `In Review`; plan moved to `docs/plans/completed/`.
- 2026-05-22: Addressed deep-review follow-up by adding a modal group layout for Quick Log, extending scaffold checks so shell `t('...')` keys must be listed in `shellI18nKeys`, adding the missing `more.sections.support` contract key, and syncing Reanimated architecture docs with the SDK 55 scaffold. `npm run check`, `git diff --check HEAD`, `npx expo install --check`, and browser smoke on `http://localhost:8083/today` passed.
- 2026-05-22: Addressed second-agent follow-up by adding explicit Babel configuration through the SDK 55 Expo preset, adding a scaffold guardrail check for worklets plugin support, typed routes config, and app/src console logging, hardening shell i18n key extraction for single quotes, double quotes, and static template literals, and documenting scaffold-token, locale-runtime, scroll-first Screen, and test-harness follow-ups for PUP-7/PUP-4.
- 2026-05-22: Inspected the existing Expo app at `<other-local-project>` for reusable local patterns. Kept PuppyPlan EAS/OTA/release config untouched, then closed the remaining transitive Expo tooling audit finding with a scoped `xcode` -> `uuid@11.1.1` override. Verified `npm audit --omit=dev --audit-level=moderate`, `node -e` PBX UUID generation through `xcode`, `npm run check`, `npx expo install --check`, `npx expo config --type public --json`, and `git diff --check HEAD`.
