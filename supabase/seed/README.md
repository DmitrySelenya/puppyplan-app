# Supabase Seed Policy

No default seed rows are tracked for PUP-3.

Use pgTAP setup data in `supabase/tests/` for permission tests. Any future seed data must be synthetic and must not contain raw private user content, raw emails outside reserved example domains, provider names, photos, invite/share tokens, push tokens, or production identifiers.
