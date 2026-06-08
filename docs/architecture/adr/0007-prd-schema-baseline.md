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
- max 5 selected ids;
- allowed tracker id constraint;
- uniqueness constraint;
- existing `puppy` owner insert/update RLS policies.

Reason: selected quick tracker order is per puppy, low-cardinality profile state. Keeping it on `public.puppy` avoids a new table and broader RLS surface.
