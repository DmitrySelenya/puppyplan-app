# Plans

Use this directory as the implementation-plan index for PuppyPlan.

- `active/` contains plans with remaining plan-owned work. Give agents tasks from this folder.
- `completed/` contains plans whose plan-owned checklist is done, or whose remaining work has been moved to a separate active plan or Linear issue.
- `TEMPLATE-feature-plan.md` is the source template for new plans.

Blocked or paused work stays in `active/` with a clear `Status` and next action. Move a plan to `completed/` only when a new agent should not continue from it.

## Current Plans

| Status | Plan | Linear | Current phase / next action |
| --- | --- | --- | --- |
| Active roadmap | [Architecture Foundation Roadmap](active/2026-05-21-phase-0-architecture-cleanup.md) | Split through `PUP-2`, `PUP-3`, `PUP-4`, `PUP-5`, and follow-up issues | Do not assign directly; scaffold, Supabase/RLS, local/CI gates, Quick Log planning, and PUP-11 contracts are complete; continue with scoped Quick Log implementation issues |
| Active follow-up plan | [Design Handoff And Agent Gallery](active/2026-05-21-design-handoff-agent-gallery.md) | `PUP-7`, `PUP-8`, `PUP-9`, `PUP-10` | Phases 1-5 and 6A are complete; only EN/RU/ES Dynamic Type screenshots and the dev-only design gallery remain as scoped follow-up work |
| Completed | [PUP-12 Quick Log Queue Core](completed/2026-05-26-pup-12-quick-log-queue-core.md) | `PUP-12` | Local queue core implemented and verified; issue remains `In Progress` until commit/push/PR approval |
| Completed | [PUP-5 Quick Log MVP](completed/2026-05-25-quick-log-mvp.md) | `PUP-5` | Planning-only contract completed; implementation split into `PUP-11` through `PUP-16`, with `PUP-11` as the first coding issue |
| Completed | [PUP-3 Supabase Contracts And RLS Baseline](completed/2026-05-24-pup-3-supabase-contracts-rls-baseline.md) | `PUP-3` | Merged via PR #7; Supabase contracts, RLS baseline, non-production dev migrations, generated DB types, local checks, and GitHub remote Supabase gate are complete |
| Completed | [PUP-4 Test Harness And Local Gates](completed/2026-05-23-pup-4-test-harness-local-gates.md) | `PUP-4` | Merged via PR #3; local harness, PR metadata CI, `npm run check`, privacy scan, text hygiene, i18n placeholders, tab-layout coverage, and deep-review fixes are in `main` |
| Completed | [Scaffold Expo App Baseline](completed/2026-05-22-scaffold-expo-app-baseline.md) | `PUP-2` | Merged via PR #2; local scaffold implemented and verified |
| Completed | [Agent Company Setup](completed/2026-05-21-agent-company-setup.md) | `PUP-1` | Closed; `PUP-6` later verified Linear/GitHub integration through PR #5 |

## Execution Order

1. Execute foundation roadmap items only through scoped Linear issues. `PUP-2`, `PUP-3`, `PUP-4`, and `PUP-5` are complete.
2. Continue Quick Log implementation through `PUP-12` to `PUP-16` as dependencies are satisfied.
3. Keep the remaining `PUP-7` design follow-ups separate: EN/RU/ES Dynamic Type screenshots and the in-app design gallery.
4. Re-run `PUP-7` screenshot/package checks whenever the raw design export changes.
5. Release/privacy gates that are not already covered by `PUP-4`/`PUP-3` should become separate Linear issues, not part of Quick Log feature implementation.

## Maintenance Rules

- New implementation plans go in `docs/plans/active/YYYY-MM-DD-<topic>.md`.
- Each plan must include a top-level `**Status:** Active` or `**Status:** Completed` line.
- Use `**Plan type:** ...` when an active document is a roadmap, task plan, or reference plan.
- Current-plan table status labels are intentionally limited to: `Active task plan`, `Active roadmap`, `Active follow-up plan`, and `Completed`.
- Each active task plan should include a top-level `**Current phase:** ...` line when it has multiple phases. Active roadmaps should include `**Current execution:** ...` instead.
- When the final plan-owned checklist item is done, move the file from `active/` to `completed/`, update `Status`, and update this index.
- If only a follow-up remains and it is tracked by a different Linear issue or plan, record that handoff before moving the original plan to `completed/`.
