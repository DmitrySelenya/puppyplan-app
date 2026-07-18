# PUP-33 Branch Closure + Routine Lifecycle Menu

**Goal:** Prove on a live simulator that offline check-offs survive, execute the two owner
decisions locked on 2026-07-16, open the PR that closes the 35-commit PUP-33 branch, then build
the §6.4 routine lifecycle menu on a fresh branch.

**Status:** Active — handed to an autonomous agent by the owner on 2026-07-16.

**Current phase:** Phase 4 — PUP-34 lifecycle-menu design lock and pause-semantics verification.

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

- [x] Rebuild the bundle from the current branch head and reinstall (recipe above).
- [x] Offline check-off: with Wi-Fi cut, tap a routine's checkbox. On the offline screenshot the
      row must show a visible pending/failed state — **not** vanish and **not** show a bare
      unmarked circle as if the tap never happened.
- [x] Back online: the mark converges to `done` (retry may need a foreground nudge — an app
      relaunch is acceptable; document what it took).
- [x] Offline un-check of a synced mark: same pattern; the delete must either apply after
      reconnect or stay visibly failed — never silently revert.
- [x] Burst: log 20+ events in quick succession through the "+" flow (potty quick-logs are the
      cheapest taps). Count what the Diary shows, then count server rows with a **read-only**
      query via the Supabase MCP (`select count(*) from event_log where ... and deleted_at is
      null` scoped to today). Zero losses, zero duplicates.
- [x] Clean up burst events via the app's own delete flow (they pollute the owner's diary),
      and record evidence paths + observations in this plan's changelog.

**AC-P1-OFF-1:** an offline check-off is visibly pending/failed offline and `done` after
reconnect, with exactly one server row.
**AC-P1-OFF-2:** nothing logged offline disappears without a visible failed state.
**AC-P1-BURST-1:** 20+ rapid events → server row count matches the Diary exactly.

### Phase 1 defect-repair spec lock (2026-07-16)

The first live run proved that durable enqueue exists but recovery does not. Repair this before
continuing Phase 1; it is implementation of the accepted retry contract in
`docs/architecture/10-quick-log-queue.md`, not a new queue or the ADR-0021 shared-engine
extraction.

**Constraints:**

- Heavy/full-isolated TDD is required because this touches Quick Log, SQLite, query/cache, auth
  boundaries, and silent-loss behavior. The owner explicitly authorized separate RED, GREEN, and
  REFACTOR subagents on 2026-07-16; production code stays frozen until the isolated RED evidence is
  independently verified.
- No dependency, schema, migration, shared-engine extraction, third queue, or raw private-data
  logging. Existing `queue_item` schema and the raw-insert semantics of queued replay stay intact.
- Recovery may act on and expose only rows whose non-null `created_by` matches the active signed-in
  user. A previous account's retained rows must neither enter the current cache nor be sent.
- Keep the queue serial: at most one claimed item is sent at a time. Retryable failures use the
  documented 1 s / 2 s / 4 s / capped 10 s backoff (with bounded jitter where injected), never a
  zero-delay hot loop.

**Acceptance criteria:**

- **AC-P1-RECOVERY-1:** when the mutation port opens for a signed-in user, its non-terminal retained
  rows are replayed into the matching Timeline cache before a server refetch can make them vanish;
  `failed_retryable`/`failed_permanent` remain visibly failed and `pending_local` remains pending.
- **AC-P1-RECOVERY-2:** startup and every inactive/background → active transition run a serialized
  drain. A controlled active-app timer makes reconnect recover without a new network dependency;
  overlapping triggers share one in-flight drain rather than double-send.
- **AC-P1-RECOVERY-3:** a ready `pending_local`/`failed_retryable` item is claimed, inserted with its
  original id/actor/payload, replaced by the server row on success, removed from SQLite, and causes
  the affected Timeline/Diary queries to converge. Duplicate/idempotent success still produces one
  server row; a tombstoned queued replay is still not restored.
- **AC-P1-RECOVERY-4:** a retryable replay failure stays in SQLite and cache with a scrubbed category,
  increments retry count, and receives a non-null due time from the documented backoff. Permanent
  failure stays visible with Retry/Delete; unknown failure becomes permanent after the existing
  bounded attempt limit.
- **AC-P1-RECOVERY-5:** a stale `sending` row found after process restart is made recoverable and
  visible before drain; terminal `server_confirmed`/`deleted_before_sync` rows are not resurrected.
- **AC-P1-RECOVERY-6:** queue open/list/claim/replay failures are surfaced through the PII-scrubbing
  observability boundary and cannot clear the optimistic/cache row or masquerade as successful
  convergence.
- **AC-P1-RECOVERY-7:** retained-row hydration must not make a Timeline query look authoritatively
  fresh. On a cold launch, the first mounted day query still fetches durable server rows and merges
  retained local rows; a locally hydrated failure may never mask a newer confirmed server fact until
  an unrelated background/foreground transition.
- **AC-P1-RECOVERY-8:** when the same routine slot later becomes `done` from the converged model, its
  obsolete inline check-off failure is removed. The screen must never present `Done` and “Could not
  mark this routine” for the same slot at the same time.
- **AC-P1-RECOVERY-9:** a reminder-linked row whose retained `localSync` state is
  `failed_retryable`/`failed_permanent` is not presented as a successful green `Done` routine while
  its recovery controls disappear. It remains visibly failed and exposes the existing Retry/Delete
  actions; no new layout or copy is introduced.
- **AC-P1-RECOVERY-10:** unchecking a synced routine persists an actor-scoped
  `deleted_before_sync` tombstone intent, containing the already-cached full server row, before any
  network delete begins. The row is optimistically removed from the plan and the existing pending
  status remains visible while startup/foreground/timer recovery sends a tombstone request only
  (never an insert), serially and with the existing bounded backoff. A cold durable refetch cannot
  resurrect the row while the intent exists. Success removes the intent and converges the cache;
  retryable failure retains it without showing ordinary `Done`; a local persistence/open failure
  leaves the original `Done` row intact and exposes the existing delete-failed message and Retry.
  Undo before server deletion removes the local intent and restores the cached row without a network
  write; an in-flight race is serialized and rechecked. Recovery is active-actor-only, reports only
  scrubbed categories, and introduces no schema, dependency, operation discriminator, or shared
  outbox engine. If a remote tombstone may have succeeded but local finalization did not, the safe
  no-schema behavior is to retain the hidden intent and repeat the idempotent tombstone; offline Undo
  is not promised after that ambiguous post-write boundary.

**Design Fidelity Stage 0 lock for AC-P1-RECOVERY-10:** this is a state-correctness repair, not a
new composition. Pending delete reuses `TodayStatusCard state="pending-write"`; local acceptance
shows the routine as not logged; persistence/open failure preserves the prior Done card and uses
the existing `timeline.delete-failed` feedback plus existing Retry action. No new visible string,
surface, spacing, icon, or interaction anatomy is authorized. Structural render tests must prove
that a retained delete intent is never rendered as an ordinary Done fact/card.

**Named verification:** focused queue storage + mutation-port RED/GREEN/REFACTOR suites; full
`npm run check`; then repeat the exact offline check-off and offline un-check on the approved SE,
including relaunch persistence and a read-only server count before running the 20+ burst.

*Out of scope: the owner-device items (legacy Observation discard, physical-phone burst) stay with
the owner — mark them blocked-on-owner in the parity plan, do not attempt.*

## Phase 2 — Execute the locked owner decisions (2026-07-16/17)

**Decision 1 — explicit selected-timeline type opt-in is enforced.** The 2026-07-16 intent was
initially recorded as comment-only, but the 2026-07-17 privacy review proved that the contract and
schema accepted `selected_event_types = NULL` while the projection interpreted it as all current
and future types. On 2026-07-17 the owner selected option 1 and granted exact owner/CTO approval for
schema hardening: `selected_timeline_range` requires an explicit non-null, non-empty event-type
list. Prepare contract, migration, projection, and pgTAP changes; do not apply the migration.

### Phase 2 selected-timeline privacy hardening spec lock (2026-07-17)

**Acceptance criteria:**

- **AC-P2-SHARE-1:** typed selected-timeline request input requires a present, non-null, non-empty
  `selected_event_types` array of valid `event_type` values plus the existing ordered date range.
  The selected-timeline record contract rejects null/empty arrays; another share scope with its
  existing null value remains valid.
- **AC-P2-SHARE-2:** a new named, validated `public.share_scope` CHECK rejects null and empty event-
  type arrays only when `scope = 'selected_timeline_range'`, accepts a non-empty explicit list, and
  preserves the existing date-window constraint and null behavior for other scopes. The migration
  contains no data backfill, deletion, revocation, or inferred all-types selection.
- **AC-P2-SHARE-3:** the latest `current_share_selected_timeline()` projection has no NULL-as-all
  fallback and includes an event only through `event_log.event_type = ANY(selected_event_types)`.
  The existing same-puppy Observation fixture is absent unless `observation` is explicitly selected;
  explicit selection returns only the existing sanitized projection shape, never private payload or
  note fields.
- **AC-P2-SHARE-4:** ADR-0007 records the approved additive constraint/projection delta and ADR-0022
  records the resolved 2026-07-17 decision. The historical Observation migration receives a header-
  comment correction only; its executable body from the first `ALTER TYPE` through EOF retains SHA-
  256 `28816edf86bca859f4136699ac0401812aadce57005496103e74a790e9f1fc09`.
- **AC-P2-SHARE-5:** pgTAP plan/count and static no-Docker guardrails cover the named CHECK, null/
  empty rejection, valid/other-scope controls, strict latest projection, implicit Observation
  exclusion, and explicit Observation opt-in. Generated `database.types.ts` remains byte-identical:
  conditional CHECK constraints are not expressible by PostgREST typegen and the column remains
  nullable for non-selected scopes.

**Edge/error cases:** omitted field, explicit null, empty array, unknown enum member, reversed date
range, valid one-item array, and another scope's null value. A future apply must preflight aggregate
invalid-row counts and fail rather than delete, revoke, or backfill any scope if counts are non-zero.
The authorized read-only PuppyPlan Dev preflight on 2026-07-17 returned zero selected scopes, zero
NULL selections, and zero empty selections.

**Constraints:** heavy/full-isolated RED → GREEN → review → REFACTOR; historical migrations are not
rewritten except the already-authorized header comment; create the new migration with the pinned
Supabase CLI; no dependency, UI, RLS policy, token, raw private-data, production/Dev apply, schema
branch, deploy, or release action. Static SQL guardrails are evidence, not executed pgTAP; real
migration/pgTAP/typegen execution remains a separately authorized apply/runner gate.

- [x] Fix the header comment of
      `supabase/migrations/20260711180000_event_observation_payload_v2.sql` (comment-only edit,
      the SQL body must stay byte-identical): it must say observation is excluded from
      *aggregate* projections (`current_share_routine_summary`) while `selected_timeline_range`
      follows the owner's explicit type selection.
- [x] Record the rationale in ADR-0022 (or the nearest sharing/privacy doc `docs/INDEX.md` points
      to) as an owner decision resolved on 2026-07-17.

**Decision 2 — the delete button stays `destructive`.** No code change.

- [x] Record the decision in the uncheck plan's Decisions section so the audit item stops looking
      open.

## Phase 3 — Open the PR

Authorized by the owner on 2026-07-16: **opening** the PR only. Merging is not authorized; neither
is applying migrations or any release action.

### Phase 3 pre-PR review repair spec lock (2026-07-17)

The independent pre-commit review found that production recovery lists actorless legacy queue
rows but filters them out before actor-scoped hydration, then always claims with the active
`createdBy`. The storage quarantine branch is therefore reachable only through an unscoped call
that production never makes, leaving `created_by IS NULL` rows pending forever despite
`docs/architecture/10-quick-log-queue.md` requiring `failed_permanent/missing_context`.

**Acceptance criteria:**

- **AC-P3-LEGACY-1:** signed-in startup locally quarantines every non-terminal legacy Quick Log row
  whose `created_by` is null as `failed_permanent/missing_context` before actor-scoped hydration or
  drain. Such a row is never cached as the active actor and never sent to Supabase.
- **AC-P3-LEGACY-2:** quarantine is atomic/idempotent, preserves event identity and payload, clears
  retry scheduling, increments retry count only on the state-changing quarantine, and leaves
  already-terminal or actor-owned rows unchanged.
- **AC-P3-LEGACY-3:** storage/list/quarantine failures stay inside the existing PII-scrubbing
  recovery boundary; no payload/private text is logged and valid active-actor recovery still runs
  only when its required local reads succeed.
- **AC-P3-LEGACY-4:** real storage initialization does not stale-recover an actorless `sending` row
  before signed-in quarantine. Across the complete initialize → startup-recovery composition, that
  row reaches `failed_permanent/missing_context` with exactly one retry-count increment.

**Constraints:** heavy/full-isolated RED → GREEN → REFACTOR; no schema, migration, dependency,
network call, actor adoption, cache exposure, or new user-facing UI/copy. Tests must cover the real
production startup path, not only an unscoped storage call.

### Phase 3 final-review actor/history repair spec lock (2026-07-17)

Final full-diff and security/privacy reviews found two additional AC10 gaps that do not require the
blocked share-scope decision.

- **AC-P3-ACTOR-1:** a synced-delete mutation port carries its expected signed-in actor plus a live
  actor getter into Delete, Retry, and Undo/restore. A callback retained across an auth switch must
  reject before reading/writing SQLite, cache, or Supabase; awaited/serialized boundaries recheck
  actor identity before cache effects. The real SQLite local Undo removal is atomic on client id,
  `deleted_before_sync` state, and expected `created_by`.
- **AC-P3-ACTOR-2:** Snackbar Undo/Retry actions owned by the old mutation port are dismissed when
  the mutation/auth identity changes, while a same-actor rerender retains the five-second action.
  Failure remains generic and PII-scrubbed; no new copy or surface is introduced.
- **AC-P3-ACTOR-3:** local Quick Log `deleteLocal` and optimistic `undo` carry the expected actor and
  live actor getter from the mutation port. A callback retained across an auth switch rejects before
  SQLite/cache/network access; every awaited read/transition/removal boundary rechecks actor identity
  before the next effect. The real SQLite mutation is atomic on client id, expected actor, and the
  source state (`sending` transition or pending/failed removal). Stable-session access to another
  actor's row is also a no-op with generic scrubbed reporting and byte-identical retained data.
- **AC-P3-ACTOR-4:** ordinary manual Retry atomically requires the retained queue row's `created_by`
  to equal the mutation port's expected actor before changing state. A foreign-actor or superseded
  Retry leaves SQLite byte-identical and causes zero cache replay, Supabase, analytics, or invalidation
  effects; only a generic PII-scrubbed mismatch report is allowed. Real storage proves the atomic
  owner check; compatibility adapters must fail closed rather than adopt a row.
- **AC-P3-ACTOR-5:** actor-local cached rows (`localSync` present), including retained delete
  sentinels with private v2 title/note content, are synchronously filtered by the active care
  context's `userId` before any Timeline/Diary/history render or query merge. An A→B switch on the
  same household/puppy root may reuse durable household rows, but B never receives or renders A's
  pending/failed/delete local row even for the render before passive cache scrub runs.
- **AC-P3-ACTOR-6:** unmounting a Quick Log mutation port invalidates its live actor and queue
  handles, so root/global Snackbar callbacks retained after route teardown reject before SQLite,
  cache, or network access. Synced Delete/Undo dismisses every Snackbar action owned by the unmounted
  hook. Same-actor rerenders remain valid; unmount→auth switch→stale Retry/Delete/Undo is a scrubbed
  no-op with byte-identical retained data.
- **AC-P3-ERROR-1:** every production fire-and-forget Retry owns a rejection handler, and every
  queue-read/finalization/cleanup failure in the touched create/manual-Retry paths is reported through
  generic PII-scrubbing observability instead of becoming unhandled or being converted to `null`.
  A storage read failure stops without adopting/mutating a retained row; real DB errors remain errors.
- **AC-P3-DATE-1:** local Delete and ordinary manual Retry derive Timeline replay/invalidation dates
  with `formatLocalCalendarDate`, never UTC string slicing. Offset/midnight coverage proves the local
  day is used while queue/network semantics remain unchanged.
- **AC-P3-HISTORY-1:** expanded Diary history merges retained `deleted_before_sync` rows that match
  its active event-type filter before durable rows. A retryable/permanent failed delete sentinel for
  an older day remains visible with Retry-only actions after refetch/relaunch and suppresses the
  ordinary durable fact; a pending or locally accepted delete remains hidden from ordinary history.
- **AC-P3-HISTORY-2:** history sentinel merging is scoped to the active household/puppy Timeline
  root and filter, deterministic by client id, and cannot affect selected-day plan derivation,
  recent-event/duplicate/sleep inputs, or another account's cache.

**Constraints:** separate heavy/full-isolated RED → GREEN → review → REFACTOR for synced actor
callbacks, local actor callbacks, ordinary Retry ownership, and history visibility; no
schema/dependency/new UI/copy. Existing AC10 global-tail, composite identity, Undo, failure, cache,
and active-actor invariants remain frozen.

### Phase 3 post-repair final-review spec lock (2026-07-17)

The fresh post-repair full-diff and security/privacy reviews reopened three compositional gaps. The
green full gate remains evidence for the reviewed snapshot, but it is no longer PR-readiness
evidence until each gap completes its own heavy isolated chain and the full gate/reviews repeat.

- **AC-P3-ACTOR-7:** local intent ownership is explicit and is not inferred from the durable display
  creator. A synced-delete sentinel preserves the original caregiver in `created_by` for Diary
  attribution while its separate local intent actor controls synchronous actor visibility. For a
  cross-caregiver durable row deleted offline by actor A, A keeps seeing the correct local delete
  state, actor B never renders A's local state or private v2 title/note during an A→B transition,
  and a durable refetch cannot resurrect the ordinary Done row. Composition tests must cover cache
  and Timeline hooks with real sentinel shapes, both actors, every delete-localSync state, and
  byte-identical durable display attribution. Intent ownership remains attached until the cached
  sentinel is removed, including an A→B switch during automatic tombstone/finalization; superseded
  cleanup must not clear the owner before actor-switch scrub. Sidecars are isolated per QueryClient.
  A true cold hydration into a fresh QueryClient restores both intent actor A and authoritative
  durable display creator B for accepted, retryable, and permanent delete states rather than
  synthesizing A as the creator. The authoritative composition is reconciled across every matching
  Timeline cache copy, including the canonical unfiltered/day siblings; a newer queue transition
  timestamp must not let a synthetic A-display row win Diary cached-row aggregation.
- **AC-P3-ACTOR-8:** every mutation-port write method, including create, durable create, mutate, and
  `updateDetails`, is bound to the port's captured actor and a live actor getter. A retained actor-A
  port used after A→B, or a switch during any awaited local read/write boundary, rejects before the
  next SQLite/cache/network/analytics/invalidation effect. Detail updates atomically require the
  expected local owner rather than trusting only state; stale or foreign access leaves private v2
  payload/note and all observable state byte-identical with only generic scrubbed reporting. Each
  create/mutate invocation owns a unique immutable request token/variables clone; concurrent reuse of
  the same caller object cannot overwrite another call's actor/context binding, and one completion
  cannot delete another call's guard. Actor supersession after `markSending`, server insert, success
  resolution, or terminal removal must not strand unrecoverable `sending`/`server_confirmed` private
  rows: before confirmed insert the actor-owned row returns to a recoverable state; after confirmed
  insert it remains terminal/recoverable and later actor-scoped cleanup never re-inserts the event.
  No cache/network effects run for the superseding actor. Actor equality alone is insufficient: a
  monotonically changing port/session epoch is captured per invocation and invalidated on every
  actor transition or unmount, so an old port or paused call cannot revive after A→B→A. Owner-bound
  production writes/removals require their atomic storage capabilities; if an adapter lacks one it
  fails closed without a read-then-unrestricted-write/remove fallback. Adversarial replacement of the
  same client id between awaits cannot transition or delete the newer row. Epoch activation and
  invalidation are commit-safe and synchronous with committed actor transitions/unmount (layout
  lifecycle or equivalent): render does not mutate shared liveness refs, so an abandoned/speculative
  B render cannot invalidate the still-committed A port. Every owner-bound retry/remove helper and
  call site fails closed before even reading the row when its atomic capability is absent; only a
  truly actorless legacy call may use a read-then-unrestricted fallback.
- **AC-P3-ERROR-2:** normal create success owns failures in its `server_confirmed` finalizer and
  create `onError` queue read. A finalizer rejection never triggers an invalid terminal-state
  transition or an unhandled rejection; it is scrubbed-reported and leaves a recoverable cleanup /
  convergence path without duplicating the successful server insert. A queue-read rejection is
  scrubbed-reported and stops classification without swallowing the DB error into a false row state.
  Tests must lock terminal-row preservation, zero duplicate network/analytics effects, optimistic
  cache convergence/cleanup, and rejection ownership. Production sheet and durable-create adapters
  must not repeat an unguarded queue read after the core error path: normal `.mutate` skips request-
  event follow-up when safe classification/read failed, and durable acceptance contains/reports its
  secondary read while preserving the original insert rejection. Neither adapter may replace the
  primary error or create an unhandled rejection.

**Constraints:** execute AC-P3-ACTOR-7, AC-P3-ACTOR-8, and AC-P3-ERROR-2 as separate
heavy/full-isolated RED → GREEN → review → REFACTOR chains. No schema, dependency, new UI/copy, or
privacy-decision implementation. Do not weaken the preserved display-creator contract or turn a
real storage failure into `null`/success.

- [x] Confirm Phases 1–2 landed and the full gate passes (`GATE_EXIT=0`).
- [x] Push any new commits to the existing branch
      (`dimaselenya/pup-33-diary-telegram-parity-trusted-writes-readable-notes-chat`).
- [x] `gh pr create` → base `main`. Title references PUP-33. Body: what the branch does (diary
      parity, uncheck/restore, offline durability fix), the evidence from Phase 1, the two locked
      decisions, and the explicit note that the owner-device checklist remains open. No raw
      private data. End the body with the standard generation footer.
- [x] Link the PR in Linear PUP-33 (attachment or comment via the Linear MCP).

### Phase 3 PR CI portability follow-up (2026-07-18)

GitHub's Ubuntu runner exposed a portability defect in the AC-P3-DATE-1 test seam: mutating
`process.env.TZ` inside Jest's sandbox does not update Node's native local-time getters. The product
already derives Delete and ordinary Retry dates through `formatLocalCalendarDate`; this follow-up
must keep that real formatter and both cache/invalidation paths under test without changing CI/test
configuration, production code, dependencies, or the acceptance assertions.

- [x] Reproduce the PR #32 Local Gate failure under process-startup `TZ=UTC`: exactly the two
      AC-P3-DATE-1 cases fail at the non-portable timezone activation assertion.
- [x] Replace the runtime `process.env.TZ` mutation with an exact-timestamp Date-getter seam whose
      Europe/Warsaw calendar parts come from `Intl.DateTimeFormat`, delegates all unrelated dates,
      and restores every spy in `finally`.
- [x] Prove GREEN independently under `TZ=UTC`: focused AC-P3-DATE-1 is 2/2 and the complete
      `quick-log-mutation-port.test.tsx` suite is 123/123; isolated REFACTOR is a deliberate no-op.
- [x] Run the fresh full local gate on the final diff: `npm run check` exits 0 with 104/104 Jest
      suites and 1207/1207 tests, Node 121/121, and every scaffold/i18n/privacy/token/text gate green
      (lint: 0 errors / 21 existing warnings).
- [x] Complete final code/privacy/security diff review: independent verdict `Ready`, with no
      Critical, High, or Medium findings and no privacy/security or release-guardrail issue.
- [x] Create the owner-authorized local commit. Push, merge, migration apply, release, and production
      actions remain unauthorized.

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

1. [x] Create Linear issue PUP-34 in the PuppyPlan team for this feature (authorized by the owner
       via this plan), referencing brief §6.4/§5.1; branch from the unmerged PR branch with Linear's
       `dimaselenya/pup-34-routine-lifecycle-menu-edit-pauseresume-delete` branch name.
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
- 2026-07-16 — Phase 1 live SE run found a blocking queue-recovery defect before any checklist
  item was closed. A fresh embedded Release bundle (`9187d7b`) was installed on the approved SE.
  With Wi-Fi off, tapping the synthetic Feeding routine produced an optimistic mark plus the
  visible `Sync in progress` state; SQLite retained one `feeding / failed_retryable` row with a
  structured reminder link. After Wi-Fi returned the screen briefly showed Done alongside
  `Could not mark this routine`, but the read-only Supabase aggregate showed no recent row; after
  an allowed relaunch nudge the mark reverted to Not logged while the SQLite row remained.
  Root cause evidence: `claimNextReadyToSend` has no production caller (storage tests only), and
  timeline startup does not hydrate retained SQLite rows, despite `10-quick-log-queue.md`
  requiring reconnect/app-foreground retry. Evidence:
  `output/ux-audit/pup33-closure/phase1-{baseline,offline-checkoff,online-checkoff,after-relaunch}.png`.
  Offline un-check and burst remain intentionally unrun until this P0 loss-of-visible-state path
  is repaired. Spec-driven TDD halt: Quick Log/query-cache work requires heavy isolated TDD; the
  current session needs explicit owner approval either to use subagents for RED/GREEN/REFACTOR or
  to proceed lightweight with reduced assurance.
- 2026-07-16 — locked the defect-repair contract as AC-P1-RECOVERY-1..6 after reading the Quick Log
  architecture, ADR-0021, queue storage/state machine, mutation port, timeline merge, and the Health
  processor reference. Scope is the missing accepted recovery behavior only: active-actor cache
  hydration, stale-send recovery, serialized startup/foreground/controlled-loop drain, documented
  backoff, and visible scrubbed failures. No dependency/schema/shared-engine work is authorized.
- 2026-07-16 — owner explicitly authorized subagents. TDD mode is heavy/full-isolated: a fresh RED
  agent may change tests only, a fresh GREEN agent may change production only against the frozen
  RED suite, and a fresh REFACTOR agent may make behavior-preserving cleanup only after GREEN. The
  coordinating agent independently verifies every handoff.
- 2026-07-16 — Phase 1 recovery RED complete and independently reproduced. Frozen tests in
  `quick-log-mutation-port.test.tsx` and `quick-log-queue-storage.test.ts` cover AC-P1-RECOVERY-1..6,
  including active-actor hydration/claim, startup + foreground + active timer serialization,
  reconnect-equivalent timer recovery, raw tombstone replay, persisted backoff/failure visibility,
  stale-send restart recovery, and scrubbed reporting for open/list/claim/replay errors. Focused
  Jest: 10 expected behavioral failures, 26 pre-existing passes, exit 1; `npm run typecheck`: pass.
  No production/config/schema/dependency files changed in RED; test files are now frozen for GREEN.
- 2026-07-16 — first isolated GREEN reached 36/36 focused tests, 65/65 adjacent Quick Log tests,
  exact RED hashes, typecheck, and diff-check, but independent task review returned `Needs fixes`.
  Critical: actor-effect-local drain state permits overlapping old/new-account sends, and cleanup
  removes only startup-hydrated rows so post-readiness optimistic rows can leak into a shared cache
  key after account switch. Important: zero/negative server retry delays stay immediately claimable
  (hot-loop risk), while hydration cancellation and unexpected drain rejections can escape the
  observability boundary. GREEN is not accepted; a second fresh RED context is locking these four
  regressions before any fix. No Phase 1 acceptance checkbox is closed.
- 2026-07-16 — supplemental isolated RED independently reproduced the review findings with frozen
  production hashes and green typecheck: 36 existing focused tests pass and 5 new cases fail.
  Evidence is exact: three prior-actor local copies remain across shared Timeline keys, actor B
  begins a second insert while actor A is held in flight, rate-limit delays persist as 0/−250 ms
  instead of the 2 s computed backoff, and hydration cancellation both escapes as an unhandled
  rejection and produces no observability report. The 41-case focused suite is frozen for a new
  GREEN context; the first GREEN agent is not reused.
- 2026-07-16 — supplemental GREEN made all 41 focused and 65 adjacent tests pass and fixed the prior
  review's retry-delay, hydration-boundary, same-instance actor cleanup, and same-instance drain
  findings. Re-review still returned `Needs fixes` for multi-instance lifecycle: Diary and a
  sheet/modal can mount independent mutation ports, so hook-local tails can send two claimed rows
  concurrently; ordinary sheet unmount clears actor-local rows still needed by the live Diary port;
  and an account change while SQLite claim awaits is not rechecked after claim, so the superseded
  actor can still begin network replay. A third fresh RED context is locking these three cases before
  any production fix; Phase 1 remains open.
- 2026-07-16 — third isolated RED complete and independently reproduced with exact frozen production
  hashes and green typecheck. The 44-case focused suite has 41 existing passes plus exactly 3 new
  behavioral failures: two simultaneous mutation-port instances start two inserts instead of one,
  unmounting an ordinary same-actor sheet removes the shared Diary `localSync` failure evidence, and
  a superseded actor sends after an awaited SQLite claim instead of returning the claimed row to a
  visible retryable state. No import/setup/timer/`act` diagnostics were emitted. The tests are frozen
  at `42c750a003f98969e08a3a4b852aac916e72a99d631472b0ba65e550042071e0` and
  `0aa85d18af6502b65fbf34fe7302294241bfc91808159f9ac4c40507d93ab5a4` for a fresh GREEN context;
  Phase 1 remains open.
- 2026-07-16 — third isolated GREEN accepted after independent coordinator verification. A
  module-lifetime recovery tail now serializes complete claim/send/local-finalization work across
  simultaneous mutation-port instances; actor setup scrubs only other actors' local rows, while an
  ordinary same-actor unmount retains shared Diary evidence; and a post-claim actor recheck returns a
  superseded `sending` row to `failed_retryable/auth_refresh_in_progress` with positive existing
  backoff before any network insert. Frozen test hashes stayed exact. Focused Jest: 44/44; adjacent
  Quick Log/query-cache Jest: 65/65; typecheck and diff-check: pass. Independent production review
  and the isolated REFACTOR context are next; full gate and live SE acceptance remain outstanding.
- 2026-07-16 — independent GREEN3 production re-review returned `Approved` with no Critical,
  Important, or Minor findings. It verified module-scoped serialization through SQLite removal,
  same-actor evidence retention plus other-actor setup scrubbing, and the post-claim actor recheck
  before insert; the broader actor-scoped/raw/tombstone/backoff/trigger/observability contract also
  remained intact. No residual focused-test gap blocks REFACTOR. Full gate and live approved-SE
  verification are still required before any Phase 1 acceptance checkbox closes.
- 2026-07-16 — fresh isolated REFACTOR completed as a deliberate no-op: direct inspection found no
  narrow cleanup that improved clarity or safety without risking the locked queue timing, cache,
  actor-isolation, or durable transition semantics. The coordinator independently confirmed the
  accepted GREEN3 production and frozen test hashes byte-for-byte. Focused Jest remained 44/44,
  adjacent Jest 65/65, and typecheck/diff-check passed. Heavy RED/GREEN/REFACTOR is complete; Phase 1
  now advances to the full gate and live approved-SE acceptance, with all checkboxes still open.
- 2026-07-16 — full local gate passed with `GATE_EXIT=0`: lint completed with warnings only,
  TypeScript passed, Jest passed 104/104 suites and 1040/1040 tests, Node checks passed 119/119, and
  navigation/i18n/scaffold/token/privacy/text-hygiene gates all passed. XcodeBuildMCP session defaults
  were explicitly verified before simulator work: Release `PuppyPlan`, bundle id
  `com.dmitry-selenya.puppyplan-app`, and the approved `Grith iPhone SE 3 iOS 26.3` simulator
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`). Embedded bundle rebuild is next.
- 2026-07-16 — live SE retry found a second acceptance blocker after the rebuilt embedded bundle was
  installed. Offline check-off correctly showed `Sync in progress`; reconnect created exactly one
  active server Feeding row at 16:49 UTC with a complete reminder link, and the in-session row became
  `Done 6:49 PM`. However, the same screen simultaneously retained “Could not mark this routine”,
  then a cold relaunch showed that slot as `Not logged` for more than 20 seconds. SQLite contained no
  new row (the replay had succeeded), Supabase API evidence showed POST 201 and day GET 200, and a true
  background → foreground immediately restored `Done 6:49 PM`. Root cause: startup hydration calls
  `setQueryData` for older retained failures, making the 30-second Timeline cache fresh before the day
  hook mounts; cold start therefore suppresses the durable fetch and local-only rows shadow server
  truth until an AppState invalidation. AC-P1-RECOVERY-7 locks cold-start invalidation/merge, while
  AC-P1-RECOVERY-8 locks the non-contradictory failed → done UI state under the design-fidelity Stage 0
  pipeline. The same frame also exposed an older SQLite `failed_permanent` Feeding as green
  `Done 4:55 PM`, with the linked fact's Retry/Delete controls folded away; AC-P1-RECOVERY-9 locks the
  existing failure surface instead of adding a new design. Evidence:
  `output/ux-audit/pup33-closure/phase1-recovery-{offline-checkoff,online-checkoff,
  after-relaunch-scrolled,after-foreground-scrolled}.png`. All Phase 1 checkboxes remain open; fresh
  isolated RED4/GREEN4/REFACTOR is required before repeating the live window.
- 2026-07-16 — isolated RED4 complete and independently reproduced with production frozen. The
  82-case focused suite has 79 prior passes plus exactly three new behavioral failures: retained-row
  hydration suppresses the first durable Timeline fetch at the production 30-second stale window;
  a converged `Done` routine retains its obsolete check-off error; and a reminder-linked
  `failed_permanent` row renders as successful `Done` instead of exposing the existing Failed,
  Retry, and Delete surface. The focused run emitted no import/setup/timer/`act` diagnostics;
  typecheck and diff-check pass. Frozen GREEN4 test hashes are
  `d4ec8a34eb8d5d83465e428c6950958ed06c48034dc0d97af50ad3bbd08f73d3` and
  `e69e3a97021ac8c459073ea1b171f4d948d745e53c345e01195e7b2954090969` for the mutation-port and
  Today render suites respectively; the unchanged storage/timeline suites retain their prior
  hashes. A fresh production-only GREEN4 context is next; no Phase 1 checkbox closes on RED.
- 2026-07-16 — the first GREEN4 attempt correctly made AC7 and AC8 green (81/82 total) but stopped
  rather than coding around a frozen-test synchronization defect in AC9. The test waited for a
  `diary-planned-done` wrapper that already existed before `setQueryData`, so it read the old
  RoutineCard before React Query delivered the failed row. All GREEN4 production hunks were
  reverted byte-for-byte to the frozen baseline. A fresh tests-only RED4b replaced that no-op wait
  with the visible persistent-failure signal, retained every acceptance assertion, and the
  coordinator independently reproduced exactly three behavioral failures / 79 passes: AC7 has no
  durable fetch, AC8 retains the obsolete error, and AC9 now observes the failed row before proving
  that successful Done is still visible. Typecheck/diff-check pass with no `act` diagnostics. The
  corrected frozen Today test hash is
  `eb7cc45a56908973241373753e34bfd7e4ca6d36080fce73b944d6560f843755`; a new production-only
  GREEN context is required.
- 2026-07-16 — GREEN4b passed the corrected suite: focused 82/82, adjacent Quick Log/query 65/65,
  adjacent Today/Diary render 69/69, typecheck and diff-check pass, with all frozen test hashes
  exact. Project graph was refreshed and treated as advisory. Independent production review still
  returned `Needs fixes` with two Important gaps, so GREEN4b is not yet accepted: AC8 clears stale
  state only in a post-commit effect and can therefore commit one contradictory Done+error frame;
  AC7's current test mounts after hydration with different client IDs and does not lock an observer
  mounting during hydration or durable-wins merge for the same `client_event_id`. Review confirmed
  AC9 Retry/Delete wiring and found no new privacy, i18n, design, or architecture violation. A fresh
  tests-only review RED must capture every AC8 commit and add the AC7 gated same-client race before
  the minimal render guard is implemented; full gate/live verification remain pending.
- 2026-07-16 — review RED5 independently verified both findings with production frozen. The new
  gated AC7 test mounts Timeline while hydration is held, uses one shared `client_event_id`, observes
  two durable fetches, and passes with exactly one final server row and no `localSync`; the reviewed
  invalidation/merge implementation therefore satisfies that race. The augmented AC8 Profiler test
  captures committed frames without timers: `{actual:true,failure:true}` followed by
  `{actual:true,failure:false}`. Focused result is exactly one behavioral failure / 82 passes / 83
  total; typecheck and diff-check pass with no `act` diagnostics and exact frozen production hashes.
  A fresh GREEN may change only TodayScreen render truthfulness so the stale error is suppressed in
  the same commit while the effect still cleans stored state.
- 2026-07-16 — GREEN5 added only the exact-slot render guard in TodayScreen while retaining the
  cleanup effect. Focused recovery/Today is 83/83; adjacent Today/Diary is 102/102; typecheck and
  diff-check pass with all frozen Quick Log/storage/test hashes exact. Independent re-review is
  `Ready` with no findings and independently reran 53/53 targeted tests: AC7's blocked-hydration
  same-client durable-wins path is locked, AC8 exposes no contradictory committed frame including
  late rejection, and AC9 Retry/Delete wiring remains intact. The accepted production hashes are
  `2e8f2acc111141f3842b0508086d0e4eccc2eab0583c00196bace7895bd2042f` for Quick Log and
  `3c49b0e6832480d047858add1cfeda607454bae1385cb90f1733c9dd2edf24cd` for TodayScreen. Fresh isolated
  REFACTOR is next; Phase 1 still requires the full gate and rebuilt live SE acceptance.
- 2026-07-16 — fresh REFACTOR5 completed as a deliberate no-op after reading the complete accepted
  recovery/cache/UI paths. No extraction or condensation was safer than the intentional
  cancel→hydrate→invalidate order, actor race guards, exact-slot render suppression plus cleanup
  effect, and shared failed Fact surface. Production/test hashes stayed byte-identical. Focused
  remained 83/83, adjacent Quick Log/query 65/65, Today/Diary 102/102, with typecheck/diff-check
  passing. Heavy RED/GREEN/review/REFACTOR repair is complete; the full local gate and a freshly
  rebuilt approved-SE acceptance run are next, with all Phase 1 checkboxes still open.
- 2026-07-16 — post-repair full `npm run check` passed with exit 0. Expo lint reported warnings only
  (existing unused catch bindings/import/style warnings), TypeScript passed, the complete Jest suite
  passed, Node checks passed 119/119, and navigation/i18n/scaffold/token/privacy/text-hygiene gates
  all passed. Existing reduced-motion `act` console warnings remain visible in unrelated render
  suites but are not failures and were not weakened or suppressed. A new embedded Release bundle
  must now be installed before repeating approved-SE offline acceptance; no Phase 1 checkbox closes
  on local gates alone.
- 2026-07-16 — the rebuilt final embedded bundle passed the live offline check-off acceptance on the
  approved SE. Offline the Feeding slot visibly showed `Sync in progress`; after reconnect it
  converged to `Done 6:49 PM`, survived a cold terminate/relaunch without an AppState nudge, and a
  read-only server aggregate proved one active row with one distinct client event. The first three
  Phase 1 checklist items are therefore closed. Evidence:
  `output/ux-audit/pup33-closure/phase1-final-{offline-checkoff,online-checkoff,
  after-checkoff-relaunch}.png`.
- 2026-07-16 — the same calibrated checkbox exposed a blocking offline-uncheck defect. With Wi-Fi
  off, a synced Done mark stayed ordinary green Done; reconnect did not apply a delete, while the
  identical online tap immediately removed it. Root cause: the synced-delete hook calls the
  Supabase select+tombstone helper before any durable local write, catches the rejection into a
  transient snackbar, and the insert-only queue has no delete recovery caller. Existing
  `deleted_before_sync` rows already retain the exact actor/id/payload for the cleanup pass promised
  by `03-client-data-layer.md` and `10-quick-log-queue.md`; AC-P1-RECOVERY-10 locks that no-schema
  repair plus cold suppression and offline Undo. Design Fidelity Stage 0 is reuse-only: existing
  pending/delete-failed/Retry surfaces, no new copy or layout. Evidence:
  `output/ux-audit/pup33-closure/phase1-final-{offline-uncheck,online-uncheck}.png`.
- 2026-07-16 — AC-P1-RECOVERY-10 isolated RED is frozen after one independent review correction.
  The first draft reproduced 13 behavioral failures / 92 passes but review rejected it because it
  did not make the five-second local Undo window reachable, did not prove delete Retry was
  tombstone-only, and left due-time/hot-loop behavior under-specified. The corrected five-file suite
  now has 14 expected behavioral failures / 94 passes / 108 total with no import, type, timer, or
  `act` defect; typecheck and diff-check pass. It locks durable full-row delete intent before network,
  a 5 s due/Undo grace, actor-scoped serialized tombstone-only recovery, bounded retry/finalize
  backoff, cold suppression, local Undo plus claim-boundary serialization, Retry-only failed UI,
  and the reachable queue-unavailable behavior. Frozen test hashes are `7cd80096…` (storage),
  `cab791c9…` (mutation port), `d3f76716…` (timeline), `f9196251…` (route), and `0c6a3d02…`
  (Today). Production hashes remain `2e8f2acc…` (Quick Log), `cae97d26…` (storage), `3c49b0e6…`
  (Today), `bbf9fa4a…` (delete/Undo hook), `e8859e73…` (Timeline hook), and `99a055d7…`
  (cached rows). A fresh production-only GREEN context is next.
- 2026-07-16 — the first AC10 GREEN correctly halted on a RED contract defect and reverted every
  production hunk to the exact frozen hashes. The test required a durable five-second
  `retry_after_at` while requiring the atomic enqueue call to receive only `{ now }`; its harness
  hard-coded `retry_after_at: null`, and the only second-step method would increment `retry_count`
  against the expected zero. A fresh tests-only correction changed only storage/mutation-port tests:
  `enqueueDeletedBeforeSync` now accepts `{ now, retryAfterAt }`, the harness persists that value,
  the port proves `retryAfterAt - now = 5000 ms`, and storage proves both default-null and exact
  atomic deadline persistence. Coordinator reproduction is again 14 expected behavioral failures /
  94 passes / 108 total with typecheck/diff-check green. Corrected hashes are `01bd39ee…` (storage)
  and `54c4377e…` (mutation port); the other three frozen test hashes and every production hash are
  unchanged. A new production-only GREEN2 context is active; test-adapter branches are forbidden.
- 2026-07-16 — GREEN2 reached 108/108 frozen focused tests and 425/425 adjacent tests with
  typecheck/diff-check green, but independent production review returned `Needs fixes`; GREEN2 is
  not accepted. Critical: `INSERT OR IGNORE` accepts a pre-existing non-delete queue state, and a
  synced row created by another caregiver writes that creator as delete-intent owner, so active-actor
  recovery skips it. Important: the real Diary day-model path loses failed-intent Retry; root
  sentinels affect unrelated calendar dates and Quick Log recent/duplicate/sleep derivation; manual
  delete Retry omits dependent-query invalidation and can reject unobserved; the Snackbar's second
  persistence Retry silently catches failure. Positive review evidence confirms real atomic SQLite
  deadline persistence, global-tail serialization, due/backoff, tombstone-only automatic recovery,
  safe post-write ambiguity handling, and no schema/dependency/PII/design violation. A fresh
  tests-only review RED is locking every finding before a new production context changes code.
- 2026-07-16 — the GREEN2 review RED is frozen and independently reproduced with every production
  hash unchanged. Typecheck and diff-check pass; the five-suite focused run has exactly 12 expected
  behavioral failures / 101 passes / 113 total. The RED locks atomic conversion of all five
  pre-existing queue states into a non-insertable delete intent, active-actor ownership of another
  caregiver's cached row, complete dependent-query invalidation, contained and scrubbed secondary
  retention failure, real unmarked-day Retry-only presentation, selected-local-date isolation,
  exclusion from recent/duplicate/open-sleep derivation, and a visible/reportable second Snackbar
  Retry failure. Frozen test hashes are `70853549…` (storage), `1b3fe117…` (mutation port),
  `9d1eb5b4…` (Today core), `590dc37c…` (Today route), and `ea0cf8a0…` (recent events). A fresh
  production-only GREEN3 context may change production files only; no Phase 1 checkbox closes on
  RED evidence.
- 2026-07-16 — GREEN3 made the frozen review suite green (113/113), passed 426/426 adjacent tests,
  typecheck, diff-check, and lint, but independent production review returned `Needs fixes`; GREEN3
  is not accepted. Critical: an older insert/replay finalizer can unconditionally remove a newer
  `deleted_before_sync` intent created in its `server_confirmed` window, recreating the silent
  uncheck revert. Important: a second same-actor port can scrub a cross-caregiver display sentinel;
  manual delete Retry lacks the post-tail actor recheck and read-failure containment, conflates
  post-remove invalidation failure with a retained tombstone failure, and successful persistence
  Retry dismisses the error without restoring the reachable five-second Undo Snackbar. The five
  frozen GREEN3 production hashes are recorded in the preceding verification evidence; a fresh
  tests-only review RED must lock these concurrency, actor-switch, failure-boundary, and Undo-success
  cases before any further production edit. Rejected production hashes are `a50eea1e…` (storage),
  `277515b2…` (Quick Log), `1f4c4e14…` (Today), `aaeeaf60…` (Quick Log shell), and `74cd9452…`
  (delete/Undo hook). Phase 1 remains open.
- 2026-07-16 — the GREEN3 review RED is frozen and independently reproduced with production hashes
  unchanged. Typecheck and diff-check pass; the three-suite focused run has exactly nine expected
  behavioral failures / 88 passes / 97 total and no import, timer, or `act` diagnostics. Two gated
  tests prove that both the ordinary mutation finalizer and automatic replay finalizer can erase a
  newer delete intent; two prove cross-caregiver evidence loss when a second same-actor port cannot
  open or list the queue; the remaining tests lock the post-tail actor recheck, contained initial and
  post-tail SQLite reads, the post-remove invalidation boundary, and successful persistence Retry
  restoring the normal five-second Undo Snackbar. Frozen test hashes are `163dc218…` (mutation),
  `4e778f4f…` (mutation port), and `b0e1d77f…` (Today route). A fresh production-only GREEN4 context
  is required; Phase 1 remains open.
- 2026-07-16 — GREEN4 made the frozen review RED green (97/97), the combined focused set green
  (121/121), and 453/453 broad Quick Log/Diary tests green with typecheck/diff-check/lint passing.
  Independent review found no remaining Critical issue and accepted real SQLite atomic finalization,
  both guarded finalizers, manual Retry actor/read/invalidation boundaries, and Retry-to-Undo wiring,
  but returned `Needs fixes` for one Important successful-multi-port gap: a second same-actor port's
  hydration upserts the actor-owned durable delete row over the original cross-caregiver display
  sentinel, so local Undo can briefly leave a normal cached row attributed to the deleting actor.
  A fresh tests-only RED must lock successful second-port hydration, row cloning, and Undo before the
  cache merge is corrected. The non-atomic compatibility fallback without `removeIfState` is recorded
  as non-production-reachable Minor hardening; the sole real SQLite adapter always supplies the atomic
  method. GREEN4 is not accepted and Phase 1 remains open.
- 2026-07-16 — the successful-second-port RED3 is frozen and independently reproduced with all
  GREEN4 production hashes unchanged. The three-suite run has exactly one expected behavioral
  failure / 97 passes / 98 total; focused mutation-port has one failure / 41 passes / 42 total,
  with typecheck and diff-check passing and no setup/timer/`act` diagnostics. Before hydration the
  cloned cross-caregiver sentinel and active-actor ownership remain correct; successful hydration
  then replaces the original creator, server id/version, and update timestamp with queue-synthesized
  values, and local zero-network Undo preserves those wrong display fields. The frozen mutation-port
  test hash is `172da3b7…`. A fresh production-only GREEN5 must preserve an existing same-id delete
  display row while updating its sync state; Phase 1 remains open.
- 2026-07-16 — GREEN5 preserved the existing delete display row and passed RED3 98/98, the combined
  focused set 173/173, and 436/436 broad relevant tests with typecheck/diff-check/lint green, but
  independent review returned `Needs fixes`. Critical: both SQLite replacement and the in-memory
  intent-owner map still collapse server identity to bare `client_event_id`; a collision in another
  household can destroy its queue row or keep another account's local cache row visible. The server
  contract is scoped by `(household_id, client_event_id)`, and destructive conversion must also
  reject mismatched puppy/type/version/occurrence routing rather than overwrite it. Review also found
  nondeterministic first-match selection when two date buckets retain different server versions of
  the same delete sentinel; zero-network Undo can preserve the stale copy. A fresh tests-only RED
  must lock cross-household queue/cache isolation and deterministic latest authoritative sentinel
  selection before production changes again. GREEN5 hash `82ab600c…` is rejected; Phase 1 remains
  open.
- 2026-07-16 — scoped-identity RED4 is frozen and independently reproduced with production unchanged.
  Typecheck and diff-check pass; the two-suite focused run has exactly ten expected behavioral
  failures / 74 passes / 84 total and no setup/import/timer/`act` diagnostics. Five storage cases
  prove mismatched household, puppy, event type, payload version, or occurrence is destructively
  accepted instead of atomically rejected; two cache cases prove bare-id owner create/clear/scrub
  crosses household roots; and three loser-first cases prove sentinel choice depends on insertion
  order instead of deterministic `version → updated_at → id` precedence (winner-first counterparts
  already pass). Frozen hashes are `e6fcb9ca…` (storage) and `dddc289d…` (mutation port). A fresh
  production-only GREEN6 is required; Phase 1 remains open.
- 2026-07-16 — GREEN6 made scoped-identity RED4 green (84/84), passed 449/449 broad relevant tests,
  typecheck, diff-check, and lint, and independent review accepted the transactional routing guard,
  all composite owner-key lifecycle paths, exact-root sentinel scoping, version/id precedence, and
  the prior AC10 boundaries. One Important deterministic-selection defect remains: `updated_at` is
  compared lexicographically even though the timestamp contract accepts offsets, so chronologically
  older offset text can win and equivalent instants in different representations do not reach the
  stable-id tie-break. A tests-only micro-RED must lock numeric instant ordering and equal-instant ID
  precedence before the reducer changes. GREEN6 hashes `dbea4f19…` (storage) and `90b5b641…`
  (Quick Log) are not yet accepted; Phase 1 remains open.
- 2026-07-16 — timestamp micro-RED5 is frozen and independently reproduced with GREEN6 production
  unchanged. Focused mutation-port has exactly four expected behavioral failures / 50 passes / 54
  total, typecheck and diff-check pass, and no setup/timer/`act` diagnostics. Both insertion orders
  fail for a chronologically newer `Z` timestamp versus lexicographically larger older non-zero
  offset text, and both fail to use stable ID when `Z` and `+00:00` represent the same instant. The
  frozen mutation-port hash is `a2dc42d3…`; the production reducer must compare parsed milliseconds
  and use ID only when instants are equal. Phase 1 remains open.
- 2026-07-16 — GREEN7 changed only the sentinel timestamp comparator and is accepted after
  independent review. Numeric parsed milliseconds now decide chronological precedence after server
  version, and equal instants fall through to the stable highest-ID tie-break. Frozen RED5 is 54/54;
  RED4 storage+mutation is 88/88; broad relevant is 453/453; an independent complete unit run is
  1098/1098; typecheck/diff-check/lint pass (pre-existing unrelated warnings only). Review also
  reconfirmed the GREEN6 transactional identity guard, composite owner scoping, exact Timeline root,
  and all prior AC10 finalizer/actor/Undo/backoff/tombstone-only/error boundaries. Accepted hashes are
  `66abe206…` (Quick Log), `dbea4f19…` (storage), `b0f66b7f…` (delete/Undo hook), `1f4c4e14…`
  (Today), and `aaeeaf60…` (Quick Log shell). Fresh REFACTOR, full gate, rebuilt embedded bundle, and
  live approved-SE offline uncheck remain before the Phase 1 checkbox can close.
- 2026-07-16 — fresh REFACTOR audit completed as an explicit no-op. No narrow cleanup improved
  clarity enough to justify risk to the accepted durable-enqueue order, global-tail serialization,
  composite owner lifecycle, transactional routing replacement, sentinel precedence, or Retry/Undo
  failure boundaries. All accepted production and frozen test hashes remained byte-identical. The
  AC10 RED/GREEN/review/REFACTOR chain is complete; full `npm run check` and rebuilt approved-SE live
  acceptance are next.
- 2026-07-16 — post-AC10 full `npm run check` passed with `GATE_EXIT=0`; the complete Jest suite,
  Node checks (119/119), navigation/i18n/scaffold/token/privacy/text-hygiene gates, lint, and
  TypeScript all passed. XcodeBuildMCP defaults were then explicitly verified as Release `PuppyPlan`,
  bundle `com.dmitry-selenya.puppyplan-app`, and the approved `Grith iPhone SE 3 iOS 26.3`
  (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`). A fresh embedded bundle build/install is next; no live
  checkbox closes on local gates alone.
- 2026-07-16 — the freshly embedded Release bundle passed approved-SE offline uncheck acceptance.
  With Wi-Fi off, tapping the synced `Done 6:49 PM` Feeding slot immediately removed the ordinary
  Done presentation, showed `Sync in progress`, and exposed the existing `Entry deleted` / Undo
  snackbar. Without a foreground nudge, reconnect cleared pending state and the Done slot stayed
  absent; terminate/relaunch after eight seconds did not resurrect it. A read-only Supabase aggregate
  for the exact event-type/time window returned zero active rows, one tombstoned row, and one distinct
  client event. Evidence: `output/ux-audit/pup33-closure/phase1-ac10-{offline-uncheck,
  online-uncheck,after-uncheck-relaunch}.png`. The offline-uncheck checkbox is closed; burst and
  cleanup remain.
- 2026-07-16 — Phase 1 burst and cleanup passed on the approved SE. Twenty-two Potty quick logs
  were created through the Add flow, including the duplicate-care confirmation required inside the
  60-second window. Three stable runtime snapshots across the expanded Diary history yielded 22
  unique `diary-history-logged-fact-card` refs; the matching read-only Supabase aggregate returned
  22 active rows and 22 distinct client event ids, so AC-P1-BURST-1 has zero loss and zero duplicate.
  Every burst row was then removed through its own Diary `Delete entry` action. The final aggregate
  returned 0 active rows, 22 tombstoned rows, and 22 distinct client event ids, while the settled UI
  exposed no matching fact card. Evidence:
  `output/ux-audit/pup33-closure/phase1-{burst-22-diary,burst-cleanup-diary}.png`. All Phase 1
  checkboxes are closed; Phase 2 is active.
- 2026-07-16 — Phase 2 executed both locked owner decisions without behavior or schema changes.
  The observation migration header now distinguishes aggregate routine-summary exclusion from the
  owner's explicit `selected_event_types` choice in `selected_timeline_range`; ADR-0022 records the
  2026-07-16 opt-in rationale and continued private-note exclusion. The uncheck plan records that
  `Delete entry` intentionally keeps its `destructive` treatment. The migration SQL body from the
  first `ALTER TYPE` through EOF retained SHA-256
  `28816edf86bca859f4136699ac0401812aadce57005496103e74a790e9f1fc09`, proving the edit was
  comment-only. All Phase 2 checkboxes are closed; Phase 3 is active.
- 2026-07-17 — Phase 3 pre-commit review returned `Needs fixes` for one P2 lifecycle gap: production
  actor-scoped recovery can never reach the storage-only quarantine branch for legacy
  `created_by IS NULL` rows, so they can remain pending forever. AC-P3-LEGACY-1..3 lock local
  quarantine before hydration/drain, atomic idempotence, no cache/network adoption, and scrubbed
  failure containment. Heavy isolated RED changed tests only. The focused two-suite run independently
  reproduces exactly three expected behavioral failures with 88 existing/setup passes: missing
  storage quarantine API, missing startup call ordering, and missing contained failure boundary.
  Typecheck and test diff-check pass. Frozen test hashes are `28e199d1…` (storage) and `57250c49…`
  (mutation port); production remains `dbea4f19…` (storage) and `66abe206…` (Quick Log). A fresh
  production-only GREEN context is next; Phase 3 PR actions remain blocked.
- 2026-07-17 — first legacy-quarantine GREEN made the frozen 91/91 and 345/345 adjacent Quick Log
  tests pass with typecheck/lint/diff-check green, but independent review returned `Needs fixes`.
  Real `createQuickLogQueueStorage.initialize()` first stale-recovers every `sending` row, including
  actorless legacy rows, incrementing retry count before startup quarantine increments it again.
  The direct storage RED and mocked-open hook RED did not exercise this composition. AC-P3-LEGACY-4
  now locks initialize → startup quarantine at exactly one increment. GREEN hashes `0b80312c…`
  (storage) and `fd3ea38c…` (Quick Log) are rejected; a fresh tests-only composition RED is next.
- 2026-07-17 — AC-P3-LEGACY-4 composition RED is frozen and independently reproduced with GREEN1
  production unchanged. The two-suite run has exactly one expected behavioral failure / 91 passes:
  after real `initialize()` then quarantine, an actorless `sending` row reaches retry count 6 instead
  of the original+1 value 5, while the actor-owned stale `sending` control still recovers correctly.
  Typecheck and diff-check pass. Frozen test hashes are `3285e126…` (storage) and unchanged
  `57250c49…` (mutation port). A fresh production-only GREEN2 must scope stale-sending recovery
  without weakening actor-owned recovery; Phase 3 PR actions remain blocked.
- 2026-07-17 — GREEN2 is accepted after fresh independent review. Stale-sending initialization now
  skips only actorless rows, leaving them unchanged for the signed-in startup quarantine, while
  actor-owned stale sends retain the existing retryable recovery. The frozen focused suites pass
  92/92, adjacent Quick Log passes 346/346, full unit passes 1102/1102, and typecheck/lint/diff-check
  pass (pre-existing warnings only). Review verified the complete initialize → quarantine → startup
  composition, atomic/idempotent SQL, one retry increment, actor isolation, and scrubbed failure
  containment with no findings. Accepted hashes are `3c59d801…` (storage), `fd3ea38c…` (Quick Log),
  `3285e126…` (storage test), and `57250c49…` (mutation-port test). Fresh isolated REFACTOR is next;
  the full gate still precedes any PR action.
- 2026-07-17 — isolated legacy-quarantine REFACTOR completed as a deliberate no-op. The atomic
  conditional UPDATE, explicit quarantine → list → hydrate/drain ordering, optional test-double
  compatibility, and actor isolation were already the smallest safe shape; extraction or query
  condensation would add risk without material clarity. Focused remained 92/92, typecheck and
  diff-check passed, and all accepted production/test hashes stayed byte-identical. The referenced
  `agents/refactorer.md` role prompt is absent from the repo, so the agent followed the canonical
  repo TDD skill's REFACTOR section as the documented fallback. Heavy RED/GREEN/review/REFACTOR is
  complete; the fresh full gate is next.
- 2026-07-17 — fresh Phase 3 full `npm run check` passed with exit 0 after the legacy repair. Expo
  lint completed with 0 errors and 21 pre-existing warnings; TypeScript passed; the complete unit
  suite passed 1102/1102; Node checks passed 119/119; and navigation, i18n, scaffold, plan-index,
  design-token, privacy, and text-hygiene gates all passed. Existing Expo Go notification and
  reduced-motion `act(...)` console warnings remain visible but are not failures and were not
  suppressed. The Phase 3 gate checkbox is closed; final full-diff and security/privacy reviews are
  running before commit/push/PR.
- 2026-07-17 — final full-diff and security/privacy reviews returned `Needs fixes` with three
  blockers. First, the Phase 2 explicit-opt-in statement is not enforced: the selected-timeline
  contract/schema permit null or omitted `selected_event_types`, and the projection interprets null
  as all current and future types, so Observation can appear without per-type opt-in. Resolving that
  requires an exact owner decision: authorize a new contract/migration/projection hardening with
  pgTAP coverage, or explicitly accept/document null-as-all semantics. The migration header and
  ADR now state the factual mismatch without pretending the owner decision is satisfied; their two
  Phase 2 checkboxes and the Phase 3 gate checkbox are reopened. Second, a Snackbar callback can
  outlive auth switching and let actor B invoke actor A's Undo/Retry port. Third, a retained failed
  delete sentinel for an older expanded-history row can disappear with its Retry surface. The latter
  two are in-scope AC10 actor/visibility defects but remain unmodified until the owner resolves the
  privacy/schema decision. No staging, commit, push, PR, migration application, or release occurred.
- 2026-07-17 — meaningful in-scope work continued while the share-scope decision awaits owner input.
  AC-P3-ACTOR-1..2 lock stale Delete/Retry/Undo rejection across auth switches, rechecks across held
  awaits/global-tail boundaries, atomic SQLite state+actor removal, and dismissal/disablement of old
  Snackbar actions while preserving same-actor five-second Undo. Heavy isolated RED changed tests
  only and is independently reproduced: the three-suite run has exactly seven expected behavioral
  failures / 106 passes, with same-actor rerender already green; typecheck and diff-check pass.
  Frozen test hashes are `07627432…` (mutation port), `ea91c543…` (storage), and `23bf933d…`
  (Diary route). Production remains `b0f66b7f…` (delete/Undo hook), `fd3ea38c…` (Quick Log), and
  `3c59d801…` (storage). A fresh production-only GREEN context is next.
- 2026-07-17 — AC-P3-ACTOR production-only GREEN now passes the frozen focused suite 113/113 both
  in the implementation context and in a fresh main-context rerun. The mutation port carries the
  expected actor and a live getter; stale Delete/Retry/Undo actions stop before boundary access and
  recheck after awaited/serialized work before cache effects. Real SQLite Undo removal is atomic on
  client id, `deleted_before_sync`, and expected actor. Auth-identity changes dismiss and disable the
  old Snackbar action while same-actor rerenders retain it. Tests/docs/config stayed frozen; accepted
  candidate hashes are `1fb65cd3…` (storage), `1a014893…` (Quick Log), and `3a46e4e1…` (delete/Undo
  hook). Independent review is running; no completion checkbox or PR action is claimed yet.
- 2026-07-17 — independent AC-P3-ACTOR review returned `Needs fixes` despite the 113/113 focused
  pass. It found two uncovered auth-switch races: a delete-sentinel Retry can wait on the serialized
  tail, then read/write the prior actor's SQLite/cache after the actor changes; and an ordinary Retry
  can cross `queue.manualRetry`, replay the prior actor's row, and start a Supabase insert under the
  new session because no post-await actor check exists. It also found that Snackbar ownership uses
  mutation-object identity, so a new port instance for the same actor incorrectly cancels the
  five-second action. Delete/Undo guards, atomic real-SQLite removal, different-actor dismissal, and
  scrubbed observability were accepted. A tests-only RED2 is running for the three gaps; production
  remains frozen at the GREEN candidate hashes and the actor repair is not accepted yet.
- 2026-07-17 — actor RED2 is independently reproduced with exactly four expected behavioral
  failures / 112 passes across 116 focused tests. The tests hold ordinary `manualRetry`, the
  serialized delete-Retry tail, and Supabase `insertEvent` across A→B auth changes, then assert no
  stale cache/queue/analytics/invalidation effects; a render test replaces the mutation-port object
  while preserving its actor id and requires the five-second action to remain. Storage stays green,
  typecheck and diff-check pass, production hashes remain frozen, and test hashes are `301425ec…`
  (mutation port), `59586541…` (Diary route), and unchanged `ea91c543…` (storage). Production-only
  GREEN2 is next.
- 2026-07-17 — GREEN2 exposed a frozen-test spec conflict rather than an implementation ambiguity.
  An older AC-P1 test required a stale post-tail callback to rewrite the retained delete sentinel as
  `auth_refresh_in_progress`; the newer, explicit AC-P3-ACTOR-1 requires stale callbacks to stop
  before SQLite/cache/Supabase effects. The newer final-review lock supersedes that write expectation:
  mismatch reporting remains required, while the original sentinel must remain unchanged and can be
  rehydrated when its actor returns. This is being reconciled in a separate tests-only context; GREEN2
  remains production-only.
- 2026-07-17 — actor GREEN2 plus the tests-only spec reconciliation are independently green at
  116/116 focused tests. Live-actor guards now stop stale Retry work inside the serialized tail and
  after awaited `manualRetry`, `insertEvent`, resolution, and adjacent effect boundaries; mismatch
  reporting is generic while the prior actor's original sentinel stays byte-equivalent. Snackbar
  ownership is actor-id based, so same-actor port replacement retains the action and different-actor
  replacement dismisses/disables it. Adjacent suites passed 142/142; typecheck, lint, and diff-check
  pass with only pre-existing warnings. Candidate hashes are `24f5bcb2…` (Quick Log), `df5a68b7…`
  (delete/Undo hook), `1fb65cd3…` (storage), `9df1c7a6…` (mutation-port test), `59586541…`
  (Diary route), and `ea91c543…` (storage test). Fresh review is running; actor completion is not yet
  claimed.
- 2026-07-17 — fresh AC-P3-ACTOR review returned `APPROVED` with no findings. It independently
  matched all six hashes, passed the focused 116/116 suite, typecheck, and diff-check, and traced
  pre-boundary/post-await guards across Delete/Retry/Undo, serialized tail, manual retry, insert,
  resolution, tombstone, remove, and restore. It also verified byte-equivalent sentinel retention,
  transactionally atomic actor/state Undo removal, actor-id Snackbar ownership, production live-actor
  adapters, optional legacy-double compatibility, and generic scrubbed observability. History and
  share-scope semantics remain explicitly outside this verdict. Isolated REFACTOR is next.
- 2026-07-17 — isolated AC-P3-ACTOR REFACTOR completed as a deliberate no-op. The repeated guards
  intentionally sit beside distinct await/serialized boundaries and are easier to audit there;
  extracting them would obscure the exact stop points. Snackbar current/previous identity refs have
  separate callback-gating and transition-detection roles, and the atomic storage transaction plus
  compatibility fallback are already narrow. Focused remains 116/116, typecheck and diff-check pass,
  and all six accepted hashes are unchanged. The actor RED/GREEN/review/REFACTOR chain is complete;
  AC-P3-HISTORY is next.
- 2026-07-17 — AC-P3-HISTORY heavy isolated RED is independently reproduced in the existing Diary
  core render suite with exactly three expected behavioral failures / 36 passes. Current expanded
  history renders the durable synced row instead of an older failed delete sentinel, fails to hide
  the durable row for a category-null accepted delete, and loses the failed status through filtered
  dedupe. A same-client-id sentinel under another household/puppy Timeline root already passes as a
  negative control. Typecheck and diff-check pass; production remains frozen at `1f4c4e14…`
  (TodayScreen), `f9ae8405…` (Timeline hook), and `99a055d7…` (cached-row hook); the new render-test
  hash is `cc978645…`. Production-only GREEN is next.
- 2026-07-17 — AC-P3-HISTORY production-only GREEN is independently green at 39/39 focused render
  tests. Expanded history now builds an authoritative client-id map from root-scoped retained delete
  rows that match the active event-type filter, suppresses every matching durable duplicate, and
  reinserts only non-null-category failed sentinels once with Retry-only presentation. Category-null
  deletes remain hidden; cross-root isolation remains green; deterministic ordering uses occurrence
  time then client id. The derivation is confined to the `diaryHistoryOpen` visible-row branch, leaving
  selected-day/plan inputs unchanged. Adjacent Today/Timeline suites pass 76/76; typecheck, lint, and
  diff-check pass with pre-existing warnings only. Candidate TodayScreen hash is `d00c09b2…`; the
  frozen render-test hash remains `cc978645…`. Fresh review is running.
- 2026-07-17 — the first HISTORY review returned `Needs fixes`, claiming failed delete sentinels
  still expose direct Edit/actions-menu/Delete affordances and can retain an open menu across a
  synced-to-sentinel transition. Code inspection shows the claim conflicts with existing gates:
  failed rows set `editRequest` to null, and card press, actions label/handler, and menu rendering all
  require non-null `editRequest`. Per code-review reception rules no production change is accepted
  without reproduction. A tests-only interaction/state-transition verification is running against
  the frozen `d00c09b2…` production hash; the GREEN remains unaccepted pending that evidence.
- 2026-07-17 — the disputed HISTORY finding is not reproducible. Tests-only coverage on unchanged
  `d00c09b2…` production now presses the failed row/card, asserts the item-actions affordance and
  Edit/Delete/Undo/tertiary actions are absent, and proves Retry is the sole working action. A second
  deterministic test opens actions on a synced same-client row, replaces it with a newer failed
  delete sentinel, and confirms the menu closes and further Edit is impossible. The focused suite is
  independently green at 40/40; the test hash is `6ab480d8…`. Fresh re-review is running to resolve
  the first verdict; no production change was made for the false-positive claim.
- 2026-07-17 — fresh AC-P3-HISTORY re-review returned `APPROVED` with no findings and formally
  resolved the first Edit/menu/Delete claim as a false positive. It independently matched the
  production/test hashes, passed 40/40 focused Today tests, 64/64 adjacent Today/Timeline tests, a
  targeted actor-cache scrub test, typecheck, and diff-check. Review traced all failed-row interaction
  gates, root/filter/client-id authority, category-null hiding, deterministic preference/order,
  non-mutating inputs, actor-switch scrub, and history-only isolation from selected-day, plan, sleep,
  recent, and duplicate inputs. Native visual evidence is not required for this non-layout repair;
  isolated REFACTOR is next.
- 2026-07-17 — isolated AC-P3-HISTORY REFACTOR completed as a deliberate no-op. The local Map makes
  client-id sentinel authority explicit, the category check makes hidden accepted deletes auditable,
  and the local sort preserves deterministic ordering without mutating query-cache inputs. Reusing a
  generic dedupe or extracting one-line predicates would obscure the privacy/offline semantics without
  removing material duplication. Focused remains 40/40, diff-check passes, and accepted production/test
  hashes remain `d00c09b2…` / `6ab480d8…`. The HISTORY RED/GREEN/review/REFACTOR chain is complete.
  The only remaining Phase 2/3 blocker is the owner's exact `selected_event_types = NULL` decision.
- 2026-07-17 — a fresh full `npm run check` after the accepted actor/history repairs passed with
  `GATE_EXIT=0`: Expo lint reported 0 errors and 21 pre-existing warnings; TypeScript passed; unit
  tests passed 1118/1118; Node checks passed 119/119; navigation, i18n, scaffold, plan-index, token,
  privacy, and text-hygiene gates all passed. Existing Expo Go notification and reduced-motion
  `act(...)` console warnings remain visible and unsuppressed. The Phase 3 gate checkbox stays open
  because its wording also requires Phase 2 to be landed, which depends on the unresolved owner
  decision; if schema hardening is authorized, the full gate will be repeated after that change.
- 2026-07-17 — parallel full-diff and security/privacy reviews diverged. The deep product review
  approved the implemented queue/legacy/synced-actor/history work and found only the known nullable
  share-scope blocker. The security review reproduced two additional root-feedback actor gaps that
  the broad review missed: `deleteLocal`/optimistic Undo carry no expected/live actor into their
  SQLite/cache path, and ordinary manual Retry never atomically compares the retained row's
  `created_by` with the port actor before replay/network. RLS limits the latter's durable write but
  cannot prevent local mutation/payload replay. AC-P3-ACTOR-3..4 now lock both fixes as separate
  heavy isolated chains. The green full gate remains useful evidence but Phase 3 readiness is reopened;
  no commit, push, PR, migration application, or release occurred.
- 2026-07-17 — AC-P3-ACTOR-3 heavy isolated RED is independently reproduced with exactly seven
  expected behavioral failures / 103 passes across the mutation-port and real SQLite suites. It
  covers retained actor-A `deleteLocal` and optimistic Undo after A→B, actor changes during awaited
  local read/transition/removal, stable B access to A-owned rows with scrubbed reporting, and atomic
  real-SQLite sending-state+owner transition. Existing atomic pending/failed removals already pass.
  Typecheck and diff-check pass; production remains frozen at `24f5bcb2…` (Quick Log), `1fb65cd3…`
  (storage), and `f8a71cfd…` (feedback provider). Frozen RED test hashes are `a0f4db98…` and
  `31eb58ee…`. Production-only GREEN is next.
- 2026-07-17 — AC-P3-ACTOR-3 production-only GREEN passes the frozen focused suite 110/110 in both
  the implementation context and a fresh main-context rerun, plus 364/364 adjacent Quick Log tests.
  Local `deleteLocal` and optimistic Undo now carry the captured actor plus a live actor getter,
  reject foreign retained rows, and recheck auth identity after each awaited read/transition/removal
  before cache or invalidation effects. Real SQLite sending tombstones are atomic on client id,
  expected state, and expected actor; pending/failed removal uses the corresponding state+actor
  condition. Fire-and-forget failures report only generic scrubbed operation context, with no silent
  catch. Typecheck, lint (0 errors; 21 pre-existing warnings), and diff-check pass. Candidate hashes
  are `9fd1c09b…` (Quick Log) and `4789eece…` (storage); frozen tests remain `a0f4db98…` and
  `31eb58ee…`. Fresh independent review is running; no completion checkbox or PR action is claimed.
- 2026-07-17 — fresh AC-P3-ACTOR-3 review returned `APPROVED` with no actionable findings. It
  independently matched all four frozen hashes, passed 110/110 focused tests, 43/43 adjacent mutation
  lifecycle tests, typecheck, and diff-check, and traced captured/live actor checks before queue/cache
  access and after every relevant read, transition, and removal. It verified foreign-owner rejection,
  byte-identical mismatch behavior, exclusive real-SQLite source-state+actor conditions, zero cache or
  invalidation after supersession, and generic scrubbed fire-and-forget reporting. The only residual
  compatibility risk is the intentionally non-production fallback for custom adapters that omit
  `removeIfState`; the production SQLite adapter exposes the required atomic method. Isolated
  REFACTOR is next.
- 2026-07-17 — isolated AC-P3-ACTOR-3 REFACTOR completed as a deliberate no-op. The repeated actor
  checks intentionally expose the exact asynchronous, SQLite, cache, and invalidation boundaries;
  consolidating them would reduce security auditability. Extracting the small duplicated expected
  state+actor predicates would likewise hide the transactional condition behind a premature
  abstraction. Focused tests remained 110/110 before and after the assessment, typecheck and
  diff-check pass, and all four production/test hashes are unchanged. The AC-P3-ACTOR-3
  RED/GREEN/review/REFACTOR chain is complete; AC-P3-ACTOR-4 ordinary Retry ownership is next.
- 2026-07-17 — AC-P3-ACTOR-4 heavy isolated RED is independently reproduced with exactly four
  expected behavioral failures / 111 passes across 115 focused mutation-port and real SQLite tests.
  It proves that foreign-actor ordinary Retry currently mutates/replays/sends a retained row, a
  legacy adapter without atomic ownership can adopt it, an actor-aware capability is not yet used,
  and real SQLite does not expose that atomic capability. A passing TOCTOU control already proves
  that an auth switch during the initial awaited read stops all downstream effects. The frozen
  contract is optional `manualRetryIfOwned(clientId, { expectedCreatedBy, now, recoverySurface })`
  returning retry-or-null; missing capability must fail closed without a get+legacy-manualRetry
  fallback. Typecheck and test diff-check pass. Production hashes remain `9fd1c09b…` / `4789eece…`;
  frozen RED test hashes are `8ccbcd64…` / `c1b2e3e5…`. Production-only GREEN is next.
- 2026-07-17 — the first AC-P3-ACTOR-4 GREEN correctly halted before production edits on a frozen
  test-spec conflict. An older AC-P3-ACTOR-1 await-boundary test supplies only legacy `manualRetry`
  and requires it to run once, while the newer AC-P3-ACTOR-4 fail-closed invariant forbids that exact
  actor-bound fallback when `manualRetryIfOwned` is missing. Production cannot distinguish the two
  adapters without test-specific behavior. The older test must preserve its auth-switch-during-await
  invariant through a gated actor-aware capability and require zero legacy calls. A separate
  tests-only RED repair is running; all production and RED hashes remain unchanged.
- 2026-07-17 — AC-P3-ACTOR-4 tests-only RED repair reconciled the older await-boundary test without
  weakening either invariant. It now gates `manualRetryIfOwned`, verifies `expectedCreatedBy`, flips
  A→B while the atomic capability is awaited, and requires zero cache, Supabase, analytics,
  invalidation, or legacy-retry effects afterward with generic scrubbed mismatch reporting. A
  deterministic actor-aware-versus-legacy race makes the current wrong path fail quickly instead of
  hanging. The exact suite is independently stable at five expected capability-related failures /
  110 passes across 115 tests; typecheck and diff-check pass. Production remains `9fd1c09b…` /
  `4789eece…`; the frozen test hashes are now `8dbac802…` / `c1b2e3e5…`. Fresh production-only
  GREEN restarts against this unambiguous contract.
- 2026-07-17 — the second AC-P3-ACTOR-4 GREEN again correctly halted and reverted before accepting
  production changes after the safe implementation reached 114/115. Another older AC-P3-ACTOR-1
  test expects an actor-bound Retry to reach a held Supabase insert through `harness.storage`, but
  that fixture also omits `manualRetryIfOwned`; the new fail-closed invariant therefore prevents the
  intended insert and the test times out. A state-dependent legacy exception would violate the
  security contract. Production and tests are restored to all frozen hashes. A second tests-only
  reconciliation is adding the actor-aware capability to that fixture and auditing the remaining
  actor-bound ordinary-Retry fixtures for the same stale assumption before GREEN restarts.
- 2026-07-17 — AC-P3-ACTOR-4 tests-only reconciliation2 is independently stable at six expected
  failures / 109 passes across 115 focused tests with no hang. The post-insert auth-switch fixture
  now provides a faithful owned-row `manualRetryIfOwned`, asserts `expectedCreatedBy` and zero legacy
  calls, reaches the held insert deterministically, and preserves all zero post-switch cache,
  resolution, removal, analytics, and invalidation assertions. A complete audit found no other stale
  actor-bound ordinary-Retry fixtures; delete-sentinel Retry follows a separate path that does not
  require this capability. Typecheck and diff-check pass. Production remains `9fd1c09b…` /
  `4789eece…`; frozen tests are now `d0c9e54c…` / `c1b2e3e5…`. Fresh production-only GREEN restarts.
- 2026-07-17 — AC-P3-ACTOR-4 production-only GREEN3 is independently green at 115/115 focused tests
  and 369/369 adjacent Quick Log tests. The queue exposes optional `manualRetryIfOwned`; real SQLite
  reads, checks `created_by`, transitions the retry state, and writes within one exclusive transaction.
  Actor-bound ordinary Retry requires that capability, treats missing/null/foreign results as a
  generic scrubbed no-op, never falls back to legacy `manualRetry`, and rechecks the live actor after
  the atomic await and subsequent effect boundaries. Unbound compatibility calls retain the legacy
  method, while the production mutation port is actor-bound. Typecheck, lint (0 errors; 21 existing
  warnings), and diff-check pass. Candidate hashes are `45c50290…` (Quick Log) and `166f7a3c…`
  (storage); frozen tests remain `d0c9e54c…` / `c1b2e3e5…`. Fresh independent review is running.
- 2026-07-17 — fresh AC-P3-ACTOR-4 review returned `NEEDS FIXES` for one P2/Medium TOCTOU gap that
  the 115/115 suite did not assert. If A→B occurs while `manualRetryIfOwned` is awaited, the current
  capability can commit failed→sending before the caller's post-await live-actor guard. Downstream
  cache, Supabase, analytics, and invalidation remain zero, but SQLite is not byte-identical and the
  row may stay `sending` until stale-recovery at restart, violating the explicit superseded-Retry
  invariant. All other AC4 paths were accepted. A new tests-only RED must assert retained-row
  identity for the capability-await race and real-SQLite transactional liveness/rollback before the
  GREEN can be accepted.
- 2026-07-17 — AC-P3-ACTOR-4 review RED is independently stable at four expected failures / 112
  passes across 116 focused tests. The mutation-port tests now require a live `isActorCurrent`
  predicate on `manualRetryIfOwned`, assert byte-identical retained data when A→B occurs during the
  capability await, preserve the same-actor transition and post-insert controls, and retain generic
  scrubbed reporting. The real SQLite test gates an awaited state write inside the exclusive
  transaction, changes actor liveness, and requires exactly one transaction, null, an in-transaction
  liveness check, and rollback to the exact original row. Typecheck and diff-check pass. Production
  remains `45c50290…` / `166f7a3c…`; frozen tests are `fefb54c3…` / `97ba76d4…`.
- 2026-07-17 — AC-P3-ACTOR-4 TOCTOU GREEN4 is independently green at 116/116 focused tests and
  370/370 adjacent Quick Log tests. `manualRetryIfOwned` now requires the live predicate; real SQLite
  checks it before and after awaited read/write boundaries inside the same exclusive transaction.
  Supersession after the state write throws a private scrubbed sentinel, causing transaction rollback
  and exact retained-row identity; only that sentinel maps to null outside, while real database errors
  rethrow. The actor-bound caller passes the live predicate and retains all fail-closed/no-legacy
  behavior. Typecheck, lint (0 errors; 21 existing warnings), and diff-check pass. Candidate hashes
  are `046765ef…` (Quick Log) and `69bef296…` (storage); frozen tests remain `fefb54c3…` /
  `97ba76d4…`. Fresh independent re-review is running.
- 2026-07-17 — fresh AC-P3-ACTOR-4 re-review returned `APPROVED` with no findings. It independently
  matched all four hashes, passed 116/116 focused tests, typecheck, and diff-check, and verified the
  production live predicate, in-transaction pre/post read/write checks, private sentinel rollback,
  real-error rethrow, exact retained identity, same-actor commit, foreign/missing/superseded
  fail-closed behavior, zero downstream effects, no actor-bound legacy fallback, and isolation of the
  delete-sentinel path. The reviewer noted only a theoretical post-final-sync-check/pre-COMMIT window
  inside Expo SQLite with no observable await boundary; eliminating it would require serializing auth
  changes with SQLite commit and is not actionable within the locked design. Isolated REFACTOR is next.
- 2026-07-17 — isolated AC-P3-ACTOR-4 REFACTOR completed as a deliberate no-op. Explicit capability
  selection keeps the actor-bound path visibly fail-closed; the four liveness checks intentionally
  mark the exact pre/post awaited SQLite boundaries; and the private sentinel narrowly separates
  supersession rollback/null from real database errors. Extraction or compression would reduce
  auditability without removing material duplication. Focused remained 116/116 before and after,
  typecheck and diff-check pass, and all accepted hashes are unchanged. The AC-P3-ACTOR-4
  RED/GREEN/review/REFACTOR chain is complete; a fresh full gate and final reviews are next.
- 2026-07-17 — fresh full `npm run check` after both additional actor-boundary repairs passed with
  exit 0. Expo lint reported 0 errors and 21 existing warnings; TypeScript passed; the complete unit
  suite passed 1134/1134 across 104 suites; Node checks passed 119/119; navigation, i18n, scaffold,
  plan-index, design-token, privacy, and text-hygiene gates all passed. Existing Expo Go notification
  and reduced-motion `act(...)` console warnings remain visible and unsuppressed. The Phase 3 gate
  checkbox remains open because its wording also requires Phase 2 to be landed, which still depends
  on the owner's exact nullable share-scope decision. Final full-diff and security/privacy reviews
  are next.
- 2026-07-17 — final full-diff and security/privacy reviews returned `NEEDS FIXES` despite the green
  full gate. They independently validated four additional implementation gaps now locked as
  AC-P3-ACTOR-5..6, AC-P3-ERROR-1, and AC-P3-DATE-1: actor-A retained local rows can transiently
  expose private v2 title/note content to actor B before passive scrub on a warm shared puppy root;
  unmounted mutation ports and global Snackbar actions retain actor-A liveness; ordinary Retry can
  emit an unhandled DB rejection or silently downgrade read/cleanup failures; and local Delete/Retry
  use UTC date slicing for local-day replay/invalidation. The reviews otherwise accepted atomic
  actor/state/liveness rollback, legacy quarantine, history sentinel authority, scrubbed payloads,
  and the current RLS projection boundaries. Scoped review tests passed 164/164, Supabase guardrails
  31/31, privacy scan/typecheck/diff-check passed, and the migration executable body remains
  `28816edf…`. The nullable share-scope owner decision remains a fifth, separate blocker. No commit,
  push, PR, migration application, or release occurred.
- 2026-07-17 — AC-P3-ACTOR-5 heavy isolated RED is independently reproduced with exactly four
  expected failures / 51 passes across 55 cached-row, Timeline, and Today render tests. It proves
  synchronous foreign-actor exposure through every `localSync` state, already-warm Timeline
  `query.data`, current-day Diary, and expanded history, including private v2 observation title/note.
  Negative controls already pass: the current actor's local row and another caregiver's durable
  synced household row remain visible, and the warm-cache test performs no durable fetch. Typecheck
  and diff-check pass; production remains `99a055d7…` (cached hook), `f9ae8405…` (Timeline hook), and
  `d00c09b2…` (TodayScreen). Frozen test hashes are `10d42a96…`, `73b57093…`, and `d2833526…`.
  Production-only GREEN is next.
- 2026-07-17 — AC-P3-ACTOR-5 production-only GREEN is independently green at 55/55 focused tests
  and 62/62 adjacent Active Care, Timeline, and Today tests. The active care context's `userId` now
  synchronously filters foreign `localSync` rows from raw cache snapshots, already-warm query data,
  query-function cache merges, and retained-sentinel writes before any Diary render. Durable synced
  household rows without `localSync` remain shared regardless of creator, and current-actor local rows
  remain visible. Typecheck, lint (0 errors; 21 existing warnings), and diff-check pass. Candidate
  hashes are `1fa31458…` (cached-row hook) and `e72f8dcb…` (Timeline hook); TodayScreen and all three
  frozen tests remain byte-identical. Fresh independent privacy review is running.
- 2026-07-17 — fresh AC-P3-ACTOR-5 privacy review returned `APPROVED` with no findings. It matched
  all six hashes, passed 55/55 focused tests, typecheck, and diff-check, and traced filtering across
  raw root-cache snapshots, warm loading/error/ready query data, query-function cache scans, retained
  sentinel writes, durable/local merge, current-day Diary, and history. All six foreign `localSync`
  states are excluded while the current actor's local row and another caregiver's durable household
  row remain visible. The only residual is that the generic surface context type omits `userId` and
  retains a fail-open legacy/test fallback; every current production caller comes from strict
  `ActiveCareContext`, where `userId` is required, so this is not a current production finding.
  Isolated REFACTOR is next.
- 2026-07-17 — isolated AC-P3-ACTOR-5 REFACTOR made one narrow behavior-preserving extraction: the
  identical pure actor-visibility predicate and compatibility `userId` reader now live in
  `quick-log-actor-visibility.ts`, while all four synchronous privacy boundaries and Timeline's local
  identity-preserving filter remain explicit at their call sites. Focused remained 55/55 before and
  after; adjacent Active Care/Timeline passed 22/22; typecheck, lint, and diff-check pass. New hashes
  are `5842ec06…` (helper), `3dedc318…` (cached hook), and `1a7eb2f3…` (Timeline hook); Today and all
  frozen tests are unchanged. A narrow post-REFACTOR privacy re-review is running before AC5 closes.
- 2026-07-17 — AC-P3-ACTOR-5 post-REFACTOR privacy re-review returned `APPROVED` with no findings.
  It matched all six hashes, passed 55/55 focused tests, typecheck, and diff-check, and confirmed the
  shared helper preserves the exact predicate/fallback while raw cache, warm query data, query merge,
  and sentinel retention still invoke it with the same actor. Query keys and dependencies are
  unchanged. The AC-P3-ACTOR-5 RED/GREEN/review/REFACTOR/re-review chain is complete; actor-unmount
  lifecycle isolation is next.
- 2026-07-17 — AC-P3-ACTOR-6 heavy isolated RED is independently reproduced with exactly three
  expected failures / 89 passes across 92 mutation-port and Diary-route tests. After production-port
  unmount and an external A→B auth change with deliberately no rerender, retained global Retry,
  local Delete, optimistic Undo, and queue-backed details access still read/mutate actor A's
  SQLite/cache/network/analytics and delete all retained rows. Active synced-delete Undo and
  error-Retry Snackbars also remain undisposed after route unmount. The existing same-actor rerender
  negative control stays green. Typecheck and diff-check pass; production remains `046765ef…`
  (Quick Log), `df5a68b7…` (synced hook), and `f8a71cfd…` (feedback provider). Frozen tests are
  `1b342c72…` and `683e3d54…`. Production-only GREEN is next.
- 2026-07-17 — AC-P3-ACTOR-6 production-only GREEN is independently green at 92/92 focused tests
  and 68/68 adjacent mutation/route tests. Mutation-port unmount now synchronously clears that
  instance's live actor, queue, and recovery-trigger refs without touching the shared storage object.
  Synced Delete/Undo uses the latest Snackbar through a ref; a separate unmount-only cleanup first
  invalidates action ownership, then dismisses and clears every active id, while identity-change and
  same-actor rerender semantics remain separate. Typecheck, lint (0 errors; 21 existing warnings),
  and diff-check pass. Candidate hashes are `48e1487d…` (Quick Log) and `87cc8f6d…` (synced hook);
  provider and frozen tests remain unchanged. Fresh independent lifecycle/security review is running.
- 2026-07-17 — fresh AC-P3-ACTOR-6 lifecycle/security review returned `APPROVED` with no findings.
  It matched all five hashes, passed 92/92 focused tests, 85/85 adjacent mutation/Today tests,
  typecheck, and diff-check. Cleanup synchronously invalidates only per-port refs, retained actions
  fail before storage/cache/network with scrubbed reporting, both Snackbar id families are dismissed
  after ownership invalidation, and same-actor rerenders remain valid even with an unstable Snackbar
  facade. No cleanup-time React state update or actionable lifecycle race was found; already-in-flight
  server timing remains contained by the accepted post-await actor guards. Isolated REFACTOR is next.
- 2026-07-17 — isolated AC-P3-ACTOR-6 REFACTOR completed as a deliberate no-op. Identity-change and
  unmount effects intentionally represent different lifecycle boundaries, and the unmount ordering
  (invalidate ownership, then dismiss/clear) is security-significant; combining or extracting them
  would reduce auditability. Focused remained 92/92, typecheck and diff-check pass, and all five
  hashes are unchanged. The AC-P3-ACTOR-6 RED/GREEN/review/REFACTOR chain is complete; Retry/error
  containment is next.
- 2026-07-17 — AC-P3-ERROR-1 heavy isolated RED is independently reproduced with exactly four
  expected failures / 116 passes across 120 mutation-port/lifecycle tests. It proves that a real
  actor-aware Retry DB rejection escapes the production fire-and-forget callback, a post-insert
  queue-read rejection is converted to null and then mutates row/cache/analytics/invalidation, and
  create/manual-Retry cleanup catches omit scrubbed reporting. Existing delete-intent retention and
  skip-invalidation behavior remain locked. Typecheck and focused lint pass (0 errors; two existing
  duplicate-import warnings). Production remains `48e1487d…`; frozen tests are `f2a8dc84…` and
  `22dd0ddc…`. Production-only GREEN is next.
- 2026-07-17 — AC-P3-ERROR-1 production-only GREEN is independently green at 120/120 focused tests
  and 219/219 related tests across ten suites. The production Retry callback owns its promise and
  reports `local_action_failed`; post-insert queue-read rejection reports `manual_retry_read` and
  returns before state/cache/analytics/invalidation; create cleanup reports `save_cleanup` while
  preserving skip-all-invalidation; and manual-Retry cleanup reports `manual_retry_cleanup` while
  preserving actor/invalidation behavior. All reporting uses the existing scrubbed helper without raw
  errors, client ids, or payloads. Typecheck, lint (0 errors; 21 existing warnings), and diff-check
  pass. Candidate production hash is `58cd4381…`; both frozen tests remain unchanged. Fresh
  no-silent-failure review is running.
- 2026-07-17 — fresh AC-P3-ERROR-1 review returned `APPROVED` with no findings. It matched all three
  hashes, passed 120/120 focused tests, typecheck, and diff-check, and verified single ownership of
  rejected fire-and-forget Retry, effect-free queue-read failure, preserved delete intent and
  invalidation semantics in both cleanup paths, generic PII-safe operation tags, and continued
  rejection of real SQLite errors. Only the already-approved private actor-supersession sentinel maps
  to null. Isolated REFACTOR is next.
- 2026-07-17 — isolated AC-P3-ERROR-1 REFACTOR completed as a deliberate no-op. The four explicit
  boundaries have different operation tags and different early-return/invalidation contracts;
  sharing them would obscure the exact no-effect semantics. Focused remained 120/120, typecheck and
  diff-check pass, and all three hashes are unchanged. The AC-P3-ERROR-1
  RED/GREEN/review/REFACTOR chain is complete; local-calendar date correctness is next.
- 2026-07-17 — AC-P3-DATE-1 heavy isolated RED is independently reproduced with exactly two
  expected failures / 77 passes across 79 mutation-port tests. Under a locally scoped
  Europe/Warsaw timezone, `2026-07-17T23:30:00Z` belongs to 2026-07-18, but local Delete invalidates
  the 17th and ordinary Retry replays into the UTC bucket, leaving the local bucket empty. The
  timezone is restored in `finally` and all following tests remain green. Typecheck and diff-check
  pass; production remains `58cd4381…` and the frozen test hash is `1b014d4a…`. Production-only
  GREEN is next.
- 2026-07-17 — AC-P3-DATE-1 production-only GREEN is independently green at 79/79 focused tests and
  110/110 adjacent date, mutation, storage, recent-event, cached-row, and Timeline tests. The two
  affected local Delete and ordinary Retry derivations now use `formatLocalCalendarDate`; queue,
  network, actor, and cache semantics are otherwise unchanged. Typecheck, lint (0 errors; 21 existing
  warnings), and diff-check pass. Candidate production hash is `2805d011…`; the frozen timezone test
  remains `1b014d4a…`. Fresh independent timezone/correctness review is running.
- 2026-07-17 — fresh AC-P3-DATE-1 correctness review returned `APPROVED` with no findings. It matched
  both hashes, passed 79/79 focused tests, typecheck, and diff-check, confirmed the two exact local
  date call sites and no remaining relevant UTC slicing, and traced exact local Today, Timeline root,
  summary, and duplicate-source invalidations plus local cache replay/server replacement. Queue,
  insert/remove, analytics, actor-aware Retry, and no-tombstone controls remain green; the Warsaw TZ
  helper proves activation and restores prior state in `finally`. Isolated REFACTOR is next.
- 2026-07-17 — isolated AC-P3-DATE-1 REFACTOR completed as a deliberate no-op. The two explicit
  `formatLocalCalendarDate` call sites are the clearest auditable shape: Delete consumes its date
  once, while Retry intentionally reuses one value for cache replay and invalidation. A two-call
  abstraction would not remove meaningful duplication. Focused remained 79/79 before and after,
  typecheck and diff-check pass, and both hashes are unchanged. The AC-P3-DATE-1
  RED/GREEN/review/REFACTOR chain is complete; all four findings from the last full review are now
  repaired and a fresh full gate/review cycle is next.
- 2026-07-17 — fresh post-repair full `npm run check` passed with `GATE_EXIT=0`: lint has 0 errors
  and 21 existing warnings, typecheck is clean, Jest passed 104/104 suites and 1146/1146 tests,
  Node passed 119/119 tests, and navigation/scaffold/i18n/string-budget/token/privacy/text-hygiene
  gates all passed. The existing Expo Go notification warning and reduced-motion `act(...)` test
  noise remain visible and unchanged. Two independent final full-diff and security/privacy reviews
  are running. The Phase 3 gate checkbox remains open because it also requires Phase 2 to land, and
  Phase 2 still depends on the owner's `selected_event_types` decision.
- 2026-07-17 — the two independent post-repair reviews returned `NEEDS FIXES` and reopened PR
  readiness with three compositional gaps now locked as AC-P3-ACTOR-7, AC-P3-ACTOR-8, and
  AC-P3-ERROR-2. Security review found that cross-caregiver synced-delete sentinels preserve the
  durable display creator in `created_by`, so the new visibility helper wrongly treats that creator
  as the local intent owner: it can hide A's own offline uncheck, expose A's local/private sentinel
  to B during A→B, and let refetch resurrect Done. It also found that create/detail write ports are
  not uniformly captured/live-actor-bound across awaited boundaries. Full-diff review found that a
  normal create finalizer rejection after `server_confirmed` can enter create `onError`, attempt an
  invalid terminal transition, and produce an unhandled rejection; the `onError` queue read is also
  unguarded. Reviewed evidence otherwise remained green: 241/241 focused actor/cache/Today tests,
  64/64 detail tests, 31/31 Supabase guardrails, typecheck, privacy scan, and diff-check; migration
  executable body remains `28816edf…`. Separate heavy isolated repair chains are next; the owner
  `selected_event_types` decision remains independently open.
- 2026-07-17 — AC-P3-ACTOR-7 heavy isolated RED is independently reproduced with exactly three
  expected failures / 79 unrelated passes across 82 mutation-port tests. The accepted, retryable,
  and permanent real `deleted_before_sync` shapes preserve durable display `created_by=B` while the
  local delete intent belongs to actor A. Current composition hides A's own target sentinel from A,
  exposes the sentinel plus synthetic private v2 title/note to B during same-puppy A→B before passive
  scrub, and can resurrect ordinary Done after a durable Timeline refetch. Shared durable and A-local
  controls remain green; the display row and localSync shape are exact-value locked. Typecheck and
  diff-check pass. Frozen test hash is `91579e30…`; Quick Log/hooks/visibility-helper production
  hashes remain `2805d011…`, `3dedc318…`, `1a7eb2f3…`, and `5842ec06…`. Production-only GREEN is next.
- 2026-07-17 — AC-P3-ACTOR-7 production-only GREEN is independently green at 82/82 frozen focused
  tests and 119/119 adjacent cached/Timeline/Today/storage tests. Local intent ownership now lives in
  a QueryClient-scoped sidecar and is restored from the persisted queue actor during hydration;
  durable display `created_by` and row shape remain byte-identical. Actor A synchronously sees its
  cross-caregiver delete sentinel, actor B does not, and an owner-known hidden sentinel still
  suppresses durable Done after refetch even when no other cached row is visible. Existing ordinary
  actor-local and shared durable semantics remain green. Typecheck, lint (0 errors; 21 existing
  warnings), and diff-check pass. Candidate hashes are `d2204c3c…` (Quick Log), `43d73ff4…`
  (visibility helper), `158fb45b…` (cached hook), and `5d2035c7…` (Timeline hook); frozen RED test
  remains `91579e30…`. Fresh independent correctness/security review is next.
- 2026-07-17 — fresh AC-P3-ACTOR-7 review returned `NEEDS FIXES`, so the GREEN is not accepted and
  the chain remains open. It confirmed a High A→B interleaving in automatic retained-delete drain:
  intent ownership is cleared after tombstone/remove but before the live-actor check and cached-row
  removal, so the remaining cross-caregiver sentinel falls back to display `created_by=B`, can render
  A-local/private state to B, and can survive the later scrub. It also found that true cold hydration
  into a fresh QueryClient synthesizes display creator A from the persisted intent actor because the
  original creator B is not restored; existing hydration coverage retained the old B row in the same
  client. The spec now explicitly locks owner retention until cache removal, per-QueryClient isolation,
  and fresh-client accepted/retryable/permanent hydration with authoritative display attribution.
  Frozen 82/82 and adjacent 119/119 remained green, as did typecheck, privacy scan, and diff-check;
  candidate hashes were unchanged. Expanded tests-only RED is next.
- 2026-07-17 — expanded AC-P3-ACTOR-7 tests-only RED is independently reproduced with exactly four
  expected failures / 83 passes across 87 focused tests, without act/timer/setup diagnostics. The
  prior 82/82 cases remain green and a new same-composite two-QueryClient isolation control is green.
  One failure switches A→B at the real automatic-finalize owner-clear boundary and proves B renders
  and scrub-retains the still-cached private sentinel. Three fresh-QueryClient accepted/retryable/
  permanent hydration failures prove that sidecar actor A is restored but display creator/timestamps
  are synthesized from the queue instead of composing the authoritative durable B row returned by
  Timeline. This cold path requires no schema change. Typecheck and diff-check pass. New frozen test
  hash is `55a5db2d…`; rejected GREEN production hashes remain unchanged. Revised production-only
  GREEN is next.
- 2026-07-17 — revised AC-P3-ACTOR-7 production-only GREEN is green at 87/87 frozen focused tests
  and 249/249 broad adjacent tests across eight suites. Owner metadata now remains attached while a
  cached sentinel exists; superseded actors leave it for actor-switch scrub, while restore and
  manual/automatic finalization remove localSync/sentinel before clearing the owner. Fresh-client
  hydration composes the authoritative durable caregiver-B row with persisted localSync and intent
  actor A, preserving display creator/timestamps byte-identically for accepted/retryable/permanent
  states and suppressing ordinary Done. QueryClient isolation remains green. Typecheck, lint
  (0 errors; 21 existing warnings), and diff-check pass. Candidate hashes are `bb9155be…` (Quick
  Log), `43d73ff4…` (visibility helper), `158fb45b…` (cached hook), and `47965855…` (Timeline hook);
  frozen tests remain `55a5db2d…`. Fresh re-review of the two prior findings is next.
- 2026-07-17 — AC-P3-ACTOR-7 re-review confirmed the prior High owner-clear race fixed and explicit
  two-QueryClient isolation green, but returned `NEEDS FIXES` for one remaining Medium cold-cache
  composition gap. The authoritative caregiver-B composition is written to the exact Timeline root,
  while synthetic actor-A sentinels remain in canonical unfiltered/day sibling caches. Under the
  normal ordering where the queue transition `updated_at` is newer than the durable server row,
  Diary cached-row aggregation selects the synthetic A display. The current cold tests used the
  reverse ordering and asserted the full row only in the root. AC-P3-ACTOR-7 now requires full-row
  authoritative reconciliation across every matching cache copy and reverse-timestamp coverage for
  all three states. Frozen 87/87, broad 249/249, typecheck, privacy, and diff-check remain green, but
  the chain stays open. A second expanded tests-only RED is next.
- 2026-07-17 — second expanded AC-P3-ACTOR-7 tests-only RED is independently reproduced with
  exactly three failures / 84 passes across the same 87 focused tests. Only the cold fresh-client
  accepted/retryable/permanent cases fail under the normal ordering `queue.updated_at` 12:00:05 >
  durable 12:00:02. The exact root is already authoritative B and the canonical day is empty, but
  canonical unfiltered retains the newer synthetic A sentinel, so the real Diary cached-row hook
  returns a byte-different A row instead of full B+localSync; accepted also resurrects in Timeline.
  Typecheck and diff-check pass. New frozen test hash is `600cbf9b…`; production hashes remain
  `bb9155be…`, `43d73ff4…`, `158fb45b…`, and `47965855…`. Second revised production-only GREEN is next.
- 2026-07-17 — second revised AC-P3-ACTOR-7 production-only GREEN is green at 87/87 focused tests
  across three consecutive runs and 249/249 broad adjacent tests across eight suites. Authoritative
  durable B plus localSync/intent actor A is reconciled into every existing sibling Timeline cache
  copy under the same root and composite identity; unrelated roots, filters, rows, and same-creator
  sentinel bytes are unchanged. The active fetch key converges through its returned merge result
  rather than in-query self-overwrite. Public Timeline synchronously excludes delete sentinels while
  Retry/history retains them through actor-filtered cached rows, closing observer-lag resurrection.
  Typecheck, lint (0 errors; 21 existing warnings), and diff-check pass. Candidate Timeline hash is
  `5ff785e5…`; Quick Log/helper/cached hashes remain `bb9155be…`, `43d73ff4…`, and `158fb45b…`;
  frozen tests remain `600cbf9b…`. Fresh final AC-P3-ACTOR-7 re-review is next.
- 2026-07-17 — final AC-P3-ACTOR-7 correctness/security re-review returned `APPROVED` with no
  findings. It matched all five hashes, passed 87/87 focused and 249/249 broad tests, typecheck,
  privacy scan, and diff-check, and verified reverse-timestamp sibling reconciliation, active-key
  convergence through the public merge, Timeline hiding versus owner history retention, exact
  root/filter/composite scoping, byte-identical same-creator rows, and continued closure of the
  owner-clear race, cold hydration, QueryClient isolation, sidecar lifecycle, and PII/error
  boundaries. Isolated REFACTOR is next.
- 2026-07-17 — isolated AC-P3-ACTOR-7 REFACTOR completed as a deliberate no-op. The explicit
  ordering and scoping are security-significant: cache removal precedes owner clear, the active
  query key is excluded from sibling writes, composition is cross-caregiver-only, and reconciliation
  is root/composite-scoped. Extracting shared helpers would hide audit boundaries or broaden an API
  without meaningful duplication reduction. Focused remained 87/87 before and after; typecheck and
  diff-check pass, and all five hashes are unchanged. The full AC-P3-ACTOR-7
  RED/GREEN/review/REFACTOR chain is complete; AC-P3-ACTOR-8 is next.
- 2026-07-17 — AC-P3-ACTOR-8 heavy isolated tests-only RED is independently reproduced with
  exactly 14 expected behavioral failures / 133 passes across 147 mutation-port and real-SQLite
  tests, without new import/setup/timer/act diagnostics. It covers retained A→B access through
  `createDetailed`, `createDetailedDurably`, `mutate`, and `updateDetails`; switches during create
  enqueue/durable catch read and details local read/atomic write/remote-before-cache; stable foreign,
  same-actor, and unmount controls; and real SQLite owner checks across pending/retryable/permanent
  editable states plus transactional rollback on supersession. Private v2 row/cache bytes, zero
  network/analytics/invalidation, and generic scrubbed reporting are locked without overlapping
  AC-P3-ERROR-2 finalizer semantics. Typecheck and diff-check pass. Frozen test hashes are
  `40f2bfb3…` and `aa763f60…`; production remains `bb9155be…` (Quick Log) and `69bef296…`
  (storage). Production-only GREEN is next.
- 2026-07-17 — AC-P3-ACTOR-8 production-only GREEN is independently green at 147/147 frozen focused
  tests (including a post-audit repeat) and 266/266 adjacent Quick Log tests across six suites.
  Create/durable-create/mutate variables are bound to the captured actor through the existing
  fresh-object lifecycle using a per-variables WeakMap and rechecked across enqueue/state/network/
  finalization awaits. Detail updates carry expected/live actor context into an exclusive SQLite
  transaction that checks owner and editable state in both the read guard and conditional write and
  rolls back on supersession. Generic reports contain only operation labels; unmount and AC-P3-ERROR-2
  semantics are unchanged. Typecheck, lint (0 errors; 21 existing warnings), and diff-check pass.
  Candidate production hashes are `7ba11597…` (Quick Log) and `0628c714…` (storage); frozen tests
  remain `40f2bfb3…` and `aa763f60…`. Fresh independent actor/transaction review is next.
- 2026-07-17 — fresh AC-P3-ACTOR-8 actor/transaction review returned `NEEDS FIXES`, so the GREEN is
  not accepted. It confirmed SQLite detail atomicity, reporting, unmount, and all 147 frozen tests,
  but found two High create-boundary gaps. First, module-global variables/context WeakMaps are mutable:
  actor B can reuse caller object V and overwrite actor A's in-flight binding, or one concurrent call
  can delete V while another still awaits, turning `undefined` into an unrestricted continuation.
  Second, supersession after `markSending`, successful server insert, or `server_confirmed` resolution
  can leave `sending`/`server_confirmed` private rows that normal hydration never recovers; the latter
  may coexist with a durable server row. The spec now locks a unique invocation token/clone and
  recoverable pre-insert versus terminal post-insert supersession without duplicate inserts. Review
  evidence otherwise passed 147/147 focused, 254/254 adjacent, typecheck, privacy, and diff-check;
  hashes were unchanged. Expanded tests-only RED is next.
- 2026-07-17 — expanded AC-P3-ACTOR-8 tests-only RED is independently reproduced with exactly six
  expected failures / 149 passes across 155 focused mutation-port/storage tests, without new React
  or console diagnostics. Three failures prove that shared caller object reuse lets B overwrite A's
  create/mutate binding or a first same-object completion delete the second call's guard; four unique
  fresh/durable clone controls remain green. Three lifecycle failures prove that supersession during
  `markSending` strands `sending`, immediately after a confirmed insert strands `sending` instead of
  terminal state, and after `server_confirmed` leaves a row actor-A startup hydration never cleans;
  already-completed terminal removal is green. Typecheck and diff-check pass. Frozen hashes are
  `20e9aa39…` (mutation port) and `aa763f60…` (storage test); rejected GREEN production remains
  `7ba11597…` and `0628c714…`. Revised production-only GREEN is next.
- 2026-07-17 — revised expanded AC-P3-ACTOR-8 production-only GREEN is green at 155/155 frozen
  focused tests and 274/274 broad adjacent tests across six suites. Every public create/mutate call
  now owns a unique invocation clone that separately keys actor, context, and cleanup; shared caller
  object reuse cannot collide across actors or concurrent calls. Superseded `sending` is atomically
  owner/state-guarded into retryable before any B effect; a confirmed insert is resolved terminal
  before supersession propagates, and actor-A hydration atomically removes owned `server_confirmed`
  without replay. Resolve/removal checks block B cache/analytics/invalidation, reporting is generic,
  scrubbed, and idempotent, and the detail transaction remains intact. Typecheck, lint (0 errors;
  21 existing warnings), and diff-check pass. Candidate production hashes are `6efa6f31…` (Quick
  Log) and `8bf4e27c…` (storage); frozen tests remain `20e9aa39…` and `aa763f60…`. Fresh re-review of
  both prior High findings is next.
- 2026-07-17 — AC-P3-ACTOR-8 re-review confirmed unique invocation isolation and recoverable/
  terminal supersession fixed, but returned `NEEDS FIXES` for two further High boundaries. First,
  liveness still compares only actor strings, so an obsolete port or paused A invocation revives
  after A→B→A. Second, adapters missing `markFailedRetryableIfOwned` or `removeIfState` emulate them
  through read-then-unrestricted write/remove, allowing a newer B row or intent with the same client
  id to be transitioned/deleted between awaits. The spec now requires a monotonically invalidated
  port/session epoch and fail-closed owner-bound production operations when atomic capabilities are
  absent. Reviewed evidence otherwise passed 155/155 focused, 262/262 adjacent, typecheck, privacy,
  and diff-check; hashes were unchanged. A second expanded tests-only RED is next.
- 2026-07-17 — second expanded AC-P3-ACTOR-8 tests-only RED is independently reproduced with
  exactly seven expected failures / 157 passes across 164 focused mutation-port/storage tests,
  without React/console diagnostics. Five epoch failures prove old A create/durable-create/mutate/
  details ports and a paused create revive after A→B→A; same-actor non-auth rerender remains green.
  Two fail-closed failures prove that missing atomic retry/removal capabilities transition or delete
  a newer B same-client-id row through read-then-unrestricted mutation. Real SQLite atomic owner
  mismatch/match and existing removal controls remain green. Typecheck and diff-check pass. Frozen
  tests are `a8e23922…` and `720c3d15…`; rejected production remains `6efa6f31…` and `8bf4e27c…`.
  Second revised production-only GREEN is next.
- 2026-07-17 — second revised AC-P3-ACTOR-8 GREEN reached all five epoch/ABA cases, both fail-closed
  adversarial races, and the real-storage atomic positive, but halted at 159/164 due to a frozen-test
  contradiction rather than a production ambiguity. Five older positive recovery/removal cases give
  their harness neither `markFailedRetryableIfOwned` nor `removeIfState` yet require unrestricted
  fallback mutation/removal; the two new security cases expose the same capability-absent interface
  and correctly require zero read-then-unrestricted effects. Production cannot distinguish these
  shapes safely. The unsafe fallback will not be restored. Tests-only reconciliation must give the
  intended positive harnesses explicit atomic capabilities while leaving capability absence only in
  negative fail-closed cases, then repeat GREEN verification.
- 2026-07-17 — AC-P3-ACTOR-8 tests-only spec reconciliation is complete without weakened assertions.
  Exactly five positive harnesses now expose faithful owner/state atomic capabilities for pending Undo
  removal, fresh/durable successful finalization, superseded-sending recovery, and the two later
  terminal cleanup paths; their existing controlled awaits and call-count/precondition assertions are
  preserved. The two missing-capability adversarial harnesses remain unchanged and pass independently
  2/2, while direct actorless legacy semantics remain unchanged. Strict production now passes 164/164
  focused tests; typecheck and diff-check pass. New frozen test hashes are `31bb8058…` and
  `720c3d15…`; strict production remains `c49fd86…` and `8bf4e27c…`. Broad GREEN verification is next.
- 2026-07-17 — reconciled AC-P3-ACTOR-8 GREEN is green at 164/164 focused tests, 2/2 exact
  capability-absent fail-closed tests, and 283/283 broad adjacent tests. Actor transition increments
  the port epoch synchronously during render, unmount increments it before clearing refs, and a
  same-actor rerender preserves it. Unique invocation clones capture actor plus epoch. The self-audit
  extended the same epoch-aware getter to retained delete/retry/undo/restore wiring, so every write
  port remains invalid across A→B→A and awaited boundaries. Missing owner-bound atomic retry/remove
  capabilities report a generic scrubbed operation and perform no read/write/remove; direct actorless
  legacy fallback remains only when there is no expected owner. Typecheck, lint (0 errors; 21 existing
  warnings), and diff-check pass. Candidate production hashes are `1b562a9e…` (Quick Log) and
  `8bf4e27c…` (storage); reconciled frozen tests are `31bb8058…` and `720c3d15…`. Final AC-P3-ACTOR-8
  re-review is next.
- 2026-07-17 — final AC-P3-ACTOR-8 re-review again returned `NEEDS FIXES`. It found that render-phase
  mutation of shared actor/epoch refs lets an abandoned speculative B render invalidate the still-
  committed A port, while unmount invalidation in passive effect cleanup is not synchronous with the
  unmount commit. It also traced two remaining owner-bound read-then-unrestricted retry/remove
  fallbacks outside the newly covered proxy selection paths. The spec now requires commit-safe
  synchronous layout-lifecycle token activation/invalidation with no render mutations and fail-closed
  behavior before any read at every owner-bound helper/call site when atomics are absent. Evidence
  otherwise passed 164/164 focused, 2/2 exact fail-closed, 271/271 broad, typecheck, privacy, and
  diff-check; hashes matched. A third expanded tests-only RED is next.
- 2026-07-17 — third expanded AC-P3-ACTOR-8 tests-only RED is independently reproduced with exactly
  four expected failures / 165 passes across 169 focused mutation-port/storage tests, without React/
  console diagnostics. Two lifecycle failures lock no render-phase actor/epoch mutation plus commit-
  safe synchronous layout activation/unmount invalidation. A deterministic commit-model control is
  green for abandoned B, committed A→B/ABA, same-actor preservation, and immediate post-unmount root
  callback; existing actual-hook transition/ABA/unmount tests remain green. Two helper failures prove
  direct create recovery and owner-bound shared removal still perform fallback reads/unrestricted
  retry/remove when atomics are absent, while the exact actorless legacy fallback positive remains
  green. Typecheck and diff-check pass. Frozen test hashes are `1e465d36…`, `720c3d15…`, and the
  unchanged mutation test `22dd0ddc…`; production remains `1b562a9e…` and `8bf4e27c…`. Third revised
  production-only GREEN is next.
- 2026-07-17 — third revised AC-P3-ACTOR-8 GREEN compiled and closed the new lifecycle/helper REDs,
  but halted at 198/212 across the three focused files because strict shared-helper fail-closed
  behavior exposed 14 more legacy-positive fixtures that require owner-bound Delete/Undo/restore/
  permanent-cleanup removal while their harness omits `removeIfState`. The new negative test presents
  the same capability-absent interface and correctly requires rejection before read/remove, so
  production cannot distinguish these cases. The unsafe fallback remains forbidden. A broader
  tests-only reconciliation must supply faithful atomic remove capability only to intended positive
  harnesses, preserve their state/owner/await assertions, and leave actorless/negative cases intact.
- 2026-07-17 — broader AC-P3-ACTOR-8 tests-only fixture reconciliation is complete without a global
  capability default or weakened assertions. Atomic `removeIfState` was added explicitly only to the
  14 intended positive cases: local-date Delete, permanent cleanup, cross-caregiver hydrated Undo,
  the ten authoritative delete-snapshot variants, and offline delete-intent Undo. The shared fake
  enforces expected state/actor and delegates to existing controlled remove gates, and each positive
  asserts the atomic invocation. Strict three-file tests pass 212/212; four missing-capability
  negatives pass 4/4 and remain capability-absent; true actorless legacy fallback passes 1/1.
  Typecheck and diff-check pass. Frozen tests are now `72c6185e…`, `720c3d15…`, and `22dd0ddc…`;
  strict production remains `de36b874…` and `8bf4e27c…`. Broad GREEN verification resumes next.
- 2026-07-17 — final reconciled AC-P3-ACTOR-8 GREEN snapshot is unchanged and green at 212/212
  focused tests, 4/4 exact capability-absent negatives, 1/1 exact actorless legacy success, and
  392/392 broad adjacent tests across 17 suites. Actor/session ref writes occur only in synchronous
  layout-effect commit transition/cleanup, never render. Direct create recovery, terminal hydration,
  bound success removal, proxy selection, and shared remove helper all fail closed before row reads
  when an expected actor lacks an atomic capability; only actorless legacy retains read→remove.
  Typecheck, lint (0 errors; 21 existing warnings), privacy scan, and diff-check pass. Final GREEN
  hashes are `de36b874…` and `8bf4e27c…`; frozen tests are `72c6185e…`, `720c3d15…`, and
  `22dd0ddc…`. Fresh independent final AC-P3-ACTOR-8 review is next.
- 2026-07-17 — fresh final AC-P3-ACTOR-8 review returned `APPROVED` with no findings. It matched all
  five hashes, passed 212/212 focused, 4/4 exact missing-capability negatives, 1/1 exact real-SQLite
  atomic test, and a conservative 17-suite broad set at 446/446, plus typecheck, privacy scan, and
  diff-check. Review verified commit-safe layout epoch lifecycle, synchronous transition/unmount
  invalidation, ABA and unique-invocation guards across every write port, supersession recovery and
  terminal cleanup without reinsertion/B effects, fail-closed owner-bound paths with actorless-only
  fallback, real/fixture atomics, detail privacy/reporting, and clean AC-P3-ERROR-2 separation.
  Isolated REFACTOR is next.
- 2026-07-17 — isolated AC-P3-ACTOR-8 REFACTOR completed as a deliberate no-op. Layout commit-token
  activation/cleanup, per-invocation clone binding, explicit checks before/after awaited boundaries,
  fail-closed capability branches, and the SQLite detail transaction encode security ordering
  locally; extraction would obscure those boundaries without reducing risk. Focused remained
  212/212 before and after; typecheck and diff-check pass, and all five hashes are unchanged. The
  full AC-P3-ACTOR-8 RED/GREEN/review/REFACTOR chain is complete; AC-P3-ERROR-2 is next.
- 2026-07-17 — AC-P3-ERROR-2 heavy isolated tests-only RED is independently reproduced with exactly
  two expected failures / 212 passes across 214 mutation-port/mutation/storage tests. A create
  `onError` queue-read rejection escapes raw and `onSettled` performs three unintended invalidations;
  the required contract preserves the sending row/cache, performs zero state/error-analytics/
  invalidation effects, keeps the original insert rejection caller-visible, and scrubbed-reports the
  secondary read failure without an unhandled rejection. A confirmed-success finalizer atomic-remove
  rejection currently attempts invalid `server_confirmed -> failed_retryable`, escapes/unhandles, and
  rejects an otherwise successful create; the required contract keeps exactly one insert, pending+
  logged analytics, authoritative cache without localSync, terminal A retention, B isolation, and
  later fresh-A atomic cleanup without reinsertion. AC8 exact 39/39 and storage 49/49 remain green;
  typecheck and diff-check pass. Frozen hashes are `069211e7…`, `b784e56f…`, and `720c3d15…`;
  production remains `de36b874…` / `8bf4e27c…`. Production-only GREEN is next.
- 2026-07-17 — AC-P3-ERROR-2 production-only GREEN is independently green at 214/214 focused tests
  and the full Jest unit gate at 104/104 suites and 1195/1195 tests. A create `onError` queue-read
  failure now scrubbed-reports `save_failure_read`, marks the context to skip all invalidation, and
  returns before classification/state/cache/failure-analytics while preserving the original insert
  rejection. A confirmed-success atomic-remove failure scrubbed-reports `save_finalize`, retains the
  actor-A `server_confirmed` row for later cleanup, and continues authoritative cache plus success
  analytics/invalidation without rejecting or reinserting. Typecheck, lint (0 errors; 21 existing
  warnings), privacy scan, and diff-check pass. Candidate Quick Log hash is `1889635c…`; frozen tests
  remain `069211e7…`, `b784e56f…`, and `720c3d15…`. Fresh independent error/finalizer review is next.
- 2026-07-17 — fresh AC-P3-ERROR-2 review confirmed the core GREEN but returned `NEEDS FIXES` for
  one High compositional adapter gap. The normal production sheet wrapper awaits safe core `onError`
  and then repeats an unguarded queue read to build the request event; persistent rejection escapes
  the callback and Query Core turns it into an unhandled promise. Durable acceptance catches the
  original insert failure and then performs another unguarded queue read, so secondary DB failure
  replaces the primary error without scrubbed reporting/classification. The direct MutationObserver
  RED bypassed both adapters. AC-P3-ERROR-2 now locks hook-level containment for `.mutate` and
  `createDetailedDurably` while preserving original errors. Core evidence remained 214/214 focused,
  full 1195/1195, typecheck, privacy, and diff-check with exact hashes. Expanded tests-only RED is next.
- 2026-07-17 — expanded AC-P3-ERROR-2 hook/production-port RED is independently reproduced with
  exactly two expected failures / 214 prior passes across 216 mutation-port/mutation/storage tests.
  Normal `mutation.mutate({ requestId })` performs two queue reads after an insert failure instead of
  owning the first classified read, and Query Core surfaces the second persistent rejection as an
  unhandled secondary failure while the mutation state still retains the original insert error.
  `createDetailedDurably` instead replaces its original insert rejection with the secondary
  acceptance-read rejection and emits no scrubbed report for that read. Typecheck and diff-check pass;
  deterministic `unhandledRejection` listeners are removed in `finally`. Frozen hashes are port test
  `cc2d8605…`, mutation test `b784e56f…`, and storage test `720c3d15…`; production remains Quick Log
  `1889635c…` and storage `8bf4e27c…`. Revised production-only GREEN is next.
- 2026-07-17 — revised AC-P3-ERROR-2 production-only GREEN is independently green at 216/216
  frozen focused tests and the full Jest gate at 104/104 suites and 1197/1197 tests. After the core
  `onError` marks a context whose queue read could not be safely classified, the production sheet
  wrapper now returns immediately, so it does not repeat the read, duplicate the scrubbed report,
  append a false request-event failure, invalidate, or create an unhandled rejection. Durable
  acceptance contains its distinct secondary read failure, scrubbed-reports only the generic
  `durable_acceptance_read` operation, and rethrows the original insert rejection. Initial
  `save_failure_read` / `save_finalize` behavior and AC-P3-ACTOR-8 remain green. Typecheck, privacy,
  and diff-check pass; lint has 0 errors and 21 existing warnings. Candidate Quick Log hash is
  `abcff6d4…`; storage remains `8bf4e27c…`, and all three frozen test hashes remain exact. Fresh
  independent final ERROR-2 correctness/security review is running.
- 2026-07-17 — fresh final AC-P3-ERROR-2 correctness/security review returned `APPROVED` with no
  Critical, High, Medium, or Low findings. It independently matched all five frozen hashes, reran
  216/216 focused plus 493/493 broad Quick Log/Today/actor tests, and confirmed that the core skip
  marker precedes its generic report; the normal hook consumes it before any duplicate read/event/
  invalidation; `onSettled` clears invocation state without invalidation; and durable acceptance
  contains its secondary read while rethrowing the original insert error. Confirmed-success
  terminal retention/cleanup, one network/analytics lifecycle, actor-B isolation, ACTOR-8 epoch/
  atomic guards, PII scrubbing, typecheck, privacy scan, and diff-check all remain intact. No edits
  were made. Isolated REFACTOR audit is next.
- 2026-07-17 — isolated AC-P3-ERROR-2 REFACTOR completed as a deliberate no-op. The WeakSet marker
  intentionally coordinates core `onError`, the normal sheet adapter, and `onSettled`; the nested
  durable-acceptance catch independently owns its secondary read while preserving the primary
  insert error. Extraction or boolean compression would obscure finalizer and actor/error-ownership
  boundaries without removing meaningful duplication. Focused remained 216/216 before and after;
  typecheck, privacy scan, and diff-check pass, and all five production/test hashes are unchanged.
  The complete AC-P3-ERROR-2 RED/GREEN/review/REFACTOR chain is closed. All independently actionable
  Phase 3 repair work is exhausted; Phase 2/PR readiness now waits only for the owner's exact
  `selected_event_types = NULL` privacy/schema decision.
- 2026-07-17 — the owner selected privacy option 1 and granted exact owner/CTO approval for
  selected-timeline schema hardening without applying it. AC-P2-SHARE-1..5 now require a present
  non-null/non-empty typed selection, a named validated CHECK, a strict `= ANY(...)` projection with
  no NULL-as-all fallback, ADR resolution, and pgTAP/static coverage. Read-only PuppyPlan Dev
  preflight returned zero selected scopes, zero NULL selections, and zero empty selections, so the
  migration needs no destructive cleanup or inferred backfill. Future apply preflight must fail for
  non-zero invalid counts rather than delete, revoke, or select all types. Heavy isolated RED is next.
- 2026-07-17 — AC-P2-SHARE heavy isolated tests-only RED is independently reproduced. The focused
  Zod suite has exactly four expected behavioral failures / 26 passes: request omission, request
  null, record null, and record empty; empty request, unknown enum, reversed dates, explicit valid
  lists, and another scope's null remain green. The static Supabase guardrail has exactly one expected
  failure / 31 passes because no semantic selected-timeline hardening migration exists. pgTAP plan
  count is locked from 118 to 126 with exactly eight new labeled assertions, but pgTAP was not run:
  Docker is disabled and no migration apply is authorized. Typecheck and diff-check pass. Frozen test
  hashes are `ff6c38a0…`, `63c12a59…`, and `963db51e…`; production contract/types and Observation
  executable-body hashes remain `937cea96…`, `f94082c0…`, and `28816edf…`. Production-only GREEN is next.
- 2026-07-17 — AC-P2-SHARE production-only GREEN is independently green. The selected-timeline
  request and record contracts now require an explicit non-null/non-empty event-type list; migration
  `20260717161449_harden_selected_timeline_share_scope.sql` adds and validates the conditional named
  CHECK and replaces the sanitized projection with strict `= ANY(...)` selection. The focused Zod
  suite passes 30/30, static SQL checks 32/32, aggregate Supabase guardrails 33/33, and typecheck,
  privacy scan, and diff-check pass. Remote push dry-run exits 0, lists only the new migration, and
  explicitly applies nothing. Frozen RED specs remain `ff6c38a0…`, `63c12a59…`, and `963db51e…`;
  generated types remain `f94082c0…`; the historical Observation executable body remains
  `28816edf…`. pgTAP source is prepared at plan 126 with eight new assertions but was not executed:
  Docker/local runner is unavailable and migration apply is not authorized.
- 2026-07-17 — fresh independent AC-P2-SHARE schema/privacy review returned `APPROVED` with no
  Critical, High, Medium, or Low findings. It confirmed the conditional constraint fails safely on
  legacy violations without DML/backfill/revocation, the replacement function preserves its grants,
  `SECURITY DEFINER`, empty search path, sanitized five-column shape, puppy/deleted/date filters, and
  removes the NULL-as-all path. The 126-test pgTAP source count and fixture transitions are internally
  consistent. Prepared-but-unexecuted pgTAP does not block PR preparation under the explicit no-apply
  constraint, but remains a mandatory runner/pre-apply gate and is not reported as green. A fresh
  full `npm run check` on this reviewed snapshot passed with exit 0 (lint: 0 errors, 21 existing
  warnings). Isolated behavior-preserving REFACTOR audit is next.
- 2026-07-17 — isolated AC-P2-SHARE REFACTOR completed as a deliberate no-op. Separate Zod
  refinements keep date and selection failures distinct; explicit `NOT VALID` → `VALIDATE` and
  strict `= ANY(...)` keep the privacy contract auditable, so compression would reduce clarity.
  Contracts remain 30/30, static SQL 32/32, aggregate Supabase guardrails 33/33, and typecheck,
  privacy scan, and diff-check pass. All seven contract/migration/test/type/history hashes remain
  exact; pgTAP still was not executed and no migration was applied. The complete AC-P2-SHARE
  RED/GREEN/review/REFACTOR chain and Phase 2 are closed. Phase 3 now proceeds to fresh full-diff
  product and security/privacy reviews before the authorized commit/push/PR actions.
- 2026-07-17 — final full-diff product review returned `APPROVE WITH NOTES` for PR creation with no
  validated Critical, High, or Medium findings. The independent security/privacy pass returned
  `APPROVED / NO SECURITY OR PRIVACY ISSUES` after 322/322 focused tests, 121/121 Node/static tests,
  typecheck, and privacy scan. It revalidated actor/epoch/unmount and atomic owner boundaries,
  terminal recovery, private sentinel/cache isolation, scrubbed observability, sanitized sharing,
  and absence of committed secrets. Both reviews explicitly classify real pgTAP/RLS execution and
  migration apply as later authorized gates, not completed evidence.
- 2026-07-17 — the three low, non-functional `git diff main --check` trailing-blank-line notes were
  cleaned in the two existing design comparison documents and `active-care-context.ts`. The final
  full `npm run check` passed with exit 0; lint remains 0 errors / 21 existing warnings, and all unit,
  Node, scaffold, navigation, i18n, token, privacy, text-hygiene, and type checks pass. Both current-
  worktree and full branch `git diff --check` are clean. A repeated remote dry-run exits 0, still
  lists exactly `20260717161449_harden_selected_timeline_share_scope.sql`, and applies nothing; all
  seven frozen AC-P2-SHARE hashes remain exact. Phases 1–2 and the Phase 3 local gate are closed;
  plan-authorized commit, push, and PR creation are next.
- 2026-07-17 — Phase 3 is complete. Closure commit `d7969fc` was pushed to the existing PUP-33
  branch and PR #32 (`PUP-33 Diary parity, durable offline writes, and selected-share privacy`) was
  opened against `main`: https://github.com/DmitrySelenya/puppyplan-app/pull/32. The PR body records
  live Phase 1 evidence, both owner decisions, full local/review evidence, unexecuted pgTAP/unapplied
  migration, and the still-open owner-device checklist. Linear PUP-33 now links the PR and is `In
  Review`; no merge, apply, release, or production action occurred.
- 2026-07-17 — Phase 4 started as Linear PUP-34 (`Routine lifecycle menu: Edit, Pause/Resume,
  Delete`) in `In Progress`, with the complete task contract and brief §5.1/§6.4/§8 references.
  Linear generated branch `dimaselenya/pup-34-routine-lifecycle-menu-edit-pauseresume-delete`; it
  will branch from the still-unmerged PUP-33 PR head as explicitly allowed by the plan. Design lock
  and pause-semantics verification precede any Phase 4 tests or UI code.
- 2026-07-18 — PR #32's GitHub `Local Gate` exposed a tests-only timezone portability defect in
  AC-P3-DATE-1: both cases passed on the Warsaw development host but failed on the UTC Ubuntu runner
  because Jest's sandboxed `process.env.TZ` mutation does not trigger Node's native timezone switch.
  Heavy isolated RED reproduced exactly 2 failures / 121 skipped under process-startup `TZ=UTC`.
  GREEN replaced only the unreliable test seam with exact-epoch local Date getters derived from
  explicit Europe/Warsaw `Intl` parts, continued to execute the real `formatLocalCalendarDate`, and
  preserved every Delete/Retry cache, invalidation, queue, and network assertion. Coordinator and
  GREEN-context verification both pass focused 2/2 and full-file 123/123 under `TZ=UTC`; REFACTOR is
  a deliberate no-op. Production/config/dependencies remain untouched. The fresh full local gate
  exits 0 with 104/104 Jest suites, 1207/1207 tests, Node 121/121, and all remaining gates green.
  Independent final diff review returned `Ready` with no Critical/High/Medium, privacy/security, or
  release-guardrail finding. A second fresh post-review `npm run check` passed with the same evidence,
  and the owner-authorized local commit records this follow-up. No push, merge, migration apply,
  release, production, or other remote repository action occurred.
