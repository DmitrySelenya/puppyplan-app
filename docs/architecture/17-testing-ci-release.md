# Testing, CI, Release

## Ordered CI Gate

Target pipeline:

```text
lint
typecheck
unit
integration
RLS pgTAP
supabase migration diff / destructive check
contract/codegen diff
EAS build smoke
Maestro smoke
a11y / Dynamic Type / string-budget / token drift checks
platform compliance preflight checks
```

Any failing step blocks merge.

Failure semantics:

- no EAS build smoke until typecheck, tests, RLS, migration diff, and contract/codegen checks pass;
- no Maestro smoke until an installable build artifact exists;
- no UI/design batch is complete until the native screens are visually checked against the matching design atlas artboards and the result is recorded;
- no release candidate until platform compliance preflight is clean.

## Unit Tests

Cover:

- Zod schemas;
- query key factory;
- Quick Log queue state machine;
- duplicate warning rules;
- Today card prioritization;
- reminder schedule rules;
- share scope projection logic;
- health status transitions.

## Integration Tests

Use React Native Testing Library and mocked Supabase/Edge Function adapters. Test loading, empty, error, offline-read, pending-write, permission-denied, revoked/expired states.

## RLS Tests

Use pgTAP in `supabase/tests/`. Required P0 cases are in `08-data-model-and-rls.md`.

Sharing RLS tests must assert forbidden fields and forbidden base-table access, not just successful projection reads.

On the 8 GB M1 MacBook Air, do not run a local Supabase stack. Local Expo development points at the hosted non-production Supabase dev project via `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Remote migration dry-runs and lint use `SUPABASE_DB_URL`.

The default local schema/RLS gate is no-Docker and static:

- `npm run supabase:guardrails` for static SQL/RLS/typegen guardrails plus generated database type drift.
- Contract and migration work must update `supabase/tests/*.sql` coverage text, but local verification does not execute Docker-backed pgTAP.
- `npm run db:types` uses `SUPABASE_PROJECT_REF` plus Supabase CLI auth for hosted-project type generation. Do not use DB-URL typegen modes locally when they require Docker.

Remote Supabase wrappers (`npm run supabase:lint`, `npm run db:push:remote:dry-run`, `npm run supabase:ci:remote`) are explicit-approval checks, not mandatory local gates. `npm run supabase:test` is a disabled legacy command because the Supabase CLI pgTAP path requires Docker; it must not be used as required evidence unless a separately approved non-Docker runner replaces it.

## E2E

Use Maestro in MVP.

### Local iOS Simulator Profile

Local iOS smoke on the 8 GB M1 MacBook Air uses the existing lightweight simulator profile only:

- Primary: `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).
- Fallback: `iPhone SE (3rd generation)` (`1319D7E1-AE4E-4165-8EB9-B3A78DE62867`) if the primary profile is unavailable.

Do not pick the first available simulator from `simctl` or XcodeBuildMCP output. iPhone Pro/Pro Max, iPad, and other high-memory simulator profiles are excluded from local smoke unless the user explicitly approves that exact device for that exact run.

Before a build/run, check the active XcodeBuildMCP session defaults. If they are empty or not pinned to the SE profile, set them to the SE profile before building. Keep only one simulator and one Metro process open at a time.

The same SE simulator may host multiple apps when their bundle identifiers differ. The current local coexistence contract is:

- PuppyPlan: `com.dmitry-selenya.puppyplan-app`;
- Grith: `com.grith.app`;
- Expo Go: `host.exp.Exponent`.

Reinstalling PuppyPlan on that simulator updates only the PuppyPlan app/data container and does not replace Grith.

Critical flows:

- onboarding -> puppy profile -> first Quick Log -> Today update;
- offline Quick Log -> reconnect -> dedupe;
- family invite accept/revoke;
- trainer share preview and revoke;
- reminder schedule/fire/action;
- notification permission denied fallback.

### Visual Design Fidelity

For every changed UI surface, record a visual acceptance set before the issue can move to `Done` or the next roadmap batch can start:

- affected atlas artboards from `docs/design/v1/manifest.json`;
- reference screenshots from `docs/design/v1/screenshots/`;
- native screenshots captured on the approved simulator profile, plus any explicitly approved larger-device responsive check;
- result of manual side-by-side comparison for layout, spacing, typography, color, iconography, copy hierarchy, tab/FAB placement, and screen states;
- explicit list of unresolved deviations or a note that none remain.

If the implementation cannot be compared because the source mockup is missing, stale, or ambiguous, the batch is blocked until the user supplies exact screenshots or a fresh design export. Functional tests, `npm run check`, and simulator launch success do not override a failed visual fidelity check.

## Accessibility

Hard gates:

- a11y tests for primitives;
- Dynamic Type XXL/XXXL screenshots for Today, Quick Log, Health, Sharing Preview, Onboarding CTA;
- manual VoiceOver/TalkBack checklist before TestFlight/Internal Testing;
- WCAG AA token contrast pass;
- string-budget CI.

## Privacy And Platform CI Gates

Required once scaffold/CI exists:

- AASA validation: HTTPS, no redirects, `application/json`, valid JSON, app ID, `/invite/*`, and `/share/*`.
- Android `assetlinks.json` validation: HTTPS, valid JSON, package name, Play App Signing SHA-256, and `/invite/*`/`/share/*` coverage.
- Privacy manifest validation: dependency audit recorded, source manifest tracked outside generated `ios/`, built artifact contains valid `PrivacyInfo.xcprivacy`.
- Observability privacy tests: scrubber deny-list fixtures and analytics whitelist property checks.
- Sentry symbolication smoke for release candidates: dSYM/source-map upload plus one intentional symbolicated test crash in a non-production release environment.

## Release

MVP release channels:

- TestFlight for iOS;
- Play Internal Testing for Android.

OTA/EAS Update is off in MVP.

Run `greenlight preflight .` before iOS submission. The repo now tracks a source `PrivacyInfo.xcprivacy` and Expo config plugin, but release remains blocked until a built `.app` confirms the manifest is present at bundle root and the dependency/API audit is current.
