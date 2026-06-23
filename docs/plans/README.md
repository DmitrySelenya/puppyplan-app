# Plans

Use this directory as the implementation-plan index for PuppyPlan.

- `active/` contains plans with remaining plan-owned work. Give agents tasks from this folder.
- `completed/` contains plans whose plan-owned checklist is done, or whose remaining work has been moved to a separate active plan or Linear issue.
- `TEMPLATE-feature-plan.md` is the source template for new plans.

Blocked or paused work stays in `active/` with a clear `Status` and next action. Move a plan to `completed/` only when a new agent should not continue from it.

## Current Plans

| Status | Plan | Linear | Current phase / next action |
| --- | --- | --- | --- |
| Active task plan | [Redesign V2 Intake](active/2026-06-22-redesign-v2-intake.md) | no-Linear exception | Phase 0 locked `docs/design/v2`; next action is Phase 1 foundation sync, then scoped taxonomy propagation only |
| Active task plan | [Isolated Spec-Driven TDD Workflow](active/2026-06-14-isolated-tdd-workflow.md) | `PUP-25` | Complete locally; deep-review fixes verified in visible review workspace; no push/PR/release action |
| Active follow-up plan | [Design Fidelity UX Audit](active/2026-06-13-design-fidelity-ux-audit.md) | `PUP-22`, `PUP-23` | Retargeted to V2 intake; H1-H7 triaged against `docs/design/v2`, with full re-skin work out of this branch |
| Active task plan | [PUP-22/PUP-23 Today, Quick Log Details, Timeline](active/2026-06-12-pup-22-23-today-quicklog-timeline.md) | `PUP-22`, `PUP-23` | PUP-22 and PUP-23 locally committed; final local gates passed, with approved-SE simulator smoke/Dynamic Type blocked by XcodeBuildMCP build launch failure |
| Active task plan | [Post-PUP-18 Next Batch](active/2026-06-08-post-pup-18-next-batch.md) | `PUP-19`, `PUP-20`, `PUP-21` | `PUP-19` and `PUP-20` are locally complete/in review. `PUP-21` local implementation, both development selected-tracker migrations, runtime RLS/constraint verification, remote typegen, and SE emulator repair flow are complete on `PuppyPlan Dev` after approved `quick_tracker_ids`; production database setup/migration verification is deferred until release readiness after exact production Supabase approval, and native generated warnings remain a release-signoff decision |
| Active roadmap | [Full PRD Native App Master Roadmap](active/2026-05-29-full-prd-native-app-master-roadmap.md) | `PUP-17` | Merged via PR #17; use the Post-PUP-18 Next Batch plan for the current `PUP-19`/`PUP-20`/`PUP-21` split |
| Active roadmap | [Architecture Foundation Roadmap](active/2026-05-21-phase-0-architecture-cleanup.md) | Split through `PUP-2`, `PUP-3`, `PUP-4`, `PUP-5`, and follow-up issues | Do not assign directly; scaffold, Supabase/RLS, local/CI gates, design runtime, typed i18n, and the Quick Log implementation chain are complete; keep only release/privacy follow-ups active |
| Active follow-up plan | [Design Handoff And Agent Gallery](active/2026-05-21-design-handoff-agent-gallery.md) | `PUP-7`, `PUP-8`, `PUP-9`, `PUP-10` | Phases 1-5 and 6A are complete; only EN/RU/ES Dynamic Type screenshots and the dev-only design gallery remain as scoped follow-up work |
| Completed | [Agent Infra: design-fidelity skill + docs/INDEX.md](completed/2026-06-14-agent-design-fidelity-skill-docs-index.md) | no-Linear exception | Repo-local `design-fidelity` skill, Claude adapter, and docs task router are complete; `npm run check` passed locally on 2026-06-14 |
| Completed | [PUP-18 Auth, Identity, Session Persistence, And New-User Bootstrap](completed/2026-05-30-pup-18-auth-identity-session.md) | `PUP-18` | Merged via PR #18; manual email OTP smoke passed on `Grith iPhone SE 3 iOS 26.3` on 2026-06-08; final evidence mirrored to Linear comment `4f5f0f99-ba46-47cf-b86d-342d7e128b26` |
| Completed | [PUP-16 Quick Log Privacy-Safe Analytics And Observability](completed/2026-05-28-pup-16-quick-log-privacy-safe-analytics-observability.md) | `PUP-16` | Merged via PR #16; Quick Log privacy-safe analytics and observability are complete |
| Completed | [PUP-15 Today/Timeline Quick Log State Integration](completed/2026-05-27-pup-15-today-timeline-quick-log-state-integration.md) | `PUP-15` | Merged via PR #15; Today and Timeline Quick Log pending/failed state integration is complete |
| Completed | [PUP-14 Quick Log Sheet UI And Interaction States](completed/2026-05-27-pup-14-quick-log-sheet-ui.md) | `PUP-14` | Merged via PR #12; Quick Log sheet UI, interaction states, global Snackbar, and CI guardrails are complete |
| Completed | [PUP-13 Quick Log Mutation Cache Lifecycle](completed/2026-05-26-pup-13-quick-log-mutation-cache.md) | `PUP-13` | Merged via PR #11; mutation/cache lifecycle and deep-review follow-ups implemented and verified |
| Completed | [PUP-12 Quick Log Queue Core](completed/2026-05-26-pup-12-quick-log-queue-core.md) | `PUP-12` | Merged via PR #10; local queue core implemented and verified |
| Completed | [PUP-5 Quick Log MVP](completed/2026-05-25-quick-log-mvp.md) | `PUP-5` | Planning-only contract completed; implementation finished through `PUP-11` to `PUP-16` |
| Completed | [PUP-3 Supabase Contracts And RLS Baseline](completed/2026-05-24-pup-3-supabase-contracts-rls-baseline.md) | `PUP-3` | Merged via PR #7; Supabase contracts, RLS baseline, non-production dev migrations, generated DB types, local checks, and GitHub remote Supabase gate are complete |
| Completed | [PUP-4 Test Harness And Local Gates](completed/2026-05-23-pup-4-test-harness-local-gates.md) | `PUP-4` | Merged via PR #3; local harness, PR metadata CI, `npm run check`, privacy scan, text hygiene, i18n placeholders, tab-layout coverage, and deep-review fixes are in `main` |
| Completed | [Scaffold Expo App Baseline](completed/2026-05-22-scaffold-expo-app-baseline.md) | `PUP-2` | Merged via PR #2; local scaffold implemented and verified |
| Completed | [Agent Company Setup](completed/2026-05-21-agent-company-setup.md) | `PUP-1` | Closed; `PUP-6` later verified Linear/GitHub integration through PR #5 |

## Execution Order

1. Execute foundation roadmap items only through scoped Linear issues. `PUP-2`, `PUP-3`, `PUP-4`, and `PUP-5` are complete.
2. Treat `PUP-11` through `PUP-16` as the completed Quick Log implementation chain.
3. Treat `PUP-18` as the completed auth/session foundation; downstream production work may consume the real session actor.
4. Use [Post-PUP-18 Next Batch](active/2026-06-08-post-pup-18-next-batch.md) for `PUP-21` local/dev review handoff. `PUP-19` created the Linear split and route/state coverage map, `PUP-20` added the synthetic dev-gallery lane, and `PUP-21` has local care-context implementation plus development schema verification and SE emulator repair evidence after approved `quick_tracker_ids`. The follow-up non-empty selected-tracker migration was applied to `PuppyPlan Dev` after exact dev apply approval and focused runtime evidence passed. Production Supabase setup is a future release-readiness task after exact production Supabase approval, not a current development prerequisite; native generated warnings remain tracked in the plan evidence.
5. Keep the remaining `PUP-7` design follow-ups separate: EN/RU/ES Dynamic Type screenshots and the in-app design gallery.
6. Re-run `PUP-7` screenshot/package checks whenever the raw design export changes.
7. Release/privacy gates that are not already covered by `PUP-4`/`PUP-3` should become separate Linear issues, not part of feature implementation.

## Maintenance Rules

- New implementation plans go in `docs/plans/active/YYYY-MM-DD-<topic>.md`.
- Each plan must include a top-level `**Status:** Active` or `**Status:** Completed` line.
- Use `**Plan type:** ...` when an active document is a roadmap, task plan, or reference plan.
- Current-plan table status labels are intentionally limited to: `Active task plan`, `Active roadmap`, `Active follow-up plan`, and `Completed`.
- Each active task plan should include a top-level `**Current phase:** ...` line when it has multiple phases. Active roadmaps should include `**Current execution:** ...` instead.
- When the final plan-owned checklist item is done, move the file from `active/` to `completed/`, update `Status`, and update this index.
- If only a follow-up remains and it is tracked by a different Linear issue or plan, record that handoff before moving the original plan to `completed/`.
