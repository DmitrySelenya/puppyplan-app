---
name: design-fidelity
description: Use when building, editing, or reviewing any PuppyPlan screen, layout, or UI component (vyorstka) - routes to the mandatory Design Fidelity Pipeline before code, so the gate fires per-screen and pre-code, not as a later recovery pass.
---

# PuppyPlan Design Fidelity

This skill is a **router**, not a spec. The single source of truth is
`docs/agents/design-fidelity-pipeline.md`. Do not duplicate its rules here.

## Use When

- Building, editing, or reviewing any screen, layout, list, sheet, or UI component.
- Adding or changing a `src/design` primitive or variant.
- Any task that produces or reviews on-screen UI (вёрстка).

This skill is **complementary**: still run `plan` for non-trivial work and
`implement`/`tdd` for behavior. It does not replace them.

## Read First

1. `docs/agents/design-fidelity-pipeline.md` — the hard sequence and gates (canonical).
2. `DESIGN.md` — the relevant screen/section.
3. `docs/design/v1/manifest.json` + `docs/design/v1/screenshots/index.md` — atlas IDs, states, dimensions.
4. `docs/architecture/06-design-system-and-ui-contracts.md` — primitive/token contracts.

After reading those files, follow the pipeline doc exactly. This skill
intentionally does not summarize the stages, token rules, screenshot evidence,
privacy rules, or generic-design-tool boundaries; those rules stay in the
canonical docs above.

`AGENTS.md`, `docs/agents/design-fidelity-pipeline.md`, repo docs, and exact user
approvals override this skill.
