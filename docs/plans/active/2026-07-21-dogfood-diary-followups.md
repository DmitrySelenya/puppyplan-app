# Dogfood Diary Follow-Ups (2026-07-21)

**Status:** Active
**Plan type:** Task plan
**Current phase:** A/B/C landed (silent uncheck, in-row sync spinner, re-check fix); device verification next
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
- [x] **Phase B — In-row sync spinner (owner-directed redesign).** The first pass replaced the heavy
  `TodayStatusCard` with a `PendingDot` by the avatar; owner rejected it on device ("абсолютно не
  информативная" + the avatar isn't always visible). Redesigned per the owner's locked choice
  ("спиннер в чекбоксе"): while a routine's check-off write is still reaching the server, the tapped
  `CheckCircle` shows an `ActivityIndicator` spinner in a bordered ring (no premature green fill) and
  reads `accessibilityState.busy`; `RoutineCard` holds the row off the done (sage) fill until the
  write settles. `TodayScreen` derives `routineSyncing` from the linked fact's `localSync.state`
  (`pending_local`/`sending`) and passes it down, and emits the checkbox `testID` while syncing so the
  spinner is addressable. The `DiaryHeader` dot (commit `698b5db`) is removed; the heavy status card
  stays gone. Standalone pending quick-log facts keep their own inline `timeline.pills.pending` label,
  so no pending write loses feedback. Uses `accessibilityState.busy` (native), so no new i18n string.
  Tests: `CheckCircle`/`RoutineCard` spinner anatomy (bordered ring, busy, card off the done fill);
  `TodayScreen` spins the checkbox while a done routine's linked write is `pending_local`; background
  pending write stays off the heavy card and shows its own pending label; DiaryHeader dot tests
  removed.
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
- 2026-07-21: Finding B redesigned per owner ("спиннер в чекбоксе"). Removed the rejected
  `DiaryHeader` `PendingDot`; added a `syncing` state to `CheckCircle`/`RoutineCard` (spinner in a
  bordered ring, `accessibilityState.busy`, card held off the done fill) wired from the linked fact's
  `localSync` state in `TodayScreen`. Standalone pending facts keep their inline `pills.pending`
  label. Primitives-first with anatomy + screen wiring tests; DiaryHeader dot tests removed. Device
  verification of A/B/C on the rebuilt Release still pending.
