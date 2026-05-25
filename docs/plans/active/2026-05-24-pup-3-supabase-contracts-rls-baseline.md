# PUP-3 Supabase Contracts And RLS Baseline - Implementation Plan

> For implementation agents: use the repo `AGENTS.md`, relevant Codex/superpowers skills, and this plan task-by-task. Do not skip the failing-test step for behavior changes.
> Living document: update this file as implementation changes contracts, schema, RLS, permissions, data flow, or verification evidence.
> Suggested practice: when a section is implemented, mark its checklist item and add a short note under Changelog.

**Goal:** Create the first PuppyPlan MVP Supabase schema, contracts, RLS, pgTAP, and DB type workflow baseline so later feature work can build against typed data and executable permission rules.

**Status:** Active.

**Plan type:** Active task plan.

**Current phase:** Phase 7 - Remote Dev Supabase Environment. TypeScript contracts, Supabase baseline, Expo client wiring, MCP remote RLS verification, static/local app verification, review hardening, non-production dev migration apply, and a Docker-capable GitHub Actions remote Supabase gate are implemented locally. Local Docker must not be used on the 8 GB M1 MacBook Air. `PuppyPlan Dev` has migrations `20260524202620`, `20260524203009`, and `20260525090000` applied; remaining work is to add the GitHub secrets, run the remote CI gate, and commit generated DB types from the approved dev database.

**Architecture:** Contracts are the first semantic boundary under `src/contracts/`, Supabase Postgres is the durable source of truth, RLS protects base tables, and invite/share privileged mutations are reserved for Edge Functions or server-side helpers. External trainer/share reads use sanitized projections rather than unrestricted base table reads.

**Linear:** `PUP-3` - Set up Supabase contracts and RLS baseline.

**Branch:** Linear `gitBranchName`: `dimaselenya/pup-3-set-up-supabase-contracts-and-rls-baseline`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` §6.10 API contracts, data model, RLS policy shape; §13 examples.
- Design: `DESIGN.md` collaboration/share clarity states and Quick Log pending/duplicate states.
- Architecture: `docs/architecture/02-repo-structure-and-ownership.md`
- Architecture: `docs/architecture/07-backend-topology.md`
- Architecture: `docs/architecture/08-data-model-and-rls.md`
- Architecture: `docs/architecture/09-sharing-and-permissions.md`
- Architecture: `docs/architecture/10-quick-log-queue.md`
- Architecture: `docs/architecture/17-testing-ci-release.md`
- ADR: `docs/architecture/adr/0006-supabase-migrations-and-pgtap.md`
- ADR: `docs/architecture/adr/0007-prd-schema-baseline.md`
- ADR: `docs/architecture/adr/0009-sharing-projections.md`

---

## Context

PUP-3 is the first backend/security foundation issue after the Expo scaffold and local gates. `supabase/` now contains the MVP migration baseline, security hardening migrations, accepted-share RPC projection path, and pgTAP RLS spec; `src/contracts/` contains the shared Supabase contract surface. The PRD and architecture docs already lock the MVP data model, role model, RLS expectations, and sharing projection strategy.

- **Context package:** Linear `PUP-3`; this plan; PRD §6.10 and §13 examples; architecture docs 02, 07, 08, 09, 10, 17; ADR-0006, ADR-0007, ADR-0009; existing `src/contracts/` and `src/test/`; project graph output.
- **Context placement:** Linear tracks operational state and concise evidence; this plan holds detailed implementation contract; future PR holds final review and verification evidence.
- **Current implementation:** TypeScript contracts, Supabase migrations, RLS helpers/policies, security-invoker share views over accepted-share RPC projections, hash-format constraints, and pgTAP specs exist locally; non-production remote dev project `PuppyPlan Dev` has migrations `20260524202620`, `20260524203009`, and `20260525090000` applied.
- **Owner boundary:** shared contracts and backend/Supabase baseline only. No feature UI, no query hooks, no production deploy.
- **Open questions:** none. Scope is the full MVP entity baseline from PRD §6.10, with Supabase Auth `auth.users` as user source of truth and no separate `public.user` table in this pass.

---

## Goals

1. **Create baseline TypeScript contracts under `src/contracts/`.**
   - Roles, event types, share scopes, invite/share payloads, event payloads, health/reminder/notification/entitlement/media/content version shapes.
   - Local-only Quick Log queue item contract remains client-side and is not added to Supabase migrations.

2. **Create the Supabase MVP schema baseline.**
   - Add `supabase/migrations/` with all PRD §6.10 MVP tables except local-only queue.
   - Use `public` for RLS-protected app tables and `app_private` for token/audit/private server-only helpers.
   - Preserve PRD names: do not split or rename `event_log`, `health_record`, `share_link`, or `share_scope`.

3. **Add RLS policies and pgTAP negative tests for critical access paths.**
   - Membership reads and writes.
   - Viewer write denial.
   - Revoked member access loss.
   - Invite/share direct mutation denial.
   - Share projection access and base-table denial.
   - Push token ownership and notification metadata constraints.

4. **Define generated DB types workflow.**
   - Add a tracked generated type target or script/check that documents how to generate it from the non-production remote dev database.
   - Re-export DB types from `src/contracts/` only when the file exists and is checked by TypeScript.

---

## Non-Goals

- No production Supabase migrations, Edge Function deploys, or live project changes.
- Remote Supabase work in this plan is limited to a non-production dev project or branch approved by the user.
- No feature UI, app routes, TanStack Query hooks, auth screens, or Quick Log implementation beyond shared contracts.
- No schema changes beyond PRD §6.10 without ADR-0007 process and explicit approval.
- No new durable local app store besides the future Expo SQLite Quick Log queue.
- No raw invite/share tokens, push tokens, raw emails, private notes, provider names, photos, or production data in docs/tests/fixtures.

---

## Product Decisions Locked In

1. **Schema scope**
   - **Chosen:** Full MVP entity baseline from PRD §6.10, excluding Phase 1 entities and excluding local-only `minimal_quick_log_queue_item` from Supabase.
   - **Reason:** `PUP-3` is a high-priority foundation issue and later Quick Log/sharing work needs the complete trust boundary.

2. **User model**
   - **Chosen:** Supabase Auth identity is the user source of truth. Tables reference `auth.users(id)` through UUID user columns; do not create `public."user"` in PUP-3.
   - **Reason:** PRD and backend topology name Supabase Auth as source of truth; duplicating users now increases RLS surface without acceptance value.

3. **Sharing model**
   - **Chosen:** `trainer_viewer` is an external scoped share model, not a household membership role.
   - **Reason:** ADR-0009 and `09-sharing-and-permissions.md` require sanitized projections for trainer/share access.

4. **Dependency policy**
   - **Chosen:** New dependencies require explicit approval before install. If `zod` or `supabase` CLI package is not already installed, request approval or implement script/documentation without modifying dependencies.
   - **Reason:** `AGENTS.md` requires approval for dependencies.

---

## Invariants And Executable Spec

- **Acceptance mapping:** Linear `PUP-3` -> this plan -> TypeScript contract tests and pgTAP RLS tests -> Linear/PR verification evidence.

- **Invariant 1:** Contract enums match PRD role/event/scope vocabulary.
  - **Test:** `src/test/supabase-contracts.test.ts`

- **Invariant 2:** Event contracts require stable idempotency fields and `payload_version = 1`; server schema enforces `UNIQUE (household_id, client_event_id)`.
  - **Test:** `src/test/supabase-contracts.test.ts`
  - **Test:** `supabase/tests/rls_baseline.sql`

- **Invariant 3:** Local-only Quick Log queue item is represented in TypeScript contracts but no Supabase migration table is created for it.
  - **Test:** `src/test/supabase-contracts.test.ts`
  - **Manual check:** migration review.

- **Invariant 4:** Non-members cannot read household-scoped base rows; revoked members lose access.
  - **Test:** `supabase/tests/rls_baseline.sql`

- **Invariant 5:** `viewer` can read selected household data but cannot insert/update routine or privileged records.
  - **Test:** `supabase/tests/rls_baseline.sql`

- **Invariant 6:** `invite`, `share_link`, and `share_scope` direct client inserts/updates/deletes are denied; privileged transitions are documented/tested as server-boundary operations.
  - **Test:** `supabase/tests/rls_baseline.sql`
  - **Docs:** `supabase/README.md`

- **Invariant 7:** Direct client share access can read only safe share metadata and must not bypass base-table RLS through public views; base-derived trainer/share projections are reserved for future Edge Functions or private RPCs returning sanitized shapes. Trainer/share cannot read unrestricted `event_log`, `health_record`, `media_asset`, `household_membership`, or token hashes.
  - **Test:** `supabase/tests/rls_baseline.sql`

- **Invariant 8:** `health_summary` projection excludes notes, provider names, media paths/photos, medication details, and raw health metadata.
  - **Test:** `supabase/tests/rls_baseline.sql`

- **Invariant 9:** Push token rows are owner-only and notification delivery logs contain metadata only.
  - **Test:** `supabase/tests/rls_baseline.sql`

---

## File Map

### Contracts
- `src/contracts/supabase.ts` - domain enums, row insert/update/read schemas, payload schemas, generated type re-export boundary if available.
- `src/contracts/index.ts` - shared contract barrel if useful for local convention.
- `src/contracts/README.md` - update ownership and generated DB type workflow.

### Backend / Supabase
- `supabase/config.toml` - Supabase CLI project config; not a signal to run the local Docker stack on the 8 GB M1 machine.
- `supabase/README.md` - remote dev migration/test/type generation workflow, local Docker guardrails, privileged boundary notes.
- `supabase/migrations/20260524202620_mvp_schema_baseline.sql` - schema, helpers, RLS, baseline projections.
- `supabase/migrations/20260524203009_security_harden_share_projections.sql` - security-invoker share views and pinned function `search_path` hardening.
- `supabase/migrations/20260525090000_review_fix_privacy_and_share_rpc.sql` - hash-format constraints and accepted-share RPC projection hardening.
- `supabase/tests/rls_baseline.sql` - pgTAP tests for critical RLS and projection cases.
- `supabase/seed/README.md` - seed policy; no private data.

### Generated Types
- `src/contracts/database.types.ts` - generated Supabase DB types from the non-production remote dev database when Supabase CLI auth or a Docker-capable runner is available.
- `scripts/supabase/run-remote-cli.mjs` - remote CLI wrapper that requires local-only `SUPABASE_DB_URL` for database checks, prefers `SUPABASE_PROJECT_REF` for no-Docker typegen, pins the Supabase CLI package, and redacts secrets from CLI output.
- `scripts/supabase/no-local-docker.mjs` - guard for short Supabase scripts so agents do not accidentally start local Docker on the M1/8 GB development machine.
- `package.json` - Supabase scripts only if no new dependency install is required.

### Tests
- `src/test/supabase-contracts.test.ts` - TypeScript contract tests.
- Existing `src/test/business-rules.test.ts` remains the Quick Log timing invariant test.

### Docs
- `docs/plans/active/2026-05-24-pup-3-supabase-contracts-rls-baseline.md` - this plan.
- `docs/plans/README.md` - active plan index.
- Architecture docs/diagrams only if implementation discovers a contract change that must be reflected; otherwise cite existing docs.

---

## Contracts, Schema, And Permissions

### Zod Contracts

- [x] Add baseline request/response/domain schemas in `src/contracts/`.
- [x] Add contract tests for valid, invalid, and boundary payloads.
- [x] Represent local-only `minimal_quick_log_queue_item` without adding a Supabase table.
- [x] Update generated or re-exported DB types if the remote workflow can run; generation is blocked until Supabase CLI auth or CI secrets are available, so the workflow is documented without a guessed generated file.

### Database / RLS

- [x] Migration required: yes.
- [x] Destructive migration risk reviewed: yes, baseline-only, no existing Supabase schema in repo.
- [x] RLS policy impact reviewed.
- [x] pgTAP tests added for P0 access paths.

### Edge Functions

- [x] Edge Function required for actual privileged mutations: yes, but implementation is deferred from PUP-3.
- [x] Direct client mutation of privileged invite/share tables is denied.
- [x] `supabase/README.md` documents required future Edge Functions and server-only transaction boundary.

---

## UX Spec

No UI implementation in PUP-3.

Relevant UX constraints carried forward:

- Sharing screens must be backed by the same projection path as actual shared views.
- Revoked/expired shares must resolve to a neutral unavailable state.
- Quick Log pending/failed state relies on server idempotency by `(household_id, client_event_id)`.

---

## Privacy, Analytics, And Observability

- [x] No analytics event changes in PUP-3.
- [x] Tests/fixtures use synthetic UUIDs and neutral notes only.
- [x] No raw emails, invite/share tokens, push tokens, puppy names, provider names, or photos in docs/tests/logs.
- [x] Token columns are hashes/last4 only; raw token values are not stored.
- [x] Notification delivery logs store metadata fields, not user/private message content.

---

## Implementation Plan

### Phase 0 - Read And Lock Scope

**Files:**
- Read: `AGENTS.md`
- Read: Linear `PUP-3`
- Read: `puppyplan-prd-v2.md` §6.10 and §13 examples
- Read: `DESIGN.md` collaboration/Quick Log references
- Read: architecture docs and ADRs listed above
- Read: `src/contracts/*`, `src/test/*`, `package.json`

**Checklist:**
- [x] Confirm goals and non-goals.
- [x] Confirm ownership area.
- [x] Confirm contracts/schema/RLS change and no UI/i18n route change.
- [x] Confirm no open questions after user selected full MVP and Supabase Auth identity model.

**Acceptance criteria:**
- Scope is explicit enough to implement without guessing.

---

### Phase 1 - Contracts And Type Surface

**Files:**
- Create: `src/test/supabase-contracts.test.ts`
- Create/Modify: `src/contracts/supabase.ts`
- Modify: `src/contracts/README.md`
- Create/Modify: `src/contracts/index.ts` if a barrel matches local style.

**Checklist:**
- [x] RED: write failing tests for role/event/scope enums and core payload validation.
- [x] RED: write failing tests for event idempotency fields and queue local-only shape.
- [x] RED: write failing tests for invite/share privileged mutation payload shapes.
- [x] GREEN: add minimal schema/validation implementation.
- [x] REFACTOR: group contract exports by ownership domain, without adding broad abstractions.
- [x] Run targeted contract tests and record result.

**Acceptance criteria:**
- Contract tests prove MVP vocabulary, payload versioning, idempotency fields, sharing scopes, and local-only queue contract.

---

### Phase 2 - Supabase Scaffold And Schema Baseline

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/README.md`
- Create: `supabase/migrations/20260524202620_mvp_schema_baseline.sql`
- Create: `supabase/seed/README.md`

**Checklist:**
- [x] Add local Supabase directory structure without production linking.
- [x] Create `app_private` schema and revoke it from `anon` and `authenticated`.
- [x] Add enum/check constraints for roles, event types, statuses, notification metadata, and share scopes.
- [x] Add MVP tables from PRD §6.10, excluding local-only queue.
- [x] Add `UNIQUE (household_id, client_event_id)` on `event_log`.
- [x] Add generated timestamp/version helpers where needed.
- [x] Add sanitized share projection view(s) for the baseline.

**Acceptance criteria:**
- Migration reflects PRD §6.10 names and key fields without Phase 1 entity creep.

---

### Phase 3 - RLS Policies And Privileged Boundary

**Files:**
- Modify: `supabase/migrations/20260524202620_mvp_schema_baseline.sql`
- Create: `supabase/migrations/20260524203009_security_harden_share_projections.sql`
- Create: `supabase/migrations/20260525090000_review_fix_privacy_and_share_rpc.sql`
- Modify: `supabase/README.md`

**Checklist:**
- [x] Add `public.current_household_ids()` and role helper functions.
- [x] Enable RLS on every public app table.
- [x] Add membership read/write policies.
- [x] Add event/reminder/health policies by owner/caregiver/viewer rules.
- [x] Deny direct invite/share/scope mutations to normal clients.
- [x] Add owner-only push token and notification preference/log policies.
- [x] Add security-invoker share metadata/read-preview path and deny unrestricted base-table trainer/share access.

**Acceptance criteria:**
- RLS and docs represent membership, sharing, and privileged mutation boundaries.

---

### Phase 4 - pgTAP RLS Tests

**Files:**
- Create: `supabase/tests/rls_baseline.sql`

**Checklist:**
- [x] RED where feasible: add tests that fail against missing schema/policies if run before migration.
- [x] Add synthetic users/households/puppy/event/health/share fixtures in test setup.
- [x] Test non-member cannot read household data.
- [x] Test viewer cannot write.
- [x] Test revoked member loses access.
- [x] Test anonymous/authenticated direct invite/share creation is denied.
- [x] Test expired/revoked share reads nothing.
- [x] Test safe share metadata/projection fields, forbidden sensitive fields, and security-invoker view hardening.
- [x] Test trainer/share cannot read unrestricted base rows.
- [x] Test push token ownership.
- [x] Test notification delivery metadata-only constraints.

**Acceptance criteria:**
- pgTAP file covers the P0 cases from `08-data-model-and-rls.md` and PRD §6.10.

---

### Phase 5 - Generated DB Types Workflow

**Files:**
- Create: `src/contracts/database.types.ts` if local generation can run.
- Modify: `src/contracts/README.md`
- Modify: `supabase/README.md`
- Modify: `package.json` only if scripts do not require a new dependency approval.
- Create: `scripts/checks/check-database-types.mjs` only if useful without adding dependency.

**Checklist:**
- [x] Define exact remote dev command for DB type generation.
- [ ] Generate `src/contracts/database.types.ts` from the approved dev database after Supabase CLI auth or CI secrets are available.
- [x] If generation cannot run because Supabase CLI auth or CI secrets are missing, document the workflow and record the blocker.
- [x] Guard short local scripts so `npm run db:types` cannot accidentally start Docker.
- [ ] Add a typecheck-visible re-export only when the generated file exists.

**Acceptance criteria:**
- Generated DB types workflow is defined or implemented, satisfying Linear acceptance without production linking.

---

### Phase 6 - Verification, Plan, And Linear Evidence

**Files:**
- Modify: this plan
- Modify: `docs/plans/README.md`
- Linear: `PUP-3`

**Checklist:**
- [x] Run targeted contract tests.
- [x] Run `npm run lint`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run test` or `npm run check` if feasible.
- [x] Do not run local Docker/Supabase on the 8 GB M1 machine; record hosted Supabase dev plus CI/cloud runner as the required pgTAP/typegen path.
- [x] Verify short local Supabase scripts are guarded and cannot start Docker.
- [x] Update plan checkboxes/changelog with evidence.
- [x] Update Linear with phase status, blockers, and verification evidence.

**Acceptance criteria:**
- Local evidence is recorded; any unavailable Supabase runtime gate is explicit and not misrepresented as passing.

---

## Verification Commands

Use the smallest command that proves the current claim, then the broader gate before handoff.

```bash
npm run test:unit -- src/test/supabase-contracts.test.ts
npm run lint
npm run typecheck
npm run test
npm run check
npm run supabase:lint:remote
npm run db:push:remote:dry-run
```

Notes:

- The short local scripts `npm run supabase:test`, `npm run supabase:lint`, and `npm run db:types` route through the remote wrapper and must not start local Supabase or Docker on this machine.
- `npm run supabase:test` is guarded on this machine because Supabase CLI 2.101.0 requires Docker for remote pgTAP even with `--db-url`. Run it only on a Docker-capable CI/cloud runner with `SUPABASE_CLI_DOCKER_ALLOWED=1`.
- `npm run db:types` prefers `SUPABASE_PROJECT_REF` and Supabase CLI auth for no-Docker type generation. The `SUPABASE_DB_URL` fallback remains Docker-only and is disabled on this machine.
- Remote scripts use `SUPABASE_DB_URL`, `SUPABASE_PROJECT_REF`, and optional `SUPABASE_ACCESS_TOKEN` from the shell or local ignored `.env` when available. DB URLs and access tokens are secrets and must not be exposed through `EXPO_PUBLIC_*`.
- Do not run production Supabase migrations or function deploys in PUP-3. Remote database-check commands are allowed only against the approved non-production dev environment and require an explicit local `SUPABASE_DB_URL`; typegen may instead use `SUPABASE_PROJECT_REF` plus Supabase CLI auth.
- If dependency approval is needed for a local `supabase` devDependency or `zod`, stop and request it before installation.

---

### Phase 7 - Remote Dev Supabase Environment

**Files:**
- Modify: `supabase/README.md`
- Modify: `src/contracts/README.md`
- Modify: `package.json`
- Create: `.env.example`
- Create: `src/contracts/database.types.ts` after remote type generation succeeds
- Linear: `PUP-3`

**Checklist:**
- [x] Review official Supabase branch and CLI docs for remote development, linked project migration push, pgTAP, lint, and type generation.
- [x] Add remote verification scripts for linked non-production Supabase dev environments.
- [x] Add explicit remote scripts for pgTAP, lint, migration dry-run, and type generation without linked local project state.
- [x] Update type generation to prefer `SUPABASE_PROJECT_REF` plus Supabase CLI auth so generated DB types do not require local Docker.
- [x] Add safe Expo public env template without committing branch credentials.
- [x] Attempt Supabase MCP project discovery; initially blocked by connector timeout, then resolved after Codex app reload.
- [x] Check Supabase CLI auth state; blocked because no access token/login is configured.
- [x] Create or select a non-production Supabase dev project or persistent branch.
- [ ] Link this repo to the dev project/branch without committing local Supabase state, if future CLI workflow needs linked state. The remote wrapper does not require linked project state.
- [x] Dry-run remote migration push against dev; `20260525090000_review_fix_privacy_and_share_rpc.sql` was the only pending migration before apply and remote database is up to date after apply.
- [x] Apply initial PUP-3 migrations `20260524202620` and `20260524203009` only to the approved dev project/branch.
- [x] Apply local review-fix migration `20260525090000` only after explicit `SUPABASE_DB_URL` dry-run evidence is available.
- [x] Run remote pgTAP-equivalent RLS spec through MCP transaction and Supabase Security Advisor.
- [x] Fresh Supabase Security Advisor check returns 0 security lints after script/doc remote workflow updates.
- [x] Run CLI remote lint after explicit `SUPABASE_DB_URL` is available.
- [x] Add a GitHub Actions remote Supabase gate for migration dry-run, remote lint, Docker-capable pgTAP, and generated DB type drift.
- [x] Add GitHub secret `PUPPYPLAN_DEV_SUPABASE_DB_URL` for the remote Supabase gate.
- [x] Upload generated DB types as a GitHub Actions artifact when the remote gate finds `src/contracts/database.types.ts` missing or stale.
- [ ] Run the remote Supabase gate on GitHub Actions, download the generated type artifact, and commit generated DB types from that gate.
- [ ] Generate and commit `src/contracts/database.types.ts` from the approved dev database after the remote gate has the required credentials.
- [x] Populate local `.env` with dev branch URL and publishable key only; do not commit `.env`.

**Acceptance criteria:**
- Expo development can point at a remote non-production Supabase URL/key.
- Generated DB types are produced from the same dev database that received the migration, or the missing CI secret/auth blocker is recorded without hand-written types.
- PUP-3 RLS tests/lint run against the remote dev database or an explicit auth/tooling blocker is recorded.

## Hardware Review For M1 Air 8 GB

**Current machine evidence:**
- CPU/RAM: Apple M1, 8 GB unified memory.
- Disk after cache cleanup: about 21 GiB available on `/System/Volumes/Data`.
- Project footprint: `node_modules` about 605 MB; `.expo` currently minimal.
- Existing simulator footprint: `~/Library/Developer/CoreSimulator` about 15 GB.

**Risk assessment:**
- **High risk:** Docker Desktop + Supabase local stack alongside Codex, Metro, and iOS Simulator. This is the main blocker already observed.
- **Medium risk:** iOS Simulator + Metro + Jest/RNTL + Codex at the same time. Feasible, but keep one simulator open and avoid Docker during app work.
- **Medium risk:** Android Emulator on 8 GB RAM. Prefer physical Android device for dev smoke or run Android less frequently.
- **Medium risk:** local EAS/prebuild/native builds. Prefer EAS cloud builds for heavier smoke checks; generated `ios/` and `android/` remain read-only for agents.
- **Medium risk:** Maestro E2E with simulator plus Metro. Run only after dev build exists, one platform at a time.
- **Low risk:** `npm run check`, contract tests, TypeScript, lint, and docs work. These already pass locally within the current setup.

**Decision:**
- Use remote non-production Supabase as the primary development database.
- Do not run local Supabase/Docker on this M1/8 GB development machine. Reserve Docker-based Supabase checks for future CI/cloud runners or a different explicitly approved workstation.
- Prefer physical device or one simulator at a time for Expo app testing.
- Do not add heavy local services unless they directly unlock a current issue.

## Risks And Mitigations

- **Risk:** Full MVP schema baseline is large.
  - **Mitigation:** Keep fields minimal to PRD §6.10, avoid Phase 1 entities, and rely on tests for critical P0 access paths rather than exhaustive business workflows.

- **Risk:** RLS tests can accidentally assert projection success without proving sensitive fields are excluded.
  - **Mitigation:** Tests must assert forbidden columns/fields and base-table denial.

- **Risk:** Generated DB types drift from the hosted dev database.
  - **Mitigation:** Prefer `SUPABASE_PROJECT_REF` plus Supabase CLI auth for no-Docker typegen; the CI remote Supabase gate regenerates types and fails if `src/contracts/database.types.ts` is missing, untracked, or stale.

- **Risk:** Zod is required by target architecture but not installed.
  - **Mitigation:** Request explicit dependency approval before adding it, or implement only dependency-free contracts if approval is not granted.

- **Risk:** Token/security examples can leak unsafe patterns.
  - **Mitigation:** Store only hash/last4 columns; use synthetic fixtures; never include raw token strings in tests/docs.

---

## Rollout And Handoff

- Local-only implementation branch.
- No production deploy, production migration, release action, commit, push, or PR publication without exact user approval.
- Move Linear to `In Review` only after implementation artifacts and verification evidence are ready.
- If remaining Quick Log implementation work is discovered, hand it to `PUP-5` rather than expanding PUP-3.

---

## Changelog

- 2026-05-24: Created implementation plan from approved PUP-3 scope. Locked full MVP schema baseline, Supabase Auth identity model, projection-based sharing, and no production deploys.
- 2026-05-24: Added RED contract tests in `src/test/supabase-contracts.test.ts`; targeted Jest fails as expected because `src/contracts/supabase.ts` is not implemented yet.
- 2026-05-24: Added local Supabase scaffold, MVP schema baseline migration, RLS policies, sanitized share projections, pgTAP RLS spec, seed policy, and Supabase workflow scripts.
- 2026-05-24: Verification so far: `git diff --check` passed; `node scripts/checks/privacy-scan.mjs` passed; `node scripts/checks/text-hygiene.mjs` passed. Earlier local Supabase verification could not run because local Postgres/Docker was unavailable.
- 2026-05-24: After explicit dependency approval, added exact direct `zod@3.25.76` with `--ignore-scripts`. Supply-chain checks: npm metadata showed MIT license, repository `colinhacks/zod`, zero runtime dependencies, no install/postinstall scripts; Snyk reported no known security issues for `zod`; `npm audit --audit-level=moderate` found 0 vulnerabilities; `npm audit signatures` verified registry signatures for 1064 packages and attestations for 94 packages.
- 2026-05-24: Implemented `src/contracts/supabase.ts` with MVP vocabularies, request/domain schemas, strict invite/share request boundaries, local-only Quick Log queue schema, and table-name exports that exclude `minimal_quick_log_queue_item`.
- 2026-05-24: Verification: `npm run test:unit -- src/test/supabase-contracts.test.ts` passed 8 tests; `npm run lint` passed; `npm run typecheck` passed; `npm run check` passed with 8 Jest suites / 61 Jest tests plus 63 Node tests and scaffold checks. Local Supabase pgTAP/lint was blocked by the unavailable local Docker/Postgres runtime.
- 2026-05-24: Updated Linear `PUP-3` with completed implementation evidence, verification results, Docker/local Supabase blocker, and confirmation that no production, release, git remote, or PR actions were performed.
- 2026-05-24: Reviewed official Supabase branching/CLI/Expo guidance and changed PUP-3 handoff to remote non-production Supabase dev as the primary path for the user's M1 Air 8 GB. Added linked remote scripts, safe `.env.example`, and remote workflow docs. Supabase MCP project discovery timed out twice, and CLI project listing failed because no `SUPABASE_ACCESS_TOKEN`/`supabase login` is configured; no remote mutations were performed.
- 2026-05-24: Verification after remote-dev plan updates: `git diff --check` passed; `node scripts/checks/privacy-scan.mjs` passed; `node scripts/checks/text-hygiene.mjs` passed; `npm run check` passed with lint, typecheck, 8 Jest suites / 61 tests, 63 Node tests, scaffold checks, token check, privacy scan, and text hygiene.
- 2026-05-24: Supabase MCP recovered after Codex app reload. Created non-production Supabase dev project `PuppyPlan Dev` (`olymqppxsadsxfrcyskh`) in `eu-central-1` after cost flow returned `0` monthly. Applied remote migrations `20260524202620 mvp_schema_baseline` and `20260524203009 security_harden_share_projections`; aligned local migration filenames to remote history.
- 2026-05-24: Supabase Security Advisor initially found `security_definer_view` errors on public share projection views and mutable `search_path` warnings on helper functions. Added hardening migration to set public share views to `security_invoker=true` and pin helper function `search_path=''`; fresh Security Advisor check returned 0 security lints. Updated pgTAP spec and docs to keep base-derived trainer projections behind future Edge Function/private RPC boundary.
- 2026-05-24: Remote pgTAP-equivalent RLS spec run through MCP transaction passed after fixing the `throws_ok` signature. Supabase CLI remote link/typegen remains blocked: CLI 2.101.0 rejects the MCP-created 21-character project ref `olymqppxsadsxfrcyskh` before auth/link, so `src/contracts/database.types.ts` is still intentionally not generated.
- 2026-05-24: Added Expo/Supabase client wiring with `@supabase/supabase-js`, `react-native-url-polyfill`, and SDK-compatible `expo-sqlite` installed via `expo install -- --ignore-scripts`. Added `expo-sqlite` config plugin, lazy Supabase client boundary under `src/lib/supabase`, env validation tests, and local ignored `.env` using the dev project URL plus publishable key. Supply-chain checks: npm metadata shows MIT licenses and expected upstream repositories; `npm audit --audit-level=moderate` found 0 vulnerabilities; `npm audit signatures` verified registry signatures for 1079 packages and attestations for 103 packages; `npx expo install --check --json` reports dependencies up to date.
- 2026-05-24: Hardened DB type generation scripts to write through a temp file so failed CLI typegen cannot leave an empty `src/contracts/database.types.ts`. Confirmed `npm run db:types:remote` still fails with `Cannot find project ref. Have you run supabase link?` and does not leave the generated file behind.
- 2026-05-24: Final verification for this batch: `git diff --check` passed; `npm run check` passed with lint, typecheck, 9 Jest suites / 65 tests, 63 Node tests, navigation/i18n/scaffold checks, design token check, privacy scan, and text hygiene.
- 2026-05-24: Added `scripts/supabase/run-remote-cli.mjs` and switched remote Supabase scripts to use local-only `SUPABASE_DB_URL` for typegen, pgTAP, lint, and migration dry-run. Verified current local environment has no `SUPABASE_DB_URL`, so `src/contracts/database.types.ts` remains intentionally absent rather than guessed or hand-written.
- 2026-05-24: Verification after `SUPABASE_DB_URL` remote workflow update: `node --check scripts/supabase/run-remote-cli.mjs` passed; `git diff --check` passed; `npm run check` passed with lint, typecheck, 9 Jest suites / 65 tests, 63 Node tests, navigation/i18n/scaffold checks, design token check, privacy scan, and text hygiene. Fresh Supabase MCP Security Advisor check for dev project `olymqppxsadsxfrcyskh` returned 0 security lints.
- 2026-05-25: Reviewed external deep-review findings item by item. Fixed confirmed local issues: narrowed authenticated grants to table-specific SELECT/INSERT/UPDATE, removed direct household bootstrap and trusted-sitter completion client writes, disabled anonymous sign-ins until the auth/onboarding issue adds anonymous JWT handling, added immutable `event_log` identity enforcement, added composite `media_asset(puppy_id, household_id)` integrity, made share metadata visible to owners for permission preview, documented trainer projection guardrails/session-storage follow-up, hardened remote CLI DB URL redaction, and expanded contract/pgTAP coverage.
- 2026-05-25: Verification after deep-review hardening: `node --check scripts/supabase/run-remote-cli.mjs` passed; `npm run test:unit -- src/test/supabase-contracts.test.ts src/test/supabase-env.test.ts` passed with 15 tests; `npm run check` passed with lint, typecheck, 9 Jest suites / 68 tests, 63 Node tests, navigation/i18n/scaffold checks, design token check, privacy scan, and text hygiene. Local Supabase pgTAP/lint remained blocked by unavailable local Docker/Postgres runtime. `npm run db:types:remote` still fails with `Cannot find project ref. Have you run supabase link?` and `src/contracts/database.types.ts` remains absent.
- 2026-05-25: Fixed local deep-review follow-ups: share event projections are puppy-scoped and bounded; invite requests/rows exclude owner grants; event and Quick Log payload contracts are versioned and strict; selected timeline share requests require date windows; Supabase client session persistence is disabled until SecureStore auth storage exists; accepted trainers no longer read base `share_link` rows and use `current_share_link_metadata()` for safe metadata; notification preference identity fields are immutable; remote CLI scripts require explicit `SUPABASE_DB_URL`, pin Supabase CLI 2.101.0, and have redaction/target guard tests; pgTAP/static coverage now includes denied invite/share/scope mutations, SQL/TS contract parity, sibling-puppy share leakage, client options, and CLI redaction.
- 2026-05-25: Added tracked iOS privacy manifest source at `assets/apple/PrivacyInfo.xcprivacy` and Expo config plugin to copy it during prebuild without editing generated `ios/`; added Node guardrail coverage for the manifest/plugin wiring and updated architecture release docs to keep built-artifact verification as the remaining release gate.
- 2026-05-25: Verification after local deep-review follow-up fixes: `node --check scripts/supabase/run-remote-cli.mjs` passed; `node --test scripts/checks/supabase-baseline.test.mjs` passed with 8 tests; `npm run test:unit -- src/test/supabase-contracts.test.ts src/test/supabase-client.test.ts` passed with 17 tests; `git diff --check` passed; final `npm run check` passed with lint, typecheck, 10 Jest suites / 74 tests, 73 Node tests, navigation/i18n/scaffold checks, design token check, privacy scan, and text hygiene. Local Supabase pgTAP/lint remained blocked by unavailable local Docker/Postgres runtime. `node scripts/supabase/run-remote-cli.mjs lint` exits with the expected `SUPABASE_DB_URL is required for remote Supabase CLI checks.`
- 2026-05-25: Fixed local review findings: the iOS privacy manifest plugin now copies into the app target and adds the Xcode resource reference; `20260525090000_review_fix_privacy_and_share_rpc.sql` adds hash-prefix CHECK constraints plus accepted-share `current_share_*` RPC projections; pgTAP now includes positive accepted-trainer projection reads while retaining base-table denial tests. Targeted verification: `node --test scripts/checks/privacy-manifest.test.mjs`, `node --test scripts/checks/supabase-baseline.test.mjs`, and `node --check plugins/with-ios-privacy-manifest.js` passed.
- 2026-05-25: Corrected the PUP-3 no-local-Docker workflow after an attempted local Supabase stack startup was stopped. Short scripts `npm run supabase:test`, `npm run supabase:lint`, and `npm run db:types` now fail fast through `scripts/supabase/no-local-docker.mjs`; documentation now states that this M1/8 GB machine uses only explicit `SUPABASE_DB_URL` remote dev checks for pgTAP, lint, migration dry-run, and typegen.
- 2026-05-25: Verification after no-local-Docker correction: `node --check scripts/supabase/no-local-docker.mjs` passed; `node --test scripts/checks/supabase-baseline.test.mjs` passed with 12 tests; `npm run supabase:test`, `npm run supabase:lint`, and `npm run db:types` each exited through the guard without starting Docker; `git diff --check` passed; `npm run check` passed with lint, typecheck, 10 Jest suites / 74 tests, 77 Node tests, navigation/i18n/scaffold checks, design token check, privacy scan, and text hygiene.
- 2026-05-25: Attempted the next remote-only Supabase step. `.env` and the shell environment do not currently define `SUPABASE_DB_URL`; `npm run db:push:remote:dry-run`, `npm run supabase:test:remote`, `npm run supabase:lint:remote`, and `npm run db:types:remote` all stopped at the wrapper with `SUPABASE_DB_URL is required for remote Supabase CLI checks.` No remote database connection, migration, or typegen occurred.
- 2026-05-25: After adding local ignored `SUPABASE_DB_URL`, `npm run db:push:remote:dry-run` reached the Supabase pooler but failed authentication with `password authentication failed for user "postgres"`. Hardened `scripts/supabase/run-remote-cli.mjs` to normalize raw special characters in DB URL credentials before invoking the Supabase CLI and added guardrail coverage. MCP read-only `select current_database(), current_setting('server_version')` against `PuppyPlan Dev` succeeded, confirming the project is reachable; the remaining blocker is the local DB URL password value.
- 2026-05-25: After fixing the local ignored DB URL password formatting, `npm run db:push:remote:dry-run` succeeded against the non-production dev database and reported exactly one pending migration: `20260525090000_review_fix_privacy_and_share_rpc.sql`. No remote migration was applied.
- 2026-05-25: Applied `20260525090000_review_fix_privacy_and_share_rpc.sql` to non-production `PuppyPlan Dev` after explicit user approval. First apply attempt exposed remote baseline drift: the dev DB migration history had `20260524202620`, but the schema lacked `public.current_share_link_metadata()`. Root cause: local baseline was amended after the earlier remote apply. Updated the review-fix migration to recreate that helper before dependent projection RPCs, then applied successfully through `node scripts/supabase/run-remote-cli.mjs push`. Remote migration history now includes `20260525090000 review_fix_privacy_and_share_rpc`.
- 2026-05-25: Remote verification after apply: `npm run db:push:remote:dry-run` reports the remote database is up to date; `npm run supabase:lint:remote` reports no schema errors; MCP schema checks confirm four hash-format constraints, six `current_share_*` functions with pinned empty `search_path`, and five share projection views with `security_barrier=true` and `security_invoker=true`. `npm run supabase:test:remote` and `npm run db:types:remote` are now guarded because Supabase CLI 2.101.0 tries to inspect Docker images for those modes even with `--db-url`; `src/contracts/database.types.ts` remains intentionally absent.
- 2026-05-25: Final local verification after remote apply/docs updates: `node --check scripts/supabase/run-remote-cli.mjs` passed; `node --test scripts/checks/supabase-baseline.test.mjs` passed with 13 tests; `git diff --check` passed; `node scripts/checks/text-hygiene.mjs` passed; `npm run check` passed with lint, typecheck, 10 Jest suites / 74 tests, 78 Node tests, navigation/i18n/scaffold checks, design token check, privacy scan, and text hygiene.
- 2026-05-25: Reworked PUP-3 Supabase workflow for the no-local-Docker constraint. Short scripts now route through the remote wrapper; lint and migration dry-run use hosted `PuppyPlan Dev`, pgTAP is assigned to a Docker-capable GitHub Actions runner, and DB type generation prefers `SUPABASE_PROJECT_REF` plus Supabase CLI auth instead of the Docker-only `--db-url` path. Added `.github/workflows/supabase-remote-dev.yml`, `scripts/checks/check-database-types-generated.mjs`, CI/env docs, and guardrail tests.
- 2026-05-25: Verification after remote workflow update: `node --check scripts/supabase/run-remote-cli.mjs` passed; `node --check scripts/checks/check-database-types-generated.mjs` passed; `node --test scripts/checks/supabase-baseline.test.mjs scripts/checks/workflow-hardening.test.mjs` passed with 18 tests; `npm run db:push:remote:dry-run` reports the remote database is up to date; `npm run supabase:lint` reports no schema errors. Local `npm run supabase:test` stops before Docker as expected; `SUPABASE_PROJECT_REF=olymqppxsadsxfrcyskh npm run db:types` reaches hosted-project typegen and stops at missing Supabase CLI access token, confirming the remaining blocker is auth/CI secrets rather than local Docker.
- 2026-05-25: Final local gate after CI workflow update: `git diff --check` passed; `node scripts/checks/text-hygiene.mjs` passed; `npm run check` passed with lint, typecheck, 10 Jest suites / 74 tests, 82 Node tests, navigation/i18n/scaffold checks, design token check, privacy scan, and text hygiene. Process check found no local Supabase or Docker Desktop process, only the existing system `com.docker.vmnetd` helper.
- 2026-05-25: After explicit user approval for GitHub remote mutations, added repository secret `PUPPYPLAN_DEV_SUPABASE_DB_URL` from local ignored `.env` through `gh secret set` stdin without printing the value. Adjusted the GitHub Actions remote Supabase gate to use this DB URL on the Docker-capable runner for both pgTAP and typegen, so `SUPABASE_ACCESS_TOKEN` is not required for CI. The workflow uploads generated `src/contracts/database.types.ts` as a `database-types` artifact when the file is missing or stale.
