# Household Invite — Make The Second Family Member Actually Join

**Status:** Active
**Plan type:** Design (brainstorm output; feeds an implementation plan)
**Current phase:** Phase 2 — contracts/repository/mutations RED
**Linear:** `PUP-42` — https://linear.app/dmitryselenya/issue/PUP-42
**Owner:** Dmitry
**Date:** 2026-07-23

## Problem

During live dogfooding, a second family member installed the app on another iPhone
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

## Task contract

### Acceptance criteria

- **AC-1 — owner creates one caregiver link.** An authenticated household owner can create
  one active caregiver invite with a seven-day default TTL. The client receives a
  `puppyplan://invite/<token>` link whose token is returned once, never logged, and never
  durably retained by the owner flow.
- **AC-2 — server-enforced access.** A non-owner cannot create or revoke an invite; normal
  clients still cannot insert/update/delete `public.invite` or read
  `app_private.invite_secret`.
- **AC-3 — token-gated bootstrap.** A valid pending invite is persisted before OTP sign-in.
  After authentication it is accepted before `bootstrap_current_user`; successful acceptance
  skips bootstrap, so no new empty household is created.
- **AC-4 — same household and puppy.** Acceptance creates one accepted caregiver membership
  in the owner's existing household and makes that accepted household the invitee's active
  care context, including when an older stray empty household already exists. The orphan is
  not deleted in this slice.
- **AC-5 — neutral unavailable fallback.** Invalid, expired, revoked, or consumed tokens map
  to one typed unavailable client state without revealing which condition occurred.
  `InviteAcceptScreen` offers a create-your-own fallback that runs normal bootstrap only after
  the invite path has failed.
- **AC-6 — owner UI.** The owner invite action exposes the generated link, `token_last4`, and
  a native copy action with loading, success, and surfaced error states.
- **AC-7 — invitee UI.** The invite screen accepts the deep-link token or a manually pasted
  PuppyPlan link/raw token, surfaces invalid input, and uses the real acceptance mutation for
  an already-authenticated user.
- **AC-8 — language and privacy.** All new user-facing copy is typed and present in EN/RU/ES.
  No raw token, puppy name, note, email, provider name, or production data enters logs,
  analytics, docs, screenshots, cache keys, or verification evidence.

### Error cases

- **ERR-1:** missing authentication at any write RPC is rejected.
- **ERR-2:** invalid role or non-positive TTL is rejected.
- **ERR-3:** invalid, expired, revoked, or consumed token returns a typed error at the database
  boundary and one neutral unavailable state at the UI boundary.
- **ERR-4:** persistence, RPC, parsing, copy, bootstrap, and cache-invalidation failures are
  surfaced with stable privacy-safe categories; none are swallowed to `null`, `[]`, or
  `undefined`.
- **ERR-5:** a genuine unclassified invite/bootstrap failure keeps the existing auth cleanup
  path and signs the user out.

### Constraints

- No dependency, remote migration, push, PR, merge, production, or release action without the
  exact owner approval required by `AGENTS.md`.
- RPCs mirror `bootstrap_current_user`: `SECURITY DEFINER`, `SET search_path = ''`, explicit
  authentication/role checks, `PUBLIC`/`anon` revoke, authenticated grant.
- The only designed constraint change is adding exact
  `^sha256:[0-9a-f]{64}$` support to `invite_secret_token_hash_format`, justified by the new
  ADR and tests.
- Feature UI uses only `src/design` primitives; `app/` remains route/orchestration wiring.
- No lint/test/type configuration weakening, ignore directive, `any`, `as unknown as`, or
  generated native-file edit.

### Out of scope

- Viewer invites, email binding, resend/revoke UI, universal links, member cleanup, household
  switcher UI, and deletion of a pre-existing stray household.
- Remote Supabase verification, app install, simulator/device execution, push, PR, or merge.

### Likely files

- `supabase/migrations/<timestamp>_household_invite_rpcs.sql`
- `supabase/tests/rls_baseline.sql`
- `docs/architecture/adr/0023-household-invite-token-sha256.md`
- `docs/architecture/ADR_INDEX.md`
- `src/contracts/supabase.ts`, `src/contracts/auth.ts`
- `src/lib/supabase/household-access.ts`, `src/lib/query/household-access.ts`
- `src/lib/auth/context.tsx`, `src/lib/storage/pendingHouseholdInvite.ts`
- `src/lib/supabase/puppies.ts`
- `app/invite/[token].tsx`, `app/invite/index.tsx`
- `src/features/more/screens/HouseholdAccessScreen.tsx`
- `src/features/linking/screens/InviteAcceptScreen.tsx`
- `STRINGS.en.json`, `STRINGS.ru.json`, `STRINGS.es.json`
- Focused contract/repository/query/auth/storage/render tests under `src/test/`

### Verification

- RED/GREEN focused Jest tests for every client behavior change.
- Static Supabase guardrails and pgTAP source assertions; actual remote pgTAP execution remains
  approval-gated.
- `npm run check` before each phase commit.
- `git diff --check`, privacy scan, design doctor, and a requirement-by-requirement final audit.
- Owner-run two-device checklist in Phase 6; no install or device run by the implementation agent.

## Senior Pass Gate 1 — contour

- **Intent:** restore the actual shared-care loop, not merely generate a link. The invited
  account must operate on the owner's durable household and puppy immediately after OTP.
- **Surfaces:** owner manage-household default/loading/create-pending/create-error/link-created/
  copy-success/copy-error; invitee valid/loading/sign-in/accept-pending/already-member/
  unavailable/manual-input-invalid/manual-input-valid; normal no-invite bootstrap.
- **Lifecycle:** create revokes the prior active invite; accept is single-consume but idempotent
  for an existing membership; pending intent has a local expiry and is cleared after resolution;
  abandoned auth does not create a household; unavailable fallback is the only path that resumes
  normal bootstrap.
- **Existing stray household:** current `selectActiveMembership` chooses the oldest membership.
  Therefore inserting a new caregiver membership alone would leave the dogfooding invitee on the
  older empty household. Phase 3 must explicitly activate/select the newly accepted household
  without deleting the orphan.
- **Offline/error:** there is no offline invite acceptance. Persistence and network failures are
  explicit retry/error states and never optimistic membership success.
- **Blast radius:** invite/secret constraints, RLS grants, auth state and routing, active puppy
  selection, household-invite query-key shape/invalidation, i18n parity/budgets, and existing
  invite/manage render anatomy.
- **Better approach:** keep the token-gated bootstrap design, but carry the accepted
  `household_id` into active-care selection so the pre-existing stray-household edge case meets
  the same-puppy outcome. Cleanup remains a separate operation.

Owner aligned with this Gate 1 contour on 2026-07-24.

## Design Fidelity Stage 0 — approved lock

- **Atlas:** `v2.family.01` (`docs/design/v2/screenshots/06-family.png`), default, 924x540
  composite family/sharing board.
- **Spec cards to refresh after owner alignment:**
  `docs/design/v1/specs/07-1-accept-invite.md` and
  `docs/design/v1/specs/07-2-manage-household.md`.
- **Routes:** `/settings/household`, `/invite/[token]`, and neutral `/invite` fallback.
- **States:** owner default/create-pending/create-error/link-created/copy result; invitee
  valid/accept-pending/unavailable/already-member/manual-input error; SE compact primary.
- **Allowed deviations:** caregiver-only; custom-scheme link instead of email; generated
  link shown only to the owner; manual paste field; neutral create-your-own fallback; no viewer,
  resend, revoke UI, or member roster expansion.
- **Primitives:** existing `Screen`, `ScreenHeader`, `Card`, `Stack`, `AppText`, `Button`,
  `TextField`, `StatusPill`, `ListGroup`, `ListRow`, `Avatar`, `AppIcon`, and `IconButton`.
- **Stage 4:** implementation agent does not install/run the app per owner instruction. Native
  screenshot comparison stays explicitly owner-run in the Phase 6 checklist and cannot be
  self-recorded as PASS.

Stage 0 was approved with the Gate 1 contour on 2026-07-24.

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

### Preflight

- [x] Read `AGENTS.md`, `CLAUDE.md`, PUP-42, this plan, relevant PRD/DESIGN/architecture/ADRs,
  the V2 family atlas, existing spec cards, implementation files, and tests.
- [x] Create the isolated worktree from `main` using Linear's exact branch name.
- [x] Move PUP-42 to In Progress and record preflight evidence in Linear.
- [x] Build/query project-graph context and verify surfaced files in source.
- [x] Receive owner alignment for the Gate 1 contour and proposed Stage 0 lock.
- [x] Receive approval for reduced-assurance lightweight TDD because isolated agent contexts are
  unavailable.
- [x] Receive approval for the exact `expo-clipboard` dependency addition.
- [x] Resolve the main-branch QueryClient mutation-GC timer prerequisite so
  `npm run check` exits green.

### Phase 0 — migration and ADR

- [x] RED: add focused static migration/ADR guardrail assertions.
- [x] GREEN: add the constraint migration and create/accept/revoke RPCs.
- [x] Add ADR-0023 and update the ADR index.
- [x] Run focused verification and full `npm run check`.
- [x] Record evidence/changelog/Linear and commit Phase 0.

### Phase 1 — RLS/pgTAP

- [x] RED: add owner/non-owner/create/accept/expired/revoked/reused/direct-write/hash-format cases.
- [x] GREEN: complete pgTAP fixtures/helpers without weakening existing direct-write denial.
- [x] Run static Supabase guardrails; record that remote pgTAP is approval-gated.
- [x] Run full `npm run check`, record evidence/changelog/Linear, and commit Phase 1.

### Phase 2 — contracts, repository, and mutations

- [ ] RED: response/error contracts, repository methods, and mutation invalidation.
- [ ] GREEN: implement create/accept/revoke boundary methods and
  `['sharing','household-invites']`-rooted invalidation.
- [ ] Run focused tests and full `npm run check`.
- [ ] Record evidence/changelog/Linear and commit Phase 2.

### Phase 3 — token-gated bootstrap and active household

- [ ] RED: pending-token persistence/expiry, accept-before-bootstrap, no-token bootstrap,
  unavailable fallback, genuine-failure sign-out, and accepted-household activation.
- [ ] GREEN: implement pending intent, auth orchestration, neutral fallback, and post-accept
  active-household selection.
- [ ] Run focused tests and full `npm run check`.
- [ ] Record evidence/changelog/Linear and commit Phase 3.

### Phase 4 — owner create-link UI

- [ ] Refresh `07-2-manage-household.md` from proposed to approved Stage 0.
- [ ] RED: owner create/loading/error/link/copy anatomy and behavior tests.
- [ ] GREEN: wire create mutation, link/last4 display, native copy action, and EN/RU/ES copy.
- [ ] Run focused tests, i18n/design gates, and full `npm run check`.
- [ ] Record evidence/changelog/Linear and commit Phase 4.

### Phase 5 — invitee accept and manual paste UI

- [ ] Refresh `07-1-accept-invite.md` from proposed to approved Stage 0.
- [ ] RED: deep-link/manual input, sign-in handoff, accept/unavailable/fallback anatomy and behavior.
- [ ] GREEN: wire real accept flow, manual paste parser, typed errors, fallback, and EN/RU/ES copy.
- [ ] Run focused tests, i18n/design gates, and full `npm run check`.
- [ ] Record evidence/changelog/Linear and commit Phase 5.

### Phase 6 — owner device verification and completion audit

- [ ] Produce a synthetic-data two-device checklist; do not install or run the app.
- [ ] Run Senior Pass Gate 2, adversarial diff review, privacy/security review, and final full gate.
- [ ] Record remote/device/Stage-4 items as owner-run and unverified until the owner supplies evidence.
- [ ] Record final evidence/changelog/Linear and commit Phase 6.

## Approvals still required (not covered by "do what's best")

- Applying the migration to any remote/hosted Supabase project (Release Guardrail).
- Pushing the branch / opening a PR / merging to main.

## Approvals granted

- **2026-07-24:** reduced-assurance lightweight RED/GREEN/REFACTOR for this auth/RLS slice because
  isolated agent contexts are unavailable.
- **2026-07-24:** add SDK-compatible `expo-clipboard@~55.0.14`.
- **2026-07-24:** reuse the focused QueryClient mutation-GC timer fix/test as a prerequisite.
- **2026-07-24:** Gate 1 contour and Stage 0 lock, including activation of the newly accepted
  household when an older stray empty household exists.

## Verification evidence

### 2026-07-24 — preflight baseline

- `npm install`: exit 0; no dependency change in the worktree.
- `npm run check`: **not green**. Lint completed with 0 errors and 21 pre-existing warnings;
  typecheck completed; Jest reported 105/105 suites and 1,275/1,275 tests passed, then failed to
  exit because a QueryClient mutation garbage-collection timer remains alive. The process was
  terminated after the result and open-handle warning; node/scaffold checks pass when run
  separately.
- Root cause confirmed read-only against the current PUP-41 working tree: its uncommitted
  `src/lib/query/client.ts` change applies the existing test-only `gcTime = Infinity` to mutation
  defaults, with `src/test/query-client.test.ts` covering both query and mutation defaults.
- No PUP-42 product tests or implementation started before the required owner decisions.

### 2026-07-24 — approved baseline prerequisite RED/GREEN

- TDD mode: lightweight; reduced assurance explicitly approved because isolated agent contexts are
  unavailable.
- RED: `npm run test:unit -- --runTestsByPath src/test/query-client.test.ts` failed 1/1 because
  mutation `gcTime` was `undefined`.
- GREEN: the same command passed 1/1 after applying the existing test-only `gcTime` to mutation
  defaults.
- Dependency: `npx expo install expo-clipboard` installed the SDK 55-compatible `~55.0.14`
  range (resolved to `55.0.15` in the lockfile); npm audit reported 0 vulnerabilities.
- Full gate: `npm run check` passed with 106 Jest suites / 1,276 tests and 146 Node tests.
  Lint reported 0 errors and 21 pre-existing warnings; Design Doctor reported 0 failures and
  13 pre-existing warnings.

### 2026-07-24 — Phase 0 migration and ADR

- RED: `node --test --test-name-pattern "PUP-42 Phase 0"
  scripts/checks/supabase-baseline.test.mjs` failed 4/4 because the migration and ADR did not
  exist.
- GREEN: the same focused command passed 4/4 after adding the three authenticated-only
  `SECURITY DEFINER` RPCs, exact SHA-256 token handling, compatible hash CHECK, and ADR-0023.
- `npm run supabase:guardrails`: passed 37/37 tests; generated database types stayed unchanged.
- Review: the pre-commit concurrency pass found that locking only one owner's membership would
  not serialize two co-owners. The migration now also locks the household row, and the focused
  guardrail requires that lock.
- Full gate: `npm run check` passed with 106 Jest suites / 1,276 tests and 150 Node tests.
  Lint reported 0 errors and 21 pre-existing warnings; Design Doctor reported 0 failures and
  13 pre-existing warnings.
- Remote migration apply, database advisors, and database-backed pgTAP were not run; they remain
  approval-gated. Phase 1 adds the pgTAP source and local static coverage.

### 2026-07-24 — Phase 1 RLS/pgTAP coverage

- RED: `node --test --test-name-pattern "covers household invite RPC"
  scripts/checks/supabase-baseline.test.mjs` failed because all 13 required pgTAP labels were
  absent.
- GREEN: the same command passed after adding owner create, caregiver denial, owner-only revoke,
  caregiver membership acceptance, expired/revoked/reused rejection, same-user idempotency,
  direct-write denial retention, and SHA-256/Argon2 compatibility cases.
- pgTAP plan count increased from 126 to 139; source contains exactly 139 assertion calls.
- Fixtures derive synthetic token digests at runtime with `extensions.digest(repeat(...), 'sha256')`;
  no plaintext invite value is persisted or printed.
- `npm run supabase:guardrails`: passed 38/38 local static/typegen tests.
- Database-backed pgTAP was not executed because applying the Phase 0 migration to a hosted
  Supabase project is approval-gated and this repository intentionally has no Docker-backed local
  aggregate gate.
- Full gate: `npm run check` passed with 106 Jest suites / 1,276 tests and 151 Node tests.
  Lint reported 0 errors and 21 pre-existing warnings; Design Doctor reported 0 failures and
  13 pre-existing warnings.

## Changelog

- **2026-07-24 — preflight:** created the `main`-based Linear branch/worktree, restored the two
  existing PUP-42 design commits, moved Linear to In Progress, assembled the minimum context
  package, recorded the task contract/Gate 1 contour/proposed Stage 0 lock, and documented the
  baseline open-handle blocker plus pending approvals. No behavior code changed.
- **2026-07-24 — owner alignment:** approved lightweight TDD with reduced assurance,
  `expo-clipboard@~55.0.14`, the QueryClient timer prerequisite, and the Gate 1/Stage 0 contour.
- **2026-07-24 — baseline prerequisite:** added test-only mutation-cache GC configuration and its
  focused regression test, installed the approved clipboard module, and restored a fully green
  local gate before Phase 0.
- **2026-07-24 — Phase 0:** added the household invite RPC migration, exact
  `sha256:[0-9a-f]{64}` compatibility, privacy-safe typed SQLSTATEs, least-privilege function
  grants, co-owner-safe serialization, ADR-0023, and static migration/ADR guardrails.
- **2026-07-24 — Phase 1:** expanded the pgTAP contract from 126 to 139 assertions for invite RPC
  authorization, lifecycle, membership, idempotency, direct-write denial, and both accepted secret
  hash formats; hosted execution remains explicitly unverified.
