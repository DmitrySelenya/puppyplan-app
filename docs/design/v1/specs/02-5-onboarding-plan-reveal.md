# 2.5 - Onboarding Plan Reveal
Route: `/onboarding` wizard step `plan`   Atlas: `docs/design/v1/screenshots/onboarding/2-5.png`
Device sizes: SE compact primary, 393x852 atlas
Allowed deviations: V2 navigation split keeps onboarding outside the tab shell; no TabBar or persistent Quick Log FAB appears until after first-value. Stage 4 native screenshot comparison remains open for this slice.

## Anatomy (top -> bottom)
- Puppy summary row - localized `{name} · {age} · You` summary with a compact owner/avatar chip.
- H2 - `onboarding.plan-reveal.title`.
- Supporting copy - `onboarding.plan-reveal.subtitle`.
- HeroCard - 96pt minimum height, Honey/accent-tinted activation moment, spark icon, `onboarding.plan-reveal.hero`.
- DailyCard list - three separate starter action cards: feeding pattern, short potty breaks every 1-2 h, quiet sleep corner.
- PrimaryButton - `onboarding.plan-reveal.cta`, opens the standard Quick Log sheet.

## Tokens
- content padding: existing onboarding `Screen` content padding.
- section gaps: `lg` between major groups, `sm` inside card groups.
- HeroCard: `minHeight: 96`, `accent.100` tint, `accent.500` icon/chip.
- DailyCard: raised surface, default card radius/stroke, no nested cards.

## States covered
- default - production wizard state after profile save.
- first-log complete - separate `2.6` slice, not in this spec.
- account/notification prompts - separate `2.1.7` slice, not in this spec.

## Accessibility
- Summary row has a single localized label with puppy name, age, and owner avatar context.
- Hero card exposes a localized label and is read after the heading/supporting copy.
- Starter action cards expose localized labels and do not rely on color alone.
- CTA remains a button with the existing Quick Log action.

## Notes / deferred
- Motion requirements (stagger-in and one-time CTA pulse) are deferred until the shared Reanimated onboarding motion pass.
- Native screenshot comparison is not completed in this slice; record Stage 4 as open in the active plan.
