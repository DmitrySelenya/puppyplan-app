---
name: tdd
description: Use when adding or changing PuppyPlan behavior, fixing bugs, or implementing acceptance criteria - runs spec-driven RED/GREEN/REFACTOR with PuppyPlan contracts, RLS/access, privacy, i18n, Quick Log, query/cache, and design-fidelity gates.
---

# PuppyPlan Spec-Driven TDD

## Purpose

Run PuppyPlan behavior work through a spec-first RED -> GREEN -> REFACTOR loop. The workflow must halt before tests/code when the spec is contradictory, unimplementable, privacy-unsafe, or impossible to prove.

## Mode Selection

Use **heavy/full-isolated** for:

- new behavior;
- security, privacy, RLS, sharing, auth, or permission work;
- contracts, schema, Edge Functions, query/cache, Quick Log queue/dedupe, observability, analytics, i18n, or design-fidelity risk;
- cross-boundary changes or anything with irreversible user/data impact.

Heavy mode means separate RED, GREEN, and REFACTOR context. Use available isolated agents or separate clean context. If isolation tools are unavailable or not authorized, stop for high-risk work unless the user explicitly accepts a lower-assurance lightweight run.

Use **lightweight** only for small low-risk edits. If high-risk work lacks authorized isolation tooling, stop unless the user explicitly approves a lower-assurance lightweight run for that exact work. Always state: `TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.`

## Read First

1. `AGENTS.md`
2. `PUP-___` Linear issue and linked active plan
3. Relevant source docs from `docs/INDEX.md`
4. Current files/tests in the ownership area
5. Role prompt when running a phase:
   - `agents/test-writer.md`
   - `agents/implementer.md`
   - `agents/refactorer.md`

## Spec Lock

Before RED, lock a small spec in the active plan or Linear issue:

```markdown
### Acceptance Criteria
- AC-1: ...
- AC-2: ...
### Edge Cases
- EC-1: ...
### Error Cases
- ERR-1: ...
### Constraints
- ...
### Out of Scope
- ...
```

Each criterion must be deterministic, atomic, input-complete, and testable. If a criterion uses vague language such as "properly", "robust", "fast", "etc.", or joins multiple behaviors with "and", clarify or split it before RED.

## Spec-Defect Halt

Halt before tests/code when any condition is true:

- two criteria require mutually exclusive behavior;
- RLS/access behavior conflicts with UI-only enforcement;
- a privacy requirement would expose raw puppy names, notes, emails, provider names, photos, tokens, or production data;
- schema changes lack ADR-0007 approval;
- Quick Log timing conflicts with 3-second accidental double tap or 60-second duplicate-care warning;
- design-fidelity acceptance cannot name source artboards/states for UI work;
- acceptance cannot be proven by an automated or named manual check;
- required scope crosses feature boundaries without a plan/ADR.

Record the halt in the plan and Linear with the conflicting criteria and next question. Do not write tests or code until the spec is repaired.

## Bugfix Route

For bugs, do not jump straight to GREEN:

1. Debug/trace the active path and record root cause evidence.
2. Write a RED regression test that fails for the observed bug.
3. Implement the smallest GREEN fix.
4. Refactor only while green.

## PuppyPlan Test Adapter

- Test files live under `src/test/**/*.test.ts` and `src/test/**/*.test.tsx`.
- Targeted Jest-Expo command: `npm run test:unit -- --runTestsByPath <file>`.
- Final local gate: `npm run check`.
- `@/foo` resolves to `src/foo`; include both `@/` and relative imports when extracting implementation scope.
- App routes in `app/` stay thin. Implementation scope should usually be under `src/`, `supabase/`, docs, or tests.

## RED

Use `agents/test-writer.md`.

Requirements:

- Write the smallest test or test set that proves the locked criteria.
- Test names include criterion IDs in spec-based mode.
- Tests fail for the expected reason, not import typos or broken setup.
- Pure contract/business logic tests use exact-value assertions.
- Do not use broad mocks for pure modules.
- Do not modify production code during RED.

If a new module import is required, create only a minimal stub needed for the test to fail on behavior, not on missing module. Record the stub as part of RED evidence.

## GREEN

Use `agents/implementer.md`.

Requirements:

- Read the failing test and implementation scope first.
- Modify only files needed to pass the RED test.
- Never weaken, delete, or rewrite tests during GREEN.
- If the implementation would require guessing around a spec defect, halt and return to Spec Lock.
- Run the targeted command until green.

## REFACTOR

Use `agents/refactorer.md`.

Requirements:

- Run targeted tests before refactoring.
- Refactor only behavior-preserving code.
- Do not add new behavior, dependencies, or broad abstractions.
- Re-run targeted tests after each meaningful refactor.

## PuppyPlan Gates

Check these before final verification:

- **RLS/access:** UI guards are convenience only; RLS or Edge Functions enforce access.
- **Privacy:** no raw private data in logs, analytics, fixtures, docs, screenshots, Linear, or PR text.
- **Schema:** no schema change beyond ADR-0007 baseline without approved ADR process.
- **Quick Log:** 3-second double-tap and 60-second duplicate warning constants remain in `src/contracts/business-rules.ts` and are tested.
- **Query/cache:** query keys, invalidation, optimistic update, rollback, and offline/pending behavior are tested when touched.
- **i18n:** no raw user-facing strings; EN/RU/ES parity and string budgets apply.
- **Design fidelity:** UI work follows `docs/agents/design-fidelity-pipeline.md` from Stage 0 before code through Stage 4 comparison before Done.
- **Scope:** feature code must not import other feature internals, raw Supabase client, raw design primitives, raw haptics, or direct observability SDK calls.

## Debt And Evidence

Do not create `.tdd/debt.md`. Record acknowledged gaps in:

- the active plan checklist/changelog;
- a concise Linear comment on the primary issue.

Every TDD session report must include:

```markdown
## TDD Session

Mode: heavy/full-isolated | lightweight (reduced assurance reason)
Spec: [plan/Linear location]

### RED
- command:
- expected failure:

### GREEN
- command:
- pass evidence:

### REFACTOR
- changed/skipped:
- command:

### Gates
- RLS/access:
- privacy:
- i18n:
- Quick Log:
- design fidelity:

### Final Verification
- command:
- result:

### Debt / Follow-up
- Linear comment or plan note:
```

## Shallow-Green Caveat

Green tests are evidence, not proof. Hardcoded lookup-table implementations can pass example tests. For risky pure logic, contracts, permission projections, Quick Log dedupe, or parser/formatter rules, add property-style, mutation-style, or negative tests when feasible without new dependencies. If stronger checks need a dependency, ask first.

## Eval Scenarios

Before making this workflow default for a new high-risk surface, compare the old and new behavior against `references/eval-scenarios.md`. At minimum, verify contradiction halt, privacy halt, access halt, i18n detection, design-fidelity routing, and bugfix regression flow.
