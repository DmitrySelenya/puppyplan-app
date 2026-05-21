# Plans

Use this directory as the implementation-plan index for PuppyPlan.

- `active/` contains plans with remaining plan-owned work. Give agents tasks from this folder.
- `completed/` contains plans whose plan-owned checklist is done, or whose remaining work has been moved to a separate active plan or Linear issue.
- `TEMPLATE-feature-plan.md` is the source template for new plans.

Blocked or paused work stays in `active/` with a clear `Status` and next action. Move a plan to `completed/` only when a new agent should not continue from it.

## Current Plans

| Status | Plan | Linear | Current phase / next action |
| --- | --- | --- | --- |
| Active roadmap | [Architecture Foundation Roadmap](active/2026-05-21-phase-0-architecture-cleanup.md) | Split through `PUP-2`, `PUP-3`, `PUP-4`, and follow-up issues | Do not assign directly; use it as the dependency map for scaffold, Supabase/RLS, Quick Log, and release gates |
| Active task plan | [Design Handoff And Agent Gallery](active/2026-05-21-design-handoff-agent-gallery.md) | `PUP-7` | Phases 1-3 can run now; Phases 4-7 wait for Expo scaffold/package scripts from the foundation roadmap |
| Completed | [Agent Company Setup](completed/2026-05-21-agent-company-setup.md) | `PUP-1` | Closed; `PUP-6` separately tracks first-PR GitHub integration verification |

## Execution Order

1. Run `PUP-7` from the Design Handoff plan for Phases 1-3: raw design intake, manifest/screen inventory, and screenshot atlas.
2. Run the foundation roadmap only through scoped Linear issues. `PUP-2` owns the Expo scaffold prerequisite needed by later design runtime work.
3. After the Expo scaffold and package scripts exist, continue or split `PUP-7` Phases 4-7: token generation, native design primitives, i18n/string-budget checks, and the in-app design gallery.
4. Supabase/RLS, Quick Log queue, and release/privacy gates should be assigned from the foundation roadmap as separate Linear issues, not mixed into `PUP-7`.

## Maintenance Rules

- New implementation plans go in `docs/plans/active/YYYY-MM-DD-<topic>.md`.
- Each plan must include a top-level `**Status:** Active` or `**Status:** Completed` line.
- Use `**Plan type:** ...` when an active document is a roadmap, task plan, or reference plan.
- Each active task plan should include a top-level `**Current phase:** ...` line when it has multiple phases. Active roadmaps should include `**Current execution:** ...` instead.
- When the final plan-owned checklist item is done, move the file from `active/` to `completed/`, update `Status`, and update this index.
- If only a follow-up remains and it is tracked by a different Linear issue or plan, record that handoff before moving the original plan to `completed/`.
