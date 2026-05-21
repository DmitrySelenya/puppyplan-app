# ADR-0014: OTA Updates Disabled For MVP

Status: Accepted

## Context

OTA updates can speed iteration but add rollback, channel, and review-policy complexity. The beta architecture already includes native notifications, deep links, and platform compliance work.

## Decision

Disable EAS Update/OTA for MVP. Ship changes through normal TestFlight and Play Internal Testing release channels.

## Consequences

- Fewer runtime-version and rollback risks during beta.
- Release cadence is slower but clearer.
- Reintroducing OTA requires ADR covering channels, rollback, compliance, and observability.
