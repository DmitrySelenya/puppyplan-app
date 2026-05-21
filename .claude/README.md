# Claude adapters for PuppyPlan

Canonical project skills live in `.agents/skills/`.

Claude Code discovers `.claude/skills/*`; those files are adapters that tell Claude to load the matching canonical skill. Do not duplicate workflow rules here.

## Layout

```text
.claude/
  skills/               # Claude adapters only
  work/                 # gitignored, per-machine working notes
  settings.local.json   # gitignored, per-machine permissions / MCP toggles
.agents/
  skills/               # canonical cross-agent skills
```

## Rules

- Edit `.agents/skills/<name>/SKILL.md` first.
- Keep `.claude/skills/<name>/SKILL.md` short: frontmatter plus a pointer to `.agents/skills/<name>/SKILL.md`.
- Skills must respect `AGENTS.md`, Linear `PUP-___`, Linear-generated `gitBranchName`, repo docs, privacy rules, and the Release Guardrail.
- Local notes, permissions, MCP toggles, and scratch work stay untracked.
