# Expo Agent Toolchain - Implementation Plan

> Tooling-only plan. Product behavior, UI, schema, RLS, release, and production state are out of scope.

**Goal:** Give PuppyPlan a complete, repeatable Expo agent-development workflow across Codex, iOS, and Android.

**Status:** Local implementation complete; `PUP-43` in review.

**Current phase:** Review handoff - all local remediation and verification complete.

**Architecture:** Developer tooling around the existing Expo SDK 55 app. The change does not alter runtime product architecture, generated native projects, backend contracts, or production services.

**Linear:** `PUP-43`

**Branch:** Linear `gitBranchName` `dimaselenya/pup-43-set-up-complete-expo-agent-toolchain`; current working branch is intentionally unchanged because branch creation was not requested.

**TDD mode:** Heavy/full-isolated for lockfile-bound Expo execution, release fail-closed
guardrails, and deterministic device routing. RED, GREEN, and REFACTOR use separate agent contexts;
external tool installation is verified with syntax, schema, CLI doctor, device smoke, and existing
repository gates.

**Code-review remediation TDD mode:** Lightweight; reduced assurance because RED/GREEN/REFACTOR
were not context-isolated. The scope is limited to local tooling guards, with executable negative
tests and the full repository gate as evidence.

**Primary source docs:**
- PRD: N/A - no product scope changes.
- Design: N/A - no UI changes.
- Architecture: `docs/architecture/15-ios-runtime-and-compliance.md`, `docs/architecture/16-android-platform-and-play-gates.md`, `docs/architecture/17-testing-ci-release.md`
- Agent workflow: `docs/agents/00-operating-model.md`, `docs/agents/senior-pass.md`
- External: Expo MCP, agent-device, EAS JSON, and Maestro official documentation.

---

## Context

PuppyPlan already has Expo SDK 55, Expo Skills, XcodeBuildMCP, EAS CLI, Maestro CLI, an existing local iOS native build, and an approved SE simulator. It lacks the official Expo MCP connection, local `expo-mcp`, Android `adb`, `agent-device`, Codex run actions, a durable Maestro smoke flow, and `eas.json`.

- **Context package:** `PUP-43`, the source docs above, `package.json`, `app.config.ts`, `.gitignore`, `docs/dogfood/local-ios-build.md`, Expo public config, tool version checks, and project-graph doctor/update output.
- **Context placement:** Linear tracks status; this plan records implementation decisions and verification; final review evidence stays in the plan and Linear.
- **Ownership:** QA / release developer tooling and project-local agent configuration.
- **Graph note:** the project graph was refreshed; it reported no direct matches for `package.json` or `app.config.ts`, so actual files and checks remain authoritative.

## Goals

1. Connect Codex to the official remote Expo MCP and its local SDK 55 capabilities.
2. Add stable iOS/Android automation through `agent-device`, `adb`, XcodeBuildMCP, and Maestro.
3. Make common Expo workflows directly runnable from the Codex action bar.
4. Add a fail-closed internal EAS configuration baseline without running any cloud build, submission, update, or release action.

## Non-Goals

- EAS Build, EAS Update/OTA, TestFlight, Play tracks, store submissions, or production configuration.
- Product behavior, UI, schema, RLS, analytics, observability, or dependency architecture changes.
- Direct edits to generated `ios/` or `android/`.
- Installing both agent-device and Argent; agent-device is the selected cross-platform toolkit.

## Product Decisions Locked In

1. **Official MCP**
   - **Chosen:** Expo remote MCP plus project-local `expo-mcp`.
   - **Reason:** remote tools cover current Expo/EAS context while local tools add simulator interaction, logs, DevTools, and Router inspection.
2. **Device toolkit**
   - **Chosen:** globally installed `agent-device`, its official skill, and its stdio MCP server.
   - **Reason:** it covers iOS, Android, physical devices, evidence capture, debugging, and profiling while keeping a stable installed version.
3. **Privacy boundary**
   - **Chosen:** MCP/device automation may use synthetic development data only.
   - **Reason:** local Expo MCP payloads are proxied through Expo's remote server.
4. **EAS boundary**
   - **Chosen:** internal development/preview build profiles only; no production profile, update channels, or commands that create builds or submissions.
   - **Reason:** OTA is off for MVP and all release actions require separate exact approval.

## Invariants And Verification Mapping

- Remote Expo MCP and agent-device MCP must be listed and enabled in Codex.
  - **Verification:** `codex mcp list`.
- Local Expo MCP must start only when explicitly enabled and must not embed secrets.
  - **Verification:** dependency/config inspection and run-script help/syntax.
- iOS automation must stay pinned to the approved SE simulator.
  - **Verification:** simulator inventory plus project docs; no simulator build/run is part of this tooling-only task.
- Android automation must have `adb` on `PATH`.
  - **Verification:** `adb version` and `agent-device doctor`.
- OTA and cloud release actions must remain absent.
  - **Verification:** inspect `app.config.ts`, `eas.json`, Codex actions, and the final diff.
- Maestro selectors must use stable IDs and synthetic state.
  - **Verification:** flow inspection and Maestro syntax/dry-run capability where available.

### Expo Doctor Security-Fix Spec Lock

#### Acceptance Criteria

- **AC-DOCTOR-1:** `expo-doctor` is an exact direct development dependency whose resolved package and integrity are recorded in `package-lock.json`.
- **AC-DOCTOR-2:** the checked-in Doctor action executes only the repository-local `node_modules/.bin/expo-doctor` binary.
- **AC-DOCTOR-3:** the Doctor action exits non-zero with an actionable `npm ci` instruction when the local binary is absent.
- **AC-DOCTOR-4:** no Doctor branch uses `npx`, `bunx`, `pnpm exec`, `yarn`, or another package runner that can resolve the tool at invocation time.

#### Edge Cases

- **EC-DOCTOR-1:** the wrapper behavior is independent of unrelated pnpm, Yarn, or Bun lockfiles/tools that may exist on the developer machine.

#### Error Cases

- **ERR-DOCTOR-1:** a missing or non-executable local Doctor binary fails before any network/package-registry action.

#### Constraints

- No EAS build/update/submit, store/release action, production mutation, generated-native edit, or private test data.
- Keep the existing Codex action name and wrapper entrypoint.

#### Out Of Scope

- Changing Expo SDK, product behavior, application UI, native generated projects, or release profiles.

### Deep-Review Remediation Spec Lock

#### Acceptance Criteria

- **AC-REVIEW-1:** Every checked-in Expo wrapper mode executes only the repository-local
  `node_modules/.bin/expo`; unrelated npm/pnpm/Yarn/Bun lockfiles or executables cannot change the
  selected command.
- **AC-REVIEW-2:** Missing or non-executable local Expo and Expo Doctor binaries fail closed before
  package-runner or registry access and instruct the developer to run `npm ci`.
- **AC-REVIEW-3:** `expo-mcp` is an exact direct development dependency whose reviewed version,
  resolved npm tarball, and SHA-512 integrity are recorded in `package-lock.json`.
- **AC-REVIEW-4:** `npm run test:scaffold` rejects a production or non-explicitly-internal EAS
  build profile, submit configuration, update channels, or `updates` in the fully resolved Expo
  configuration.
- **AC-REVIEW-5:** iOS and Android Maestro npm commands route through the same wrapper guardrails as
  Codex actions; `PUPPYPLAN_IOS_SIMULATOR_UDID` selects only the approved primary or fallback SE,
  and Android refuses zero or multiple connected targets.
- **AC-REVIEW-6:** Wrapper tests prove primary/fallback SE selection, rejection of an arbitrary
  available simulator, refusal when another simulator is booted, case-insensitive UUID comparison,
  exact-one Android selection, and fail-closed local binary behavior with stubbed
  `xcrun`/`adb`/package runners.
- **AC-REVIEW-7:** The project wrapper lives under the existing `scripts/` ownership root, and every
  checked-in action, test, command, and doc references that canonical path.
- **AC-REVIEW-8:** Direct dependency declarations contain only packages owned by the project;
  `@expo/log-box` and `@expo/metro-runtime` remain Expo-owned transitives.
- **AC-REVIEW-9:** The tracked Codex environment is clearly marked as project-maintained, and the
  release docs state that `expo-dev-client` is excluded from release builds by Expo.
- **AC-REVIEW-10:** The tracked Maestro flow passes syntax validation and one real run against an
  already-installed app on an approved local target, or the exact environment blocker is recorded
  as `INCONCLUSIVE`.

#### Edge Cases

- **EC-REVIEW-1:** Foreign `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, and `bun.lockb` files do not
  affect any Expo wrapper mode.
- **EC-REVIEW-2:** A lowercase approved iOS UUID override matches uppercase `simctl` output.
- **EC-REVIEW-3:** `adb devices` entries in `offline` or `unauthorized` state do not count as usable
  Android targets.
- **EC-REVIEW-4:** quoted, literal-computed, and dynamically computed `updates` keys plus `app.json`
  inheritance are rejected, while comments that merely mention `updates:` do not create false
  release-gate failures.

#### Error Cases

- **ERR-REVIEW-1:** Wrapper startup never falls back to `npx`, `bunx`, `pnpm exec`, Yarn, or another
  package runner.
- **ERR-REVIEW-2:** iOS refuses unavailable approved simulators and any concurrently booted
  non-approved simulator without stopping or auto-selecting a device.
- **ERR-REVIEW-3:** Android refuses zero or multiple usable targets without creating or
  auto-selecting a device.

#### Constraints

- No new dependency, EAS build/update/submit, store/release action, production mutation,
  generated-native edit, git branch/commit/push/PR mutation, or private test data.
- Existing app product behavior and UI remain unchanged.

#### Out Of Scope

- Adding shellcheck as a dependency or CI image requirement without separate owner approval.
- Building or reinstalling the app solely for this tooling remediation.

## File Map

- `package.json`, `package-lock.json` - local `expo-mcp` dev dependency and safe helper scripts.
- `scripts/build_and_run.sh` - one foreground Expo/Maestro entrypoint for Codex and npm actions.
- `.codex/environments/environment.toml` - Run, iOS, Android, Dev Client, local MCP, and Doctor actions.
- `.gitignore` - allow the specific project Codex environment file while continuing to ignore other local Codex state.
- `eas.json` - safe development and preview APK declarations; production is intentionally absent and therefore fail-closed.
- `.maestro/README.md`, `.maestro/smoke.yaml` - minimal native app launch smoke on the existing installable app workflow.
- `scripts/checks/check-release-fail-closed.mjs` - durable production/submit/update exclusion gate.
- `scripts/checks/expo-toolchain-wrapper.test.mjs` - local binary and device-routing regressions.
- `docs/agents/expo-toolchain.md` - version-matched tool routing, privacy, device, and release guardrails.
- `docs/plans/README.md` - active plan index.

## Implementation Plan

### Phase 0 - Read And Lock Scope

- [x] Confirm existing Expo, native-build, simulator, EAS, Maestro, and MCP state.
- [x] Create and start `PUP-43`.
- [x] Refresh project graph and read actual affected files.
- [x] Lock privacy, device, OTA, generated-native, release, and production boundaries.

### Phase 1 - Install And Connect Tooling

- [x] Add official Expo remote MCP and complete OAuth if the browser flow is available.
- [x] Install SDK-compatible `expo-mcp` as a dev dependency.
- [x] Install Android Platform Tools and verify `adb`.
- [x] Install pinned current `agent-device`, its official skill, and its Codex MCP server.

### Phase 2 - Wire Project Workflows

- [x] Add the project-local Expo foreground run script.
- [x] Add Codex action buttons for Run, iOS, Android, Dev Client, local MCP, and Doctor.
- [x] Add safe internal EAS build profiles without a production profile, update channels, or release execution.
- [x] Add minimal ID-based Maestro smoke coverage for the real installed app workflow.

### Phase 3 - Verify And Hand Off

- [x] Run CLI/version/doctor checks.
- [x] Run shell, Expo dependency, Expo Doctor, Maestro, and EAS configuration checks.
- [x] Run `npm run check`.
- [x] Adversarially review the diff and confirm no release, OTA, production, secrets, or generated-native edits.
- [x] Record evidence in this plan and `PUP-43`; move to In Review only when ready.

### Phase 4 - Deep-Review Remediation

- [x] Add RED coverage for every local Expo mode and the release fail-closed invariant.
- [x] Add RED coverage for iOS/Android device selection and Maestro wrapper routing.
- [x] Pin `expo-mcp`, remove unowned direct Expo transitive declarations, and refresh the npm lock.
- [x] Move the wrapper under `scripts/` and route all Codex/npm actions through it.
- [x] Add release/dev-client and project-maintained environment documentation.
- [x] Run targeted checks, real Maestro smoke when the installed app is usable, and `npm run check`.
- [x] Run Senior Pass Gate 2, record final evidence, and return the plan to `completed/` only when no
  plan-owned work remains.

### Phase 5 - Code-Review Remediation

- [x] Reproduce custom-named store profiles, implicit store distribution, dynamic Expo Updates,
  and arbitrary available simulator overrides with RED regression tests.
- [x] Validate every EAS build profile as explicitly internal and inspect the fully resolved Expo
  config for OTA configuration.
- [x] Restrict the iOS selector to the documented primary and fallback SE UUIDs.
- [x] Register the project-local `device-automation` skill in root `AGENTS.md`.
- [x] Run focused tests, the full repository gate, Senior Pass Gate 2, and synchronize `PUP-43`
  acceptance/status for review.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Expo MCP proxies local screenshots/logs through Expo | Synthetic development data only; no private account content in evidence |
| Overlapping automation tools create confusion | Expo MCP for Expo-local operations, agent-device for cross-platform/debugging, Maestro for durable smoke, XcodeBuildMCP for native iOS build/debug |
| Android SDK consumes disk or creates an emulator implicitly | Owner-approved cleanup preserved the approved SE, and one lightweight API 36 ARM64 AVD was installed, cold-boot verified, and shut down |
| EAS configuration accidentally enables OTA/release behavior | Every profile must be explicitly internal; the gate resolves dynamic Expo config and rejects update configuration/channels plus submit configuration |
| Codex environment state leaks or becomes noisy | Track only `.codex/environments/environment.toml`; keep all other `.codex` state ignored |

## Verification Log

- 2026-07-26: `project_graph.py doctor` and `update --base HEAD` passed; graph DB is external to the repo.
- 2026-07-26: Expo public config confirms SDK 55, iOS bundle ID `com.dmitry-selenya.puppyplan-app`, and Android package `com.dmitry_selenya.puppyplan_app`.
- 2026-07-26: approved SE simulator `5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6` exists; no simulator was booted.
- 2026-07-26: existing local `ios/` output and `docs/dogfood/local-ios-build.md` prove an installable local workflow; Android generated output is absent.
- 2026-07-26: official Expo MCP OAuth completed; Codex lists the Expo, agent-device, and Maestro MCP servers as enabled.
- 2026-07-26: installed `expo-mcp` 0.2.4, `expo-dev-client` 55.0.37, `agent-device` 0.20.0, Android Platform Tools / `adb` 37.0.1, and EAS CLI 21.2.0.
- 2026-07-26: linked the non-production Expo project `@dmitry_selenya/puppyplan-app` (`e02cc1a3-f98d-431c-9076-0396990ac5ba`) without running a build, update, submission, or release action.
- 2026-07-26: development and preview APK EAS profile schema checks passed. Both internal profiles are pinned to the empty `preview` EAS environment so account-level variables from unrelated projects are not inherited. The production profile is intentionally absent and fails closed until separately configured and approved.
- 2026-07-26: `bash -n scripts/build_and_run.sh`, run-script help, TOML/JSON parsing, `maestro check-syntax`, and `git diff --check` passed.
- 2026-07-26: Expo SDK 55 patch dependencies were aligned; the locked local `expo-doctor` passed 19/19 and `./node_modules/.bin/expo install --check` reports dependencies up to date.
- 2026-07-26: final `npm run check` passed: 111 Jest suites / 1,378 tests, 163 Node tests, and all scaffold/privacy/i18n/design gates.
- 2026-07-26: Codex Security diff-scan preflight and repository threat-model phases passed; final diff review remains in progress.
- 2026-07-26: `agent-device doctor` was found to auto-warm an unapproved simulator. Its daemon/runner were stopped and cleaned immediately; project tooling now documents explicit SE targeting.
- 2026-07-26: owner-approved cleanup removed the unused `Grith iPhone 16e iOS 26.3` simulator plus rebuildable Xcode ModuleCache and npm cache; the approved SE simulator remains present and shut down.
- 2026-07-26: installed Android command-line tools, Platform/Build Tools 36, Emulator 36.6.11, and the lightweight `system-images;android-36;default;arm64-v8a` image. `PuppyPlan_API_36_ARM64` cold-booted to `sys.boot_completed=1`, reported API 36 and `arm64-v8a` through `adb`, appeared booted in `agent-device`, and shut down cleanly.
- 2026-07-26: heavy/full-isolated Expo Doctor TDD completed RED -> GREEN -> REFACTOR. The exact `expo-doctor@1.20.1` dependency and SHA-512 lockfile integrity are enforced by 9 passing tests; the wrapper invokes only the local binary and fails closed with `npm ci` guidance.
- 2026-07-26: the sealed Codex Security finding PoC now reports `[NOT VULNERABLE]`; privacy scan, `git diff --check`, Maestro syntax, shell syntax/help, and adversarial local review all pass with no new findings.
- 2026-07-26: deep-review RED reproduced 24 expected failures across 40 focused Node tests:
  foreign Expo/package-runner selection, `EXPO_CLI` override, missing fail-closed Expo diagnostics,
  lowercase iOS UUID mismatch, unguarded Maestro routing, floating `expo-mcp`, unowned direct Expo
  transitives, noncanonical wrapper path, and absent release configuration enforcement. The 9
  existing Doctor tests and already-correct positive/negative device cases remained green.
- 2026-07-26: isolated GREEN made the same 40-test suite pass without changing tests. The wrapper
  now runs only locked local Expo/Doctor binaries, shares deterministic device guards with Maestro,
  lives under `scripts/`, and fails closed when dependencies or release constraints are missing.
  `expo-mcp` is exact-pinned at 0.2.4; Expo-owned runtime packages remain transitive. Isolated
  REFACTOR only clarified one internal recursive-checker name and preserved 40/40 green.
- 2026-07-26: adversarial review found and closed a release-checker parsing bypass. A second isolated
  RED reproduced quoted/computed `updates` keys, inherited `app.json` updates, and a comment false
  positive (6 pass / 4 expected fail); GREEN replaced the regex with TypeScript AST inspection plus
  recursive optional `app.json` inspection. The combined focused suite passes 44/44.
- 2026-07-26: real `npm run maestro:smoke:ios` passed on the approved SE with the installed app:
  `${MAESTRO_APP_ID}` resolved to `com.dmitry-selenya.puppyplan-app`, and `nav-add` plus
  `diary-header` were visible. The simulator was explicitly returned to Shutdown afterward.
- 2026-07-26: final `npm run check` passed after all code changes: lint, typecheck, 111 Jest suites /
  1,378 tests, 198 Node tests, and all scaffold/privacy/i18n/token/design gates. Local Expo Doctor
  passed 19/19; Expo dependency check, Maestro syntax, `bash -n`, npm lock dry-run, and
  `git diff --check` passed.
- 2026-07-26: Senior Pass Gate 2 and sequential deep-review passes found no remaining actionable
  security, logic, test, performance, or platform finding. Shellcheck remains an explicit coverage
  note because it is not installed and adding a dependency/CI requirement needs separate approval;
  `bash -n` and executable shell behavior tests are enforced now.
- 2026-07-26: code-review remediation RED produced 4 expected failures across 40 focused tests:
  custom-named store distribution, implicit store distribution, dynamically computed `updates`,
  and an arbitrary available iOS simulator override. GREEN made the same 40 tests pass by resolving
  Expo config through the locked local Expo package and allowlisting the primary/fallback SE UUIDs.
  The expanded Expo toolchain suite passes 49/49.
- 2026-07-26: post-remediation `npm run check` passed: lint, typecheck, 111 Jest suites / 1,378
  tests, 207 Node tests, and all scaffold/privacy/i18n/token/design gates. Direct release-guard
  execution, Bash syntax/help, and `git diff --check` also passed.

## Changelog

- 2026-07-26: Initial plan created from PUP-43 and locked to tooling-only scope.
- 2026-07-26: Installed and wired the Expo, EAS, Maestro, agent-device, adb, and Codex action toolchain; aligned SDK 55 patches and recorded verification.
- 2026-07-26: Added explicit privacy isolation for EAS environments and documented the Android emulator disk-space constraint.
- 2026-07-26: Closed the Expo Doctor supply-chain finding, installed and boot-verified a lightweight API 36 ARM64 AVD after exact owner-approved cleanup, completed review/security verification, and closed the plan.
- 2026-07-26: Reopened after external deep review; locked remediation criteria for all local Expo
  modes, durable release fail-closed checks, deterministic device routing, dependency ownership,
  canonical script layout, and real Maestro evidence.
- 2026-07-26: GREEN remediation moved the wrapper to `scripts/`, made Expo execution local and
  fail-closed, guarded Maestro device routing, added the release configuration gate, restored
  direct dependency ownership, and documented release dev-client behavior.
- 2026-07-26: Closed the follow-up release-checker bypass, passed real iOS Maestro smoke and the
  final full repository gate, completed Senior Pass/deep review, and returned the plan to
  `completed/`.
- 2026-07-26: Closed the final review findings by enforcing internal-only EAS profiles, resolving
  dynamic Expo configuration, allowlisting both approved SE simulators, registering the device
  automation skill at the root, and synchronizing the local completion state with `PUP-43`.
