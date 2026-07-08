# Design Handoff And Agent Gallery - Implementation Plan

> For implementation agents: use repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task.
> Living document: update this file as design artifacts, screenshots, tokens, native primitives, or verification evidence change.

**Goal:** Make the pre-final Cloud Design package usable as a repo-native, agent-friendly design source without a full Figma migration.

**Status:** Completed (2026-07-07). Phases 1-6A done; the two remaining follow-ups (EN/RU/ES Dynamic Type screenshots, dev-only design gallery) moved to `docs/plans/active/2026-07-07-release-readiness.md` §3/§8 and must target the V2 atlas, not v1.

**Plan type:** Linear task plan for `PUP-7`.

**Current phase:** Phases 1-5 complete. Phase 6A typed i18n/string-budget gates were merged via PR #6 under `PUP-10`. Quick Log contract guardrails referenced by this plan are complete through `PUP-16`. The EN/RU/ES Dynamic Type screenshot item and Phase 7 design gallery remain scoped follow-up work.

**Current Linear scope:** `PUP-7` executed Phases 1-3. `PUP-8` executed Phase 4. `PUP-9` executed Phase 5. `PUP-10` executed Phase 6A typed i18n/string-budget gates via PR #6. `PUP-11` through `PUP-16` closed the Quick Log contract, queue, UI, state, analytics, and observability guardrails referenced here. The remaining Phase 6 screenshot item and Phase 7 remain available for scoped follow-up issues.

**Architecture:** This is a design handoff and implementation-enablement plan. It does not change product scope, app runtime, Supabase schema, RLS, CI, or release behavior. Future code work must still implement Expo native UI through `src/design` primitives, typed i18n, contracts, and tests.

**Linear:** `PUP-7` - https://linear.app/dmitryselenya/issue/PUP-7/finalize-repo-native-design-handoff-and-agent-design-gallery

**Branch:** N/A until a Linear implementation issue creates a branch.

**Foundation dependency:** `docs/plans/active/2026-05-21-phase-0-architecture-cleanup.md` is a roadmap, not part of `PUP-7`. Use it only for prerequisites called out inside individual phases below.

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - onboarding, Quick Log, Today, Health, sharing, reminders, privacy, release readiness.
- Design: `DESIGN.md` - foundations, tokens, navigation, screen/state specifications, accessibility.
- Architecture: `docs/architecture/00-overview.md`, `docs/architecture/01-principles-and-scope.md`, `docs/architecture/06-design-system-and-ui-contracts.md`, `docs/architecture/10-quick-log-queue.md`, `docs/architecture/12-i18n-and-content.md`, `docs/architecture/17-testing-ci-release.md`, `docs/architecture/18-ai-agent-guide.md`.
- ADR: `docs/architecture/adr/0007-prd-schema-baseline.md`, `docs/architecture/adr/0011-design-system-runtime.md`.

---

## Context

The current design package lives outside the repo at `/Users/dmitryselenya/Downloads/puppy_app`. It is a Cloud Design export, not a stable project source of truth. The useful current visual canvas is `PuppyPlan.html`, which was inspected as 17 sections, 65 artboards, and 62 phone screens. `PuppyPlan-print.html` and `PuppyPlan.standalone.src.html` appear older and must be treated as stale unless a later manifest proves otherwise.

Repo docs and tokens were cleaned before this plan:

- `AUDIT_FIXES.md` is no longer a repo source.
- Quick Log accidental double tap window is 3 seconds.
- Duplicate-care warning window is 60 seconds.
- `DESIGN.md`, `design-tokens.json`, and `STRINGS.en.json` from the downloaded `uploads/` folder matched repo copies before the local cleanup; the new handoff value is the HTML/JSX screen package, not duplicate docs.

This plan keeps durable decisions in git, uses Linear for tracking, and avoids Figma as a required intermediate because the MCP limit makes full migration unreliable and lossy.

- **Context package:** this plan, the Linear issue, `AGENTS.md`, `DESIGN.md`, `puppyplan-prd-v2.md`, the architecture files listed above, and the eventual `docs/design/v1/` package.
- **Context placement:** Linear holds the concise checklist and status, this plan holds implementation context, and PRs hold final verification evidence.
- **Ownership area:** design handoff, app design system, i18n setup, and visual regression enablement.

---

## Goals

1. **Preserve the design package in git in a reviewable shape.**
   - Move the Cloud Design export into a versioned `docs/design/v1/` structure.
   - Keep raw files separate from curated metadata and generated screenshots.
   - Label stale or reference-only files explicitly.
   - Exclude downloaded audit markdown files from the active raw package; reconcile their actionable findings into a curated checklist instead.

2. **Give agents pixel-visible design context without Figma.**
   - Generate a deterministic artboard manifest from `PuppyPlan.html`.
   - Generate PNG screenshots for each current artboard.
   - Store screenshot metadata so agents can compare native screens against known dimensions and states.
   - Commit the first generated PNG atlas if the PII review passes and the total size stays small enough for normal git review.

3. **Convert design source into implementation contracts.**
   - Generate TypeScript tokens from `design-tokens.json`.
   - Keep tokens, generated CSS when present, the raw design CSS mirror, and `src/design/tokens.ts` synchronized by a drift check.
   - Keep every visible string behind typed i18n keys.

4. **Build native implementation scaffolding around the design.**
   - Port visual primitives into React Native equivalents under `src/design`, not by copying web JSX into feature screens.
   - Add an in-app design gallery route for native components and screen states.
   - Later compare simulator screenshots against the generated design atlas.

---

## Non-Goals

- Do not migrate the full design into Figma as a required source of truth.
- Do not treat `AUDIT_FIXES.md` as active input.
- Do not copy downloaded `uploads/AUDIT_FIXES*.md` into the active raw design package.
- Do not copy web JSX directly into production React Native feature screens.
- Do not create a Storybook requirement before the Expo scaffold and design primitives exist.
- Do not add new dependencies without explicit approval.
- Do not commit, push, create PRs, publish builds, or touch production services without explicit approval for that exact action.

---

## Product Decisions Locked In

1. **Design source strategy**
   - **Chosen:** repo-native handoff package plus generated screenshots and native gallery.
   - **Reason:** agents can read git files, diff changes, and inspect pixels without exhausting Figma MCP calls.

2. **Figma role**
   - **Chosen:** optional reference tool only, not the canonical handoff path.
   - **Reason:** a full import would be slow, approximate, and likely to lose fidelity or context.

3. **Current visual canvas**
   - **Chosen:** `PuppyPlan.html` is the current visual source until a manifest regeneration says otherwise.
   - **Reason:** it contains the broadest and newest screen set found in the export.

4. **Stale artifacts**
   - **Chosen:** `PuppyPlan-print.html`, `PuppyPlan.standalone.src.html`, and old upload duplicates are stored only as raw/reference files if needed.
   - **Reason:** agents need a clear current-vs-stale signal to avoid implementing old screens.

5. **Downloaded audit markdown**
   - **Chosen:** do not copy `uploads/AUDIT_FIXES*.md` into the active handoff package.
   - **Reason:** the repo has already removed that file as a source; any useful findings must be reconciled into a curated status list instead of reviving a stale input.

6. **Quick Log timing**
   - **Chosen:** 3 seconds for accidental double tap, 60 seconds for duplicate-care warning.
   - **Reason:** this is now the repo-wide contract and must be implemented as tested constants.

7. **Native implementation path**
   - **Chosen:** web JSX is design reference; React Native production code lives behind `src/design` primitives and feature-owned screens.
   - **Reason:** PuppyPlan is an Expo native app, and the architecture requires design, i18n, accessibility, and state boundaries.

8. **Screenshot atlas storage**
   - **Chosen:** commit the first light-mode PNG atlas if it is roughly a few MB and contains only synthetic data.
   - **Reason:** a committed atlas gives agents pixel references without external services; if the atlas is unexpectedly large, commit the manifest and generator first.

---

## Invariants And Executable Spec

Each invariant must map to an automated check once the app scaffold exists.

- **Acceptance mapping:** Linear issue -> this plan -> generated artifacts/tests/manual checks -> PR verification evidence.

- **Invariant 1:** the active design package exposes exactly one current visual canvas for implementation.
  - **Check:** `docs/design/v1/manifest.json` names `PuppyPlan.html` as current and marks stale/reference artifacts.

- **Invariant 2:** each current artboard has manifest metadata and a generated screenshot.
  - **Check:** screenshot export command verifies manifest count, output count, image dimensions, and nonblank pixels.

- **Invariant 3:** Quick Log double tap and duplicate-care windows stay 3 seconds and 60 seconds.
  - **Test:** future `src/contracts/business-rules.ts` tests.

- **Invariant 4:** design tokens have one generated TypeScript runtime entry point.
  - **Check:** token generation/drift check compares `design-tokens.json`, generated `tokens.css` when present, `docs/design/v1/raw/tokens.css` when present, and `src/design/tokens.ts`.

- **Invariant 5:** user-facing native UI strings never bypass i18n.
  - **Test:** future i18n lint/string-budget checks plus EN/RU/ES parity checks.

- **Invariant 6:** design screenshots and fixtures contain only synthetic, non-private data.
  - **Check:** manual review plus future PII scan over committed artifacts.

- **Invariant 7:** native screen states are inspectable without Cloud Design.
  - **Check:** future in-app design gallery route renders every critical component and screen state.

Important PuppyPlan invariants that still apply:

- `Today | Health | More` are the only primary tabs.
- Quick Log is a persistent FAB/action, not a tab.
- Quick Log accidental double tap window is 3 seconds.
- Duplicate-care warning window is 60 seconds.
- Every user-facing string comes through i18n.
- Private puppy/user data must not appear in analytics, logs, screenshots, docs, or PR text.

---

## File Map

### Design Handoff
- `docs/design/v1/README.md` - source status, how agents should use the package, current/stale artifact notes.
- `docs/design/v1/raw/` - raw Cloud Design export copied from `/Users/dmitryselenya/Downloads/puppy_app`.
- `docs/design/v1/manifest.json` - current artboards, sections, routes, states, dimensions, source files, implementation priority.
- `docs/design/v1/design-audit-reconciliation.md` - curated applied/superseded/open status for useful findings from the downloaded historical audit note.
- `docs/design/v1/screenshots/<section>/<artboard-id>.png` - generated screenshot atlas.
- `docs/design/v1/screenshots/index.md` - human-readable screenshot index.

### Scripts
- `scripts/design/extract-artboards.*` - future manifest extraction from `PuppyPlan.html`.
- `scripts/design/export-artboard-screenshots.*` - future Playwright screenshot export.
- `scripts/design/check-design-package.*` - future manifest/screenshot/token drift verification.

### Design Runtime
- `src/design/tokens.ts` - generated token module from `design-tokens.json`.
- `src/design/primitives/` - React Native design primitives and wrappers.
- `src/design/motion/`, `src/design/haptics/`, `src/design/a11y/` - shared design behavior boundaries.

### Contracts And i18n
- `src/contracts/business-rules.ts` - Quick Log timing constants and tested business rules.
- `src/lib/i18n/` - typed keys, EN/RU/ES parity, string budget checks.
- `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json` - current root source strings until they are ingested into the future `src/lib/i18n/` pipeline.

### Native Design Gallery
- `app/_dev/design.tsx` or `app/_dev/components.tsx` - development-only gallery route.
- `src/features/_dev/design-gallery/` - native gallery screens once feature folders exist.

### Docs
- `DESIGN.md` - design contract updates only when decisions change.
- `docs/architecture/06-design-system-and-ui-contracts.md` - native design system boundaries.
- `docs/architecture/12-i18n-and-content.md` - i18n pipeline.
- `docs/architecture/17-testing-ci-release.md` - visual and token drift gates.
- `docs/architecture/adr/0011-design-system-runtime.md` - design runtime decision updates if needed.

---

## Contracts, Schema, And Permissions

### Zod Contracts

- [x] No Zod contract changes are required for the handoff package itself.
- [x] Quick Log work exposes timing constants from `src/contracts/business-rules.ts`.
- [x] Quick Log analytics/observability changes use contracts and PII scrub tests. App-wide observability gates remain open in the foundation roadmap.

### Database / RLS

- [x] Migration required: no.
- [x] Destructive migration risk reviewed: N/A.
- [x] RLS policy impact reviewed: no runtime permission changes in this plan.
- [x] pgTAP tests required: no for this plan.

### Edge Functions

- [x] Edge Function required: no.
- [x] No privileged operation changes in this plan.

---

## UX Spec

### Navigation And Entry Points

- Production tabs remain `Today | Health | More`.
- Quick Log remains a persistent FAB/action.
- The design gallery, when added, must be development-only and must not ship as a production user entry point.

### States To Cover In Manifest And Gallery

- Welcome/onboarding and profile setup.
- Today operational states.
- Quick Log sheet, save, duplicate warning, pending/offline, undo, and error states.
- Health and timeline states.
- Sharing/trainer/sitter preview and permission states.
- More/settings/reminder/guidance/library states.
- Empty, loading, error, offline, revoked/permission-denied, and Dynamic Type stress states.

### Accessibility

- [ ] Touch targets meet iOS 44pt / Android 48dp minimums.
- [ ] Quick Log / FAB target is 56pt+.
- [ ] Interactive elements have labels, roles, and state/hint when needed.
- [ ] Status does not rely on color alone.
- [ ] Swipe actions have non-swipe alternatives.
- [ ] Dynamic Type XXL/XXXL reviewed for affected core screens.
- [ ] Manifest marks which artboards represent accessibility or large-text states.

### i18n And String Budgets

- [ ] No raw user-facing strings in UI.
- [ ] EN/RU/ES key parity updated.
- [ ] ICU plurals used where needed, including locale forms such as Russian `one`/`few`/`many`/`other` and Spanish `one`/`other`.
- [ ] String-budget-sensitive labels checked: tabs, CTAs, pills, tracker tiles, notification actions.
- [ ] Design screenshots that include text are treated as visual references, not i18n source.

---

## Privacy, Analytics, And Observability

- [x] Raw design screenshots and generated PNGs use synthetic data only for the current atlas.
- [x] No puppy names, notes, emails, provider names, photos, invite/share tokens, push tokens, or production identifiers are committed in the current design package.
- [x] Startup locale files remain complete for English, Russian, and Spanish.
- [x] Generated screenshots were reviewed before commit for the current raw export.
- [x] PNGs are not OCR-scanned; privacy relies on source text policy plus manual visual review before commit.
- [x] No analytics or observability runtime changes are part of this plan.
- [ ] Future visual regression artifacts must scrub or use synthetic data only.

---

## Implementation Plan

### Phase 0 - Source Cleanup Baseline

**Status:** complete for current docs cleanup; keep this phase as the baseline agents must verify.

**Files:**
- Modified: `AGENTS.md`
- Modified: `DESIGN.md` if future design wording changes
- Modified: `design-tokens.json`
- Modified: `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json`
- Modified: `puppyplan-prd-v2.md`
- Modified: `docs/architecture/*`
- Modified: `docs/plans/TEMPLATE-feature-plan.md`

**Checklist:**
- [x] Remove active repo references to `AUDIT_FIXES.md`.
- [x] Replace stale duplicate-care 12-minute wording with 60 seconds.
- [x] Keep accidental double tap at 3 seconds.
- [x] Validate JSON files touched by the cleanup.

**Acceptance criteria:**
- `rg` finds no stale duplicate-warning long-window markers in active product docs or the design package, apart from validator literals that intentionally reject those strings.
- JSON validation passes for design tokens and string files.

### Phase 1 - Design Artifact Intake

**Foundation dependency:** none. This phase can run under `PUP-7` before the Expo scaffold exists.

**Files:**
- Create: `docs/design/v1/README.md`
- Create: `docs/design/v1/raw/`
- Copy from: `/Users/dmitryselenya/Downloads/puppy_app`

**Checklist:**
- [x] Copy the Cloud Design export into `docs/design/v1/raw/`, excluding `uploads/AUDIT_FIXES*.md`.
- [x] Keep raw folder structure intact enough to preserve relative imports.
- [x] Mark `PuppyPlan.html` as current.
- [x] Mark `PuppyPlan-print.html`, `PuppyPlan.standalone.src.html`, and duplicate uploads as stale/reference unless proven current.
- [x] Confirm no private data appears in raw screenshots/uploads before commit.
- [x] Add a README table of contents that lists included raw files, excluded historical audit files, and current/stale status.
- [x] Document how agents should open and inspect the raw package.

**Acceptance criteria:**
- `docs/design/v1/README.md` contains a current/stale table of contents.
- `find docs/design/v1/raw -maxdepth 2 -type f | sort` matches the expected included file list documented in the README.
- `find docs/design/v1/raw -name 'AUDIT_FIXES*.md'` returns no files.
- A new agent can locate the current design canvas, identify stale files, and open the design locally without asking for the Downloads folder.

### Phase 2 - Manifest And Screen Inventory

**Foundation dependency:** none. This phase can run under `PUP-7` before the Expo scaffold exists.

**Files:**
- Create: `docs/design/v1/manifest.json`
- Create: `docs/design/v1/design-audit-reconciliation.md`
- Create: `scripts/design/extract-artboards.mjs`

**Checklist:**
- [x] Extract artboards from `PuppyPlan.html`.
- [x] Record section, artboard id, title, dimensions, route/screen intent, state type, priority, and source file.
- [x] Reconcile the observed count: 17 sections, 65 artboards, 62 phone screens.
- [x] Reconcile useful findings from the downloaded historical audit note as `applied`, `superseded`, or `open`; create follow-up issues for any real open items.
- [x] Flag missing or intentionally deferred states.
- [x] Add implementation priority tags: `mvp`, `post-mvp`, `reference`, `stale`.

**Acceptance criteria:**
- The manifest is the canonical inventory for agent implementation and screenshot export.
- Any mismatch from 65 artboards is explained in the manifest changelog.

### Phase 3 - Screenshot Atlas Automation

**Foundation dependency:** no Expo scaffold is required for local screenshot export. If this becomes a required CI gate, wait for the foundation roadmap's `PUP-4` CI/local verification work.

**Files:**
- Create: `docs/design/v1/screenshots/<section>/<artboard-id>.png`
- Create: `docs/design/v1/screenshots/index.md`
- Create: `scripts/design/export-artboard-screenshots.mjs`
- Create: `scripts/design/check-design-package.mjs`
- Create: `scripts/design/lib/png.mjs`

**Checklist:**
- [x] Use Playwright or an equivalent local browser runner to render `PuppyPlan.html`.
- [x] Account for `PuppyPlan.html` loading React, ReactDOM, and Babel from `unpkg.com`: either require network for the local export command or vendor those assets into `docs/design/v1/raw/_vendor/` before making this a CI gate.
- [x] Keep screenshot export out of `npm run check`/CI until network dependencies are vendored and the target runner has a supported Chrome/Chromium path.
- [x] Export one PNG per current artboard.
- [x] Verify each PNG is nonblank and has the expected dimensions.
- [x] Add smoke tests for the custom PNG reader's blank-image and dimension-failure behavior.
- [x] Generate `screenshots/index.md` with thumbnails/paths, dimensions, and section grouping.
- [x] Record commit decision: no git commit was made in this run because the user did not approve commit; generated atlas size is 3,630,207 bytes and remains in the worktree for review.

**Acceptance criteria:**
- Agents can inspect pixel references by reading PNGs directly, without Figma or Cloud Design.

### Phase 4 - Token Pipeline

**Foundation dependency:** requires the Expo scaffold and package scripts from the foundation roadmap's Phase 1 / `PUP-2`. The token drift check can become a required gate only after `PUP-4` defines local/CI checks.

**Status:** complete under `PUP-8`.

**Files:**
- Read: `design-tokens.json`
- Read: `docs/design/v1/raw/tokens.css`
- Create: `src/design/tokens.ts`
- Create: `scripts/design/generate-tokens.mjs`
- Create: token generator/drift tests and gate wiring

**Checklist:**
- [x] Define the generated `src/design/tokens.ts` shape after the Expo scaffold exists.
- [x] Generate colors, spacing, radius, typography, motion, haptics, and business timing references where applicable.
- [x] Keep letter spacing at `0` unless a product decision explicitly changes it.
- [x] Ensure `text/tertiary` contrast uses the corrected value.
- [x] Add a drift check so JSON/CSS/TS cannot diverge silently.

**Acceptance criteria:**
- Feature UI imports tokens only through `src/design`, not raw JSON/CSS.
- `npm run check` runs `npm run tokens:check`, which verifies `design-tokens.json`, root `tokens.css` when present, `docs/design/v1/raw/tokens.css` when present, and generated `src/design/tokens.ts`.
- Focused tests cover generator normalization, TypeScript drift, CSS drift, raw CSS mirror coverage, generated token values, `text/tertiary` contrast, semantic screen padding, and exported 3s / 60s business timing references.

### Phase 5 - Native Design Primitives

**Foundation dependency:** requires the Expo scaffold and TypeScript/test setup from the foundation roadmap's Phase 1 / `PUP-2`. Render tests depend on the verification setup owned by `PUP-4`.

**Status:** complete under `PUP-9`.

**Files:**
- Created/updated: `src/design/primitives/`
- Created: `src/design/a11y/`
- Created: `src/design/haptics/`
- Created: `src/design/motion/`
- Updated: `src/design/README.md`
- Updated: `src/test/design-primitives.render.test.tsx`

**Checklist:**
- [x] Define React Native equivalents for core surfaces, text, list rows, segmented controls, tracker tiles, status pills, FAB, sheet surfaces, and buttons.
- [x] Add accessibility labels, roles, pressed/disabled/selected/busy states where applicable, and touch-target guarantees.
- [x] Keep feature screens from importing raw `Pressable`, raw colors, raw spacing, direct haptics, or business-error alerts.
- [x] Add focused render tests once test infrastructure exists.

**Acceptance criteria:**
- Feature implementation can compose native screens from shared primitives without duplicating design rules.
- `AppText`, `Screen`, and `FAB` remain compatible with the current app shell and tab layout.
- Shared helpers are limited to accessibility/touch-target, motion, and haptic boundaries backed by generated `src/design/tokens.ts`.

### Phase 6 - i18n And String Budget Pipeline

**Foundation dependency:** requires the Expo scaffold/package scripts from `PUP-2`. Required i18n/string-budget checks should be wired into the local/CI gate through `PUP-4`.

**Pre-scaffold note:** `STRINGS.es.json` now exists with EN object-key parity so Spanish can ship from the first app build. Runtime wiring, typed key generation, and budget gates still remain Phase 6 work after the Expo scaffold exists.

**Status:** Phase 6A is implemented under `PUP-10` for typed keys, EN/RU/ES parity, placeholder/count checks, compact string budgets, shell typed-helper usage, and duplicate-warning 60-second copy checks. Dynamic Type XXL/XXXL screenshots remain open until real EN/RU/ES screenshots exist.

**Files:**
- Read/update: `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json`
- Future create: `src/lib/i18n/`
- Future script/check: i18n key parity and string budgets

**Checklist:**
- [x] Preserve existing typed string keys when scaffolding i18n.
- [x] Add EN/RU/ES parity check.
- [x] Add string-budget checks for tabs, CTAs, pills, tracker tiles, notification actions, and compact rows.
- [ ] Include EN/RU/ES screenshots in Dynamic Type XXL/XXXL verification for core flows.
- [x] Confirm duplicate-warning copy refers to the last 60 seconds.

**Acceptance criteria:**
- Native UI has no raw user-facing strings and does not overflow expected compact surfaces.

### Phase 7 - In-App Design Gallery

**Foundation dependency:** requires the Expo scaffold, Expo Router route structure, and runnable dev workflow from `PUP-2`.

**Files:**
- Future create: `app/_dev/design.tsx` or `app/_dev/components.tsx`
- Future create: `src/features/_dev/design-gallery/`

**Checklist:**
- [ ] Add a development-only route that renders design primitives and critical screen states.
- [ ] Include Quick Log duplicate, offline/pending, undo, error, Today, Health, sharing, and settings states.
- [ ] Use synthetic data only.
- [ ] Capture simulator screenshots after Expo scaffold and dev build exist.
- [ ] Compare native screenshots against `docs/design/v1/screenshots/` as a manual gate first, then automate when stable.

**Acceptance criteria:**
- Agents can inspect native implementation fidelity in the app without relying on external design tools.

### Phase 8 - Agent Tracking And Execution Split

**Foundation dependency:** use this phase to split Phases 4-7 into separate Linear issues if `PUP-2` or `PUP-4` is not ready when Phases 1-3 finish.

**Files:**
- Update: this plan
- Update: Linear issue
- Future update: PR descriptions and verification evidence

**Checklist:**
- [x] Keep one coordination issue for this plan.
- [x] Split implementation issues only when a phase becomes large enough for parallel work.
- [x] Mark `agent-ready` only for phases with enough context and acceptance criteria.
- [x] Add changelog entries when phases complete or design package counts change.

**Acceptance criteria:**
- A new agent can read the Linear issue plus this plan and know exactly what was done, what remains, and which files prove it.

---

## Verification

Current verification:

- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx` - PUP-9 RED failed before implementation because new primitive modules were missing; GREEN passed 7 tests after implementation.
- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx` - PUP-9 follow-up review RED failed on confirmed primitive issues: AppText Dynamic Type ceiling/caption mapping, platform touch target split, busy touchable a11y state, Button loading press blocking, SegmentedControl tablist role, SheetSurface root a11y flattening, and FAB elevation tokens. GREEN passed 12 focused primitive tests after fixes.
- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx src/test/tab-layout.render.test.tsx src/test/app-shell.render.test.tsx src/test/design-tokens.test.ts src/test/business-rules.test.ts` - passed 5 suites / 20 tests for Phase 5 targeted coverage.
- `npm run lint` - passed with no warnings after cleanup.
- `npm run typecheck` - passed after nullable Pressable prop fixes.
- `npm run check` - passed after Phase 5 docs update with 29 Jest tests, 45 Node tests, scaffold checks, token drift, privacy scan, and text hygiene.
- `npm run check` - passed after Phase 5 follow-up review fixes with 34 Jest tests, 45 Node tests, scaffold checks, token drift, privacy scan, and text hygiene.
- `git diff --check` - passed after Phase 5 docs update.
- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx` - PUP-9 deep-review fixes passed 14 focused primitive tests covering Reduced Motion, haptic adapter containment, loading indicators, decorative FAB glyph scaling, touch targets, and primitive states.
- `npm run typecheck` - passed with compile-time guards preventing active `Button`, `IconButton`, and `TrackerTile` controls without `onPress`.
- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx src/test/tab-layout.render.test.tsx src/test/app-shell.render.test.tsx src/test/design-tokens.test.ts src/test/business-rules.test.ts` - passed 5 suites / 27 tests after PUP-9 deep-review fixes.
- `npm run check` - passed after PUP-9 deep-review fixes with 36 Jest tests, 45 Node tests, scaffold checks, token drift, privacy scan, and text hygiene.
- `git diff --check` - passed after PUP-9 deep-review fixes.
- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx src/test/design-tokens.test.ts` - PUP-9 Phase 5 native primitive review RED failed on Android elevation tokens/styles, `Screen.edges`, per-instance Reduced Motion listeners, `Touchable.blockPresses` busy state, static `Card variant="interactive"`, nullable `StatusPill.icon`, and the remaining focused coverage gaps; GREEN passed 2 suites / 31 tests after fixes.
- `node --test scripts/design/generate-tokens.test.mjs` - passed 10 token-generation tests after splitting elevation color/opacity and Android elevation.
- `npm run test:unit -- --runTestsByPath src/test/tab-layout.render.test.tsx` - passed after waiting for the shared Reduced Motion store update in the FAB-bearing tab layout test.
- `npm run check` - passed after PUP-9 Phase 5 native primitive review fixes with 49 Jest tests, 45 Node tests, scaffold checks, token drift, privacy scan, and text hygiene.
- `git diff --check` - passed after PUP-9 Phase 5 native primitive review fixes.
- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx` - PUP-9 local review RED failed on default `Button` label one-line truncation; GREEN passed 28 focused primitive tests after allowing button labels to wrap and making `TrackerTile` size variants use minimum heights.
- `npm run check` - passed after local Dynamic Type review fixes with 50 Jest tests, 45 Node tests, scaffold checks, token drift, privacy scan, and text hygiene.
- `git diff --check` - passed after local Dynamic Type review fixes.
- `node --test scripts/design/generate-tokens.test.mjs`
- `npm run test:unit -- --runTestsByPath src/test/design-tokens.test.ts src/test/business-rules.test.ts src/test/design-primitives.render.test.tsx src/test/tab-layout.render.test.tsx`
- `npm run tokens:check`
- `npm run typecheck`
- `npm run check`
- `git diff --check`
- `find docs/design/v1/raw -maxdepth 2 -type f | sort`
- `find docs/design/v1/raw -name 'AUDIT_FIXES*.md'`
- `python3 -m json.tool docs/design/v1/manifest.json`
- `node --check scripts/design/lib/png.mjs`
- `node --check scripts/design/lib/policy.mjs`
- `node --check scripts/design/check-design-package.mjs`
- `node --check scripts/design/export-artboard-screenshots.mjs`
- `node --test scripts/design/lib/png.test.mjs`
- `node --test scripts/design/lib/policy.test.mjs`
- `node scripts/design/extract-artboards.mjs --check`
- `node scripts/design/export-artboard-screenshots.mjs`
- `node scripts/design/check-design-package.mjs`
- `git diff --check`

Earlier cleanup verification:

- `python3 -m json.tool design-tokens.json`
- `python3 -m json.tool STRINGS.en.json`
- `python3 -m json.tool STRINGS.ru.json`
- `python3 -m json.tool STRINGS.es.json`
- `node --test scripts/design/lib/strings.test.mjs`
- `rg -n "12 minutes|12-min|12 минут|12-минут|duplicate-warning-window-min" DESIGN.md puppyplan-prd-v2.md docs/design/v1`

Future verification after artifact intake:

- `find docs/design/v1 -maxdepth 3 -type f | sort`
- `python3 -m json.tool docs/design/v1/manifest.json`
- `scripts/design/check-design-package.*`
- screenshot export count equals current manifest artboard count.
- generated screenshots are nonblank and dimensionally match manifest metadata.

Future verification after later design runtime phases:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run check`
- i18n parity/string-budget check
- simulator screenshot pass for the in-app design gallery

---

## Open Questions

- Should Storybook be added later? Recommendation: defer until Expo scaffold, primitives, and test runner exist; the development-only native gallery is the first useful step.

---

## Changelog

- 2026-05-21: Created plan for repo-native Cloud Design handoff, screenshot atlas, token pipeline, native primitives, i18n checks, and in-app design gallery.
- 2026-05-21: Recorded cleanup baseline: removed active `AUDIT_FIXES.md` dependency and locked Quick Log timing to 3 seconds / 60 seconds.
- 2026-05-21: Created Linear coordination issue `PUP-7` for plan tracking.
- 2026-05-21: Fixed architecture doc links, excluded downloaded audit markdown from raw intake, added audit reconciliation, documented `unpkg.com` screenshot dependency, and made the first PNG atlas a chosen path when size/PII review pass.
- 2026-05-21: Clarified `PUP-7` execution scope: Phases 1-3 can run now; Phases 4-7 depend on foundation roadmap work, especially `PUP-2` Expo scaffold and `PUP-4` verification gates.
- 2026-05-21: Completed Phase 1 raw design artifact intake into `docs/design/v1/raw/`, excluded `uploads/AUDIT_FIXES*.md`, added `docs/design/v1/README.md`, and verified raw contents contain only synthetic/reference design data.
- 2026-05-22: Completed Phase 2 manifest and screen inventory with `docs/design/v1/manifest.json`, `scripts/design/extract-artboards.mjs`, and `docs/design/v1/design-audit-reconciliation.md`; current canvas reconciles to 17 sections, 65 artboards, and 62 phone screens.
- 2026-05-22: Completed Phase 3 screenshot atlas automation with 65 generated PNGs, `docs/design/v1/screenshots/index.md`, Chrome/CDP export automation, and package validation for count, dimensions, nonblank pixels, and audit-file exclusion.
- 2026-05-22: Fixed deep-review findings by syncing root PRD/DESIGN duplicate-warning copy to 60 seconds, sanitizing design-package identity placeholders to synthetic examples, and adding text-policy checks to `scripts/design/check-design-package.mjs`.
- 2026-05-22: Addressed follow-up review by extending text policy to root product/string docs, sanitizing active personas to synthetic placeholders, relabeling uploaded product docs as sanitized historical snapshots, marking screenshot export as local/manual until vendored dependencies and runner paths are ready, and adding PNG smoke tests.
- 2026-05-22: Closed `PUP-7` tracking tail by syncing Linear to `In Review`, removing stale local Linear-status notes, and recording Phases 4-7 as blocked on `PUP-2`/`PUP-4`.
- 2026-05-22: Updated dependency note after `PUP-2` scaffold completion; remaining design-runtime work should wait for `PUP-4` gates or be split into scoped follow-ups.
- 2026-05-22: Addressed additional follow-up review by replacing the remaining foster persona name with `Волонтёр A`, extending text-policy tests for legacy persona-name variants and email placeholders, adding an explicit unsupported-PNG encoding error, adding `STRINGS.es.json`, and documenting startup locale scope as EN/RU/ES.
- 2026-05-22: Addressed Spanish localization follow-up review by fixing high-risk ES copy regressions, standardizing cited strings on informal `tú`, adding Spanish value-level string tests, and syncing EN/RU-only plan language to EN/RU/ES.
- 2026-05-22: Addressed deep-review fixes by changing the Quick Log duplicate-warning artboard and PNG atlas from a 4-minute example to a 42-second example, adding text-policy coverage for stale duplicate-window examples, tightening Spanish core-copy tests and informal-register checks, and aligning `STRINGS.en.json` metadata with English-as-master i18n docs.
- 2026-05-22: Addressed second-agent review by aligning RU/ES locale metadata with English-as-master provenance, making RU activity/duplicate-warning copy grammatically consistent without gendered actor verbs, adding regression tests for those cases, and removing the dead `12-min` manifest-generator branch in favor of existing text-policy enforcement.
- 2026-05-23: Updated post-`PUP-4` status after PR #3 merged verification gates into `main`; Phases 4-7 can now resume or be split under the new local/CI gate.
- 2026-05-23: Completed Phase 4 under `PUP-8` with generated `src/design/tokens.ts`, `scripts/design/generate-tokens.mjs`, token drift gating in `npm run check`, generated-token shell wiring, and tested 3-second / 60-second business timing references. Verification: `node --test scripts/design/generate-tokens.test.mjs`, targeted Jest token/business/design shell tests, `npm run tokens:check`, `npm run typecheck`, `npm run check`, and `git diff --check`.
- 2026-05-23: Addressed local review finding by extending `npm run tokens:check` to validate the checked-in raw design CSS mirror at `docs/design/v1/raw/tokens.css` and covering raw CSS drift with a focused node test.
- 2026-05-23: Addressed follow-up agent review by correcting canonical `text/tertiary` to AA-safe `#72756A`, adding contrast assertions, adding semantic `layout.screenPaddingY`, preserving explicit typography tracking, normalizing generated TS/CSS line endings in drift checks, and expanding raw CSS drift coverage for `primary-900`, elevation, and font variables. Verification: `node --test scripts/design/generate-tokens.test.mjs` passed 10/10, targeted Jest token/primitive tests passed 7/7, `npm run tokens:check` reported `css=docs/design/v1/raw/tokens.css`, `npm run check` passed with 25 Jest tests and 45 Node tests, and `git diff --check` passed.
- 2026-05-23: Completed Phase 5 under `PUP-9` with token-backed native primitives for text, screens, touchables, buttons, icon buttons, cards, list rows, segmented controls, tracker tiles, status pills, sheet surfaces, FAB compatibility, and design-owned a11y/motion/haptics boundaries. RED verification failed on missing primitive modules; GREEN verification passed focused primitive tests, app shell/tab regression tests, design token tests, and Quick Log timing tests. Initial full gate exposed a privacy-scan false positive from a local haptic metadata variable named `token`; the boundary was renamed and `node scripts/checks/privacy-scan.mjs` passed. Final verification: `npm run check` passed with 29 Jest tests, 45 Node tests, scaffold checks, token drift, privacy scan, and text hygiene; `git diff --check` passed.
- 2026-05-23: Addressed external Phase 5 primitive review by removing `SheetSurface` root accessibility flattening, splitting loading press blocking from disabled a11y state through `Touchable.blockPresses`, raising `AppText` Dynamic Type ceiling to 3.0, routing `caption` to the generated caption token, encoding Android 48dp touch targets, adding `SegmentedControl` tablist semantics, isolating Card pressed variants, routing FAB elevation/motion through generated/shared tokens, exporting primitive variant types consistently, allowing `Touchable.pressedStyle` callbacks, extracting decorative a11y props, documenting deferred primitives, and expanding focused primitive coverage to 12 tests. Verification: RED focused primitive suite failed on the confirmed review cases; GREEN focused primitive suite passed 12/12; targeted Jest regression passed 5 suites / 25 tests; `npm run lint`, `npm run typecheck`, `npm run check` with 34 Jest tests and 45 Node tests, and `git diff --check` passed.
- 2026-05-24: Addressed deep-review findings by adding reduced-motion-aware pressed transform handling with listener cleanup, containing haptic adapter failures in the design boundary, rendering a visible loading indicator for loading buttons, preventing decorative FAB glyph Dynamic Type overflow, and tightening active `Button`, `IconButton`, and `TrackerTile` props so `onPress` is required. RED verification failed on haptic rejection, missing loading indicator, unguarded active control props, and FAB glyph scaling; GREEN verification passed the focused primitive suite with 14 tests, `npm run typecheck`, the 5-suite targeted regression with 27 tests, `npm run check` with 36 Jest tests and 45 Node tests, and `git diff --check`.
- 2026-05-24: Addressed Phase 5 native primitive review findings by splitting elevation tokens into solid color/opacity plus Android elevation, routing FAB/Card/SheetSurface through a shared elevation helper, replacing per-instance Reduced Motion subscriptions with a shared `useSyncExternalStore` store, defaulting `Screen` safe-area edges to top-only, documenting `SheetSurface` as static-only without Android focus trapping, forcing `Touchable.blockPresses` to expose `busy`, preventing nullable/color-only `StatusPill` icons through types, blocking static `Card variant="interactive"`, documenting the `AppText label` alias, tokenizing the FAB glyph weight, and closing the focused coverage gaps for segmented reselect, sheet handle hiding, muted interactive cards, icon-button hit slop, static list rows, and all status tones. Verification: RED targeted primitive/token tests failed on the confirmed cases; GREEN passed targeted primitive/token tests, token generator tests, tab-layout regression, `npm run check`, and `git diff --check`.
- 2026-05-24: Addressed local Dynamic Type review findings by removing default one-line truncation from `Button` labels and changing `TrackerTile` size variants from fixed heights to minimum heights so Quick Log tiles can grow vertically under accessibility text sizes. Verification: RED focused primitive test failed on the old button label truncation; GREEN focused primitive suite passed 28/28; `npm run check` passed with 50 Jest tests and 45 Node tests; `git diff --check` passed.
- 2026-05-24: Completed Phase 6A under `PUP-10` with typed i18n keys derived from `STRINGS.en.json`, `useAppTranslation()`/typed `t()` helpers, shell/native UI migration away from raw `useTranslation`, full EN/RU/ES user-facing leaf parity including arrays, placeholder/count parity, compact string-budget checks, duplicate-warning 60-second copy checks, and `npm run check` wiring. The EN/RU/ES Dynamic Type screenshot checklist item remains open until real screenshots exist.
- 2026-05-24: Addressed Phase 6A follow-up review by widening compact action budget coverage, aligning typed/runtime root-only `$meta` and `voice.*` exclusions, narrowing interpolation options and hook return shape, sharing static i18n source extraction, scanning production app/src files for raw `react-i18next` `useTranslation`, and expanding parity/budget/duplicate-warning/type coverage.
- 2026-05-24: Addressed Phase 6A deep-review gate gap by adding RED coverage for production raw `i18n` runtime imports and extending `check-i18n.mjs` to reject that typed-key bypass outside approved i18n/provider boundaries.
- 2026-05-24: Addressed local review guardrail gaps by adding RED coverage for raw `@/lib/i18n` namespace imports and static translation keys missing from the English master, then extending `check-i18n.mjs` so namespace raw-runtime bypasses and stale array indices such as `actions.999` fail the scaffold gate.
- 2026-05-25: Synced Phase 6A wording to the repo-verifiable PR #6 merge. This plan remains active only for the EN/RU/ES Dynamic Type screenshot follow-up and the development-only in-app design gallery.
- 2026-05-29: Repo-hygiene sync after `PUP-16`: closed stale design-handoff checklist items for completed Quick Log contract, timing, analytics, observability, design package privacy, and no-schema/no-RLS/no-Edge-Function guardrails. Remaining active work is still limited to EN/RU/ES Dynamic Type screenshots and the development-only native design gallery.
