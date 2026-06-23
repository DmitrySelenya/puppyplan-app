# More/Settings V2 Design Lock

Date: 2026-06-23

## Sources

- `docs/design/v2/manifest.json`
- `docs/design/v2/raw/screens/more.jsx`
- `docs/design/v2/raw/screens/settings.jsx`
- `docs/design/v2/raw/screens/profile.jsx`
- `docs/design/v2/raw/CHANGELOG-pass3.md`
- Product/design refs: `DESIGN.md` sections 4.4.1, 4.4.2, 4.4.3, 4.4.4, and 4.4.5; `docs/architecture/05-navigation-and-deeplinks.md`

## Locked Anatomy

- More is a read-only navigation/control surface and never shows the Quick Log FAB.
- More uses the V2 grouped list order: Puppy, Sharing, Records and notifications, Privacy, Support, then the feature-flagged Plus placeholder row.
- Puppy summary remains a raised card with avatar, name, age/date summary, and chevron into the existing profile settings route.
- About copy is exactly `Version 1.0.0`; visible beta wording is removed from user-facing More/Support copy.
- Quick Trackers settings uses the canonical tracker vocabulary: Potty, Feeding, Sleep, Walk, and Zoomies. There are no separate pee/poop/inside/outside tracker rows and no Weight Quick Log tracker.
- Quick Trackers selected rows expose checkbox/list semantics, toggle controls, and accessibility reorder actions; selected-history copy states that turning a tracker off preserves history.
- Notifications and Data/account remain deferred placeholders in this phase, but their visible copy is aligned with V2 pass 3: `For now` for push limitations and `Account removal` for delete-account grouping.
- Delete account remains deferred here; when implemented, the protective default state must have disabled destructive action until the required word is typed.

## Out Of Scope

- No new Reminders, Family/Sitter, Trainer/Cards, Paywall, Help, Notifications, Privacy, or account-removal routes.
- No production notification, export, account deletion, billing, sharing, or entitlement integration.

## Gate

- Structural tests assert More row order, deferred semantics, no More FAB, About version copy, Plus placeholder copy, Quick Trackers canonical labels, checkbox/selected state, no legacy potty subtype tracker rows, and profile entry behavior.
- Native screenshots are recorded under `output/design-fidelity/v2-phase3/more-settings/`.

## Allowed Deviations

- `V2-MORE-SYNTHETIC-GALLERY-EVIDENCE`: native screenshots use synthetic dev-gallery fixtures for deferred notification/privacy/account-removal states because the production routes are intentionally out of scope for this phase.
- `V2-MORE-DEFERRED-PLUS-PLACEHOLDER`: the Plus row remains a deferred placeholder because paywall implementation belongs to a later Phase 4 workstream and the current app has no feature-flagged paywall route.
