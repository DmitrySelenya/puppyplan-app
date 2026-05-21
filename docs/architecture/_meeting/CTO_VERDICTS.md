# CTO Verdicts

## Accepted Architecture Core

- Expo native app.
- Supabase-first backend.
- RLS plus Edge Functions for privileged operations.
- TanStack Query + Zustand + Zod.
- Minimal Durable Quick Log Queue only.
- Sanitized share projections.
- Privacy-safe analytics/logging.
- Multi-file architecture docs.

## Final Arbitration

1. Use `docs/architecture/` multi-file documentation.
2. Keep PRD §6.10 schema.
3. Use Expo SQLite for Quick Log queue.
4. Use `react-i18next`.
5. Use `_dev/components` in MVP; Storybook later if justified.
6. Disable OTA in MVP.
7. Use PostHog flags for product/UI and Supabase `app_config` for backend-critical toggles.
8. Require Android exact-alarm ADR/spike.
9. Use duplicate windows: 3 seconds and 60 seconds.
10. Treat design audit as beta QA workstream, not backend input.

## Required ADRs

The accepted decision records are indexed in `../ADR_INDEX.md` and stored in `../adr/0001-*` through `../adr/0016-*`.
