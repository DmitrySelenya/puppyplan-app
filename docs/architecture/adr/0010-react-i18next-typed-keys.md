# ADR-0010: react-i18next With Typed Keys

Status: Accepted

## Context

The product is multilingual from beta inputs and includes Russian copy. Inline strings and untyped keys would make UI regression likely, especially with compact mobile controls.

## Decision

Use `react-i18next` with typed keys generated from the English master string file. Enforce EN/RU key parity, ICU plurals, missing-key failures, and string-budget checks in CI.

## Consequences

- No inline user-facing strings in feature code.
- RU plural categories must be tested.
- RTL is not enabled in MVP, but layout code should use start/end conventions.
