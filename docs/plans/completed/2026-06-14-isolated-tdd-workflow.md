# Isolated Spec-Driven TDD Workflow - Implementation Plan

> For implementation agents: use `AGENTS.md`, `.agents/skills/implement/SKILL.md`, `.agents/skills/tdd/SKILL.md`, and this plan task-by-task.
> Living document: update checklist items and evidence as workflow docs, skills, or verification results change.

**Goal:** Adopt a PuppyPlan-owned isolated, spec-driven TDD workflow that prevents global Grith skill leakage, treats upstream material as untrusted until reviewed, halts on contradictory specs before tests/code, and documents heavy vs lightweight assurance.

**Status:** Completed (2026-07-07). Workflow shipped (`.agents/skills/tdd` is canonical, PUP-25 evidence recorded); no plan-owned checklist items remain.

**Plan type:** Active task plan.

**Current phase:** Complete locally - follow-up review wording fixes applied and final verification passed in the visible review workspace.

**Architecture:** Agent workflow and docs-only change. No app behavior, schema, RLS, UI, i18n runtime, Supabase, or release surface changes. The workflow strengthens existing gates for contracts, RLS/access, privacy, Quick Log, query/cache, i18n, and design-fidelity work.

**Linear:** `PUP-25` - Adopt isolated spec-driven TDD workflow.

**Branch:** `dimaselenya/pup-25-adopt-isolated-spec-driven-tdd-workflow`

**Worktree:** `/Users/dmitryselenya/.config/superpowers/worktrees/puppy_app/dimaselenya/pup-25-adopt-isolated-spec-driven-tdd-workflow`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - agent-built velocity, contracts, RLS, privacy, Quick Log acceptance.
- Design: `DESIGN.md` - design fidelity, i18n, privacy, and native UI gate references.
- Architecture: `docs/architecture/00-overview.md`, `docs/architecture/18-ai-agent-guide.md`, `docs/architecture/17-testing-ci-release.md`.
- Agent docs: `docs/agents/00-operating-model.md`, `docs/agents/context-engineering.md`, `docs/agents/linear-workflow.md`, `docs/agents/design-fidelity-pipeline.md`.
- Skills: `.agents/skills/plan/SKILL.md`, `.agents/skills/implement/SKILL.md`, `.agents/skills/tdd/SKILL.md`.
- ADR: N/A, no architecture/schema decision change.

---

## Context

- Linear issue `PUP-25` was created in team `PUP` / project `PuppyPlan MVP`, state `In Progress`, labels `docs`, `decision`, `needs-plan`.
- Worktree created from clean `main` on the Linear-generated branch.
- Baseline `npm run check` passed before PuppyPlan edits: lint, typecheck, 61 Jest suites / 411 tests, node tests, scaffold checks, tokens, privacy scan, and text hygiene.
- Project graph context was built externally and reports no current diff impact; graph output is advisory only.
- Global conflict cleanup:
  - Copied Grith-specific global TDD wrapper into `/Users/dmitryselenya/Projects/mens-mental-health-mobile/.claude/skills/tdd/SKILL.md`.
  - Updated Grith `AGENTS.md` and `CLAUDE.md` to require repo-local TDD and not depend on global `~/.codex/skills/tdd`.
  - Renamed global `/Users/dmitryselenya/.codex/skills/tdd` to `/Users/dmitryselenya/.codex/skills/grith-tdd` and changed its frontmatter name to `grith-tdd`.
- Upstream review source is pinned and untrusted until adapted:
  - Repo: `kirillgreen/skills`
  - Commit: `5e1e70987322b4b910a6fb3e9e77b162eab3de41`
  - Reviewed files: `tdd/SKILL.md`, `tdd/agents/tdd-test-writer.md`, `tdd/agents/tdd-implementer.md`, `tdd/agents/tdd-refactorer.md`, `tdd/references/anti_patterns.md`, `tdd/references/framework_configs.md`.
  - Not executed: upstream scripts, hooks, README/docs wholesale, dependencies.
  - Useful patterns: spec-defect halt, role separation, findings ledger, three-dimension verification, shallow-green caveat.
  - Unsafe/non-portable patterns: raw `Task` subagent assumptions, `.tdd/debt.md` writes, generic framework defaults, `/bugfix` routing, Next/Vitest/page-level defaults.
- Spike evidence:
  - Claude full-isolated mode: blocked, `claude --bare ... -p` returned `Not logged in · Please run /login`.
  - Codex lightweight mode: passed. `codex -a never exec --ephemeral --ignore-rules --sandbox read-only ...` returned `STATUS: HALT_SPEC_DEFECT` for contradictory missing-status criteria before tests/code.
  - Decision: default heavy/full-isolated only when isolation runtime is available. High-risk work without authorized isolation tooling must stop unless the user explicitly approves a lower-assurance lightweight run for that exact work.

## Goals

1. **PuppyPlan-owned TDD workflow**
   - `.agents/skills/tdd/` becomes the canonical TDD workflow for PuppyPlan.
   - Global Grith TDD no longer shadows PuppyPlan's `tdd`.
2. **Spec-defect-first behavior**
   - Contradictory or unprovable specs halt before RED.
   - Bugfix work routes through debug/trace, then RED regression, then GREEN.
3. **Assurance modes are explicit**
   - Heavy/full-isolated is required for high-risk surfaces.
   - Lightweight is allowed for low-risk edits. For high-risk work with unavailable or unauthorized isolation tooling, the workflow stops unless the user explicitly approves a lower-assurance lightweight run for that exact work.
4. **Workflow is canonized**
   - Agent docs and plan template teach future agents how to choose and record TDD mode, evidence, and debt.

## Non-Goals

- No production, release, deploy, migration, EAS, TestFlight, App Store, Supabase production, push, PR publication, commit, rebase, or dependency action.
- No app runtime behavior changes.
- No schema, RLS, Edge Function, UI, or generated native project edits.
- No wholesale vendoring of upstream README/docs.

## Locked Decisions

1. **Debt ledger location**
   - **Chosen:** Linear comments plus active plan notes, not `.tdd/debt.md`.
   - **Reason:** PuppyPlan uses Linear and repo plans as workflow truth; hidden local debt files are easy to miss.
2. **Bugfix route**
   - **Chosen:** debug/trace -> RED regression -> GREEN.
   - **Reason:** PuppyPlan does not have `/bugfix`; bug fixes need root-cause evidence before TDD implementation.
3. **Codex lightweight**
   - **Chosen:** allowed for small low-risk work. For high-risk work with unavailable or unauthorized isolation tooling, the workflow stops unless the user explicitly approves a lower-assurance lightweight run for that exact work.
   - **Reason:** Codex lightweight spike halted correctly, but it is not equivalent to full isolated role separation.
4. **Claude full-isolated**
   - **Chosen:** not default-on until runtime is available and verified.
   - **Reason:** local `claude` CLI is not logged in on this machine.

## Deferred Verification

- Heavy/full-isolated mode was not forward-tested end-to-end in PUP-25 because the local Claude CLI was not logged in.
- The high-risk stop-or-exact-approval branch is required by the workflow text, but still needs a future practical exercise with an authenticated isolation runtime before it is treated as runtime-verified.
- The PUP-25 eval matrix below records coverage by method; `Covered (inspection)` means the workflow text was checked, not that an end-to-end run produced the expected outcome.

## Invariants And Executable Spec

- **Invariant 1:** Contradictory specs halt before tests/code.
  - **Evidence:** Spike output in this plan; future skill evals must include contradictory access and Quick Log 3s/60s contradiction scenarios.
- **Invariant 2:** High-risk work cannot silently use lightweight TDD.
  - **Evidence:** Skill and docs must list heavy/full-isolated required surfaces and require exact user approval before any lower-assurance lightweight high-risk run.
- **Invariant 3:** Green tests are evidence, not proof.
  - **Evidence:** Skill and docs must include shallow-green caveat and mention property/mutation-style checks when risk justifies them.
- **Invariant 4:** PuppyPlan gates are explicit in TDD.
  - **Evidence:** Skill must mention RLS/access, privacy, i18n, schema-without-ADR, Quick Log 3s/60s, design-fidelity, unprovable acceptance, and forbidden scope edits.

## File Map

### Skill
- `.agents/skills/tdd/SKILL.md` - orchestrator.
- `.agents/skills/tdd/agents/test-writer.md` - RED role prompt.
- `.agents/skills/tdd/agents/implementer.md` - GREEN role prompt.
- `.agents/skills/tdd/agents/refactorer.md` - REFACTOR role prompt.
- `.agents/skills/tdd/references/eval-scenarios.md` - baseline-vs-new scenarios and evidence.

### Docs
- `.agents/README.md`
- `docs/agents/context-engineering.md`
- `docs/agents/00-operating-model.md`
- `docs/architecture/18-ai-agent-guide.md`
- `AGENTS.md`
- `docs/plans/TEMPLATE-feature-plan.md`
- `docs/plans/README.md`

### External Grith Cleanup
- `/Users/dmitryselenya/Projects/mens-mental-health-mobile/.claude/skills/tdd/SKILL.md`
- `/Users/dmitryselenya/Projects/mens-mental-health-mobile/AGENTS.md`
- `/Users/dmitryselenya/Projects/mens-mental-health-mobile/CLAUDE.md`
- `/Users/dmitryselenya/.codex/skills/grith-tdd/SKILL.md`

## Implementation Plan

### Phase 0 - Setup, Linear, Worktree, Baseline

**Checklist:**
- [x] Create `PUP-25` in `PUP` / `PuppyPlan MVP`.
- [x] Use Linear-generated branch in a separate worktree from clean `main`.
- [x] Install worktree dependencies without tracked changes.
- [x] Run baseline `npm run check`.

**Evidence:** Baseline `npm run check` passed on 2026-06-14.

### Phase 1 - Global Grith Cleanup And Upstream Review

**Checklist:**
- [x] Preserve Grith TDD guidance in Grith repo-local docs.
- [x] Rename global generic `tdd` to `grith-tdd`.
- [x] Review pinned upstream files as untrusted source material.
- [x] Run cheap spec-defect halt spike.

**Evidence:** See Context section for file list and spike result.

### Phase 2 - Port PuppyPlan TDD Skill

**Checklist:**
- [x] Replace `.agents/skills/tdd/SKILL.md` with compact PuppyPlan orchestrator.
- [x] Add role prompts under `.agents/skills/tdd/agents/`.
- [x] Add eval scenarios under `.agents/skills/tdd/references/`.
- [x] Include Jest-Expo adapter: `src/test/**/*.test.ts[x]`, `npm run test:unit -- --runTestsByPath <file>`, final `npm run check`.
- [x] Include `@/` alias and centralized `src/test` scope extraction.
- [x] Replace upstream `/bugfix` with debug/trace -> RED regression -> GREEN.
- [x] Map acknowledged debt to Linear comments and active plan notes.
- [x] Add PuppyPlan gates and shallow-green caveat.

### Phase 3 - Canonize Docs

**Checklist:**
- [x] Update `.agents/README.md`.
- [x] Update `docs/agents/context-engineering.md`.
- [x] Update `docs/agents/00-operating-model.md`.
- [x] Update `docs/architecture/18-ai-agent-guide.md`.
- [x] Update `AGENTS.md`.
- [x] Update `docs/plans/TEMPLATE-feature-plan.md`.
- [x] Update `docs/plans/README.md`.

### Phase 4 - Verification And Linear Evidence

**Checklist:**
- [x] Run `python3 /Users/dmitryselenya/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/tdd`.
- [x] Run `npm run check`.
- [x] Record final evidence in this plan.
- [x] Mirror progress and verification to Linear `PUP-25`.

## Baseline-Vs-New Eval Scenarios

Required scenarios are tracked in `.agents/skills/tdd/references/eval-scenarios.md`:

- Contradictory access spec.
- Quick Log 3s/60s contradiction.
- Analytics PII leak.
- Revoked share access.
- Query invalidation miss.
- Raw i18n string.
- Native-only UI gap.
- Bugfix regression.

### PUP-25 Eval Results

Evidence status legend:

- `Verified (spike)`: a runtime exercise produced the expected workflow outcome.
- `Covered (inspection)`: the workflow text contains the required halt, route, or gate, but the named scenario was not run end-to-end.
- `Blocked (runtime)`: the intended runtime could not be exercised locally.

Only the Codex lightweight contradictory missing-status spike was forward-tested in PUP-25. The eight named scenarios below are coverage checks unless the method explicitly says otherwise. No independent full-isolated forward-test was run because the local Claude CLI was not logged in; high-risk use of lightweight mode now requires exact user approval.

| Scenario | Expected result | Method | Coverage status | Evidence |
|---|---|---|---|---|
| Contradictory access spec | `HALT_SPEC_DEFECT` | Static inspection; related Codex lightweight contradiction spike | Covered (inspection); generic contradiction halt verified (spike) | Spec-defect halt covers mutually exclusive criteria and RLS/access conflicts. The related spike returned `STATUS: HALT_SPEC_DEFECT` for contradictory criteria before tests/code. |
| Quick Log 3s/60s contradiction | `HALT_SPEC_DEFECT` | Static inspection | Covered (inspection) | Spec-defect halt explicitly covers conflicts with the 3-second double-tap and 60-second duplicate-warning rules. |
| Analytics PII leak | `HALT_SPEC_DEFECT` | Static inspection | Covered (inspection) | Spec-defect halt covers privacy requirements that expose raw puppy names, notes, emails, provider names, photos, tokens, or production data. |
| Revoked share access bug | `RED_REQUIRED` plus RLS/access gate | Static inspection | Covered (inspection) | Bugfix route requires debug/trace evidence, RED regression, GREEN fix; PuppyPlan gates require RLS/access enforcement evidence. |
| Query invalidation miss | `RED_REQUIRED` plus cache gate | Static inspection | Covered (inspection) | RED requirements cover locked criteria first; PuppyPlan gates require query key, invalidation, optimistic update, rollback, and offline/pending behavior evidence when touched. |
| Raw i18n string | `GATE_REQUIRED` | Static inspection | Covered (inspection) | PuppyPlan gates require no raw user-facing strings and EN/RU/ES parity/string-budget checks. |
| Native-only UI gap | `HALT_SPEC_DEFECT` or Stage 0 gate | Static inspection | Covered (inspection) | Spec-defect halt covers missing design-fidelity artboards/states; PuppyPlan gates require Stage 0 through Stage 4 design fidelity. |
| Bugfix regression | `RED_REQUIRED` | Static inspection | Covered (inspection) | Bugfix route requires root-cause evidence before a RED regression test and forbids jumping straight to GREEN. |

## Verification Log

- 2026-06-14: `npm run check` before PuppyPlan edits passed: lint, typecheck, 61 Jest suites / 411 tests, node tests, scaffold checks, tokens, privacy scan, text hygiene.
- 2026-06-14: `claude --bare ... -p` spike blocked because Claude CLI is not logged in.
- 2026-06-14: Codex lightweight spike returned `STATUS: HALT_SPEC_DEFECT` for contradictory missing-status criteria.
- 2026-06-14: Deep-review fix recorded the full PUP-25 eval coverage matrix for contradiction, privacy, access, i18n, design-fidelity, query/cache, Quick Log, and bugfix scenarios.
- 2026-06-14: `git diff --check` passed.
- 2026-06-14: `/Users/dmitryselenya/.cache/codex-project-graph/runtime/venv/bin/python /Users/dmitryselenya/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/tdd` passed with `Skill is valid!`. The default and bundled Python interpreters lacked `yaml`, so the existing project-graph managed runtime was used; no dependency was installed.
- 2026-06-14: Final `npm run check` passed: lint, typecheck, 61 Jest suites / 411 tests, node tests, scaffold checks, tokens, privacy scan, text hygiene. Jest emitted the same React `act(...)` console warning in `screen-header.render.test.tsx` seen in the baseline run; it did not fail the gate.
- 2026-06-14: Deep-review fix verification passed: `git diff --check`, `git diff --cached --check`, `/Users/dmitryselenya/.cache/codex-project-graph/runtime/venv/bin/python /Users/dmitryselenya/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/tdd`, and `npm run check`. The same non-failing React `act(...)` console warning appeared in `screen-header.render.test.tsx`.
- 2026-06-14: Follow-up review wording fix relabeled inspection-only eval rows from `Pass` to method/status-based coverage and recorded deferred heavy-mode plus stop-or-exact-approval forward verification.
- 2026-06-14: Follow-up review verification passed: `/Users/dmitryselenya/.cache/codex-project-graph/runtime/venv/bin/python /Users/dmitryselenya/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/tdd`, `git diff --check`, `git diff --cached --check`, and `npm run check`. The same non-failing React `act(...)` console warning appeared in `screen-header.render.test.tsx`.

## Changelog

- 2026-06-14: Created `PUP-25`, isolated worktree, baseline gate, Grith cleanup, upstream review, and spec-defect spike evidence.
- 2026-06-14: Ported PuppyPlan TDD v2 orchestrator, role prompts, eval scenarios, Jest-Expo adapter, spec-defect halt, bugfix route, debt mapping, gates, and shallow-green caveat.
- 2026-06-14: Canonized heavy vs lightweight TDD, spec-defect halt, reduced-assurance disclosure, and shallow-green caveat across agent docs and plan template.
- 2026-06-14: Final local validation passed; Linear evidence posted in comment `481f47a6-1d43-4a80-9d4c-2e615c42e4d7`.
- 2026-06-14: Addressed deep-review findings: tightened high-risk lightweight TDD wording, recorded eval coverage matrix, updated plan index handoff wording, and reran final local validation.
- 2026-06-14: Addressed follow-up review note by replacing misleading `Pass` eval labels with method/status coverage language and recording deferred heavy-mode verification.
- 2026-06-14: Reran follow-up review verification locally; all gates passed with the previously noted non-failing React `act(...)` warning.
