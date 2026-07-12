# Rebuilt Routine Editor — Stage 4 Comparison (2026-07-12)

**Result:** PASS with named deviations
**Date:** 2026-07-12
**Target:** `Grith iPhone SE 3 iOS 26.3` (`750x1334` capture)
**Reference:** `dogfood.schedule.01` (`schedule-form-reference.png`) + spec card
`../../specs/dogfood-schedule-form.md`
**Supersedes:** `phase4-stage4-comparison.md` (retracted 2026-07-12)

The editor was rebuilt on 2026-07-12 after the owner retracted the original PASS. This comparison
was made against fresh on-device captures, not from memory. All entered data is synthetic.

| State | Native evidence | Comparison |
| --- | --- | --- |
| Empty create | [Create form](phase4-stage4-rebuilt/routine-create-empty.png) | PASS — raised `TrackerTile` event grid with icons (3-up, Observation full width), Event/Time/Repeat section cards, selected repeat chip filled, inline event-required guidance. |
| Observation validation | [Title-or-note error](phase4-stage4-rebuilt/routine-create-observation-validation.png) | PASS — Observation tile selected with corner check, field labeled `Title` (not "Optional title"), inline danger error, Save disabled. |
| Edit daily feeding | [Prefilled edit](phase4-stage4-rebuilt/routine-edit-daily-feeding.png) | PASS — Feeding tile selected, Every day filled, native compact time picker inside the Time section. |
| One-off | [Top](phase4-stage4-rebuilt/routine-edit-one-off-sleep.png) · [Date section](phase4-stage4-rebuilt/routine-edit-one-off-sleep-date.png) | PASS — Once reveals the native compact date control inside the schedule card plus contextual Duration; no unrelated amount field. |
| Custom weekdays | [Top](phase4-stage4-rebuilt/routine-edit-custom-observation.png) · [Repeat section](phase4-stage4-rebuilt/routine-edit-custom-observation-repeat.png) | PASS — Custom filled, Mon–Sun fit one row on SE with selected-day fills; localized full-name a11y labels backed by render test AC-P4-UI-5. |
| Hub after edits | [Persisted routines](phase4-stage4-rebuilt/reminders-hub.png) | PASS — canonical rows show truthful recurrence (`Every day · 07:30`, `Once · … · 07:30`, `Mo, We, Fr · 07:30`); the legacy free-form row is explicitly marked notifications-off. |
| Diary planned rows | [RoutineCard rows](phase4-stage4-rebuilt/diary-planned-rows.png) | PASS — planned items use the canonical `RoutineCard` (time gutter, check circle, icon chip, sage done state with `Done 8:14 AM` meta). |

## Named deviations vs `dogfood.schedule.01`

- Header title is `Routine` (approved i18n), not the board's "Add to schedule".
- Details (title, amount/duration, private note) render as inline `TextField`s instead of the
  board's grouped disclosure rows; contextual visibility matches the board.
- Time/date use the inline native compact picker instead of a disclosure row that opens the
  picker; the spec's hard rule ("native picker is not recreated") is satisfied.
- Section headings are card headlines rather than small-caps group labels.
- Event taxonomy is the canonical seven trackers (spec-approved deviation: Training,
  Observation, custom weekdays, Once date).

## States covered by render tests instead of device captures

Save-error/retry (AC-P4-UI-3), viewer read-only (AC-P4-UI-4), empty custom-day error
(AC-P4-UI-6), observation title label swap (AC-P4-UI-7) in `src/test/routine-editor.render.test.tsx`.
Dynamic Type XXXL and long-text sweeps remain for the next manual device pass.

## Release sweep — accessibility XXXL / long text (2026-07-12)

**Result:** FAIL — stopped on the first required surface
**Build:** local Release, embedded JS bundle, Metro stopped
**Target:** `Grith iPhone SE 3 iOS 26.3` (`750x1334` capture)
**Content size:** `accessibility-extra-extra-extra-large`

| Surface | Native evidence | Result |
| --- | --- | --- |
| Diary | [Reference vs accessibility XXXL](phase4-stage4-rebuilt/release-sweeps/diary-ax-xxxl-side-by-side.png) · [raw XXXL capture](phase4-stage4-rebuilt/release-sweeps/diary-ax-xxxl.png) | **FAIL** — the greeting grows to occupy almost the entire viewport, pushing the week strip and diary rows below the first screen. The bottom capsule keeps large `Diary / Pet / More` labels instead of the specified icon-only fallback and crowds the separate FAB. |

The sweep stopped immediately under the device-handoff plan's defect rule. Quick Log composer,
routine editor, and long-text device captures were **not run** and are not claimed. The simulator
content size was restored to `large` after capture. All visible data in the evidence is synthetic.

### Authorized Diary retry after the narrow XXXL fix

**Result:** FAIL — the two authorized symptoms improved, but the surface still does not pass

| Surface | Native evidence | Result |
| --- | --- | --- |
| Diary retry | [Default vs accessibility XXXL after fix](phase4-stage4-rebuilt/release-sweeps/diary-ax-xxxl-after-fix-side-by-side.png) · [default](phase4-stage4-rebuilt/release-sweeps/diary-default-after-ax-fix.png) · [raw XXXL](phase4-stage4-rebuilt/release-sweeps/diary-ax-xxxl-after-fix.png) | **FAIL** — the greeting now respects its `1.8` ceiling and the capsule correctly becomes icon-only, but the week-strip labels/dates overlap and clip at XXXL, while the InfoHero text expands across the remainder of the first viewport. |

This retry used a freshly rebuilt local Release with an embedded bundle and no TCP 8081 listener.
The new WeekStrip/InfoHero failures are outside the owner's authorized two-part correction, so the
sweep stopped again without fix-forward. Quick Log composer, routine editor, and long-text captures
remain unrun. Content size was restored to `large`; all evidence is synthetic.

## Notes

- Captures were driven headlessly (`simctl openurl` deep links + `idb` tap/swipe); the app was
  relaunched between edit deep links because remounting the same route does not re-read
  `initialDraft`.
- The Dev observation routine that predated the title-or-note contract was repaired with a
  synthetic title (`Evening check`) so it renders as a canonical row again instead of the
  legacy fail-safe.
