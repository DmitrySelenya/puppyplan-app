# Agent Company Setup - Implementation Plan

> For implementation agents: use repo `AGENTS.md`, `docs/agents/00-operating-model.md`, `docs/agents/linear-workflow.md`, and `docs/agents/context-engineering.md` before changing workflow or task-tracking rules.

**Goal:** Establish PuppyPlan as an agent-first project where Linear tracks operational work, GitHub tracks code review and CI, and repo docs remain the canonical knowledge base.

**Architecture:** This is a documentation and workflow setup. It does not change product scope, app runtime, Supabase schema, CI, or release behavior.

**Linear:** `PUP-1` tracks this repo-side agent operating model cleanup and has no remaining plan-owned checklist items after this pass. `PUP-6` separately tracks first-PR GitHub integration verification. Project `PuppyPlan MVP` is the operational Linear project.

**Primary source docs:**
- Project rules: `AGENTS.md`
- Agent guide: `docs/architecture/18-ai-agent-guide.md`
- Agent docs: `docs/agents/00-operating-model.md`, `docs/agents/linear-workflow.md`, `docs/agents/context-engineering.md`
- Project skills: `.agents/README.md`, `.agents/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md`

---

## Context

The repo is documentation-first. There is no Expo app scaffold, package scripts, CI, or Supabase scaffold yet.

Linear team `PUP` / PuppyPlan exists and owns the `PuppyPlan MVP` project. PuppyPlan implementation work must use `PUP-___` issues.

## Goals

1. Add durable agent operating rules.
2. Add Linear workflow rules for team `PUP` and project `PuppyPlan MVP`.
3. Add context engineering and handoff rules.
4. Redirect GitHub Issues away from internal task intake.
5. Remove old project-specific wording caught by the setup verification.

## Non-Goals

- Do not create PuppyPlan tasks in any non-PUP Linear team.
- Do not create a GitHub PR, commit, push, branch protection, or remote repository mutation.
- Do not add package scripts, app scaffold, CI, Supabase schema, or release automation.
- Do not configure Linear GitHub integration through remote settings in this pass.

## Implementation Checklist

- [x] Update `AGENTS.md` with Linear operating rules.
- [x] Update `CLAUDE.md` with the Linear/GitHub/docs split.
- [x] Add `docs/agents/00-operating-model.md`.
- [x] Add `docs/agents/linear-workflow.md`.
- [x] Add `docs/agents/context-engineering.md`.
- [x] Update `.github/PULL_REQUEST_TEMPLATE.md`.
- [x] Update `docs/plans/TEMPLATE-feature-plan.md`.
- [x] Add `.github/ISSUE_TEMPLATE/config.yml`.
- [x] Add discovery links from `README.md` and `docs/architecture/18-ai-agent-guide.md`.
- [x] Generalize old provider/project-specific wording in architecture docs.
- [x] Create Linear team `PUP`.
- [x] Create Linear project `PuppyPlan MVP`.
- [x] Create Linear labels from `docs/agents/linear-workflow.md`.
- [x] Create Linear hub document `PuppyPlan Agent Operating System`.
- [x] Create starter Linear issues.
- [x] Add canonical cross-agent project skills under `.agents/skills/`.
- [x] Convert `.claude/skills/*` to thin adapters over `.agents/skills/*`.

## Follow-Up Checklist

Tracked outside `PUP-1`:

- [ ] `PUP-6`: Verify Linear GitHub integration for `DmitrySelenya/puppyplan-app` with the first approved branch/PR.

## Verification

- Legacy project/provider wording scan over `AGENTS.md`, `CLAUDE.md`, `docs`, and `.github`.
  - Result: no legacy project/provider matches. One intentional product-scope match remains in `docs/architecture/01-principles-and-scope.md` because PuppyPlan explicitly excludes that app category.
- `rg -n "PUP-|Linear|context package|agent-ready" AGENTS.md CLAUDE.md docs .github`
  - Result: expected matches in agent, PR, architecture, and plan docs.
- Project skills consistency scan over `.agents`, `.claude`, `AGENTS.md`, `CLAUDE.md`, and `docs/agents`.
  - Result: no stale branch convention or old project-specific matches.
- `git diff --check`
  - Result: passed.
- `rg -n "[ \t]+$" AGENTS.md CLAUDE.md README.md .github docs/agents docs/plans/TEMPLATE-feature-plan.md docs/plans/2026-05-21-agent-company-setup.md docs/architecture/01-principles-and-scope.md docs/architecture/14-feature-flags-and-entitlements.md docs/architecture/18-ai-agent-guide.md docs/architecture/19-future-roadmap.md docs/architecture/_meeting/CONFLICTS.md docs/architecture/adr/0013-feature-flags-and-entitlements.md docs/architecture/diagrams/01-system-context.mmd`
  - Result: no matches.
- `test -f package.json && echo package.json-present || echo package.json-missing`
  - Result: `package.json-missing`; no npm checks are available yet.

## Linear Setup

Created:

- Team: `PUP` / PuppyPlan
- Project: `PuppyPlan MVP`
- Hub document: `PuppyPlan Agent Operating System`
- Milestones: `Agent OS and Repo Hygiene`, `Expo App Scaffold`, `Supabase Contracts and RLS`, `Quick Log MVP`, `CI and Release Gates`
- Starter issues: `PUP-1` through `PUP-6`

Remaining blocker:

- GitHub integration verification for `DmitrySelenya/puppyplan-app` is tracked in `PUP-6`.

## Changelog

- 2026-05-21: Added agent operating model, Linear workflow, context engineering docs, GitHub issue redirect, PR/plan template updates, and architecture wording cleanup.
- 2026-05-21: Completed Linear setup after team `PUP` was created: project, hub document, milestones, and `PUP-1` through `PUP-6`.
- 2026-05-21: Tightened repo workflow docs from the pipeline review: fixed branch convention, no-Linear exception reason, solo-dev review gate, and Linear issue/plan/PR context placement.
- 2026-05-21: Aligned branch convention with Linear `gitBranchName` and changed GitHub integration work from setup to first-PR verification.
- 2026-05-21: Added canonical `.agents/skills` workflows and converted `.claude/skills` into adapters so Claude and Codex use one project process source.
- 2026-05-21: Clarified that `PUP-1` has no remaining plan-owned checklist items and `PUP-6` owns first-PR GitHub integration verification.
