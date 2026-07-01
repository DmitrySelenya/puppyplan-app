# Diary V2 Design Lock (Clay)

Route: `/(tabs)/diary`  ·  Renders: `src/features/today/screens/TodayScreen.tsx` (to be reworked)
Reference (user-approved fresh export — Miro design-freeze, board `uXjVHA5hn48=`):
- Renderable atlas: `docs/design/v2/reference/miro-prototype.full.html` (open in browser)
- Anatomy source: `docs/design/v2/reference/diary-create.screens.jsx`
- Token source: `docs/design/v2/reference/tokens.reference.css` → migrated into `design-tokens.json`

Device sizes: iPhone SE 3 compact simulator, portrait (primary).

## Supersedes
This lock **replaces `docs/design/v2/specs/today-v2.md`**, whose anatomy (large-title "Today" + hero card, `ScreenTodayDay1…`) came from the retired Open-Design export and is the diverged design the redesign is correcting. Treat `today-v2.md` as historical.

## Artboards / states (from `docs/design/v2/reference/README.md`)
| Atlas id | Component | State |
|---|---|---|
| `4-diary-populated` | `ScreenDiaryDay` | **default / populated (primary target)** |
| `5-diary-past` | `ScreenDiaryPast` | scrolled into past days |
| `5b-diary-history` | `ScreenDiaryHistory` | history with filter bar |
| `6-diary-cold-start` | `ScreenDiaryColdStart` | first run, no data |
| `6b-diary-empty-history` | `ScreenDiaryEmpty` | empty with history |
| `6c-diary-all-done` | `ScreenDiaryAllDone` | everything done today |
| `7-diary-states` | `ScreenDiaryStates` | loading / offline / pending / error templates |
| `7b-selected-not-today` | `ScreenWeekSelectedDifferent` | a past day selected in the week strip |
| `15-diary-handoff` | `ScreenFirstDiaryAfterOnboarding` | first screen after onboarding |

## Allowed deviations (explicit — do not re-litigate in review)
- Reference JSX is **web (div/svg) and static mock**; native rebuild uses `src/design` primitives + real data/state plumbing (careContext, quick-log mutations, loading/empty/error/offline/pending/permission). Anatomy, tokens, spacing, and copy hierarchy must match; DOM structure need not.
- `tertiary` text is `#766C5A` (not Clay `#8A7E6C`) for WCAG AA — see `design-tokens.json`.
- Reference shows placeholder data (a sample pet name, times); native uses synthetic/real data. No mock names committed to tests/screenshots.
- Icons resolve to the app's `AppIcon` set; any missing glyph (e.g. `feeding.walk`, `tracker.ball`, `more.h`) is added to `AppIcon` in Stage 1 (dependency below), mapped to the nearest atlas-approved icon.

## Anatomy (top → bottom) — `ScreenDiaryDay`
1. **DiaryHeader** — greeting (`title-1`, Lora, e.g. "Good morning, {name}") + date (`footnote`, text/secondary) on the left; `Avatar` (initial, size `lg`, tone `accent`) on the right; optional **recap** line below (`footnote`, text/secondary, e.g. "Since yesterday: last sleep at 9:30 pm, walk at 10:00 pm."). Container padding `8 / 16 / 14`.
2. **WeekStrip** — 7 columns Mon–Sun. Each: DOW label (`caption`; selected → text/primary, else text/secondary) above a **38pt circle** (Lora 16/700). Selected → `primary/600` fill, `text/on-primary`, soft clay shadow. Today-but-not-selected → 5pt `primary/600` dot under the circle. Column min 44×58; strip padding `0 / 12`, margin-bottom `18`. Whole strip `role=group`, per-day a11y label "`{dow} {n}, today, selected`".
3. Scroll content (horizontal padding `16`, bottom inset `tokens.layout.bottomInsetFab`):
   - **InfoHero** (optional guidance) — `info-tint` bg, `info.circle` @24 in `status/info`, `callout` body in text/primary. Radius `20`, padding `15/16`, margin-bottom `18`.
   - **Section title "Today"** — `title-3`, padding-bottom `12`.
   - **Event list** — vertical, gap `10`, chronological. Two row types:
     - **RoutineCard** (a plan/checkable item). Left **TimeGutter** (46pt, right-aligned; time in Lora 13.5/700 + meridiem 10/700, text/secondary). Card radius `18`, padding `10 7 10 13`, gap `9`, contents: **CheckCircle** (44pt hit, 28pt circle) → **IconChip** (44pt, radius 13, accent bg/fg) → title (`headline`) + optional meta (`footnote`) + optional "Notifications off" row (`ui.bell.slash` @13 + text) → **OverflowButton** (44pt `more.h`). States:
       - `done` — card bg `sage/100`, `elev/1`; CheckCircle filled `sage/500` + `check` in on-primary; IconChip forced `sage` accent.
       - `upcoming` — card bg `surface/raised`, `elev/1`; CheckCircle empty (2pt `primary/400` ring); IconChip uses the row accent.
       - `past` — card bg `surface/raised`, **no shadow**, opacity `0.78`; CheckCircle quiet (`stroke/strong` ring); IconChip quiet (`surface/base` bg, `text/secondary` icon); TimeGutter quiet.
     - **FactCard** (a logged spontaneous fact, not checkable). TimeGutter + card bg `surface/sunken`, radius `18`, padding `11/13`, gap `12`: IconChip (default `honey`) + title (`headline`) + caption (`footnote`, e.g. "Logged · 10 min" / "Spontaneous"). No checkbox, no overflow.
4. **TabBar** — existing `CapsuleTabBar`, active = `diary`. (Already V2-correct; not part of this rebuild.)

## Accent map (`IconChip` / card accents)
| accent | chip bg | chip fg | used for |
|---|---|---|---|
| `clay` | `primary/50` | `primary/600` | default routines (walk, feeding) |
| `sage` | `sage/100` | `sage/700` | done routines |
| `honey` | `accent/100` | `accent/700` | facts / play / spontaneous |
| `mauve` | `info-tint` | `status/info` | sleep / nap / quiet |

## Primitives to build/extend (Stage 1 — with tests, verified in `/_dev/components`)
New `src/design/primitives`: `WeekStrip`, `TimeGutter`, `IconChip`, `CheckCircle`, `RoutineCard`, `FactCard`, `InfoHero`, `DayDivider` (for past/history), `OverflowButton` (or reuse `IconButton`).
Compose from existing: `Avatar` (header), `AppText` (all copy), `AppIcon` (glyphs), `Card`/`Touchable` where they fit.
DiaryHeader stays a Diary feature composition (Avatar + AppText), not a global primitive.

## Tokens
- Content horizontal padding: `tokens.layout.screenPaddingPhone` (16)
- Event list gap: `tokens.space[?]=10` (use `space[2]`+2 or add if needed — reference is 10; nearest token is 8/12, confirm in Stage 1)
- Card radius: `18` (reference) vs `tokens.radius.lg=16` — **confirm/introduce an 18 radius token or accept lg=16 as a named deviation in Stage 1**
- IconChip: 44×44, radius 13 (vs `radius.md=14` — accept 14 or add)
- Circle (week): 38, dot 5
- Bottom inset: `tokens.layout.bottomInsetFab` (120)
- Colours strictly from `src/design/tokens` (Clay). Sage ramp added to `design-tokens.json` (2026-07-01) for done-state.

## States covered (Stage 4 targets)
default/populated (`4`), past (`5`), history (`5b`), cold-start (`6`), empty-with-history (`6b`), all-done (`6c`), shared state templates loading/offline/pending/error (`7`), week-selected-not-today (`7b`), post-onboarding handoff (`15`). Screenshots synthetic only.

## Accessibility
- Greeting exposes header semantics via `AppText`.
- WeekStrip: `role=group` + per-day button labels incl. today/selected.
- RoutineCard: whole card labelled "`{title}, planned for {time}. Not marked.`"; CheckCircle a separate button "Mark done"/"Marked done"; OverflowButton "Routine actions". All 44pt targets.
- FactCard: labelled "`{title}, {time}, {caption}`".
- Status conveyed by shape + text, never colour alone (done = filled check + sage; past = dimmed + quiet, not colour-only).

## Notes / deferred
- Sage ramp: DONE (added to `design-tokens.json`).
- Icon coverage for `AppIcon` (walk/ball/more.h/bell.slash) resolved in Stage 1.
- Radius-18 / gap-10 / chip-13 token reconciliation resolved in Stage 1 (introduce tokens or record named deviations).
- Evidence root (Stage 4): `output/design-fidelity/v2/diary/`.
