# Quick Note Capture + Backdating Overhaul

- **Status:** Draft — pending owner approval of phase order (verbal verdict approved 2026-07-14)
- **Linear:** pending (owner to confirm issue creation; falls under PUP-33 follow-up scope otherwise)
- **Owner decision trail:** 2026-07-14 owner proposed the Quick note slab himself after hands-on
  e2e testing against his real Telegram log; confirmed the verdict and phase order; explicitly
  rejected autoFocus on the note input ("это будет бесить").

## Why this plan exists

E2E testing (2026-07-14, SE simulator, real backend) against the owner's actual Telegram puppy log
showed the current app cannot absorb his real logging pattern:

1. **Capture cost:** one backdated fact costs ~10 taps through `+` → Quick Log → Log with details.
   His real day is ~40 lines → ~400 taps. Telegram equivalent: one line in an open message.
2. **Midnight blocker:** the details `HH:MM` field is hard-bound to today. Entering last night's
   `23:41` at midday errors with "Time cannot be in the future"; the date-pill workaround resets
   the just-typed time. His primary pattern (морнинг-перенос всей ночи) is impossible.
3. **Night sleep does not exist:** sleep start/wake pairs never merge across midnight (UTC-date
   pairing key + single-day feed) and "Add completed sleep" caps duration chips at 60 min while
   the schema allows 1440. Overnight sleep duration — the single most important puppy metric —
   is unrecordable.
4. ~70% of his real lines are free text with a time, not typed events. Fixation must be instant;
   classification is optional and later.

Design decision (owner): a third slab under `+` — **Quick note** — capture-first, classify-later.
The Diary remains a feed; `+` remains the single entry point (see memory `diary-single-entry-point`).

## Non-goals

- No in-Diary composer, no chat UI, no line parser UI (parser stays UI-less).
- No new storage surface: quick notes are Observation v2 facts in the existing durable queue.
- No Telegram import.
- No auto-classification of note text (possible future phase, separate approval).

## Ground rules

- Contract-first: nav/i18n/route changes start in `src/contracts/`.
- Design lock before code: spec card in `docs/design/v2/specs/quick-note.md` (Clay V2 tokens only).
- TDD per slice; full gate (`npm test` + checks) green before claiming a phase done.
- Simulator (Release, SE profile) verification before any phase is declared complete.
- **No autoFocus anywhere in the new surfaces** — keyboard rises only on explicit field tap
  (owner directive 2026-07-14).
- Commits, Linear mutations, push/PR only with explicit owner approval.

## Acceptance criteria

- **AC-QN-SLAB:** `+` opens three slabs; Quick note slab is present with icon/subtitle, ≥44pt,
  typed i18n (EN/RU/ES). Slab order per design lock; Schedule and Quick Log remain functional.
- **AC-QN-CAPTURE:** Quick note sheet = time pill (prefilled "now") + multiline text field
  (max 500) + primary Add action. Path cost: `+` → slab → tap field → type → Add. No autoFocus.
- **AC-QN-TIME:** tapping the time pill opens the native iOS date+time wheel (`dateAndTime`);
  yesterday 23:41 is reachable with one wheel gesture; no future dates; ≤7 days back; changing
  the date never clears the chosen time.
- **AC-QN-PERSIST:** Add writes an Observation v2 fact (note = text, occurred_at = pill value)
  through the existing detailed durable mutation; failure shows inline error and preserves the
  text; success clears the field, keeps the sheet open, resets pill to "now".
- **AC-QN-FEED:** saved note appears in the Diary feed at its backdated position with note
  preview; full text on tap; exports via Share day in `HH:MM — note` form.
- **AC-QN-WHEN:** the details form "When" section reuses the same pill+wheel component (replacing
  the HH:MM+date-pill combo); chips Now/−15m/−30m/−1h retained; midnight backdating works; the
  time-reset-on-date-change defect is gone.
- **AC-QN-NIGHT:** sleep start 23:41 (day N) + wake 6:35 (day N+1) render as one interval row with
  duration on the wake day (pairing by chronology, not UTC-date bucket); retrospective sleep
  accepts arbitrary minutes up to 1440.
- **AC-QN-POLISH:** `getTodayQuickAction` parses payloads version-aware (v2 facts with notes get
  correct tracker icons); Quick Log grid carries the chosen tracker into the details form (no
  `feeding` hardcode); edit mode shows edit-titled strings instead of "Add details".

## Phases

### Phase 1 — Quick note slab + capture sheet (AC-QN-SLAB, CAPTURE, TIME, PERSIST, FEED)
1. Design lock: spec card `docs/design/v2/specs/quick-note.md` (anatomy, tokens, states, a11y).
2. Contracts: third nav action + route (`/quick-log/note` modal), typed i18n keys EN/RU/ES.
3. Sheet UI from `src/design` primitives; time pill + native wheel; no autoFocus.
4. Wire to existing `createDetailed` (observation v2). RED→GREEN tests: contract, render
   (anatomy + no-autoFocus assertion), route wiring, persistence error path.
5. Release-sim verification incl. yesterday-23:41 capture and feed readback.

### Phase 2 — Unified backdating in details form (AC-QN-WHEN)
1. Extract the pill+wheel datetime component from Phase 1 into `src/design` (or feature-shared).
2. Replace details "When" HH:MM+date-pill pair; keep offset chips; delete the today-bound
   validation path in favor of wheel bounds (no future, ≤7 days).
3. Tests: midnight backdate (23:41 yesterday at 12:56 today), no time reset on date change,
   edit flow keeps same client_event_id.

### Phase 3 — Night sleep exists (AC-QN-NIGHT)
1. `src/lib/diary/sleep-intervals.ts`: pair start/wake chronologically across midnight (drop the
   UTC-date component from the pairing key; bound pairing window, e.g. ≤16h, to avoid runaway
   pairs); decide display convention: interval row lives on the wake day.
2. Feed query: wake-day row must see the prior-day start row (extend the day window for sleep
   pairing input).
3. Retrospective sleep: numeric minutes entry (wheel or field) replacing the 15/30/60 cap;
   schema already allows ≤1440 — UI only.
4. Tests: cross-midnight merge, DST boundary, unpaired starts, duration math.

### Phase 4 — Capture-quality polish (AC-QN-POLISH)
1. Version-aware `getTodayQuickAction` (TodayScreen) — v2 schemas first, v1 fallback; fixes the
   briefcase-icon P1 from the 2026-07-13 review.
2. Quick Log grid → details: pass the tapped tracker (remove `feeding` hardcode in
   `QuickLogShell`); optional long-press = open details pre-set to that tracker.
3. Edit-mode strings: "Edit entry / Save / Cancel" replacing "Add details / Save details /
   Skip details" when editing an existing fact.
4. Tests per slice; full gate; Release-sim pass.

### Deferred (needs separate owner approval)
- Observation → typed-event conversion ("upgrade a note"): tombstone + new fact with same
  occurred_at; unlocks classify-later fully but touches idempotency invariants.
- Note-text auto-classification via the retained UI-less parser.
- Interval capture for walks/play ("12:02–12:10 играем").

## Definition of Done

Owner can reproduce his real Telegram day in the app: morning writeup of the whole night
(23:20 → 6:50 lines) backdated in seconds each, night sleep shows as one interval with duration,
notes are instant without the keyboard jumping at him, and the full gate + Release-sim evidence
is recorded here per phase.

## Changelog

- 2026-07-14: plan drafted from owner-run e2e verdict; owner approved verdict + phase order,
  rejected autoFocus. Awaiting explicit approval to start Phase 1 implementation and to create
  the Linear issue.
