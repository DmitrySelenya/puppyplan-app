# Design Fidelity Recovery - Today, Quick Log, Timeline, Health, More

> Implementation agents: use `AGENTS.md`, `.agents/skills/implement`, `.agents/skills/tdd`, `.agents/skills/review`, and this plan task-by-task. This plan is historical recovery evidence for the V1 pass; new redesign intake acceptance now locks against `docs/design/v2/manifest.json` and `docs/design/v2/screenshots/index.md`.

**Goal:** Bring production-visible PuppyPlan native screens back into close visual and interaction alignment with the approved Claude Design / design atlas while preserving architecture boundaries and future design-editability.

**Status:** Completed (2026-07-07) as historical V1 evidence. Superseded by `2026-06-22-redesign-v2-intake.md` and the V2 gaps coverage doc; do not continue work from this plan.

**Current phase:** V1 Phase 6 complete; continue new work from `2026-06-22-redesign-v2-intake.md` and the V2 atlas.

**Linear:** Mirrored to `PUP-22` and `PUP-23` on 2026-06-13.

**Primary source docs:**
- `docs/design/v2/manifest.json`.
- `docs/design/v2/screenshots/index.md`.
- `docs/design/v2/README.md`.
- `DESIGN.md` sections 1.2, 2.2, 2.3, 2.4, 4.1, 4.4.
- `docs/design/v1/native-coverage.md` and `docs/design/v1/screenshots/index.md` as historical comparison only.
- `docs/architecture/05-navigation-and-deeplinks.md`.
- `docs/architecture/06-design-system-and-ui-contracts.md`.
- `docs/architecture/12-i18n-and-content.md`.
- `docs/architecture/17-testing-ci-release.md`.
- `docs/plans/active/2026-06-12-pup-22-23-today-quicklog-timeline.md`.

## Scope

- Today tab visual polish, including FAB/tab spacing and atlas-aligned card density.
- Quick Log sheet, tracker grid, duplicate warning, detail/slow/error variants.
- Timeline modal/list filters, event rows, status/action visibility, and empty states.
- More tab full settings list, settings routes, profile, and quick trackers.
- Health tab list/empty/edit shell using existing schema baseline only.
- Shared primitives needed to make future design changes localized: grouped rows, section headers, status/pending dots, avatar, empty states, form rows, and sheet affordances.
- Simulator visual evidence on the already approved/user-opened iPhone 16e and, if required by repo policy, the lightweight SE profile.

## Non-Goals

- New dependencies without explicit user approval.
- Schema changes, production Supabase writes, release actions, EAS/TestFlight, git remote mutation, or generated native project edits.
- ~~Custom-rendered primary tab bar.~~ (Superseded 2026-06-27 — a custom split tab bar is now allowed; see `2026-06-27-diary-pet-nav-design-brief.md` and the Veto Rules note in `docs/architecture/06-design-system-and-ui-contracts.md`.)
- Parallel `/more/*` edit routes duplicating the locked `/settings/*` namespace.
- Medical diagnosis, dosing, alarmist health copy, or fake production health/sharing data.

## Invariants

- `Today | Health | More` remain the only primary tabs.
- Quick Log remains a FAB/modal action, not a tab.
- Feature UI uses `src/design` primitives and typed i18n keys only.
- No raw colors, raw spacing, direct `Pressable`, feature-local icons, direct haptics, direct `Alert.alert`, or raw Supabase client imports in feature UI.
- No screenshots or docs include private puppy names, raw notes, emails, provider names, photos, or tokens.
- Health uses existing `public.health_record` baseline and wrappers; any contract/schema change stops for ADR-0007 approval.

## Phase 0 - Intake and Baseline Evidence

- [x] Read AGENTS, source docs, active PUP-22/PUP-23 plan, navigation and design-system architecture docs.
- [x] Run `git status --short --branch` and record baseline.
- [x] Run project graph doctor/status/related context for visual primitive blast radius.
- [x] Capture current simulator screenshots for Today, Quick Log, Timeline, Health, More, Puppy Profile, and Quick Trackers. Private puppy identity values were redacted from retained artifacts. Final evidence lives under `/tmp/puppyplan-design-fidelity-2026-06-13/after/`.
- [x] Record side-by-side atlas refs for: `3.1`, `4.1`, `4.2`, `4.4`, `4.5`, `4.6`, `5.1`, `5.2`, `5.4`, `11.1`, `11.6`, `14.1`, `14.2`, `14.3`.

## Phase 1 - Shared Design Primitives

- [x] Add failing render tests for grouped list/settings rows, section headers, avatar, empty state, status/pending dot, and sheet affordance behavior.
- [x] Extend `src/design/primitives` so More, Health, Timeline, Profile, and Quick Trackers can share atlas-aligned density and spacing.
- [x] Expand `AppIcon` coverage for design atlas row and tracker icons without adding feature-local SVGs.
- [x] Verify `npm run test:unit -- src/test/design-primitives.render.test.tsx`.

## Phase 2 - Navigation, FAB, and Sheet Shell

- [x] Add failing tests that preserve primary tabs, Quick Log FAB visibility rules, modal routes, and tab/FAB overlap guards.
- [x] Adjust tab/FAB/safe-area spacing in `app/(tabs)/_layout.tsx` and route options only.
- [x] Make Quick Log use a native/modal sheet presentation or the best dependency-free Expo Router equivalent; if true sheet behavior requires a dependency, stop for approval.
- [x] Verify route and tab tests plus `npm run test:scaffold`.

## Phase 3 - Today, Quick Log, and Timeline Fidelity

- [x] Today: fix layout density, card hierarchy, icon weights, Timeline entry, FAB non-overlap, and Dynamic Type layout.
- [x] Quick Log: match sheet anatomy, tracker tiles, duplicate warning, optional details states, slow-save/error states, and accessibility labels.
- [x] Timeline: remove always-visible destructive actions from normal synced rows, use overflow/non-swipe alternatives, align filters and row metadata with atlas, and make event icons deterministic from event type instead of localized title text.
- [x] Verify focused render/controller/query tests and capture simulator screenshots. Timeline sub-slice screenshot saved `/tmp/puppyplan-design-fidelity-2026-06-13/after/timeline-over-more-more-actions.jpg`; Today saved `/tmp/puppyplan-design-fidelity-2026-06-13/after/today-phase3-after.jpg`; Quick Log final saved `/tmp/puppyplan-design-fidelity-2026-06-13/after/quicklog-sheet-final-after.jpg`.

## Phase 4 - More and Settings Fidelity

- [x] More: implement atlas full list with locked `/settings/*` routes, deferred rows presented as unavailable/deferred where production behavior is not implemented.
- [x] Puppy Profile: add saved-view and edit-view shells that match atlas using existing profile fields; fields not backed by contracts remain disabled/synthetic until approved.
- [x] Quick Trackers: switch from tile grid to atlas-style settings list with toggles and reorder-ready affordances while preserving selected tracker persistence.
- [x] Verify More/Profile/Quick Tracker render tests and EN/RU/ES i18n parity.

## Phase 5 - Health Fidelity Without Schema Drift

- [x] Add Health render tests for mixed list rows and first-run empty state using safe fixtures.
- [x] Add query/wrapper surface only if required by existing `health_record` baseline; no schema changes. No query/wrapper change was required for the safe visual shell.
- [x] Implement neutral Health list/empty/edit shells with no diagnosis/dosing copy and no red alarm states.
- [x] Verify Health render tests, privacy/text hygiene, and Supabase boundary scans.

## Phase 6 - X-Ray Review and Final Verification

- [x] Run two independent UX/code review passes over the final UI diff and simulator evidence.
- [x] Run `npm run check`.
- [x] Run `npm run test:scaffold`.
- [x] Run simulator smoke on the user-opened iPhone 16e; also run the repo SE smoke if XcodeBuildMCP/defaults allow it.
- [x] Capture final screenshots and compare against atlas refs listed in Phase 0.
- [x] Update this plan changelog and mirror concise evidence to Linear once the issue id is confirmed.

## Atlas Comparison Matrix

Retained screenshots are local-only under `/tmp/puppyplan-design-fidelity-2026-06-13/after/` and `/tmp/puppyplan-design-fidelity-2026-06-14/after/`. Any screenshot that showed the local puppy identity was redacted before retention.

| Atlas ref | Surface/state | Evidence | Result |
| --- | --- | --- | --- |
| `3.1` | Today day 1 | `today-phase3-after.jpg`; `/tmp/puppyplan-design-fidelity-2026-06-14/after/se-today-launch-smoke-redacted.jpg` | Native iPhone 16e screenshot reviewed after X-Ray fixes; redacted SE launch smoke captured 2026-06-14 after direct install/launch. |
| `4.1` | Quick Log default sheet | `quicklog-final-opaque-right-fab.jpg` | Native iPhone 16e screenshot reviewed after X-Ray fixes. |
| `4.2` | Quick Log snackbar + undo/add details | `src/test/quick-log-controller.test.tsx` | Covered by controller test after 2026-06-14 fix; native screenshot recapture still required for final visual evidence. |
| `4.4` | Quick Log duplicate warning | `src/test/quick-log-route.render.test.tsx`, `src/test/quick-log-sheet.render.test.tsx` | Production route reachability, dedicated sheet state, and duplicate-warning scrim cancel behavior covered after 2026-06-14 fixes; native screenshot recapture still required for final visual evidence. |
| `4.5` | Quick Log failed save | `src/test/quick-log-sheet.render.test.tsx` | Covered by render/controller test; not retained as native screenshot in this pass. |
| `4.6` | Quick Log details form | `src/test/dev-gallery.render.test.tsx` and `src/features/_dev/design-gallery/DesignGalleryScreen.tsx` | Covered by synthetic dev-gallery state and tests; not retained as native screenshot in this pass. |
| `5.1` | Timeline synced default | `timeline-final-fullscreenmodal.jpg` | Native iPhone 16e screenshot reviewed after X-Ray fixes. |
| `5.2` | Timeline pending item | `src/test/timeline-quick-log.render.test.tsx` | Pending overflow-only Undo/Delete covered after 2026-06-14 fix; native screenshot recapture still required for final visual evidence. |
| `5.4` | Timeline filtered feeding | `src/test/timeline-filters.render.test.tsx` | Covered by render/query test; not retained as native screenshot in this pass. |
| `11.1` | Health mixed list | `src/test/app-shell.render.test.tsx`; `/tmp/puppyplan-design-fidelity-2026-06-14/after/se-health-mixed-list.jpg` | Safe mixed-list shell and segment filtering are explicit review-fixture coverage only after the 2026-06-14 release-gate follow-up; the retained SE screenshot is no longer production-default evidence. |
| `11.6` | Health first-run empty | `src/test/app-shell.render.test.tsx` | Production default now renders the honest empty/deferred state with disabled CTAs; native screenshot recapture still required for final visual evidence. |
| `14.1` | More full list | `more-final-right-fab.jpg` | Native iPhone 16e screenshot reviewed after X-Ray fixes. |
| `14.2` | Puppy profile saved view | `puppy-profile-final-redacted.jpg` | Native iPhone 16e screenshot reviewed with private values redacted. |
| `14.3` | Quick trackers | `quick-trackers-final.jpg` | Native iPhone 16e screenshot reviewed after X-Ray fixes. |

## Changelog

- 2026-06-23: Retargeted this plan from active V1 acceptance to V2 intake. V1 screenshots/native evidence remain historical comparison material; new design-fidelity acceptance uses `docs/design/v2/manifest.json`, `docs/design/v2/screenshots/index.md`, and the active `2026-06-22-redesign-v2-intake.md` plan. No source code, schema, native generated files, production config, remote state, or Linear issue was changed.
- 2026-06-14: Applied review-deep fix pass for H1/H2/H3 and related Medium/Low findings. Health now renders the safe mixed-list shell; Quick Log duplicate warnings are derived from cached rows and render as a dedicated sheet state; Quick Log success snackbar exposes Add details for detail-capable trackers using a precomputed `clientEventId`; Timeline pending Undo/Delete moved behind overflow; Quick Trackers rolls back optimistic UI on save failure; `output/` is ignored as local visual evidence. Verification so far: targeted suites for Quick Log controller/sheet/route, Timeline Quick Log, Health app shell, Quick Trackers, and Quick Log mutation passed; `npm run typecheck`, `npm run lint`, `node scripts/checks/check-i18n.mjs`, `node scripts/checks/check-navigation-contract.mjs`, and `git diff --check` passed.
- 2026-06-14: Ran full local gate: `npm run check` exited `0` with 59 Jest suites / 396 tests and 109 node tests passing; known non-failing React `act(...)` warning remains in `src/test/screen-header.render.test.tsx`. XcodeBuildMCP session defaults were set to `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`), `PuppyPlan`, Debug. `build_run_sim` timed out twice at the tool 120s limit while native build work continued; direct `install_app_sim` and `launch_app_sim` then succeeded for `com.dmitry-selenya.puppyplan-app`. Redacted SE Today startup screenshot saved at `/tmp/puppyplan-design-fidelity-2026-06-14/after/se-today-launch-smoke-redacted.jpg`; SE Health mixed-list screenshot saved at `/tmp/puppyplan-design-fidelity-2026-06-14/after/se-health-mixed-list.jpg`; unredacted Today local copy was deleted.
- 2026-06-14: Addressed follow-up review remarks. Health production default no longer renders static mixed-list fixture rows; the mixed rows require explicit `reviewState="mixed-list"` and the production empty/deferred CTAs are disabled until PUP-25 health records ship. Quick Log duplicate-warning scrim now cancels the warning instead of closing the sheet, and the scrim covers the full background rather than stopping at the bottom-sheet min height. Added focused hardening coverage for Quick Log details household/puppy/date mismatch rejection, `formatCalendarDate` invalid/boundary inputs, `createQuickLogRecentEvents` row sorting/filtering, and duplicate-source most-recent selection. Verification: targeted `npm run test:unit -- src/test/app-shell.render.test.tsx src/test/quick-log-sheet.render.test.tsx src/test/quick-log-details-route.render.test.tsx src/test/quick-log-controller.test.tsx src/test/format-date.test.ts src/test/quick-log-recent-events.test.ts` passed with 6 suites / 46 tests; full `npm run check` passed with 61 Jest suites / 409 tests and 109 node tests. Known non-failing React `act(...)` warning remains in `src/test/screen-header.render.test.tsx`.
- 2026-06-13: Created recovery implementation plan from user-approved visual fidelity plan. Baseline git status: `## main...origin/main`; working tree clean before this plan file.
- 2026-06-13: Captured iPhone 16e baseline Today screenshot and confirmed `More` tab hit target opened Quick Log because the right-aligned FAB overlapped the tab area. Added RED/GREEN coverage in `src/test/tab-layout.render.test.tsx`; moved the FAB to centered tab-bar placement in `app/(tabs)/_layout.tsx`. Verification: `npx jest --runInBand src/test/tab-layout.render.test.tsx` passed.
- 2026-06-13: Completed Phase 1 shared primitive slice with TDD coverage for `Avatar`, `EmptyState`, `ListGroup`, `PendingDot`, `SectionHeader`, `SheetHeader`, `ListRow` settings/health/timeline variants, chevron accessory, and expanded `AppIcon` atlas coverage. Removed raw fallback copy from `SheetHeader` during review. Verification: `npm run test:unit -- src/test/design-primitives.render.test.tsx` passed.
- 2026-06-13: Completed Phase 4 More/settings focused slice. More now exposes atlas full-list groups with deferred rows, Profile has saved/edit shells over existing backed fields, and Quick Trackers uses list/toggle/reorder-ready rows. Reverted duplicate More-owned settings screen copies into canonical `src/features/profile` and `src/features/settings/quick-trackers` ownership paths. Verification: `npm run test:unit -- src/test/more-settings.render.test.tsx src/test/puppy-profile-settings.render.test.tsx src/test/quick-trackers-settings.render.test.tsx` passed; `node scripts/checks/check-i18n.mjs` passed.
- 2026-06-13: Wide local gates after Phase 1/2/4 slices: `npm run typecheck` passed; focused 5-file unit suite passed with 53 tests; `npm run test:scaffold` passed after extending `shellI18nKeys` for the new More shell strings.
- 2026-06-13: Added More bottom padding to avoid the centered Quick Log FAB covering lower settings rows. Verification: RED/GREEN in `src/test/more-settings.render.test.tsx`; iPhone 16e visual smoke saved `/tmp/puppyplan-design-fidelity-2026-06-13/after/more.jpg` and `/tmp/puppyplan-design-fidelity-2026-06-13/after/more-scrolled.jpg`.
- 2026-06-13: Completed Phase 5 Health safe visual shell without schema/query changes: segmented filters, calm status chips, mixed template/confirmed/completed fixture rows, and neutral footer copy. Verification: RED/GREEN in `src/test/app-shell.render.test.tsx`; `npm run test:scaffold` passed.
- 2026-06-13: Fixed iPhone 16e Health visual wraps by reducing `SegmentedControl` option horizontal padding and keeping Health `ListRow` metadata in the copy column. Verification: RED/GREEN in `src/test/design-primitives.render.test.tsx`; improved screenshot saved `/tmp/puppyplan-design-fidelity-2026-06-13/after/health-fixed.jpg`.
- 2026-06-13: Completed Timeline fidelity sub-slice: synced rows no longer show permanent Edit/Delete buttons, expose one overflow affordance with accessibility actions, and event icons now map from `eventType` instead of localized title text. Verification: RED/GREEN in `src/test/timeline-filters.render.test.tsx`; `npm run test:scaffold` passed.
- 2026-06-13: Completed Phase 2 sheet shell without new dependencies: Quick Log now renders a scrim-backed bottom sheet frame with a drag handle and dedicated dismiss icon label while preserving existing controller/mutation paths. Verification: `npm run test:unit -- src/test/quick-log-sheet.render.test.tsx src/test/app-shell.render.test.tsx src/test/design-primitives.render.test.tsx` passed.
- 2026-06-13: Completed Phase 3 Today/Quick Log visual recovery slice against atlas refs `3.1` and `4.1`: Today first-day hero now uses the atlas `Start` eyebrow and grouped action rows via shared primitives; Quick Log route uses `transparentModal`, a scrim-backed bottom sheet, 5 tracker tiles, no extra visible close icon, and scrim dismiss accessibility. Verification: `npm run test:unit -- src/test/today-core.render.test.tsx src/test/app-shell.render.test.tsx` passed; `npm run test:unit -- src/test/quick-log-sheet.render.test.tsx` passed; `npm run test:scaffold` passed; iPhone 16e smoke screenshots saved under `/tmp/puppyplan-design-fidelity-2026-06-13/after/`.
- 2026-06-13: Addressed UX/code X-ray findings from two sub-agents. Fixes: Quick Log route moved from `(modals)` to transparent `(sheets)` while full-screen modals use `fullScreenModal`; right-aligned FAB is lifted above tab hit zones; More uses `SectionHeader`/`ListGroup`/settings rows with leading icons; Timeline synced rows hide `Saved` pills, keep overflow in-row, and overflow tap executes edit fallback; Timeline modal AX tree is isolated from More; Quick Trackers reorder accessibility actions now reorder; Health segmented control now changes selected state; user-facing implementation-copy about drag/reorder removed; `SheetSurface` is opaque and bottom-sheet min height is tokenized. Evidence: `/tmp/puppyplan-design-fidelity-2026-06-13/after/more-final-right-fab.jpg`, `/tmp/puppyplan-design-fidelity-2026-06-13/after/quicklog-final-opaque-right-fab.jpg`, `/tmp/puppyplan-design-fidelity-2026-06-13/after/timeline-final-fullscreenmodal.jpg`.
- 2026-06-13: Added final iPhone 16e evidence for Puppy Profile and Quick Trackers: `/tmp/puppyplan-design-fidelity-2026-06-13/after/puppy-profile-final-redacted.jpg` and `/tmp/puppyplan-design-fidelity-2026-06-13/after/quick-trackers-final.jpg`. Redacted retained Today/More/Quick Log screenshots to remove private puppy identity values; raw private profile screenshots were deleted. Contact sheet: `/tmp/puppyplan-design-fidelity-2026-06-13/after/final-evidence-contact-sheet-redacted.jpg`.
- 2026-06-13: Final local gate after X-ray fixes passed. Verification: `npm run check` exited `0`; `npm run test:scaffold` passed inside the gate; `git diff --check` passed.
- 2026-06-13: Mirrored design-fidelity recovery evidence to Linear comments on `PUP-22` and `PUP-23`. No issue status changes, commits, pushes, PRs, release actions, migrations, or production mutations were performed.
- 2026-06-13: Re-ran final verification after Linear/plan sync. Verification: `npm run check` exited `0`; `git diff --check` exited `0`; XcodeBuildMCP `build_run_sim` on `iPhone 16e` / `PuppyPlan` exited `SUCCEEDED`.
