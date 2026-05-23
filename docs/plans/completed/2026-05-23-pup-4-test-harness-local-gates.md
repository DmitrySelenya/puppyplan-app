# PUP-4 Test Harness And Local Gates - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, the repo-local `plan`, `implement`, `tdd`, and `review-deep` skills, and this plan task-by-task. Do not skip verification evidence.
> Living document: update this file as package scripts, test conventions, CI/local gates, or verification evidence change.

**Goal:** Add a real Expo/React Native test harness, lightweight CI metadata checks, and keep `npm run check` as the standard local verification gate before product logic lands.

**Status:** Completed.

**Completed:** Merged to `main` via PR #3 on 2026-05-23.

**Plan type:** Linear task plan for `PUP-4`.

**Architecture:** This extends the `PUP-2` Expo SDK 55 scaffold with Jest/RNTL tests, Node guardrail tests, lightweight GitHub Actions, and local gates. It does not change product data shapes, Supabase schema, RLS, runtime services, navigation IA, or generated native projects.

**Linear:** `PUP-4` - https://linear.app/dmitryselenya/issue/PUP-4/set-up-ci-and-local-verification-gates

**Branch:** `dimaselenya/pup-4-set-up-ci-and-local-verification-gates`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - mobile stack, workstreams, Week 2 mobile foundation, test matrix.
- Design: `DESIGN.md` - non-negotiable IA, i18n contract, QA checklist.
- Architecture: `docs/architecture/00-overview.md`, `02-repo-structure-and-ownership.md`, `05-navigation-and-deeplinks.md`, `06-design-system-and-ui-contracts.md`, `12-i18n-and-content.md`, `17-testing-ci-release.md`, `18-ai-agent-guide.md`.
- Agent workflow: `docs/agents/00-operating-model.md`, `docs/agents/context-engineering.md`, `docs/agents/linear-workflow.md`.
- Prior plan: `docs/plans/completed/2026-05-22-scaffold-expo-app-baseline.md`.
- ADR: `docs/architecture/adr/0002-single-expo-app-structure.md`, `0010-react-i18next-typed-keys.md`, `0011-design-system-runtime.md`, `0014-ota-disabled-for-mvp.md`.

---

## Context

`PUP-2` created the Expo SDK 55 app shell with route/static guardrail scripts. `src/test/README.md` explicitly defers Jest/RNTL to `PUP-4`, so future feature work currently lacks render/unit coverage for app shell, design primitives, i18n, and navigation invariants.

- **Context package:** `PUP-4`, this plan, `AGENTS.md`, the source docs above, current `package.json`, `tsconfig.json`, `eslint.config.mjs`, `app/`, `src/`, `scripts/checks/`, and advisory project graph output.
- **Context placement:** Linear holds concise status and verification evidence; this plan holds implementation context and the verification log.
- **Ownership area:** local verification gates, CI metadata checks, test harness config, focused shell/design/i18n/navigation tests, and docs updates.
- **Completion note:** user approved the dev-only test harness dependencies for `PUP-4`, then separately approved local commit, branch push, and PR creation for PR #3. Product/runtime dependencies, release/EAS/production actions, and Supabase production actions remained out of scope and were not run.

## Goals

1. **Install a compatible test harness.**
   - Use `jest-expo` and `@testing-library/react-native` with Jest, following Expo SDK 55/React 19 guidance.
   - Use only React Native Testing Library APIs in tests.

2. **Keep local gates unified and cheap.**
   - `npm run test` runs Jest/RNTL tests, Node guardrail tests, and existing scaffold guardrails.
   - `npm run check` remains `lint + typecheck + test`.

3. **Add focused invariant tests before product logic.**
   - Cover app shell rendering, design primitive accessibility/tokens, i18n startup resources, tab-layout FAB behavior, and navigation/FAB invariants.
   - Keep tests synthetic and privacy-safe.

4. **Close initial PUP-4 guardrail acceptance.**
   - Add a PR metadata workflow that requires `PUP-___` or an explicit no-Linear exception reason in PR title/body.
   - Add local privacy/secret and text hygiene scanners to `npm run check`.
   - Run the same local gate from CI on pull requests.

## Non-Goals

- Do not implement onboarding, puppy profile, Today cards, Health records, More settings, Quick Log saving, sharing, reminders, analytics, or observability runtime behavior.
- Do not add Supabase schema, migrations, Edge Functions, RLS policies, pgTAP, EAS, Maestro, release workflows, or production configuration.
- Do not add product/runtime dependencies without separate approval.
- Do not commit, push, create PRs, run EAS, deploy, publish, migrate, or mutate production/remote systems without exact approval.

## Product Decisions Locked In

1. **Harness**
   - **Chosen:** `jest-expo` + Jest + `@testing-library/react-native`.
   - **Reason:** Expo documents `jest-expo` as the Jest preset for Expo projects and recommends RNTL for React Native component tests.

2. **React 19 renderer peer**
   - **Chosen:** stable RNTL `13.3.3` with `react-test-renderer@19.2.0` pinned exactly to the app's React version as a dev-only peer.
   - **Reason:** Expo SDK 55's installer resolves stable RNTL `13.3.3`; npm otherwise selects `react-test-renderer@19.2.6`, which conflicts with `react@19.2.0`. RNTL `14.0.0-rc.0` uses the newer `test-renderer`, but npm rejects the prerelease against `expo-router`'s peer range without `--force`/`--legacy-peer-deps`, so it is not used in this pass.

3. **Gate shape**
   - **Chosen:** split scripts into unit render tests, Node guardrail tests, and scaffold static checks, then compose them through `npm run test` and `npm run check`.
   - **Reason:** future feature tests need a normal Jest command while existing route/i18n/guardrail scripts must continue to run.

4. **CI shape**
   - **Chosen:** two lightweight GitHub Actions: PR metadata validation and `npm run check`.
   - **Reason:** PUP-4 requires PR tracking enforcement and CI rejection of text/privacy drift, but release/EAS/Supabase gates remain out of scope until those systems exist.

## Invariants And Executable Spec

- **Acceptance mapping:** Linear `PUP-4` -> this plan -> Jest/RNTL tests + Node guardrail tests + scaffold scripts + GitHub Actions -> local verification evidence -> Linear comment.

- **Invariant 1:** primary tabs are exactly Today, Health, More and Quick Log is not a tab.
  - **Test:** `src/test/navigation-contract.test.ts`.

- **Invariant 2:** shell i18n supports EN/RU/ES, and every shell key resolves to real localized text without falling back to the key.
  - **Test:** `src/test/i18n.test.ts`.
  - **Coverage:** shell keys, placeholder parity, documented count-bearing `{n}` keys, and runtime interpolation for simple `{name}` syntax.

- **Invariant 3:** initial app shell screens render through `AppProviders` with localized content and no product data fixtures.
  - **Test:** `src/test/app-shell.render.test.tsx`.

- **Invariant 4:** design primitives preserve baseline accessibility and touch-target contracts for the scaffold.
  - **Test:** `src/test/design-primitives.render.test.tsx`.

- **Invariant 5:** existing static scaffold guardrails keep running from `npm run test`.
  - **Test:** `npm run test:scaffold` and `npm run check`.

- **Invariant 6:** PRs must declare `PUP-___` or a no-Linear exception reason.
  - **Test:** `scripts/checks/pr-metadata.test.mjs`.
  - **CI:** `.github/workflows/pr-metadata.yml`.

- **Invariant 7:** obvious private-looking emails, token patterns, and forbidden private-data fixture placeholders are blocked from the local gate.
  - **Test:** `scripts/checks/privacy-scan.test.mjs`.
  - **Gate:** `scripts/checks/privacy-scan.mjs` inside `npm run test:scaffold`.

- **Invariant 8:** tracked text/Markdown files stay free of trailing whitespace and missing final newlines.
  - **Test:** `scripts/checks/text-hygiene.test.mjs`.
  - **Gate:** `scripts/checks/text-hygiene.mjs` inside `npm run test:scaffold`.

Important PuppyPlan invariants still apply:

- No raw puppy names, notes, emails, provider names, photos, invite/share tokens, push tokens, or production data in tests, logs, docs, screenshots, Linear, or PR text.
- `app/` stays thin and route/layout-only.
- UI uses `src/design` primitives and typed i18n keys.
- Generated `ios/` and `android/` files are not edited directly.

## File Map

### Package And Test Config
- `package.json` - add Jest scripts and Jest config reference.
- `package-lock.json` - npm lockfile from approved dev dependency install.
- `jest.config.js` - `jest-expo` preset and path alias mapping.
- `src/test/setup.ts` - test runtime setup for native safe-area mocking and known third-party console noise.
- `src/test/README.md` - document test convention.

### Tests
- `src/test/navigation-contract.test.ts` - navigation and Quick Log invariant tests.
- `src/test/i18n.test.ts` - supported locale, shell key, placeholder parity, and count-key tests.
- `src/test/app-shell.render.test.tsx` - shell screen render tests.
- `src/test/design-primitives.render.test.tsx` - design primitive render/a11y tests.
- `src/test/tab-layout.render.test.tsx` - actual tab layout and persistent Quick Log FAB behavior tests.

### Node Guardrails
- `scripts/checks/pr-metadata.mjs` / `.test.mjs` - PR title/body work tracking validation.
- `scripts/checks/privacy-scan.mjs` / `.test.mjs` - obvious private-looking email, token, and fixture scan.
- `scripts/checks/text-hygiene.mjs` / `.test.mjs` - trailing whitespace and final-newline scan.

### Existing Guardrails
- `scripts/checks/check-navigation-contract.mjs` - preserve.
- `scripts/checks/check-shell-i18n.mjs` - preserve.
- `scripts/checks/check-scaffold-guardrails.mjs` - preserve.

### Docs
- `docs/plans/README.md` - add active plan entry.
- `docs/plans/completed/2026-05-23-pup-4-test-harness-local-gates.md` - this plan and verification log.

### CI
- `.github/workflows/pr-metadata.yml` - PR title/body work tracking guard.
- `.github/workflows/verification.yml` - pull request and main-branch `npm run check` gate.

## Contracts, Schema, And Permissions

### Zod Contracts

- [x] Product Zod schema change required: no.
- [x] Contract tests required for product payloads: no.
- [x] Existing navigation TypeScript contract gets focused tests.

### Database / RLS

- [x] Migration required: no.
- [x] Destructive migration risk reviewed: N/A.
- [x] RLS policy impact reviewed: no runtime permission changes.
- [x] pgTAP tests required: no for this harness-only pass.

### Edge Functions

- [x] Edge Function required: no.
- [x] Privileged operations changed: no.

## UX Spec

### Navigation And Entry Points

- Primary tabs remain `Today | Health | More`.
- Quick Log remains a persistent FAB/action and modal route, not a tab.
- Invite/share deep-link placeholders remain neutral and must not expose token values.

### States

This plan does not implement new product screen states. Tests may render existing neutral shell placeholders only.

### Accessibility

- [x] Quick Log/FAB target stays 56pt+.
- [x] FAB has button role, label, and hint.
- [x] Scaffold text primitives allow font scaling.
- [x] No Dynamic Type screenshot requirement in this local harness pass because no real product screen layout changes.

### i18n And String Budgets

- [x] No raw user-facing strings added in UI code.
- [x] EN/RU/ES shell keys resolve in tests and static checks.
- [x] Placeholder parity and current count-bearing strings are covered.
- [x] String-budget pipeline remains deferred until token/i18n work continues, but current shell key checks stay in the gate.

## Privacy, Analytics, And Observability

- [x] Analytics events added/updated: no.
- [x] Observability wrappers changed: no.
- [x] Test fixtures use synthetic, non-private strings only.
- [x] Obvious private-looking emails, token patterns, and forbidden private-data fixture placeholders are checked locally.
- [x] No screenshots with private data.
- [x] Platform privacy/compliance declarations unchanged.

## Implementation Plan

### Phase 0 - Read And Lock Scope

**Files:**
- Read: `AGENTS.md`
- Read: `PUP-4`
- Read: source docs listed above.
- Read: current scaffold files, scripts, and `src/test/README.md`.

**Checklist:**
- [x] Confirm goals and non-goals.
- [x] Confirm branch name from Linear.
- [x] Confirm dependency approval covers dev-only harness dependencies.
- [x] Confirm no schema/RLS/production/release action belongs in `PUP-4`.

**Acceptance criteria:**
- Scope is explicit enough to implement without guessing.

---

### Phase 1 - Harness Dependencies And Config

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create/modify: `jest.config.js`
- Create/modify: `src/test/setup.ts` if required
- Modify: `src/test/README.md`

**Checklist:**
- [x] Install only approved dev dependencies for Jest/Expo/RNTL.
- [x] Configure Jest with `jest-expo`.
- [x] Preserve existing scaffold guardrails via `npm run test`.
- [x] Run an initial targeted test command and record result.

**Acceptance criteria:**
- Jest can discover and run TypeScript/TSX tests without native runtime or product services.

---

### Phase 2 - Focused Shell/Design/i18n/Navigation Tests

**Files:**
- Create: `src/test/navigation-contract.test.ts`
- Create: `src/test/i18n.test.ts`
- Create: `src/test/app-shell.render.test.tsx`
- Create: `src/test/design-primitives.render.test.tsx`

**Checklist:**
- [x] RED: add focused tests and verify they fail before the harness/config is complete or for the intended missing coverage.
- [x] GREEN: make only minimal config or production-safe test-support changes needed to pass.
- [x] REFACTOR: keep tests clear and avoid testing mock behavior.
- [x] Run targeted Jest tests and record result.

**Acceptance criteria:**
- Tests cover existing scaffold invariants without introducing product logic or private fixtures.

---

### Phase 3 - Hardening, Docs, And Linear Evidence

**Files:**
- Modify: `docs/plans/README.md`
- Modify: this plan
- Update: Linear `PUP-4`

**Checklist:**
- [x] Run `npm run check`.
- [x] Run `npm audit --omit=dev --audit-level=moderate`.
- [x] Run `npx expo install --check`.
- [x] Run `git diff --check`.
- [x] Deep-review the local diff against PuppyPlan boundaries.
- [x] Record verification evidence in this plan and Linear.

**Acceptance criteria:**
- PUP-4 can move to local review with fresh evidence and no release/remote actions.

---

### Phase 4 - Deep Review Fixes And Full PUP-4 Gates

**Files:**
- Create: `.github/workflows/pr-metadata.yml`
- Create: `.github/workflows/verification.yml`
- Create: `scripts/checks/pr-metadata.mjs`
- Create: `scripts/checks/pr-metadata.test.mjs`
- Create: `scripts/checks/privacy-scan.mjs`
- Create: `scripts/checks/privacy-scan.test.mjs`
- Create: `scripts/checks/text-hygiene.mjs`
- Create: `scripts/checks/text-hygiene.test.mjs`
- Create: `src/test/tab-layout.render.test.tsx`
- Modify: `src/test/i18n.test.ts`
- Modify: `src/lib/i18n/index.ts`
- Modify: `package.json`
- Modify: `src/test/README.md`
- Modify: this plan and Linear `PUP-4`

**Checklist:**
- [x] RED: Node guardrail tests fail before `pr-metadata`, `privacy-scan`, and `text-hygiene` modules exist.
- [x] RED: expanded i18n count-key test exposes that `{n}` does not interpolate with the documented simple-brace syntax.
- [x] GREEN: implement guardrail scripts and wire privacy/text hygiene into `npm run test:scaffold`.
- [x] GREEN: configure i18next interpolation for simple `{name}` placeholders.
- [x] Add actual `TabLayout` render coverage for the persistent Quick Log FAB and modal route push.
- [x] Add GitHub Actions for PR metadata and `npm run check`.
- [x] Run targeted and full verification.

**Acceptance criteria:**
- Full local PUP-4 acceptance is covered by executable scripts, tests, or CI workflow files without running remote/release actions.

## Verification Checklist

Run and record exact results before claiming completion:

- [x] `npm run test:unit`
- [x] `npm run test:node`
- [x] `npm run test:scaffold`
- [x] `npm run test`
- [x] `npm run check`
- [x] `npm audit --omit=dev --audit-level=moderate`
- [x] `npx expo install --check`
- [x] `git diff --check`

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Jest/RNTL setup fights Expo Router or React 19. | Follow current Expo `jest-expo` guidance, avoid direct renderer APIs/snapshots, pin the dev-only renderer peer to React's exact version, and keep initial tests at shell/component boundaries. |
| Static guardrails are accidentally replaced by Jest-only tests. | Preserve them as `test:scaffold` and compose through `npm run test`. |
| Test mocks hide real behavior. | Prefer real providers/components; mock only unavoidable native/router boundaries and do not assert on mock internals. |
| Dev dependencies introduce runtime surface. | Install with `--dev`, verify `npm audit --omit=dev`, and review `package.json` dependency sections. |
| Scanner false positives block known safe project support copy. | Allowlist the single project support email while continuing to block private-looking personal emails and token patterns. |
| GitHub Actions could drift from local gate over time. | PR #3 provided remote CI evidence; keep `verification.yml` running `npm run check` so local and remote gates stay aligned. |
| Workflow action major tags are not pinned to commit SHAs. | Accept standard `@v4` tags for the initial lightweight gate; revisit SHA pinning if the project adopts stricter supply-chain hardening. |

## Changelog

- [2026-05-23]: Initial plan created after reading `PUP-4`, PUP-2 scaffold plan, and relevant PRD/DESIGN/architecture/agent docs.
- [2026-05-23]: Added Jest/RNTL harness config, dev-only dependencies, and focused tests for navigation, i18n, shell rendering, and design primitives. RED evidence: `npx jest src/test/navigation-contract.test.ts --runInBand` failed before Jest alias config with `Cannot find module '@/contracts/navigation'`. GREEN evidence: `npm run test:unit -- --runInBand` passed 4 suites / 15 tests, and `npm run test:scaffold` passed navigation, shell i18n, and scaffold guardrails.
- [2026-05-23]: Verification passed: `npm run test` passed 4 Jest suites / 15 tests plus scaffold guardrails; `npm run check` passed lint, typecheck, Jest, and scaffold guardrails; `npm audit --omit=dev --audit-level=moderate` found 0 vulnerabilities; `npx expo install --check` reported dependencies are up to date; `git diff --check` exited clean.
- [2026-05-23]: Local deep review found no blocking issues across security/access, correctness, tests, performance, or PuppyPlan platform compliance. Linear `PUP-4` was updated with verification evidence and left `In Progress` because commit/push/PR and local-only review-state approval were not granted.
- [2026-05-23]: Addressed deep-review gaps by adding PR metadata validation, CI `npm run check`, Node guardrail tests, privacy/secret scan, text hygiene scan, actual tab-layout FAB render coverage, and count/placeholder i18n coverage. RED evidence: `node --test scripts/checks/pr-metadata.test.mjs`, `privacy-scan.test.mjs`, and `text-hygiene.test.mjs` failed with `ERR_MODULE_NOT_FOUND` before modules existed; `npx jest src/test/i18n.test.ts src/test/tab-layout.render.test.tsx --runInBand` failed because `{n}` placeholders did not interpolate. GREEN evidence: `npm run check` passed lint, typecheck, 5 Jest suites / 19 tests, 25 Node tests, scaffold guardrails, privacy scan, and text hygiene scan. Linear `PUP-4` acceptance was checked off and moved to `In Review` with local verification evidence.
- [2026-05-23]: Addressed follow-up review notes by removing the locale-fragile digit assertion from the count-key i18n test, narrowing privacy scanner self-exclusion so future `scripts/**/*.test.mjs` files are scanned, removing common noun `Spot` from forbidden private fixture names, documenting simple-brace interpolation and `<br>` hard-break conventions in `src/test/README.md`, and recording workflow SHA pinning as future supply-chain hardening. Verification passed: `npm run check` passed 5 Jest suites / 19 tests, 27 Node tests, scaffold guardrails, privacy scan, and text hygiene scan; `git diff --check` exited clean.
- [2026-05-23]: Addressed deep-review fix requests by redacting privacy-scan failure output, making privacy/text scanners repo-rooted, tightening PR metadata validation to require matching title and Work Tracking issue IDs, disabling persisted checkout credentials in CI workflows, bounding direct Jest unit runs with `--runInBand`, and extending privacy fixture coverage to canonical legacy placeholders. RED evidence: `npm run test:node` failed on the new regression tests before implementation. GREEN evidence: `npm run check` passed lint, typecheck, 5 Jest suites / 19 tests, 33 Node tests, scaffold guardrails, privacy scan, and text hygiene scan; `git diff --check` exited clean.
- [2026-05-23]: Continued the final local review pass without commit/push/PR actions. Fresh verification passed: `npm run check` passed lint, typecheck, 5 Jest suites / 19 tests, 33 Node tests, scaffold guardrails, privacy scan, and text hygiene scan; `npm audit --omit=dev --audit-level=moderate` found 0 vulnerabilities; `npx expo install --check` reported dependencies are up to date; `git diff --check` exited clean; workflow YAML parsed locally with Ruby/Psych; privacy/text scanners also passed when invoked from `src/`.
- [2026-05-23]: Published and merged PR #3 after explicit approval for local commit, branch push, and PR creation. Post-merge verification on `main` passed: GitHub Actions `Verification` push run succeeded; local `npm run check` passed lint, typecheck, 5 Jest suites / 19 tests, 33 Node tests, scaffold guardrails, privacy scan, and text hygiene scan; `npm audit --omit=dev --audit-level=moderate` found 0 vulnerabilities; `npx expo install --check` reported dependencies are up to date; `git diff --check` exited clean. Moved this plan to `docs/plans/completed/`.
