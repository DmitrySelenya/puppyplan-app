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

### System-level Dynamic Type correction — full sweep

**Result:** FAIL — the single authorized full sweep completed, but AC-DT-2 does not hold

**Build:** local Release, embedded JS bundle, plain `simctl launch`, no TCP 8081 listener
**Target:** `Grith iPhone SE 3 iOS 26.3` (`750x1334`)
**Content size:** `accessibility-extra-extra-extra-large` (restored to `large` after capture)

| Surface | Default vs XXXL evidence | Result |
| --- | --- | --- |
| Diary header, WeekStrip, planned/actual rows, resting capsule | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt-diary-side-by-side.png) | **FAIL** — WeekStrip no longer overlaps and the first planned row is visible, but the fixed time gutter still wrapped in the captured final pass and the long-name case below consumes most of the first viewport. Capsule correctly remains icon-only with labels retained by render-tested a11y semantics. |
| Quick Log fast lane | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt-quick-log-fast-lane-side-by-side.png) | **FAIL** — tracker labels wrap mid-word inside fixed two-column tiles (`Feeding`, `Zoomies`), so the grid is not usable at XXXL. |
| Quick Log detailed composer | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt-quick-log-details-side-by-side.png) | **FAIL** — detail-type controls wrap labels mid-word and the oversized header/controls push the form fields below the first reachable view. |
| Routine editor | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt-routine-editor-side-by-side.png) | **FAIL** — event tile labels wrap mid-word inside fixed three-column geometry. |
| Reminders hub | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt-reminders-hub-side-by-side.png) | **FAIL** — back label and centered header overlap; rows grow substantially and long labels truncate as shown below. |
| Capsule Add chooser | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt-capsule-chooser-side-by-side.png) | **PASS** — the two chooser actions remain visible, readable, and reachable; the close FAB remains distinct. |

Long-text sweep used only synthetic Cyrillic values:
`СверхдлинноеИмяЩенка` and `ОченьДлинноеНазваниеРутиныДляЩенка`.

| Long-text surface | Evidence | Result |
| --- | --- | --- |
| Diary greeting | [XXXL capture](phase4-stage4-rebuilt/release-sweeps/dt-long-cyrillic-diary-xxxl.png) | **FAIL** — the complete name remains visible, but the greeting consumes most of the first viewport and crowds the first row. |
| Reminder row | [XXXL scrolled row](phase4-stage4-rebuilt/release-sweeps/dt-long-cyrillic-reminders-row-xxxl.png) | **FAIL** — the routine title is ellipsized, destroying required meaning. |

The full sweep was run once as authorized and is recorded as FAIL rather than being repeated after
additional code changes. No Phase 3 PASS or checklist completion is claimed.

### Second authorized AC-DT-2 correction — repeated full sweep

**Result:** FAIL — most recorded failures are corrected, but AC-DT-2 still does not hold

**Build:** rebuilt local Release, embedded JS bundle, terminate + plain `simctl launch`, no TCP
8081 listener

**Target:** `Grith iPhone SE 3 iOS 26.3` (`750x1334`)

**Content size:** `accessibility-extra-extra-extra-large` (restored to `large` after capture)

| Surface | Default vs XXXL evidence | Result |
| --- | --- | --- |
| Diary header, WeekStrip, planned/actual rows, resting capsule | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt2-diary-side-by-side.png) | **FAIL** — the complete long Cyrillic greeting now uses the adaptive `title2` base, the week strip and first planned row remain visible, and the capsule is icon-only; however `7:30` still wraps to `7:3` / `0` inside the fixed 46pt time gutter. |
| Quick Log fast lane | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt2-quick-log-side-by-side.png) · [XXXL scrolled action](phase4-stage4-rebuilt/release-sweeps/dt2-quick-log-bottom-xxxl.png) | **PASS** — tracker labels remain whole in single-column tiles and `Log with details` remains reachable by scroll. |
| Quick Log detailed composer | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt2-quick-log-details-side-by-side.png) · [XXXL fields/actions](phase4-stage4-rebuilt/release-sweeps/dt2-quick-log-details-bottom-xxxl.png) | **PASS** — detail labels remain whole in single-column controls; the fields, native date/time controls, Save, and Skip remain reachable by scroll. |
| Routine editor | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt2-routine-editor-side-by-side.png) · [XXXL repeat section](phase4-stage4-rebuilt/release-sweeps/dt2-routine-editor-repeat-xxxl.png) | **FAIL** — event labels are corrected in full-width tiles, but the unchanged two-column repeat chips still split `Weekdays` and `Custom` mid-word. |
| Reminders hub | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt2-reminders-side-by-side.png) · [long Cyrillic row](phase4-stage4-rebuilt/release-sweeps/dt2-reminders-long-row-xxxl.png) | **PASS** — back/title/add no longer overlap; the complete long routine title, schedule, and toggle remain visible and reachable without ellipsis. |
| Capsule Add chooser | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt2-capsule-chooser-side-by-side.png) | **PASS** — icon-only tabs, both chooser actions, their complete explanatory copy, and the distinct close FAB remain visible and reachable. |

The repeated long-text sweep reused only the synthetic values `СверхдлинноеИмяЩенка` and
`ОченьДлинноеНазваниеРутиныДляЩенка`. Both remain complete; the reminder title is no longer
ellipsized. The Diary time-gutter and routine repeat-chip findings are within Dynamic Type scope,
so the authorized full sweep continued across every named surface, but no third fix-forward
iteration or evidence rerun was attempted. Phase 3 remains open and Phases 4–5 were not started.

## Notes

- Captures were driven headlessly (`simctl openurl` deep links + `idb` tap/swipe); the app was
  relaunched between edit deep links because remounting the same route does not re-read
  `initialDraft`.
- The Dev observation routine that predated the title-or-note contract was repaired with a
  synthetic title (`Evening check`) so it renders as a canonical row again instead of the
  legacy fail-safe.

## Third authorized AC-DT-2 correction — repeated full sweep

The third correction used the mandated SE simulator, standalone Release build, synthetic long
Cyrillic puppy/routine names, and accessibility XXXL. Metro had no TCP 8081 listener. Default and
XXXL captures below are fresh 750 × 1334 simulator PNGs; content size was restored to `large`.

| Surface | Real evidence | Result |
| --- | --- | --- |
| Diary header, WeekStrip, planned/actual rows, resting capsule | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt3-diary-side-by-side.png) | **FAIL** — the week strip and first row remain visible and the long greeting remains complete, but the single-line TimeGutter renders stored `7:30` as destructive `7:…`. AC-DT-2/2G remain failed. |
| Quick Log fast lane | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt3-quick-log-side-by-side.png) · [XXXL scrolled action](phase4-stage4-rebuilt/release-sweeps/dt3-quick-log-bottom-xxxl.png) | **PASS** — full-width tracker labels remain whole and the detailed-log action remains reachable by scroll. |
| Quick Log detailed composer | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt3-quick-log-details-side-by-side.png) · [XXXL fields/actions](phase4-stage4-rebuilt/release-sweeps/dt3-quick-log-details-bottom-xxxl.png) | **PASS** — full-width detail labels remain whole; date/time, private note, Save, and Skip remain reachable by scroll. |
| Routine editor | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt3-routine-editor-side-by-side.png) · [XXXL repeat section](phase4-stage4-rebuilt/release-sweeps/dt3-routine-editor-repeat-xxxl.png) | **PASS** — event controls and all repeat choices are full width; `Weekdays` and `Custom` remain complete without mid-word splitting. |
| Reminders hub | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt3-reminders-side-by-side.png) · [long Cyrillic row](phase4-stage4-rebuilt/release-sweeps/dt3-reminders-long-row-xxxl.png) | **PASS** — header controls remain separated and the complete long Cyrillic title, schedule, and toggle remain reachable without ellipsis. |
| Capsule Add chooser | [Side by side](phase4-stage4-rebuilt/release-sweeps/dt3-capsule-chooser-side-by-side.png) | **PASS** — icon-only tabs, both chooser actions and complete explanatory copy, and the close FAB remain visible and reachable. |

The authorized repeated sweep ran once. The Diary failure is in Dynamic Type scope, so it is
recorded honestly without a fourth fix-forward iteration. The Phase 3 sweep checkbox remains open.
