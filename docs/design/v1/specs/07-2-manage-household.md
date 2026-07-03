# 07.2 — Manage Household
Route: `/settings/household`   Atlas: `family/manage-household` + Open Design V2 sharing boards
Device sizes: SE compact primary; iOS 390x844 and Android 412x900 in the V2 handoff
Allowed deviations: live member/invite queries, role changes, access removal, resend/revoke actions, and confirm sheets remain deferred. Pending invite rows use privacy-safe contact labels instead of email addresses. Deterministic loading/pending/error/offline state templates are synthetic handoff states until live household data is wired.

## Anatomy (top -> bottom)
- Modal header — back affordance to More, title `sharing.household.screen-title`.
- Intro card — owner-facing sharing clarity copy and household icon.
- Members section — owner row and caregiver row, avatar initials, role/status badges, last-active subtitle, overflow affordance.
- Invitations section — pending invite row, pending badge, expiry subtitle, overflow affordance.
- Empty owner-alone hint — neutral helper card describing why to invite.
- Primary CTA — Invite caregiver.

## Tokens
- Content bottom padding: `layout.tabBarHeight + space[6]`.
- Owner/status badges: `status.infoTint` / `status.info`.
- Caregiver badge: `primary.100` / `primary.700`.
- Pending invite badge: `accent.100` / `accent.700`.
- Empty hint card: `surface.sunken`.

## States covered
- Static owner household preview — production shell with synthetic metadata.
- Loading household, pending invite/member write, load error, and offline read — deterministic synthetic handoff states.
- Live member list, role changes, removal, invite resend/revoke, and confirm sheets — deferred.

## Accessibility
- Member rows expose role/status via visible text, not color alone.
- Overflow affordances are separate 44pt+ buttons with localized labels.
- Invite CTA is a real button.
- No raw emails, invite tokens, puppy notes, or private member names are rendered.

## Notes / deferred
- Future data wiring must keep raw member emails and invite tokens out of analytics, logs, cache keys, docs, screenshots, and rendered copy.
