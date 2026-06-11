# Native Route And State Coverage

Status: Active contract for `PUP-19` / `PUP-20` / `PUP-21`.

This file maps the design atlas to native route ownership after `PUP-18`. It is the source for `PUP-20` synthetic route shells and `PUP-21` production care-context routes. Synthetic coverage is review-only and must not write production data.

## Route Decisions

- Primary tabs remain exactly `/today`, `/health`, and `/more`.
- Quick Log remains a modal/FAB action at `/quick-log`; it is not a tab.
- More is the user-facing entry point for settings, but editable settings routes live under `/settings/*`.
- Atlas labels using `/more/puppy-profile` map to the production route `/settings/puppy-profile`.
- The native design gallery uses the architecture-approved development-only route `/_dev/components`.
- Dev-gallery routes are not linked from production tabs, More rows, or production modal stacks.

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| Existing production route | Route file exists and is part of the current production shell. |
| Planned production route | Route name is locked for a future production shell or screen. |
| Planned synthetic fixture | `PUP-20` may cover this in `/_dev/components` or a route shell with synthetic data only. |
| Deferred issue | Out of the `PUP-19`/`PUP-20`/`PUP-21` batch; do not implement from this plan. |
| System surface | Native OS or build/runtime surface, not an Expo Router route. |

## Current Batch Coverage

| Atlas ID | Atlas title | Atlas route | Native route / fixture | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Welcome - default | `/onboarding` | `/onboarding` | `PUP-21` | Production route implemented |
| 2.2-default | Profile - default | `/onboarding` | `/onboarding` | `PUP-21` | Production route implemented |
| 2.2-filled | Profile - filled | `/onboarding` | `/onboarding` | `PUP-21` | Production route implemented |
| 2.2-error | Profile - error | `/onboarding` | `/onboarding` | `PUP-21` | Production route implemented |
| 2.4 | Tracker picker - 5 of 5 | `/onboarding` | `/onboarding` | `PUP-21` | Production route implemented; durable selected trackers use approved `public.puppy.quick_tracker_ids` |
| 2.5 | Plan reveal | `/onboarding` | `/onboarding` | `PUP-21` | Production route implemented |
| 2.6 | First log - pending celebration | `/onboarding` | `/onboarding` + `/quick-log` | `PUP-21` then later `PUP-23` | Production route implemented for selected tracker consumption; Quick Log details remain later `PUP-23` scope |
| 14.2-default | Puppy profile - saved view | `/more/puppy-profile` | `/settings/puppy-profile` | `PUP-21` | Production route implemented; atlas route alias locked |
| 14.2-editing | Puppy profile - editing form | `/more/puppy-profile` | `/settings/puppy-profile` | `PUP-21` | Production route implemented; atlas route alias locked |
| 14.2-breed | Puppy profile - breed picker | `/more/puppy-profile` | `/_dev/components` fixture | `PUP-20` | Planned synthetic fixture; breed is out of `PUP-21` production scope |
| 14.2-breed-q | Puppy profile - breed search | `/more/puppy-profile` | `/_dev/components` fixture | `PUP-20` | Planned synthetic fixture; breed search is out of `PUP-21` production scope |
| 14.3 | Quick trackers - 5 of 5 | `/settings/quick-trackers` | `/settings/quick-trackers` | `PUP-21` | Production route implemented; save behavior uses approved `public.puppy.quick_tracker_ids` |
| 14.4 | Notifications | `/more/notifications` | `/_dev/components` fixture | `PUP-20`; production deferred | Planned synthetic fixture; production route deferred to reminders/settings issue |
| 14.5 | Privacy & account | `/more/privacy` | `/_dev/components` fixture | `PUP-20`; production deferred | Planned synthetic fixture; production route deferred to privacy/account issue |
| 14.6 | Delete confirm - type DELETE | `/more` | `/_dev/components` fixture | `PUP-20`; production deferred | Planned synthetic fixture; account deletion production behavior is out of this batch |

## Milestone A Synthetic Coverage

`PUP-20` may add synthetic shells or `/_dev/components` fixtures for the following atlas groups. These are review surfaces only and must not import `@supabase/supabase-js`, `@/lib/supabase`, or production write adapters.

| Atlas group | Native coverage target | Owner | Notes |
| --- | --- | --- | --- |
| Foundation library | `/_dev/components` | `PUP-20` | Development-only gallery for primitives and global states. |
| Onboarding | `/onboarding` route shell plus gallery states | `PUP-20` / `PUP-21` | PUP-20 may render synthetic states before PUP-21 production wiring. |
| Today | Existing `/today` plus gallery states | Deferred production | Existing shell remains; day 2-7 production behavior is PUP-22. |
| Quick Log | Existing `/quick-log`; `/quick-log/details` planned | Deferred production | Existing sheet remains; details route is PUP-23. |
| Timeline | Existing `/timeline` | Deferred production | Existing route remains; full filters/editing are later. |
| Family sharing | `/family/invite` synthetic shell | Deferred production | No production invite/share behavior in this batch. |
| Trusted sitter | `/_dev/components` fixture | Deferred issue | Atlas `/more/trusted-sitter` is not a production route yet. |
| Trainer sharing | `/sharing/trainer-preview` / `/sharing/scope-selector` synthetic shell | Deferred production | Permission behavior remains deferred. |
| Shareable cards | `/_dev/components` fixture | Deferred issue | Feature-flag/paywall-adjacent scope is out of this batch. |
| Revoked / expired | Existing invite/share unavailable route | Deferred production refinements | Neutral unavailable shell exists for token routes. |
| Health | Existing `/health`; `/health/record-edit` planned synthetic shell | Deferred production | Health production work is out of this batch. |
| Reminders | `/reminders/edit` synthetic shell or gallery fixture | Deferred production | Local notifications/reminders are out of this batch. |
| Starter guidance | `/_dev/components` fixture | Deferred issue | Today guidance production is PUP-22+. |
| More/settings | Existing `/more`; `/settings/puppy-profile`; `/settings/quick-trackers` | `PUP-20` / `PUP-21` | More remains entry point; editable settings use `/settings/*`. |
| Paywall | `/_dev/components` fixture | Deferred issue | Feature-flag shell only when separately scoped. |
| Screen states reference | `/_dev/components` | `PUP-20` | Synthetic loading/empty/error/offline/pending/permission states. |

## Selected Tracker Persistence Decision

Current status: approved, implemented locally, and verified against the development `PuppyPlan Dev` database for `PUP-21`. A production Supabase database is not needed for the current development batch. Production database creation/configuration and production migration verification are deferred until release readiness after exact production Supabase approval.

Decision: add an ordered `quick_tracker_ids` column to `public.puppy`. The column is additive, per-puppy, constrained to 1..5 selected ids, allowed tracker ids only, unique ids, and covered by RLS/pgTAP owner/caregiver/viewer/non-member cases. This avoids a new table and a larger RLS surface.

Approval status:

- Explicit approval for `public.puppy.quick_tracker_ids` was received in the implementation thread on 2026-06-08 and recorded in the batch plan plus ADR-0007/data-model docs.
- Local migration `supabase/migrations/20260608212607_puppy_quick_tracker_ids.sql` and contract/type updates exist.
- Development verification on 2026-06-09: the first selected-tracker migration was applied to `PuppyPlan Dev`; repeat dry-run reported the remote database up to date; Supabase lint passed; focused runtime pgTAP returned plan `1..11`, `ok_count=11`, `not_ok_count=0`; remote typegen regenerated `src/contracts/database.types.ts`; tracked pgTAP coverage included owner/caregiver/viewer/non-member update cases plus duplicate, >5, and unknown tracker id constraints. Follow-up verification on 2026-06-11 applied `20260609120000_puppy_quick_tracker_ids_non_empty.sql` to `PuppyPlan Dev` after exact approval; repeat dry-run is no-op, Supabase lint passes, and focused runtime direct constraint evidence returned `check_count=5`, `pass_count=5`, `fail_count=0`, including empty selected-set rejection.
- Remaining gate before production release claims: during release prep, after exact production Supabase approval, create/connect the real PuppyPlan production Supabase project, apply the repo migrations to a clean production baseline, then run production dry-run/no-op/schema/RLS/typegen/advisor verification. Do not copy development test data into production by default. Production was not touched in this batch.

## Verification

- `src/test/navigation-contract.test.ts` covers primary tabs, Quick Log modal ownership, `/settings/*`, atlas route aliasing, planned route metadata, and dev-only gallery routing.
- `scripts/checks/check-navigation-contract.mjs` enforces route-shell guardrails and validates existing route files while allowing planned `PUP-20`/`PUP-21` route files to remain absent until their phases.
