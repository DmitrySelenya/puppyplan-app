# ADR-0019: Health Offline Outbox Uses A Separate SQLite Queue

- **Status:** Accepted
- **Date:** 2026-07-04
- **Authors:** Codex + Product/Engineering approval
- **Related:** ADR-0004, PRD Health Basics, DESIGN §4.1.3, `docs/plans/active/2026-07-04-health-offline-outbox.md`
- **Impacts workstreams:** Data Access | Health/Guidance | QA/Release

## Context

The V2 Pet Health Add Record flow has production create/list/edit/delete/restore wiring, but the
Add Record row in `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md` remains blocked by offline
write behavior. ADR-0004 intentionally keeps the existing SQLite queue limited to unsent Quick Log
routine events. Health records are more sensitive than routine events because they may contain notes
and provider names, and Health retry must preserve the original actor in `updated_by` instead of
silently replaying legacy rows as the current session user. This slice is approved as JS-only with
the already installed Expo SQLite runtime. It must not add native dependencies, rebuild native code,
or change Supabase schema/RLS.

## Considered Options

### Option A - Extend the existing Quick Log queue table

Reuse `queue_item` and widen it with a generic operation type that can store health-record drafts.

Pros:
- One SQLite database and one claim/retry implementation.
- Less initial storage boilerplate.

Cons:
- Violates ADR-0004's "routine-event payloads only" boundary.
- Requires broadening `event_type` and Quick Log payload validation into a generic outbox shape.
- Increases risk that Quick Log retry, undo, and dedupe behavior regresses while adding Health.
- Makes Health notes/provider-name privacy rules harder to keep separate from Quick Log payloads.

### Option B - Add a separate Health outbox table/database under the queue module

Create a narrow Health Record outbox with its own local schema, state machine, claim path, retry
classification, and operation payload contract. Keep Quick Log queue files and database unchanged.

Pros:
- Preserves ADR-0004 and the Quick Log hot path.
- Keeps Health privacy rules explicit and testable.
- Allows health-specific operation payloads for create/update/delete/restore without pretending they
  are routine events.
- Keeps rollback simple because the change is JS-only local storage and query integration.

Cons:
- Some retry/state-machine concepts are duplicated.
- Requires a second local schema version and focused tests.

### Option C - Use TanStack persisted mutations

Persist Health mutations through TanStack Query instead of a project-owned outbox.

Pros:
- Less custom storage code.

Cons:
- Rejected by ADR-0004 for the core queue because it does not provide an independent business state
  machine.
- Harder to guarantee `created_by`/`updated_by` preservation and missing-actor quarantine.
- Harder to enforce scrubbed error categories and no silent catch behavior.

## Decision

Use Option B: a separate, narrow Health outbox under `src/lib/queue/health-outbox/`.

The Health outbox stores only Health Record operations needed by the current V2 Add Record and detail
flows:

```text
create | update | delete | restore
```

It uses Expo SQLite through the same JS runtime family as ADR-0004 but with a separate local schema,
storage contract, and state machine. The Quick Log queue remains Quick Log-only and must not be
converted into a generic durable outbox.

Required properties:

- JS-only; no new native dependencies and no native rebuild.
- No Supabase schema, migration, RLS, or generated DB type changes.
- Operation payloads preserve the original actor (`updated_by`/draft `userId`) and never replay
  legacy rows with missing actor as the current session user.
- Errors are persisted as scrubbed categories only.
- Raw notes, provider names, puppy names, emails, photos, tokens, backend messages, or private
  content are not logged or placed in observability metadata.
- No silent catch. Replay errors either surface to the caller or are classified and recorded with
  non-PII context.
- Query integration reuses the existing typed Health Record repository and invalidation contracts.

## Consequences

- **Positive:** Quick Log queue semantics remain stable; Health retry behavior can be tested without
  mutating the routine-event table.
- **Positive:** Health-specific privacy and actor-preservation invariants are explicit.
- **Negative:** State machine and SQLite storage patterns are duplicated in a small second module.
- **Negative:** This is a narrow Health Record outbox, not a broad local-first sync engine.
- **Reversibility:** Medium. The Health outbox can be removed or replaced without migrating Quick Log
  rows because it uses a separate local schema.
- **Review triggers:** Add another entity type, add attachments/photos, require conflict resolution,
  require schema/RLS changes, or make beta data show that a generic offline mutation system is needed.

## Action Items

- [x] Create `docs/plans/active/2026-07-04-health-offline-outbox.md`.
- [x] Add TDD coverage for Health outbox contracts, state transitions, claim/retry, and missing actor
  quarantine.
- [x] Implement a JS-only Health outbox using existing Expo SQLite.
- [x] Wire Health create/update/delete/restore replay through the existing typed repository/query
  boundary.
- [x] Update `docs/plans/active/2026-06-29-v2-nav-redesign-gaps.md` with verification evidence.
- [ ] Wire the mutation path end-to-end: enqueue failed Health mutations into the outbox and add a
  reconnect/startup drain trigger that calls the processor. Until this lands, the outbox core is
  implemented and tested but provides no runtime durability (2026-07-05 review audit).
