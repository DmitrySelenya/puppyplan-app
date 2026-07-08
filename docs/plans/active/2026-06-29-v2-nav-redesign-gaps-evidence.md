# V2 Nav Redesign — Stage-0 Lock & Handoff Evidence Log

Append-only evidence companion to `2026-06-29-v2-nav-redesign-gaps.md` (split out on
2026-07-07 because the combined file exceeded practical read size). The coverage matrix,
decisions, monetization model, next steps, blocker audit, and changelog stay in the main
doc; this file holds the per-route Stage-0 lock and handoff evidence sections (§8–§26).
Section numbers are preserved. New evidence sections continue numbering here.

## 8. Codex Design handoff evidence

**2026-06-30 project:** Open/Codex Design project `2f60083d-2d0f-4fe1-8e71-c1c60951fb8c`
(`Web Prototype`), entry `index.html`.

Preview URL:
`http://127.0.0.1:49290/api/projects/2f60083d-2d0f-4fe1-8e71-c1c60951fb8c/raw/index.html`

Legacy Claude/Design canvas alias:
`http://127.0.0.1:49290/api/projects/2f60083d-2d0f-4fe1-8e71-c1c60951fb8c/raw/mqxri78o-Canvas.dc.html`

Delivered canvas contents:
- 9 sections.
- 88 boards.
- 176 native previews: 88 iOS + 88 Android.
- Top coverage map listing every board before the large iOS/Android previews.
- `handoff-manifest.json` in the design project with section counts and legacy-surface dispositions.
- Synthetic placeholder hygiene: visible project placeholders use generic caregiver labels and
  `example.test` email addresses.

Verification run 2026-06-30:
- `node --check .../js/puppyplan.js` — PASS.
- `curl -I .../raw/index.html` — `HTTP/1.1 200 OK`.
- Node/VM inventory check — PASS: `sections=9`, `boards=88`, `nativePreviews=176`,
  manifest boards/sections match, coverage-map renderer/CSS present.
- `jsdom` render check — PASS: `.screen-pair=88`, `.board-map-card=88`,
  `.screen-preview=176`, `ios=88`, `android=88`.
- Re-check after viewport concern — PASS: Open Design project metadata still points to
  `index.html`; static renderer inventory has `uniqueScreenIds=89`, `renderers=31`,
  `extraScreens=58`, `missing=[]`; jsdom boot render again returned `boards=88`,
  `previews=176`, `emptyPreviews=0`.
- Forbidden private-placeholder scan over the design project — no matches after sanitization.
- Repackaged for Claude Design / Miro visibility after the user could only see a small subset:
  primary `index.html` is now **pre-rendered static HTML** containing all board blocks and previews
  without requiring JavaScript; dynamic source is preserved as `index.dynamic.html`; duplicate
  portable entry `miro-complete.html` was added.
- Static DOM verification after repack — PASS: `.screen-pair=88`, `.board-map-card=88`,
  `.screen-preview=176`, `ios=88`, `android=88`, content served at the same preview URL with
  `Content-Length: 954639`.
- Direct Open Design project re-check after the second viewport concern — PASS:
  `handoff-manifest.json` reports `status=static-complete-canvas`, `sections=9`, `boards=88`,
  `nativePreviews=176`; both `index.html` and `miro-complete.html` contain `boardMap=88`,
  `screenPairs=88`, `ios=88`, `android=88`, and the visible static proof block.
- Full-board repack after the user still could not see all screens in the design surface — PASS:
  `index.html` and `miro-complete.html` now include `codex-full-board-layout-v3`, full-size
  iOS/Android preview columns (`390px 412px`), `screenPairs=88`, `deviceRows=88`,
  `screen-preview=176`, and the title `PuppyPlan V2 Complete Full-Board Handoff`.
  `handoff-manifest.json` now reports `status=static-complete-full-board-canvas` and
  `layout=full-size iOS and Android previews, two board pairs per row on wide canvases`.
- Fresh Open Design preview fetch after full-board repack — PASS:
  `curl -I .../raw/index.html` returned `HTTP/1.1 200 OK`, `Content-Length: 956667`;
  streamed content verification returned `title=true`, `fullBoard=1`, `screenPairs=88`,
  `deviceRows=88`, `previews=176`, `hasFullSize=true`, `status=true`.

Fresh browser verification 2026-06-30:
- Opened preview URL with Playwright CLI — page title `PuppyPlan V2 complete Codex Design handoff`.
- Snapshot confirmed visible top inventory: `88 boards`, `176 previews`, `9 sections`, and all 88
  board-map links before the large previews.
- Full-page screenshot captured at
  `output/playwright/puppyplan-codex-design-full-canvas.png` (`1280 x 57316`), confirming this is a
  long scrollable handoff canvas. Seeing only the first rows at a zoomed viewport is not evidence of
  missing screens.
- Browser console had one non-rendering issue only: `favicon.ico` 404.
- Legacy alias repair after the user still saw the old partial canvas — PASS: backed up the redirect-only
  `mqxri78o-Canvas.dc.html`, replaced it with the same complete static canvas as `index.html`, and
  refreshed `full-canvas-coverage.json`.
- Fresh DOM verification after alias repair — PASS: both `index.html` and `mqxri78o-Canvas.dc.html`
  contain `boardMap=88`, `screenPair=88`, `preview=176`, `groups=10`, and no meta/JS redirect.
- Fresh browser verification after alias repair — PASS: headless Chrome opened
  `.../raw/mqxri78o-Canvas.dc.html`; page title `PuppyPlan V2 complete full-board Codex Design handoff`;
  DOM counts `boardMap=88`, `screenPair=88`, `preview=176`, `groups=10`. Screenshot:
  `output/playwright/puppyplan-codex-design-legacy-alias-full.png`.
- Fresh DOM re-check after continuing native work — PASS: both `.../raw/index.html` and
  `.../raw/mqxri78o-Canvas.dc.html` returned `HTTP 200` with title
  `PuppyPlan V2 complete full-board Codex Design handoff`, `boardMap=88`, `screenPairs=88`,
  `deviceRows=88`, `previews=176`, `ios=88`, `android=88`.
- Fresh Codex/Open Design project re-check after the "not all screens are visible" concern — PASS:
  Open Design project metadata still points to entry `index.html`; `index.html`,
  `00-puppyplan-v2-full-canvas.html`, `complete-atlas.html`, `miro-complete.html`,
  `codex-design-complete.html`, and legacy `mqxri78o-Canvas.dc.html` all include the complete
  static handoff. Direct preview fetch returned `HTTP 200`, `bytes=1865511`,
  `totalPreviewNodes=352` because the contact sheet and full-size boards both render the screens,
  `uniqueScreenKeys=89` including the iOS/Android-specific native picker contract keys,
  `uniqueIosScreens=88`, `uniqueAndroidScreens=88`, and `requiredMissing=[]` across the required
  onboarding, Diary, Quick Log, Reminders, Pet, More, Support/Help, sharing, puppy-card,
  soft-lock, and deferred-reference surfaces.

## 9. Native route-label/icon implementation evidence

**2026-06-30 slice:** V2 primary route shell and first-log chrome migration from old
`Today / Health / More` tab contract to `Diary / Pet / More` + persistent Quick Log action.

TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

Spec lock for this slice:
- Primary tab ids and labels are exactly `diary`, `pet`, `more`.
- `diary/index` uses the canonical book icon, `pet/index` uses paw, `more/index` uses more.
- Legacy `/today` and `/health` route files remain only as redirect aliases.
- Onboarding first-log completion lands in Diary chrome, with the Diary tab selected.
- Shell/i18n/scaffold guardrails enforce the V2 tab keys and no stale Today/Health primary-tab contract.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/tab-layout.render.test.tsx src/test/onboarding-flow.render.test.tsx`
  failed as expected:
  - `diary/index` rendered `today` icon instead of `book`.
  - first-log Diary tab had `accessibilityState.selected=false`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/tab-layout.render.test.tsx src/test/onboarding-flow.render.test.tsx`
  — PASS: 2 suites, 15 tests.
- Expanded route/i18n/render suite — PASS: 13 suites, 88 tests.
- Primitive/dev-gallery/tab focused suite — PASS: 3 suites, 52 tests.
- `node --test scripts/design/lib/strings.test.mjs` — PASS: 6 tests.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
  scaffold guardrails, tokens, privacy scan, text hygiene.
- `rg "tabs\\.(today|health)|tab\\.id === 'today'|tab\\.id === 'health'|name=\\\"today\\\"|name=\\\"heart\\\"" app src`
  — no matches after the V2 cleanup.
- `npm run check` — PASS: lint, typecheck, 63 Jest suites / 448 tests, node tests,
  scaffold checks, tokens, privacy scan, and text hygiene.

Design-fidelity note:
- This slice satisfies Stage 3 structural assertions for the route shell / first-log chrome contract.
- It does **not** complete the per-screen Stage 4 native screenshot comparison for Diary, Pet,
  Quick Log, Onboarding, More, Sharing, Paywall, or Shareable Cards. Those remain plan-owned work
  under §7.3–§7.4 and must be handled per screen/state before Done.

## 10. Diary route Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/diary` route.

- Created route-specific spec card: `docs/design/v1/specs/03-diary-route.md`.
- Source section: `docs/design/v1/specs/03-diary-core-states.md`.
- Locked Open Design board ids: `diary-populated`, `diary-day-1`, `diary-day-2`,
  `diary-weekly-rhythm`, `diary-past`, `diary-cold`, `diary-empty`, `diary-all-done`,
  `diary-states`, `week-selected`, `diary-accident-recovery`, `diary-after-feeding`,
  `diary-missed-reminder`, `diary-item-edit`.
- Recorded allowed deviation: implementation may temporarily reuse the existing `TodayScreen`
  module name internally, but public route/title/tab/navigation contract are `Diary`; `/today`
  remains a redirect alias only.
- 2026-07-02 reconciliation: the top coverage matrix now treats accident recovery, after-feeding
  pattern, past-unchecked reminder, and Day 7 weekly rhythm as implemented Diary anatomy slices
  because their locked board ids are present above, their `buildTodayPlan` variants are covered in
  `src/test/today-prioritization.test.ts`, and their visible Diary anatomy is covered in
  `src/test/today-core.render.test.tsx`. This does not close the route-wide Stage 4 screenshot gate.
- Implemented the first locked Diary anatomy slice: the Diary route now renders a seven-day week
  strip with separate selected-day and today states. The selected day comes from the route plan input
  and the today marker comes from the active care context, so `week-selected` can be represented
  without relying on color alone.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  before implementation because `Diary week` was missing from the rendered anatomy.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx src/test/i18n.test.ts`
    — PASS: 2 suites, 19 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 450 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 449 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 449 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 449 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene.
- Implemented the next Diary history language slice: the embedded history section now uses
  `Diary history` / `Review history` language and the Diary card copy no longer references a
  standalone `Timeline`.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while the screen still rendered `Recent Quick Log` / `Open Timeline`.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx src/test/i18n.test.ts`
    — PASS: 2 suites, 19 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 449 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene.
  - `rg "Open Timeline|Recent Quick Log|Timeline keeps|Abrir Timeline|Открыть Timeline|Timeline хранит|Timeline conserva" src/features/today src/test/today-core.render.test.tsx STRINGS.en.json STRINGS.ru.json STRINGS.es.json`
    — no matches under `src/features/today`; remaining hits are legacy string keys only.
- Implemented the first Diary item-anatomy slice: synced logged facts in embedded Diary history no
  longer show a visible `Saved`/synced status pill; pending and failed persistence states still show
  non-color-only status pills and actions. This aligns with DESIGN §2.4.3 (`Synced` hidden by default,
  non-synced visible).
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx` failed as expected
  while synced rows still rendered `timeline.pills.synced`.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx src/test/today-core.render.test.tsx`
    — PASS: 2 suites, 16 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 449 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene.
- Implemented the next Diary item-anatomy slice: embedded Diary history logged facts now use the
  existing `Card` `mutedTemplate` variant (`tokens.color.surface.sunken`) and expose
  `diary-history-logged-fact` for structural anatomy checks. This keeps logged facts visually quieter
  than raised routine/action cards while reserving warning/error styling for persistence failure pills.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx` failed as expected
  while the logged fact row had no `diary-history-logged-fact` anatomy hook and no asserted sunken
  surface.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx`
    — PASS: 1 suite, 6 tests.
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx src/test/today-core.render.test.tsx`
    — PASS: 2 suites, 16 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
- Implemented the next Diary item-action slice: synced embedded Diary history logged facts now expose
  a 44pt+ overflow/edit affordance (`today.history.item-actions`) when `onEdit` is wired. The button
  uses design primitives (`IconButton` + `AppIcon more`) and calls `createQuickLogEditRequest(event)`,
  so the downstream Quick Log details flow receives `clientEventId`, event type, household/puppy ids,
  selected date, and tracker id without making the synced status pill visible again.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx` failed as expected
  while synced Diary history facts had no accessible `today.history.item-actions` button.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx`
    — PASS: 1 suite, 6 tests.
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx src/test/today-core.render.test.tsx src/test/i18n.test.ts`
    — PASS: 3 suites, 25 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
- Implemented the Diary past-unchecked-reminder language slice: the synthetic reminder state now
  renders as a calm `past unchecked routine` preview instead of visible `missed reminder` language.
  EN/RU/ES strings were updated while keeping the historical key name for compatibility.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while the rendered tree still contained `missed reminder`.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 11 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, and text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 454 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
- Implemented the Diary accident-recovery / after-feeding contextual anatomy slice: normal Diary hero
  eyebrow copy no longer exposes legacy `Today`, and `feeding_pattern` renders as a single soft
  `mutedTemplate` contextual tip (`diary-contextual-tip-card`) instead of a normal raised daily card.
  EN/RU/ES visible copy was adjusted away from Today-route language where the same cards now appear
  inside Diary.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected:
  accident recovery still rendered visible `Today`, and the after-feeding state had no
  `diary-contextual-tip-card`.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 13 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 452 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Implemented the Diary all-done state slice: `screenState="all-done"` now exposes the locked
  `diary-all-done` completion surface through the existing status-card primitive with the existing
  `completed` pill tone. This is a synthetic design-review state only; production routine completion
  logic remains scoped to the later Reminders/Routines implementation.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while `today-state-all-done` was absent.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 14 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 453 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Implemented the Diary empty-with-history state slice: `screenState="empty-history"` now exposes the
  locked `diary-empty` quiet-day surface through the existing status-card primitive, using the calm
  `template` pill tone and EN/RU/ES Diary-language copy. This is a synthetic design-review state only;
  production multi-day history/filtering remains scoped to the later Diary history implementation.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while `today-state-empty-history` was absent and the screen still fell through to the existing
  steady-day hero anatomy.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 15 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
- Implemented the Diary cold-start state slice: `screenState="cold-start"` now exposes the locked
  `diary-cold` setup surface through the existing status-card primitive, using the calm `template`
  pill tone and EN/RU/ES copy that names both Add paths: Quick Log and Schedule. This is a synthetic
  design-review state only; production routine creation remains scoped to the later Reminders/Routines
  implementation.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while `today-state-cold-start` was absent and the screen still fell through to first-day starter
  anatomy.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 16 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, and text hygiene.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 455 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Implemented the Diary synthetic pending-write state slice: `screenState="pending-write"` now exposes
  the locked grouped-state `diary-states` pending surface without requiring a real queued local row.
  This keeps Stage 3 design review able to render the pending-write state deterministically while the
  production pending banner still comes from actual local Quick Log rows.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while `screenState="pending-write"` fell through to first-day Diary anatomy and
  `today-state-pending-write` was absent.
- GREEN evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
    — PASS: 1 suite, 17 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, and text hygiene.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/today-core.render.test.tsx`
    — PASS: 2 suites, 26 tests.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 456 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Implemented the synced Diary item delete-action anatomy slice: synced logged facts now expose a
  localized destructive `Delete entry` action when `onDelete` is wired, in addition to the existing
  44pt+ overflow/edit affordance. The action uses `createQuickLogDeleteRequest(event)` with
  `status: 'synced'`, so the downstream deletion path receives the same household, puppy, event type,
  client event id, and selected date contract as pending/failed rows.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx` failed as expected
  while the synced Diary history row had no `today.history.delete-action` button.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx`
    — PASS: 1 suite, 6 tests.
  - `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts`
    — PASS: 1 suite, 9 tests.
  - `npm run typecheck` — PASS.
  - `npm run test:scaffold` — PASS after adding `today.history.delete-action` to
    `shellI18nKeys`: navigation contract, shell i18n, i18n budgets, scaffold guardrails, tokens,
    privacy scan, and text hygiene.
  - `npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx src/test/i18n.test.ts src/test/navigation-contract.test.ts`
    — PASS: 3 suites, 23 tests.
  - `npm run check` — PASS: lint, typecheck, 63 Jest suites / 456 tests, node tests,
    scaffold checks, tokens, privacy scan, and text hygiene. Output still includes the existing
    React `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- 2026-07-02 Stage 4 grouped-state follow-up: the development-only native component gallery now
  exposes the Diary `loading`, `offline-read`, `pending-write`, and `error` state templates in one
  deterministic shell preview, so the unreachable production-only states can be reviewed without
  writing synthetic care data.
- RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx` failed as expected
  while the gallery rendered loading/offline/pending but did not expose
  `today.states.error.title`.
- GREEN / regression evidence:
  - `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx src/test/i18n.test.ts`
    — PASS: 2 suites, 14 tests.
  - `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets,
    scaffold guardrails, tokens, privacy scan, and text hygiene.
- Stage 4 native SE evidence:
  - `output/v2-nav-gaps-stage4/diary-state-templates-loading-offline-stage4.jpg` — heading plus
    `Refreshing Today` and `Offline view` cards.
  - `output/v2-nav-gaps-stage4/diary-state-templates-pending-error-stage4.jpg` — `Sync in progress`
    and `Could not refresh Today` cards.
  Captured 2026-07-02 from the installed PuppyPlan.app over Metro on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`). Broader Clay Diary production-route states remain
  governed by `docs/design/v2/specs/diary-v2.md` and the screen-polish backlog.

**UPDATE 2026-07-02 — Diary route re-locked and rebuilt to the Clay reference (parallel Claude
session on this branch).** `docs/design/v2/specs/diary-v2.md` (+ recovered atlas under
`docs/design/v2/reference/`) now supersedes the visual-anatomy lock above (`03-diary-route.md`)
and `today-v2.md`. Implemented and Stage-4-verified on iPhone SE 3 + iPhone 16e (populated state):
DiaryHeader greeting (no screen title), WeekStrip, mauve InfoHero, FactCard rows with the
clay/sage/honey/mauve accent map, swipe-to-delete with a VoiceOver-parity accessibility action
(the earlier always-visible destructive `Delete entry` button was removed as a deviation from the
2026-06-30 delete-action slice above). Remaining Diary deltas are itemized as **Items 7–12** in
`2026-06-30-v2-screen-polish-backlog.md` — do not re-implement Diary from this section's older
board lock, and do not revert the Clay rebuild.

**2026-07-02 next implementation slice:** Diary history scroll-back is scoped to the locked
`5b-diary-history` Clay board in `docs/design/v2/specs/diary-v2.md` and
`docs/design/v2/reference/diary-create.screens.jsx`.

- Source-of-truth board: `ScreenDiaryHistory` (`5b-diary-history`) with inline Diary history,
  `All/Food/Potty/Sleep` chip filter anatomy, day dividers, and the explicit banner note
  "Scrolled history state inside Diary. No Timeline route."
- Implementation scope: the existing `Review history` affordance must expand read-only, filtered
  history inside `TodayScreen`/Diary instead of calling the standalone Timeline route. The normal
  day hero/status state must continue to be computed from today's filtered rows only.
- Out of scope for this slice: synced delete/undo behavior changes, RLS-backed durable delete,
  recap/day summaries, and replacing the legacy `/timeline` route itself.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed as expected
  while `Review history` still called `openTimeline` and no `diary-history-filter-bar` existed.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx`
  — PASS: 1 suite, 17 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 70 Jest suites / 539 tests, 118 node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing non-failing
  React `act(...)` warning in `src/test/screen-header.render.test.tsx`.

Implementation notes:
- `Review history` now expands inline Diary history instead of calling the standalone Timeline route.
- The inline state uses a separate history timeline query, so Diary hero/status calculations remain
  based on today's rows only.
- The history state renders Clay-style `All / Feeding / Potty / Sleep` filter chips, day dividers,
  and the existing `FactCard` logged-fact anatomy.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator from the installed PuppyPlan.app running
  JS-over-Metro. Evidence: `output/v2-nav-gaps-stage4/diary-history-inline-stage4.jpg`. Runtime
  snapshot after pressing `Review history` exposed inline `Today · Thursday` grouping, a nested
  horizontal history filter scroller, and multiple `diary-history-logged-fact-card` rows without
  navigating to the standalone Timeline route. The screenshot verifies the visible `All / Feeding /
  Potty / Sleep` chips, day divider, FactCard row anatomy, and persistent Diary/Pet/More bottom chrome
  with the central Add action. Filter interaction remains covered by the RED/GREEN render test above.

## 11. Quick Log route Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/quick-log` route duplicate-warning anatomy.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked atlas board: `4.4 Duplicate warning · 60-sec window`
  (`docs/design/v1/screenshots/quicklog/4-4.png`, state `duplicate-warning`, 393x852).
- Route: `/quick-log`.
- Allowed deviations: production copy may use the existing localized generic duplicate title until
  actor/time-specific duplicate copy is wired, but the anatomy must still expose a warning icon, warning
  tint, explanatory text, save-anyway action, and cancel action.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

Spec lock for this slice:
- AC-QL-4.4-1: when a recent same-care event triggers duplicate detection, the sheet renders a
  warning-tinted duplicate-warning card, not a normal raised card and not bright red/error styling.
- AC-QL-4.4-2: the duplicate-warning card includes a decorative warning glyph before the warning copy.
- AC-QL-4.4-3: the duplicate-warning card exposes both localized actions: save anyway and cancel.
- AC-QL-4.4-4: mutation is not queued until the user explicitly confirms save anyway.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx`
  failed as expected before implementation while the route did not expose
  `quick-log-duplicate-warning-card` / warning anatomy.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx`
  — PASS: 1 suite, 7 tests.
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx src/test/design-primitives.render.test.tsx`
  — PASS: 2 suites, 48 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, token drift check, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 63 Jest suites / 456 tests, node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Project graph advisory refresh:
  `python3 /Users/dmitryselenya/.codex/skills/project-graph-context/scripts/project_graph.py update --repo /Users/dmitryselenya/Projects/puppy_app --base HEAD`
  — PASS: FTS index rebuilt, 93 files updated.

Implementation notes:
- `src/features/quick-log/screens/QuickLogShell.tsx` now renders the duplicate warning as a
  warning-tinted `Card` with a visible warning icon slot and the existing localized confirm/cancel
  actions.
- `src/design/primitives/AppIcon.tsx` now includes `warningTriangle` for warning-state anatomy.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator from the installed PuppyPlan.app
  over Metro. Native evidence: `output/v2-nav-gaps-stage4/quick-log-production-default-stage4.png`
  and `output/v2-nav-gaps-stage4/quick-log-production-duplicate-warning-stage4.png`. The
  production flow opened Diary → Add → Quick Log, tapped a same-tracker Feeding event within the
  duplicate window, and exposed the warning-tinted card, warning glyph, localized `Add anyway` /
  `Cancel` actions, and dimmed route backdrop without queuing the mutation before confirmation.

## 12. Quick Log failed-save row Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/quick-log` failed save inline anatomy.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked atlas board: `4.5 Failed save · retry/discard inline`
  (`docs/design/v1/screenshots/quicklog/4-5.png`, state `failed`, 393x852).
- Route/component: `/quick-log`, `QuickLogLocalEvents`.
- Allowed deviations: exact row copy may use the existing localized generic failed-save strings, but the
  failed row must be visually distinct from pending rows and keep retry/discard inline near the affected event.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

Spec lock for this slice:
- AC-QL-4.5-1: failed local rows expose a structural failed-row hook and use muted danger tint/border
  from design tokens, not a normal raised card or bright red.
- AC-QL-4.5-2: failed local rows remain non-color-only: visible failed status pill plus retry and
  discard actions.
- AC-QL-4.5-3: retry calls the failed row's `clientEventId`; discard calls delete with
  `clientEventId` and `eventType`.
- AC-QL-4.5-4: pending local rows keep undo/discard controls and do not adopt failed danger styling.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-local-events.render.test.tsx`
  failed as expected before implementation because `quick-log-local-event-failed-card` was absent
  and failed rows had no asserted muted danger tint/border.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-local-events.render.test.tsx`
  — PASS: 1 suite, 1 test.
- `npm run test:unit -- --runTestsByPath src/test/quick-log-local-events.render.test.tsx src/test/quick-log-sheet.render.test.tsx`
  — PASS: 2 suites, 18 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, token drift check, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 63 Jest suites / 456 tests, node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- Project graph advisory refresh:
  `python3 /Users/dmitryselenya/.codex/skills/project-graph-context/scripts/project_graph.py update --repo /Users/dmitryselenya/Projects/puppy_app --base HEAD`
  — PASS: FTS index rebuilt, 93 files updated.

Implementation notes:
- `src/features/quick-log/components/QuickLogLocalEvents.tsx` now marks failed local rows with
  `quick-log-local-event-failed-card`, uses `tokens.color.status.dangerTint` and
  `tokens.color.status.danger`, and keeps pending rows on the non-danger path with
  `quick-log-local-event-pending-card`.
- Retry/discard callbacks remain unchanged and covered through the component and sheet tests.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator from a temporary `/_dev/components`
  route harness, restored before commit. Native evidence:
  `output/v2-nav-gaps-stage4/quick-log-pending-failed-harness-stage4.png`. The screenshot verifies
  the same Quick Log sheet anatomy with a pending Feeding row (`Saving`, Undo, Discard) and a failed
  Walk row using muted danger tint/border, visible `Not saved` status, `Try again`, and `Discard`.

## 13. Quick Log snackbar/undo Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/quick-log` after-tap snackbar/undo anatomy.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked Open Design board: `Quick Log after tap`
  (`quicklog-after-tap`, 88-board Codex Design handoff), state `snackbar/undo`.
- Historical atlas cross-reference: DESIGN.md §2.3.8 Snackbar / Undo and §15 Feedback layer.
- Route: `/quick-log`, with global `SnackbarProvider` host.
- Allowed deviations: production copy may use the existing localized tracker-template message rather
  than the exact Open Design sample `Logged · Pee outside`; the anatomy must still expose a bottom
  snackbar status, polite announcement, visible Undo action, optional Add details action for
  detail-capable trackers, and `saveSuccess` feedback without using celebration.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

Spec lock for this slice:
- AC-QL-4.2-1: after a successful non-duplicate Quick Log tap, the sheet closes and a bottom snackbar
  renders the localized saved message with a visible Undo action.
- AC-QL-4.2-2: the snackbar status is a polite live region and the surface keeps the success tone
  from the shared snackbar primitive.
- AC-QL-4.2-3: the success snackbar carries the design feedback contract `hapticEvent: saveSuccess`;
  normal Quick Log saves must not use the rare `celebration` haptic.
- AC-QL-4.2-4: detail-capable trackers keep the Add details secondary action while Undo remains the
  primary action.
- AC-QL-4.2-5: failed mutation replacement uses the error feedback contract instead of leaving the
  stale save-success snackbar in place.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx src/test/quick-log-controller.test.tsx src/test/quick-log-sheet.render.test.tsx`
  failed as expected before implementation:
  - shared `SnackbarProvider` did not call the haptic adapter for `hapticEvent: 'saveSuccess'`;
  - Quick Log success snackbar messages did not include `hapticEvent: 'saveSuccess'`;
  - Quick Log failed replacement messages did not include `hapticEvent: 'error'`.
  The route-level after-tap anatomy assertion was already satisfied by the existing visible UI.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/design-primitives.render.test.tsx src/test/quick-log-controller.test.tsx src/test/quick-log-sheet.render.test.tsx`
  — PASS: 3 suites, 72 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, token drift check, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 63 Jest suites / 458 tests, node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.

Implementation notes:
- `src/design/primitives/Snackbar.tsx` now accepts optional `hapticEvent` metadata and triggers the
  shared design haptic adapter only when a shown/replaced snackbar is accepted as the active snackbar.
- `src/features/quick-log/useQuickLogSheetController.ts` now marks normal successful saves as
  `saveSuccess` feedback, not the rare `celebration` feedback.
- `src/features/quick-log/QuickLogFeedbackProvider.tsx` now passes snackbar haptic metadata through
  translation and marks failed replacement snackbars with `error` feedback.
- `src/test/quick-log-sheet.render.test.tsx` now pins the `4.2 Quick Log after tap` route anatomy:
  sheet closes, success snackbar remains, status is polite, surface uses success tint, and Undo/Add
  details are available for a detail-capable tracker.
- Initial 2026-07-02 follow-up: runtime screenshot attempts after production Quick Log saves and through a
  temporary local `SnackbarProvider` route harness still did not expose the transient snackbar host
  on the SE simulator. A RED/GREEN primitive regression now pins `SnackbarProvider` to a full-height
  root (`snackbar-provider-root`) so absolute snackbar overlays have a valid anchor. At that point,
  native visual capture for the snackbar host remained open pending a production screenshot with the
  success surface, Undo, and Add details.
- 2026-07-02 Stage 4 PASS follow-up: root-cause verification showed the production snackbar host was
  reachable in the runtime tree but could be visually covered by the native-stack layer during bitmap
  capture. A RED/GREEN primitive regression now pins active snackbar messages inside
  `react-native-screens` `FullWindowOverlay` (`snackbar-window-overlay`) while preserving the
  full-height provider root anchor. Native SE evidence from the installed PuppyPlan.app over Metro:
  runtime snapshot after a real Quick Log save exposed `Undo` and `Add details`, and
  `output/v2-nav-gaps-stage4/quick-log-production-snackbar-full-window-fast3-stage4.png` shows a
  real production Diary save with `Logged · Feeding`, visible `Undo`, and visible `Add details`.

## 14. Quick Trackers settings / Edit Trackers evidence

**2026-06-30 audit slice:** `/settings/quick-trackers` and Quick Log sheet "Edit Trackers" config.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked Open Design board: `Edit quick trackers`
  (`quicklog-routines` section in the 88-board Codex Design handoff), state `edit-trackers`.
- Routes/components:
  - `/quick-log` sheet -> `editTrackers={() => router.push('/settings/quick-trackers')}`;
  - More tab -> `/settings/quick-trackers`;
  - modal route `app/(modals)/settings/quick-trackers/index.tsx`;
  - `src/features/settings/quick-trackers/screens/QuickTrackersSettingsScreen.tsx`.
- Allowed deviations: implementation uses the accepted canonical tracker vocabulary
  `potty/feeding/sleep/walk/zoomies`; PRD's older optional `training` quick tracker remains deferred
  by the accepted 2026-06-23 canonical tracker taxonomy (ADR-0007) and the final Supabase
  `puppy_quick_tracker_ids_allowed` constraint. Adding `training` would be a schema/contract change,
  not a UI-only patch.

Spec lock for this slice:
- AC-QT-1: Quick Log sheet exposes an Edit Trackers action that opens `/settings/quick-trackers`
  without logging a tracker or dismissing via the fallback close route.
- AC-QT-2: More hub exposes Quick Trackers settings and opens the same route.
- AC-QT-3: Quick Trackers settings renders atlas-style rows with leading tracker icon, reorder
  affordance, toggle control, selected count, max-5 guidance, and no bottom Save CTA.
- AC-QT-4: settings persist valid toggle/reorder changes implicitly, keep at least one tracker
  selected, serialize saves, and recover failed saves without silently losing the prior confirmed
  selection.
- AC-QT-5: non-owner/viewer states do not render the editable tracker form.
- AC-QT-6: `training` is not selectable in this wave; the current accepted contract rejects it until
  a separate ADR-0007 schema/contract delta explicitly re-adds it.

Verification evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-trackers-settings.render.test.tsx src/test/quick-log-route.render.test.tsx src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts src/test/quick-log-contracts.test.ts src/test/supabase-contracts.test.ts`
  — PASS: 6 suites, 61 tests.

Implementation notes:
- `src/test/quick-trackers-settings.render.test.tsx` covers row anatomy, reorder actions, implicit
  save, max/min guardrails, failed-save rollback, owner-only errors, and non-owner lockout.
- `src/test/quick-log-route.render.test.tsx` covers the active sheet Edit Trackers route handoff.
- `src/test/more-settings.render.test.tsx` and `src/test/navigation-contract.test.ts` cover More entry
  and modal route contract.
- `src/test/quick-log-contracts.test.ts`, `src/test/supabase-contracts.test.ts`,
  `docs/architecture/adr/0007-prd-schema-baseline.md`, and
  `supabase/migrations/20260623120000_canonical_quick_log_tracker_taxonomy.sql` prove that
  `training` is intentionally outside the current selected Quick Log tracker vocabulary.
- Stage 4 PASS (2026-07-02): captured native SE screenshot from the installed PuppyPlan.app running
  JS-over-Metro and compared against this slice's locked acceptance. Evidence:
  `output/v2-nav-gaps-stage4/quick-trackers-stage4-top.png`. The route shows the full modal header,
  max-5 guidance, selected count, selected tracker rows with reorder handles/icons/toggles, More
  Options rows, history-preservation hint, and no bottom Save CTA. The live debug account had 3 of 5
  trackers selected, so the max-reached hint was not visible; that state remains covered by the
  render suite above.

### 14a. Quick Trackers settings state templates

**2026-07-02 global-state slice:** deterministic `/settings/quick-trackers` state templates for
§4.5 access and unavailable states.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Route/component: `/settings/quick-trackers` via
  `src/features/settings/quick-trackers/screens/QuickTrackersSettingsScreen.tsx`.
- Dev-gallery handoff: `/_dev/components` renders `SyntheticQuickTrackersStatesShell`.
- Allowed deviation: this slice only standardizes deterministic loading, error, empty, and
  non-owner access templates. Live tracker persistence, save rollback, and real owner/viewer
  authorization remain covered by the existing Quick Trackers route slice above.

Acceptance:
- AC-QT-STATES-1: loading, error, empty, and non-owner states render deterministic card templates
  with stable test IDs.
- AC-QT-STATES-2: each state uses `Card`, `StatusPill`, `AppIcon`, `AppText`, typed i18n keys, and
  EN/RU/ES copy.
- AC-QT-STATES-3: loading announces politely; error and non-owner states use alert semantics.
- AC-QT-STATES-4: the dev-gallery exposes all four states for Stage 4 native handoff.
- AC-QT-STATES-5: non-owner state exposes no editable tracker rows or raw private data.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-trackers-settings.render.test.tsx`
  failed first because `quick-trackers-state-loading` was absent.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx` failed first
  because `dev.gallery.states.quick-trackers-states` was absent from the rendered gallery.

GREEN evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-trackers-settings.render.test.tsx src/test/dev-gallery.render.test.tsx`
  — PASS: 2 suites, 11 tests.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.

Stage 4 evidence:
- Primary SE simulator: `5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`.
- Installed `PuppyPlan.app` launched over fresh Metro with `puppyplan:///_dev/components`.
- Runtime snapshot confirmed the dev-gallery block: `Quick trackers` and
  `Quick Tracker settings loading, error, empty, and owner-only states.`
- Runtime snapshot after scroll confirmed the empty-state card text:
  `Create a puppy profile first` / `Quick trackers are ready after the puppy profile is available.`
- Evidence files:
  `output/v2-nav-gaps-stage4/quick-trackers-states-top-stage4.png`,
  `output/v2-nav-gaps-stage4/quick-trackers-states-empty-stage4.jpg`.

### 14b. Puppy Profile Settings State Templates

**2026-07-03 global-state slice:** deterministic `/settings/puppy-profile` loading, pending-write,
error, offline-read, and permission-denied state templates for §4.5.

- Source spec card: `docs/design/v1/specs/14-2-puppy-profile-settings.md`.
- Source atlas: `docs/design/v1/screenshots/more/14-2-default.png`,
  `docs/design/v1/screenshots/more/14-2-editing.png`.
- Route/component: `/settings/puppy-profile` via
  `src/features/profile/screens/PuppyProfileSettingsScreen.tsx`.
- Dev-gallery handoff: `/_dev/components` should render the state templates inside the visible
  `SyntheticPuppyProfileSettingsShell`; `SyntheticPuppyProfileSettingsStatesShell` remains an
  exported focused-review helper.
- Allowed deviation: this slice only standardizes deterministic state cards and the dev-gallery
  handoff. Photo editing, breed/search picker, sex picker, optional field editors, native
  DatePicker, offline queue, schema/native modules, analytics, and `ios/` / `android/` edits remain
  out of scope.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-PROFILE-STATES-1: the profile settings surface exposes deterministic loading, pending-write,
  error, offline-read, and permission-denied state templates with stable `puppy-profile-state-*`
  test IDs.
- AC-PROFILE-STATES-2: each state uses design primitives (`Card`, `StatusPill`, `AppIcon`,
  `AppText`) and typed EN/RU/ES i18n status/title/body copy.
- AC-PROFILE-STATES-3: loading and pending-write announce politely; error and permission-denied use
  alert semantics; offline-read uses the muted template surface.
- AC-PROFILE-STATES-4: state copy exposes no raw puppy names, notes, emails, provider names, photos,
  tokens, or private contact data.
- AC-PROFILE-STATES-5: the dev-gallery route-shell preview includes all five profile settings
  state templates for native Stage 4 handoff.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/puppy-profile-settings.render.test.tsx --testNamePattern AC-PROFILE-STATES`
  failed as expected before implementation because `PuppyProfileSettingsStatePreview` was not
  exported.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern "route-shell preview states"`
  failed as expected before implementation because `SyntheticPuppyProfileSettingsStatesShell` was not
  exported/rendered.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern AC-PROFILE-STATES`
  failed as expected during Stage 4 correction because the visible profile shell rendered only the
  form, not the state templates.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/puppy-profile-settings.render.test.tsx --testNamePattern AC-PROFILE-STATES`
  — PASS: 1 suite, 1 matching test.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern "route-shell preview states"`
  — PASS: 1 suite, 1 matching test.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern AC-PROFILE-STATES`
  — PASS: 1 suite, 1 matching test.
- `npm run test:unit -- --runTestsByPath src/test/puppy-profile-settings.render.test.tsx src/test/dev-gallery.render.test.tsx src/test/i18n.test.ts`
  — PASS: 3 suites, 24 tests.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, 79 Jest suites / 650 tests, node tests, scaffold
  checks, token drift check, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning from motion snapshot listeners; no failures.

Stage 4 evidence:
- PASS recorded 2026-07-03 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) using JS-over-Metro dev-client mode after clearing the
  Metro cache and opening `puppyplan://_dev/components`; native build was not run.
- Screenshots:
  `output/v2-nav-gaps-stage4/puppy-profile-shell-stage4.jpg`,
  `output/v2-nav-gaps-stage4/puppy-profile-states-top-stage4.jpg`,
  `output/v2-nav-gaps-stage4/puppy-profile-states-bottom-stage4.jpg`.

## 15. Pet tab landing/hub Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/pet` landing/hub anatomy.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Locked Open Design board: `Pet hub` (`pet-health` section in the 88-board Codex Design handoff),
  state `landing/hub`.
- Historical atlas cross-reference: Health `11.1 List · mixed templates + records`,
  More `14.2 Puppy profile · saved view`; V2 allowed deviation folds both into the Pet tab.
- Route/component: `/pet`, `src/features/health/screens/HealthScreen.tsx`.
- Allowed deviations: until durable active-pet data wiring lands, the hub may render a neutral
  incomplete-profile placeholder by default and accept synthetic `petSummary` props in render tests.
  It must not show fake production puppy data.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-PET-HUB-1: `/pet` renders a top Pet profile hub card before health filters/rows.
- AC-PET-HUB-2: the hub includes non-color-only profile anatomy: avatar/photo placeholder, puppy
  name/title, age, breed, current weight, and an Edit profile affordance.
- AC-PET-HUB-3: the weight area includes an Add weight affordance without introducing a chart.
- AC-PET-HUB-4: the hub exposes a Quick Trackers entry point so Pet can lead to tracker setup while
  Quick Log remains the separate Add action, not a tab.
- AC-PET-HUB-5: the existing lightweight Health block remains visible below the hub; standalone
  Health tab, charts, multi-pet switcher, medication/refill, and health CRUD are out of this slice.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx` failed as expected while
  `pet-profile-hub-trackers-entry` was a non-actionable accessible `View`: no element with role
  `button` and label `health.pet-hub.quick-trackers-a11y` existed.
- Regression proof for route handoff: temporarily removing the `/pet` route callback made
  `npm run test:unit -- --runTestsByPath src/test/pet-route.render.test.tsx` fail as expected with
  `Expected: "/settings/quick-trackers"; Number of calls: 0`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx` — PASS: 1 suite, 5 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/pet-route.render.test.tsx`
  — PASS: 2 suites, 6 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/pet-route.render.test.tsx src/test/i18n.test.ts src/test/navigation-contract.test.ts`
  — PASS: 4 suites, 23 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx src/test/onboarding-flow.render.test.tsx`
  — PASS: 2 suites, 17 tests, after wrapping the First Log preview in `SnackbarProvider` inside the
  design gallery.
- `npm run check` — PASS: lint, typecheck, Jest 66 suites / 474 tests, node tests 118,
  scaffold checks, tokens, privacy scan, and text hygiene. Existing unrelated React `act(...)`
  warning in `screen-header.render.test.tsx` remains a warning, not a failure.
- `git diff --check` — PASS.
- `npm run check` — PASS: lint, typecheck, 64 Jest suites / 460 tests, node tests, scaffold checks,
  tokens, privacy scan, and text hygiene. Output still includes the existing React `act(...)` warning
  in `screen-header.render.test.tsx`; no failures.

Implementation notes:
- `src/features/health/screens/HealthScreen.tsx` now renders the Pet hub before the lightweight
  Health block, using `Card`, `Avatar`, `Button`, `Touchable`, `AppIcon`, `Stack`, and tokenized
  styles from `src/design`.
- The Quick Trackers entry is a real 44pt+ accessible button with a chevron and press feedback, not
  a static visual row.
- `app/(tabs)/pet/index.tsx` remains thin and only wires `onOpenQuickTrackers` to
  `router.push('/settings/quick-trackers')`.
- Stage 4 PASS (2026-07-02): captured native SE screenshots from the installed PuppyPlan.app running
  JS-over-Metro and compared against `docs/design/v1/specs/05-pet-health.md` plus this slice's locked
  acceptance. Evidence: `output/v2-nav-gaps-stage4/pet-stage4-top.png` (profile hub / Quick Trackers
  entry) and `output/v2-nav-gaps-stage4/pet-stage4-health-empty.png` (Health empty state after scroll).
  The route shows the Pet title, neutral profile placeholder, age/breed/weight facts, Edit profile,
  Add weight, accessible Quick Trackers entry, health filters/chips, empty Health state, Add entry,
  disabled Browse templates, and non-diagnostic footer copy without bottom-chrome overlap. Mixed health
  list, add-record modal, detail/delete, and vet-prep Stage 4 checks remain separate plan items.

### 15a. Pet Health main state templates

**2026-07-02 state slice:** add deterministic Loading / Error / Offline-read state templates to the
main `/pet` Health list surface and wire the production route to real active-care / health-record
query loading and error states. This closes only the main Health list state shell; it does not add
health offline writes, permissions, new data model fields, or native modules.

- Stage 0 lock: `docs/design/v1/specs/05-pet-health.md`.
- Source canon: DESIGN.md §4.5 global screen states and §4.1 Pet / Health folded surface.
- Route/components: `/pet`, `src/features/health/screens/HealthScreen.tsx`,
  `app/(tabs)/pet/index.tsx`, dev-gallery health shell.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-PET-STATES-1: `HealthScreen` exposes deterministic `loading`, `error`, and `offline-read`
  review states using tokenized `Card` + `StatusPill`, typed EN/RU/ES copy, and stable
  `health-main-state-*` test IDs.
- AC-PET-STATES-2: error state uses alert semantics, loading uses a polite live region, and
  offline-read copy explicitly says it is showing the last saved data.
- AC-PET-STATES-3: the production `/pet` route passes loading while active-care or health records are
  loading, and passes error when either query fails or active care context is unavailable.
- AC-PET-STATES-4: the state cards render in the Pet Health surface without fake health rows and
  without hiding the Pet profile hub.
- AC-PET-STATES-5: no schema migration, native module, health offline queue, permission system, or
  `ios` / `android` edit is introduced in this slice.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/pet-route.render.test.tsx`
  failed as expected before implementation: `health-main-state-loading` was absent, and the
  production Pet route still rendered the empty Health state while the health-record query was
  loading.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/pet-route.render.test.tsx src/test/dev-gallery.render.test.tsx`
  — PASS: 3 suites, 18 tests.
- `node scripts/checks/check-i18n.mjs` — PASS: i18n parity, typed helper usage, and string budgets ok.
- `npm run tokens:check` — PASS.
- `npm run typecheck` — PASS.
- `git diff --check` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 76 suites / 612 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing non-failing reduced-motion `act(...)` warnings
  remain unrelated to this slice.

Implementation notes:
- `HealthScreen` now exposes compact `HealthMainStatePreview` cards for loading, error, and
  offline-read states. The state card renders after the Pet profile hub and before health rows, so
  it does not hide the profile surface and does not fabricate health records.
- `/pet` maps active-care loading, health-record loading, active-care error, missing active context,
  and health-record query error into the appropriate Health main list state.
- The development gallery now includes the three compact Pet Health main state cards for native
  handoff.
- No schema migration, native module, health offline queue, permission system, analytics payload, or
  `ios` / `android` edit was introduced.

Stage 4:
- PASS recorded 2026-07-03 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro on port 8081.
- Native evidence: `output/v2-nav-gaps-stage4/pet-health-main-states-cards-stage4.png`.
- Visual review covers the compact Pet Health main `Loading`, `Could not load`, and `Offline` state
  cards in the dev-gallery handoff shell, with readable status pills, non-bright error tone,
  sunken offline surface, wrapped body copy, and no fake Health rows. `idb describe-all` did not
  expose the nested Card labels in this scroll position, so this PASS is based on the bitmap capture
  plus the RED/GREEN render assertions above.

## 16. Health Add Record route Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/pet/health-record-edit` Add Record route anatomy.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Locked states: `add record`, cross-referenced to historical atlas `11.2 Edit · empty form`
  and `11.3 Edit · filled, ready to save`.
- Route/component: `/pet/health-record-edit`,
  `app/(modals)/pet/health-record-edit/index.tsx`,
  `src/features/health/screens/HealthScreen.tsx`.
- Allowed deviation: the route currently implements the native type chooser and empty form anatomy
  only. Durable save, edit/delete, status-transition behavior, loading/error/offline states, and
  native screenshot comparison remain plan-owned follow-up work.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-PET-ADD-1: the empty Pet Health state opens `/pet/health-record-edit`.
- AC-PET-ADD-2: the route first renders a native record-type chooser with Close, `New entry`,
  four record types (Vaccination, Parasite treatment, Preventive care, Vet visit), and calm helper
  copy.
- AC-PET-ADD-3: choosing a record type transitions to the health record form anatomy with main
  fields, more fields, status segmented control, urgent toggle, and privacy/non-diagnostic hints.
- AC-PET-ADD-4: no diagnosis, dosage, treatment-plan, or emergency language is introduced.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx`
  failed as expected:
  - `health.empty.primary` was still disabled, so the Add Record affordance could not open a route.
  - the new modal route returned `null`, so no Close button / type chooser existed.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx`
  — PASS: 3 suites, 10 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx src/test/navigation-contract.test.ts src/test/i18n.test.ts`
  — PASS: 5 suites, 27 tests.
- `npm run test:unit -- --runTestsByPath src/test/app-shell.render.test.tsx src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx`
  — PASS: 4 suites, 17 tests.
- `npm run typecheck` initially failed because generated `.expo/types/router.d.ts` was stale and did
  not contain `/pet/health-record-edit`; regenerating typed routes from the Expo Router generator added
  the route without weakening TypeScript.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, Jest 66 suites / 472 tests, node tests 118, scaffold
  checks, tokens, privacy scan, and text hygiene. Existing unrelated React `act(...)` warning in
  `screen-header.render.test.tsx` remains a warning, not a failure.
- `npm run check` — PASS: lint, typecheck, 65 Jest suites / 464 tests, 118 node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- `npm run check` — PASS: lint, typecheck, 65 Jest suites / 464 tests, 118 node tests, scaffold checks,
  tokens, privacy scan, and text hygiene. Output still includes the existing React `act(...)` warning
  in `screen-header.render.test.tsx`; no failures.

Implementation notes:
- `app/(tabs)/pet/index.tsx` stays thin and routes the empty Health Add Record action to
  `router.push('/pet/health-record-edit')`.
- `app/(modals)/pet/health-record-edit/index.tsx` stays thin and wires Close to `router.back()`.
- `HealthRecordEditRouteScreen` uses design primitives (`Screen`, `Card`, `Button`, `ListGroup`,
  `ListRow`, `AppIcon`, `SegmentedControl`, `TextField`, `Toggle`) and existing EN/RU/ES i18n keys.
- State-template follow-up (2026-07-02): `HealthRecordEditRouteScreen` and
  `HealthRecordEditPreview` now accept a typed synthetic `reviewState` for `loading`,
  `pending-write`, `error`, `offline-read`, and `permission-denied`. Each state renders a
  tokenized `Card` + `StatusPill` using EN/RU/ES keys, with alert roles for error/permission and a
  polite live region for pending write. This is a deterministic UI template only; durable save,
  queued offline writes, permission enforcement, and native Stage 4 state screenshots remain open.
- State-template RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/health-record-edit-route.render.test.tsx`
  failed as expected because `health-add-record-state-loading` did not exist.
- State-template GREEN evidence:
  `npm run test:unit -- --runTestsByPath src/test/health-record-edit-route.render.test.tsx`
  — PASS: 1 suite, 3 tests.
- Adjacent state/i18n evidence:
  `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx src/test/i18n.test.ts src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx`
  — PASS: 4 suites, 24 tests; `node scripts/checks/check-i18n.mjs` — PASS.
- State-template Stage 4 PASS (2026-07-02): launched the already installed PuppyPlan.app on
  `Grith iPhone SE 3 iOS 26.3` over Metro, opened `/_dev/components`, and captured synthetic native
  screenshots for all Add Record state templates. Evidence:
  `output/v2-nav-gaps-stage4/health-add-record-state-loading-stage4.jpg`,
  `output/v2-nav-gaps-stage4/health-add-record-state-pending-stage4.jpg`,
  `output/v2-nav-gaps-stage4/health-add-record-state-error-stage4.jpg`,
  `output/v2-nav-gaps-stage4/health-add-record-state-offline-stage4.jpg`, and
  `output/v2-nav-gaps-stage4/health-add-record-state-permission-stage4.jpg`. The captures show the
  state cards inside the native Add Record chrome, readable form content below, alert/error coloring
  for blocked states, and no diagnosis/dosage/treatment-plan/emergency copy.
- Stage 4 PASS (2026-07-02): captured native SE screenshots from the installed PuppyPlan.app running
  JS-over-Metro and compared against `docs/design/v1/specs/05-pet-health.md` plus this slice's locked
  acceptance. Evidence:
  `output/v2-nav-gaps-stage4/health-record-edit-chooser-stage4-after-card-a11y.png`,
  `output/v2-nav-gaps-stage4/health-record-edit-form-stage4-top-after-card-a11y.png`, and
  `output/v2-nav-gaps-stage4/health-record-edit-form-stage4-bottom-after-card-a11y.png`.
  Runtime snapshot also exposes the four type chooser targets and the empty-form fields, confirming
  the chooser can be operated through native accessibility. Durable save/persistence remains open.

### 16a. Health Add Record durable create/list slice

**2026-07-02 data-layer slice:** make the existing `/pet/health-record-edit` form create rows in the
current `public.health_record` schema and let Pet render those rows through a typed query.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Source canon: `DESIGN.md` §4.1.3 Add Record Flow, PRD Health Record Contract, and
  `docs/architecture/03-client-data-layer.md` health mutation invalidation row.
- Route/components: `/pet`, `/pet/health-record-edit`,
  `src/features/health/screens/HealthScreen.tsx`, `src/lib/supabase/health-records.ts`,
  `src/lib/query/health-records.ts`.
- TDD mode: heavy/full-isolated target; if implemented in the main thread, treat this as reduced
  isolation and keep scope small with repository/query tests first.
- No-Linear exception: user explicitly directed this thread to implement the active nav-gaps plan;
  no separate Linear issue was provided in this continuation.

Acceptance:
- AC-PET-ADD-DURABLE-1: the Supabase boundary can list non-deleted `health_record` rows for one puppy
  ordered by scheduled/completed/created recency and can insert a row using only current schema fields.
- AC-PET-ADD-DURABLE-2: the create mutation requires an authenticated active care context and writes
  `puppy_id`, `record_type`, trimmed `title`, `status`, `source`, `scheduled_for`, optional
  `provider_name`, optional `notes`, and `updated_by`.
- AC-PET-ADD-DURABLE-3: the Pet screen consumes the typed health-record query; server rows render as
  Health list rows, while the old mixed-list fixture remains synthetic-only.
- AC-PET-ADD-DURABLE-4: Save is disabled until a title exists, shows pending state during mutation,
  closes the sheet after success, and invalidates `health.records.list`, `today.dashboard`,
  `puppy.summary`, and sharing projection roots.
- AC-PET-ADD-DURABLE-5: no new columns, migrations, native DatePicker, offline queue, durable delete,
  or `ios/`/`android/` edits are introduced in this slice.
- AC-PET-ADD-DURABLE-6: copy remains calm and non-diagnostic; notes/provider data are never logged,
  cached in analytics, or added to share previews by this slice.

Deferred from this slice:
- edit/delete/undo, timed undo restore, offline health queue, native DatePicker, urgent persistence,
  health share projection expansion, and real template recommendation generation.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts` failed first because
  `insertHealthRecord` / `listHealthRecords` were stubbed as not implemented.
- The same focused suite failed next because `toHealthRecordInsert` and the mutation function were
  not implemented.
- The same focused suite failed next because mutation `onSuccess` did not exist.
- `npm run test:unit -- --runTestsByPath src/test/pet-route.render.test.tsx` failed because the Pet
  route ignored the typed health-record query and did not render the server row fixture.
- `npm run test:unit -- --runTestsByPath src/test/health-record-edit-route.render.test.tsx` failed
  because the Add Record form did not call the create mutation on Save.

GREEN evidence:
- `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts`
  — PASS: 1 suite, 5 tests.
- `npm run test:unit -- --runTestsByPath src/test/pet-route.render.test.tsx`
  — PASS: 1 suite, 4 tests.
- `npm run test:unit -- --runTestsByPath src/test/health-record-edit-route.render.test.tsx`
  — PASS: 1 suite, 4 tests.
- `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx src/test/health.render.test.tsx src/test/app-shell.render.test.tsx`
  — PASS: 5 suites, 29 tests.
- `npm run typecheck` — PASS.

Implementation notes:
- `src/lib/supabase/health-records.ts` is the only Supabase boundary for this slice. Feature UI does
  not import the raw Supabase client.
- `src/lib/query/health-records.ts` owns draft normalization, create mutation, and query invalidation.
- Mutation settle invalidates health records, Today dashboard, puppy summary, and sharing projection
  roots without broad cache clearing.
- Pet production rows now come from `useHealthRecordsQuery`; `reviewState="mixed-list"` remains an
  explicit synthetic fixture.
- `/pet/health-record-edit` save uses the active care context, keeps Save disabled until a title and
  care context exist, shows pending state during mutation, and closes only after successful create.

Stage 4 evidence:
- Primary SE simulator: `5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`.
- Installed `PuppyPlan.app` launched over Metro with `puppyplan:///pet/health-record-edit`.
- Runtime snapshot confirmed the native chooser targets (`Vaccination`, `Parasite treatment`,
  `Preventive care`, `Vet visit`) and the form fields (`Name`, `Date`, clinic, note, urgent toggle).
- Direct deep-link runtime had no active care context, so Save remained disabled; the mutation/save
  path is proven by the render test with active care context rather than a live Supabase write.
- Evidence file: `output/v2-nav-gaps-stage4/health-add-record-durable-form-stage4.jpg`.

### 16b. Health Add Record template generation slice

**2026-07-02 next implementation slice:** replace the remaining static-only Health template
recommendation with a deterministic production template suggestion in `/pet/health-record-edit`.
This slice is intentionally narrow: it implements the authored `DHPP, 12 weeks` template from the
atlas and does not introduce dosage, diagnosis, medication instruction, emergency triage, offline
queue, or native DatePicker work.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Source canon: `DESIGN.md` §4.1.5 Template Suggestion and the PRD Health safety rule:
  vaccination/deworming schedules are editable templates and must use review-with-vet wording.
- Source atlas: `health/11-1.png` / raw `HealthRow` showing `DHPP, 12 weeks` as a suggested
  template with `Template, not a prescription`.
- Route/components: `/pet/health-record-edit` and `src/features/health/screens/HealthScreen.tsx`.
- TDD mode: lightweight; reduced assurance because this continuation is running in the main thread,
  but RED tests must be observed before implementation.

Acceptance:
- AC-PET-TEMPLATE-1: when active puppy age resolves to 12 weeks, the add-record chooser renders a
  calm suggested `DHPP, 12 weeks` template row with existing non-prescriptive copy.
- AC-PET-TEMPLATE-2: pressing the suggested template opens the existing Add Record form prefilled
  as a vaccination template, with title `DHPP, 12 weeks` and status `template`.
- AC-PET-TEMPLATE-3: saving that prefilled form writes the same typed create draft path as manual
  records; no separate schema, analytics payload, raw provider/note logging, or native module is added.
- AC-PET-TEMPLATE-4: if the puppy age is not known or not in the 12-week window, the chooser keeps
  the existing manual record-type options and does not fabricate the DHPP template.

Implementation evidence:
- RED: `npm run test:unit -- --runTestsByPath src/test/health-record-edit-route.render.test.tsx`
  failed before implementation on `Unable to find an element with text: Template, not a prescription`.
- GREEN: the same command now passes 6 tests, including AC-PET-TEMPLATE-1 through
  AC-PET-TEMPLATE-4.
- Related render check:
  `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/pet-route.render.test.tsx src/test/app-shell.render.test.tsx`
  passes 21 tests.
- Type check: `npm run typecheck` passes.

Implementation notes:
- The route now generates exactly one authored template suggestion when the active puppy has
  `age_weeks_estimate === 12`; unknown or different ages keep the manual record-type chooser only.
- The suggested row uses existing `ListRow`, `StatusPill`, typed i18n keys, and the current durable
  create draft mutation. It does not add schema fields, analytics payloads, native modules, or health
  schedule inference.

Stage 4 evidence:
- Primary SE simulator: `5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`.
- Metro was started with `npx expo start`; the already-installed `PuppyPlan.app` was launched through
  XcodeBuildMCP without native rebuild, then deep-linked with `puppyplan:///pet/health-record-edit`.
- Runtime screenshot proved the route still loads over current JS and renders the manual chooser
  correctly. The runtime did not have an active puppy with `age_weeks_estimate === 12`, so the
  generated template state was not visually captured in the simulator.
- Evidence file: `output/v2-nav-gaps-stage4/health-add-record-template-runtime-blocker.jpg`
  (ignored local artifact). Template-state behavior is covered by the render test with mocked active
  puppy context until a dev account fixture exposes a 12-week puppy in runtime.

## 17. Health detail status/delete anatomy Stage-0 lock evidence

**2026-06-30 next implementation slice:** Health record detail status strip + delete pending undo preview.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Locked DESIGN refs: §4.1.4 Edit Record / Delete (Undo), §4.1.6 Status Transitions Visualisation.
- Route/component: `HealthRecordDetailPreview` in
  `src/features/health/screens/HealthScreen.tsx`.
- Allowed deviation: this slice implements native structural anatomy only. Real record persistence,
  editable dirty-state behavior, soft warning haptic, timed 5-second undo restore, and native screenshot
  comparison remain plan-owned follow-up work.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-PET-STATUS-1: detail view renders four visible status steps: Template, Needs vet review,
  Confirmed, Done.
- AC-PET-STATUS-2: each stage is non-color-only: visible icon + visible label.
- AC-PET-STATUS-3: exactly one stage is active and filled with the current status tone; inactive steps
  remain outline/raised.
- AC-PET-STATUS-4: the strip exposes a single full-sequence accessibility label using the existing
  `health.status-transitions.a11y-template`.
- AC-PET-DELETE-1: delete pending state shows the delete confirm busy/disabled controls plus a visible
  undo-toast preview using the existing localized copy.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx` failed as expected before
  implementation:
  - `health-stage-step` did not exist because the status strip still rendered unlabeled hidden bars.
  - `health.edit-record.delete-undo-toast` was absent from the delete pending anatomy.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx`
  — PASS: 1 suite, 6 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx src/test/i18n.test.ts src/test/navigation-contract.test.ts`
  — PASS: 5 suites, 27 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: 67 Jest suites / 491 tests, node tests 118/118, scaffold, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` is unrelated to this slice.

Implementation notes:
- `HealthStageStrip` now renders `health-stage-step` cards with `AppIcon`, visible labels, tone fills,
  and the existing aggregate accessibility label.
- Delete pending preview now renders the localized `Entry deleted. Undo` toast copy in a polite live
  region without adding a new primitive or unsupported React Native role.
- `src/contracts/navigation.ts` now includes `health.edit-record.delete-undo-toast` in
  `shellI18nKeys`.
- Stage 4 PASS (2026-07-02): captured native SE screenshots from the installed PuppyPlan.app running
  JS-over-Metro and compared against `docs/design/v1/specs/05-pet-health.md` plus this slice's locked
  acceptance. Evidence:
  `output/v2-nav-gaps-stage4/health-detail-confirmed-stage4.png`,
  `output/v2-nav-gaps-stage4/health-detail-stage-strip-stage4.png`,
  `output/v2-nav-gaps-stage4/health-detail-needs-review-stage4.png`, and
  `output/v2-nav-gaps-stage4/health-detail-delete-pending-stage4.png`. Runtime snapshot evidence also
  exposed the status-strip accessibility labels (`Stage 3 of 4: Confirmed...` and
  `Stage 2 of 4: Needs vet review...`) plus the busy `Delete entry` target. The screenshots show
  confirmed and needs-vet-review detail rows, four non-color-only stage steps, one active filled stage,
  the delete confirm card, disabled destructive delete, and undo-toast preview. Real record persistence,
  editable dirty-state behavior, soft warning haptic, timed undo restore, and durable delete remain open.

### 17a. Health record durable edit/delete/restore slice

**2026-07-02 data-layer slice:** extend the existing Health record Supabase/query boundary from
create/list into edit, soft-delete, and restore operations using the current `public.health_record`
schema and RLS policy. This is the persistence foundation for §4.1.4; it does not add a new native
detail route or offline queue.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Source canon: `DESIGN.md` §4.1.4 Edit Record / Delete (Undo), PRD Health Basics
  (`updated_by`, `updated_at`, `deleted_at`), and `docs/architecture/03-client-data-layer.md`
  health mutation invalidation row.
- Route/components: `src/lib/supabase/health-records.ts`, `src/lib/query/health-records.ts`,
  `src/test/health-records-query.test.ts`.
- TDD mode: lightweight; reduced assurance because this continuation is running in the main thread,
  but the slice is constrained to repository/query contracts with focused RED/GREEN tests before code.

Acceptance:
- AC-PET-EDIT-DURABLE-1: the Supabase boundary can update an existing non-deleted `health_record`
  row by id/puppy id with trimmed title/provider/notes, status/source/date fields, `updated_by`,
  and explicit `updated_at`, then parse the returned row through `healthRecordSchema`.
- AC-PET-EDIT-DURABLE-2: the Supabase boundary can soft-delete a row by id/puppy id by setting
  `deleted_at`, `updated_at`, and `updated_by` without selecting the deleted row back through RLS.
- AC-PET-EDIT-DURABLE-3: the Supabase boundary can restore a soft-deleted row by id/puppy id by
  setting `deleted_at: null`, `updated_at`, and `updated_by`, then parse the visible restored row.
- AC-PET-EDIT-DURABLE-4: update/delete/restore mutation options invalidate `health.records`,
  `today.dashboard`, `puppy.summary`, and sharing projection root via `queryKeys`; no broad cache
  clear and no free-form query keys.
- AC-PET-EDIT-DURABLE-5: no schema migrations, native DatePicker, offline queue, new analytics,
  or `ios/`/`android/` edits are introduced in this slice.
- AC-PET-EDIT-DURABLE-6: raw notes/provider data are never logged or added to analytics/share
  previews by this slice.

Deferred from this slice:
- native Health detail routing, editable dirty-state UI, haptics, timed 5-second undo scheduling,
  offline health queue, and Stage 4 screenshots for the future production detail route.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts` failed first with
  six expected missing-contract failures: `toHealthRecordUpdate`, update/delete/restore repository
  methods, and update/delete/restore mutation option factories did not exist.
- Follow-up RED for the no-silent-delete guard failed as expected because a zero-row soft delete
  (`count: 0`) resolved successfully instead of rejecting.
- Review follow-up RED failed as expected because update changed existing manual `source` to
  status-derived `confirmed`, and date-change invalidation skipped the previous Today dashboard key.

GREEN evidence:
- `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts`
  — PASS: 1 suite, 12 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx src/test/health.render.test.tsx`
  — PASS: 4 suites, 26 tests.

Implementation notes:
- `src/lib/supabase/health-records.ts` now exposes typed update, soft-delete, and restore methods.
  Soft delete intentionally does not select the tombstoned row back, because the existing RLS read
  policy hides rows after `deleted_at` is set. The default soft-delete call requests exact affected
  row count and treats `count: 0` as `health_record_delete_failed` instead of silently succeeding.
- `src/lib/query/health-records.ts` now maps edit/delete/restore drafts, preserves the existing
  create/list behavior, preserves existing `source` on update, and invalidates Health records,
  affected Today dashboard date(s), puppy summary, and sharing projection root through `queryKeys`.
- No UI route, native picker, offline queue, analytics, schema, `ios/`, or `android/` changes were
  introduced. Stage 4 screenshot evidence is not applicable to this data-layer slice; the future
  production Health detail route still owns that visual gate.

### 17b. Health record production detail route wiring

**2026-07-02 read-only route slice:** wire server-backed Pet Health rows to a real production
detail modal at `/pet/health-record/[recordId]`, backed by a typed single-record Supabase/query
contract. This closes the route wiring gap only; edit/delete/timed undo persistence remains a
separate §4.1.4 slice.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Source atlas: `health/11-4.png` confirmed detail and `health/11-5.png` needs-vet-review detail.
- Route/components: `app/(tabs)/pet/index.tsx`,
  `app/(modals)/pet/health-record/[recordId].tsx`, `src/features/health/screens/HealthScreen.tsx`,
  `src/lib/supabase/health-records.ts`, `src/lib/query/health-records.ts`, `src/contracts/navigation.ts`.
- TDD mode: lightweight; reduced assurance because this continuation is running in the main thread,
  but each acceptance item below had a focused RED before implementation.

Acceptance:
- AC-PET-DETAIL-1: pressing a server-backed Pet Health row routes to
  `/pet/health-record/[recordId]` with the selected `health_record.id`.
- AC-PET-DETAIL-2: the Supabase boundary can fetch one non-deleted `health_record` by `recordId`
  and `puppyId`, parse it through `healthRecordSchema`, and fail closed when the row is missing or
  inaccessible.
- AC-PET-DETAIL-3: the production detail modal reads the active puppy context and route param,
  renders real title/date/status/provider/note values, and uses localized calm states for loading,
  unavailable, not-found, and error.
- AC-PET-DETAIL-4: update/delete/restore mutation invalidation now includes the single-record
  detail query key in addition to the list and dependent dashboard/projection keys.
- AC-PET-DETAIL-5: production detail is read-only in this slice; the existing delete confirm/undo
  anatomy remains synthetic-only until real timed undo restore wiring is implemented.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/pet-route.render.test.tsx` failed first because
  server-backed Health rows were static views, not buttons, and no detail route push occurred.
- `npm run test:unit -- --runTestsByPath src/test/health-records-query.test.ts` failed first with
  `detailRepository.getHealthRecord is not a function`.
- `npm run test:unit -- --runTestsByPath src/test/health-record-detail-route.render.test.tsx`
  failed first because `app/(modals)/pet/health-record/[recordId].tsx` did not exist.
- `npm run test:unit -- --runTestsByPath src/test/navigation-contract.test.ts` failed first
  because the dynamic detail route was missing from `modalRoutes` / `plannedRouteFiles`.

GREEN evidence:
- Targeted RED/GREEN suites passed:
  `src/test/pet-route.render.test.tsx`, `src/test/health-record-detail-route.render.test.tsx`,
  `src/test/health-records-query.test.ts`, `src/test/navigation-contract.test.ts`, and
  `src/test/health.render.test.tsx`.
- `npm run typecheck` initially failed until Expo Router typed routes were regenerated by starting
  Metro on a temporary port; the repeated `npm run typecheck` passed.
- `npm run test:scaffold` passed after adding the new `health.detail.*` state keys to
  `shellI18nKeys`.
- Full `npm run check` passed on 2026-07-02: lint, typecheck, 72 Jest suites / 568 tests,
  node checks, scaffold, tokens, privacy scan, and text hygiene.

Stage 4 status:
- The production route uses the same native detail component whose confirmed / needs-vet-review
  anatomy already has Stage 4 SE evidence from `health/11-4.png` and `health/11-5.png`.
- No new visual anatomy was introduced in this slice; the route only swaps synthetic DHPP values for
  real `health_record` values and hides synthetic-only destructive controls in production.
- Stage 4 PASS follow-up (2026-07-02): created a synthetic non-production Supabase Dev
  `health_record` seed for the existing debug account active puppy, launched the installed
  PuppyPlan.app over Metro on the primary SE simulator, and deep-linked to
  `puppyplan:///pet/health-record/00000000-0000-4000-8000-000000003003`.
  Evidence: `output/v2-nav-gaps-stage4/health-detail-production-seeded-stage4.jpg`.
  The screenshot shows the production route loading the seeded `DHPP booster` record with date,
  confirmed status, empty clinic/note values, and the status stage strip. The seed intentionally
  leaves provider/name notes empty to avoid storing private provider or note data.

### 17c. Health record production delete + timed undo wiring

**2026-07-02 production wiring slice:** connect the existing read-only production Health detail
route to the already implemented delete/restore mutations and existing global Snackbar primitive.
This closes the user-facing delete/undo wiring gap without adding new schema, native modules, or
offline queue behavior.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Source atlas: `health/11-4.png` confirmed detail, `health/11-5.png` needs-vet-review detail, and
  the existing §17 delete pending anatomy evidence.
- Source canon: `DESIGN.md` §4.1.4 Edit Record / Delete (Undo): delete confirm, warning feedback,
  and undo available for 5 seconds.
- Route/components: `app/(modals)/pet/health-record/[recordId].tsx`,
  `src/features/health/screens/HealthScreen.tsx`, `src/lib/query/health-records.ts`, and
  `src/design/primitives/Snackbar.tsx`.
- TDD mode: lightweight; reduced assurance because this continuation is running in the main thread,
  but RED tests must be observed before implementation.

Acceptance:
- AC-PET-DELETE-PROD-1: the production detail route renders the existing destructive Delete entry
  affordance for a loaded server record, while loading/unavailable/not-found/error states keep it hidden.
- AC-PET-DELETE-PROD-2: confirming delete calls the typed delete mutation with record id, puppy id,
  household id, affected date, user id, and explicit timestamp fields; no raw notes/provider data are
  logged or added to analytics.
- AC-PET-DELETE-PROD-3: after successful delete, the route closes back to Pet and shows the existing
  design Snackbar with warning haptic, localized delete/undo copy, localized Undo action, and
  `durationMs: 5000`.
- AC-PET-DELETE-PROD-4: pressing Undo on that snackbar calls the typed restore mutation with the same
  record id / puppy id / household id / affected date / user id fields and a fresh explicit
  `updatedAt`.
- AC-PET-DELETE-PROD-5: delete failure keeps the user on the detail route and renders the existing
  Health error state; it does not silently close the modal or hide the failure.
- Out of scope: editable dirty-state form, offline health queue, native DatePicker, schema changes,
  and new analytics payloads.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health-record-detail-route.render.test.tsx`
  failed before implementation because the production detail route did not render `Delete entry` or
  the confirm `Delete` control.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health-record-detail-route.render.test.tsx`
  — PASS: 1 suite, 3 tests.
- `npm run test:unit -- --runTestsByPath src/test/health-record-detail-route.render.test.tsx src/test/health-records-query.test.ts src/test/health.render.test.tsx src/test/pet-route.render.test.tsx src/test/design-primitives.render.test.tsx`
  — PASS: 5 suites, 73 tests.
- `npm run typecheck` — PASS.

Implementation notes:
- `HealthRecordDetailRouteScreen` now uses the existing typed delete/restore mutations and global
  design `Snackbar`; loaded record states render the destructive controls, while loading/unavailable/
  not-found/error states still use state cards without destructive actions.
- Successful delete builds an explicit timestamped draft, triggers warning haptic snackbar feedback
  for 5 seconds, closes the modal, and exposes an Undo action that restores through the typed restore
  mutation. Delete failure renders the existing detail error state and does not close.
- Restore failures replace the same snackbar with the existing localized Health error copy instead of
  silently swallowing the failure.

Stage 4 status:
- Primary SE simulator: `5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`.
- Metro was started with `npx expo start`; the already-installed `PuppyPlan.app` was launched through
  XcodeBuildMCP without native rebuild, then deep-linked to
  `puppyplan:///pet/health-record/00000000-0000-4000-8000-000000003003`.
- Stage 4 partial PASS follow-up (2026-07-02): after adding a non-production debug seed, the same
  production route now renders the destructive delete area and confirm card on a loaded server record.
  Evidence:
  `output/v2-nav-gaps-stage4/health-detail-delete-confirm-production-seeded-stage4.jpg`.
- Runtime accessibility follow-up: XcodeBuildMCP initially exposed only the aggregate alert card, not
  the nested `Cancel` / `Delete` buttons. RED/GREEN coverage was added in
  `src/test/health.render.test.tsx`, and `Card` now allows an explicit `accessible={false}` override
  for non-interactive containers with nested button controls. A repeated runtime snapshot exposed
  separate `Cancel` and `Delete` button targets.
- Real delete/undo snackbar Stage 4 remains **not PASS**. Pressing the runtime confirm `Delete`
  exercised the real authenticated mutation and reproduced the known deferred Health soft-delete RLS
  gap: authenticated `health_record` update with `deleted_at` returns `42501`
  (`new row violates row-level security policy`). The route correctly rendered the existing Health
  error state instead of silently closing. The dev seed was restored to `deleted_at: null` afterward.
- Runtime RLS follow-up (2026-07-03): a focused Supabase Dev authenticated-client smoke inserted
  synthetic `health_record` rows as the debug owner. A normal title update with `updated_by =
  auth.uid()` passed (`200`, count `1`), while both soft-delete variants (`deleted_at` with and
  without `updated_by`) returned `42501`. This narrows the blocker to the RLS tombstone transition
  class, not a broad Health update failure or a mismatched `updated_by` draft. Synthetic rows were
  cleaned up with the dev-admin key.

### 17d. Health record production editable detail UI

**2026-07-02 production edit slice:** turn the production Health detail route from read-only +
delete into an editable detail surface backed by the already implemented typed update mutation. This
closes the editable dirty-state UI gap without adding native DatePicker, offline queue behavior,
schema changes, or new analytics.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Source canon: `DESIGN.md` §4.1.4 Edit Record / Delete (Undo) and §4.1.6 status transitions.
- Route/components: `app/(modals)/pet/health-record/[recordId].tsx`,
  `src/features/health/screens/HealthScreen.tsx`, `src/lib/query/health-records.ts`,
  `src/contracts/navigation.ts`, and existing design primitives.
- TDD mode: lightweight; reduced assurance because this continuation is running in the main thread,
  but RED route tests must be observed before production code.

Acceptance:
- AC-PET-EDIT-PROD-1: the production detail route exposes a localized Edit action for a loaded
  server record; loading/unavailable/not-found/error states do not expose editing controls.
- AC-PET-EDIT-PROD-2: pressing Edit swaps the read-only detail rows for the existing primitive-backed
  form controls prefilled from the server record title, date, status, provider, and notes.
- AC-PET-EDIT-PROD-3: Save is disabled until a real dirty change exists, while Cancel exits edit mode
  without calling the update mutation.
- AC-PET-EDIT-PROD-4: pressing Save calls the typed update mutation with record id, puppy id,
  household id, record type, source preservation, previous scheduled date, edited fields, status,
  user id, and explicit `updatedAt`.
- AC-PET-EDIT-PROD-5: successful save exits edit mode and leaves the detail route open; failed save
  keeps the edit form visible and renders the existing pending/error form-state anatomy.
- Out of scope: native DatePicker, offline Health queue, delete/restore changes, schema changes, and
  any notes/provider analytics or logs.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health-record-detail-route.render.test.tsx`
  failed before implementation because the production detail route had no `Edit` button.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health-record-detail-route.render.test.tsx`
  — PASS: 1 suite, 5 tests. Output includes the existing reduced-motion `act(...)` warning from
  `src/design/motion/index.ts`; no failures.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/health-record-detail-route.render.test.tsx src/test/health-records-query.test.ts src/test/health.render.test.tsx src/test/pet-route.render.test.tsx src/test/health-record-edit-route.render.test.tsx`
  — PASS: 5 suites, 36 tests. The same reduced-motion warning remains non-failing.
- `npm run check` — PASS after adding existing `common.cancel`, `common.edit`, and `common.save`
  keys to `shellI18nKeys`: lint, typecheck, 72 Jest suites / 574 tests, 118 node tests, scaffold,
  i18n, tokens, privacy scan, and text hygiene. The reduced-motion `act(...)` warning remains
  non-failing and unrelated to this slice.

Implementation notes:
- Loaded production detail records now expose a localized `Edit` action. Edit mode uses existing
  primitives (`Button`, `TextField`, `ListRow`, `SegmentedControl`, `HealthRecordEditStateCard`) and
  is prefilled from the server record title, effective date, status, provider, and notes.
- Save is disabled until the user makes a real dirty change. Cancel exits edit mode without calling
  the update mutation.
- Save builds an explicit timestamped `HealthRecordUpdateDraft`, preserves the server `source`,
  includes the previous affected date for invalidation, and updates the visible detail route from the
  mutation result without closing the modal.
- Save failures keep the edit form open and surface the existing form error state; notes/provider data
  are not logged or sent to analytics.
- `src/contracts/navigation.ts` now includes the existing `common.cancel`, `common.edit`, and
  `common.save` keys in `shellI18nKeys` because Health shell code now uses them directly.

Stage 4 status:
- Stage 4 PASS follow-up (2026-07-02): using the same non-production debug seed and installed
  PuppyPlan.app over Metro, the production detail route opened edit mode from the loaded server
  record. Evidence:
  `output/v2-nav-gaps-stage4/health-detail-edit-production-seeded-stage4.jpg`.
  The screenshot shows the localized modal chrome, prefilled name/date/status controls, disabled
  Save before dirty changes, and empty clinic/note fields without storing private provider/note data
  in the seed.

## 18. Vet visit prep card Stage-0 lock evidence

**2026-06-30 next implementation slice:** Pet Health vet visit prep reference card.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Locked DESIGN ref: §4.1.7 Vet Visit Prep Card.
- Route/component: `/pet`, `HealthScreen` in
  `src/features/health/screens/HealthScreen.tsx`.
- Allowed deviation: this slice implements a static native reference card for the design anatomy.
  Durable checklist editing, actual upcoming-vet-visit data, item completion state, notifications, and
  native screenshot comparison remain plan-owned follow-up work.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-PET-VET-PREP-1: Pet Health renders the vet visit prep card inside the Pet Health content, not as a
  standalone tab.
- AC-PET-VET-PREP-2: the card shows title, visit date/time subtitle, four checklist rows, an Add item
  affordance, and the non-instruction disclaimer.
- AC-PET-VET-PREP-3: checklist rows have stable 36pt+ row anatomy and are non-color-only.
- AC-PET-VET-PREP-4: visible copy stays calm and avoids diagnosis, dosage, treatment-plan, and
  emergency language.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx` failed as expected before
  implementation because `health-vet-prep-card` did not exist in the Pet Health render tree.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx`
  — PASS: 1 suite, 7 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/health-record-edit-route.render.test.tsx src/test/pet-route.render.test.tsx src/test/i18n.test.ts src/test/navigation-contract.test.ts`
  — PASS: 5 suites, 28 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n parity/budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 66 Jest suites / 470 tests, 118 node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- `npm run check` — PASS: lint, typecheck, 66 Jest suites / 468 tests, 118 node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.
- `npm run check` — PASS: lint, typecheck, 65 Jest suites / 465 tests, 118 node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.

Implementation notes:
- `HealthVetPrepCard` uses existing design primitives (`Card`, `Stack`, `Button`, `AppIcon`,
  `AppText`) and existing `health.vet-prep.*` localized copy.
- EN/RU/ES gained localized sample date/time values for the existing interpolated subtitle.
- `src/contracts/navigation.ts` now includes the `health.vet-prep.*` keys used by shell UI.
- Stage 4 PASS (2026-07-02): captured a native SE screenshot from the installed PuppyPlan.app running
  JS-over-Metro and compared against `docs/design/v1/specs/05-pet-health.md` plus this slice's locked
  acceptance. Evidence: `output/v2-nav-gaps-stage4/pet-vet-prep-stage4.png`. The screenshot shows the
  Health list context, `Getting ready for the visit`, visit date/time subtitle, four checklist rows,
  Add item affordance, and the non-instruction/non-medical-advice footer copy. Durable checklist
  editing, actual upcoming-vet-visit data, and notifications remain open; local item completion state
  is covered in §18a.

### 18a. Vet visit prep local checklist completion

**2026-07-03 UI-state slice:** make the existing static vet-prep checklist rows locally checkable so
the card behaves like a native checklist while durable checklist data remains deferred.

- Source spec card: `docs/design/v1/specs/05-pet-health.md`.
- Source canon: `DESIGN.md` §4.1.7 Vet Visit Prep Card.
- Route/component: `/pet`, `HealthVetPrepCard` in
  `src/features/health/screens/HealthScreen.tsx`.
- Scope: local item completion state for the four existing vet-prep rows only.
- Out of scope: adding/removing checklist items, actual upcoming visit data, durable checklist
  persistence, notifications, schema changes, native DatePicker, and analytics.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-PET-VET-PREP-LOCAL-1: each vet-prep checklist row exposes a checkbox control with the localized
  row label and non-color-only checked state.
- AC-PET-VET-PREP-LOCAL-2: pressing a checklist checkbox toggles only that row's local checked state
  inside the mounted Pet Health screen.
- AC-PET-VET-PREP-LOCAL-3: the existing title, subtitle, four-row anatomy, Add item affordance, and
  non-instruction disclaimer remain unchanged.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx --testNamePattern AC-PET-VET-PREP-LOCAL`
  — FAIL as expected before implementation: no checkbox role existed for the localized checklist row.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx --testNamePattern AC-PET-VET-PREP-LOCAL`
  — PASS: 1 focused test.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx` — PASS:
  1 suite, 9 tests.
- `npm run test:unit -- --runTestsByPath src/test/health.render.test.tsx src/test/pet-route.render.test.tsx src/test/design-primitives.render.test.tsx`
  — PASS: 3 suites, 60 tests.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 76 suites / 617 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing non-failing reduced-motion `act(...)`
  warnings remain unrelated to this slice.

Implementation notes:
- `HealthVetPrepCard` now uses the existing `CheckCircle` primitive for each checklist row and keeps
  completion state local to the mounted screen. No durable checklist data, Add item behavior,
  notifications, schema, or analytics changed.
- Stage 4 note: default `/pet` vet-prep screenshot evidence remains the 2026-07-02 PASS already
  recorded for the same route anatomy. This slice replaces decorative boxes with primitive checkbox
  controls and adds transient local checked state without changing copy, list order, Add item behavior,
  or durable data wiring.

## 19. Reminder edit route Stage-0 lock evidence

**2026-06-30 next implementation slice:** `/reminders/edit` create/edit reminder form, quiet-hours
preview, and calm push-permission-denied anatomy.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked DESIGN refs: §4.2.2 Create / Edit Reminder Form, §4.2.3 Quiet Hours Picker,
  §4.2.7 Push Permission Denied — Calm In-App State.
- Route/component: `/reminders/edit`,
  `app/(modals)/reminders/edit/index.tsx`,
  `src/features/reminders/screens/ReminderEditScreen.tsx`.
- Allowed deviation: this slice implements native structural anatomy only. Real reminder persistence,
  local notification scheduling, OS permission probing, Settings deeplink, quiet-hours range editing,
  validation, and durable loading/error/offline data wiring remain plan-owned follow-up work.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-REM-EDIT-1: `/reminders/edit` renders modal header actions Cancel / Save and keeps Save disabled
  while required title/time input is absent.
- AC-REM-EDIT-2: the form renders title field, category options, health-category helper text, native
  picker rows for time/repeat/timezone, quiet-hours and sound toggles, and the local-reminder helper.
- AC-REM-QUIET-1: the same route exposes quiet-hours anatomy: title, example range, per-puppy toggle,
  and non-blocking helper copy.
- AC-REM-PERMISSION-1: permission-denied state is a calm inline card with muted info tint, bell icon,
  body copy, How to enable action, and fallback text that says reminders remain created/visible in app.
- AC-REM-SAFETY-1: visible copy does not introduce diagnosis, dosage, treatment-plan, or emergency
  language.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/navigation-contract.test.ts` failed as expected
  while `/reminders/edit` was present in `modalRoutes` but absent from `plannedRouteFiles`.
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx` failed as
  expected while the new route returned `null`: Cancel, form rows, quiet-hours card, and permission
  card were absent.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx`
  — PASS: 1 suite, 3 tests.
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx src/test/navigation-contract.test.ts src/test/i18n.test.ts`
  — PASS: 3 suites, 20 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n parity/budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.

Implementation notes:
- `ReminderEditScreen` uses existing design primitives (`Screen`, `Card`, `Button`, `TextField`,
  `ListGroup`, `ListRow`, `Toggle`, `AppIcon`, `Stack`) and existing EN/RU/ES `reminders.*` localized
  copy.
- `app/(modals)/_layout.tsx` now registers `reminders/edit/index`, and
  `src/contracts/navigation.ts` tracks `/reminders/edit` as an existing modal route file.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/reminders-edit-stage4-top.png`,
  `output/v2-nav-gaps-stage4/reminders-edit-stage4-form-pickers.png`,
  `output/v2-nav-gaps-stage4/reminders-edit-stage4-quiet-hours.png`,
  `output/v2-nav-gaps-stage4/reminders-edit-stage4-permission-denied.png`. Runtime snapshot evidence
  exposed the required controls and labels: Cancel, disabled Save, name field, category options,
  Time / Repeat / Time zone rows, Respect quiet hours, Sound, quiet-hours example range,
  per-puppy toggle, Notifications are off, How to enable, and fallback copy.
- State-template follow-up (2026-07-02): `ReminderEditScreen` now accepts a typed synthetic
  `reviewState` for `loading`, `pending-write`, `error`, and `offline-read`. Each state renders a
  tokenized `Card` + `StatusPill` using EN/RU/ES keys, with an alert role for error and a polite
  live region / busy Save action for pending write. This is a deterministic UI template only; durable
  reminder save, local notification scheduling, queued offline writes, OS permission probing, and
  native Stage 4 state screenshots remain open.
- State-template RED evidence:
  `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx` failed as
  expected because `reminder-edit-state-loading` did not exist.
- State-template GREEN evidence:
  `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx src/test/dev-gallery.render.test.tsx`
  — PASS: 2 suites, 10 tests after adding the compact native-handoff preview contract.
- Adjacent state/i18n evidence:
  `node scripts/checks/check-i18n.mjs` — PASS; `npm run typecheck` — PASS.
- Full gate evidence:
  `npm run check` — PASS on 2026-07-02 after the compact handoff follow-up: 70 Jest suites /
  548 tests, 118 node tests, navigation/shell i18n, i18n parity, scaffold guardrails, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` remains unrelated to this slice.
- State-template Stage 4 PASS follow-up (2026-07-02): launched the already installed PuppyPlan.app on
  `Grith iPhone SE 3 iOS 26.3` over Metro, opened `/_dev/components`, and verified the compact
  native-handoff shell. The first visual pass exposed that the dev-gallery shell was nesting four full
  `/reminders/edit` modal screens, burying state cards behind nested scroll views. The shell now uses
  exported compact `ReminderEditStatePreview` cards, matching the other state-template handoff shells.
  Native evidence:
  `output/v2-nav-gaps-stage4/reminder-edit-states-stage4.jpg`,
  `output/v2-nav-gaps-stage4/reminder-edit-states-offline-stage4.jpg`. Runtime snapshot evidence found
  `reminder-edit-state-loading`, `reminder-edit-state-pending-write`, `reminder-edit-state-error`, and
  `reminder-edit-state-offline-read`; the screenshot comparison shows loading/pending and error/offline
  cards readable with no nested time-picker/form chrome.

### 19a. Reminder edit durable create/list slice

**2026-07-02 data-layer slice:** connect the existing `/reminders/edit` form to the current
`public.reminder` schema through typed Supabase/query boundaries. This is the persistence foundation
only; it does not schedule local notifications or generate reminder occurrences.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Source canon: DESIGN.md §4.2.2 Create / edit reminder form and
  `docs/architecture/03-client-data-layer.md` reminder invalidation row.
- Route/components: `/reminders/edit`,
  `src/features/reminders/screens/ReminderEditScreen.tsx`, `src/lib/supabase/reminders.ts`,
  `src/lib/query/reminders.ts`.
- TDD mode: lightweight; reduced assurance because this continuation is running in the main thread,
  but repository/query and route RED tests must fail before production implementation.

Acceptance:
- AC-REM-DURABLE-1: the Supabase boundary can list non-deleted reminders for one puppy and insert a
  reminder row using only existing schema fields, parsing responses through `reminderSchema`.
- AC-REM-DURABLE-2: the create mutation writes `puppy_id`, trimmed `reminder_type`, `created_by`,
  `timezone`, default `enabled=true`, default `trusted_sitter_visible=false`, and a simple
  schedule rule for the existing static time/repeat rows.
- AC-REM-DURABLE-3: successful create invalidates `queryKeys.reminders.list(householdId, puppyId)`
  and the current `today.dashboard` key; no broad cache clear or free-form query keys.
- AC-REM-DURABLE-4: the connected `/reminders/edit` route requires an authenticated active care
  context, enables Save only after the name field is non-empty, shows pending/error state from the
  mutation, closes only after successful save, and keeps the OS settings handoff behavior unchanged.
- AC-REM-DURABLE-5: no occurrence generation, notification scheduling, OS permission probing, native
  picker replacement, recurrence engine, schema migration, new native module, analytics payload, or
  `ios/`/`android/` edit is introduced in this slice.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-query.test.ts src/test/reminder-edit-route.render.test.tsx`
  — FAIL before implementation: repository/query tests failed on `reminder_*_not_implemented`
  stubs; the connected route test failed because Save did not call the create mutation.
- `npm run test:unit -- --runTestsByPath src/test/reminders-query.test.ts`
  — FAIL after review follow-up: `AC-REM-DURABLE-3 keeps the read list key aligned with create
  invalidation` failed because `createRemindersQueryOptions` was missing.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-query.test.ts src/test/reminder-edit-route.render.test.tsx`
  — PASS: 2 suites, 15 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx src/test/navigation-contract.test.ts src/test/app-shell.render.test.tsx src/test/dev-gallery.render.test.tsx`
  — PASS: 4 suites, 33 tests.
- `npm run check` — PASS: lint, typecheck, Jest 75 suites / 599 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing non-failing reduced-motion `act(...)`
  warnings remain unrelated to this slice.

### 19b. More Reminders access wiring

**2026-07-02 access slice:** make the More tab's Reminders row open the existing
`/reminders/edit` route. This only restores access to the implemented create/edit modal; it does not
claim the full Reminders Hub, reminder list rendering, lifecycle actions, occurrence generation, or
local notification scheduling.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Source canon: DESIGN.md §4.2.1 Reminders Hub and §4.2.2 Create / Edit Reminder Form.
- Route/components: `/more`, `/reminders/edit`, `src/features/more/screens/MoreScreen.tsx`.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-REM-ACCESS-1: More records section renders Reminders as an active `ListRow` button, not a
  deferred row.
- AC-REM-ACCESS-2: pressing the row calls the injected `openReminders` handler.
- AC-REM-ACCESS-3: the production More route wires that handler to `router.push('/reminders/edit')`.
- AC-REM-ACCESS-4: no new hub/list/scheduling/native module/schema work is introduced in this slice.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  — FAIL before implementation: Reminders row was not accessible as a button and pressing it could not
  call `openReminders`.

GREEN evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  — PASS: 1 suite, 27 tests.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts src/test/app-shell.render.test.tsx`
  — PASS: 3 suites, 47 tests.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 75 suites / 599 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing non-failing reduced-motion `act(...)`
  warnings remain unrelated to this slice.

### 19c. Reminders Hub durable list route

**2026-07-02 list slice:** add the missing `/reminders` hub from atlas `12.1 Reminders list` and
render durable reminder rows from the typed `useRemindersQuery` path. This closes the visible list
surface only; lifecycle actions, toggle mutation, occurrence generation, local notification
scheduling, swipe edit/delete, and native Stage 4 capture remain follow-ups.

- Stage 0 lock: `docs/design/v1/specs/12-1-reminders-hub.md`.
- Atlas: `docs/design/v1/screenshots/reminders/12-1.png`, route `/reminders`, state `default`,
  393x852.
- Source canon: DESIGN.md §4.2.1 Reminders Hub and
  `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Route/components: `/reminders`, More -> Reminders, `src/features/reminders/screens`.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-REM-HUB-1: `/reminders` is tracked in navigation contracts and the More Reminders row opens
  `/reminders`, not the create form directly.
- AC-REM-HUB-2: the connected hub requires an active care context, uses `useRemindersQuery` with
  `householdId` and `puppyId`, and renders loading/error/empty states without fake production rows.
- AC-REM-HUB-3: active and off segments split durable rows by `enabled`, and rows render title,
  schedule subtitle, icon, and switch state through design primitives and typed i18n keys.
- AC-REM-HUB-4: the header add action opens `/reminders/edit`; no toggle mutation, occurrence
  generation, local notification scheduling, schema migration, native module, or `ios`/`android` edit
  is introduced in this slice.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/navigation-contract.test.ts src/test/more-settings.render.test.tsx src/test/reminders-hub-route.render.test.tsx`
  — FAIL before implementation: `/reminders` was absent from `modalRoutes`, More still pushed
  `/reminders/edit`, and the new hub stub did not call `useRemindersQuery` or render the locked
  anatomy.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/navigation-contract.test.ts src/test/more-settings.render.test.tsx src/test/reminders-hub-route.render.test.tsx`
  — PASS: 3 suites, 44 tests. Existing reduced-motion `act(...)` warnings remain unrelated.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx`
  — RED before the Stage 4 handoff shell because the gallery did not render `Morning feeding`; PASS
  after adding the synthetic Reminders Hub shell: 1 suite, 4 tests.
- `npm run typecheck` — PASS after regenerating local Expo typed routes with
  `npx expo start --localhost --port 8099` and stopping Metro.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `node scripts/checks/check-navigation-contract.mjs` — PASS.
- `npm run tokens:check` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 76 suites / 605 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing reduced-motion `act(...)` warnings remain
  unrelated to this slice.

Implementation notes:
- `/reminders` now uses `ScreenHeader`, `SegmentedControl`, `SectionHeader`, `ListGroup`,
  `ListRow`, `Toggle`, `StatusPill`, `Card`, and typed EN/RU/ES i18n keys.
- More -> Reminders opens the hub; hub Add opens `/reminders/edit`.
- Active/off segments split durable rows by `enabled`; rows are grouped from current durable metadata
  without adding schema fields. Toggle mutation, occurrence generation, local notification scheduling,
  swipe edit/delete, and missed-today rows remain open.
- Stage 4 PASS follow-up recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro on port
  8081. Native evidence: `output/v2-nav-gaps-stage4/reminders-hub-stage4.jpg`. Runtime snapshot
  evidence exposed Reminders title/header, More back action, Add reminder action, Active/Off
  segmented control, Feeding and Health sections, `Morning feeding`, `DHPP booster`, schedule
  subtitles, and switch states.

### 19d. Reminders Hub durable toggle slice

**2026-07-02 behavior slice:** connect the existing Reminders Hub row switch to the current
`public.reminder.enabled` field through typed Supabase/query boundaries. This closes only the durable
enabled/off lifecycle toggle; it does not introduce occurrence generation, local notification
scheduling, swipe edit/delete, or native modules.

- Stage 0 lock: `docs/design/v1/specs/12-1-reminders-hub.md`.
- Source canon: DESIGN.md §4.2.1 Reminders Hub and
  `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Route/components: `/reminders`, `src/features/reminders/screens/RemindersHubScreen.tsx`,
  `src/lib/supabase/reminders.ts`, `src/lib/query/reminders.ts`.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-REM-TOGGLE-1: the Supabase boundary can update one non-deleted reminder by `id` and `puppy_id`,
  writes only the `enabled` value, and parses the returned row through `reminderSchema`.
- AC-REM-TOGGLE-2: successful toggle invalidates `queryKeys.reminders.list(householdId, puppyId)`
  and the current `today.dashboard` key; no broad cache clear or free-form reminder query key.
- AC-REM-TOGGLE-3: the connected `/reminders` route requires active care context and pressing a row
  switch calls the toggle mutation with `householdId`, `puppyId`, `reminderId`, next `enabled` value,
  and current `todayDate`.
- AC-REM-TOGGLE-4: the toggled row switch is disabled while its mutation is pending and mutation
  failure renders the existing calm Reminders error card without fake rows.
- AC-REM-TOGGLE-5: no occurrence generation, notification scheduling, OS permission probing, native
  picker replacement, schema migration, new native module, analytics payload, or `ios`/`android/` edit
  is introduced in this slice.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-query.test.ts src/test/reminders-hub-route.render.test.tsx`
  — FAIL before implementation: query tests failed on missing `toReminderToggleUpdate` /
  `createReminderToggleMutationOptions`, and the hub route test failed because the switch did not call
  the mutation or disable while pending.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-query.test.ts src/test/reminders-hub-route.render.test.tsx`
  — PASS: 2 suites, 15 tests. Existing reduced-motion `act(...)` warnings remain unrelated.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run tokens:check` — PASS.
- `npm run check` — PASS before this evidence note was recorded: lint, typecheck, Jest 76 suites /
  610 tests, node 118 tests, scaffold/i18n/tokens/privacy/text hygiene. Existing reduced-motion
  `act(...)` warnings remain unrelated.

Implementation notes:
- `src/lib/supabase/reminders.ts` now exposes `updateReminderEnabled`, scoped by `id` + `puppy_id`
  and `deleted_at is null`, returning the parsed `reminderSchema` row.
- `src/lib/query/reminders.ts` now exposes `useToggleReminderEnabledMutation` and invalidates the
  durable reminders list plus the current Diary dashboard key after success.
- `/reminders` switch interaction calls the toggle mutation with active care context, disables the
  matching row while pending, and uses the existing calm Reminders error card if the mutation fails.
- No schema migration, native module, notification scheduling, occurrence generation, analytics
  payload, or `ios/` / `android/` change was introduced. Stage 4 visual evidence remains covered by
  the existing Reminders Hub list capture because this slice changes behavior on existing controls;
  row-level pending feedback is now covered by §4.2.7b. Additional native state captures remain
  future follow-ups.

### 19e. Reminders Hub State Templates (§4.5)

**2026-07-03 global-state slice:** deterministic `/reminders` empty, loading, pending-write, error,
and offline-read state templates for §4.5.

- Source spec card: `docs/design/v1/specs/12-1-reminders-hub.md`.
- Source atlas: `docs/design/v1/screenshots/reminders/12-1.png`.
- Route/component: `/reminders` via `src/features/reminders/screens/RemindersHubScreen.tsx`.
- Dev-gallery handoff: `/_dev/components` should render compact Reminders Hub state cards inside a
  visible `SyntheticRemindersHubStatesShell`.
- Allowed deviation: this slice only standardizes deterministic state cards and dev-gallery
  handoff. Reminder create/save scheduling, occurrence generation, local notifications, permission
  probing, row edit menus, schema/native modules, and `ios/` / `android/` edits remain out of scope.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-REM-HUB-STATES-1: the Reminders Hub exposes deterministic empty, loading, pending-write, error,
  and offline-read state templates with stable `reminders-hub-state-*` test IDs.
- AC-REM-HUB-STATES-2: each state uses design primitives (`Card`, `StatusPill`, `AppIcon`,
  `AppText`) and typed EN/RU/ES i18n status/title/body copy.
- AC-REM-HUB-STATES-3: loading and pending-write announce politely; error uses alert semantics;
  offline-read uses the muted template surface.
- AC-REM-HUB-STATES-4: state copy exposes no raw puppy names, notes, emails, provider names,
  notification tokens, schedules from private user rows, or diagnostics payloads.
- AC-REM-HUB-STATES-5: the dev-gallery route-shell preview includes all five Reminders Hub state
  templates for native Stage 4 handoff.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-hub-route.render.test.tsx --testNamePattern AC-REM-HUB-STATES`
  failed as expected before implementation because `RemindersHubStatePreview` was not exported.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern "route-shell preview states"`
  failed as expected before implementation because `SyntheticRemindersHubStatesShell` was not
  exported/rendered.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-hub-route.render.test.tsx --testNamePattern AC-REM-HUB-STATES`
  — PASS: 1 suite, 1 matching test.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern "route-shell preview states"`
  — PASS: 1 suite, 1 matching test.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/reminders-hub-route.render.test.tsx src/test/dev-gallery.render.test.tsx src/test/i18n.test.ts`
  — PASS: 3 suites, 26 tests.

Stage 4 evidence:
- Primary SE simulator: `Grith iPhone SE 3 iOS 26.3`
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).
- Installed `PuppyPlan.app` launched over `npx expo start --localhost` in development-build mode;
  existing `puppyplan:///_dev/components` route reloaded from the current bundle.
- Runtime snapshot confirmed `Reminders hub loading, saving, error, offline, and empty states.`,
  `Showing saved reminders`, and `No reminders here yet`.
- Evidence files:
  `output/v2-nav-gaps-stage4/reminders-hub-states-top-stage4.jpg`,
  `output/v2-nav-gaps-stage4/reminders-hub-states-bottom-stage4.jpg`,
  `output/v2-nav-gaps-stage4/reminders-hub-states-empty-stage4.jpg`.

### 19f. Reminder edit quiet-hours create payload

Stage-0 lock:
- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md` Reminder preferences
  quiet-hours anatomy and the existing `/reminders/edit` `Respect quiet hours` toggle.
- Scope: persist the existing quiet-hours toggle into the create reminder payload using the current
  `public.reminder.quiet_hours` JSONB field and locked static range example only.
- Out of scope: editable quiet-hours range, validation UI, timezone conversion, occurrence generation,
  local notification scheduling, permission probing, native picker replacement, schema migration,
  new native module, analytics payload, and `ios/` / `android/` edits.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-REM-QH-1: `toReminderInsert` writes `quiet_hours: { enabled: true, start: '22:00', end: '07:00' }`
  when the create draft opts into quiet hours, and preserves `quiet_hours: null` when the draft opts
  out.
- AC-REM-QH-2: the connected `/reminders/edit` route includes the current quiet-hours toggle value
  in the create mutation draft.
- AC-REM-QH-3: the toggle remains visible, accessible, and user-controlled; save behavior and
  existing OS settings handoff stay unchanged.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-query.test.ts src/test/reminder-edit-route.render.test.tsx`
  — FAIL as expected before implementation: `quiet_hours` remained `null` for an opted-in draft and
  the connected route create mutation draft omitted `respectQuietHours`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-query.test.ts src/test/reminder-edit-route.render.test.tsx`
  — PASS: 2 suites, 19 tests.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run tokens:check` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 76 suites / 615 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing motion-related `act(...)` warnings remain
  non-failing.

Implementation notes:
- `ReminderCreateDraft` now carries an optional `respectQuietHours` boolean. The connected
  `/reminders/edit` route reads it from the existing `Respect quiet hours` toggle and passes it into
  the create mutation.
- `toReminderInsert` writes `quiet_hours: { enabled: true, start: '22:00', end: '07:00' }` only when
  the draft opts in; opt-out and legacy callers still write `quiet_hours: null`.
- No editable range, validation UI, timezone conversion, occurrence generation, local notification
  scheduling, permission probing, native picker replacement, schema migration, native module,
  analytics payload, or `ios/` / `android/` edit was introduced.

### 19g. Reminders Hub row soft-delete lifecycle slice

Stage-0 lock:
- Source spec card: `docs/design/v1/specs/12-1-reminders-hub.md` row lifecycle anatomy and
  `docs/design/v1/specs/04-quick-log-routines-reminders.md` routine lifecycle contract.
- Scope: soft-delete a reminder row from the Reminders Hub using the existing
  `public.reminder.deleted_at` column and typed query/repository boundary. This closes only the
  lightweight row delete lifecycle; the existing enabled/off toggle remains the pause/off path.
- Allowed deviation: row delete uses the shared `SwipeToDelete` primitive plus a VoiceOver/TalkBack
  accessibility action; edit/menu treatment remains deferred.
- Out of scope: occurrence generation, mark-done/back-date/skip, local notification scheduling,
  notification cancellation, edit route loading for existing reminders, native modules, schema
  changes, analytics payloads, and `ios/` / `android/` edits.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-REM-DELETE-1: the Supabase reminder repository can soft-delete a non-deleted reminder by
  `id` + `puppy_id` by setting `deleted_at`, without returning fake success on a failed write.
- AC-REM-DELETE-2: delete mutation options invalidate `queryKeys.reminders.list(householdId, puppyId)`
  and `queryKeys.today.dashboard(householdId, puppyId, todayDate)` after success.
- AC-REM-DELETE-3: the connected `/reminders` row delete action calls the typed delete mutation with
  active care context and a current timestamp.
- AC-REM-DELETE-4: while delete is pending, the affected row shows the existing non-color-only
  pending status and disables both the toggle and swipe/accessibility delete action.
- AC-REM-DELETE-5: delete failures use the existing calm Reminders error state; no silent fallback,
  occurrence mutation, notification scheduling, schema/native module, or generated native project
  change is introduced.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-query.test.ts src/test/reminders-hub-route.render.test.tsx`
  failed before production code because `repository.deleteReminder` and
  `createReminderDeleteMutationOptions` were missing, the route had no
  `reminder-row-delete-*` action, delete-pending rows did not disable the toggle, and delete errors
  did not route to the calm Reminders error card.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminders-query.test.ts src/test/reminders-hub-route.render.test.tsx`
  passed: 2 suites, 24 tests. Coverage includes repository success/failure/zero-row soft-delete,
  delete invalidation keys, connected swipe action payload, VoiceOver/TalkBack delete action,
  pending disable/hide behavior, and delete-error calm state.
- `npm run typecheck` passed.
- `node scripts/checks/check-i18n.mjs` passed.
- `npm run tokens:check` passed.
- `npm run check` passed: lint, typecheck, 77 Jest suites / 633 tests, node checks, scaffold
  guardrails, i18n, tokens, privacy scan, and text hygiene. The full run still prints existing
  reduced-motion `act(...)` warnings in unrelated `health-record-detail` / `screen-header` suites;
  the targeted Reminders suites are clean.

Implementation notes:
- `src/lib/supabase/reminders.ts` now exposes `deleteReminder`, updates `deleted_at` through the
  typed Supabase boundary, scopes by `id` + `puppy_id` + `deleted_at is null`, and rejects Supabase
  errors or zero-row writes with `reminder_delete_failed`.
- `src/lib/query/reminders.ts` adds `ReminderDeleteDraft`, `toReminderDeleteUpdate`,
  `createReminderDeleteMutationOptions`, and `useDeleteReminderMutation`; delete success invalidates
  the same reminders list key used by `useRemindersQuery` plus the current Diary dashboard key.
- Runtime RLS follow-up (2026-07-03): a Supabase Dev authenticated-client smoke as the debug owner
  inserted a synthetic reminder and attempted the same `deleted_at` update through the public API.
  The update returned `42501` (`new row violates row-level security policy for table "reminder"`),
  matching the Health record tombstone failure class. The synthetic row was cleaned up with the
  dev-admin key. Until the shared tombstone RLS policy is fixed, this slice should be read as
  UI/query wiring plus failure surfacing, not live durable delete proof.
- `src/features/reminders/screens/RemindersHubScreen.tsx` wraps non-pending rows in
  `SwipeToDelete`, exposes a row accessibility `delete` action, sends the active care context plus
  `new Date().toISOString()`, and reuses the existing pending pill/error state.
- `src/design/primitives/ListRow.tsx` passes accessibility actions through to labelled static rows
  so screen-reader actions do not require making the row a fake button.
- Stage 4 native swipe capture was not re-run in this slice because the native build path remains
  blocked and this change is JS-only over the existing installed app path; structural route coverage
  plus the existing `SwipeToDelete` primitive coverage are the current evidence. No occurrence
  generation, notification scheduling/cancellation, schema migration, native module, analytics
  payload, or `ios/` / `android/` edit was introduced.

## 20. Trusted sitter checklist reminder anatomy evidence

**2026-06-30 next implementation slice:** Trusted Sitter Checklist Reminder card anatomy inside
the Reminders edit/review surface.

- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Locked DESIGN ref: §4.2.6 Trusted Sitter Checklist Reminders.
- Route/component: `/reminders/edit`, `ReminderEditScreen` in
  `src/features/reminders/screens/ReminderEditScreen.tsx`.
- Allowed deviation: this slice implements a static native structural anatomy preview inside the
  current reminder-edit route. Real sitter checklist source data, checklist open flow, whole-checklist
  completion, push to the owner, and pending-sync state remain plan-owned follow-up work.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-REM-SITTER-1: the route renders a trusted-sitter checklist reminder card with a left
  `primary/600` accent rail and `personCluster` icon slot.
- AC-REM-SITTER-2: the card exposes the `Trusted sitter` source label, evening checklist title,
  and a synthetic privacy-safe caregiver label.
- AC-REM-SITTER-3: progress is non-color-only: a visible 1/3 progress bar plus an accessibility label.
- AC-REM-SITTER-4: the action set includes localized Open checklist, Mark all done, and Skip actions.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx` failed as
  expected before implementation because `reminder-sitter-checklist-card` was absent from the route.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx`
  — PASS: 1 suite, 4 tests.
- `npm run test:unit -- --runTestsByPath src/test/reminder-edit-route.render.test.tsx src/test/i18n.test.ts src/test/navigation-contract.test.ts`
  — PASS: 3 suites, 21 tests.

Implementation notes:
- `TrustedSitterChecklistReminderCard` uses existing design primitives (`Card`, `Button`, `AppIcon`,
  `AppText`, `Stack`) and tokenized styles. No new primitive or dependency was introduced.
- EN/RU/ES `reminders.sitter-card.*` strings now include the progress accessibility label and the
  full three-action checklist reminder set.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/reminders-edit-stage4-sitter-checklist.png`. Runtime snapshot evidence
  exposed the `Trusted sitter` label, `Evening checklist · 7:00 pm` title, privacy-safe caregiver
  label, `Open checklist`, `Mark all done`, and `Skip` actions.

## 21. Onboarding Welcome anatomy evidence

**2026-06-30 next implementation slice:** `/onboarding` initial Welcome state.

- Route-specific spec card: `docs/design/v1/specs/02-1-onboarding-welcome.md`.
- Source spec card: `docs/design/v1/specs/02-onboarding-flow.md`.
- Locked atlas board: `2.1 Welcome · default`
  (`docs/design/v1/screenshots/onboarding/2-1.png`, state `default`, 393x852).
- Route/component: `/onboarding`, `OnboardingScreen` in
  `src/features/onboarding/screens/OnboardingScreen.tsx`.
- Allowed deviation: native implementation uses a token-built abstract warm illustration rather than
  the atlas placeholder text/bitmap. Mount animation remains deferred to the later onboarding motion pass.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Spec lock for this slice:
- AC-ONB-WELCOME-1: the initial onboarding state renders a decorative 160pt+ warm illustration frame
  before the heading block.
- AC-ONB-WELCOME-2: the H1 uses `onboarding.welcome.title` and exposes the locked accessibility label
  `onboarding.welcome.a11y-title`.
- AC-ONB-WELCOME-3: the subtitle, primary Get started CTA, and secondary "already have an account"
  action are visible and accessible before puppy setup.
- AC-ONB-WELCOME-4: the secondary sign-in action is actionable and can route to `/sign-in`; it is not
  a decorative text-only row.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx` failed as expected
  before implementation because `onboarding-welcome-illustration` was absent from the welcome state.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 9 tests.
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx src/test/app-shell.render.test.tsx src/test/auth-navigation.test.ts src/test/i18n.test.ts`
  — PASS: 4 suites, 33 tests.
- `npm run typecheck` — PASS after replacing the mistaken `accent.honeyTint` reference with the
  existing `tokens.color.accent[100]`.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n parity/budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.

Implementation notes:
- The welcome state now uses the existing design primitives (`Screen`, `Stack`, `AppText`, `Button`)
  and tokenized decorative `View` anatomy with `decorativeViewProps`.
- `ConnectedOnboardingScreen` accepts optional `openSignIn`, and `app/onboarding/index.tsx` wires the
  secondary action to `router.replace('/sign-in')`.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/onboarding-welcome-stage4.png`. Runtime snapshot evidence exposed the
  locked H1 accessibility text, subtitle, `Get started` primary CTA, and `I already have an account`
  secondary action with no stale modal layer after app restart.

## 22. Onboarding Puppy Setup / Age Hint anatomy evidence

**2026-06-30 next implementation slice:** `/onboarding` profile-step Age Hint.

- Route-specific spec card: `docs/design/v1/specs/02-2-onboarding-puppy-setup-age-hint.md`.
- Source spec card: `docs/design/v1/specs/02-onboarding-flow.md`.
- Locked atlas boards: `2.2 Profile · default`, `2.2 Profile · filled`, `2.2 Profile · error`
  (`docs/design/v1/screenshots/onboarding/2-2-default.png`,
  `docs/design/v1/screenshots/onboarding/2-2-filled.png`,
  `docs/design/v1/screenshots/onboarding/2-2-error.png`, 393x852).
- Route/component: `/onboarding`, `OnboardingScreen` in
  `src/features/onboarding/screens/OnboardingScreen.tsx`.
- Allowed deviation: full Puppy Setup step chrome/stepper/date-wheel is not claimed by this slice;
  this slice only locks the inline age hint card from §2.1.3.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx` failed as expected
  before implementation on `renders the puppy setup age hint inline before tracker selection` because
  `onboarding-age-hint-card` was absent from the profile step after name entry.

GREEN evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 10 tests.
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx src/test/i18n.test.ts src/test/app-shell.render.test.tsx src/test/auth-navigation.test.ts`
  — PASS: 4 suites, 34 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n parity/budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, Jest 66 suites / 471 tests, node tests 118, scaffold
  checks. Existing unrelated React `act(...)` warning in `screen-header.render.test.tsx` remains a
  warning, not a failure.

Implementation notes:
- The profile step now shows an inline `Card` before tracker selection when age-weeks mode has a valid
  estimate and the profile has user-entered content.
- The card uses existing primitives (`Card`, `Stack`, `AppIcon name="infoCircle"`, `AppText`) and
  design tokens (`tokens.color.status.infoTint`, `tokens.color.status.info`, `tokens.radius.md`).
- The hint text reuses `getPuppyAgeHintKey(...)` and existing EN/RU/ES localized copy; no new user
  strings were required.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/onboarding-age-hint-stage4.png`. Runtime snapshot evidence exposed the
  Step 2 chrome, name field with privacy-safe synthetic input, age segmented control, 8-week stepper,
  info hint copy, and enabled Continue action.
- The full Puppy Setup profile step still needs native screenshot comparison.
  Visible back/step chrome, stepper/date-zone anatomy, and disabled-until-name CTA behavior are now
  tracked by §23.

## 23. Onboarding Puppy Setup chrome / stepper anatomy evidence

**2026-06-30 next implementation slice:** `/onboarding` profile-step Puppy Setup native anatomy.

- New route-specific spec card: `docs/design/v1/specs/02-2-onboarding-puppy-setup.md`.
- Locked atlas refs:
  - `docs/design/v1/screenshots/onboarding/2-2-default.png`
  - `docs/design/v1/screenshots/onboarding/2-2-filled.png`
  - `docs/design/v1/screenshots/onboarding/2-2-error.png`
- Source canon: `DESIGN.md` §2.1.2 Puppy Setup and §2.1.3 Age Hint.
- Allowed deviation: the birth-date mode keeps an editable native text input inside the DateWheel
  zone until the real platform DatePicker module is wired; visual zone, validation placement, and
  a11y label remain locked in this slice.

Spec lock for this slice:
- AC-OB-2.2-1: profile step renders top chrome with a localized back button, centered `Step 2 of 5`,
  and no card wrapper around the title block.
- AC-OB-2.2-2: profile step shows an explicit Age section label before the segmented Age/Birth Date
  control.
- AC-OB-2.2-3: Age mode renders a tokenized stepper zone, value, decrement/increment controls, and
  an `adjustable` accessibility contract instead of a free text age field.
- AC-OB-2.2-4: Continue is disabled until the name field has non-empty content and does not show a
  name error while disabled.
- AC-OB-2.2-5: after name entry, Continue enables, age value becomes visible, the age hint remains
  directly under the age zone, and age adjustments update the visible weeks value before tracker
  selection.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  failed as expected before implementation because `Step 2 of 5` was absent, the age field was still
  the old `Age in weeks` TextField, and the Continue CTA was enabled with an empty name.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 11 tests.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/onboarding-flow.render.test.tsx`
  — PASS: 2 suites, 20 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: 67 Jest suites / 492 tests, node tests 118/118, scaffold, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` is unrelated to this slice.

Implementation notes:
- `src/features/onboarding/screens/OnboardingScreen.tsx` now renders the profile chrome, disabled
  CTA, age section label, age stepper, and birth-date date-zone wrapper through existing design
  primitives (`Screen`, `Stack`, `Touchable`, `AppText`, `AppIcon`, `Button`, `TextField`, `Card`).
- EN/RU/ES startup locale files include the new step label, back label, dynamic `{count}` age value,
  and increment/decrement accessibility labels.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/onboarding-puppy-setup-default-stage4.png`,
  `output/v2-nav-gaps-stage4/onboarding-age-hint-stage4.png`,
  `output/v2-nav-gaps-stage4/onboarding-puppy-setup-error-stage4.png`. Runtime snapshot evidence
  exposed Back, Step 2 of 5, name field, disabled/enabled Continue, age section, birth-date date-zone
  field, and future-date inline error. The visual Birth date segment required one `idb ui tap`
  coordinate tap because XcodeBuildMCP exposed the segment text but not an actionable target.
- Real platform DatePicker replacement remains open and should use the native picker integration
  slice rather than adding a web-style custom picker here.

## 24. Onboarding Quick Tracker Selection anatomy evidence

**2026-06-30 next implementation slice:** `/onboarding` tracker-step native anatomy.

- New route-specific spec card: `docs/design/v1/specs/02-4-onboarding-tracker-picker.md`.
- Locked atlas ref: `docs/design/v1/screenshots/onboarding/2-4.png`.
- Source canon: `DESIGN.md` §2.1.4 Quick Tracker Selection.
- Allowed deviation: the onboarding UI may reach zero selected trackers and show the locked
  `Skip selection` CTA, but saving from zero normalizes to the accepted default tracker set. This
  preserves the existing durable Quick Log settings invariant that saved tracker selections contain at
  least one tracker and avoids an empty first Quick Log surface.

Spec lock for this slice:
- AC-OB-2.4-1: tracker step renders top chrome with a localized back button and centered
  `Step 3 of 5`.
- AC-OB-2.4-2: helper copy is the tracker-picker helper, not the previous puppy-age hint.
- AC-OB-2.4-3: selected tracker tiles expose `accessibilityState.selected=true`, selected/unselected
  screen-reader labels, and a visible top-right checkmark so selection is not color-only.
- AC-OB-2.4-4: users can deselect all trackers; the counter reaches `0 of 5 selected`, no minimum
  warning appears, and the CTA changes to `Skip selection`.
- AC-OB-2.4-5: pressing `Skip selection` saves default tracker ids so the durable profile still
  satisfies the accepted Quick Log tracker contract.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  failed as expected before implementation:
  - `Step 3 of 5` was absent and the tracker step still rendered the age hint as helper copy.
  - tracker tile accessibility labels were only the tracker names and had no checkmark assertion.
  - deselecting the final tracker showed the old minimum-required snackbar instead of reaching zero.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 12 tests.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/design-primitives.render.test.tsx src/test/onboarding-flow.render.test.tsx`
  — PASS: 3 suites, 63 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, Jest 66 suites / 473 tests, node tests 118, scaffold
  checks, tokens, privacy scan, and text hygiene. Existing unrelated React `act(...)` warning in
  `screen-header.render.test.tsx` remains a warning, not a failure.

Implementation notes:
- `src/features/onboarding/screens/OnboardingScreen.tsx` now renders tracker-step chrome, helper
  copy, selected/unselected a11y labels, zero-selection CTA, and skip-to-default save normalization.
- `src/design/primitives/TrackerTile.tsx` now renders a selected checkmark using the design-owned
  `AppIcon name="check"` and tokenized primary/check colors.
- EN/RU/ES startup locale files include the new tracker back label, step label, selected/unselected
  tile accessibility templates, and the locked `Skip selection` wording.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/onboarding-tracker-selection-stage4.png`,
  `output/v2-nav-gaps-stage4/onboarding-tracker-selection-zero-stage4.png`. Runtime snapshot evidence
  exposed Back, Step 3 of 5, helper copy, five selected tracker tiles with selected accessibility
  labels, visible checkmarks, `5 of 5 selected`, `Continue`, then all five unselected labels,
  `0 of 5 selected`, and `Skip selection` with no minimum-warning alert.

## 25. Onboarding Plan Reveal anatomy evidence

**2026-06-30 next implementation slice:** `/onboarding` plan-step native value moment.

- New route-specific spec card: `docs/design/v1/specs/02-5-onboarding-plan-reveal.md`.
- Locked atlas ref: `docs/design/v1/screenshots/onboarding/2-5.png`.
- Source canon: `DESIGN.md` §2.1.5 Plan Reveal.
- Allowed deviation: onboarding remains outside the V2 tab shell, so no TabBar or persistent Quick
  Log FAB is shown on this wizard step. Motion requirements (stagger-in cards and one-time CTA pulse)
  remain deferred to the shared onboarding motion pass.

Spec lock for this slice:
- AC-OB-2.5-1: plan step starts with a localized puppy summary row containing name, age, and owner
  avatar context.
- AC-OB-2.5-2: the H2/title and supporting copy match `DESIGN.md` §2.1.5.
- AC-OB-2.5-3: hero card is a distinct 96pt minimum activation card using the rare Honey/accent tint
  and localized first-log copy.
- AC-OB-2.5-4: starter actions render as three separate DailyCard-style cards, not as plain text
  inside one shared card.
- AC-OB-2.5-5: bottom primary CTA remains `Start your first log` / localized equivalent and opens
  the standard Quick Log sheet.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  failed as expected before implementation:
  - the plan step had no puppy summary row or summary accessibility label;
  - the CTA appeared before the hero card;
  - the hero/starter content was grouped inside one plain card with no 96pt hero hook and no separate
    starter-card anatomy.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 13 tests.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/onboarding-flow.render.test.tsx`
  — PASS: 2 suites, 22 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, Jest 66 suites / 474 tests, node tests 118,
  scaffold checks, tokens, privacy scan, and text hygiene. Existing unrelated React `act(...)`
  warning in `screen-header.render.test.tsx` remains a warning, not a failure.
- `git diff --check` — PASS.

Implementation notes:
- `src/features/onboarding/screens/OnboardingScreen.tsx` now renders the Plan Reveal summary row,
  accent HeroCard, three separate starter action cards, and bottom CTA using design primitives.
- EN/RU/ES locale files include the Plan Reveal summary, summary accessibility label, birth-date
  fallback, hero accessibility label, and starter-card accessibility template.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`)
  from the installed PuppyPlan.app over Metro. Native evidence:
  `output/v2-nav-gaps-stage4/onboarding-plan-reveal-stage4.png`. Runtime snapshot evidence exposed the
  plan title/supporting copy, hero first-log copy, three separate starter actions, and `Start your
  first log` CTA; visual evidence also covers the localized puppy summary row with privacy-safe
  synthetic name and age.

## 26. Onboarding First Log anatomy evidence

**2026-06-30 next implementation slice:** first-value completion state after onboarding Quick Log.

- New route-specific spec card: `docs/design/v1/specs/02-6-onboarding-first-log.md`.
- Locked atlas ref: `docs/design/v1/screenshots/onboarding/2-6.png`.
- Source canon: `DESIGN.md` §2.1.6 First Log.
- Allowed deviation: legacy atlas may name Today; V2 final shell lands in Diary with Diary selected,
  Pet/More available, and the separate Add/FAB action present.

Spec lock for this slice:
- AC-OB-2.6-1: first-log completion lands in Diary chrome, not wizard chrome.
- AC-OB-2.6-2: the first event is not presented as fully synced before account wall; it has visible
  pending and local-only indicators.
- AC-OB-2.6-3: copy avoids legacy `Today` wording in the V2 first-value preview.
- AC-OB-2.6-4: completion announces a single celebration snackbar using the design Snackbar
  primitive and `celebration` haptic metadata.
- AC-OB-2.6-5: account and notification prompts remain absent from the first-value screen.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  failed as expected before implementation:
  - First Log preview still showed `First Today` and `Today now shows...`;
  - first event status was `Saved` / synced;
  - there was no local-only indicator, pending indicator, or celebration snackbar.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 13 tests.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/onboarding-flow.render.test.tsx`
  — PASS: 2 suites, 22 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.

Implementation notes:
- `src/features/onboarding/screens/OnboardingScreen.tsx` first-log preview now removes the old
  Today eyebrow, uses Diary wording, renders a pending status pill, marks the timeline row
  local-only, and triggers the existing Snackbar primitive with `hapticEvent: 'celebration'`.
- `src/features/_dev/design-gallery/DesignGalleryScreen.tsx` wraps the First Log preview in
  `SnackbarProvider`, matching the snackbar context the runtime app already has through providers.
- EN/RU/ES locale files include the first-log celebration snackbar accessibility label and updated
  Diary-first body copy.
- Stage 4 partial PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro. Native
  content/chrome evidence:
  `output/v2-nav-gaps-stage4/onboarding-first-log-chrome-stage4.png`,
  `output/v2-nav-gaps-stage4/onboarding-first-log-harness-stage4.png`. Runtime/visual evidence covers
  Diary-selected chrome, Pet/More tabs, separate Quick Log FAB, pending `Saving` pill, local-only row,
  Diary copy with no legacy `Today` wording, and no account/notification prompt.
- Stage 4 PASS follow-up recorded 2026-07-02: after the shared `SnackbarProvider` host moved active
  messages into `FullWindowOverlay`, a native SE screenshot from the installed PuppyPlan.app over
  Metro captured the first-log preview and visible celebration snackbar:
  `output/v2-nav-gaps-stage4/onboarding-first-log-snackbar-full-window-direct-stage4.png`. Evidence
  shows Diary-selected bottom chrome, the separate Add/FAB action, pending/local-only first event
  state, no account/notification prompt, and the visible snackbar message `Done. You can keep going.`

### 27. Onboarding Account / Notifications Prompt Reconciliation (§2.1.7)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/02-7-onboarding-account-notifications-prompts.md`.
- Source: `DESIGN.md` §2.1.7 plus Open Design V2 sheet anatomy; no standalone v1 PNG exists.
- Allowed deviation: prompts are post-first-value previews only. Runtime scheduler and OS permission
  handoff remain deferred.

Acceptance:
- AC-OB-2.7-1: account prompt renders as a skippable sheet with Apple, Google, Email, and Not now actions.
- AC-OB-2.7-2: notification prompt renders as a skippable sheet with enable and Not now actions.
- AC-OB-2.7-3: first-value completion remains free of account/notification pressure.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx`
  — PASS: 1 suite, 16 tests.
- `npm run check` — PASS: lint, typecheck, 66 Jest suites / 478 tests, node checks, scaffold
  guardrails, token drift, privacy scan, and text hygiene.

Implementation notes:
- `src/features/onboarding/screens/OnboardingScreen.tsx` already exposes
  `OnboardingAccountPromptPreview` and `OnboardingNotificationsPromptPreview` with localized
  EN/RU/ES copy and design `SheetSurface` / `Button` primitives.
- This section reconciles the plan status from ❌ to ✅ after fresh verification; it did not add a new
  runtime prompt scheduler.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro. Native
  evidence:
  `output/v2-nav-gaps-stage4/onboarding-account-prompt-clean-stage4.png`,
  `output/v2-nav-gaps-stage4/onboarding-notifications-prompt-clean-stage4.png`. Visual evidence covers
  the account SheetSurface with Apple, Google, Email, and Not now actions, plus the quiet-reminder
  SheetSurface with Turn on and Not now actions. Runtime scheduler remains deferred; OS settings
  handoff is covered by §27a.

### 27a. Onboarding Notification Prompt OS Settings Handoff (§2.1.7)

Stage-0 lock:
- Source: `docs/design/v1/specs/02-7-onboarding-account-notifications-prompts.md` and the existing
  `OnboardingNotificationsPromptPreview` sheet anatomy.
- Scope: route-level OS settings handoff from the post-first-value notification prompt only.
  No runtime prompt scheduler, notification permission probing, push token registration, local
  notification scheduling, persistence, native module, schema change, or `ios/` / `android/` edit.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-OB-NOTIF-HANDOFF-1: pressing `onboarding.notifications-prompt.primary` calls
  `Linking.openSettings()`.
- AC-OB-NOTIF-HANDOFF-2: the prompt remains visible and skippable after the handoff; the action does
  not navigate away or mark notification permission as granted.
- AC-OB-NOTIF-HANDOFF-3: if the platform settings handoff rejects, the sheet renders a localized,
  non-color-only calm error state instead of swallowing the failure.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx` — FAIL as
  expected before implementation: `Linking.openSettings()` was never called from the prompt's
  primary action.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx` — PASS:
  1 suite, 18 tests.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 76 suites / 614 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing motion-related `act(...)` warnings remain
  non-failing.

Implementation notes:
- `OnboardingNotificationsPromptPreview` now opens platform settings through `Linking.openSettings()`
  from the existing primary CTA and keeps the sheet visible/skippable.
- Rejected handoffs render a tokenized `Card` + `StatusPill` alert with EN/RU/ES copy. No prompt
  scheduler, permission probing, push token registration, notification scheduling, persistence,
  native module, schema change, or `ios/` / `android/` edit was introduced.

### 27b. Onboarding Post-First-Value Prompt Scheduler (§2.1.7)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/02-7-onboarding-account-notifications-prompts.md`.
- Source: DESIGN.md §2.1.7 plus the existing account / notification SheetSurface preview anatomy.
- Scope: route/source-marker runtime scheduler only. The Plan Reveal CTA opens Quick Log with an
  onboarding first-value source marker; a successful tracker log returns to the post-first-value
  account prompt, then local prompt state advances account -> notification -> first-log complete.
- Out of scope: auth provider actions, 48-hour re-prompt cadence, persistence, notification
  permission probing, actual OS permission request, push token registration, notification
  scheduling, schema changes, native modules, and `ios/` / `android/` edits.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-OB-PROMPT-RUNTIME-1: Plan Reveal opens Quick Log with an onboarding first-value source marker
  instead of losing the onboarding context.
- AC-OB-PROMPT-RUNTIME-2: Quick Log calls the post-save scheduler only after an actual tracker log;
  dismiss, unavailable, view-only, or duplicate-warning cancel states do not schedule prompts.
- AC-OB-PROMPT-RUNTIME-3: when Quick Log was launched from onboarding first-value, a successful log
  returns to `/onboarding?postFirstValuePrompt=account`.
- AC-OB-PROMPT-RUNTIME-4: `postFirstValuePrompt=account` renders the first-log completion surface
  with the account prompt overlay; account `Not now` advances to the notification prompt, and
  notification `Not now` clears the overlay while keeping first-log completion visible.
- AC-OB-PROMPT-RUNTIME-5: no sign-in action, permission grant, push-token, notification scheduling,
  persistence, schema/native module, or generated native project change is introduced.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx src/test/onboarding-route.render.test.tsx src/test/quick-log-sheet.render.test.tsx src/test/quick-log-route.render.test.tsx`
  — FAIL as expected before implementation: Plan Reveal did not push
  `/quick-log?source=onboarding-first-value`, `OnboardingScreen postFirstValuePrompt="account"`
  still rendered Welcome, `QuickLogShell` never called `onQuickLogSaved`, and the Quick Log route
  did not return to `/onboarding?postFirstValuePrompt=account`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx src/test/onboarding-route.render.test.tsx src/test/quick-log-sheet.render.test.tsx src/test/quick-log-route.render.test.tsx`
  — PASS: 4 suites, 49 tests.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 77 suites / 625 tests, node 118 tests,
  navigation/shell i18n, i18n parity and string budgets, scaffold guardrails, token drift, privacy
  scan, and text hygiene. Existing reduced-motion `act(...)` console warnings remain non-failing.
- Stage 4 native SE screenshot comparison PASS on `Grith iPhone SE 3 iOS 26.3`
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro:
  `output/v2-nav-gaps-stage4/onboarding-post-first-value-account-runtime-stage4.jpg`,
  `output/v2-nav-gaps-stage4/onboarding-post-first-value-notifications-runtime-stage4.jpg`.

Implementation notes:
- `app/onboarding` now parses `postFirstValuePrompt=account|notifications` and opens Quick Log with
  `source=onboarding-first-value` from Plan Reveal.
- `app/(sheets)/quick-log` parses that source marker and passes an `onQuickLogSaved` scheduler to
  `QuickLogShell`; the scheduler only runs after `mutation.mutate` for an actual tracker log.
- `OnboardingScreen` renders the existing first-log completion surface with account or notification
  prompt overlays for post-first-value runtime states. Account `Not now` advances to notification;
  notification `Not now` clears the overlay and leaves first-log completion visible.
- No auth provider action, permission grant/probing, push token, notification scheduling,
  persistence, schema/native module, or generated native project change was introduced.

### 27c. Onboarding post-first-value 48-hour prompt cadence (§2.1.7)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/02-7-onboarding-account-notifications-prompts.md`.
- Source: DESIGN.md §2.1.7 post-value account/notification prompt cadence plus the already
  implemented §27b source-marker scheduler.
- Scope: persist prompt skip timestamps for the post-first-value account and notification sheets,
  apply a 48-hour cooldown per prompt type, and keep the first-log completion surface visible when a
  requested prompt is still cooling down. Storage contains only prompt kind + timestamp; no puppy,
  household, user, provider, note, token, push token, or analytics payload is stored.
- Out of scope: auth provider actions, actual OS notification permission request, permission
  probing, push token registration, local notification scheduling, schema changes, native modules,
  and `ios/` / `android/` edits.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-OB-PROMPT-CADENCE-1: a requested `account` prompt resolves to the first prompt in the account
  -> notification sequence whose last skip is not within the 48-hour cooldown.
- AC-OB-PROMPT-CADENCE-2: pressing account `Not now` persists an account skip timestamp before
  advancing to notification; pressing notification `Not now` persists a notification skip timestamp
  before returning to the first-log completion surface.
- AC-OB-PROMPT-CADENCE-3: if all requested prompts are within cooldown, onboarding renders the
  first-log completion surface without either sheet, not Welcome or a repeated prompt.
- AC-OB-PROMPT-CADENCE-4: storage read/write failures are reported through the shared
  observability boundary with stable non-PII context and do not block the user from continuing.
- AC-OB-PROMPT-CADENCE-5: no new dependency, native module, schema change, notification permission
  probe, push-token persistence, analytics payload, or generated native project change is introduced.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-prompt-cadence.test.ts src/test/onboarding-flow.render.test.tsx --testNamePattern "AC-OB-PROMPT-CADENCE"`
  failed as expected before implementation: the resolver returned `account` while account was inside
  the 48-hour cooldown, skip timestamps were not persisted, storage failures were not reported, and
  `OnboardingScreen` did not call the cadence dependency.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/onboarding-prompt-cadence.test.ts src/test/onboarding-flow.render.test.tsx --testNamePattern "AC-OB-PROMPT-CADENCE"`
  passed: 2 suites, 5 focused tests.
- `npm run test:unit -- --runTestsByPath src/test/onboarding-flow.render.test.tsx src/test/onboarding-route.render.test.tsx src/test/quick-log-route.render.test.tsx src/test/quick-log-sheet.render.test.tsx src/test/onboarding-prompt-cadence.test.ts`
  passed: 5 suites, 54 tests.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 78 suites / 641 tests, node 118 tests,
  navigation/shell i18n, i18n parity and string budgets, scaffold guardrails, token drift, privacy
  scan, and text hygiene. Existing reduced-motion `act(...)` console warnings remain non-failing.

Implementation notes:
- Added `src/lib/storage/onboardingPromptCadence.ts` with a pure 48-hour resolver, SecureStore-backed
  prompt timestamp storage, injected storage for tests, and shared observability reporting on
  read/write failures. Stored values are only prompt-kind keys plus timestamps.
- `ConnectedOnboardingScreen` uses the persisted cadence; bare preview/tests keep an immediate
  cadence dependency unless a test injects a fake. Account `Not now` records an account skip before
  resolving the notification stage; notification `Not now` records its skip before returning to the
  first-log completion surface.

### 28. More Notification Preferences Anatomy Slice (§4.4.4)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/06-more-privacy-paywall.md`.
- Source: `DESIGN.md` §4.4.4.
- Route: `/settings/notifications` from the More hub notifications row.

Acceptance:
- AC-MORE-4.4.4-1: More notifications row is an active chevron row and opens the settings route.
- AC-MORE-4.4.4-2: notification preferences screen renders Local reminders, Push to your device,
  Quiet hours, and Time zone sections.
- AC-MORE-4.4.4-3: local reminders, push reminders, and sitter-completed rows use native switch
  anatomy with localized accessibility labels.
- AC-MORE-4.4.4-4: quiet hours and timezone rows show the locked values as chevron rows, not as
  duplicated section labels.
- AC-MORE-4.4.4-5: route/navigation contract, shell i18n, and scaffold guardrails include
  `/settings/notifications`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  failed as expected before implementation because `Notifications` was not a button route.
- The same suite failed as expected after adding the screen assertion because
  `NotificationPreferencesScreen` did not exist.
- The suite caught one anatomy mismatch: the quiet-hours row duplicated the section title instead of
  using the locked time value as the row title.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  — PASS: 1 suite, 8 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts src/test/i18n.test.ts src/test/app-shell.render.test.tsx`
  — PASS: 4 suites, 32 tests.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx`
  — PASS: 1 suite, 4 tests.
- `npm run test:scaffold` — PASS.
- `git diff --check` — PASS.
- `npm run check` — PASS: lint, typecheck, 66 Jest suites / 478 tests, node checks, scaffold
  guardrails, token drift, privacy scan, and text hygiene. Note: the existing reduced-motion
  `act(...)` console warning in `screen-header.render.test.tsx` remains non-failing and unrelated to
  this slice.

Implementation notes:
- Added `src/features/more/screens/NotificationPreferencesScreen.tsx`.
- Added route file `app/(modals)/settings/notifications/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openNotifications`, active notification row, and route wiring from
  `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and scaffold guardrails to include `/settings/notifications`.
- Updated local Expo typed routes so `router.push('/settings/notifications')` typechecks in this
  workspace.
- Stage 4 PASS (2026-07-02): captured native SE screenshot from the installed PuppyPlan.app running
  JS-over-Metro and compared against the locked More notification preferences anatomy in
  `docs/design/v1/specs/06-more-privacy-paywall.md` plus this slice's acceptance. Evidence:
  `output/v2-nav-gaps-stage4/settings-notifications-stage4.png`. The route shows the full modal
  header, local reminders toggle, push reminders/sitter completion toggles, quiet-hours row, and
  timezone row without clipping/overlap. Persistence and real permission-state probing remain
  deferred; the push-toggle OS settings deeplink is covered by §4.4.4a.

### 28a. More Notification Preferences State Templates (§4.5)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/06-more-privacy-paywall.md` states notification preferences and
  cross-screen states are in scope.
- Source: `DESIGN.md` §4.4.4 notification preferences plus §4.5 global screen states.
- Route: `/settings/notifications`; dev-gallery review shell under `/_dev/components`.

Acceptance:
- AC-MORE-NOTIF-STATES-1: notification preferences exposes deterministic `loading`,
  `pending-write`, `error`, and `offline-read` review states without wiring live push/device-token
  services.
- AC-MORE-NOTIF-STATES-2: each state renders a tokenized `Card` + `StatusPill`, localized
  EN/RU/ES title/body/status copy, and stable `notifications-state-*` test IDs.
- AC-MORE-NOTIF-STATES-3: error state uses alert semantics, pending-write uses a polite live region,
  and copy does not expose APNs/FCM/device-token details.
- AC-MORE-NOTIF-STATES-4: dev-gallery includes the four notification preferences state templates for
  native Stage 4 handoff.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx` failed as expected
  because `notifications-state-loading` was absent.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx` failed as expected
  because `SyntheticNotificationPreferencesShell` was not exported.

GREEN evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx` — PASS: 1 suite,
  15 tests.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx` — PASS: 1 suite,
  4 tests.

Implementation notes:
- Added typed `NotificationPreferencesReviewState` metadata and state cards to
  `src/features/more/screens/NotificationPreferencesScreen.tsx`.
- Added `NotificationPreferencesStatePreview` and `SyntheticNotificationPreferencesShell` to the
  development design gallery so all four state cards are visible for native handoff.
- Added EN/RU/ES notification state copy plus a dev-gallery description key.
- Stage 4 PASS (2026-07-02): captured native SE screenshots from the installed PuppyPlan.app running
  JS-over-Metro for the dev-gallery notification state shell. Evidence:
  `output/v2-nav-gaps-stage4/settings-notifications-states-top-stage4.jpg` shows loading, pending
  write, and error states; `output/v2-nav-gaps-stage4/settings-notifications-states-offline-stage4.jpg`
  shows the offline-read state and the handoff transition into the next shell. Runtime snapshot also
  matched `notifications-state-offline-read`. Persistence and real permission-state probing remain
  deferred; the push-toggle OS settings deeplink is covered by §4.4.4a.

### 29. More Support / Help Anatomy Slice (§4.4.6)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/06-4-more-support-help.md`.
- Source: `DESIGN.md` §4.4.6 plus the Open Design V2 More/support board.
- Route: `/settings/help` from the More hub Help row.

Acceptance:
- AC-MORE-4.4.6-1: More Help row is an active chevron row and opens the settings help route.
- AC-MORE-4.4.6-2: support/help screen renders modal header, intro card, topic shortcuts, diagnostics
  rows, contact row, and a privacy-safe support note.
- AC-MORE-4.4.6-3: support/help copy uses typed EN/RU/ES i18n keys and does not expose a hardcoded
  support email or private sample data.
- AC-MORE-4.4.6-4: route/navigation contract, shell i18n, and scaffold guardrails include
  `/settings/help`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because Help was not an active button route,
  `HelpSupportScreen` had no anatomy, and the navigation contract did not include `/settings/help`.
- The same suite caught one setup mismatch after GREEN implementation: a test expecting active Help
  had omitted the `openHelp` action, so the row correctly rendered as non-interactive in that scenario.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 2 suites, 18 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/app-shell.render.test.tsx`
  — PASS: 2 suites, 16 tests.
- `npm run test:scaffold` — PASS.
- `git diff --check` — PASS.
- `npm run check` — PASS: lint, typecheck, 67 Jest suites / 488 tests, node checks, scaffold
  guardrails, token drift, privacy scan, and text hygiene. Note: the existing reduced-motion
  `act(...)` console warning in `screen-header.render.test.tsx` remains non-failing and unrelated to
  this slice.
- `git diff --check` — PASS.
- `npm run check` — PASS: lint, typecheck, 67 Jest suites / 486 tests, node checks, scaffold
  guardrails, token drift, privacy scan, and text hygiene. Note: the existing reduced-motion
  `act(...)` console warning in `screen-header.render.test.tsx` remains non-failing and unrelated to
  this slice.

Implementation notes:
- Added `src/features/more/screens/HelpSupportScreen.tsx`.
- Added route file `app/(modals)/settings/help/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openHelp`, active Help row, and route wiring from
  `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and scaffold guardrails to include `/settings/help`.
- Stage 4 PASS (2026-07-02): captured native SE screenshots from the installed PuppyPlan.app running
  JS-over-Metro and compared against `docs/design/v1/specs/06-4-more-support-help.md`. Evidence:
  `output/v2-nav-gaps-stage4/settings-help-stage4.png` (top) and
  `output/v2-nav-gaps-stage4/settings-help-stage4-bottom.png` (bottom). The route shows modal back
  header, intro card, three help topic chevron rows, diagnostics rows, contact row, and the visible
  privacy-safe support note. Allowed deferred items remain real support ticket creation and
  diagnostics upload.

### 29a. More Support / Help State Templates (§4.5)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/06-4-more-support-help.md` plus `DESIGN.md` §4.5 global screen
  states.
- Route: `/settings/help`; dev-gallery review shell under `/_dev/components`.
- Allowed deviation: no live support ticket, diagnostic upload, or PII-bearing support payload.
  This slice is deterministic UI templates only.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-MORE-HELP-STATES-1: support/help exposes deterministic `loading`, `pending-write`, `error`, and
  `offline-read` review states without sending support tickets or uploading diagnostics.
- AC-MORE-HELP-STATES-2: each state renders a tokenized `Card` + `StatusPill`, localized EN/RU/ES
  title/body/status copy, and stable `more-help-state-*` test IDs.
- AC-MORE-HELP-STATES-3: error state uses alert semantics, pending-write uses a polite live region,
  and copy does not expose support email addresses, diagnostic payloads, tokens, provider names, or
  private sample data.
- AC-MORE-HELP-STATES-4: dev-gallery includes compact previews for all four support/help state
  templates for native Stage 4 handoff.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern AC-MORE-HELP-STATES`
  — FAIL as expected before implementation: `more-help-state-loading` was absent.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern "route-shell preview states"`
  — FAIL as expected before implementation: `dev.gallery.states.help-support-states` was absent.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern AC-MORE-HELP-STATES`
  — PASS: 1 focused test.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern "route-shell preview states"`
  — PASS: 1 focused test.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  — PASS: 1 suite, 30 tests.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx`
  — PASS: 1 suite, 4 tests.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, Jest 76 suites / 618 tests, node 118 tests,
  scaffold/i18n/tokens/privacy/text hygiene. Existing non-failing reduced-motion `act(...)`
  warnings remain unrelated to this slice.

Implementation notes:
- `HelpSupportScreen` now accepts a deterministic `reviewState` and exports compact
  `HelpSupportStatePreview` cards for `loading`, `pending-write`, `error`, and `offline-read`.
- State cards use existing design primitives (`Card`, `StatusPill`, `AppIcon`, `AppText`, `Stack`)
  and EN/RU/ES keys. The default support route, privacy note, and mailto fallback behavior remain
  unchanged.
- Dev-gallery now includes `SyntheticHelpSupportStatesShell`; no support ticket, email availability
  probing, diagnostics upload, schema, native module, or native project edit was introduced.
- Stage 4 PASS (2026-07-03): launched the already installed PuppyPlan.app on the primary SE simulator
  over `npx expo start`, opened `puppyplan:///_dev/components`, and XcodeBuildMCP runtime snapshot
  matched `Help and support loading, pending note, error, and offline read states.` Native evidence:
  `output/v2-nav-gaps-stage4/settings-help-states-stage4.jpg`.

### 29b. More Support / Help email composer handoff reconciliation

**2026-07-03 reconciliation slice:** the privacy-safe email composer handoff is already implemented in
the current production route, but the plan/spec still described it as deferred. This slice updates
the plan lock and records the existing evidence; no production code change is required.

- Spec card: `docs/design/v1/specs/06-4-more-support-help.md`.
- Route/component: `/settings/help`, `src/features/more/screens/HelpSupportScreen.tsx`.
- TDD mode: lightweight; reduced assurance because this is evidence reconciliation for code/tests
  already present in HEAD.

Acceptance:
- AC-MORE-HELP-MAIL-1: pressing the contact row opens `Linking.openURL` with a `mailto:` URL built
  from typed EN/RU/ES i18n keys, not hardcoded JSX strings.
- AC-MORE-HELP-MAIL-2: the draft subject/body are privacy-safe and explicitly avoid raw puppy names,
  notes, emails, providers, photos, or tokens.
- AC-MORE-HELP-MAIL-3: if the OS email handoff rejects, the route renders the visible
  `more-help-support-error` alert card instead of silently swallowing the failure.
- AC-MORE-HELP-MAIL-4: live support ticket submission, diagnostics upload, schema changes, native
  modules, analytics payloads, and native project edits remain out of scope.

Evidence:
- Current code in `HelpSupportScreen` builds the `mailto:` URL from `more.help.support-email`,
  `more.help.support-draft-subject`, and `more.help.support-draft-body`, calls
  `Linking.openURL`, and renders `more-help-support-error` on rejection.
- Existing tests in `src/test/more-settings.render.test.tsx` cover both the successful privacy-safe
  mailto handoff and the visible failure state.

Verification:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern "support email|support error"`
  — PASS: 1 suite, 2 focused tests.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `node scripts/checks/text-hygiene.mjs` — PASS.

Implementation notes:
- `docs/design/v1/specs/06-4-more-support-help.md` now treats email composer handoff as production
  while keeping live ticket submission, async send states, and diagnostics upload deferred.

### 29c. More Support / Help email composer availability probe

Stage-0 lock:
- Source: `docs/design/v1/specs/06-4-more-support-help.md` support contact row and §29b mailto
  handoff contract.
- Scope: probe platform mail composer availability before opening the existing privacy-safe
  `mailto:` URL. No live support ticket, diagnostics upload, schema, native module, analytics
  payload, native project edit, or alternate support provider is introduced.

Acceptance:
- AC-MORE-HELP-MAIL-PROBE-1: pressing `Prepare support note` checks `Linking.canOpenURL()` with
  the same `mailto:` URL before calling `Linking.openURL()`.
- AC-MORE-HELP-MAIL-PROBE-2: if the platform reports that no composer can open the URL, the route
  renders the existing `more-help-support-error` alert card and does not call `Linking.openURL()`.
- AC-MORE-HELP-MAIL-PROBE-3: a rejected availability probe follows the same visible error path
  instead of being swallowed into a no-op.
- AC-MORE-HELP-MAIL-PROBE-4: successful availability keeps the existing privacy-safe localized
  subject/body handoff and does not add raw private data to visible copy, logs, analytics, or tests.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern "support email|support error|composer"`
  failed before production code because the successful handoff did not call `Linking.canOpenURL()`
  and the unavailable-composer case did not render `more-help-support-error`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern "support email|support error|composer"`
  passed: 1 suite, 4 focused tests, covering available composer, unavailable composer,
  rejected availability probe, and rejected `openURL` handoff.

Implementation notes:
- `HelpSupportScreen` now checks `Linking.canOpenURL(supportUrl)` before opening the localized
  `mailto:` draft. `false`, probe rejection, and `openURL` rejection all route to the existing
  visible support error card. Live support tickets, diagnostics upload, schema/native changes,
  analytics payloads, and alternate support providers remain deferred.

### 30. PuppyPlan Plus Paywall Shell Slice (§4.4.7)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/06-5-puppyplan-plus-paywall.md`.
- Source: `DESIGN.md` §4.4.7 plus Open Design V2 More/paywall board.
- Route: `/paywall` from the More hub PuppyPlan Plus row.

Acceptance:
- AC-MORE-PLUS-1: More PuppyPlan Plus row is an active chevron row and opens the paywall modal shell.
- AC-MORE-PLUS-2: paywall screen renders modal header, subtitle, three feature rows, annual/monthly/
  lifetime plan rows, primary CTA, Restore purchases, legal copy, and soft-lock information.
- AC-MORE-PLUS-3: annual plan selection is structural with radio/selected state, not color-only.
- AC-MORE-PLUS-4: live IAP, product loading, restore, purchase, entitlement enforcement, and
  RevenueCat/provider wiring remain absent in this shell slice.
- AC-MORE-PLUS-5: route/navigation contract, shell i18n, and scaffold guardrails include `/paywall`.
- AC-MORE-PLUS-6: the skippable early paywall shell renders a subtle trial-days-left status and
  non-nagging note.
- AC-MORE-PLUS-7: the day-30 soft-lock shell renders a read-only write-gate banner while export and
  Restore purchases remain visible actions.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because `PuppyPlanPlusScreen` was missing and `/paywall`
  was absent from modal route and planned route contracts.
- The same suite caught two anatomy/test-contract issues during GREEN: duplicate title copy in the
  shell and a test expecting the selected plan as a button instead of a radio row.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 2 suites, 20 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/app-shell.render.test.tsx`
  — PASS: 2 suites, 16 tests.
- `npm run test:scaffold` — PASS.
- 2026-06-30 follow-up RED: `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  failed as expected before implementation because `paywall.trial-status`,
  `paywall.soft-lock-banner-title`, and the export action were absent from the paywall route.
- 2026-06-30 follow-up GREEN:
  `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  — PASS: 1 suite, 13 tests.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.

Implementation notes:
- Added `src/features/more/screens/PuppyPlanPlusScreen.tsx`.
- Added route file `app/(modals)/paywall/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openPlus`, active PuppyPlan Plus row, and route wiring from
  `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and scaffold guardrails to include `/paywall`.
- Added feature-flag-ready trial and soft-lock shell states to `PuppyPlanPlusScreen`: the default
  shell shows the trial-days-left status; `accessState="softLocked"` shows the read-only banner and
  export action without introducing live entitlement/provider wiring.
- Stage 4 PASS (2026-07-02): initial SE capture found the modal title truncated as `Puppy...` /
  `PuppyPlan...`. Fixed the shared `ScreenHeader` title lane through RED/GREEN primitive coverage so
  compact modal titles with side controls keep the full `PuppyPlan Plus` header visible. Evidence:
  `output/v2-nav-gaps-stage4/paywall-stage4-top-after-header-flex3.png` (top) and
  `output/v2-nav-gaps-stage4/paywall-stage4-bottom-after-header.png` (bottom). The route shows the
  full modal title, intro/trial status, feature list, annual/monthly/lifetime plan rows, primary CTA,
  Restore purchases, soft-lock info, and legal note. Loading/offline/error/pending purchase, real
  restore, active subscription, and soft-lock enforcement states remain deferred.

### 30a. PuppyPlan Plus State Templates (§4.5)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/06-5-puppyplan-plus-paywall.md`.
- Source: `DESIGN.md` §4.4.7 plus §4.5 global screen states.
- Route: `/paywall`; dev-gallery review shell under `/_dev/components`.
- Allowed deviation: no RevenueCat/StoreKit/provider wiring, no real product lookup, no restore
  transaction, and no entitlement write. This slice is deterministic UI templates only.

Acceptance:
- AC-MORE-PLUS-STATES-1: paywall exposes deterministic `loading-products`,
  `pending-purchase`, `purchase-error`, `offline-read`, and `active-subscription` review states.
- AC-MORE-PLUS-STATES-2: each state renders a tokenized `Card` + `StatusPill`, localized EN/RU/ES
  title/body/status copy, and stable `paywall-state-*` test IDs.
- AC-MORE-PLUS-STATES-3: purchase error uses alert semantics, pending purchase uses a polite live
  region, and pending purchase exposes busy feedback on the primary CTA.
- AC-MORE-PLUS-STATES-4: state copy and visible shell do not mention RevenueCat, StoreKit provider
  names, transaction IDs, or product identifiers.
- AC-MORE-PLUS-STATES-5: dev-gallery includes compact previews for all five paywall state templates
  for native Stage 4 handoff.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx` failed as expected
  because `paywall-state-loading-products` was absent.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx` failed as expected
  because `SyntheticPaywallStatesShell` was not exported.

GREEN evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx` — PASS: 1 suite,
  16 tests.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx` — PASS: 1 suite,
  4 tests.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `git diff --check` — PASS.

Stage 4 evidence:
- Stage 4 PASS (2026-07-02): launched the already installed PuppyPlan.app on the primary SE
  simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) over `npx expo start`, opened
  `puppyplan:///_dev/components`, and captured native screenshots for the deterministic
  paywall state templates.
- Evidence files: `output/v2-nav-gaps-stage4/paywall-states-top-stage4.jpg` and
  `output/v2-nav-gaps-stage4/paywall-states-active-stage4.jpg`.
- Visual review covered loading products, pending purchase, purchase error, offline read, and
  active subscription cards in the dev-gallery shell. Live IAP, restore, product lookup, and
  entitlement enforcement remain deferred.

Implementation notes:
- Added typed `PuppyPlanPlusReviewState` metadata and state cards to
  `src/features/more/screens/PuppyPlanPlusScreen.tsx`.
- Added pending-purchase busy feedback on the primary `Choose plan` CTA.
- Added `PuppyPlanPlusStatePreview` and `SyntheticPaywallStatesShell` to the development design
  gallery so all five state cards are visible for native handoff.
- Added EN/RU/ES paywall state copy plus a dev-gallery description key, while keeping legacy
  `paywall.states.offline/error/active-until` string leaves intact for existing string-policy tests.

### 31. Accept Invite Caregiver-Side Shell Slice (§3.1.4)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-1-accept-invite.md`.
- Source: `DESIGN.md` §3.1.4 plus Open Design V2 sharing boards.
- Route: `/invite/[token]`.

Acceptance:
- AC-SHARE-ACCEPT-1: `/invite/[token]` renders a native caregiver-side accept shell instead of the
  generic revoked/expired placeholder.
- AC-SHARE-ACCEPT-2: the shell shows who invited the viewer, which puppy it concerns, the caregiver
  role, included permissions, excluded/private areas, owner revocation disclosure, Accept, and Decline.
- AC-SHARE-ACCEPT-3: included/excluded states are non-color-only and use design-owned icons, not raw
  glyph strings or local Pressables/Text.
- AC-SHARE-ACCEPT-4: raw invite tokens are never rendered in visible copy.
- AC-SHARE-ACCEPT-5: public token routes remain tracked in navigation contracts without becoming
  primary tabs or production modal routes.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/app-shell.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because `InviteAcceptScreen` did not exist and
  `/invite/[token]` / `/share/[token]` were absent from `plannedRouteFiles`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/app-shell.render.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 2 suites, 18 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/i18n.test.ts src/test/app-shell.render.test.tsx`
  — PASS: 2 suites, 17 tests.
- `npm run test:scaffold` — PASS.
- `npm run check` — PASS: 67 Jest suites / 489 tests, node checks 118/118, scaffold,
  tokens, privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)`
  warning in `src/test/screen-header.render.test.tsx` is unrelated to this slice.
- `git diff --check` — PASS.

Implementation notes:
- Added `src/features/linking/screens/InviteAcceptScreen.tsx`.
- Updated `app/invite/[token].tsx` to render the accept shell through a thin Expo Router wrapper.
- Updated navigation contracts to track `/invite/[token]` and `/share/[token]` as existing public
  token routes.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro using
  synthetic deep link `puppyplan://invite/stage4-preview-token`. Native evidence:
  `output/v2-nav-gaps-stage4/invite-accept-stage4.png`. Visual evidence covers inviter/puppy context,
  caregiver role, included and excluded permission blocks with non-color-only icons, owner revocation
  disclosure, Accept/Decline actions, and no visible raw token. Live token lookup,
  loading/error/already-member/expired states, accept RPC, decline confirmation, and post-accept
  redirect remain deferred.

### 31a. Accept Invite State Templates (§4.5)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-1-accept-invite.md`.
- Source: `DESIGN.md` §3.1.4 plus §4.5 global screen states.
- Route: `/invite/[token]`; dev-gallery review shell under `/_dev/components`.
- Allowed deviation: no live token lookup, provider payload parsing, accept RPC, decline RPC, or
  post-accept redirect. This slice is deterministic UI templates only.

Acceptance:
- AC-SHARE-ACCEPT-STATES-1: accept-invite exposes deterministic `loading`, `load-error`,
  `expired`, and `already-member` review states.
- AC-SHARE-ACCEPT-STATES-2: each state renders a tokenized `Card` + `StatusPill`, localized
  EN/RU/ES title/body/status copy, and stable `invite-accept-state-*` test IDs.
- AC-SHARE-ACCEPT-STATES-3: load error uses alert semantics, loading uses a polite live region, and
  loading exposes busy feedback on the primary Accept CTA.
- AC-SHARE-ACCEPT-STATES-4: visible state copy and shells never render raw invite tokens, provider
  names, invite IDs, or private contact data.
- AC-SHARE-ACCEPT-STATES-5: dev-gallery includes compact previews for all four invite state
  templates for native Stage 4 handoff.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/app-shell.render.test.tsx` failed as expected
  because `invite-accept-state-loading` was absent.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx` failed as expected
  because `SyntheticInviteAcceptStatesShell` was not exported.

GREEN evidence:
- `npm run test:unit -- --runTestsByPath src/test/app-shell.render.test.tsx` — PASS: 1 suite,
  9 tests.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx` — PASS: 1 suite,
  4 tests.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run typecheck` — PASS.

Stage 4 evidence:
- Stage 4 PASS (2026-07-02): launched the already installed PuppyPlan.app on the primary SE
  simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) over `npx expo start`, opened
  `puppyplan:///_dev/components`, and captured native screenshots for the deterministic Accept
  Invite state templates.
- Evidence files: `output/v2-nav-gaps-stage4/invite-accept-states-top-stage4.jpg` and
  `output/v2-nav-gaps-stage4/invite-accept-states-bottom-stage4.jpg`.
- Visual review covered loading, load error, expired/unavailable, and already-member cards in the
  dev-gallery shell. Live token lookup, provider payload parsing, accept/decline RPCs, and
  post-accept redirect remain deferred.

Implementation notes:
- Added typed `InviteAcceptReviewState` metadata and state cards to
  `src/features/linking/screens/InviteAcceptScreen.tsx`.
- Added loading-state busy feedback on the primary Accept CTA without changing the production valid
  invite shell.
- Added `InviteAcceptStatePreview` and `SyntheticInviteAcceptStatesShell` to the development design
  gallery so all four state cards are visible for native handoff.
- Added EN/RU/ES invite state copy plus a dev-gallery description key, while keeping existing
  `sharing.family.accepted.*` shell keys intact.

### 31b. Revoked / Expired Share Closed-Access Shell (§3.3.6 → 10.1)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-sharing-access-cards.md`.
- Source: `DESIGN.md` §3.3.6 plus freeze marker `10.1`.
- Route: `/share/[token]`.
- Allowed deviation: this slice remains a deterministic closed-access shell. Live token lookup,
  provider payload parsing, and public web projection remain deferred.

Acceptance:
- AC-SHARE-REVOKED-1: `/share/[token]` renders a native neutral closed-access shell, not a
  two-line placeholder.
- AC-SHARE-REVOKED-2: visible copy uses one canonical closed-link message and never differentiates
  revoked vs expired.
- AC-SHARE-REVOKED-3: the shell uses design primitives for hero card, status pill, iconography,
  info/next-step cards, and CTA.
- AC-SHARE-REVOKED-4: visible copy does not expose raw share tokens, provider names, private
  reasons, contact details, or puppy records.
- AC-SHARE-REVOKED-5: EN/RU/ES i18n and `shellI18nKeys` stay in sync.

RED evidence:
- `npm run test:unit -- src/test/app-shell.render.test.tsx --runInBand` failed as expected before
  implementation because `states.revoked-or-expired.status` and the supporting closed-access
  anatomy were absent.

GREEN evidence:
- `npm run test:unit -- src/test/app-shell.render.test.tsx --runInBand` — PASS: 1 suite, 9 tests.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `node scripts/checks/check-shell-i18n.mjs` — PASS after adding the new shell keys to
  `shellI18nKeys`.

Stage 4 evidence:
- Stage 4 PASS (2026-07-02): launched the already installed PuppyPlan.app on the primary SE
  simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) over `npx expo start --localhost`, opened
  `puppyplan://share/stage4-access-unavailable`, and captured a native screenshot.
- Evidence file: `output/v2-nav-gaps-stage4/access-unavailable-stage4.png`.
- First visual pass showed the CTA partly below the initial SE viewport; typography was compacted
  from `title1`/body to `title2`/callout and the screenshot was recaptured with the CTA fully visible.

Implementation notes:
- Rebuilt `AccessUnavailableScreen` with `Screen`, `Card`, `StatusPill`, `AppIcon`, `AppText`, and
  `Button`; no raw UI `Pressable`/`Text` was introduced.
- Added EN/RU/ES privacy-safe copy for closed-access status, private-detail disclosure, next step,
  and CTA.
- Kept the screen deterministic and token-agnostic; real share-token validation remains deferred.

### 32. Manage Household Shell Slice (§3.1.6)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-2-manage-household.md`.
- Source: `DESIGN.md` §3.1.6 plus `docs/design/v1/specs/07-sharing-access-cards.md`.
- Route: `/settings/household` from the More Family row.

Acceptance:
- AC-SHARE-HOUSEHOLD-1: More Family row is an active chevron row and opens the household settings
  route.
- AC-SHARE-HOUSEHOLD-2: the route renders a native Manage household shell with modal header, members
  section, invitations section, owner row, caregiver row, pending invite row, Invite CTA, and empty
  owner-alone guidance.
- AC-SHARE-HOUSEHOLD-3: member/invite states are non-color-only through visible role/status badges
  and icon affordances.
- AC-SHARE-HOUSEHOLD-4: pending invite preview does not render raw email addresses or invite tokens.
- AC-SHARE-HOUSEHOLD-5: route/navigation contract, shell i18n, and scaffold guardrails include
  `/settings/household`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because `HouseholdAccessScreen` did not exist and
  `/settings/household` was absent from `settingsRoutes` / `plannedRouteFiles`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts src/test/i18n.test.ts`
  — PASS: 3 suites, 30 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `git diff --check` — PASS.
- `npm run check` — PASS: 67 Jest suites / 490 tests, node checks 118/118, scaffold, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` is unrelated to this slice.

Implementation notes:
- Added `src/features/more/screens/HouseholdAccessScreen.tsx`.
- Added route file `app/(modals)/settings/household/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openHousehold`, active Family row, and route wiring from
  `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and scaffold guardrails to include `/settings/household`.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro. Native
  evidence:
  `output/v2-nav-gaps-stage4/settings-household-top-stage4.png`,
  `output/v2-nav-gaps-stage4/settings-household-bottom-stage4.png`. Visual evidence covers the modal
  header, intro card, owner row, caregiver row, pending invite row, role/status badges, overflow
  affordances, privacy-safe pending invite label, owner-alone guidance card, and Invite CTA. Live
  member/invite queries, role changes, access removal, resend/revoke actions, and confirm sheets
  remain deferred.

### 32a. Manage Household State Templates (§3.1.6 / §4.5)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-2-manage-household.md`.
- Source: DESIGN.md §3.1.6 and §4.5 global screen states.
- Scope: deterministic synthetic `loading`, `pending-write`, `error`, and `offline-read` cards for
  `/settings/household`, plus dev-gallery handoff coverage.
- Out of scope: live member/invite queries, role changes, access removal, invite resend/revoke,
  confirm sheets, analytics, schema/native modules, and `ios/` / `android/` edits.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-SHARE-HOUSEHOLD-STATES-1: `HouseholdAccessScreen` accepts a deterministic `reviewState` for
  loading, pending write, error, and offline read.
- AC-SHARE-HOUSEHOLD-STATES-2: each state renders a primitive card with stable
  `household-state-*` test ID, typed EN/RU/ES status/title/body copy, and alert/live-region semantics
  for error/loading/pending.
- AC-SHARE-HOUSEHOLD-STATES-3: state copy exposes no raw emails, invite/share tokens, member private
  names, provider data, or puppy notes.
- AC-SHARE-HOUSEHOLD-STATES-4: the dev-gallery includes all four Manage Household state templates
  for Stage 4 native handoff.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/dev-gallery.render.test.tsx --testNamePattern "AC-SHARE-HOUSEHOLD-STATES|route-shell preview states"`
  failed as expected before implementation because `household-state-loading` was absent from both
  the `HouseholdAccessScreen` review-state surface and the dev-gallery route-shell preview.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx --testNamePattern AC-SHARE-HOUSEHOLD-STATES`
  — PASS: 1 suite, 1 matching test.
- `npm run test:unit -- --runTestsByPath src/test/dev-gallery.render.test.tsx --testNamePattern "route-shell preview states"`
  — PASS: 1 suite, 1 matching test.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/dev-gallery.render.test.tsx src/test/i18n.test.ts`
  — PASS: 3 suites, 53 tests.
- `npm run check` — PASS: lint, typecheck, 79 Jest suites / 648 tests, node tests,
  scaffold/i18n/tokens/privacy/text hygiene. Output still includes existing React `act(...)`
  warnings from reduced-motion test listeners; no failures.

Stage 4 PASS:
- 2026-07-03 on the primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the
  installed PuppyPlan.app over the already-running Metro server (`expo start --localhost`).
  Native evidence:
  `output/v2-nav-gaps-stage4/settings-household-states-top-stage4.jpg`,
  `output/v2-nav-gaps-stage4/settings-household-states-cards-stage4.jpg`. Visual evidence covers the
  dev-gallery Family and access section plus loading, pending-write, error, and offline-read cards
  with typed copy, status pills/icons, alert/error coloring, and muted offline surface.

### 32b. Manage Household pending invite read-only slice (§3.1.6)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-2-manage-household.md`.
- Source: DESIGN.md §3.1.6 Manage household and existing `public.invite` RLS
  `invite_owner_read`.
- Scope: read non-accepted, non-revoked household invites for the current owner household and render
  privacy-safe pending invite rows on `/settings/household`.
- Allowed deviation: the member list remains the existing static owner/caregiver preview in this
  slice because current RLS only exposes the signed-in user's own accepted membership
  (`household_membership_read_own`). Full live member list, role changes, removal, resend/revoke,
  invite creation, confirm sheets, token lookup, and email/contact display remain deferred until an
  approved RLS/RPC design exists.
- Out of scope: schema/RLS migrations, direct invite writes, token hashes, raw email/contact display,
  analytics payloads, native modules, and `ios/` / `android/` edits.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-SHARE-HOUSEHOLD-INVITES-1: the Supabase household-access repository lists pending invites
  scoped by `household_id`, excluding accepted and revoked rows, ordered by `expires_at`, and parses
  rows through the existing `inviteRecordSchema`.
- AC-SHARE-HOUSEHOLD-INVITES-2: the query layer reads by
  `queryKeys.sharing.householdInvites(householdId)` and treats a null active-care context as disabled
  without putting raw invite tokens, emails, or hashes in the cache key.
- AC-SHARE-HOUSEHOLD-INVITES-3: the connected `/settings/household` route renders live pending
  invite rows when available, with role/status/date copy only; no raw email address, invite token,
  token hash, or provider data is rendered.
- AC-SHARE-HOUSEHOLD-INVITES-4: invite-query loading and errors reuse the existing household state
  templates; the Invite CTA and existing static member preview remain unchanged.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/household-access-repository.test.ts src/test/household-access-query.test.ts src/test/more-settings.render.test.tsx --testNamePattern "AC-SHARE-HOUSEHOLD-INVITES"`
  failed as expected before implementation: repository/query stubs returned
  `household_access_invites_not_implemented` / `household_invites_query_not_implemented`, inactive
  query options were enabled with the wrong key, and `/settings/household` did not call the invite
  query hook.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/household-access-repository.test.ts src/test/household-access-query.test.ts src/test/more-settings.render.test.tsx --testNamePattern "AC-SHARE-HOUSEHOLD-INVITES"`
  — PASS: 3 suites, 5 matching tests.
- `npm run test:unit -- --runTestsByPath src/test/household-access-repository.test.ts src/test/household-access-query.test.ts src/test/more-settings.render.test.tsx src/test/i18n.test.ts`
  — PASS: 4 suites, 55 tests.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run typecheck` — PASS.

Stage 4 evidence:
- Primary SE simulator: `Grith iPhone SE 3 iOS 26.3`
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).
- Installed `PuppyPlan.app` launched over `npx expo start --localhost` in development-build mode;
  `/settings/household` was opened via `puppyplan://settings/household`.
- The non-production account had no live pending invites, so the native capture verifies the
  connected route shell and privacy-safe pending fallback row; synthetic live invite row anatomy,
  household-scoped query key, and absence of raw email/token/hash copy are covered by render/query
  tests above.
- Evidence file:
  `output/v2-nav-gaps-stage4/settings-household-invite-read-stage4.jpg`.

Implementation notes:
- Added `src/lib/supabase/household-access.ts` with a typed `listPendingInvites` read path over
  `public.invite`, scoped by household, accepted/revoked filters, `expires_at` ordering, and
  `inviteRecordSchema` parsing.
- Added `src/lib/query/household-access.ts` and `queryKeys.sharing.householdInvites(householdId)`;
  inactive/null active-care context uses a disabled, privacy-safe key with no invite token, email,
  hash, or provider data.
- Connected `HouseholdAccessScreen` to active care and the pending-invite query. Live rows render
  only localized role/status/date copy; static member preview, Invite CTA, role changes,
  resend/revoke, invite creation, confirm sheets, and member-list data remain deferred.

### 33. Trusted Sitter Mode Owner Shell Slice (§3.2)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-sharing-access-cards.md`.
- Source: `DESIGN.md` §3.2.1 Enable Sitter Mode.
- Route: `/settings/sitter-mode` from the More Trainer / sitter row.

Acceptance:
- AC-SITTER-MODE-1: More Trainer / sitter row is active and opens the sitter mode settings route.
- AC-SITTER-MODE-2: the route renders a native owner-side sitter setup shell with title, hero copy,
  caregiver row, time window rows, five checklist rows, visibility preview, disclosure, and enable CTA.
- AC-SITTER-MODE-3: checklist selection and visibility states are non-color-only through visible icons.
- AC-SITTER-MODE-4: the shell uses existing design primitives, typed EN/RU/ES i18n keys, and no raw
  email, invite token, provider, or private contact data.
- AC-SITTER-MODE-5: route/navigation contract, shell i18n, and scaffold guardrails include
  `/settings/sitter-mode`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because `SitterModeScreen` did not exist and
  `/settings/sitter-mode` was absent from `settingsRoutes` / `plannedRouteFiles`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 2 suites, 22 tests.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.

Implementation notes:
- Added `src/features/more/screens/SitterModeScreen.tsx`.
- Added route file `app/(modals)/settings/sitter-mode/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openSitterMode` and route wiring from `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and scaffold guardrails to include `/settings/sitter-mode`.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro. Native
  evidence:
  `output/v2-nav-gaps-stage4/settings-sitter-mode-stage4.png`,
  `output/v2-nav-gaps-stage4/settings-sitter-mode-bottom-stage4.png`. Visual evidence covers the modal
  header, hero copy, caregiver row, time window rows, checklist selected/unselected icon states,
  visibility preview included/excluded icon states, disclosure, and enable CTA. Real caregiver
  selection, date/time picker, checklist editing, enable mutation, active owner status, completion
  push, auto-expire, and exit confirm remain deferred.

### 33a. Trusted Sitter Mode State Templates (§3.2 + §4.5)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-sharing-access-cards.md`.
- Source: `DESIGN.md` §3.2.1 Enable Sitter Mode and §4.5 global screen states.
- Route: `/settings/sitter-mode`; compact dev-gallery handoff shell under `/_dev/components`.
- Device: primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) for Stage 4.
- Allowed deviation: templates are synthetic review-only cards. Live caregiver lookup, enable/exit
  mutations, active checklist data, completion push, auto-expire, and pending-sync behavior remain
  deferred.

Acceptance:
- AC-SITTER-STATES-1: Sitter Mode can render deterministic review states for no-caregiver,
  pending send, active mode, and exit-confirm.
- AC-SITTER-STATES-2: pending exposes a polite live region; exit-confirm exposes alert semantics.
- AC-SITTER-STATES-3: the state templates use design primitives, tokenized styles, and typed
  EN/RU/ES i18n keys.
- AC-SITTER-STATES-4: the dev-gallery includes all four compact Sitter Mode state templates for
  native handoff.
- AC-SITTER-STATES-5: templates do not expose raw email, invite/share tokens, caregiver contact
  data, Supabase details, or production write language.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/dev-gallery.render.test.tsx --silent`
  failed as expected before implementation because `SitterModeStatePreview` was undefined and the
  dev-gallery did not render `dev.gallery.states.sitter-mode-states`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/dev-gallery.render.test.tsx --silent`
  — PASS: 2 suites, 23 tests.
- `node scripts/checks/check-i18n.mjs` — PASS: i18n parity, typed helper usage, and string budgets ok.
- `npm run tokens:check` — PASS.
- `npm run typecheck` — PASS.
- `npm run check` — PASS: lint, typecheck, 70 Jest suites / 549 tests, node checks 118/118,
  scaffold, tokens, privacy scan, and text hygiene all green. Existing non-failing reduced-motion
  `act(...)` warning in `src/test/screen-header.render.test.tsx` is unrelated to this slice.

Implementation notes:
- Added typed `SitterModeReviewState` metadata and compact `SitterModeStatePreview` cards to
  `src/features/more/screens/SitterModeScreen.tsx`.
- Added `SyntheticSitterModeStatesShell` to the dev-gallery immediately after Shareable Puppy Card
  state templates.
- Added typed EN/RU/ES copy under `sharing.sitter.states.*` and
  `dev.gallery.states.sitter-mode-states`.

Stage 4:
- PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro.
  Native evidence:
  `output/v2-nav-gaps-stage4/sitter-mode-states-top-stage4.jpg`,
  `output/v2-nav-gaps-stage4/sitter-mode-states-bottom-stage4.jpg`. Visual review covers the
  dev-gallery shell, no-caregiver setup card, pending send card, active mode card, and exit-confirm
  alert card. Real caregiver lookup, enable/exit mutations, active sitter checklist data, completion
  push, auto-expire, and pending-sync state remain deferred.

### 34. Shareable Puppy Card Shell Slice (§3.4)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-sharing-access-cards.md`.
- Source: `DESIGN.md` §3.4 plus `cards/*` atlas references in the V2 sharing boards.
- Route: `/sharing/puppy-card` from the More sharing section.
- Allowed deviation: rich builder, multi-template editor, live signed-link creation, expiry editing,
  and revoke flows are roadmap/deferred; this slice is the minimal static/signed-link shell.

Acceptance:
- AC-SHARE-CARD-1: More exposes an active Shared cards row that opens `/sharing/puppy-card`.
- AC-SHARE-CARD-2: the route renders a native shell with modal header, builder field list, health
  disclosure, 3:4 preview, share CTA, public-link disclosure, and active shared-card row.
- AC-SHARE-CARD-3: preview aspect ratio is structurally locked to 3:4.
- AC-SHARE-CARD-4: the shell uses design primitives, typed EN/RU/ES i18n keys, and tokenized styles.
- AC-SHARE-CARD-5: the shell renders no raw email, provider name, invite/share token, or private
  contact data.
- AC-SHARE-CARD-6: route/navigation contract, shell i18n, and scaffold guardrails include
  `/sharing/puppy-card`.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  failed as expected before implementation because `ShareablePuppyCardScreen` was missing and
  `/sharing/puppy-card` was absent from the planned route contract.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 2 suites, 24 tests.
- `npm run typecheck` — PASS.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `git diff --check` — PASS.
- `npm run check` — PASS: 67 Jest suites / 495 tests, node checks 118/118, scaffold, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` is unrelated to this slice.
- Changed-file raw color scan found no `hex` / `rgb` / raw `backgroundColor` / raw `color` literals.

Implementation notes:
- Added `src/features/more/screens/ShareablePuppyCardScreen.tsx`.
- Added route file `app/(modals)/sharing/puppy-card/index.tsx` and modal stack registration.
- Updated `MoreScreen` with `openShareableCards` and route wiring from `app/(tabs)/more/index.tsx`.
- Updated navigation contracts and shell i18n allowlist to include `/sharing/puppy-card` and the
  card preview keys.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro. Native
  evidence:
  `output/v2-nav-gaps-stage4/sharing-puppy-card-top-stage4.png`,
  `output/v2-nav-gaps-stage4/sharing-puppy-card-middle-stage4.png`. Visual evidence covers the modal
  header, hero card, builder field list, health disclosure, 3:4 preview anatomy, Share CTA,
  public-link disclosure, and active shared-card row without raw email, provider, invite/share token,
  or private contact data. Live signed-link creation, real share sheet, expiry editing, copy-link,
  revoke/extend, card history, loading/error/offline states, and public web projection remain
  deferred.

### 34a. Shareable Puppy Card State Templates (§3.4 + §4.5)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/07-sharing-access-cards.md`.
- Atlas refs: `cards/9-1-empty.png`, `cards/9-1-health.png`, `cards/9-3.png`,
  `cards/9-4.png`, plus `states/states.png` for global loading / pending-write / error /
  offline-read anatomy.
- Route: `/sharing/puppy-card`; dev-gallery handoff shell under `/_dev/components`.
- Device: primary SE simulator (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) for Stage 4.
- Allowed deviation: templates are synthetic review-only cards. Live signed-link creation, real OS
  share sheet invocation, expiry editing, revoke/extend mutation, card history data, and public web
  projection remain deferred.

Acceptance:
- AC-SHARE-CARD-STATES-1: the Shareable Puppy Card route can render deterministic review states for
  empty builder, health disclosure on, share options, loading, pending write, error, and offline-read.
- AC-SHARE-CARD-STATES-2: loading and pending write state templates expose polite live regions;
  error exposes alert semantics; empty builder exposes a disabled preview action.
- AC-SHARE-CARD-STATES-3: the state templates use design primitives, tokenized styles, and typed
  EN/RU/ES i18n keys.
- AC-SHARE-CARD-STATES-4: the dev-gallery includes all seven Shareable Puppy Card state templates
  for native handoff.
- AC-SHARE-CARD-STATES-5: templates do not expose raw email, provider/clinic names, invite/share
  tokens, private notes, Supabase details, or production write language.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/dev-gallery.render.test.tsx`
  failed as expected before implementation because `ShareablePuppyCardStatePreview`,
  `SyntheticShareablePuppyCardStatesShell`, and route `reviewState` rendering were absent.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/dev-gallery.render.test.tsx`
  — PASS: 2 suites, 22 tests.
- `node scripts/checks/check-i18n.mjs` — PASS.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n parity/budgets,
  scaffold guardrails, tokens, privacy scan, and text hygiene.
- `git diff --check` — PASS.
- Changed-file raw color scan found no `hex` / `rgb` literals in the new screen/gallery code.

Stage 4:
- PASS recorded 2026-07-02 on the primary SE simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`) from the installed PuppyPlan.app over Metro.
  Native evidence:
  `output/v2-nav-gaps-stage4/shareable-card-states-top-stage4.jpg`,
  `output/v2-nav-gaps-stage4/shareable-card-states-middle-stage4.jpg`,
  `output/v2-nav-gaps-stage4/shareable-card-states-bottom-stage4.jpg`,
  `output/v2-nav-gaps-stage4/shareable-card-states-offline-stage4.jpg`. Visual review covers the
  dev-gallery shell, empty disabled preview action, health disclosure, link/snapshot share options,
  loading, pending-write, error alert styling, and offline-read card. A first middle capture exposed
  truncated helper copy in `ListRow`; the state anatomy was adjusted to wrap-friendly `Stack` /
  `AppText` rows and re-captured before PASS.

### 34b. Shareable Puppy Card OS share sheet handoff (§3.4)

**2026-07-02 route handoff slice:** wire the existing `/sharing/puppy-card` Share CTA to the
React Native OS share sheet with privacy-safe localized card copy. This closes the OS share sheet
handoff gap only; signed-link creation, expiry editing, revoke/extend, durable card history, and
public web projection remain deferred.

- Spec card: `docs/design/v1/specs/07-sharing-access-cards.md`.
- Route/components: `app/(modals)/sharing/puppy-card/index.tsx` and
  `src/features/more/screens/ShareablePuppyCardScreen.tsx`.
- TDD mode: lightweight; reduced assurance because this continuation is running in the main thread,
  but the route test must be RED before implementation.

Acceptance:
- AC-SHARE-CARD-SHARE-1: pressing the production route Share CTA invokes `Share.share` with a
  localized title/message assembled from existing card strings.
- AC-SHARE-CARD-SHARE-2: the shared payload contains no raw email, provider/clinic name, invite/share
  token, private notes, Supabase details, or durable signed-link placeholder.
- AC-SHARE-CARD-SHARE-3: while the OS share call is pending, the route renders the existing
  pending-write state; after success it renders the existing share-options state without closing the
  modal.
- AC-SHARE-CARD-SHARE-4: if the OS share call rejects, the route renders the existing error state
  instead of silently swallowing the failure.
- Out of scope: signed-link creation, copy-link, expiry editing, revoke/extend mutations, card
  history persistence, analytics, schema changes, and new native modules.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  failed before implementation because `Share.share` was never called and the route never rendered the
  share error state when the mocked OS share call rejected.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx`
  — PASS: 1 suite, 21 tests.
- `npm run typecheck` — PASS.
- `npm run test:unit -- --runTestsByPath src/test/more-settings.render.test.tsx src/test/navigation-contract.test.ts src/test/dev-gallery.render.test.tsx src/test/app-shell.render.test.tsx`
  — PASS: 4 suites, 45 tests.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n parity/budgets, scaffold
  guardrails, tokens, privacy scan, and text hygiene.

Implementation notes:
- `/sharing/puppy-card` now owns the OS share-sheet handoff with React Native `Share.share`, using
  existing localized card title/footer strings and the generic sample puppy label. It does not create
  or expose a signed link.
- The route renders the existing pending-write state while awaiting the OS share sheet, the existing
  share-options state after success, and the existing error state on rejection. The route stays open
  in all cases and does not log/share provider, email, token, private notes, or Supabase details.

### 35. Guidance Active-UI Deferral Reconciliation (§4.3)

Stage-0 lock:
- Spec card: `docs/design/v1/specs/08-deferred-reference.md`.
- Source: `docs/plans/active/2026-06-27-diary-pet-nav-design-brief.md` §0.6 / §11, plus
  `docs/design/v1/specs/03-diary-route.md` contextual tip slot.
- Allowed active surface: at most one lightweight Diary contextual tip. No Guidance tab, no broad
  training library, and no read/practiced/skip card states in this wave.

Acceptance:
- AC-GUIDANCE-DEF-1: `buildTodayPlan` emits `guidanceCard: null` for active V2 Diary plans.
- AC-GUIDANCE-DEF-2: `TodayPlanCards` does not render `today-guidance-card`, even if a legacy plan
  payload contains a `guidanceCard`.
- AC-GUIDANCE-DEF-3: active Diary render tests assert absence of Read / Tried it / Skip guidance
  actions.
- AC-GUIDANCE-DEF-4: local starter guidance content/contracts may remain as deferred reference
  material, but no production Diary UI consumes them in this wave.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/today-prioritization.test.ts src/test/today-core.render.test.tsx`
  failed as expected before implementation because `buildTodayPlan` emitted a `guidanceCard` and
  Diary rendered `today-guidance-card`.
- Follow-up RED with `src/test/guidance.render.test.tsx` also failed because direct legacy
  `TodayPlanCards` input still rendered the active read/practiced/skip card.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/today-prioritization.test.ts src/test/today-core.render.test.tsx src/test/guidance.render.test.tsx`
  — PASS: 3 suites, 23 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold guardrails,
  tokens, privacy scan, and text hygiene.
- `git diff --check` — PASS.
- `npm run check` — PASS: 67 Jest suites / 495 tests, node checks 118/118, scaffold, tokens,
  privacy scan, and text hygiene all green. Existing non-failing reduced-motion `act(...)` warning
  in `src/test/screen-header.render.test.tsx` is unrelated to this slice.
- Changed-file raw style scan found no `hex` / `rgb` / raw color literals or numeric padding/margin
  literals in the touched Today/Diary files after tokenizing the existing info banner spacing.

Implementation notes:
- `buildTodayPlan` now always returns `guidanceCard: null`; the nullable schema remains for legacy
  shape compatibility and future approved guidance work.
- `TodayPlanCards` ignores `plan.guidanceCard`, and the old interactive `StarterGuidanceCard` /
  `GuidanceTopicDetail` active UI was removed from `TodayCards.tsx`.
- `src/test/guidance.render.test.tsx` now locks the deferral behavior instead of locking the old
  read/practiced/skip interactions.
- No Stage 4 screenshot is required for the deferred guidance UI; Stage 4 for the remaining allowed
  contextual tip slot stays covered under the Diary route screenshot backlog.

### 36. Cross-Cutting V2 TabBar + Pet Deferred-Scope Reconciliation

Stage-0 lock:
- Navigation spec: `docs/design/v1/specs/01-navigation-add.md`.
- Pet/Health spec: `docs/design/v1/specs/05-pet-health.md`.
- Source canon: `DESIGN.md` V2 redesign override and `puppyplan-prd-v2.md` MVP/deferred scope.

Acceptance:
- AC-XCUT-NAV-1: the Expo tabs layout delegates bottom navigation chrome to `CapsuleTabBar`.
- AC-XCUT-NAV-2: visible primary tabs remain exactly Diary, Pet, More; legacy Today/Health routes are
  registered only as hidden redirect aliases through `href:null`.
- AC-XCUT-NAV-3: the V1 tab-layout tests no longer assert a persistent bottom-right Quick Log FAB;
  Add-open behavior is covered by the `CapsuleTabBar` anatomy tests instead.
- AC-XCUT-NAV-4: no default full-width tab bar or absolute bottom-right FAB remains under
  `app/(tabs)`.
- AC-XCUT-PET-1: multi-pet/foster, standalone Health tab, health charts/milestones, and
  medication/refill remain closed as explicit out-of-wave scope, not native implementation work.

Evidence:
- `app/(tabs)/_layout.tsx` passes `tabBar={(props) => <CapsuleTabBar {...props} />}` to Expo Router.
- `src/test/tab-layout.render.test.tsx` asserts visible routes equal `primaryTabs`, hidden legacy
  routes are `today/index` and `health/index` with `href:null`, canonical icons are book/paw/more,
  active tint is `tokens.color.primary[700]`, and bottom chrome is delegated to `CapsuleTabBar`.
- `src/test/capsule-tab-bar.render.test.tsx` asserts T1-T7 anatomy, Add outside the tablist,
  detached capsule, capsule removal while chooser is open, scrim + two slabs, slab routing, reduced
  motion, haptics, and stable in-place Add morph.
- `rg "<FAB|isFabLogSurfacePath|tabBarStyle" app/(tabs) src/test/tab-layout.render.test.tsx`
  returns no V1 tab-shell implementation or stale tab-layout assertions.
- `rg "medication/refill|Medication card|multi-pet|standalone Health|charts" docs/design/v1/specs/05-pet-health.md docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md puppyplan-prd-v2.md docs/architecture/01-principles-and-scope.md`
  confirms these Pet/Health depth items are deferred/out-of-wave.

Verification:
- `npm run test:unit -- --runTestsByPath src/test/tab-layout.render.test.tsx src/test/capsule-tab-bar.render.test.tsx src/test/legacy-tab-route-redirects.test.tsx src/test/navigation-contract.test.ts`
  — PASS: 4 suites, 28 tests.

Notes:
- The remaining `FAB` primitive usage in `src/features/onboarding/screens/OnboardingScreen.tsx` is not
  a migrated tab-shell FAB. It belongs to the onboarding first-log preview, whose spec allows the V2
  separate Add/FAB action while the wizard itself stays outside the tab shell.
- This reconciliation does not close Stage 4 screenshot backlogs for individual screens; it only closes
  the stale cross-cutting "old nav still applied" matrix row and the explicitly deferred Pet/Health
  depth rows.

### 36a. Quick Log Details State Templates (§2.3.7 / §4.5)

Stage-0 lock:
- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Source canon: `DESIGN.md` §2.3.7 Details and §4.5 global screen states.
- Route/component: `/quick-log/details`,
  `src/features/quick-log/screens/QuickLogDetailsScreen.tsx`.
- Dev-gallery handoff: `/_dev/components` should render all detail state templates inside the
  visible `SyntheticQuickLogDetailsShell`.
- Allowed deviation: this slice standardizes deterministic route/detail state templates only. Real
  offline Quick Log detail queueing, native pickers, schema changes, analytics, native modules, and
  `ios/` / `android/` edits remain out of scope.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR are not context-isolated.

Acceptance:
- AC-QL-DETAIL-STATES-1: the Quick Log details surface exposes deterministic loading,
  pending-write, error, offline-read, and permission-denied state templates with stable
  `quick-log-details-state-*` test IDs.
- AC-QL-DETAIL-STATES-2: each state uses design primitives (`Card`, `StatusPill`, `AppIcon`,
  `AppText`) and typed EN/RU/ES i18n status/title/body copy.
- AC-QL-DETAIL-STATES-3: loading and pending-write announce politely; error and permission-denied
  use alert semantics; offline-read uses the muted template surface.
- AC-QL-DETAIL-STATES-4: route wiring maps active-care loading/error and unavailable or view-only
  contexts to the deterministic templates without saving optional details.
- AC-QL-DETAIL-STATES-5: state copy exposes no raw puppy names, notes, emails, provider names,
  photos, tokens, diagnostics payloads, or private contact data.
- AC-QL-DETAIL-STATES-6: the dev-gallery route-shell preview includes all five Quick Log details
  state templates for native Stage 4 handoff.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-details.test.tsx src/test/quick-log-details-route.render.test.tsx src/test/dev-gallery.render.test.tsx --testNamePattern "AC-QL-DETAIL-STATES|route-shell preview states"`
  failed as expected before implementation because `QuickLogDetailsStatePreview` was not exported
  and the route/dev-gallery did not render `quick-log-details-state-*` templates.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-details.test.tsx src/test/quick-log-details-route.render.test.tsx src/test/dev-gallery.render.test.tsx --testNamePattern "AC-QL-DETAIL-STATES|route-shell preview states|synthetic pending-write|synthetic error"`
  passed: 3 suites, 11 focused tests.
- `npm run test:unit -- --runTestsByPath src/test/quick-log-details.test.tsx src/test/quick-log-details-route.render.test.tsx src/test/dev-gallery.render.test.tsx`
  passed: 3 suites, 25 tests.
- `node scripts/checks/check-i18n.mjs` passed.
- `npm run typecheck` passed.
- `npm run check` passed: lint, typecheck, 81 Jest suites / 665 tests, node checks,
  navigation/scaffold/i18n/tokens/privacy/text hygiene.

Implementation notes:
- `QuickLogDetailsScreen` now exposes `QuickLogDetailsStatePreview` with loading, pending-write,
  error, offline-read, and permission-denied states using `Card`, `StatusPill`, `AppIcon`, typed
  i18n keys, polite live regions, alert semantics, and muted offline styling.
- `/quick-log/details` maps active-care loading/error, local queue loading/unavailable, and viewer
  contexts into deterministic templates. Real offline detail queueing, native pickers, schema/native
  modules, and native project edits remain out of scope.
- Stage 4 PASS recorded 2026-07-03 on the primary SE simulator over `npx expo start` and the
  already-installed PuppyPlan.app. Native evidence:
  `output/v2-nav-gaps-stage4/quick-log-details-states-stage4.png`,
  `output/v2-nav-gaps-stage4/quick-log-details-states-loading-pending-stage4.png`,
  `output/v2-nav-gaps-stage4/quick-log-details-states-offline-permission-stage4.png`,
  `output/v2-nav-gaps-stage4/quick-log-details-states-permission-stage4.png`.

### 37. Quick Log Pending Route Coverage (§2.3.9)

Stage-0 lock:
- Source spec card: `docs/design/v1/specs/04-quick-log-routines-reminders.md`.
- Source canon: `DESIGN.md` §2.3.9 Pending/failed/retry.
- Route/component: `/quick-log`, `QuickLogShell`, `QuickLogLocalEvents`.
- TDD mode: lightweight; reduced assurance because RED/GREEN/REFACTOR were not context-isolated.

Acceptance:
- AC-QL-2.3.9-PENDING-1: when the route receives a `started` Quick Log mutation event before
  `useQuickLogCachedRows` refreshes, the sheet renders an inline pending row for the affected tracker.
- AC-QL-2.3.9-PENDING-2: the pending row uses the existing localized pending label and
  `quick-log-local-event-pending-card` anatomy hook.
- AC-QL-2.3.9-PENDING-3: the inline pending Undo action calls the mutation undo port with the active
  care context (`clientEventId`, `eventType`, `householdId`, `puppyId`, `todayDate`).
- AC-QL-2.3.9-PENDING-4: mutation-event rows merge with cached local rows by `clientEventId` so the
  route does not duplicate the same pending/failed event.

RED evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx`
  failed as expected before implementation: `Unable to find an element with testID:
  quick-log-local-event-pending-card`.

GREEN / regression evidence:
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx`
  — PASS: 1 suite, 8 tests.
- `npm run test:unit -- --runTestsByPath src/test/quick-log-route.render.test.tsx src/test/quick-log-sheet.render.test.tsx src/test/quick-log-local-events.render.test.tsx`
  — PASS: 3 suites, 27 tests.
- `npm run typecheck` — PASS.
- `npm run test:scaffold` — PASS: navigation contract, shell i18n, i18n budgets, scaffold
  guardrails, token drift check, privacy scan, and text hygiene.
- `npm run check` — PASS: lint, typecheck, 67 Jest suites / 497 tests, node tests, scaffold
  checks, tokens, privacy scan, and text hygiene. Output still includes the existing React
  `act(...)` warning in `screen-header.render.test.tsx`; no failures.

Implementation notes:
- `src/features/quick-log/screens/QuickLogShell.tsx` now maps `started` mutation events to
  pending `QuickLogLocalEventView` rows using the active care context and existing tracker i18n keys.
- The same mapping keeps failed mutation events on the failed-row path if cache rows have not refreshed.
- Cached local rows and mutation-event rows are merged by `clientEventId`, with the latest mutation event
  overriding a stale cached row for the same event.
- Stage 4 PASS recorded 2026-07-02 on the primary SE simulator from the temporary Quick Log
  pending/failed route harness noted in §12. Native evidence:
  `output/v2-nav-gaps-stage4/quick-log-pending-failed-harness-stage4.png`.

