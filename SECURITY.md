# Security Policy

This project is private during MVP development.

Do not commit or paste:

- production secrets, tokens, API keys, service-role keys, signing credentials, or store credentials;
- raw puppy names, notes, provider names, emails, photos, invite tokens, share tokens, or push tokens;
- production Supabase exports, analytics exports, Sentry payloads, or user screenshots.

Security-sensitive implementation areas:

- Supabase RLS and migrations;
- Edge Functions for invite/share and push flows;
- share projections and trainer/viewer access;
- observability and analytics wrappers;
- platform privacy manifests and store disclosures.

Before any release or production action, follow `AGENTS.md` and require explicit approval for the exact action.
