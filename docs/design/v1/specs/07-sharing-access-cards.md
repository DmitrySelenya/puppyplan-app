# 07 — Sharing, Sitter, Trainer & Shareable Cards
Route: More sharing subroutes, no-account share projection
Atlas: `family/*`, `sitter/*`, `trainer/*`, `cards/*`, `revoked/*` refs + Open Design V2 sharing boards
Device sizes: iOS 390x844, Android 412x900, SE compact for native verification
Allowed deviations: boards marked carry-over need final Clay refresh before native implementation; scope contracts are still locked.

## Anatomy

- Family list: active members, pending invites, owner role.
- Family invite: role and scope before send.
- Invite sent: copy/resend/revoke.
- Accept invite: caregiver sees who invited them and what they can do before accepting.
- Manage household: owner role management and member removal.
- Trusted sitter: enable ready/pending/no-caregiver, sitter checklist, owner active status, exit confirm.
- Trainer: scope selector, preview included/excluded, accepted read-only view.
- Revoked/expired: neutral closed-access state.
- Shareable puppy cards: builder, empty disabled, health disclosure, preview 3:4, share sheet, shared cards list.
- Shareable puppy card state templates: empty builder, health disclosure on, share options, loading,
  pending write, error, and offline-read review cards.

## Tokens

- Scope colors use V2 palette; no teal primary.
- Health sharing is off by default and requires explicit disclosure.

## States Covered

- default, pending, no-caregiver, active, exit confirm, accepted read-only, revoked/expired, card
  empty, health-on disclosure, share options, active/expired cards, loading, error, offline-read.

## Accessibility

- Every invite/preview states who sees what, for how long, and how to revoke.
- Sitter checklist checkbox pattern must be distinguishable from Diary routine checkboxes by context and copy.
- Revoked state does not reveal private reason details.
- Shareable card state templates must not expose raw emails, provider names, invite/share tokens,
  clinic contacts, or private notes.

## Notes / Deferred

- Rich card builder and multi-template editor are roadmap, not this wave. This wave is minimal signed-link/static card only.
- Shareable card state templates are synthetic handoff states. Live signed-link creation, real OS
  share sheet invocation, expiry editing, revoke/extend mutation, and public web projection remain
  deferred.
