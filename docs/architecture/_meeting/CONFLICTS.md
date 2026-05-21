# Architecture Meeting Conflicts

## Resolved Conflicts

| Conflict | Final Decision | Owner |
|---|---|---|
| Single root `ARCHITECTURE.md` vs multi-file docs | Multi-file `docs/architecture/` | CTO |
| Schema split for notes/private fields | Reject; keep PRD schema | CTO + Backend |
| `external_share_links` rename | Reject; use `share_link`/`share_scope` | Backend |
| Quick Log queue storage | Expo SQLite | CTO + Client |
| i18n library | `react-i18next` + typed keys | CTO + Client + UX |
| Storybook vs `_dev/components` | `_dev/components` in MVP; Storybook Phase 1/ADR | CTO |
| OTA updates | Off in MVP | CTO + iOS + Android + Client |
| Product flags vs backend config | PostHog for product/UI; Supabase `app_config` for backend operations | CTO |
| Exact alarms | ADR/spike required; not default blindly | CTO + Android |
| Duplicate warning windows | 3 seconds double tap; 10 minutes duplicate care | CTO + Client |
| AUDIT_FIXES classification | Design Audit Track required before beta, not schema input | CTO + UX |

## Rejected Proposals

- root `ARCHITECTURE.md`;
- physical `event_notes` / `health_record_notes` split;
- treating design audit as architecture/schema source;
- live RevenueCat SDK in MVP;
- custom API service in beta;
- full offline-first/outbox in beta.

