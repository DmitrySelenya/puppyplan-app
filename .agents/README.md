# PuppyPlan Agent Skills

This directory is the canonical cross-agent skill layer for PuppyPlan.

Use these skills before generic or personal skills when the task matches:

- `review`: quick review of local or branch changes.
- `review-deep`: multi-pass review for risky or cross-boundary work.
- `plan`: create a `docs/plans/active/YYYY-MM-DD-<topic>.md` plan.
- `implement`: execute an existing plan phase by phase.
- `tdd`: run a spec-driven test-first loop for behavior changes, bugfix regressions, and high-risk contract/RLS/privacy/query/Quick Log work.
- `design-fidelity`: route PuppyPlan screen, layout, component, and UI review work through the mandatory Design Fidelity Pipeline.

## Agent Adapters

- Claude Code discovers `.claude/skills/*`; those files are thin adapters that point back here.
- Codex may not auto-discover repo-local skills. Codex must read the matching `.agents/skills/<name>/SKILL.md` manually when `AGENTS.md` says the project skill applies.
- Do not put PuppyPlan-specific rules in global user skills such as `~/.codex/skills` or `~/.claude/skills`; keep project behavior in this repo.

## Maintenance

Update the canonical skill here first. Adapter files should stay short and should not duplicate process rules.

## TDD Assurance Modes

Use `.agents/skills/tdd/` for PuppyPlan behavior work instead of global skills.

- **Heavy/full-isolated:** required for new behavior, security/privacy/RLS, contracts, query/cache, Quick Log, i18n, design-fidelity, and cross-boundary changes.
- **Lightweight:** allowed only for small low-risk edits. If high-risk work lacks authorized isolation tooling, stop unless the user explicitly approves a lower-assurance lightweight run for that exact work; record the approval and reduced assurance in the plan and Linear.

Green tests are evidence, not proof. Hardcoded or lookup-table implementations can still pass unless negative, property-style, or mutation-style checks cover the risk.
