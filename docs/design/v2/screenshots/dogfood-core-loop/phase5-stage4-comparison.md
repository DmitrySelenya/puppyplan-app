# Phase 5 Stage 4 — Diary plan/fact comparison

**Device:** Grith iPhone SE 3 iOS 26.3 (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
**Reference:** `docs/design/v2/specs/dogfood-diary-plan-fact.md`
**Result:** PASS

> **Update (2026-07-12):** the planned rows were reworked from ad-hoc `Card`+button onto the
> canonical `RoutineCard` primitive after owner review. The behavioral claims below still hold;
> for current row visuals see `phase4-stage4-rebuilt/diary-planned-rows.png`.

## Evidence

- `phase5-stage4/mixed-past-final.png` — a spontaneous Observation remains an independent fact;
  overdue Sleep and Feeding occurrences stay neutral and explicitly read `Not logged`.
- `phase5-stage4/mixed-done-final.png` — Sleep check-off keeps its planned time and renders the
  actual completion time (`Done 11:06 PM`) after the foreground refresh.
- Structural render coverage in `src/test/today-core.render.test.tsx` locks empty/loading/error,
  pending/retry/delete, viewer read-only, planned/actual, and generic-potty subtype anatomy.

## Trust-anatomy comparison

| Requirement | Native/result |
|---|---|
| Plan and fact are chronological peers | PASS — mixed native list uses one ordering model. |
| Missed plan is not presented as a failure | PASS — neutral `Not logged`, no red/error styling. |
| Check-off preserves intent and truth | PASS — planned and actual times are both visible. |
| Spontaneous facts are not guessed into routines | PASS — Observation remains standalone. |
| Compact-device navigation remains usable | PASS — no clipped labels or obscured status on SE. |

The first native Sleep check-off correctly exposed a validation failure because a durationless
routine was encoded as retrospective sleep. The recovered implementation emits retrospective sleep
only when a duration exists; its strict insertion regression and the successful native retry are
recorded in the phase verification.
