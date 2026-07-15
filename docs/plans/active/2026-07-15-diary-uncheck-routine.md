# Diary — Take A Routine Mark Back Off

**Goal:** A routine checked off by mistake can be un-checked from the Diary, and checked off again
afterwards, without burning the slot.

**Status:** Phase 1 complete — check → uncheck → re-check verified on the SE against a slot whose
id had actually been burned.

**Current phase:** Done pending review.

**Plan type:** Active task plan.

**Linear:** `PUP-33` (diary parity) owns this.

## Why

The 2026-07-15 owner question — "why can't a second tap take the mark back off?" — exposed a
one-way door, not a styling nit:

- `TodayScreen` dropped `onToggleDone` once `item.status === 'done'`, so the tap was a silent
  no-op while `CheckCircle` kept announcing an enabled, checked `checkbox`.
- The check-off event carries a `reminder_link`, so `buildDiaryDayModel` folds it into the planned
  row (`diary-day.ts:86-99`) and it never becomes a spontaneous fact row. It therefore has no
  overflow menu, no Edit, no Delete.
- Net: the event created by a check-off was the only user-created record in the Diary with no
  lifecycle affordance at all, while the reversible action (deleting a logged fact) has undo.

Nothing recorded "done is final" as a decision — no test, no AC, no brief. The design brief's
§5.1 routine menu was never wired on the real screen either (`onOverflow` is passed only in the
dev design gallery), so no route out existed.

## The trap this plan exists to avoid

Wiring the second tap to `onDelete` alone is **worse than the bug**. Verified live on the SE:
check → green → tap → back to "Not logged" + undo snackbar, but the *next* check-off then fails
with "Could not mark this routine."

Cause chain:

1. `createReminderCheckOffClientEventId(reminderId, scheduledFor)` is deterministic — the slot
   derives the id.
2. `deleteSynced` tombstones: the row survives with the same `client_event_id` and a `deleted_at`.
3. `isQuickLogIdempotentDuplicate` returns `false` for any tombstoned row (`events.ts:358`), so
   the re-insert resolves to `23514`/409.

So un-checking once would burn that slot's id permanently.

## Constraint — do not weaken the tombstone rule

`af63f2c` (2026-07-13) set that rule deliberately while fixing cross-device check-off convergence:
a live row with the same `reminder_link` converges on the first writer even when `occurred_at`
differs, but "a tombstoned server row is never idempotent success" and "keep a tombstoned
collision visibly failed" are covered by AC-F1-* regression tests.

Therefore: insert must keep refusing to resurrect a tombstone. Restoring is an **explicit user
intent** ("put this mark back"), so it belongs in the check-off flow, not inside `insertEvent`.

## Decisions

- **Restore, do not re-insert.** A check-off whose deterministic id is already tombstoned restores
  the row via `restoreByClientEventId` instead of inserting.
- **Keep the restored `occurred_at`.** The restored row keeps its original time rather than being
  stamped with the moment of the re-check. This matches the convergence semantics `af63f2c`
  already chose, where the second device keeps the first writer's `occurred_at`.
- **The snackbar stays "Entry deleted."** Un-checking really does delete the log record, and
  saying so is the useful part — the check-off's record is not obvious otherwise.
- **`CheckCircle` tells the truth when there is no way back.** With no handler it reports
  `disabled`, instead of announcing an enabled checkbox that silently no-ops.

## Phase 1 — restore-or-insert

- [x] `CheckCircle` marks itself `disabled` when it has no `onPress`.
- [x] `TodayScreen` wires the done-state tap to delete the linked event, and labels it
      `today.plan.uncheck` rather than reusing "Mark done" on an already-done row.
- [x] `checkOffReminder` on the mutation port: restore when the slot's event is tombstoned,
      insert otherwise.
- [x] Diary route calls `checkOffReminder` instead of `createDetailed`.
- [x] Live re-check round trip on the SE: check → uncheck → check again, all three landing.
      Verified 2026-07-15 against a genuinely tombstoned slot (burned during the earlier
      verification of the delete-only wiring), which the restore path healed with a plain tap;
      then un-checked → re-checked again to prove the cycle repeats rather than working once.

## Acceptance criteria

- **AC-P33-UNCHECK-1:** tapping a done routine's checkbox deletes its linked event; the row
  returns to `upcoming`/`past-unmarked` and the delete-undo snackbar offers Undo.
- **AC-P33-UNCHECK-2:** a done routine whose mark cannot be taken back (no delete handler, e.g. a
  viewer) announces `disabled` rather than an enabled checkbox.
- **AC-P33-UNCHECK-3:** checking off a routine whose deterministic event id is tombstoned restores
  that row instead of inserting, and does not surface "Could not mark this routine".
- **AC-P33-UNCHECK-4:** `isQuickLogIdempotentDuplicate` is unchanged and AC-F1-* still pass — a
  tombstoned collision on a *spontaneous* insert stays visibly failed.

## Out of scope

- The §6.4 routine lifecycle menu (Изменить / Пауза / Удалить) is still unwired on routine rows.
- `TodayPlanCards`/`TodayHeroCard` remain rendered only by a test.
