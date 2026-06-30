# 02.2 / 02.3 — Onboarding Puppy Setup + Age Hint
Route: `/onboarding` profile step   Atlas: `docs/design/v1/screenshots/onboarding/2-2-default.png`, `2-2-filled.png`, `2-2-error.png`
Device sizes: SE compact primary; atlas baseline 393x852
Allowed deviations: this card locks the inline Age Hint only. The broader Puppy Setup chrome, age stepper, and date-zone anatomy are now locked in `docs/design/v1/specs/02-2-onboarding-puppy-setup.md`.

## Anatomy (top → bottom)
- Title block — `onboarding.puppy-profile.title`, helper copy, Dynamic Type capped only where existing onboarding controls already cap it.
- Name field — required label/hint, inline error under the field when empty on Continue.
- Age mode segmented control — age weeks / birth date, programmatic selected state.
- Age input area — age weeks text field or birth-date text field, inline error on invalid age/future date.
- Age hint card — visible after the profile has user-entered content and a valid age estimate is available; `infoCircle` icon at 18pt, text from `getPuppyAgeHintKey`, status info tint, `r-md`, 12/16 padding, warm border.
- Continue CTA — existing validation flow remains in this slice.

## Tokens
- content padding: existing `Screen` onboarding padding
- card fill: `tokens.color.status.infoTint`
- icon/text: `tokens.color.status.info`
- border radius: `tokens.radius.md`
- horizontal card gap: `tokens.space[3]`

## States covered
- default — no inline age hint until profile has user-entered content.
- filled-form — age hint visible for 6–8, 9–12, 13–16 week ranges or fallback copy outside those ranges.
- error — existing field-level errors remain near the affected field.

## Accessibility
- Age hint card is accessible as summary text: "Hint. <age hint copy>".
- The hint does not steal focus automatically.
- Icon is decorative; the text remains the accessible source of truth.

## Notes / deferred
- Stage 4 native screenshot comparison remains open until the full profile step is captured against the atlas.
- Real platform DatePicker replacement remains deferred to the native picker integration slice.
