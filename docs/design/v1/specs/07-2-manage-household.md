# 07.2 — Manage Household
Route: `/settings/household`   Atlas: `family/manage-household` + Open Design V2 sharing boards
Device sizes: SE compact primary; iOS 390x844 and Android 412x900 in the V2 handoff
Allowed deviations: live member queries, role changes, access removal, resend/revoke actions, and confirm sheets remain deferred. PUP-42 adds caregiver-only invite creation for owners: one generated deep link is shown in transient screen state with copy feedback. Pending invite rows may come from live owner-readable invite rows, but they still use privacy-safe labels instead of email addresses or token material. Deterministic loading/pending/error/offline state templates remain synthetic handoff states for deferred actions.

## Anatomy (top -> bottom)
- Modal header — back affordance to More, title `sharing.household.screen-title`.
- Intro card — owner-facing sharing clarity copy and household icon.
- Members section — owner row and caregiver row, avatar initials, role/status badges, last-active subtitle, overflow affordance.
- Invitations section — pending invite rows, pending badge, expiry subtitle, overflow affordance.
- Empty owner-alone hint — neutral helper card describing why to invite.
- Primary CTA — Invite caregiver; owner-only and pending while the create RPC is in flight.
- Generated-link card — deep link, privacy-safe last-four confirmation, copy action, and visible create/copy feedback. The card exists only in the current screen session.

## Tokens
- Content bottom padding: `layout.tabBarHeight + space[6]`.
- Owner/status badges: `status.infoTint` / `status.info`.
- Caregiver badge: `primary.100` / `primary.700`.
- Pending invite badge: `accent.100` / `accent.700`.
- Empty hint card: `surface.sunken`.

## States covered
- Static owner household preview — production member shell with synthetic metadata.
- Live pending invites read — owner-readable `public.invite` rows only, excluding accepted/revoked rows.
- Loading household invite read, pending invite/member write, load error, and offline read — deterministic handoff states.
- Invite creation pending/error, generated link, copy success, and copy error — live PUP-42 states.
- Live member list, role changes, removal, invite resend/revoke, and confirm sheets — deferred.

## Accessibility
- Member rows expose role/status via visible text, not color alone.
- Overflow affordances are separate 44pt+ buttons with localized labels.
- Invite CTA and copy action are real buttons with disabled/busy state where applicable.
- The generated deep link is selectable and has a localized accessibility label.
- No raw emails, token hashes, puppy notes, or private member names are rendered. The owner intentionally sees the one-time plaintext deep link only in the transient generated-link card.

## Notes / deferred
- Invite wiring must keep raw member emails, plaintext invite tokens, token hashes, and provider data
  out of analytics, logs, cache keys, docs, screenshots, and durable storage. The sole exception is
  rendering the one-time plaintext deep link to its creating owner in transient component state.
- Live member list requires a separate approved RLS/RPC design because the current
  `household_membership_read_own` policy only exposes the signed-in user's own accepted membership.
