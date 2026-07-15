# (no atlas ID) — Quick Log details · Sleep · retrospective

Route: `/(modals)/quick-log/details`   Atlas: **none — user-approved fresh scope, 2026-07-15**
Device sizes: SE compact (primary)
Allowed deviations:

- **No artboard exists.** `docs/design/v1/manifest.json` lists "Quick Log detail forms for sleep,
  feeding, and zoomies" as an open gap ("current details form is generic and does not show the three
  specific variants"), so Stage 0 has no ID to resolve. The owner approved this scope verbatim in
  chat on 2026-07-15 in place of an artboard lock; that approval is the lock.
- **Supersedes the plan's earlier decision** (`docs/plans/active/2026-07-13-diary-telegram-parity.md`,
  "detailed composer accepts explicit duration"). Duration is now derived, never typed.
- No new visual language: assembled entirely from primitives already on this screen (`Card`, `Stack`,
  `AppText`, `SegmentedControl`, `WhenPicker`). No new primitive variant, so the Stage 1 dev-gallery
  check does not apply.

## Why

The data model already stores a retrospective sleep as **end + duration** (`occurred_at` =
wake time, `duration_minutes`), and `src/lib/diary/sleep-intervals.ts` already derives the start for
the Diary row. The range was always expressible; only the input affordance was missing. Owners read
their night as "23:41 → 6:35", not as "414 minutes", and making them subtract in their head at 6am
was the friction.

## Anatomy (top → bottom)

Sleep card, `action === 'retrospective'` only:

- `AppText` variant=headline — "Sleep" action label (unchanged)
- `SegmentedControl` — start / wake / retrospective (unchanged)
- `WhenPicker` testID=`quick-log-details-sleep-start` — label "Fell asleep", pill + wheel
- `WhenPicker` testID=`quick-log-details-sleep-end` — label "Woke up", pill + wheel
- `AppText` variant=subheadline — "Fell asleep" (visible label, not only accessibility)
- `WhenPicker` testID=`quick-log-details-sleep-start` — pill + wheel
- `AppText` variant=subheadline — "Woke up"
- `WhenPicker` testID=`quick-log-details-sleep-end` — pill + wheel
- `AppText` variant=footnote testID=`quick-log-details-sleep-derived-duration` — derived
  "6 hr 54 min", tone=secondary; tone=`critical` + `accessibilityRole="alert"` when the range is
  invalid

Only one wheel is expanded at a time: opening either collapses the other.

The generic "When" card is **hidden** while `action === 'retrospective'`: "Woke up" *is*
`occurredAt`, and two time controls in separate cards hide the relationship between them. For
`start` / `wake` the "When" card renders exactly as today.

## Tokens

Inherits the existing details-sheet card (`Stack gap="sm"`); no new spacing.

## States covered

- default (fresh retrospective entry) — synthetic
- editing an existing retrospective row — synthetic
- invalid range (start ≥ end) — synthetic; Save blocked, duration slot shows the error
- crosses midnight (23:41 → 06:35) — synthetic; the primary case, both pickers hold full dates

## Accessibility

- Each `WhenPicker` carries its own label, so "Fell asleep"/"Woke up" are announced rather than
  positional.
- The derived duration is `accessibilityRole="alert"` only in the error state, so a valid recompute
  does not interrupt the screen reader on every wheel tick.

## Stage 4 — native screenshot loop

**PASS** (SE compact, 2026-07-15, synthetic data, no artboard to diff against — compared to this
card). Two defects were caught here that the render tests had missed, both now covered by tests:

1. The pills rendered with no visible labels ("Choose time" / "11:48" with nothing saying which end
   is which) — the tests queried by accessibility label, which existed all along, so they passed
   while a sighted owner could not tell the two pills apart.
2. Both wheels expanded at once made the card taller than the sheet, so scrolling dragged a wheel
   and silently rewrote an already-set time. Reproduced by accident while driving the sim.

Round trip verified end to end: picked 23:41 → 06:35, derived "6 hr 54 min"; saved a range and the
Diary rendered "Slept 10:56 PM–11:56 AM · 13 hr". Save with no start chosen is refused with "Add
when the sleep started."

## Notes / deferred

- Play intervals ("12:02–12:10") stay inexpressible — Walk/Training take duration only. Out of scope.
- The capture pill (24h) vs Diary rows (12h) inconsistency is untouched and still open.
- When an artboard for the three detail variants is finally drawn, re-baseline this card against it.
