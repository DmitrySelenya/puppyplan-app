# Dogfood Core Loop — Stage 0 Review Package

Date: 2026-07-11
Plan: `docs/plans/active/2026-07-11-dogfood-core-loop.md`
Status: approved direction, ready for UI implementation. The user explicitly delegated visual
direction and authorized the agent to select the final UX/UI treatment.

| Stable ID | Surface | Spec | Fresh reference status |
| --- | --- | --- | --- |
| `dogfood.quick-log.01` | Quick Log fast lane | `dogfood-quick-log-sheet.md` | Existing V2 atlas extended by named deviations |
| `dogfood.quick-log.details.01` | Detailed composer | `dogfood-quick-log-details.md` | Fresh Clay/Sage review export; approved direction |
| `dogfood.schedule.01` | Schedule form | `dogfood-schedule-form.md` | Canonical board + custom-weekday deviation recorded |
| `dogfood.diary.01` | Diary plan/fact | `dogfood-diary-plan-fact.md` | Canonical board + plan/fact deviation recorded |
| `dogfood.permission.01` | Permission primer/fallback | `dogfood-notification-permission.md` | Primer + denied/authorized return states in fresh review export |

## Proposed design decisions for approval

1. Custom weekdays extend the schedule reference.
2. Training/play and observation live in detailed capture, never forced into five selected tiles.
3. Completed routines show planned and actual times together.
4. Past-unmarked copy is neutral `Not logged`; no streak chip or red missed state.
5. Dense Diary cards show a private-note indicator only, never raw note preview.
6. Routine save succeeds independently of notification permission; primer follows explicit save.

## Synthetic-data and device lock

- All retained references are synthetic design data.
- Primary comparison target: `Grith iPhone SE 3 iOS 26.3` compact portrait.
- Loading, empty, cached-offline, pending, recoverable error, viewer, and Dynamic Type states remain
  mandatory even where a dedicated reference export is still pending.

## Gate result

`PASS / user-delegated design direction recorded.` The fresh review export is
`screenshots/dogfood-core-loop/stage0-variants-reference.png`; it covers the detailed composer,
permission primer, denied fallback, privacy promise, and synthetic recovery language. The schedule
and Diary exports remain the canonical companion references. Native implementation must still pass
Stage 4 per-screen comparison and the accessibility gates.
