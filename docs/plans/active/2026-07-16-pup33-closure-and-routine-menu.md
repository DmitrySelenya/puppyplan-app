# PUP-33 Branch Closure + Routine Lifecycle Menu

**Goal:** Prove on a live simulator that offline check-offs survive, execute the two owner
decisions locked on 2026-07-16, open the PR that closes the 35-commit PUP-33 branch, then build
the §6.4 routine lifecycle menu on a fresh branch.

**Status:** Active — handed to an autonomous agent by the owner on 2026-07-16.

**Current phase:** Phase 1 — offline verification.

**Plan type:** Active task plan.

**Linear:** `PUP-33` owns Phases 1–3. Phase 4 gets its own issue (see Phase 4, step 1).

---

## Context you must not rediscover the hard way

Read before touching anything: `AGENTS.md`, `docs/INDEX.md`,
[the uncheck plan](2026-07-15-diary-uncheck-routine.md) (its "second trap" section is the story of
this branch), and [the parity plan](2026-07-13-diary-telegram-parity.md) Phase 0.

**Invariants that are load-bearing, not style:**

- A check-off's `client_event_id` is deterministic (`createReminderCheckOffClientEventId`). A
  tombstoned collision is never idempotent success (`isQuickLogIdempotentDuplicate`,
  `src/lib/supabase/events.ts`) — AC-F1-3 protects this; do not weaken it.
- Restore-after-un-check lives in `sendQuickLogInsert` (`src/lib/query/quick-log.ts`), inside
  `mutationFn`, **behind** `onMutate`'s durable enqueue, and rides on the insert's own failure.
  Any change that puts a network call in front of the enqueue re-opens the silent offline data
  loss this branch just fixed.
- `onError` deliberately does not roll back the optimistic row — it marks the queue item
  `failed_retryable`/`failed_permanent`. No empty catches, no errors swallowed to `null` on sync
  paths.
- Never gate writes on `todayDate`; midnight is a core scenario.
- The "+" is the only add-record entry point. No autofocus keyboards, ever.
- Every user-facing string is a typed i18n key; shell keys must be registered in
  `src/contracts/navigation.ts` (a gate enforces this).
- Feature UI uses `src/design` primitives — no raw `Pressable`, colors, spacing.
- Do not log or commit raw puppy names, notes, emails, or tokens (synthetic fixtures are fine).
- Do not weaken any check/test/config to go green. Fix the code.

**Verification discipline:**

- Exit codes: `npm run check > /tmp/check.log 2>&1; echo "GATE_EXIT=$?"` — never pipe to `tail`
  and read `$?`, that reports `tail`'s status.
- Jest green is necessary, never sufficient: this branch had a green suite while the live app
  burned slots. Every behavior change gets verified on the simulator with your own eyes.
- `getByLabelText` passes on controls with no visible label; when eyes must read it, assert
  `getByText`.

**Simulator recipe (approved profile):**

- Device: `Grith iPhone SE 3 iOS 26.3`, UDID `5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`, app id
  `com.dmitry-selenya.puppyplan-app`.
- The installed app runs an **embedded release bundle and ignores Metro.** After any code change,
  rebuild before trusting anything you see:
  `npx expo export:embed --platform ios --entry-file node_modules/expo-router/entry.js --dev false --bundle-output <dir>/main.jsbundle --assets-dest <dir>`
  (~7 min — run it as its own step, it times out when chained), then `cp` the bundle into
  `$(xcrun simctl get_app_container <udid> <appid>)/main.jsbundle`, terminate, relaunch.
- `idb` screenshots are pixels 750×1334; taps are points 375×667 — **halve screenshot
  coordinates**. Swipes need `--duration 0.4`. Crop with `sips` (PIL is unavailable).
- Rows move after a state change (a checked row re-sorts); re-screenshot before re-tapping.
- The delete-undo snackbar window is 5 s (`SYNCED_DELETE_UNDO_DURATION_MS`).
- Font scale: `xcrun simctl spawn <udid> defaults write -g UIPreferredContentSizeCategoryName
  -string UICTContentSizeCategoryAccessibilityL` + app relaunch (and back to `UICTContentSizeCategoryL`).

---

## Phase 1 — Offline check-off, verified with eyes (P0)

The 2026-07-16 fix (`9187d7b`) claims an offline tap survives as a queued retryable item. Jest
covers it through fakes; nobody has watched the real app do it. This is the last open Phase 0 item
of the parity plan that a simulator can close.

**The trap:** the simulator shares the Mac's network. Cutting Wi-Fi between tool calls cuts *your
own* API access and strands the session. Do the whole offline window inside **one** Bash
invocation, with a trap that restores networking even on failure:

```bash
DEV=$(networksetup -listallhardwareports | awk '/Wi-Fi/{getline; print $2}')
trap 'networksetup -setairportpower "$DEV" on' EXIT
networksetup -setairportpower "$DEV" off
sleep 3
idb ui tap --udid 5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6 <x> <y>   # check off a routine
sleep 5
xcrun simctl io 5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6 screenshot /tmp/offline1.png
networksetup -setairportpower "$DEV" on
trap - EXIT
sleep 10                                                          # let the queue retry
xcrun simctl io 5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6 screenshot /tmp/online1.png
```

Read both screenshots afterwards. If the machine uses Ethernet, stop and report instead of
improvising with sudo/`/etc/hosts`.

- [ ] Rebuild the bundle from the current branch head and reinstall (recipe above).
- [ ] Offline check-off: with Wi-Fi cut, tap a routine's checkbox. On the offline screenshot the
      row must show a visible pending/failed state — **not** vanish and **not** show a bare
      unmarked circle as if the tap never happened.
- [ ] Back online: the mark converges to `done` (retry may need a foreground nudge — an app
      relaunch is acceptable; document what it took).
- [ ] Offline un-check of a synced mark: same pattern; the delete must either apply after
      reconnect or stay visibly failed — never silently revert.
- [ ] Burst: log 20+ events in quick succession through the "+" flow (potty quick-logs are the
      cheapest taps). Count what the Diary shows, then count server rows with a **read-only**
      query via the Supabase MCP (`select count(*) from event_log where ... and deleted_at is
      null` scoped to today). Zero losses, zero duplicates.
- [ ] Clean up burst events via the app's own delete flow (they pollute the owner's diary),
      and record evidence paths + observations in this plan's changelog.

**AC-P1-OFF-1:** an offline check-off is visibly pending/failed offline and `done` after
reconnect, with exactly one server row.
**AC-P1-OFF-2:** nothing logged offline disappears without a visible failed state.
**AC-P1-BURST-1:** 20+ rapid events → server row count matches the Diary exactly.

*Out of scope: the owner-device items (legacy Observation discard, physical-phone burst) stay with
the owner — mark them blocked-on-owner in the parity plan, do not attempt.*

## Phase 2 — Execute the locked owner decisions (2026-07-16)

Both were decided by the owner in chat; do not re-litigate.

**Decision 1 — the migration comment lies, not the code.** In `selected_timeline_range` shares the
owner explicitly picks `selected_event_types`, so an observation appearing there is the owner's
choice. No new migration, no behavior change.

- [ ] Fix the header comment of
      `supabase/migrations/20260711180000_event_observation_payload_v2.sql` (comment-only edit,
      the SQL body must stay byte-identical): it must say observation is excluded from
      *aggregate* projections (`current_share_routine_summary`) while `selected_timeline_range`
      follows the owner's explicit type selection.
- [ ] Record the rationale in ADR-0022 (or the nearest sharing/privacy doc `docs/INDEX.md` points
      to) as an owner decision dated 2026-07-16.

**Decision 2 — the delete button stays `destructive`.** No code change.

- [ ] Record the decision in the uncheck plan's Decisions section so the audit item stops looking
      open.

## Phase 3 — Open the PR

Authorized by the owner on 2026-07-16: **opening** the PR only. Merging is not authorized; neither
is applying migrations or any release action.

- [ ] Confirm Phases 1–2 landed and the full gate passes (`GATE_EXIT=0`).
- [ ] Push any new commits to the existing branch
      (`dimaselenya/pup-33-diary-telegram-parity-trusted-writes-readable-notes-chat`).
- [ ] `gh pr create` → base `main`. Title references PUP-33. Body: what the branch does (diary
      parity, uncheck/restore, offline durability fix), the evidence from Phase 1, the two locked
      decisions, and the explicit note that the owner-device checklist remains open. No raw
      private data. End the body with the standard generation footer.
- [ ] Link the PR in Linear PUP-33 (attachment or comment via the Linear MCP).

## Phase 4 — §6.4 routine lifecycle menu (new branch, new issue)

The design brief ([§6.4](2026-06-27-diary-pet-nav-design-brief.md)) requires a lifecycle menu on
routine cards — **Изменить / Пауза / Удалить** — reached from a "⋯" overflow with its own hit
target (§5.1: the card body/checkbox only marks done, never opens Edit). Today `onOverflow` exists
on `RoutineCard` but is wired only in the dev gallery. The checkbox is still the only affordance a
routine has in prod.

Most of the machinery already exists — this is wiring, not a new backend:
`useToggleReminderEnabledMutation`, `useDeleteReminderMutation`,
`useUpdateReminderScheduleMutation` in `src/lib/query/reminders.ts`, and an edit form at
`app/(modals)/reminders/edit`.

1. [ ] Create a Linear issue in the PuppyPlan team for this feature (authorized by the owner via
       this plan), referencing brief §6.4/§5.1; branch from `main` (or from the PR branch if the
       PR is not yet merged) with the issue's branch name.
2. [ ] Read brief §5.1 + §6.4 and §8 (the BottomSheet caveat: `SheetSurface` is static-only — if
       the menu wants a sheet, either use the existing static pattern other menus use, or a native
       action sheet; **do not** build a new BottomSheet primitive inside this task). Follow the
       `design-fidelity` skill: lock the design before code.
3. [ ] Verify the pause semantics before wiring: does a disabled reminder
       (`useToggleReminderEnabledMutation`) stop producing Diary slots for future occurrences?
       The brief requires a paused routine to disappear from the Diary plan and show as a quiet
       "on pause" row with Resume in the routine list. If disabled ≠ paused semantically, stop
       and write up the gap instead of forcing it.
4. [ ] TDD the menu: overflow affordance on routine rows (own a11y label, ≥44 pt target, does not
       steal the checkbox's tap), menu with the three actions, Удалить in the danger color with
       the "записи в дневнике останутся" reassurance (typed i18n keys in all three languages,
       registered where gates require), Изменить opening the existing edit form pre-filled.
5. [ ] Structural anatomy tests + the existing render-test conventions (`getByText` for visible
       labels). Remember the tab-bar rule: nav-adjacent changes need the jest render test, not
       just the scaffold check.
6. [ ] Full gate `GATE_EXIT=0`, then rebuild the bundle and verify every menu action live on the
       SE at default **and** AccessibilityL font scale, comparing against the brief. Evidence
       paths into the changelog.
7. [ ] Commit; push and PR only per the same authorization pattern (opening allowed, merging not).

**AC-P4-MENU-1:** every routine row in the Diary and the routine list exposes the lifecycle menu
via its own affordance; the checkbox still only toggles done.
**AC-P4-MENU-2:** Пауза removes future Diary slots and shows the paused row with Resume; resuming
brings slots back.
**AC-P4-MENU-3:** Удалить warns that diary records remain, and they do.
**AC-P4-MENU-4:** all three actions verified live at both font scales with screenshots.

## Out of scope for the agent

- Merging any PR; applying migrations; anything touching production or release.
- The owner-device physical checklist (parity plan Phase 0 tail, handoff plan Phase 4).
- `TodayPlanCards`/`TodayHeroCard` dead-code removal (separate spawned task exists).
- Building a real BottomSheet primitive.

## Changelog

- 2026-07-16 — plan written and handed off; decisions locked by the owner in chat (observation:
  fix the comment; delete button: keep destructive).
