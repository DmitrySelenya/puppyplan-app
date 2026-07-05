# PuppyPlan — Diary / Pet / Nav Redesign — Cloud Design Brief

**Date:** 2026-06-27
**Status:** Design freeze candidate (rev. 4 — final Open Design UX/UI review integration in `puppyplan-v2-archive-original`; repo source-of-truth docs aligned on 2026-06-28; ready for implementation planning).
**Owner:** Dmitry
**Supersedes (where conflicting):** the 2026-06-25 brainstorm `2026-06-25-diary-plan-log-redesign.md` and `2026-06-25-diary-cloud-design-prompt.md`.
**Team reality:** 2 people (1 architecture/dev, 1 design). Bias hard toward *reuse what exists* and *defer the expensive*. No over-engineering.

**Current Open Design artifact:** `PuppyPlan V2 Archive Original` / `puppyplan-v2-archive-original`, active entry `index.html`, 31 artboards. The active canvas is the design-freeze candidate; old Today/Health/Timeline surfaces are not canonical where they conflict with this brief.

**2026-06-28 freeze-pass scope:** align docs to `Diary | Pet | More`; preserve Add/Quick Log as an independent action; verify no standalone Health tab or Timeline route in the active design candidate; make native time-picker guidance explicit; ensure paused routines are managed in More and absent from Diary.

**2026-06-28 final review evidence:** two independent Open Design review runs were completed. UX/IA review returned `approve with changes`; UI/design-system review initially returned `reject` because of two P0 handoff blockers. Both P0s were fixed in the Open Design source before this rev: native time-picker boards now compose overlays on the same phone shell instead of nesting a second `Phone`, and small text/secondary defaults are no longer used on sunken surfaces found in the active boards. Final screenshot evidence: `/tmp/puppyplan-freeze-contact-v5.png` (31 slots, 7 sections).

**2026-06-28 verification evidence:** headless Chrome audit of the Open Design entry passed with `artboardCount=31`, `requiredMissing=[]`, `forbiddenVisible=[]`, `badNavs=[]`, `smallTertiary=[]`, and `smallSecondaryOnSunken=[]`. Repo gate `npm run check` passed: lint, typecheck, 62 Jest suites / 444 tests, node checks, token drift, privacy scan, and text hygiene. Known residual output: one existing React `act(...)` console warning during `screen-header.render.test.tsx`; exit code remained 0.

---

## 0. How to read this doc

This is the **single source of truth** for the redesign. The Claude Design agent must produce/edit mockups exactly to this. Each screen section gives: **Purpose → Anatomy → What changes vs current → Colors/Type → States → Copy → Accessibility.** The exact color/type tokens are in §2. A ready-to-paste agent prompt is in §11.

The product voice is **calm, gentle, never shaming.** The user is a tired, anxious new puppy owner. Every decision below serves "a calm helper, not a second job."

---

## 0.5 Scope — this is an in-place update of the existing project (READ FIRST)

**This brief edits the existing `PuppyPlan_V2` Claude Design project IN PLACE. It is NOT a new, parallel set of artboards.** The end state is **ONE coherent, fully up-to-date project**: every screen on the new nav + Clay tokens + new card system + no-shame voice; every obsolete screen removed or absorbed; **no duplicates, no orphan screens, no mixed old/new styling anywhere.** If a screen exists in the project today, it must either be brought fully up to date or explicitly removed — nothing is left half-migrated.

**Global changes that MUST propagate to EVERY screen that has them (not just the new ones):**
- **Bottom nav** → the new **Oura-style split nav** (floating capsule with `[ Дневник ] [ Питомец ] [ Ещё ]` + a separate "+" circle, §3.1) replaces the OLD tab bar on **every** screen that shows one. No screen keeps the old nav, and no screen shows a full-width solid bar.
- **Tokens** → Clay everywhere. **Zero teal on any screen.**
- **Fonts** → Lora + Nunito everywhere.
- **Card system** → the routine-slot / logged-fact model + no streaks / no shame, applied wherever event cards appear.
- **Voice & shape** → calm copy, pill buttons, cream+shadow cards — consistently, on all screens.
- **Copy & language** → all UI text is **English, pulled from the existing `STRINGS.en.json`** (the canvas is already English — do NOT switch language, do NOT mix RU/EN). Reuse existing keys (`common.save/cancel/done/snooze/skip/not-now/open-settings/got-it`, etc.). **Every Russian phrase in THIS brief is an intent placeholder only** — render the equivalent existing English string. If a genuinely new string is needed (e.g. routine setup, permission primer), flag it as a NEW key to add to `STRINGS.ru.json` (source of truth) + its en/es translations — never hardcode improvised copy.

**HOW to make these edits (critical — avoid regeneration):**
- Work in the **existing single canvas/page** that already holds all the screens. Do **not** create a new canvas/page, and do **not** scatter screens across multiple pages.
- Edit the **shared layer first**: change the token file (`tokens.css` / the token block) to Clay **once** so it propagates to every screen automatically; change the **shared components** (TabBar/nav, `Card`, `Button`, chips) **once** so they update everywhere. Screens reference tokens & components — they do not hold their own colors.
- **Do not re-establish color schemes per screen and do not redraw screens from scratch.** If you find yourself setting colors on an individual screen, the shared layer is being bypassed — stop and fix the shared layer instead.
- Only after the shared layer is updated, restructure the **few** screens that genuinely change shape (Today→Дневник, Health→Питомец, Profile→Питомец, Timeline absorbed). Everything else just inherits the new tokens/components.

## 0.6 Screen reconciliation — every existing surface gets a disposition

The project's current surfaces (from `docs/design/v2` atlas + `raw/screens/*.jsx`): onboarding, today, timeline, quicklog, health, profile, more, settings, sharing, sitter, library, guidance, cards, states, foundation/checks. Each maps to exactly one disposition below — apply all of them so nothing is orphaned:

| Existing surface | Disposition | Target |
|---|---|---|
| Foundation / font-color checks (teal) | **UPDATE** | → the Clay foundation board (artboard 1). Replace teal; don't keep both. |
| Onboarding | **KEEP + re-skin** | Clay; fix the final handoff to land on **Дневник** (artboard 15). |
| **Today** (home) | **RESTRUCTURE** | → becomes **Дневник** (artboards 4–7b). "Today" as a screen/name ceases to exist. |
| **Timeline** (standalone modal) | **REMOVE — absorbed** | into Дневник scroll-into-past (artboard 5). No standalone Timeline route anywhere. |
| Quick Log | **KEEP + re-skin** | Clay only, structure unchanged (artboard 8). |
| **Health** (standalone tab) | **REMOVE — folded** | into **Питомец → Здоровье** block (artboard 12). No standalone Health tab. |
| **Profile** | **RESTRUCTURE** | → becomes **Питомец** = profile + current weight + health (artboards 12–13). |
| More (Ещё) | **KEEP + re-skin** | Clay; add "Рутины и напоминания" (artboard 14). |
| Settings | **KEEP + re-skin** | lives under Ещё; Clay. |
| Sharing / Sitter / Trainer | **KEEP + re-skin** | under Ещё/family; Clay; preserve the `sharing-sitter-trainer-v2` spec. Note: `sitter.jsx` uses a checkbox+muted-text completed pattern — on re-skin, keep it visually distinct from the Diary routine checkbox (different context, same user). |
| Library / Guidance | **DEFER — out of active set** | Гид is deferred; the mauve hero carries light tips. Archive these; do not ship as active product screens. |
| Cards (component sheet) | **KEEP as design-system reference** | update to Clay + the new card types; it's a primitives board, not a product screen. |
| States (state-matrix board) | **UPDATE** | reflect the NEW screens' states (cold-start, past-unchecked, all-done, paused, permission-denied, …). |

Genuinely **new** surfaces with no predecessor (all in §9): the 2-slab "+" chooser, the routine setup form, the permission primer, the first-routine success, the paused-routine row, and the alternative nav arrangement.

---

## 1. The decisions, in one place

1. **Streaks / achievements: removed entirely.** No streak chips, no "missed/пропущено" badges, no shame copy. A routine in the Diary is a plain checkbox: done / not-done.
2. **Reminders: required.** Routines send notifications. The OS permission ask appears the **first time a user creates a routine** (contextual primer), never at launch.
3. **Routine setup = "alarm".** Assembled from existing parts: tracker-tile grid (what) + native time wheel (when) + repeat chips + optional quantity/note. ~3 taps.
4. **Health folds into a new "Питомец" (Pet) tab.** No standalone Health tab. Питомец = profile + growth + health.
5. **Navigation = Oura-style split nav:** a floating left capsule with 3 tabs `[ Дневник ] [ Питомец ] [ Ещё ]` + a **separate** circular "+" button to its right. The gap makes the asymmetry intentional (tabs = navigation, "+" = action). See §3.1.
6. **Дневник (Diary) is the home tab.** Day-by-day journal; absorbs the old Timeline (scroll into the past). Replaces the old "Today".
7. **The "+" opens a 2-slab chooser:** Quick Log (top) / В расписание (bottom).
8. **Quick Log is unchanged** — the existing tracker-tile sheet, time = now.
9. **Colors: Clay (warm) is canonical.** Cream surfaces, clay brand, honey accent (rare), sage support, mauve info. Migrate away from the old teal.
10. **Fonts: Lora (display) + Nunito (body).** Unchanged — both palettes already agreed on this.
11. **Deferred (do NOT build now):** a "Гид"/guidance content tab; auto-linking a Quick Log to a nearby routine; recurring-rule edge cases beyond the basic repeat chips.

---

## 2. Foundation — colors, type, shape (Clay, canonical)

All mockups use these tokens. Do **not** use the old teal palette anywhere.

### 2.1 Surfaces
| Token | Hex | Use |
|---|---|---|
| surface-base | `#F6EFE3` | screen background (warm cream) |
| surface-raised | `#FFFCF6` | cards that sit "up" (routine cards, sheets) |
| surface-sunken | `#ECE3D4` | cards that sit "in" (Quick Log fact cards, input wells) |
| scrim | `rgba(38,30,22,0.32)` | behind sheets/overlays |

### 2.2 Text
| Token | Hex | Use |
|---|---|---|
| text-primary | `#2C2824` | titles, body |
| text-secondary | `#6B6256` | **captions, dates, meta, the "missed/quiet" text** (see contrast note) |
| text-tertiary | `#8A7E6C` | **only at ≥18px** — never for small captions |
| text-on-primary | `#FFF7EF` | text on clay buttons |

> **Contrast rule (hard):** `#8A7E6C` on cream is ~3.0:1 and **fails** WCAG 4.5:1. Any small text — dates, "спонтанно" captions, quiet/un-done routine text — must use **secondary `#6B6256`** (≥4.9:1). Tertiary is allowed only for large (≥18px) decorative labels.
>
> **Surface caveat (hard):** secondary `#6B6256` is only AA on **cream/raised** surfaces. On **sunken `#ECE3D4`** it drops to ~4.3:1 and on **sage tint `#E8EEDD`** to ~4.4:1 — both **sub-AA.** On those two surfaces, all text (titles, captions, meta) uses **primary `#2C2824`**. Secondary is for cream/raised only.

### 2.3 Brand / accent / support
| Token | Hex | Use |
|---|---|---|
| brand (Clay) 500 | `#C77F4F` | primary brand, selected day in week strip, active states |
| brand fill 600 | `#B26A3C` | filled buttons, pressed |
| brand tint 50 | `#FBF2EA` | subtle brand wash |
| accent (Honey) | `#E3A53C` (tint `#FBEFD9`) | **rare positive moments only** (e.g. very first log, onboarding finish). NOT for routine completion. |
| support (Sage) | `#84A06A` (tint `#E8EEDD`) | the gentle "done" tint on a completed routine card |
| success | `#5C7A45` | confirmations |
| warning | `#A87A2A` | warnings (always with an icon — close to Honey) |
| danger | `#A24A3C` (muted) | destructive (delete routine) |
| info-mauve | `#6E5862` / tint `#ECE4E6` | the contextual hero/tip banner (always paired with an icon — tint is luminance-close to cream) |

### 2.4 Type (Lora + Nunito)
- Display: **Lora 600** — 34/41
- Title-1: Lora 600 — 28/34
- Title-3: Lora/Nunito 600 — 20/25
- Body: **Nunito 400** — 17/24
- Body-strong: Nunito 700 — 17/24
- Caption: Nunito 400/600 — 13–15 (use **secondary** color)

### 2.5 Shape & spacing
- Radius: sm 10 · md 14 · lg 20 · xl 28 · **pill 999**.
- **Buttons = pill** (radius 999), not rounded-rect.
- **Cards = surface-raised, soft warm shadow `0 4px 14px rgba(70,50,30,0.07)`, NO border/hairline**, radius ~18.
- Spacing on a 4pt grid.
- Touch targets ≥ 44pt (checkbox, repeat chips, "+"). Quick Log / "+" ≥ 56pt.

---

## 3. Navigation & the "+"

### 3.1 Bottom nav — split "floating bubble + separate +" (Oura pattern)
**The nav is TWO separate floating elements, not one bar** (reference: the Oura app's bottom nav — tabs in a left capsule, "+" as a standalone right circle). This is how we resolve the asymmetry: the gap makes the split intentional, so three tabs read as *navigation* and the "+" reads as a distinct *action* — not an off-center tab.

- **LEFT — a floating pill capsule** holding the 3 destination tabs `[ Дневник ] [ Питомец ] [ Ещё ]`, evenly spaced, icon + small label each. Surface = raised cream `#FFFCF6` (or a soft clay-tinted capsule), radius pill (999), soft warm shadow.
- **Active-tab cue is STRUCTURAL, not color alone** (per "never color alone"): the active tab uses a **filled icon (or a clay pill/dot behind the icon)** + clay label; inactive = outline icon + secondary `#6B6256`. Clay tint alone is not enough.
- **RIGHT — a separate circular "+" button**, detached from the capsule with a **gap ≥16–20pt** (so a thumb reaching "+" never hits the "Ещё" tab), roughly the capsule's height, ~56–64pt. Clay-filled `#B26A3C` with a cream `#FFF7EF` "+". This is the primary log/plan action.
- **Float & scroll behavior:** both elements **float above the bottom safe-area over the screen background** — not a full-width solid bar — and stay **pinned/persistent** (do NOT hide-on-scroll: hiding the home tab's "+" would bury the core action). Because the Diary scroll-into-past (§4.2) means content constantly slides under the cream capsule, its soft shadow alone is too faint to separate them — add a **stronger separation** under the floating elements (a heavier shadow or a short scrim/backdrop gradient) so passing sunken `#ECE3D4` cards never visually merge with the nav.
- **VoiceOver:** the capsule is a **`tablist` of exactly 3 tabs** ("Дневник, вкладка, 1 из 3, выбрано"); the "+" is an **independent button OUTSIDE the tablist** ("Добавить, кнопка") — never a 4th tab. Focus order = the 3 tabs, then "+".
- **Dynamic Type:** a fixed-width capsule can't grow edge-to-edge. Above an AX threshold, **drop the labels → icon-only tabs**, moving the label into the accessibilityLabel. State this so the capsule doesn't overflow/truncate at AX3+ with Cyrillic labels.
- The nav is chrome, not data — it renders immediately on launch (never part of a loading skeleton).
- Tapping "+" opens the 2-slab chooser (§3.2); "+" may morph to ✕ while open.
- **This replaces ANY previous "raised central +" idea** — there is no centered "+" between tabs anymore. The decision is final; no alternative/comparison arrangement is produced.

### 3.2 The "+" → 2-slab chooser (overlay)
Tapping "+" dims the screen (scrim) and raises a 2-option chooser **above the tab bar**:
- **Quick Log** (top slab, thumb-closest, most frequent): "Записать сейчас" — opens the existing Quick Log sheet. Time = now.
- **В расписание** (bottom slab): "Запланировать" — opens the routine setup (§6).
- Each slab ≥ 64pt, with icon + title + one-line subtitle. The "+" morphs to an ✕ (or rotates 45°) while open; tap scrim or ✕ to dismiss.
- Motion: scrim fades in; slabs spring up from above the bar (native sheet feel). Honor reduced-motion (no spring → simple fade).

---

## 4. Дневник (Diary) — home tab

### 4.1 Purpose
The home. A calm day-by-day journal of the puppy's life: what's planned today (routine slots) and what actually happened (logged facts), in time order. Scrolling down walks into past days (this **replaces** the old separate Timeline).

### 4.2 Anatomy (top → bottom)
1. **Greeting header** — "Доброе утро, {имя}", date, puppy avatar (small, tappable → Питомец tab).
2. **Week calendar strip** — 7 days; selected day = clay-filled circle; today marked. Tapping a day scrolls the list to that day (does not filter it away).
3. **One contextual hero slot** — a single rotating tip/reminder banner in **info-mauve** (icon + short text). Not a stack of cards. Example: "Щенки в 9 недель спят 18–20 ч. Частый сон — это норма."
4. **Events of the day, ordered by time** — a mix of routine slots and logged facts (see §5 card types).
5. **Day-2+ light recap** (small, optional block near top when returning): "Со вчера: последний сон в 21:30, прогулка в 22:00." One quiet line, no metrics.
6. **Scroll down → past days** — list continues with date dividers ("Вчера", "Вторник, 24 июня"). This is the merged timeline.

### 4.3 What changes vs current
- Old "Today" home (dashboard-ish) + the standalone Timeline modal → merged into this one scroll.
- Remove any streak UI. Remove any "you missed" language.
- Re-skin to Clay foundation.

### 4.4 States (design all of these)
- **Loading:** skeleton of the header + 2–3 card placeholders.
- **Cold start (account just created — zero logs AND zero routines):** the highest-stakes activation screen. Calm illustration + **two gentle paths, both shown:** "Записать, что происходит" (→ Quick Log) and "Настроить первую рутину" (→ В расписание). This is the one place we actively *prompt* routine creation — it's what powers the gentle reminder pull (without streaks, nothing else drives day-2 return). Make artboard 6 this true cold-start, not just a slow day.
- **Empty day (today, nothing yet, but routines/history exist):** calm illustration + "Пока тихо. Запишите первое событие через ＋." No guilt.
- **Empty day (past day with nothing):** "В этот день записей не было."
- **Offline (read):** small inline chip "Нет сети — показаны сохранённые данные."
- **Pending write:** a just-logged card shows a subtle "сохраняется…" until synced (never silently drop).

### 4.5 Accessibility
- Each card is one VoiceOver element with a full label (see §5.4).
- Week strip days are buttons with "понедельник 23 июня, выбрано/не выбрано".

---

## 5. Diary card types — routine slot vs logged fact

Two card archetypes. The difference is **structural first** (a checkbox or not), color second.

### 5.1 Routine slot (a plan)
- **Left rail: a checkbox** (the structural signal). Empty circle = not done; filled clay/sage check = done.
- **Right rail: a "⋯" overflow / long-press** opens the lifecycle menu (§6.4). The card body/checkbox is for marking done; the lifecycle menu has its **own** affordance so the two hit-targets never collide. (Tapping the card body never opens Edit.)
- Background: **surface-raised** (`#FFFCF6`), soft shadow, radius 18.
- Content: event icon + title (e.g. "Кормление") + planned time (e.g. "08:00") + optional quantity ("80 г").
- **Check-off interaction:** checkbox fills (clay→sage animated tick), `haptic('tapConfirm')` fires (NOT celebration — Honey is reserved per §2.3), and the card cross-fades to the sage tint. Honor reduced-motion (no animation → static state swap).
- **States (no streaks, no shame):**
  - **Upcoming / not yet done:** raised card, empty checkbox, time in secondary text.
  - **Done:** filled check + faint **sage tint** (`#E8EEDD`). **All text on a done card uses primary `#2C2824`** (secondary fails AA on sage — see §2.2). Logged time anchored to the planned time. (No "actual-time if late" note — without streaks, done is done.)
  - **Past & still unchecked:** a **quiet but still RAISED card** — keep `#FFFCF6` surface, drop the shadow, lower the title/icon opacity. **It must NOT become a sunken card** (that would collide with the logged-fact card, §5.2). Empty checkbox stays, **no red, no "пропущено" word.** Tapping the "⋯"/the card offers a gentle action sheet: "Отметить" (mark done now / back-dated) · "Пропустить" (dismiss quietly). Skipping just removes it from attention — nothing is "lost" or "broken".

### 5.2 Logged fact (a Quick Log event)
- **Left rail: time + event icon, NO checkbox** (this is how the eye reads "fact" vs "plan").
- Background: **surface-sunken** (`#ECE3D4`) — a "settled into the page" feel. This sunken fill is now the *exclusive* marker of a logged fact; past-unchecked routines stay raised (§5.1) so the two never look alike.
- Content: event icon + title + actual timestamp + optional small "спонтанно" caption. **On this sunken surface all text uses primary `#2C2824`** (secondary is sub-AA on `#ECE3D4` — §2.2).
- Single state (it already happened).

### 5.3 The "two cards for one feeding" rule
Auto-linking is deferred. To avoid the trust problem: **a past routine slot must never look like a failure.** If the user fed the dog and Quick-Logged it but didn't check the routine, the routine just sits as a quiet "past & unchecked" card they can mark or skip in one tap. Because there is no "missed" badge and no streak penalty, two feed cards are harmless, not alarming.

### 5.4 VoiceOver labels (so plan/fact is clear without sight)
- Routine upcoming: "Кормление, запланировано на 08:00, не отмечено. Кнопка-флажок."
- Routine done: "Кормление, выполнено в 09:40, отмечено."
- Routine past-unchecked: "Кормление, было запланировано на 08:00, не отмечено."
- Logged fact: "Кормление, 08:05, спонтанно." (no checkbox role)

---

## 6. Routine setup — "В расписание" (the "alarm")

### 6.1 Purpose
Create a reminder/routine in ~3 taps. Recurring **and** one-off via a Repeat field. Feels like setting an alarm, not filling a form.

### 6.2 Anatomy
1. **Событие** — a grid of tracker tiles (reuse the **Quick Log tile grid**): потти / кормление / сон / прогулка / игра / зумис … Tap to pick.
2. **Время** — native iOS time wheel.
3. **Повтор** — single-select chips: `Никогда` · `Каждый день` · `По будням`. Default = `Каждый день`. `Никогда` = a one-off ("вет завтра"). **"Свои дни" (custom day-of-week) is deferred for beta** — these three cover the real puppy cases. When re-added later, "Свои дни" is the one chip that expands an inline 7-day toggle row (Пн–Вс); do not ship it as a fourth equal chip.
4. **Количество** *(contextual, collapsed by default)* — only shown where meaningful (граммы for feeding; minutes for walk later).
5. **Заметка** *(optional, collapsed)*.
6. Primary pill button: **"Сохранить"**.

### 6.3 First-time permission primer
The **first** time a user saves a routine, before the OS dialog, show a gentle primer:
- Title: "Напоминать вам?"
- Body: "Чтобы рутины работали, разрешите уведомления. Только то, что вы запланировали — без спама."
- Buttons: "Разрешить" (→ OS dialog) · "Не сейчас".
- Design a **denied** follow-up state too: a quiet inline note in the routine and in Ещё → "Уведомления выключены. Включить в настройках."

### 6.4 Edit / delete / pause
A routine is a living object. From a routine card (tap → menu) or from the routine list in Ещё:
- **Изменить** (event/time/repeat/quantity/note) — same form, pre-filled.
- **Пауза** (e.g. while the puppy is at a sitter) — keeps it but stops occurrences/reminders. **A paused routine does NOT appear as a Diary slot** (no occurrences while paused) and is shown as a quiet "на паузе" row in the Ещё routine list with a "Возобновить" action. Pause is indefinite-until-resumed (no end-date — simplest).
- **Удалить** (danger color) — with "записи в дневнике останутся" reassurance.

### 6.5 States
Loading (none, it's a form), saving (button → spinner, disabled), error ("Не удалось сохранить — попробуйте ещё раз", never silent). **Dismissing a partially-filled form** (swipe/back) must confirm or keep a draft — never silently discard typed input.

### 6.6 First-routine success
After the very first routine saves, show a brief confirmation that **signposts where it now lives**: "Готово. Управлять рутинами — в Ещё → Рутины." (Prevents the top support question: "куда делась моя рутина / как поменять время".)

---

## 7. Питомец (Pet) tab — profile + growth + health

### 7.1 Purpose
The warm "home" of the dog AND the practical health record. One coherent card for everything *about the puppy*. Replaces the standalone Health tab.

### 7.2 Anatomy (top → bottom)
1. **Profile header** — big photo, name, age ("11 недель"), breed. Editable.
2. **Рост (Growth)** — current weight number + "добавить вес". **No trend chart for beta** (day-1 user has one data point; a sparkline needs ≥3 + a charting component + text-alt — defer). Single-weight state must read fine.
3. **Здоровье (Health)** — folded in here, as a **visible, scannable block (not collapsed behind a chevron)**:
   - **Прививки** — next due, schedule, done/upcoming.
   - **Глистогонка / обработки** — next due.
   - **Визиты к вету** — list + "добавить визит".

> **Health content contract (must carry over):** the §7.3 Здоровье fold must preserve the `docs/design/v2/specs/health-v2.md` rules — template vs confirmed status, "обсудите с ветом" disclaimer, calm/no-urgency styling, **no color-only health status** (status always has an icon/label). Do not re-skin health rows and drop this vocabulary.

> **Cut for beta (content-cost trap, same reason as Гид):** Milestones / "Вехи" — defer until guidance work returns.

### 7.3 What changes vs current
- Everything in the old **Health** tab moves here under the "Здоровье" section. The old Health tab is removed.
- Pull profile data already collected in onboarding (name, breed, age, photo, weight) — no new data entry on day 1.

### 7.4 States
Loading (skeleton), empty health (e.g. no vet visit yet: "Пока нет визитов. Добавьте первый."), offline.

### 7.5 Accessibility
Current weight is plain text (no chart in beta → no text-alt needed). Health rows are buttons with clear labels; health status is never color-only (icon + label).

---

## 8. Ещё (More) — settings hub

Unchanged in spirit (settings/secondary). It now also hosts:
- **Рутины и напоминания** — the master list of all routines (the "home" for managing them), with the permission/denied status.
- Existing: Sharing (семья / ситтер / тренер), Quick Trackers config, Privacy, profile/account.
- Note: routine *management* lives here, but per-day routine *actions* happen on the Diary card. Don't duplicate the whole manager into the Diary.

---

## 9. Screen inventory for Claude Design

Produce/edit these artboards (group by section):

**Foundation**
1. Updated token/foundation board (Clay surfaces, text, brand/accent/support, type scale, shape) — replaces any teal foundation.

**Navigation**
2. Bottom nav — Oura-style split: floating capsule `[ Дневник ] [ Питомец ] [ Ещё ]` + separate "+" circle (§3.1). Show each of the 3 tabs in its active state + the resting "+".
3. "+" → 2-slab chooser overlay (open state), with the "+" in its ✕/open state.

**Diary**
4. Diary — populated today (routine slots upcoming/done/**past-unchecked** + logged facts, NO streaks). Show all four card treatments side by side so the structural distinction is provable. Include a **reminders-off** routine-card variant (quiet inline note per §6.3).
5. Diary — scrolled into the past (date dividers, merged timeline).
6. **Diary — true cold start** (account just created: zero logs AND zero routines; both "+" paths prompted — §4.4).
6b. Diary — empty today *with* existing history/routines (calm slow day).
6c. **Diary — "all done today"** calm win-state (every routine checked + a couple facts) — the emotional payoff of the no-shame model.
7. Diary — loading / offline / pending (can be one combined states board).
7b. **Week strip — selected-day ≠ today** (today-marker and selected-marker on different days; show past-week paging).

**Create**
8. Quick Log sheet (existing tile grid — re-skin to Clay only, no structural change).
9. Routine setup "В расписание" (event tiles + time wheel + 3 repeat chips + optional quantity/note).
10. Notification permission primer + denied state.
10b. **First-routine success** confirmation that signposts Ещё → Рутины (§6.6).
11. Routine card menu (Изменить / Пауза / Удалить, via "⋯"/long-press) + back-dated "Отметить / Пропустить" action sheet.
11b. **Paused-routine** row in the Ещё list (+ confirm it is absent from the Diary).

**Pet**
12. Питомец tab — profile + current-weight + health combined (no chart, no milestones).
13. Питомец — empty/loading states (incl. single-weight-point, no-vet-visit).

**More**
14. Ещё — with the "Рутины и напоминания" list entry (incl. permission status + paused rows).

**Onboarding handoff**
15. **First Diary after onboarding** — the existing onboarding ends on the old "Today"; that handoff is now stale. Either confirm onboarding is a separate workstream or produce this screen so users land on the renamed/reshaped Дневник, not a tab that no longer exists.

---

## 10. What we are explicitly NOT doing (guardrails against over-engineering)

- ❌ No streaks, achievements, badges, or "missed" shaming. Ever.
- ❌ No "Гид"/guidance content tab now (content cost too high for the team). The single mauve hero slot carries light tips for now.
- ❌ No auto-linking a Quick Log to a routine slot. Routines close only by their own checkbox.
- ❌ No standalone Health tab.
- ❌ No custom complex recurrence (RRULE-style). Only the **three** repeat chips (Никогда / Каждый день / По будням). "Свои дни" deferred.
- ❌ No weight trend chart / sparkline for beta — current-weight number only.
- ❌ No Milestones / "Вехи" this round.
- ❌ No planned-vs-actual "late" annotation on done routines — done is done.
- ❌ No new color system — Clay only, reuse existing components, native iOS pickers.
- ❌ No new haptic/motion system — reuse the **6 existing haptic tokens** (`src/design/haptics`) and **5 existing motion presets** (`src/design/motion`). The feedback layer (§15) is a *map* onto these, not a new vocabulary.

---

## 11. Ready-to-paste prompt for the Claude Design agent

> You are editing the **PuppyPlan_V2** Claude Design project **IN PLACE**, in the **existing single canvas** that already holds all the screens. Do NOT create a new canvas/page, do NOT make a parallel set, do NOT scatter screens across pages. **Edit the SHARED LAYER first:** change the token file (`tokens.css`/token block) to Clay ONCE so it propagates to every screen, and change the shared components (nav/TabBar, `Card`, `Button`, chips) ONCE so they update everywhere — screens reference tokens & components, they don't hold their own colors. **Do NOT re-establish color schemes per screen and do NOT redraw screens from scratch** — if you're setting colors on one screen, you're bypassing the shared layer; stop and fix the shared layer. Only after that, restructure the FEW screens that change shape per §0.6: Today→Дневник, fold Health→Питомец, Profile→Питомец, absorb Timeline into Дневник scroll, defer/archive Library+Guidance, keep+re-skin everything else (they inherit the new tokens/components automatically). End state = one coherent project, no orphan screens, no mixed old/new, no teal. **All UI copy stays English from the existing `STRINGS.en.json` — do not switch language or mix RU/EN; the Russian phrases in this doc are intent placeholders, map them to existing English strings; flag any genuinely new string as a new key, never hardcode.** Use this doc as the single source of truth. Apply the **Clay** foundation everywhere (cream surfaces `#F6EFE3` base / `#FFFCF6` raised / `#ECE3D4` sunken; text `#2C2824`/`#6B6256`; brand Clay `#C77F4F`/`#B26A3C`; accent Honey `#E3A53C` rare; support Sage `#84A06A`; info-mauve `#6E5862`; Lora 600 display + Nunito body; pill buttons; cards = raised cream + soft shadow, no hairline, radius 18). Remove the old teal palette entirely.
>
> Make these changes across the project:
> 1. **Navigation (Oura-style split):** replace the bottom bar everywhere with TWO floating elements — a left pill capsule holding `[ Дневник ] [ Питомец ] [ Ещё ]` (cream `#FFFCF6`, soft shadow, active tab = **filled icon + clay**, not color alone) and a SEPARATE clay-filled "+" circle (`#B26A3C`, ~56–64pt) to its right with a gap ≥16–20pt. No centered "+", no full-width solid bar. Nav stays pinned on scroll with strong separation from content underneath; capsule = 3-tab `tablist`, "+" = separate button; icon-only fallback at large Dynamic Type. Add the "+" → 2-slab chooser overlay (Quick Log on top, "В расписание" below), with scrim + sheet motion; "+" morphs to ✕ while open.
> 2. **Diary (home):** greeting header + week strip (selected day = clay circle) + one info-mauve tip banner + time-ordered events + scroll-into-past with date dividers (replaces the old Timeline). Two card types: **routine slot** (left checkbox, **own "⋯"/long-press for Edit so it never collides with the checkbox**, raised card; states: upcoming / done=faint sage with **primary text only** / past-unchecked = **raised-but-quiet, NO shadow, NOT sunken**, NO red, NO "пропущено", NO streak chips) and **logged fact** (no checkbox, sunken `#ECE3D4` fill with **primary text only**, time + icon, optional "спонтанно"). Check-off = animated tick + `tapConfirm` haptic + cross-fade to sage (reduced-motion safe). Add the **true cold-start** screen (zero logs + zero routines → prompt BOTH "+" paths), empty-today-with-history, "all done today" win-state, loading / offline / pending, and a week-strip state where selected-day ≠ today.
> 3. **Routine setup "В расписание":** tracker-tile grid (reuse Quick Log tiles) + native time wheel + **3 single-select repeat chips (Никогда / Каждый день / По будням, default Каждый день; NO "Свои дни")** + collapsed optional quantity & note + pill "Сохранить". Partial-form dismiss must not silently discard. Add the first-time **notification permission primer** ("Напоминать вам?") + **denied** state + a **first-routine success** confirmation that points to Ещё → Рутины. Add the routine card menu (Изменить / Пауза / Удалить) and a back-dated "Отметить / Пропустить" action sheet. A **paused** routine shows in Ещё (not in the Diary).
> 4. **Pet tab "Питомец":** combine profile (photo/name/age/breed) + **current weight + "добавить вес" (NO trend chart, NO milestones for beta)** + **the entire Health content folded in** (прививки, глистогонка, визиты к вету) as a visible block. **Preserve the health-v2 status/disclaimer vocabulary** (template vs confirmed, "обсудите с ветом", no color-only status). Remove the standalone Health tab. Add empty/loading states (incl. single-weight-point).
> 5. **More "Ещё":** add a "Рутины и напоминания" list entry (master routine management + permission status + paused rows).
> 6. **Quick Log sheet:** keep structure, re-skin to Clay only.
>
> Hard rules: never use `#8A7E6C` for small text — use `#6B6256`. Secondary `#6B6256` is AA on **cream/raised only**; on **sunken `#ECE3D4`** and **sage `#E8EEDD`** use **primary `#2C2824`** (secondary is sub-AA there). All touch targets ≥44pt (checkbox, chips), "+" ≥56pt. Pair info-mauve and warning with an icon. Voice = calm, gentle, no shame, no exclamation pile-ups. Produce one artboard per screen in §9 of the brief.
>
> **Feedback layer (§15):** annotate every interactive element with its haptic + motion using ONLY the 6 existing haptic tokens (`tapConfirm/saveSuccess/celebration/warning/selection/error`) and 5 existing presets (`tap/sheet/snackbar/fade/celebration`) — do not invent new ones, do not call vibration directly. Check-off = `tapConfirm` + `fade` to sage (NOT celebration). `celebration`/Honey only at first-log / onboarding-finish / first-routine. Show motion where the canvas allows; every preset has a Reduced-Motion fallback.
>
> **Self-scoring:** after each artboard, run it against the §14 acceptance checklist and report which invariants pass / fail / N/A. The checklist is the *floor* (contrast, legibility, no-shame, required states, feedback annotation) — it is NOT a layout recipe. You own composition, illustration, icon style, motion personality, microcopy warmth, and all visual craft. If you intentionally deviate from a checklist item because a better design calls for it, keep the deviation and note it in one line with the reason — a justified deviation is fine; a silent miss is not.

---

## 12. Open items to confirm before/after mockups
- Exact tile set & labels for the routine event picker (reuse the canonical tracker taxonomy).
- Where the day-2 recap line pulls from (last sleep/last potty) — confirm during implementation.
- **Onboarding handoff — RESOLVED:** in scope via artboard 15. The existing onboarding ends on the old "Today" tab (`onboarding.jsx`, `TabBar active="today"`); artboard 15 re-points that final handoff to land on Дневник with the new split nav. (No longer an open question.)
- After Cloud Design mockups are approved → write the implementation plan + `docs/design/v2/specs` locks + the `design-tokens.json` Clay migration task.

---

## 13. Native-build risks to carry forward (out of scope for mockups, MUST NOT be lost)

These interactions can be *drawn* freely in Claude Design, but the native (Expo) build has real constraints. Capturing them here so mockup approval is not mistaken for "buildable as-drawn":

1. **No real BottomSheet primitive exists.** `docs/architecture/06-design-system-and-ui-contracts.md` states `SheetSurface` is static-only; full BottomSheet (focus-trap, scrim-dismiss, swipe) is deferred. **6–7 surfaces depend on it:** the 2-slab chooser (§3.2), Quick Log sheet, routine form, permission primer, back-dated action sheet, the first-routine success (§6.6) and routine card menu (§6.4) if rendered as sheets. This is the single biggest native dependency — needs a build decision (build the primitive vs use native sheets).
2. **Bottom-nav styling (minor — not a blocker).** The Oura look (3 tabs in a floating pill capsule on the left + a separate "+" circle on the right) is a **supported pattern**, not a hack: React Navigation / Expo Router accept a custom `tabBar` component — you render the capsule + circle yourself while routing, state, safe-area, and a11y stay native underneath. **The old "no custom TabBar in MVP" guideline was lifted 2026-06-27** (`06-design-system-and-ui-contracts.md` Veto Rules) — custom split nav is approved. The custom render itself is a few hours; **the real native work is the float behavior** — pin-on-scroll, separating the floating cream capsule from content sliding underneath (§3.1), and safe-area on notch vs non-notch devices. Mockups show the Oura look freely.
3. **Clay token migration** — `design-tokens.json` → regenerate `tokens.ts`; it's a shape/elevation change (pill buttons, cream+shadow cards, no hairline, new radii), not just a color swap. Re-baseline the design-fidelity atlas after.

---

## 14. Acceptance checklist (self-scored by the design agent)

> **How to use this — read first.** These are **invariants (must-be-true outcomes), not layout instructions.** They police *correctness and craft floor* (contrast, legibility, no-shame, required states), never *how* you compose a screen. After each artboard, self-report: which items **pass**, which **fail**, and — if you **intentionally deviate** from one — say so with a one-line rationale. A conscious, justified deviation is acceptable and expected; a silent miss is not. Do not pad screens to "tick boxes"; if an item doesn't apply to a screen, mark **N/A**.
>
> **Where you have full creative latitude (not graded):** overall composition, spacing rhythm, illustration & icon style, how the "quiet" past-unchecked card or the "all-done" win-state actually *looks and feels*, motion personality (within reduced-motion safety), empty-state art, the exact warmth of the microcopy, and any delight that fits the calm tone. The checklist sets the floor; the ceiling is yours.

### 14.1 Global (every artboard)
- [ ] **Consistency (§0.5):** exactly ONE nav system across all screens — the new bottom nav; no screen still shows the old tab bar.
- [ ] **No orphans (§0.6):** zero standalone Health tab, zero standalone Timeline route, zero "Today" screen anywhere; every disposition in §0.6 applied.
- [ ] No screen left in the old / pre-redesign style — no mixed old-and-new anywhere in the project.
- [ ] Clay tokens only — zero teal anywhere.
- [ ] No small text in tertiary `#8A7E6C`; secondary `#6B6256` only on cream/raised; **primary `#2C2824` on sunken `#ECE3D4` and sage `#E8EEDD`.**
- [ ] Touch targets ≥44pt (checkbox, chips); "+" and Quick Log ≥56pt.
- [ ] No streak/achievement UI, no "пропущено"/"missed", no shame copy, no exclamation pile-ups.
- [ ] Info-mauve and warning are always paired with an icon (never color alone).
- [ ] Lora display + Nunito body; pill buttons; cards = raised cream + soft shadow, no hairline.

### 14.2 Navigation (artboards 2, 3)
- [ ] Oura-style split nav: a floating capsule (3 tabs) + a SEPARATE "+" circle with a gap ≥16–20pt. No centered "+", no full-width solid bar.
- [ ] Active tab uses a structural cue (filled icon / clay pill), not clay color alone.
- [ ] VoiceOver: capsule = 3-tab `tablist`; "+" = independent button outside it (not a 4th tab).
- [ ] Dynamic Type fallback specified (icon-only above AX threshold; no overflow/truncation).
- [ ] Nav stays pinned on scroll, with strong separation from content sliding underneath.
- [ ] The same split nav appears identically on every screen that has a nav (Дневник, Питомец, Ещё).
- [ ] "+" → 2-slab chooser: Quick Log on top (thumb-closest), В расписание below, each ≥64pt, scrim behind.
- [ ] "+" shows a clear close affordance (✕) while the chooser is open.

### 14.3 Diary (4, 5, 6, 6b, 6c, 7, 7b)
- [ ] **Grayscale test:** the four card treatments (routine-upcoming / routine-done / routine-past-unchecked / logged-fact) are still distinguishable with color removed — structure carries the difference.
- [ ] Past-unchecked routine is **raised, no shadow** — NOT sunken. Logged-fact is the **only** sunken card.
- [ ] Routine card exposes a checkbox AND a separate edit affordance ("⋯"/long-press) that do not overlap.
- [ ] Week strip distinguishes today-marker vs selected-marker; artboard 7b shows them on different days.
- [ ] Cold-start (artboard 6) prompts **both** "+" paths.
- [ ] States present: cold-start, empty-with-history, all-done win-state, loading, offline, pending.

### 14.4 Create (8, 9, 10, 10b, 11, 11b)
- [ ] Quick Log: structure unchanged, Clay re-skin only.
- [ ] Routine form: tile grid + native time wheel + **exactly 3** repeat chips (no "Свои дни") + collapsed optional quantity/note.
- [ ] Permission primer reads as first-routine; denied state present.
- [ ] First-routine success signposts Ещё → Рутины.
- [ ] Edit/Пауза/Удалить via "⋯"/long-press; back-dated "Отметить / Пропустить" action sheet present.
- [ ] Paused routine appears in Ещё, absent from the Diary.

### 14.5 Pet (12, 13)
- [ ] Profile + current-weight ("добавить вес") + Health as a visible (not collapsed) block.
- [ ] No trend chart, no Milestones.
- [ ] Health status never color-only (icon + label); "обсудите с ветом" disclaimer present.
- [ ] Empty states: single-weight-point, no-vet-visit.

### 14.6 More & Onboarding (14, 15)
- [ ] Ещё has "Рутины и напоминания" with permission status + paused rows.
- [ ] Onboarding lands on Дневник (not the old "Today"), or artboard 15 is explicitly marked a separate workstream.

### 14.7 Feedback (every interactive element)
- [ ] Each interactive element is annotated with its haptic + motion per §15, using only the 6 existing haptic tokens / 5 existing presets — no invented ones.
- [ ] `celebration` / Honey is used ONLY at the rare moments listed in §15 (not on ordinary check-off).
- [ ] Every motion has a Reduced-Motion fallback (celebration → static; translate/scale → opacity).

---

## 15. Feedback layer — haptics + motion (the "feels nice" layer)

> **This is a MAP, not a new system.** Haptics and motion already exist in the repo as typed tokens — reuse them, never invent new ones, never call vibration directly. The Claude Design mockups can **show** motion (animations render) and must **annotate** each interactive element with its haptic + motion (haptics are native-only and become the build spec). Source of truth: `src/design/haptics` and `src/design/motion`; contract in `docs/architecture/06-design-system-and-ui-contracts.md` §Motion/§Haptics.
>
> **Existing haptic tokens (the only 6):** `tapConfirm` · `saveSuccess` · `celebration` · `warning` · `selection` · `error`.
> **Existing motion presets (the only 5):** `tap` · `sheet` · `snackbar` · `fade` · `celebration`. All respect Reduced Motion (translate/scale → opacity; `celebration` → static).

### 15.1 The map — what fires where
| Interaction | Haptic | Motion | Notes |
|---|---|---|---|
| Press any button / tab / chip | `selection` | `tap` (pressed scale, RM-safe) | the baseline "I registered your touch" |
| **Check off a routine (done)** | `tapConfirm` | checkbox fill + `fade` cross-fade card → sage | the core reward — warm but NOT celebration |
| Uncheck a routine | `selection` | reverse `fade` | quiet, reversible |
| **Quick Log a fact (saved)** | `saveSuccess` | card inserts via `fade`/`sheet` close | the most frequent satisfying moment |
| Save a routine | `saveSuccess` | `sheet` dismiss | confirms the plan landed |
| Open "+" 2-slab chooser | `selection` | `sheet` (slabs rise, scrim `fade`) | "+" morphs to close |
| Pick a slab | `selection` | `sheet` close → target sheet opens | |
| Open / dismiss any sheet | — / `selection` on dismiss | `sheet` | swipe- and scrim-dismiss |
| Week-strip day select | `selection` | `fade`/scroll to day | |
| Back-dated "Отметить" | `tapConfirm` | `fade` to done | |
| Back-dated "Пропустить" | `selection` | `fade` out | **neutral** — no negative haptic (no shame) |
| Delete a routine (confirm) | `warning` | `snackbar` (undo) | destructive; offer undo |
| Save / sync error, permission denied | `error` | inline alert (no dramatic motion) | calm, not alarming |
| Snackbar / undo appears | — | `snackbar` | |

### 15.2 Where `celebration` (haptic + Honey accent + `celebration` motion) is allowed — and ONLY here
Because streaks/achievements are gone, celebration must stay **rare and meaningful** (or Honey becomes noise — see §2.3):
- First-ever log (the activation moment).
- Onboarding finished / plan revealed.
- First routine created (paired with the §6.6 success screen).

Everywhere else — including every normal check-off — uses the warm-but-ordinary `tapConfirm`/`saveSuccess`, never celebration.

### 15.3 Rules
- Haptics are **best-effort** — never block a UI action if the haptic adapter fails; respect the system haptic setting.
- Reduced Motion is mandatory on every preset (already built into the tokens).
- Don't stack haptics — one per discrete user action, not one per animated frame.
- Mockup annotation format suggestion: a small caption on the interactive element, e.g. `haptic: tapConfirm · motion: fade`.

---

## Changelog

- 2026-07-05: Fixed deep-review navigation regression. Diary cold-start/schedule action now opens
  `/quick-log/schedule`, and the removed standalone `/timeline` route redirects to `/diary` instead
  of rendering a separate modal. Targeted regression:
  `npm run test:unit -- --runTestsByPath src/test/today-route.render.test.tsx src/test/timeline-route.render.test.tsx src/test/health-records-query.test.ts src/test/health-outbox-storage.test.ts`
  passed (33 tests).
