# Dogfood Diary Follow-Ups (2026-07-21)

**Status:** Active
**Plan type:** Task plan
**Current phase:** Phase C — investigate slow sync (A + B done, pending device verification)
**Linear:** `PUP-38`

Findings from a live dogfood session on 2026-07-21 (physical iPhone 13, iOS 26.5.2,
fresh Metro-independent Release of `main` after PUP-36/PUP-37). Synthetic data only.
Branch: `dimaselenya/pup-38-fix-live-dogfood-diary-findings-2026-07-21-redundant-hero`.

## Findings & scope

- **0 — Redundant hero CTA (DONE).** The Diary `InfoHero` / `TodayHeroCard` rendered a primary
  CTA ("Начать"/"Start") wired to the same `openQuickLog` as the central `+` FAB — a duplicate the
  diary-v2 spec never specced (code drift). Removed from both renderers, kept guidance text, dropped
  the dead `primaryKey`, `infoHeroAction` style, and 5 unused `today.hero.*.primary` strings.
  Commit `f03f705`; `npm run check` green; verified on device.
- **A — Un-check must be silent.** Un-ticking a routine currently runs the delete path
  (`TodayScreen.tsx:766` `uncheck` → `onDelete`) and shows the generic "Запись удалена. Отменить"
  snackbar. Owner ruling: check ↔ uncheck is a pure toggle — **no snackbar at all** on uncheck.
- **B — Subtle sync indicator.** Pending local writes render a full `TodayStatusCard`
  (icon + title + body) at `TodayScreen.tsx:531`. Replace with a small, text-free background
  indicator (spinner/dot); keep an accessible label for assistive tech.
- **C — Slow sync (INVESTIGATE, defect-stop).** Pending lingers well past expectation. Root cause
  unknown: real Supabase latency + retry backoff, queue flushed only on a trigger, or a failing
  write. Silent-data-loss territory (`src/lib/queue/`). Diagnose on-device (queue logs + network)
  before any fix. Do not guess-fix.

## Phases

- [x] **Phase 0 — Hero CTA removal.** Done, commit `f03f705`.
- [x] **Phase A — Silent uncheck.** Added a dedicated `onUncheck` action intent (contract) wired in
  the Diary route to `onDelete(request, { silent: true })`; `useSyncedQuickLogDeleteUndo` gained a
  `silent` option that suppresses the success "Entry deleted / Undo" snackbar but still surfaces
  failures (no silent data loss). `TodayScreen.uncheck` prefers `onUncheck ?? onDelete`. Tests:
  screen routes un-check to `onUncheck` not `onDelete`; route un-check deletes with no snackbar;
  a failed un-check still surfaces the error.
- [x] **Phase B — Subtle sync indicator.** Replaced the `hasPendingLocalRows` `TodayStatusCard`
  ("Идёт синхронизация" title+body) with a `PendingDot` in `DiaryHeader` (`syncing` prop), by the
  avatar, carrying the sync status only as an `accessibilityLabel` (no visible text). The synthetic
  `screenState="pending-write"` dev-preview path is unchanged. Tests: DiaryHeader shows the dot only
  while syncing (with a11y label, no visible text) incl. the no-avatar case; TodayScreen shows the
  dot (not the card) when local writes are pending.
- [ ] **Phase C — Slow-sync investigation.** On-device diagnosis; record findings here; propose fix
  as a separate decision. No code change without a recorded root cause.
- [ ] **Verification.** `npm run check` green; rebuilt Release re-driven on the iPhone with synthetic
  data; owner-reviewed screenshots for A + B.

## Ground rules

Design primitives only (no raw Pressable/colors/spacing); typed i18n keys in en+ru+es
(RU reminders term is «напоминание», never «режим»); tests alongside every behavior change; never
weaken checks; no schema changes; no private data in logs/evidence.

## Changelog

- 2026-07-21: Plan created from the live dogfood session. Finding 0 (hero CTA) already fixed on the
  batch branch (`f03f705`). PUP-38 opened (In Progress). A + B queued for this pass; C is a
  defect-stop investigation.
