# Dogfood Diary Follow-Ups (2026-07-21)

**Status:** Active
**Plan type:** Task plan
**Current phase:** Phase C fixed (re-check deadlock); B indicator redesign + device verification next
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
- [x] **Phase C — Re-check-after-uncheck deadlock (root cause found + fixed).** On-device the "slow
  sync" complaint decomposed into two things: (1) device→Supabase network is healthy/fast (45 QUIC
  requests, 0 failures, ~430 ms, status 200) and cross-device sync works, so it is **not**
  network-bound; (2) the real defect is a client-side queue deadlock — after check→uncheck, the
  routine could not be re-checked until an app restart. **Root cause:** the check-off uses a
  deterministic `client_event_id` (`reminderId + scheduledFor`); an un-check before sync leaves a
  terminal `deleted_before_sync` row with that id; a re-check called `enqueueQueueItem`'s bare
  `INSERT OR IGNORE`, which silently no-op'd on the collision and returned the stale delete → the
  mutation then ran `markSending` on a `deleted_before_sync` item, an invalid transition that threw
  "Не удалось отметить"; the terminal row lingered until restart. `enqueueDeletedQueueItem` had
  already been hardened (DELETE+INSERT so a delete supersedes a prior insert) but the reverse
  asymmetry — a re-check superseding a pending delete — was never fixed. **Fix:** `enqueueQueueItem`
  now, inside its transaction, overrides an existing `deleted_before_sync` row (identity-guarded)
  before inserting the fresh `pending_local` write, so the re-check wins; every other existing state
  keeps the idempotent double-tap no-op. Extracted `assertMatchingQueueClientEventIdentity` shared by
  both enqueue paths. Tests: `AC-38C-1` (re-check after un-sync-delete yields a claimable
  `pending_local` write), `EC-38C-1` (mismatched-identity collision rejects atomically, delete intent
  intact), and the former "keeps enqueue idempotent … deleted rows" test corrected to assert the
  re-check now supersedes the un-synced delete (its failed-row idempotency half is unchanged).
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
- 2026-07-21: Phase C resolved. Diagnosed on-device (network healthy, cross-device sync works, JS
  logs OS-redacted) and at the code level: re-check-after-uncheck deadlocked because
  `enqueueQueueItem` used bare `INSERT OR IGNORE` against a lingering terminal `deleted_before_sync`
  row sharing the deterministic check-off id. Fixed by making a re-check supersede an un-synced
  delete (identity-guarded DELETE+INSERT), mirroring the delete path. RED→GREEN via `AC-38C-1` /
  `EC-38C-1`; corrected the pre-existing idempotency test that had codified the buggy behavior.
  Finding B (dot) redesign into a real animated in-row sync indicator still open.
