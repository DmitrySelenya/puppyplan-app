# Canonical Routine Editor — Stage 4 Comparison

**Result:** FAILED — retracted 2026-07-12 (owner visual review)
**Date:** 2026-07-11
**Target:** `Grith iPhone SE 3 iOS 26.3` (`750x1334` capture)

> **Retraction (2026-07-12):** the owner's on-device review showed this screen did not match the
> `dogfood.schedule.01` reference or its own spec card: event/repeat/weekday choices rendered as
> bare tertiary text links instead of raised tiles/chips, there were no section groupings for
> Time/Repeat/Details, the unlabeled native time control floated at the bottom, and the weekday row
> wrapped `Su` onto its own line on SE. The PASS rows below are retained for audit only and must not
> be cited as evidence. The editor was rebuilt on 2026-07-12 with section cards and the approved
> selected-chip pattern; the fresh per-state comparison lives in `phase4-stage4-rebuilt.md`.

The native routine editor was compared against `dogfood.schedule.01` and the approved Clay/Sage
Stage 0 extension. All entered data is synthetic. The implementation keeps the native time/date
controls, canonical event taxonomy, contextual details, compact-SE reflow, and post-save permission
primer required by the design contract.

| State | Native evidence | Comparison |
| --- | --- | --- |
| Empty create | [Canonical create form](phase4-stage4/routine-create-final.png) | PASS — required event guidance, seven event choices, repeat choices, and native time are visible without clipped labels. |
| Daily save | [Post-save primer](phase4-stage4/routine-daily-primer-final.png) | PASS — permission education appears only after the durable save and `Not now` leaves the routine active. |
| Custom weekdays | [Custom-day form](phase4-stage4/routine-custom-final.png) | PASS — full localized weekday accessibility labels back compact visual labels and selected states. |
| One-off | [One-off sleep form](phase4-stage4/routine-one-off-final.png) | PASS — Once reveals the native date control and contextual duration without unrelated amount fields. |
| Restarted hub | [Persisted routines](phase4-stage4/routine-restart-hub-final.png) | PASS — daily Feeding, one-off Sleep, and Mon/Wed/Fri Observation reappear with truthful recurrence labels; a legacy free-form row is visible and explicitly marked notifications-off. |

Recovery note: a direct-link-only smoke has no navigation back stack, so reusing the same route after
the primer left that component mounted. Process-isolated retries plus a read-only PuppyPlan Dev query
proved the exact persisted rules: `daily`, `{days:[1,3,5]}`, and `never` with its date. The native hub
capture confirms the same server-backed rows after restart.

