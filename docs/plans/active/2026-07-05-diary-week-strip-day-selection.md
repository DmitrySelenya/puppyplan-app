# Diary WeekStrip Day Selection

**Status:** Active; implementation, local verification, Maestro, commit/push, and draft PR complete; CI Verification pending rerun after test-race fix.

**Linear:** `PUP-27` - https://linear.app/dmitryselenya/issue/PUP-27/diary-weekstrip-day-selection

**Branch:** `dimaselenya/pup-27-diary-weekstrip-day-selection`

**Goal:** WeekStrip days in Diary are tappable; tapping a date shows that day's inline timeline.

**Architecture:** Behavior-only Diary UI/query change. Supabase remains source of truth, TanStack Query owns event rows, Quick Log queue/business rules/schema/RLS stay unchanged.

**TDD mode:** lightweight TDD fallback, pre-approved by brief because isolated RED/GREEN/REFACTOR agents were unavailable in this Codex session.

## Source Docs

- Brief: `docs/briefs/2026-07-05-diary-day-selection.md`
- PRD: `puppyplan-prd-v2.md` Today, Quick Log, Timeline acceptance
- Design: `DESIGN.md` V2 Diary IA and selected-day-not-today state
- Architecture: `docs/architecture/00-overview.md`, `03-client-data-layer.md`, `06-design-system-and-ui-contracts.md`, `12-i18n-and-content.md`, `17-testing-ci-release.md`, `18-ai-agent-guide.md`
- Existing context: `docs/plans/active/2026-06-12-pup-22-23-today-quicklog-timeline.md`

## Design Lock

- Artboard refs: Today `3.1`-`3.7`; Timeline `5.1`, `5.5`; V2 selected-day-not-today from `DESIGN.md` §5.2.
- Device: `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).
- Allowed deviation: behavior-only change; existing selected-day filled circle remains the visual.
- Stable selectors: `week-strip-day-<date>`, `diary-selected-day-timeline`, `diary-selected-day-header`, `diary-selected-day-empty-state`.

## Scope

- **Goals:** past/today/future cells are tappable; selected date drives inline timeline filters and selected a11y state; Today restores existing hero/plan/history behavior; non-today hides today-only blocks and shows selected-day heading/timeline/empty state; Quick Log FAB still logs now/today.
- **Non-goals:** schema/RLS/Edge Functions/Quick Log queue/business rules/navigation redesign; Android run; production/release action; merge; CI/check config edits.
- **Locked decisions:** future days are tappable; selected date is not persisted; non-today does not show history filter chips; existing arbitrary-date event query path is used; all new verified elements get stable ids.

## Invariants And Tests

- I1 WeekStrip cells are buttons when selectable, expose ids, and preserve selected a11y state.
  - `src/test/today-core.render.test.tsx`
- I2 selecting another day changes query filters and shows only that day's rows.
  - `src/test/today-core.render.test.tsx`
- I3 selecting today restores current Diary behavior.
  - `src/test/today-core.render.test.tsx`
- I4 selecting a future/current-week empty day shows existing empty style and no today-only content.
  - `src/test/today-core.render.test.tsx`
- I5 Quick Log remains today/now-scoped while viewing another day.
  - `src/test/today-quick-log.render.test.tsx`
- I6 debug sign-in has an id-only Maestro entry point when signed out.
  - `src/test/sign-in-screen.render.test.tsx`
- I7 EN/RU/ES parity and string budgets remain green.
  - `npm run check`

## File Map

- `src/features/today/screens/TodayScreen.tsx` - selected-date state, selected-day query, today/non-today rendering.
- `src/design/primitives/WeekStrip.tsx` - per-day testID passthrough.
- `src/features/auth/screens/SignInScreen.tsx` - debug sign-in testID for id-only Maestro auth fallback.
- `src/test/today-core.render.test.tsx` - day selection behavior/anatomy.
- `src/test/today-quick-log.render.test.tsx` - Quick Log regression.
- `src/test/sign-in-screen.render.test.tsx` - debug sign-in id.

## Implementation Checklist

- [x] Read brief, AGENTS, plan/design-fidelity/TDD/Linear/project-graph instructions.
- [x] Create Linear issue with Task Contract and move to `In Progress`.
- [x] Write compact plan and get explicit user approval on 2026-07-06.
- [x] Create/switch Linear branch.
- [x] RED tests for day selection ids, selected state, past/future/today behavior, and Quick Log regression.
- [x] Implement selected-date state, reset, query filters, today-only gating, selected-day timeline, and stable ids.
- [x] GREEN targeted tests.
- [x] `npm run check` green after implementation.
- [x] SE simulator verification through current booted SE profile.
- [x] Maestro ad-hoc YAML outside repo under `/tmp/pup-27-maestro`; id selectors only.
- [x] Screenshots and PASS/FAIL report saved under `output/pup-27-maestro`.
- [x] Commit, push, draft PR.
- [ ] CI Verification green; no merge.

## Verification Evidence

- Project graph: `doctor` OK; `update --base HEAD` reported 0 incremental changes.
- RED: `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx src/test/today-quick-log.render.test.tsx` failed on missing `week-strip-day-<date>` selectors/selectable behavior.
- GREEN: same command passed; 2 suites, 34 tests.
- Auth id guard: `npm run test:unit -- --runTestsByPath src/test/sign-in-screen.render.test.tsx` passed; 6 tests.
- Local gate: `npm run check` passed after implementation and again after CI test-race fix; 84 Jest suites / 693 tests plus node/scaffold/i18n/tokens/privacy/text hygiene. Existing reduced-motion React `act(...)` warnings remain unrelated and non-failing.
- CI rerun fix: GitHub `Local Gate` failed at `src/test/today-core.render.test.tsx:294`; root cause reproduced locally as an async race in the test, which waited for the selected-day container before rows finished loading. Test now waits for the selected-day event row.
- Simulator: current `Grith iPhone SE 3 iOS 26.3` (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).
- Build/run note: existing installed dev build on current SE was used with Metro `pid 92686`; JS-only changes loaded through Metro. An attempted fresh `ios/PuppyPlan.xcworkspace` Debug build via XcodeBuildMCP timed out during first native compile and was cancelled to keep the current simulator workflow moving.
- Synthetic data: dev Supabase debug account, synthetic puppy name `Demo Pup`, routine events on 2026-07-06, 2026-07-07, and 2026-07-10; no secrets or private user content recorded.
- Maestro primary: `maestro test --udid 5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6 --no-reinstall-driver --format JUNIT --output output/pup-27-maestro/maestro-junit.xml /tmp/pup-27-maestro/flows` passed 10/10 in 1m42s after privacy-safe synthetic name refresh.
- Maestro rerun note: earlier selected event/timeline screenshots rerun passed 4/4 in 1m26s after transient XCTest `kAXErrorInvalidUIElement` and dev `localhost:8082/status` warning from an abandoned Expo port prompt.
- Hierarchy: `week-strip-day-2026-07-11` exposed `selected=true`; selected-day timeline and empty-state ids were visible.

## Maestro Results

| # | Case | Selector evidence | Screenshot | Verdict |
|---|---|---|---|---|
| 1 | WeekStrip visible | `today-week-strip` | `01-today-weekstrip.png` | PASS |
| 2 | Today cell selectable | `week-strip-day-2026-07-06` | `02-today-selected.png` | PASS |
| 3 | Tuesday selected timeline | `diary-selected-day-timeline` | `03-tuesday-timeline.png` | PASS |
| 4 | Tuesday selected header | `diary-selected-day-header` | `04-tuesday-header.png` | PASS |
| 5 | Tuesday event visible | `diary-history-logged-fact` | `05-tuesday-event.png` | PASS |
| 6 | Wednesday empty state | `diary-selected-day-empty-state` | `06-wednesday-empty.png` | PASS |
| 7 | Friday selected timeline | `diary-selected-day-timeline` | `07-friday-timeline.png` | PASS |
| 8 | Friday event visible | `diary-history-logged-fact` | `08-friday-event.png` | PASS |
| 9 | Saturday empty state | `diary-selected-day-empty-state` | `09-saturday-empty.png` | PASS |
| 10 | Return to today | `diary-info-hero` | `10-return-today.png` | PASS |

## Linear Updates

- Created `PUP-27` with Task Contract and labels.
- Recorded approval, TDD mode, RED/GREEN, local gate, Maestro evidence, screenshots/JUnit path, transient XCTest issue, draft PR, and CI test-race fix.
