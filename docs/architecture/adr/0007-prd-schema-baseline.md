# ADR-0007: PRD Data Model Is The MVP Schema Baseline

Status: Accepted

## Context

One critique proposed splitting notes/private fields into extra tables and renaming share tables. The backend review rejected this because it expands RLS surface and diverges from the PRD without solving the privacy problem better.

## Decision

Keep PRD section 6.10 names and shape for MVP. Do not split `event_log` into `event_notes`, do not split `health_record` into `health_record_notes`, and do not rename `share_link/share_scope`.

## Consequences

- Privacy is enforced through RLS, sanitized views/RPCs, and explicit projections.
- Future schema deltas require ADR, migration tests, and contract updates.
- Historical design audit findings are design QA input, not schema authority.
