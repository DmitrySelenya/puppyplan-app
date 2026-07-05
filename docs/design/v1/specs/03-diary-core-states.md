# 03 — Diary Core States
Route: `/diary`   Atlas: legacy `today/*`, `timeline/*` refs + Open Design V2 Diary boards
Device sizes: iOS 390x844, Android 412x900, SE compact for native verification
Allowed deviations: old Today/Timeline refs are visual fallback only; production route is Diary.

## Anatomy

- Header: greeting, date, puppy avatar shortcut to Pet.
- Week strip: selected day and today marker can differ.
- One contextual Mauve tip slot.
- Time-ordered event list mixing routine slots and logged facts.
- Scroll-into-past history with date dividers; no standalone Timeline route.
- Persistent split nav + Add.

## Tokens

- Routine slot: raised surface. Done state uses Sage tint and primary text.
- Past unchecked routine: raised, quiet, no shadow; never red and never sunken.
- Logged fact: sunken surface and no checkbox.

## States Covered

- Populated, day 1, day 2, weekly rhythm, history scroll, true cold start, empty with history, all-done, loading, offline-read, pending-write, error, accident recovery, after-feeding pattern, missed reminder, item edit/delete/undo.

## Accessibility

- Each event card has a full label that distinguishes planned routine from logged fact.
- Checkbox and overflow/edit affordance are separate hit targets.
- Week days are buttons with selected/today state in labels.

## Notes / Deferred

- No streaks, achievements, “missed” badges, or shame copy.
