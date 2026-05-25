# Supabase Baseline

This directory contains the Supabase contract for PuppyPlan MVP.

## Scope

- `public` contains RLS-protected app tables and sanitized sharing projections.
- `app_private` contains server-only token hashes and future SECURITY DEFINER helpers.
- `minimal_quick_log_queue_item` is intentionally not a Supabase table; it remains a local Expo SQLite queue contract.
- Production linking, production migrations, and Edge Function deploys are out of scope for PUP-3.
- The daily development path on the 8 GB M1 MacBook Air is a non-production Supabase dev project or branch. Do not start Docker or the local Supabase stack on this machine.
- Anonymous sign-ins are disabled in the baseline config until the auth/onboarding issue adds an anonymous-to-permanent upgrade path and RLS checks for anonymous JWT claims.

## Remote Dev Workflow

Use this workflow for the long-lived development database that Expo talks to during app development.

Current MCP-created dev project:

- name: `PuppyPlan Dev`
- project ref: `olymqppxsadsxfrcyskh`
- region: `eu-central-1`
- API URL: `https://olymqppxsadsxfrcyskh.supabase.co`

Supabase MCP can apply migrations and run SQL against this project. The review-fix migration `20260525090000_review_fix_privacy_and_share_rpc.sql` has been applied to this non-production dev project. Local Expo development points at this hosted project through public Expo env vars; local Docker is not part of the daily workflow.

1. Create or select a non-production Supabase project or persistent branch.
2. Use a local-only database URL for remote migration and lint checks:

```bash
npm run supabase:lint
npm run db:push:remote:dry-run
```

The database-check scripts also read `SUPABASE_DB_URL` from a local ignored `.env` file. They require this value and do not fall back to an implicitly linked project. Do not use an `EXPO_PUBLIC_*` prefix for this value. Do not paste the real URL into docs, Linear, PRs, logs, or chat.

3. Preview migration application before any remote write:

```bash
npm run db:push:remote:dry-run
```

4. Apply migrations only to the approved non-production dev project or branch through an explicitly approved MCP/CLI action.

5. Verify the remote dev database:

```bash
npm run supabase:lint
```

`npm run db:types` prefers `SUPABASE_PROJECT_REF` and Supabase CLI auth, so it can generate `src/contracts/database.types.ts` from the hosted project without Docker. Authenticate with `npx supabase login` locally or set `SUPABASE_ACCESS_TOKEN` in the shell. If `SUPABASE_PROJECT_REF` is absent, the wrapper can fall back to `SUPABASE_DB_URL`, but that fallback remains Docker-only and is disabled on this Mac.

`npm run supabase:test` runs pgTAP through Supabase CLI against the remote DB URL. Supabase CLI still uses Docker for this mode, so run it only on a Docker-capable CI/cloud runner with `SUPABASE_CLI_DOCKER_ALLOWED=1`.

The GitHub Actions workflow `.github/workflows/supabase-remote-dev.yml` is the expected runner for the full remote gate:

```bash
npm run supabase:ci:remote
```

Required GitHub configuration:

- repository secret `PUPPYPLAN_DEV_SUPABASE_DB_URL`

The CI workflow intentionally uses the Docker-capable runner plus `SUPABASE_DB_URL` for pgTAP and type generation. `SUPABASE_ACCESS_TOKEN` is optional for local no-Docker type generation only.

When `src/contracts/database.types.ts` is missing or stale, the remote workflow fails after generating the file and uploads it as the `database-types` artifact. Download that artifact, review the diff, commit the generated file, and rerun the workflow.

6. Put branch-specific Expo client values in a local `.env` file, never in git:

```bash
EXPO_PUBLIC_SUPABASE_URL=<dev-project-url>
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<dev-publishable-key>
SUPABASE_PROJECT_REF=olymqppxsadsxfrcyskh
SUPABASE_DB_URL=<percent-encoded-postgres-url-for-cli-only>
```

Only publishable client keys belong in Expo public env vars. Service role or secret keys must never be committed, exposed to Expo, pasted into Linear, or used in client code.

## Disabled Local Docker Workflow

The short local commands are intentionally guarded on this workspace:

```bash
npm run supabase:test
npm run supabase:lint
npm run db:types
```

The npm scripts route through `scripts/supabase/run-remote-cli.mjs`, which fails before Docker-only modes unless `SUPABASE_CLI_DOCKER_ALLOWED=1` is present. Keep that flag unset on the 8 GB M1 MacBook Air. Local Docker-based Supabase commands are reserved for CI/cloud runners or a different workstation where the user explicitly approves that path. Do not run production migration commands unless the user explicitly approves that exact action.

## Privileged Boundary

Normal `anon` and `authenticated` clients must not directly create, accept, revoke, expire, or mutate:

- household bootstrap rows or membership rows outside a future typed onboarding RPC/Edge Function;
- household invites;
- external share links;
- share scopes;
- token hashes or token metadata;
- push token registration paths that bypass ownership checks.

Those writes belong in future Edge Functions or typed RPC wrappers that validate shared contracts, check `auth.uid()` explicitly, and write in one transaction. RLS still denies direct table mutation as a defense-in-depth baseline.

## Sharing Projections

Public share metadata and owner/member preview use sanitized views:

- `public.share_link_view`
- `public.share_routine_summary`
- `public.share_selected_timeline`
- `public.share_training_notes`
- `public.share_health_summary`
- `public.share_puppy_profile`

These views are `security_invoker` wrappers over explicit `current_share_*` SECURITY DEFINER RPCs. The RPCs check `auth.uid()` against owner membership or `share_link.accepted_by`, return only sanitized fields, and pin `search_path = ''`. Owner permission previews and accepted external trainer shared views therefore use the same projection path without granting base-table access.
