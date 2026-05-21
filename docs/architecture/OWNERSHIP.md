# Architecture Ownership

## Workstreams

| Workstream | Owns |
|---|---|
| CTO / Architecture | `docs/architecture`, ADR index, scope arbitration |
| Mobile Shell | `app/`, `src/design/`, route shell, providers |
| Data Access | `src/lib/supabase`, `src/lib/query`, generated types |
| Today / Quick Log | `src/features/today`, `src/features/quick-log`, `src/features/timeline`, `src/lib/queue` |
| Sharing / Reminders | `src/features/family-sharing`, `src/features/trainer-sharing`, `src/features/reminders`, notifications |
| Health / Guidance | `src/features/health`, guidance content UI |
| Backend / Auth / RLS | `supabase/migrations`, `supabase/functions`, `supabase/tests`, `app_private` |
| Monetization Boundary | `src/features/monetization`, entitlement provider |
| QA / Release | Maestro flows, platform release gates, a11y checklist |

## Shared Areas

Shared areas require ADR or explicit owner approval:

- `src/contracts/`
- `src/design/primitives/`
- `src/lib/query/`
- `src/lib/queue/`
- `supabase/migrations/`
- `docs/architecture/adr/`

## Agent Rule

One workstream edits one ownership area at a time. Cross-workstream changes require the architecture file and ADR to explain why.

