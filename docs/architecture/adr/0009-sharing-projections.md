# ADR-0009: Sharing Uses Sanitized Projections

Status: Accepted

## Context

Trainer shares need scoped read-only access without making trainers household members or exposing base tables.

## Decision

Use `share_link` and `share_scope` as PRD names. Public/trainer read access goes through sanitized projections such as `share_link_view` and scope-specific views/RPCs. Base tables remain protected by RLS.

## Consequences

- Permission preview must use the same projection as the actual shared view.
- `health_summary` excludes notes, provider names, photos, media paths, and raw health metadata.
- Revoked or expired share links lose access immediately.
