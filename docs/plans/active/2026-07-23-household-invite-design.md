# Household Invite — Make The Second Family Member Actually Join

**Status:** Active
**Plan type:** Design (brainstorm output; feeds an implementation plan)
**Linear:** `PUP-42` — https://linear.app/dmitryselenya/issue/PUP-42
**Owner:** Dmitry
**Date:** 2026-07-23

## Problem

During live dogfooding, the owner's wife installed the app on her iPhone ("Annie")
and could not join the owner's household. The first screen after install is the
email-OTP sign-in (the "family code" screen she saw). When she enters a code, the
post-sign-in path calls `bootstrap_current_user`, which — keyed on `auth.uid()` —
creates **her own isolated, empty household**. The result the owner described:
"она сама себя пригласила, это очень странно." She can see the OTP login but there
is no path from it into an existing household.

Root cause is architectural, not a bug:
- `supabase/migrations/20260530120000_auth_bootstrap_rpc.sql` — `bootstrap_current_user`
  always creates one household per new `auth.uid`; there is no join-by-invite branch.
- No invite **create/accept/revoke** RPCs exist. Only read/projection share RPCs
  (`current_share_link_metadata` etc.) and `listPendingInvites` in
  `src/lib/supabase/household-access.ts` (a read).
- `src/features/more/screens/HouseholdAccessScreen.tsx` "Пригласить" button is a stub:
  `onPress={() => setActionUnavailableVisible(true)}` → "actions unavailable".
- The DB tables already exist (`public.invite`, `app_private.invite_secret`,
  `20260524202620_mvp_schema_baseline.sql`) and RLS forbids direct client inserts
  (`rls_baseline.sql:1230`), so writes must go through a `SECURITY DEFINER` RPC.

## Goal

The owner generates an invite link; the invitee opens it, signs in, and lands **inside
the owner's household as a caregiver** with full record access to the same puppy — never
in a stray empty household.

## Non-goals (YAGNI — deferred)

- Viewer (read-only) role. Ship caregiver-only first; the schema already supports viewer.
- Revoke UI and resend UI. RPC exists for revoke (cheap), but no dedicated screen this pass.
- Email-bound invites (`email_hash` matching on accept). Link-bearer model only for now.
- Universal Links / Associated Domains. Custom scheme is enough for two phones today.
- Multiple concurrent active links per household. One active link at a time.

## Locked decisions (from brainstorm)

1. **Scope = minimal-correct.** Owner → one active invite link (~7-day TTL) → invitee
   joins as caregiver → link consumed on accept. Defer viewer/revoke-UI/email-bind/resend.
2. **Bootstrap ordering = token-gated (Option A).** Deep-link token is persisted *before*
   sign-in. After sign-in: if a pending token exists → call `accept_household_invite`
   and **skip** `bootstrap`; if none → normal `bootstrap`; expired/invalid → show the
   `InviteAcceptScreen` expired state with a "create your own household" fallback.
   Invariant: **the invitee never gets a stray empty household.**
3. **Link delivery = custom scheme + manual paste.** `puppyplan://invite/<token>` reuses
   the existing `app/invite/[token].tsx` route, plus a manual paste-link/paste-code field
   as fallback. Zero infrastructure.
4. **Token hash = in-DB RPC + sha256.** Create/accept/revoke are `SECURITY DEFINER` RPCs
   (same pattern as `bootstrap_current_user`). Token = `gen_random_bytes(32)`, stored as
   `sha256:<hex>`, compared in constant time. The `invite_secret_token_hash_format` CHECK
   constraint is deliberately relaxed to allow `sha256:` — documented in a new ADR, with
   RLS tests updated. No Edge Function, no deploy.

## Architecture — three layers

### Layer 1 — Database (new migration + RPCs)

Three `SECURITY DEFINER` functions in `public`, granted to `authenticated`, `REVOKE`d
from `anon`/`PUBLIC` (mirror `bootstrap_current_user`). All `SET search_path = ''`.

**`create_household_invite(p_role text DEFAULT 'caregiver', p_ttl interval DEFAULT '7 days')`**
→ returns `(token text, expires_at timestamptz)`.
- Assert `auth.uid()` is an `owner` of exactly one household (reuse the bootstrap lookup).
- Revoke any existing non-accepted, non-revoked, non-expired invite for that household
  (enforces "one active link").
- `v_token := encode(gen_random_bytes(32), 'hex')`; `v_last4 := right(v_token, 4)`.
- Insert `public.invite` (household_id, role, expires_at = now()+ttl, created_by, token_last4)
  and `app_private.invite_secret` (invite_id, token_hash = `'sha256:'||encode(digest(v_token,'sha256'),'hex')`, token_last4).
- Return the **plaintext** token exactly once. It is never stored or logged.

**`accept_household_invite(p_token text)`** → returns `(household_id uuid, role text)`.
- Assert authenticated. Compute `'sha256:'||encode(digest(p_token,'sha256'),'hex')`.
- Look up `invite_secret` by hash (constant-time-ish: compare on the hashed column, not the
  raw token). Join to `public.invite`.
- Validate: not accepted, not revoked, `expires_at > now()`. On failure raise a typed
  error (`ERRCODE` mapped to expired / already-used / invalid) so the client can branch.
- Guard self-invite: if caller is already a member of that household, return existing row
  (idempotent), do not duplicate.
- Insert `household_membership` (household_id, user_id=auth.uid(), role, invited_by=invite.created_by,
  accepted_at=now()); the `UNIQUE(household_id,user_id)` guards double-accept.
- Stamp `invite.accepted_at/accepted_by`. Return the joined household + role.

**`revoke_household_invite(p_invite_id uuid)`** → boolean. Owner-only; sets
`revoked_at/revoked_by`. Present for completeness and tests; no UI wired this pass.

**Constraint migration.** Relax `invite_secret_token_hash_format` from
`~ '^(argon2id:|\$argon2id\$).+'` to also allow `^sha256:[0-9a-f]{64}$`. Rationale
(→ ADR): the token is 256 bits of CSPRNG output; sha256 is a correct pre-image-resistant
digest for high-entropy secrets. argon2 exists to slow brute force of *low-entropy*
passwords and is not computable in-DB (only pgcrypto is enabled). This is a documented
security decision, **not** a check weakened to make a test pass.

### Layer 2 — Client data (repository + mutations)

- Extend `src/lib/supabase/household-access.ts` with `createInvite`, `acceptInvite`,
  `revokeInvite` calling the RPCs via the shared Supabase client (no raw client in UI).
- Contracts in `src/contracts/supabase.ts`: response schemas for the three RPCs
  (`createInviteResponseSchema` → `{ token, expires_at }`, `acceptInviteResponseSchema`
  → `{ household_id, role }`). Reuse existing `inviteRoles`.
- TanStack mutations invalidating `['sharing','household-invites']`. Errors surface via the
  existing business-error path — no silent swallow.

### Layer 3 — Sign-in orchestration (token-gated bootstrap)

- Persist the deep-link token before auth. `app/invite/[token].tsx` already extracts the
  token; store it (secure storage / a small `pendingInvite` module) so it survives the
  sign-in redirect (`resolveAuthRouteRedirect` sends signed-out users to `/sign-in`).
- In `src/lib/auth/context.tsx` `applyUser` (lines 87–117): before calling
  `deps.bootstrap()`, check for a pending token. If present → `deps.acceptInvite(token)`;
  on success mark bootstrapped, clear the pending token, `setStatus('signedIn')`, skip
  bootstrap. On typed expired/invalid error → clear token, route to `InviteAcceptScreen`
  expired state (create-your-own fallback → falls through to normal `bootstrap`). If **no**
  token → unchanged `bootstrap()` path.
- Keep the `catch` → `signOut` cleanup for genuine failures; do not swallow accept errors.

## UX surfaces

- **Owner** `HouseholdAccessScreen`: replace the stub. "Пригласить" → call `createInvite`,
  show the `puppyplan://invite/<token>` link + a copy action and the `token_last4` for
  confirmation. New i18n keys (EN/RU/ES) replacing `actions-unavailable`.
- **Invitee** `InviteAcceptScreen` (`src/features/linking/screens/InviteAcceptScreen.tsx`):
  already has loading / load-error / expired / already-member states; wire the real accept
  mutation to its `onAccept`. Add the manual paste-link/code fallback field.

## Edge cases

- Token expired / already accepted / revoked → typed error → expired state, offer fallback.
- Invitee is already an owner of their own (empty) household from a prior stray sign-in →
  accept still joins the owner's household; document that the stray household is orphaned
  (cleanup is out of scope; log, don't hide).
- Double-tap / re-open link after accept → idempotent (UNIQUE membership + accepted guard).
- Owner regenerates link → old link invalidated (single-active-link revoke on create).
- Sign-in abandoned mid-flow → pending token has its own TTL; cleared on expiry.

## Testing

- **RLS/pgTAP** (`supabase/tests/rls_baseline.sql`): owner can create; non-owner cannot;
  accept joins membership; expired/revoked/reused tokens rejected; direct client insert
  still denied; sha256 hash format accepted by the relaxed constraint. Update the existing
  `'argon2id:invite-hash'` fixtures to the new format where they assert the constraint.
- **Contracts**: schema round-trip tests for the two RPC responses.
- **Auth orchestration**: unit test `applyUser` — pending-token → accept path (no bootstrap);
  no-token → bootstrap path; expired-token → fallback. Assert the invariant "no stray
  household created when a valid token is present."
- **i18n**: EN/RU/ES parity for all new keys; RU reminders term unaffected.

## ADR

New ADR: "Household invite tokens hashed with sha256 in-DB." Records the constraint
relaxation, the entropy rationale, the constant-time-compare note, and that argon2 was
rejected because it is not computable with the enabled extensions and is unnecessary for
CSPRNG tokens. Cross-link ADR-0017 (bootstrap) and the share-RPC ADR.

## Rollout (implementation phases — for the follow-up plan)

0. Migration + three RPCs + constraint relax + ADR.
1. RLS/pgTAP tests green.
2. Contracts + repository + mutations.
3. Token-gated bootstrap in `auth/context.tsx` + pending-token persistence.
4. Owner create-link UI + i18n.
5. Invitee accept UI + manual-paste fallback + i18n.
6. Device verification on both iPhones (owner creates link → Annie joins → sees same puppy).

## Approvals still required (not covered by "do what's best")

- Applying the migration to any remote/hosted Supabase project (Release Guardrail).
- Pushing the branch / opening a PR / merging to main.
