# dogfood.quick-log.sheet — Quick Log fast lane

Route: `/(sheets)/quick-log`
Atlas: `v2.quicklog.01` / `docs/design/v2/screenshots/05-quicklog.png`
Device sizes: iPhone SE 3 compact portrait (primary)
Status: proposed Stage 0 extension; user approval pending.

Allowed deviations: add a visible `Log with details` action; add Sleep action selection; keep
training/play and observation out of the maximum-five selected grid.

## Anatomy (top → bottom)

- Sheet handle; title; Edit trackers action.
- Maximum-five selected tracker grid: potty, feeding, sleep, walk, zoomies.
- Potty second step: Outside pee / Inside pee / Poop.
- Sleep second step: Start sleep / Wake / Slept retrospectively.
- Secondary full-width `Log with details` action below the fast grid.
- Pending/failed queue rows and duplicate warning use the existing Quick Log state anatomy.

## Tokens

- Existing `quicklog-v2.md` tokens and tracker-tile primitives; 56pt minimum fast actions.
- Details action uses a secondary/ghost primitive, not a sixth tracker tile.

## States covered

- selected tiles; potty; sleep; pending; failed; duplicate warning; viewer/unavailable.

## Accessibility

- Each tracker/action is a button with event and subtype/state in its localized label.
- Status uses icon + text; focus order follows visible order; Dynamic Type may stack actions.

## Notes / deferred

- Fast simple facts remain one tap; potty/sleep at most two.
- Detailed fields belong to `dogfood.quick-log.details`, not this sheet.
