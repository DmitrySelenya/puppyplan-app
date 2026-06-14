# PuppyPlan Agent Operating Model

## Purpose

PuppyPlan is built for agent-first delivery. Agents can plan, implement, review, and verify work, but the system must stay legible through durable artifacts rather than chat memory.

The operating split is:

- **Linear:** operational tracker for tasks, status, priority, ownership, and acceptance criteria.
- **GitHub:** code, branches, pull requests, review, and CI evidence.
- **Repository docs:** canonical product, design, architecture, decisions, plans, runbooks, and verification rules.

If the same fact appears in multiple places, repo docs win for product and architecture. Linear wins for workflow state. GitHub wins for code review state.

## Agent Roles

- **Planner:** turns product intent into a scoped Linear issue and `docs/plans/active/` plan when UX, flow, API, storage, schema, permissions, release, or architecture changes are involved.
- **Implementer:** works one primary issue at a time, reads the context package, changes the smallest viable ownership area, updates tests and docs alongside code, and records verification.
- **Reviewer:** checks correctness, privacy, RLS, contracts, query invalidation, accessibility, i18n, platform risk, and whether required docs/ADRs changed.
- **Release/checks agent:** runs gates and prepares release evidence, but never performs release, deploy, production, store, Supabase production, git push, merge, tag, or other irreversible action without exact user approval.

These roles are modes of work, not permanent identities. A single agent may perform multiple roles only if it clearly separates planning, implementation, and review evidence.

For solo development, the final reviewer is the user. Agent self-review is useful evidence, but it does not close review gates or move critical work to `Done` by itself.

## Standard Workflow

1. Start from a `PUP-___` Linear issue unless the user explicitly declares a no-Linear exception.
2. Read `AGENTS.md`, the Linear issue, linked plan, relevant PRD/DESIGN/architecture/ADR docs, and feature-local `AGENTS.md` if one exists.
3. Move the Linear issue to `In Progress`, or add a comment explaining why the state is intentionally unchanged.
4. Build a context package: source docs, current files, constraints, acceptance criteria, risks, expected verification, and open questions.
5. Create or update a `docs/plans/active/YYYY-MM-DD-<topic>.md` plan for non-trivial UX, flow, API, storage, schema, permissions, release, or architecture changes.
6. Implement in a small diff. Keep one primary issue per branch and avoid cross-workstream edits unless a plan or ADR explains the boundary crossing.
7. Update the plan checklist/changelog, docs, ADRs, diagrams, i18n keys, contracts, migrations, generated types, and tests as needed. Mirror phase/checklist progress, blockers, and scope changes back to the Linear issue before ending the turn. Move completed plans to `docs/plans/completed/` and update `docs/plans/README.md`.
8. Run targeted verification. Once scripts exist, prefer `npm run check` as the full local gate.
9. For any UI, screen, design-system, visual-state, or navigation-surface work, complete the Design Fidelity Gate before treating the batch as done or starting the next roadmap batch.
10. Put verification evidence in the PR and Linear issue. Move the issue to `In Review` only when the work is ready for review.

## Design Fidelity Gate

This gate is mandatory for every batch that creates, changes, or claims completion for UI surfaces. Passing functional tests is not enough.

This gate is the post-build comparison stage (Stage 4) of the full **Design Fidelity Pipeline** in `docs/agents/design-fidelity-pipeline.md`, which is mandatory and starts **before code**. UI work must begin with a Stage 0 Design Lock (artboard IDs → states → device sizes → allowed deviations → screenshot refs + a per-screen spec card), build primitives-first, and add structural anatomy render tests, before this comparison runs. Run the comparison **per screen/state and before Done**, not as a batch-end audit.

- Identify every affected design artboard from `docs/design/v1/manifest.json` and `docs/design/v1/screenshots/index.md`.
- Confirm the current visual source is understood before implementation. The default source is `docs/design/v1/raw/PuppyPlan.html` plus the generated PNG atlas under `docs/design/v1/screenshots/`.
- If the repo source conflicts with a newer external design package, compare the files and record the decision. If the visual source cannot be resolved, stop and ask the user for exact screenshots or a fresh design export.
- Capture native screenshots for each affected screen/state on the approved local simulator profile. A user-approved larger device such as iPhone 16e may be used as an additional responsive check, but it does not replace the compact-device gate unless the user explicitly approves that exact substitution.
- Compare native screenshots against the matching atlas screenshots for layout, spacing, typography scale, colors, iconography, tab/FAB placement, copy hierarchy, loading/offline/error states, and interaction states.
- Record the result in the active plan and Linear: `PASS` only when the native app is visually aligned with the approved artboards, or `BLOCKED/FAIL` with exact mismatches and screenshots.
- Do not move the issue to `Done`, close the plan, or start the next roadmap batch while affected screens are visually off-mockup unless the user explicitly approves a named deviation.

Use synthetic data in screenshots. Do not put raw puppy names, private notes, real emails, provider names, photos, tokens, or production data into repo docs, Linear, PRs, screenshots, or logs.

## Task Contract

Every non-trivial Linear issue and plan must include:

- **Goal:** user or system outcome.
- **Non-goals:** what is explicitly out of scope.
- **Constraints:** privacy, security, UX, compatibility, architecture, dependency, and no-refactor limits.
- **Acceptance:** concrete criteria that can be tested or manually verified.
- **Likely files:** expected ownership areas.
- **Verification:** commands, screenshots, RLS tests, migration checks, manual flows, or review steps.

An issue is `agent-ready` only when this contract is complete enough for an implementation agent to start without guessing.

Keep the Linear issue short but current: task contract, owner/status, active phase, blockers, concise progress, verification evidence, and links. Keep the long-form implementation reasoning in `docs/plans/`.

## Approval Gates

Agents may read, search, plan, draft, and make scoped local file edits for approved work. Ask before:

- adding dependencies;
- changing schema beyond the ADR-0007 schema baseline / PRD §6 "Модель Данных";
- changing architecture or external services;
- touching production configuration;
- running release, deploy, migration, store, git remote, or irreversible actions;
- exposing or moving any private user data.

Approval must name the exact action. A broad instruction such as "continue" or "finish everything" is not approval for release, production, or irreversible actions.

## Knowledge Base Rules

Create or update a repo document when a decision should survive chat history:

- `docs/plans/active/`: implementation contracts, task plans, and verification logs with remaining plan-owned work.
- `docs/plans/completed/`: closed plans retained for history and handoff evidence.
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
