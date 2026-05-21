# Architecture Decision Record Index

Accepted ADRs for the closed-beta baseline:

- `adr/0001-multi-file-architecture-docs.md`
- `adr/0002-single-expo-app-structure.md`
- `adr/0003-state-ownership-matrix.md`
- `adr/0004-quick-log-queue-sqlite.md`
- `adr/0005-universal-links-and-app-links.md`
- `adr/0006-supabase-migrations-and-pgtap.md`
- `adr/0007-prd-schema-baseline.md`
- `adr/0008-privacy-safe-analytics.md`
- `adr/0009-sharing-projections.md`
- `adr/0010-react-i18next-typed-keys.md`
- `adr/0011-design-system-runtime.md`
- `adr/0012-notification-architecture.md`
- `adr/0013-feature-flags-and-entitlements.md`
- `adr/0014-ota-disabled-for-mvp.md`
- `adr/0015-ios-compliance-gates.md`
- `adr/0016-android-compliance-and-exact-alarms.md`

## Decisions Captured Outside Dedicated ADRs

These are accepted baseline constraints, but do not currently have separate ADR files:

- Zod is the runtime contract layer: `00-overview.md`, `02-repo-structure-and-ownership.md`, `08-data-model-and-rls.md`, `17-testing-ci-release.md`.
- PostHog is used for product/UI flags and privacy-safe analytics wrapper integration: ADR-0008, ADR-0013, `13-observability-error-handling-performance.md`, `14-feature-flags-and-entitlements.md`.
- Expo generated `ios/` and `android/` folders are read-only for agents: `AGENTS.md`, `15-ios-runtime-and-compliance.md`, `16-android-platform-and-play-gates.md`.
