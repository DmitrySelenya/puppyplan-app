# ADR-0020: V2 Information Architecture — Diary | Pet | More With Central Add

- **Статус:** Accepted
- **Дата:** 2026-07-07 (fixes the decision made 2026-06-27/2026-06-28 in the redesign brief)
- **Авторы:** Product owner + design/implementation agents
- **Связанные:** ADR-0002, ADR-0011, [DESIGN.md 2026-06-28 V2 override], `docs/plans/active/2026-06-27-diary-pet-nav-design-brief.md`, `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md`, `docs/architecture/05-navigation-and-deeplinks.md`
- **Влияет на workstreams:** Mobile Shell | Today/Quick Log | Health/Guidance | Sharing/Reminders | QA/Release

## Контекст

The original closed-beta IA used `Today | Health | More` primary tabs plus a corner Quick Log
FAB, with a standalone Timeline surface. The 2026-06 V2 redesign (Miro freeze boards, Clay
tokens, Lora/Nunito) changed not only visuals but the navigation model itself. That decision
was accepted and largely implemented, but until this ADR it lived only in a design brief under
`docs/plans/active/` — a location that gets archived — while `AGENTS.md` already treats the new
IA as a non-negotiable. This ADR makes the IA change a durable architecture decision.

## Рассмотренные варианты

### Вариант A — Keep `Today | Health | More` + FAB

Original IA. Pros: no migration. Cons: Health tab was underweight (records only), Timeline
duplicated Today history, corner FAB conflicted with tab hit areas on compact phones, and the
V2 product direction (diary-first, plan/fact checkbox model) did not map onto it.

### Вариант B — `Diary | Pet | More` + raised central Add (chosen)

Today is absorbed into Diary (including history/Timeline); Health folds into Pet alongside
profile; Quick Log moves to a raised central Add action in the tab bar. Pros: matches the V2
design freeze, removes surface duplication, one obvious logging entry point. Cons: route/i18n/
test migration for `today`/`health`/`timeline` names.

## Решение

- Primary tabs are exactly `Diary | Pet | More` (`src/contracts/navigation.ts` `primaryTabs`),
  rendered by `CapsuleTabBar` with a raised central **Add → Quick Log** action. Quick Log is
  never a tab; the legacy corner FAB is removed from migrated screens.
- Old **Today** is absorbed into **Diary**; the standalone **Timeline/Events** surface is
  absorbed into Diary history (filters + date range live inside Diary).
- The **Health** tab is removed; puppy profile and lightweight health context fold into **Pet**.
  Health remains a feature area (`src/features/health`) reached from Pet, not a primary tab.
- Legacy routes `/(tabs)/today` and `/(tabs)/health` remain as hidden redirect routes
  (`href: null`) for old links until an approved cleanup removes them.
- Design source of truth for the V2 IA is the 2026-06-27 brief + `docs/design/v2/` atlas; the
  navigation contract test (`scripts/checks/check-navigation-contract.mjs`) and the tab-bar
  render test enforce the IA in CI.

## Последствия

- **Положительные:** one durable record of the IA; `AGENTS.md`, `DESIGN.md` override,
  `05-navigation-and-deeplinks.md`, and the navigation contract all point at the same decision;
  the old-tab wording in pre-V2 docs is explicitly historical.
- **Отрицательные:** pre-V2 documents (master roadmap, older specs, v1 atlas) still use old
  route names and need override notes until rewritten; deep links to legacy names must keep
  working through redirects.
- **Обратимость:** средняя — the tab contract is one file, but Diary now structurally owns
  history and Pet owns health context.
- **Триггеры пересмотра:** adding a fourth primary surface; Pet outgrowing a single tab
  (e.g. multi-pet); analytics showing the central Add is not the dominant logging path.

## Action items

- [x] Tabs migrated in `app/(tabs)/_layout.tsx` with legacy redirects (done pre-ADR).
- [x] `docs/architecture/05-navigation-and-deeplinks.md` carries the V2 supersession note.
- [ ] Remove legacy `today`/`health` redirect routes and route names once an approved cleanup
      batch updates routes, i18n keys, and tests together (owner: Mobile Shell).
