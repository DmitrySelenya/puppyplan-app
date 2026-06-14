# Agent Infra: design-fidelity skill + docs/INDEX.md - Implementation Plan

> Agent-infra / docs-only change. No product code, no contracts, schema, RLS, or UI behavior changes.
> Living document: update as wiring changes.

**Goal:** Make PuppyPlan's existing (mandatory) Design Fidelity Pipeline fire *earlier* in the agent flow by exposing it as a repo-local skill, and give agents a single task-routing map (`docs/INDEX.md`) so they read the right canonical docs before starting work.

**Status:** Completed.

**Current phase:** Complete — all phases shipped, guardrails green.

**Architecture fit:** Pure agent-infra. Follows the established skill convention (canonical in `.agents/skills/`, thin adapter in `.claude/skills/`). Single source of truth for design rules stays `docs/agents/design-fidelity-pipeline.md`; the skill routes to it and does not duplicate it.

**Linear:** no-Linear exception - internal agent tooling, same class as `docs/plans/completed/2026-05-21-agent-company-setup.md`. User approved this work directly.

**Branch:** N/A (work off `main` per repo convention for agent-infra docs).

**Primary source docs:**
- `AGENTS.md` - Project Skills section, Source Of Truth section
- `CLAUDE.md` - Must Follow / Workflow
- `docs/agents/design-fidelity-pipeline.md` - the canonical pipeline the skill routes to
- `docs/agents/context-engineering.md` - Skills And Tools rules
- `.agents/skills/plan/SKILL.md` + `.claude/skills/plan/SKILL.md` - adapter pattern to mirror

---

## Context

Why this is worth doing (grounded, not speculative):

- The design pain was a *timing* problem, not a missing-rules problem: `design-fidelity-pipeline.md` itself states "The problem was never missing rules. The problem was **when and how** the gate fired." A rule in `AGENTS.md`/`CLAUDE.md` only fires if the agent recalls it; a skill `description:` is surfaced by the `using-superpowers` gate *before* the agent acts. So a skill improves the trigger timing for exactly the workflow that already showed real pain.
- The source repo (`mens-mental-health-mobile`) had **no** design skill to port - it shipped only `plan/implement/tdd/review/review-deep`, which puppy_app already has and improved. So this is a net-new, PuppyPlan-native skill, not a port.
- Generic design skills (`ui-ux-pro-max`, Figma skills) are harness/plugin-level and already available in every project. They stay as **idea references only**; PuppyPlan rules override them per `AGENTS.md` ("Use these project skills before generic or personal skills").
- There is no `docs/INDEX.md` / `docs/README.md` today. Agents face many entry doors (AGENTS.md, PRD, DESIGN.md, architecture, ADRs, agents docs, plans, atlas) and can read the wrong or stale one first.

---

## Goals

1. **`design-fidelity` skill (dual structure).**
   - Canonical `.agents/skills/design-fidelity/SKILL.md` + thin adapter `.claude/skills/design-fidelity/SKILL.md`, mirroring the `plan` skill exactly (Codex reads canonical manually; Claude discovers the adapter).
2. **`docs/INDEX.md` task-routing map.**
   - Short, link-only "doing X -> read Y" router, wired in from `AGENTS.md` and `CLAUDE.md` so it actually gets read.
3. **Wiring without drift.**
   - Register the skill in `AGENTS.md` Project Skills; add `docs/INDEX.md` as an entry point in `AGENTS.md` + `CLAUDE.md`. No content duplication of the pipeline or tokens.

---

## Non-Goals

- Not forking or editing the global `ui-ux-pro-max` skill.
- Not duplicating `design-fidelity-pipeline.md`, tokens, colors, spacing, or the atlas into the skill.
- Not a broad "use for all UI/UX/design" skill that would collide with `plan`/`tdd`/`review` - scope is PuppyPlan screen/layout/component build+review routing.
- Not the Maestro `tools/mobile-e2e/` toolkit (separately deferred until a stable dev build).
- Not a `project-graph-context` wrapper skill (deferred; the `AGENTS.md`/`context-engineering.md` rule already covers it).
- No `docs/INDEX.md` content that becomes a third competing master index over `AGENTS.md`/`CLAUDE.md` - it routes by task, it does not restate decisions.

---

## Decisions Locked In

1. **Skill name:** `design-fidelity` (not `xui-designer`/`puppyplan-ui`). Reason: narrow trigger, avoids collision with generic UI skills and with plan/tdd/review.
2. **Skill is a router, not a spec.** Reason: single source of truth stays `design-fidelity-pipeline.md`; prevents skill/doc drift.
3. **Dual `.agents` + `.claude` structure.** Reason: repo convention + Codex non-discovery (`AGENTS.md` Project Skills note).
4. **`docs/INDEX.md` is link-only and task-routed**, and is referenced from `AGENTS.md`/`CLAUDE.md`. Reason: an index nothing points to never gets read; restating decisions creates drift.

---

## File Map

### New - Skill (canonical + adapter)
- `.agents/skills/design-fidelity/SKILL.md` - canonical router to the pipeline
- `.claude/skills/design-fidelity/SKILL.md` - thin adapter (mirrors `.claude/skills/plan/SKILL.md`)

### New - Docs
- `docs/INDEX.md` - task-routing map

### Modified - Wiring
- `AGENTS.md` - add `design-fidelity` to Project Skills list + note; add `docs/INDEX.md` to entry-point block
- `CLAUDE.md` - add `docs/INDEX.md` pointer (Must Follow); note the `design-fidelity` adapter alongside the existing UI rule

### Not touched
- `docs/agents/design-fidelity-pipeline.md` (remains the single source of truth; skill points to it)
- Any product code, contracts, schema, RLS, tokens

---

## Skill content shape (canonical)

`description:` scoped tightly, e.g. "Use when building, editing, or reviewing any PuppyPlan screen, layout, or UI component (verstka) - routes to the mandatory Design Fidelity Pipeline before code."

Body (router only):
- **Use when:** any screen/layout/component build or UI review.
- **Read first:** `docs/agents/design-fidelity-pipeline.md`, `DESIGN.md`, `docs/design/v1/manifest.json` + `screenshots/index.md`, `docs/architecture/06-design-system-and-ui-contracts.md`.
- **No local rule summary:** do not restate hard sequence, token rules, screenshot evidence, privacy rules, or generic-design-tool boundaries here. The pipeline and linked canonical docs are the source of truth.

Adapter mirrors `.claude/skills/plan/SKILL.md` verbatim in shape, pointing at `../../../.agents/skills/design-fidelity/SKILL.md`.

---

## Phases

### Phase 0 - Lock scope (this plan)
- [x] User approves skill name, router-not-spec approach, and the AGENTS.md/CLAUDE.md edits.

### Phase 1 - Skill
- [x] Create `.agents/skills/design-fidelity/SKILL.md` (canonical router).
- [x] Create `.claude/skills/design-fidelity/SKILL.md` (adapter).

### Phase 2 - docs/INDEX.md
- [x] Create task-routing map (link-only, by task type).

### Phase 3 - Wiring
- [x] `AGENTS.md`: add skill to Project Skills; add `docs/INDEX.md` entry point.
- [x] `CLAUDE.md`: add `docs/INDEX.md` pointer; note `design-fidelity` adapter.

### Phase 4 - Verify
- [x] Adapter path resolves to the canonical file.
- [x] `npm run check` passes (no new strings/code; confirm doc/skill changes don't trip guardrails).
- [x] Grep confirms `docs/INDEX.md` is referenced from both AGENTS.md and CLAUDE.md.

---

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Skill over-triggers / collides with plan/tdd/review | Narrow `description:` scoped to PuppyPlan screens; name `design-fidelity`; body states it is complementary, not a replacement. |
| Skill drifts from the pipeline doc | Skill is a router with zero duplicated rules; pipeline doc stays the single source of truth. |
| `docs/INDEX.md` goes stale | Keep it short + link-only, no decisions; reference it from AGENTS.md/CLAUDE.md so it's maintained as a real entry point. |
| Index becomes a third competing master | It routes by task type only; AGENTS.md/CLAUDE.md remain the rule sources. |

---

## Verification Expected

- `npm run check`
- Manual: adapter -> canonical path resolves; AGENTS.md/CLAUDE.md link to `docs/INDEX.md`.

---

## Changelog

- 2026-06-14: Initial plan created (awaiting approval).
- 2026-06-14: Approved (name `design-fidelity`, minimal CLAUDE.md, routing-only INDEX). Shipped all phases:
  - Created `.agents/skills/design-fidelity/SKILL.md` (canonical router) + `.claude/skills/design-fidelity/SKILL.md` (adapter); skill now discovered by Claude Code.
  - Created `docs/INDEX.md` (task router, link-only).
  - Wired `docs/INDEX.md` into `AGENTS.md` (entry-point block) and `CLAUDE.md` (Must Follow); registered `design-fidelity` in `AGENTS.md` Project Skills; noted the skill on the CLAUDE.md UI rule.
  - Verified: adapter→canonical path resolves; `docs/INDEX.md` referenced from both AGENTS.md and CLAUDE.md; `npm run test:scaffold` green (navigation, i18n, scaffold, tokens, privacy scan, text hygiene all ok).
- 2026-06-14: Review follow-up complete. Closed the plan checklist, updated `Status` to the project `Completed` value, registered the completed plan in `docs/plans/README.md`, and added `design-fidelity` to `.agents/README.md`. Verification: `npm run check` passed locally.
- 2026-06-14: Confirmed review-drift follow-up. Removed hard-sequence/rule summaries from the canonical skill and updated this plan's skill-shape section so `design-fidelity` is router-only.
