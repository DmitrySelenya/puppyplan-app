# 06.5 — PuppyPlan Plus Paywall Shell
Route: `/paywall`   Atlas: `paywall/*` refs + Open Design V2 More/paywall board
Device sizes: SE compact primary; iOS 390x844 and Android 412x900 in the V2 handoff
Allowed deviations: live IAP, product loading, purchase, restore, and entitlement enforcement remain deferred. This slice is a feature-flag-ready native shell only.

## Anatomy (top -> bottom)
- Modal header — close/back affordance, title `paywall.title`.
- Intro copy — `paywall.subtitle`, no first-screen hard block.
- Feature list — three 44pt rows with non-color-only icons.
- Plans group — annual selected card, monthly card, lifetime card.
- Primary CTA — `paywall.primary`.
- Restore button — separate `paywall.secondary` action.
- Legal note — platform billing / restore copy.
- Soft-lock info — read-only/export/privacy controls remain reachable after the trial.

## Tokens
- Plan cards use `surface.raised`; selected annual card uses terracotta border / muted accent fill.
- Soft-lock info uses `status.infoTint` and `status.info`.
- Content bottom padding: `layout.tabBarHeight + space[6]`.

## States covered
- Default shell — production.
- Loading/offline/error/pending purchase, real restore flow, cancellation state, and entitlement writes gate — deferred.

## Accessibility
- Annual plan selected state is structural, not color-only.
- Restore purchases is a separate button.
- Prices are visible text and have a readable accessibility label.
- Legal and soft-lock notes are visible text.

