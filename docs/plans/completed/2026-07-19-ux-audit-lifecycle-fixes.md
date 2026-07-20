# UX-audit fixes: routine lifecycle & Reminders surfaces (2026-07-19)

**Status:** Completed
**Plan type:** Completed task plan
**Current phase:** Complete — all nine audit findings verified
Linear: PUP-36 (implements all 9 findings of the 2026-07-19 live-simulator UX audit of
PUP-33/PUP-34 work). The Finding-1 dependency ruling happens in PUP-36 comments.
Executor: Codex agent.
Evidence: `output/ux-audit/pup34-audit-2026-07-19/` (source audit) and
`output/ux-audit/pup36-audit-2026-07-19/` (completion audit), synthetic data only.

## Context

A live UX audit (fresh `main.jsbundle` of branch
`dimaselenya/pup-34-routine-lifecycle-menu-edit-pauseresume-delete`, iPhone SE 3 simulator,
default + AccessibilityL sizes) confirmed the PUP-34 lifecycle mechanics work end-to-end and
found 9 defects/decisions. This plan turns every finding into an implementable fix with
acceptance criteria. Findings are ordered by severity; implementation phases below reorder
them for dependency and risk.

## Hard constraints (repo rules — do not violate)

- Feature UI uses `src/design` primitives only: no raw `Pressable`, raw colors, raw spacing.
- Every user-facing string is a typed i18n key added to **all three** of `STRINGS.en.json`,
  `STRINGS.ru.json`, `STRINGS.es.json`. RU reminders-surface terminology is «напоминание»
  (never «режим» — fixed 2026-07-19, keep consistent).
- TanStack Query for server state; Zustand only for UI state.
- Tests before or alongside each behavior change; never weaken a check to pass.
- No schema/migration changes. No new dependency without explicit owner approval —
  Finding 1 has a dependency decision point, see below.
- Do not log raw puppy names/notes or other private data.
- Update `docs/design/v2/specs/routine-lifecycle-menu.md` when a fix changes locked
  menu/row behavior (Findings 6, 7, 8, 9).
- Full gate before Done: `npm run check` (expect 104+ suites green, lint 0 errors).

## Stage 0 Design Lock (PUP-36, pre-code)

Lock package recorded 2026-07-19 after opening the audit evidence with own eyes:

- **Diary lifecycle / paused recovery:** V2 artboards `11-routine-menu`,
  `11b-routines-more`, `11c-pause-recovery`; states: actions, delete confirmation,
  paused/off recovery, success snackbar. Canonical spec card:
  `docs/design/v2/specs/routine-lifecycle-menu.md`.
- **Reminders hub:** V1 atlas `12.1 Reminders list` plus the newer V2 `11b` composition;
  states: canonical active row, legacy active row, expired one-off row, paused row with the
  lifecycle modal open. Canonical implementation target remains the shipped Active/Off IA.
- **Diary populated / fact actions / week strip:** V2 `4-diary-populated`,
  `7b-selected-not-today`, and stable `dogfood.diary.01`; canonical spec cards:
  `docs/design/v2/specs/diary-v2.md` and `docs/design/v1/specs/03-diary-core-states.md`.
- **Device sizes:** approved iPhone SE 3 compact portrait `375x667`, default and
  AccessibilityL content sizes. No larger simulator may replace the compact-device gate.
- **Evidence refs:** `03-delete-confirmation.png`, `04-diary-after-pause.png`,
  `07-reminders-hub.png`, `08-hub-legacy-menu.png`, `12-hub-paused-menu.png`,
  `21-fact-row-overflow.png`, `22-axl-diary.png`, and `31-ru-diary.png` under the evidence root.

Allowed deviations are locked as follows:

- Keep the native modal/static-card lifecycle surface and the shipped Active/Off hub IA.
- Add a confirmation-only snackbar after Pause; do not add Undo or `Open More` actions.
- Keep fact-row actions inline; add the missing two-step delete confirmation without unifying
  them with the lifecycle modal.
- Keep expired one-off reminders in Active with functional toggle/overflow; honesty is conveyed
  by localized copy plus the existing quiet visual treatment.
- WeekStrip is pixel-identical at default size; scrolling is activated by actual overflow at
  large content sizes and the selected day is brought on-screen without shrinking 44pt targets.

Stage 4 closed after fresh native screenshots were captured and compared per state.

## Root-cause lock (verified against current source)

1. `src/lib/i18n/index.ts` initializes i18next with `lng: 'en'`; no device locale enters the
   bootstrap. `toSupportedLocale()` is correct but only sees i18next's already-hardcoded language.
2. `WeekStrip.tsx` switches to a horizontal `ScrollView` at `fontScale >= 2`; the audit evidence
   shows that large-type branch (64pt fixed cells, roughly five visible), but the selected day is
   initially off-screen and there is no selected-item auto-scroll. The implementation must base
   scrolling on measured overflow rather than treating the font-scale threshold as proof.
3. `RemindersHubScreen.tsx::formatCanonicalSubtitle` passes `rule.date` to copy verbatim.
4. `ReminderRow` has no expired projection. The canonical contract uses `repeat: 'never'` for a
   one-off rule (the user-facing label is “Once”); the notification scheduler treats an occurrence
   at `scheduledFor <= now` as no longer schedulable. PUP-36 uses that same boundary and the row's
   IANA `timezone`, rather than introducing a conflicting `'once'` contract value.
5. `DiaryFactRow` calls `onDelete(createQuickLogDeleteRequest(event))` directly from the expanded
   inline danger button, so the first tap mutates.
6. `RoutineLifecycleMenu` swaps the secondary title slot for reassurance copy in confirmation,
   dropping the routine name exactly at the destructive step.
7. Diary and hub call the toggle mutation without a success-only feedback callback.
8. A paused hub row hides Resume behind `!lifecycleOpen`, changing the row width under the scrim.
9. `RoutineLifecycleMenu` renders `null` when `onEdit` is absent, leaving no explanation.

## TDD Spec Lock

### Acceptance criteria

- **AC-P36-1:** cold-start locale resolution maps `ru-RU -> ru`, `es-419 -> es`,
  `de-DE -> en`, and missing locale data to `en`; i18next and `useAppTranslation().locale` expose
  the resolved value.
- **AC-P36-2:** when seven WeekStrip cells overflow, the strip is horizontally reachable and
  scrolls the selected cell into view on mount and selection change; default non-overflow anatomy
  and all existing selected/a11y states remain unchanged.
- **AC-P36-3:** a canonical one-off subtitle uses `formatCalendarDate(rule.date, locale)` and does
  not contain the raw ISO date.
- **AC-P36-4:** a canonical `repeat: 'never'` occurrence whose timezone-correct
  `scheduledFor <= now` shows the localized expired marker and quiet treatment; a later occurrence
  does neither. Re-rendering across midnight recomputes from the live clock.
- **AC-P36-5:** the first press on the expanded inline `Delete entry` action only opens a
  confirmation state; Confirm calls the delete handler once, while Cancel restores actions and
  preserves the row. Existing swipe/a11y delete-with-Undo behavior is out of this inline fix.
- **AC-P36-6:** lifecycle delete confirmation retains the user-supplied routine title with the
  body/text face and a two-line clamp; destructive and Cancel buttons remain unchanged.
- **AC-P36-7:** successful Pause from Diary or the hub emits exactly one localized, polite,
  auto-dismissing snackbar pointing to `Reminders -> Off`; Resume and failed Pause emit none, and
  the existing row-level failure remains visible.
- **AC-P36-8:** the paused row's Resume control remains rendered while its modal is open and modal
  focus isolation prevents a duplicate reachable target.
- **AC-P36-9:** a legacy menu renders localized one-line muted explanatory copy where Edit would
  be; canonical menus render Edit and omit the caption.

### Edge and error cases

- **EC-P36-TIME-1:** the expiry boundary matches the scheduler (`scheduledFor <= now`) and uses
  the reminder's IANA timezone, including dates on either side of local midnight.
- **EC-P36-A11Y-1:** long EN/RU/ES confirmation and hint copy wraps/clamps without replacing or
  shrinking any 44pt target.
- **EC-P36-SCROLL-1:** selected index `0` and `6`, selection changes, and content that fits exactly
  are deterministic; no scroll command is issued before layout measurements exist.
- **ERR-P36-PAUSE-1:** a rejected toggle mutation produces the existing scrubbed row-level error
  and never produces success feedback.
- **ERR-P36-I18N-1:** empty/unknown `expo-localization` output falls back to EN without throwing.

### Test map

| Criteria | RED evidence target |
| --- | --- |
| AC-P36-1 / ERR-P36-I18N-1 | `src/test/i18n.test.ts` |
| AC-P36-2 / EC-P36-SCROLL-1 | `src/test/diary-primitives.render.test.tsx` |
| AC-P36-3/4 / EC-P36-TIME-1 | `src/test/reminders-hub-route.render.test.tsx` plus pure contract/helper coverage if extracted |
| AC-P36-5 | `src/test/today-core.render.test.tsx` |
| AC-P36-6/9 / EC-P36-A11Y-1 | lifecycle anatomy in hub + Diary render suites |
| AC-P36-7 / ERR-P36-PAUSE-1 | `src/test/today-route.render.test.tsx` and `src/test/reminders-hub-route.render.test.tsx` |
| AC-P36-8 | `src/test/reminders-hub-route.render.test.tsx` |

### TDD mode

Heavy/full-isolated is required because the plan touches i18n bootstrap and design fidelity.
The owner explicitly authorized isolated RED/GREEN/REFACTOR subagents for PUP-36 on 2026-07-19;
no lower-assurance exception is in use. Agents run sequentially because they share one worktree.

---

## Finding 1 — App language is hardcoded to English; RU/ES unreachable

- **Evidence:** `31-ru-diary.png` — simulator switched to Russian, app stays English.
- **Severity:** broken (product-level; blocks RU market and makes RU/ES copy untestable).
- **Root cause:** `src/lib/i18n/index.ts:52` initializes i18next with `lng: 'en'` and nothing
  ever calls `changeLanguage`. `toSupportedLocale()` already exists but receives only
  i18next's own language.
- **Fix:**
  1. Resolve the device language at startup and pass it through `toSupportedLocale()`
     (supported: en/ru/es, fallback en).
  2. **Dependency decision: RESOLVED 2026-07-19 — owner approved adding
     `expo-localization`.** Install via `npx expo install expo-localization` (Expo-managed
     version), read `getLocales()[0].languageTag`, pass through `toSupportedLocale()`.
     No other new dependencies are approved by this ruling.
  3. React to nothing at runtime (locale is read once at startup; live language switching is
     out of scope).
- **AC:**
  - Device set to Russian → whole app renders RU strings after cold start; same for ES; any
    other language → EN.
  - Unit test for the resolution function (ru-RU → ru, es-419 → es, de-DE → en, undefined → en).
  - Existing `useAppTranslation().locale` consumers (date formatting) reflect the resolved
    locale.

## Finding 2 — AccessibilityL clips the Diary week strip; selected "today" off-screen

- **Evidence:** `22-axl-diary.png` — at AccessibilityL only Mon–Fri visible, Sat/Sun
  (including the selected current day) clipped right, no scroll affordance.
- **Severity:** off, borderline broken for a11y users. Pre-dates PUP-34 but confirmed live.
- **Root cause:** `src/design/primitives/WeekStrip.tsx` renders the large-type branch in a
  horizontal `ScrollView`, but it starts at offset zero and never brings the selected cell into
  view. Its scroll decision is also coupled to `fontScale >= 2` instead of measured overflow.
- **Fix:** make the strip horizontally scrollable when content overflows (ScrollView with
  `horizontal`, no visible indicator is acceptable) **and** auto-scroll so the selected day
  is visible on mount/selection change. Do not shrink the 44pt targets.
- **AC:**
  - At AccessibilityL the selected day is on-screen at launch; all 7 days reachable by swipe.
  - At default size, layout is pixel-identical to today (no scroll needed, no regression).
  - Anatomy test: renders 7 day cells; selected day has accessible selected state (existing
    assertions stay green).

## Finding 3 — Raw ISO date in Reminders hub one-time subtitle

- **Evidence:** `07-reminders-hub.png` — "Once · 2026-07-11 · 07:30".
- **Severity:** off. Bug.
- **Root cause:** `src/features/reminders/screens/RemindersHubScreen.tsx:574` interpolates
  `rule.date` verbatim into `reminders.row-subtitle-once-template`.
- **Fix:** format via the existing `formatCalendarDate(rule.date, locale)` from
  `src/lib/i18n/format-date.ts` (same formatter the rest of the app uses). Locale comes from
  `useAppTranslation()`.
- **AC:** subtitle shows a human date (e.g. EN "Jul 11" / whatever `formatCalendarDate`
  produces), never the raw `YYYY-MM-DD`; render test asserts the formatted string and the
  absence of the ISO literal.

## Finding 4 — Expired one-time reminder still looks alive in Active

- **Evidence:** `07-reminders-hub.png` — "Sleep · Once · 2026-07-11" (8 days past) sits in
  Active with an enabled toggle; it will never fire again.
- **Severity:** off. State honesty.
- **Fix (minimal, no schema change):** in the hub row model, when `repeat === 'never'`
  (presented to the user as localized “Once”) and the date+time is in the past, append a
  localized "expired" marker to the subtitle (new key
  `reminders.row-expired`, EN "Expired"; RU «Прошло»; ES per translator convention) and render
  the row in the quiet/muted treatment already used for paused rows. Keep it in Active (moving
  lists = bigger IA decision), keep toggle/overflow functional.
  Midnight rule (project memory): compare against a timestamp computed at render from the
  query clock, never a cached `todayDate`.
- **Contract correction from pre-code root-cause audit:** the stored canonical enum is
  `repeat: 'never'`, while “Once” is presentation copy. Expiry must use `'never'` and the same
  timezone-correct `scheduledFor <= now` boundary as the notification scheduler; do not add a new
  `'once'` schema value.
- **AC:** fixture with a past once-reminder renders the expired marker + muted treatment; a
  future once-reminder does not; boundary test at exactly now/today passes on both sides of
  midnight (no date-string caching).

## Finding 5 — Inline "Delete entry" on Diary fact rows has no confirmation

- **Evidence:** `21-fact-row-overflow.png` — fact-row "⋯" expands inline Edit / Delete entry;
  Delete entry is a filled danger button that deletes immediately, while routine deletion
  requires a confirmation step.
- **Severity:** off (irreversible destructive action, one tap, no confirm). The
  modal-vs-inline pattern split itself is an owner decision — this fix only adds the missing
  confirmation, it does not unify the patterns.
- **Fix:** tapping "Delete entry" switches the inline action area to a confirm state (same
  two-step idiom as the lifecycle menu: reassurance text + destructive confirm + Cancel), or
  reuses `RoutineLifecycleMenu`'s confirmation-card pattern in place. New i18n keys for the
  confirm title/labels in en/ru/es. No BottomSheet, no new dependency.
- **AC:** one tap on "Delete entry" never deletes; confirm → row disappears and mutation
  fires once; Cancel → returns to the fact row intact; render test covers both paths;
  destructive control uses danger tokens and ≥44pt target.

## Finding 6 — Delete confirmation loses the routine name

- **Evidence:** `03-delete-confirmation.png` — "Delete this routine?" with no routine title,
  though the menu state above it showed the name.
- **Severity:** polish. Fix by keeping context on the most dangerous step.
- **Fix:** in `src/design/primitives/RoutineLifecycleMenu.tsx`, render the routine title in
  the confirmation state (same secondary-text slot as the menu state; user-supplied text, so
  text face + 2-line clamp, per the prose-in-display-slot rule). Do not change the
  Delete/Cancel button treatment (locked to the artboard).
- **AC:** confirmation state shows the (clamped) routine title; anatomy test asserts it via
  `getByText`; typography assertion confirms text face, not Lora.

## Finding 7 — Pause gives zero feedback

- **Evidence:** `04-diary-after-pause.png` — Pause closes the menu and the slot silently
  vanishes from Diary.
- **Severity:** polish now, support-ticket generator at release. The artboard-11c snackbar
  was deferred out of PUP-34 scope; this fix adds the minimal honest feedback, not the full
  Undo workflow.
- **Fix:** after a successful pause mutation (both surfaces), show the existing `Snackbar`
  primitive (`src/design/primitives/Snackbar.tsx`) with a localized message pointing at
  recovery, e.g. EN "Paused. Find it in Reminders → Off." (keys in en/ru/es). No Undo action
  in this pass (Undo remains follow-up scope; note it in the spec's allowed deviations).
  Resume needs no snackbar (the row visibly returns).
- **AC:** pausing from Diary and from the hub each shows the snackbar once, auto-dismisses,
  and does not block interaction; failed mutation shows the existing row-level error card and
  NO snackbar; tests cover success (snackbar text via `getByText`) and failure (no snackbar).
- **Spec update:** `docs/design/v2/specs/routine-lifecycle-menu.md` — replace "no
  undo/snackbar workflow" deviation with "confirmation snackbar without Undo; Undo remains
  deferred".

## Finding 8 — Row behind the modal re-layouts while the menu is open

- **Evidence:** `12-hub-paused-menu.png` — with the lifecycle menu open, the paused row
  behind the scrim loses its Resume button and the title re-wraps wider.
- **Severity:** polish. Visible through the scrim; layout jumps again on close.
- **Root cause:** `src/features/reminders/screens/RemindersHubScreen.tsx:498` —
  `!reminder.enabled && !lifecycleOpen` hides Resume while that row's menu is open. The
  native modal already isolates focus, so hiding is unnecessary.
- **Fix:** drop the `!lifecycleOpen` condition (Resume stays rendered; it is not reachable
  while the modal is up anyway). Verify no duplicate-a11y-target regression in the modal
  anatomy test.
- **AC:** opening/closing the paused row's menu causes no visible change to the row behind;
  render test asserts Resume is present while the menu is open.

## Finding 9 — Legacy row hides Edit with no explanation

- **Evidence:** `08-hub-legacy-menu.png` — legacy (non-canonical) reminder's menu shows only
  Pause/Delete; users can't know why Edit is missing.
- **Severity:** polish. Decision accepted: add a hint rather than restore a dead-end Edit.
- **Fix:** in `RoutineLifecycleMenu`, when `onEdit` is omitted, render a one-line muted
  caption in the slot where Edit would be (new key `reminders.lifecycle.legacy-no-edit`,
  EN "Editing isn't available for this older reminder."; RU «Изменение недоступно для этого
  старого напоминания.»; ES per convention). Caption is informative text, not a control.
- **AC:** legacy fixture menu shows the caption via `getByText` and still shows
  Pause/Delete; canonical fixture shows Edit and no caption; both in the existing hub render
  suite.

---

## Implementation phases

Phase order minimizes risk: pure copy/format fixes first, then behavior, then the i18n
bootstrap (touches app startup), then a11y layout.

- [x] **Phase A — copy & format (Findings 3, 4, 6, 9):** date formatting, expired marker,
      confirmation title, legacy caption. All string keys land in en/ru/es in the same
      commit as their usage.
- [x] **Phase B — interaction (Findings 5, 7, 8):** fact-row delete confirmation, pause
      snackbar, Resume flicker. Spec doc updated in the same commit (7, 8).
- [x] **Phase C — i18n bootstrap (Finding 1):** `expo-localization` approved by owner
      2026-07-19. Implement + unit tests + manual sim verification in RU.
- [x] **Phase D — week strip a11y (Finding 2):** WeekStrip scroll behavior + tests. The
      AccessibilityL simulator screenshot remains in the explicit Phase E native gate below.
- [x] **Phase E — verification:** full `npm run check`; rebuild `main.jsbundle`, install on
      the approved SE simulator (`Grith iPhone SE 3 iOS 26.3`,
      `5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`), and re-drive the audit script: pause/resume/
      delete cycle, RU cold start, AccessibilityL diary + hub. Evidence screenshots (synthetic
      data only) into `output/ux-audit/`, own-eyes check against this plan's ACs — an
      agent-recorded PASS without opened screenshots does not count (project memory).

## Verification checklist (gate for Done)

- [x] `npm run check` green, 0 lint errors, no skipped/weakened tests.
- [x] Every new string exists in all three STRINGS files; RU uses «напоминание» terminology.
- [x] No raw `Pressable`/colors/spacing introduced (design-primitives grep).
- [x] Spec `docs/design/v2/specs/routine-lifecycle-menu.md` updated for Findings 6–9.
- [x] Simulator evidence captured and visually reviewed for Phases C–E.

## Out of scope (explicitly)

- Undo action on the pause snackbar (follow-up; artboard 11c).
- Unifying the fact-row inline actions with the modal lifecycle menu (owner decision needed;
  raise as a separate design question).
- Moving expired one-time reminders out of Active (IA decision).
- Live language switching without restart.
- Effective-dated pause history (PUP-35).

## Changelog

- 2026-07-19: plan created from the live UX audit findings (9 items, evidence in
  `output/ux-audit/pup34-audit-2026-07-19/`).
- 2026-07-19: owner approved the `expo-localization` dependency for Finding 1; Phase C
  unblocked.
- 2026-07-19: Codex completed the pre-code own-eyes evidence review, Stage 0 Design Lock,
  root-cause lock, and atomic TDD Spec Lock. Corrected the one-off implementation predicate from
  presentation-language `once` to canonical contract value `repeat: 'never'`; production code
  remained untouched through the authorization gate.
- 2026-07-19: baseline `npm run check` reached 104/104 Jest suites (1234/1234 tests), Node checks,
  lint with 0 errors (21 pre-existing warnings), and typecheck green; scaffold then correctly
  rejected this newly active plan because it was missing from `docs/plans/README.md`. The index is
  updated in the same preparation change; behavior RED has not started.
- 2026-07-19: owner authorized sequential isolated RED/GREEN/REFACTOR subagents for PUP-36.
  Corrected the WeekStrip root-cause record after reconciling source with the audit screenshot:
  the large-type branch already scrolls, but lacks selected-item auto-scroll and derives its
  scroll decision from a font-scale threshold rather than measured overflow.
- 2026-07-19: Phase A completed isolated RED/GREEN/REFACTOR and independent task review. Focused
  hub suite passes 26/26 without warnings; i18n parity/typed usage/string budgets and diff check
  pass. The implementation formats EN/RU/ES one-off dates, projects timezone-correct expiry through
  `expandOccurrencesForDay` at `scheduledFor <= now`, surfaces invalid persisted IANA data as a
  localized quiet/editable unavailable schedule, retains confirmation title context, and explains
  missing legacy Edit. Review verdicts: spec PASS, task quality PASS; REFACTOR found no justified
  behavior-neutral rewrite.
- 2026-07-19: Phase B completed isolated RED/GREEN/REFACTOR and independent task re-review.
  Focused Diary/Hub suites pass 111/111; i18n parity, shell-key coverage, locale-string checks,
  typecheck, focused lint, and diff check pass. Synced fact inline deletion now confirms without
  changing direct swipe/a11y deletion; successful Pause shows actionless localized feedback on
  both surfaces; Resume stays rendered beneath the focus-isolating native modal. Review-driven
  RED/GREEN moved the confirmation alert announcement to its title and kept the Card non-grouping
  so VoiceOver reaches Confirm/Cancel independently. Review verdicts: spec PASS, code quality PASS;
  REFACTOR found no justified behavior-neutral rewrite.
- 2026-07-19: Phase C completed isolated RED/GREEN/REFACTOR and independent task review.
  Installed the owner-approved Expo-managed `expo-localization ~55.0.17`, registered its official
  dynamic-config plugin, and initialized i18next once from a safe locale-array resolver. Full i18n
  suite passes 22/22; typecheck, focused lint, parity/budgets, public Expo config, and diff check
  pass. `expo install --check` still reports nine pre-existing Expo patch drifts but does not list
  `expo-localization`; broad upgrades remain out of scope. Review verdicts: spec PASS, code quality
  PASS; REFACTOR found no justified behavior-neutral rewrite.
- 2026-07-19: Phase D completed isolated RED/GREEN/REFACTOR and independent task review. WeekStrip
  now enables horizontal movement from measured overflow only, keeps exact-fit/default anatomy
  non-scrollable, and brings the complete selected cell into view after current measurements with
  bounds-clamped, deduplicated commands. Independent GREEN review found and the correction loop
  locked a stale-layout-generation edge case: ordered day keys and default/large-text geometry now
  invalidate inner measurements before scrolling. Focused suites pass 34/34 and 57/57; typecheck,
  scoped lint, and diff checks pass. REFACTOR found no justified behavior-neutral rewrite. Native
  default/AccessibilityL comparison remains the Phase E gate.
- 2026-07-19: Phase E completed on the approved iPhone SE. The first own-eyes pass caught one
  native-only Finding-5 defect: inline fact-delete confirmation expanded behind the floating nav,
  and its apparent Cancel target opened Pet. An isolated correction RED locked target-aware
  clearance (1 expected failure / 56 passes), GREEN forwarded the existing Screen ScrollView and
  revealed the non-collapsible confirmation target above `bottomInsetFab` (57/57 plus 51/51
  adjacent), and REFACTOR was no-change. A rebuilt Release bundle proved the same direct Cancel
  tap now closes the confirmation and stays in Diary.
- 2026-07-19: Final own-eyes evidence at default, AccessibilityL, and RU cold start is PASS in
  `output/ux-audit/pup36-audit-2026-07-19/`; synthetic paused routines and the font scale were
  restored. The fresh final `npm run check` exited 0 with lint 0 errors / 21 existing warnings,
  typecheck green, all Jest and Node tests green (Node 121/121), and navigation, i18n, scaffold,
  token, privacy, and text-hygiene gates green. Native details and the opened-screenshot matrix are
  recorded in `.superpowers/sdd/phase-e-native-verification-report.md`.
- 2026-07-19: final read-only review found one Important error-state edge case, so the plan was
  reopened before handoff: a stale failed Delete on reminder A can mask a newer direct
  Pause/Resume failure on reminder B because Hub projects the two mutation errors into one id with
  delete precedence. An isolated correction loop and a fresh final gate now remain.
- 2026-07-19: the chained-error correction completed isolated RED/GREEN/REFACTOR. RED reproduced
  the masked newer Resume failure with 1 expected failure / 28 passes. GREEN conditionally resets
  only a stale errored mutation of the other lifecycle type before starting the latest operation;
  it deliberately preserves an in-flight pending observer. The frozen Hub suite passes 29/29,
  typecheck/scoped lint/diff checks pass, and REFACTOR was no-change.
- 2026-07-19: final closure PASS. A fresh post-correction `npm run check` exited 0: lint 0 errors /
  21 existing warnings, typecheck PASS, Jest 104/104 suites and 1269/1269 tests, Node 121/121, and
  all navigation/i18n/scaffold/token/privacy/text-hygiene checks green. Independent re-review found
  no remaining Critical/Important/Minor issues and marked the branch ready to merge. A final
  Release build installed and launched on the approved SE simulator in 42.2 seconds; the English
  semantic snapshot exposed all seven Diary days with Sunday selected, and the app was stopped
  after verification. No plan-owned work remains.
- 2026-07-19: post-handoff owner review (Claude) opened every evidence screenshot and found two
  copy/layout defects that the recorded PASS matrix missed, both fixed the same day:
  1. RU/ES paused snackbars pointed at segment labels that do not exist in the Hub (RU «Выкл.» vs
     the real «Выключенные»; ES "Desactivados" vs the real "Apagado"). Corrected both strings and
     added a Node string test asserting every locale's snackbar names the real
     `reminders.screen-title` and `reminders.segments.1` labels.
  2. The RU expired marker truncated to «П…» on the SE default size because the two-line subtitle
     clamp ellipsizes the tail where the marker was appended. The marker now leads the subtitle
     (`Прошло · Один раз · …`) in all locales, so the clamp can only truncate schedule detail,
     never the state. Hub render tests and the lifecycle spec were updated to the marker-first
     order.
  The spec's mutation-error sentence was also aligned with the shipped behavior (opening any
  routine's lifecycle actions clears the retained error; a newer failed attempt replaces it).
- 2026-07-19: post-fix native re-audit on the approved SE (fresh embedded bundle of the branch tip,
  evidence in `output/ux-audit/pup36-postfix-2026-07-19/`, synthetic data only). Both copy fixes
  verified live: EN/RU/ES pause snackbars name the real screen title and Off segment, and the
  expired marker leads the subtitle in all three locales at default and AccessibilityL sizes
  (RU clamp now truncates only the schedule tail). RU/ES cold start, week-strip auto-scroll,
  lifecycle menus, delete confirmation, pause/resume cycle, and Finding 8 re-confirmed. One new
  finding (not fixed here): on the RU Off tab, the wide «Возобновить» button squeezes the row's
  text column into mid-word wraps of the title and paused subtitle at default size.
