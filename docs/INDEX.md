# Docs Index — Task Router

Routing map only: **"doing X → read these first."** This file does **not** restate
decisions. The rules live in the linked docs; `AGENTS.md` and `CLAUDE.md` remain the
top-level rule sources.

Always start with `AGENTS.md`, then `docs/agents/context-engineering.md`, then the rows below.

## By task type

| You are doing… | Read first | Skill |
|---|---|---|
| Any screen / layout / component / вёрстка | `docs/agents/design-fidelity-pipeline.md`, `DESIGN.md`, `docs/design/v1/manifest.json` + `docs/design/v1/screenshots/index.md`, `docs/architecture/06-design-system-and-ui-contracts.md` | `design-fidelity` |
| Contracts / data shapes | `src/contracts/`, `docs/architecture/03-client-data-layer.md`, `docs/architecture/adr/0007-prd-schema-baseline.md` | `plan` |
| Supabase / schema / migrations / RLS | `docs/architecture/08-data-model-and-rls.md`, `docs/architecture/adr/0006-supabase-migrations-and-pgtap.md`, `docs/architecture/adr/0007-prd-schema-baseline.md` | `plan` |
| Backend topology / Edge Functions | `docs/architecture/07-backend-topology.md` | `plan` |
| Quick Log (queue / dedupe / rules) | `docs/architecture/10-quick-log-queue.md`, `docs/architecture/adr/0004-quick-log-queue-sqlite.md`, `src/contracts/business-rules.ts` | `implement` |
| State management | `docs/architecture/04-state-management.md`, `docs/architecture/adr/0003-state-ownership-matrix.md` | `plan` |
| Navigation / deep links | `docs/architecture/05-navigation-and-deeplinks.md`, `src/contracts/navigation.ts`, `docs/architecture/adr/0005-universal-links-and-app-links.md` | `implement` |
| i18n / strings / content | `docs/architecture/12-i18n-and-content.md`, `docs/architecture/adr/0010-react-i18next-typed-keys.md`, `STRINGS.en.json` / `STRINGS.ru.json` / `STRINGS.es.json` | `implement` |
| Notifications | `docs/architecture/11-notifications.md`, `docs/architecture/adr/0012-notification-architecture.md` | `plan` |
| Sharing / permissions | `docs/architecture/09-sharing-and-permissions.md`, `docs/architecture/adr/0009-sharing-projections.md` | `plan` |
| Auth / identity / session | `docs/architecture/adr/0017-auth-identity-session.md` | `plan` |
| Analytics / observability / errors | `docs/architecture/13-observability-error-handling-performance.md`, `docs/architecture/adr/0008-privacy-safe-analytics.md` | `implement` |
| Feature flags / entitlements | `docs/architecture/14-feature-flags-and-entitlements.md`, `docs/architecture/adr/0013-feature-flags-and-entitlements.md` | `plan` |
| iOS / Android platform / release | `docs/architecture/15-ios-runtime-and-compliance.md`, `docs/architecture/16-android-platform-and-play-gates.md`, `docs/architecture/17-testing-ci-release.md` | — |
| Repo structure / ownership | `docs/architecture/02-repo-structure-and-ownership.md`, `docs/architecture/OWNERSHIP.md` | — |
| Planning any non-trivial work | `docs/plans/README.md`, `docs/plans/TEMPLATE-feature-plan.md` | `plan` |
| Reviewing changes / PRs | — | `review` / `review-deep` |
| Adding/changing behavior with acceptance criteria | — | `tdd` |

Architecture entry point: `docs/architecture/00-overview.md` · ADR index: `docs/architecture/ADR_INDEX.md`

## Canonical vs not

- **Canonical:** `puppyplan-prd-v2.md`, `DESIGN.md`, `docs/architecture/*` + `docs/architecture/adr/*`, `docs/agents/*`, the atlas under `docs/design/v1/screenshots/` (+ `manifest.json`, `index.md`), and active `docs/plans/active/*`.
- **Visual intent only (do not copy into native):** `docs/design/v1/raw/*` (web JSX/CSS).
- **Not a source of truth on their own:** Linear documents, chat history, and graph/`project-graph-context` output (advisory — always read the real files).
