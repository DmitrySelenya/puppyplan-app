# Cloud Design Prompt — PuppyPlan Diary + "+" + Plan/Log

Tokens below are the **actual current tokens of the PuppyPlan Claude Design project** ("Puppy app
(Remix)"), extracted from `foundation_library_warm_light_v2.html` + `puppy-tokens-patch.css`
(both 2026-06-25). This is the **Clay** direction — it differs from the code repo's Calm Teal
system (see divergence note at bottom). Use this prompt when generating inside the Claude Design
project so the new screens match it.

Copy everything below the line into Cloud Design.

---

You are designing high-fidelity mobile mockups (single HTML file, iPhone-sized frames, light mode)
for **PuppyPlan**, a calm, warm puppy-raising companion app. Produce 7 screens. Match the design
system below exactly — warm, soft, rounded, calm. No neon, no bright red, no hairline borders on
cards (use soft warm shadows).

## Design tokens (use these exact values)

**Fonts** (import Lora + Nunito from Google Fonts)
- Headings / display / numbers: **Lora**, weight 600 (500 for lighter).
- Body / labels / UI: **Nunito**, 400 and 700.
- Scale: display 34/41, title-1 28/34, title-3 20/25, body 17/24, mono 15/20 (dosage, IDs).

**Surfaces** — screen base `#F6EFE3` (warm cream), cards/rows raised `#FFFCF6`, grouped/sunken
`#ECE3D4`, modal scrim `rgba(38,30,22,0.32)`.

**Text** — primary `#2C2824` (warm charcoal), secondary `#6B6256`, tertiary `#8A7E6C`, link/clay
`#B26A3C`, on-primary `#FFF7EF`.

**Primary — Clay (the brand color):** 50 `#FBF2EA`, 100 `#F4DCC6`, 300 `#E0A271`, 500 `#C77F4F`
(default brand), 600 `#B26A3C` (button fill), 700 `#8C5028`. Primary buttons are **pill-shaped**
(fully rounded), clay fill `#C77F4F`–`#B26A3C`, text `#FFF7EF`, soft shadow.

**Accent — Honey (CELEBRATION ONLY** — first log, milestone, streak win; never a default button,
never urgency): 100 `#FBEFD9`, 300 `#F2D196`, 500 `#E3A53C`, 700 `#B07A1E`.

**Support — Sage** (wellbeing / calm / completed): 100 `#E8EEDD`, 300 `#BCD0A0`, 500 `#84A06A`,
700 `#5E7A3E`. **Status:** success `#5C7A45`, warning `#A87A2A`, danger `#A24A3C` (muted clay-red,
user-marked urgent only — never bright red), info/warm-mauve `#6E5862` with tint `#ECE4E6`.

**Stroke** — hairline on inputs `#E4D9C8`, section divider `#EADFCD`. (Cards use shadow, not stroke.)

**Shape & spacing** — radius sm 10, md 14, lg 20, xl 28, pill 999. Cards radius ~18 with a soft
warm shadow `0 4px 14px rgba(70,50,30,0.07)` and NO border. 4pt spacing grid (4/8/12/16/20/24/32),
screen padding 16–20. Icons: line icons (Tabler/Lucide style), ~20px, never emoji. Generous, airy
whitespace; warm and calm tone.

**Accessibility (enforce everywhere):** status/category is NEVER conveyed by color alone — always
pair color with a shape, icon, or text label.

## Product model (so the screens make sense)
Two ways to put things on the puppy's day:
- **Quick Log** = something that already happened, logged instantly (timestamp = now): unplanned
  feed, sudden walk, play. Fast, no scheduling.
- **Plan ("В расписание")** = scheduled for the future, recurring OR one-off, via a Repeat field
  (Apple-Reminders style). A recurring plan = a "routine".

In the Diary, **routine cards** (plans) carry a **checkbox + streak**; **quick-log cards** (facts)
have **no checkbox** and a tinted (sunken-cream) background. Checking a routine = marking it done.

## Layout-reference note
The Diary is inspired by a habit-tracker layout (greeting header, horizontal week-day selector, one
banner, then a vertical list of time-anchored cards with check circles and streak chips). Use that
LAYOUT — it already fits this Clay palette well (the warm tones match). Recolor any borrowed visuals
to the tokens above.

---

## SCREEN 1 — Diary, populated day (the home tab)
Top to bottom:
1. **Greeting header**: "Доброе утро, Лаки" (Lora 28); date "Четверг, 25 июня" (Nunito 15,
   tertiary); round puppy avatar top-right.
2. **Week strip**: "Пн Вт Ср Чт Пт Сб Вс" with date numbers; the selected day is a filled **clay**
   `#B26A3C` circle with `#FFF7EF` number; others plain.
3. **One hero banner** (info-tint mauve `#ECE4E6` card, radius 18, info icon): title "Поставьте
   напоминание" + one body line + a small text button. Calm, not loud. Always pair mauve with the icon.
4. **Section label**: "Сегодня" (Lora 20).
5. **Event list, ordered by time**, mixing two card types (cards = raised `#FFFCF6`, radius 18, soft
   shadow, no border):
   - **Routine — upcoming**: left = empty circle checkbox (clay `#C77F4F` outline); time "08:00";
     bowl line-icon in a clay-50 `#FBF2EA` chip; title "Корм" + meta "80 г"; right = streak chip
     "3 дня" (sage-100 `#E8EEDD` fill, sage `#5E7A3E` text, small flame line-icon); subtle chevron.
   - **Routine — done**: filled clay `#B26A3C` checkmark; title in primary text; a thin sage left
     accent and faint sage-100 tint; streak "4 дня".
   - **Routine — missed**: on sunken `#ECE3D4`; empty square checkbox; tertiary text; small
     "Пропущено" text label (not color-only).
   - **Quick-log fact**: sunken-cream `#ECE3D4` fill card, **no checkbox**; time "14:32", a colored
     line-icon (tennis ball) for the type, title "Игра", small "Спонтанно" caption. Visibly
     different from the white routine cards.
   Show ~5 cards covering all four variants.
6. Reserve bottom space for the tab bar (Screen 7).

## SCREEN 2 — Diary, scrolled into the past (merged timeline)
Same screen scrolled down: after today's events, a **day divider** "Вчера", more mixed cards, then
another divider "Вторник, 23 июня" with more cards. Shows that scrolling down reveals previous days
(the timeline lives inside the Diary — no separate timeline screen). Same card vocabulary.

## SCREEN 3 — Diary, empty day
Greeting + week strip as usual; selected day has no events. Calm centered empty state: a soft line
illustration/icon, title "Пока ничего не записано", body "Добавьте рутину или отметьте, что
произошло", and a quiet hint pointing at the central "+". No hard error styling.

## SCREEN 4 — "+" action chooser (two slabs)
Central "+" tapped: dimmed scrim `rgba(38,30,22,0.32)` over the Diary, **two large stacked slabs**
(raised `#FFFCF6`, radius 20, soft shadow) rising from above the tab bar:
- **Top slab — Quick Log**: bolt line-icon in a clay-50 chip; title "Quick Log" (Lora); subtitle
  "Записать то, что уже случилось" (Nunito, secondary).
- **Bottom slab — В расписание**: calendar line-icon in a mauve-tint chip; title "В расписание";
  subtitle "Рутина или разовое событие".
Big tap targets (each ≥ 64pt tall), clear separation, a small grabber handle on top. The "+" stays
visible, centered, slightly enlarged.

## SCREEN 5 — Quick Log sheet (existing pattern, keep familiar)
Bottom sheet (raised `#FFFCF6`, radius-top 20) over a dimmed Diary, title "Quick Log" (Lora), small
"Изменить" text action top-right, and a grid of up to five large (≥56pt) tracker tiles: Potty, Корм,
Сон, Прогулка, Игра — each a rounded tile (radius 18) with a line-icon and label; the selected tile
gets a 2px clay `#C77F4F` border + a clay check badge. One tile (Potty) hints a subtype step.
Instant, one-tap feel. No time picker (time = now).

## SCREEN 6 — "В расписание" form (the new planning screen)
A form sheet/screen, title "В расписание" (Lora), Cancel (clay outline pill) / Save (clay fill pill
`#C77F4F`, text `#FFF7EF`). Grouped rows on raised `#FFFCF6` cards (radius 18, soft shadow):
- **Событие** — selectable row: clay-50 icon chip + "Корм" + chevron (picker: Potty, Корм, Сон,
  Прогулка, Игра).
- **Время** — "08:00" with a time-picker affordance.
- **Количество** — "80 г" in mono (show this row only because Корм is selected; it's contextual).
- **Повтор** — "Каждый день" + chevron; under it the option set as pills: Никогда · Каждый день ·
  По будням · Свои дни (selected pill = clay fill). Никогда = one-off ("к ветеринару завтра"); any
  repeat = routine.
- **Заметка** — optional multiline placeholder "Добавить заметку…".
Calm, generous spacing — read like Apple Reminders' "new reminder", not a dense form. Focus ring =
clay `0 0 0 3px rgba(199,127,79,0.22)`.

## SCREEN 7 — Bottom navigation bar (standalone strip + in context)
Light bar (raised `#FFFCF6`, soft top shadow): **Дневник** (book/journal icon), **Health** (heart
icon), a **raised, larger central circular "+"** in clay `#B26A3C` with a `#FFF7EF` plus (floats
above the bar, ~64pt, soft clay shadow), then **More** (grid/ellipsis icon). Active tab (Дневник) in
clay, inactive in tertiary `#8A7E6C`. Labels in Nunito 12.

## Output
- One HTML file, mobile width (~390px frames), light mode, all 7 screens in a labeled gallery.
- Use the exact hex values and Lora/Nunito fonts above. SVG/Tabler line icons, no emoji. Warm, soft,
  rounded, calm. Russian UI copy as written above.

---

### Divergence note — repo vs Claude Design project (resolve before implementation)
The code repository currently uses a **Calm Teal** system, not Clay. If these mockups are approved,
the repo's tokens must be migrated to match (or the project re-aligned to the repo). Repo values for
reference: primary teal `#0891B2`/`#0E7490`, accent Ember Coral `#E07A4F`, surfaces `#FBFAF7`/
`#FFFFFF`/`#F1ECE3`, text `#1C1F1B`, cards radius 12 with hairline `#E2DDD2`, rounded-rect buttons.
Repo token source of truth: `design-tokens.json` → `scripts/design/generate-tokens.mjs` →
`src/design/tokens.ts`. Fonts (Lora+Nunito) and info-mauve (`#6E5862`) already match across both.
