# 02.4 — Onboarding Quick Tracker Selection
Route: `/onboarding` tracker step   Atlas: `docs/design/v1/screenshots/onboarding/2-4.png`
Device sizes: SE compact primary, iOS 390x844, Android 412x900
Allowed deviations: the accepted Quick Log settings contract requires at least one durable tracker. The onboarding UI may reach zero selected trackers and show the locked skip CTA; saving from zero normalizes to the default tracker set so the first Quick Log session still has visible actions. The older `training` tracker remains deferred by the canonical tracker taxonomy.

## Anatomy (top → bottom)
- Step chrome — back button on the left, centered `Step 3 of 5`, no wrapping card around the title block.
- Heading — `What to track`.
- Helper — `Up to 5 actions. You can change this later.`
- Tracker grid — two-column `TrackerTile` grid for the accepted tracker ids: Potty, Feeding, Sleep, Walk, Zoomies.
- Selected tile — primary border and a visible top-right checkmark, not color alone.
- Limit feedback — polite alert card/snackbar when trying to select more than five.
- Counter — `N of 5 selected`.
- CTA — `Continue` when one or more trackers are selected; `Skip selection` when zero are selected.

## Tokens
- content padding: screen default
- section gaps: `lg`
- tile width: two-column tracker token minus local gutter
- selected border: `primary/600`; checkmark fill: `primary/600`; selected fill remains raised surface

## States Covered
- default 5 of 5 selected — production
- 0 of 5 selected / skip CTA — production UI, save normalizes to defaults
- max warning — production UI

## Accessibility
- Tile role: `button`.
- Selected tile state: `accessibilityState.selected=true`.
- Tile label composition: `<Tracker label>. Selected. Double tap to remove.` or `<Tracker label>. Not selected. Double tap to add.`
- Back button and CTA keep 44pt+ targets.
- Limit feedback uses polite live region and alert role.

## Notes / Deferred
- Sixth-tap shake animation and warning haptic remain deferred until the onboarding motion pass.
- Full native screenshot comparison against `2-4.png` remains required before this onboarding state can be marked Done.
