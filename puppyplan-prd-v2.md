# PuppyPlan - PRD v2.3 (Supabase-first, beta-scope)

> Обновлено: 2026-05-17  
> Статус: продуктовый и инженерный PRD для закрытой беты  
> Заменяет: `deep-research-report (1).md`, предыдущий `puppyplan-prd-v2.md`, PRD v2.1 и PRD v2.2

## Краткое Резюме

**Brand / Naming Risk.** Current name risk: “PuppyPlan” is close to existing pet-care names such as PupPlan, Pup Planner, and PuppyPlanner, including apps with overlapping training, routine, health, and sharing positioning. Before public launch, validate trademark, App Store / Google Play naming availability, domain availability, ASO conflicts, and alternative names. Do this before final logo, visual identity, paid ASO work, and App Store screenshot production.

**Продукт.** PuppyPlan - нативное iOS/Android-приложение для взрослых людей, которые только что взяли щенка домой. Оно превращает первые хаотичные недели в простой ежедневный операционный цикл: что уже произошло, что делать дальше, кто это сделал и что нужно обсудить с ветеринаром или кинологом.

**Позиционирование.** PuppyPlan - не универсальное приложение про собак, не библиотека тренировок и не медицинское приложение. Это спокойный компаньон на первые 90 дней жизни со щенком: быстрый трекинг рутины, общая видимость для семьи, напоминания, базовые медицинские записи, стартовые подсказки и контролируемый sharing с caregiver или кинологом.

**Языки старта.** Закрытая бета должна иметь полный набор UI-строк на английском, русском и испанском (`en`, `ru`, `es`) с английским как fallback/master locale для typed keys.

**Главное обещание.**

> Первые 90 дней со щенком - с меньшим перегрузом: одна общая рутина, один понятный следующий шаг, одна надежная запись.

**Почему это стоит строить.**
- Рынок питомцев остается большим и устойчивым; APPA сообщала о $158B расходов на питомцев в США в 2025 году и прогнозировала $165B на 2026 год.
- Появление щенка создает короткое, но интенсивное окно тревоги, нарушенного сна, неопределенности в воспитании и повторяющихся ежедневных задач.
- Исследование 2024 года в npj Mental Health Research валидировало шкалу puppy blues и выделило тревогу, фрустрацию и усталость как измеримые компоненты сложного периода щенячьего возраста. Это подтверждает спокойный, поддерживающий тон продукта, но **не** делает PuppyPlan продуктом для mental health.
- Существующие приложения закрывают широту тренировок, логирование или wellness для питомцев. Возможность находится уже: быстрый ежедневный ввод + координация семьи + безопасные записи + контролируемый sharing.

**MVP-тезис.** Закрытая бета должна доказать одну привычку до расширения функциональности:

> Семья может использовать PuppyPlan одну неделю, залогировать 5+ routine events, избежать дублирования ухода и уверенно поделиться статусом щенка с нужным человеком.

**Что изменилось по сравнению с v2.1.**
- Обязательный SQLite/local-first sync заменен на **Supabase-first архитектуру**. Supabase Postgres - durable source of truth; приложение использует cached reads и optimistic mutations.
- `client_event_id` оставлен для idempotent retry safety. Полноценный local event store, durable outbox, sync conflict UI и SQLite ownership убраны из MVP, но добавлено узкое исключение: Minimal Durable Quick Log Queue для unsent Quick Log events.
- Sharing стал first-class: household collaboration, scoped access для trainer/kinologist и shareable puppy cards - отдельные flows.
- Уменьшен beta surface: нет видимого paywall по умолчанию, нет PDF export, milestone card editor, wellbeing check-in и broad server push для household activity; trusted-sitter completion push остается узким исключением.
- IA упрощена с пяти вкладок до трех вкладок + persistent Quick Log, потому что дизайн-емкость - реальное ограничение.
- Добавлены более четкие acceptance criteria для RLS, invite revocation, permission scopes, notification delivery, network failure states, Screen Spec Pack, EU privacy checklist и accessibility.

---

## 1. Цели И Не-Цели

### Цели Продукта

1. Помочь новому владельцу щенка понять следующий полезный шаг без чтения длинного гайда.
2. Сделать выбранные routine trackers возможными в один тап: potty outside/home, poop, feeding, sleep/nap, а также optional zoomies и training.
3. Дать двум caregivers общий source of truth без сложной настройки.
4. Дать владельцу возможность поделиться выбранным статусом щенка с trainer/kinologist без раскрытия всего household.
5. Организовать записи о вакцинации, дегельминтизации и визитах к ветеринару без имитации медицинских назначений.
6. Построить доверенную основу для subscription, exports, referrals и AI позже.

### Критерии Успеха Беты

| Область | Цель |
|---|---:|
| Onboarding completion | 60-70% |
| Activation | 35%+ создают puppy profile + логируют 3 events + создают или принимают 1 reminder за 48h |
| Week 1 routine habit | 35%+ activated households логируют 5+ events за первые 7 дней |
| Shared-care signal | 20%+ eligible households приглашают второго caregiver |
| Sharing signal | 10%+ создают trainer/share preview или отправляют scoped share |
| Push opt-in | 40-55% native opt-in после первого полезного действия |
| D7 retention, activated users | 22-28% |

Не оптимизировать закрытую бету под paid conversion. Pricing можно тестировать после того, как routine и sharing loop покажут retention.

### Qualitative Success Criteria For Closed Beta

Для 20-50 beta users проценты будут шумными, поэтому продуктовая оценка должна включать qualitative signals:

- Пользователь своими словами говорит: "мне стало спокойнее" или "мне стало понятнее, что делать дальше".
- Пользователь логирует без напоминания минимум 2 дня подряд.
- Пользователь возвращается в Today утром или сразу после события со щенком.
- Пользователь понимает, кто видит данные при Family Sharing и Trainer Sharing.
- Пользователь не воспринимает приложение как "еще одну работу".
- Минимум 5 из 20 beta users говорят, что оставили бы приложение после первой недели.
- В user interviews нет устойчивого страха, что Health или Share screens раскрывают слишком много данных.

### Сигналы Закрытия Или Поворота

- Week 1 event logging остается ниже 20% после улучшений onboarding и Quick Log.
- Пользователи говорят, что продукт ощущается как дополнительная работа, а не снижение хаоса.
- Household invite usage ниже 10% в shared-care сегменте.
- Trainer/share preview не используется или пользователи не понимают permission scopes.
- Health/vaccination screens создают путаницу вокруг veterinary advice несмотря на disclaimers.
- Пользователи чаще просят generic training library, чем используют care loop.

### Не-Цели Закрытой Беты

- Нет veterinary diagnosis, medication advice, dosage calculation, emergency triage или telemedicine.
- Нет AI chat coach в пользовательском продукте.
- Нет public social feed или community.
- Нет child accounts.
- Нет insurance affiliate или sponsored product placement.
- Нет full PDF vet export.
- Нет advanced milestone card editor.
- Нет отдельной training library; training в MVP существует только как quick log event/note, а не как каталог уроков.
- Нет полноценного offline-first режима. Есть только Minimal Durable Quick Log Queue для unsent Quick Log events.
- Нет обязательного live IAP/paywall до подтверждения beta retention.
- Нет полноценного multi-pet/foster workflow.

---

## 2. Аудитория И Позиционирование

### Primary ICP

**Взрослый first-time puppy owner в первые 14 дней после появления щенка дома.**

Типичное состояние:
- плохо спит;
- боится делать что-то неправильно;
- получает противоречивые советы из social media;
- забывает точное время feeding, potty, sleep и walks;
- может делить уход с partner, family member, walker, sitter или trainer.

### Основные Персоны

**1. Владелец A, 29, solo first-time owner.**
Работает удаленно, у нее 11-недельный щенок, она перегружена сном, biting и toilet accidents. Ей нужно, чтобы приложение сразу снижало cognitive load. Она не потерпит долгую настройку.

**2. Владелец B и Опекун A, 32 и 31, shared care.**
Их боль - координация: duplicate feeding, пропущенные walks и "я думал, ты это сделал". Им нужна shared timeline, last-action visibility и duplicate warnings.

**3. Владелец C, 35, владелец, работающий с trainer/kinologist.**
Она хочет показать выбранный progress, potty patterns и training notes, не давая trainer доступ ко всем health notes, private household details или billing settings.

### Вторичные Персоны

**4. Владелец D, 38, parent managing family care.**
Дети помогают со щенком, но не являются пользователями приложения. Владельцу D нужен спокойный dashboard, task visibility и простая account model.

**5. Владелец E, 64, retired companion-dog owner.**
Он ценит reminders, readable typography и health records больше, чем shareable moments. Accessibility для этого сегмента обязательна.

**6. Волонтёр A, 34, foster/rescue volunteer.**
Потенциально сильный advocate, но multi-pet и foster workflows - Phase 1+. Не оптимизировать closed beta под эту персону ценой простоты для first-time owner.

### Эмоциональное Позиционирование

Использовать puppy blues как сигнал тона и эмпатии, а не как clinical claim.

Разрешено:
- "Первые недели могут оказаться сложнее, чем ожидалось."
- "Многие владельцы чувствуют усталость, неуверенность или перегруз."
- "Вы не проваливаетесь. Давайте сделаем следующий шаг понятным."

Избегать:
- "Мы лечим puppy blues."
- "Клинически доказано снижает тревогу."
- "Это остановит burnout."
- "Ваш mood score означает..."

### Конкурентный Контекст

**Training and lifestyle apps:** Woofz, Dogo, Zigzag, Puppr, GoodPup, Pupford.  
Риск: у них есть content breadth и brand presence.

**Logging and household apps:** DogLog, Doggy Time, PupFi, 11pets.  
Риск: они уже закрывают части workflow.

**Дифференциация PuppyPlan:**
1. one-tap routine capture;
2. household coordination видна на Today, а не спрятана в settings;
3. trainer/kinologist sharing с explicit scopes;
4. vet-safe health record language;
5. спокойный, поддерживающий тон на первые 90 дней;
6. agent-built velocity со строгими contracts и QA.

---

## 3. Объем Продукта

### Закрытая Бета: Must Ship

| Feature | MVP-поведение |
|---|---|
| Puppy quick setup | Имя + возраст/дата рождения + до 5 quick trackers; до 45 секунд; lightweight age hint после ввода возраста |
| Anonymous or deferred account | Сначала ценность, потом email, где это возможно; account обязателен перед multi-device sharing |
| Today | Один hero с next-best-action, 3-5 daily cards, last household action |
| Quick Log | Выбранные quick trackers в один тап: potty outside/home, poop, feeding, sleep/nap; optional zoomies/training; optional details после сохранения |
| Timeline | Фильтруемый список routine events с edit/delete/undo |
| Family Sharing | Invite 1 caregiver, shared Today/Timeline, last-action strip, duplicate warnings, activity attribution, trusted-sitter checklist |
| Trainer/Viewer Sharing | Scoped invite или share preview с явно показанными visible data categories |
| Reminders | Local scheduled reminders, trusted-sitter checklist prompts, quiet hours, snooze/skip/done |
| Health Basics | Ручные vaccine/deworming/vet visit records; состояния template vs confirmed |
| Starter Guidance Cards | Одна lightweight positive-reinforcement card в день внутри Today |
| Supabase data layer | Auth/Postgres/RLS/Storage/Realtime enhancement; без local-first sync |
| Analytics | Privacy-preserving funnel и только habit events |
| Accessibility | Dynamic Type, VoiceOver/TalkBack labels, WCAG 2.2 AA contrast target |

### Закрытая Бета: Строить Только Если Core Loop Стабилен

Это не blockers для beta release:

| Candidate | Ограничение |
|---|---|
| Paywall surface | Только feature flag; entitlement interface может существовать, live purchase не требуется |
| RevenueCat live IAP | Нужно перед public paid launch, не перед closed beta |
| Realtime household strip | Только enhancement; foreground refetch и manual refresh должны быть достаточны |
| Shareable static puppy card | Простой generated artifact или signed link; без editor |
| Vet report export | Text/HTML prototype только после working core retention |

### Phase 1: Расширение Для Public Launch

- Live RevenueCat IAP, restore purchase, entitlement webhook, cancellation state.
- PDF vet report export с background job.
- Weight tracking и symptom journal.
- Weekly digest email.
- Multi-caregiver roles за пределами closed-beta limits.
- Multi-pet support для foster/rescue users.
- Basic referral program.
- Better milestone templates.

### Phase 2: Growth И Intelligence

- Breed-specific training plans.
- Junior dog mode after 12 months.
- AI Q&A со строгими safety boundaries и без medical diagnosis.
- Insurance affiliate, только после установления доверия к health-функциям.
- Clinic/trainer referral pilots.
- Sponsored commerce только с explicit labeling и без health-pressure placement.

---

## 4. Основные Пользовательские Flow

### Онбординг

Цель: довести пользователя до первого полезного plan меньше чем за 45 секунд.

Flow:
1. Welcome: "Первые дни со щенком могут быть messy. Начните с одного понятного плана."
2. Puppy setup: имя щенка + возраст/дата рождения.
3. Age hint: показать одну короткую контекстную подсказку по возрасту, например "5 месяцев - скоро могут активнее меняться зубы"; формулировка должна быть supportive, не medical advice.
4. Выбрать до 5 quick trackers, которые владелец хочет видеть в Quick Log. Recommended defaults: "пописал на улице", "пописал дома", "покакал", "кормление", "сон/дневной nap". Пользователь может заменить часть defaults на "zoomies" или "training".
5. Plan reveal: показать Today с 3 конкретными starter actions на основе выбранных trackers.
6. Дать пользователю залогировать первый event до тяжелой account wall, если это возможно.
7. Просить account перед multi-device continuity, family sharing, trainer sharing или premium.
8. Просить notifications только после first log или first reminder creation.

Правила:
- В первой сессии не требовать breed, weight, photo, full address или long goals.
- Предпочитать Apple, Google, magic link или Supabase anonymous auth, который можно позже linked.
- Если anonymous auth включен, RLS должен отличать anonymous от permanent users для sensitive actions.
- Если пользователь offline до account creation, хранить только temporary local draft; не обещать durable offline logging.
- Age hints основаны на coarse age bucket, не на breed-specific prediction; всегда allow edit, если возраст приблизительный.

### Today

Цель: один взгляд должен показывать владельцу или household, что важно сейчас.

Required layout:
- top bar: имя щенка, возраст в неделях, household avatars при наличии;
- optional age microcopy рядом с Today hero или setup reveal, максимум одна строка и без alarmist language;
- household activity strip: "Опекун A покормил Щенка A 42 мин назад";
- только one hero card;
- Quick Log action в thumb zone;
- daily cards с максимум 5 visible items;
- одна optional starter guidance card в день;
- health items используют спокойный status, без emergency styling, если пользователь явно не отметил urgent note.

Нет streaks в первые 14 дней. Использовать формулировки вроде "недельный ритм" или "рутина формируется".

### Day 2-7 Retention Journey

Цель: объяснить, почему пользователь возвращается каждый день после первой сессии.

**Day 1: first value.**
- пользователь создает puppy profile, выбирает quick trackers и логирует первый event;
- Today показывает 3 starter actions и один спокойный age hint;
- notification permission запрашивается только после первого log/reminder.

**Day 2 morning: orientation.**
- Today открывается с "Что уже понятно со вчера" и "Что сделать сейчас";
- показывается последний sleep/potty/feeding event;
- если данных мало, app предлагает один маленький log, а не длинную настройку.

**After accident.**
- Quick Log дает быстрый "пописал дома" без shame language;
- Today может показать neutral recovery card: "Accidents happen. Следующий шанс - после сна/еды";
- duplicate warning не появляется для accident, если пользователь явно логирует новое событие.

**After feeding pattern.**
- после 2-3 feeding events app предлагает one-tap confirmation: "Обычная порция?";
- Today показывает next likely feeding reminder только если пользователь создал или принял suggestion;
- details остаются optional.

**After invite.**
- owner видит last-action strip с attribution: "Опекун A покормил Щенка A 15 мин назад";
- caregiver видит тот же Today, но без owner/billing/share settings;
- если caregiver сделал log, owner видит update in-app без broad household push.

**After missed reminder.**
- Reminder card не обвиняет пользователя;
- actions: Done, Snooze, Skip, Edit, Stop;
- copy: "Если это уже произошло, отметьте как done. Если нет - перенесите."

**Day 7: weekly rhythm.**
- Today показывает lightweight weekly rhythm summary: сколько events было залогировано и что стало понятнее;
- no streaks, no failure language;
- app предлагает сохранить текущие quick trackers или заменить один tracker, если он не используется.

### Quick Log

Цель: записать реальное событие быстрее, чем открыть Notes.

Quick tracker rules:
- максимум 5 visible quick trackers на первом экране;
- recommended defaults: "пописал на улице", "пописал дома", "покакал", "кормление", "сон/nap";
- zoomies и training доступны как selectable trackers в setup/edit trackers, но не добавляются поверх лимита;
- hidden trackers остаются доступны через Add event / More, чтобы пользователь не терял данные при изменении набора.

Potty:
- primary buttons: "Пописал на улице", "Пописал дома", "Покакал";
- сохранение с current timestamp;
- snackbar: Undo / Add details;
- optional details: context, note, photo.

Feeding:
- после появления feeding pattern показывать one-tap confirmation;
- разрешать "порцию", когда grams неизвестны;
- duplicate warning, если похожее feeding уже есть в time window.

Sleep:
- start/stop nap;
- quick "спал" entry для retrospective logging;
- не использовать pressure language вокруг "хорошего" sleep.

Zoomies:
- one-tap "zoomies" event;
- optional details: context, duration bucket, note;
- используется для household visibility и pattern review, не как behavioral diagnosis.

Training:
- one-tap "training" event;
- optional details: topic, duration bucket, note;
- не открывает отдельную training library и не обещает training plan.

Network behavior:
- Online save: optimistic UI, затем server confirmation.
- Slow network: показать "Сохраняем..." и сохранить действие reversible до confirmation.
- Failed save или offline: persist unsent event locally с `client_event_id`, показать pending state, retry on reconnect/foreground.
- Pending event можно delete/undo, пока он не подтвержден server confirmation.
- Если retry окончательно не проходит, показать "Не удалось сохранить. Повторить?" рядом с событием в Timeline/Today.
- Не создавать полноценный local-first event store, sync conflict resolver или broad durable outbox в closed beta.

### Family Sharing

Цель: снизить конфликт "я думал, ты это сделал".

MVP:
- invite one caregiver через email, magic link или share link;
- roles: `owner`, `caregiver`, `viewer`;
- shared Today and Timeline;
- last-action strip;
- duplicate detection for potty/feeding within 60 seconds;
- activity attribution на всех events;
- app показывает, кто что сделал, например "Опекун A покормил Щенка A 15 мин назад";
- owner может resend, revoke или expire invite;
- owner может remove caregiver, и access прекращается сразу.

Trusted Sitter Mode:
- owner может пометить единственного invited caregiver как trusted sitter на выбранный период, когда owner уезжает или передает уход;
- sitter видит общий Today, Timeline и checklist из выбранных trackers/reminders, без доступа к billing, owner settings или private share scopes;
- sitter получает reminders/checklist prompts на своем устройстве после accept;
- owner видит completion updates in-app, например "Щенок A накормлен"; push completion notifications разрешены только как узкий trusted-sitter сценарий, а не как broad household activity push;
- режим должен работать как view over existing caregiver membership/reminders, без отдельного сложного schedule ownership в closed beta.

Role behavior:
- `owner`: управляет puppy, household, invites, records и billing/entitlement.
- `caregiver`: логирует и редактирует routine events, создает reminders, добавляет non-critical notes.
- `viewer`: читает выбранные Today/Timeline/Health data, без writes.

Non-MVP:
- child accounts;
- chore assignment to minors;
- complex schedule ownership;
- unlimited household members.
- paid sitter management, shifts, rates или multi-day rota.

### Trainer / Kinologist Sharing

Цель: дать владельцу безопасно поделиться полезным контекстом щенка без раскрытия всего household.

MVP:
- создать permission preview перед отправкой;
- role: `trainer_viewer`;
- scopes: `routine_summary`, `training_notes`, `selected_timeline_range`, `health_summary`;
- health details выключены по умолчанию;
- invite expires by default;
- owner может revoke at any time;
- shared view clearly says what is visible.

Shareable puppy cards:
- generated artifact или signed link, не household membership;
- содержит только owner-selected fields;
- private notes по умолчанию не включаются;
- public/externally shared links требуют expiry и revocation.

### Reminders

Цель: помогать владельцам действовать, не превращаясь в сложный task manager.

MVP:
- feeding, potty, sleep, vaccine/deworming review reminders;
- trusted-sitter checklist reminders, если caregiver принял invite и owner включил режим;
- local scheduled notifications;
- quiet hours;
- Done / Snooze / Skip / Edit / Stop;
- timezone хранится на reminder;
- denial state, если notifications не разрешены.

Realtime and push:
- Push notifications сначала только для reminders и trusted-sitter completion updates.
- Broad cross-device household push - Phase 1.
- Shared screens обновляются через foreground, manual pull и optional 15-30 second polling.

### Health Basics

Цель: trustworthy recordkeeping, а не veterinary instruction.

MVP:
- manual vaccination, deworming, preventive, vet visit records;
- optional template suggestions с "review with vet";
- status: `template`, `needs_vet_review`, `confirmed`, `completed`;
- provider name optional;
- note field разрешено, но никогда не отправляется в analytics;
- edit/delete с `updated_by`, `updated_at`, `deleted_at`.

Не делать:
- calculate dosage;
- recommend medication;
- show urgency, если пользователь сам не отметил что-то urgent;
- infer a diagnosis from routine logs.

### Starter Guidance Cards

Цель: создать уверенность, не конкурируя с dedicated trainer apps.

MVP:
- 14 cards total, максимум one per day;
- показываются inside Today, не отдельной library;
- только positive reinforcement;
- topics: first night, potty rhythm, biting, crate/settling, handling, socialization windows, vet visit prep;
- states: read, practiced, skip.

Escalation copy:
- contact a vet/trainer при intense fear, persistent distress, aggression-like concerns или health symptoms.

---

## 5. UX И Design System

### UX-принципы

1. **One next action.** Избегать dashboards, которые заставляют уставшего пользователя приоритизировать.
2. **Fast thumb logging.** Primary actions должны жить в нижней половине mobile screens.
3. **Sharing clarity.** Каждый share/invite screen должен говорить, кто что видит.
4. **Calm medical language.** Health screens должны ощущаться trustworthy, not alarmist.
5. **No shame metrics.** Избегать streak pressure, red failure states и copy в стиле "вы пропустили" в первые недели.
6. **Native affordances first.** Использовать platform sheets, tabs, menus, haptics и Dynamic Type вместо custom decorative UI.
7. **Celebration after utility.** Milestones никогда не вытесняют care tasks above the fold.

### Визуальное Направление

Целевой стиль: calm utility + warm companion.

Design tokens:
- Background: warm off-white / light neutral.
- Text: high-contrast charcoal.
- Primary: calm blue or teal.
- Accent: warm amber/coral only for celebration.
- Health status colors: muted and accessible; red only for user-marked urgent notes.
- Radius: 8-12px for cards and sheets.
- Type: native system font for mobile; avoid custom font complexity in MVP.

Avoid:
- heavy purple AI gradients;
- bokeh/orb backgrounds;
- dense dashboards;
- oversized mascot screens;
- decorative cards inside cards;
- emoji as functional icons;
- custom dark mode unless every beta screen passes contrast and screenshot QA.

### Информационная Архитектура

Closed beta IA:
- Today
- Health
- More

Persistent action:
- Quick Log bottom action / FAB.

Где что находится:
- Timeline доступен из Today и More.
- Starter Guidance Cards живут внутри Today.
- Family и Trainer Sharing живут в More и contextual prompts.
- Reminders можно создать из Today, Health и More.

Не добавлять отдельный Train tab, пока volume контента не оправдает это.

### Рекомендации По Native UI

Использовать Expo SDK 55 / Expo Router native capabilities там, где они стабильны:
- NativeTabs / bottom tabs for primary navigation.
- Native form sheets for Quick Log and edit flows.
- Platform dynamic color where it improves OS fit.
- Pressable for touch interactions; use `hitSlop` for small icon buttons.
- iOS 26 Liquid Glass только через native system components; не имитировать glass heavy blur.
- Expo UI SwiftUI / Jetpack Compose components только для isolated components после spike, не как beta dependency.
- Hermes V1 opt-in only after profiling, not by default.

### Acceptance По Accessibility

- WCAG 2.2 AA contrast для текста и meaningful controls.
- Minimum 44x44pt touch target для primary controls.
- `hitSlop` для compact icon controls.
- Dynamic Type XXL/XXXL screenshots обязательны для Today, Quick Log, Health, Invite/Sharing.
- VoiceOver/TalkBack full pass для Quick Log, invite preview и Health record entry.
- Focus order matches visual order.
- Reduced Motion respected для animations и guidance cards.
- Не полагаться только на цвет для health status.
- Все error messages находятся рядом с field/action, который их вызвал.
- One-handed logging verified на small iPhone и common Android sizes.

### Правила Copy

Предпочтительно:
- "Похоже, это еще нужно проверить."
- "Если вы уже сделали это, отметьте как готово."
- "Рутина обычно выстраивается за несколько дней."
- "Многие новые владельцы сначала чувствуют перегруз."
- "Этот share включает: routine summary и training notes."

Избегать:
- "Ошибка" / "Failed" как primary user-facing state.
- "Плохая серия" / "Bad streak."
- "Вы забыли" / "You forgot."
- "Emergency", если пользователь явно не записал urgent symptom и не выбрал этот label.
- "Mom/dad" как default owner language.
- Infantilizing language.

### Screen Spec Pack For Designers And AI Agents

Этот блок является дизайн-контрактом. AI agents не должны самостоятельно менять hierarchy, primary actions, naming или screen states без обновления PRD.

#### Route Map

Primary tabs:
- `/today`
- `/health`
- `/more`

Primary modal/sheet routes:
- `/quick-log`
- `/quick-log/details`
- `/timeline`
- `/reminders/edit`
- `/family/invite`
- `/sharing/trainer-preview`
- `/sharing/scope-selector`
- `/health/record-edit`
- `/settings/quick-trackers`

#### Global Screen States

Every screen must define:
- loading: skeleton or reserved space, no layout jump;
- empty: one clear next action;
- error: clear recovery action, no blame language;
- offline-read: show cached content with label "Показаны последние сохраненные данные";
- pending-write: visible pending state with undo/delete if applicable;
- permission-denied: explain impact and provide settings path;
- revoked/expired share: neutral unavailable state.

#### Today Screen Contract

Layout hierarchy:
1. Top bar: puppy name, age bucket, household avatars.
2. Household activity strip: last action with actor and time bucket.
3. One hero card: next useful action only.
4. Quick Log bottom action/FAB in thumb zone.
5. Daily cards: max 5 visible cards.
6. Optional starter guidance card: max one per day.
7. Timeline entry point below care actions.

Hero rules:
- one card only;
- no streaks before Day 14;
- no red urgent styling unless user marked urgent;
- copy must be operational or supportive, not gamified.

Today states:
- first day: 3 starter actions and first-log prompt;
- day 2 morning: last night/day recap and one next action;
- accident recovery: calm recovery card, no shame copy;
- after invite: show household attribution;
- missed reminder: Done/Snooze/Skip/Edit/Stop;
- day 7: weekly rhythm summary, no streak language.

#### Quick Log Contract

Trigger:
- persistent bottom action/FAB from Today;
- opens native bottom sheet;
- primary actions fit in one thumb zone row/grid.

First screen:
- max 5 visible quick trackers;
- each tracker is a large 44pt+ button with icon + label;
- selected defaults: potty outside, potty inside, poop, feeding, sleep/nap;
- zoomies/training available only if selected during setup or edit trackers.

After tap:
- event appears immediately in Today/Timeline;
- snackbar: Undo / Add details;
- pending state if server not confirmed;
- failed state has Retry / Delete.

Duplicate warning:
- non-blocking bottom sheet or inline warning;
- copy: "Другой опекун уже логировал feeding за последние 60 секунд. Все равно добавить?";
- actions: Add anyway / Cancel.

#### Timeline Item Contract

Each item includes:
- event icon;
- event label;
- occurred_at in friendly time bucket;
- actor attribution;
- pending/synced/failed state;
- optional detail indicator;
- overflow menu: Edit, Delete.

Do not show raw IDs, exact technical error messages, or analytics/debug data.

#### Health Record Contract

Health list row:
- title;
- status pill;
- date;
- source label: Template / Confirmed;
- optional "Review with vet" copy.

Template visual:
- muted status pill;
- copy: "Template, not a prescription";
- no urgent color.

Confirmed visual:
- stronger neutral status;
- completed date visible;
- provider/photo/note hidden from share previews unless explicitly selected.

#### Invite And Sharing Contract

Family Invite:
- show role selector: caregiver/viewer;
- show what role can do;
- show expiry/revoke copy;
- primary button: Send invite.

Trainer Sharing Preview:
- show selected scopes as rows with toggles;
- health_summary off by default;
- show examples of visible fields;
- primary button disabled until user confirms understanding;
- copy must say: "Вы можете revoke this share at any time."

Permission Scope Selector:
- each scope has included/excluded preview;
- notes/photos require explicit item-level selection;
- share link must show expiry.

#### More Screen Contract

More contains:
- Timeline;
- Family Sharing;
- Trainer Sharing;
- Reminders;
- Quick Trackers settings;
- Puppy profile;
- Notification preferences;
- Privacy/export/delete account;
- Subscription/paywall only if feature flag is enabled;
- App support.

Do not hide sharing or privacy controls behind unrelated settings.

#### Acceptance Screenshots

Before closed beta, capture and review:
- Today: first day, day 2 morning, day 7 weekly rhythm, offline-read, pending-write.
- Quick Log: default trackers, duplicate warning, pending event, failed retry.
- Timeline: synced item, pending item, failed item.
- Health: template row, confirmed row, edit form.
- Sharing: family invite, trainer preview, scope selector, expired share.
- More: full list and notification preferences.
- Accessibility: Dynamic Type XXL/XXXL for Today, Quick Log, Health, Sharing Preview.

---

## 6. Техническая Архитектура

### Платформенное Решение

Сначала строим native iOS и Android с Expo.

Обоснование:
- Better notification, store distribution, in-app purchase, share sheet, haptics, camera/photo, accessibility и app-like retention, чем у PWA.
- App Store / Google Play discovery и ASO важны для этой категории.
- RevenueCat сможет унифицировать native entitlement state, когда paid launch будет готов.
- PWA остается полезной для landing, SEO, trainer/share web views и lightweight web flows, но это не primary product surface.

Важное уточнение:
- Apple объявила, а затем отменила план убрать EU Home Screen web apps в 2024 году. Не обосновывать native-first тем, что PWA impossible. Обосновывать product fit, notifications, store distribution и purchase flow.

### Мобильный Стек

Baseline:
- Expo SDK 55.
- React Native 0.83.
- React 19.2.
- React Native New Architecture.
- TypeScript strict.
- Expo Router.
- Zustand for local UI state.
- TanStack Query for server state, optimistic mutations, query invalidation, and cached reads.
- Zod for runtime contracts.
- React Hook Form for forms.
- Expo SecureStore for sensitive local values where appropriate.
- Supabase-supported session storage: AsyncStorage, SecureStore wrapper, or Expo SQLite `localStorage` adapter after a spike.
- Если Expo SQLite установлен только для Supabase session/localStorage support, он не является application data store.
- AsyncStorage or TanStack Query persistence only for lightweight preferences and cached read data.
- Expo Notifications for local scheduled notifications and push token registration.
- Expo Haptics, Image, FileSystem, and Sharing where needed.

Не использовать в closed beta:
- SQLite event store;
- durable outbox;
- bidirectional local-first sync engine;
- conflict resolver UI;
- CRDTs;
- custom server API layer unless Supabase Edge Functions are insufficient.

Development:
- Использовать EAS development builds, а не Expo Go, потому что notifications, subscriptions, native modules и SDK 55 New Architecture требуют real dev builds.
- Запускать `expo-doctor` перед фиксацией third-party native libraries.
- Держать SDK 54 compatibility только как fallback, если critical SDK 55 dependency блокирует beta.

### Backend И Data Platform

MVP backend surface:
- Supabase Postgres для durable user, household, puppy, routine, reminder, health и sharing data.
- Supabase Auth для anonymous auth, magic link, Apple и Google.
- Supabase RLS для household и share-scope isolation.
- Supabase Storage для private media assets, если photo notes войдут в scope.
- Supabase Realtime для household activity strip как enhancement.
- Supabase Edge Functions для privileged membership changes, invite acceptance, token handling и future webhooks.
- Sentry для errors с PII scrubbing.
- PostHog или аналог для privacy-safe analytics с отключенным session replay в MVP.

Не добавлять в closed beta:
- Railway или отдельный API service;
- PDF/background job worker;
- broad server push for household activity outside reminders/trusted-sitter completion updates;
- broad GraphQL layer;
- externally shared public UGC without moderation/revocation.

### Источник Данных И Offline

MVP is Supabase-first.

Правила:
- Supabase Postgres - единственный durable source of truth.
- Приложение использует TanStack Query для server state, cached reads и optimistic UI.
- Недавно просмотренные Today и Timeline могут быть доступны как read-only cache.
- Offline reads могут показывать last successful cache с понятным offline state.
- Broad offline writes не являются beta requirement.
- Приложение может держать temporary local draft для pre-account onboarding.
- Minimal Durable Quick Log Queue является единственным durable local-write исключением в MVP.
- Не реализовывать full SQLite event store, broad durable outbox, sync conflict resolver или local-first sync в MVP.
- Сохранять `client_event_id` на routine events для idempotent insert/retry safety.
- Переходить к durable mutation queue или SQLite/local-first только если beta data покажет частые failed logging из-за connectivity.

### Minimal Durable Quick Log Queue

Цель: не терять самое важное действие пользователя, не превращая MVP в local-first продукт.

Scope:
- только Quick Log events;
- только минимальный payload, нужный для server insert;
- обязательно `client_event_id`;
- local persistence через lightweight storage, выбранный после spike: AsyncStorage, SecureStore wrapper, Expo SQLite `localStorage` adapter или TanStack Query mutation persistence;
- no local timeline source of truth;
- no conflict UI except pending/delete/retry.

Queue behavior:
- если Quick Log mutation fails или user offline, event сохраняется locally как `pending`;
- Today и Timeline показывают pending state;
- retry happens on reconnect, app foreground, and manual retry;
- user can undo/delete while pending;
- server deduplicates by `(household_id, client_event_id)`;
- after server confirmation, pending state is replaced by synced server event;
- if server rejects permanently, show failed state with retry/delete.

Queue states:
- `pending_local`;
- `sending`;
- `server_confirmed`;
- `failed_retryable`;
- `failed_permanent`;
- `deleted_before_sync`.

Telemetry:
- track `offline_or_failed_log_recovered`;
- track `pending_quick_log_created`;
- track `pending_quick_log_deleted`;
- do not track note text or puppy name.

### Realtime И Refresh

Realtime - enhancement, а не correctness dependency.

MVP должен работать через:
- query invalidation after mutations;
- app foreground refetch;
- pull-to-refresh;
- optional 15-30 second polling on shared household screens.

Supabase Realtime можно включить для:
- household activity strip;
- second-device Timeline updates;
- invite acceptance state.

Не использовать Realtime как единственный source of truth. Если Realtime отвалился, следующий foreground refetch должен восстановить корректность.

### Notification Architecture

Разделить local reminders и remote push. Они решают разные задачи и не должны смешиваться.

Local reminders:
- создаются на устройстве через Expo Notifications;
- работают для личных reminders, even if app is offline;
- хранят `local_notification_id` для cancel/reschedule;
- primary actions: Done, Snooze, Skip, Edit, Stop;
- должны уважать timezone и quiet hours.

Remote push:
- используется для trusted-sitter completion updates и later public-launch scenarios;
- не используется как broad household activity push в closed beta;
- требует explicit notification permission и user-level preferences;
- failure delivery не должен ломать source of truth, потому что source of truth остается Supabase.

MVP notification entities:
- `device_push_token`: `id`, `user_id`, `device_id`, `platform`, `expo_push_token`, `apns_token`, `fcm_token`, `enabled`, `last_seen_at`, `revoked_at`.
- `notification_preference`: `id`, `user_id`, `household_id`, `reminder_push_enabled`, `trusted_sitter_completion_push_enabled`, `quiet_hours`, `timezone`, `updated_at`.
- `reminder_occurrence`: `id`, `reminder_id`, `scheduled_for`, `local_notification_id`, `status`, `action_taken`, `acted_by`, `acted_at`.
- `notification_delivery_log`: `id`, `user_id`, `household_id`, `notification_type`, `channel`, `provider_message_id`, `delivery_status`, `error_category`, `created_at`.
- `trusted_sitter_completion_event`: `id`, `household_id`, `puppy_id`, `completed_by`, `source_event_id`, `completion_type`, `created_at`.

Acceptance:
- local reminder can be scheduled, updated, canceled, and rescheduled after timezone change;
- local reminder still works without remote push token;
- denied notification permission shows a calm in-app state;
- trusted-sitter completion update can appear in-app without push;
- notification_delivery_log never stores note text, puppy name, email, or token value.

### Sharing И Permissions

Использовать Supabase Auth + RLS как source of truth для collaboration.

Membership roles:
- `owner`: manage puppy, household, billing/entitlement, invites, records, and deletion.
- `caregiver`: log/edit routine events, create reminders, add non-critical records.
- `viewer`: read selected household data, no writes.
- `trainer_viewer`: read explicitly selected scopes, no writes, no billing, no private health details by default.

Share scopes:
- `routine_summary`
- `selected_timeline_range`
- `training_notes`
- `health_summary`
- `puppy_profile`

Share scope definitions:

| Scope | Included by default | Excluded by default |
|---|---|---|
| `routine_summary` | Aggregated counts and last-known routine state for potty, feeding, sleep, zoomies, training; coarse time buckets; no free text | note text, photos, exact timestamps if coarse bucket is enough, caregiver email |
| `selected_timeline_range` | Owner-selected date range, selected event types, event type, occurred_at, created_by display name or generic role | events outside range, private notes, deleted events, billing/account metadata |
| `training_notes` | Training event topics, duration bucket, owner-selected notes marked shareable | all non-training notes, health notes, photos unless explicitly selected |
| `health_summary` | record title, status, scheduled/completed date, source/template vs confirmed | notes, provider_name, attachments/photos, medication details, urgent private comments by default |
| `puppy_profile` | puppy display name, age bucket or birth date if owner allows, selected public photo if any, selected focus areas | owner identity, address, raw household member list, billing/subscription |

Permission preview rules:
- show every selected scope before sending;
- show plain-language examples of visible fields;
- health_summary starts off by default for trainer links unless owner enables it;
- notes/photos are never included by category-level default; they require explicit per-item selection;
- expired/revoked links must show a neutral "This share is no longer available" state.

Sharing requirements:
- permission preview before sending;
- expiry for external scoped links;
- revocation;
- audit metadata: `created_by`, `accepted_by`, `revoked_by`, timestamps;
- owner can remove membership immediately;
- trusted-sitter mode must not grant permissions beyond the existing `caregiver` membership; it only changes visible checklist/reminder context;
- RLS negative tests for every household and share-scoped table.

### API-контракты

Использовать shared Zod schemas для:
- puppy profile and selected quick trackers;
- event payloads;
- health records;
- reminders;
- reminder occurrences;
- notification preferences and delivery logs;
- household invites;
- trainer/share scopes;
- minimal quick log queue item;
- entitlement state;
- analytics events.

Генерировать TypeScript types из Supabase schema там, где возможно, но не полагаться на generated types как на единственный validation layer.

### Модель Данных

Core entities:
- `user`
- `household`
- `household_membership`
- `puppy`
- `event_log`
- `health_record`
- `reminder`
- `reminder_occurrence`
- `invite`
- `share_link`
- `share_scope`
- `device_push_token`
- `notification_preference`
- `notification_delivery_log`
- `trusted_sitter_completion_event`
- `minimal_quick_log_queue_item`
- `subscription_entitlement`
- `media_asset`
- `content_version`

Phase 1 entities:
- `export_job`
- `symptom_entry`
- `weight_entry`
- `wellbeing_checkin` (explicit opt-in only)
- `webhook_event`

Key fields:

| Entity | Required MVP Fields |
|---|---|
| `puppy` | `id`, `household_id`, `name`, `birth_date` or `age_weeks_estimate`, `created_at`, `updated_at` |
| `event_log` | `id`, `puppy_id`, `household_id`, `created_by`, `client_event_id`, `event_type`, `occurred_at`, `payload_version`, `payload`, `version`, `deleted_at` |
| `health_record` | `id`, `puppy_id`, `record_type`, `title`, `status`, `source`, `scheduled_for`, `completed_at`, `provider_name`, `notes`, `version`, `updated_by`, `updated_at`, `deleted_at` |
| `reminder` | `id`, `puppy_id`, `created_by`, `assigned_to`, `reminder_type`, `schedule_rule`, `timezone`, `quiet_hours`, `enabled`, `trusted_sitter_visible`, `version` |
| `reminder_occurrence` | `id`, `reminder_id`, `scheduled_for`, `local_notification_id`, `status`, `action_taken`, `acted_by`, `acted_at` |
| `invite` | `id`, `household_id`, `email_hash`, `token_hash`, `token_last4`, `role`, `expires_at`, `accepted_at`, `revoked_at` |
| `share_link` | `id`, `household_id`, `puppy_id`, `token_hash`, `role`, `scopes`, `expires_at`, `accepted_at`, `revoked_at` |
| `device_push_token` | `id`, `user_id`, `device_id`, `platform`, `expo_push_token`, `apns_token`, `fcm_token`, `enabled`, `last_seen_at`, `revoked_at` |
| `notification_preference` | `id`, `user_id`, `household_id`, `reminder_push_enabled`, `trusted_sitter_completion_push_enabled`, `quiet_hours`, `timezone`, `updated_at` |
| `notification_delivery_log` | `id`, `user_id`, `household_id`, `notification_type`, `channel`, `provider_message_id`, `delivery_status`, `error_category`, `created_at` |
| `trusted_sitter_completion_event` | `id`, `household_id`, `puppy_id`, `completed_by`, `source_event_id`, `completion_type`, `created_at` |
| `minimal_quick_log_queue_item` | local-only: `client_event_id`, `household_id`, `puppy_id`, `event_type`, `payload_version`, `payload`, `occurred_at`, `state`, `retry_count`, `created_at`, `updated_at` |
| `subscription_entitlement` | `id`, `household_id`, `provider`, `provider_customer_id_hash`, `entitlement`, `status`, `renews_at` |

Event type MVP enum:
- `potty` with quick actions `pee_outside`, `pee_inside`, `poop`
- `feeding`
- `sleep`
- `zoomies`
- `training`
- `health_record_reference`

### Форма RLS Policies

Все household-scoped reads требуют membership или valid scoped share access. Writes требуют `owner` или `caregiver`, где это разрешено.

```sql
CREATE POLICY household_event_read ON event_log
  FOR SELECT TO authenticated
  USING (
    household_id IN (
      SELECT household_id
      FROM household_membership
      WHERE user_id = auth.uid()
        AND revoked_at IS NULL
    )
  );

CREATE POLICY household_event_insert ON event_log
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND household_id IN (
      SELECT household_id
      FROM household_membership
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'caregiver')
        AND revoked_at IS NULL
    )
  );
```

RLS tests must include:
- non-member cannot read household data;
- viewer cannot write;
- trainer_viewer cannot read health details unless `health_summary` is selected;
- revoked member loses access;
- expired share link cannot read;
- anonymous user cannot create external share links unless converted or policy explicitly allows it.
- user cannot read another user's `device_push_token`;
- notification preferences can only be read/changed by the owning user or allowed household owner where applicable;
- notification_delivery_log stores delivery metadata only, no private content.

### Observability

Track:
- app start;
- onboarding step completed;
- puppy profile created;
- event logged;
- event save failed;
- today viewed;
- reminder created;
- reminder action taken;
- invite sent/accepted/revoked;
- share preview opened;
- share link created/accepted/revoked;
- health record added;
- paywall viewed only if feature flag is enabled;
- trial started only if live purchase testing is enabled;
- entitlement active only if live purchase testing is enabled;
- error category.

Do not track:
- puppy name;
- note text;
- symptom text;
- mood free text;
- puppy photo content;
- provider names;
- exact address;
- private email in raw analytics;
- invite tokens or share tokens;
- exact timestamps where a coarse bucket is enough.

Performance metrics:
- app cold start;
- Today time-to-interactive;
- Quick Log tap-to-visible-update latency;
- Quick Log server-confirmation latency;
- failed save rate;
- Realtime reconnect rate where enabled;
- push delivery/open where available.

Additional product metrics:
- `time_to_first_log`;
- `quick_log_tap_to_visible_update_ms`;
- `quick_log_abandoned`;
- `undo_used`;
- `details_added_after_log`;
- `duplicate_warning_seen`;
- `duplicate_warning_confirmed`;
- `reminder_created_from_suggestion`;
- `offline_or_failed_log_recovered`;
- `pending_quick_log_created`;
- `pending_quick_log_deleted`;
- `share_scope_preview_understood`;
- `day_2_morning_today_viewed`;
- `day_7_weekly_rhythm_viewed`.

---

## 7. Privacy, Safety И Compliance

### Классификация Данных

| Data | Sensitivity | MVP Rule |
|---|---|---|
| Email/auth | Personal data | Supabase Auth; no raw email in analytics |
| Puppy routine logs | Personal household data | Supabase RLS; cached reads only |
| Health records | Sensitive-adjacent pet data | clear disclaimer; no analytics payload |
| Photos | Can contain people/location | EXIF strip; private bucket; delete cascade |
| Trainer/share scopes | Access-control sensitive | expiry, revocation, explicit preview |
| Mood/wellbeing text | Potentially sensitive human data | not stored in MVP |
| Payment state | Financial metadata | RevenueCat later; store hashed IDs only |

### Безопасность Health-Функций

- Все vaccination/deworming schedules являются editable templates.
- Использовать формулировку "review with vet" / "обсудите с ветеринаром" для suggestions.
- Нет diagnosis, dosage, medication instruction или emergency triage.
- Add escalation copy: "Если щенок выглядит плохо, свяжитесь с вашей ветеринарной клиникой."
- Health exports должны явно говорить, что это user-generated summaries.

### Безопасность Puppy Blues / Wellbeing

MVP может включать supportive copy и educational resources. Он не должен хранить mood scores.

Если Phase 1 wellbeing check-in будет запущен:
- explicit consent;
- отдельное privacy explanation;
- no session replay on those screens;
- no ad targeting from responses;
- local-only by default, если пользователь не выбрал cloud backup;
- retention limit;
- professional help wording для severe distress.

### Безопасность Детей

- Продукт предназначен для adult caregivers.
- Child accounts отсутствуют.
- Parents могут локально отметить task как "ребенок помог", но child не является user identity.

### Платформенные Платежи

- Closed beta может выйти без live purchase.
- Native premium features используют Apple IAP / Google Play Billing через RevenueCat before public paid launch.
- Web billing может использовать RevenueCat Web Billing / Stripe where compliant.
- Не вести native users во внешний checkout, кроме случаев, где region-specific rules и entitlement requirements явно reviewed.

### Безопасность Uploads

MVP:
- Strip EXIF before storing or sharing images.
- Private storage buckets by default.
- Delete cascade for removed puppy/household data.
- Signed URLs for private media.

Phase 1+:
- Virus/malware scanning before public/shareable export.
- UGC moderation if PuppyPlan hosts public external content.

### EU Privacy / Compliance Checklist

Before public launch in EU/EEA:

- Identify controller and processors: Supabase, RevenueCat, Sentry, PostHog or analytics provider, Resend if used.
- Maintain data map: account data, household membership, puppy routine logs, health records, photos, share scopes, notification tokens, payment metadata.
- Define lawful basis per processing purpose: account/service delivery, analytics, notifications, marketing, payments, support.
- Privacy notice must explain data categories, purposes, retention, processors, international transfers, and user rights.
- Provide in-app account deletion and data export request path.
- Support access, correction, deletion, portability, and objection/restriction workflows.
- Minimize analytics by default; no note text, puppy name, raw email, provider names, photos, invite tokens, or share tokens.
- Consent required for optional analytics/session replay if ever enabled; session replay is disabled in MVP.
- Push notifications require platform permission and in-app notification preferences.
- Define retention: deleted household data, revoked share links, notification delivery logs, failed pending Quick Log events.
- Verify SCC/DPA coverage for processors outside EU/EEA.
- Document breach response process and contact channel.
- Run DPIA-style review if wellbeing check-ins, health attachments, public sharing, or AI features ship.
- Children are not users; no child account creation, profiling, or direct marketing to children.

---

## 8. Monetization И Growth

### Pricing Hypothesis

Pricing - эксперимент, а не beta requirement.

| Plan | Included | Hypothesis |
|---|---|---:|
| Free | 1 puppy, Today, manual logs, 3 reminders, 7-day timeline, 1 caregiver invite during beta including trusted-sitter mode | $0 |
| Premium Monthly | Unlimited reminders, shared household up to 4 caregivers, full timeline, advanced health records, Phase 1 PDF export, premium cards | EUR 8.99-9.99 |
| Premium Annual | Same as monthly, annual default in paywall | EUR 49.99-54.99 |

Closed beta:
- no first-screen hard paywall;
- entitlement interface can exist;
- paywall surface is feature flagged and off by default;
- do not block Quick Log, basic Today, or one caregiver invite.

Public launch:
- live RevenueCat purchase/restore/cancellation;
- visible restore purchase;
- clear free vs premium feature list;
- paywall after value moment, not before first useful experience.

### Premium Value Anchors

Сильные:
- unlimited reminders;
- family sharing beyond beta limits;
- long timeline/history;
- PDF vet export in Phase 1;
- advanced health attachments;
- premium milestone templates.

Слабые для MVP:
- AI coach;
- insurance offers;
- animated cards;
- generic training content.

### Revenue Streams

Closed beta:
- no monetization dependency.

MVP/public launch:
- subscription only.

Phase 2:
- insurance affiliate, clearly labeled and outside stressful health states;
- pet retail affiliate for shopping lists;
- clinic/trainer referral pilots;
- no sponsored health recommendations without clear labeling.

### Go-To-Market

Primary channels:
- TikTok and Instagram UGC around first-week chaos;
- App Store Search Ads for "puppy potty tracker", "puppy schedule", "puppy vaccination";
- Pinterest and SEO for checklists and age-based routines;
- breeder/trainer/puppy-school referral tests after beta.

Message tests:
1. "Первые 90 дней со щенком - менее overwhelming."
2. "Понимайте, кто покормил, выгулял и залогировал potty."
3. "Поделитесь routine щенка с partner или trainer."
4. "Один спокойный план на день вашего щенка."

Избегать ad creative, которые эксплуатируют severe mental distress или rehoming fear.

---

## 9. Metrics И Experiments

### North Star

`Weekly active households with 5+ logged routine events`

Сегментировать по:
- solo owner;
- shared household;
- trainer/shared-view usage;
- puppy age;
- first 7 days vs later.

Не делать household sharing частью top-level North Star, потому что solo owners - primary audience.

### Activation Definition

Activated household:
- puppy profile created;
- 3 routine events logged;
- 1 reminder created or accepted;
- Today viewed on the next day.

### Event Taxonomy

| Event | Properties |
|---|---|
| `onboarding_started` | source, locale |
| `puppy_profile_created` | age_bucket, selected_tracker_count, tracker_category_set |
| `quick_trackers_selected` | selected_tracker_count, tracker_category_set |
| `event_logged` | event_type, source_surface, save_result, connection_state |
| `event_save_failed` | event_type, error_category, connection_state |
| `pending_quick_log_created` | event_type, connection_state |
| `pending_quick_log_deleted` | event_type, pending_age_bucket |
| `offline_or_failed_log_recovered` | event_type, retry_count, recovery_surface |
| `quick_log_abandoned` | event_type, surface |
| `undo_used` | event_type, seconds_after_log_bucket |
| `details_added_after_log` | event_type, detail_type_count |
| `duplicate_warning_seen` | event_type, time_since_previous_bucket |
| `duplicate_warning_confirmed` | event_type |
| `today_viewed` | day_number, card_count |
| `day_2_morning_today_viewed` | card_count, has_last_night_data |
| `day_7_weekly_rhythm_viewed` | event_count_bucket, tracker_count |
| `reminder_created` | reminder_type, local_or_push |
| `reminder_created_from_suggestion` | reminder_type, suggestion_surface |
| `reminder_action_taken` | action_type |
| `notification_permission_result` | result, trigger_surface |
| `family_invite_sent` | role |
| `family_invite_accepted` | time_to_accept_bucket |
| `family_invite_revoked` | role |
| `trusted_sitter_mode_enabled` | reminder_count, duration_bucket |
| `trusted_sitter_completion_notified` | event_type, channel |
| `share_preview_opened` | selected_scope_count |
| `share_scope_preview_understood` | selected_scope_count, confirmation_method |
| `share_link_created` | scope_count, expires_bucket |
| `share_link_accepted` | role, scope_count |
| `share_link_revoked` | role |
| `health_record_added` | record_type, status, source |
| `paywall_viewed` | trigger, feature_flag |
| `trial_started` | plan |
| `purchase_completed` | plan |

### Beta Experiments

1. Anonymous/deferred account vs account before first log.
2. Today hero wording: operational vs supportive.
3. Family invite prompt after first duplicate-risk event vs More tab only.
4. Trainer share prompt from Timeline vs More tab only.
5. Reminder prompt after first log vs after second app session.
6. Quick tracker defaults: recommended 5 visible trackers vs earlier customization.

Не запускать pricing experiments, пока activation и D7 retention не будут interpretable.

---

## 10. Модель Agentic Delivery

Предполагаем, что несколько engineering agents могут работать параллельно. Ограничение - design capacity, поэтому PRD должен создавать clear contracts, small UI surface и disjoint ownership.

### Workstreams

| Workstream | Ownership | Main Contract |
|---|---|---|
| Mobile Shell | Expo app, 3-tab navigation, design tokens, shared components | route map + component API |
| Data Access / Server State | Supabase client, TanStack Query hooks, optimistic mutations, cache states | query/mutation contract + loading/error/offline states |
| Backend/Auth/RLS | Supabase schema, RLS, Edge Functions, Realtime enhancement | database migrations + RLS tests + Zod contracts |
| Today/Quick Log | daily hub, bottom sheets, timeline entry points | event schemas + UX acceptance |
| Sharing/Reminders | household invite, trusted-sitter mode, trainer share, scoped links, local notifications | role/scope model + reminder/checklist engine |
| Health/Guidance Content | health records, starter guidance cards, safety copy | content version schema + safety review |
| Monetization Boundary | entitlement interface, feature-flagged paywall shell | entitlement contract + public-launch checklist |
| QA/Release | E2E flows, accessibility, test data, beta builds | test matrix + release checklist |

### Agent Rules

- Каждый workstream владеет отдельной file/module area.
- Shared contracts живут в `contracts/` или `lib/contracts/` до implementation.
- Ни один agent не придумывает новые payload shapes без обновления Zod schemas и tests.
- UI agents используют только design tokens и shared components.
- Backend agents обязаны добавлять RLS tests для каждой household-scoped и share-scoped table.
- Session replay и analytics properties не могут включать user free text.
- Каждая non-core feature получает feature flag и должна быть off by default в closed beta.
- Broad tools или scripts, которые меняют production data, требуют approval gates вне model.

### Design Workflow Без Dedicated Designer

1. Сначала создать design tokens.
2. Собрать небольшой component inventory: button, icon button, card, status pill, bottom sheet, timeline item, health record row, reminder row, share-scope row.
3. Делать hi-fi mockups только для Today, Quick Log, Onboarding, Health, Sharing Preview.
4. Валидировать через simulator screenshots на:
   - small iPhone;
   - large iPhone;
   - common Android;
   - Dynamic Type XXL/XXXL;
   - dark mode only if enabled.
5. Проводить UX review перед добавлением visual polish.

---

## 11. Roadmap

### 10-Week Closed Beta Plan

| Period | Milestone | Scope |
|---|---|---|
| Week 1 | Contracts lock | PRD, brand/naming risk validation, event schemas, Supabase schema draft, RLS matrix, design tokens, Screen Spec Pack, analytics taxonomy |
| Week 2 | Mobile foundation | Expo SDK 55 app, 3-tab navigation, auth shell, component library, global screen states, test harness |
| Week 3 | Supabase data access | generated DB types, Zod contracts, query/mutation hooks, optimistic Quick Log save, Minimal Durable Quick Log Queue, cached Today/Timeline read states |
| Week 4 | Quick Log + Timeline | selected quick trackers, potty/feeding/sleep/zoomies/training logging, undo, edit/delete, duplicate warning, basic timeline |
| Week 5 | Today + Reminders | daily cards, day 2-7 journey states, local notifications, reminder_occurrence, quiet hours, reminder actions |
| Week 6 | Family Sharing | Supabase Auth, RLS, invite, caregiver roles, shared timeline, activity attribution, trusted-sitter checklist, revoke/remove flows |
| Week 7 | Trainer Sharing | scoped share preview, formal scope filtering, trainer_viewer role, expiry, revocation, permission copy |
| Week 8 | Health + Guidance | records, statuses, starter guidance cards, safety copy, health_summary privacy behavior |
| Week 9 | QA hardening | E2E, accessibility, RLS negative tests, network failure states, notification tests, EU privacy review |
| Week 10 | Closed beta | TestFlight / Google Play Internal Testing, 20-50 users, instrumentation review |

### Parallelization Notes

- Design tokens, schema contracts, and content can start in Week 1.
- Health/content work can proceed against mocked query hooks while Supabase schema is finalized.
- Entitlement interface can be implemented behind a feature flag without blocking core beta.
- PDF/cards/live IAP should not consume core engineers until Quick Log, Today, and Sharing are stable.

---

## 12. Acceptance Criteria И План Тестирования

### Epic Acceptance

**Create Puppy**
- profile создается меньше чем за 45 секунд;
- age/date validation понятна;
- age hint показывается после ввода возраста и не звучит как medical/training prescription;
- можно выбрать до 5 quick trackers;
- recommended tracker defaults понятны, а zoomies/training можно выбрать вместо части defaults;
- account можно отложить до multi-device continuity, sharing или premium;
- если используется anonymous auth, anonymous-to-permanent upgrade path протестирован.

**Quick Log**
- видны только выбранные quick trackers, максимум 5 на первом экране;
- primary event виден в UI сразу после tap;
- server confirmation или retry/error state понятны;
- failed/offline Quick Log event сохраняется в Minimal Durable Quick Log Queue с `client_event_id`;
- pending event виден в Today/Timeline;
- pending event можно undo/delete до server confirmation;
- reconnect/foreground retry восстанавливает failed/offline log без дублирования;
- undo виден;
- optional details не блокируют save;
- duplicate warning появляется, когда релевантен;
- duplicate warning не блокирует действие и не может вызвать data loss;
- event появляется в Today и Timeline после save.

**Today**
- пересчитывается после каждого log без hard refresh;
- максимум one hero card;
- no streak до Day 14;
- максимум one starter guidance card/day;
- health template suggestions визуально спокойные;
- cached/offline read state полезен и честен.

**Family Sharing**
- invite отправляется через email/magic link/share link;
- invite можно resend, revoke и expire;
- accepted caregiver видит shared Today/Timeline;
- viewer не может edit;
- caregiver не может менять owner/billing/share scopes;
- owner может remove caregiver, и access прекращается сразу;
- activity attribution виден;
- trusted-sitter mode можно включить только для accepted caregiver;
- sitter видит checklist/reminders без billing/settings/share-scope доступа;
- owner видит completion update вроде "Щенок A накормлен" in-app; push notification отправляется только если trusted-sitter completion push включен и permission получен.

**Trainer Sharing**
- owner видит permission preview перед отправкой;
- trainer_viewer видит только selected scopes;
- каждый scope показывает included/excluded fields;
- health details скрыты по умолчанию;
- `health_summary` содержит title/status/date only, без notes/provider/photo by default;
- selected timeline range работает;
- expired/revoked share link прекращает access;
- share view явно показывает, что visible.

**Reminders**
- create/edit/disable reminder работают;
- local notification schedules создаются;
- `local_notification_id` сохраняется для cancel/reschedule;
- reminder_occurrence создается для каждого scheduled reminder;
- push token registration корректно обрабатывает denial;
- local reminder работает без remote push token;
- trusted-sitter completion update появляется in-app даже без push;
- notification_delivery_log не хранит note text, puppy name, email или token value;
- Done/Snooze/Skip/Edit/Stop actions работают;
- quiet hours и timezone changes соблюдаются.

**Health Basics**
- manual record можно add/edit/delete;
- template suggestion и vet-confirmed record визуально различаются;
- нет medical prescription wording;
- `updated_by`, `updated_at` и soft delete captured.

**Starter Guidance Cards**
- content versioned;
- только positive reinforcement;
- read/practiced/skip states работают;
- escalation copy присутствует для concerning behaviors.

**Monetization Boundary**
- entitlement interface существует за feature flag;
- feature gates fail gracefully, если entitlement service unavailable;
- live RevenueCat purchase/restore - public-launch acceptance, не closed-beta acceptance.

**Accessibility**
- Quick Log полностью usable с VoiceOver/TalkBack;
- Sharing Preview полностью usable с VoiceOver/TalkBack;
- Health record entry полностью usable с VoiceOver/TalkBack;
- Dynamic Type XXL/XXXL screenshots проходят для Today, Quick Log, Health, Sharing Preview;
- contrast pass;
- touch targets pass.

**Screen Spec Pack**
- route map реализован без дополнительных top-level tabs;
- Today, Quick Log, Timeline, Health, Sharing, More имеют defined loading/empty/error/offline/pending states;
- screenshot acceptance set captured before closed beta;
- multiple UI agents cannot introduce alternate hero, duplicate warning, or sharing selector patterns without PRD update.

**EU Privacy / Compliance**
- privacy notice draft covers data categories, purposes, processors, retention, user rights, and transfers;
- account deletion and data export request path exists before public launch;
- analytics excludes free text, puppy name, raw email, provider names, photos, invite/share tokens;
- push notification consent and in-app preferences are separate from analytics consent.

### Test Matrix

Unit:
- Today card prioritization.
- Reminder scheduling rules.
- Event duplicate detection.
- Health status transitions.
- Share scope visibility.
- Zod payload validation.

Integration:
- Supabase query/mutation hooks.
- Optimistic Quick Log mutation and rollback.
- Minimal Durable Quick Log Queue retry/dedupe.
- Pending Quick Log delete before sync.
- Supabase RLS membership rules.
- Supabase RLS share-scope rules.
- Auth callback/deep link.
- Anonymous auth upgrade if enabled.
- Reminder timezone and quiet-hour edge cases.
- Notification preference and delivery-log writes.
- Share-scope field filtering.

E2E:
- first launch -> create puppy -> log potty -> Today update;
- slow network -> Quick Log pending state -> retry -> server confirmation;
- offline Quick Log -> foreground reconnect -> recovered event without duplicate;
- invite caregiver -> accept -> log from second device;
- revoke caregiver -> access denied;
- create trainer share -> accept -> verify selected scopes only;
- health_summary share -> verify title/status/date only;
- revoke/expire share -> access denied;
- create reminder -> receive/action notification;
- local reminder without push token -> action works;
- trusted-sitter completion -> owner sees in-app update;
- add health record -> distinguish template vs confirmed.

Design QA:
- small phone layout;
- Android edge-to-edge layout;
- Dynamic Type XXL/XXXL;
- reduced motion;
- dark mode if enabled;
- one-handed Quick Log;
- duplicate warning clarity;
- pending Quick Log visual state;
- share permission preview clarity;
- More screen contains sharing, privacy/export/delete, quick trackers, reminders, and support.

---

## 13. Приложение

### Example Event Payload

```json
{
  "client_event_id": "evt_8f3a9c7b-1234-4cde-9876-abcdef012345",
  "puppy_id": "p_301",
  "household_id": "h_201",
  "event_type": "potty",
  "occurred_at": "2026-05-17T08:32:00Z",
  "payload_version": 1,
  "payload": {
    "potty_kind": "pee",
    "location": "outside",
    "context": "after_sleep",
    "notes": null
  },
  "created_by": "u_101"
}
```

### Example Share Link

```json
{
  "id": "sh_123",
  "household_id": "h_201",
  "puppy_id": "p_301",
  "role": "trainer_viewer",
  "scopes": ["routine_summary", "training_notes", "selected_timeline_range"],
  "timeline_from": "2026-05-10",
  "timeline_to": "2026-05-17",
  "expires_at": "2026-05-24T23:59:59Z",
  "revoked_at": null
}
```

### Example Health Record

```json
{
  "id": "hr_123",
  "puppy_id": "p_301",
  "record_type": "vaccine",
  "title": "DHPP / DHPPi",
  "status": "needs_vet_review",
  "source": "template",
  "scheduled_for": "2026-06-01",
  "completed_at": null,
  "provider_name": null,
  "notes": "Confirm timing with clinic"
}
```

### Example Supportive Copy

**Empty Today**
> Первый день дома может быть хаотичным. Добавьте potty, feeding, nap или другой выбранный tracker, и мы начнем выстраивать ритм дня.

**Age hint**
> Ого, щенку A уже 5 месяцев. В этом возрасте у многих щенков активно меняются зубы - держите chew toys под рукой и сверяйте вопросы здоровья с ветеринаром.

**Duplicate feeding warning**
> Другой опекун залогировал feeding за последние 60 секунд. Все равно добавить еще одно feeding?

**Health template**
> Template, not a prescription. Подтвердите эту дату с вашей ветеринарной клиникой.

**Share preview**
> Эта trainer-ссылка включает routine summary и training notes. Health details не включены.

**Reminder missed**
> Если это уже произошло, отметьте как done. Если нет - перенесите на более удобное время.

**Trusted sitter completion**
> Щенок A накормлен. Ситтер A отметил feeding 4 минуты назад.

**Supportive education card**
> Многие новые владельцы щенков сначала чувствуют усталость и неуверенность. Короткая рутина помогает. Начните со следующего маленького шага.

### Проверенные Источники

- APPA pet industry stats: https://americanpetproducts.org/industry-trends-and-stats
- Puppy blues scale paper: https://www.nature.com/articles/s44184-024-00072-z
- Expo SDK 55: https://expo.dev/sdk/55
- Expo New Architecture guide: https://docs.expo.dev/guides/new-architecture/
- Expo using Supabase: https://docs.expo.dev/guides/using-supabase/
- React Native 0.83: https://reactnative.dev/blog/2025/12/10/react-native-0.83
- Supabase React Native Auth: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase Anonymous Sign-Ins: https://supabase.com/docs/guides/auth/auth-anonymous
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Realtime Postgres Changes: https://supabase.com/docs/guides/realtime/postgres-changes
- Supabase offline-first example: https://supabase.com/blog/react-native-offline-first-watermelon-db/
- RevenueCat React Native Web support: https://www.revenuecat.com/blog/engineering/revenuecat-react-native-sdk-adds-react-native-web-support/
- Apple DMA / Home Screen web apps update: https://developer.apple.com/support/dma-and-apps-in-the-eu
- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications
- Supabase Storage image transformations: https://supabase.com/docs/guides/storage/image-transformations
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play payments policy: https://support.google.com/googleplay/android-developer/answer/10281818
- WCAG 2.2 overview: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- AAHA canine vaccination guidelines: https://www.aaha.org/aaha-guidelines/2022-aaha-canine-vaccination-guidelines/home/
- AVSAB position statements: https://avsab.org/resources/position-statements/
- PupPlan App Store listing: https://apps.apple.com/us/app/pupplan-dog-training-care/id6753879470
- Pup Planner Google Play listing: https://play.google.com/store/apps/details?id=com.dev.pup_planner
- PuppyPlanner App Store listing: https://apps.apple.com/gb/app/puppyplanner/id6760142762
- European Commission GDPR overview: https://commission.europa.eu/law/law-topic/data-protection/data-protection-explained_en
- EDPB guide on individual rights: https://www.edpb.europa.eu/sme-data-protection-guide/respect-individuals-rights_en

### Итоговая Рекомендация

Строить PuppyPlan как native, Supabase-first, sharing-aware продукт вокруг одного beta loop: setup -> one-tap routine logging -> Today clarity -> shared household visibility -> scoped trainer sharing -> reminder follow-through. Puppy blues оставить как тон и эмпатию, а не как mental-health feature. Сначала выиграть trust и retention; PDF exports, advanced cards, affiliates, live monetization, durable offline writes и AI добавлять только после того, как daily care loop докажет demand.
