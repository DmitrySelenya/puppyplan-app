# ADR-0007: PRD Data Model Is The MVP Schema Baseline

Status: Accepted

## Context

One critique proposed splitting notes/private fields into extra tables and renaming share tables. The backend review rejected this because it expands RLS surface and diverges from the PRD without solving the privacy problem better.

## Decision

Keep the PRD §6 "Модель Данных" names and shape for MVP. Do not split `event_log` into `event_notes`, do not split `health_record` into `health_record_notes`, and do not rename `share_link/share_scope`.

## Consequences

- Privacy is enforced through RLS, sanitized views/RPCs, and explicit projections.
- Future schema deltas require ADR, migration tests, and contract updates.
- Historical design audit findings are design QA input, not schema authority.

## Approved Additive Deltas

### 2026-06-08: `public.puppy.quick_tracker_ids`

Approved for `PUP-21` after the Post-PUP-18 batch storage gate.

`public.puppy` stores ordered selected Quick Log tracker ids in `quick_tracker_ids text[]` with:

- default ids matching the first-screen Quick Log defaults;
- at least 1 selected id;
- max 5 selected ids;
- allowed tracker id constraint;
- uniqueness constraint;
- existing `puppy` owner insert/update RLS policies.

Reason: selected quick tracker order is per puppy, low-cardinality profile state. Keeping it on `public.puppy` avoids a new table and broader RLS surface.

### 2026-06-23: Canonical Quick Log tracker taxonomy

Approved for the V2 redesign intake taxonomy pass.

The Quick Log selected-tracker vocabulary is reconciled to the canonical ids:

- `potty`
- `feeding`
- `sleep`
- `walk`
- `zoomies`

`weight` remains a Health record concept and is not a loggable Quick Log tracker or `event_log` event type for this pass. `zoomies` remains named `zoomies`; it is not renamed to `play`.

`public.event_type` adds `walk`. Potty Quick Log events remain `event_type = 'potty'` and carry `payload.subtype` constrained by contracts to `outside`, `inside`, or `poop`; new Quick Log writes do not use the legacy `payload.quick_action` field.

Migration `supabase/migrations/20260623120000_canonical_quick_log_tracker_taxonomy.sql` preserves existing data by:

- mapping selected `quick_tracker_ids` values `potty_pee_outside`, `potty_pee_inside`, and `potty_poop` to one `potty` id;
- preserving canonical tracker order as much as possible and deduplicating after mapping;
- removing unknown selected ids before the final allowed-id constraint is applied;
- repairing empty mapped selections to the canonical default;
- rewriting existing potty `event_log` payloads from legacy `quick_action = pee_outside|pee_inside|poop` to canonical `subtype = outside|inside|poop`, while leaving already-canonical subtype payloads unchanged.

Reason: V2 collapses three potty tiles into one operational tracker while keeping subtype as event data. This stays within the ADR-0007 table model, avoids new tables, preserves history, and keeps RLS ownership on the existing `puppy` and `event_log` policies.

### 2026-07-11: Neutral observation event type and payload version 2

Approved for PUP-31 under ADR-0022.

`public.event_type` adds `observation`. Observation is a neutral factual event and requires a short
title or non-empty private note at the typed contract boundary. It is not training, diagnosis, or
health guidance and is excluded from training-note and broad routine-summary projections.

Existing `event_log.payload` remains `jsonb`; payload-version-1 rows remain readable. Strict
payload-version-2 contracts may add bounded private note and sleep-action fields without a table
split. Migration `20260711180000_event_observation_payload_v2.sql` is additive and does not rewrite
existing data or change RLS. Applying it to PuppyPlan Dev remains a separate approval gate.

### 2026-07-17: Explicit selected-timeline event-type scope

Approved by the owner/CTO for PUP-33 as an additive privacy hardening. A
`selected_timeline_range` share scope must contain an explicit, non-null, non-empty
`selected_event_types` list. The named conditional CHECK preserves nullable values for other scope
types, and `current_share_selected_timeline()` includes rows only when their event type is in that
explicit list.

Migration `20260717161449_harden_selected_timeline_share_scope.sql` adds and validates the
conditional CHECK and replaces only the sanitized selected-timeline projection. It does not infer
an all-types selection, backfill or delete data, change RLS, or change the generated database type:
the column remains nullable because non-selected scopes may still store null.
