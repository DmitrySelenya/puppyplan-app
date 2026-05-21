# PuppyPlan Agent Operating Model

## Purpose

PuppyPlan is built for agent-first delivery. Agents can plan, implement, review, and verify work, but the system must stay legible through durable artifacts rather than chat memory.

The operating split is:

- **Linear:** operational tracker for tasks, status, priority, ownership, and acceptance criteria.
- **GitHub:** code, branches, pull requests, review, and CI evidence.
- **Repository docs:** canonical product, design, architecture, decisions, plans, runbooks, and verification rules.

If the same fact appears in multiple places, repo docs win for product and architecture. Linear wins for workflow state. GitHub wins for code review state.

## Agent Roles

- **Planner:** turns product intent into a scoped Linear issue and `docs/plans/` plan when UX, flow, API, storage, schema, permissions, release, or architecture changes are involved.
- **Implementer:** works one primary issue at a time, reads the context package, changes the smallest viable ownership area, updates tests and docs alongside code, and records verification.
- **Reviewer:** checks correctness, privacy, RLS, contracts, query invalidation, accessibility, i18n, platform risk, and whether required docs/ADRs changed.
- **Release/checks agent:** runs gates and prepares release evidence, but never performs release, deploy, production, store, Supabase production, git push, merge, tag, or other irreversible action without exact user approval.

These roles are modes of work, not permanent identities. A single agent may perform multiple roles only if it clearly separates planning, implementation, and review evidence.

For solo development, the final reviewer is the user. Agent self-review is useful evidence, but it does not close review gates or move critical work to `Done` by itself.

## Standard Workflow

1. Start from a `PUP-___` Linear issue unless the user explicitly declares a no-Linear exception.
2. Read `AGENTS.md`, the Linear issue, linked plan, relevant PRD/DESIGN/architecture/ADR docs, and feature-local `AGENTS.md` if one exists.
3. Build a context package: source docs, current files, constraints, acceptance criteria, risks, expected verification, and open questions.
4. Create or update a `docs/plans/YYYY-MM-DD-<topic>.md` plan for non-trivial UX, flow, API, storage, schema, permissions, release, or architecture changes.
5. Implement in a small diff. Keep one primary issue per branch and avoid cross-workstream edits unless a plan or ADR explains the boundary crossing.
6. Update the plan checklist/changelog, docs, ADRs, diagrams, i18n keys, contracts, migrations, generated types, and tests as needed.
7. Run targeted verification. Once scripts exist, prefer `npm run check` as the full local gate.
8. Put verification evidence in the PR and Linear issue. Move the issue to `In Review` only when the work is ready for review.

## Task Contract

Every non-trivial Linear issue and plan must include:

- **Goal:** user or system outcome.
- **Non-goals:** what is explicitly out of scope.
- **Constraints:** privacy, security, UX, compatibility, architecture, dependency, and no-refactor limits.
- **Acceptance:** concrete criteria that can be tested or manually verified.
- **Likely files:** expected ownership areas.
- **Verification:** commands, screenshots, RLS tests, migration checks, manual flows, or review steps.

An issue is `agent-ready` only when this contract is complete enough for an implementation agent to start without guessing.

Keep the Linear issue short: task contract, owner/status, blockers, and links. Keep the long-form implementation reasoning in `docs/plans/`. Keep final verification evidence in the PR and mirror only the concise result back to Linear.

## Approval Gates

Agents may read, search, plan, draft, and make scoped local file edits for approved work. Ask before:

- adding dependencies;
- changing schema beyond PRD section 6.10;
- changing architecture or external services;
- touching production configuration;
- running release, deploy, migration, store, git remote, or irreversible actions;
- exposing or moving any private user data.

Approval must name the exact action. A broad instruction such as "continue" or "finish everything" is not approval for release, production, or irreversible actions.

## Knowledge Base Rules

Create or update a repo document when a decision should survive chat history:

- `docs/plans/`: implementation contracts, task plans, and verification logs.
- `docs/architecture/`: durable technical architecture and cross-feature rules.
- `docs/architecture/adr/`: decisions that change architecture, schema baseline, external services, release policy, or security posture.
- `docs/agents/`: agent operating model, Linear workflow, context engineering, and handoff rules.
- `.agents/skills/`: canonical cross-agent workflows for planning, implementation, review, deep review, and TDD.

Create a Linear document only for a hub, status summary, meeting note, or index that points back to canonical repo docs. Do not let Linear pages become the only copy of product, schema, security, or architecture decisions.

## Handoff And Compaction

When pausing, handing work to another agent, or after a long context-heavy run, record:

- current objective and Linear issue;
- loaded instructions and source docs;
- active plan and phase;
- approvals granted or missing;
- files changed or intentionally left untouched;
- key decisions and risks;
- verification run and exact result;
- next recommended step.

Use `docs/agents/context-engineering.md` for the full context package and compaction template.
