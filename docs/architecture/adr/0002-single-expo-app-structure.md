# ADR-0002: Single Expo App Structure

Status: Accepted

## Context

The product needs native iOS and Android behavior, quick iteration, and low architectural overhead. A monorepo or multiple packages would add ownership and CI complexity before the MVP proves retention.

## Decision

Use one Expo native app with Expo Router. `app/` contains routes and layouts only. Product code lives under `src/features`, shared infrastructure under `src/lib`, UI infrastructure under `src/design`, and contracts under `src/contracts`.

No Turborepo, `packages/ui`, or multi-app workspace in MVP.

## Consequences

- Boundary enforcement must come from lint rules and ownership docs, not package isolation.
- A workspace can be introduced later only through ADR if backend/client contract sharing becomes painful.
