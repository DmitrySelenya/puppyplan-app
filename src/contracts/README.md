# Contracts

Shared PuppyPlan semantic contracts live here.

`navigation.ts` was the scaffold-time contract. Product payload schemas, business rules, generated DB type re-exports, analytics events, and Edge Function request/response schemas belong here when their owning Linear issue touches the shared semantic boundary.

PUP-3 owns the first Supabase baseline contract:

- MVP role, event type, and share scope vocabulary.
- Event, invite/share, health, reminder, notification, entitlement, media, content, and local Quick Log queue schemas.
- Generated Supabase DB types workflow against the remote non-production dev database.

Generate DB types from the non-production Supabase dev project or branch. The preferred path uses the hosted project ref and Supabase CLI auth, which does not require local Docker:

```bash
npm run db:types
```

Set `SUPABASE_PROJECT_REF=olymqppxsadsxfrcyskh` in local `.env` and authenticate with `npx supabase login`, or set `SUPABASE_ACCESS_TOKEN` in the shell. `SUPABASE_DB_URL` type generation is available only as a Docker-capable CI/cloud fallback because Supabase CLI 2.101.0 tries to inspect Docker images for `gen types --db-url`.

Local Supabase Docker type generation is intentionally disabled on the M1/8 GB development machine. Keep `SUPABASE_CLI_DOCKER_ALLOWED` unset locally.

```bash
npm run supabase:ci:remote
```

Current dev project note: `PuppyPlan Dev` is reachable through Supabase MCP and the GitHub remote gate. `src/contracts/database.types.ts` was generated from the approved dev database through the `database-types` artifact. Do not hand-edit it; regenerate it from the same approved database, review the diff, and let `npm run supabase:ci:remote` fail if it is missing or stale.
