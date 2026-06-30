# 07.1 — Accept Invite
Route: `/invite/[token]`   Atlas: `family/accept-invite` + Open Design V2 sharing boards
Device sizes: SE compact primary; iOS 390x844 and Android 412x900 in the V2 handoff
Allowed deviations: live token lookup, accept RPC, decline RPC, and post-accept redirect remain deferred. This slice is the privacy-safe native caregiver-side accept shell only.

## Anatomy (top -> bottom)
- Invite header — owner invites the viewer to care for the puppy, no raw token shown.
- Role row — visible caregiver/viewer role copy.
- Included/excluded preview card — included sub-block with check icons, divider, excluded sub-block with lock icons.
- Disclosure — owner can close access any time.
- Primary CTA — Accept.
- Secondary CTA — Decline.

## Tokens
- Card surfaces: `surface.raised`.
- Included emphasis: `primary.700` icons and text.
- Excluded emphasis: `text.tertiary` icons and text.
- Content bottom padding: `layout.tabBarHeight + space[6]`.

## States covered
- Valid caregiver invite — production shell with synthetic metadata.
- Expired/revoked unavailable, already-member, loading, real accept/decline pending, and error states — deferred to data-wiring slice.

## Accessibility
- Accept and Decline are separate buttons.
- Included/excluded content uses visible text and icons; color is not the only signal.
- Route must never display the invite token.

## Notes / deferred
- Future live token handling must keep raw invite tokens out of analytics, logs, cache keys, docs, screenshots, and rendered copy.

