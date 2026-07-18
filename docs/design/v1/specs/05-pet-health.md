# 05 — Pet & Health
Route: `/pet`, `/pet/health-record-edit`
Atlas: `health/*`, `more/14-2-*` refs + Open Design V2 Pet boards
Device sizes: iOS 390x844, Android 412x900, SE compact for native verification
Allowed deviations: old standalone Health/Profile screens are folded into Pet.
Breed and weight remain honestly unavailable until their existing deferred contracts land; Pet
must still show the active puppy's real name and age, and must not render a no-op Add weight action.

## Anatomy

- Profile header: photo, name, age, breed, edit affordance.
- Pet is the canonical home for puppy profile settings and Quick Trackers. More may deep-link to
  Pet as a single `Pet settings` entry, but it must not duplicate separate primary Puppy Profile or
  Quick Trackers rows.
- Growth: current weight and add-weight affordance. No chart for beta.
- Growth: show current weight only when the durable profile contract supplies it. Until then show
  the missing value without an actionable Add weight control.
- Health: visible block, not hidden behind a collapsed row.
- Health rows: vaccinations, deworming/preventive care, vet visits, add record.
- Minimal CRUD: add/edit record, delete with undo, status transition Template -> Confirmed -> Done.
- Vet visit prep is a reference card inside Pet, not a separate tab.

## Tokens

- Health statuses use pill tokens with icon + label.
- Health copy stays calm and non-diagnostic.

## States Covered

- landing/hub, profile edit, health list loading, health list error, health list offline-read, single-weight-point, no-vet-visit, add record, edit record, confirmed detail, needs vet review, empty first-run, offline.

## Accessibility

- Health status is not color-only.
- Current weight is plain text; no chart alt text needed in beta.
- Health rows are buttons with clear labels.

## Notes / Deferred

- Multi-pet switcher, standalone Health tab, charts, milestones, medication/refill are out of this wave unless separately approved.
