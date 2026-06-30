# 02 — Onboarding Flow
Route: onboarding stack   Atlas: `docs/design/v1/screenshots/onboarding/*.png` + Open Design V2 onboarding boards
Device sizes: iOS 390x844, Android 412x900, SE compact for native verification
Allowed deviations: legacy atlas copy may mention Today; V2 final handoff must land in Diary.

## Anatomy

- Welcome: calm value promise and setup CTA.
- Puppy profile: default, filled, and inline-error states.
- Age hint: non-medical explanation of why age changes starter suggestions.
- Tracker picker: max five visible quick trackers.
- Plan reveal: rare Honey/celebration moment.
- First log: pending-write visible, no account pressure before first value.
- Final handoff: first Diary screen with V2 split nav.

## Tokens

- Clay surfaces, Lora/Nunito, pill CTAs.
- Honey only on plan reveal / first-ever log.

## States Covered

- default, filled-form, error, tracker selection, plan reveal, first-log pending, first Diary after onboarding.

## Accessibility

- Form labels are programmatically attached.
- Errors are near fields and announced when shown.
- Primary CTA stays clear at Dynamic Type sizes.

## Notes / Deferred

- Account/notification prompts must not block the first useful log unless required by the chosen runtime flow.
