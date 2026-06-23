# Timeline V2 Design Lock

Date: 2026-06-23

## Sources

- `docs/design/v2/manifest.json`
- `docs/design/v2/raw/screens/timeline.jsx`
- `docs/design/v2/raw/CHANGELOG-pass3.md`
- Atlas refs: `ScreenTimeline`, `ScreenTimelineFiltered`, `ScreenTimelineEmpty`, `v2.states.01`

## Locked Anatomy

- Header keeps the text path back to Today, centered Events nav title, search icon, and large Events title.
- Filter chips use the canonical taxonomy: All, Potty, Feeding, Sleep, Walk, Zoomies, and Health when shown for health-record references. No Food chip and no separate pee/poop filters.
- Potty event rows show subtype at the event title level, for example the localized equivalent of `Pee outside`.
- Rows are grouped by local day caption and use a left time column, event icon, title, actor/status subline, and accessible non-swipe actions.
- Pending and failed rows expose status as text/icon pills, never color alone.
- Failed rows expose Retry and Delete buttons. Synced delete requires explicit confirmation before the destructive action.
- Filtered-empty state uses the V2 empty-state anatomy with a clear-filter action.
- Timeline content reserves `tokens.layout.bottomInsetFab`; the route remains a log surface for the shared Quick Log FAB policy.

## Gate

- Structural tests assert canonical chips, subtype titles, row accessibility labels, pending/failed pills/actions, delete confirmation, filtered-empty clear action, and route recovery wiring.
- Native screenshots are recorded under `output/design-fidelity/v2-phase3/timeline/`.
