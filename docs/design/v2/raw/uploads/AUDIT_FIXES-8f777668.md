# PuppyPlan — список правок по итогам аудита

Документ для передачи в Claude Design. Все правки на уровне источников: `DESIGN.md`, `design-tokens.json`, `STRINGS.en.json`, JSX-экраны (`screens/*.jsx`, `components.jsx`, `icons.jsx`), `tokens.css`, `PuppyPlan.html`.

Сгруппировано по 5 «коммитам». Внутри каждого — конкретные изменения с указанием файлов и строк. Мелочи (nits) сюда не включены, остались только реальные баги, нарушения контрактов и нехватка экранов.

---

## Коммит 1 — Foundation: контрасты и контракты

### 1.1 Окно дубликата: 12 минут → 60 секунд

**Где:** `design-tokens.json`, `DESIGN.md` §1.8, §2.3.10, `STRINGS.en.json` (если упоминается)

**Проблема:** контракт говорит 12, спецификация и продуктовая логика — 60 секунд. Имя ключа `-min` вводит в заблуждение.

**Правка в `design-tokens.json`:**
```diff
- "duplicate-warning-window-min": 12,
+ "duplicate-warning-window-seconds": 60,
```

**И там же в `haptic.warning.trigger`:**
```diff
- "trigger": "Duplicate detected (12-min window)"
+ "trigger": "Duplicate detected (60-second window)"
```

Проверить, что DESIGN.md §1.8 и §2.3.10 ссылаются на «60 секунд».

---

### 1.2 Контраст `text/tertiary` не проходит WCAG AA

**Где:** `design-tokens.json` `color.text.tertiary`, `DESIGN.md` §1.2.2, `tokens.css`

**Проблема:** `#76796F` на `#FBFAF7` = **4.25:1**, а заявлено 4.7:1. Это ниже минимума AA (4.5:1) для body. В `tokens.css` уже стихийно правят на `#72756B`, но первоисточники не обновили.

**Правка:** во всех трёх файлах:
```diff
- "tertiary": { "$value": "#76796F", "$description": "Contrast 4.7:1." }
+ "tertiary": { "$value": "#72756B", "$description": "Contrast 4.5:1." }
```

В `tokens.css` уже `#72756B` — не трогать, только убедиться что синхронно.

---

### 1.3 Контраст `status/warning` не проходит WCAG AA

**Где:** `design-tokens.json` `color.status.warning`, `DESIGN.md` §1.2.5

**Проблема:** `#A06A1F` на `#FBFAF7` = **4.40:1**, заявлено 5.2:1. Ниже AA для body.

**Правка:**
```diff
- "warning": { "$value": "#A06A1F", "$description": "Amber Bark. 5.2:1" }
+ "warning": { "$value": "#8E5C18", "$description": "Amber Bark. 5.1:1" }
```

Синхронно в DESIGN.md.

---

### 1.4 Завышенные коэффициенты контраста (только цифры в описании)

**Где:** `design-tokens.json`, `DESIGN.md` §1.2

Реальные значения:
- `accent/700` `#A14B26` на `accent/100` `#FBEBE0` = **5.09:1** (заявлено 6.9:1)
- `status/success` `#3F7A57` на `surface/base` = **4.87:1** (заявлено 5.0:1)
- `text/disabled` `#A6A89F` на `surface/base` = **2.31:1** (заявлено 2.6:1)

**Правка:** обновить строки `$description` с актуальными цифрами. Сами hex-значения не трогать (все, кроме disabled, продолжают проходить AA).

---

### 1.5 Motion easing: две разные «decel»-кривые

**Где:** `design-tokens.json` `motion.easing.decel` vs `DESIGN.md` §1.7

**Проблема:** JSON говорит `cubic-bezier(0.0, 0, 0.2, 1)`, DESIGN.md — `cubic-bezier(0.2, 0, 0, 1)`.

**Правка:** взять как канон значение из DESIGN.md и обновить JSON:
```diff
- "decel": { "$value": "cubic-bezier(0.0, 0, 0.2, 1)" }
+ "decel": { "$value": "cubic-bezier(0.2, 0, 0, 1)" }
```

---

### 1.6 `layout.max-content-width`: 560 или 600

**Где:** `design-tokens.json` `layout.max-content-width: 560pt` vs `DESIGN.md` §1.4 (текст «600pt»)

**Правка:** выбрать одно и синхронизировать. Рекомендую оставить `560pt` (более консервативный line-length для текста на планшете).

---

### 1.7 `elev/0` через литерал вместо токена

**Где:** `design-tokens.json` `elevation.0`

**Правка:**
```diff
- "0": { "$value": { "shadow": "none", "border": "1px solid #E2DDD2" } }
+ "0": { "$value": { "shadow": "none", "border": "1pt solid {color.stroke.default}" } }
```

---

### 1.8 Token coverage в CSS неполный

**Где:** `/tmp/puppy_unzip/tokens.css`

**Что добавить:**
- `--pp-primary-900: #083344;` (отсутствует)
- Bottom-sheet shadow (`.pp-sheet`) переписать через `var(--pp-elev-2)` вместо literal `box-shadow: 0 -4px 16px rgba(28,31,27,0.10)`
- Snackbar action использует литерал `#67E8F9` → `var(--pp-primary-300)`

---

### 1.9 Icon count: «(30)» по факту 32

**Где:** `DESIGN.md` §1.6 заголовок

**Правка:** в заголовке листинга «Core MVP icon token list» заменить «(30)» → «(32)».

---

### 1.10 Корректный scope в шапке `design-tokens.json`

**Где:** `design-tokens.json` `$description`

**Проблема:** говорит «derived from DESIGN.md §1.2-1.8», но содержит §1.9 (component anatomy) и контракты из Part 2-3.

**Правка:** заменить на «derived from DESIGN.md §1 + canonical contracts from Parts 2-3».

---

## Коммит 2 — Имена компонентов и иконок

### 2.1 Pill: `needs-review` ≠ `needs-vet-review`

**Где:** `components.jsx:58`, JSX-использования (`health.jsx:65`), `tokens.css` (`.pp-pill-review-*`)

**Проблема:** STRINGS и tokens используют ключ `needs-vet-review`, компонент — `needs-review`. Привязка строк к компоненту работать не будет.

**Правка в `components.jsx`:**
```diff
- 'needs-review':  { fill: 'var(--pp-pill-review-fill)', text: 'var(--pp-pill-review-text)', icon: 'status.review' },
+ 'needs-vet-review': { fill: 'var(--pp-pill-needs-vet-review-fill)', text: 'var(--pp-pill-needs-vet-review-text)', icon: 'status.review' },
```

**В `health.jsx:65`:**
```diff
- <Pill tone="needs-review">Ask your vet</Pill>
+ <Pill tone="needs-vet-review">Ask your vet</Pill>
```

**В `tokens.css`:** переименовать CSS-переменные `--pp-pill-review-fill` → `--pp-pill-needs-vet-review-fill` и текст, обновить всех потребителей.

---

### 2.2 Иконки, которых нет в реестре

**Где:** разные экраны

| Использование | Что сейчас | Что должно |
|---|---|---|
| `timeline.jsx:75`, `today.jsx:32` | `feeding.walk` | `feeding.walk` отсутствует в `icons.jsx` ICON map (только в `core-mvp` JSON есть похожее, но не используется в SVG). **Добавить SVG-определение в `icons.jsx`** или заменить на `feeding.bowl`. |
| `sharing.jsx:134` | `undo` | В `icons.jsx` `undo` определён. Но в `icon.core-mvp` отсутствует. **Добавить в core-mvp в design-tokens.json** или использовать `arrow.right` для «Send again». |
| `health.jsx:260` | `med.stethoscope` | Правильное имя — `ui.stethoscope` (по DESIGN.md §1.6 extended icon list). **Заменить в health.jsx**. |

В `design-tokens.json` `icon.core-mvp` добавить `feeding.walk` (или удалить из usage), и проверить, что в `icons.jsx` SVG для `feeding.walk` корректный.

---

## Коммит 3 — CTA иерархия и destructive actions

### 3.1 Today day-7: два равновесных primary

**Где:** `today.jsx:131-152`

**Проблема:** HeroCard с primary «Log it» + tertiary «Later» уже использует свой quota. Сразу следом — отдельная Card с второй залитой `Button variant="primary"` («Usual portion»). Нарушает `one-cta-per-hero`.

**Правка:** во втором Card блоке заменить:
```diff
- <Button variant="primary" block>Usual portion</Button>
+ <Button variant="secondary" block>Usual portion</Button>
```
Или вынести «Change» в text-link и убрать второй CTA целиком.

---

### 3.2 Delete account: danger как primary

**Где:** `more.jsx:213`

**Проблема:** `<Button variant="primary" style={{ background: 'var(--pp-danger)' }}>Delete</Button>` — inline-override токена, плюс нарушение контракта `danger-color-only = user-marked`.

**Правка:**
```diff
- <Button variant="primary" style={{ background: 'var(--pp-danger)' }}>Delete</Button>
+ <Button variant="destructive">Delete</Button>
```

`variant="destructive"` уже определён и используется в `health.jsx:210`.

---

### 3.3 Quick Log duplicate: secondary должна быть tertiary

**Где:** `quicklog.jsx:126-128`

**Проблема:** в duplicate-warning sheet два равновесных filled-кнопок (primary «This is a different event» + secondary «Cancel»). Спецификация мягкого предупреждения = один primary + tertiary text-link.

**Правка:**
```diff
- <Button variant="secondary" block>Cancel</Button>
+ <TextLink onClick={onCancel}>Cancel</TextLink>
```
И обернуть в центрированный padding.

---

### 3.4 Today missed-reminder card: 5 равновесных pill-кнопок

**Где:** `today.jsx:88-102`

**Проблема:** 5 pill-кнопок (Done, Snooze, Skip, Edit, Stop) одного веса. Нарушает CTA-иерархию.

**Правка:** primary action = «Done» (filled). Snooze / Skip / Edit / Stop → overflow в three-dots-меню или в bottom sheet. Анатомия:
```
[ ✓ Done ]   ⋯
```

---

### 3.5 Унифицировать primary/secondary в empty states

**Где:** `states.jsx:131, 62`, `sharing.jsx:341`, `timeline.jsx:138`, `health.jsx:266`

**Проблема:** иногда empty-state primary CTA это `variant="primary"` (health), иногда `variant="secondary"` (timeline, states, sharing). Нужна одна конвенция.

**Правка:** канон — `variant="primary"` для главной empty-state-кнопки. Привести `timeline.jsx:138`, `states.jsx:131,62`, `sharing.jsx:341` к `variant="primary"`. Зафиксировать правило в DESIGN.md §16.

---

## Коммит 4 — A11y baseline

### 4.1 Navbar actions: `<span>` → `<button>`

**Где:** все экраны с navbar (onboarding, quicklog, health, more, timeline, sharing)

**Проблема:** «Cancel», «Save», «Done», back-chevron, «Today»-back-link все рендерятся как `<span>`. Нет `role`, `tabIndex`, focus-ring, тач-площадь ~30pt < 44pt.

**Правка в `components.jsx`** — добавить компонент `NavbarAction`:
```jsx
function NavbarAction({ children, onClick, ariaLabel, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="pp-interactive"
      style={{
        minWidth: 44, minHeight: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 0, padding: '0 8px',
        color: 'var(--pp-text-link)', fontSize: 17, fontWeight: 400,
        cursor: 'pointer', ...style,
      }}
    >
      {children}
    </button>
  );
}
```

Заменить все `<span>Cancel</span>` / `<span>Save</span>` / chevron-back на `<NavbarAction>`. Список мест:
- `onboarding.jsx:43, 109, 141`
- `quicklog.jsx:174-176`
- `sharing.jsx:7-9, 47, 199`
- `health.jsx:9, 103`
- `more.jsx:7, 100, 134, 154`
- `timeline.jsx:8, 10`
- `today.jsx:18, 19`

---

### 4.2 Icon-only navbar buttons

**Где:** bell (today), action.add (health, more), search (timeline)

**Проблема:** голый `<Icon>` без `aria-label`, без button wrapper, без 44pt тач-области.

**Правка:** обернуть в `<NavbarAction ariaLabel="Notifications" />`, `<NavbarAction ariaLabel="Add record" />` и т.д.

---

### 4.3 PillButton, context-chips, filter-chips

**Где:** `today.jsx:110-121` (PillButton), `more.jsx:59-67` (PillButton2), `quicklog.jsx:194-202` (context chips), `timeline.jsx:15-22` (filter chips)

**Проблема:** все рендерятся как `<span>` без role/tabIndex/focus. Padding 7px×12px ≈ 30pt < 44pt min.

**Правка:** заменить на реальные `<button>` с:
- `role="button"` (или нативно `<button>`)
- `tabIndex={0}`
- `aria-pressed={selected}` для toggle-чипов
- focus-ring через `.pp-interactive:focus-visible`
- увеличить минимальную тач-область до 44pt (через padding, не размер шрифта)

---

### 4.4 Radio rows без a11y semantics

**Где:** `sharing.jsx:72-83`

**Проблема:** кастомные CSS-круги без `role="radio"`, `aria-checked`, keyboard support.

**Правка:** обернуть каждую row в `<div role="radio" tabIndex={0} aria-checked={selected}>` с onKeyDown handler для стрелок (ArrowDown/ArrowUp перемещают между radio в группе, Enter/Space выбирают).

---

### 4.5 Bottom sheet scrim не закрывается тапом

**Где:** `quicklog.jsx:15`

**Проблема:** scrim имеет `pointerEvents: 'none'`. По iOS HIG тап по scrim должен закрывать sheet.

**Правка:**
```diff
- <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,26,24,0.32)', pointerEvents: 'none' }} />
+ <div
+   onClick={onClose}
+   role="button"
+   aria-label="Close"
+   style={{ position: 'absolute', inset: 0, background: 'rgba(26,26,24,0.32)' }}
+ />
```

---

### 4.6 Tabular numerals не применены к числовым данным

**Где:** today.jsx (вес, граммы, время), timeline.jsx (60 g, 22 min, 4.2 kg), health.jsx (вес, температура)

**Проблема:** правило токенов «Tabular numerals для всех числовых данных» нарушено — числа в обычном Body.

**Правка:** в `tokens.css` добавить utility-class:
```css
.pp-tabular-num { font-variant-numeric: tabular-nums; }
```
И применить ко всем числовым inline-значениям («60 g», «22 min», «4.2 kg», «9:31», «May 14»).

---

## Коммит 5 — Недостающие экраны и состояния

Эти строки уже есть в STRINGS, но экранов нет. Приоритет сверху вниз.

### 5.1 Onboarding 2.3 — Age hint
**Что нарисовать:** между «What's your puppy's name» и «What to track» — экран с подсказкой по возрасту:
- Заголовок: «At 8 weeks, puppies often sleep 18–20 hours a day»
- Варианты под возраст: 8 weeks / 9-12 weeks / 13-16 weeks (разные подсказки)
- CTA: Continue

Источник копи: DESIGN.md §2.3 (если есть) + STRINGS `onboarding.age-hint.*`.

---

### 5.2 Today «After accident» card-state
**Где добавить:** новая ветка в `today.jsx`.
**Анатомия:** нейтральная Card с иконкой `info.circle`, копия «Accidents happen — they don't reset the rhythm.», CTA «Log clean-up» (text link) или просто dismissible info-card. Никакого красного — это recovery card, не error.

---

### 5.3 Today «Missed reminder» card
**Где:** `today.jsx`, новое состояние.
**Анатомия:** Card с pill `pending`, заголовком вида «You missed: Feeding · 7:30 am», primary CTA «Mark done», overflow ⋯ → bottom sheet (Snooze 30min / Skip / Edit / Stop).

---

### 5.4 Today empty state
**Что использовать:** строки `today.empty.title="Quiet today."`, `today.empty.body`, `today.empty.cta="Open Quick Log"`.
**Анатомия:** центрированная illustration + title + body + primary CTA.

---

### 5.5 Today error banner
**Где:** новое состояние today.
**Что использовать:** `today.error-banner="Couldn't refresh. Showing the last saved view."` — рендерить как `<Banner tone="failed">`.

---

### 5.6 Quick Log 4.3 — Slow network / Saving
**Что нарисовать:** промежуточное состояние между tap и success/failed:
- Полная sheet с spinner или skeleton
- Snackbar «Saving…» под sheet
- Длится >2s, после переход в pending state или snackbar success.

---

### 5.7 Reminders edit screen
**Что нарисовать:** форма создания/редактирования напоминания:
- Trigger time picker
- Repeat segment (Once / Daily / Weekdays / Custom)
- Tracker selector
- Notification permission banner (если permission denied)
- Quiet hours toggle
- CTA: Save / Delete

Источник: PRD §5 route `/reminders/edit`, STRINGS `reminders.form.*`.

---

### 5.8 Notification preferences screen
**Что нарисовать:** список переключателей под More → Notifications:
- Master toggle (Enable notifications)
- Per-tracker toggles
- Quiet hours (с time range picker)
- Permission banner (если denied — кнопка «Open Settings»)

Источник: PRD §5 «More: full list and notification preferences», STRINGS `more.notifications.*`.

---

### 5.9 Permission-denied state (для уведомлений)
**Где:** новый template в `states.jsx`.
**Анатомия:** centered icon `ui.bell.slash`, title «Permissions needed», body, primary CTA «Open Settings», secondary tertiary «Not now».

---

### 5.10 Viewer-role read-only views
**Что нарисовать:** Today и Timeline под viewer-ролью (Family Sharing):
- Все CTA скрыты (Quick Log FAB убран, edit-actions disabled)
- Badge «View only» в navbar
- Banner-disclaimer об ограничениях

Источник: PRD §4 viewer vs caregiver distinction, STRINGS `sharing.family.shared-today-viewer.*`.

---

### 5.11 Quick Log: Sleep, Feeding, Zoomies формы
**Что нарисовать:** три формы по аналогии с Potty:
- **Sleep:** start/end time pickers + duration auto-calc + note
- **Feeding:** type (kibble/wet/treat) + amount (grams) + note + photo
- **Zoomies:** intensity (low/med/high) + duration + note

Источники: DESIGN.md §4, STRINGS `quick-log.sleep.*`, `quick-log.feeding.*`, `quick-log.zoomies.*`.

---

### 5.12 Канвас: разделить мерженные секции
**Где:** `PuppyPlan.html`

**Сейчас:**
- «8 — Trainer sharing · 10 — Revoked/expired» (один DCSection)
- «12 · 14 · 15 — Reminders, More, Paywall» (один DCSection)

**Правка:** разнести в отдельные DCSection-блоки, чтобы focus-overlay-навигация работала корректно. То есть 5 секций вместо 2:
- 8 — Trainer sharing
- 10 — Revoked / expired
- 12 — Reminders
- 14 — More
- 15 — Paywall

---

## Что НЕ трогаем (явно отмечено как deferred — оставить как есть)

- §7 Trusted Sitter (checklist + owner status card)
- §9 Shareable Cards (preview / builder)
- §13 Starter Guidance topic detail
- §17 Dynamic Type XXL / XXXL variants

Эти уже честно отмечены в Read me как «Not drawn in v1». Не дорисовываем — только если расширим scope.

---

## Контрольный чек после правок

После применения 5 коммитов прогнать:

1. **WCAG AA**: пересчитать контрасты всех text-colors на surface-colors. Все body-пары должны быть ≥ 4.5:1, decorative ≥ 3:1.
2. **STRINGS coverage**: каждый видимый текст в JSX должен ссылаться на ключ из STRINGS.en.json verbatim (не парафраз).
3. **A11y**: каждый interactive element должен иметь `role`, `aria-label` (если icon-only), `tabIndex`, focus-ring, min 44pt тач-область.
4. **CTA hierarchy**: на любом экране ≤ 1 primary filled button + ≤ 1 tertiary text-link. Никаких двух equal-weight filled-кнопок.
5. **Token usage**: ни одного литерального hex / px в JSX — всё через CSS-переменные или `var(--pp-*)`.
6. **Icon registry**: каждое использование `<Icon name="...">` должно резолвиться в существующий ключ из `icons.jsx` ICON map.
