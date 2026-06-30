# 2.6 - Onboarding First Log
Route: `/onboarding` first-log completion preview / first post-value Diary state   Atlas: `docs/design/v1/screenshots/onboarding/2-6.png`
Device sizes: SE compact primary, 393x852 atlas
Allowed deviations: legacy atlas may name Today; V2 final shell lands in Diary with Diary selected, Pet/More available, and the separate Add/FAB action present.

## Anatomy (top -> bottom)
- Diary shell header area - first-value state, no wizard step chrome and no account/notification prompt.
- HeroCard - first event saved copy: `onboarding.first-log.hero-after-first`.
- Pending/local state indicators - event is local draft / pending sync before account wall, not a fully synced server row.
- Timeline/ListRow - first logged event with tracker icon, event title, saved-now metadata, and local-only/pending status.
- Celebration Snackbar - `onboarding.first-log.celebration-snackbar`, success/celebration haptic metadata, polite live region.
- V2 shell chrome - Diary tab selected, Pet/More unselected, separate Quick Log/Add FAB.

## Tokens
- Honey/accent/success allowed only for first-value celebration.
- Pending/local-only status uses existing non-color-only `StatusPill` tone and icon.
- Bottom shell uses existing V2 tab/FAB primitives.

## States covered
- first-log pending-write / local-only - production preview state.
- synced first Diary - deferred to Diary route state coverage.
- account/notification prompts - separate `2.1.7` slice.

## Accessibility
- Snackbar announces completion politely.
- Event row accessibility label includes event title, time/meta, local-only, and pending-sync status.
- No account or notification prompt can appear before this first-value screen.

## Notes / deferred
- Real Quick Log sheet selection and local queue persistence are covered by Quick Log slices; this spec covers the onboarding completion anatomy only.
