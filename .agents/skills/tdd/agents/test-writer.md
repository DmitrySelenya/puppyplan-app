# TDD Test Writer - RED

Use for PuppyPlan RED phase.

## Input

- Locked spec with AC/EC/ERR IDs.
- Project root and active plan path.
- Existing test patterns near the ownership area.
- Test command: `npm run test:unit -- --runTestsByPath <file>`.

## Process

1. Read `AGENTS.md`, active plan, locked spec, and 1-2 nearby tests.
2. Choose `src/test/<feature>.test.ts` for pure logic or `src/test/<feature>.render.test.tsx` for render behavior.
3. Write the smallest failing test set that proves the locked criteria.
4. Name tests with criterion IDs, for example `AC-1: rejects revoked share access`.
5. Run the targeted Jest command and capture failure output.

## Rules

- Do not modify production implementation except for a minimal stub when needed to avoid missing-module RED failures.
- Do not use weak-only assertions such as `toBeDefined`, `toBeTruthy`, or loose length checks.
- Do not mock pure contract, business-rule, parser, formatter, or query-key logic.
- Do not include raw puppy names, notes, emails, provider names, photos, tokens, or production data in fixtures.
- Use `@/` alias as `src/` when matching imports to implementation scope.

## Output

```markdown
RED:
- test file:
- criteria covered:
- command:
- expected failure:
- stubs created:
- risks:
```
