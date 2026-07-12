# dogfood.diary.plan-fact — Operational Diary day

Route: `/(tabs)/diary`
Atlas: `dogfood.diary.01`
Screenshot: `docs/design/v2/screenshots/dogfood-core-loop/diary-plan-fact-reference.png`
Source board: `ScreenDiaryDay` / `4-diary-populated` in `miro-prototype.full.html`
Device sizes: iPhone SE 3 compact portrait (primary)
Status: proposed Stage 0 extension; user approval pending.

Allowed deviations: completed routine displays planned and actual times; past-unmarked uses neutral
`Not logged`; generic potty check-off opens subtype chooser; no streak chip; dense note display is
indicator-only.

## Anatomy (top → bottom)

- Existing Diary header, week strip, optional info hero, selected-day heading.
- One chronological list with time gutter.
- Routine card: checkbox, planned time, canonical/custom title, amount/duration, overflow.
- Completed routine: filled checkbox plus `Actual HH:mm`; planned time remains visible.
- Past-unmarked routine: raised quiet card plus `Not logged`; no red/failure treatment.
- Fact card: actual time, label/observation title, optional private-note icon; no raw note preview.
- Pending fact/check-off: pending label, repeat action disabled, Retry/Delete on permanent failure.

## Tokens

- Existing `diary-v2.md` RoutineCard/FactCard/TimeGutter tokens; structural difference never relies
  on color alone; 44pt checkbox and overflow targets.

## States covered

- mixed; empty; cached offline read; pending; recoverable error; viewer; past-unmarked; all done;
  generic potty check-off; long content / Dynamic Type XXXL.

## Accessibility

- Routine label announces planned time, status, and actual time when complete.
- Check-off is a separate button; viewer cards expose no write affordance.
- Private-note indicator announces `Private note attached`, not note content.

## Notes / deferred

- Spontaneous facts never auto-close routines.
- Screenshot is a fresh rerender of the canonical populated board; deviations remain approval items.
