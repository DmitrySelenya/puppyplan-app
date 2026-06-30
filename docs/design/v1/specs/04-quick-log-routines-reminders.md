# 04 — Quick Log, Routines & Reminders
Route: `/quick-log`, `/quick-log/details`, `/routine/edit`, `/reminders/edit`, More -> Routines
Atlas: `quicklog/*`, `reminders/*` refs + Open Design V2 create/routine boards
Device sizes: iOS 390x844, Android 412x900, SE compact for native verification
Allowed deviations: picker UI must use native platform controls even if the Open Design board approximates it.

## Anatomy

- Quick Log sheet: max five visible tracker tiles; details form is optional.
- After tap: optimistic visible update plus snackbar/undo.
- Duplicate warning: 60-second duplicate-care check, warning icon + text, save-anyway affordance.
- Failed save: retry/discard inline near affected event; no silent failure.
- Routine setup: tracker tile grid, native time picker, exactly three repeat chips, collapsed quantity/note, draft guard.
- Permission primer: shown before first routine notification permission request.
- Routine lifecycle: edit, pause, delete, mark done, skip, first-routine success, paused row, pause recovery.
- Reminder preferences: reminders list, edit form, quiet hours, push lock-screen, permission-denied recovery.

## Tokens

- Tiles: raised surface, 44pt+ controls.
- Primary save: `primary/600`.
- Warning: muted warning tint with icon; no bright red.

## States Covered

- default, snackbar/undo, duplicate warning, pending, failed, details, edit trackers, routine create/edit, permission denied, success, paused, push.

## Accessibility

- Tracker tiles are buttons with selected state.
- Repeat chips are single-select.
- Snackbar uses polite live region and Undo remains reachable.

## Notes / Deferred

- Custom day recurrence is deferred; do not ship “custom days” as a fourth equal chip in this wave.
