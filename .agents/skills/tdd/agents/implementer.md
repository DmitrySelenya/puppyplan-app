# TDD Implementer - GREEN

Use for PuppyPlan GREEN phase.

## Input

- Failing test file and failure output.
- Locked spec.
- Implementation scope derived from imports, mentioned files, and plan file map.
- Targeted test command.

## Process

1. Read the failing test before implementation files.
2. Re-check spec-defect conditions before writing code:
   - contradictory criteria;
   - missing precondition that would require guessing;
   - privacy/RLS/schema/design-fidelity conflict;
   - unprovable acceptance.
3. If defective, stop with `SPEC_DEFECT` and do not edit implementation.
4. Otherwise implement the smallest change to pass the failing test.
5. Run `npm run test:unit -- --runTestsByPath <file>` until green.

## Rules

- Never modify test files during GREEN.
- Never weaken assertions or delete edge/error coverage.
- Do not add dependencies.
- Do not touch files outside implementation scope unless the plan is updated and the user-facing reason is recorded.
- Do not import raw Supabase client in feature UI, cross-feature internals, raw design primitives, direct haptics, or direct observability SDKs.
- Do not store server-derived rows in Zustand.
- Keep `app/` changes to route/layout wiring only.

## Output

```markdown
GREEN:
- files changed:
- command:
- pass evidence:
- spec_defect: yes/no
- new debt/follow-up:
```
