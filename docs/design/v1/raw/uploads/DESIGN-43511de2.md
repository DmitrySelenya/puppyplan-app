# PuppyPlan — Design Document v1 (first draft)

> Создан: 2026-05-17
> Обновлён: 2026-05-18
> Версия: **v1 — первая редакция дизайна**. Документ будет меняться: ожидайте правок IA, токенов и копи перед beta-локом.
> Базируется на: [`puppyplan-prd-v2.md`](puppyplan-prd-v2.md) (PRD v2.3, Supabase-first, beta-scope)
> Статус: hand-off спецификация для дизайн-инструментов (Cloud Design / Figma Make / V0) и для агентского implementation в Expo SDK 55.
> Scope v1: **light mode only, phone only** (iPhone 375×812 / 393×873 / 430×932). Dark mode и tablet/landscape — out-of-scope, см. §6.
> Контракт: AI-агенты не могут менять hierarchy, primary actions, naming или screen states без обновления PRD И этого документа.
> Источник истины при расхождениях: **Часть 1 (Foundation)**. §0.1 и §5.3.1 master prompt подгоняются под §1.2/§1.9/§1.4.

---

## 0. Как пользоваться этим документом

Документ собран четырьмя параллельными UX/UI-направлениями и склеен в один источник правды:

| Часть | Что внутри | Когда читать |
|---|---|---|
| 1 | Design System, токены, библиотека компонентов, accessibility specs | Сначала. Без этого нельзя строить экраны. |
| 2 | Daily Core: Onboarding, Today, Quick Log, Timeline | Когда строите главный цикл логирования. |
| 3 | Collaboration: Family Sharing, Trusted Sitter, Trainer Sharing, Shareable Cards | Когда строите invite, scope-preview, revoke flows. |
| 4 | Records & Settings: Health, Reminders, Starter Guidance, More tab, Privacy, Paywall shell | Когда строите спокойную часть приложения. |
| 5 | Design-tool handoff: brief'ы для Cloud Design / Figma Make / V0, prompt-шаблоны, generation order | Перед запуском генерации экранов в дизайн-тулинге. |
| 6 | QA checklist и acceptance screenshots | Перед beta-релизом. |

Документ написан под пять способов потребления:
1. Дизайнер открывает руками экран и проектирует в Figma / Sketch / нативно.
2. Цикл генерации в Figma Make / V0 / Cloud Design по brief'ам из части 5.
3. Engineering-агент строит UI в Expo, ссылаясь на токены и компонентные контракты.
4. Product / QA проходит acceptance screenshots set из части 6.
5. Стейкхолдер читает интро и IA, чтобы понять продукт за 10 минут.

### 0.1 Утверждённый AI-tool contract

Эта секция является коротким контрактом для Figma Make, V0 и Cloud Design. Если генератор противоречит этому блоку, результат отклоняется, даже если отдельный экран выглядит визуально аккуратно.

**Product frame.** PuppyPlan — native mobile app для взрослых владельцев щенка в первые 90 дней. Приложение отвечает на три вопроса: что уже произошло, что сделать дальше, кто может безопасно видеть данные. Это не лендинг, не training library, не veterinary app, не mental-health app, не AI coach, не social feed и не gamified tracker.

**Non-negotiable IA.**
- Top-level navigation: только `Today`, `Health`, `More`.
- `Quick Log` — persistent bottom action / FAB, не вкладка.
- `Timeline` открывается из `Today` и `More`, но не становится отдельной вкладкой.
- `Today` содержит ровно один hero card с одним next-best-action.
- `Quick Log` показывает максимум 5 visible trackers.
- `Health` выглядит как спокойное ведение записей, не как diagnosis / treatment UI.
- `Family Sharing` и `Trainer Sharing` всегда показывают, кто что видит, что может делать, когда доступ истекает и как его отозвать.

**Visual contract.** (значения совпадают с §1.2; при любом расхождении побеждает §1.2)
- Style: `soft native utility`, `warm clinical trust`, `paper-like calm`.
- Background `surface/base`: `#FBFAF7` (Warm Off-white); surface/raised: `#FFFFFF`; surface/sunken: `#F1ECE3`.
- Text: primary `#1C1F1B` (Charcoal), secondary `#4A4E48`, tertiary `#76796F`; border `stroke/default` `#E2DDD2`.
- Primary brand: Calm Teal `primary/500` `#0891B2`; filled-button teal затемнён до contrast-safe `primary/600` `#0E7490`.
- Accent: Ember Coral `accent/500` `#E07A4F` — ТОЛЬКО для celebration (первая запись, milestone, vaccination confirmed). Никаких amber-accent для CTA.
- `status/danger` Clay Red `#9A3B2E` (muted) — только для user-marked urgent. Bright red (`#DC2626` и т.п.) запрещён.
- Native system fonts only; Dynamic Type ready; touch targets 44×44pt minimum; Quick Log buttons 56–64pt high.
- Functional outline icons only. No emoji icons for controls.

**Required states.** Каждый ключевой экран обязан иметь `loading`, `empty`, `error`, `offline-read`, `pending-write`, `permission-denied`, `revoked/expired share`. Offline-read copy: «Показаны последние сохранённые данные». Failed Quick Log показывает retry/delete рядом с affected event. Pending Quick Log показывает pending state с undo/delete до server confirmation.

**Master prompt for design tools.** (полный prompt — §5.3.1; токены — §1.2)

```text
Design native iOS/Android Expo app screens for PuppyPlan (v1 — light mode, phone only).
Style: calm utility + warm companion, native-first, accessible.
Background #FBFAF7 (warm off-white), surface #FFFFFF, sunken #F1ECE3. Text primary #1C1F1B (charcoal), secondary #4A4E48. Stroke #E2DDD2.
Primary brand Calm Teal #0891B2; filled-button teal #0E7490. Coral #E07A4F only for celebration. Muted Clay Red #9A3B2E only for user-marked urgent.
Use 3 tabs only: Today, Health, More. Quick Log is a persistent bottom action/FAB.
Do not create a landing page, mascot-heavy UI, AI gradients, bokeh/orbs, dense dashboard, nested cards, emoji functional icons, extra tabs, AI coach, social feed, streaks, medical diagnosis, or treatment language.
Today has exactly one hero card with one primary CTA (one tertiary/text-link allowed alongside), visible household activity strip, max 5 daily cards, and thumb-zone Quick Log.
All sharing screens must show who sees what, until when, and how to revoke.
All health screens must feel trustworthy, not urgent or diagnostic.
```

---

## 1. TL;DR — дизайн-философия

PuppyPlan — это **спокойный компаньон** для первых 90 дней со щенком. Аудитория — взрослый first-time owner, не выспавшийся, тревожный, ловящий противоречивые советы из соцсетей.

Дизайн обязан делать пять вещей одновременно:

1. **Минимизировать когнитивную нагрузку.** Один hero, один primary CTA, max 5 daily cards. Никаких dashboards с приоритизацией.
2. **Логировать одной рукой.** Quick Log FAB всегда в thumb zone. От тапа до сохранённого события — ≤2 тапа.
3. **Делать sharing прозрачным.** Каждый share/invite экран отвечает на «кто», «что видит», «как долго» за 2 секунды.
4. **Звучать медицински-нейтрально.** Health никогда не пугает по своей инициативе. Urgent помечает только сам пользователь.
5. **Не стыдить.** Никаких streaks первые 14 дней, никаких «вы пропустили», никаких красных failure-стейтов. Формулировки — «рутина формируется», «бывает», «следующий шанс».

Эстетика — **calm utility + warm companion**: тёплый off-white фон, charcoal-текст, calm teal как primary, muted amber только для celebration. Native system font. Без AI-purple-gradients, без bokeh, без mascot-screens, без emoji-as-icons.

---

## 2. Аудитория и use-context

Дизайн строится под три ключевые персоны (полные описания — в PRD §2):

| Персона | Контекст | Дизайн-импликации |
|---|---|---|
| **Владелец A, solo first-time owner** | плохо спит, перегружена, не потерпит долгий setup | onboarding ≤45 сек, anonymous auth, first-log до account wall |
| **Владелец B и Опекун A, shared care** | боятся duplicate feeding/walks | last-action attribution, duplicate warning, household activity strip |
| **Владелец C, owner + trainer** | хочет показать прогресс без раскрытия всего household | trainer_viewer role, scope selector с included/excluded preview |

Use-context критичен для решений:
- Использование часто **одной рукой**, телефон в одной руке, щенок в другой.
- **Низкая освещённость** (ночь, ранее утро) — отсюда warm off-white вместо чисто-белого, charcoal вместо чёрного, отсутствие ярких alert-цветов.
- **Прерывистые сессии** — пользователь может закрыть приложение посреди flow. Pending state должен переживать background-foreground.
- **Нестабильный fokus** — отсюда optimistic UI, undo на 5 секунд, никаких modal alerts по системным ошибкам.

---

## 3. Информационная архитектура

### Tab navigation

```
+--------------------------------------+
|              Status bar              |
+--------------------------------------+
|                                      |
|              Screen body             |
|                                      |
|       [Quick Log FAB, 56pt]          |
+--------------------------------------+
|   Today   |   Health   |   More      |
+--------------------------------------+
```

3 primary tabs, persistent Quick Log FAB.

### Route map (из PRD §5)

**Primary tabs:**
- `/today` — главный hub: hero card, daily cards, household activity strip, starter guidance card.
- `/health` — журнал записей: vaccination / deworming / vet visits, шаблоны и подтверждённые.
- `/more` — всё остальное: timeline, family sharing, trainer sharing, reminders, quick trackers settings, puppy profile, notification preferences, privacy/export/delete, app support, paywall shell (feature-flagged).

**Modal / sheet routes:**
- `/quick-log` — bottom sheet с tracker grid.
- `/quick-log/details` — optional details форма.
- `/timeline` — фильтруемый список events (открывается из Today и More).
- `/reminders/edit` — create/edit reminder.
- `/family/invite` — invite caregiver flow.
- `/sharing/trainer-preview` — permission preview перед отправкой.
- `/sharing/scope-selector` — выбор скоупов для trainer share.
- `/health/record-edit` — create/edit health record.
- `/settings/quick-trackers` — изменить набор из 5 quick trackers.

### Where things live (rules)

- **Timeline** доступен из Today (вход внизу care actions) и из More.
- **Starter Guidance Cards** живут внутри Today, не отдельной library.
- **Family / Trainer Sharing** живут в More + contextual prompts (Today промпт показывается один раз на 3-й день).
- **Reminders** можно создать из Today (после log), Health (для медицинских) и More.
- Не добавлять отдельный `Train` tab, пока контент не оправдает.
- Не прятать sharing/privacy за unrelated settings.

### Screen states (обязательные для каждого экрана)

Каждый экран обязан определить все 7 состояний (детали в части 1, §10 и в части 4, §4.5):

```
loading → empty → error → offline-read → pending-write → permission-denied → revoked/expired-share
```

**Carve-out для single-state экранов.** Экраны, у которых отсутствует асинхронная загрузка и нет user-generated content (Welcome, Confirmation-success, статические Privacy/About страницы), освобождены от требования всех 7 состояний. Минимум для них — `default` + `permission-denied` (если экран зависит от системного permission). Список таких экранов в v1: Welcome (§2.1.1), Plan Reveal (§2.1.5), Privacy/About (§4.4.5).

---

## 4. Acceptance screenshots set

Перед закрытой бетой обязательно зафиксировать (часть 6 содержит чеклист):

- **Today** — first day / day 2 morning / day 7 weekly rhythm / offline-read / pending-write
- **Quick Log** — default trackers / duplicate warning / pending event / failed retry
- **Timeline** — synced item / pending item / failed item
- **Health** — template row / confirmed row / edit form
- **Sharing** — family invite / trainer preview / scope selector / expired share
- **More** — full list / notification preferences
- **Accessibility** — Dynamic Type XXL/XXXL для Today, Quick Log, Health, Sharing Preview

---

## Часть 1. Foundation — Design System & Component Library

### 1. Design Philosophy

Шесть принципов, на которых стоит вся визуальная и интерактивная система PuppyPlan. Каждый принцип — это фильтр, через который проходит любое дизайн-решение в первые 14 дней онбординга и далее.

1. **One Next Action.** В каждом экране визуально доминирует **ровно один primary CTA**. Допускается **одно** дополнительное действие рядом, но только в виде `tertiary` (text-link) или `secondary` слабого веса — никогда не два filled-button равной визуальной массы. Все прочие действия уходят в overflow / contextual menu. Hero никогда не показывает два одинаковых по весу CTA.
2. **Fast Thumb Logging.** Любой Quick Log должен быть выполнен одной рукой за ≤2 тапа из любого экрана. Tracker Tiles и FAB живут в нижней трети экрана, минимальный target 56×56pt.
3. **Sharing Clarity.** Источник данных (template / owner / co-owner / vet) и статус (confirmed / needs review) всегда видимы и читаются за полсекунды — pill + иконка + текст, без полагания на цвет.
4. **Calm Medical Language.** Health-копи — нейтральная, без алармизма. Урgent-состояние помечает пользователь сам; система не пугает красным по умолчанию.
5. **No Shame Metrics.** Никаких streak-счётчиков, «вы пропустили N дней», прогресс-баров с красной зоной. Метрики — описательные, не оценочные.
6. **Native Affordances First.** SF Symbols, системные шрифты, системные haptics, нативные sheets и pickers. Celebration (амбер/коралл) появляется только после того, как утилитарная задача выполнена — не до.

---

### 2. Color Tokens

Все токены проверены на контраст относительно `surface/base` (light) и `surface/base` (dark fallback). Цифра рядом — измеренный contrast ratio.

#### 2.1 Surface scale

> **Dark mode и iPad/tablet — out-of-scope для v1 (light mode + phone only). Колонка `Dark fallback HEX` оставлена как v2 reference, в v1 экраны не рендерятся в тёмной теме.**

| Token | Light HEX | Dark fallback HEX | Назначение |
|---|---|---|---|
| `surface/base` | `#FBFAF7` (Warm Off-white) | `#121311` (Slate Night) | Основной фон экрана |
| `surface/raised` | `#FFFFFF` | `#1B1D1A` | Cards, list rows |
| `surface/sunken` | `#F1ECE3` | `#0C0D0B` | Группированные секции, search bar |
| `surface/overlay` | `#FFFFFF` @ 96% | `#1B1D1A` @ 96% | Sheets, popovers |
| `scrim` | `#1A1A18` @ 32% | `#000000` @ 56% | Modal backdrop |

#### 2.2 Text scale

| Token | HEX | Контраст к `surface/base` |
|---|---|---|
| `text/primary` (Charcoal) | `#1C1F1B` | 14.8:1 |
| `text/secondary` | `#4A4E48` | 8.6:1 |
| `text/tertiary` | `#76796F` | 4.7:1 |
| `text/disabled` | `#A6A89F` | 2.6:1 (decorative only) |
| `text/on-primary` | `#FFFFFF` | 5.1:1 на `primary/600` |
| `text/on-accent` | `#1C1F1B` | 9.2:1 на `accent/300` |
| `text/link` | `#0E7490` | 5.0:1 |

#### 2.3 Primary — Calm Teal

Спокойный сине-зелёный, нейтрально-мужской и нейтрально-женский, не «ai-tech».

| Token | HEX | Использование |
|---|---|---|
| `primary/50` | `#ECFEFF` | Tinted backgrounds, selected rows |
| `primary/100` | `#CFFAFE` | Hover/pressed tint |
| `primary/200` | `#A5F3FC` | Disabled fill |
| `primary/300` | `#67E8F9` | Illustrative |
| `primary/400` | `#22D3EE` | Secondary brand |
| `primary/500` | `#0891B2` (Calm Teal) | Default brand, focus ring |
| `primary/600` | `#0E7490` | Primary button fill, contrast-safe with white text |
| `primary/700` | `#155E75` | Pressed state |
| `primary/800` | `#164E63` | Headings on tinted bg |
| `primary/900` | `#083344` | Dark mode accent text |

#### 2.4 Accent — Ember Coral (celebration only)

Используется ТОЛЬКО для celebration-моментов (первая запись, завершение milestone, vaccination confirmed). Никогда — для CTA по умолчанию.

| Token | HEX | Использование |
|---|---|---|
| `accent/100` | `#FBEBE0` | Celebration card tint |
| `accent/300` | `#F4B89A` (Ember Coral 300) | Confetti, badge fill |
| `accent/500` | `#E07A4F` (Ember Coral) | Celebration icon |
| `accent/700` | `#A14B26` | Текст на `accent/100` — 6.9:1 |

#### 2.5 Status colors (muted)

| Token | HEX | Контраст к `surface/base` |
|---|---|---|
| `status/success` (Sage) | `#3F7A57` | 5.0:1 |
| `status/success-tint` | `#E6EFE8` | — fill |
| `status/warning` (Amber Bark) | `#A06A1F` | 5.2:1 |
| `status/warning-tint` | `#F6ECD8` | — fill |
| `status/danger` (Clay Red) | `#9A3B2E` | 6.0:1 — только user-marked urgent |
| `status/danger-tint` | `#F4DDD8` | — fill |
| `status/info` (Slate Blue) | `#3C5C7A` | 6.1:1 |
| `status/info-tint` | `#E2E8EF` | — fill |

#### 2.6 Stroke / Divider

| Token | HEX |
|---|---|
| `stroke/default` | `#E2DDD2` |
| `stroke/strong` | `#C9C3B5` |
| `divider/hairline` | `#E2DDD2` @ 60% |
| `focus/ring` | `#0E7490` 2pt outline + 2pt offset |

#### 2.7 Health-status pill colors

Каждая пилюля = fill + text + иконка (форма дублирует смысл).

| Pill | Fill | Text | Icon-токен |
|---|---|---|---|
| `pill/template` | `#F1ECE3` | `#4A4E48` | `icon/template` (dashed circle) |
| `pill/needs_vet_review` | `#F6ECD8` | `#7A4F12` (контраст 5.3:1) | `icon/clock.review` |
| `pill/confirmed` | `#E6EFE8` | `#2F5E41` (контраст 6.2:1) | `icon/check.shield` |
| `pill/completed` | `#EAF3F3` | `#175255` (контраст 7.4:1) | `icon/check.circle` |
| `pill/pending` | `#F1ECE3` | `#4A4E48` | `icon/dots` |
| `pill/failed` | `#F4DDD8` | `#7A2A20` (контраст 6.5:1) | `icon/exclaim.triangle` |
| `pill/urgent` | `#F4DDD8` | `#7A2A20` | `icon/flag.solid` — ставит пользователь |

---

### 3. Typography

Native system font: **SF Pro Text/Display** на iOS, **Roboto** на Android. Один масштаб, маппинг к Dynamic Type / Material type scale.

| Стиль | Size pt | Line-height | Weight | Dynamic Type | Использование |
|---|---|---|---|---|---|
| Display | 34 | 41 (1.20) | Semibold | largeTitle | Onboarding hero, celebration |
| Title 1 | 28 | 34 (1.21) | Semibold | title1 | Screen title (Today header) |
| Title 2 | 22 | 28 (1.27) | Semibold | title2 | Section header в sheet |
| Title 3 | 20 | 25 (1.25) | Semibold | title3 | Card title |
| Headline | 17 | 22 (1.29) | Semibold | headline | Row primary text |
| Body | 17 | 24 (1.41) | Regular | body | Основной читаемый текст |
| Body-emph | 17 | 24 | Semibold | body | Inline ударение |
| Callout | 16 | 22 (1.38) | Regular | callout | Описательные подписи |
| Subheadline | 15 | 20 (1.33) | Regular | subheadline | Метаданные |
| Footnote | 13 | 18 (1.38) | Regular | footnote | Timestamps, source labels |
| Caption | 12 | 16 (1.33) | Regular | caption1 | Pill labels, tab labels |
| Code/Mono | 15 | 20 | Regular (SF Mono / Roboto Mono) | — | Dosage, ID strings |

Правила:
- Минимум для читаемого текста — 16pt (Callout). Body = 17pt по умолчанию.
- Line-length 65–75 символов; max content width 600pt на планшетах.
- Tabular numerals (`fontVariant: ['tabular-nums']`) для всех числовых данных (weight, dose, time).
- Letter-spacing: 0 для всех размеров. Иерархию создаём weight, size и line-height, не отрицательным tracking.
- Никогда не используем weight Light / Thin — плохо читается на улице при ярком свете.

---

### 4. Spacing & Layout

База — 4pt grid. Шкала токенов:

| Token | pt |
|---|---|
| `space/0` | 0 |
| `space/1` | 4 |
| `space/2` | 8 |
| `space/3` | 12 |
| `space/4` | 16 |
| `space/5` | 20 |
| `space/6` | 24 |
| `space/8` | 32 |
| `space/10` | 40 |
| `space/14` | 56 |

Правила:
- Screen horizontal padding: 16pt phone, 24pt tablet.
- Section gap (между card-группами): 24pt.
- Internal card padding: 16pt.
- Min vertical gap между tap-targets: 8pt.
- Safe area: учитываем top inset + 8pt, bottom inset + 12pt над таб-баром.
- **Thumb zone:** primary CTA, FAB и Tracker Grid располагаются в нижней половине экрана (≥50% от высоты viewport). Tab bar = 49pt + safe-area bottom inset.
- **Max content width** для read-длинного текста (Vaccination details, Vet note): 560pt; центрируется на iPad.
- Top app bar height: 44pt + safe-area top inset; в large-title режиме collapsed 44pt / expanded 96pt.

---

### 5. Radius / Elevation / Shadow

**Radius scale:**

| Token | pt | Применение |
|---|---|---|
| `radius/sm` | 8 | Buttons, input fields, pills, tracker tile inner |
| `radius/md` | 12 | Cards, list groups, snackbars |
| `radius/lg` | 16 | Bottom sheets, modal sheets |
| `radius/full` | 999 | Avatars, FAB |

**Elevation (4 уровня):**

| Token | Shadow | Использование |
|---|---|---|
| `elev/0` (resting) | none, только `stroke/default` 1px hairline | Cards, rows |
| `elev/1` (raised) | y=2, blur=8, `#1C1F1B` @ 6% | Interactive card hover/press |
| `elev/2` (sheet) | y=−4, blur=16, `#1C1F1B` @ 10% | Bottom sheets от низа экрана |
| `elev/3` (modal) | y=8, blur=24, `#1C1F1B` @ 14% | Full-screen modal над scrim |

Никаких glow, никаких inner-shadow, никаких coloured shadows. Тени всегда нейтрально-серые, не использовать для иерархии, если достаточно hairline-border.

---

### 6. Iconography

Линейные иконки 24×24pt, strokeWidth 1.75pt, rounded caps/joins. На iOS — **SF Symbols** (вариант regular, weight regular). На Android — **Material Symbols Outlined**, optical size 24, weight 400, fill 0. Active state — `fill 1` (только когда выбран в Tab Bar).

Naming convention: `domain.action[.modifier]`, lower-case, точки как разделители.

#### Core MVP icon token list (30):

```
nav.today               nav.health              nav.more
action.quick_log        action.add              action.share
action.edit             action.delete           action.search
potty.outside           potty.inside            potty.poop
feeding.bowl            feeding.water           sleep.moon
zoomies.spark           training.paw            household.home
person.solo             person.cluster          person.vet
person.trainer
med.vaccine             med.deworming           med.pill
med.weight              med.vet_visit
status.template         status.review           status.confirmed
status.completed        status.urgent_flag
```

Дополнительно: `chevron.right`, `chevron.down`, `close.x`, `check`, `info.circle`, `lock.shield` — служебные, не входят в основной список доменов.

#### 1.6.x Extended icon tokens (used in Parts 2–4)

В дополнение к MVP-30 ниже разрешены следующие SF Symbols / Material Symbols Outlined эквиваленты:

```
ui.bell                 ui.bell.slash           ui.wifi.slash
ui.book                 ui.doc.text             ui.stethoscope
ui.phone                ui.lock                 ui.gear
ui.checkmark.seal       ui.checkmark.circle     ui.exclamation.circle
ui.info.card            ui.paw.filled
person.crop.circle.badge.checkmark              (sitter completion)
```

Все эти иконки следуют общему контракту: 24×24pt, stroke 1.75pt rounded, outline-стиль по умолчанию, fill только в Tab Bar active state.

Иконки никогда не используются как декорация без accessibilityRole; декоративные SVG помечаются `accessibilityElementsHidden`.

---

### 7. Motion

Token-набор для анимаций:

| Token | ms | Easing | Применение |
|---|---|---|---|
| `motion/instant` | 80 | linear | State change (press-in) |
| `motion/fast` | 160 | `cubic-bezier(0.2, 0, 0, 1)` decel | Snackbar in, pill change |
| `motion/base` | 240 | `cubic-bezier(0.2, 0, 0, 1)` decel | Sheet open, card expand |
| `motion/slow` | 360 | `cubic-bezier(0.3, 0, 0, 1)` emphasized | Celebration, page transition |

Easing tokens:
- `ease/standard` `cubic-bezier(0.4, 0, 0.2, 1)` — bidirectional
- `ease/decel` `cubic-bezier(0.0, 0, 0.2, 1)` — entering
- `ease/accel` `cubic-bezier(0.4, 0, 1, 1)` — exiting
- `ease/emphasized` `cubic-bezier(0.3, 0, 0, 1)` — celebration

**Reduced-motion fallback** (если `AccessibilityInfo.prefersReducedMotion === true`):
- Все transform/scale/translate → заменяются на `opacity 0→1` за `motion/fast`.
- Celebration anim → статический badge без particle.
- Sheet → кросс-фейд вместо slide-up.
- Параллакс / large-title bounce — отключён.

---

### 8. Haptics

Используем нативные haptics API: `Haptics.impactAsync` / `notificationAsync` (iOS), `HapticFeedbackConstants` (Android).

| Token | iOS | Android | Триггер |
|---|---|---|---|
| `haptic/light` | impactLight | KEYBOARD_TAP | Tap по Tracker Tile, открытие sheet |
| `haptic/medium` | impactMedium | LONG_PRESS | Drag handle захват, segment switch |
| `haptic/success` | notificationSuccess | CONFIRM | Quick Log сохранён, vaccine confirmed |
| `haptic/warning` | notificationWarning | REJECT | Дубликат записи в течение 60s |
| `haptic/error` | notificationError | REJECT | Failed save, permission denied |

Правила:
- Никаких haptics на scroll, hover, обычное открытие screen.
- Haptic + visual confirmation идут синхронно (haptic не раньше, чем UI отреагировал).
- Если `Settings → Reduce haptics` включён системно — уважаем, ничего не вибрируем.

---

### 9. Component Inventory

Для каждого компонента: anatomy → variants → states → accessibility → when-to-use.

#### 9.1 Button

- **Anatomy:** container (radius/sm, padding 12×20), optional leading icon 20pt, label (Headline), optional trailing icon.
- **Variants:** `primary` (fill `primary/600`, text white), `secondary` (fill `primary/50`, text `primary/700`, 1px stroke `primary/200`), `tertiary` (text-only, `primary/700`), `destructive` (fill `status/danger`, text white — только для подтверждения удаления), `icon-only` (44×44pt min).
- **States:** default / pressed (darken 8%) / disabled (opacity 40%, no haptic) / loading (spinner 16pt + label hidden, sets `accessibilityState.busy`).
- **A11y:** min target 44×44pt, `accessibilityRole="button"`, label = visible text, hint описывает результат («Сохранит запись и закроет окно»).
- **When:** primary — ровно один в hero-зоне. Destructive — только в confirmation sheet, не на главных экранах.

#### 9.2 Card

- **Anatomy:** `surface/raised`, radius/md, 16pt padding, optional 1px `stroke/default` hairline.
- **Variants:** `resting` (статический), `interactive` (вся карточка кликабельна, elev/1 на press), `hero` (используется на Today сверху — title + 1 primary action), `muted-template` (фон `surface/sunken`, маркер «Template»).
- **States:** default / pressed / focused (2pt `focus/ring`) / loading (skeleton inside).
- **A11y:** если кликабельна — `accessibilityRole="button"`, единый label из заголовка + основного контента.

#### 9.3 Status Pill

- **Anatomy:** height 24pt, padding 4×8, radius/sm, иконка 14pt + Caption text. Иконка ВСЕГДА присутствует — не полагаемся только на цвет.
- **Variants:** template / needs_vet_review / confirmed / completed / pending / failed / urgent.
- **States:** static (без интерактива). Если ведёт на детали — оборачивается в кнопку с min 44pt hit area (hitSlop).
- **A11y:** label = «Статус: <localized name>». Не использовать как единственный индикатор без текста.

#### 9.4 Bottom Sheet

- **Variants:** `modal-sheet` (полу-экранный с drag handle), `form-sheet` (полный с close-кнопкой и Save), `action-sheet` (короткий список из 2–5 действий, native iOS-style).
- **Anatomy:** radius/lg сверху, drag handle 36×4pt, scrim `scrim`, elev/2.
- **States:** opening / open / dragging / dismissing.
- **A11y:** focus переходит на title при open, escape — свайп вниз или close-кнопка 44×44pt, `accessibilityViewIsModal: true`.

#### 9.5 List Item

- **Variants:** `timeline-event` (time + icon + title + meta), `health-record` (date + name + status pill), `reminder` (icon + title + due-time + toggle), `share-scope` (avatar + name + scope badge + chevron).
- **Anatomy:** min height 56pt, padding 12×16, divider hairline между.
- **States:** default / pressed / selected (`primary/50` fill) / swipe-revealed actions.
- **A11y:** single tap target = весь row, swipe actions имеют отдельный `accessibilityAction`.

#### 9.6 Tracker Tile

- **Anatomy:** В 2-column grid (default) — 168×96pt (onboarding selector). В 3-column grid (Quick Log sheet) — 110×96pt. Иконка 28pt сверху, label Caption ниже. Фон `surface/raised`, radius/md. Минимальный target — 88×88pt; ниже не уменьшать. Aspect-ratio ~1.75:1 (2-col) или ~1.15:1 (3-col).
- **Variants:** default / recently-used (subtle `primary/50` tint) / disabled.
- **States:** default / pressed (scale 0.97 + haptic/light) / loading (skeleton over icon).
- **A11y:** target 88×88pt, label = «Записать <action>», hint = «Сохранит событие сейчас».
- **When:** основная сетка Quick Log внутри FAB-sheet.

#### 9.7 Snackbar

- **Variants:** `default` (info), `undo-action` (с кнопкой «Отменить»), `retry-action` (с кнопкой «Повторить»).
- **Anatomy:** width = screen − 32pt, radius/md, padding 12×16, поверх таб-бара с отступом 12pt, elev/1.
- **States:** entering / visible (4s default, 6s с action) / exiting.
- **A11y:** `accessibilityLiveRegion="polite"`, action кнопка — отдельный focusable элемент.

#### 9.8 Inline Alert

- **Variants:** `info` (`status/info-tint` fill, `info.circle` icon), `warning` (`status/warning-tint`), `urgent` (`status/danger-tint`, но БЕЗ ярко-красного fill — visual weight через иконку и текст, не цвет).
- **Anatomy:** radius/sm, padding 12, иконка 20pt leading, body + optional inline link.
- **A11y:** `accessibilityRole="alert"` только если появляется динамически; статические инфо-блоки — обычный role text.

#### 9.9 Form Field

- **Variants:** `text` (single/multi-line), `date` (native picker sheet), `time`, `toggle` (native switch), `segment` (2–4 опции), `picker` (sheet с list).
- **Anatomy:** label Subheadline сверху, control min height 44pt, helper text Footnote снизу, error text `status/danger`.
- **States:** default / focused (2pt `focus/ring`) / filled / error / disabled.
- **A11y:** label связан с input, error читается VoiceOver сразу после изменения value, `accessibilityHint` описывает формат.

#### 9.10 Avatar

- **Variants:** `single` (32 / 40 / 56pt), `cluster` (до 3 overlap + «+N»), placeholder (initial + tonal bg из `primary/200…700` по hash имени).
- **A11y:** label = имя человека/щенка, не «изображение».

#### 9.11 Tab Bar

- **Anatomy:** 3 tabs (Today / Health / More), height 49pt + bottom inset, иконка 24pt + Caption label. Active = `primary/700` + filled-variant иконки.
- **States:** default / active / pressed (haptic/light).
- **A11y:** `accessibilityRole="tab"`, `accessibilityState.selected`, label «Сегодня», hint «Открыть экран Сегодня».

#### 9.12 FAB (Quick Log)

- **Anatomy:** 56×56pt круг, `primary/600` fill, `action.quick_log` icon 28pt white, elev/2, размещён над tab bar справа (16pt margin) или по центру в зависимости от A/B.
- **States:** default / pressed (scale 0.94 + haptic/light) / sheet-open (rotates to close-X).
- **A11y:** label «Быстрая запись», hint «Откроет список действий для записи».

#### 9.13 Empty State

- **Anatomy:** SVG illustration placeholder 160×160pt (нейтральная, не mascot), Title 3, Body, optional CTA (secondary button). Центрирование вертикально в области.
- **A11y:** illustration `accessibilityElementsHidden`, текст читается как единая группа.

#### 9.14 Skeleton Loader

- **Anatomy:** shape matches финальный контент, fill `surface/sunken`, shimmer `surface/raised` 1200ms loop. При reduced-motion — статический fill без shimmer.
- **A11y:** `accessibilityLabel="Загрузка"`, `accessibilityElementsHidden` для отдельных полос.

#### 9.15 Extended components (from Parts 2–4)

§1.9.15 — Extended Component Map. Эти компоненты используются в Частях 2–4 и не имеют отдельных anatomy-блоков в §1.9.1–14. Каждый — либо variant существующего компонента, либо узко-специфический composite. Anatomy и состояния спецификуются в той части, где компонент впервые появляется. Канонические имена в правой колонке — если в Части 2/3/4 встречается синоним (например `Toast`, `PrimaryCTA`, `NeutralEmptyState`, `DangerInlineButton`), он считается deprecated и при следующем рерайте заменяется на канон. В v1 синонимы оставлены для скорости, но `design-tokens.json` и Storybook должны использовать только канонические имена.

| Component | Canonical name | Anatomy/variant lives in | Notes |
|---|---|---|---|
| HeroCard | HeroCard | §2.2.1 | Variant of Card (hero); one primary + ≤1 tertiary link |
| DailyCard | DailyCard | §2.2.1 | Variant of Card; ≤5 visible on Today |
| RecapCard | RecapCard | §2.2.x | Variant of Card |
| HintCard | HintCard | §2.x | Variant of Card |
| ActivityStrip | ActivityStrip | §2.2.6 | 36pt sticky strip; not a list row |
| StatusRow | StatusRow | §2.2.1 | Variant of List Item (calm health) |
| PrimaryButton | PrimaryButton | §1.9.1 (alias of Button variant=primary) | Used in Parts 2/4 |
| PrimaryCTA | PrimaryButton | §1.9.1 | Part 3 synonym — DEPRECATED, use PrimaryButton |
| GhostButton | Button variant=tertiary | §1.9.1 | text-link, no fill |
| PillButton | PillButton | §4.2.5 | 28pt notification-style action chip; reminder cards only |
| DestructiveConfirm | DestructiveConfirm | §4.4.5 | Confirmation sheet asking to type "УДАЛИТЬ" |
| Toast | Snackbar | §1.9.7 | Toast in Parts 2/4 is the same as Snackbar — DEPRECATED name, use Snackbar |
| Banner | Banner | §4.x | Persistent top-of-screen inline alert; not modal |
| OfflineBanner | Banner variant=offline | §4.x | Specific offline-read indicator |
| PendingDot | PendingDot | §4.x | 8pt dot indicating pending-write |
| RoleChip | RoleChip | §3.x | Part 3 chip showing person's role (owner/co-owner/sitter/trainer/vet) |
| ScopeToggleRow | ScopeToggleRow | §3.3.2 | List row with native toggle + scope name |
| ScopeStripe | ScopeStripe | §3.x | 3pt left vertical bar coloring scope group |
| IncludedExcludedPreview | IncludedExcludedPreview | §3.3.2 | Two-column preview of what's shared / hidden |
| MemberRow | MemberRow | §3.x | Variant of List Item (share-scope) |
| AttributionStrip | AttributionStrip | §3.x | Last-action attribution line |
| InviteStatusBadge | InviteStatusBadge | §3.x | Pending / accepted / declined / expired |
| ExpiryPicker | ExpiryPicker | §3.x | Date picker variant for share expiry |
| SitterDeadlineStrip | SitterDeadlineStrip | §3.2.x | Sitter window countdown |
| ScopedHeaderCard | ScopedHeaderCard | §3.x | Header with scope contract summary |
| SummaryStatsCard | SummaryStatsCard | §3.x | Read-only stats card for trainer view |
| TrainingNoteRow | TrainingNoteRow | §3.x | Variant of List Item |
| CapabilitiesPreviewCard | CapabilitiesPreviewCard | §3.x | Preview "what they'll be able to do" |
| PromptCard | PromptCard | §2.x or §3.x | Contextual nudge card |
| ChecklistRow | ChecklistRow | §3.2.x / §4.x | Variant of List Item with checkbox |
| Checklist | Checklist | §4.x | Group of ChecklistRows |
| TimelineStrip | TimelineStrip | §4.x | Strip on Today linking to /timeline |
| PlanCard | PlanCard | §4.4.7 | Paywall plan card (feature-flagged) |
| AvatarPicker | AvatarPicker | §4.x | Variant of Form Field for avatar selection |
| ReorderableList | ReorderableList | §4.4.3 | Drag-to-reorder list (Quick Trackers settings) |
| Toggle | native Switch | §1.9.9 Form Field variant=toggle | Native iOS/Android switch |
| SegmentedControl | Form Field variant=segment | §1.9.9 | Native segmented control |
| IconLabel | IconLabel | §4.x | Icon + label inline composite, not interactive |
| Eyebrow | Eyebrow | §4.x | Small uppercase label above section heading |
| SheetHeader | SheetHeader | §3.x | Header for Bottom Sheet (title + close 44pt) |
| EmptyState (neutral variant) | EmptyState | §1.9.13 | NeutralEmptyState and BlockingNeutralState are deprecated synonyms — use EmptyState variant=neutral / variant=blocking |
| PermissionCalmState | EmptyState variant=permission | §1.9.13 | Permission-denied flavor of EmptyState |
| MemberPicker | MemberPicker | §3.x | Variant of Form Field picker |
| DateRangePicker | DateRangePicker | §3.x | Variant of Form Field picker |

---

### 10. Global Screen States

Каждый экран должен иметь шаблоны для следующих состояний. Копии — на русском, нейтральный тон.

| Состояние | Заголовок | Body | Action |
|---|---|---|---|
| Loading | — | Skeleton | — |
| Empty (first run) | «Здесь появятся записи» | «Добавьте первое событие — потом будет проще видеть закономерности.» | «Добавить запись» |
| Empty (filtered) | «Ничего не нашлось» | «Поменяйте период или сбросьте фильтры.» | «Сбросить фильтры» |
| Error (server) | «Не удалось загрузить» | «Проверьте соединение и попробуйте ещё раз.» | «Повторить» |
| Offline-read | «Вы офлайн» | «Показаны данные на момент <время>. Изменения сохранятся локально.» | — (информер) |
| Pending-write | «Сохраняем…» | inline индикатор в строке записи + pill `pending` | — |
| Permission-denied | «Нужно разрешение» | «Чтобы это работало, разрешите доступ к <уведомлениям/камере> в настройках.» | «Открыть настройки» |
| Revoked / expired share | «Доступ закрыт» | «Владелец отозвал доступ или срок ссылки истёк.» | «Связаться с владельцем» |

Шаблон копи короткий: 1 короткое объяснение + 1 шаг наружу. Не извиняемся, не используем восклицания.

---

### 11. Voice & Tone

Спокойный, утилитарный, без алармизма и без «дружочка». Обращение на «вы». Не используем эмодзи. Не используем восклицательные знаки, кроме редких celebration-моментов (≤1 на экран).

Do / Don't примеры:

| Do | Don't |
|---|---|
| «Запись сохранена» | «Ура! Запись успешно создана!» |
| «Похоже, это дубликат за последние 60 секунд. Сохранить всё равно?» | «Стоп! Вы уже это записали!» |
| «Прививка запланирована шаблоном. Подтвердит ветврач.» | «Внимание! Прививка ещё не подтверждена!» |
| «Не удалось сохранить. Запись осталась локально, попробуем позже.» | «Ошибка! Данные потеряны.» |
| «Вес: 4,2 кг, на 0,3 кг больше прошлой недели» | «Отличный рост! Так держать!» |
| «Доступ к данным открыт ветврачу до 17 июня» | «Делитесь данными со своим любимым доктором!» |
| «Туалет на улице — записано в 9:42» | «Молодец, малыш справился!» |
| «Ссылка больше не активна» | «Упс! Что-то пошло не так со ссылкой :(» |

Дополнительно:
- Время — относительное в пределах суток («14 минут назад»), абсолютное за пределами («Вчера, 21:10», «12 мая, 09:42»).
- Медицинские термины — без сокращений в первом упоминании, далее можно сокращать.
- Числа с тонкой неразрывной пробел-разделитель тысяч, запятая для десятых.

---

### 12. Accessibility Specs

Чеклист, обязательный к прохождению до релиза каждого экрана.

- **Touch targets ≥ 44×44pt.** Для иконок 24pt — обязательный `hitSlop` 10pt со всех сторон. FAB и Tracker Tile — ≥56pt.
- **Контраст:** текст ≥4.5:1 (small) или ≥3:1 (large ≥18pt regular / ≥14pt bold). UI controls и focus ring — ≥3:1 к смежной поверхности. Все статус-токены выше уже проверены.
- **VoiceOver / TalkBack labels:** каждый interactive element имеет `accessibilityLabel` (что это) и `accessibilityHint` (что произойдёт). Декоративные SVG — `accessibilityElementsHidden`.
- **Focus order:** соответствует визуальному порядку слева-направо, сверху-вниз. Modal sheet ставит focus на title; close = первый или последний focusable.
- **Состояния:** `accessibilityState` корректен (selected / disabled / busy / expanded).
- **Не полагаться только на цвет:** health-status pills всегда дублируются иконкой и текстом. Error в форме — иконка + текст рядом с полем, не только красная рамка.
- **Dynamic Type:** все экраны проходят QA при категориях `accessibilityXXL` и `accessibilityXXXL`. Layout переходит в single-column при необходимости, текст не обрезается, кнопки расширяются по высоте.
- **Reduced motion:** при `prefersReducedMotion` транзишены заменяются на opacity-only по `motion/fast`. Celebration — статическая.
- **Reduced transparency / Increase contrast:** scrim становится `#000` @ 70%, stroke/default переходит в `stroke/strong`.
- **Touch alternatives:** все swipe-actions (удалить, отменить) дублируются через overflow-меню (`accessibilityActions`).
- **Live regions:** Snackbar и inline alert — `polite`; критические подтверждения (failed save) — `assertive` (только когда контекст явно требует).
- **Screen reader rotor (iOS):** заголовки используют `accessibilityTraits: header`, что позволяет навигацию по заголовкам.
- **Forms:** label программно связан с input; ошибка читается в момент появления, не только при focus.
- **Keyboard / hardware (iPad с клавиатурой):** все интерактивные элементы достижимы Tab, focus ring виден всегда.

---

## Часть 2. Daily Core — Onboarding, Today, Quick Log, Timeline

Эта часть описывает ежедневный контур продукта: первое касание (Onboarding), главный экран (Today), быстрое логирование (Quick Log) и хронологию событий (Timeline). Все экраны спроектированы под уставшего first-time owner, который держит телефон одной рукой, часто в плохо освещённом помещении и часто — параллельно с ребёнком / щенком на руках. Основной приоритет: ноль friction до первого value, спокойный тон, без shame и emergency-стилистики.

Дизайн-токены, используемые сквозь секцию (синхронизированы с Частью 1):
- `bg/base` ≡ `surface/base` — warm off-white (`#FBFAF7`)
- `bg/elevated` ≡ `surface/raised` — pure white (`#FFFFFF`)
- `text/primary` — charcoal (`#1C1F1B`)
- `text/secondary` — warm grey (`#4A4E48`)
- `accent/primary` ≡ `primary/600` — contrast-safe Calm Teal (`#0E7490`)
- `accent/celebration` ≡ `accent/500` — Ember Coral (`#E07A4F`) — только для подтверждений, не для achievements
- `state/pending` — soft slate
- `state/error` — Clay Red (`#9A3B2E`) — без bright red alarm
- Radius: `r-sm 8`, `r-md 12`, `r-lg 16`
- Spacing: использует токены `space/N` из §1.4 как единственный источник; `s/N` и `s-N` упоминания ниже — алиасы. Таблица соответствия:

| Алиас | Канон | pt |
|---|---|---|
| `s/4`, `s-1` | `space/1` | 4 |
| `s/8`, `s-2` | `space/2` | 8 |
| `s/12`, `s-3` | `space/3` | 12 |
| `s/16`, `s-4` | `space/4` | 16 |
| `s/20` | `space/5` | 20 |
| `s/24`, `s-5` | `space/6` | 24 |
| `s/32`, `s-6` | `space/8` | 32 |

Прежнее значение `s-5=24` в черновике Части 2 — ошибка; правильно `s-5 = space/6 = 24`, а `space/5 = 20pt` остаётся отдельным значением.

- Font: SF Pro / system, Dynamic Type включён до AX3

### 2.1 Onboarding Flow

Цель блока: довести пользователя до первого залогированного события не более чем за 45 секунд, без аккаунта и без разрешений.

#### 2.1.1 Welcome

**Цель.** Снять тревогу и обозначить простоту обещания: один понятный план.

**Layout (375 × 812 baseline).**
```
+----------------------------------------------+
|                                              |
|   [s-6 top safe area]                        |
|                                              |
|   [Illustration 220pt height, warm,          |
|    no puppy face — silhouette + bowl]        |
|                                              |
|   [s-5]                                      |
|   Первые дни со щенком                       |  <- H1 / 28pt / bold
|   могут быть messy.                          |
|                                              |
|   [s-3]                                      |
|   Начните с одного понятного плана.          |  <- Body / 17pt
|   text/secondary                             |
|                                              |
|   [flex spacer]                              |
|                                              |
|   +------------------------------------+     |
|   |           Начать                    |    |  <- Primary 56pt
|   +------------------------------------+     |
|   [s-3]                                      |
|   У меня уже есть аккаунт                    |  <- Text link
|   [s-5 bottom safe area]                     |
+----------------------------------------------+
```

**Состояния.** Single state. Никаких loading/empty (статичный экран).

**Копия.**
- H1: «Первые дни со щенком могут быть messy.»
- Sub: «Начните с одного понятного плана.»
- CTA: «Начать»
- Secondary: «У меня уже есть аккаунт»

**Микро-взаимодействия.**
- Tap «Начать»: push transition (iOS default 350 ms ease-out), light haptic.
- Иллюстрация плавно входит при mount: opacity 0→1 / translateY 8→0, 280 ms.

**Accessibility.**
- VoiceOver focus order: H1 → sub → primary CTA → sign-in link.
- Label H1: «Первые дни со щенком могут быть непростыми. Заголовок.»
- Dynamic Type: H1 поддерживает до AX2 без обрезания, sub wraps до 3 строк.

**Компоненты.** `Screen`, `IllustrationFrame`, `HeadingBlock`, `PrimaryButton`, `TextLink`.

#### 2.1.2 Puppy Setup

**Цель.** Получить минимум данных (имя + возраст или дата рождения), без обязательных полей сверху.

**Layout.**
```
+----------------------------------------------+
|  <-                                          |  <- Back, 44pt
|                                              |
|   Как зовут щенка?                           |  <- H2 / 22pt
|   [s-2]                                      |
|   Это можно изменить позже.                  |  <- text/secondary
|                                              |
|   [s-5]                                      |
|   +------------------------------------+     |
|   |  Имя                                |    |  <- TextField 56pt
|   +------------------------------------+     |
|                                              |
|   [s-5]                                      |
|   Возраст                                    |  <- Section label
|                                              |
|   +-------------+  +--------------------+    |
|   | Возраст     |  | Или дата рождения  |    |  <- Segmented
|   +-------------+  +--------------------+    |
|                                              |
|   [Stepper / DatePicker зона, 120pt]         |
|                                              |
|   [flex]                                     |
|   +------------------------------------+     |
|   |          Продолжить                 |    |  <- disabled until name
|   +------------------------------------+     |
+----------------------------------------------+
```

**Состояния.**
- Empty (default).
- Name entered → CTA enabled.
- Invalid date (future) → inline hint «Дата в будущем — проверьте, пожалуйста».
- Pending-write (на следующем шаге): локальный draft сохраняется без сети.

**Копия.**
- Title: «Как зовут щенка?»
- Helper: «Это можно изменить позже.»
- Field: «Имя»
- Toggle: «Возраст» / «Или дата рождения»
- CTA: «Продолжить»

**Микро-взаимодействия.**
- Авто-фокус на имя при mount, клавиатура появляется через 120 ms.
- Toggle между Age/Date: cross-fade 180 ms, без bounce.
- При вводе имени CTA меняет состояние disabled→enabled с opacity 0.4→1 за 160 ms.

**Accessibility.**
- VO label у Toggle: «Способ ввода возраста. Выбрано: возраст в неделях.»
- TextField сообщает hint «Имя щенка, обязательное поле для продолжения».
- Stepper доступен через VO: «Возраст 8 недель. Свайп вверх — увеличить.»

**Компоненты.** `TopBar`, `HeadingBlock`, `TextField`, `SegmentedControl`, `Stepper`, `DateWheel`, `PrimaryButton`.

#### 2.1.3 Age Hint

Не отдельный экран, а inline-блок под полем возраста после ввода (или на следующем micro-step).

**Layout.**
```
   [s-4]
   +----------------------------------------+
   |  [icon: info]  В 8 недель щенки часто  |
   |  спят 18–20 часов в сутки.             |
   +----------------------------------------+
```

- Card: `bg/elevated`, r-md, padding 12 / 16, border 1pt warm-grey-100.
- Никаких медицинских утверждений, всегда формат «часто / обычно».

**Состояния.**
- Visible (после ввода).
- Hidden, если возраст за пределами 4–16 недель (показываем общий «Каждый щенок уникален, держим темп спокойным.»).

**Копия (примеры по возрастам).**
- 6–8 нед: «В 8 недель щенки часто спят 18–20 часов в сутки.»
- 9–12 нед: «Около 10 недель мочевой пузырь маленький — короткие интервалы это нормально.»
- 13–16 нед: «К 14 неделям многим щенкам нужны более длинные прогулки.»
- Fallback: «Каждый щенок уникален. Темп выстраиваем спокойно.»

**Микро-взаимодействия.**
- Появление: height 0→auto, opacity 0→1, 220 ms ease-out. Без haptic.

**Accessibility.**
- VO: «Подсказка. В 8 недель щенки часто спят 18–20 часов в сутки.»
- Не перехватывает фокус автоматически.

**Компоненты.** `HintCard` (вариант `InfoCard` без CTA).

#### 2.1.4 Quick Tracker Selection

**Цель.** Дать выбрать до 5 трекеров с заранее отмеченными дефолтами.

**Layout.**
```
+----------------------------------------------+
|  <-        Что отслеживать                   |
|                                              |
|   До 5 действий. Можно поменять позже.       |  <- text/secondary
|                                              |
|   [s-4]                                      |
|   +------------+  +------------+             |
|   | v Пописал  |  | v Пописал  |             |  <- Tile 168×96
|   |   на улице |  |   дома     |             |
|   +------------+  +------------+             |
|   +------------+  +------------+             |
|   | v Покакал  |  | v Кормление|             |
|   +------------+  +------------+             |
|   +------------+  +------------+             |
|   | v Сон / nap|  |   Zoomies  |             |
|   +------------+  +------------+             |
|   +------------+                             |
|   |   Training |                             |
|   +------------+                             |
|                                              |
|   Выбрано 5 из 5                             |
|                                              |
|   +------------------------------------+     |
|   |          Продолжить                 |    |
|   +------------------------------------+     |
+----------------------------------------------+
```

- Selected tile: border 1.5pt `accent/primary`, fill `bg/elevated`, checkmark top-right.
- Unselected: border 1pt warm-grey-200, no check.

**Состояния.**
- Default (5 дефолтов выбраны).
- 6th tap → unselected tile «вибрирует» (translateX ±4, 2 цикла, 160 ms) + snackbar «Можно выбрать до 5».
- Min: 0 — CTA остаётся enabled, но текст меняется на «Пропустить выбор».

**Копия.**
- Title: «Что отслеживать»
- Helper: «До 5 действий. Можно поменять позже.»
- Counter: «Выбрано N из 5»
- Limit snackbar: «Можно выбрать до 5. Уберите один, чтобы добавить новый.»
- Zero-state CTA: «Пропустить выбор»

**Микро-взаимодействия.**
- Tap по tile: scale 1→0.97→1 за 140 ms, selection light haptic.
- Превышение лимита: warning haptic.

**Accessibility.**
- VO у tile: «Кормление. Выбрано. Двойной тап чтобы убрать.»
- Trait: `button` + `selected`.

**Компоненты.** `TrackerTile`, `Counter`, `Snackbar`, `PrimaryButton`.

#### 2.1.5 Plan Reveal

**Цель.** Показать собранный Today с 3 starter actions.

**Layout.**
```
+----------------------------------------------+
|  Щенок A · 8 нед · [avatar: вы]                 |
|                                              |
|   Ваш план на сегодня                        |  <- H2
|   Можно начать с первого пункта.             |
|                                              |
|   [HeroCard 96pt] Залогируйте первое событие |
|                                              |
|   [s-3]                                      |
|   [DailyCard] Понаблюдайте за паттерном еды  |
|   [DailyCard] Короткие выходы каждые 1–2 ч   |
|   [DailyCard] Тихий уголок для сна           |
|                                              |
|   +------------------------------------+     |
|   |     Начать первый лог              |     |
|   +------------------------------------+     |
+----------------------------------------------+
```

**Копия.**
- Title: «Ваш план на сегодня»
- Sub: «Можно начать с первого пункта.»
- Hero: «Залогируйте первое событие — это займёт секунд пять.»
- CTA: «Начать первый лог»

**Микро-взаимодействия.**
- Cards stagger-in: 80 ms между ними, fade + translateY 8→0.
- CTA pulses один раз через 1.2 с после mount.

**Accessibility.** VO читает заголовок и затем сразу hero card, затем CTA.

**Компоненты.** `TopBar`, `HeroCard`, `DailyCard`, `PrimaryButton`.

#### 2.1.6 First Log

**Цель.** Первое событие логируется до account wall, прямо из Quick Log sheet (см. 2.3).

**Поведение.**
- При нажатии «Начать первый лог» открывается стандартный Quick Log sheet.
- После выбора tracker'а возвращаемся в Today, hero card меняется на: «Первое событие записано. Дальше — спокойный ритм.»
- Snackbar `accent/celebration`: «Готово. Можно продолжать.»

**Состояния.** Локально сохранено (pending sync). Если пользователь не создал аккаунт — данные хранятся в локальном draft, помечены `local-only` индикатором в Timeline.

#### 2.1.7 Account / Notifications Prompts

Оба запроса — после first-value, никогда до.

**Account Wall** (триггер: invite, premium, multi-device).

**Копия.**
- Title: «Сохраните прогресс»
- Body: «Это позволит делиться с близкими и видеть данные на других устройствах.»
- Primary: «Продолжить с Apple» / «Продолжить с Google» / «Email»
- Secondary: «Не сейчас»

**Notifications Prompt** — после первого reminder или после первого log, не сразу.

**Копия.**
- Title: «Хотите тихие напоминания?»
- Body: «Мы пришлём только то, что вы выбрали. Без шума.»
- Primary: «Включить»
- Secondary: «Не сейчас»

**Микро-взаимодействия.**
- «Не сейчас» не штрафует, prompt возвращается через 48 ч после нового триггера.
- При системном prompt iOS — нативный диалог следует через 250 ms после нашего.

**Компоненты.** `Sheet`, `HeadingBlock`, `PrimaryButton`, `SecondaryButton`, `TextLink`.

### 2.2 Today

#### 2.2.1 Layout & Anatomy

**Цель.** Дать одну ясную next-best-action и спокойный обзор дня.

**Wireframe.**
```
+----------------------------------------------+
|  Щенок A · 8 нед             [Опекун A][Ты]          |  <- TopBar 56pt
|  +----------------------------------------+  |
|  | Опекун A покормила Щенка A · 42 мин назад      |  |  <- ActivityStrip 36pt
|  +----------------------------------------+  |
|                                              |
|  Сейчас                                      |  <- Section label
|  +----------------------------------------+  |
|  | [icon: paw]                            |  |
|  | Похоже, пора выйти.                    |  |  <- HeroCard 112pt
|  | Последний выход 1 ч 40 мин назад.      |  |
|  | +--------------+                       |  |
|  | | Логировать   |   Позже               |  |  <- primary + tertiary text-link
|  | +--------------+                       |  |
|  +----------------------------------------+  |
|                                              |
|  Дальше                                      |
|  +----------------------------------------+  |
|  | Кормление                              |  |  <- DailyCard 72pt
|  | Обычно около 13:00                     |  |
|  +----------------------------------------+  |
|  +----------------------------------------+  |
|  | Тихий сон 30–60 мин                    |  |
|  +----------------------------------------+  |
|  +----------------------------------------+  |
|  | Здоровье: прививка через 4 дня         |  |  <- StatusRow, calm
|  +----------------------------------------+  |
|                                              |
|           [persistent Quick Log FAB]         |  <- 56pt
|  ------------------------------------------  |
|   Today    Health    More                    |  <- TabBar
+----------------------------------------------+
```

- Hero card всегда одна, контрастная (border 1pt `accent/primary` 30% opacity).
- Daily cards: до 5 visible, остальные скрыты под «Показать ещё».
- Health rows — нейтральные, никакого красного.

**Микро-взаимодействия (общие).**
- Scroll: nav bar collapses (iOS large title pattern).
- Pull-to-refresh: progress dot teal, без bouncy spring.
- FAB: всегда видим, shadow `0 4 12 rgba(0,0,0,0.08)`. Tap → bottom sheet.

**Accessibility.**
- TopBar avatars: «Участники: Опекун A, вы.»
- Hero card имеет один accessibility element c полным label.
- FAB: «Быстрый лог. Двойной тап чтобы открыть.»

**Компоненты.** `TopBar`, `ActivityStrip`, `HeroCard`, `DailyCard`, `StatusRow`, `FAB`, `TabBar`.

#### 2.2.2 Day 1 / First Value

- Hero: «Залогируйте первое событие — это займёт секунд пять.» CTA «Начать».
- 3 Starter Daily cards (тип «гайд», не «задача»):
  1. «Короткие выходы каждые 1–2 часа»
  2. «Тихий уголок для сна»
  3. «Понаблюдайте за паттерном еды»
- One starter guidance card: «Первые сутки — это про наблюдение, не результат.»

**Копия.** Без слов «задача», «нужно», «должны». Используем «можно», «попробуйте», «обычно».

#### 2.2.3 Day 2 Morning

```
  Что уже понятно со вчера
  +----------------------------------------+
  | 3 выхода на улицу · 2 кормления        |  <- RecapCard 88pt
  | Аккуратная динамика для второго дня.   |
  +----------------------------------------+

  Что сделать сейчас
  +----------------------------------------+
  | Утренний выход                         |  <- HeroCard
  | Щенок A спал 6 часов — мочевой полный.   |
  | [ Логировать выход ]                   |
  +----------------------------------------+
```

**Копия.**
- Section 1: «Что уже понятно со вчера»
- Recap пример: «3 выхода на улицу, 2 кормления. Аккуратная динамика для второго дня.»
- Section 2: «Что сделать сейчас»
- Hero: «Утренний выход» + «Щенок A спал 6 часов — мочевой полный.»

Никаких счётчиков «дней подряд». Только relative observation.

#### 2.2.4 Accident Recovery

Триггер: лог `potty.inside`.

```
  +----------------------------------------+
  | Так бывает.                            |  <- HeroCard, neutral border
  | Следующий шанс — после сна или еды.    |
  | [ Запланировать выход ]                |
  +----------------------------------------+
```

**Копия.**
- Hero title: «Так бывает.»
- Body: «Следующий шанс — после сна или еды.»
- Альтернатива при повторе: «Накопилось несколько эпизодов. Может помочь короткий выход каждый час сегодня.»
- CTA: «Запланировать выход»

Без слов «ошибка», «проблема», «опять». Никакого красного. Border остаётся стандартным.

**Микро-взаимодействия.** Hero card cross-fades в accident-recovery state (280 ms), light haptic.

#### 2.2.5 After Feeding Pattern

Триггер: 2–3 события `feeding` за последние 24 часа с похожим временем.

```
  +----------------------------------------+
  | Кормление по обычному ритму            |  <- DailyCard
  | Около 130 г · 12:50                    |
  | [ Обычная порция ]    Изменить         |  <- primary + tertiary text-link
  +----------------------------------------+
```

**Копия.**
- Title: «Кормление по обычному ритму»
- Body: «Около 130 г · 12:50» (или «Около обычной порции», если grams unknown)
- Primary: «Обычная порция» (filled `primary/600`)
- Tertiary text-link: «Изменить» (без filled-button, чтобы соблюсти one-CTA contract из §1)

One-tap «Обычная порция» → optimistic log + snackbar. Никакого открытия sheet.

#### 2.2.6 After Invite (Household Attribution)

Триггер: первый принятый invite. **ActivityStrip активируется.**

```
  +----------------------------------------+
  | [avatar Опекун A] Опекун A покормила Щенка A ·      |
  | 42 мин назад                           |
  +----------------------------------------+
```

- Высота 36pt, sticky под TopBar.
- Tap → раскрывает мини-список последних 3 действий household.

**Копия.**
- Single: «Опекун A покормила Щенка A · 42 мин назад»
- Multiple: «Опекун A и вы · 3 события за последний час»
- Empty (никто кроме вас не активен): strip скрыт.

**Микро-взаимодействия.** При новом событии другого участника: strip pulses (border opacity 0→0.3→0, 800 ms), без звука и без haptic.

#### 2.2.7 Missed Reminder

```
  +----------------------------------------+
  | Напоминание: кормление в 13:00         |
  | Если это уже произошло, отметьте       |
  | как done.                              |
  |                                        |
  | [ Done ] [ Snooze ] [ Skip ] [ Edit ]  |
  | [ Stop reminding ]                     |
  +----------------------------------------+
```

**Копия.**
- Title: «Напоминание: кормление в 13:00»
- Body: «Если это уже произошло, отметьте как done.»
- Actions: «Done», «Snooze», «Skip», «Edit», «Stop reminding»
- Snooze sheet: 15 мин / 30 мин / 1 час.

**Микро-взаимодействия.** Tap «Done» → лог events с временем reminder'а, не «сейчас», + snackbar «Записано».

#### 2.2.8 Day 7 Weekly Rhythm

Без streaks. Без «7 days in a row».

```
  Недельный ритм
  +----------------------------------------+
  | За 7 дней:                             |
  | • 24 выхода на улицу                   |
  | • 18 кормлений                         |
  | • Сон — в среднем 16 ч / сутки         |
  |                                        |
  | Стало понятнее: Щенок A обычно просится   |
  | через 40–60 минут после еды.           |
  |                                        |
  | [ Посмотреть подробно ]                |
  +----------------------------------------+
```

**Копия.**
- Title: «Недельный ритм»
- Lead: «За 7 дней:»
- Insight pattern: «Стало понятнее: …»
- CTA: «Посмотреть подробно»

Никаких «вы молодец», «отличная работа». Слова «стало понятнее», «получается видеть», «рутина формируется».

#### 2.2.9 Loading / Empty / Offline / Pending States

**Loading.** Skeleton рядов: TopBar остаётся (имя/возраст уже локально), под ним 3 skeleton card с shimmer 1.4 с loop, opacity 0.4→0.7.

**Empty.**
```
  +----------------------------------------+
  | Сегодня пока тихо.                     |
  | Начните с того, что заметили прямо     |
  | сейчас.                                |
  | [ Открыть быстрый лог ]                |
  +----------------------------------------+
```

**Error.** Top-of-list banner: «Не удалось обновить. Показываем последнее сохранённое.» Action: «Повторить».

**Offline-read.** Маленький chip под TopBar: «Без сети. Показано локально.» Все existing data доступны, кнопки логирования работают (pending).

**Pending-write.** Каждое событие на Today, ещё не подтверждённое сервером, имеет subtle dot indicator `state/pending` рядом с временем.

### 2.3 Quick Log

#### 2.3.1 Trigger & Sheet Anatomy

**Цель.** Залогировать событие за 1–2 тапа из любого экрана.

**Trigger.** Persistent FAB 56×56pt, bottom-right, inset 16pt от tab bar. Tap → нативный bottom sheet, presentation detents: medium (≈360pt) и large.

**Sheet layout (medium).**
```
+----------------------------------------------+
|         ---- (grabber 36×5pt)                |
|                                              |
|  Что произошло?                              |  <- H3 18pt
|  [s-3]                                       |
|  +----------+ +----------+ +----------+      |
|  | [potty.  | | [potty.  | | [potty.  |     |  <- Tile 100×96
|  | outside] | | inside]  | | poop]    |     |
|  | На улице | | Дома     | | Покакал  |     |
|  +----------+ +----------+ +----------+      |
|  +----------+ +----------+                   |
|  | [feeding]| | [sleep]  |                   |
|  | Кормление| | Сон      |                   |
|  +----------+ +----------+                   |
|                                              |
|  +----------------------------------------+  |
|  |  Изменить трекеры                       | |  <- TextLink center
|  +----------------------------------------+  |
+----------------------------------------------+
```

**Микро-взаимодействия.**
- Open: spring 360 ms, backdrop fade 0→0.4.
- Close swipe-down: standard.

**Accessibility.** Sheet trait `modal`. Focus стартует на title. Каждый tile — отдельный element.

**Компоненты.** `BottomSheet`, `TrackerTile`, `TextLink`.

#### 2.3.2 Tracker Grid (Defaults + Edit Trackers)

- Tiles: 44pt min height по гайдлайнам, фактически 96pt.
- Grid: 3 колонки на iPhone стандарт, 2 на compact width.
- Edit Trackers ведёт на отдельный экран (modal full-screen) — можно переставлять, добавлять до 5.

**Копия.**
- Title: «Что произошло?»
- Edit: «Изменить трекеры»
- Edit screen title: «Ваши быстрые трекеры»
- Helper: «До 5. Перетащите, чтобы изменить порядок.»

#### 2.3.3 Potty

```
+----------------------------------------------+
|  <-   Потти                                  |
|                                              |
|  +----------------------------------------+  |
|  |  Пописал на улице                       | |  <- 56pt Primary
|  +----------------------------------------+  |
|  +----------------------------------------+  |
|  |  Пописал дома                           | |  <- 56pt Secondary
|  +----------------------------------------+  |
|  +----------------------------------------+  |
|  |  Покакал                                | |  <- 56pt Secondary
|  +----------------------------------------+  |
|                                              |
|  Добавить детали (необязательно)             |
|  [ Контекст v ]  [ Заметка ]  [ Фото ]       |
+----------------------------------------------+
```

- Context options: «После сна», «После еды», «Прогулка», «Игра», «Не уверен».
- Tap по primary → optimistic save + sheet закрывается + snackbar.

#### 2.3.4 Feeding

```
  +----------------------------------------+
  |  Покормили                             |
  |  Обычная порция — около 130 г          |  <- suggestion
  |                                        |
  |  [ Обычная порция ]                    |  <- primary
  |  [ Указать вручную ]                   |  <- secondary
  |  [ Только что — без граммов ]          |  <- tertiary
  +----------------------------------------+
```

- «Обычная порция» появляется только если есть pattern (≥3 events).
- «Только что — без граммов» сохраняет event с `amount = "порцию"`.
- При manual: stepper 5 г / numeric input.

#### 2.3.5 Sleep / Nap

```
  +----------------------------------------+
  |  Сон                                   |
  |                                        |
  |  [ Начать сейчас ]    (live timer)     |  <- Primary
  |  [ Уже спал ]                          |  <- Secondary
  |                                        |
  |  Если выбрать «уже спал»:              |
  |  +--------------------------------+    |
  |  |  Сколько примерно?             |    |
  |  |  [ 15 мин ][ 30 ][ 1 ч ][ 2 ч ]|    |  <- Duration chips
  |  +--------------------------------+    |
  +----------------------------------------+
```

**Live state.** При активном таймере в Today появляется persistent banner: «Щенок A спит · 0:24 · [Остановить]».

**Копия.**
- «Начать сейчас» / «Уже спал»
- Live banner: «Щенок A спит · MM:SS» + «Остановить»
- Stop confirmation snackbar: «Сон записан: 47 минут.»

#### 2.3.6 Zoomies / Training

Показывается только если выбран при setup.

```
  +----------------------------------------+
  |  Zoomies                               |
  |  [ Залогировать сейчас ]               |  <- One-tap primary
  |                                        |
  |  Детали (необязательно):               |
  |  Контекст: [ После сна v ]             |
  |  Длительность: [ <5 ][ 5–15 ][ 15+ ]   |
  |  Заметка: [____________________]       |
  +----------------------------------------+
```

#### 2.3.7 Optional Details

Доступны на всех типах events после сохранения через snackbar action «Добавить детали» или из Timeline → Edit.

**Поля.**
- Контекст (dropdown enumerated values)
- Заметка (textarea 3 строки, до 280 знаков)
- Фото (1 фото, native picker)
- Время (DateTime picker — by default «сейчас»)

#### 2.3.8 Snackbar / Undo

**Sequence после tap.**
1. Sheet closes (220 ms).
2. Snackbar slide-up from bottom, выше FAB на 80pt, ширина -32 от viewport, r-md, `bg/elevated`, border 1pt `accent/celebration` 40%.
3. Auto-dismiss 4 s.

```
  +----------------------------------------+
  |  Записано · Пописал на улице            |
  |  [ Отменить ]   [ Добавить детали ]    |
  +----------------------------------------+
```

**Микро-взаимодействия.**
- Появление: translateY 24→0 + opacity, 220 ms.
- «Отменить» → event помечается deleted, snackbar заменяется на «Отменено» 1.5 s.

**Accessibility.** VO announce: «Записано: пописал на улице. Доступны действия: отменить, добавить детали.» Trait: `liveRegion` polite.

#### 2.3.9 Pending / Failed / Retry States

**Pending.** Event на Today/Timeline появляется сразу (optimistic), рядом с временем — dot `state/pending` и label «Сохраняется».

**Failed.** Через 8 s без подтверждения:
- Snackbar заменяется/возвращается: «Не удалось сохранить. Повторить?»
- Actions: «Повторить» (primary) / «Удалить» (tertiary).
- Event в Timeline получает pill `Не сохранено` (state/error fill 10%).

**Retry.** Tap «Повторить» → новый pending; после 3 неудач → persistent banner на Today «Несколько событий не сохранились. Проверьте соединение.»

#### 2.3.10 Duplicate Warning

Триггер: tap по tracker, по которому есть event того же типа за последние 60 секунд от любого household member.

Threshold: 60 секунд — source of truth, синхронизировано с PRD §4 и §3.1.7.

```
  +----------------------------------------+
  |  ---- (grabber)                         |
  |                                         |
  |  Опекун A уже логировала кормление           |
  |  60 секунд назад.                        |
  |  Всё равно добавить?                    |
  |                                         |
  |  [ Добавить всё равно ]   [ Отмена ]    |
  +----------------------------------------+
```

**Копия.**
- Title: «{Имя} уже логировала {tracker} {N} минут назад.»
- Question: «Всё равно добавить?»
- Primary: «Добавить всё равно»
- Secondary: «Отмена»

**Микро-взаимодействия.** Open: 220 ms. Без warning haptic (это не ошибка).

### 2.4 Timeline

#### 2.4.1 List Layout

```
+----------------------------------------------+
|  <-   События                          [...]  |  <- TopBar
|                                              |
|  [ Все ] [ Потти ] [ Еда ] [ Сон ] [ Ещё v ] |  <- FilterChips
|  [ Сегодня v ]                               |  <- RangePicker
|                                              |
|  Сегодня · вторник                           |  <- SectionHeader
|  +----------------------------------------+  |
|  | [icon] Пописал на улице · 12:40        |  |
|  | Записано: Опекун A · [pill: synced]         |  |
|  +----------------------------------------+  |
|  +----------------------------------------+  |
|  | [icon] Кормление 130 г · 12:50         |  |
|  | Записано: Вы · [pill: pending]         |  |
|  +----------------------------------------+  |
|                                              |
|  Вчера · понедельник                         |
|  +----------------------------------------+  |
|  | [icon] Сон 47 мин · 14:10              |  |
|  | Записано: Вы · есть заметка [icon]     |  |
|  +----------------------------------------+  |
+----------------------------------------------+
```

- Item row 64pt min, иконка 24pt слева, метаданные снизу 13pt `text/secondary`.
- Section headers sticky.
- No raw IDs, no DB errors.

#### 2.4.2 Filters

- Chip row: `Все`, `Потти`, `Еда`, `Сон`, `Zoomies`, `Тренировка`, `Здоровье`.
- Multi-select разрешён, активные имеют fill `accent/primary` 12%, border `accent/primary`.
- Range picker (sheet): «Сегодня», «3 дня», «Неделя», «Произвольно».

**Копия.**
- Range default: «Сегодня»
- Custom sheet title: «Выберите период»
- Empty filter: «За этот период событий нет.»

#### 2.4.3 Item Anatomy

- Icon 24pt: соответствует tracker type, monochrome `text/primary`.
- Label: «Пописал на улице»
- Timestamp: friendly bucket. «только что», «60 секунд назад», «12:40», «вчера 18:15».
- Actor attribution: «Записано: Опекун A» / «Записано: Вы».
- State pill: `Synced` (скрыт по умолчанию, виден только когда non-synced), `Сохраняется`, `Не сохранено`.
- Details indicator: `[icon: note]` если есть заметка/фото/контекст.
- Overflow [...]: открывает action sheet `Изменить` / `Удалить`.

**Копия pill.**
- Pending: «Сохраняется»
- Failed: «Не сохранено»
- Локально (нет аккаунта): «Только на этом устройстве»

#### 2.4.4 Edit / Delete / Undo Flow

**Edit.** Tap по item → push detail sheet с теми же полями, что в Optional Details. Save → snackbar «Изменено» + Undo (5 s window).

**Delete.**
- Overflow → «Удалить» → confirmation sheet:
  - Title: «Удалить запись?»
  - Body: «Можно отменить в течение 5 секунд.»
  - Primary destructive: «Удалить» (`state/error` text, не fill)
  - Secondary: «Отмена»
- После delete → snackbar «Запись удалена. [ Отменить ]» 5 s.

**Swipe.**
- Swipe-left → две action: «Изменить» (teal) / «Удалить» (terracotta, не bright red).
- Swipe right отключён (предотвращает случайное действие).

**Микро-взаимодействия.**
- Delete fade-out 240 ms, height collapse 200 ms.
- Undo restores item с slide-down 220 ms.

#### 2.4.5 Pending / Failed States

- Pending item: opacity 1, но pill `Сохраняется` виден; overflow меню содержит «Отменить отправку» + «Удалить».
- Failed item: pill `Не сохранено`, плюс inline action row:
  - «Повторить» (primary text link, teal)
  - «Удалить» (tertiary text link)
- Никаких сырых ошибок типа «HTTP 500». Все формулировки:
  - «Не удалось сохранить. Проверьте соединение.»
  - «Слишком много попыток. Попробуем позже автоматически.»

**Компоненты Timeline.** `TopBar`, `FilterChipRow`, `RangePicker`, `SectionHeader`, `EventRow`, `StatePill`, `SwipeActions`, `Sheet`, `Snackbar`, `ConfirmationDialog`.

---

## Часть 3. Collaboration — Family, Trusted Sitter, Trainer Sharing, Shareable Cards

Эта секция описывает все экраны, связанные с расшариванием доступа к данным щенка. Ведущий принцип — **sharing clarity**: на любом экране invite, preview, accepted или revoked пользователь должен за 2 секунды ответить на три вопроса — *кто*, *что видит*, *как долго*.

Все экраны используют общие токены (синхронизированы с Частью 1): warm off-white фон `#FBFAF7`, charcoal `#1C1F1B`, calm teal `#0891B2` для brand/focus и `#0E7490` для filled primary actions, Ember Coral `#E07A4F` только для celebration, radius 8–12pt, native system font.

**Общие компоненты** (синонимы каноничных имён из §1.9): `RoleChip`, `ScopeToggleRow`, `ScopeStripe` (цветная вертикальная полоска 3pt слева от карточки скоупа), `IncludedExcludedPreview`, `MemberRow`, `AttributionStrip`, `InviteStatusBadge`, `ExpiryPicker`, `EmptyState` (вариант `neutral`), `PrimaryButton` (ранее `PrimaryCTA`), `Button variant=destructive` (ранее `DangerInlineButton`), `SheetHeader`.

**Цветовая раскраска скоупов** (используется в `ScopeStripe` и иконках):
- `routine_summary` — teal `#0891B2`
- `selected_timeline_range` — slate `#3C5C7A`
- `training_notes` — warm brown `#8B6B4A`
- `health_summary` — muted coral `#C77B6B` (сигнал чувствительности)
- `puppy_profile` — soft sage `#7A9B7A`

### 3.1 Family Sharing

#### 3.1.1 Entry Point

**Цель.** Дать owner естественный момент пригласить второго опекуна без агрессивного промо.

**Layout.** Два входа.

*A. Today contextual prompt* (появляется однократно на 3-й день, если в household один человек):
```
+----------------------------------------------------------+
| Сегодня                                                  |
|                                                          |
|  [ ... routine cards ... ]                               |
|                                                          |
|  +----------------------------------------------------+  |
|  |  Делите заботу с близкими                          |  |
|  |  Пригласите одного человека — он сможет            |  |
|  |  отмечать кормления и прогулки.                    |  |
|  |                                                    |  |
|  |  [ Пригласить ]        [ Не сейчас ]               |  |
|  +----------------------------------------------------+  |
+----------------------------------------------------------+
```

*B. More → Семья и доступ* — постоянный пункт.

**Состояния.** Single-state. После dismiss — не повторяется 14 дней. Если invite уже отправлен — карточка не показывается, вместо неё в More виден pending-статус.

**Копия.**
- Title: «Делите заботу с близкими»
- Body: «Пригласите одного человека — он сможет отмечать кормления и прогулки.»
- CTA: «Пригласить», secondary: «Не сейчас»

**Микро-взаимодействия.** Tap «Не сейчас» — карточка уезжает вниз 240 ms ease-out, без haptic. Tap «Пригласить» — light impact haptic.

**Компоненты.** `PromptCard`, `PrimaryCTA`, `TextButton`.

#### 3.1.2 Invite Caregiver Screen

**Цель.** Выбрать роль, понять её возможности, отправить приглашение.

**Layout.**
```
+----------------------------------------------------------+
| <  Пригласить                                            |
|                                                          |
|  Кого приглашаем                                         |
|  +----------------------------------------------------+  |
|  | Email или имя контакта                             |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Роль                                                    |
|  ( ) Опекун   — может отмечать события и заметки         |
|  ( ) Наблюдатель — только просмотр                       |
|                                                          |
|  Что увидит опекун                                       |
|  +----------------------------------------------------+  |
|  |  • Сегодня и таймлайн Щенок Aа                      |  |
|  |  • Может отмечать кормления, прогулки, туалет      |  |
|  |  • Может создавать напоминания                     |  |
|  |  Не увидит: оплату подписки, приватные заметки     |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Срок действия ссылки                                    |
|  [ 7 дней v ]                                            |
|                                                          |
|  [ Отправить приглашение ]                               |
|  [ Поделиться ссылкой ]                                  |
+----------------------------------------------------------+
```

Контентные блоки разделены 24pt. Внутренние списки — 8pt между строками. Capabilities-preview карточка: fill `#FFFFFF`, ScopeStripe teal 3pt слева.

**Состояния.**
- *empty* — поле email пустое, primary disabled.
- *valid* — email распознан, primary enabled.
- *error* — «Не похоже на email. Проверьте адрес.» inline под полем.
- *sending* — primary показывает spinner, текст «Отправляем…», поле disabled.
- *role-locked* (когда уже есть один caregiver) — radio «Опекун» disabled.

**Копия.**
- Заголовки: «Кого приглашаем», «Роль», «Что увидит опекун», «Срок действия ссылки»
- Описания: «Опекун — может отмечать события и заметки», «Наблюдатель — только просмотр»
- Preview (для опекуна): «Сегодня и таймлайн {имя}», «Может отмечать кормления, прогулки, туалет», «Может создавать напоминания», «Не увидит: оплату подписки, приватные заметки»
- Preview для наблюдателя: «Сегодня и таймлайн {имя}», «Только просмотр — без правок», «Не увидит: оплату подписки, приватные заметки»
- CTA: «Отправить приглашение», secondary: «Поделиться ссылкой»
- Срок: варианты «24 часа», «7 дней», «14 дней»

**Микро-взаимодействия.** Переключение radio — selection haptic + 180ms cross-fade preview-блока. Primary disabled, пока email валиден И роль выбрана.

**Accessibility.** Radio объявляются как «Роль опекун, выбрано» / «не выбрано». При смене роли VoiceOver announce: «Опекун выбран. Что увидит опекун обновлено.»

**Компоненты.** `TextField`, `RadioGroup`, `CapabilitiesPreviewCard`, `ExpiryPicker`, `PrimaryCTA`, `SecondaryCTA`.

#### 3.1.3 Invite Sent / Pending State

```
+----------------------------------------------------------+
|              Приглашение отправлено                      |
|              caregiver-a@example.test                            |
|                                                          |
|         Срок действия: до 24 мая                         |
|                                                          |
|  +----------------------------------------------------+  |
|  | Скопировать ссылку                                 |  |
|  +----------------------------------------------------+  |
|  | Отправить повторно                                 |  |
|  +----------------------------------------------------+  |
|  | Отозвать приглашение                               |  |
|  +----------------------------------------------------+  |
|                                                          |
|                  [ Готово ]                              |
+----------------------------------------------------------+
```

«Отозвать приглашение» — red text `#9A3B2E` (muted Clay Red, не bright red).

**Состояния.**
- *pending* — основной.
- *resending* — на ряду «Отправить повторно» spinner.
- *resent* — toast «Ссылка отправлена ещё раз» 2 s.
- *revoked* — экран меняется на neutral «Приглашение отозвано. Можно отправить новое.»
- *expired* — top-strip amber: «Срок ссылки истёк». Действия: «Отправить новое».
- *error* — toast.

**Копия.**
- «Приглашение отправлено»
- «Срок действия: до {дата}»
- «Скопировать ссылку», «Отправить повторно», «Отозвать приглашение»
- Confirm-sheet при revoke: title «Отозвать приглашение?», body «Ссылка перестанет работать. Это можно сделать в любой момент.», destructive «Отозвать», cancel «Оставить»

**Микро-взаимодействия.** Revoke вызывает action sheet (нет destructive без подтверждения). Success haptic при отправке, warning haptic при revoke confirm.

**Компоненты.** `SuccessHeader`, `ActionRow`, `ActionSheet`, `Toast`, `StatusStrip`.

#### 3.1.4 Accept Invite Flow (caregiver-side)

**Цель.** Дать приглашённому человеку ясно понять, во что он входит, и сознательно принять.

```
+----------------------------------------------------------+
|              Вас приглашает Владелец A                      |
|         присоединиться к заботе о Щенок Aе                |
|                                                          |
|  Ваша роль: Опекун                                       |
|                                                          |
|  +----------------------------------------------------+  |
|  | Что вам будет доступно                             |  |
|  |  • Сегодня и таймлайн Щенок Aа                      |  |
|  |  • Отмечать кормления, прогулки, туалет            |  |
|  |  • Создавать напоминания                           |  |
|  |                                                    |  |
|  | Чего не будет                                      |  |
|  |  • Оплата подписки                                 |  |
|  |  • Приватные заметки владельца                     |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Владелец A сможет в любой момент закрыть вам доступ.       |
|                                                          |
|  [ Принять ]                                             |
|  [ Отклонить ]                                           |
+----------------------------------------------------------+
```

Карточка included/excluded — единая `IncludedExcludedPreview`: два суб-блока, разделитель 1pt, included с teal stripe, excluded — без stripe, серый заголовок.

**Состояния.**
- *loading* — skeleton 3 строк.
- *valid invite* — основной.
- *expired* — neutral state «Это приглашение больше недоступно. Попросите Владельца A отправить новое.»
- *revoked* — тот же neutral state, формулировка идентична (мы не раскрываем, отозвано или истекло).
- *already-member* — «Вы уже в household Щенок Aа.» + кнопка «Открыть».
- *error* — «Не получилось загрузить приглашение. Проверьте интернет.»

**Копия.**
- «Вас приглашает {имя} присоединиться к заботе о {имя щенка}»
- «Ваша роль: Опекун» / «Ваша роль: Наблюдатель»
- «Что вам будет доступно», «Чего не будет»
- Disclosure: «{Имя владельца} сможет в любой момент закрыть вам доступ.»
- CTA: «Принять», «Отклонить»
- Neutral expired/revoked: «Это приглашение больше недоступно.»

**Микро-взаимодействия.** Tap «Принять» — primary spinner, после успеха success haptic + push в Shared Today onboarding. Decline — confirm sheet «Отклонить приглашение?»

**Компоненты.** `InviteHeader`, `RoleChip`, `IncludedExcludedPreview`, `PrimaryCTA`, `TextButton`, `NeutralEmptyState`.

#### 3.1.5 Shared Today (caregiver/viewer view)

**Цель.** Дать second person ту же ориентацию на «что сейчас нужно», что и у owner, с явной отметкой ограничений.

**Layout.** Идентична owner Today, с двумя отличиями:
- В правом верхнем углу — `RoleChip`: «Опекун» / «Наблюдатель» (tap → bottom sheet с описанием возможностей и кнопкой «Покинуть household»).
- AttributionStrip над routine cards.
- Для **viewer** все action-кнопки на карточках заменены на disabled-вид (charcoal 40% opacity) с подписью под карточкой «Только просмотр».

**Состояния.**
- *loading* — skeleton как у owner.
- *empty* — «Здесь будут события сегодняшнего дня.»
- *error* — стандартный retry-banner.
- *permission-denied* (owner удалил доступ во время сессии) — full-screen neutral: «Доступ к {имя} закрыт. Если это ошибка — свяжитесь с владельцем.»
- *no-network* — banner top «Нет связи. Изменения сохранятся локально.»

**Микро-взаимодействия.** При попытке viewer тапнуть disabled-карточку — light haptic + 240ms inline toast под карточкой «Только просмотр. Попросите владельца дать доступ опекуна.»

**Компоненты.** `RoleChip`, `AttributionStrip`, `RoutineCard` (вариант `readOnly`), `InlineToast`, `BlockingNeutralState`.

#### 3.1.6 Manage Household

```
+----------------------------------------------------------+
| <  Семья и доступ                                        |
|                                                          |
|  Участники                                               |
|  +----------------------------------------------------+  |
|  | Владелец A                          Владелец           | |
|  +----------------------------------------------------+  |
|  | Опекун A                              Опекун        ... | |
|  |  Активна 12 мин назад                              |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Приглашения                                             |
|  +----------------------------------------------------+  |
|  | caregiver-b@example.test                  Ожидает       ... | |
|  |  Действует до 24 мая                                | |
|  +----------------------------------------------------+  |
|                                                          |
|  [ Пригласить ]                                          |
+----------------------------------------------------------+
```

`MemberRow`: avatar 32pt circle (initials, fill teal 12% opacity), title 17pt SF Semibold, subtitle 13pt charcoal 60%, trailing — `InviteStatusBadge` + overflow `...`.

**Состояния.**
- *loading* — 2 skeleton rows.
- *empty pending* — секция «Приглашения» скрыта.
- *owner alone* — единственная строка с собой + пустой state-блок.
- *error* — banner.
- *revoked-just-now* — toast «Доступ для Опекуна A закрыт.»

**Копия.**
- Бейджи: «Владелец», «Опекун», «Наблюдатель», «Ожидает», «Истекло», «Отозвано»
- Overflow для активного участника: «Сменить роль», «Закрыть доступ»
- Confirm на «Закрыть доступ»: title «Закрыть доступ для Опекуна A?», body «Опекун A больше не увидит данные {имя}. Это можно отменить, отправив новое приглашение.», destructive «Закрыть доступ», cancel «Отмена»
- Overflow для pending: «Скопировать ссылку», «Отправить повторно», «Отозвать»

**Компоненты.** `MemberRow`, `InviteStatusBadge`, `OverflowMenu`, `ConfirmSheet`, `EmptyStateBlock`.

#### 3.1.7 Duplicate Warning Sheet

**Цель.** Поймать случай, когда два опекуна параллельно логируют одно и то же кормление/туалет в 60-секундном окне.

```
+----------------------------------------------------------+
|                       ----                               |
|                                                          |
|  Кажется, это уже отмечено                               |
|                                                          |
|  Другой опекун отметил кормление менее минуты назад.           |
|                                                          |
|  +----------------------------------------------------+  |
|  | Кормление  •  12:24  •  Опекун A                        |  |
|  +----------------------------------------------------+  |
|                                                          |
|  [ Это другое событие — добавить ]                       |
|  [ Отменить ]                                            |
+----------------------------------------------------------+
```

**Состояния.**
- *single match* — основной.
- *multiple matches* — список до 2 событий + «Ещё 1 событие за последние 60 секунд».
- *dismiss* — sheet закрывается, текущее событие НЕ создаётся (default-safe).

**Копия.**
- «Кажется, это уже отмечено»
- «{Имя} отметила {тип события} {N} минут назад.»
- Primary: «Это другое событие — добавить»
- Cancel: «Отменить»
- Без shame: не используем «дубликат», «ошибка», «вы уверены».

**Микро-взаимодействия.** Warning haptic при появлении sheet. Tap «Это другое событие» — sheet закрывается с success haptic.

**Компоненты.** `BottomSheet`, `EventPreviewRow`, `PrimaryCTA`, `TextButton`.

#### 3.1.8 Activity Attribution Strip

**Цель.** Постоянно держать household-членов в курсе последних действий друг друга.

**Layout.** Тонкая полоска под header Today/Timeline, height 36pt, fill `#FFFFFF`, 1pt bottom border. Внутри — текст 14pt charcoal 80%, single line, trailing — относительное время 13pt charcoal 50%.

**Копия (примеры для разных action types).**
- Feeding: «Опекун A покормила {имя} — 12 мин назад»
- Potty: «Опекун A отметила туалет — 4 мин назад»
- Walk: «Владелец A вернулся с прогулки — 1 ч назад»
- Reminder created: «Опекун A добавила напоминание — только что»
- Note: «Владелец A оставил заметку — 30 мин назад»
- Health log: «Владелец A записал визит к ветеринару — 2 ч назад»
- Sitter completion: «Опекун A (ситтер): {имя} накормлен — 6 мин назад»

Если действий не было > 6 часов — strip скрывается.

**Состояния.**
- *empty* — strip скрыт.
- *single-user household* — strip скрыт.
- *loading* — skeleton 16pt × 200pt.
- *stale* (>6 ч) — скрыт.

**Микро-взаимодействия.** Tap на strip — переход в Timeline с auto-scroll к этому событию. Auto-update без анимации (тихая замена текста) с лёгкой 200 ms cross-fade.

**Accessibility.** Strip — `accessibilityLiveRegion: polite`.

**Компоненты.** `AttributionStrip`.

### 3.2 Trusted Sitter Mode

#### 3.2.1 Enable Sitter Mode

**Цель.** Owner временно расширяет существующего caregiver до sitter с checklist и push-completion.

```
+----------------------------------------------------------+
| <  Режим ситтера                                         |
|                                                          |
|  Назначить ситтера на время                              |
|  Опекун A будет видеть чеклист и получать напоминания.        |
|                                                          |
|  Кто                                                     |
|  +----------------------------------------------------+  |
|  | Опекун A                            Опекун              |  |
|  +----------------------------------------------------+  |
|                                                          |
|  С какого по какое                                       |
|  +----------------------------------------------------+  |
|  | Начало      17 мая, 18:00                          |  |
|  | Конец       19 мая, 09:00                          |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Чеклист                                                 |
|  [x] Кормления (3/день)                                  |
|  [x] Прогулки (3/день)                                   |
|  [x] Туалет — отмечать выходы                            |
|  [ ] Лекарства                                           |
|  [ ] Тренировки                                          |
|                                                          |
|  Что увидит ситтер                                       |
|  +----------------------------------------------------+  |
|  |  • Сегодня и таймлайн                              |  |
|  |  • Чеклист и напоминания на её устройстве          |  |
|  |  Не увидит: подписку, личные настройки,            |  |
|  |  приватные расшаривания (тренер, карточки)         |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Вы можете завершить режим в любой момент.               |
|                                                          |
|  [ Включить режим ситтера ]                              |
+----------------------------------------------------------+
```

**Состояния.**
- *no-caregiver* — empty state: «Сначала пригласите опекуна. Режим ситтера расширяет уже существующего опекуна.» + CTA «Пригласить опекуна».
- *single caregiver, pending invite* — disabled primary + подсказка «Ждём, пока Опекун A примет приглашение.»
- *ready* — основной.
- *already-active* — экран превращается в management view с большой кнопкой «Завершить режим ситтера».
- *error* — toast.

**Микро-взаимодействия.** Primary disabled пока: caregiver выбран, период валиден (end > start, оба в будущем не далее +14 дней), хотя бы один checklist item включён. Включение режима — success haptic.

**Компоненты.** `MemberPicker`, `DateRangePicker`, `ChecklistRow`, `IncludedExcludedPreview`, `PrimaryCTA`.

#### 3.2.2 Sitter Checklist View

```
+----------------------------------------------------------+
| Сегодня • {имя}                              [ситтер]    |
|                                                          |
|  Режим ситтера до 19 мая, 09:00                          |
|                                                          |
|  Сейчас                                                  |
|  +----------------------------------------------------+  |
|  | Прогулка через 20 минут                            |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Сегодня осталось                                        |
|  [ ] Кормление 18:00                                     |
|  [ ] Прогулка 18:30                                      |
|  [ ] Кормление 22:00                                     |
|                                                          |
|  Сделано                                                 |
|  [x] Прогулка 13:00 — Опекун A                                |
|  [x] Кормление 12:00 — Опекун A                               |
|                                                          |
|  [ Открыть таймлайн ]                                    |
+----------------------------------------------------------+
```

Top-strip amber 4 pt с подписью срока. Chip «ситтер» — amber вариант.

**Состояния.**
- *loading* — skeleton 5 строк.
- *empty checklist* — «На сегодня заданий нет. Можно отмечать события через таймлайн.»
- *expired* — full-screen neutral: «Режим ситтера завершён. Спасибо!»
- *revoked-early* — тот же neutral.
- *error* — banner retry.
- *no-network* — «Нет связи. Отметки сохранятся и отправятся позже.»

**Копия.**
- «Режим ситтера до {дата, время}»
- Секции: «Сейчас», «Сегодня осталось», «Сделано»
- Completion success in-app: после tap checklist item — inline label «Готово. Владелец A получил уведомление.»
- Exit neutral: «Режим ситтера завершён. Спасибо!»

**Микро-взаимодействия.** Tap checklist item — selection haptic, чекбокс заполняется teal с 240 ms tick-animation, item уезжает в секцию «Сделано» через 360 ms.

**Компоненты.** `RoleChip` (sitter variant), `SitterDeadlineStrip`, `ChecklistRow`, `SectionHeader`, `NeutralEmptyState`.

#### 3.2.3 Owner Completion Updates

```
+----------------------------------------------------------+
|  Режим ситтера активен                                   |
|  Опекун A • до 19 мая, 09:00                                  |
|                                                          |
|  Последнее: Опекун A накормила {имя} — 6 мин назад            |
|                                                          |
|  Сегодня выполнено: 3 из 6                               |
|  [################........]                              |
|                                                          |
|  [ Открыть детали ]                                      |
+----------------------------------------------------------+
```

Progress bar 6 pt height, fill amber, track default stroke.

**Состояния.**
- *active, no events yet* — «Пока без отметок. Опекун A начнёт скоро.»
- *active, in-progress* — основной.
- *active, all done* — «Сегодня всё выполнено.»
- *expired* — карточка заменяется кратким summary «Режим ситтера завершён. 11 из 12 пунктов выполнено.»
- *error* — обычный data-error fallback.

**Микро-взаимодействия.** При получении push completion (единственное push-исключение sharing-флоу — помимо локальных Reminders из §4.2.4, которые являются основной push-категорией продукта; sharing-события сами по себе push не вызывают, sitter completion — единственное исключение) карточка обновляется с 200 ms cross-fade.

**Accessibility.** Progress bar — `accessibilityRole: progressbar`, value «3 из 6, 50 процентов». Карточка как whole — `accessibilityLiveRegion: polite`.

**Компоненты.** `SitterStatusCard`, `ProgressBar`, `ScopeStripe` (amber).

#### 3.2.4 Exit Sitter Mode / Auto-expire

```
+----------------------------------------------------------+
|                       ----                               |
|                                                          |
|  Завершить режим ситтера?                                |
|                                                          |
|  Опекун A останется опекуном и сможет отмечать события,       |
|  но без чеклиста и без уведомлений вам о выполнении.     |
|                                                          |
|  [ Завершить режим ]                                     |
|  [ Отмена ]                                              |
+----------------------------------------------------------+
```

**Состояния.**
- *manual exit confirm* — sheet выше.
- *auto-expired* — silent transition в момент `end`. На Today owner — toast «Режим ситтера завершён.» На устройстве ситтера — neutral state.
- *error* — toast «Не удалось завершить. Попробуйте ещё раз.»

**Микро-взаимодействия.** Warning haptic при открытии sheet, success haptic после exit.

**Компоненты.** `ConfirmSheet`, `Toast`.

### 3.3 Trainer / Kinologist Sharing

#### 3.3.1 Entry Point + "Share with trainer" CTA

**Цель.** Дать owner осознанный вход в trainer-share, который НЕ ощущается как «добавить ещё одного члена household».

```
+----------------------------------------------------------+
|  +----------------------------------------------------+  |
|  | Поделиться прогрессом с тренером                   |  |
|  | Тренер увидит только то, что вы выберете —         |  |
|  | без полного household-доступа.                     |  |
|  |                                                    |  |
|  | [ Настроить доступ ]      [ Не сейчас ]            |  |
|  +----------------------------------------------------+  |
+----------------------------------------------------------+
```

**Состояния.** Single-state карточка с dismiss-cooldown 30 дней. Если есть активный trainer-share — карточка не показывается, в More виден row «Тренер: активный доступ».

**Копия.**
- «Поделиться прогрессом с тренером»
- «Тренер увидит только то, что вы выберете — без полного household-доступа.»
- CTA: «Настроить доступ», secondary: «Не сейчас»
- More row label: «Поделиться с тренером»

**Компоненты.** `PromptCard`, `MoreRow`.

#### 3.3.2 Permission Scope Selector

**Цель.** Дать owner выбрать ровно те скоупы, которые он готов раскрыть, с моментальным included/excluded preview под каждым.

```
+----------------------------------------------------------+
| <  Доступ для тренера                                    |
|                                                          |
|  Выберите, что увидит тренер. Каждый пункт можно         |
|  включить и выключить отдельно.                          |
|                                                          |
|  | Профиль щенка                              [ on  ]    |
|  |  Включено: имя, возраст, выбранное фото              |
|  |  Не включено: вес, чипирование, контакты владельца   |
|                                                          |
|  | Сводка по режиму дня                       [ on  ]    |
|  |  Включено: счётчики кормлений/прогулок/туалета       |
|  |             за неделю, общие диапазоны времени       |
|  |  Не включено: точные времена, заметки                |
|                                                          |
|  | Таймлайн за период                         [ off ]    |
|  |  Включено: события выбранных типов за выбранные дни  |
|  |  Не включено: свободный текст без вашей отметки      |
|  |  [ Выбрать период и типы > ]                         |
|                                                          |
|  | Заметки по тренировкам                     [ on  ]    |
|  |  Включено: тема и длительность тренировок,           |
|  |             заметки, которые вы пометили как shareable|
|  |  Не включено: приватные заметки                      |
|                                                          |
|  | Здоровье — краткая сводка                  [ off ]    |
|  |  Включено: название записи, статус, дата             |
|  |  Не включено: заметки, контакты ветеринара, фото     |
|  |  Этот пункт по умолчанию выключен.                   |
|                                                          |
|  [ Продолжить ]                                          |
+----------------------------------------------------------+
```

Каждая карточка скоупа — `ScopeToggleRow`: ScopeStripe 3pt слева (цвет по скоупу), padding 16pt, radius 12pt, fill `#FFFFFF`. Внутри:
- Заголовок 17pt SF Semibold + iOS toggle справа.
- Included-блок (teal dot 6pt + текст 14pt).
- Excluded-блок (charcoal 50% dot 6pt + текст 14pt).
- Опционально inline-настройки (период, типы).

`health_summary` — единственный с visible disclosure под excluded: «Этот пункт по умолчанию выключен.»

**Состояния.**
- *all off* — primary disabled + helper «Включите хотя бы один пункт, чтобы продолжить.»
- *some on* — primary enabled.
- *timeline range required* — если timeline on, но период не выбран → inline error «Выберите период и хотя бы один тип события», primary disabled.
- *loading* — skeleton всех скоупов.
- *error* — toast.

**Микро-взаимодействия.** Toggle — selection haptic. Включение `health_summary` показывает one-time inline disclosure: «Тренер увидит даты и статусы, без заметок и контактов. Это можно изменить позже.»

**Accessibility.** Каждый `ScopeToggleRow` — single accessibility element. При toggle — announce «Здоровье включено» / «Здоровье выключено».

**Компоненты.** `ScopeToggleRow`, `ScopeStripe`, `IncludedExcludedPreview` (compact), `RangePickerInline`, `PrimaryCTA`.

#### 3.3.3 Permission Preview (final review)

**Цель.** Финальный экран «вот ровно это уйдёт тренеру» с явным включающим утверждением.

```
+----------------------------------------------------------+
| <  Проверьте, что увидит тренер                          |
|                                                          |
|  Этот доступ включает:                                   |
|                                                          |
|  | Профиль щенка                                         |
|  |  {Имя}, 4 месяца, выбранное фото                     |
|                                                          |
|  | Сводка по режиму дня                                  |
|  |  Кормления, прогулки, туалет — счётчики за неделю    |
|                                                          |
|  | Заметки по тренировкам                                |
|  |  Темы и длительности, заметки с пометкой shareable   |
|                                                          |
|  Не включено:                                            |
|  • Точные времена событий                                |
|  • Здоровье                                              |
|  • Контакты владельца и ветеринара                       |
|  • Приватные заметки                                     |
|                                                          |
|  Срок действия                                           |
|  [ 30 дней v ]                                           |
|                                                          |
|  Вы можете закрыть доступ в любой момент.                |
|                                                          |
|  Кому отправить                                          |
|  [ trainer@example.test                                ]  |
|                                                          |
|  [ Отправить приглашение ]                               |
|  [ Скопировать ссылку ]                                  |
+----------------------------------------------------------+
```

«Этот доступ включает» — header 20pt. Каждая включённая карточка — `ScopeStripe` цвет соответствующий, fill `#FFFFFF`, padding 16pt. Список «Не включено» — `NeutralBulletList` (charcoal 60%).

**Состояния.**
- *valid* — основной.
- *editing email* / *sending* / *sent* / *error* — стандартные.

**Копия (hard-locked формулировки).**
- Header: «Этот доступ включает:»
- Excluded: «Не включено:»
- Disclosure: «Вы можете закрыть доступ в любой момент.»
- Expiry варианты: «7 дней», «30 дней», «90 дней», «Без срока (не рекомендуется)» — для последнего inline warning: «Лучше задать срок. Ссылка без срока живёт, пока вы её сами не закроете.»
- CTA: «Отправить приглашение», «Скопировать ссылку»

**Микро-взаимодействия.** Primary disabled, пока email валиден И expiry выбран. При выборе «Без срока» — warning amber dot inline 8pt, no blocking. Success haptic при send.

**Accessibility.** Header «Этот доступ включает» — `accessibilityRole: header`, объявляется первым. VoiceOver проходит сверху вниз: included scopes → excluded list → expiry → email → CTA. Это «слышимый contract».

**Компоненты.** `IncludedScopeSummary`, `ScopeStripe`, `NeutralBulletList`, `ExpiryPicker`, `TextField`, `PrimaryCTA`, `SecondaryCTA`, `InlineWarning`.

#### 3.3.4 Expiry & Revocation Controls

```
+----------------------------------------------------------+
| <  Доступ для тренера                                    |
|                                                          |
|  Активен                                                 |
|  trainer@example.test                                     |
|  Действует до 16 июня                                    |
|                                                          |
|  Что видит тренер                                        |
|  +----------------------------------------------------+  |
|  | • Профиль щенка                                    |  |
|  | • Сводка по режиму дня                             |  |
|  | • Заметки по тренировкам                           |  |
|  +----------------------------------------------------+  |
|                                                          |
|  [ Изменить, что видит тренер ]                          |
|  [ Продлить срок ]                                       |
|  [ Закрыть доступ ]                                      |
+----------------------------------------------------------+
```

«Закрыть доступ» — red text muted Clay Red.

**Состояния.**
- *active* — основной.
- *expiring-soon* (<3 дня до expiry) — amber strip top: «Срок истекает через 2 дня.»
- *expired* — neutral page: «Срок доступа истёк {дата}. Можно отправить новое приглашение.»
- *revoked* — neutral: «Доступ закрыт {дата}.»
- *error* — toast.

**Копия.**
- «Активен», «Действует до {дата}»
- «Изменить, что видит тренер», «Продлить срок», «Закрыть доступ»
- Confirm-sheet revoke: title «Закрыть доступ тренеру?», body «Ссылка перестанет работать сразу. Если потребуется — можно отправить новое приглашение.», destructive «Закрыть доступ», cancel «Отмена»

**Компоненты.** `StatusHeader`, `IncludedScopeSummary`, `ActionRow`, `ConfirmSheet`, `StatusStrip`.

#### 3.3.5 Trainer-side Accepted View

```
+----------------------------------------------------------+
|  {Имя}                                                   |
|  4 месяца • доступ от Владельца A                            |
|                                                          |
|  Этот доступ включает: профиль, сводка по режиму,        |
|  заметки по тренировкам. Действует до 16 июня.           |
|                                                          |
|  Сводка по режиму (последние 7 дней)                     |
|  +----------------------------------------------------+  |
|  | Кормлений: 21 (3/день)                             |  |
|  | Прогулок: 18 (≈3/день)                             |  |
|  | Туалет: 42 выхода                                  |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Заметки по тренировкам                                  |
|  +----------------------------------------------------+  |
|  | 14 мая • «Сидеть» • 12 мин                         |  |
|  |   Хорошо реагирует на голос                        |  |
|  +----------------------------------------------------+  |
|  | 12 мая • «Место» • 8 мин                           |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Только просмотр. Закрыть доступ может только владелец.  |
+----------------------------------------------------------+
```

Top — info card с включёнными скоупами (compact), 14pt, charcoal 70%. Никаких write-controls на экране.

**Состояния.**
- *loading* — skeleton.
- *empty per scope* — внутри каждого блока «Пока нет данных за этот период».
- *expired* — full-screen neutral (см. 3.3.6).
- *revoked* — full-screen neutral.
- *error* — retry banner.

**Компоненты.** `ScopedHeaderCard`, `SummaryStatsCard`, `TrainingNoteRow`, `ReadOnlyFooter`.

#### 3.3.6 Revoked / Expired Share Screen

**Цель.** Нейтрально и одинаково сообщить тренеру (или любому получателю signed link), что доступа больше нет — без раскрытия причины.

```
+----------------------------------------------------------+
|                                                          |
|              Этот доступ больше недоступен               |
|                                                          |
|         Свяжитесь с владельцем, если нужен новый         |
|         доступ.                                          |
|                                                          |
+----------------------------------------------------------+
```

Title 22pt SF Semibold charcoal, body 15pt charcoal 60%, 24pt gap, centered, max width 320pt.

**Состояния.** Single neutral state. Никогда не различаем revoked vs expired в UI (privacy + symmetry). Loading — skeleton 2 строк.

**Копия.**
- Title: «Этот доступ больше недоступен»
- Body: «Свяжитесь с владельцем, если нужен новый доступ.»
- НЕ используем: «отозван», «истёк», «удалён», «закрыт владельцем» — нейтральная формулировка одна на оба случая.

**Микро-взаимодействия.** Нет haptic, нет CTA. Sole affordance — back / close.

**Компоненты.** `NeutralEmptyState`.

### 3.4 Shareable Puppy Cards

#### 3.4.1 Card Builder

```
+----------------------------------------------------------+
| <  Карточка {имя}                                        |
|                                                          |
|  Что включить в карточку                                 |
|                                                          |
|  [x] Имя и возраст                                       |
|  [x] Фото                                                |
|  [x] Порода                                              |
|  [ ] Вес                                                 |
|  [ ] Дата рождения                                       |
|  [ ] Чипирование (номер чипа)                            |
|  [ ] Прививки — последние записи                         |
|  [ ] Контакт владельца                                   |
|                                                          |
|  Приватные заметки не включаются.                        |
|                                                          |
|  [ Предпросмотр ]                                        |
+----------------------------------------------------------+
```

**Состояния.**
- *empty* (ничего не выбрано) — primary disabled + helper «Выберите хотя бы одно поле.»
- *photo-pending-selection* — если выбран чекбокс «Фото», но фото не задано — inline prompt «Выберите фото для карточки».
- *health on* — inline disclosure 14pt amber dot: «Будут включены только статусы и даты. Без заметок и контактов клиники.»
- *error* — toast.

**Компоненты.** `ScopeToggleRow` (compact, без preview), `InlineDisclosure`, `PrimaryCTA`.

#### 3.4.2 Card Preview

```
+----------------------------------------------------------+
| <  Предпросмотр                                          |
|                                                          |
|  +----------------------------------------------------+  |
|  |   [фото]                                           |  |
|  |                                                    |  |
|  |   {Имя}                                            |  |
|  |   Лабрадор • 4 месяца                              |  |
|  |                                                    |  |
|  |   Прививки                                         |  |
|  |   • DHPP — 12 апреля                               |  |
|  |   • Бешенство — 5 мая                              |  |
|  |                                                    |  |
|  |   PuppyPlan                                        |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Это всё, что увидит получатель.                         |
|                                                          |
|  [ Изменить ]                                            |
|  [ Поделиться ]                                          |
+----------------------------------------------------------+
```

Карточка — visually-rendered preview, aspect ratio 3:4, radius 16pt, soft shadow.

**Микро-взаимодействия.** Tap «Поделиться» → 3.4.3. Long-press на preview — нет действия.

**Accessibility.** Preview карточка — single accessibility element с полным текстовым содержанием.

**Компоненты.** `PuppyCardRenderer`, `PrimaryCTA`, `TextButton`.

#### 3.4.3 Share Options

```
+----------------------------------------------------------+
|                       ----                               |
|                                                          |
|  Как поделиться                                          |
|                                                          |
|  +----------------------------------------------------+  |
|  | Ссылка с возможностью закрыть                      |  |
|  | Получатель открывает онлайн. Вы можете закрыть     |  |
|  | доступ в любой момент. Срок обязателен.            |  |
|  +----------------------------------------------------+  |
|                                                          |
|  +----------------------------------------------------+  |
|  | Картинка / файл                                    |  |
|  | Снимок карточки, который нельзя отозвать после     |  |
|  | отправки.                                          |  |
|  +----------------------------------------------------+  |
|                                                          |
|  [ Отмена ]                                              |
+----------------------------------------------------------+
```

**Микро-взаимодействия.** После создания link — success haptic + auto-copy в clipboard + toast «Ссылка скопирована».

**Accessibility.** Каждая опция — single element с полным описанием trade-off. Это критично: пользователь должен «услышать» разницу revocable vs snapshot до выбора.

**Компоненты.** `BottomSheet`, `OptionCard`, `Toast`.

#### 3.4.4 Expiry + Revoke Controls

```
+----------------------------------------------------------+
| <  Поделённые карточки                                   |
|                                                          |
|  Активные                                                |
|  +----------------------------------------------------+  |
|  | Карточка {имя} для ветеринара                      |  |
|  | Действует до 24 мая                          ...   |  |
|  +----------------------------------------------------+  |
|  | Карточка {имя} для школы                           |  |
|  | Истекает через 2 дня                         ...   |  |
|  +----------------------------------------------------+  |
|                                                          |
|  История                                                 |
|  +----------------------------------------------------+  |
|  | Карточка для груминга                              |  |
|  | Доступ закрыт 12 мая                               |  |
|  +----------------------------------------------------+  |
+----------------------------------------------------------+
```

Overflow: «Скопировать ссылку», «Продлить срок», «Закрыть доступ».

**Копия.**
- Section headers: «Активные», «История»
- Status строки: «Действует до {дата}», «Истекает через {n} дней», «Доступ закрыт {дата}»
- Confirm revoke sheet: title «Закрыть доступ к карточке?», body «Ссылка перестанет работать сразу. Снимки и файлы, которые вы уже отправили, останутся у получателя.», destructive «Закрыть доступ», cancel «Отмена»
- Public-link disclosure (inside card detail): «Любой, у кого есть ссылка, видит выбранные поля. Срок и закрытие доступа — обязательны.»

**Компоненты.** `ShareLinkRow`, `OverflowMenu`, `ConfirmSheet`, `SectionHeader`, `EmptyStateBlock`.

### 3.5 Сквозной паттерн — Contract Card

Любой share/invite экран PuppyPlan следует единому паттерну:

1. **Header** — «Этот доступ включает» / «Что вам будет доступно» / «Что увидит {роль}».
2. **Included list** — каждый item с ScopeStripe соответствующего цвета.
3. **Excluded list** — neutral bullets, заголовок «Не включено» / «Чего не будет».
4. **Срок** — обязательный для public/signed-link share.
5. **Disclosure** — «Вы можете закрыть доступ в любой момент» (или role-specific).
6. **CTA** — нейтральный «Отправить» / «Принять» / «Поделиться».

Любой revoked/expired экран — единая `NeutralEmptyState` с фразой «Этот доступ больше недоступен» и без раскрытия причины. Это гарантирует privacy симметрию и одну инвариантную точку, к которой может сходить любой recovered link.

---

## Часть 4. Records & Settings — Health, Reminders, Guidance, More Tab

Эта секция собирает «спокойную» часть приложения: записи о здоровье, напоминания, обучающие карточки и системные настройки. Везде сохраняется принцип calm utility: медицинские формулировки нейтральны, urgency возникает только если её отметил сам пользователь, и ни один экран не пытается заменить ветеринара.

Общие токены (синхронизированы с Частью 1):
- `bg/surface` ≡ `surface/base` (`#FBFAF7`)
- `bg/card` ≡ `surface/raised` (`#FFFFFF`)
- `text/primary` (`#1C1F1B`)
- `text/secondary` (`#4A4E48`)
- `accent/primary` (`#0E7490`)
- `accent/celebration` (`#E07A4F`)
- Health-status pill tokens — см. §1.2.7 (Часть 1). Часть 4 НЕ переопределяет pill-токены; `pill/confirmed` = fill `#E6EFE8` / text `#2F5E41` (не `#3F7A57` — это `status/success` для других контекстов). Прежняя локальная таблица в этой секции удалена; используйте §1.2.7 как источник истины.
- `divider` (`#E2DDD2`)
- Радиусы: card 12, pill 8, sheet top 16
- Spacing tokens: `s/4`, `s/8`, `s/12`, `s/16`, `s/20`, `s/24`

Shared library: `ListRow`, `StatusPill`, `SectionHeader`, `EmptyState`, `OfflineBanner`, `PendingDot`, `PrimaryButton`, `GhostButton`, `BottomSheet`, `SegmentedControl`, `IconLabel`, `Toast`, `DestructiveConfirm`, `PermissionCalmState`.

### 4.1 Health

#### 4.1.1 Health Tab Anatomy

**Цель.** Дать спокойный, читаемый журнал прививок, обработок и визитов без ощущения «медицинской панели тревоги».

```
+----------------------------------------------------------+
| 11pt status bar                                          |
| 44pt nav: "Здоровье"            [+]                      |
+----------------------------------------------------------+
| Segmented (36pt): Все | Прививки | Обработки | Визиты    |
| s/12                                                     |
| Filter chips row (28pt): Шаблоны  Подтверждено  Готово   |
| s/16                                                     |
+----------------------------------------------------------+
| SectionHeader "Май 2026"                       s/8       |
|                                                          |
|  ListRow (Health) 72pt                                   |
|  ----------------------------------------------          |
|  ListRow (Health) 72pt                                   |
|                                                          |
| SectionHeader "Апрель 2026"                              |
|  ListRow (Health) 72pt                                   |
+----------------------------------------------------------+
| Footer hint (12pt):                                      |
| "Это журнал записей, а не медицинская консультация."     |
+----------------------------------------------------------+
```

**Состояния.**
- loading: 3 skeleton rows (72pt), shimmer 1.2 s.
- empty: см. 4.1.8.
- error: inline card «Не удалось загрузить записи. Попробуйте обновить.» + GhostButton «Обновить».
- offline: `OfflineBanner` сверху, контент остаётся.
- pending: на конкретной row — `PendingDot` слева от title.

**Копия.**
- Title: «Здоровье».
- Empty hint в футере: «Это журнал записей, а не медицинская консультация».
- Filter labels: «Все», «Прививки», «Обработки», «Визиты», «Шаблоны», «Подтверждено», «Готово».

**Компоненты.** `SegmentedControl`, `Chip`, `SectionHeader`, `ListRow`, `OfflineBanner`, `PendingDot`.

#### 4.1.2 Health Record List Item

```
+----------------------------------------------------------+
| s/16                                                     |
| [Icon 24] Title 17pt/SemiBold                            |
|           StatusPill  ·  12 мая  ·  Источник             |
|           (опц.) "Обсудите с ветеринаром"                |
| s/16                                                     |
+----------------------------------------------------------+
```

**Status pill матрица** (цвет + icon + text):
- Template — sand bg, icon «doc.text», label «Шаблон».
- Needs vet review — ochre bg, icon «stethoscope», label «Уточнить с ветом».
- Confirmed — muted teal bg, icon «checkmark.seal», label «Подтверждено».
- Completed — slate-green bg, icon «checkmark.circle», label «Готово».

**Template visual.** Под pill — мелкая строка 12pt secondary: «Шаблон, не предписание».

**Confirmed visual.** Дата выполнения вынесена в metadata-строку: «Выполнено 12 мая · Клиника не указана» (если provider пуст).

**Состояния.**
- loading: skeleton полоски на title и meta.
- pending: `PendingDot` слева, subdued title.
- error (per row): icon `exclamationmark.circle` (muted ochre, не красный) + строка «Изменения не синхронизированы. Повторить».

**Микро-взаимодействия.**
- Tap → detail sheet.
- Swipe left: `Изменить` (teal), `Удалить` (muted, не алый).
- Long-press: контекстное меню `Изменить`, `Дублировать`, `Удалить`.

**Accessibility.**
- VoiceOver: «Вакцина DHPP, статус подтверждено, выполнено 12 мая, источник подтверждено вами».
- Status pill — `accessibilityLabel` совпадает с visible text; иконка `decorative`.

**Компоненты.** `ListRow`, `StatusPill`, `IconLabel`, `PendingDot`.

#### 4.1.3 Add Record Flow

**Шаг 1 — Record type chooser (BottomSheet, 60% height).**
```
+----------------------------------------------------------+
| Grabber                                                  |
| "Новая запись"                          [Закрыть]        |
| s/16                                                     |
| ListRow: Вакцинация                       [chevron]      |
| ListRow: Обработка от паразитов           [chevron]      |
| ListRow: Профилактика                     [chevron]      |
| ListRow: Визит к ветеринару               [chevron]      |
| s/16                                                     |
| Hint: "Можно добавить позже из шаблона."                 |
+----------------------------------------------------------+
```

**Шаг 2 — Form (full-screen sheet).**
```
+----------------------------------------------------------+
| Cancel        Новая запись              Сохранить        |
+----------------------------------------------------------+
| SectionHeader "Основное"                                 |
| Field: Название                                          |
| Field: Дата (date picker, default — сегодня)             |
| Field: Статус (segmented: Шаблон/Подтверждено/Готово)    |
|                                                          |
| SectionHeader "Дополнительно"                            |
| Field: Клиника или ветеринар (опционально)               |
| Field: Заметка (опционально)                             |
| Toggle: "Отметить как срочное" (off by default)          |
|                                                          |
| Hint 12pt: "Заметки видны только вам и приглашённым      |
| членам семьи."                                           |
+----------------------------------------------------------+
```

**Состояния.**
- loading: Save button → spinner.
- empty: save disabled пока нет title и date.
- error: inline под полем «Проверьте дату».
- offline: баннер «Сохраним, как только появится сеть».
- pending: после save row показывается с `PendingDot`.

**Копия.**
- Title sheet: «Новая запись».
- Save: «Сохранить».
- Заметка hint: «Заметка не используется в аналитике».
- Urgent toggle: «Отметить как срочное». Под ним 12pt: «Используйте, если уже договорились с ветеринаром».

**Микро-взаимодействия.**
- Haptic `selection` при выборе типа.
- При включении «срочное» — лёгкий fade `status/needs-review` фона у preview pill (без красного).
- Save → haptic `success`, sheet закрывается, Toast «Запись сохранена».

**Компоненты.** `BottomSheet`, `ListRow`, `SegmentedControl`, `TextField`, `DatePicker`, `Toggle`, `PrimaryButton`, `Toast`.

#### 4.1.4 Edit Record / Delete (Undo)

```
+----------------------------------------------------------+
| < Назад      Запись                         Изменить     |
+----------------------------------------------------------+
| Title 22pt                                               |
| StatusPill · Дата · Источник                             |
| s/16                                                     |
| SectionHeader "Детали"                                   |
| Клиника: —                                               |
| Заметка: ...                                             |
| s/16                                                     |
| SectionHeader "История"                                  |
| "Изменено вами · 14 мая"                                 |
| s/24                                                     |
| GhostButton (destructive muted): "Удалить запись"        |
+----------------------------------------------------------+
```

**Delete confirm.**
- Title: «Удалить эту запись?»
- Body: «Запись исчезнет из журнала. Вы сможете отменить в течение 5 секунд».
- Buttons: `Отмена` (ghost), `Удалить` (muted ochre, not red).

**Undo Toast** (bottom, 5 s): «Запись удалена. Отменить».

**Микро-взаимодействия.**
- Haptic `warning` (soft) перед confirm.
- Undo restores с `notification(.success)`.

**Компоненты.** `DestructiveConfirm`, `Toast`, `GhostButton`.

#### 4.1.5 Template Suggestion Card

```
+----------------------------------------------------------+
| [Icon doc.text]  "Шаблон: DHPP, 12 недель"               |
| s/4                                                      |
| 13pt secondary: "Шаблон, не предписание."                |
| 13pt secondary: "Обсудите с ветеринаром."                |
| s/12                                                     |
| [GhostButton: "Скрыть"] [PrimaryButton: "Добавить"]      |
+----------------------------------------------------------+
```

**Состояния.**
- pending: после tap «Добавить» карточка превращается в обычный row с `PendingDot`.
- disabled: «Добавить» disabled, если такая запись уже существует.

**Копия.**
- Header: «Шаблон: DHPP, 12 недель».
- Хедер раздела: «Подсказки по записям».
- Footnote раздела: «Это типовые шаблоны. Решение всегда за вашим ветеринаром».

**Компоненты.** `Card`, `IconLabel`, `GhostButton`, `PrimaryButton`.

#### 4.1.6 Status Transitions Visualisation

```
+----------------------------------------------------------+
|  o------o------o------o                                  |
|  |      |      |      |                                  |
| Шаблон  К ветy Подтв. Готово                             |
|  sand   ochre  teal   slate-green                        |
+----------------------------------------------------------+
| Текущий статус подсвечен сплошной заливкой,              |
| остальные — outline.                                     |
+----------------------------------------------------------+
```

**Копия.**
- Подписи: «Шаблон», «К ветеринару», «Подтверждено», «Готово».
- Hint под timeline: «Можно изменить вручную в любое время».

**Accessibility.** VoiceOver объявляет всю последовательность: «Этап 3 из 4: подтверждено. Доступны: шаблон, к ветеринару, подтверждено, готово». Не полагаемся на цвет: каждый этап имеет иконку и подпись.

**Компоненты.** `TimelineStrip`, `BottomSheet`.

#### 4.1.7 Vet Visit Prep Card

```
+----------------------------------------------------------+
| "Подготовка к визиту"                                    |
| 15pt secondary: "Визит 18 мая, 10:00"                    |
| s/12                                                     |
| Checklist (rows 36pt):                                   |
|  [ ] Взять предыдущие записи о прививках                 |
|  [ ] Список вопросов ветеринару                          |
|  [ ] Любимое лакомство щенка                             |
|  [ ] Поводок и переноска                                 |
| s/12                                                     |
| GhostButton "Добавить пункт"                             |
+----------------------------------------------------------+
```

**Копия.** Hint снизу: «Это памятка, а не инструкция от ветеринара».

**Компоненты.** `Card`, `Checklist`, `GhostButton`.

#### 4.1.8 Empty Health State

```
+----------------------------------------------------------+
|                                                          |
|             [Illustration placeholder 160x120]           |
|             (warm off-white shape, line icon)            |
|                                                          |
|  "Пока нет записей"   20pt SemiBold, charcoal            |
|  15pt secondary, centered:                               |
|  "Добавьте первую прививку, обработку или визит,         |
|   чтобы видеть историю в одном месте."                   |
|                                                          |
|  [PrimaryButton: "Добавить запись"]                      |
|  [GhostButton:   "Посмотреть шаблоны"]                   |
+----------------------------------------------------------+
```

**Компоненты.** `EmptyState`, `PrimaryButton`, `GhostButton`.

#### 4.1.9 Health → Share Preview Behaviour

```
+----------------------------------------------------------+
| "Что увидит получатель"                                  |
| Scope: health_summary                                    |
+----------------------------------------------------------+
| Видно:                                                   |
|  - Тип записи (прививка / обработка / визит)             |
|  - Статус (шаблон / подтверждено / готово)               |
|  - Дата                                                  |
|                                                          |
| Не передаётся:                                           |
|  - Клиника и имя ветеринара                              |
|  - Заметки                                               |
|  - Фотографии                                            |
+----------------------------------------------------------+
| Toggle: "Включить клинику и заметки" (off by default)    |
+----------------------------------------------------------+
| [PrimaryButton: "Отправить"]                             |
+----------------------------------------------------------+
```

**Копия.** Никаких «WARNING». Только «Видно» / «Не передаётся».

**Микро-взаимодействия.** Toggle на чувствительные поля — haptic `warning` (soft), inline hint «Поделитесь только при необходимости».

**Компоненты.** `BottomSheet`, `Toggle`, `PrimaryButton`, `ListRow`.

### 4.2 Reminders

#### 4.2.1 Reminders Hub

```
+----------------------------------------------------------+
| < Ещё       Напоминания                       [+]       |
+----------------------------------------------------------+
| SegmentedControl: Активные | Выключенные                 |
| s/12                                                     |
| SectionHeader "Кормление"                                |
|  ListRow 64pt: "Утро · 07:30" [Toggle on]                |
|  ListRow 64pt: "Вечер · 19:00" [Toggle on]               |
|                                                          |
| SectionHeader "Здоровье"                                 |
|  ListRow 64pt: "DHPP · обсудить с ветом" [Toggle on]     |
|                                                          |
| SectionHeader "Доверенный ситтер"                        |
|  ListRow: "Чек-лист на вечер" [Toggle on]                |
+----------------------------------------------------------+
| Footer 12pt: "Тихие часы — в Настройках уведомлений."    |
+----------------------------------------------------------+
```

**Состояния.**
- loading / empty / error / offline / pending / permission-denied: см. 4.2.7 для denied.
- empty: «Здесь будут ваши напоминания».
- disabled: row выключен — title secondary, toggle off, subdued.

**Микро-взаимодействия.**
- Toggle — haptic `selection`, мгновенный optimistic update + `PendingDot` если offline.
- Swipe left на row — «Изменить», «Удалить».

**Компоненты.** `SegmentedControl`, `SectionHeader`, `ListRow`, `Toggle`.

#### 4.2.2 Create / Edit Reminder Form

```
+----------------------------------------------------------+
| Cancel       Новое напоминание           Сохранить       |
+----------------------------------------------------------+
| Field: Название                                          |
| Picker: Категория (Кормление / Туалет / Сон / Здоровье   |
|                    / Ситтер / Другое)                    |
| Picker: Время                                            |
| Picker: Повторение (Каждый день / Будни / Свой график)   |
| Picker: Часовой пояс (автоматически: Europe/Berlin)      |
| Toggle: Учитывать тихие часы                             |
| Toggle: Звук                                             |
|                                                          |
| Hint: "Напоминание сработает локально на этом            |
| устройстве. Подключите push в Настройках, чтобы          |
| получать его даже когда приложение закрыто."             |
+----------------------------------------------------------+
```

**Состояния.**
- error: inline «Выберите хотя бы один день».
- pending: Save → spinner.
- permission-denied: верхний баннер calm: «Уведомления выключены. Напоминание сохранится, но не прозвонит».
- disabled: Save disabled пока нет title и time.

**Копия.** Категория «Здоровье» имеет hint: «Используется для напоминаний обсудить запись с ветеринаром».

**Компоненты.** `TextField`, `Picker`, `Toggle`, `Banner`.

#### 4.2.3 Quiet Hours Picker

```
+----------------------------------------------------------+
| "Тихие часы"                                             |
| s/16                                                     |
| Range slider: с 22:00 до 07:00                           |
| (две дуги, calm teal track, charcoal handles)            |
| s/16                                                     |
| Toggle: "Применять только к этому щенку"                 |
| s/12                                                     |
| Hint: "В тихие часы напоминания не звучат,               |
| но появляются на экране утром."                          |
+----------------------------------------------------------+
| [PrimaryButton: "Сохранить"]                             |
+----------------------------------------------------------+
```

**Состояния.** error: «Окно тишины должно быть не короче 30 минут».

**Компоненты.** `BottomSheet`, `RangeSlider`, `Toggle`, `PrimaryButton`.

#### 4.2.4 Reminder Notification UI

```
+----------------------------------------------------------+
| PuppyPlan · сейчас                                       |
| "Кормление: 07:30"                                       |
| "Мягкое начало дня для {имя}."                           |
| Actions: [Готово] [Отложить 10 мин] [Пропустить]         |
+----------------------------------------------------------+
```

**Копия.**
- Title по категории: «Кормление», «Прогулка / туалет», «Сон», «Здоровье: обсудить с ветом», «Ситтер: вечерний чек-лист».
- Body — мягкий tone, без «не забудьте!».

**Компоненты.** Native iOS `UNNotificationCategory` с тремя actions.

#### 4.2.5 Reminder Card на Today

```
+----------------------------------------------------------+
| [Icon] Кормление · 07:30                                 |
| 13pt secondary: "Мягкое начало дня"                      |
| s/12                                                     |
| [Готово] [Отложить] [Пропустить] [Изменить] [Стоп]       |
+----------------------------------------------------------+
```

Кнопки — 28pt `PillButton` (см. §1.9.x), все равного веса (это notification-style action set, не hero CTA), выровнены в 2 ряда если узко. Reminder Card — не hero, поэтому исключение из one-primary правила §1.1: action set реплицирует native iOS notification action chips, где визуальная иерархия равна по дизайну. Hero на Today по-прежнему держит ровно один primary CTA.

**Состояния.**
- pending: после tap кнопки — fade + `PendingDot`.
- done: card сворачивается в slim summary 36pt «Готово в 07:32».
- snoozed: «Отложено до 07:40», muted.
- skipped: «Пропущено», secondary.

**Копия.** «Стоп» подтверждение: «Выключить это напоминание?» — мягкое.

**Микро-взаимодействия.** Готово — haptic `success`, амбер celebration shimmer 600 ms (subtle). Стоп — `DestructiveConfirm` muted.

**Компоненты.** `Card`, `PillButton`, `PendingDot`, `DestructiveConfirm`.

#### 4.2.6 Trusted Sitter Checklist Reminders

**Differentiation от обычных reminders:**
- Иконка: `person.crop.circle.badge.checkmark`.
- Левая 3pt полоска `accent/primary` на row.
- Source label: «Доверенный ситтер».
- Action set: `Открыть чек-лист`, `Отметить выполненным целиком`, `Пропустить`.

```
+----------------------------------------------------------+
| | [Icon] Чек-лист на вечер · 19:00                       |
| | 13pt: "3 пункта · ситтер: Владелец A"                         |
| | s/12                                                   |
| | Progress bar 4pt (teal, 1/3)                           |
| | [Открыть чек-лист] [Отложить]                          |
+----------------------------------------------------------+
```

**Состояния.**
- completed: «Готово · 19:24 · Владелец A». Push «trusted-sitter completion» уходит владельцу.
- pending sync: `PendingDot`.

**Компоненты.** `Card`, `ProgressBar`, `IconLabel`.

#### 4.2.7 Push Permission Denied — Calm In-App State

```
+----------------------------------------------------------+
| [Icon bell.slash] "Уведомления выключены"                |
| 13pt secondary:                                          |
| "Напоминания работают внутри приложения, но не           |
| прозвонят, пока экран закрыт."                           |
| [GhostButton: "Как включить"]                            |
+----------------------------------------------------------+
```

**Поведение.**
- Не модальный alert, не блокирует функционал.
- «Как включить» открывает мягкий шаг-гид с диплинком в Settings.

**Копия.** Никаких «вам нужны уведомления, иначе всё сломается». «Напоминания всё равно создаются и видны в приложении».

**Компоненты.** `Banner`, `PermissionCalmState`, `GhostButton`.

#### 4.2.8 Missed Reminder Handling

```
+----------------------------------------------------------+
| SectionHeader "Пропущено сегодня"                        |
|  ListRow 56pt: "Кормление 07:30 · не отмечено"           |
|   [Отметить готово] [Пропустить]                         |
+----------------------------------------------------------+
```

**Копия.**
- «Пропущено сегодня».
- Никаких «вы забыли!». Только «не отмечено».
- Если повторяется 3+ дня: спокойный hint «Можно перенести время или выключить напоминание».

**Компоненты.** `SectionHeader`, `ListRow`, `PillButton`.

### 4.3 Starter Guidance Cards

#### 4.3.1 Guidance Card Anatomy (in Today)

```
+----------------------------------------------------------+
| [Eyebrow 12pt secondary] "Совет дня · 3 из 14"           |
| Title 18pt SemiBold "Первая ночь дома"                   |
| Body 15pt 3-4 lines, charcoal:                           |
| "Поставьте лежак рядом с кроватью. Если щенок            |
|  тихо ворчит — это нормально для первой ночи."           |
| s/12                                                     |
| [GhostButton: "Прочитано"] [GhostButton: "Попробовал"]   |
| [GhostButton: "Пропустить"]                              |
+----------------------------------------------------------+
```

**Состояния.**
- loading: skeleton title + 3 строки.
- empty: после 14 карточек — слот не показывается.
- read: card сворачивается в slim 44pt «Прочитано: Первая ночь».
- practiced: slim 44pt с амбер dot «Попробовали: Первая ночь».
- skip: card исчезает на сегодня.

**Компоненты.** `Card`, `GhostButton`, `Eyebrow`.

#### 4.3.2 Card States — Read / Practiced / Skip

- Read — slim row, icon `book`, label «Прочитано».
- Practiced — slim row, icon `checkmark.seal`, амбер dot, label «Попробовали».
- Skip — карточка убирается, в Timeline остаётся событие «Совет пропущен».

#### 4.3.3 Topic Examples

**1. First Night.**
- Eyebrow: «Совет дня · 1 из 14».
- Title: «Первая ночь дома».
- Body: «Поставьте лежак рядом с кроватью. Тихое поскуливание — нормально. Голос мягкий, свет приглушённый. Утром — короткий выход на туалет».
- Escalation: «Если щенок дышит часто и не успокаивается — свяжитесь с вашей ветеринарной клиникой».

**2. Potty Rhythm.**
- Title: «Ритм туалета».
- Body: «Маленький щенок просится примерно каждые 1–2 часа и после еды, сна, игры. Похвалите спокойным голосом сразу на улице».
- Escalation: «Если за день нет ни одного мочеиспускания — позвоните в клинику».

**3. Biting.**
- Title: «Прикусывание во время игры».
- Body: «Щенки познают мир пастью. Если зубы коснулись руки — мягко скажите «ай» и сделайте паузу 10 секунд. Затем предложите игрушку».
- Escalation: «Если щенок повторно прокусывает кожу взрослого до боли — обсудите с поведенческим специалистом».

**4. Crate / Settling.**
- Title: «Клетка как тихое место».
- Body: «Клетка — не наказание, а нора. Кладите туда лакомство, оставляйте дверь открытой днём. Сон в клетке начинается с коротких 10 минут».
- Escalation: «Если щенок паникует в клетке более 15 минут — остановите тренировку и обсудите со специалистом».

#### 4.3.4 Escalation Copy Pattern

**Принцип.** Никаких «EMERGENCY», «WARNING», «ALERT». Только спокойное «свяжитесь с вашей ветеринарной клиникой» или «обсудите с поведенческим специалистом».

**Visual.**
- Внутри карточки — отдельный блок 12pt secondary, отделён `divider`, icon `phone` (charcoal, не red).
- Никогда не auto-show modal urgency без user mark.

**Шаблон.** «Если [конкретный признак], свяжитесь с вашей ветеринарной клиникой».

### 4.4 More Tab

#### 4.4.1 More Tab Anatomy

```
+----------------------------------------------------------+
| "Ещё"                                                    |
+----------------------------------------------------------+
| SectionHeader "Щенок"                                    |
|  ListRow: Профиль щенка                  [chevron]       |
|  ListRow: Быстрые трекеры                [chevron]       |
|                                                          |
| SectionHeader "Совместный доступ"                        |
|  ListRow: Семья                          [chevron]       |
|  ListRow: Тренер / ситтер                [chevron]       |
|                                                          |
| SectionHeader "Записи и уведомления"                     |
|  ListRow: Хроника                        [chevron]       |
|  ListRow: Напоминания                    [chevron]       |
|  ListRow: Уведомления                    [chevron]       |
|                                                          |
| SectionHeader "Конфиденциальность"                       |
|  ListRow: Данные и аккаунт               [chevron]       |
|                                                          |
| SectionHeader "Поддержка"                                |
|  ListRow: Помощь                         [chevron]       |
|  ListRow: О приложении                   [chevron]       |
|                                                          |
| (если флаг ON)                                           |
| SectionHeader "Подписка"                                 |
|  ListRow: PuppyPlan Plus                 [chevron]       |
+----------------------------------------------------------+
```

**Принцип.** Sharing, Privacy, Notifications — самостоятельные группы, не спрятаны под «Прочее».

**Компоненты.** `SectionHeader`, `ListRow`.

#### 4.4.2 Puppy Profile Edit

```
+----------------------------------------------------------+
| < Ещё        Профиль щенка                Сохранить      |
+----------------------------------------------------------+
| Avatar (88pt) [Изменить фото]                            |
| Field: Имя                                               |
| Field: Дата рождения / approx.                           |
| Picker: Порода / смесь / неизвестно                      |
| Picker: Пол                                              |
| Field: Вес (опционально)                                 |
| Field: Заметка                                           |
| Hint: "Эти данные используются только внутри             |
| приложения и в общих ссылках, которые вы создаёте."      |
+----------------------------------------------------------+
```

**Состояния.**
- permission-denied: при отказе в Photos — баннер «Доступ к фото выключен. Можно использовать встроенные аватары».
- pending: Save → spinner.

**Микро-взаимодействия.** Avatar tap → action sheet «Сделать фото», «Выбрать из библиотеки», «Использовать иллюстрацию».

**Компоненты.** `AvatarPicker`, `TextField`, `Picker`.

#### 4.4.3 Quick Trackers Settings

```
+----------------------------------------------------------+
| < Ещё   Быстрые трекеры (выбрано 5 из 5)                 |
+----------------------------------------------------------+
| Hint: "Выберите до 5 трекеров для экрана «Сегодня».      |
| Перетаскивайте, чтобы изменить порядок."                 |
| s/16                                                     |
| ListRow (reorderable):                                   |
|  [=] Кормление            [Toggle on]                    |
|  [=] Туалет               [Toggle on]                    |
|  [=] Сон                  [Toggle on]                    |
|  [=] Прогулка             [Toggle on]                    |
|  [=] Вес                  [Toggle on]                    |
|  [=] Игра                 [Toggle off]                   |
|  [=] Кусание              [Toggle off]                   |
+----------------------------------------------------------+
```

**Состояния.** disabled: если выбрано 5 — другие toggles disabled, hint «Сначала выключите один из выбранных».

**Компоненты.** `ReorderableList`, `Toggle`, `PendingDot`.

#### 4.4.4 Notification Preferences

```
+----------------------------------------------------------+
| < Ещё        Уведомления                                 |
+----------------------------------------------------------+
| SectionHeader "Локальные напоминания"                    |
|  ListRow: "Все напоминания"          [Toggle on]         |
|  Hint: "Работают на этом устройстве."                    |
|                                                          |
| SectionHeader "Push на устройство"                       |
|  ListRow: "Напоминания"              [Toggle on]         |
|  ListRow: "Ситтер завершил чек-лист" [Toggle on]         |
|  Hint: "В бете push приходит только для этих             |
|  событий. Активность семьи не присылается."              |
|                                                          |
| SectionHeader "Тихие часы"                               |
|  ListRow: "22:00 – 07:00"            [chevron]           |
|                                                          |
| SectionHeader "Часовой пояс"                             |
|  ListRow: "Europe/Berlin (авто)"     [chevron]           |
+----------------------------------------------------------+
```

**Компоненты.** `Banner`, `ListRow`, `Toggle`.

#### 4.4.5 Privacy & Account

```
+----------------------------------------------------------+
| < Ещё        Данные и аккаунт                            |
+----------------------------------------------------------+
| SectionHeader "Согласия"                                 |
|  ListRow: "Аналитика использования"   [Toggle on/off]    |
|  Hint: "Помогает улучшать приложение.                    |
|  Не связана с разрешением на уведомления."               |
|                                                          |
| SectionHeader "Сбор ошибок"                              |
|  ListRow: "Отчёты об ошибках"         [Toggle on]        |
|  Hint: "Личные данные удаляются перед отправкой."        |
|                                                          |
| SectionHeader "Ваши данные"                              |
|  ListRow: "Экспортировать данные"            [chevron]   |
|                                                          |
| SectionHeader "Аккаунт"                                  |
|  ListRow (destructive muted): "Удалить аккаунт"          |
+----------------------------------------------------------+
```

**Export flow.** Sheet: «Мы соберём ваши записи и пришлём ссылку на ваш email в течение 24 часов».

**Delete flow.**
- Step 1 sheet: «Удаление аккаунта».
  - Body: «Будут удалены ваш профиль, записи щенка, общие ссылки. Это нельзя отменить».
  - Confirm input: введите слово «УДАЛИТЬ».
- Step 2: `DestructiveConfirm` muted ochre.
- Toast после: «Запрос на удаление принят. Мы пришлём подтверждение на email».

**Компоненты.** `Toggle`, `ListRow`, `DestructiveConfirm`, `Toast`.

#### 4.4.6 App Support / Help

```
+----------------------------------------------------------+
| < Ещё        Помощь                                      |
+----------------------------------------------------------+
| SectionHeader "Связь"                                    |
|  ListRow: "Написать в поддержку"   support@puppyplan.app |
|                                                          |
| SectionHeader "Документы"                                |
|  ListRow: "Политика конфиденциальности"  [chevron]       |
|  ListRow: "Условия использования"        [chevron]       |
|                                                          |
| SectionHeader "О приложении"                             |
|  ListRow: "Версия 1.0.0 (beta)"                          |
|  ListRow: "Дисклеймер о здоровье"        [chevron]       |
+----------------------------------------------------------+
```

**Дисклеймер о здоровье (sheet).** «PuppyPlan помогает вести записи и напоминания. Это не медицинская консультация. По любым вопросам здоровья щенка обращайтесь к вашему ветеринару».

#### 4.4.7 Subscription / Paywall Shell (feature-flagged)

**Поведение.**
- Flag OFF (closed beta): пункт скрыт. Entitlement layer существует, но UI не показан.
- Flag ON (public launch): пункт виден, paywall появляется только после value moment.

**Layout paywall (full-screen, flag ON).**
```
+----------------------------------------------------------+
| [Закрыть]                                                |
+----------------------------------------------------------+
| Title 22pt: "PuppyPlan Plus"                             |
| Subtitle 15pt secondary:                                 |
| "Расширенные функции для первых 90 дней."                |
| s/24                                                     |
| Feature list (rows 44pt):                                |
|  [icon] Безлимит общих ссылок                            |
|  [icon] Расширенный экспорт здоровья                     |
|  [icon] Несколько щенков в одном аккаунте                |
| s/16                                                     |
| Plans:                                                   |
|  [Card] "Месяц · 8,99 €"                                 |
|  [Card] "Год · 49,99 € (сэкономьте 53%)"                 |
| s/16                                                     |
| [PrimaryButton: "Подписаться"]                           |
| [GhostButton:  "Восстановить покупки"]                   |
| s/8                                                      |
| Legal 11pt: "Автопродление, отменить можно в App Store." |
+----------------------------------------------------------+
```

**Free vs Premium блок.**

| Бесплатно | Plus |
|---|---|
| Today + Timeline | Всё из «Бесплатно» |
| 1 общий доступ | Безлимит общих доступов |
| Базовый экспорт | Расширенный экспорт здоровья |
| 1 щенок | Несколько щенков |

**Состояния.**
- loading: skeleton на planы.
- offline: «Загрузим тарифы, когда появится сеть». CTA disabled.
- error: «Не удалось загрузить тарифы. Попробуйте обновить».
- pending: после tap «Подписаться» — spinner в кнопке.
- cancellation state: row в Subscription «Подписка активна до 18 июня 2026. Управление в App Store».

**Accessibility.**
- VoiceOver объявляет цену и период полностью: «Год, 49 евро 99 центов, экономия 53 процента».
- «Восстановить покупки» — отдельная кнопка, не спрятана.

**Компоненты.** `PlanCard`, `PrimaryButton`, `GhostButton`, `Toast`.

### 4.5 Global Empty / Offline / Error Patterns

#### 4.5.1 Empty Pattern

**Spec.**
- Illustration placeholder: 160x120pt, центр, warm off-white shape с тонкой line-иллюстрацией (charcoal stroke 1.5pt).
- Heading 20pt SemiBold, charcoal.
- Body 15pt secondary, max 2 строки.
- Primary CTA + optional Ghost CTA.

**Copy template.**
- Heading: «Пока ничего нет».
- Body: «{Контекст}. Добавьте первую запись, чтобы видеть её здесь».
- CTA: «Добавить {объект}».

#### 4.5.2 Offline Read Banner

```
+----------------------------------------------------------+
| [Icon wifi.slash] Показаны последние сохранённые данные. |
+----------------------------------------------------------+
```

- Цвет: `bg/card` с muted teal accent border bottom 1pt.
- Никаких «ERROR», «OFFLINE!!!». Тон — информативный.

**Поведение.** Появляется fade 200 ms, остаётся пока offline. При возвращении сети — короткий Toast «Синхронизировано».

**Accessibility.** `accessibilityLiveRegion: polite`.

#### 4.5.3 Pending Write Indicator

**Spec.**
- 6pt dot, `accent/primary` outline, slow pulse 1.4 s.
- Размещение: слева от title в любой row (Today, Timeline, Health, Reminders).
- Tooltip / VoiceOver: «Изменение синхронизируется».

**Behavior.** Исчезает после ack от сервера. Если ошибка — заменяется на muted ochre icon с строкой «Повторить».

#### 4.5.4 Permission Denied Pattern

```
+----------------------------------------------------------+
| [Icon]  "Доступ к {ресурс} выключен"                     |
| 13pt secondary:                                          |
| "Можно продолжать без него. {Что работает без}."         |
| [GhostButton: "Как включить"]                            |
+----------------------------------------------------------+
```

**Тексты.**
- Notifications: «Можно продолжать без него. Напоминания видны внутри приложения».
- Camera: «Можно продолжать без неё. Используйте фото из библиотеки или иллюстрации».
- Photos: «Можно продолжать без них. Используйте встроенные аватары».

#### 4.5.5 Revoked / Expired Share Pattern

```
+----------------------------------------------------------+
|             [Illustration 140x100 — calm lock]           |
| "Этот доступ больше недоступен"                          |
| 15pt secondary:                                          |
| "Свяжитесь с владельцем, если нужны актуальные данные."  |
| s/16                                                     |
| [PrimaryButton: "Понятно"]                               |
+----------------------------------------------------------+
```

**Поведение.** Никакой технической информации (id, token). Tone — нейтральный.

**Копия зафиксирована в §3.3.6.** Не различаем revoked и expired для пользователя — оба исхода читаются одинаково нейтрально.

**Компоненты.** `EmptyState` вариант `lock`, `PrimaryButton`.

---

## Часть 5. Design-tool Handoff — Cloud Design, Figma Make, V0

Эта часть — operational. Она объясняет, в каком порядке генерировать макеты, какие brief'ы кормить в каждый инструмент, и что мы хотим получить на выходе. Цель — превратить документ выше в файл Figma / папку компонентов / набор экранов в V0 максимум за 5 рабочих дней.

### 5.1 Где и что генерируем

| Инструмент | Сильная сторона | Что генерируем |
|---|---|---|
| **Figma Make** | Полные экраны с native-style композицией, легко править руками после генерации | Hi-fi mockups для Today, Quick Log, Onboarding, Sharing Preview, Health |
| **V0** | Быстрые web-варианты компонентов и read-only web previews, полезен для проверки layout/copy | Web версии trainer/share preview и отдельных компонентов; не генерировать marketing landing как часть beta UI |
| **Cloud Design** (внутренний AI-генератор) | Системные итерации над дизайн-токенами, генерация состояний и Dynamic Type вариаций | Token tables, состояния (loading/empty/error), Dynamic Type XXL screenshots |

**Правило приоритета:** Figma Make — primary. V0 — для web-поверхностей. Cloud Design — для итераций состояний и токенов.

### 5.2 Generation order

1. **Design tokens + component inventory.** Cloud Design / Figma: создать `design-tokens.json`, styles и базовые компоненты из Части 1. Без этого нельзя генерировать экраны.
2. **Today states.** First day, day 2 morning, accident recovery, after family invite, missed reminder, day 7 rhythm, offline-read, pending-write.
3. **Quick Log bottom sheet states.** Default trackers, after tap with `Undo / Add details`, duplicate warning, pending event, failed retry.
4. **Onboarding.** Welcome, puppy setup, age hint, quick tracker selection, plan reveal, first-log prompt, account request only when needed.
5. **Health.** Health list, template row, confirmed row, edit record form, review-with-vet state.
6. **Sharing.** Family invite, trainer preview, scope selector, expired/revoked share. Критично: каждый экран явно говорит, кто что видит.
7. **More.** Timeline entry, sharing, reminders, quick trackers, puppy profile, notifications, privacy/export/delete, support.
8. **Accessibility + state variants.** Dynamic Type XXL/XXXL, loading, empty, error, offline-read, pending-write, permission-denied, revoked/expired states для всех ключевых экранов.

### 5.3 Prompt-шаблоны

#### 5.3.1 Master prompt для Figma Make (любой экран)

```
You are designing for PuppyPlan, an iOS-first companion app for the first 90 days
with a puppy. Aesthetic: calm utility + warm companion. Target user: tired,
anxious first-time owner, one-handed phone use, often in low light.

DO:
- Use SF Pro system font, semibold for headings, regular for body
- Background surface/base: warm off-white #FBFAF7; surface/raised #FFFFFF; surface/sunken #F1ECE3
- Text primary: charcoal #1C1F1B; secondary #4A4E48; tertiary #76796F
- Stroke/default: #E2DDD2 (1px hairline на cards)
- Primary brand: Calm Teal #0891B2 (focus ring, brand)
- Primary filled action: contrast-safe teal #0E7490
- Celebration only: Ember Coral #E07A4F
- Status danger (user-marked urgent only): muted Clay Red #9A3B2E
- Radius 8pt for buttons, 12pt for cards, 16pt for sheets
- 44x44pt minimum touch targets, 56pt+ in thumb zone
- One primary CTA per hero (one tertiary/text-link is allowed alongside)
- Native iOS patterns: large title nav bar, bottom sheet with grabber 36x4pt,
  tab bar 49pt height + safe-area inset
- Russian copy as specified

DON'T:
- No purple/AI gradients
- No bokeh, no orbs, no glow
- No emojis as icons (use SF Symbols on iOS / Material Symbols Outlined on Android)
- No bright red — muted Clay Red #9A3B2E only for user-marked urgent
- No two primary buttons side-by-side in hero
- No streak counters, no shame copy
- No mascot illustrations
- No dark-mode or tablet/landscape variants (out-of-scope in v1)

SCREEN SPEC:
[Paste relevant subsection from DESIGN.md, e.g. §2.2.1 Today Layout]

OUTPUT:
- iPhone 15 Pro frame (393x852)
- All copy in Russian as specified
- Status pills with icon + text + color (not color alone)
- Include accessibility annotations (44pt hit area markers)
```

#### 5.3.2 V0 prompt для web preview share

```
Build a React + Tailwind component for a "Trainer accepted view" — read-only view
that a dog trainer sees when an owner shared progress with them.

Constraints:
- Warm off-white background #FBFAF7
- Calm teal accent #0891B2, with #0E7490 for filled buttons
- Native-feeling typography (system font stack)
- Mobile-first, breakpoint at 768px
- Show scope contract at top: "Этот доступ включает: профиль, сводка по режиму,
  заметки по тренировкам. Действует до 16 июня."
- 3 content blocks: summary stats, training notes list, read-only footer
- All copy in Russian
- No interactive write controls
- 4.5:1 contrast minimum

Use shadcn/ui Card, Badge, and Separator components.
```

#### 5.3.3 Cloud Design prompt для Dynamic Type screenshot

```
Generate the same screen at Dynamic Type sizes: default, accessibilityXL,
accessibilityXXL, accessibilityXXXL. Show what wraps, what stays single-line,
where buttons grow vertically, where layout switches to single-column.

For each size, verify:
- No text truncation
- No tap targets shrink below 44pt
- Stack order remains logical
- Focus ring still fully visible
```

### 5.4 Asset checklist для каждой генерации

Каждый сгенерированный экран должен иметь:

- [ ] Small iPhone frame (375×812), large iPhone frame (430×932), common Android frame (393×873)
- [ ] Light mode (по умолчанию). Dark mode — только когда явно проходит QA
- [ ] Russian copy
- [ ] Status bar и safe area корректно
- [ ] Минимум 2 состояния: default + одно нестандартное (empty/loading/pending/error)
- [ ] Accessibility annotations: 44pt hit area, focus order, VoiceOver labels
- [ ] Dynamic Type XXL/XXXL screenshots (для критичных экранов: Today, Quick Log, Health, Sharing Preview)

### 5.5 What NOT to ask the generator

- Не просите генератор «придумать» новые скоупы, новые роли, новые tracker types — это нарушит контракт PRD.
- Не просите decorative illustrations с мордами щенков. Используем silhouette и предметные иллюстрации (миска, лежак, поводок).
- Не просите color variations за пределами Части 1. Если нужен новый токен — добавляем в Часть 1 и обновляем PRD.
- Не просите streak / gamification UI. Это запрещено первые 14 дней.

---

## Часть 6. QA Checklist & Acceptance Screenshots

### 6.1 Acceptance screenshots set (обязательно до beta-релиза)

| Категория | Экран | Состояния |
|---|---|---|
| Today | Today | first day / day 2 morning / day 7 weekly rhythm / offline-read / pending-write |
| Quick Log | Quick Log sheet | default trackers / duplicate warning / pending event / failed retry |
| Timeline | Timeline | synced item / pending item / failed item |
| Health | Health list + form | template row / confirmed row / edit form |
| Sharing | Family invite / Trainer preview / Scope selector / Expired share | all 4 |
| More | More tab | full list / notification preferences |
| Accessibility | Today / Quick Log / Health / Sharing Preview | Dynamic Type XXL/XXXL |

### 6.2 Pre-delivery checklist (per screen)

#### Visual quality
- [ ] No emojis as icons (SF Symbols on iOS / Material Symbols Outlined on Android)
- [ ] Brand/auth logos correct (Apple, Google)
- [ ] Hover/press doesn't cause layout shift
- [ ] Use design tokens (`primary/600`) not arbitrary hex
- [ ] Status pills have icon + text, never color-only
- [ ] No mascot screens, no bokeh, no AI-purple gradient

#### Interaction
- [ ] All clickable elements have `cursor-pointer` on web previews
- [ ] Hover states give clear visual feedback
- [ ] Transitions are 150–300 ms (no slower than 360 ms for celebration)
- [ ] Focus states visible for keyboard navigation
- [ ] Haptic feedback на правильных моментах (см. §1.8)

#### Light / dark mode
- [ ] Light mode text ≥4.5:1 contrast
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes
- [ ] Test both modes before delivery (dark — только если включён)

#### Layout
- [ ] Floating FAB has 16 pt margin from edges
- [ ] No content hidden behind fixed navbar / tab bar
- [ ] Tested at 375×812, 430×932, 393×873 (small iPhone / large iPhone / common Android)
- [ ] **Out-of-scope для v1:** iPad/landscape (любые ширины ≥768pt) и dark mode. Эти варианты НЕ нужны в beta acceptance set. Возвращаемся к ним в v2.
- [ ] No horizontal scroll on any mobile size
- [ ] Dynamic Type XXL: nothing truncates

#### Accessibility
- [ ] All images have alt text or `accessibilityElementsHidden`
- [ ] All form inputs have labels
- [ ] Color is never the only indicator (pills have icon + text)
- [ ] `prefers-reduced-motion` respected
- [ ] VoiceOver tested on Today, Quick Log, Sharing Preview, Health form
- [ ] Focus order matches visual order

### 6.3 Copy review checklist (per screen)

- [ ] Все строки на русском
- [ ] Нет «вы пропустили», «вы забыли», «ошибка», «failed» как primary user-facing state
- [ ] Нет streaks first 14 days
- [ ] Нет «Mom/Dad» как default owner language
- [ ] Health screens не пугают по своей инициативе (urgent — только user-marked)
- [ ] Sharing screens явно говорят кто/что/как долго
- [ ] Revoked/expired share — нейтральная одна формулировка, не различает причину
- [ ] Time formatting: «60 секунд назад» / «Вчера, 21:10» / «12 мая, 09:42»

### 6.4 Sharing-specific QA (отдельная проверка)

Этот блок проходит отдельно — sharing — самый чувствительный аспект приложения.

- [ ] Family invite: role capabilities preview меняется при смене role
- [ ] Trainer scope selector: `health_summary` OFF by default
- [ ] Permission preview: видны ровно те скоупы, что включены
- [ ] Expiry: `Без срока` показывает inline warning
- [ ] Revoke: confirmation sheet с явным wording
- [ ] Expired share screen: одна формулировка для expired и revoked (не различает причину)
- [ ] Trusted sitter: completion push приходит только если flag ON и permission получено
- [ ] Shareable card: private notes по умолчанию НЕ включены
- [ ] Share builder: каждое toggle с health-данными показывает дополнительную disclosure

### 6.5 Data-handling QA (не оставляем PII в analytics)

- [ ] Не отправляется в analytics: puppy name, note text, symptom text, mood text, photo content, provider names, exact address, raw email, invite tokens, share tokens
- [ ] EXIF strip перед сохранением фото
- [ ] Storage buckets — private by default
- [ ] Delete cascade для removed puppy/household data
- [ ] Sentry — PII scrubbing включён

### 6.6 Performance QA

Для каждого экрана измерить и подтвердить:

- [ ] App cold start: <2.5 с до Today
- [ ] Today time-to-interactive: <800 мс на стандартном iPhone
- [ ] Quick Log tap-to-visible-update: <100 мс (optimistic)
- [ ] Quick Log server-confirmation: <2 с на 4G
- [ ] No layout jumps между skeleton и контентом
- [ ] Reduced-motion fallbacks работают

---

## Приложение A. Контракт для AI-агентов

Этот документ — design contract. AI-агенты, генерирующие UI код, обязаны:

1. **Не вводить новые цвета** за пределами Части 1 §1.2. Если нужен новый цвет — обновить Часть 1 и PRD.
2. **Не вводить новые компоненты** за пределами Части 1 §1.9. Если нужен новый — добавить как `proposed: <name>` и согласовать перед использованием.
3. **Не менять hierarchy**: primary actions, наименования, screen states, IA. Если меняется — обновить PRD и этот документ.
4. **Не использовать эмодзи** как UI-иконки. Только SF Symbols / Material Outlined.
5. **Не вводить shame/streak/gamification** копи. Запрещено первые 14 дней.
6. **Не показывать urgent red** автоматически — только если пользователь сам пометил запись urgent.
7. **Не показывать причину** revoked vs expired share — одна формулировка.
8. **Не оставлять PII** в analytics, error reports, telemetry. Список под Часть 6 §6.5.

Если несколько UI-агентов работают параллельно — каждый владеет ровно одной workstream-областью (см. PRD §10), и они не могут менять shared токены/контракты без обновления документа.

---

## Приложение B. Связанные файлы

- [`puppyplan-prd-v2.md`](puppyplan-prd-v2.md) — продуктовый и инженерный PRD.
- `design-tokens.json` (генерируется на день 1) — машиночитаемая версия Части 1 §1.2–1.7.
- `design-system/` (создаётся при `--persist` в ui-ux-pro-max) — MASTER.md + per-page overrides.

---

## Changelog

| Дата | Версия | Изменения |
|---|---|---|
| 2026-05-17 | 1.1 | Добавлен утверждённый AI-tool contract для Figma Make / V0 / Cloud Design; порядок генерации приведён к beta mobile flow; V0 ограничен read-only previews/components; цветовые токены синхронизированы с calm teal `#0891B2` и warm off-white `#FBFAF7`; Dynamic Type acceptance поднят до XXL/XXXL. |
| 2026-05-17 | 1.0 | Первоначальная версия. Собрана из 4 параллельных UX/UI workstream'ов: Foundation, Daily Core, Collaboration, Records & Settings. Синхронизирована с PRD v2.3. |
