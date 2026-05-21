# ADR-0005: Universal Links And App Links For Production Deep Links

Status: Accepted

## Context

Invites and trainer shares are trust-sensitive flows. Custom URL schemes are convenient for development but are weaker for production routing and platform trust.

## Decision

Use iOS Universal Links and Android App Links for production `/invite/*` and `/share/*` flows. Keep `puppyplan://` only as a development/test fallback.

## Consequences

- CI/release checks must validate AASA and `assetlinks.json`.
- Pending deep-link intent is stored safely through auth/onboarding gates.
- Web fallback must be available for trainer share views.
