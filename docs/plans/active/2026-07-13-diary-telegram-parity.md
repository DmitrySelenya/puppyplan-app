# Diary Telegram Parity — Make Real Logging Faster Than The Chat

**Status:** Active.

**Current phase:** Phase 0 owner-device re-verification. Phases 1–5 are implemented and locally
verified; the plan remains active until the fixed build's physical-device convergence check and
fresh 20+ event burst pass.

**Plan type:** Active task plan.

**Linear:** PUP-33 (created 2026-07-13 with owner approval; mirrors status only — this plan is the
source of truth). Related: PUP-32 (device handoff), the V2 polish backlog items 13–19.

---

## Why this plan exists

On 2026-07-13 the owner ran the first real dogfood session on a physical iPhone and compared it
against the household's actual logging medium: a Telegram chat. Verdict: **the app loses to the
chat on every core scenario.** The owner's real workflow (reconstructed from the chat, kept
synthetic here) is:

1. An entry is one line: `HH:MM what happened`, 3–5 seconds to type, dozens per day.
2. Entries come in batches — one message carries 4–6 events logged after the fact.
3. Backdating is the **primary** mode, not the exception ("moving over: 23:13 pee…").
4. Nearly every message gets edited later.
5. Free text carries most of the meaning ("chewed the crate, licked the mat, almost took the
   crate apart and fell asleep") — richer than any tracker taxonomy.
6. Sleep is tracked as intervals (fell asleep 7:42 / woke 8:16).
7. The partner sees everything instantly; reactions are a lightweight social layer.

The hands-on audit (simulator + the owner's device screenshots) produced the findings below. The
goal of this plan is not cosmetic polish: it is to make the app **strictly better than the chat**
for this workflow — faster to write, richer to read, trustworthy to store.

The baseline simulator audit and migration scorecard are recorded in
`docs/reviews/2026-07-13-diary-telegram-parity-ux-audit.md`. The software findings from that audit
are now implemented and green locally. The overall verdict remains **NO-GO as a Telegram
replacement** only because the fixed build has not yet passed the required physical owner-device
cross-device check-off and 20+ event burst.

## Audit findings (2026-07-13, confirmed)

| # | Finding | Evidence / root cause |
|---|---|---|
| F1 | **Device writes fail intermittently** — "Not saved · Try again / Discard" on a fast-lane Observation; "Could not mark this routine. Try again." on a check-off | Owner's device screenshots; NOT reproduced in the simulator; needs device logs |
| F2 | **Notes are write-only** — saved note is invisible in the Diary row, row tap does nothing, no details surface exists | Hands-on: 38-char note saved, unreachable afterwards |
| F3 | **No editing** — swipe exposes Delete only; time/subtype/note cannot be corrected | Hands-on |
| F4 | **Backdating is wheel-bound** — inline wheel picker, 10+ taps per backdated fact; even a scripted driver overshot the target hour | Hands-on tap count vs typing `01:31` in chat |
| F5 | **Oldest-first ordering** — fresh events sink to the bottom; morning sticks to the top | `src/contracts/diary-day.ts` `compareItems` ascending `localeCompare` |
| F6 | **Detailed potty payload is non-canonical** — a detailed "Pee outside" renders the inside icon | Composer payload fails `eventPayloadSchemas.potty` → `getTodayQuickAction` returns `other` → fallback icon (`TodayScreen.tsx` `getFactCardVisual`) |
| F7 | **TimeGutter truncates two-digit hours** ("10:…") below the AX threshold | 62 pt gutter applies only at `fontScale >= 2`; overflow starts earlier for `10:35 AM`-class strings |
| F8 | **No batch entry** — every event is a full sheet cycle |
| F9 | **Sleep intervals not exposed** — contract supports `action: start/wake/retrospective` + `duration_minutes` (`src/contracts/quick-log.ts`) but the UI never offers it |
| F10 | **No Telegram bridge** — no import, no share-out, no way to migrate the running chat history |

Prior-session fixes already landed and NOT part of this plan: duplicate Reminders title, snackbar
anchor (`bf9ab9d`); polish backlog items 13–19 (`2026-06-30-v2-screen-polish-backlog.md`).

## Non-goals

- No database-schema/RLS changes unless Phase 0 proves a server-side cause; any such change gets
  its own contract-first slice with migrations, pgTAP, and docs per `AGENTS.md`.
- No push/PR/EAS/TestFlight/production actions — separate exact approvals.
- No reactions/social layer yet (noted as a future idea, not scoped here).
- The polish backlog (items 13–19) stays where it is; do not merge it into this plan.

## Ground rules

- Design-fidelity pipeline applies to every UI change: spec-card lock before code, primitives
  first, anatomy render tests, Stage 4 native-vs-spec comparison with honest PASS/FAIL.
- Heavy isolated TDD (RED → GREEN → REFACTOR) per behavior change; never weaken a check.
- Typed i18n keys for every string, all locales; tokens/primitives only.
- Synthetic data only in any evidence — never the real puppy name, notes, or chat content.
- `npm run check` green before every commit; verify on a standalone Release build (SE simulator;
  device where the finding is device-specific).
- Defects outside this plan's scope: record and stop, don't fix-forward.

## 2026-07-13 implementation lock

The owner instructed the agent to fix the complete audited flow. Stage 0 is locked in
`docs/design/v2/specs/diary-telegram-parity.md` against `dogfood.diary.01`, `diary-item-edit`,
`dogfood.quick-log.details.01`, and `dogfood.stage0.variants.01`. The new lock records the explicit
owner-directed deviations: newest-first activity, readable private note previews, visible details /
edit / delete, numeric backdating, the persistent quick-entry line, sleep intervals, and day export.
The bilingual keyword map is derived only from generic vocabulary in the owner-supplied workflow;
raw chat content is not copied into docs, tests, logs, Linear, or retained screenshots.

### Locked implementation acceptance

- **AC-P33-ORDER:** all Diary facts render newest-first with deterministic tie ordering.
- **AC-P33-READ:** a v2 title/note is readable in the fact row and in a full details/edit surface.
- **AC-P33-CORRECT:** writers can edit and delete from visible controls; viewers cannot mutate.
- **AC-P33-TIME:** numeric `HH:MM` plus Now / -15m / -30m / -1h sets a valid past instant without
  replacing the native fallback picker.
- **AC-P33-PAYLOAD:** every detailed tracker output round-trips through its canonical v2 schema.
- **AC-P33-GUTTER:** valid localized two-digit times do not truncate at supported font scales.
- **AC-P33-SLEEP:** start, wake, and retrospective sleep facts read as explicit sleep actions;
  retrospective facts show their interval duration.
- **AC-P33-ENTRY:** Russian/English quick-entry text and newline batches preserve every source line;
  unknown text becomes an Observation note instead of being discarded.
- **AC-P33-EXPORT:** an authenticated day can be shared as synthetic-safe `HH:MM description` text;
  private text leaves the app only after the user invokes the native share action.

**TDD mode:** heavy/full-isolated. RED, GREEN, and REFACTOR are performed in separate agent contexts;
the primary agent re-reads the diff and independently runs verification before any completion claim.

## Phases

### Phase 5 — 2026-07-14 dogfood regression closure

The owner explicitly asked to fix every problem found in the 2026-07-14 SE dogfood run. This phase
spans Diary, Pet, navigation, and Reminders because the failures block the same real-day tracking
journey. Ownership remains separated: no feature imports another feature's internals, no storage or
schema changes are introduced, and each slice keeps its own tests. **ADR impact:** none — this phase
does not change the navigation, persistence, schema, RLS, or queue architecture; it repairs existing
V2 contracts inside their current ownership boundaries.

**Stage 0 lock package:** `docs/design/v1/specs/01-navigation-add.md`,
`03-diary-core-states.md`, `04-quick-log-routines-reminders.md`, `05-pet-health.md`,
`docs/design/v2/specs/diary-telegram-parity.md`, and `dogfood-schedule-form.md`; required device is
`Grith iPhone SE 3 iOS 26.3`; normal text plus Accessibility XXXL; synthetic data only.

**TDD mode:** heavy/full-isolated. Existing isolated RED, GREEN, and REFACTOR contexts are reused
sequentially. The primary agent independently reads the diff and runs targeted, full-gate, and
native verification.

#### Locked acceptance criteria

- **AC-P33-DOG-RETRO:** a valid retrospective sleep row renders one completed interval whose end is
  `occurred_at`, whose start is `duration_minutes` earlier, and whose Diary title includes the
  localized interval and duration. Start/wake pairing semantics stay unchanged.
- **AC-P33-DOG-PET:** Pet renders the active puppy's real name and age from the existing
  `ActivePuppyProfile`; unavailable breed/weight remain honestly missing. No visible Pet action may
  use a no-op handler; unsupported weight capture is not advertised as an actionable control.
- **AC-P33-DOG-NAV-AX:** the native accessibility tree exposes Diary, Pet, and More as three
  independently focusable selected-state primary-navigation actions in order, with Add as a
  separate button. A parent grouping element must not hide the children on iOS. Named iOS platform
  deviation: the custom controls use native `button` role plus `selected` state because React
  Native maps `tab` to `UIAccessibilityTraitNone`; Android retains `tab`.
- **AC-P33-DOG-DIARY-AX:** at Accessibility XXXL on the SE, the greeting/date remain readable, the
  seven-day strip is reachable without clipped labels, fact time/title/caption/actions preserve all
  meaning, and Share day / Review history are not truncated.
- **AC-P33-DOG-DRAFT:** cancelling a create/edit routine after any field differs from its initial
  draft shows an in-app confirmation with Keep editing and Discard. Keep editing preserves every
  field; Discard is the only path that invokes `onCancel`. A pristine form still closes directly.
- **AC-P33-DOG-FAST:** retain the owner-approved three-choice Add chooser. A common tracker with no
  required subtype/action choice saves in at most three taps from any screen: `Add → Quick Log →
  tracker`. Potty/Sleep may use one additional explicit result/action tap. Quick note and Schedule
  remain separate chooser actions; no second Diary composer is introduced. Owner approved this
  tap budget on 2026-07-14.

#### Root-cause evidence

- Retrospective sleep is parsed by `createQuickLogEventView`, but
  `createDiarySleepPresentationItems` recognizes only `start`/`wake`, so retrospective rows fall
  through as generic events and never derive their interval.
- `PetProfileHub` hardcodes its title, age, initials, breed, and weight while the Pet route already
  owns `useActiveCareContext`; the profile is simply not threaded into `HealthScreen`.
- `CapsuleTabBar` marks the visual capsule itself as an accessible `tablist`; native iOS groups that
  parent and suppresses the three accessible children. Removing that grouping and adding explicit
  `accessible` still left them absent from the Release rs/1 snapshot because the iOS React Native
  `tab` mapping has no actionable trait; the platform role must be `button`.
- Diary uses horizontal fixed-width anatomy at every scale: header row, seven fixed 38pt circles,
  62pt time gutter, and horizontal fact/action row. Text ceilings alone cannot prevent clipping at
  XXXL on the SE. The first native XXXL rerun also exposed custom-font glyph clipping in the
  explicit token/caller line boxes for the date, Share day, Today/Review history, and time labels.
  React Native already scales explicit `lineHeight` natively, so pre-scaling it in JavaScript would
  double the result. At accessibility font scale the shared text primitive instead removes the
  explicit line height and delegates once to each platform's natural scaled font metrics.
- `RoutineEditorScreen` wires Cancel directly to `onCancel` and has no initial-vs-current draft
  comparison or confirmation state.

#### Checklist

- [x] RED regression tests fail for the five non-ambiguous criteria above. Isolated RED evidence:
  six suites, six expected failures, 91 skipped; failures were the generic retrospective title,
  missing active puppy identity, the existing dead Add weight affordance, accessible capsule
  grouping, missing XXXL responsive anatomy, and direct dirty cancellation. The RED reviewer caught
  and corrected the old Health test's contradictory Add weight expectation before GREEN.
  Production was unchanged and `git diff --check` passed.
- [x] GREEN fixes pass targeted suites without changing schemas, queues, or dependencies. Final
  independent targeted evidence: eight suites / 165 tests passed.
- [x] REFACTOR context confirms no unnecessary abstraction or cross-feature coupling. It also
  rejected an intermediate JavaScript line-height multiplier after proving React Native already
  scales explicit line height natively; the corrected natural-metrics implementation then passed
  25/25 Diary primitive tests, typecheck, and diff check.
- [x] Stage 4 normal + XXXL native SE comparisons are recorded for Diary, Pet, tabs, and routine
  draft confirmation. Release verification used `Grith iPhone SE 3 iOS 26.3`: normal Diary/Pet and
  dirty routine confirmation passed; the rs/1 tree exposed separate Diary/Pet/More/Add actions;
  XXXL kept greeting/date, Share day, Today/Review history, fact time/title/caption/actions readable,
  and a horizontal swipe exposed Saturday and Sunday. The simulator was restored to Large text.
- [x] `npm run check` passes and evidence is mirrored to PUP-33. Final local gate: 99 Jest suites /
  961 tests, 119 Node tests, and scaffold/i18n/privacy/token/text-hygiene checks all green. Existing
  Expo notification and React `act()` warnings remain non-failing and outside this slice.
- [x] Owner resolved AC-P33-DOG-FAST on 2026-07-14: keep all three chooser actions and use a
  three-tap budget for common one-step facts. Existing anatomy and behavior tests map the path:
  Capsule Add → Quick Log is the first two taps; a simple tracker tap performs the save as tap 3.
  Decision verification: two focused suites / 45 tests passed, then `npm run check` remained green
  at 99 Jest suites / 961 tests plus 119 Node tests and all static gates.

### Phase 0 — Trust: device write failures (P0, owner's phone required)

**Why first:** an app that sometimes drops entries loses to the chat regardless of UX.

#### Locked PUP-33 F1 regression contract

**Acceptance criteria**

- **AC-F1-1:** after a `23505`, a non-deleted server fact with the same household, deterministic
  client event id, actor, puppy, event type, payload version, and exact `reminder_link` is an
  idempotent reminder check-off even when `occurred_at` differs; the first writer's row wins.
- **AC-F1-2:** a spontaneous Quick Log collision without a valid matching `reminder_link` remains
  idempotent only when the original routing identity fields, including `occurred_at`, match.
- **AC-F1-3:** a colliding tombstoned server row is never returned as idempotent success; the
  retry stays visibly failed instead of silently removing the local action.
- **AC-F1-4:** manual retry of a failed reminder check-off that resolves to the first writer's
  server row replaces the optimistic cache row and removes the durable queue item.
- **AC-F1-5:** an Observation v2 reminder check-off preserves its structured `reminder_link`
  through `createQuickLogEventInsert`, durable queue replay, and the Supabase insert contract.

**Edge and error cases**

- **EC-F1-1:** different reminder id or scheduled instant is a different logical occurrence.
- **ERR-F1-1:** actor, puppy, event type, or payload-version mismatch remains a permanent invalid
  collision for the current same-account/same-build dogfood contract.

**Constraints and out of scope**

- Compare structured reminder identity, never raw payload JSON or error details.
- No database-schema, RLS, queue-format, analytics, i18n, or UI changes.
- The owner approved the additive Observation v2 payload-contract change on 2026-07-13. It does
  not change the database schema, RLS, or queue format.
- Multi-account family attribution and cross-version check-off convergence require their own
  approved contract; this fix does not infer either behavior from shared-account dogfood.
- A legacy queued Observation check-off created before AC-F1-5 has no `reminder_link`, so it cannot
  be distinguished safely from a spontaneous reused id. It remains visibly failed and must be
  discarded before creating a fresh check-off; the app must not silently accept it.

- [x] Capture evidence with the owner's connected iPhone. `idevicesyslog` masked JS content as
  `<private>`, so the durable queue itself was pulled from the device
  (`devicectl device copy from --domain-type appDataContainer`, `Documents/SQLite/quick-log-queue.db`)
  and read directly; Supabase Dev postgres logs were pulled for the same window.
- [x] Classify: **cross-device duplicate check-off misclassified as permanent invalid payload.**
  The failed queue row is the check-off of the observation routine occurrence
  (`state=failed_permanent`, `retry_count=3`, `last_error_category=invalid_payload`); server logs
  show matching `duplicate key … event_log_household_id_client_event_id_key` (23505) errors at
  the exact attempt/retry timestamps. Chain: the occurrence was already checked off from another
  device on the shared account → owner's phone (stale until foreground refresh) re-sent the same
  deterministic client event id → 23505 → `insertEvent` correctly fetched the existing row, but
  `isQuickLogIdempotentDuplicate` also required equal `occurred_at`; the actual confirmation time
  can differ across devices even though the shared account actor and same-build payload version do
  not. Investigation of the real path then found a second contract bug: the Observation v2 factory
  dropped the `reminder_link` passed by Diary, preventing safe reminder-scoped dedupe. The mismatch
  synthesized `23514` → `invalid_payload` →
  `failed_permanent` and the "Not saved" / "Could not mark this routine" banners. This violated
  the shared-account contract (first writer wins; later devices converge).
- [x] Fix the comparator according to the locked contract above and preserve `reminder_link` in
  Observation v2. Isolated evidence: comparator RED 7 failed / 56 passed, GREEN 63/63; Observation
  contract RED 4 failed / 60 passed, GREEN 64/64; REFACTOR made no changes and stayed 64/64.
  The full local gate is recorded in the changelog below.
- [ ] Verify on the owner's device with the fixed build: discard the legacy stuck Observation row
  that lacks `reminder_link`, create a fresh check-off that converges without a duplicate fact,
  and confirm a fresh 20+ event burst loses nothing.

**Acceptance:** the two device failures are reproduced, root-caused, fixed (or explicitly
re-scoped with the owner), and covered by regression tests; a fresh device session logs a burst of
20+ events with zero losses.

### Phase 1 — Read & write parity quick wins (P1)

The four highest-leverage fixes; each is its own commit with spec-card note + tests.

- [x] **1a Newest-first Diary.** Flip the day ordering so the freshest item is at the top
  (`compareItems`/`compareFacts` descending display order; planned-vs-fact tie rules preserved).
  Update the Diary spec card; adjust render tests. Consider (record decision): keep planned
  future occurrences pinned in a small "upcoming today" strip so flipping doesn't bury the plan.
- [x] **1b Notes readable.** FactCard shows a 1–2 line note preview under the title; a note glyph
  marks noted rows. Spec-card update for row anatomy.
- [x] **1c Fact details + edit.** Tap a fact row → details sheet: full note, exact time, subtype,
  logged-by, created/edited stamps; actions Edit and Delete. Edit opens the existing detailed
  composer pre-filled (`initialDraft` path exists for reminders — mirror it for facts) and saves
  as an update (new `version`, same client event id) through the durable queue. Viewer role stays
  read-only.
- [x] **1d Backdate without the wheel.** In the detailed composer (and fast-lane long-press if
  cheap), replace wheel-first entry with: chips `Now / −15m / −30m / −1h` + a numeric `HH:MM`
  text entry; the wheel remains as fallback. Time parsing is locale-safe and validated.

**Acceptance:** a synthetic replay of the owner's chat day (25+ events, half backdated, several
with notes) is enterable in under half the current tap count, and every note is readable back from
the Diary without leaving the screen; all states covered by render tests; Stage 4 evidence
recorded.

### Phase 2 — Data quality and correctness (P2)

- [x] **2a Canonical detailed payloads.** The detailed composer emits payloads that parse against
  `eventPayloadSchemas.*` for every tracker (fixes the potty icon mismatch F6). Contract test:
  composer output × schema round-trip for all trackers/subtypes.
- [x] **2b TimeGutter content-safe width.** The gutter never truncates a valid time at any
  supported font scale (measure or widen below the AX threshold; keep the locked 62 pt AX
  behavior). Regression test with `10:35 AM`-class strings at fontScale 1.0–1.9.
- [x] **2c Sleep as an interval.** Expose the existing contract (`start` / `wake` /
  `retrospective` + `duration_minutes`) in the UI: fast lane Sleep → "fell asleep" starts an open
  interval; next tap offers "woke up" completing it; detailed composer accepts explicit duration.
  Diary renders the interval (start–end) on one row.
  - **Superseded 2026-07-15:** "detailed composer accepts explicit duration" is replaced by a
    from–to range (two `WhenPicker` pills; duration derived). Dogfood showed owners read the night
    as "23:41 → 6:35" and typing minutes made them subtract in their head at 6am. Model unchanged —
    it already stores end + duration. Lock: `docs/design/v1/specs/quick-log-sleep-retrospective.md`.

**Acceptance:** detailed and fast-lane events are payload-identical in shape; no truncated times;
the "7:42 fell asleep / 8:16 woke" flow is two taps and renders as one interval row.

### Phase 3 — Quick-entry line (the beat-the-chat feature; design lock first)

- [x] Write the spec card + brainstorm record BEFORE code: a persistent one-line input on the
  Diary ("`01:31 pee outside, a bit fussy`") that parses time + tracker keyword + free text into
  a prefilled fact; ambiguous input falls back to the detailed composer prefilled with the raw
  text as the note. Russian and English keywords; owner reviews the keyword map.
- [x] Implement behind the locked spec: parser is a pure, heavily-tested unit
  (`src/lib/quick-entry/` proposed); UI is a thin composer over the existing durable mutation
  path. No new storage.
- [x] Batch mode: after save, the line stays focused for the next entry (chat cadence).

**Acceptance:** the owner's real cadence — six one-line events in a row, mixed backdated —
is fully enterable from the line without opening any sheet; parser unit suite covers the locked
keyword map, time formats, and fallbacks; Stage 4 evidence on device.

### Phase 4 — Telegram bridge (scoped decision, likely deferred)

- [x] Decision: ship selected-day share-sheet export now; defer Telegram-history import. Export
  uses the chat-like `HH:MM description` format and is explicitly user-triggered. Import remains
  outside this slice because it requires parsing private Telegram export data and does not improve
  the daily capture loop enough to justify that privacy and implementation surface yet.

**Acceptance:** a recorded decision; if export ships, a day exports to text that reads like the
household's chat format (synthetic fixture test).

## Definition Of Done

The household can run a full real day in the app instead of the chat and not miss the chat:
zero lost writes (Phase 0), reading the day back is glanceable with notes visible (Phase 1),
data renders truthfully (Phase 2), and entry speed for their actual cadence is at or below
chat speed (Phases 1d + 3). Each phase's evidence is recorded here with honest PASS/FAIL.

## Changelog

- 2026-07-15 (retrospective sleep becomes a from–to range): dogfood showed the last big capture
  friction was arithmetic — the owner's night is "23:41 → 6:35", and the composer asked for 414
  minutes, i.e. subtraction in their head at 6am. The model never needed changing: a retrospective
  sleep already stores end (`occurred_at`) + `duration_minutes`, and `src/lib/diary/
  sleep-intervals.ts` already derived the start for the Diary row, so the range was expressible all
  along and only the input affordance was missing. Two `WhenPicker` pills ("Fell asleep" / "Woke
  up") now bracket the sleep and the duration is derived (`src/lib/datetime/sleep-range.ts`), never
  typed; crossing midnight needs no special case because both ends are absolute instants. The start
  pill starts **empty** and blocks Save ("Add when the sleep started.") rather than defaulting to a
  guess, which would save a night nobody entered. The generic "When" card hides for retrospective
  sleep — "Woke up" *is* `occurredAt`, and two time controls in separate cards hide their
  relationship. This **supersedes** phase 2c's "detailed composer accepts explicit duration".
  Stage 0 lock: no artboard exists (manifest lists the sleep/feeding/zoomies detail forms as an
  open gap), so the owner approved the scope in chat instead; recorded in
  `docs/design/v1/specs/quick-log-sleep-retrospective.md`. Stage 4 **PASS** (SE, synthetic) and it
  earned its keep — it caught two defects the render tests missed: the pills had no *visible*
  labels (tests queried the accessibility label, which existed, so they passed while a sighted
  owner saw "Choose time / 11:48" with no way to tell the ends apart), and two wheels open at once
  made the card taller than the sheet so scrolling dragged a wheel and silently rewrote a set time
  (hit by accident while driving the sim; opening one wheel now collapses the other). Both are now
  covered by tests. Verified end to end: 23:41 → 06:35 derives "6 hr 54 min"; a saved range renders
  in the Diary as "Slept 10:56 PM–11:56 AM · 13 hr". Gate: `npm run check` exit 0. Still open:
  play intervals ("12:02–12:10") remain inexpressible, the capture pill (24h) disagrees with Diary
  rows (12h), and Save on a retrospective sleep returns to the Sleep action choice rather than the
  Diary.

- 2026-07-15 (overnight dogfood: two silent-data-loss fixes + two frictions): a roleplay E2E pass
  across the midnight boundary (owner's Telegram routine replayed in the simulator) found that
  midnight — the centre of an overnight puppy routine, not an edge case — broke two write paths,
  and that the two bugs composed into silent data loss. (1) `app/(modals)/quick-log/details`
  gated updates on `careContext.todayDate === detailContext.todayDate`. That param is a
  cache-invalidation hint captured when the sheet opens, never a permission; once an edit crossed
  midnight the guard failed and the code fell through to `close()`, dropping the draft with no
  error and no version bump (reproduced twice: 414→400 min lost). The day is out of the guard,
  invalidation now follows the live day, and an unpersistable draft raises instead of closing, so
  the sheet keeps the text and shows the existing persistence error. (2) `getTodayDate()` was
  computed once per render with nothing ticking at midnight, so the Diary stayed on yesterday and
  new entries landed on a day the owner could not see; `useTodayDate` (`src/lib/datetime/
  today-date.ts`) schedules to the next *local* midnight (DST-safe) and re-probes on AppState
  `active`, since backgrounded timers are throttled. (3) Quick note gained the dirty-draft guard
  the routine editor already had — a half-written note is the point of a capture-first surface.
  Frictions: overnight sleep now reads "6 hr 54 min" rather than "414 min"
  (`formatDurationMinutes`), and the sleep step shows an open interval ("Asleep since 11:02 AM")
  so a second Start sleep is not logged blind. Gate: `npm run check` exit 0 (101 Jest suites /
  975 tests, 119 Node tests, scaffold/privacy/i18n/token/text green). Fixes 1, 3 and both
  frictions re-verified in the simulator; the midnight tick is covered by unit tests rather than a
  wall-clock E2E. Note for the next agent: the simulator app runs an **embedded release
  `main.jsbundle` and ignores Metro** — the first "fixes not visible" reading was a stale bundle,
  not a broken fix. Still open from this pass: retrospective sleep asks for minutes rather than a
  from–to range, play intervals ("12:02–12:10") remain inexpressible, and the capture pill (24h)
  disagrees with Diary rows (12h) — that last one is a design decision for the fidelity pipeline,
  so it was left alone.

- 2026-07-14 (owner follow-up + independent review fixes): an independent review re-ran the full
  gate and a native SE pass over the Phase 5 build (all six fixes confirmed on device profile;
  screenshots retained in the review session). Three corrections landed from that review and the
  owner's follow-up directives: (1) an accepted Quick note now closes the sheet and returns to the
  Diary timeline (announcement first, inline-error path unchanged); (2) an Observation carrying
  only a note renders the note as its Diary row title instead of the generic "Observation" label,
  and day export emits the note alone; (3) `createDetailedDurably` no longer reports a
  `failed_permanent` outcome as durable acceptance — the dead queue item is discarded and the
  rejection surfaces in the sheet with the text preserved, so a retry cannot leave a duplicate
  failed fact. Review also corrected one of its own findings: previous-day sleep-pairing failure
  already surfaces the Diary error banner by locked design (AC-QN-FIX-NIGHT-STATUS) and was left
  unchanged. Specs updated (`quick-note.md`, `diary-telegram-parity.md`); targeted suites 63/63.

- 2026-07-14 (SE dogfood regression closure, non-ambiguous scope): fixed retrospective sleep as a
  derived completed interval, threaded the active puppy identity/age into Pet, removed the dead
  Add-weight affordance, protected dirty routine drafts with Keep editing / Discard, exposed
  Diary/Pet/More/Add as separate native iOS accessibility actions, and made Diary anatomy/content
  safe at Accessibility XXXL. A native-only text-clipping follow-up first disproved JavaScript
  line-height pre-scaling against React Native's platform implementation, then delegated large-type
  line boxes to natural native font metrics; the corrected Release screenshot has no vertical
  clipping and no double-spaced text. Required SE normal/XXXL Stage 4 passed, targeted suites passed
  165/165, and `npm run check` passed (99 Jest suites / 961 tests plus 119 Node tests and all static
  gates). The owner then resolved AC-P33-DOG-FAST: the three-choice Add chooser stays, the common
  one-step fact budget is three taps, and Potty/Sleep may use one additional explicit choice.

- 2026-07-13 (owner design correction — quick-entry composer removed): after seeing the Diary
  composer card on the simulator, the owner rejected a second in-Diary add-record entry point and
  reaffirmed the single central "+" as the only way to add records ("parity" means notes on every
  event and readable custom entries, not a chat UI). The `DiaryQuickEntryComposer`, its
  `onQuickEntry` wiring, `today.quick-entry.*` strings/keys, and its render tests were removed;
  `src/lib/quick-entry/parser.ts` and its unit tests are retained UI-less by explicit owner choice
  for possible future import/transfer use. AC-P33-ENTRY is void as a UI criterion. Share-day export
  stays pending owner confirmation. Full gate after removal: 96 Jest suites / 890 tests plus Node
  and check scripts, all green.

- 2026-07-13 (Phases 1–4 implementation + native Stage 4): implemented newest-first deterministic
  Diary ordering, visible note previews, full fact readback, writer edit/delete and viewer read-only
  behavior, numeric/chip backdating, canonical v2 payload round-trips for all seven trackers,
  content-safe time gutters, sleep interval projection, bilingual lossless quick-entry batches,
  and selected-day share-sheet export. Heavy-isolated RED/GREEN suites passed at each slice; the
  independent full gate passed with 96 Jest suites / 893 tests and 119 Node tests, plus lint,
  typecheck, scaffold, i18n, privacy, token, plan, and text-hygiene checks. Native Stage 4 on the
  required `Grith iPhone SE 3 iOS 26.3` profile passed: a synthetic entry was created, appeared at
  the top with a readable note, opened into the audited detail surface, edited with the same locked
  tracker type, deleted without removing neighboring facts, and the selected-day action opened the
  iOS Share Sheet. Evidence is retained under `output/ux-audit/pup33-fixed/`. Stage 4 verdict:
  **PASS** against the locked spec; no named visual deviation. Physical owner-device cross-device
  convergence and the fresh 20+ event burst remain the sole completion blocker.

- 2026-07-13 (fresh SE simulator UX audit): replayed the Telegram-shaped workflow with synthetic
  data on the required iPhone SE profile. Confirmed current-run evidence for oldest-first placement,
  repeated generic Observation rows, two-digit TimeGutter truncation, nested detailed-entry sheets,
  and hidden swipe-only delete. A new fast Potty fact persisted across relaunch; its swipe deletion
  succeeded and remained absent after relaunch. This is positive path evidence only: the owner-device
  fresh cross-device check-off and 20+ event burst remain open, so Telegram replacement stays NO-GO.
  Full report: `docs/reviews/2026-07-13-diary-telegram-parity-ux-audit.md`.

- 2026-07-13 (review of Codex Phase 0 + training parity): independent review confirmed the scoped
  comparator/Observation-v2 fix is correct and green (comparator logic, tests↔AC mapping, docs, and
  `npm run check` re-run by the reviewer). Two findings recorded and the first fixed in this slice:
  (1) the identical `reminder_link`-drop bug still lived in the **training** v2 path — both
  `trainingEventPayloadSchemaV2` and the `createV2Insert('training')` factory omitted the link while
  every other tracker preserved it, so a training routine check-off across two devices would fail
  the same way. Fixed with parity (schema + factory) and a canonical threading test now covering
  training and observation in `reminders-checkoff.test.ts` (RED on training / GREEN after). (2) The
  already-stuck legacy occurrence `evt_ce1c3216` is a live server row written by a pre-fix build
  *without* a `reminder_link`, so a same-occurrence re-check-off cannot converge under the (correct)
  strict comparator — the routine is already saved server-side; the device path is Discard + rely on
  foreground refresh, and convergence applies to occurrences newly written by the fixed build. Server
  logs since the prior session show no new `23505` failures. AC-F1-5 now holds for training as well
  as observation.

- 2026-07-13 (review correction): deep review found the first Phase 0 draft relaxed every Quick
  Log `23505` collision and could silently accept ordinary reused ids or tombstoned facts. The
  replacement keeps actor/schema/routing strict, allows a different confirmation time only for an
  exact live `reminder_link`, and rejects tombstones. A second RED exposed that Observation v2
  dropped and rejected `reminder_link`; the owner approved the additive payload-contract fix.
  Manual retry coverage now starts from `failed_permanent`, replays a real synthetic Observation
  check-off, replaces cache with the first writer's row, and removes the durable queue item. Legacy
  Observation rows without a link remain visible for discard rather than being guessed safe. Full
  local gate: `npm run check` exit 0 (95 Jest suites / 871 tests, 119 Node tests, scaffold/privacy/
  i18n/token/text checks green); existing Expo notification and React `act()` warnings remain
  unchanged outside this slice.

- 2026-07-13 (earlier draft, superseded by review correction above): Phase 0 identified a
  cross-device duplicate check-off convergence bug. The comparator required the same tap time, so
  the second household device got `failed_permanent` instead of converging on the first writer's
  row. Evidence: device queue DB (pulled via `devicectl`) + Supabase postgres
  logs with matching timestamps. The initial routing-only comparator relaxation and its earlier
  gate evidence are superseded by the scoped implementation above. Device re-verification with the
  fixed build remains open. PUP-33 created; the syslog path was a dead end (`<private>` masking) —
  recorded in the plan so the next agent pulls the queue DB first.

- 2026-07-13: Plan created from the owner's first real-device dogfood session and the Telegram
  workflow audit. Findings F1–F10 recorded with evidence and root causes where confirmed.
  Phase 0 is blocked on the owner's connected phone for log capture.
