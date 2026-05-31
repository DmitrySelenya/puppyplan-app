# Backend Topology

## Platform

Use Supabase as the backend platform:

- Postgres as durable source of truth;
- Auth for anonymous, magic link, Apple, Google;
- RLS for row access;
- Storage for private media;
- Realtime as enhancement only;
- Edge Functions for privileged flows.

No custom backend service in MVP.

## Schemas

Use two Postgres schemas:

- `public`: client-readable/writable tables with RLS;
- `app_private`: token hashes, audit internals, SECURITY DEFINER helpers, service-only data.

First migration must include:

```sql
REVOKE ALL ON SCHEMA app_private FROM anon, authenticated;
```

## Migrations

Only Supabase CLI migrations are allowed:

```text
supabase/migrations/YYYYMMDDHHMMSS_<slug>.sql
```

No manual schema changes in Supabase Studio.

Every migration PR must include:

- migration SQL;
- `supabase db diff` output if applicable;
- pgTAP/RLS tests;
- regenerated `database.types.ts`;
- updated Zod contracts;
- ADR if the change departs from the ADR-0007 schema baseline / PRD §6 "Модель Данных".

## RLS Helpers

Use a stable helper for household-scoped access:

```sql
CREATE OR REPLACE FUNCTION public.current_household_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT household_id
  FROM public.household_membership
  WHERE user_id = auth.uid()
    AND revoked_at IS NULL
    AND accepted_at IS NOT NULL
$$;
```

## Edge Functions

MVP Edge Functions:

- `create_household_invite`
- `accept_invite`
- `create_share_link`
- `accept_share_link`
- `revoke_share`
- `register_device_push_token`
- `send_trusted_sitter_completion`

Future:

- `revenuecat_webhook`
- `delete_account_request`
- `export_data_request`

SECURITY DEFINER helpers live in `app_private` by default, set `search_path = app_private, public`, and check `auth.uid()` explicitly.

Client-callable privileged RPCs may live in `public` only when they must be exposed through Supabase/PostgREST. They must be SECURITY DEFINER, set a pinned empty `search_path`, fully qualify every referenced object, check `auth.uid()` explicitly, and grant EXECUTE only to the narrow intended roles. `public.bootstrap_current_user(text)` is the PUP-18 bootstrap exception; see ADR-0017.

## Privileged Mutation Boundary

The following transitions must not be exposed as direct client table writes:

- create, accept, revoke, or expire household invites;
- create the first household and accepted owner membership for a newly authenticated user;
- create, accept, revoke, or expire external share links;
- change share scopes;
- write token hashes, token metadata, or audit internals;
- register or disable push tokens in a way that bypasses ownership checks.

Clients call Edge Functions or typed RPC wrappers. Those server entry points validate Zod contracts, check `auth.uid()` explicitly, and perform the write in one transaction.

RLS must still deny direct table mutation from `anon` and normal `authenticated` clients unless a table is intentionally client-writable for a narrow non-sensitive action. Edge Function correctness is not a substitute for table-level denial tests.
