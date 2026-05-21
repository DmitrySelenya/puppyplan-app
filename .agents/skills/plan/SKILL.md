---
name: plan
description: Use when planning PuppyPlan UX, flow, API, storage, schema, permission, release, architecture, or non-trivial feature work - creates a docs/plans implementation contract from trusted project context.
---

# PuppyPlan Planning

## Use When

- A feature, refactor, migration, permission change, release gate, or architecture change needs an implementation plan.
- A Linear issue has `needs-plan`.
- Work touches UX, flow, API, storage, schema, permissions, release, or architecture.

Small documentation-only or mechanical edits may proceed without a plan if the reason is stated.

## Required Context

1. `AGENTS.md`
2. Relevant `PUP-___` Linear issue or explicit no-Linear exception
3. Relevant PRD section
4. Relevant `DESIGN.md` section
5. Relevant `docs/architecture/*.md`
6. Related ADRs
7. `docs/agents/context-engineering.md`
8. Existing files/tests once code exists

Ask one blocking question if acceptance, privacy/security constraints, or schema scope is unclear.

## Exploration

Explore before writing the plan:

- Architecture and ownership boundaries
- Data flow and trust boundaries
- Reuse and dependency impact
- Privacy, RLS, accessibility, performance, release, and platform risks

Claude Code may use parallel exploration subagents if available. Codex must not spawn subagents unless the user explicitly asked for parallel agent work; otherwise do the exploration locally with `rg`, file reads, and tool observations.

## Plan Shape

Copy `docs/plans/TEMPLATE-feature-plan.md` to `docs/plans/YYYY-MM-DD-<topic>.md`.

Fill in:

- Goal and architecture fit
- Linear issue and Linear `gitBranchName`
- Primary source docs
- Context package and context placement
- Goals and non-goals
- Locked decisions
- Invariants mapped to tests
- File map grouped by ownership boundary
- Phases ordered trust-first
- Verification commands and evidence expectations
- Risks, approvals, rollout, and changelog

## Trust-First Phase Order

Use this order unless the plan explains why not:

1. Contracts and business rules
2. Storage, migrations, generated DB types, and RLS tests
3. Edge Functions and privileged server logic
4. Query hooks and cache behavior
5. Feature UI
6. Routes and providers in `app/`
7. Observability, analytics, and release gates

Each phase must be small, reviewable, and independently verifiable.

## Rules

- Do not invent paths that do not exist; mark speculative paths clearly.
- Do not bypass ADR-0007 for schema changes beyond PRD section 6.10.
- Do not implement code during planning unless the user explicitly asks to continue into implementation.
- Do not use Linear documents as the only source of product, schema, security, or architecture truth.

## Output

After writing or updating the plan, summarize:

- Plan file
- Relevant Linear issue
- Key approach
- Phase list
- Open questions
- Verification expected
