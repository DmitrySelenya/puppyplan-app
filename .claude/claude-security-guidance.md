# PuppyPlan Security Guidance

This file is loaded by the `security-guidance` plugin's model-backed reviewer
(end-of-turn diff review and per-commit agentic review). Treat these as
additional security checks on top of the plugin's built-in vulnerability list.

The canonical rules live in `AGENTS.md`. This file is a security-focused subset.
Deeper correctness, perf, and test reviews are handled by the
`.agents/skills/review-deep` skill — do **not** duplicate those checks here.

## Privacy / PII — highest priority

PuppyPlan handles emotionally sensitive pet-ownership data. The following must
never appear in `console.*`, `Sentry.*`, PostHog events, analytics payloads,
fixtures, snapshot tests, commit messages, PR text, docs, or issue text:

- Puppy names, breed-specific identifiers
- User-written notes, free-text journals
- User emails, phone numbers, real names
- Veterinarian / trainer / care-provider names and contact details
- Photo paths or URLs containing user-uploaded media
- Push notification tokens (FCM / APNS device tokens)
- Invite or share tokens
- Supabase JWTs, anon keys, service-role keys
- Auth provider session tokens

Flag any code path that builds a log/analytics/error message from these values.
Suggest replacement with redacted identifiers (`puppy_id`, `user_id`).

## Supabase boundary

Feature UI under `src/features/**` and route code under `app/**` must NEVER
import `@supabase/supabase-js` directly. All Supabase access must go through:

- `src/lib/supabase/` — typed clients and adapters
- `src/lib/query/` — TanStack Query hooks

Flag any direct supabase-js import, raw `createClient` call, or inline SQL in
feature/app code.

## RLS and Edge Functions

- Supabase RLS and privileged Edge Functions are the only authoritative access
  enforcement layer; UI guards are convenience.
- Any new table, view, function, or realtime publication needs an RLS policy.
  Flag schema changes that don't mention RLS.
- Edge Functions that use `service_role` must explicitly check the caller's
  identity (`auth.uid()`, JWT claims) before performing privileged operations.
- Flag any Edge Function that accepts user input and queries with `service_role`
  without an authorization check on the same code path.

## Observability boundary

Feature/app code must NOT call `Sentry.captureException`,
`Sentry.captureMessage`, `Sentry.addBreadcrumb`, or PostHog tracking directly.
All observability must go through `src/lib/observability/` and
`src/lib/analytics/` wrappers that scrub PII before send.

Flag direct Sentry / PostHog calls in `src/features/**` or `app/**`.

## Secret handling

- No hardcoded secrets, tokens, API keys, JWTs, or credentials in any source
  file (including tests and fixtures).
- Configuration must come from environment variables (Expo `extra`, EAS
  secrets, `process.env`).
- `.env*` and signing/credential files are gitignored. Flag any attempt to
  read them from non-`src/lib/` locations or any commit that contains their
  content.

## Type-safety escapes

AGENTS.md forbids `any`, `as unknown as`, and `@ts-ignore` without an ADR.
Treat `@ts-nocheck` as equivalent because it disables file-level type checking.
These often hide validation gaps — e.g. an unchecked cast to a `User` type that
bypasses Zod validation at a trust boundary. Flag any new occurrence in
security-sensitive paths (`src/contracts/`, `src/lib/supabase/`,
`src/lib/query/`, auth flows) and suggest a Zod-validated narrowing.

`@ts-expect-error` is allowed in type-contract tests because TypeScript fails
the directive when the expected error disappears. In production code, ask for a
comment linking the tracked upstream issue or ADR.

## Quick Log queue safety

The Minimal Durable Quick Log Queue uses Expo SQLite. Security-relevant rules:

- Queue writes must be idempotent (dedupe key on insert), otherwise replay
  attacks across reconnect can duplicate health-care entries.
- Queue reads must filter by current `user_id` / `puppy_id` to prevent
  cross-account read after account switch.
- The 3-second double-tap and 60-second duplicate-care invariants must be
  imported from `src/contracts/business-rules.ts`, not redefined inline.

## Generated native files

`ios/` and `android/` are recreated by Expo prebuild/EAS. Flag any direct edit
under those directories — those changes are wiped on next prebuild and
historically have leaked signing identifiers or entitlements when modified
manually.

## Release Guardrail

The plugin sees `git commit` and `git push` events Claude makes. If a commit
message or staged changes indicate a release, deploy, production migration,
EAS build/submit, store submission, OTA publish, or any remote-mutating
action, surface it as a finding — these require explicit user approval per
`AGENTS.md → Release / Production Guardrail` and must not be auto-executed by
an agent.

## Out of scope for this file

To keep findings actionable, do NOT flag from this file:

- Style, formatting, or refactor opportunities
- Missing tests (handled by `review-deep`)
- Performance issues unrelated to security (handled by `review-deep`)
- i18n string-budget violations (separate CI check)

All findings should be specific, include file and line, and propose an
actionable fix.
