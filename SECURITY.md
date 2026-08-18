# Security Policy

PuppyPlan handles personal data about households and their pets. Security issues in this
repository are treated as product bugs of the highest priority.

## Reporting a Vulnerability

Please **do not open a public issue** for a security vulnerability.

Report it privately through GitHub:
[**Report a vulnerability**](https://github.com/DmitrySelenya/puppyplan-app/security/advisories/new)
(Security → Advisories → Report a vulnerability).

Include, where possible: affected area, reproduction steps, impact, and whether the issue is
reachable by an unauthenticated client. You can expect an initial response within 7 days.

## Scope

Highest-value areas, in rough priority order:

- **Row Level Security and migrations** — `supabase/migrations/`, `supabase/tests/`.
  Any path where one household can observe or mutate another household's rows.
- **Invite and share flows** — household invite RPCs, share links, share projections, and the
  `app_private` secret tables. Any path where a share token grants more than its declared scope.
- **Auth, identity, and session persistence** — `src/lib/auth/`, session storage.
- **Analytics and observability wrappers** — `src/lib/`. Any path where raw user content
  (pet names, notes, provider names, emails, photos, tokens) escapes into telemetry.
- **Client data boundary** — feature code reaching Supabase directly instead of going through
  `src/lib/supabase` / `src/lib/query`.

Out of scope: the marketing surface, findings that require a compromised device or a rooted
simulator, and rate-limit reports against the shared development backend.

## About the Development Backend

The Supabase project referenced in `.env.example` is a **non-production development project
containing synthetic data only**. No production user data exists in it. Its URL and publishable
key are, by design, public values — every shipped mobile app embeds them. Access is enforced
entirely by Row Level Security, which is why RLS findings are the most valuable reports here.

`scripts/supabase/dev-project-guard.mjs` fails closed if a helper script is ever pointed at
anything other than that development project.

## Contributor Obligations

Never commit or paste into issues, PRs, or docs:

- secrets, tokens, API keys, service-role keys, signing credentials, or store credentials;
- raw pet names, notes, provider names, emails, photos, invite tokens, share tokens, or push tokens;
- production database exports, analytics exports, error-tracker payloads, or user screenshots.

`scripts/checks/privacy-scan.mjs` enforces part of this automatically and runs as part of
`npm run check`. It is a safety net, not a substitute for judgement.
