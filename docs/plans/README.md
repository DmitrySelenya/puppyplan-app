# Plans

Use this directory as the implementation-plan index for PuppyPlan.

- `active/` contains plans with remaining plan-owned work. Give agents tasks from this folder.
- `completed/` contains plans whose plan-owned checklist is done, or whose remaining work has been moved to a separate active plan or Linear issue.
- `TEMPLATE-feature-plan.md` is the source template for new plans.

Blocked or paused work stays in `active/` with a clear `Status` and next action. Move a plan to `completed/` only when a new agent should not continue from it.

Every file in `active/` must have a row in the Current Plans table below (enforced by `scripts/checks/check-plans-index.mjs` via `npm run check`).

## Current Plans

| Status | Plan | Linear | Current phase / next action |
| --- | --- | --- | --- |
| Active task plan | [Diary — Take A Routine Mark Back Off](active/2026-07-15-diary-uncheck-routine.md) | `PUP-33` | Phase 1 complete; check → uncheck → re-check verified on the SE against a burned slot |
| Active task plan | [Diary Telegram Parity — Make Real Logging Faster Than The Chat](active/2026-07-13-diary-telegram-parity.md) | `PUP-33` | Phase 0 — scoped duplicate fix implemented locally; owner-device legacy discard + fresh check-off and 20+ event verification remain |
| Active task plan | [Dogfood Device Handoff — From Green Simulator To Two Household iPhones](active/2026-07-12-dogfood-device-handoff.md) | `PUP-32`, `PUP-30` physical acceptance | Phase 3 complete; awaiting owner two-iPhone install and open 8-item physical checklist in Phase 4 |
| Active task plan | [Dogfood Core Loop — Quick Capture, Routine, Diary, Notifications](active/2026-07-11-dogfood-core-loop.md) | `PUP-29`, revised `PUP-31`, `PUP-30`, `PUP-32` | Phases 0–8 complete in the working tree; device/physical follow-up moved to the 2026-07-12 handoff plan |
| Active reference | [Dogfooding Readiness — Schedule, Notifications, Backdating, Install](active/2026-07-10-dogfooding-readiness.md) | `PUP-28`..`PUP-32` | Historical completed PUP-28/PUP-30 evidence; unfinished execution is superseded by the 2026-07-11 core-loop plan |
| Active follow-up plan | [Release Readiness — Deferred Gates Aggregator](active/2026-07-07-release-readiness.md) | no-Linear exception (aggregator) | Owns all deferred release/production/verification gates; each executed item gets its own issue |
| Active task plan | [Health Offline Outbox](active/2026-07-04-health-offline-outbox.md) | no-Linear exception | Phase 5 — core complete locally; mutation-path wiring (enqueue-on-failure) in progress |
| Active task plan | [V2 Tombstone RLS Follow-Up](active/2026-07-03-v2-tombstone-rls-follow-up.md) | no-Linear exception | Event Log follow-up complete locally; commit pending |
| Active task plan | [V2 Nav Capsule + Morphing Add](active/2026-06-30-v2-nav-capsule.md) | Codex plan | CapsuleTabBar merged; 3 checklist items remain — verify and close |
| Active follow-up plan | [V2 Screen Polish Backlog](active/2026-06-30-v2-screen-polish-backlog.md) | Codex backlog | Screen-level P1/P2 fixes from the 2026-06-30 simulator walkthrough; execute after nav-capsule |
| Active follow-up plan | [V2 Nav Redesign — Coverage & Gaps](active/2026-06-29-v2-nav-redesign-gaps.md) | no-Linear exception | Live V2 coverage matrix + decisions; 3 open items; per-route evidence lives in the companion log |
| Active reference | [V2 Nav Redesign — Evidence Log](active/2026-06-29-v2-nav-redesign-gaps-evidence.md) | — | Append-only Stage-0 lock/handoff evidence (§8–§26), split from the gaps doc on 2026-07-07 |
| Active reference | [Diary/Pet Nav Design Brief](active/2026-06-27-diary-pet-nav-design-brief.md) | no-Linear exception | Design freeze (rev. 4); canonical V2 IA source together with ADR-0020 |
| Active reference | [Diary + Plan/Log Redesign Spec](active/2026-06-25-diary-plan-log-redesign.md) | no-Linear exception | Design locked (brainstorm); plan/fact model source for Diary work |
| Active reference | [Diary Cloud Design Prompt](active/2026-06-25-diary-cloud-design-prompt.md) | — | Prompt + Clay token extract for generating V2 screens in Claude Design |
| Active task plan | [Redesign V2 Intake](active/2026-06-22-redesign-v2-intake.md) | no-Linear exception | Phase 3 re-skin complete, Phase 7 hardening evidence recorded; all plan-owned checkboxes checked — review for closure |
| Active roadmap | [Redesign Resequencing](active/2026-06-17-redesign-resequencing.md) | no-Linear exception | Phase 3 — V2 intake underway; DEFER lane executes via the gaps coverage matrix and polish backlog |
| Active roadmap | [Full PRD Native App Master Roadmap](active/2026-05-29-full-prd-native-app-master-roadmap.md) | `PUP-17` | Superseded in part by the 2026-07-07 V2 override (ADR-0020, resequencing, gaps doc); phase scopes/invariants/approvals remain valid |

Completed plans live in [`completed/`](completed/) with their final status and merge evidence in each file's header; see the folder listing rather than a duplicated table here. Recent closures include [PUP-39 Agent-Friendly Design Tooling](completed/2026-07-21-agent-friendly-design-tooling.md) (feature commit `ba75981` merged into local `main` on 2026-07-22; no remote push), [PUP-36 UX-audit lifecycle fixes](completed/2026-07-19-ux-audit-lifecycle-fixes.md), the [Quick Log Durable-Write Lifecycle fix](completed/2026-07-19-quick-log-durable-write-lifecycle.md) (PUP-37, PR #34, 2026-07-20), PUP-33 Branch Closure + PUP-34 Routine Lifecycle Menu (PRs #32/#33, 2026-07-17), and Quick Note Capture + Backdating Overhaul (2026-07-14); the 2026-07-07 hygiene pass closed phase-0 architecture cleanup, design handoff/gallery (PUP-7), post-PUP-18 next batch (PUP-19/20/21), PUP-22/23 Today+QuickLog+Timeline, both V1 design-fidelity plans, isolated TDD workflow (PUP-25), and Diary week-strip day selection (PR #29). Their deferred tails moved to the Release Readiness aggregator.

## Execution Order

1. Foundation (`PUP-1`..`PUP-18`), the Quick Log chain (`PUP-11`..`PUP-16`), onboarding/care context (`PUP-19`..`PUP-21`), Today/Quick Log/Timeline (`PUP-22`/`PUP-23`), and Health (`PUP-25`) are complete; see `completed/`.
2. The V2 redesign governs current work: IA per ADR-0020 (`Diary | Pet | More` + central Add), execution order per the Redesign Resequencing plan, coverage per the V2 gaps doc.
3. Remaining feature slices (`PUP-26`..`PUP-32`: reminders, family/sitter, trainer/cards, More/settings, paywall shell) follow the resequencing NOW/DEFER split — trust layers first, screen work against the V2 atlas.
4. Release/production/verification debts are tracked exclusively in the Release Readiness aggregator; execute them only near release with exact approvals.

## Maintenance Rules

- New implementation plans go in `docs/plans/active/YYYY-MM-DD-<topic>.md`.
- Each plan must include a top-level `**Status:** Active` or `**Status:** Completed` line.
- Use `**Plan type:** ...` when an active document is a roadmap, task plan, or reference plan.
- Current-plan table status labels are intentionally limited to: `Active task plan`, `Active roadmap`, `Active follow-up plan`, `Active reference` (briefs, evidence logs, prompts), and `Completed`.
- Each active task plan should include a top-level `**Current phase:** ...` line when it has multiple phases. Active roadmaps should include `**Current execution:** ...` instead.
- When the final plan-owned checklist item is done, move the file from `active/` to `completed/`, update `Status`, and update this index.
- If only a follow-up remains and it is tracked by a different Linear issue or plan, record that handoff before moving the original plan to `completed/`. Release-relevant tails go to `active/2026-07-07-release-readiness.md`.
- Every file added to `active/` must be registered in the Current Plans table in the same change (`check-plans-index.mjs` fails `npm run check` otherwise).
