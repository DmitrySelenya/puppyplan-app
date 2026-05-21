# ADR-0008: Privacy-Safe Analytics And Logging

Status: Accepted

## Context

The app stores household routines, puppy health context, invite tokens, push tokens, and potentially sensitive notes. Observability must not leak this data.

## Decision

Use typed analytics events and Sentry wrappers with PII scrubbing. Disable session replay in MVP. Do not log raw notes, emails, puppy names, tokens, media URLs, share scopes, invite tokens, push tokens, or notification bodies.

## Consequences

- Analytics events are defined in contracts and reviewed like API changes.
- Sentry breadcrumbs use identifiers and categories, not sensitive payloads.
- Any new SDK requires a privacy review and platform form update.
