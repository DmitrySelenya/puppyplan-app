# ADR-0001: Multi-File Architecture Documentation

Status: Accepted

## Context

The first architecture draft was a single large document. Reviewers asked for a structure future agents can navigate by ownership area without rewriting unrelated decisions.

## Decision

Architecture lives under `docs/architecture/` as numbered topic files, ADRs, Mermaid diagrams, and meeting notes. Do not create or maintain a root `ARCHITECTURE.md`.

## Consequences

- Changes must update the specific architecture file, matching diagram, and ADR when a decision changes.
- `_meeting/` remains historical context and is not stronger than accepted ADRs.
- Future agents should start with `00-overview.md`, then the topic file for their workstream.
