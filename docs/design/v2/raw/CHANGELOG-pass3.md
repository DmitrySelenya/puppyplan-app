# PuppyPlan — макет v1, правки после третьего ревью

> Адресат: команда разработчиков, реализующая v1 по предыдущей версии макета.
> Цель документа: показать, что именно изменилось в исходниках макета относительно версии, по которой вы уже строили UI, где это лежит и **почему** — чтобы вы могли точечно догнать реализацию, а не сверять файлы вручную.
> Источник вердикта: `Design Review - PuppyPlan v1.html` (3 × P0 + 8 × P1 + 7 × P2). Все 18 пунктов закрыты — список ниже идёт в порядке плана работ из ревью.

---

## Шесть пакетов правок

### Пакет 1. Канонический словарь трекеров (P0)

**Проблема.** В предыдущей версии трекеры назывались по-разному в трёх местах: Quick Log → «Pee outside / Pee inside / Poop / Feeding / Sleep»; Settings 14.3 → «Feeding / Potty / Sleep / Walk / Weight + Play / Training / Biting»; Timeline filters → «All / Potty / **Food** / Sleep / **Zoomies** / Training / Health». Из-за этого нельзя было однозначно ответить, что такое «Potty» — трекер или зонтик; куда делся «Walk» из Quick Log; почему «Food» в фильтрах, а «Feeding» в настройках; и почему «Zoomies» фильтруется, но не логируется.

**Решение.** Введена единая таксономия:

| Уровень | Значения |
|---|---|
| Tracker (верхний уровень) | `potty` · `feeding` · `sleep` · `walk` · `weight` (+ опционально `play` · `training` · `biting`, лимит 5 одновременно) |
| Potty subtype (внутри тайла Potty и формы деталей) | `outside` · `inside` · `poop` |

Subtype — это **данные события**, а не отдельный трекер. На лог-карточке в Timeline subtype отображается («Pee outside · 9:42»), но фильтр и тайл Quick Log один — `Potty`.

**Где внесено.**

- `screens/quicklog.jsx` — массив `QL_TRACKERS` теперь 5 элементов (Potty / Feeding / Sleep / Walk / Weight) вместо 5 несогласованных. Форма деталей 4.6 показывает segment `Outside / Inside / Poop` под заголовком тайла — здесь живёт subtype.
- `screens/onboarding.jsx` — `ScreenOnbTrackers` (2.4) перерисован под канон: 5 основных + 3 опциональных.
- `screens/timeline.jsx` — массив `chips` теперь `['All','Potty','Feeding','Sleep','Walk','Weight']`. Артборд 5.4 теперь `filter="Feeding"` (был `"Food"`).
- `screens/settings.jsx` — заголовок раздела `Quick log`, helper-строка дополнена («Turning a tracker off keeps its history — you can re-enable it any time without losing data») — закрывает P2-пункт §5 «14.3 Quick trackers» из ревью.

**Что важно для имплементации.** В коде используйте те же ключи, что в макете: `tracker.type ∈ {'potty'|'feeding'|'sleep'|'walk'|'weight'|'play'|'training'|'biting'}`; для potty-события — отдельное поле `potty.subtype ∈ {'outside'|'inside'|'poop'}`. Ни в каком месте UI не появляется отдельный трекер «Pee outside» — это всегда событие в трекере Potty с subtype.

---

### Пакет 2. Политика FAB, снекбар и нижние инсеты (P0)

**Проблема.** FAB позиционирован абсолютно и физически перекрывал:
- «Mark done» на карточке «Not logged today» (Reminders 12.1);
- кнопку «Undo» снекбара на Quick Log pending (4.2) и онбординг-celebration (2.6) — две цели тапа в одной точке;
- последнюю строку дня в Timeline 5.1.

**Решение.**

1. **FAB виден только на лог-поверхностях.** Today, Timeline, Health. На Reminders, More, Settings, Sharing, Onboarding 2.5 и на любых read-only — FAB убран.
2. **Снекбар прячет FAB.** Пока виден toast — FAB не отрисовывается. Снекбар-действия (Undo, Add details) теперь занимают всю правую часть и не могут уйти под FAB. См. правило в комментарии к `FAB` в `components.jsx`.
3. **Бутом-инсет для скролл-листов.** Введён токен `--pp-bottom-inset-fab: 120px` в `tokens.css` (= 49 tab + 56 FAB + 16 gap; safe-area домысливается на устройстве). Все скролл-контейнеры на FAB-поверхностях используют этот токен в `padding-bottom`, чтобы последняя строка не уходила под FAB.

**Где внесено.**

- `tokens.css` — токен `--pp-bottom-inset-fab` + блок с описанием политики FAB.
- `components.jsx` — комментарий-контракт у `FAB` и у `Snackbar` (с явным правилом «пока виден снекбар, FAB скрыт»). Снекбар-action — настоящие `<button>`.
- `screens/quicklog.jsx` — на артборде 4.2 (`ScreenQLPending`) `<FAB />` снят, остался только снекбар с Undo. Также сняты `pointerEvents:'none'` со scrim — теперь scrim закрывает шит (iOS HIG).
- `screens/more.jsx` — `<FAB />` снят с `ScreenReminders` (12.1) и с `ScreenMore` (14.1). Оставлены `<TabBar />` и комментарий «No FAB on Reminders/More — not a log surface (FAB policy, review pass 3 P0)».
- `screens/today.jsx`, `screens/timeline.jsx`, `screens/health.jsx` — все скролл-контейнеры переписаны с `padding-bottom: 96px` на `padding-bottom: var(--pp-bottom-inset-fab)`.
- `screens/onboarding.jsx` — снекбар «Done. You can keep going.» удалён со 2.6 (см. также пакет 4 — устранение двойного фидбека).

**Что важно для имплементации.** В RN/Expo держите `<FAB />` в layout уровня экрана, а не глобально в navigator. Подписывайтесь на состояние toast-менеджера: пока есть активный toast — рендерите `null` вместо FAB. Контент-инсет применяйте к скролл-контейнеру (`contentInset.bottom = 156` на реальном устройстве: 49 tab + 34 home indicator + 56 FAB + 16 gap; макетные 120pt уже учитывают, что у нас tab-bar в потоке).

---

### Пакет 3. Закрытие долга предыдущего аудита: 1.1, 2.1 и весь 4.x (P0)

Read me в предыдущей версии создавал впечатление, что предыдущий аудит применён полностью; фактически коммиты 1.1, 2.1 и весь 4-й (a11y) не были применены. Сейчас закрыты.

**3.1. Окно дубликата — 60 секунд, не 12 минут (audit commit 1.1).**

- `uploads/design-tokens.json:191` — описание `haptics.warning` теперь «Duplicate detected (60-second window)».
- `uploads/design-tokens.json:276` — ключ переименован: `duplicate-warning-window-min: 12` → `duplicate-warning-window-sec: 60`. **Если вы уже хранили окно в минутах — поменяйте на секунды и значение `60`.**
- `PuppyPlan.html` — label артборда 4.4 теперь «Duplicate warning · 60-second window».
- `screens/quicklog.jsx` — копия в шите «Caregiver A logged a feeding 40 seconds ago» (было «4 minutes ago» — событие, не попадающее в окно).

**3.2. Pill: `needs-review` → `needs-vet-review` (audit commit 2.1).**

CSS-переменные и пресет компонента уже соответствуют ключу из `STRINGS.en.json` / `design-tokens.json`.

- `tokens.css` — переменные `--pp-pill-needs-vet-review-fill` / `-text`.
- `components.jsx` — пресет `PILL_PRESETS['needs-vet-review']`.
- `screens/health.jsx` — `<Pill tone="needs-vet-review">Ask your vet</Pill>` в 11.1 и 11.4.
- `screens/library.jsx` — то же в каталоге компонентов.

**В коде:** замените `Pill.tone = 'needs-review'` → `'needs-vet-review'` везде, где используется. Сторнировки данных не требуется — это только UI-ключ.

**3.3. A11y (audit commit 4.x).**

- `components.jsx`:
  - Новый компонент **`NavbarAction`** — настоящий `<button>` с `min-width/height: 44pt`, `aria-label`, `focus-visible`-кольцом, отрицательными margins для сохранения визуальной геометрии «как раньше».
  - **`TextLink`** перерисован как `<button>` с 44pt-эффективной площадью через `padding 11/8 + margin -11/-8`.
  - **`Snackbar`** — action и secondary теперь `<button>`-элементы (`.pp-snack-action`, `.pp-snack-secondary` в `tokens.css`), role=status на корне.
  - **`SectionHeader.action`** — теперь `<button>` с 44pt hit area.
  - **`ListRow`** — добавлены props `role` («radio» / «checkbox») и `selected`, для корректной озвучки выбора роли при `Invite` и «Who» в Sitter Mode.
- `tokens.css` — общий класс `.pp-chip` с псевдо-элементом `::after`, расширяющим тап-цель чипа до 44pt без изменения визуальной высоты.
- `screens/sharing.jsx` — `SimpleHeader` переписан: и `left`, и `right` рендерятся через `NavbarAction`. Это покрывает все навбары sharing/health/settings/cards/profile, которые используют `SimpleHeader`.
- `screens/profile.jsx` — Picker Breed: «Cancel / Done» поменяны на `NavbarAction`.
- `screens/onboarding.jsx` — Back-шевроны в навбарах 2.2 / 2.4 поменяны на `NavbarAction`.
- `screens/today.jsx` — кнопка «⋯ More actions» рядом с Done в 3.2 уже была настоящим `<button>` с `aria-label` (внесено ранее).
- `screens/quicklog.jsx` — «Edit trackers» теперь `NavbarAction` (была `<span>` 15px ≈ 30pt — провал тап-цели). Chips после Quick Log details — настоящие `<button>` с `aria-pressed`.

**Что важно для имплементации.** Любая текстовая навбар-кнопка в RN должна быть `<Pressable>` с `hitSlop` минимум до 44×44 и `accessibilityRole="button"` + `accessibilityLabel`. Цвет `var(--pp-text-link)` сохранён, визуально не отличается. Чипы (`pp-chip`) — `<Pressable>` с `hitSlop = {top:11,bottom:11}` если высота визуала <22px.

---

### Пакет 4. P1-пакет

**4.1. Онбординг 2.2 · error — соответствие состояния формы.**
Было: segment на `Age`, поле `8 weeks`, ошибка `That date is in the future`. Стало: в `error` варианте segment переключается на `Or date of birth`, под ним поле даты `Jul 4, 2026` и та же ошибка. Сделано в `screens/onboarding.jsx > ScreenOnbProfile`.

**4.2. Онбординг 2.5 / 2.6 · разделение хрома.**
Было: на 2.5 одновременно «Step 5 of 5», TabBar и FAB. Стало:
- 2.5 (`ScreenOnbPlanReveal`) — **строго wizard-хром**: без TabBar и без FAB. Внизу — кнопка «Start your first log».
- 2.6 (`ScreenOnbFirstLogPending`) — это уже **первый Today**: используется тот же `TodayHeader` (Puppy A, 8 weeks, Thursday · May 14), TabBar и FAB на месте. Step-индикатор удалён.

**4.3. 2.6 · убран двойной фидбек.** Celebration-карта `First event saved. From here, a calm rhythm.` оставлена как единственное подтверждение. Снекбар `Done. You can keep going.` удалён (снекбар Quick Log живёт только в steady-state, а не в celebration-момент). Сделано в `screens/onboarding.jsx`.

**4.4. Paywall — единый паттерн выбора плана.**
В `screens/more.jsx > PlanCard` оба плана теперь используют **один контрол** — radio. Yearly = selected (filled radio + accent border) + бейдж `Best value`. Monthly = empty radio. Копирайт hero: `Extra features for your puppy's first 90 days at home.` — однозначно описывает позиционирование «для щенячьего периода», а не триал.

**4.5. Sitter 7.4 · «End sitter mode» — primary, не destructive.**
В `screens/sitter.jsx > ScreenSitterExit` кнопка теперь `<Button variant="primary">`. Контракт `danger-color-only = user-marked urgent` соблюдён: красный filled остался только на Delete account (`14.6 ScreenDeleteConfirm`) и Delete entry (`screens/states.jsx > 11.x`).

**4.6. Sitter 7.3 · прогресс-бар в primary, не warning.**
В `screens/sitter.jsx > ScreenSitterOwnerStatus`: `width: 50%; background: var(--pp-primary-500)` (было `var(--pp-warning)`). Заодно убрана амбер вертикальная полоса слева у всей карточки — теперь `var(--pp-stroke)`; «active»-сигнал даёт pill `Sitter mode` сверху.

**4.7. Иконка Today в TabBar — солнце, не диск.**
В `icons.jsx > nav.today` нарисован глиф солнца (центр + лучи), читаемый и в outline, и в filled. См. комментарий в файле.

---

### Пакет 5. P2-пакет

**5.1. Канонический мок-день.**
Зафиксирован один день рождения и один календарь:

| Артборд | Дата | Возраст |
|---|---|---|
| 3.1 Day 1 | Thursday · May 14, 2026 | 8 weeks |
| 3.2 Day 2 morning | Friday · May 15, 2026 | 8 weeks |
| 3.3 Day 7 weekly | Wednesday · May 20, 2026 | 9 weeks |
| 14.2 Profile | DOB Mar 19, 2026 | ≈ 8 weeks |

`TodayHeader` теперь принимает `date` пропом, по умолчанию `'Thursday · May 14'`. См. шапку файла `screens/today.jsx`.

**5.2. Duplicate-шит mock data.**
«Caregiver A logged a feeding 4 minutes ago» → «Caregiver A logged a feeding 40 seconds ago» — попадает в 60-секундное окно. См. `screens/quicklog.jsx > ScreenQLDuplicate`.

**5.3. Health · `Status` — существительное, stepper — single-active.**
- `screens/health.jsx > ScreenHealthDetail`: значение Status теперь `Confirmed` / `Needs vet review` (было `Confirmed / Ask your vet` — CTA на месте значения).
- `StageStrip` перерисован: одна активная стадия (teal-fill), прошлые — приглушённый primary-200, будущие — серый. Под полосой строка `Now: <Confirmed> · Next: Done`.

**5.4. `No clinic listed` убрано.**
В `screens/health.jsx`: строка «Weight check · 4.2 kg» теперь имеет `meta="May 10"` без пустого filler-значения.

**5.5. 14.6 Delete confirm — добавлено защитное состояние.**
`ScreenDeleteConfirm` теперь принимает `state ∈ {'default','typed'}`. Default — поле пустое, кнопка Delete disabled. Typed — введено `DELETE`, кнопка активна. На канвасе два артборда: `14.6a` (empty/disabled) и `14.6b` (typed/enabled). См. `PuppyPlan.html` и `screens/more.jsx`.

**5.6. Sitter-чеклист · «Done» без зачёркивания.**
В `screens/sitter.jsx > ScreenSitterChecklist`: выполненные пункты — чек + `color: var(--pp-text-tertiary)`, без `text-decoration: line-through`. Зачёркивание читалось как «отменено».

**5.7. Микро-копия.**
- `screens/settings.jsx` 14.5: section header `Danger zone` → `Account removal`.
- `screens/settings.jsx` 14.4: `In beta, push is sent only…` → `For now, push is sent only…`.
- `screens/more.jsx` 14.1: подзаголовок раздела About `Version 1.0.0 (beta)` → `Version 1.0.0`. (Слова «beta» в пользовательском UI больше нет нигде, кроме внутренних страниц Read me.)

**5.8. Card preview · фото-плейсхолдер вместо «L».**
В `screens/cards.jsx > ScreenCardPreview`: гигантская буква-аватар (56px font) заменена на круглый dashed-плейсхолдер с paw-иконкой и подписью `Add photo` — соответствует визуальному языку empty-states.

---

### Пакет 6. Бриф на иллюстрации (внешний трек)

Welcome (2.1) и Guidance hero (13.1) пока используют штриховые плейсхолдеры (`repeating-linear-gradient` 135°). До разработки заказываются 4–6 иллюстраций одной серии (welcome, guidance-топики, empty-Today, celebration). Стиль: тёплый, рукотворный, без стоковых собак, без gradient slop. Бриф готовится отдельно — нативная реализация просто оставляет slot фиксированной геометрии (220×220 для welcome, 140×140 для топиков).

**Рекомендация для архитектуры (не реализована в макете).** В ревью предложен 4-й таб «Timeline» (Today · Timeline · Health · More). Сейчас доступ к Events идёт через текстовую ссылку «Today ↔ Events» в навбаре. Для каждодневного caregiver-флоу это слабая точка входа. Решение оставлено на team — место в таб-баре есть, переразметка `TabBar` тривиальна (одна строка в `components.jsx`).

---

## Файлы, изменённые в этом проходе

| Файл | Что изменилось |
|---|---|
| `tokens.css` | Переменные pill `needs-vet-review`; токен `--pp-bottom-inset-fab`; правила `.pp-snack-action`/`-secondary`/`.pp-chip` (a11y) |
| `components.jsx` | Новые `NavbarAction`; `TextLink` стал button; `Snackbar` actions = button + комментарий «hidden when snackbar visible»; `SectionHeader.action` = button; `ListRow` принимает `role`/`selected`; пилл `needs-vet-review`; FAB-комментарий с политикой |
| `icons.jsx` | `nav.today` перерисована: солнце вместо часов-диска |
| `screens/today.jsx` | Канонический мок-день (header принимает `date`); bottom-inset через токен |
| `screens/quicklog.jsx` | Канонический словарь трекеров; subtype-segment в форме деталей; FAB скрыт во время Snackbar; `NavbarAction` для Cancel/Save/Edit trackers; чипы — `<button>`; «40 seconds ago» |
| `screens/timeline.jsx` | Канонические чипы; фильтр `Feeding`; bottom-inset через токен |
| `screens/onboarding.jsx` | 2.4 канонический picker; 2.2 error-state соответствует форме; 2.5 без TabBar/FAB; 2.6 убран двойной фидбек, использует TodayHeader; `NavbarAction` в back-шевронах |
| `screens/settings.jsx` | Section header «Account removal»; «For now» вместо «In beta»; уточнение helper-строки в 14.3 (история сохраняется) |
| `screens/sitter.jsx` | 7.2 «Done» без strikethrough; 7.3 прогресс-бар primary; 7.4 «End sitter mode» primary; убрана амбер-полоса с карточки статуса |
| `screens/more.jsx` | 12.1 Reminders без FAB; 14.1 More без FAB; Plus-row копия «Extra features for the puppy stage»; About без «(beta)»; PlanCard унифицирован (radio + badge); ScreenDeleteConfirm поддерживает `state='default'\|'typed'` |
| `screens/health.jsx` | `needs-vet-review` (2 места); Status = noun; StageStrip = single-active; meta без `No clinic listed`; bottom-inset через токен |
| `screens/cards.jsx` | Photo placeholder вместо «L» |
| `screens/library.jsx` | `needs-vet-review` |
| `screens/sharing.jsx` | `SimpleHeader` использует `NavbarAction` |
| `screens/profile.jsx` | `NavbarAction` в Breed picker |
| `PuppyPlan.html` | Read me обновлён; артборд 4.4 «60-second window»; разделены `14.6a`/`14.6b` |
| `uploads/design-tokens.json` | `duplicate-warning-window-min: 12` → `duplicate-warning-window-sec: 60`; haptic-описание `warning` |

---

## Что НЕ менялось намеренно

- **Dynamic Type XXL/XXXL** и **dark mode** — out-of-scope v1, как зафиксировано в DESIGN.md §6. Решение продолжаем фиксировать там, чтобы оно не выглядело забытым.
- **4-й таб Timeline** — рекомендация ревью, оставлено на ваше решение. Требует одной строки в `TabBar` (`components.jsx`) и пересчёта safe-area, если выбираете внедрение.
- **Иллюстрации** — заказываются отдельно, в макете остаются плейсхолдеры. Геометрия слотов не изменится.
