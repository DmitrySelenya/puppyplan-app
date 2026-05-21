# ADR-0006: Supabase Migrations And pgTAP Are Mandatory

Status: Accepted

## Context

RLS correctness is central to household, invite, and trainer-share privacy. Manual database edits would make future agents unable to reproduce or review security state.

## Decision

All schema changes use Supabase CLI migrations under `supabase/migrations/`. Every migration PR includes migration SQL, pgTAP/RLS tests, regenerated DB types, updated Zod contracts, and schema diff/destructive-change evidence.

Manual Supabase Studio schema edits are forbidden.

## Consequences

- RLS regressions block merge.
- SECURITY DEFINER helpers live in `app_private` and set a constrained search path.
- Schema changes that depart from PRD baseline need ADR-0007 follow-up.
