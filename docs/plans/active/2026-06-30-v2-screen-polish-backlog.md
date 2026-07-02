# V2 Screen Polish — Backlog for Codex

> **For Codex:** This is the follow-up backlog after the nav-capsule plan
> ([`2026-06-30-v2-nav-capsule.md`](2026-06-30-v2-nav-capsule.md)). Do the nav plan FIRST.
> These are smaller, mostly screen-level fixes found during a live simulator walkthrough on
> 2026-06-30 (Diary → Quick Log → Pet → More). Each item lists the exact location, what's
> wrong, the target, and acceptance. Severity: P1 = visible polish/correctness, P2 = nice-to-have.

## Ground rules (same as the nav plan)

- Tokens only; typed i18n keys only; primitives only. No hardcoded colors/spacing.
- Never weaken a check to make it pass. If a fix legitimately changes a test's expectation
  (e.g. item 3 changes how many "Deferred" rows exist), UPDATE the test to assert the new
  correct behavior — do not delete or skip it.
- User-facing strings live in `STRINGS.en.json` (repo root) and its sibling locale files.
  Update every locale, then run `node scripts/checks/check-i18n.mjs`.
- Token changes go through `design-tokens.json` → `npm run tokens:generate` → `npm run tokens:check`
  (the same pipeline used for the Terracotta Clay sync). Never edit `src/design/tokens.ts` by hand.
- After each item: run `npm run check` and commit separately.

---

## P1 — Item 1: Dev-leak copy on the Pet "Quick trackers" card

**What's wrong:** The Pet hub shows the implementation detail "Adjust the five Add buttons".
Users don't think in "Add buttons", and "five" hardcodes a count that the feature itself treats
as "up to 5".

**Location:** `STRINGS.en.json`
- `health.pet-hub.quick-trackers-meta` = `"Adjust the five Add buttons"`
- `health.pet-hub.quick-trackers-a11y` = `"Quick trackers. Adjust the five Add buttons."`

**Target:** Reword to user-facing language, consistent with the existing
`more.quick-trackers.hint` = `"Pick up to 5 trackers for Today and Quick Log."` Reuse that phrasing
(e.g. meta = `"Pick up to 5 for Today and Quick Log"`; a11y mirrors it). Update all locales.

**Acceptance:** No occurrence of "Add buttons" / "five" in any user-facing `health.pet-hub.*`
string; `check-i18n.mjs` green; any snapshot/render test referencing the old copy updated.

**Item 1 evidence (2026-07-01):** RED
`npm run test:unit -- --runTestsByPath src/test/i18n.test.ts` failed on
`health.pet-hub.quick-trackers-meta = "Adjust the five Add buttons"`; GREEN updated EN/RU/ES Pet hub
copy to the existing user-facing "pick up to 5" language and added a locale-wide guard against the
implementation leak. `node scripts/checks/check-i18n.mjs` passed; `npm run check` passed
(67 Jest suites / 498 tests, node/scaffold gates green; existing `screen-header.render.test.tsx`
`act(...)` warning only). JS-over-Metro screenshots captured locally:
`output/v2-screen-polish-screenshots/item1-pet-before.png` and
`output/v2-screen-polish-screenshots/item1-pet-after.png`.

## P1 — Item 2: Pet ↔ More duplication (Puppy profile, Quick trackers)

**What's wrong:** "Puppy profile" and "Quick trackers" appear as entry points on BOTH the Pet hub
and the More screen, with no clear primary home — it muddies the information architecture.

**Locations:**
- Pet hub: `src/features/health/screens/HealthScreen.tsx` (renders the profile card +
  `health.pet-hub.quick-trackers-*`).
- More: `more.rows.quick-trackers` / `more.rows.puppy-profile` rows + `src/features/more/...`
  and `more.quick-trackers.*` settings screen.

**This is an IA decision, not a mechanical fix.** Decide ONE canonical home for each:
- Recommended: Pet hub owns puppy profile + quick-trackers (they're pet-scoped); More keeps a
  single "Pet settings" entry that deep-links into the Pet hub, instead of duplicating both rows.
- Whatever is chosen, document it in `docs/design/v1/specs/` (the Pet and More spec cards) so it's
  locked, then implement. Update `src/test/more-settings.render.test.tsx` to match the new row set.

**Acceptance:** Each of "Puppy profile" and "Quick trackers" has exactly one primary entry point;
the spec cards state where; tests updated and green.

## P1 — Item 3: "Deferred" rows exposed to users in More

**What's wrong (nuance):** More renders 7 rows tagged `"Deferred"` (Family, Trainer/sitter,
Reminders, …). This is currently a **deliberate, tested** decision — `more.rows.deferred` and
`src/test/more-settings.render.test.tsx` asserts exactly 7 deferred rows. But showing internal
roadmap status ("Deferred") to end users reads as unfinished product.

**Location:** `more.rows.deferred` in `STRINGS.en.json`; `src/features/more/...`;
test `src/test/more-settings.render.test.tsx:117-118`.

**Decision needed (design):** Pick one —
(a) hide deferred rows entirely in production builds (keep them in the dev gallery);
(b) keep the rows but replace the "Deferred" tag with a neutral "Coming soon" or a lock affordance;
(c) leave as-is (accept it).
Record the decision in the More spec card before changing code. If (a)/(b), update the render test
to assert the new behavior (legitimate — the spec changed), do not just delete the assertion.

**Acceptance:** Decision recorded in spec; More screen matches it; test reflects the new contract.

## P1 — Item 4: Teal "Done" status pill is a Calm-Teal leftover

**What's wrong:** The `completed`/"Done" status pill is teal (`#EAF3F3` fill / `#175255` text),
a remnant of the retired Calm Teal palette. It clashes with the Terracotta Clay system.

**Location:** `design-tokens.json` → `color.pill.completed` (generates
`tokens.color.pill.completed` in `src/design/tokens.ts:84-87`). Used wherever a `completed`/done
StatusPill renders (Pet hub status chips).

**Target:** Re-tone to the V2 system — either a neutral "done" (greys from `color.text`/`surface`)
or a desaturated success that harmonizes with terracotta. Keep it visually distinct from
`success` (`#3F7A57`) and `confirmed` (green). Verify text-on-fill contrast ≥ 4.5:1.

**Do it via the token pipeline:** edit `design-tokens.json`, `npm run tokens:generate`,
`npm run tokens:check`. Reference DESIGN.md §2 for the canonical ramp.

**Acceptance:** No teal (`#175255`/`#EAF3F3`) remains in `color.pill.*`; contrast checked;
tokens regenerated and drift-check green.

**Item 4 evidence (2026-07-01):** RED
`npm run test:unit -- --runTestsByPath src/test/design-tokens.test.ts` failed on
`tokens.color.pill.completed.fill = "#EAF3F3"`. GREEN retuned `color.pill.completed` to warm neutral
`fill #E8E2D7 / text #4A4E48` (contrast 6.58:1), updated `DESIGN.md` §2.7, regenerated
`src/design/tokens.ts` via `npm run tokens:generate`, and `npm run tokens:check` passed. JS-over-Metro
screenshots captured locally: `output/v2-screen-polish-screenshots/item4-pet-before.png` and
`output/v2-screen-polish-screenshots/item4-pet-after.png`.

## P1 — Item 5: Screen-title hierarchy is inconsistent

> **RE-SCOPED 2026-07-02 — read before implementing.** The Diary half of this item is STALE.
> Diary was rebuilt to the Clay design lock (`docs/design/v2/specs/diary-v2.md`) and **no longer
> renders a screen title at all** — it renders a `DiaryHeader` greeting ("Good morning, {name}"
> in `title1` Lora + date + avatar), which is the locked, intentional anatomy. Do NOT add a
> "Diary" `ScreenHeader` back and do NOT resize anything on the Diary route for this item.
> This item now covers **Pet and More (and their sub-screens) only**: unify their `ScreenHeader`
> title treatment on one typography token.

**What's wrong:** "Pet" and "More" (and More sub-screens) size their screen titles inconsistently.
There's no single rule for the screen title.

**Location:** the `ScreenHeader` primitive (`src/design/primitives/ScreenHeader.tsx`) and its
usages (Pet/HealthScreen, More hub, More sub-screens). Compare the `variant`/size each passes.
Diary is out of scope (see re-scope note).

**Target:** One consistent screen-title treatment across Pet/More, driven from `ScreenHeader`
defaults so screens don't each choose their own size.

**Acceptance:** Pet, More, and More sub-screens share the same title typography token; Diary
still renders the DiaryHeader greeting (no ScreenHeader); verified in the simulator.

**Item 5 evidence (2026-07-02):** RED
`npm run test:unit -- --runTestsByPath src/test/screen-header.render.test.tsx src/test/health.render.test.tsx src/test/app-shell.render.test.tsx`
failed because `ScreenHeader` used `headline` (17pt) and Pet/More rendered plain title text with
no accessibility header role. GREEN moved `ScreenHeader` to the shared `title1` token and routed
the Pet and More hub titles through `ScreenHeader`; Diary was not touched and remains on
`DiaryHeader`. Focused tests passed for ScreenHeader/Pet/More plus More sub-screens:
`src/test/more-settings.render.test.tsx`, `src/test/puppy-profile-settings.render.test.tsx`,
`src/test/quick-trackers-settings.render.test.tsx`. JS-over-Metro screenshots captured locally:
`output/v2-screen-polish-screenshots/item5-pet-before.png`,
`output/v2-screen-polish-screenshots/item5-pet-after.png`,
`output/v2-screen-polish-screenshots/item5-more-before-redacted.png`, and
`output/v2-screen-polish-screenshots/item5-more-after-redacted.png`.

## P2 — Item 6: Verify the Pet empty state isn't a near-empty void

**What to check (verify-first, may be fine):** In the walkthrough, the Pet hub's health section
read as a large card with just a stethoscope icon. The code DOES use a full `EmptyState` with body
+ two CTAs (`src/features/health/screens/HealthScreen.tsx:95-105`,
`health.empty.body` / `health.empty.primary` / `health.empty.secondary`).

**Target:** Confirm the body text and both CTAs actually render (not clipped/below the fold) and
the card isn't mostly whitespace. If the icon-only impression is real, tighten the empty-state
spacing or ensure body+actions are visible without scrolling. No change if it renders correctly.

**Acceptance:** Screenshot of the Pet empty state showing icon + body + CTAs; spacing adjusted only
if needed.

**Item 6 evidence (2026-07-02):** Verify-only PASS. JS-over-Metro on the installed PuppyPlan.app
with the primary SE simulator shows the Pet health empty state is not an icon-only void: the icon,
body copy, primary `Add entry` CTA, secondary `Browse templates` CTA, and medical-advice disclaimer
are all visible in one scrolled viewport. No UI code change needed. Screenshot:
`output/v2-screen-polish-screenshots/item6-pet-empty-state-verified.jpg`.

---

# Items 7–12: Diary Clay fidelity follow-ups (added 2026-07-02)

> Source: fresh-eyes design review of the Diary Clay rebuild against the locked reference
> `docs/design/v2/reference/diary-create.screens.jsx` + spec `docs/design/v2/specs/diary-v2.md`.
> The Diary rebuild itself (DiaryHeader, WeekStrip, InfoHero, FactCard, accent map, swipe-to-delete)
> passed Stage 4 on iPhone SE 3 + iPhone 16e and is NOT to be restructured — these are targeted
> deltas found against the reference. Read `diary-v2.md` (the design lock) before touching any of them.

## P1 — Item 7: Diary "Today" section title is one type step too small

**What's wrong:** The reference (`ScreenDiaryDay`) renders the "Today" section title as
`pp-title-3` (20pt Lora). The screen uses `variant="headline"` (17pt).

**Location:** `src/features/today/screens/TodayScreen.tsx` — the `today.history.section-title`
AppText (search `styles.sectionTitle`).

**Target:** `variant="title3"`. Keep the layout row otherwise as-is.

**Acceptance:** Section title renders title3; existing anatomy tests updated if they assert the
variant; `npm run check` green.

**Item 7 evidence (2026-07-02):** RED
`npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed because
`today.history.section-title` rendered at the `headline` font size (17pt) instead of the locked
`title3` token (20pt). GREEN changed only that AppText variant to `title3`; the DiaryHeader
greeting and layout row were not changed. JS-over-Metro screenshots captured locally with private
header values redacted:
`output/v2-screen-polish-screenshots/item7-diary-before-redacted.png` and
`output/v2-screen-polish-screenshots/item7-diary-after-redacted.png`.

## P1 — Item 8: Diary event-list gap is 8, locked deviation says 10

**What's wrong:** The Stage-1 design lock recorded "list gap 10 (reference-exact literal)" as a
named deviation, but the screen composes the list with `Stack gap="sm"` = 8. Reference is 10.

**Location:** `src/features/today/screens/TodayScreen.tsx` — the `<Stack gap="sm">` wrapping the
Diary history section (section title row + fact rows).

**Target:** 10pt between event rows (reference-exact literal is the recorded deviation; a local
constant is fine — do NOT invent a new Stack size unless it's added properly via tokens).

**Acceptance:** Vertical rhythm between fact cards is 10; `npm run check` green.

**Item 8 evidence (2026-07-02):** RED
`npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed because the
Diary history section gap was `8` from `Stack gap="sm"` instead of the locked 10pt deviation.
GREEN added a local `DIARY_HISTORY_SECTION_GAP = 10` override on the history section Stack and
kept the rest of the row layout unchanged. JS-over-Metro screenshots captured locally with private
header values redacted:
`output/v2-screen-polish-screenshots/item8-diary-before-redacted.png` and
`output/v2-screen-polish-screenshots/item8-diary-after-redacted.png`.

## P1 — Item 9: Pending/failed status belongs INSIDE the FactCard caption

**What's wrong:** Atlas `7-diary-states` shows a pending write as a FactCard with caption
"Saving…" *inside* the card. The screen instead renders an external `StatusPill` to the right of
the card, which narrows the card and breaks the even list grid.

**Location:** `src/features/today/screens/TodayScreen.tsx` — `DiaryFactRow`: the
`caption={event.status === 'synced' ? event.actorLabel : undefined}` ternary + the `StatusPill`
branch in the horizontal Stack.

**Target:** For pending/failed rows pass `caption={event.statusLabel}` into `FactCard` and drop
the external StatusPill. KEEP: the a11y live-region announcement of the status, the retry/undo/
delete action rows below the card, and the persistent failed banner. Non-color-only status must
survive (the caption text itself satisfies this).

**Acceptance:** Pending/failed facts render full-width FactCards with the status as caption;
matches atlas `7-diary-states`; a11y status announcement still present; render tests updated to
the new contract (legitimate spec change — cite this item); `npm run check` green.

**Item 9 evidence (2026-07-02):** RED
`npm run test:unit -- --runTestsByPath src/test/today-quick-log.render.test.tsx` failed because
pending/failed rows still rendered an external `StatusPill` with exact accessibility labels
`Pending` / `Failed`. GREEN moved the pending/failed `event.statusLabel` into the `FactCard`
caption and removed the external pill branch while keeping retry/delete/undo rows and the
persistent failed banner. Focused render tests passed. JS-over-Metro screenshot captured locally
with the live Diary header redacted:
`output/v2-screen-polish-screenshots/item9-after-redacted.png`. The live debug account currently
shows a synced row, so the pending/failed visual state is covered by render-test anatomy rather
than a live simulator row.

## P1 — Item 10: Diary empty states don't match atlas 6 / 6b / 6c

**What's wrong:** `cold-start`, `empty-history`, and `all-done` render as the generic
`TodayStatusCard` (pill + headline + body) — a pre-Clay template. The atlas shows:
- `6-diary-cold-start` / `6b-diary-empty-history`: **centered** composition — `EmptyIllustration`
  (96pt circle, `primary/50` bg, 46pt paw glyph in `primary/500`) + `title-3` heading + `callout`
  secondary body (max-width ~280) + CTAs (cold start: primary "Quick Log" + secondary
  "Add to schedule"; empty day: no CTAs, just copy).
- `6c-diary-all-done`: a `sage/100` radius-22 celebration card (success pill + `title-3` +
  `callout`) above the day's list — NOT a generic status card.

**Location:** `src/features/today/screens/TodayScreen.tsx` (`getTodayStatusState` consumers),
`src/features/today/components/TodayCards.tsx` (`TodayStatusCard`), new primitive(s) in
`src/design/primitives/` (`EmptyIllustration`; possibly a celebration card variant).

**Target:** Build `EmptyIllustration` as a primitive (with a render test, added to the dev
gallery), re-render the three states per the atlas. Other `TodayStatusCard` states
(loading/offline/error/permission) stay as-is for now. Reference anatomy:
`docs/design/v2/reference/diary-create.screens.jsx` → `ScreenDiaryColdStart`, `ScreenDiaryEmpty`,
`ScreenDiaryAllDone`.

**Acceptance:** The three states match the atlas structurally (anatomy tests) and visually
(simulator screenshot per state, synthetic data only); `npm run check` green.

**Item 10 evidence (2026-07-02):** RED
`npm run test:unit -- --runTestsByPath src/test/today-core.render.test.tsx` failed because
`all-done`, `cold-start`, and `empty-history` still rendered through the generic
`TodayStatusCard` (`today-state-*`). GREEN added the compact `EmptyIllustration` primitive, routed
`cold-start` / `empty-history` to centered Clay empty-state compositions, routed `all-done` to a
sage completion card, left loading/offline/error/permission/pending states on `TodayStatusCard`,
and added the primitive to the dev gallery. Focused tests passed:
`src/test/today-core.render.test.tsx`, `src/test/diary-primitives.render.test.tsx`, and
`src/test/dev-gallery.render.test.tsx`. Stage 4 synthetic SE screenshots captured through the real
Diary tab shell over Metro:
`output/v2-screen-polish-screenshots/item10-diary-cold-start-tab-stage4.png`,
`output/v2-screen-polish-screenshots/item10-diary-empty-history-tab-stage4.png`, and
`output/v2-screen-polish-screenshots/item10-diary-all-done-tab-stage4.png`.

## P2 — Item 11: WeekStrip — rolling window vs calendar week + non-interactive "tabs"

**What's wrong (two parts):**
(a) The strip renders a rolling ±3-day window centered on today
(`createDiaryWeekDays` in `TodayScreen.tsx` maps offsets `[-3..+3]`), so the visible days shift
every day. The reference is a fixed locale calendar week (Mon–Sun) with today marked wherever it
falls. Note: an earlier review recorded this as "Sun-first locale, OK" — that was a misread
(2026-07-01 was a Wednesday, so `-3` happened to land on Sunday).
(b) Days carry `accessibilityRole="tab"` but `onSelectDay` is never wired — VoiceOver promises
interactivity that doesn't exist, and artboard `7b-selected-not-today` is unreachable.

**Decision needed (design) before code:** either implement the fixed locale week + day selection
(pairs naturally with Diary history scrolling / artboard 5), or explicitly record the rolling
window as a named deviation in `diary-v2.md`. Do not silently keep the current hybrid.

**Quick sub-fix allowed now:** while days are non-interactive, drop the `tab` role/selected state
promise (keep the descriptive a11y labels).

**Quick sub-fix status (2026-07-02):** done. `WeekStrip` now preserves the container label but
does not expose the old `tablist` role; React Native's current `AccessibilityRole` type has no
`group` role in this stack. Non-interactive days expose text semantics with descriptive labels only,
while the primitive still uses `button` semantics when `onSelectDay` is supplied. RED/GREEN coverage:
`src/test/diary-primitives.render.test.tsx` + `src/test/today-core.render.test.tsx`.
Runtime evidence: XcodeBuildMCP runtime snapshot on the primary SE simulator showed the production
Diary WeekStrip day entries as `text` rows and no `tab`/`tablist` targets after relaunching the
installed app over Metro. The fixed locale week vs rolling-window/day-selection design decision
remains open.

**Acceptance:** Decision recorded in `diary-v2.md`; implementation matches it; a11y roles don't
promise unavailable interactions; tests updated; `npm run check` green.

## P2 — Item 12: Small hardening batch (radii tokens, TimeGutter split, gallery)

One commit, low risk:
- **Radius literals duplicated:** `CARD_RADIUS = 18` is declared independently in `FactCard.tsx`,
  `RoutineCard.tsx`, and `SwipeToDelete.tsx`; chip radius 13 in `IconChip.tsx`; hero radius 20 in
  `InfoHero.tsx`. Add proper tokens via the pipeline (`design-tokens.json` →
  `npm run tokens:generate`; e.g. `radius.card=18`, `radius.chip=13`, `radius.hero=20`) and
  replace the literals. These were recorded named deviations pending exactly this reconciliation.
- **`TimeGutter.tsx`** splits time on `time.split(' ')`; ICU 72+ emits U+202F (narrow no-break
  space) before AM/PM in some environments. Split on `/\s/` instead. Add a unit-test case with a
  U+202F time string.
- **Dev gallery:** `SwipeToDelete` is the only Diary primitive missing from
  `src/features/_dev/design-gallery/DesignGalleryScreen.tsx` — add it.

**Acceptance:** No duplicated radius literals; tokens drift-check green; U+202F test passes;
gallery renders SwipeToDelete; `npm run check` green.

**Item 12 evidence (2026-07-02):** RED
`npm run test:unit -- --runTestsByPath src/test/design-tokens.test.ts src/test/diary-primitives.render.test.tsx src/test/dev-gallery.render.test.tsx`
failed because `radius.card/chip/hero` were missing, `TimeGutter` did not split a narrow no-break
space time, and the dev gallery had no `gallery-swipe-delete` fixture. GREEN added
`radius.card=18`, `radius.chip=13`, and `radius.hero=20` through `design-tokens.json` +
`npm run tokens:generate`, replaced the duplicated radius literals, normalized U+00A0/U+202F in
`TimeGutter`, and added a hidden `SwipeToDelete` fixture to the synthetic dev gallery. The U+202F
test was corrected to use a JSX expression (`time={'7:15\u202fAM'}`), because quoted JSX
attributes pass the backslash sequence literally. `npm run tokens:check`, the focused suite, and
`npm run check` passed (529 Jest tests + node/scaffold gates green; existing
`screen-header.render.test.tsx` `act(...)` warning only). JS-over-Metro screenshots captured
locally with private live-header values redacted:
`output/v2-screen-polish-screenshots/item12-before-redacted.png`,
`output/v2-screen-polish-screenshots/item12-after-redacted.png`, and synthetic gallery evidence
`output/v2-screen-polish-screenshots/item12-gallery-after.png`.

## Known-deferred (do NOT pick up from this backlog)

- **Synced-fact delete is functionally broken** (RLS blocks the soft-delete UPDATE, error swallowed
  by `.catch(() => undefined)` in `src/lib/query/quick-log.ts` `deleteSynced`). Root-caused and
  tracked separately; requires a **migration** (owner approval) + removing the silent catch. The
  swipe-to-delete UI is correct and stays. When it IS fixed, the reference contract requires a
  **snackbar undo** after delete ("Delete: warning + snackbar undo") — implement then, not now.
- **DiaryHeader recap line** ("Since yesterday: …") — primitive supports `recap`, no data source
  yet. Needs a cross-day summary query; separate slice.
- **"Review history" button + Diary history scroll-back** (atlas 5/5b: DayDivider groups, filter
  bar) — the button next to "Today" is a transitional bridge to the old Timeline route; it goes
  away only when history folds into Diary scroll. Larger slice, plan-owned (§2.4 of the gaps doc).
- **RoutineCard rows in Diary** — blocked on the schedule/routine data model (gaps-doc decision).

---

## Suggested order

Nav-capsule plan → Item 1 (trivial copy) → Item 4 (token, isolated) → Item 5 (header, as
re-scoped) → Item 7 (one-liner) → Item 8 (gap) → Item 12 (hardening batch) → Item 9 (pending
caption) → Item 6 (verify) → Item 10 (empty states) → Items 2 & 3 (need a design/IA decision +
spec update first) → Item 11 (needs a design decision).

## Note on the native build

These are all JS/token/i18n changes — verifiable via JS-over-Metro on the installed binary. The
native iOS build is currently blocked by an expo-sqlite × Xcode 26.2 / Swift 6.2.3 incompatibility
(see `chore(deps): align expo packages…` commit). It does not block this backlog.

---

## Kickoff prompt for Codex

> **SUPERSEDED 2026-07-02 — do not use.** This original kickoff told Codex to discard leftover
> uncommitted changes; that instruction is now WRONG because the Diary Clay rebuild
> (new `src/design/primitives/*` Diary primitives, `DiaryHeader`, `TodayScreen` rework, specs,
> reference atlas) lives on this branch and must not be discarded. Use the
> **"Continuation prompt (2026-07-02)"** below instead. Kept for history only.

```
Work through docs/plans/active/2026-06-30-v2-screen-polish-backlog.md on branch
`redesign-v2-nav-codex-wip`. The nav-capsule plan should already be merged into this branch.

Orient first (do not assume): run `git status` and `git log --oneline -10`. Your working tree
must be clean and on the latest branch HEAD before you start. If leftover uncommitted changes
remain from any earlier interrupted run, they are stale — discard them (`git restore .`) rather
than committing on top, which would revert newer fixes. If unsure, ask.

Read first: AGENTS.md, docs/agents/design-fidelity-pipeline.md, DESIGN.md §2 (the color canon),
and the backlog itself.

Do the items in the suggested order: 1 (copy) → 4 (token) → 5 (header) → 6 (verify) → then
2 and 3. One commit per item.

Rules (non-negotiable):
- Items 2 and 3 require a DESIGN/IA decision and a spec-card update BEFORE code. Do not guess:
  propose the decision, get it confirmed, write it into the relevant docs/design/v1/specs card,
  THEN implement. STOP and ask if the decision isn't obvious from the spec.
- Item 4 is a TOKEN change: edit design-tokens.json, run `npm run tokens:generate` and
  `npm run tokens:check`. Never hand-edit src/design/tokens.ts. Verify contrast ≥ 4.5:1.
- User-facing strings: edit STRINGS.en.json + every sibling locale, then `node scripts/checks/check-i18n.mjs`.
- Tokens only / primitives only / typed i18n keys only — no hardcoded values, no string literals in JSX.
- Never weaken a check to make it pass: no eslint-disable / ts-ignore / @ts-expect-error / any,
  no deleting or skipping tests, no editing tsconfig/jest/lint config. If a fix legitimately
  changes a test's expectation (e.g. item 3 changes the number of "Deferred" rows), UPDATE the
  test to assert the new correct behavior — explain why in the commit.
- Do NOT touch ios/ or android/ native files. Do not push — pushing/PRs are the human's call.
- Run `npm run check` before each commit.

Run the app via JS-over-Metro (native build is blocked by expo-sqlite × Xcode 26.2 / Swift 6.2.3):
`npx expo start`, launch the already-installed PuppyPlan.app in the booted simulator, sign in with
"Use debug account". The Supabase Dev project (olymqppxsadsxfrcyskh) must be awake.

For each item, post a before/after simulator screenshot when you finish it.
```

---

## Continuation prompt (2026-07-02) — current

> Context for whoever resumes Codex: Codex stopped mid-backlog, about to start Item 5. Since
> then, a parallel Claude session rebuilt the Diary route to the Clay design lock
> (`docs/design/v2/specs/diary-v2.md`, reference atlas under `docs/design/v2/reference/`) —
> this work is on the same branch. Item 5 was re-scoped (Diary excluded) and Items 7–12 were
> added from a 2026-07-02 design review. The exact prompt text to paste into Codex lives with
> the session owner; its non-negotiables are:
> 1. **Never discard or revert uncommitted/committed Diary Clay work** (Diary primitives,
>    `DiaryHeader`, `TodayScreen`, `diary-v2.md`, `docs/design/v2/reference/`). The earlier
>    "discard leftovers" instruction is void.
> 2. Re-read Item 5's re-scope note and the Items 7–12 block before coding.
> 3. `docs/design/v2/specs/diary-v2.md` supersedes `today-v2.md` and, for the Diary route's
>    visual anatomy, the older `docs/design/v1/specs/03-diary-route.md` lock.
> 4. All other ground rules of this backlog stay in force.
