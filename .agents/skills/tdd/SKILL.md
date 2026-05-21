---
name: tdd
description: Use when adding or changing PuppyPlan behavior with clear acceptance criteria - runs RED, GREEN, REFACTOR with contract, RLS, query, and Quick Log invariants in mind.
---

# PuppyPlan TDD

## Use When

- Implementing new behavior.
- Fixing a bug.
- Refactoring behavior that needs confidence.
- Changing contracts, query/cache behavior, Edge Functions, RLS policies, or Quick Log logic.

For purely visual adjustments, use focused UI smoke checks instead of forcing TDD.

## Read First

- `AGENTS.md`
- Relevant `PUP-___` issue
- Relevant plan phase
- Current test convention in the repo
- Source docs for the behavior

## Cycle

```text
RED -> GREEN -> REFACTOR
```

1. RED: write the smallest failing test for the required behavior.
2. Run it and verify it fails for the right reason.
3. GREEN: write the smallest production change to pass.
4. Re-run the targeted test.
5. REFACTOR only while green.
6. Run the broader area gate before claiming completion.

## PuppyPlan Test Targets

- Contracts and business rules: pure TypeScript tests.
- Quick Log invariants: test named constants rather than re-hardcoding literals.
- Query/cache behavior: test keys, invalidation, optimistic update, and rollback.
- RLS: pgTAP under `supabase/tests/`.
- Edge Functions: handler/shared utility tests where possible.
- UI flows: Maestro or simulator smoke only once an installable dev build exists.

## Rules

- Do not write broad implementation first and tests after for behavior changes.
- Do not refactor while tests are red.
- Do not mock what you do not understand.
- Do not add test-only production APIs without an ADR.
- Do not claim success without actual command output.

## Output

```markdown
## TDD Session

### Tests written
- ...

### RED
- command and failure:

### GREEN
- command and pass:

### Refactor
- ...

### Files changed
- ...
```
