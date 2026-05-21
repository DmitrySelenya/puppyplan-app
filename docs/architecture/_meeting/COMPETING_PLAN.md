# Конкурирующий план (предложен внешним агентом)

> Этот документ — **не наш план**. Это input для review: 6 архитектурных лидеров читают и пишут критику со своей роли.
> Источник правды: PRD v2.3, DESIGN.md, наши собственные позиции в `_meeting/positions/*.md`.

---

## Plan: PuppyPlan Architecture Document

### Summary
Create one root-level Markdown handoff file: `/Users/dmitryselenya/Projects/puppy_app/ARCHITECTURE.md`.

The file will be the main architecture source for future coding agents and engineers. It will synthesize the six-agent architecture council: CTO, UX/UI lead, two mobile architects, client lead, and server lead. It will include Mermaid diagrams directly inside Markdown, so no extra tooling is required.

### Key Decisions To Capture
- Stack: Expo SDK 55, React Native 0.83, React 19.2, New Architecture, Expo Router, EAS development builds.
- Backend: Supabase-first; Postgres is durable source of truth; no custom API server for beta.
- State: TanStack Query for server state; Zustand only for UI/workflow state; Zod for runtime contracts.
- Offline: no local-first engine; only Minimal Durable Quick Log Queue for unsent Quick Log events.
- Auth: online-first Supabase anonymous auth for first value; account required before sharing, multi-device, premium, and sensitive actions.
- Sharing: household roles and trainer/public scoped links are separate concepts; trainer sharing must use sanitized projections, not direct table reads.
- UI: fixed IA of `Today | Health | More`, persistent Quick Log FAB, one primary CTA per screen/hero, max 5 visible trackers.
- Privacy: no notes, puppy names, provider names, raw emails, photos, tokens, or free text in analytics/logs.

### Document Structure
- Architecture council summary and CTO arbitration decisions.
- Product architecture: core loop, MVP boundary, deferred scope, success criteria.
- Mobile architecture: Expo Router layout, module boundaries, UI kit, design-token contract, i18n contract.
- Data architecture: Supabase schema boundaries, RLS model, Edge Function boundary, share projections.
- Client data flow: TanStack Query, optimistic Quick Log, pending queue, reconnect/foreground retry.
- Notifications: local reminders vs remote push, device-specific scheduling, trusted-sitter push only.
- Security/privacy: anonymous auth limits, token hashing, private detail tables, analytics whitelist.
- Testing/release gates: unit, integration, RLS negative tests, E2E, accessibility, beta readiness.
- Mermaid diagrams: app module map, data flow, Quick Log sequence, sharing permission flow, notification flow.
- Appendix: unresolved source conflicts from historical design audit notes that must be fixed before implementation.

### Important Interface/Schema Changes
- Split free-text/private fields from shareable core rows:
  `event_logs` + `event_notes`, `health_records` + `health_record_notes/media`.
- Model trainer sharing as `external_share_links` / `share_link_scopes`, not regular `household_membership`.
- Add device-specific notification schedule state instead of assuming `local_notification_id` is global.
- Define Zod contracts for event payloads, queue items, reminders, health records, share scopes, invites, notification preferences, analytics events.
- Resolve duplicate warning constants as two separate rules: accidental double tap window and household duplicate-care window.

### Test Plan
- Verify architecture doc references existing PRD/design files accurately.
- Check every major beta feature has owner boundary, data boundary, UI states, and tests.
- Include RLS P0 cases: non-member access, viewer write denial, revoked access, anonymous sharing denial, trainer projection only.
- Include Quick Log cases: optimistic insert, offline queue, retry, dedupe by `client_event_id`, pending delete/undo.
- Include accessibility gates: Dynamic Type XXL/XXXL, VoiceOver/TalkBack for Quick Log, Sharing Preview, Health form.

### Assumptions
- Final artifact is a single Markdown file with Mermaid diagrams, not a separate Figma/diagram file.
- Existing `PRD`, `DESIGN`, `STRINGS`, and `design-tokens` remain source inputs, not edited in this pass.
- Official stack assumptions were checked against primary docs: Expo SDK 55, Expo SDK 55 changelog, React Native 0.83, Supabase RLS, Supabase React Native Auth, Expo Notifications.
