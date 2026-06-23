# Quick Log V2 Design Lock

Date: 2026-06-23

## Sources

- Manifest artboard: `docs/design/v2/manifest.json` -> `v2.quicklog.01`
- Raw source: `docs/design/v2/raw/screens/quicklog.jsx`
- Global state source: `docs/design/v2/raw/screens/states.jsx`
- V2 pass notes: `docs/design/v2/raw/CHANGELOG-pass3.md`
- Product/design references: `DESIGN.md` section 2.3, `puppyplan-prd-v2.md` Quick Log contract, `docs/architecture/10-quick-log-queue.md`, ADR-0007 canonical tracker delta

## Locked Anatomy

- Bottom sheet over a dimmed Today surface with a real dismiss scrim.
- Sheet title: `quick-log.sheet.title`.
- Header action: `quick-log.sheet.edit-trackers`, implemented as a real button.
- Tracker grid: up to five visible 56pt+ tracker buttons.
- Canonical default tracker order for this implementation pass: `potty`, `feeding`, `sleep`, `walk`, `zoomies`.
- Potty is one top-level tracker only. `outside`, `inside`, and `poop` are event subtype choices before mutation, not separate top-level trackers.
- Weight is omitted from Quick Log for this pass per ADR-0007 Decision 7: `weight` remains Health-only and must not create a Quick Log event mutation path.
- Pending local event rows show a visible pending pill and Undo/Delete actions.
- Failed local event rows show a visible failed pill and Retry/Delete actions.
- Duplicate warning is a dedicated sheet state with calm copy and Add anyway / Cancel actions.
- Permission-denied and unavailable states are modal sheet states, not fake tracker grids.

## Accessibility

- Sheet and state surfaces expose localized accessibility labels.
- Scrim/dismiss, Edit trackers, tracker tiles, subtype tiles, snackbar actions, retry, delete, and cancel actions are real buttons.
- Duplicate warning and failed rows use alert semantics and polite live regions.
- Pending rows use polite live regions.
- Status is icon plus text; no pending/failed state depends on color alone.

## State Matrix

- Default sheet: `ScreenQLDefault`
- Pending snackbar / optimistic row: `ScreenQLPending`
- Duplicate warning: `ScreenQLDuplicate`
- Failed retry/delete row: `ScreenQLFailed`
- Potty details/subtype: `ScreenQLDetails`
- Permission/unavailable: implementation-specific sheet states using the global state rules from `states.jsx`

## Native Evidence Plan

Capture on `Grith iPhone SE 3 iOS 26.3`:

- Default synthetic Quick Log sheet grid.
- Potty subtype picker/details.
- Pending local event row and snackbar-equivalent actions.
- Duplicate warning.
- Failed retry/delete row.
- Permission-denied and unavailable copy.

Comparison target is `v2.quicklog.01` plus raw `ScreenQLDefault`, `ScreenQLPending`, `ScreenQLDuplicate`, `ScreenQLFailed`, and `ScreenQLDetails`.

## Allowed Deviations

- `V2-QUICKLOG-WEIGHT-OMITTED`: V2 raw source includes `weight` in the broader tracker taxonomy, but ADR-0007 records `weight` as Health-only for this pass. Quick Log omits it and must not mutate a `weight` event.
- `V2-QUICKLOG-SYNTHETIC-GALLERY-EVIDENCE`: Native screenshots use synthetic dev-gallery fixtures so local private puppy data is not captured.
