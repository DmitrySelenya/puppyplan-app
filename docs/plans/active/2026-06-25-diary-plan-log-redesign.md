# Diary + Plan/Log Redesign — Design Spec

Date: 2026-06-25
Status: Design locked (brainstorm). Not yet planned for implementation; Cloud Design mockups next.
Owner: Dmitry
Relates to: `docs/design/v2/specs/today-v2.md`, `quicklog-v2.md`, `timeline-v2.md`; ADR-0007 tracker taxonomy; deferred "Reminders" surface.

## 1. Problem

Today the shell has 3 tabs (Today, Health, More) + a corner Quick Log FAB, a separate
Timeline modal, and a Today screen that mixes a home/dashboard hub with a "recent quick log"
list. We want to add **scheduled routines** (a planning concept that does not yet exist in the
data model) and reframe the home tab around a day-by-day journal. The central question was how
to organize event creation, since three intents are in play.

## 2. Core insight — two axes, not three

The three user intents split on the **time axis**, not into three equal categories:

| Intent | Axis | Mental model |
|---|---|---|
| Recurring routine (feed 08:00 daily) | future | "set up the schedule" |
| One-off planned event (vet tomorrow) | future | "set up the schedule" |
| Spontaneous, already happened (unplanned feed/walk) | past / now | "record a fact" |

Recurring vs one-off is the **same flow with one field different** (repeat or not) — the Apple
Reminders model. Spontaneous logging is a **different flow** (speed-first, timestamp = now). The
seam a user always feels reliably is **plan (future) vs log (past)**; "repeats or not" is a field
inside the plan, not a top-level choice.

## 3. Locked decisions

### 3.1 Central "+" → two slabs (not three buttons)
The bottom nav gains a raised, larger central "+" button. Tapping it opens a 2-option chooser
(bottom-sheet style, above the tab bar):

- **Quick Log** (top slab, thumb-closest — most frequent): existing tracker-tile sheet. Time =
  now. Lands instantly in Diary + Timeline. Unchanged from current Quick Log.
- **В расписание / Plan** (bottom slab): one form covering recurring **and** one-off via a
  **Repeat** field. Default = recurring (the primary use case).

Rejected: three explicit buttons (Routine / Planned / Quick Log). Forces a category micro-decision
on every tap, and "recurring vs one-off" is a property of the plan, not a distinct action.

### 3.2 "В расписание" form fields
Apple-Reminders style:

- **Событие** — from the canonical taxonomy (potty / feeding / sleep / walk / play / zoomies …).
- **Время** — time of day.
- **Количество** — contextual; shown only where meaningful (grams for feeding; minutes for walk later).
- **Повтор** — `Никогда` (= one-off) · `Каждый день` · `По будням` · custom days.
- **Заметка** — optional.

`Repeat = Никогда` → one-off ("vet tomorrow"). Any repeat → recurring routine.

### 3.3 Plan → fact reconciliation
A routine is a future expectation. In the Diary it renders as a **planned slot** with a checkbox:

- **Upcoming**: outline/pale card, empty checkbox, planned time, streak chip.
- **Done**: checking the box turns the slot into a completed fact (streak +1); fact time = moment
  of check-off, visually anchored to the planned time. Subtle sage (`success-tint`) accent.
- **Missed**: planned time passed, unchecked → muted card labelled "пропущено", streak does not grow.

The check-off **is** the log for planned items. Spontaneous Quick Log events are separate factual
cards with no checkbox.

**Deferred (implementation logic, not a screen):** auto-linking a Quick Log event to a nearby
routine slot (e.g. logging a feed at 08:05 auto-closing the 08:00 routine). On start we **do not
link** — the routine closes only by its own checkbox; the Quick Log lives as its own card.
Predictable first; smart auto-close can come later.

### 3.4 Diary tab (replaces Today; absorbs Timeline) — variant B (home hub)
The Today tab is renamed **Дневник / Diary** and becomes the home (first) tab. It absorbs the old
Today home content (in a lean form) and the standalone Timeline modal. There is no separate
Timeline route anymore.

Anatomy, top → bottom:

1. **Greeting header** — "Доброе утро, {puppy}", date, puppy avatar.
2. **Week calendar strip** — day selector; selected day = brand color (Clay in Set A). Source of day navigation.
3. **One contextual hero slot** (variant B) — single rotating reminder/tip banner (info-tint mauve),
   not a stack of guidance cards.
4. **Events of the day, ordered by time** — mixed routine slots + Quick Log facts (see card states).
5. **Scroll-down → past days** — list continues into "Вчера / 23 июня…" with day-caption dividers.
   This is the merged timeline. Past days also reachable by picking a day in the calendar strip.

### 3.5 Card differentiation (structure first, color second)
Per the "never color alone" rule, the routine/quick-log difference is carried by **structure**:

| | Routine (plan) | Quick Log (fact) |
|---|---|---|
| Left element | **checkbox** (○ / ✓ / ▢) | time/icon, **no checkbox** |
| Background | raised card (light, soft shadow / Set B hairline) | **tinted/sunken fill** |
| Extras | streak chip, anchored to planned time | "спонтанно" marker, factual timestamp |
| States | upcoming · done (sage) · missed (muted) | single state |

### 3.6 Bottom-nav skeleton
`[ Дневник ] [ Health ] ( ＋ ) [ More ]` — 3 destination tabs + a raised, larger central "+"
action. Diary is the home tab. Health and More unchanged.

## 4. Screen inventory (for Cloud Design + later build)
1. Diary — populated day (mixed routine + quick-log in all states)
2. Diary — scrolled into the past (date dividers, merged timeline)
3. Diary — empty day (calm empty state)
4. "+" → 2-slab chooser (overlay above tab bar)
5. Quick Log sheet (existing tile grid — unchanged)
6. "В расписание" form (event · time · quantity · Repeat · note)
7. Bottom nav with raised central "+"

## 5. Visual language — TWO divergent token sets (see §7)

Two systems are in play; they currently disagree on brand color, accent, surfaces, and shape. The
**Cloud Design mockups target Set A (Clay)**. The **code currently ships Set B (Teal)**. Shared
across both: fonts (Lora + Nunito) and info-mauve `#6E5862` / tint `#ECE4E6`.

### Set A — Claude Design project "Clay" (mockup target)
Source: `~/Downloads/Puppy app (Remix)/uploads/foundation_library_warm_light_v2.html` +
`puppy-tokens-patch.css` (2026-06-25).
- Surfaces: base `#F6EFE3` (warm cream), raised `#FFFCF6`, sunken `#ECE3D4`, scrim `rgba(38,30,22,0.32)`.
- Text: primary `#2C2824`, secondary `#6B6256`, tertiary `#8A7E6C`, on-primary `#FFF7EF`.
- Brand: **Clay** — 500 `#C77F4F`, fill 600 `#B26A3C`, 50 tint `#FBF2EA`.
- Accent: **Honey** `#E3A53C` (tint `#FBEFD9`) — celebration only.
- Support: **Sage** `#84A06A` (tint `#E8EEDD`). Status: success `#5C7A45`, warning `#A87A2A`,
  danger `#A24A3C` (muted), info-mauve `#6E5862` / `#ECE4E6`.
- Type: Lora (display 600) + Nunito (body 400/700). Display 34/41, title-1 28/34, title-3 20/25, body 17/24.
- Radius: sm 10, md 14, lg 20, xl 28, pill 999. **Buttons = pill. Cards = soft warm shadow, no
  hairline, radius ~18.**
- Spacing: 4pt grid.

### Set B — code repo "Calm Teal" (current implementation)
Source: `design-tokens.json` → `src/design/tokens.ts`.
- Surfaces: base `#FBFAF7`, raised `#FFFFFF`, sunken `#F1ECE3`, scrim `rgba(26,26,24,0.32)`.
- Text: primary `#1C1F1B`, secondary `#4A4E48`, tertiary `#72756A`.
- Brand: Calm Teal `#0891B2`, fill `#0E7490`, tint `#ECFEFF`.
- Accent: Ember Coral `#E07A4F` — celebration only. Status: success `#3F7A57`, info-mauve `#6E5862`.
- Stroke: hairline `#E2DDD2`. Radius: sm 8, md 12 (cards), lg 16. **Buttons = rounded-rect. Cards =
  white + hairline.**

**The "Morning, Budi" screenshot is a LAYOUT reference.** Its warm orange happens to align with
Set A (Clay), but treat it as structure; pull exact colors from Set A, not from the screenshot.

## 6. Data-model implications (for the later implementation plan)
- Quick Log events already exist (timestamp = now). Spontaneous intent = done. ✅
- **New**: a routine/schedule template — `{ event_type, time_of_day, quantity?, repeat_rule, active }`
  — drives Diary planned slots, streaks, and (later) reminders. Natural sibling of the deferred
  Reminders surface.
- One-off planned = same model with `repeat_rule = null`.
- Diary query merges, per selected day: expanded routine occurrences (+ done/missed status) and
  actual logged events (quick-log + checked-off routines), grouped by time.
- Start data-shape work in `src/contracts/` per project rules; migrations + generated types + RLS
  tests + ADR follow.

## 7. Open items / follow-ups
- **Token source of truth is UNRESOLVED — repo (Teal) vs Claude Design project (Clay).** The Claude
  Design project ("Puppy app (Remix)", local copy at `~/Downloads/Puppy app (Remix)/`, tokens in
  `uploads/foundation_library_warm_light_v2.html` + `uploads/puppy-tokens-patch.css`, 2026-06-25) has
  **rebranded**: primary Calm Teal → **Clay** (`#C77F4F`/`#B26A3C`), accent Ember Coral → **Honey**
  (`#E3A53C`), added **Sage** support, warmed surfaces (`#F6EFE3`/`#FFFCF6`/`#ECE3D4`) and text
  (`#2C2824`), pill buttons, soft-shadow cards radius 18, radii 10/14/20/28. Fonts (Lora+Nunito) and
  info-mauve (`#6E5862`) already match the repo. The §5 values below are the **repo** (Teal) set; the
  Cloud Design prompt now targets the **project** (Clay) set. Decide which is canonical before any
  implementation — if Clay wins, the repo `design-tokens.json` must be migrated.
- Routine ↔ Quick Log auto-linking (deferred, §3.3).
- Exact card tint for Quick Log vs the hero slot (let Cloud Design propose within the palette).
- Where, if anywhere, richer guidance content lives now that Diary keeps only one hero slot.
- Streak rules (grace periods, missed-day reset) — define during implementation.

## 8. Next step
Cloud Design mockups of the 7 screens, then a `docs/plans/active` implementation plan +
`docs/design/v2/specs` design locks once the visuals are approved.
