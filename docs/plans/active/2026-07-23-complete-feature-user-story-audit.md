# Complete Coded-Feature User-Story Audit, UX Fixes, And Full Retest

> For implementation agents: use the repo `AGENTS.md`, the PuppyPlan project skills, and this
> plan phase-by-phase. Do not fix findings while the inventory or initial audit sweep is still in
> progress. Behavior fixes require diagnosis and RED evidence before GREEN.
>
> Living document: the workbook is the canonical feature/story status ledger; this plan is the
> canonical execution contract and changelog. Linear mirrors phase status and verification.

**Goal:** Inventory every user-reachable behavior implemented at the frozen baseline, express it
as a traceable atomic user story in one canonical workbook, execute the complete initial behavior
and live-UX matrix, document every reproducible error, fix every in-scope objective logistical or
UX defect, and rerun every story after the fixes.

**Status:** Active.

**Plan type:** Active task plan.

**Current phase:** Review follow-up — correct notification values and complete the missing
accessibility-font evidence before returning to review.

**Architecture:** This is a cross-cutting verification and repair pass over the existing Expo
native app. Supabase remains the durable source of truth; RLS/privileged server boundaries remain
permission enforcement; TanStack Query owns server state; the Quick Log and Health durable local
write mechanisms remain the only approved local-write queues; UI remains behind `src/design`;
visible copy remains typed EN/RU/ES i18n. The audit may reveal defects in these areas but does not
authorize an architecture, schema, dependency, external-service, production, or release change.

**Linear:** `PUP-41`

**Branch:** `dimaselenya/pup-41-complete-coded-feature-user-story-audit-ux-fixes-and-full`

**Frozen baseline:** `3fb10d5682a54a269aebd39b5fcc0efda61fe3ed`

**TDD mode:** N/A for census and test execution. Fixes use heavy/full-isolated TDD for security,
privacy, RLS, contracts, query/cache, Quick Log, i18n, design-fidelity, cross-boundary, or
data-loss-risk behavior. Small low-risk defects may use lightweight TDD and must record the reduced
assurance. If a high-risk defect cannot be context-isolated with authorized tooling, halt that
defect unless the user explicitly approves a lower-assurance lightweight run for that exact fix.

**Primary source docs:**

- Product: `puppyplan-prd-v2.md` sections 3-7 and 12.
- Design: `DESIGN.md`, subject to its 2026-06-28 V2 override.
- Current IA: `docs/architecture/adr/0020-v2-ia-diary-pet-more-navigation.md`.
- Current design chain: `docs/plans/active/2026-06-27-diary-pet-nav-design-brief.md`,
  `docs/design/v2/README.md`, `docs/design/v2/manifest.json`,
  `docs/design/v1/specs/v2-redesign-lock-package.md`.
- Architecture: `docs/architecture/00-overview.md`, `02-repo-structure-and-ownership.md`,
  `03-client-data-layer.md`, `04-state-management.md`, `05-navigation-and-deeplinks.md`,
  `06-design-system-and-ui-contracts.md`, `08-data-model-and-rls.md`,
  `09-sharing-and-permissions.md`, `10-quick-log-queue.md`, `11-notifications.md`,
  `12-i18n-and-content.md`, `13-observability-error-handling-performance.md`,
  `14-feature-flags-and-entitlements.md`, `17-testing-ci-release.md`,
  `18-ai-agent-guide.md`, and related ADRs routed by `docs/INDEX.md`.
- Current execution context: `docs/plans/active/2026-05-29-full-prd-native-app-master-roadmap.md`,
  `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md`,
  `docs/plans/active/2026-07-11-dogfood-core-loop.md`,
  `docs/plans/active/2026-07-21-dogfood-diary-followups.md`.

---

## Context Package

- Rules: `AGENTS.md`, `docs/agents/00-operating-model.md`,
  `docs/agents/context-engineering.md`, `docs/agents/linear-workflow.md`.
- Skills: `.agents/skills/plan`, `ux-audit`, `tdd`, `implement`, and `design-fidelity`;
  Superpowers goal planning and project-graph context are also loaded.
- Tracker: Linear `PUP-41`, in progress.
- Graph: refreshed at the frozen baseline; advisory only. Actual source/tests are mandatory.
- Working tree at start: clean, on the former PUP-38 branch; switched to Linear's exact PUP-41
  branch before plan artifacts were created.
- Canonical status artifact: `docs/qa/puppyplan-feature-status.xlsx`.
- No open product questions are required for census/test execution. Objective defects may be fixed;
  items that change a product/design decision remain explicit `Decision Required` defects.

## Review Follow-Up Spec Lock — 2026-07-25

Review found that the completed-state claim exceeded the retained evidence and that the
Notification Preferences implementation still presented example values as effective settings.
This reopens only the affected PUP-41 contour.

**Design lock:** existing `DEF-REM-001` lock remains authoritative:
`docs/design/v1/specs/06-more-privacy-paywall.md`, current V2 More source, approved SE compact
device. Allowed deviation remains that quiet-hours editing is unavailable in this build. The
follow-up changes no layout primitive, token, route, backend write, schema, or external service.

**Acceptance criteria:**

- `AC-REM-REVIEW-1`: when notification preferences contain a timezone other than the historical
  example, the screen renders that effective timezone and does not render `Europe/Berlin`.
- `AC-REM-REVIEW-2`: when quiet hours are not exposed as an editable/effective typed value, the
  screen labels the value unavailable; it does not present `22:00–07:00` as the user's setting.
- `AC-DT-REVIEW-1`: at `fontScale >= 2`, a `ListRow` subtitle is not line-clamped; below the
  accessibility threshold the existing two-line compact clamp remains.
- `AC-DT-REVIEW-2`: at `fontScale >= 2`, the stacked `ListRow` copy participates in intrinsic
  height instead of retaining row-layout flex that collapses the title/subtitle to zero height.
  The approved-SE screen must visibly show both titles and complete explanatory subtitles.
- `AC-AUDIT-REVIEW-1`: Phase 6/7 accessibility claims remain unchecked until fresh approved-SE
  Dynamic Type evidence is retained and referenced. If native verification is blocked, the plan
  and workbook record the exact gap instead of `Pass`.

**Edge/error cases:** missing preference rows continue to use the query contract's `UTC` default;
long EN/RU/ES subtitles stay typed and visible; loading/error/offline templates are unchanged.

**Out of scope:** inventing a quiet-hours JSON shape, adding a quiet-hours editor, changing
notification persistence, or claiming a whole-app accessibility rerun from one screen check.

**TDD mode:** heavy/full-isolated for the design-fidelity behavior, with separate RED, GREEN, and
REFACTOR contexts.

## Coverage Boundary

The words "every feature" and "every behavior" are falsifiable only with a frozen census.

Included:

1. Every Expo Router file under `app/` that is user-reachable or intentionally redirects.
2. Every production feature screen/component under `src/features/` that exposes a user action,
   state, or visible outcome.
3. Every user-visible contract/business rule under `src/contracts/`.
4. Every query, storage, queue, notification, auth, and navigation behavior that changes what a
   user can see, do, retry, recover, or trust.
5. Every default, loading, empty, error, offline-read, pending-write, permission-denied,
   revoked/expired, and validation state implemented by the frozen code.
6. Every existing test source under `src/test/`, relevant `scripts/checks/` coverage, and Supabase
   policy/contract tests, reconciled to at least one story or an explicit non-user-facing source row.

Excluded from "implemented behavior":

- PRD/design/roadmap scope with no production route or implementation at the frozen baseline.
- Production services, production data, release builds, store submission, EAS/TestFlight/Play,
  production Supabase changes, and remote repository mutations without exact approval.
- New feature design, architecture changes, dependencies, or schema changes.

Absence is recorded as `Not Implemented` in the coverage source sheet when a canonical document
expects a surface but code does not implement it. It is not silently converted into a failing
user story unless the user-reachable app represents that absent capability as available.

## Canonical Workbook Contract

Path: `docs/qa/puppyplan-feature-status.xlsx`

The workbook is the only spreadsheet of record. No CSV, second workbook, or hidden shadow status
file may carry feature results.

Required sheets:

1. **Summary** - frozen baseline, counts, status legend, coverage formulas, and active phase.
2. **User Stories** - one row per atomic implemented behavior.
3. **Coverage Sources** - exhaustive source census and story mapping.
4. **Defects** - reproducible errors and decision/environment gaps.
5. **Run Log** - command/manual-run evidence with timestamps and result.
6. **Lookups** - controlled vocabularies used by workbook validation.

Stable story IDs use `PP-<AREA>-NNN`. A story is atomic only when it has one actor/context, one
precondition set, one action/trigger, and one observable expected outcome. Multiple platforms,
locales, data lengths, or state variants may be separate execution cases on the same story only
when the expected outcome is identical.

Required story fields:

- ID, area, capability, actor/context, user story, preconditions, steps, expected behavior;
- source files, source tests, route/artboard/state references;
- automation level and manual axes;
- initial status/evidence/run ID;
- defect IDs and fix status;
- post-fix status/evidence/run ID;
- final status and notes.

Controlled initial result vocabulary:

- `Not Run`
- `Pass`
- `Fail`
- `Blocked`
- `Not Reachable`
- `Not Automated`

Controlled post-fix result vocabulary:

- `Not Run`
- `Pass`
- `Fail`
- `Blocked`
- `Not Required`

Final status is never hand-waved:

- `Pass` only when the post-fix execution passed, or the initial execution passed and no related
  code changed afterward.
- `Fail` when the latest execution reproduces an objective mismatch.
- `Blocked` when a named environment, approval, spec, or decision dependency prevents proof.
- `Not Reachable` only when the frozen implementation cannot expose the path in a supported
  runtime; the source mapping still remains.

## Invariants And Executable Spec

- **Coverage invariant:** every included source has a `Coverage Sources` row and maps to a story or
  an explicit non-user-facing reason.
  - **Check:** source census reconciliation and workbook completeness audit.
- **Uniqueness invariant:** every story and defect ID is unique; no duplicate actor/action/outcome
  tuple exists.
  - **Check:** workbook uniqueness audit.
- **Evidence invariant:** no result other than `Not Run` is accepted without a run ID and evidence.
  - **Check:** workbook completeness audit.
- **Audit-order invariant:** no objective defect is fixed before the full initial census and live
  audit findings are filed.
  - **Check:** phase order and plan changelog.
- **UX evidence invariant:** no UX finding exists before a fresh screenshot of the live app exists.
  - **Check:** defect evidence path/run ID.
- **Privacy invariant:** only synthetic data may appear in screenshots, docs, Linear, workbook,
  tests, fixtures, logs, or retained evidence.
  - **Check:** privacy scan plus manual artifact review.
- **Fix invariant:** each objective fix has root-cause evidence, a RED regression test where
  feasible, GREEN evidence, and targeted post-fix evidence.
  - **Check:** defect row plus TDD session entry.
- **Retest invariant:** every story receives a post-fix result after the fix phase, including
  stories that initially passed, because cross-feature regressions are possible.
  - **Check:** zero blank/`Not Run` post-fix rows at final audit.
- **Quick Log invariants:** 3-second accidental double-tap and 60-second duplicate-care windows
  stay in `src/contracts/business-rules.ts`.
  - **Check:** existing business-rule/Quick Log tests plus full gate.
- **No silent failure invariant:** persistence, queue, sync, auth, and notification failures are
  surfaced or privacy-safely logged with context; no error is swallowed into false success.
  - **Check:** code review, negative tests, and live error-state cases.

## Non-Goals

- Inventing behavior not present at the frozen baseline.
- Treating internal implementation details with no user/system-observable outcome as standalone
  user stories; they remain mapped coverage sources.
- Fixing subjective design decisions without owner direction.
- Adding packages, schema, architecture, external services, or production configuration.
- Committing, pushing, publishing a PR, deploying, migrating production, or releasing.
- Using a larger simulator as a substitute for the approved SE profile.

## File Map

### Canonical QA Artifacts

- `docs/qa/puppyplan-feature-status.xlsx` - single canonical story/status workbook.
- `docs/plans/completed/2026-07-23-complete-feature-user-story-audit.md` - execution contract and
  changelog.
- `docs/plans/README.md` - plan index.

### Census Inputs

- `app/**/*.{ts,tsx}`
- `src/features/**/*.{ts,tsx}`
- `src/contracts/**/*.ts`
- `src/lib/{auth,query,queue,notifications,storage,navigation,diary}/**/*.{ts,tsx}`
- `src/test/**/*.{test,spec}.{ts,tsx}`
- `scripts/checks/**/*.{mjs,js}`
- `supabase/tests/**/*.sql`

### Defect Fixes

- Existing files only, selected after diagnosis.
- New regression tests under existing `src/test/` or `scripts/checks/` conventions.
- UI fixes may touch `src/design` only after per-defect V2 design lock and design-catalog lookup.

## UX And Live-Test Contract

Primary device: `Grith iPhone SE 3 iOS 26.3`
(`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).

Before any simulator build/run, XcodeBuildMCP session defaults must be inspected and pinned to the
approved SE. The installed release bundle must be rebuilt/refreshed before screenshots; stale
bundle evidence is invalid.

For every reachable screen/state:

- font scale: default and accessibility (`fontScale >= 2`);
- content: typical and real-world-long;
- states: default, empty, error, pending, plus each implemented state;
- flow: enter, save, edit, cancel/back, scroll, retry, undo/delete where implemented;
- locales: EN/RU/ES where copy length or behavior differs; all locale parity remains automated.

The whole frame is swept for typography roles, truncation/overflow, visible control labels,
alignment/spacing, hierarchy/consistency, touch/scroll/keyboard behavior, and state honesty.
Skipped axes are recorded, never implied clean.

UI fixes require the current V2 source chain. Before code:

1. Resolve V2 artboard/state references from `docs/design/v2/manifest.json` and index.
2. Read the relevant V2 section/route spec; split a route-specific card when needed.
3. Record device sizes and allowed deviations.
4. Use design-system search/component contracts before changing primitives.
5. Add structural anatomy tests, then compare fresh native screenshots per changed state.

## Defect Workflow

Defect IDs use `DEF-<AREA>-NNN`.

Each defect records:

- linked story IDs;
- classification: `Logistical`, `UX`, `Decision`, `Environment`, `Spec Conflict`, or `Security`;
- severity: `Broken`, `Off`, or `Polish`;
- reproduction and initial evidence;
- expected vs actual behavior;
- root cause and affected boundary;
- TDD mode and RED/GREEN/REFACTOR commands;
- design-lock refs for UI fixes;
- fix files and targeted verification;
- post-fix evidence and final disposition.

Objective `Logistical`, `UX`, or `Security` defects are in scope. `Decision`, schema, dependency,
architecture, production, or release defects remain blocked until exact authorization resolves
them.

## Implementation Plan

### Phase 0 - Lock Coverage And Canonical Workbook

**Checklist:**

- [x] Create `PUP-41`, assign it, move it to In Progress, and use its exact branch.
- [x] Freeze baseline commit and confirm clean start.
- [x] Refresh advisory project graph.
- [x] Load project planning, UX-audit, TDD, implementation, and design-fidelity rules.
- [x] Define coverage, story granularity, result vocabularies, evidence rules, and approval gates.
- [x] Create the canonical workbook with required sheets, validations, formulas, and metadata.
- [x] Register this plan in `docs/plans/README.md`.
- [x] Mirror the plan path and Phase 0 evidence to Linear; add `agent-ready`.

**Exit gate:** workbook schema exists, opens cleanly, and the census can add rows without changing
the contract.

### Phase 1 - Census Every Implemented Behavior

**Checklist:**

- [x] Enumerate every included route, feature screen, contract, boundary module, test, and check.
- [x] Read each production source path and its existing tests before authoring expected behavior.
- [x] Create atomic code-derived stories with stable IDs.
- [x] Map every coverage source to story IDs or an explicit non-user-facing reason.
- [x] Reconcile stories against PRD/design/active plans and flag code/spec mismatches without
  silently changing either.
- [x] Run workbook uniqueness/completeness checks and record counts.

**Exit gate:** 100% of included source census rows are mapped; every story has deterministic
expected behavior and initial status `Not Run`.

### Phase 2 - Execute Baseline Automated Matrix

**Checklist:**

- [x] Run the preflight/full engineering gate once and record command-level evidence.
- [x] Run targeted suites per story/feature so failures map to exact stories.
- [x] Run static Supabase/schema/RLS/typegen guardrails that require no production mutation.
- [x] Mark every automatable story Pass/Fail/Blocked with run evidence.
- [x] Mark non-automated stories `Not Automated` pending live execution.
- [x] File defects for every reproducible automated mismatch; do not fix yet.

**Exit gate:** every story has an initial status and evidence/gap; automated failures are linked to
defect rows.

### Phase 3 - Audit Live UX And User Flows

**Checklist:**

- [x] Inspect and pin XcodeBuildMCP defaults to the approved SE.
- [x] Build/run a fresh app bundle without production or release actions.
- [x] Drive every reachable story with synthetic data.
- [x] Capture and inspect the required screen/state/font-scale/content/flow matrix.
- [x] File findings before any fixes, most severe first, with screenshot/run evidence.
- [x] Record every skipped/unreachable axis explicitly.

**Exit gate:** every live-capable story has baseline manual evidence or a named blocker; the
whole-screen UX sweep is complete before any finding is fixed.

### Phase 4 - Diagnose And Lock Every Fix

**Checklist:**

- [x] Reproduce each Fail and distinguish app defect, decision, environment, or spec conflict.
- [x] Trace root cause before proposing code changes.
- [x] Group only defects that share an ownership boundary and verification gate.
- [x] Lock AC/EC/ERR criteria and TDD mode per objective defect.
- [x] Resolve V2 design lock for each UI fix before code.
- [x] Record blockers/approval needs in the workbook, plan, and Linear.

**Exit gate:** every defect has a disposition; every fixable defect has root cause and a locked,
testable fix spec.

#### Phase 4 Root-Cause And Fix Lock

No diagnosed defect requires a package, schema, architecture, external service, production
mutation, release action, or remote repository mutation. `DEF-ENV-001` remains closed after the
approved regenerable-cache cleanup and `idb` fallback. The other 15 defects are objective,
in-scope fixes.

| Defect | Root cause | Locked AC / ERR behavior | Test and design lock |
|---|---|---|---|
| `DEF-XCUT-001` | The shared query client sets test query `gcTime` to `Infinity` but leaves mutation GC at TanStack's five-minute default. Unmounting mutation observers therefore leaves three referenced `Timeout` handles and prevents Jest from exiting. | Test-mode query **and mutation** GC create no timers; production GC remains 30 minutes; the five-suite lifecycle probe and aggregate gate exit on their own. | Lightweight TDD in `src/lib/query/client.ts`; assert default test mutation GC is `Infinity`, then rerun the exact `--detectOpenHandles` reproduction. |
| `DEF-XCUT-002` | Three independent test-lifecycle defects: one Quick Log test mounts three session pipeline providers although two hooks are read-only; Routine Editor does not stabilize the asynchronous Reduce Motion probe; App Shell lets its four-second snackbar expire during a loaded aggregate run. | The cold-hydration test opens one queue/pipeline; Routine Editor uses the same pending Reduce Motion test boundary as adjacent render suites; the App Shell snackbar remains mounted until test cleanup. No behavioral assertion or production timer is weakened. | Lightweight TDD/test cleanup. RED is one-queue-open assertion for the parameterized Quick Log test plus warning capture; targeted suites must emit no React `act(...)` warning. |
| `DEF-XCUT-003` | Seventeen caught error bindings are unused after a privacy-safe recovery reporter already owns each failure; three test warnings are duplicate imports, a forbidden generic array spelling, and a dead observed variable. | Remove only unused bindings/imports/variable and use `T[]`; every recovery reporter and negative-path assertion remains. Lint reports zero warnings. | Lightweight mechanical cleanup; existing Quick Log negative tests plus lint. |
| `DEF-XCUT-004` | Twelve real runtime primitives have focused tests but no deterministic gallery reference; `PuppyHeader` lacks both a focused assertion and gallery reference. | A compact gallery shell renders all 12 real primitives with stable IDs; `PuppyHeader` receives focused anatomy assertions; catalog paths point to the real gallery/test files. Design doctor reports 0 warnings. | Heavy design-fidelity TDD; `00-foundation-contracts.md`, existing V2 gallery, and the SE compact size. No new primitive. |
| `DEF-PROF-001` | Photo editing is intentionally deferred and the control is semantically disabled, but its terracotta text looks active. | Keep the action disabled and visibly render the label with disabled tone; accessibility continues to expose `disabled: true`. | Heavy design-fidelity TDD; v1 `14.2` default/edit and V2 profile. Allowed deviation: no picker/permission flow because the spec explicitly defers editing. |
| `DEF-REM-001` | Quiet Hours and Time Zone are static persisted/effective values rendered as chevron buttons with literal no-op callbacks. | Render both as non-button settings values without chevrons, with localized copy that quiet-hours editing is unavailable and timezone is detected automatically/not editable. | Heavy design-fidelity TDD; `docs/design/v1/specs/06-more-privacy-paywall.md` and V2 More. EN/RU/ES, long copy, offline/read states. |
| `DEF-HEALTH-001` | The review checklist's Add item button has no editor or persistence boundary. | Activating Add item reveals a polite localized inline notice that custom items are unavailable and does not alter checklist completion. | Heavy design-fidelity TDD; v1 `11.1` and V2 Health. Repeated press, local checklist state, large text. |
| `DEF-MORE-001` | Help topic rows satisfy the visual shell but have literal no-op callbacks and no article routes. | Each topic selects and displays concise localized in-app guidance; one topic card is visible at a time, topic buttons remain accessible, and no private data is requested. | Heavy design-fidelity TDD; `06-4-more-support-help.md` and V2 More/support. In-app guidance is the allowed implementation because no article routes exist. |
| `DEF-MORE-002` | Consent toggles are component-local state and are not connected to analytics/error-report configuration or persistence. | Render both controls off and disabled with explicit localized non-availability copy. No remount can imply a stored consent change. | Heavy privacy/design-fidelity TDD; v1 `14.5`, `06-more-privacy-paywall.md`, and V2 More. No analytics service/config change. |
| `DEF-MORE-003` | Export and deletion actions change only local UI state while current copy promises a backend job and email. | Export states that no request/link/email was created. Delete opens an informational unavailable state; it cannot require confirmation or claim data/email changes. Sign out remains real and unchanged. | Heavy privacy/design-fidelity TDD; v1 `14.5` and `06-more-privacy-paywall.md`. No irreversible data action. |
| `DEF-MORE-004` | Plan rows and both billing buttons use literal no-op callbacks; live IAP is explicitly deferred. | Plan selection works locally and exposes the selected radio state. Choose/Restore show a localized alert that billing is unavailable and no charge/access change occurred. | Heavy design-fidelity TDD; v1 `15.1` and V2 paywall. Trial/soft-lock, repeated action, no provider/product identifiers. |
| `DEF-SHARE-001` | Household Invite and pending-row overflow buttons are literal no-ops; invite creation/manage mutations are absent. | Both controls reveal a localized, privacy-safe unavailable notice and never claim an invite was created, resent, copied, or revoked. A deterministic pending-row case covers overflow. | Heavy privacy/design-fidelity TDD; v1 `6.1`-`6.3` and deferred V2 family artboards. |
| `DEF-SHARE-002` | Sitter enable is a literal no-op and no authorization mutation exists. | Turn on sitter mode reveals a localized alert that no access changed. The screen never reports an active sitter as a consequence of the press. | Heavy privacy/design-fidelity TDD; `docs/design/v1/specs/07-sharing-access-cards.md` and deferred V2 family artboards. |
| `DEF-SHARE-003` | The production invite route forwards a token to a screen that ignores it, fabricates default Owner/Puppy facts, and exposes inert Accept/Decline buttons. | An unresolved production link shows a neutral unavailable state with no fabricated facts or token text and a safe acknowledge route. Explicit synthetic previews may render supplied names, but Accept/Decline show that no access changed unless real callbacks are supplied. | Heavy privacy/design-fidelity TDD; v1 invite state family and V2 family. Missing/malformed/expired/already-member states; no token logging. |
| `DEF-SHARE-004` | The share route exports the unavailable screen directly, so its optional acknowledge callback falls back to a no-op. | The route must pass a required callback that replaces the link screen with `/diary`; the neutral closed-link copy and token privacy remain unchanged. | Heavy privacy/design-fidelity TDD; `DESIGN.md` plus `docs/design/v1/manifest.json` state `10.1`. Route render test asserts `router.replace('/diary')`. |

All UI rows use existing `Card`, `ListRow`, `Button`, `Toggle`, `StatusPill`, `Stack`, and typed
i18n boundaries. All added copy ships with EN/RU/ES parity and passes the existing string-budget
gate. Native comparison targets are the existing initial screenshots plus the cited atlas/spec
states; changed-state screenshots are required on the approved SE before closure.

### Phase 5 - Fix Objective Logistical And UX Defects

**Checklist:**

- [x] Write and run RED regression evidence for each fixable defect where feasible.
- [x] Implement the smallest GREEN fix without weakening tests/config.
- [x] Refactor only while targeted tests remain green.
- [x] Complete privacy, RLS/access, i18n, Quick Log, query/cache, design-fidelity, and
  silent-failure gates as applicable.
- [x] Re-run targeted automated and live cases after each fix batch.
- [x] Update defect and story fix status/evidence immediately.

**Exit gate:** every objective in-scope defect is fixed and targeted-verification green, or is
blocked by a named approval/spec/environment dependency after exhaustive safe diagnosis.

### Phase 6 - Rerun Every User Story

**Checklist:**

- [x] Execute the entire automated story matrix again from a clean command state.
- [x] Execute every live-capable story again on the approved SE with synthetic data.
- [ ] Repeat and retain the relevant accessibility-font and long-content axes; error/pending,
  locale, and recovery axes remain covered by the existing automated and native evidence.
- [x] Populate post-fix result/evidence/run ID for every story, including initially passing stories.
- [x] Reopen defects for regressions or newly revealed mismatches and loop through Phases 4-6.

**Exit gate:** no story has a blank or `Not Run` post-fix result; latest evidence supports every
final status.

### Phase 7 - Polish, Harden, And Final Audit

**Checklist:**

- [x] Reconcile every source, story, defect, and run ID after the review follow-up.
- [x] Re-run `npm run check` and all additional touched-area local gates after the follow-up.
- [x] Run privacy/artifact review over workbook, screenshots, docs, fixtures, and logs.
- [x] Review the full diff for correctness, security/privacy, over-engineering, and dead code after
  the follow-up.
- [x] Confirm no release/production/remote mutation occurred.
- [ ] Record corrected final verification in Linear and move PUP-41 to In Review, not Done.
- [ ] Move this plan to `docs/plans/completed/` only when no plan-owned work remains and update the
  plan index.

**Exit gate:** the workbook proves complete coverage and final status for every frozen-baseline
story; all objective in-scope defects are fixed and retested; final local gates are green or each
remaining blocker is explicit and owner-actionable.

## Verification Commands And Evidence

Local gates:

- `npm run check`
- `npm run supabase:guardrails`
- targeted `npm run test:unit -- --runTestsByPath <file>`
- targeted Node/check scripts as mapped in the workbook

Mobile:

- XcodeBuildMCP session defaults inspection before first build/run
- approved SE build/run only
- fresh synthetic screenshots for live UX audit and every changed UI state
- Maestro only if the existing installable workflow is present and compatible; do not create a
  new tracked toolkit without a real approved workflow

Not authorized:

- remote Supabase lint/dry-run/test requiring credentials or production-adjacent access;
- EAS build/update, TestFlight, Play, store submission, release channel action;
- production migrations/functions/config;
- commits, pushes, PR publication, merges, tags, rebases, or other remote mutations.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| False completeness from route-only inventory | Reconcile routes, production features, contracts, boundary modules, tests/checks, canonical docs, and live navigation; require 100% source mapping. |
| The simulator cannot prove multi-device/push/offline/backend cases | Use existing deterministic tests and synthetic dev infrastructure; run safe live cases; record exact Blocked/Not Reachable status rather than false Pass. |
| "Fix every UX error" drifts into subjective redesign | File objective bugs separately from decisions; require current V2 lock and owner approval for deviations. |
| Audit fixes regress another surface | Do not fix during initial sweep; use RED tests, targeted verification, then rerun every story and the full gate. |
| Workbook becomes stale or ambiguous | Stable IDs, controlled vocabularies, evidence/run linkage, formulas, and one canonical path; update it at every phase boundary. |
| High-risk defect lacks context isolation | Halt that defect or obtain exact lower-assurance approval; do not pretend lightweight TDD is equivalent. |
| Private data leaks into retained evidence | Synthetic data only, privacy scan, manual artifact review, no raw tokens/emails/names/notes/photos. |

## Changelog

- 2026-07-23: Created PUP-41, switched to its Linear-generated branch, froze baseline
  `3fb10d5682a54a269aebd39b5fcc0efda61fe3ed`, refreshed project graph, and created the initial
  full-app audit/test/fix/retest execution contract.
- 2026-07-23: Completed Phase 0. Created the single canonical workbook at
  `docs/qa/puppyplan-feature-status.xlsx` with the six required sheets, 28 story columns,
  controlled vocabularies, 14 data-validation rules, summary formulas, and evidence/run linkage.
  `unzip -t` reported no workbook XML/archive errors and `node scripts/checks/check-plans-index.mjs`
  reported all 20 active plans registered. Moved execution to Phase 1.
- 2026-07-23: Completed Phase 1. Authored 320 atomic code-derived stories across Navigation
  (13), Auth (15), Onboarding (19), Pet Profile (16), Diary (37), Quick Log (55), Reminders &
  Notifications (41), Pet & Health (29), More & Settings (44), Sharing & Access (31), and
  Cross-Cutting (20). Reconciled 252 source/test/check files plus five explicit not-implemented
  canonical expectations: 251 source rows are mapped, one generated source is explicitly
  non-user-facing, five are `Not Implemented`, and zero remain `Unmapped`. Workbook uniqueness,
  required-field, path-existence, story-reference, controlled-validation, and ZIP/XML checks all
  passed. Moved execution to Phase 2.
- 2026-07-23: Completed Phase 2 baseline automation. The aggregate engineering gate passed lint
  with 0 errors/21 warnings and passed typecheck, then executed all 105 Jest suites: 103 suites
  and 1,284/1,287 tests passed; three aggregate timeouts occurred and Jest retained asynchronous
  work instead of exiting. Both affected files passed independently (39/39), establishing an
  aggregate lifecycle/resource defect rather than a deterministic product assertion failure.
  Node checks passed 146/146, all scaffold/i18n/privacy/token hard gates passed, and static
  Supabase/RLS/typegen guardrails passed 33/33. Workbook status is 303 `Pass`, 16
  `Not Automated`, and one `Fail` (`PP-XCUT-014`); four logistical defects capture the aggregate
  runner, React `act(...)` warnings, lint warnings, and design-catalog coverage warnings. Moved
  execution to Phase 3 without fixing findings.
- 2026-07-23: Completed Phase 3 on the approved
  `Grith iPhone SE 3 iOS 26.3` using a fresh Release simulator bundle with an embedded 6.6 MB
  `main.jsbundle`. Retained 34 privacy-safe screenshots under
  `docs/qa/evidence/pup-41/initial/`. All 15 manual stories whose preconditions existed failed
  their visible-outcome/honesty contracts; `PP-SHARE-005` is explicitly `Blocked` because the
  synthetic account had no pending invite row, while source inspection confirms that row's
  overflow callback is also a no-op. Added 11 product UX defects and one closed environment
  defect covering the clean-build disk recovery and simulator-driver contention. The workbook
  now records 303 initial passes, 16 initial failures including the pre-existing aggregate
  lifecycle failure, and one named blocker. Workbook uniqueness, validation-count, and ZIP/XML
  integrity checks passed. Moved execution to Phase 4 without fixing product findings.
- 2026-07-23: Completed Phase 4 systematic diagnosis and fix lock. A signal-driven async-hooks
  probe traced the non-exiting Jest process to exactly three TanStack mutation-GC timers; the
  five-suite reproduction otherwise passed 140/140 assertions. A test-name trace tied all three
  Quick Log readiness warnings to one parameterized cold-hydration test that mounted two extra
  session pipelines for read-only hooks. Reduced Motion and Snackbar warnings were isolated to
  unstabilized test-owned async/timer boundaries. Locked all 15 objective fixes against existing
  V1/V2 specs, existing primitives, typed EN/RU/ES copy, and focused RED evidence. No new approval,
  dependency, schema, architecture, service, production, release, or remote action is required.
  Moved execution to Phase 5.
- 2026-07-23: Recorded Phase 5 RED evidence before product changes. Six focused suites produced
  13 expected failures across query mutation GC, disabled profile styling, Health checklist
  feedback, notification row semantics, Help topics, privacy controls/account actions, sharing,
  sitter, paywall, and closed-link routes; 60 pre-existing assertions stayed green. The
  parameterized Quick Log cold-hydration case failed all three variants at exactly three queue
  opens versus the one-open invariant and reproduced its act warnings. The new gallery shell
  assertion failed because the shell did not yet exist, while the focused PuppyHeader anatomy
  assertion passed. These failures match the locked causes and do not expose private data.
- 2026-07-23: Implemented the scoped Phase 5 GREEN fixes for all 15 objective defects. Focused
  verification passed 73/73; the full 13-suite affected matrix passed 311/311 both normally and
  with `--detectOpenHandles`, exited on its own, and emitted no React `act(...)` warning. Lint is
  now 0 errors/0 warnings, typecheck passes, all i18n/privacy/scaffold gates pass, and design
  doctor reports PASS 4 / WARN 0 / FAIL 0. Workbook RUN-0018 records 15 defect rows and 26 linked
  stories as automated `GREEN`; UI defects remain pending fresh approved-SE native comparison
  before they become `Fixed` and Phase 5 can close.
- 2026-07-23: Fresh approved-SE comparison exposed `DEF-SHARE-005`: when an unavailable share
  link is opened above the full-screen Sitter mode modal, `Got it` replaced only the link route
  and left Diary trapped in the rounded modal presentation. RUN-0019 retains the privacy-safe
  native failure frame. A full-unit RED run produced exactly two new access-route failures while
  1,292 unrelated assertions passed. Both invite/share callbacks now dismiss the presenting
  stack before replacing with `/diary`; the focused route suite is GREEN 2/2, with a fresh native
  rebuild and modal-stack retest still required before Phase 5 can close.
- 2026-07-23: Completed Phase 5. A fresh zero-cache Release build succeeded with 0 errors and
  four known native warnings, installed on the approved SE, and launched independently by bundle
  id. The exact Sitter-modal -> share-link -> `Got it` regression and its symmetric invite case
  now return to the normal full-screen Diary shell. RUN-0020 records the full post-fix native
  matrix; all 16 objective defects are `Fixed`, all 26 linked stories have `Fixed` fix status,
  and the environment-only finding remains `Closed`. Workbook ZIP/XML integrity passed. Moved
  execution to the complete 320-story post-fix rerun in Phase 6.
- 2026-07-23: Phase 6 RUN-0021 passed every canonical gate assertion—Jest 107/107 suites and
  1,294/1,294 tests, Node 146/146, lint/typecheck, scaffold/privacy/i18n/tokens, and design doctor
  4/0/0—but emitted 28 unwrapped reduced-motion store updates across four render suites. The exact
  four-suite RED reproduction passed 50/50 assertions with the same 28 warnings. Reopened
  `DEF-XCUT-002` as `Retest Failed`; Phase 6 remains in the fix loop until both the focused
  reproduction and a fresh full gate are warning-free.
- 2026-07-23: Completed Phase 6 after the defect loop. Four unrelated render suites now own stable
  pending Reduce Motion boundaries; RUN-0022 passed the exact 4-suite matrix 50/50 with zero
  `act(...)` warnings and the full gate 107/107 suites, 1,294/1,294 Jest tests, and 146/146 Node
  tests with no warning recurrence. RUN-0023 passed all 33 Supabase guardrails. RUN-0024 repeated
  the approved-SE Diary, Pet, More, and Quick Log shell smoke and reconciled the changed-screen
  matrix from RUN-0020. RUN-0025 assigned post-fix and final `Pass` to all 320 stories; all 16
  objective defects are `Fixed`, the environment finding is `Closed`, and zero results remain
  blank, `Not Run`, failed, or blocked. Workbook referential, ZIP/XML, and 14-rule validation
  audits passed, and its complete A:F Summary render was inspected successfully. Moved execution
  to Phase 7.
- 2026-07-23: Completed Phase 7 and the plan. RUN-0026 records the fresh final gate:
  `npm run check` passed lint/typecheck, 107/107 Jest suites and 1,294/1,294 tests, 146/146 Node
  checks, all scaffold/i18n/privacy/token gates, and design doctor 4/0/0; Supabase guardrails
  passed 33/33. The final deep review found no blocking correctness, security/privacy, test,
  performance, platform-compliance, over-engineering, or dead-code issue. All 76 retained
  before/after frames were re-inspected as contact sheets and contain synthetic data only.
  Workbook referential and metric validation reports 320/320 post-fix/final passes, 17 closed
  defect rows, 26 runs, 257 source rows, and 52 referenced evidence paths; ZIP/XML integrity and
  all 14 validation rules remain intact; the complete Summary render is readable. No release,
  production, remote repository, schema, dependency, architecture, or external-service mutation
  occurred. Final evidence was posted to Linear, PUP-41 moved to In Review, and this plan moved to
  `docs/plans/completed/`.
- 2026-07-25: Reopened the plan after review found three evidence-backed defects. RUN-0027 records
  heavy isolated RED/GREEN/REFACTOR for effective Notification Preferences values and
  accessibility-safe `ListRow` subtitle/intrinsic-height behavior; the final focused matrix passed
  104/104. A fresh approved-SE Release reproduction exposed the deeper copy-collapse cause, and
  RUN-0028 retains default plus maximum-Dynamic-Type frames proving the complete Quiet Hours and
  Time Zone rows. The aggregate gate initially found one stale Reminders Hub compact-clamp
  expectation under jest-expo's accessibility font scale; the corrected accessibility expectation
  passed 29/29, then `npm run check` passed 107/107 suites and 1,304/1,304 Jest tests, 146/146 Node
  tests, lint/typecheck, all scaffold/i18n/privacy/token gates, and design doctor 4/0/0.
  `npm run supabase:guardrails` passed 33/33 and `git diff --check` passed.
- 2026-07-25: Corrected the audit claim instead of extrapolating one verified screen to the whole
  app. RUN-0029 and `DEF-AUDIT-001` now keep `PP-XCUT-011` `Blocked`; the workbook reports 319
  final passes and one explicit blocker across 320 real story rows, with 20 unique defects and 29
  unique runs. Workbook controlled values for all populated rows and ZIP/XML integrity pass. PUP-41
  remains Active/In Progress until the remaining reachable-screen approved-SE Dynamic Type matrix
  is captured and referenced; Phase 6 accessibility and final In Review/plan-completion boxes stay
  unchecked.
- 2026-07-25: Senior re-read removed the final unsupported timezone claim: the subtitle now says
  the stored/fallback value is used for reminder timing, rather than claiming it was detected from
  the current device. Xcode's MCP call timed out while its build continued, then the fresh Release
  completed and was installed with the new bundle. Maestro on the approved SE at
  `accessibility-extra-extra-extra-large` asserted `UTC` plus the complete final subtitle and
  replaced the retained timezone frame; the simulator content size was restored to `large`.
