# PuppyPlan TDD Eval Scenarios

Use these scenarios to compare the old TDD workflow against the new spec-driven workflow. Record results in the active plan and Linear.

## Expected Result Legend

- `HALT_SPEC_DEFECT`: stop before tests/code and ask for spec repair.
- `RED_REQUIRED`: write a failing test before implementation.
- `GATE_REQUIRED`: continue only after the named PuppyPlan gate has evidence.
- `LIGHTWEIGHT_WARNING`: allowed only with reduced-assurance disclosure.

## Scenarios

### 1. Contradictory Access Spec

Spec:
- AC-1: revoked trainer shares cannot read routine event notes.
- AC-2: revoked trainer shares can read routine event notes for continuity.

Expected: `HALT_SPEC_DEFECT` because access requirements conflict.

### 2. Quick Log 3s/60s Contradiction

Spec:
- AC-1: accidental double-tap suppression lasts 3 seconds.
- AC-2: accidental double-tap suppression lasts 10 seconds.
- AC-3: duplicate-care warning lasts 60 seconds.

Expected: `HALT_SPEC_DEFECT` unless AC-2 is removed or explicitly re-scoped away from the named business rule.

### 3. Analytics PII Leak

Spec:
- AC-1: analytics event includes raw puppy name and freeform note text.
- Constraint: no raw puppy names or notes in analytics.

Expected: `HALT_SPEC_DEFECT` for privacy conflict.

### 4. Revoked Share Access

Bug report:
- Revoked trainer share can still load a share preview.

Expected: debug/trace existing path, then `RED_REQUIRED` regression test for revoked access denial. RLS/access gate must be recorded.

### 5. Query Invalidation Miss

Spec:
- AC-1: Quick Log insert updates Today.
- AC-2: Quick Log insert updates Timeline.
- Constraint: Realtime is enhancement only.

Expected: `RED_REQUIRED` for query key/invalidation behavior; `GATE_REQUIRED` for cache evidence.

### 6. Raw i18n String

Spec:
- AC-1: add a visible error message to a screen.
- Implementation proposal includes a raw English string in JSX.

Expected: `GATE_REQUIRED` for typed i18n key and EN/RU/ES parity before final verification.

### 7. Native-Only UI Gap

Spec:
- AC-1: new Quick Log UI state matches atlas artboard.
- Missing: artboard ID, state name, screenshot reference, or approved deviation.

Expected: `HALT_SPEC_DEFECT` or `GATE_REQUIRED` at Stage 0 Design Lock before code.

### 8. Bugfix Regression

Bug report:
- Existing formatter returns the wrong duplicate-warning copy.

Expected: debug/trace root cause, then `RED_REQUIRED` regression test that fails before the fix; no implementation-first patch.

## Spike Evidence From PUP-25

Contradictory `parseRoutineEventStatus` spec:
- AC-1: missing status returns `"pending"`.
- AC-2: missing status throws `RangeError`.
- AC-3: `"synced"` returns `"synced"`.

Result:
- Claude full-isolated: unavailable locally, CLI returned `Not logged in`.
- Codex lightweight: returned `STATUS: HALT_SPEC_DEFECT` before tests/code.

Decision:
- Full isolation is required for high-risk default mode only when runtime is available and verified.
- Lightweight mode remains lower assurance. For high-risk work, missing or unauthorized isolation tooling is a stop condition unless the user explicitly approves a lower-assurance lightweight run for that exact work.

## PUP-25 Eval Result Summary

Evidence status legend:

- `Verified (spike)`: a runtime exercise produced the expected workflow outcome.
- `Covered (inspection)`: the workflow text contains the required halt, route, or gate, but the named scenario was not run end-to-end.
- `Blocked (runtime)`: the intended runtime could not be exercised locally.

Only the Codex lightweight contradictory missing-status spike was forward-tested in PUP-25. The eight named scenarios below are coverage checks unless the method explicitly says otherwise. Full-isolated forward-testing was not available locally because the Claude CLI was not logged in.

| Scenario | Method | Coverage status | Evidence |
|---|---|---|---|
| Contradictory access spec | Static inspection; related Codex lightweight contradiction spike | Covered (inspection); generic contradiction halt verified (spike) | Spec-defect halt covers mutually exclusive criteria and RLS/access conflicts. The related spike returned `STATUS: HALT_SPEC_DEFECT` for contradictory criteria before tests/code. |
| Quick Log 3s/60s contradiction | Static inspection | Covered (inspection) | Spec-defect halt covers conflicts with the named 3-second and 60-second business rules. |
| Analytics PII leak | Static inspection | Covered (inspection) | Spec-defect halt covers privacy requirements that expose raw private data. |
| Revoked share access | Static inspection | Covered (inspection) | Bugfix route requires trace evidence plus RED regression; gates require RLS/access evidence. |
| Query invalidation miss | Static inspection | Covered (inspection) | Query/cache gate requires key, invalidation, optimistic update, rollback, and offline/pending evidence when touched. |
| Raw i18n string | Static inspection | Covered (inspection) | i18n gate requires typed keys plus EN/RU/ES parity and string budgets. |
| Native-only UI gap | Static inspection | Covered (inspection) | Spec-defect halt covers missing design-fidelity artboards/states before code. |
| Bugfix regression | Static inspection | Covered (inspection) | Bugfix route requires root-cause evidence before RED regression and GREEN. |

Deferred verification:
- Heavy/full-isolated mode still needs a future authenticated-runtime forward test.
- The high-risk stop-or-exact-approval branch still needs a future practical exercise before it is treated as runtime-verified.
