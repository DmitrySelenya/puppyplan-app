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

On the 8 GB M1 MacBook Air, do not run local Supabase or Docker. Local Expo development points at the hosted non-production Supabase dev project via `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Remote migration dry-runs and lint use `SUPABASE_DB_URL` without local Docker.

Docker-required Supabase checks run on CI/cloud runners:

- `npm run supabase:test` for remote pgTAP with `SUPABASE_CLI_DOCKER_ALLOWED=1`;
- `npm run db:types` for generated DB types; use `SUPABASE_PROJECT_REF` plus Supabase CLI auth locally, or `SUPABASE_DB_URL` on Docker-capable CI/cloud runners;
- `npm run supabase:ci:remote` as the full remote Supabase schema gate.

## E2E

Use Maestro in MVP.

Critical flows:

- onboarding -> puppy profile -> first Quick Log -> Today update;
- offline Quick Log -> reconnect -> dedupe;
- family invite accept/revoke;
- trainer share preview and revoke;
- reminder schedule/fire/action;
- notification permission denied fallback.

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
