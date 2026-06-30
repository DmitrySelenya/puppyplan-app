# 05 — Pet & Health
Route: `/pet`, `/pet/health-record-edit`
Atlas: `health/*`, `more/14-2-*` refs + Open Design V2 Pet boards
Device sizes: iOS 390x844, Android 412x900, SE compact for native verification
Allowed deviations: old standalone Health/Profile screens are folded into Pet.

## Anatomy

- Profile header: photo, name, age, breed, edit affordance.
- Growth: current weight and add-weight affordance. No chart for beta.
- Health: visible block, not hidden behind a collapsed row.
- Health rows: vaccinations, deworming/preventive care, vet visits, add record.
- Minimal CRUD: add/edit record, delete with undo, status transition Template -> Confirmed -> Done.
- Vet visit prep is a reference card inside Pet, not a separate tab.

## Tokens

- Health statuses use pill tokens with icon + label.
- Health copy stays calm and non-diagnostic.

## States Covered

- landing/hub, profile edit, loading, single-weight-point, no-vet-visit, add record, edit record, confirmed detail, needs vet review, empty first-run, offline.

## Accessibility

- Health status is not color-only.
- Current weight is plain text; no chart alt text needed in beta.
- Health rows are buttons with clear labels.

## Notes / Deferred

- Multi-pet switcher, standalone Health tab, charts, milestones, medication/refill are out of this wave unless separately approved.
