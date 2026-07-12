# dogfood.quick-log.details — Detailed fact composer

Route: `/(modals)/quick-log/details`
Reference intent: V1 `4.6` + V2 Clay tokens / state contracts
Device sizes: iPhone SE 3 compact portrait (primary)
Status: Stage 0 approved through the user-delegated Clay/Sage direction and registered fresh V2
review export; Stage 4 native comparison remains required before Done.

Allowed deviations: new V2 surface because no canonical V2 board exists; fixed event vocabulary;
native platform date/time control; private note is never shown in notification preview.

## Anatomy (top → bottom)

- Modal header: Cancel, `Log event`, Save; Save disabled until valid and while viewer.
- Event selector: potty, feeding, sleep, walk, zoomies, training/play, observation.
- Contextual fields: potty subtype; sleep action and retrospective duration; amount/duration where
  compatible; observation short title.
- `When` row defaulting to now; native date/time picker; inline future / older-than-seven-days error.
- Private note multiline field; `Private` helper; live `n / 500` counter; long content grows/scrolls.
- Inline persistence error above the footer; input remains intact; Save exposes pending state.

## Tokens

- Clay base/raised surfaces, grouped field rows, `screenPaddingPhone`, `radius.lg`, standard 44pt
  controls; primary Save only for valid state; danger token only for validation/error copy.

## States covered

- create; validation error; persistence pending; recoverable persistence error; viewer; long note;
  keyboard; Dynamic Type XXXL.

## Accessibility

- Every field has a localized label, value, hint, and inline error relationship.
- Counter is not announced on every keystroke; announce threshold and limit reached.
- Native picker follows locale/24-hour settings; Save target remains at least 44pt.

## Notes / deferred

- Observation requires title or note. Note preview policy: dense Diary shows only a private-note
  indicator, never raw text. This is a proposed privacy-first design decision for approval.
- Fresh V2 export: `docs/design/v2/screenshots/dogfood-core-loop/stage0-variants-reference.png`.
