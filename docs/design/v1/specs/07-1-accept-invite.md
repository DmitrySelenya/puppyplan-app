# 07.1 — Accept Invite
Route: `/invite/[token]`   Atlas: `family/accept-invite` + Open Design V2 sharing boards
Device sizes: SE compact primary; iOS 390x844 and Android 412x900 in the V2 handoff
Allowed deviations: PUP-42 wires authenticated caregiver acceptance and post-accept redirect.
Signed-out acceptance hands off to the existing OTP screen only after the token is securely
persisted. Decline RPC remains deferred. Loading/error/expired/already-member review templates stay
available alongside the live states.

## Anatomy (top -> bottom)
- Invite header — owner invites the viewer to care for the puppy, no raw token shown.
- Role row — visible caregiver/viewer role copy.
- Included/excluded preview card — included sub-block with check icons, divider, excluded sub-block with lock icons.
- Disclosure — owner can close access any time.
- Primary CTA — Accept.
- Secondary CTA — Decline.
- Manual fallback card — masked PuppyPlan link/raw-code field, validation feedback, and use-link
  action.
- Unavailable fallback — explicit create-your-own action that runs normal bootstrap only after
  invite rejection.

## Tokens
- Card surfaces: `surface.raised`.
- Included emphasis: `primary.700` icons and text.
- Excluded emphasis: `text.tertiary` icons and text.
- Content bottom padding: `layout.tabBarHeight + space[6]`.

## States covered
- Valid caregiver invite — production shell with synthetic metadata.
- Loading invite, load error, expired/unavailable, and already-member — deterministic review
  states.
- Live persistence/sign-in handoff, authenticated accept pending/success/unavailable, manual input
  invalid/ready, and create-your-own pending/error — PUP-42 states.
- Decline RPC and provider metadata lookup — deferred.

## Accessibility
- Accept and Decline are separate buttons.
- Loading invite exposes busy feedback on the primary CTA.
- Load error uses alert semantics.
- Manual input is masked, disables autocorrection/capitalization, and exposes localized invalid
  feedback.
- The create-your-own action appears only for an unavailable invite and is never an automatic
  fallback.
- Included/excluded content uses visible text and icons; color is not the only signal.
- Route must never display the invite token.

## Notes / deferred
- Live token handling keeps plaintext invite tokens out of analytics, logs, cache keys, docs,
  screenshots, and rendered copy. The masked manual field and SecureStore pending intent are the
  only invitee-side holders.
- Native Stage 4 comparison remains owner-run in the Phase 6 checklist; the implementation agent
  does not install or run the app.
