# PuppyPlan Architecture Overview

> Status: Accepted architecture baseline for closed beta.
> Date: 2026-05-20.
> Sources: `puppyplan-prd-v2.md`, `DESIGN.md`, `docs/architecture/_meeting/REVIEW_REPORT.md`, role positions in `_meeting/positions/`.

## Purpose

PuppyPlan is a native iOS/Android app for adults managing the first 90 days with a puppy. The beta must prove one operational habit: create a puppy profile, log routine events quickly, understand Today, coordinate care, and share selected context safely.

This architecture is optimized for AI-coding-first delivery: narrow ownership, typed contracts, explicit gates, and minimal moving parts.

## Final CTO Decisions

- Build one Expo native mobile app, not a PWA as the primary product.
- Use multi-file docs under `docs/architecture/`; do not create one root `ARCHITECTURE.md`.
- Keep the PRD data model. Do not split `event_log/event_notes` or `health_record/health_record_notes` without ADR and CTO approval.
- Use Supabase-first architecture: Postgres is durable source of truth; RLS and privileged Edge Functions enforce access.
- Use TanStack Query for server state, Zustand only for UI/workflow state, Zod for runtime contracts.
- Use Expo SQLite for Minimal Durable Quick Log Queue. This is the only durable local-write exception in MVP.
- Use `react-i18next` with typed keys and string-budget CI checks.
- Keep OTA/EAS Update off in MVP.
- Use `_dev/components` as the MVP component inventory route; Storybook is Phase 1 unless component count/QA need justifies it.
- Use PostHog for product/UI flags; use Supabase `app_config` only for backend-critical operational config.
- Treat historical design audit findings as a beta QA track, not as backend/schema input.

Current compliance note: local preflight found that `PrivacyInfo.xcprivacy` is missing. This is a P0 release blocker and is tracked in `15-ios-runtime-and-compliance.md`.

## Architecture Map

Read in this order:

1. `01-principles-and-scope.md`
2. `02-repo-structure-and-ownership.md`
3. `03-client-data-layer.md`
4. `04-state-management.md`
5. `05-navigation-and-deeplinks.md`
6. `06-design-system-and-ui-contracts.md`
7. `07-backend-topology.md`
8. `08-data-model-and-rls.md`
9. `09-sharing-and-permissions.md`
10. `10-quick-log-queue.md`
11. `11-notifications.md`
12. `12-i18n-and-content.md`
13. `13-observability-error-handling-performance.md`
14. `14-feature-flags-and-entitlements.md`
15. `15-ios-runtime-and-compliance.md`
16. `16-android-platform-and-play-gates.md`
17. `17-testing-ci-release.md`
18. `18-ai-agent-guide.md`
19. `19-future-roadmap.md`

Supporting files:

- `OWNERSHIP.md`
- `screen-states-matrix.md`
- `diagrams/*.mmd`
- `ADR_INDEX.md`
- `adr/*.md`

## Diagrams

- `diagrams/01-system-context.mmd`
- `diagrams/02-data-model.mmd`
- `diagrams/03-quick-log-flow.mmd`
- `diagrams/04-navigation-map.mmd`
- `diagrams/05-notification-flow.mmd`
- `diagrams/06-deployment.mmd`
- `diagrams/07-sharing-flow.mmd`

Rule: if a contract changes, update the matching architecture file and diagram in the same PR.
