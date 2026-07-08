# ADR-0021: Durable Local-Write Strategy — Shared Outbox Engine vs Capped Exceptions

- **Статус:** Proposed (draft for owner decision; recommendation is Option A)
- **Дата:** 2026-07-08
- **Авторы:** Claude (draft) + Product/Engineering decision pending
- **Связанные:** ADR-0004 (Quick Log queue; explicitly says "Broader outbox behavior requires a future ADR" — this is that ADR), ADR-0019 (Health outbox), `docs/plans/active/2026-07-04-health-offline-outbox.md`, master roadmap offline invariant
- **Влияет на workstreams:** Data Access | Today/Quick Log | Health/Guidance | Sharing/Reminders | QA/Release

## Контекст

The original rail was "Expo SQLite only for the Minimal Durable Quick Log Queue — the only
durable local-write exception in MVP." ADR-0019 added a second durable path: a separate Health
outbox under `src/lib/queue/health-outbox/` with its own schema, state machine, claim path, and
retry classification. That was the right call for its slice (ADR-0019 correctly rejected widening
the Quick Log table), but the rail is now cracked: two bespoke outboxes with duplicated
retry/state-machine concepts and independently evolving semantics. Reminders (PUP-26) and
sharing pending-intents are plausible third and fourth candidates. Per repo rules, silent
failures in this layer lose user data — divergent per-feature retry/dedupe/error semantics are
exactly where that risk accumulates. This ADR decides the strategy before a third queue appears.

## Рассмотренные варианты

### Вариант A — Shared outbox engine, per-domain schemas (recommended)

Extract the engine-level concepts that ADR-0019 duplicated — state machine states/transitions,
claim/lease semantics, retry classification and backoff, migration plumbing, quarantine rules,
scrubbed-error reporting — into a shared `src/lib/queue/engine/` module. Each domain (Quick Log,
Health, future Reminders) keeps its **own** SQLite tables, payload Zod contracts, privacy rules,
and idempotency keys, and plugs into the engine via a narrow adapter (payload contract +
sync executor + dedupe policy). This is not the "one generic table" that ADR-0019 rejected:
storage stays per-domain; only behavior code is shared.

Плюсы:
- One tested implementation of the highest-risk semantics (retry, claim, quarantine, no-silent-catch).
- A third durable write (reminders) becomes an adapter, not a third hand-rolled queue.
- Preserves ADR-0004/0019 boundaries: Quick Log hot path and Health privacy rules stay separate.

Минусы:
- A refactor touches the two most data-critical modules; needs heavy TDD and staged migration.
- Engine abstraction chosen from only two concrete cases risks being slightly wrong for the third.

### Вариант B — Cap at two bespoke exceptions

Declare Quick Log queue and Health outbox the only durable local writes for MVP. Any third
durable write is forbidden without a new ADR; reminders and sharing use read-only cache,
temporary drafts, or online-only writes.

Плюсы: no refactor risk; both existing modules are already tested.
Минусы: duplicated semantics stay and drift; the cap likely breaks at PUP-26 (offline "mark
routine done" is a natural reminder expectation), forcing this decision later under feature
pressure instead of now.

### Вариант C — Per-feature bespoke outboxes on demand (status-quo trajectory)

Keep copying the ADR-0019 pattern per feature.
Плюсы: each slice ships independently.
Минусы: N implementations of retry/dedupe/error semantics in the exact layer where silent
failure loses user data; rejected.

## Решение

**Proposed: Вариант A**, with sequencing guardrails:

1. **Decision now, migration later.** Accepting this ADR does not start the refactor. The active
   health-outbox plan finishes its current scope (enqueue-on-failure + drain wiring) against the
   existing ADR-0019 module unchanged.
2. **Engine extraction is its own scoped issue** (heavy/full-isolated TDD), executed after the
   health outbox is wired and stable, and **before or together with** the first PUP-26 slice that
   needs durable reminder writes. Extraction is behavior-preserving: existing Quick Log and
   Health tests must pass unchanged except for import paths.
3. **Quick Log migrates last** (hottest path, strictest invariants: 3s double-tap, 60s
   duplicate-care, `client_event_id` idempotency). If engine extraction ever forces a Quick Log
   behavior change, that is a spec defect — halt and revisit this ADR.
4. Until extraction lands, Вариант B's cap applies operationally: no third bespoke queue.

## Последствия

- **Положительные:** one place to harden the loss-of-data layer; new offline writes become
  cheap and uniform; the offline invariant ("non-Quick-Log writes are not silently promised as
  durable") gets a single enforcement point.
- **Отрицательные:** one significant refactor of critical modules; interim period where the
  engine exists alongside not-yet-migrated Quick Log code.
- **Обратимость:** средняя — adapters can be re-inlined if the engine abstraction fails.
- **Триггеры пересмотра:** PUP-26 reminders needing durable writes before extraction lands;
  a third domain requesting offline writes; engine abstraction requiring >2 domain-specific
  branches (sign the abstraction is wrong).

## Action items

- [ ] Owner decision: accept Вариант A (or choose B) — update Статус and this checklist.
- [ ] After acceptance: create the engine-extraction Linear issue + feature plan (heavy TDD,
      behavior-preserving, Health first, Quick Log last).
- [ ] Update `AGENTS.md` tech-stack line ("Expo SQLite only for the Minimal Durable Quick Log
      Queue") to reference this ADR's strategy once accepted.
- [ ] PUP-26 planning must consult this ADR before promising any offline reminder behavior.
