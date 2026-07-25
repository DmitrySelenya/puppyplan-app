# PUP-42 Household Invite — Deep Review

**Review date:** 2026-07-24
**Scope:** Local branch diff against `main`
**Method:** Sequential five-pass review under the repository `review-deep` workflow
**Verdict:** Locally ready for owner review after the findings below were fixed; remote pgTAP
and two-device/native evidence remain open.

## Findings fixed during review

### P1 — unavailable invite could remain on OTP after authentication

The auth resolver correctly retained a token-free `unavailable` marker after typed invalid,
expired, revoked, or reused errors, but the route gate treated every `loading` state as
non-navigable. After OTP, the user could therefore remain on the sign-in screen instead of
seeing the required neutral `InviteAcceptScreen` fallback.

The route contract now redirects the specific `loading + unavailable` state to the synthetic
`/invite/unavailable` route while allowing an existing invite route to remain mounted. A focused
RED test reproduced the missing redirect; the auth/navigation/invite suite is green after the
fix.

### P2 — live invite screen used raw English fallback nouns

When no private owner/puppy metadata was available, the live screen substituted raw English
`Owner` and `Puppy` values. This violated typed i18n and produced English fragments in RU/ES.
The live path now uses generic, privacy-safe EN/RU/ES keys; named template inputs remain available
only for explicitly supplied design/test data. A three-locale render regression covers the
generic path.

## Pass 1 — security and access

- The three write RPCs are `SECURITY DEFINER`, use an empty search path, validate `auth.uid()`,
  and grant execution only to `authenticated`.
- Invite creation requires exactly one active owned household and serializes replacement of the
  household's prior active link.
- Acceptance validates an exact lowercase 64-hex token, hashes it in database, reads the private
  secret table under the definer boundary, and returns only household ID and role.
- Direct client writes to `public.invite` remain denied; client roles cannot read
  `app_private.invite_secret`.
- The owner sees the plaintext link only in transient component state. Invitee persistence uses
  SecureStore until auth resolution; tokens are absent from logs, analytics, query keys, docs,
  and written evidence.
- Typed invalid/expired/revoked/reused errors converge on one neutral UI state.

## Pass 2 — correctness and lifecycle

- A valid pending token is accepted before bootstrap, and the accepted household ID becomes the
  active care context. This covers an invitee who already has an older stray household.
- No-token sign-in preserves normal bootstrap.
- Typed unavailable acceptance requires an explicit **Create your own household** action before
  bootstrap. Genuine unclassified failures preserve contextual reporting and sign-out cleanup.
- Same-user retry is idempotent; a different user cannot reuse the consumed invite.
- Creating a new link revokes the prior active link. Caregivers cannot create links.
- Manual input accepts only the exact raw token or PuppyPlan custom-scheme form and is masked.

## Pass 3 — tests and verification quality

- SQL static guards cover signatures, grants, hash handling, and migration constraints.
- pgTAP source covers owner/non-owner create, owner-only revoke, accept membership, expired,
  revoked, reused, idempotent, direct-write denial, and both supported secret-hash formats.
- Client tests cover strict contracts, repository translation, rooted invalidation, SecureStore
  expiry/error behavior, token-gated auth, accepted-household selection, route behavior, and
  owner/invitee render interactions.
- Negative contract tests reject malformed/uppercase tokens and non-PuppyPlan links.
- Database-backed pgTAP has not run because no remote migration apply was authorized.

## Pass 4 — performance and cache behavior

- Invite mutation invalidation is rooted at `['sharing', 'household-invites']`; token material is
  not part of any cache key.
- Active-puppy cache identity includes both authenticated user and explicitly activated household,
  preventing stale cross-household selection.
- Link state is transient and small. Pending intent is one SecureStore record with a bounded local
  lifetime.
- No new polling, realtime subscription, or unbounded client collection was introduced.

## Pass 5 — platform, UX, and compliance

- `puppyplan` is registered as the Expo scheme; `app/invite/[token].tsx` remains thin.
- Clipboard access is isolated behind the approved Expo module.
- Feature UI uses repository design primitives, tokenized styling, typed EN/RU/ES copy, status
  live regions, and masked manual input.
- No generated `ios/` or `android/` file changed.
- Native screenshots, compact SE layout, Dynamic Type, VoiceOver, and two-device behavior were not
  executed by the implementation agent. They are explicitly assigned to the owner checklist.

## Open verification gates

- Apply the migration to a specifically approved non-production Supabase project.
- Run database-backed pgTAP and hosted type generation/diff there.
- Execute the two-device checklist and native Stage 4 comparison.
- Obtain the owner's final review before push/PR/merge.
