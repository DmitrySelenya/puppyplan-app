# PuppyPlan Agent Skills

This directory is the canonical cross-agent skill layer for PuppyPlan.

Use these skills before generic or personal skills when the task matches:

- `review`: quick review of local or branch changes.
- `review-deep`: multi-pass review for risky or cross-boundary work.
- `plan`: create a `docs/plans/YYYY-MM-DD-<topic>.md` plan.
- `implement`: execute an existing plan phase by phase.
- `tdd`: run a test-first loop for behavior changes.

## Agent Adapters

- Claude Code discovers `.claude/skills/*`; those files are thin adapters that point back here.
- Codex may not auto-discover repo-local skills. Codex must read the matching `.agents/skills/<name>/SKILL.md` manually when `AGENTS.md` says the project skill applies.
- Do not put PuppyPlan-specific rules in global user skills such as `~/.codex/skills` or `~/.claude/skills`; keep project behavior in this repo.

## Maintenance

Update the canonical skill here first. Adapter files should stay short and should not duplicate process rules.
