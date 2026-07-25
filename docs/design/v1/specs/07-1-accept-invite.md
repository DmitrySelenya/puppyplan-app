# 07.1 — Accept Invite
Route: `/invite/[token]`   Atlas: `family/accept-invite` + Open Design V2 sharing boards
Device sizes: SE compact primary; iOS 390x844 and Android 412x900 in the V2 handoff
Allowed deviations: PUP-42 wires authenticated caregiver acceptance and post-accept redirect.
Signed-out acceptance hands off to the existing OTP screen only after the token is securely
persisted. Decline RPC remains deferred. Loading/error/expired/already-member review templates stay
available alongside the live states.
PUP-42 follow-up makes `already_member` a live outcome with the caller's actual household role.
Terminal unavailable/already-member anatomy never repeats an unverified caregiver claim.

## Anatomy (top -> bottom)
- Invite header — owner invites the viewer to care for the puppy, no raw token shown.
- Role row — visible caregiver/viewer role copy.
- Included/excluded preview card — included sub-block with check icons, divider, excluded sub-block with lock icons.
- Disclosure — owner can close access any time.
- Primary CTA — Accept.
- Secondary CTA — Decline.
- Manual fallback card — masked PuppyPlan link/raw-code field, validation feedback, and use-link
  action.
- Alternate owner path — explicit create-your-own action on a valid or unavailable invite. It
  clears the pending invite and reaches normal bootstrap only after a direct user action.
- Already-member completion — localized state plus Open CTA into the existing household.

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
- Existing owner/caregiver/viewer acceptance — live already-member state using the actual
  membership role without consuming the unused link.
- Decline RPC and provider metadata lookup — deferred.

## Accessibility
- Accept and Decline are separate buttons.
- Loading invite exposes busy feedback on the primary CTA.
- Load error uses alert semantics.
- Manual input is masked, disables autocorrection/capitalization, and exposes localized invalid
  feedback.
- The create-your-own action appears for valid and unavailable invite entry and is never an
  automatic fallback.
- Expired/unavailable and already-member states do not expose the caregiver role row, access
  preview, or owner-revocation disclosure from the unverified invite offer.
- Included/excluded content uses visible text and icons; color is not the only signal.
- Route must never display the invite token.

## Notes / deferred
- Live token handling keeps plaintext invite tokens out of analytics, logs, cache keys, docs,
  screenshots, and rendered copy. The masked manual field and SecureStore pending intent are the
  only invitee-side holders.
- Native Stage 4 requires a fresh embedded Release bundle on the approved SE profile; stale
  installed-bundle screenshots are reproduction evidence only.
