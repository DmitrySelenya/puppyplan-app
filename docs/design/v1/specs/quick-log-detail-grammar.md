# (no atlas ID) — Quick Log detail sheet · the shared grammar

Route: `/(modals)/quick-log/details` (all seven trackers)
Atlas: **none — closes the manifest's own open gap**
Device sizes: SE compact (primary)
Status: **proposed — Stage 0, not yet locked by the owner**

## Why this exists

`docs/design/v1/manifest.json` lists "Quick Log detail forms for sleep, feeding, and zoomies" as an
open gap ("current details form is generic and does not show the three specific variants"). Because
no artboard resolves, every tracker has been designed one at a time, in chat, on demand. The result
is visible in `src/contracts/quick-log.ts`: seven trackers, **four different ways to answer "how long
did this last"**.

| Tracker | Today's question | Stored as |
| --- | --- | --- |
| Sleep (retrospective) | "Fell asleep → woke up", derived | `duration_minutes` |
| Walk | "Duration (minutes)", typed into a text box | `duration_minutes` |
| Training | three buttons: short / medium / long | `duration_bucket` |
| Zoomies | not asked at all | — (`intensity` only) |

The 2026-07-15 sleep work made this worse before it made it better: sleep is now the *good* dialect,
which is exactly what makes "type 30 into a box" for a walk look arbitrary next to it.

This card defines the grammar once so the remaining trackers are conformed to it rather than each
getting its own bespoke answer.

## The grammar

**1. Every record has an anchor moment.** `occurred_at`, always, one control — the existing "When"
card. No tracker is exempt and no tracker gets a second one.

**2. Some records also have an extent.** One stored field for all of them: `duration_minutes`.
`duration_bucket` is retired as a *storage* vocabulary. The Diary should read one language, so a
training row says "Trained 12 min", not "Trained (short)".

**3. The extent has two input affordances, and both write the same field.** This is the part that
keeps the fast path fast:

- **Preset chips** — approximate, one tap ("5 · 15 · 30 min"). The default for anything the owner
  does not time.
- **Range** — precise, two labelled pills, duration derived and never typed. Offered where the owner
  genuinely knows both ends.

Presets are not a lesser option; they are the honest one when nobody looked at a clock. The mistake
was never "buckets exist" — it was buckets reaching the database and splitting the Diary's vocabulary.

**4. The anchor of a record with an extent is its end.** `occurred_at` = when it finished; the start
is derived backwards. Sleep already ships this way (`src/lib/diary/sleep-intervals.ts:56`), and it
matches how retro logging actually happens — you log the walk when you get home.

## Per-tracker application

| Tracker | Shape | Extent input | Cost |
| --- | --- | --- | --- |
| Potty | moment | — | none, already conforms |
| Feeding | moment | — | none, already conforms |
| Observation | moment | — | none, already conforms |
| Sleep | moment (start/wake) or range (retrospective) | range | none, shipped 2026-07-15 |
| Walk | moment + extent | presets + range | **UI only** — `walkEventPayloadSchemaV2` already accepts `duration_minutes` |
| Zoomies | moment + extent | presets + range | payload change — v2 has no duration field |
| Training | moment + extent | presets (+ range) | payload change — v2 has `duration_bucket` only |

**Walk is free.** `src/contracts/supabase.ts:225` already allows `duration_minutes` on walk; the text
box is a UI choice, not a schema constraint. This is the single highest-value change on the list and
it costs no migration.

**No SQL migration is needed for any of this.** `payload` is plain `jsonb`; the only DB constraint is
`payload_version IN (1, 2)` (`supabase/migrations/20260711180000_event_observation_payload_v2.sql`).
Payload shape is enforced in Zod alone, and the v2 schemas are `.strict()` with optional fields, so
adding `duration_minutes` to training or zoomies is additive and backward-compatible: rows without
the field keep parsing.

## Correction — what is *not* wrong

An earlier draft of this card claimed walk duration, training bucket, and zoomies intensity were
"written and never shown". **That is wrong.** `QuickLogReadOnlyDetails`
(`QuickLogDetailsScreen.tsx:596-619`) renders all of them when the record is opened. What is true and
much narrower: the **Diary list row** surfaces duration for sleep only, so a walk reads as "Walk" at
a time while a sleep reads "Slept 10:56 PM–11:56 AM · 13 hr". That is an inconsistency in how terse
the list chooses to be — a design decision for the owner, not a data-loss bug. Recorded so the
overclaim does not get re-derived later.

## Fixed 2026-07-15 — walk duration reported a typo as a sync failure

Genuinely broken, and needing no design decision, so fixed ahead of the lock:

`createDraftInput` passed `Number(walkDuration)` straight into a contract that caps
`duration_minutes` at `.int().min(1).max(1440)`, and `submit()` never validated walk. So `2000`,
`0`, `1.5`, or `abc` threw inside `createQuickLogDetailDraft`, landed in the `catch`, and surfaced as
**"Details could not be saved. Your draft is still here. Try again."** — a persistence error, for a
validation problem, telling the owner to retry something that could never succeed. The real cause was
swallowed, which is what `CLAUDE.md`'s "Silent failures = lost data" rule exists to prevent.

Now parsed at the field by `src/lib/datetime/duration-input.ts` (stricter than `Number()`, which
accepts `1.5`, `-5`, and `1e3`) and shown through `TextField`'s existing `errorText` slot — the
primitive supported this all along; walk simply never passed it.

## Open questions the owner must settle before this locks

1. **Training presets vs range.** Is "short / medium / long" a deliberate speed affordance worth
   keeping as *input*? This card says yes — keep the chips, change only what they write. Confirm.
2. **Existing walk rows have an ambiguous anchor.** Nothing renders walk as an interval today
   (`sleep-intervals.ts` is sleep-only), so no display silently changes. But a row already saved as
   "occurred_at 08:00 + 30 min" was typed by an owner who may have meant 08:00 as the *start*.
   Declaring end-anchored makes those rows mean something their author did not choose. Options: leave
   pre-existing walk rows extent-only (no interval rendering), or backfill. **Not a UI decision.**
3. **`duration_bucket` retirement needs a read path.** Rows already carrying `duration_bucket` must
   still render. Either keep reading it (write minutes, read both) or migrate. Additive-write +
   tolerant-read is the safer default and needs no migration.

## Tokens / primitives

No new visual language. Assembled from `Card`, `Stack`, `AppText`, `SegmentedControl`, `WhenPicker`,
and the existing chip primitive. The range control is exactly the one shipped for sleep — two
labelled pills, one wheel expanded at a time, derived-duration footnote that becomes the error slot.
No new primitive variant, so the Stage 1 dev-gallery check does not apply.

## Accessibility

- Each pill carries a **visible** label, not only an `accessibilityLabel`. See
  `docs/design/v1/specs/quick-log-sleep-retrospective.md` — the sleep pills shipped label-less and
  every render test passed, because they queried by accessibility label.
- The derived duration is `accessibilityRole="alert"` only in the error state.

## Not in scope

- The capture pill renders 24h while Diary rows render 12h. Same time, two formats, one flow. Real,
  and orthogonal to this card — it needs its own decision.
- Post-save navigation (retrospective sleep returns to the Sleep action choice, not the Diary).
