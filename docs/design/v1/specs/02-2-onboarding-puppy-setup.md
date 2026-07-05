# 02.2 — Onboarding Puppy Setup
Route: `/onboarding` profile step   Atlas: `docs/design/v1/screenshots/onboarding/2-2-default.png`, `2-2-filled.png`, `2-2-error.png`
Device sizes: SE compact primary; atlas baseline 393x852
Allowed deviations: the birth-date mode keeps an editable native text input inside the DateWheel zone until the native picker module is wired; the visual zone, labels, error placement, and validation contract are locked now.

## Anatomy (top -> bottom)
- Top chrome — 44pt back affordance on the left, centered `onboarding.puppy-profile.step-label`, spacer on the right.
- Title block — `onboarding.puppy-profile.title`, helper copy, no card wrapper.
- Name field — required label/hint, inline error only when validation can run after the CTA is enabled.
- Age section label — `onboarding.puppy-profile.age-section-label`.
- Age mode segmented control — Age / Birth date, programmatic selected state.
- Age stepper zone — sunken 56pt row with value (`-` before name, `<n> weeks` after name), decrement and increment 44pt controls, plus/minus visual affordances.
- DateWheel zone — sunken 56pt row with editable date input and future-date inline error under the zone.
- Age hint card — visible under the age zone after a name and valid age estimate exist; info icon, status info tint, warm border.
- Continue CTA — primary button disabled until name is non-empty; enabled state then validates age/date before moving to tracker selection.

## Tokens
- top chrome min height: 44
- stepper/date zone border radius: `tokens.radius.md`
- stepper/date zone fill: `tokens.color.surface.raised`
- embedded control fill: `tokens.color.surface.sunken`
- section gap: existing onboarding `Stack` gaps

## States covered
- default — name empty, visual age value is `-`, CTA disabled.
- filled-form — name entered, age value shows weeks, CTA enabled, age hint visible.
- error — invalid birth date remains near the date zone; future-date copy matches atlas.

## Accessibility
- Back button is a button with localized label.
- Step label is readable text and does not steal focus.
- Age stepper has `adjustable` role, value text, increment/decrement actions, and discrete 44pt controls.
- Date mode exposes the editable field with the birth-date label and placeholder.
- Disabled CTA exposes `accessibilityState.disabled=true`.

## Notes / deferred
- Stage 4 native screenshot comparison remains open until the full profile step is captured against all three atlas states.
- Replacing the birth-date text input with a real platform DatePicker is deferred to the native picker integration slice.
