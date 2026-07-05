# V2 Redesign Stage-0 Lock Package
Date: 2026-06-30
Status: Stage-0 lock package for V2 redesign implementation planning.
Related plan: `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md`

## Source

- Current handoff artifact: Open Design project `2f60083d-2d0f-4fe1-8e71-c1c60951fb8c`, entry `index.html`.
- Preview URL: `http://127.0.0.1:49290/api/projects/2f60083d-2d0f-4fe1-8e71-c1c60951fb8c/raw/index.html`.
- Verified artifact inventory: 88 boards, 176 iOS/Android previews, 9 sections, 0 render failures in the local JS render smoke check.
- Repo atlas fallback: `docs/design/v1/manifest.json` and `docs/design/v1/screenshots/index.md`.
- Canon docs: `DESIGN.md`, `puppyplan-prd-v2.md`, `docs/architecture/14-feature-flags-and-entitlements.md`, and `docs/architecture/06-design-system-and-ui-contracts.md`.

## Device Sizes

- Primary implementation comparison: compact iPhone SE profile per `AGENTS.md`.
- Design previews: iOS 390x844 and Android 412x900 in the Open Design handoff.
- Legacy atlas refs: 393x852 for most v1 screens, with wider reference boards where noted.

## Allowed Deviations

- Legacy v1 atlas screens may retain historical Today/Health/Timeline naming only as fallback references. V2 implementation uses `Diary | Pet | More` plus separate Add.
- Sharing, sitter, trainer, and revoked-access boards marked `Carry-over` are scope-complete but still require final Clay visual refresh before native implementation.
- Starter Guidance is retained only as deferred reference; no Guidance tab or library is implemented in this wave.
- Monetization enforcement is not live in this wave. Paywall, trial status, and soft-lock are feature-flagged design/entitlement shell surfaces.

## Locked Board Inventory

| Section | Boards | Spec card |
| --- | ---: | --- |
| Foundation & contracts | 4 | `00-foundation-contracts.md` |
| Navigation & Add | 2 | `01-navigation-add.md` |
| Onboarding | 9 | `02-onboarding-flow.md` |
| Diary | 14 | `03-diary-core-states.md` |
| Quick Log, routines & reminders | 17 | `04-quick-log-routines-reminders.md` |
| Pet & health | 7 | `05-pet-health.md` |
| More, privacy, paywall & soft-lock | 13 | `06-more-privacy-paywall.md` |
| Sharing, sitter, trainer & cards | 21 | `07-sharing-access-cards.md` |
| Deferred reference | 1 | `08-deferred-reference.md` |

## Implementation Gate

- No native UI coding should start for a screen until its route-specific anatomy is derived from the relevant spec card below.
- If a route needs more precision than the section spec provides, split the relevant section card into a route-specific file before coding.
- Stage-3 anatomy tests and Stage-4 native screenshot comparison must cite this package and the route-specific spec file.

## Route-Specific Locks

- `/diary` route: `03-diary-route.md` (created 2026-06-30 from the Diary section card and the
  Open Design 88-board handoff).
