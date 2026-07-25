# ADR-0017: Auth, Identity, Session Persistence, And New-User Bootstrap

Status: Accepted

## Context

PUP-18 introduces the first durable identity/session slice. The app needs a real Supabase Auth user before household-scoped data can be created or shared. Existing RLS rules deny direct client inserts into `household` and `household_membership`, so first-user setup needs a privileged server boundary.

The generated Supabase database types do not include the new `bootstrap_current_user` RPC until the migration is pushed and typegen is run through the gated remote Supabase workflow.

## Decision

Use Supabase Auth with email OTP as the first sign-in method, while keeping `src/lib/auth` provider-agnostic for Apple/Google additions later.

Persist sessions with an Expo SecureStore-backed Supabase `SupportedStorage` adapter and keep `autoRefreshToken` enabled, with React Native `AppState` starting/stopping refresh.

Create new-user household ownership through `public.bootstrap_current_user(text)`, a SECURITY DEFINER RPC with pinned `search_path`, explicit `auth.uid()` checks, authenticated-only EXECUTE, and idempotent owner-membership creation.

On session restoration, `bootstrap_current_user` first resolves any accepted, non-revoked
membership instead of treating only owner membership as initialized. It prefers a household with
an active puppy, then the oldest membership, so an invited caregiver returns to the shared puppy
and legacy empty-household data is not selected when a populated household is available. It
creates a new owner household only when no active membership exists.

Allow exactly one temporary narrow `as unknown as` boundary cast in `src/lib/auth/bootstrap.ts` to call the RPC before generated database types exist.

## Consequences

- Session, gating, bootstrap, and later social sign-in share one provider-neutral auth surface.
- The app never relies on direct client writes for initial household ownership.
- The bootstrap RPC must stay covered by pgTAP tests for SECURITY DEFINER shape, idempotency,
  accepted caregiver restoration, legacy empty-household recovery, user isolation, and anon
  denial.
- The temporary RPC cast must be removed after the gated Supabase push/typegen workflow updates `database.types.ts`.
