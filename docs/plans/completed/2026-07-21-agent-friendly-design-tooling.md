# Agent-Friendly Design Tooling Implementation Plan

> **For implementation agents:** use the PuppyPlan `implement` and `tdd` skills. Execute the phases in order and keep PUP-39 current in Linear.

**Status:** Completed

**Plan type:** Completed task plan

**Current phase:** Completed — direct local `main` integration approved on 2026-07-22; final integration evidence pending

**Linear:** `PUP-39` — `dimaselenya/pup-39-add-agent-friendly-native-design-catalog-and-diagnostics`

**Goal:** Make the native design system queryable and self-checking so an agent can discover the correct primitive by intent, inspect its semantic contract, and detect runtime/documentation drift before writing UI code.

**Architecture:** Keep the mobile runtime unchanged. Store machine-readable semantic metadata in a versioned JSON catalog under `src/design/catalog/`, describe its shape in TypeScript, and consume it from a dependency-free Node ESM library and CLI under `scripts/design/`. The CLI reads the real public barrel and filesystem, so catalog coverage and references are mechanically checked instead of trusted from prose.

**Tech stack:** TypeScript strict types, JSON, Node ESM, `node:test`, existing npm scripts. No new dependencies.

---

## Context Package

### Source documents read

- `AGENTS.md`
- `puppyplan-prd-v2.md` §5 and §10
- `DESIGN.md` §0.1, §1.9, Appendix A
- `docs/INDEX.md`
- `docs/architecture/06-design-system-and-ui-contracts.md`
- `docs/architecture/18-ai-agent-guide.md`
- `docs/architecture/adr/0011-design-system-runtime.md`
- `docs/agents/context-engineering.md`
- `docs/agents/linear-workflow.md`
- `src/design/README.md`
- `src/design/primitives/index.ts`
- current primitive sources, Node design-script tests, and design gallery references

### Advisory graph context

The refreshed project graph identifies `src/design/primitives/index.ts` as the public primitive surface and points to the design gallery, feature consumers, and render tests. Actual sources and tests were read before this plan; graph output is not treated as proof.

### TDD mode

`TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.`

This is appropriate because the slice is deterministic local developer tooling: no UI behavior, data, network, permissions, schema, privacy, query/cache, or production side effects change. Work is isolated in a dedicated git worktree.

### Baseline evidence

- `npm ci`: completed; no lockfile edit. npm reported three pre-existing high-severity dependency advisories; no audit fix was run.
- `npm run check`: lint and typecheck completed; Jest reported 105/105 suites and 1275/1275 tests, then the pre-existing open-handle condition prevented the process from advancing to Node/scaffold checks. The baseline also has 21 lint warnings and existing React `act(...)`/Expo warnings. This limitation must not be attributed to PUP-39.

---

## Goals

- Give agents intent-based primitive discovery without requiring prior knowledge of component names.
- Give humans and agents brief, dense, full, and JSON component views.
- Expose a stable versioned manifest of components, commands, options, and output envelopes.
- Make every runtime export either cataloged or explicitly ignored with a reason.
- Make stale paths, broken relationships, duplicate names, missing export coverage, and stale README inventory actionable diagnostics.
- Put the doctor in the existing deterministic local gate.

## Non-Goals

- No Astryx, StyleX, Storybook, MCP server, plugin system, or new dependency.
- No production UI, route, design token, component visual, i18n, native project, schema, or service change.
- No generated `AGENTS.md` edits or instruction injection.
- No codemods or agent-performance eval harness in this slice.
- No manually maintained copy of TypeScript prop names/defaults; source paths remain canonical for syntactic API details.
- No commit, push, PR, merge, release, or production action without exact user approval.

---

## Product Decisions Locked In

1. **Catalog representation**
   - **Chosen:** versioned `catalog.json` plus `schema.ts` and runtime validation.
   - **Reason:** Node can consume it without a loader; TypeScript documents the contract; runtime checks catch what structural typing alone cannot.

2. **Public coverage policy**
   - **Chosen:** every non-type value exported from `src/design/primitives/index.ts` must be cataloged or listed in `ignoredExports` with a non-empty reason.
   - **Reason:** a new primitive cannot silently bypass agent documentation.

3. **Prop documentation**
   - **Chosen:** component output points to the real source and exported prop type; the catalog stores only semantic selection guidance.
   - **Reason:** manually copied props drift and duplicate TypeScript.

4. **CLI shape**
   - **Chosen:** one implementation entry point with four npm-facing commands: `design:search`, `design:component`, `design:manifest`, and `design:doctor`.
   - **Reason:** small implementation surface with stable task-oriented affordances.

5. **Doctor severity**
   - **Chosen:** `FAIL` exits 1; `WARN` is actionable but exits 0; CLI usage errors exit 2.
   - **Reason:** broken contracts block gates, while missing optional gallery/test coverage can be adopted incrementally.

---

## Spec Lock

### Acceptance Criteria

- **AC-1:** Schema validation rejects malformed catalogs and accepts the checked-in catalog.
- **AC-2:** The catalog accounts for every public runtime export through a component entry or explicit ignored-export reason.
- **AC-3:** Search tokenizes Unicode intent, ranks exact names/phrases/keywords above prose matches, breaks ties by component name, respects a limit, and returns no result for an empty normalized query.
- **AC-4:** The query `settings row with chevron` ranks `ListRow` first; `destructive confirmation action` ranks `Button` first; `empty screen next action` includes `EmptyState` in the top results.
- **AC-5:** Component lookup is case-insensitive, accepts documented aliases, returns brief/dense/full views, and reports an unknown component without guessing.
- **AC-6:** JSON command results use stable envelopes with `schemaVersion`, `command`, and command-specific data.
- **AC-7:** Manifest output contains the catalog version, coverage policy, component inventory, and self-describing CLI command/options metadata.
- **AC-8:** Doctor validates schema, unique/sorted names, related-component references, source/test/gallery files, barrel coverage, ignored-export reasons, and the README inventory marker.
- **AC-9:** Doctor emits actionable PASS/WARN/FAIL diagnostics and non-zero status when any failure exists.
- **AC-10:** Canonical docs explain when to use search/component/manifest/doctor and direct agents to TypeScript source for props.
- **AC-11:** `npm run test:node`, `npm run typecheck`, CLI smoke commands, `git diff --check`, and the design doctor pass. Full `npm run check` is rerun; any remaining baseline open-handle condition is recorded separately.

### Edge Cases

- **EC-1:** Search punctuation, case, repeated whitespace, and Russian/English intent keywords normalize deterministically.
- **EC-2:** A result limit below 1 or above the component count is rejected or safely clamped according to the CLI contract.
- **EC-3:** A component alias cannot collide with another component name or alias.
- **EC-4:** A declared optional test/gallery reference that does not exist is a failure; an entry with no optional reference is a warning.
- **EC-5:** Technical exports such as a hook/helper are allowed only through explicit ignored-export records with reasons.

### Error Cases

- **ERR-1:** Empty search query -> usage error, exit 2.
- **ERR-2:** Unknown component -> usage error with available/suggested names, exit 2.
- **ERR-3:** Malformed catalog or unaccounted public export -> doctor failure, exit 1.
- **ERR-4:** Stale README inventory block -> doctor failure with the exact regeneration/update action.
- **ERR-5:** JSON mode errors remain valid JSON on stdout/stderr contract and never mix human prose into the envelope.

### Constraints

- Deterministic, local-only, no network.
- No new dependencies.
- No private user data or production state.
- No UI/design-fidelity stage is required because no screen or runtime component output changes.
- Existing design behavior and public TypeScript exports remain unchanged.

---

## Invariants And Executable Spec

- **Invariant 1:** Every runtime barrel export is cataloged or explicitly ignored.
  - **Test:** `scripts/design/lib/catalog.test.mjs` mutates the export surface and proves doctor coverage fails.
- **Invariant 2:** Search order is stable for equal scores and independent of source object order.
  - **Test:** `scripts/design/lib/catalog.test.mjs` reverses fixture order and expects the same ranked names.
- **Invariant 3:** Catalog references never point to missing repository paths or unknown related primitives.
  - **Test:** negative doctor fixtures for missing source/test/gallery and unknown relation.
- **Invariant 4:** Human and JSON command views are projections of the same validated catalog.
  - **Test:** CLI/library tests assert the same component identity/version across modes.
- **Invariant 5:** README inventory is derived from the catalog and cannot drift silently.
  - **Test:** doctor fixture with stale marker content fails with an actionable diagnostic.

Shallow-green mitigation: tests include negative catalog mutations, unaccounted exports, duplicate aliases, reversed search input, stale references, and stale docs rather than only checking happy-path example outputs.

---

## File Map

### Design contract

- Create `src/design/catalog/schema.ts` — TypeScript catalog contract.
- Create `src/design/catalog/catalog.json` — canonical semantic entries and explicit coverage policy.
- Create `src/design/catalog/index.ts` — typed import/export for repository TypeScript consumers without adding mobile runtime use.
- Modify `src/design/README.md` — workflow plus doctor-checked inventory block; remove stale primitive/gallery claims.

### Tooling

- Create `scripts/design/lib/catalog.mjs` — loading, validation, export parsing, search, views, manifest, doctor diagnostics.
- Create `scripts/design/lib/catalog.test.mjs` — RED/GREEN/REFACTOR specification tests.
- Create `scripts/design/design-system.mjs` — CLI argument parsing, human/JSON output, exit codes.
- Create `scripts/design/design-system.test.mjs` — CLI smoke and error-envelope tests if library tests are insufficient.
- Modify `package.json` — four task-oriented scripts and doctor in `test:scaffold`.

### Canonical docs

- Modify `docs/architecture/06-design-system-and-ui-contracts.md` — catalog and gate as part of the design boundary.
- Modify `docs/architecture/18-ai-agent-guide.md` — retrieval-before-implementation workflow.
- Modify `docs/agents/context-engineering.md` — progressive disclosure commands.
- Modify `docs/plans/README.md` — register/move this plan.

No app routes, features, UI render output, i18n, Supabase, migrations, generated native files, or dependency manifests beyond npm scripts change.

---

## Implementation Plan

### Phase 0 — Scope And Baseline

- [x] Read Linear issue, source docs, architecture, ADR, runtime sources, tests, and gallery.
- [x] Refresh project graph and verify actual files.
- [x] Create isolated worktree on the Linear branch.
- [x] Record baseline check limitation and pre-existing dependency advisories/warnings.
- [x] Lock goals, non-goals, errors, edge cases, and invariants.

### Phase 1 — Catalog Contract And Search (RED -> GREEN -> REFACTOR)

**RED**

- [x] Create a minimal `scripts/design/lib/catalog.mjs` stub with exported functions only.
- [x] Add `catalog.test.mjs` cases for validation, deterministic search, aliases, Unicode normalization, limits, and the three acceptance queries.
- [x] Run `node --test scripts/design/lib/catalog.test.mjs` and record expected behavioral failures (6/6 failed against the stub for the intended missing behavior).

**GREEN**

- [x] Add `schema.ts`, `catalog.json`, and typed `index.ts`.
- [x] Implement minimal validation, normalization, scoring, deterministic ranking, and component lookup.
- [x] Run targeted tests until green without weakening tests (6/6 passed).

**REFACTOR**

- [x] Extract shared projections and keep scoring weights named/testable.
- [x] Re-run targeted tests (13/13 passed after the Phase 2 additions and refactor).

### Phase 2 — Manifest And Doctor (RED -> GREEN -> REFACTOR)

**RED**

- [x] Add negative tests for duplicate names/aliases, unknown relations, missing files, unaccounted exports, empty ignored reasons, stale docs, and severity/exit summary.
- [x] Add manifest schema/command metadata assertions.
- [x] Run targeted tests and record expected failures (7/7 new tests failed against the Phase 2 stubs; the 6 prior tests stayed green).

**GREEN**

- [x] Implement barrel value-export parsing and explicit coverage accounting.
- [x] Implement repository reference checks and README marker comparison.
- [x] Implement versioned manifest and PASS/WARN/FAIL doctor report.
- [x] Run targeted tests until green (13/13 passed).

**REFACTOR**

- [x] Keep filesystem access behind injected/read-only helpers so fixture tests remain pure.
- [x] Re-run targeted tests (13/13 passed).

### Phase 3 — CLI And Package Surface (RED -> GREEN -> REFACTOR)

**RED**

- [x] Add CLI tests for human views, JSON envelopes, unknown component, empty query, and exit codes.
- [x] Run targeted CLI tests and record expected failures (6/6 failed against the CLI stub).

**GREEN**

- [x] Implement `search`, `component`, `manifest`, and `doctor` subcommands.
- [x] Add `design:*` package scripts and append doctor to the scaffold gate.
- [x] Run targeted CLI and Node tests until green.

**REFACTOR**

- [x] Keep stdout machine-clean in JSON mode and stderr/action text concise; document `npm run --silent` for npm-mediated JSON calls.
- [x] Re-run targeted tests (24/24 catalog and CLI tests passed after review hardening).

### Phase 4 — Documentation And Gate Integration

- [x] Replace stale `src/design/README.md` inventory prose with generated/doctor-checked inventory markers and usage examples.
- [x] Update architecture and agent context docs with retrieval-first workflow.
- [x] Run `npm run design:doctor` and prove the checked-in repository is PASS/WARN only with exit 0 (PASS 4, WARN 13, FAIL 0).
- [x] Run AgentShield/security diff scan because `package.json` configuration changed; record that the scanner found zero supported Claude-config files and therefore supplied no meaningful diff coverage. Repo privacy/text-hygiene checks and manual review passed; no auto-fix ran.
- [x] Update PUP-39 with completed phases and verification evidence.

### Phase 5 — Final Verification And Handoff

- [x] `node --test scripts/design/lib/catalog.test.mjs scripts/design/design-system.test.mjs` — 24/24 passed.
- [x] `npm run test:node` — 146/146 passed across 9 suites.
- [x] `npm run typecheck` — passed.
- [x] `npm run --silent design:search -- "settings row with chevron" --json` — clean JSON; `ListRow` ranked first with match evidence.
- [x] `npm run design:component -- Button --dense` — passed with semantic/source output.
- [x] `npm run --silent design:manifest -- --json` — clean JSON; catalog 1.0.0, 37 components, four commands.
- [x] `npm run design:doctor` — PASS 4, WARN 13, FAIL 0; all 39 runtime exports accounted for.
- [x] `npm run check` — lint/typecheck and 105/105 Jest suites (1275/1275 tests) completed; the pre-existing open-handle condition again prevented Jest from exiting and the process was stopped after a control interval. Node/scaffold gates were run separately and passed.
- [x] `git diff --check` — passed.
- [x] Review the final diff against PUP-39 acceptance and run the project review/security capability before any requested commit/PR — no PUP-39 findings remained after hardening malformed-catalog handling and export parsing.
- [x] Move this plan to `docs/plans/completed/`, set Status to Completed, update `docs/plans/README.md`, and record local verification in Linear if all plan-owned work is done.

---

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Catalog becomes another stale prose layer | Doctor covers every runtime export, references, relationships, and README inventory. |
| Search rankings feel arbitrary | Named weights, acceptance queries, deterministic tie-breaks, and negative/reordered fixtures. |
| Semantic metadata duplicates TypeScript props | Catalog omits prop lists/defaults and links to canonical source/prop type. |
| A broad CLI becomes hard to maintain | One small implementation entry point and four bounded commands; no plugin/MCP/template system. |
| Optional gallery/test gaps block adoption | Missing declared paths fail; undeclared optional coverage warns and remains visible without blocking. |
| Baseline full check hangs after Jest | Preserve evidence, run targeted Node/type/doctor gates, rerun full check, and report the pre-existing open-handle condition separately. |

---

## Changelog

- 2026-07-22: Pre-merge review reproduced malformed catalog paths escaping into filesystem calls and invalid JSON producing a stack trace. Added RED coverage for malformed array items, invalid JSON, and repository inspection failures; GREEN/REFACTOR now returns machine-clean errors and 24/24 targeted tests pass. Exported canonical `FABProps`/`SnackbarProviderProps` and aligned PuppyHeader accessibility guidance with the real component.
- 2026-07-21: Completed Phase 5 verification. Targeted catalog/CLI 21/21, Node 143/143, typecheck, scaffold/privacy/tokens/text hygiene, CLI smoke, doctor, and diff check passed. Lint retained 21 baseline warnings and no errors. Full check reproduced the baseline Jest open-handle hang after 1275/1275 passing tests.
- 2026-07-21: Final review hardened runtime category validation, malformed-catalog diagnostics, direct/local runtime export coverage, explicit failure for unsupported export-all/default barrel syntax, deterministic code-point sorting, and machine-clean npm JSON examples.
- 2026-07-21: Completed Phase 3 CLI/package integration and Phase 4 canonical documentation/gate integration. AgentShield was not meaningful for this diff because it scanned zero supported config files; repo-native privacy/security guardrails passed.
- 2026-07-21: Completed Phase 1 RED/GREEN/REFACTOR (6/6 search/catalog tests green) and Phase 2 RED/GREEN/REFACTOR (13/13 total tests green). One RED fixture accidentally created its intended missing path; repaired the fixture without weakening the assertion, then re-ran green.
- 2026-07-21: Created PUP-39 plan; locked JSON + TypeScript schema + dependency-free Node CLI approach; recorded clean-main baseline open-handle limitation and TDD mode.
