# Full PRD Native App Master Roadmap

> For implementation agents: do not execute this roadmap as one task. Use repo `AGENTS.md`, the relevant PuppyPlan skills, and a scoped Linear issue plus a feature plan for each implementation slice.
> Living document: update this roadmap when PRD scope, design atlas coverage, architecture gates, Linear split, or verification evidence changes.

**Goal:** Build a working Expo native PuppyPlan app across the full closed-beta PRD, accepted architecture, and the complete current design atlas before moving into release submission work.

**Status:** Active.

**Plan type:** Master roadmap. This is a reviewable execution map, not a single implementation contract.

**Current execution:** `PUP-17` roadmap/docs hygiene is merged via PR #17. `PUP-18` auth, identity, session persistence, and new-user bootstrap is complete: PR #18 merged on 2026-05-31, manual email OTP smoke passed on 2026-06-08, and final evidence is mirrored in Linear. The next batch is executing from `docs/plans/active/2026-06-08-post-pup-18-next-batch.md`: `PUP-19` route/coverage/storage decision and `PUP-20` synthetic dev-gallery work are complete locally, and `PUP-21` production onboarding, puppy profile, tracker setup, selected tracker persistence, and active care context are implemented locally after explicit `public.puppy.quick_tracker_ids` approval. `PUP-21` development schema gates passed on `PuppyPlan Dev`: both selected-tracker migrations were applied, repeat dry-run is no-op, runtime pgTAP/direct constraint checks passed, and remote typegen completed. Production Supabase setup and production migration verification are deferred until release readiness after exact production Supabase approval; production was not touched.

**Architecture:** Future work stays Supabase-first, identity-first, contracts-first, and trust-first: Supabase Auth session identity must exist before durable user flows, Zod contracts and business rules define payloads, Supabase/RLS/Edge Functions enforce access, TanStack Query owns server state, Expo SQLite remains the only durable local-write exception for Quick Log, feature UI uses `src/design` primitives, and all visible strings go through typed EN/RU/ES i18n.

**Linear:** `PUP-17` - Create Full PRD native app master roadmap.

**Branch:** Linear `gitBranchName`: `dimaselenya/pup-17-create-full-prd-native-app-master-roadmap`

**Primary source docs:**
- PRD: `puppyplan-prd-v2.md` - sections 3, 4, 5, 6, 7, 9, 11, and 12.
- Design: `DESIGN.md` - route map, screen states, Parts 2-4, and QA checklist.
- Design atlas: `docs/design/v1/README.md`, `docs/design/v1/manifest.json`, `docs/design/v1/screenshots/index.md`, `docs/design/v1/raw/screens/*.jsx`.
- Architecture: `docs/architecture/00-overview.md`, `02-repo-structure-and-ownership.md`, `03-client-data-layer.md`, `04-state-management.md`, `05-navigation-and-deeplinks.md`, `06-design-system-and-ui-contracts.md`, `07-backend-topology.md`, `08-data-model-and-rls.md`, `09-sharing-and-permissions.md`, `10-quick-log-queue.md`, `11-notifications.md`, `12-i18n-and-content.md`, `13-observability-error-handling-performance.md`, `14-feature-flags-and-entitlements.md`, `15-ios-runtime-and-compliance.md`, `16-android-platform-and-play-gates.md`, `17-testing-ci-release.md`, `18-ai-agent-guide.md`, `19-future-roadmap.md`, and `screen-states-matrix.md`.
- ADRs: `docs/architecture/adr/0001-multi-file-architecture-docs.md`, `0002-single-expo-app-structure.md`, `0003-state-ownership-matrix.md`, `0004-quick-log-queue-sqlite.md`, `0005-universal-links-and-app-links.md`, `0006-supabase-migrations-and-pgtap.md`, `0007-prd-schema-baseline.md`, `0008-privacy-safe-analytics.md`, `0009-sharing-projections.md`, `0010-react-i18next-typed-keys.md`, `0011-design-system-runtime.md`, `0012-notification-architecture.md`, `0013-feature-flags-and-entitlements.md`, `0014-ota-disabled-for-mvp.md`, `0015-ios-compliance-gates.md`, and `0016-android-compliance-and-exact-alarms.md`.
- Active plans: `docs/plans/active/2026-05-21-phase-0-architecture-cleanup.md`, `docs/plans/active/2026-05-21-design-handoff-agent-gallery.md`.

---

## Context

The project has a strong foundation but not a full app yet. `PUP-1` through `PUP-18` are complete in Linear/repo evidence. The repo has the Expo Router shell, primary `Today | Health | More` tabs, a Quick Log FAB/action path, Supabase schema/RLS baseline, generated DB types, local and remote verification gates, design tokens, design primitives, typed i18n, Quick Log contracts, the local Quick Log queue, mutation/cache lifecycle, Quick Log sheet UI, Today/Timeline pending/failed visibility, Quick Log privacy-safe analytics/observability, and the auth/session foundation.

The largest remaining architectural gap has moved from auth/session to onboarding and care context. PR #18 added the `src/lib/auth` session module, SecureStore-backed Supabase session persistence, React Native `AppState` token-refresh behavior, email OTP sign-in, route gating, sign-out, and the `bootstrap_current_user` RPC for first household + owner membership. Manual OTP smoke passed on 2026-06-08, so later flows must consume this real session actor instead of fake IDs or ephemeral sessions.

Existing backend baseline must be extended and verified, not rebuilt. `supabase/migrations/20260524202620_mvp_schema_baseline.sql` plus follow-up hardening migrations already define the PRD baseline tables for household, membership, puppy, event log, health records, reminders, reminder occurrences, invites, share links, share scopes, push tokens, notification preferences/delivery logs, trusted-sitter completion events, subscription entitlements, media assets, and `app_private` token-secret tables. Existing share projection RPCs/views include `current_share_*`, `share_link_view`, `share_routine_summary`, `share_selected_timeline`, `share_training_notes`, `share_health_summary`, and `share_puppy_profile`. Future Health, Reminder, Family, Trainer, Card, and Paywall work should start by adding Zod contracts, query hooks, feature UI, negative RLS tests, and missing RPC/Edge wrappers over this baseline; new base tables require an explicit scope change and ADR-0007 review.

The current runnable app is still a partial shell:

- `src/features/quick-log` is the most complete product area, but the route is not yet wired to real onboarding/profile/session care context and mutation data in normal app usage.
- `src/features/today` and `src/features/timeline` show Quick Log rows and pending/failed actions, but not the full PRD Today hero, day 2-7 journey, activity strip, reminder cards, guidance cards, or visual parity with the atlas.
- `src/features/health` and `src/features/more` are placeholders.
- Onboarding, account/auth upgrade, puppy profile, reminders, family sharing, trusted sitter, trainer sharing, shareable cards, settings subflows, guidance content, paywall shell, and native dev-gallery are not implemented as feature groups.

Two existing documents are still active:

- `docs/plans/active/2026-05-21-phase-0-architecture-cleanup.md` remains the foundation dependency map. It now treats the Quick Log implementation chain as complete and keeps release/privacy plus non-Quick Log invalidation follow-ups open.
- `docs/plans/active/2026-05-21-design-handoff-agent-gallery.md` remains the design package follow-up plan. It now treats completed design-package, primitive, typed i18n, and Quick Log contract guardrails as closed; the major remaining items are Dynamic Type screenshots and the development-only native design/gallery route.

---

## Scope Baseline

This roadmap targets the full current product/design scope, not only the earlier Quick Log MVP slice.

**Must be working in-app:**

- auth/session foundation, anonymous-or-permanent identity decision, account boundary, durable session restore, onboarding, puppy setup, age hint, tracker selection, plan reveal, first log, deferred account path;
- Today, Quick Log, Quick Log details, Timeline, and all core loading/empty/error/offline/pending states;
- manual health records, health statuses, template suggestions, calm health copy, and health share behavior;
- reminders, reminder actions, quiet hours, timezone behavior, notification permission denied fallback, and local notification scheduling;
- family invite, caregiver/viewer roles, shared Today/Timeline, activity attribution, duplicate-care protection, revoke/remove;
- trusted sitter mode over accepted caregiver membership, checklist, prompts, owner completion visibility;
- trainer/scoped sharing, permission preview, selected scopes, expiry, revocation, trainer accepted view, revoked/expired unavailable view;
- More tab settings: puppy profile, quick trackers, notification preferences, privacy/account/export/delete, support;
- shareable puppy cards and paywall shell because they exist in the current design atlas, with the monetization boundary below;
- design primitives/gallery and synthetic state coverage for all critical screen states.

**Monetization boundary:**

- The paywall shell and entitlement interface can be implemented behind a feature flag.
- Live RevenueCat/IAP purchase, restore, webhooks, cancellation handling, and public paid launch behavior remain outside closed-beta readiness unless explicitly approved as a later scope change.

**Release boundary:**

- This roadmap includes release-readiness gates and internal build smoke preparation.
- It does not authorize EAS builds, TestFlight, Play Internal Testing, App Store/Play submission, Supabase production migrations, Edge Function deploys, commits, pushes, PRs, tags, or production service configuration.

---

## Hands-On Milestones

These are review checkpoints for "an app we can poke" before final beta readiness.

1. **Milestone A - Clickable Full-App Skeleton**
   - Every atlas route has a native route or dev-gallery surface with synthetic data.
   - The app can be navigated end-to-end through Onboarding, Today, Health, More, Quick Log, Timeline, sharing previews, settings, and unavailable states.
   - This milestone is useful for design review, not product validation.

2. **Milestone B - Working Core Loop**
   - A user can create or resume a puppy profile, pick trackers, log a real Quick Log event, see Today/Timeline update, add a health record, create a reminder, and edit key settings.
   - Supabase Auth, session restore after app restart, RLS, query/cache behavior, local Quick Log queue, typed i18n, and privacy-safe telemetry are all in play for the core loop.
   - This is the first milestone that should feel like a functional app, even if sharing/cards/paywall are still incomplete.

3. **Milestone C - Full Design Atlas App**
   - All 62 phone screens and key missing/deferred states are represented by production screens or explicit dev-gallery state fixtures.
   - Family, trusted sitter, trainer sharing, shareable cards, reminders, health, guidance, More/settings, paywall shell, and revoked/expired flows are implemented with real contracts and permission boundaries.
   - This is the target before closed-beta hardening.

4. **Milestone D - Closed-Beta Candidate**
   - PRD epic acceptance, RLS negative tests, E2E smoke flows, Dynamic Type/VoiceOver/TalkBack passes, privacy/platform checks, and internal build smoke are complete.
   - Release actions still require exact approval.

---

## Design Atlas Coverage

Current atlas counts from `docs/design/v1/manifest.json`: 17 sections, 65 artboards, 62 phone screens, 3 reference artboards.

| Atlas group | Current native status | Roadmap target |
| --- | --- | --- |
| Foundation | Tokens and first primitives exist; missing several required primitives and native gallery. | Complete shared primitives, `_dev/components` or equivalent gallery, and screen-state fixtures. |
| Auth/session | Foundation landed via PR #18: ADR-0017, email OTP sign-in, SecureStore-backed Supabase session persistence, AppState auto-refresh, route gating, sign-out, and new-user bootstrap RPC. Manual smoke remains. | Extend the foundation only through scoped follow-ups: social sign-in, anonymous/permanent upgrade if enabled, account-boundary tests for later sensitive flows, and onboarding/profile consumption of the real session actor. |
| Onboarding | Missing as a feature group. | Full setup flow, validation, age hint, tracker picker, plan reveal, first log, account/notification prompts using the accepted identity foundation. |
| Today | Partial Quick Log rows only. | PRD Today hero, day 1/day 2/day 7 variants, activity strip, reminder/guidance cards, loading/offline/pending/error states. |
| Quick Log | Partial; most Quick Log MVP internals exist. | Wire real care context, details route, slow-saving state, optional detail variants, full visual parity. |
| Timeline | Partial Quick Log rows and pending/failed actions. | Filters, empty filtered state, edit/delete/undo, attribution, offline/error states. |
| Family sharing | Missing. | Owner family list, invite role/scope, pending invite, accepted caregiver/viewer behavior, revoke/remove. |
| Trusted Sitter | Missing. | Enable/no-caregiver/pending states, sitter checklist, owner status, exit/auto-expire. |
| Trainer sharing | Missing. | Scope selector, permission preview, accepted trainer view, expiry/revoke behavior. |
| Shareable cards | Missing; atlas marks post-MVP, but user target includes all mockups. | Builder, empty disabled state, health disclosure, preview, share sheet, shared cards list. |
| Revoked/expired | Basic unavailable screen exists for token routes. | Neutral unavailable state aligned with share/invite routes and atlas route intent. |
| Health | Placeholder only. | Record list, edit form, confirmed/detail states, needs-vet-review, empty state, share-preview behavior. |
| Reminders | Missing. | Reminders hub, edit flow, local notification system UI/state, denied permission fallback. |
| Starter Guidance | Missing. | Daily Today card, topic detail, read/practiced/skip states, content versioning. |
| More | Placeholder only. | Full More list, puppy profile, quick trackers, notifications, privacy/account/delete, support, paywall entry. |
| Paywall | Missing; atlas marks post-MVP. | Feature-flagged shell only, no live IAP unless separately approved. |
| Screen states | Reference only. | Native synthetic fixtures for loading, empty, error, offline-read, pending-write, permission-denied, revoked/expired. |

Known atlas gaps that roadmap phases must resolve or explicitly defer:

- onboarding age hint as a dedicated state;
- Today accident recovery, empty, and refresh-error states;
- Quick Log slow-network/saving state; atlas artboard 4.3 is absent, so this must be built as an explicit synthetic state;
- reminder edit route and notification permission-denied state;
- viewer-role read-only Today/Timeline states;
- specific Quick Log detail variants for sleep, feeding, and zoomies;
- Dynamic Type XXL/XXXL variants;
- multi-size phone screenshots for small iPhone, large iPhone, and common Android sizes.

---

## Locked Decisions

1. **Build vertical slices, not static skins.**
   - Future agents may use synthetic fixtures for dev-gallery and screenshots, but production screens must be backed by contracts, query/cache behavior, RLS/Edge Function boundaries, and typed i18n where the PRD requires real behavior.

2. **Keep the app shell small.**
   - `app/` files only wire routes, providers, redirects, and modal presentation. Feature logic stays in `src/features`, shared data behavior in `src/lib`, and Zod/business contracts in `src/contracts`.

3. **No extra primary tabs.**
   - Primary tabs remain `Today | Health | More`. Quick Log remains a persistent FAB/action, not a tab.

4. **Design parity is measured by native states.**
   - Raw web JSX under `docs/design/v1/raw/` is visual intent only. Native implementation uses `src/design` primitives and screenshots are compared against `docs/design/v1/screenshots/`.

5. **Sharing and health privacy are server-enforced.**
   - UI can hide actions for convenience, but RLS, projections, Edge Functions, and tests are the permission boundary.

6. **No broad local-first product.**
   - Quick Log queue remains the only durable local-write exception. Other offline states are read-only cache, temporary local drafts, or explicit future ADR work.

7. **Identity is a foundation dependency.**
   - Durable writes, RLS ownership, sharing, multi-device, premium, and sensitive flows must not depend on fake IDs or ephemeral sessions. The next implementation wave must create an accepted auth/identity decision, expected as ADR-0017, before onboarding/profile or Quick Log production wiring claims Milestone B.

8. **Schema baseline is already present.**
   - Health, reminders, invite/share, notification, entitlement, trusted-sitter, and media work extends and verifies the ADR-0007 migration baseline. Agents must not create duplicate base tables to implement atlas screens.

9. **Settings namespace must be unified.**
   - The current atlas mixes `/more/*` with `/settings/quick-trackers`, while navigation docs only partially cover that split. Phase 1/8 must choose and document the production namespace so settings do not grow into parallel route trees.

---

## Invariants And Executable Spec

Each future task plan must map these invariants to automated tests or named manual gates.

- **Navigation invariant:** only `Today | Health | More` are primary tabs; Quick Log is a FAB/action.
  - **Evidence:** navigation contract test and route render tests.
- **Design invariant:** every atlas phone screen is represented by a native route, production state, or explicit dev-gallery fixture before Milestone C.
  - **Evidence:** manifest-to-native coverage check or maintained coverage table plus simulator screenshots.
- **i18n invariant:** no raw user-facing strings in UI; EN/RU/ES key parity and string budgets pass after every UI slice.
  - **Evidence:** i18n and text hygiene checks.
- **Privacy invariant:** analytics/logs/docs/screenshots contain no puppy names, notes, raw emails, provider names, photos/media URLs, invite/share tokens, push tokens, or raw backend errors.
  - **Evidence:** privacy scan, analytics contracts, observability scrubber tests, synthetic fixtures only.
- **RLS invariant:** household, viewer, caregiver, trainer_viewer, revoked member, expired share, and anonymous cases are enforced outside UI.
  - **Evidence:** pgTAP/RLS negative tests and share projection tests.
- **Auth/session invariant:** durable app usage has a Supabase identity, session persistence is backed by SecureStore or another accepted Supabase-compatible secure adapter, anonymous users are distinguishable from permanent users for sensitive RLS/actions, and anonymous-to-permanent upgrade is tested if anonymous auth ships.
  - **Evidence:** ADR-0017 or equivalent accepted auth decision, Supabase client/session tests, restart/session-restore tests, RLS tests for anonymous/permanent boundaries, and onboarding/account upgrade tests.
- **Share projection invariant:** `share_health_summary` and other share projections are a single ADR-0009 contract reused by health, trainer, cards, and revoked/expired flows.
  - **Evidence:** projection contract tests and pgTAP cases for included/excluded fields rather than per-feature projection forks.
- **Quick Log invariant:** accidental double tap stays 3 seconds and duplicate-care warning stays 60 seconds for approved care buckets.
  - **Evidence:** business-rule tests and Quick Log controller tests.
- **Offline invariant:** non-Quick Log writes are not silently promised as durable offline writes.
  - **Evidence:** query/queue tests and UX state tests.
- **Health invariant:** health screens are recordkeeping, not diagnosis or dosing guidance.
  - **Evidence:** content review, string hygiene, health state tests.
- **Notification invariant:** local reminders work without remote push token; denied permission has a calm in-app fallback. Existing remote-push-capable tables such as `device_push_token` and `notification_delivery_log` remain dormant until a later approved push scope uses them.
  - **Evidence:** notification scheduling tests, preference tests, manual device checks.
- **Accessibility invariant:** Today, Quick Log, Health, Sharing Preview, Onboarding CTA, and notification denial fallback pass Dynamic Type XXL/XXXL and VoiceOver/TalkBack review.
  - **Evidence:** screenshots and manual checklist before closed beta.

---

## Execution Roadmap

### Phase 0 - Roadmap Review And Plan Hygiene

**Goal:** Start the next wave from accurate docs and tracking.

**Checklist:**
- [x] Create `PUP-17` for this master roadmap.
- [x] Move completed `PUP-16` plan out of `active/`.
- [x] Update `docs/plans/README.md` so the active index points at this roadmap and treats `PUP-16` as completed.
- [x] Update stale foundation roadmap Quick Log checklist items.
- [x] Update stale design handoff checklist items that were closed by `PUP-8` through `PUP-16`.
- [x] Apply confirmed external roadmap review fixes for auth/identity, existing backend baseline, source docs, share projections, route namespace, and release/schema references.
- [x] Review this roadmap with the user and apply requested corrections from the first external-agent review pass.
- [x] Get final user approval for the amended roadmap.
- [ ] Split remaining foundation follow-ups into new issues after roadmap review.
- [x] Decide the first implementation issue for the first approved slice: `PUP-18` auth/identity/session.
- [x] Create the post-`PUP-18` next-batch plan for `PUP-19`/`PUP-20`/`PUP-21`.

**Exit gate:** `docs/plans/README.md`, Linear, and active plans agree on what is complete and what remains.

### Phase 1 - Full-App Shell, Route Coverage, And Native Design Gallery

**Goal:** Reach Milestone A: every major screen group can be opened with synthetic data.

**Scope:**
- Add missing route shells for onboarding, Quick Log details, reminders, family invite, trainer preview/scope selector, health record edit, quick tracker settings, puppy profile, trusted sitter, shareable cards, paywall shell, notifications, privacy/account, and guidance topic detail.
- Complete missing shared primitives needed by multiple feature groups: bottom-sheet/modal behavior, inline alert, form field, avatar, empty state, skeleton loader, reminder/share/health rows where shared ownership is justified.
- Add a development-only native gallery for design primitives and critical screen states.
- Add the first atlas coverage map that links each manifest artboard to native route/state/test evidence.

**Verification:**
- `npm run check`
- route render tests for the added shells;
- design package check;
- synthetic dev-gallery privacy review.

**Exit gate:** Milestone A is reachable in a local dev build/web preview with no raw private data and no production behavior claims.

### Phase 1A - Auth, Identity, Session Persistence, And Account Boundary

**Status:** Complete via `PUP-18` PR #18 on 2026-05-31 (`docs/plans/completed/2026-05-30-pup-18-auth-identity-session.md`). Dependency setup, contracts, bootstrap RPC, SecureStore session persistence, auth API, bootstrap client, AuthProvider, i18n copy, TextField, sign-in UI, routing, sign-out, docs, remote Supabase verification/typegen, local gates, manual email OTP smoke, and Linear evidence are complete.

**Goal:** Establish the durable identity foundation required by every server-backed feature before product flows claim real app behavior.

**Scope:**
- Write ADR-0017 or an equivalent accepted architecture decision for anonymous-first vs permanent-first onboarding, account boundary, and anonymous-to-permanent upgrade behavior.
- Add the auth/session module under `src/lib` or an approved ownership boundary, keeping `app/` route-thin.
- Preserve the PR #18 Supabase React Native session persistence strategy: SecureStore-backed storage, `persistSession: true`, `autoRefreshToken: true`, and React Native `AppState` token refresh.
- Wire token auto-refresh to React Native `AppState` and expose a shared auth-refresh signal for queue/repository error classification.
- Define account-required gates for sharing, multi-device, premium, sensitive health/privacy actions, export/delete account, and trainer/family flows.
- Add pending deep-link intent storage for invite/share flows without persisting raw tokens longer than required.

**Trust-first work:**
- RLS tests for anonymous vs permanent behavior before sensitive actions rely on UI gates.
- Supabase client/session tests for restart restore, no token leakage, and auth-refresh classification.
- Typed EN/RU/ES copy for account prompts and upgrade boundaries.

**Verification:**
- Supabase client/session unit tests;
- auth boundary render/route tests;
- anonymous-to-permanent upgrade test if anonymous auth is enabled;
- RLS negative tests for anonymous/permanent sensitive-action boundaries;
- `npm run check`.

**Exit gate:** Durable server-backed flows have a real session actor and do not use fake IDs or non-persistent identity.

### Phase 2 - Onboarding, Puppy Profile, And Tracker Setup

**Goal:** A new user can create the initial care context needed by every later feature.

**Scope:**
- Puppy setup with name, birth date or estimated age, age hint, validation, and local draft behavior.
- Quick tracker selection with max 5 visible trackers and default recommendations.
- Plan reveal and first-log entry point.
- Deferred account path and account prompts that consume the Phase 1A identity/account-boundary decision.
- More > Puppy Profile and the unified Quick Trackers route reuse the same contracts and validation.

**Trust-first work:**
- Contracts for puppy profile, selected trackers, onboarding progress, and account upgrade intent.
- Supabase/RLS/query hooks for durable profile state after account boundary is satisfied.
- Typed EN/RU/ES copy with string budget checks.

**Verification:**
- contract tests, render tests, auth/deep-link intent tests where applicable;
- onboarding -> puppy profile -> first Quick Log E2E once an installable build exists;
- Dynamic Type screenshot for Onboarding CTA.

**Exit gate:** Milestone B can start because the app has a real puppy/care context.

### Phase 3 - Today, Quick Log, Timeline, And Guidance Core

**Goal:** Make the core daily habit genuinely useful and visually aligned.

**Scope:**
- Wire Quick Log route to real care context, mutation port, queue state, snackbar, details route, and recent-event duplicate warning.
- Finish Quick Log details and slow-saving/error variants without expanding durable offline beyond Quick Log.
- Expand Timeline with filters, edit/delete/undo, empty filtered state, attribution, and offline/error states.
- Build Today hero/day variants: first day, day 2 morning, accident recovery, after feeding pattern, after invite, missed reminder, day 7 weekly rhythm.
- Add one starter guidance card per day and topic detail/read/practiced/skip states.

**Trust-first work:**
- Extend contracts and query invalidation only where current Quick Log contracts are insufficient, and use the Phase 1A session actor instead of route-local fake identity.
- Keep Today card prioritization deterministic and testable.
- Content versioning for starter guidance if server-backed content lands in this phase.

**Verification:**
- Today prioritization tests;
- Quick Log mutation/queue/controller tests;
- Timeline render/filter tests;
- privacy-safe analytics tests;
- one-handed Quick Log and Dynamic Type/VoiceOver manual review for Quick Log and Today.

**Exit gate:** Milestone B is met for the routine logging loop.

### Phase 4 - Health Records And Health Sharing Behavior

**Goal:** Turn Health from a placeholder into trustworthy recordkeeping.

**Scope:**
- Health list, mixed templates + records, empty first-run state, add/edit/delete/undo flow, confirmed and needs-vet-review detail states.
- Template suggestion card and calm health status transitions.
- Health share behavior that defaults to title/status/date only and excludes notes/provider/photos unless explicitly selected in later share flows.

**Trust-first work:**
- Health record contracts, status transitions, query hooks, RLS tests, and ADR-0009 share projection tests before UI, extending the existing `health_record` and `share_health_summary` baseline rather than creating duplicate health/share tables.
- No medical prescription, dosing, urgency inference, or diagnosis copy.

**Verification:**
- health contract/status tests;
- health query/render tests;
- RLS/share projection tests for health_summary;
- Dynamic Type and VoiceOver/TalkBack review for health record entry.

**Exit gate:** Health satisfies PRD recordkeeping acceptance and can participate in sharing previews safely.

### Phase 5 - Reminders, Notifications, And Preference Surface

**Goal:** Add reminders without turning the app into a task manager or overpromising notification delivery.

**Scope:**
- Reminders hub, create/edit reminder flow, reminder card on Today, quiet hours, timezone handling, Done/Snooze/Skip/Edit/Stop actions.
- Expo local notification scheduling, cancel/reschedule, local_notification_id tracking, denied permission fallback, and notification preferences.
- Trusted-sitter checklist reminders prepare for Phase 6 but do not grant new permissions by themselves.

**Trust-first work:**
- Reminder, occurrence, notification preference, and optional device token contracts over the existing reminder/notification baseline.
- Supabase/RLS coverage for reminder rows and preferences.
- Remote-push-capable schema rows stay unused unless a later approved push-notification scope activates them.
- Add `expo-notifications` or any notification dependency only with explicit approval if not already present.

**Verification:**
- reminder scheduling rule tests;
- timezone/quiet-hour edge tests;
- notification preference tests;
- manual notification permission denied flow;
- E2E reminder schedule/fire/action when a dev build exists.

**Exit gate:** Local reminders work without remote push and denied permission remains a calm in-app state.

### Phase 6 - Family Sharing And Trusted Sitter

**Goal:** Coordinate care safely inside a household.

**Scope:**
- Family list, invite role/scope, invite sent/pending, accept invite flow, shared Today/Timeline, viewer read-only states, caregiver write boundaries.
- Activity attribution strip and duplicate-care behavior across household actors.
- Trusted sitter enable/no-caregiver/pending states, sitter checklist, owner status, completion updates, exit/auto-expire.
- Remove caregiver and revoke/expire invite behavior.

**Trust-first work:**
- Edge Functions or SECURITY DEFINER helpers for missing invite create/accept/revoke/remove behavior, extending the existing invite/share baseline and `app_private` token-secret pattern.
- RLS negative tests for owner/caregiver/viewer/revoked member/anonymous cases against existing tables and any new RPC/Edge wrapper.
- Pending intent storage for invite links without leaking raw tokens.

**Verification:**
- RLS pgTAP tests;
- invite token privacy tests;
- shared Today/Timeline query tests;
- family invite accept/revoke E2E;
- Dynamic Type and VoiceOver/TalkBack review for invite preview.

**Exit gate:** Household collaboration works without UI-only permission enforcement.

### Phase 7 - Trainer Sharing, Scoped Shares, Revoked States, And Shareable Cards

**Goal:** Let owners share selected context externally with clear scope and revocation.

**Scope:**
- Trainer scope selector, permission preview, selected scope examples, accepted trainer view, expiry/revocation controls, neutral revoked/expired screen.
- Share link routes and pending intent handling.
- Shareable card builder, empty disabled state, health disclosure, preview, share sheet, and shared cards list.

**Trust-first work:**
- Share scope contracts and ADR-0009 projection tests before UI; reuse the same projection contract as Health rather than forking `health_summary` behavior.
- Health summary off by default for trainer links.
- Notes/photos require explicit item-level selection if implemented.
- Signed/public card links require expiry and revocation.

**Verification:**
- share projection tests for included/excluded fields;
- trainer share preview/revoke E2E;
- revoked/expired route tests;
- privacy scan for token leakage and synthetic screenshot fixtures.

**Exit gate:** External sharing never exposes base tables or private fields beyond selected scopes.

### Phase 8 - More, Privacy, Account, Support, And Paywall Shell

**Goal:** Complete the operational surfaces that users expect around settings, privacy, and support.

**Scope:**
- More full list and navigation to Timeline, Family Sharing, Trainer Sharing, Reminders, Quick Trackers, Puppy Profile, Notification Preferences, Privacy/Account, Support, and Paywall shell.
- Route namespace decision for settings subflows: reconcile atlas `/more/*` with `/settings/quick-trackers`, update `docs/architecture/05-navigation-and-deeplinks.md`, and keep one production route tree plus redirects only where intentionally documented.
- Privacy/export/delete account request path appropriate for closed beta.
- Delete confirmation flow from atlas.
- Feature-flagged paywall shell and no-op entitlement provider behavior.

**Trust-first work:**
- Entitlement interface remains inactive/no-op unless live purchase work is separately approved.
- Account deletion/export flows must align with privacy policy and data retention docs.
- No external payment flow for digital goods.

**Verification:**
- More route/render tests;
- entitlement fallback tests;
- privacy/account copy review;
- App Store/Play policy preflight notes updated.

**Exit gate:** Settings and privacy controls are not hidden behind unrelated UI and paywall shell cannot accidentally imply live billing.

### Phase 9 - Cross-Cutting Hardening, E2E, Accessibility, And Release Gates

**Goal:** Reach Milestone D: a closed-beta candidate can be built after explicit release approval.

**Scope:**
- Maestro E2E flows once an installable dev build exists.
- Dynamic Type XXL/XXXL screenshots in EN/RU/ES for Today, Quick Log, Health, Sharing Preview, and Onboarding CTA.
- VoiceOver/TalkBack pass for Quick Log, invite preview, Health record entry, and notification denial fallback.
- AASA and assetlinks validation scripts.
- Privacy manifest built-artifact verification, Android Data Safety/App Privacy form evidence, Sentry/PostHog SDK guardrails, symbolication smoke plan.
- Performance checks for cold start, Today TTI, Quick Log tap-to-visible update, and Timeline scroll.

**Verification:**
- `npm run check`;
- `npm run supabase:ci:remote` where credentials and approval are available;
- design package and native screenshot comparison;
- E2E smoke suite;
- platform compliance preflight;
- internal build smoke only after exact approval.

**Exit gate:** The app is ready for a user-approved TestFlight/Play Internal Testing action.

---

## Suggested Linear Split After Review

`PUP-18` has landed and is complete as the first critical-path slice. The next-batch implementation contract is `docs/plans/active/2026-06-08-post-pup-18-next-batch.md`; `PUP-19`, `PUP-20`, and `PUP-21` were created from that plan on 2026-06-08 and use their Linear-generated branch names.

| Proposed issue | Purpose | Labels |
| --- | --- | --- |
| PUP-18 (complete) | Auth/identity ADR, session persistence, account boundary | `contracts`, `rls`, `privacy` |
| PUP-19 | Route/dev-gallery coverage map and first implementation contracts | `docs`, `decision`, `needs-plan`, `agent-ready` |
| PUP-20 | Full-app shell and native design gallery | `a11y`, `i18n`, `privacy`, `agent-ready` after PUP-19 coverage map |
| PUP-21 | Onboarding, puppy profile, tracker settings | `contracts`, `i18n`, `a11y`, `quick-log`, `privacy`, gated by pgTAP/typegen handoff |
| PUP-22 | Today core, guidance cards, day 2-7 states | `contracts`, `quick-log`, `a11y`, `i18n` |
| PUP-23 | Quick Log details and Timeline completion | `quick-log`, `contracts`, `privacy` |
| PUP-24 | Health records and health_summary behavior | `contracts`, `rls`, `privacy`, `a11y` |
| PUP-25 | Reminders, local notifications, preferences | `contracts`, `release-gate`, `a11y` |
| PUP-26 | Family sharing and invite lifecycle | `contracts`, `rls`, `privacy` |
| PUP-27 | Trusted sitter mode | `contracts`, `privacy`, `a11y` |
| PUP-28 | Trainer sharing and scoped share projections | `contracts`, `rls`, `privacy`, `a11y` |
| PUP-29 | Shareable cards and revoked/expired states | `privacy`, `i18n`, `a11y` |
| PUP-30 | More/settings namespace and settings completion | `privacy`, `i18n`, `a11y` |
| PUP-31 | Paywall shell and no-op entitlement boundary | `contracts`, `release-gate` |
| PUP-32 | Closed-beta hardening, E2E, platform and privacy gates | `release-gate`, `privacy`, `a11y` |

Critical path: `PUP-18` auth/identity is complete and downstream production wiring can consume the real session actor. `PUP-19` route coverage is complete locally and `PUP-20` synthetic shell work may proceed, but it must not use fake production identity or claim Milestone B without real onboarding/profile care context.

Post-`PUP-18` batch note: selected quick tracker persistence was resolved for `PUP-21` with explicit approval for the additive `public.puppy.quick_tracker_ids` column. The local migration, RLS/pgTAP coverage, development migration apply, runtime pgTAP, and remote typegen evidence now exist. Production Supabase setup is not needed for the current development batch. During release readiness, after exact production Supabase approval, create/connect the real PuppyPlan production project, apply repo migrations to a clean production baseline, and verify schema/RLS/typegen/advisors there; do not copy development test data into production by default.

Large issues should be split further only after their task contract is written and the ownership boundaries are clear. The cards/revoked, More/settings, and hardening buckets are expected to split into 2-3 issues each once their contracts are drafted.

---

## Approvals And Risk Register

Explicit approval is required before:

- adding new dependencies, including notification, Sentry/PostHog SDK, or IAP SDK packages;
- schema changes beyond the ADR-0007 schema baseline / PRD §6 "Модель Данных" or any ADR-0007-triggering change;
- Supabase production migrations, Edge Function deploys, or production environment changes;
- EAS builds, TestFlight, Play Internal Testing, App Store/Play submission, or OTA/update actions;
- Git commits, pushes, PR publication, branch protection changes, tags, rebases, merges, or other remote repository mutations;
- App Store Connect, Google Play Console, PostHog, Sentry, Supabase, Cloudflare, IAP provider, or production service configuration.

Known risks:

- **Design atlas is broad:** dev-gallery coverage must prevent agents from implementing only the visible happy paths.
- **Auth/session must be consumed correctly:** PR #18 replaced temporary non-persistent sessions with the accepted auth/session foundation and manual smoke passed, but durable writes, RLS ownership, sharing, and multi-device flows still need follow-up tests as each product slice consumes the real session actor.
- **Backend baseline duplication risk:** health, reminders, sharing, notification, entitlement, media, and trusted-sitter tables already exist. Future agents must extend and verify them instead of creating greenfield duplicate schema.
- **Sharing can leak data if UI leads the design:** scope projections and RLS tests must land before trainer/share UI is considered done.
- **Settings namespace can fork:** atlas route names currently mix `/more/*` and `/settings/*`; one documented route tree is required before More/settings implementation scales.
- **Notifications add native and policy surface:** permission denial, quiet hours, exact alarm policy, and platform data safety need early tests.
- **Health copy is high-trust:** avoid diagnosis, dosage, urgency, or medical-advice language unless future PRD/ADR changes allow it.
- **Paywall shell can imply live billing:** keep it feature-flagged and no-op until live IAP is explicitly approved.
- **Release gates are not product polish:** AASA/assetlinks/privacy manifest/built-artifact checks can block beta even when UI appears complete.

---

## Definition Of Done For This Roadmap

This master roadmap is complete when:

- the user has reviewed and accepted or amended the roadmap;
- follow-up Linear issues are created with task contracts only after approval;
- stale PUP-16 active plan state is removed from `active/`;
- `docs/plans/README.md` points future agents to this roadmap and current active follow-ups;
- no implementation work is started from this document without a scoped Linear issue and feature plan.

The full app is complete when:

- PRD epic acceptance in `puppyplan-prd-v2.md` section 12 is satisfied;
- every current atlas phone screen and critical state has native evidence;
- all required contracts, schema/RLS, Edge Function boundaries, query hooks, UI, i18n, analytics/observability, and release gates pass;
- beta release action receives explicit user approval.

---

## Changelog

- 2026-06-08: Closed PUP-18 as complete after manual email OTP smoke passed on `Grith iPhone SE 3 iOS 26.3`, final evidence was mirrored to Linear, and the PUP-18 plan moved to `docs/plans/completed/`.
- 2026-06-08: Added `docs/plans/active/2026-06-08-post-pup-18-next-batch.md` as the current next-batch contract for `PUP-19`/`PUP-20`/`PUP-21`, with production care context split from synthetic route/gallery work and selected tracker persistence marked as a storage decision gate.
- 2026-06-08: Created Linear `PUP-19`, `PUP-20`, and `PUP-21`; completed the local `PUP-19` route/settings/storage preflight with `docs/design/v1/native-coverage.md`. `PUP-20` became ready after the coverage map; `PUP-21` was initially held before durable selected tracker save behavior until exact ADR-0007/CTO schema approval was received later that day.
- 2026-06-09: Reconciled post-approval `PUP-21` status: `public.puppy.quick_tracker_ids` was approved on 2026-06-08 and implemented locally; remaining gates are Docker-capable pgTAP and remote/non-production typegen before release/durability claims.
- 2026-06-09: Updated `PUP-21` schema gate status after non-production verification on `PuppyPlan Dev`: approved migration `20260608212607_puppy_quick_tracker_ids.sql` applied, migration history/dry-run/lint/schema shape verified, focused runtime pgTAP returned plan `1..11` with `ok_count=11` and no failures, and `src/contracts/database.types.ts` was regenerated from the remote dev project. Production remains untouched.
- 2026-06-09: Recorded the production migration/release handoff state after approval: Supabase project discovery and local env expose only `PuppyPlan Dev` (`olymqppxsadsxfrcyskh`) for PuppyPlan, with no production/staging project ref or production DB URL available. Fresh safe gates passed (`npm run check`, dev dry-run/lint/typegen, generated-types check, and focused dev RLS/constraint check with 11/11 passing), but production migration was not applied.
- 2026-06-09: Re-attempted the production gate after follow-up approval. Supabase MCP, Supabase CLI, local env, process env, local link metadata, and branches still expose no existing PuppyPlan production target. A new empty Supabase project was not created because it would not satisfy the required existing-baseline production migration sequence. Production remains untouched.
- 2026-06-09: Reclassified production Supabase work as a deferred release-readiness task instead of a current development blocker. Continue current feature development against `PuppyPlan Dev`; create/connect and verify production only when preparing the release after exact production Supabase approval.
- 2026-06-09: Applied deep-review fixes for the release-gate handoff: tracked pgTAP coverage now includes selected-tracker non-member update denial and unknown tracker id rejection, and release-readiness wording explicitly retains the exact production Supabase approval requirement.
- 2026-06-11: Applied follow-up non-empty selected-tracker migration `20260609120000_puppy_quick_tracker_ids_non_empty.sql` to non-production `PuppyPlan Dev` after exact approval. Preflight dry-run listed only that migration; post-apply dry-run is no-op; Supabase lint reports no schema errors; focused runtime direct constraint check passed with `check_count=5`, `pass_count=5`, `fail_count=0`; remote typegen completed; production remains untouched.
- 2026-05-31: Updated roadmap status after PR #18 merged auth/session foundation to `main`; removed stale "no auth module"/`persistSession: false` references and recorded that PUP-18 only had manual smoke plus Linear sync remaining.
- 2026-05-29: Created master roadmap under `PUP-17` after reviewing PRD, DESIGN, design atlas, architecture docs, ADR index, active plans, current source tree, Linear PUP status, project graph context, and design exploration results.
- 2026-05-29: Completed repo-hygiene sync for active plans: moved `PUP-16` to completed, updated the plan index, closed stale Quick Log foundation checklist items, and narrowed the design handoff plan to its remaining Dynamic Type screenshot and dev-gallery follow-ups.
- 2026-05-29: Applied confirmed external review findings: elevated auth/identity/session persistence to an early Phase 1A foundation slice, added source docs and ADR-0003/ADR-0001, documented the existing backend/schema/RPC baseline, unified share projection ownership under ADR-0009, corrected schema approval wording, called out `/more` vs `/settings` namespace reconciliation, linked Quick Log missing artboard 4.3 to a synthetic state, aligned accessibility/notification invariants, and split suggested Linear buckets accordingly.
- 2026-05-30: Applied follow-up review nits: made auth/identity the first suggested issue, clarified that shell/gallery work can parallelize only as synthetic/non-production wiring until Phase 1A exits, verified listed share projection RPC/view names against migrations/tests, and removed self-referential wording from ADR-0007.
- 2026-05-31: Merged `PUP-17` roadmap/docs hygiene via PR #17 and recorded `PUP-18` as the then-active Phase 1A implementation slice.
- 2026-05-31: Marked final roadmap approval complete after PR #17 merged to `main`; remaining issue-split follow-ups stay open until new Linear tasks are created.
