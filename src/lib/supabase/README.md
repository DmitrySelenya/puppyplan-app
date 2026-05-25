# Supabase Boundary

Raw Supabase clients and wrappers live here. Feature UI and route files must not import `@supabase/supabase-js` directly.

`client.ts` creates the Expo client lazily from:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Only publishable keys are valid in Expo public env vars. Service-role and secret keys must never be used here.

The current MVP client disables Supabase session persistence until the auth/onboarding implementation provides a SecureStore-backed adapter. Do not store Supabase session tokens in Expo SQLite `localStorage`; auth must also wire token auto-refresh to React Native `AppState` before persistent login ships.

`env.ts` intentionally accepts only `https://*.supabase.co` URLs for MVP dev projects. Self-hosted Supabase or custom domains require an explicit env-policy update instead of silently broadening the client boundary.

`SUPABASE_DB_URL`, when present locally, is for Supabase CLI type generation and database checks only. It must never be read by client code or exposed with an `EXPO_PUBLIC_` prefix.

For daily Expo development on the 8 GB M1 MacBook Air, keep Docker off and run the app against the hosted non-production `PuppyPlan Dev` project:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://olymqppxsadsxfrcyskh.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<dev-publishable-key>
npm start
```

Schema dry-runs and lint use `SUPABASE_DB_URL` through the remote wrapper. pgTAP runs on GitHub Actions/cloud runners only. Generated DB types prefer `SUPABASE_PROJECT_REF` plus Supabase CLI auth so typegen does not need local Docker.

PUP-3 owns backend contracts, migrations, generated DB types workflow, RLS tests, and future Edge Function setup notes.
