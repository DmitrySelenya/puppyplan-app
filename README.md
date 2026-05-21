# PuppyPlan

Native iOS/Android app for adults managing the first 90 days with a puppy.

The beta focuses on one operational habit: create a puppy profile, log routine events quickly, understand Today, coordinate care, and share selected context safely.

## Current State

This repository is documentation-first. The Expo app scaffold, Supabase migrations, CI, and release automation are not created yet.

Start here:

- `AGENTS.md` - project rules and non-negotiables for AI coding agents.
- `.agents/README.md` - canonical project skills shared by Claude, Codex, and future agents.
- `docs/agents/00-operating-model.md` - agent workflow and company operating model.
- `docs/agents/linear-workflow.md` - Linear task, label, project, and GitHub linking rules.
- `docs/agents/context-engineering.md` - context package, trust tiers, and handoff rules.
- `puppyplan-prd-v2.md` - product requirements and acceptance criteria.
- `DESIGN.md` - product and UI design direction.
- `docs/architecture/00-overview.md` - architecture entry point.
- `docs/plans/README.md` - active/completed plan index.
- `docs/plans/active/2026-05-21-phase-0-architecture-cleanup.md` - current setup/cleanup plan.

## Local Setup

There is no runnable app yet. Do not add setup commands here until the Expo scaffold and package scripts exist.

Expected future shape:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run check`

## Architecture Baseline

- Expo native app with Expo Router.
- Supabase Postgres as durable source of truth.
- Supabase RLS and privileged Edge Functions for access enforcement.
- TanStack Query for server state.
- Zustand only for UI/workflow state.
- Zod runtime contracts.
- Expo SQLite only for the Minimal Durable Quick Log Queue.
- `react-i18next` with typed keys and string-budget checks.
- PostHog and Sentry only behind privacy-safe wrappers.

## Repository Rules

- Linear team `PUP` and project `PuppyPlan MVP` are the operational tracker for internal work.
- Repository docs remain the source of truth for product, architecture, ADRs, and plans.
- Keep `app/` thin: routes, layouts, providers, auth redirects, modal presentation.
- Put business logic, data hooks, contracts, and screen components under `src/`.
- Do not edit generated `ios/` or `android/` files directly.
- Do not commit secrets, tokens, raw puppy names, notes, provider names, emails, photos, or production data.
- Release, production, deploy, store, Supabase production, and git remote actions require explicit approval for the exact action.

## Planned Gates

Once the scaffold exists, the target local gate is:

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
