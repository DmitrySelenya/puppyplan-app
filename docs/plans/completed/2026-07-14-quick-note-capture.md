# Quick Note Capture + Backdating Overhaul

- **Status:** Completed — Phases 1–4 implemented and committed 2026-07-14 on owner instruction;
  review-fix acceptance, full local gate, and Stage 4 Release-simulator verification complete.
- **Completed:** 2026-07-14
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
- 2026-07-14: owner instructed implementation of the whole plan, with the pre-existing work
  committed first. Phases 1–4 landed as four commits on
  `dimaselenya/pup-33-diary-telegram-parity-trusted-writes-readable-notes-chat`:
  - **Phase 1** (`86e91dd`): Stage 0 lock `docs/design/v2/specs/quick-note.md` (recorded as a
    fresh owner-authored design, no atlas artboard); `noteAction` contract + `/quick-log/note`
    sheet; third slab; capture sheet with time pill, native day+time wheel, no autoFocus;
    writes an Observation v2 fact through the existing durable queue and keeps the sheet open.
  - **Phase 2** (`16c619f`): `WhenPicker` primitive extracted and adopted by the details form,
    replacing the numeric `HH:MM` field and the separate date control. Midnight backdating and
    the time-reset-on-date-change defect are both resolved.
  - **Phase 3** (`553c602`): cross-midnight sleep pairing (puppy-scoped key, 16h bound,
    previous-day sleep rows as pairing input only, deduped by `client_event_id`); retrospective
    sleep takes free minutes validated against the 1440 schema ceiling.
  - **Phase 4** (`6bc0521`): version-aware `getTodayQuickAction`; tracker pass-through from the
    grid via long press plus an accessibility action; edit-mode strings.
  - Gate at Phase 4: 99 suites / 935 tests, tsc clean, lint and all check scripts green.

### Named deviations taken during implementation (owner review requested)

- **Sleep duration presets removed.** Phase 3.3 replaced the `Not sure / 15 / 30 / 60` chips with
  a free-minutes field, per the plan's "numeric minutes entry ... replacing the 15/30/60 cap".
  This costs one tap for the common 30-minute nap. If that regression matters, the chips can be
  restored alongside the field as presets — say so and it is a small follow-up.
- **`WhenPicker` open state is controlled**, not internal, so a surface can collapse the wheel
  when it resets its own value (the note sheet does this after each save).
- **Submit-time future/too-old validation retained** in the details form even though the wheel
  bounds now make an out-of-range value unreachable. It guards values that did not come from the
  wheel; the plan's "delete the today-bound validation path" is satisfied by removing the
  `HH:MM`-vs-selected-day parse, which was the actual defect.

## 2026-07-14 review-fix lock

Owner instruction: fix every issue found in the current SE simulator/code review. This is a
bugfix continuation of PUP-33 and does not widen the product scope.

**TDD mode:** heavy/full-isolated because the fixes touch Quick Log queue acceptance,
query/cache behavior, and design-fidelity states. RED, GREEN, and REFACTOR use separate agent
contexts; the primary agent re-reads the resulting diff and runs independent verification.

### Acceptance criteria

- **AC-QN-FIX-SLEEP-DEFAULT:** opening details with Sleep selected and pressing Save without
  interacting with the action control writes an explicit `action: start`; duration input is
  available only for `retrospective`, where a valid 1–1440 minute value is required.
- **AC-QN-FIX-NIGHT-STATUS:** the wake-day feed never presents a bare wake as a successful day
  when its required previous-day pairing query is loading or failed; once both query inputs are
  ready, a previous-day start and current-day wake render as one interval.
- **AC-QN-FIX-DST:** cross-midnight sleep duration is elapsed-time correct across a DST boundary
  and the interval remains assigned to the wake day.
- **AC-QN-FIX-DURABLE:** once a Quick note has been durably enqueued, a transient or permanent
  server rejection does not preserve a re-submittable composer draft or create a second queue
  identity; failure before durable enqueue remains inline and preserves the draft.
- **AC-QN-FIX-STATE:** queue initialization renders the existing pending-write anatomy with Add
  disabled; viewer access renders the existing permission-denied anatomy with Add disabled.
- **AC-QN-FIX-A11Y-MODAL:** the Quick note route marks its screen as modal so assistive focus is
  isolated from the underlying Diary controls.
- **AC-QN-FIX-A11Y-SAVED:** durable Quick note acceptance emits the typed polite saved
  announcement and contains no note text.
- **AC-QN-FIX-COMPACT:** the three sleep action segments allocate content-aware width on the
  primary SE profile so `Add completed sleep` is not ellipsized at the default font scale.

### Constraints and error cases

- No schema, RLS, migration, dependency, route, production, or generated-native changes.
- Preserve the existing `client_event_id` queue/idempotency contract and 3-second/60-second
  Quick Log rules.
- Never log, announce, or retain note text in diagnostics/evidence.
- Server failure after durable enqueue remains visible through the existing queued/failed event
  recovery surface; only pre-enqueue failure belongs in the composer inline error.
- Stage 4 uses synthetic data on `Grith iPhone SE 3 iOS 26.3`.

### Review-fix verification evidence

- **RED:** 7 focused suites exposed 14 failures across durable acceptance, sleep default/state,
  compact segments, Quick note state anatomy, and modal/saved accessibility. The independent DST
  case was already green and records a 180-minute elapsed interval on the wake day across the
  spring-forward boundary.
- **GREEN:** the focused set passes at 7 suites / 151 tests. The follow-up Today regression test
  also confirms that an unavailable previous-day sleep query suppresses only unpaired sleep rows;
  unrelated current-day facts remain visible.
- **REFACTOR:** separate behavior-preserving review found no justified production cleanup after
  checking queue failure propagation, sleep-only suppression, saved-announcement privacy, modal
  anatomy, and compact segment layout.
- **Full local gate:** `npm run check` exits 0 — lint and TypeScript clean; 99 Jest suites / 952
  tests; 119 Node tests; navigation, EN/RU/ES parity and string budgets, scaffold guardrails,
  plan index, token drift, privacy scan, and text hygiene all pass. The new hook test QueryClient
  uses infinite test-only garbage-collection time, so Jest exits normally without `--forceExit`.
- **Stage 4 native comparison:** `PASS` on the required `Grith iPhone SE 3 iOS 26.3` profile,
  fresh `Release` build, scheme `PuppyPlan`, bundle `com.dmitry-selenya.puppyplan-app`. There is
  no atlas artboard for this owner-authored screen, so the comparison target remains the Stage 0
  spec plus the fresh owner design already recorded above.
  - Quick note opens without a keyboard, the expanded native day+time wheel stacks above the note
    field without clipping, durable save clears and resets the composer while keeping the sheet
    open, and the synthetic Observation appears in Diary.
  - Sleep opens on `Start sleep` without a duration field. `Add completed sleep` is fully readable
    on the SE, reveals the duration field, accepts 414 minutes, and saves successfully.
  - Diary renders the verified cross-midnight interval as `11:41 PM–6:35 AM · 414 min` on the
    wake day.
- No schema/RLS/migration/dependency/generated-native changes, commit, push, PR, release action,
  or Linear mutation was performed by this review-fix pass.
