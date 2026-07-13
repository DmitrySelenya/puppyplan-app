# Diary Telegram Parity — Make Real Logging Faster Than The Chat

**Status:** Active.

**Current phase:** Phase 0 — scoped duplicate-convergence fix and owner-device re-verification.

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

## Phases

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

- [ ] **1a Newest-first Diary.** Flip the day ordering so the freshest item is at the top
  (`compareItems`/`compareFacts` descending display order; planned-vs-fact tie rules preserved).
  Update the Diary spec card; adjust render tests. Consider (record decision): keep planned
  future occurrences pinned in a small "upcoming today" strip so flipping doesn't bury the plan.
- [ ] **1b Notes readable.** FactCard shows a 1–2 line note preview under the title; a note glyph
  marks noted rows. Spec-card update for row anatomy.
- [ ] **1c Fact details + edit.** Tap a fact row → details sheet: full note, exact time, subtype,
  logged-by, created/edited stamps; actions Edit and Delete. Edit opens the existing detailed
  composer pre-filled (`initialDraft` path exists for reminders — mirror it for facts) and saves
  as an update (new `version`, same client event id) through the durable queue. Viewer role stays
  read-only.
- [ ] **1d Backdate without the wheel.** In the detailed composer (and fast-lane long-press if
  cheap), replace wheel-first entry with: chips `Now / −15m / −30m / −1h` + a numeric `HH:MM`
  text entry; the wheel remains as fallback. Time parsing is locale-safe and validated.

**Acceptance:** a synthetic replay of the owner's chat day (25+ events, half backdated, several
with notes) is enterable in under half the current tap count, and every note is readable back from
the Diary without leaving the screen; all states covered by render tests; Stage 4 evidence
recorded.

### Phase 2 — Data quality and correctness (P2)

- [ ] **2a Canonical detailed payloads.** The detailed composer emits payloads that parse against
  `eventPayloadSchemas.*` for every tracker (fixes the potty icon mismatch F6). Contract test:
  composer output × schema round-trip for all trackers/subtypes.
- [ ] **2b TimeGutter content-safe width.** The gutter never truncates a valid time at any
  supported font scale (measure or widen below the AX threshold; keep the locked 62 pt AX
  behavior). Regression test with `10:35 AM`-class strings at fontScale 1.0–1.9.
- [ ] **2c Sleep as an interval.** Expose the existing contract (`start` / `wake` /
  `retrospective` + `duration_minutes`) in the UI: fast lane Sleep → "fell asleep" starts an open
  interval; next tap offers "woke up" completing it; detailed composer accepts explicit duration.
  Diary renders the interval (start–end) on one row.

**Acceptance:** detailed and fast-lane events are payload-identical in shape; no truncated times;
the "7:42 fell asleep / 8:16 woke" flow is two taps and renders as one interval row.

### Phase 3 — Quick-entry line (the beat-the-chat feature; design lock first)

- [ ] Write the spec card + brainstorm record BEFORE code: a persistent one-line input on the
  Diary ("`01:31 pee outside, a bit fussy`") that parses time + tracker keyword + free text into
  a prefilled fact; ambiguous input falls back to the detailed composer prefilled with the raw
  text as the note. Russian and English keywords; owner reviews the keyword map.
- [ ] Implement behind the locked spec: parser is a pure, heavily-tested unit
  (`src/lib/quick-entry/` proposed); UI is a thin composer over the existing durable mutation
  path. No new storage.
- [ ] Batch mode: after save, the line stays focused for the next entry (chat cadence).

**Acceptance:** the owner's real cadence — six one-line events in a row, mixed backdated —
is fully enterable from the line without opening any sheet; parser unit suite covers the locked
keyword map, time formats, and fallbacks; Stage 4 evidence on device.

### Phase 4 — Telegram bridge (scoped decision, likely deferred)

- [ ] Decide with the owner: minimum viable bridge = share-sheet export of a day (text in the
  chat's own format) so the app can coexist with the chat during migration; import of chat
  history is expensive (parsing exported JSON) and probably not worth it — decide explicitly
  rather than silently skip.

**Acceptance:** a recorded decision; if export ships, a day exports to text that reads like the
household's chat format (synthetic fixture test).

## Definition Of Done

The household can run a full real day in the app instead of the chat and not miss the chat:
zero lost writes (Phase 0), reading the day back is glanceable with notes visible (Phase 1),
data renders truthfully (Phase 2), and entry speed for their actual cadence is at or below
chat speed (Phases 1d + 3). Each phase's evidence is recorded here with honest PASS/FAIL.

## Changelog

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
