# PUP-42 Household Invite — Membership And Role Honesty Follow-Up

> Continue the completed PUP-42 implementation without rewriting the already-applied migration.
> This plan owns the self-invite/already-member semantics, honest role/error projections, and
> fresh simulator verification requested after dogfooding.

**Goal:** A household invite never changes or misrepresents an existing member's role, never
consumes an unused link when opened by an existing member, and never shows owner-only or
caregiver-only UI when the active household context is unknown or the local Quick Log write port
is unavailable.

**Status:** Active.

**Current phase:** Phase 7 implementation and local/native verification are complete. The four
approved dev migrations, OTP 429 honesty, duplicate same-session resolution coalescing, full
local gates, and approved-SE Release recheck are complete. The broader physical two-device and
accessibility matrix remains owner-run under the linked device checklist.

**Architecture:** A local follow-up migration replaces only
`public.accept_household_invite(text)` and returns the actual membership role plus a typed outcome.
The TypeScript contract and repository preserve that result through auth/deep-link routing. Feature
screens project only verified role/availability state and continue to use shared design primitives.

**Linear:** `PUP-42`

**Branch:** `dimaselenya/pup-42-household-invite-let-the-second-family-member-actually-join`

**TDD mode:** Lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.
The owner explicitly approved this mode for this exact PUP-42 follow-up on 2026-07-24.

**Primary source docs:**
- Original plan: `docs/plans/completed/2026-07-23-household-invite-design.md`
- PRD: `puppyplan-prd-v2.md` — Family sharing, Quick Log, permissions
- Design: `DESIGN.md` — Quick Log details and Family & Access
- Architecture: `docs/architecture/04-data-sync-and-conflict-resolution.md`
- Architecture: `docs/architecture/05-security-privacy-and-sharing.md`
- Architecture: `docs/architecture/06-design-system-and-ui-contracts.md`
- Architecture: `docs/architecture/11-auth-and-identity.md`
- ADR: `docs/architecture/adr/0007-prd-schema-baseline.md`
- ADR: `docs/architecture/adr/0023-household-invite-token-sha256.md`
- Design specs: `docs/design/v1/specs/07-1-accept-invite.md`,
  `docs/design/v1/specs/07-2-manage-household.md`
- Device checklist: `docs/dogfood/2026-07-24-pup-42-household-invite-device-checklist.md`

---

## Context And Root-Cause Evidence

- The first PUP-42 migration is already applied to the approved dev project. It must remain
  immutable; changed behavior ships as a new migration and is not remotely applied in this task
  without a separate exact approval.
- `accept_household_invite` currently detects an existing membership but returns the invite role
  (`caregiver`) instead of the membership role. For an unused invite, it then stamps
  `accepted_at/accepted_by`, so an owner opening their own link consumes it even though the owner
  membership remains unchanged.
- `InviteAcceptScreen` already has a deterministic `already-member` review state, but the live
  acceptance result cannot express that outcome, so the state is dead in the connected flow.
- `HouseholdAccessScreen` defaults a missing role to `owner`, making an empty/error/unknown active
  care context look authoritative.
- Quick Log details maps both a real `viewer` role and an unavailable local mutation port to
  `permission-denied`. The latter is an infrastructure/write-path failure, not an authorization
  decision, and produced the misleading “ask the owner” screenshot.
- A cold launch of the currently installed Release app showed the normal sign-in screen. The invite
  UI appeared only after entering an invite route; a fresh install is not intrinsically forced into
  a caregiver path.
- A later distinct-account run proved initial acceptance lands in the owner's populated household,
  then a fresh embedded Release reinstall/cold launch reproduced a stray empty household.
  `bootstrap_current_user` selected only active owner memberships, so the cleared invite intent left
  a caregiver indistinguishable from a brand-new user on session restoration.
- The simulator has only about 4.7 GiB free. The native dogfood guide requires at least 10 GiB
  before rebuilding. No cache, DerivedData, simulator, or DeviceSupport cleanup is authorized.
- Supabase's 2026-07-24 changelog contains no relevant RPC/auth breaking change. Current official
  function guidance still requires a fixed `search_path` for `SECURITY DEFINER` and explicit
  function privilege revocation. PostgreSQL requires drop/recreate when a function return type
  changes.
- The repository intentionally has no installed local Supabase CLI/stack on this M1/8 GB machine.
  `npm run supabase:guardrails` is the authorized no-Docker SQL/RLS/typegen gate; executable pgTAP,
  hosted lint, migration dry-run, and hosted typegen remain remote and approval-gated.

## Senior Pass Gate 1 — Approved Contour

The owner approved this contour on 2026-07-24:

1. The acceptance RPC returns the caller's **actual active membership role** and an outcome:
   `accepted` or `already_member`.
2. An existing active member of the invite household receives `already_member`; an unused invite
   stays unused and available to the intended second account.
3. A newly joining account receives `accepted`, becomes caregiver in the owner's existing
   household, and consumes the invite once.
4. An invite already consumed by the same account may return idempotent `already_member` only while
   that accepted active membership still exists. Other callers receive the existing neutral
   unavailable/used error.
5. The live route wires `already_member`; unavailable review anatomy does not lead with a false
   caregiver claim.
6. A valid invite offers a deliberate “create your own household” alternative. It never runs
   automatically and clears the pending invite before normal bootstrap.
7. Only an actual `viewer` role produces Quick Log permission-denied. Missing care context or an
   unavailable mutation port produces an honest non-permission error/unavailable state.
8. Family & Access never defaults an absent role to owner and never renders the member roster or
   owner invite CTA until active household context is ready.
9. Session restoration reuses any accepted, non-revoked membership. A populated household wins
   over a legacy empty household; a new owner household is created only when no active membership
   exists.

## Design Fidelity Stage 0 — Follow-Up Lock

- **Atlas/spec:** `v2.family.01`, `docs/design/v2/screenshots/06-family.png`,
  `docs/design/v1/specs/07-1-accept-invite.md`,
  `docs/design/v1/specs/07-2-manage-household.md`.
- **Routes:** `/invite/[token]`, `/invite`, `/settings/household`,
  `/(modals)/quick-log/details`.
- **Device:** approved SE compact profile
  `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).
- **States:** valid invite, accept pending, accepted, already-member, unavailable, manual invalid,
  create-own pending/error; household loading/error/empty/ready-owner/ready-caregiver; Quick Log
  viewer-denied/write-port-unavailable/ready-owner.
- **Allowed deviations:** caregiver-only invite creation remains; no provider metadata lookup,
  decline RPC, member-management UI, or revoke UI. The valid invite screen may expose a secondary
  create-own path to prevent an invite link from becoming a forced caregiver funnel.
- **Primitives:** existing `Screen`, `ScreenHeader`, `Card`, `Stack`, `AppText`, `Button`,
  `TextField`, `StatusPill`, `ListGroup`, `ListRow`, `Avatar`, `AppIcon`, `IconButton`.
- **Stage 4:** the approved-SE Release cold-start and caregiver Family & Access projection passed.
  The broader physical two-device, Dynamic Type, VoiceOver, manual-fallback, and unavailable-link
  matrix remains owner-run. Stale-bundle screenshots remain reproduction evidence only.
- **Auth rate-limit state:** no auth atlas artboard or anatomy changes. The follow-up ports the
  already-reviewed PUP-41 state into the existing `TextField.errorText` slot and preserves the
  current sign-in hierarchy, controls, touch targets, and generic failure state.

## Acceptance Criteria

- **AC-F1 — existing member outcome:** accepting a valid unused invite as an existing active member
  returns `already_member` with the actual role (`owner`, `caregiver`, or `viewer`) and leaves
  `invite.accepted_at/accepted_by` unchanged.
- **AC-F2 — new member outcome:** accepting as a non-member returns `accepted` with `caregiver`,
  creates/reactivates exactly one accepted caregiver membership, and consumes the invite.
- **AC-F3 — idempotency without leakage:** the accepting account can retry a consumed invite and
  receives `already_member` with its actual active role; a different account receives the neutral
  used error. Revoked/expired/invalid behavior remains neutral.
- **AC-F4 — typed boundary:** Zod, generated DB types, repository tests, auth orchestration, and the
  connected invite route carry `outcome` and all three real membership roles without casts or raw
  Supabase use in UI.
- **AC-F5 — live already-member UX:** the connected route displays the localized already-member
  state and navigates into the existing household without claiming that an owner became caregiver.
- **AC-F6 — non-forced owner path:** valid and unavailable invite states offer an explicit localized
  create-own action; it clears pending invite state and calls normal bootstrap only after a direct
  user action.
- **AC-F7 — honest household shell:** empty/error/loading/unknown active care state renders only its
  state anatomy; it never renders the “You / Owner” row or enables invite creation.
- **AC-F8 — honest Quick Log state:** an actual viewer gets permission-denied; active-care empty or
  unavailable mutation infrastructure gets a non-permission error/unavailable state; ready owners
  and caregivers can edit.
- **AC-F9 — privacy/i18n:** all new UI copy is typed and present in EN/RU/ES. No raw token, email,
  puppy name, note, provider name, or production value enters logs, docs, fixtures, screenshots,
  cache keys, or Linear.
- **AC-F10 — regression:** deferred auth callback remains asynchronous and normal no-invite
  bootstrap remains unchanged.
- **AC-F11 — cold-start membership:** after the pending token is cleared, caregiver/viewer cold
  start returns to an accepted household and never creates a stray owner household. When legacy
  empty and populated memberships coexist, the populated household is selected without deleting
  either membership.
- **AC-F12 — honest non-owner household UI:** caregiver/viewer sees the actual role, owner-managed
  access copy, and no invite query/section/CTA. Owner behavior remains unchanged.
- **AC-F13 — honest OTP throttling:** Supabase OTP failures with HTTP 429 or
  `over_email_send_rate_limit` are surfaced through the typed localized rate-limit copy; other
  request failures keep the generic request-failed state. Raw backend messages and account values
  are never logged or rendered.
- **AC-F14 — single session resolution:** when restored-session and `INITIAL_SESSION` delivery
  overlap for the same authenticated user, the provider runs pending-invite/bootstrap resolution
  once and shares that in-flight result instead of starting duplicate bootstrap RPCs.

## Error And Edge Cases

- **EC-F1:** existing owner opens their own unused link.
- **EC-F2:** existing caregiver/viewer opens another unused invite for the same household.
- **EC-F3:** the accepting account retries after a successful acceptance.
- **EC-F4:** a different account tries the consumed token.
- **EC-F5:** membership was revoked after the invite was consumed.
- **ERR-F1:** malformed/invalid/expired/revoked/used-by-other token remains a typed, neutral error.
- **ERR-F2:** missing auth remains rejected.
- **ERR-F3:** an unknown RPC outcome/role fails contract parsing and is surfaced; it is never
  defaulted.
- **ERR-F4:** pending-invite clearing or normal bootstrap failure remains surfaced through the
  existing auth cleanup path.
- **ERR-F5:** OTP failures without a recognized status/code remain generic and never expose the
  raw Supabase error.
- **EC-F6:** `getCurrentUser()` and the auth subscription return the same user before the first
  bootstrap promise settles.

## Constraints And Non-Goals

- No remote migration, push, PR, merge, commit, rebase, release, install, cache deletion, or device
  cleanup without exact approval for that action.
- Do not edit the already-applied `20260724111630_household_invite_rpcs.sql`.
- No dependency, check weakening, ignore directive, `any`, `as unknown as`, or generated native
  project edit.
- No email binding, universal links, invite targeting, multi-household switcher, household cleanup,
  role-management UI, or decline/revoke UI.
- Plaintext invite token remains one-time client data and is never logged or durably stored by the
  owner flow.

## Invariants And Executable Spec

- **I-F1:** an existing membership is authoritative over an invite role.
  - pgTAP: owner/caregiver/viewer already-member matrix plus unchanged invite row.
- **I-F2:** only a newly created/reactivated membership consumes an unused invite.
  - pgTAP: non-member acceptance and invite stamp; existing-member negative assertion.
- **I-F3:** UI never infers authorization from missing infrastructure/data.
  - `src/test/quick-log-details-route.render.test.tsx`
  - `src/test/more-settings.render.test.tsx`
- **I-F4:** live acceptance outcome is exhaustively parsed and routed.
  - `src/test/supabase-contracts.test.ts`
  - `src/test/household-access-repository.test.ts`
  - `src/test/invite-route.render.test.tsx`
- **I-F5:** every affected state uses typed EN/RU/ES strings and structural anatomy tests.
  - `src/test/i18n-contract.test.ts`
  - `src/test/app-shell.render.test.tsx`
  - `src/test/more-settings.render.test.tsx`
- **I-F6:** session restoration never bootstraps an already accepted caregiver/viewer.
  - `supabase/tests/auth_bootstrap.sql`
  - `scripts/checks/supabase-baseline.test.mjs`
- **I-F7:** auth request errors distinguish throttling from connectivity without inspecting or
  surfacing private error text.
  - `src/test/auth-api.test.ts`
  - `src/test/sign-in-screen.render.test.tsx`
- **I-F8:** one provider instance has at most one household-resolution operation in flight per
  authenticated user.
  - `src/test/auth-context.test.tsx`

## File Map

### Contracts And Data
- `src/contracts/supabase.ts`
- `src/contracts/database.types.ts`
- `src/lib/supabase/household-access.ts`
- `src/lib/auth/context.tsx`
- `app/invite/[token].tsx`
- `app/invite/index.tsx`

### Backend
- New `supabase/migrations/<generated>_household_invite_already_member_outcome.sql`
- New `supabase/migrations/<generated>_bootstrap_current_user_membership_resolution.sql`
- `supabase/tests/rls_baseline.sql`
- `supabase/tests/auth_bootstrap.sql`

### Feature UI And i18n
- `src/features/linking/screens/InviteAcceptScreen.tsx`
- `src/features/more/screens/HouseholdAccessScreen.tsx`
- `app/(modals)/quick-log/details/index.tsx`
- `STRINGS.en.json`
- `STRINGS.ru.json`
- `STRINGS.es.json`
- `docs/design/v1/specs/07-1-accept-invite.md`
- `docs/design/v1/specs/07-2-manage-household.md`

### Tests
- `src/test/supabase-contracts.test.ts`
- `src/test/household-access-repository.test.ts`
- `src/test/auth-context.test.tsx`
- `src/test/invite-route.render.test.tsx`
- `src/test/app-shell.render.test.tsx`
- `src/test/more-settings.render.test.tsx`
- `src/test/quick-log-details-route.render.test.tsx`
- `src/test/auth-api.test.ts`

## Phases

### Phase 0 — Lock Scope And Evidence

- [x] Reproduce/inspect the installed SE Release app without claiming stale-bundle fidelity.
- [x] Trace the database, contract, route, household, and Quick Log roots.
- [x] Present alternatives and receive owner approval for the recommended contour.
- [x] Record Stage 0 and source-of-truth constraints.
- [x] Establish the pre-change baseline: 7 focused Jest suites / 141 tests pass; Supabase static
  guardrails pass 38/38; `git diff --check` passes.
- [x] Confirm the local Supabase CLI/stack is unavailable and remote wrappers are explicit-only.
- [x] Receive exact reduced-assurance lightweight TDD approval for this follow-up.

### Phase 1 — RPC Contract And pgTAP RED

- [x] Add failing contract tests for `{ household_id, role, outcome }`.
- [x] Add failing pgTAP cases for existing-member no-consume, actual-role return, new-member consume,
  same-user idempotency, used-by-other rejection, and revoked-membership behavior.
- [x] Run focused RED commands and record expected failures.

### Phase 2 — Local Follow-Up Migration And Client GREEN

- [x] Create the migration with `supabase migration new`; do not invent the filename.
- [x] Drop and recreate `public.accept_household_invite(text)` in one transaction because its
  `RETURNS TABLE` shape changes; reapply exact revoke/grant privileges.
- [x] Keep `SECURITY DEFINER`, `SET search_path = ''`, explicit auth check, schema-qualified
  relations/functions, neutral errors, and row locking.
- [x] Update contracts, generated DB types, repository parsing, query propagation, and auth
  orchestration types. Live route outcome rendering is owned by Phase 4.
- [x] Run focused GREEN tests and the no-Docker Supabase static guardrails. Record executable
  pgTAP/hosted lint/typegen as remote verification requiring separate exact approval.

### Phase 3 — Honest UI RED

- [x] Add failing Quick Log state tests separating viewer authorization from write-port/empty state.
- [x] Add failing Household Access tests proving unknown/empty/error context hides roster and CTA.
- [x] Add failing invite render/route tests for live already-member and explicit valid-invite
  create-own alternative.
- [x] Run focused RED commands and record expected failures.

### Phase 4 — Honest UI/i18n GREEN And Refactor

- [x] Implement exhaustive state projection with no role defaults.
- [x] Wire `already_member` and create-own action through the thin routes.
- [x] Update typed EN/RU/ES copy and spec cards.
- [x] Run structural render, i18n parity, and focused behavior tests.
- [x] Refactor only while green; rerun focused tests.

### Phase 5 — Full Local Verification

- [x] Run `git diff --check`.
- [x] Run privacy/secret scan for the scoped diff.
- [x] Run migration static guards/advisors available locally.
- [x] Run `npm run check`.
- [x] Adversarially reread the full diff against AC-F1..AC-F12.

### Phase 6 — Fresh SE Simulator Verification

- [x] Extend the privacy-safe device matrix with existing-owner/no-consume, honest Quick Log,
  first-entry, valid create-own, and terminal-anatomy follow-up cases.
- [x] Satisfy the documented >=10 GiB free-space precondition through owner action/approval.
- [x] Confirm XcodeBuildMCP defaults point to the approved SE profile before build/run.
- [x] Rebuild the embedded Release bundle; do not rely on Metro or the stale installed bundle.
- [x] Owner manually enters private email/OTP directly in the simulator; no private values enter
  chat, terminal output, docs, screenshots, or logs.
- [ ] Verify fresh OTP reaches the main app, Family & Access has one intro card and an honest role,
  owner Quick Log details are editable, create/accept reaches the same synthetic puppy, existing
  member gets `already_member`, and invalid/unavailable/create-own states behave honestly.
- [ ] Capture synthetic default and accessibility-size evidence for affected states and record
  Stage 4 PASS or exact BLOCKED findings.

### Phase 6A — Cold-Start Membership And Caregiver Honesty

- [x] Reproduce the post-accept cold-start empty-household defect on the approved SE Release app.
- [x] Add RED pgTAP/static guards for accepted caregiver reuse, no stray owner membership, and
  populated-household recovery when a legacy empty membership exists.
- [x] Generate a separate local migration with the pinned Supabase CLI and keep the already-applied
  migrations immutable.
- [x] Add RED/GREEN caregiver render coverage and typed EN/RU/ES copy; hide owner-only invite reads,
  section, generated state, and CTA from non-owners.
- [x] Pass focused render/type/i18n checks and no-Docker Supabase guardrails.
- [x] Receive exact approval to apply the new bootstrap migration only to the named dev project.
- [x] Execute the expanded 15-test auth pgTAP source in a rollback verification transaction.
- [x] Repeat invitee cold launch and Family & Access verification on the approved SE.

### Phase 7 — Senior Review And Handoff

- [x] Receive exact owner approval for the non-production serialization migration, rollback-only
  pgTAP, PuppyPlan-only SE bundle update without cache deletion, and one local commit without
  push/PR.
- [x] AC-F15: serialize `bootstrap_current_user` per authenticated user before membership lookup so
  concurrent first-session calls from separate clients cannot create two owner households.
- [x] Add a static migration-order guard and remote catalog pgTAP assertion for AC-F15.
- [x] Run project review and security/RLS review.
- [x] Update this plan changelog/checklist and Linear with privacy-safe evidence.
- [x] Port the already-reviewed PUP-41 typed OTP 429 classification into this branch through a
  fresh RED/GREEN cycle, preserving the PUP-42 deferred auth callback.
- [x] Add RED/GREEN coverage that coalesces overlapping restored-session and `INITIAL_SESSION`
  resolution for the same user without changing server schema.
- [x] Repeat focused auth/i18n tests, the full local gate, deep review, and approved-SE Release
  verification for the final branch state.
- [x] Record privacy-safe local/native evidence in PUP-42 and leave the issue ready for local
  review without publishing a PR.
- [x] Receive exact approval and apply the follow-up migration only to the named non-production
  dev project; keep every git action separately approval-gated.

## Verification Commands

```bash
npm run test:unit -- --runTestsByPath src/test/supabase-contracts.test.ts src/test/household-access-repository.test.ts --runInBand
npm run test:unit -- --runTestsByPath src/test/auth-context.test.tsx src/test/invite-route.render.test.tsx --runInBand
npm run test:unit -- --runTestsByPath src/test/app-shell.render.test.tsx src/test/more-settings.render.test.tsx src/test/quick-log-details-route.render.test.tsx --runInBand
npm run test:unit -- --runTestsByPath src/test/auth-api.test.ts --runInBand
npm run check
git diff --check
```

Executable pgTAP is not locally available through the repository's remote wrapper because
`SUPABASE_DB_URL` is absent. After exact approval, the complete 144-test pgTAP source was executed
against the named non-production dev project through Supabase SQL inside a transaction, with an
explicit `ROLLBACK` and failure-raising `finish()` check.
After separate exact approval for the bootstrap follow-ups, the final 16-test auth pgTAP source
was executed through the same rollback-only pattern and returned an explicit final `ok 16`.

## Approvals And Rollout

- **Approved 2026-07-24:** option 2 product/architecture contour, including a local follow-up
  migration and TypeScript contract change.
- **Approved and completed 2026-07-24:** apply
  `household_invite_already_member_outcome` only to non-production Supabase project
  `olymqppxsadsxfrcyskh`.
- **Not approved:** git push/PR/merge/rebase, production/release actions, or further destructive
  disk cleanup. One local PUP-42 commit is approved after complete verification.
- **Approved 2026-07-24:** lightweight TDD with reduced assurance for this exact PUP-42 follow-up.
- **Approved 2026-07-24:** add `bootstrap_current_user_serialization`, apply it only to
  non-production Supabase `olymqppxsadsxfrcyskh`, run pgTAP, update only the installed PuppyPlan
  Release bundle on `Grith iPhone SE 3 iOS 26.3` without deleting caches, and create one local
  PUP-42 commit after complete verification; no push/PR.
- **Approved and completed 2026-07-24:** delete only the two PuppyPlan DerivedData directories,
  rebuild/install the Release app, and verify it on the approved SE.
- **Approved and completed 2026-07-24:** apply the SQL from
  `20260724192457_bootstrap_current_user_membership_resolution.sql` only to non-production project
  `olymqppxsadsxfrcyskh`. Supabase recorded the migration as
  `20260724193951_bootstrap_current_user_membership_resolution`; the local filename was aligned to
  that history without repeating the DDL.

## Changelog

- **2026-07-24:** Created follow-up after simulator reproduction and source tracing. Locked
  already-member/no-consume semantics, actual-role response, honest Quick Log/household states,
  explicit create-own path, and local-only migration boundary. Recorded disk and TDD isolation
  blockers before implementation.
- **2026-07-24:** Established the current baseline without changing behavior: focused Jest passed
  7 suites / 141 tests; `npm run supabase:guardrails` passed 38/38; `git diff --check` passed.
  Confirmed the repo deliberately uses no-Docker static Supabase guards locally and keeps pgTAP,
  hosted lint/dry-run, and hosted type generation behind explicit remote actions.
- **2026-07-24:** Owner explicitly approved lightweight TDD with reduced assurance for this exact
  follow-up. Phase 1 RED may proceed without isolated RED/GREEN/REFACTOR contexts; remote
  migration, git, release, install, and destructive cleanup permissions remain unchanged.
- **2026-07-24 — Phase 1 RED:** Added AC-F1..AC-F4/ERR-F3 contract, repository, pgTAP-source, and
  no-Docker migration guard tests. Focused Jest failed as expected because the current contract
  rejects `owner`/`outcome` and accepts a missing outcome; the focused Node guard failed only
  because no follow-up outcome migration exists yet. `git diff --check` passed. Executable pgTAP
  remains unavailable locally and was not run remotely.
- **2026-07-24 — Phase 2 GREEN:** Used the already-cached pinned Supabase CLI 2.101.0 to create
  `20260724132557_household_invite_already_member_outcome.sql`. The local migration drops/recreates
  only the acceptance RPC, returns the active membership role plus `accepted | already_member`,
  exits before invite consumption for existing members, and restores authenticated-only grants.
  Contracts, DB types, repository/query parsing, and auth fixtures now carry the shape. Focused
  contract/repository/query/auth verification passed 4 suites / 72 tests; TypeScript passed;
  Supabase no-Docker guardrails passed 39/39; plan index and `git diff --check` passed. Remote SQL,
  pgTAP, hosted lint/typegen, and migration application were not run.
- **2026-07-24 — Phase 3 RED:** Added structural connected-route tests for live
  `already_member`, explicit valid-invite create-own, terminal invite anatomy without a caregiver
  claim, active-care loading/error/empty shells without fabricated owner UI, and Quick Log
  empty/write-port-unavailable states without permission copy. Focused invite, household, and
  Quick Log suites failed on the old behavior for the expected reasons.
- **2026-07-24 — Phase 4 GREEN:** Household Access now renders only a localized state card until
  active care and invite reads are verified; no absent role defaults to owner. Quick Log maps only
  a verified viewer to permission-denied and disables writes for non-ready technical states.
  Invite acceptance now exposes live `already_member`, defers navigation to its Open action, hides
  caregiver anatomy for terminal states, and offers the explicit valid/unavailable create-own
  alternative. Updated EN/RU/ES empty-household copy and both invite/household spec cards. Focused
  UI verification passed 3 suites / 76 tests; TypeScript, i18n parity/budgets, shell i18n, and
  `git diff --check` passed.
- **2026-07-24 — Phase 5 GREEN:** Full `npm run check` passed after updating one stale anatomy
  assertion to the approved valid-and-unavailable create-own behavior. The full gate reported
  zero lint errors (21 pre-existing warnings), clean TypeScript, all Jest/Node/scaffold checks,
  privacy scan, typed EN/RU/ES parity and budgets, text hygiene, token drift, plan index, and
  design doctor with no FAIL. Fresh `npm run supabase:guardrails` passed 39/39 and
  `git diff --check` passed. A sequential five-pass deep review found no new blocking code issue;
  executable pgTAP/hosted migration verification and native Stage 4 remain explicitly unverified.
  Root free space measured 3.6 GiB, below the required 10 GiB, so no build/install was attempted.
- **2026-07-24 — Phase 6 PREP:** Extended the existing privacy-safe owner/device checklist with the
  exact follow-up regressions: normal first entry never forces invite entry, an owner opening their
  own unused link remains Owner and can edit Quick Log details, the link remains available to the
  second account, `already_member` and unavailable anatomy make no caregiver claim, and only a
  verified Viewer receives permission-denied. No private account, token, puppy, note, or OTP value
  was recorded. At that checkpoint, remote migration, cleanup, build, install, and simulator
  execution still required separate exact approval.
- **2026-07-24 — REMOTE DEV VERIFICATION:** After exact owner approval, applied only
  `household_invite_already_member_outcome` to non-production project
  `olymqppxsadsxfrcyskh`. Remote history records versions `20260724111630`
  (`household_invite_rpcs`) and `20260724132557`
  (`household_invite_already_member_outcome`), so local migration filenames were aligned to that
  history without changing the already-applied Phase 0 SQL. Catalog verification confirms
  `TABLE(household_id uuid, role text, outcome text)`, `SECURITY DEFINER`, empty `search_path`,
  denied `anon`/`PUBLIC` execution, and authenticated execution. The complete 144-test pgTAP
  baseline passed inside an explicit rollback transaction. Security Advisor reports the expected
  intentional authenticated RPC warning plus pre-existing share/auth warnings; no new anonymous
  access to the invite RPC was introduced. The local remote wrapper remains unavailable because
  `SUPABASE_DB_URL` is not configured. Post-apply `npm run supabase:guardrails` passed 39/39;
  `npm run check` passed with zero lint errors (21 pre-existing warnings), clean TypeScript,
  109/109 Jest suites and 1,344/1,344 tests, 152/152 Node tests, all scaffold/privacy/i18n/text
  gates, and Design Doctor with zero failures.
- **2026-07-24 — SE READ-ONLY PREFLIGHT:** XcodeBuildMCP profile `pup42-se` is active with Release,
  approved `Grith iPhone SE 3 iOS 26.3`
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`), and bundle id
  `com.dmitry-selenya.puppyplan-app`. The worktree intentionally contains no generated native
  project, so project/scheme defaults remain empty; the established repository recipe updates the
  installed Release app with a freshly exported embedded bundle. The current installed bundle is
  present but predates this follow-up and remains invalid as Stage 4 evidence. Root free space is
  still 3.6 GiB. Two PuppyPlan-only DerivedData caches total about 8.5 GiB and would lift free space
  above the 10 GiB gate without touching ModuleCache or either simulator, but deletion remains
  owner-approval-gated.
- **2026-07-24 — SE RELEASE INSTALL:** After exact owner approval, deleted only the two
  regenerable PuppyPlan DerivedData directories (3.8 GiB and 4.7 GiB). No simulator, simulator
  data, ModuleCache, source, or git state was removed; free space rose from 3.6 GiB to 12 GiB.
  Shut down the separate 16e simulator without deleting it so only the approved SE remained
  active. Exported the current worktree with Expo Release settings, compiled it to Hermes bytecode
  v96, installed the byte-identical output plus exported assets into the existing PuppyPlan
  Release shell, and confirmed the installed bundle SHA-256 matches the generated bytecode. The
  app launched successfully on the approved SE with no matched fatal/bootstrap/configuration
  errors and showed the normal sign-in surface, not an invite/manual-code gate. This proves fresh
  first entry and clean Release startup only; authenticated household/Quick Log/invite scenarios
  remain pending owner-entered private OTP.
- **2026-07-24 — SE AUTH/INVITE VERIFICATION:** A clean owner OTP reached normal owner bootstrap
  without an invite gate. The owner created one transient link; opening it as the owner returned
  `already_member`, preserved Owner, and left the link available. A distinct account accepted the
  same link and initially landed in the same populated household as Caregiver. No private account,
  OTP, token, puppy, or note value was recorded.
- **2026-07-24 — COLD-START RED/GREEN:** Reinstalling the fresh embedded Release app reproduced an
  empty-household screen for the accepted caregiver. Source tracing proved normal session restore
  called the owner-only `bootstrap_current_user`, which created a stray household after the pending
  invite had been cleared. Added a 15-assertion auth pgTAP contract and a static migration guard;
  RED failed because the migration was absent. The pinned CLI created
  `20260724193951_bootstrap_current_user_membership_resolution.sql`; it now reuses any accepted,
  non-revoked membership, prefers a household with an active puppy over legacy empty data, and
  creates an owner household only when no membership exists. Static Supabase guardrails passed
  40/40. The migration is local and unapplied.
- **2026-07-24 — CAREGIVER UI HONESTY:** Native evidence showed the correct Caregiver badge beside
  false owner copy plus an unusable invite section/CTA. A render test failed on that old anatomy,
  then passed after adding typed EN/RU/ES shared-care copy, an owner-managed-access subtitle, and
  removing owner-only invite reads/content/actions from caregiver/viewer contexts. The focused
  screen suite passed 49/49 and TypeScript passed. Native recheck awaits the bootstrap migration
  because the currently authenticated synthetic account now resolves to its legacy empty
  household.
- **2026-07-24 — FOLLOW-UP FULL GATE/REVIEW:** `npm run check` passed with zero lint errors
  (21 pre-existing warnings), clean TypeScript, 110/110 Jest suites and 1,349/1,349 tests,
  153/153 Node tests, and green privacy/i18n/text/token/design gates. `git diff --check` and the
  generated-native/root-package cleanliness checks passed. Senior SQL/RLS review confirmed the
  replacement bootstrap keeps `SECURITY DEFINER`, pinned empty `search_path`, explicit auth,
  active-membership and soft-delete filters, deterministic ordering, and authenticated-only
  EXECUTE; no new finding was identified. At that checkpoint, expanded executable pgTAP and native
  cold-start were blocked only on exact dev-migration approval.
- **2026-07-24 — BOOTSTRAP DEV APPLY/SE RECHECK:** After exact owner approval, applied only the
  membership-aware bootstrap SQL to non-production project `olymqppxsadsxfrcyskh`; Supabase
  recorded version `20260724193951`. Catalog checks confirmed `SECURITY DEFINER`, pinned empty
  `search_path`, explicit accepted/non-revoked membership selection, active-puppy preference, no
  owner-only filter, authenticated execution, and denied `anon`/`PUBLIC` execution. The expanded
  auth pgTAP passed 15/15 inside an explicit rollback transaction. Two full app-process restarts
  on the approved `Grith iPhone SE 3 iOS 26.3` restored the populated shared household. Family &
  Access reported Caregiver, stated that the owner manages access, and rendered no invitation
  section or Invite action. Both runtime logs had zero bootstrap/logout failure markers. No
  private account, OTP, token, puppy, or note value was recorded. Post-apply
  `npm run supabase:guardrails` passed 40/40 and `npm run check` exited 0 with zero lint errors,
  clean TypeScript, all Jest/Node/scaffold checks green, privacy/i18n/text gates green, and Design
  Doctor with zero failures. Security Advisor reported only the intentional authenticated
  bootstrap/invite RPC warnings plus pre-existing share/auth warnings; Performance Advisor
  reported no migration-specific finding.
- **2026-07-24 — FINAL AUTH HARDENING RED/GREEN:** Recorded AC-F13/AC-F14 and retained the
  previously approved lightweight TDD mode. RED failed for the intended current behavior:
  Supabase 429/code-based OTP failures were generic errors and overlapping restored-session/auth
  events called bootstrap twice. GREEN adds privacy-safe `OtpRequestError` classification,
  localized EN/RU/ES rate-limit copy in the existing auth error slot, and one in-flight household
  resolution per user within an AuthProvider instance. It preserves the deferred Supabase auth
  callback, generic unknown-error state, and catch-to-sign-out path. Focused auth/context/sign-in
  verification passed 3 suites / 36 tests after refactor. No schema, remote service, native
  project, git history, or private test value changed.
- **2026-07-24 — FINAL SERIALIZATION/RELEASE VERIFICATION:** After exact owner approval, added
  AC-F15 and watched the no-Docker migration guard fail because no serialization migration
  existed. The pinned CLI created the follow-up migration; GREEN passed after adding a
  transaction-scoped advisory lock derived from the authenticated user before membership lookup.
  Applied only to non-production project `olymqppxsadsxfrcyskh`; remote history records
  `20260724205949_bootstrap_current_user_serialization`. Rollback-only auth pgTAP completed all 16
  assertions, with the final result `ok 16`; catalog verification confirmed lock-before-lookup,
  `SECURITY DEFINER`, pinned empty `search_path`, authenticated execute, and denied anon execute.
  Local Supabase guardrails passed 41/41. The first embedded export reproduced a packaging-only
  missing-public-env startup failure; root-cause tracing found the worktree has no `.env`, and a
  cache-reset export with the existing local public build env embedded both required config fields.
  No values were printed or recorded. The corrected bundle compiled to Hermes bytecode v96 and its
  SHA-256 matched the installed PuppyPlan bundle. Repeated fresh launches on the approved SE
  restored the populated shared household; Family & Access remained honestly Caregiver with no
  owner-only invite UI. Three corrected runtime/OSLog pairs contained no matched fatal,
  bootstrap/auth failure, logout, email, invite-token, token-hash, or publishable-key value.
- **2026-07-24 — FINAL LOCAL GATE/REVIEW:** The first full `npm run check` run had one isolated
  onboarding render timing failure; the exact focused test immediately passed, and a second full
  run passed with zero lint errors (21 pre-existing warnings), clean TypeScript, 110/110 Jest
  suites and 1,354/1,354 tests, 154/154 Node tests, and green scaffold, privacy, typed EN/RU/ES,
  text, token, plan-index, and Design Doctor gates with zero failures. Sequential deep review
  rechecked the SQL/RLS privileges and ordering, auth resolution lifecycle, typed RPC boundary,
  terminal invite states, role-honest Household/Quick Log projections, generated-native/package
  cleanliness, and privacy constraints. No blocking finding remained; the physical two-device
  and accessibility matrix stays explicitly owner-run.
