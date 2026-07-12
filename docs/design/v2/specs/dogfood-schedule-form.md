# dogfood.schedule.form — Routine create/edit

Route: `/(sheets)/quick-log/schedule` and `/(modals)/reminders/edit`
Atlas: `dogfood.schedule.01`
Screenshot: `docs/design/v2/screenshots/dogfood-core-loop/schedule-form-reference.png`
Source board: `ScreenSchedule` / `9-schedule` in `miro-prototype.full.html`
Device sizes: iPhone SE 3 compact portrait (primary)
Status: approved through the delegated Clay/Sage design direction. The 2026-07-11 Stage 4 PASS was
retracted on 2026-07-12 after owner review (see `../screenshots/dogfood-core-loop/phase4-stage4-comparison.md`);
the editor was rebuilt with `TrackerTile` event tiles, section cards, and selected chips. Stage 4 was
re-run per state on 2026-07-12: `../screenshots/dogfood-core-loop/phase4-stage4-rebuilt.md`
(PASS with named deviations; Dynamic Type XXXL and long-text sweeps remain manual).

Allowed deviations: add custom weekdays, optional custom title, enabled state, observation, and
contextual duration/amount; notification primer occurs only after successful first save.

## Anatomy (top → bottom)

- Header: Cancel, create/edit title, Save.
- Calm form-state helper (validity / preserved-input failure).
- Event tile grid using canonical routine vocabulary.
- Optional custom title after event selection.
- Time row opening platform-native picker.
- Repeat chips: Once, Every day, Weekdays, Custom; Once reveals date; Custom reveals seven ISO-day
  toggles with at least one required.
- Contextual details: variant, amount/duration, private note.
- Enabled switch in edit mode; lifecycle actions remain in the routine menu.

## Tokens

- Clay raised tiles and grouped rows; selected tile uses primary outline; 44pt controls; 56pt event
  tiles; native picker is not recreated with custom universal controls.

## States covered

- create; edit; one-off; custom weekdays; validation error; saving/recoverable error; long text;
  viewer; Dynamic Type XXXL.

## Accessibility

- Event and repeat choices expose selected state; weekday labels include full localized day names.
- Save announces disabled reason through inline error, not only visual opacity.

## Notes / deferred

- Routine save never depends on notification permission.
- Screenshot is the fresh rerendered canonical board; listed deviations must be rendered before
  implementation and require explicit approval.
