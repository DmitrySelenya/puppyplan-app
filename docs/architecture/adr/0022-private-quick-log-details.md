# ADR-0022: Private Quick Log Details In Versioned Event Payloads

- **Статус:** Accepted (owner approval recorded 2026-07-11)
- **Дата:** 2026-07-11
- **Авторы:** Product owner + Data Access / Today & Quick Log
- **Связанные:** ADR-0004, ADR-0006, ADR-0007, ADR-0008, ADR-0009, ADR-0021,
  `docs/plans/active/2026-07-11-dogfood-core-loop.md`
- **Влияет на workstreams:** Data Access | Backend | Today/Quick Log | Sharing/Reminders |
  QA/Release

## Контекст

Dogfood fact capture must preserve the time and optional private context that currently live in
external household notes. The accepted Quick Log queue deliberately forbids free text without a
new ADR, while existing payload-version-1 rows must remain readable. Adding a notes table would
expand the RLS and join surface and conflict with ADR-0007. Dropping a note while offline or during
retry would silently lose user data. Lock-screen notifications, analytics, logs, observability,
and broad sharing projections must not expose the new private text.

## Рассмотренные варианты

### Вариант A — Versioned payload in the existing event and queue (chosen)

Add strict payload-version-2 union branches. Store an optional trimmed `note` of 1–500 characters
inside the existing event payload and the existing Quick Log SQLite queue until server
confirmation. Keep version 1 readable.

Плюсы: one durable command, existing idempotency and retry lifecycle, no new table or queue.
Минусы: the existing queue becomes a private-text boundary and needs stronger privacy tests.

### Вариант B — Separate `event_notes` table

Плюсы: physically separates note data. Минусы: additional RLS policies and joins, harder offline
atomicity, and direct conflict with ADR-0007's rejected schema split.

### Вариант C — Keep notes only in memory

Плюсы: no durable privacy expansion. Минусы: loses text on restart, offline retry, or process death;
rejected because silent loss violates the product and architecture contract.

## Решение

Choose Variant A with these hard boundaries:

1. Existing payload-version-1 event rows remain readable and are never rewritten merely to add
   version 2 support.
2. New detailed shapes use strict version-2 Zod union branches at data boundaries. Unknown fields
   and unsupported versions are rejected before enqueue.
3. `note` is optional, trimmed, and limited to 500 Unicode characters. An empty trimmed note is
   omitted. Observation requires a short title or a non-empty note.
4. The existing Quick Log `queue_item.payload_json` may contain the validated note. Durable enqueue
   completes before server insert; retry preserves the exact validated payload; server confirmation
   removes the queue copy. Permanent failure remains visible with Retry/Delete.
5. Queue storage never logs raw payload JSON or raw server errors. Scrubbed error categories only.
6. Notes and observation text are excluded from analytics, observability, notification title/body,
   delivery logs, routine-summary projections, and training-note projections. Base-table access
   remains protected by existing household RLS.
7. Notification content uses canonical event labels and scheduled time only, even when a custom
   title or note exists.
8. `observation` is an additive `public.event_type` value governed by ADR-0007. It does not enter
   training projections or broad routine summaries without a future explicit redesign.
9. No new local-write queue is introduced. ADR-0021's shared-engine sequencing remains unchanged.
10. Applying the migration to PuppyPlan Dev, regenerating DB types from a remote schema, and any
    production action require separate exact approval.

## Последствия

- **Положительные:** detailed facts survive offline/retry atomically; v1 history remains readable;
  no extra schema table or third queue; privacy exclusions are explicit and testable.
- **Отрицательные:** SQLite queue backups now temporarily contain private text; contracts, queue,
  RLS/share projections, and privacy scans require heavy/full-isolated TDD.
- **Обратимость:** средняя — version-2 writes can be disabled while readers retain compatibility;
  PostgreSQL enum values cannot be removed safely without a follow-up migration.
- **Триггеры пересмотра:** notes need independent retention/deletion policy; media is requested;
  sharing needs opt-in note projection; payload size or queue encryption requirements change.

## Action items

- [x] Add RED tests for v1 compatibility and strict v2 payload/note/sleep/observation rules.
- [x] Extend queue storage/retry/privacy tests before enabling detailed writes.
- [x] Add pgTAP negatives proving observation/note exclusion from share projections.
- [x] Apply the separately approved additive migration to PuppyPlan Dev, regenerate hosted types,
  and review the generated diff (only the expected enum union and Constants entries changed).
- [x] Complete and approve Stage 0 design locks before Quick Log UI implementation.
