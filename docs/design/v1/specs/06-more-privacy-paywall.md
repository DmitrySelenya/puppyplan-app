# 06 — More, Privacy, Paywall & Soft-Lock
Route: `/more`, settings subroutes, paywall shell
Atlas: `more/*`, `paywall/*` refs + Open Design V2 More/paywall boards
Device sizes: iOS 390x844, Android 412x900, SE compact for native verification
Allowed deviations: live IAP enforcement is deferred; paywall/soft-lock surfaces are feature-flagged shell states.

## Anatomy

- More hub: app/account/support settings, routines/reminders, family/trainer/sitter access,
  notifications, privacy/account, support, paywall shell.
- Pet-scoped settings are not duplicated in More. More may show one `Pet settings` row that
  deep-links to the Pet tab; Puppy Profile and Quick Trackers remain primary actions inside Pet.
- Profile subflows: saved view, editing form, breed picker/search.
- Notification preferences and quiet hours.
- Privacy/account: export, delete own data/account, revoke shares, sign-out.
- Delete confirm: typed DELETE, muted danger tone, visible cancel.
- Support/help: privacy-safe diagnostic entry.
- Paywall: annual selected, monthly anchor, lifetime pass, restore purchases.
- Trial status: subtle days-left indicator.
- Day-30 soft-lock: writes gated; read/export/revoke/privacy/delete/sign-out remain available.

## Tokens

- Plan cards use Clay surfaces and selected outline.
- Soft-lock banner uses calm info tone, not danger.

## States Covered

- More default, profile edit, breed picker/search, notifications, privacy/account, delete confirm, support, skippable paywall, day-30 soft-lock, trial status, read-only mode.

## Accessibility

- Restore purchases is a separate button.
- Prices are read with period and amount.
- Always-allowed actions stay reachable when soft-locked.

## Notes / Deferred

- No per-feature freemium tiers, second-pet gate, reminder cap, history-window cap, trainer-depth gate, or export tier in this wave.
