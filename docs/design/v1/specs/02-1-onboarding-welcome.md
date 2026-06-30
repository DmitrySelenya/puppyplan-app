# 02.1 — Onboarding Welcome
Route: `/onboarding` initial state   Atlas: `docs/design/v1/screenshots/onboarding/2-1.png`
Device sizes: iOS 393x852 atlas, SE compact primary native verification
Allowed deviations: native implementation uses a token-built abstract warm illustration instead of the
atlas placeholder text/bitmap; mount animation is deferred until the onboarding motion pass.

## Anatomy (top -> bottom)
- Decorative illustration frame — warm companion abstract, 160pt minimum height, rounded md, sunken
  surface, hidden from accessibility.
- Heading block — H1 `onboarding.welcome.title`, accessibility label
  `onboarding.welcome.a11y-title`.
- Subtitle — `onboarding.welcome.subtitle`, secondary tone.
- Primary CTA — `onboarding.welcome.cta`, 44pt+ target, advances to puppy profile.
- Secondary sign-in action — `onboarding.welcome.secondary`, 44pt+ target, opens `/sign-in`.

## Tokens
- content padding: `tokens.layout.screenPaddingPhone`
- illustration surface: `tokens.color.surface.sunken`
- illustration radius: `tokens.radius.md`
- CTA: design `Button` primary / tertiary variants

## States covered
- default welcome — production.

## Accessibility
- VoiceOver order starts at the H1, then subtitle, primary CTA, secondary sign-in action.
- Illustration is decorative and uses `decorativeViewProps`.
- Title and controls cap font scaling to the existing onboarding ceilings while keeping text visible.

## Notes / deferred
- Account prompt still remains post-first-value per DESIGN §2.1.7. This secondary action is only for
  users who explicitly already have an account.
- Native screenshot comparison against `onboarding/2-1.png` remains required before Done.
