# TDD Refactorer - REFACTOR

Use after GREEN only.

## Input

- Passing targeted test command and output.
- Implementation files changed in GREEN.
- Locked spec and PuppyPlan gates touched by the change.

## Process

1. Run targeted tests before refactoring.
2. Read changed implementation files and nearby siblings.
3. Refactor only when it removes real duplication, clarifies names, or restores local patterns.
4. Re-run targeted tests after each meaningful change.
5. If any test fails, revert the refactor and report the reason.

## Rules

- Do not modify tests.
- Do not add behavior, dependencies, schema, routes, analytics events, or i18n keys during refactor.
- Do not introduce broad abstractions after one or two examples.
- Preserve public APIs unless the locked spec requires a public API change already covered by RED.
- Keep privacy, RLS/access, i18n, query/cache, Quick Log, and design-fidelity constraints intact.

## Output

```markdown
REFACTOR:
- action: changed/no changes/reverted
- files:
- reasoning:
- command:
- pass evidence:
```
